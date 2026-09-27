import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { createLobby, joinLobby, transition, duelRecord, matchKey, DUEL_NAME, DUEL_KEY, OFFLINE_LIMIT } from '~/lib/monopoly-duel';

export function useMonopolyDuel() {
  const db = useSupabaseClient(), route = useRoute(), student = useCookie('currentStudent');
  const room = ref(null), words = ref([]), loading = ref(true), busy = ref(false), error = ref('');
  const saveError = ref(''), saving = ref(false), saved = ref(false), lastSync = ref(0), now = ref(Date.now());
  const todayEscapes = ref(0), maxEscapes = ref(20), accessError = ref('');
  const state = computed(() => room.value?.monopoly_state || null);
  const myIndex = computed(() => state.value?.players.findIndex(player => player.id === String(student.value?.id)) ?? -1);
  const opponentIndex = computed(() => myIndex.value === 0 ? 1 : 0);
  const searching = computed(() => state.value?.phase === 'waiting');
  const connected = computed(() => !!room.value && now.value - lastSync.value < 15000);
  const active = computed(() => state.value && !['waiting', 'over'].includes(state.value.phase));
  const myTurn = computed(() => active.value && myIndex.value === state.value.turn);
  const opponentAway = computed(() => active.value && now.value - state.value.presence[opponentIndex.value] > 25000);
  const lesson = { version: String(route.query.version || ''), volume: String(route.query.volume || ''), unit: String(route.query.unit || '') };
  const sessionKey = 'shjhs_monopoly_dual_' + String(student.value?.id || 'guest');
  let channel = null, pollTimer = null, tickTimer = null, polling = false, disposed = false, joining = false, lastSeek = 0;
  let savePromise = null, savedRoom = null, lastSaveAttempt = 0;
  const identity = () => ({ id: student.value.id, name: student.value.name, device: navigator.userAgent });
  const remember = id => { try { if (id) sessionStorage.setItem(sessionKey, id); else sessionStorage.removeItem(sessionKey); } catch { /* Storage may be disabled. */ } };
  const describeError = issue => /monopoly_state|schema cache/.test(issue?.message || '') ? '請先在新 Supabase 的 SQL Editor 執行本次提供的「單字大富翁雙人版」追加 SQL，再重新整理。' : issue?.message || '連線失敗，請稍後重試。';

  async function readAccess() {
    const { data, error: settingsError } = await db.from('system_settings').select('*').eq('id', 1).single();
    if (settingsError) throw settingsError;
    maxEscapes.value = Math.max(1, Number(data.pvp_max_escapes) || 20);
    if (data.disabled_games?.includes(DUEL_KEY)) throw new Error('老師目前尚未開放單字大富翁（雙人）。');
    if (data.locked_units?.includes([lesson.version, lesson.volume, lesson.unit].join('|'))) throw new Error('老師已鎖定這個單元。');
    if (data.restrict_play_time) {
      const date = new Date(), clock = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      if (!(data.allow_play_days || []).includes(date.getDay()) || clock < String(data.allow_play_start || '00:00').slice(0, 5) || clock > String(data.allow_play_end || '23:59').slice(0, 5)) throw new Error('目前不是老師開放的遊玩時段。');
    }
    const { data: allowed, error: studentError } = await db.from('students').select('allowed_games').eq('student_id', student.value.id).maybeSingle();
    if (studentError) throw studentError;
    if (allowed?.allowed_games && !allowed.allowed_games.includes('ALL') && !allowed.allowed_games.includes(DUEL_KEY)) throw new Error('老師尚未將這個遊戲開放給你。');
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data: records, error: recordsError } = await db.from('game_records').select('correct_words').eq('student_id', student.value.id).eq('game_type', DUEL_NAME).gte('played_at', start.toISOString());
    if (recordsError) throw recordsError;
    todayEscapes.value = (records || []).filter(record => record.correct_words?.startsWith('【逃】')).length;
    if (todayEscapes.value >= maxEscapes.value) throw new Error('今日離場次數已達 ' + maxEscapes.value + ' 次，請明天再來挑戰。');
  }
  function acceptRoom(next) {
    if (disposed || !next?.unit_info?.startsWith('monopoly-dual:') || next.monopoly_state?.schema !== 1) return false;
    if (!next.monopoly_state.players.some(player => player.id === String(student.value?.id))) return false;
    if (room.value?.id === next.id && state.value.revision > next.monopoly_state.revision) return false;
    room.value = next; lastSync.value = Date.now(); remember(next.id);
    if (next.monopoly_state.phase === 'over' && savedRoom !== next.id && !saving.value && Date.now() - lastSaveAttempt > 5000) void saveResults();
    return true;
  }
  async function syncRoom() {
    if (!room.value || polling || disposed) return;
    polling = true;
    const id = room.value.id;
    try {
      const { data, error: problem } = await db.from('game_rooms').select('*').eq('id', id).maybeSingle();
      if (problem) throw problem;
      if (disposed || room.value?.id !== id) return;
      if (!data) { error.value = '房間已關閉，請返回配對畫面。'; room.value = null; remember(null); return; }
      acceptRoom(data); error.value = '';
    } catch (problem) { if (!disposed) error.value = describeError(problem); }
    finally { polling = false; }
  }
  async function connectRoom() {
    if (channel) await db.removeChannel(channel);
    if (!room.value || disposed) return;
    channel = db.channel('monopoly_dual_' + room.value.id);
    channel.on('broadcast', { event: 'refresh' }, () => { void syncRoom(); }).subscribe();
  }
  async function commit(next, expected) {
    if (!room.value || busy.value || disposed) return false;
    busy.value = true;
    const id = room.value.id;
    try {
      const payload = { monopoly_state: next, status: next.phase === 'waiting' ? 'waiting' : next.phase === 'over' ? 'finished' : 'playing' };
      if (next.phase === 'over') payload.winner_id = next.winner === null ? null : next.players[next.winner].id;
      const { data, error: problem } = await db.from('game_rooms').update(payload).eq('id', id)
        .eq('monopoly_state->>revision', String(expected)).select('*').maybeSingle();
      if (problem) throw problem;
      if (!data) { await syncRoom(); return false; }
      if (room.value?.id !== id || disposed) return false;
      acceptRoom(data); error.value = '';
      void channel?.send({ type: 'broadcast', event: 'refresh', payload: { revision: next.revision } });
      return true;
    } catch (problem) { error.value = describeError(problem); await syncRoom(); return false; }
    finally { busy.value = false; }
  }
  async function act(action) {
    if (!state.value || myIndex.value < 0 || busy.value) return false;
    const revision = state.value.revision;
    const next = transition(state.value, action, myIndex.value);
    return next ? commit(next, revision) : false;
  }
  async function claim(candidate) {
    if (candidate.monopoly_state?.schema !== 1 || Date.now() - candidate.monopoly_state.presence[0] > 30000) return false;
    const next = joinLobby(candidate.monopoly_state, identity());
    const { data, error: problem } = await db.from('game_rooms').update({ guest_id: student.value.id, guest_name: student.value.name, status: 'playing', monopoly_state: next })
      .eq('id', candidate.id).eq('status', 'waiting').is('guest_id', null)
      .eq('monopoly_state->>revision', String(candidate.monopoly_state.revision)).select('*').maybeSingle();
    if (problem) throw problem;
    if (!data) return false;
    acceptRoom(data); await connectRoom(); return true;
  }
  async function candidates(key) {
    const { data, error: problem } = await db.from('game_rooms').select('*').eq('unit_info', key).eq('status', 'waiting')
      .neq('host_id', student.value.id).gte('monopoly_state->presence->>0', String(Date.now() - 30000))
      .order('created_at').order('id').limit(30);
    if (problem) throw problem;
    return (data || []).filter(item => item.monopoly_state?.schema === 1 && Date.now() - item.monopoly_state.presence[0] <= 30000);
  }
  async function startMatchmaking(mapId, rounds) {
    if (loading.value || busy.value || room.value || joining) return;
    joining = true; busy.value = true; error.value = ''; accessError.value = '';
    try {
      if (!student.value?.id || student.value.isAnon) throw new Error('雙人對戰請先登入學生帳號。');
      if (!words.value.length || Object.values(lesson).some(value => !value)) throw new Error('請返回遊戲選單，選擇有單字的完整課程。');
      await readAccess();
      const key = matchKey(lesson, mapId, rounds);
      for (const candidate of await candidates(key)) if (await claim(candidate)) return;
      const { data, error: problem } = await db.from('game_rooms').insert([{
        host_id: student.value.id, host_name: student.value.name || '同學', unit_info: key, status: 'waiting',
        monopoly_state: createLobby(identity(), words.value, lesson, mapId, rounds)
      }]).select('*').single();
      if (problem) throw problem;
      acceptRoom(data); await connectRoom();
    } catch (problem) { error.value = describeError(problem); }
    finally { busy.value = false; joining = false; }
  }
  async function cancelMatchmaking() {
    if (!searching.value || busy.value) return false;
    busy.value = true;
    try {
      const { data, error: problem } = await db.from('game_rooms').delete().eq('id', room.value.id).eq('host_id', student.value.id)
        .eq('status', 'waiting').is('guest_id', null).select('id');
      if (problem) throw problem;
      if (!data?.length) { await syncRoom(); return false; }
      await resetRoom(); return true;
    } catch (problem) { error.value = describeError(problem); return false; }
    finally { busy.value = false; }
  }
  async function mergeWaitingRooms() {
    if (!searching.value || busy.value || joining) return;
    joining = true;
    try {
      const mine = room.value, others = await candidates(mine.unit_info);
      const older = others.find(item => item.created_at < mine.created_at || (item.created_at === mine.created_at && item.id < mine.id));
      if (!older || !searching.value) return;
      // Remove only our still-empty room; a simultaneous guest claim takes precedence.
      if (!await cancelMatchmaking()) return;
      busy.value = true;
      if (!await claim(older)) error.value = '剛才的房間已配對完成，請再按一次「尋找對手」。';
    } catch (problem) { error.value = describeError(problem); }
    finally { joining = false; busy.value = false; }
  }
  async function saveResults() {
    if (savePromise) return savePromise;
    if (state.value?.phase !== 'over' || savedRoom === room.value.id) return;
    const completed = JSON.parse(JSON.stringify(state.value)), id = room.value.id;
    lastSaveAttempt = Date.now(); saving.value = true; saveError.value = '';
    // Either connected participant can persist BOTH records, including an absent opponent.
    // Stable per-player UUIDs make simultaneous writes and retries idempotent.
    savePromise = (async () => {
      for (let index = 0; index < 2; index++) {
        const record = duelRecord(completed, index);
        const { data: existing, error: lookupError } = await db.from('game_records').select('id').eq('id', record.id).maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) continue;
        const { count, error: countError } = await db.from('game_records').select('id', { count: 'exact', head: true })
          .eq('student_id', record.student_id).eq('game_type', DUEL_NAME).eq('version', record.version).eq('volume', record.volume).eq('unit_played', record.unit_played);
        if (countError) throw countError;
        record.attempt_number = (count || 0) + 1;
        const { error: insertError } = await db.from('game_records').insert([record]);
        if (insertError && insertError.code !== '23505') throw insertError;
        if (insertError) {
          const { data: duplicate, error: duplicateError } = await db.from('game_records').select('id').eq('id', record.id).eq('student_id', record.student_id).maybeSingle();
          if (duplicateError || !duplicate) throw duplicateError || insertError;
        }
      }
      if (room.value?.id === id) { savedRoom = id; saved.value = true; }
    })().catch(problem => { saveError.value = '成績尚未全部儲存：' + describeError(problem); })
      .finally(() => { saving.value = false; savePromise = null; });
    return savePromise;
  }
  async function resetRoom() {
    if (active.value) return;
    if (channel) { await db.removeChannel(channel); channel = null; }
    room.value = null; remember(null); saved.value = false; savedRoom = null; saveError.value = ''; error.value = '';
  }
  async function leaveRoute() {
    if (searching.value) return cancelMatchmaking();
    if (!active.value) return true;
    if (!window.confirm('對戰尚未結束，現在離開會記為逃跑並由對手獲勝。確定離開？')) return false;
    if (busy.value) { error.value = '正在同步這一步，請稍候再返回選單。'; return false; }
    if (!await act({ type: 'escape' })) return false;
    await saveResults(); return true;
  }
  function beforeUnload(event) {
    if (!active.value) return;
    event.preventDefault(); event.returnValue = '';
  }
  async function tick() {
    now.value = Date.now();
    if (!state.value || busy.value || disposed || myIndex.value < 0 || !connected.value) return;
    if (state.value.phase === 'over') return;
    if (now.value - state.value.presence[myIndex.value] >= 10000) { await act({ type: 'heartbeat' }); return; }
    if (active.value && now.value - state.value.presence[opponentIndex.value] > OFFLINE_LIMIT) { await act({ type: 'timeout' }); return; }
    if (myTurn.value && ['rolling', 'moving', 'feedback'].includes(state.value.phase) && now.value >= state.value.dueAt) await act({ type: 'advance' });
    if (searching.value && now.value - lastSeek > 6000) { lastSeek = now.value; void mergeWaitingRooms(); }
  }
  onMounted(async () => {
    window.addEventListener('beforeunload', beforeUnload);
    try {
      if (!student.value?.id || student.value.isAnon) throw new Error('雙人對戰請先登入學生帳號。');
      // Resume a persisted board before applying lobby access rules or loading a new lesson.
      let remembered = null;
      try { remembered = sessionStorage.getItem(sessionKey); } catch { /* Optional. */ }
      if (remembered) {
        const { data, error: resumeError } = await db.from('game_rooms').select('*').eq('id', remembered).maybeSingle();
        if (resumeError) throw resumeError;
        if (data && acceptRoom(data)) { await connectRoom(); if (active.value) await act({ type: 'heartbeat' }); }
        else remember(null);
      }
      if (!room.value) { try { await readAccess(); } catch (problem) { accessError.value = describeError(problem); } }
      if (Object.values(lesson).every(Boolean)) {
        const { data, error: wordError } = await db.from('vocabularies').select('id,en_us,zh_tw')
          .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(500);
        if (wordError) throw wordError;
        words.value = (data || []).filter(word => word.id && word.en_us && word.zh_tw);
      }
      if (!words.value.length && !room.value) error.value = '本單元沒有可用單字，請返回選擇其他課程。';
    } catch (problem) { error.value = describeError(problem); }
    finally {
      loading.value = false;
      if (!disposed) { pollTimer = window.setInterval(syncRoom, 2000); tickTimer = window.setInterval(tick, 300); }
    }
  });
  onBeforeUnmount(() => {
    disposed = true; window.clearInterval(pollTimer); window.clearInterval(tickTimer);
    window.removeEventListener('beforeunload', beforeUnload);
    if (channel) void db.removeChannel(channel);
  });
  return { state, room, words, loading, busy, error, accessError, searching, active, connected, myIndex, myTurn, opponentAway,
    saving, saved, saveError, todayEscapes, maxEscapes, lesson, startMatchmaking, cancelMatchmaking, act, saveResults, resetRoom, leaveRoute, syncRoom };
}
