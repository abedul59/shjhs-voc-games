<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

useHead({ meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }] });

const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const gameName = '單字皮卡丘排球（雙人）';
const gameKey = 'pikavolleyDual';
const roomPrefix = 'pikavolley-dual:';
const lesson = { version: String(route.query.version || ''), volume: String(route.query.volume || ''), unit: String(route.query.unit || '') };
const unitKey = roomPrefix + JSON.stringify([lesson.version, lesson.volume, lesson.unit]);

const status = ref('loading');
const error = ref('');
const room = ref(null);
const host = ref(false);
const opponent = ref({ id: null, name: '對手' });
const words = ref([]);
const config = reactive({ duration: 180, unlock: 20, blanks: 3, penalty: 5, target: 7, maxEscapes: 20 });
const game = reactive({ p1: 0, p2: 0, time: 180, serve: 1, inPlay: false, message: '', winner: null });
const left = reactive({ x: 100, y: 296, vx: 0, vy: 0, jumping: false });
const right = reactive({ x: 636, y: 296, vx: 0, vy: 0, jumping: false });
const ball = reactive({ x: 190, y: 200, vx: 0, vy: 0 });
const input = reactive({ left: false, right: false, up: false, down: false, smash: false, serve: false });
const remoteInput = reactive({ left: false, right: false, up: false, down: false, smash: false, serve: false });
const unlockUntil = reactive({ 1: 0, 2: 0 });
const now = ref(Date.now());
const prompt = ref(null);
const picked = ref([]);
const correct = ref([]);
const wrong = ref([]);
const resultSaved = ref(false);
const saveError = ref('');
const joining = ref(false);
const matchStarted = ref(0);
const gameEndsAt = ref(0);

const mySide = computed(() => host.value ? 1 : 2);
const myRallies = computed(() => mySide.value === 1 ? game.p1 : game.p2);
const opponentRallies = computed(() => mySide.value === 1 ? game.p2 : game.p1);
const myTime = computed(() => Math.max(0, Math.ceil((unlockUntil[mySide.value] - now.value) / 1000)));
const winnerText = computed(() => game.winner === null ? '平手' : game.winner === mySide.value ? '你贏了！' : '對手獲勝');
const targetLetters = computed(() => prompt.value?.slots.map(slot => slot.blank ? (slot.filled || '＿') : slot.char).join(' ') || '');
const playerName = computed(() => student.value?.name || '你');
const leftName = computed(() => host.value ? playerName.value : opponent.value.name);
const rightName = computed(() => host.value ? opponent.value.name : playerName.value);

let channel = null;
let roomPoll = null;
let clock = null;
let frame = null;
let roundTimer = null;
let lastFrame = 0;
let lastSnapshot = 0;
let lastInput = 0;
let lastSequence = 0;
let sequence = 0;
let disposed = false;
let savingPromise = null;

const send = (event, payload = {}) => channel?.send({ type: 'broadcast', event, payload });
const positive = (value, fallback, min, max) => {
  const number = value == null ? fallback : Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
};
const position = (piece, width = 64, height = 64) => ({
  left: `${piece.x / 800 * 100}%`, top: `${piece.y / 400 * 100}%`,
  width: `${width / 800 * 100}%`, height: `${height / 400 * 100}%`
});

function nextWord() {
  if (!words.value.length || status.value !== 'playing') return;
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const pure = word.en_us.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const indices = [...pure].map((_, i) => i).sort(() => Math.random() - .5).slice(0, Math.min(config.blanks, pure.length));
  const letters = indices.map(i => pure[i]);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (letters.length < Math.max(10, indices.length + 4)) letters.push(alphabet[Math.floor(Math.random() * 26)]);
  prompt.value = {
    en: word.en_us, zh: word.zh_tw, slots: [...pure].map((char, i) => ({ char, blank: indices.includes(i), filled: '' })),
    options: letters.sort(() => Math.random() - .5).map((char, i) => ({ id: i, char, used: false }))
  };
  picked.value = [];
}

function pickLetter(option) {
  if (status.value !== 'playing' || !prompt.value || option.used) return;
  const slot = prompt.value.slots.find(item => item.blank && !item.filled);
  if (!slot) return;
  if (option.char !== slot.char) {
    wrong.value.push(prompt.value.en);
    error.value = `拼字錯誤：${prompt.value.zh}，請再試一次。`;
    return;
  }
  option.used = true;
  slot.filled = option.char;
  picked.value.push(option.id);
  error.value = '';
  // 與單人版相同：每拼對一個字母都重新取得操作時間。
  if (host.value) unlockUntil[1] = Date.now() + config.unlock * 1000;
  else void send('unlock', { id: String(student.value.id) });
  if (prompt.value.slots.every(item => !item.blank || item.filled)) {
    correct.value.push(prompt.value.en);
    nextWord();
  }
}

function resetRally() {
  Object.assign(left, { x: 100, y: 296, vx: 0, vy: 0, jumping: false });
  Object.assign(right, { x: 636, y: 296, vx: 0, vy: 0, jumping: false });
  Object.assign(ball, { x: game.serve === 1 ? 112 : 648, y: 250, vx: 0, vy: 0 });
  game.inPlay = false;
  game.message = '';
  Object.assign(input, { left: false, right: false, up: false, down: false, smash: false, serve: false });
  Object.assign(remoteInput, { left: false, right: false, up: false, down: false, smash: false, serve: false });
}

function snapshot() {
  if (!host.value || status.value !== 'playing') return;
  void send('state', {
    sequence: ++sequence, left: { ...left }, right: { ...right }, ball: { ...ball },
    p1: game.p1, p2: game.p2, time: game.time, serve: game.serve,
    inPlay: game.inPlay, message: game.message, unlock1: unlockUntil[1], unlock2: unlockUntil[2],
    rules: { duration: config.duration, unlock: config.unlock, blanks: config.blanks, penalty: config.penalty, target: config.target }
  });
}

function takeSnapshot(data) {
  if (host.value || !data || data.sequence <= lastSequence || status.value === 'over') return;
  lastSequence = data.sequence;
  if (data.rules) Object.assign(config, data.rules);
  if (status.value !== 'playing') beginMatch();
  Object.assign(left, data.left);
  Object.assign(right, data.right);
  Object.assign(ball, data.ball);
  game.p1 = data.p1; game.p2 = data.p2; game.time = data.time;
  game.serve = data.serve; game.inPlay = data.inPlay; game.message = data.message;
  unlockUntil[1] = data.unlock1; unlockUntil[2] = data.unlock2;
}

function scorePoint(side) {
  if (game.message || status.value !== 'playing') return;
  game.inPlay = false;
  if (side === 1) game.p1++; else game.p2++;
  game.serve = side;
  game.message = `${side === 1 ? leftName.value : rightName.value}得分！`;
  snapshot();
  if (game.p1 >= config.target || game.p2 >= config.target) {
    roundTimer = setTimeout(() => { void finishMatch(side); }, 1000);
  } else {
    roundTimer = setTimeout(() => { if (status.value === 'playing') { resetRally(); snapshot(); } }, 1400);
  }
}

function movePlayer(piece, controls, side, step) {
  const available = unlockUntil[side] > Date.now();
  const speed = available ? 8 : 0;
  piece.vx = controls.left ? -speed : controls.right ? speed : 0;
  if (available && controls.up && !piece.jumping) { piece.vy = -16; piece.jumping = true; }
  if (available && controls.down) piece.vx *= 1.35;
  piece.vy += step;
  piece.x += piece.vx * step;
  piece.y += piece.vy * step;
  if (piece.y > 296) { piece.y = 296; piece.vy = 0; piece.jumping = false; }
  piece.x = Math.max(side === 1 ? 0 : 400, Math.min(side === 1 ? 336 : 736, piece.x));
}

function simulate(step) {
  const first = input, second = remoteInput;
  movePlayer(left, first, 1, step);
  movePlayer(right, second, 2, step);
  if (!game.inPlay) {
    const server = game.serve === 1 ? left : right;
    const controls = game.serve === 1 ? first : second;
    ball.x = server.x + 12; ball.y = server.y - 45;
    ball.vx = 0; ball.vy = 0;
    if (controls.serve && unlockUntil[game.serve] > Date.now()) {
      game.inPlay = true; ball.vy = -15; ball.vx = game.serve === 1 ? 5 : -5;
      controls.serve = false;
    }
    return;
  }
  ball.vy = Math.min(20, ball.vy + step);
  ball.x += ball.vx * step; ball.y += ball.vy * step;
  if (ball.x < 0 || ball.x > 760) { ball.x = Math.max(0, Math.min(760, ball.x)); ball.vx *= -.8; }
  if (ball.y < 0) { ball.y = 0; ball.vy *= -.8; }
  if (ball.x + 40 > 392 && ball.x < 408 && ball.y + 40 > 200 && ball.y < 360) {
    if (ball.y + 40 < 215 && ball.vy > 0) { ball.y = 160; ball.vy *= -.8; }
    else { ball.x = ball.x < 400 ? 352 : 408; ball.vx *= -.8; }
  }
  for (const [piece, controls, side] of [[left, first, 1], [right, second, 2]]) {
    if (ball.x + 40 > piece.x && ball.x < piece.x + 64 && ball.y + 40 > piece.y && ball.y < piece.y + 64 && ball.vy > -9) {
      const offset = (ball.x + 20 - piece.x - 32) / 32;
      ball.vx = Math.max(-15, Math.min(15, offset * 12 + (side === 1 ? 3 : -3)));
      ball.vy = controls.smash && piece.jumping ? 12 : -17;
      ball.y = ball.vy < 0 ? piece.y - 41 : piece.y + 65;
    }
  }
  if (ball.y >= 320) { ball.y = 320; scorePoint(ball.x < 400 ? 2 : 1); }
}

function frameTick(time) {
  if (status.value !== 'playing' || !host.value || disposed) return;
  const step = Math.min(2, Math.max(.5, (time - (lastFrame || time)) / 16.67));
  lastFrame = time;
  if (!game.message) simulate(step);
  if (time - lastSnapshot > 100) { snapshot(); lastSnapshot = time; }
  frame = requestAnimationFrame(frameTick);
}

async function saveResult(outcome) {
  if (resultSaved.value || savingPromise || !student.value?.id) return savingPromise;
  const duration = matchStarted.value ? Math.max(0, Math.round((Date.now() - matchStarted.value) / 1000)) : 0;
  const points = Math.max(0, myRallies.value * 20 - opponentRallies.value * 10 + correct.value.length * 10 - wrong.value.length * config.penalty);
  const payload = {
    student_id: student.value.id, game_type: gameName, score: points, mistakes: wrong.value.length,
    time_taken_seconds: duration, version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    correct_words: `【${outcome}】對手：${opponent.value.name}；排球比分：${myRallies.value}-${opponentRallies.value}${correct.value.length ? `, ${correct.value.join(', ')}` : ''}`,
    wrong_words: wrong.value.join(', ')
  };
  savingPromise = db.from('game_records').insert([payload]).then(({ error: problem }) => {
    if (problem) { saveError.value = `紀錄儲存失敗：${problem.message}`; return; }
    resultSaved.value = true; saveError.value = '';
  }).finally(() => { savingPromise = null; });
  return savingPromise;
}

async function finishMatch(winner) {
  if (status.value === 'over' || status.value !== 'playing') return;
  game.winner = winner;
  status.value = 'over';
  clearTimeout(roundTimer);
  if (frame) cancelAnimationFrame(frame);
  if (host.value && room.value) {
    await db.from('game_rooms').update({ status: 'finished', winner_id: winner === null ? null : winner === 1 ? room.value.host_id : room.value.guest_id }).eq('id', room.value.id);
    void send('finished', { winner, p1: game.p1, p2: game.p2 });
  }
  await saveResult(winner === null ? '平' : winner === mySide.value ? '勝' : '敗');
}

function beginMatch() {
  if (status.value === 'playing' || status.value === 'over') return;
  status.value = 'playing';
  game.p1 = 0; game.p2 = 0; game.time = config.duration;
  game.winner = null; game.serve = 1;
  matchStarted.value = Date.now();
  gameEndsAt.value = Date.now() + config.duration * 1000;
  resetRally(); nextWord();
  if (host.value) { lastFrame = 0; frame = requestAnimationFrame(frameTick); snapshot(); }
}

async function claimRoom(candidate) {
  const { data, error: problem } = await db.from('game_rooms').update({ guest_id: student.value.id, guest_name: playerName.value, status: 'playing' })
    .eq('id', candidate.id).eq('status', 'waiting').is('guest_id', null).select('*').maybeSingle();
  if (problem) throw problem;
  if (!data) return false;
  room.value = data; host.value = false;
  opponent.value = { id: data.host_id, name: data.host_name };
  status.value = 'searching';
  await connectRoom();
  return true;
}

async function connectRoom() {
  if (channel) await db.removeChannel(channel);
  channel = db.channel(`pikavolley_dual_${room.value.id}`);
  channel.on('broadcast', { event: 'ready' }, ({ payload }) => {
    if (host.value && String(payload.id) === String(room.value?.guest_id)) {
      if (status.value === 'searching') beginMatch();
      snapshot();
    }
  }).on('broadcast', { event: 'input' }, ({ payload }) => {
    if (host.value && String(payload.id) === String(room.value?.guest_id) && status.value === 'playing')
      for (const key of Object.keys(remoteInput)) remoteInput[key] = !!payload.keys?.[key];
  }).on('broadcast', { event: 'unlock' }, ({ payload }) => {
    if (host.value && String(payload.id) === String(room.value?.guest_id) && status.value === 'playing') {
      unlockUntil[2] = Date.now() + config.unlock * 1000;
      snapshot();
    }
  }).on('broadcast', { event: 'state' }, ({ payload }) => { takeSnapshot(payload); })
    .on('broadcast', { event: 'finished' }, ({ payload }) => {
      if (!host.value && status.value === 'playing') {
        game.p1 = payload.p1; game.p2 = payload.p2;
        void finishMatch(payload.winner);
      }
    }).on('broadcast', { event: 'left' }, ({ payload }) => {
      if (status.value === 'playing' && String(payload.id) === String(opponent.value.id)) void finishMatch(mySide.value);
    }).subscribe((state) => {
      if (state === 'SUBSCRIBED' && !host.value) void send('ready', { id: String(student.value.id) });
    });
}

async function pollRoom() {
  if (!room.value || !['searching', 'playing'].includes(status.value)) return;
  const { data, error: problem } = await db.from('game_rooms').select('*').eq('id', room.value.id).maybeSingle();
  if (problem) { error.value = problem.message; return; }
  if (!data) { if (status.value === 'playing') void finishMatch(mySide.value); else { status.value = 'ready'; room.value = null; } return; }
  room.value = data;
  if (data.guest_id) opponent.value = host.value ? { id: data.guest_id, name: data.guest_name } : { id: data.host_id, name: data.host_name };
  if (data.status === 'finished') {
    const side = data.winner_id == null ? null : String(data.winner_id) === String(data.host_id) ? 1 : 2;
    if (status.value === 'playing') void finishMatch(side);
    else { status.value = 'ready'; room.value = null; error.value = '對手已取消配對，請重新尋找。'; }
  } else if (host.value && status.value === 'searching' && data.status === 'playing' && data.guest_id) {
    beginMatch();
  } else if (!host.value && status.value === 'searching' && data.status === 'playing') {
    void send('ready', { id: String(student.value.id) });
  } else if (host.value && status.value === 'searching' && data.status === 'waiting' && !joining.value) {
    if (Date.now() - new Date(data.created_at).getTime() > 100000) {
      joining.value = true;
      try {
        const { data: removed } = await db.from('game_rooms').delete().eq('id', data.id).eq('status', 'waiting').is('guest_id', null).select('id').maybeSingle();
        if (removed) { room.value = null; status.value = 'ready'; }
      } finally { joining.value = false; }
      if (status.value === 'ready') await findMatch();
      return;
    }
    // 同時搜尋時兩端可能都建立房間；較新的房間改加入較舊的房間。
    joining.value = true;
    try {
      const { data: older, error: searchError } = await db.from('game_rooms').select('*')
        .eq('unit_info', unitKey).eq('status', 'waiting').neq('host_id', student.value.id)
        .lt('created_at', data.created_at).gte('created_at', new Date(Date.now() - 120000).toISOString())
        .order('created_at').limit(1);
      if (searchError) throw searchError;
      if (older?.length) {
        const { data: removed, error: removeError } = await db.from('game_rooms').delete()
          .eq('id', data.id).eq('status', 'waiting').is('guest_id', null).select('id').maybeSingle();
        if (removeError) throw removeError;
        if (removed) {
          if (!await claimRoom(older[0])) { status.value = 'ready'; room.value = null; }
        }
      }
    } catch (problem) { error.value = `配對重試失敗：${problem.message}`; }
    finally { joining.value = false; }
  }
}

async function findMatch() {
  if (joining.value || status.value !== 'ready') return;
  joining.value = true; error.value = '';
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data: recent, error: recordError } = await db.from('game_records').select('correct_words')
      .eq('student_id', student.value.id).eq('game_type', gameName).gte('played_at', today.toISOString());
    if (recordError) throw recordError;
    if ((recent || []).filter(record => record.correct_words?.startsWith('【逃】')).length >= config.maxEscapes) {
      error.value = `今日已離開對戰 ${config.maxEscapes} 次，明天再玩。`;
      return;
    }
    const { data: rooms, error: readError } = await db.from('game_rooms').select('*').eq('status', 'waiting').eq('unit_info', unitKey)
      .neq('host_id', student.value.id).gte('created_at', new Date(Date.now() - 120000).toISOString()).order('created_at').limit(20);
    if (readError) throw readError;
    for (const candidate of rooms || []) {
      if (await claimRoom(candidate)) return;
    }
    const { data, error: createError } = await db.from('game_rooms').insert([{
      host_id: student.value.id, host_name: playerName.value, unit_info: unitKey, status: 'waiting'
    }]).select('*').single();
    if (createError) throw createError;
    room.value = data; host.value = true; status.value = 'searching';
    await connectRoom();
  } catch (problem) { error.value = `配對失敗：${problem.message}`; status.value = 'ready'; }
  finally { joining.value = false; }
}

async function leaveMatch() {
  const wasPlaying = status.value === 'playing';
  const current = room.value;
  const occupiedRoom = current && (current.status === 'playing' || current.guest_id);
  if (wasPlaying) {
    void send('left', { id: String(student.value.id) });
    await saveResult('逃');
    if (saveError.value) error.value = saveError.value;
  } else if (occupiedRoom) {
    void send('left', { id: String(student.value.id) });
  }
  if (current) {
    if (host.value && status.value === 'searching' && !occupiedRoom) await db.from('game_rooms').delete().eq('id', current.id).eq('status', 'waiting').is('guest_id', null);
    else if (occupiedRoom) await db.from('game_rooms').update({ status: 'finished', winner_id: opponent.value.id }).eq('id', current.id).eq('status', 'playing');
  }
  status.value = 'ready'; room.value = null;
  if (channel) { await db.removeChannel(channel); channel = null; }
}

async function goHome() {
  if (['searching', 'playing'].includes(status.value)) await leaveMatch();
  await navigateTo('/');
}

function keyDown(event) {
  if (status.value !== 'playing' || ['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[event.code]) { input[map[event.code]] = true; event.preventDefault(); }
  if (['Space', 'Enter', 'NumpadEnter'].includes(event.code)) { input.smash = true; input.serve = true; event.preventDefault(); }
  sendInput();
}
function keyUp(event) {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[event.code]) input[map[event.code]] = false;
  if (['Space', 'Enter', 'NumpadEnter'].includes(event.code)) { input.smash = false; input.serve = false; }
  sendInput();
}
function sendInput(force = false) {
  if (host.value || status.value !== 'playing') return;
  if (!force && Date.now() - lastInput < 45) return;
  lastInput = Date.now();
  void send('input', { id: String(student.value.id), keys: { ...input } });
}
function control(key, value) { input[key] = value; if (key === 'smash') input.serve = value; sendInput(true); }

onMounted(async () => {
  try {
    if (!student.value?.id || student.value.isAnon) throw new Error('請先登入學生帳號再玩雙人對戰。');
    if (Object.values(lesson).some(value => !value)) throw new Error('請從遊戲選單選擇完整課程。');
    const { data: settings, error: settingsError } = await db.from('system_settings').select('*').eq('id', 1).single();
    if (settingsError) throw settingsError;
    if (settings.disabled_games?.includes(gameKey)) throw new Error('老師目前未開放雙人皮卡丘排球。');
    if (settings.locked_units?.includes([lesson.version, lesson.volume, lesson.unit].join('|'))) throw new Error('老師已鎖定這個單元。');
    if (settings.restrict_play_time) {
      const time = new Date(), hhmm = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
      if (!(settings.allow_play_days || []).includes(time.getDay()) || hhmm < String(settings.allow_play_start || '00:00').slice(0, 5) || hhmm > String(settings.allow_play_end || '23:59').slice(0, 5)) throw new Error('目前不是開放遊玩時段。');
    }
    const { data: allowed, error: allowedError } = await db.from('students').select('allowed_games').eq('student_id', student.value.id).maybeSingle();
    if (allowedError) throw allowedError;
    if (allowed?.allowed_games && !allowed.allowed_games.includes('ALL') && !allowed.allowed_games.includes(gameKey)) throw new Error('老師未開放這個遊戲給你。');
    config.duration = positive(settings.pikavolley_time_limit, 180, 60, 900);
    config.unlock = positive(settings.pikavolley_unlock_time, 20, 3, 60);
    config.blanks = Math.floor(positive(settings.pikavolley_blank_count, 3, 1, 10));
    config.penalty = positive(settings.pikavolley_penalty, 5, 0, 50);
    config.maxEscapes = Math.floor(positive(settings.pvp_max_escapes, 20, 0, 100));
    const { data: vocab, error: wordError } = await db.from('vocabularies').select('en_us,zh_tw').eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit);
    if (wordError) throw wordError;
    words.value = (vocab || []).filter(item => item.en_us && item.zh_tw && item.en_us.replace(/[^a-zA-Z]/g, '').length >= 1);
    if (!words.value.length) throw new Error('本課沒有可用單字，請選擇其他課程。');
    status.value = 'ready';
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    roomPoll = setInterval(() => { void pollRoom(); }, 1500);
    clock = setInterval(() => {
      now.value = Date.now();
      if (host.value && status.value === 'playing') {
        game.time = Math.max(0, Math.ceil((gameEndsAt.value - Date.now()) / 1000));
        if (game.time === 0) void finishMatch(game.p1 === game.p2 ? null : game.p1 > game.p2 ? 1 : 2);
      }
      if (!host.value && status.value === 'playing') sendInput(true);
    }, 250);
  } catch (problem) { error.value = problem.message; status.value = 'error'; }
});

onUnmounted(() => {
  disposed = true;
  clearInterval(roomPoll); clearInterval(clock); clearTimeout(roundTimer);
  if (frame) cancelAnimationFrame(frame);
  window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
  if (status.value === 'playing') {
    void send('left', { id: String(student.value?.id) });
    void saveResult('逃');
    if (room.value) void db.from('game_rooms').update({ status: 'finished', winner_id: opponent.value.id }).eq('id', room.value.id).eq('status', 'playing').then();
  }
  if (status.value === 'searching' && room.value?.status === 'playing') {
    void send('left', { id: String(student.value?.id) });
    void db.from('game_rooms').update({ status: 'finished', winner_id: opponent.value.id }).eq('id', room.value.id).eq('status', 'playing').then();
  }
  if (room.value && host.value && status.value === 'searching') void db.from('game_rooms').delete().eq('id', room.value.id).eq('status', 'waiting').is('guest_id', null).then();
  if (channel) void db.removeChannel(channel);
});
</script>

<template>
  <main class="pika-duel">
    <header class="top"><h1>⚡ 皮卡丘排球（雙人）</h1><button class="top-back" @click="goHome">← 返回選單</button></header>
    <p v-if="error" class="notice" role="alert">{{ error }}</p>
    <section v-if="status === 'loading'" class="panel">載入單字與設定中…</section>
    <section v-else-if="status === 'error'" class="panel"><p>{{ error }}</p><NuxtLink to="/">返回選單</NuxtLink></section>
    <section v-else-if="status === 'ready'" class="panel">
      <h2>🏐 同課程雙人排球</h2>
      <p>每拼對一個字母可操作 {{ config.unlock }} 秒；先得 {{ config.target }} 分者獲勝，限時 {{ config.duration }} 秒。</p>
      <p>鍵盤：方向鍵移動／跳躍，空白鍵發球或殺球。手機使用下方按鈕。</p>
      <button :disabled="joining" @click="findMatch">{{ joining ? '配對中…' : '🔍 尋找對手' }}</button>
    </section>
    <section v-else-if="status === 'searching'" class="panel"><h2>正在等待同課程對手…</h2><p>{{ host ? '已建立房間' : '已加入房間，等待球場同步' }}</p><button @click="leaveMatch">取消配對</button></section>
    <template v-else-if="status === 'playing' || status === 'over'">
      <div class="scoreboard"><strong>{{ leftName }}：{{ game.p1 }}</strong><span>剩餘 {{ game.time }} 秒</span><strong>{{ rightName }}：{{ game.p2 }}</strong></div>
      <div class="court"><div class="floor"></div><div class="net"></div><div class="pika" :class="{ mine: mySide === 1 }" :style="position(left)"><span class="face">•ᴗ•</span></div><div class="pika" :class="{ mine: mySide === 2 }" :style="position(right)"><span class="face">•ᴗ•</span></div><div class="ball" :style="position(ball, 40, 40)"></div><div v-if="game.message" class="rally-message">{{ game.message }}</div></div>
      <section v-if="status === 'playing'" class="practice">
        <div class="question"><strong>{{ prompt?.zh }}</strong><span>填入缺少的字母：{{ targetLetters }}</span></div>
        <div class="letters"><button v-for="option in prompt?.options || []" :key="option.id" :disabled="option.used" @click="pickLetter(option)">{{ option.char }}</button></div>
        <p class="unlock">{{ myTime > 0 ? `可操作 ${myTime} 秒` : '拼對字母後即可操作球員' }}</p>
        <div class="controls"><button @pointerdown.prevent="control('left', true)" @pointerup.prevent="control('left', false)" @pointercancel="control('left', false)" @pointerleave="control('left', false)">◀</button><button @pointerdown.prevent="control('up', true)" @pointerup.prevent="control('up', false)" @pointercancel="control('up', false)" @pointerleave="control('up', false)">▲</button><button @pointerdown.prevent="control('right', true)" @pointerup.prevent="control('right', false)" @pointercancel="control('right', false)" @pointerleave="control('right', false)">▶</button><button @pointerdown.prevent="control('smash', true)" @pointerup.prevent="control('smash', false)" @pointercancel="control('smash', false)" @pointerleave="control('smash', false)">發球／殺球</button></div>
        <button class="leave" @click="leaveMatch">離開對戰</button>
      </section>
      <section v-else class="panel"><h2>{{ winnerText }}</h2><p>排球比分 {{ myRallies }}：{{ opponentRallies }} · 答對 {{ correct.length }} 字 · 答錯 {{ wrong.length }} 次</p><p v-if="saveError" role="alert">{{ saveError }} <button @click="saveResult(game.winner === null ? '平' : game.winner === mySide ? '勝' : '敗')">重試儲存</button></p><p><NuxtLink :to="{ path: '/history', query: { game: gameName } }">我的對戰紀錄</NuxtLink> · <NuxtLink :to="{ path: '/leaderboard', query: { game: gameName, ...lesson } }">全校英雄榜</NuxtLink></p><NuxtLink to="/">返回首頁</NuxtLink></section>
    </template>
  </main>
</template>

<style scoped>
.pika-duel{position:fixed;inset:0;display:flex;flex-direction:column;gap:8px;padding:env(safe-area-inset-top) 10px env(safe-area-inset-bottom);box-sizing:border-box;overflow:auto;background:#101727;color:#fff;font-family:system-ui,sans-serif}.top{display:flex;align-items:center;justify-content:space-between;gap:10px}.top h1{font-size:clamp(1rem,3vw,1.5rem);margin:8px 0}.top a,.panel a{color:#ffe65b}.notice{background:#5d302e;border-radius:8px;padding:6px;margin:0}.panel{max-width:650px;width:100%;margin:auto;box-sizing:border-box;padding:24px;border:2px solid #ffdc66;border-radius:18px;background:#223454;text-align:center}.panel button,.leave{padding:10px 20px;background:#ffdc66;border:0;border-radius:8px;font-weight:bold;cursor:pointer}.panel button:disabled{opacity:.6}.scoreboard{display:flex;justify-content:space-between;align-items:center;gap:8px;width:min(100%,800px);margin:0 auto;font-size:clamp(.8rem,2vw,1.1rem)}.scoreboard strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scoreboard span{color:#ffdc66;white-space:nowrap}.court{position:relative;width:min(100%,800px);aspect-ratio:2/1;margin:0 auto;overflow:hidden;border:3px solid white;border-radius:10px;background:linear-gradient(#58b4ed 0%,#c1e9ff 75%,#e3c68c 76%)}.floor{position:absolute;inset:auto 0 0;height:10%;background:#b78957}.net{position:absolute;left:49.5%;top:50%;height:40%;width:1%;background:repeating-linear-gradient(#fff 0 8px,#aaa 8px 12px)}.pika{position:absolute;display:grid;place-items:center;background:#ffe333;border:2px solid #d58a15;border-radius:40% 40% 18% 18%;font-size:clamp(.8rem,4vw,2rem)}.pika.mine{box-shadow:0 0 0 4px #6aff73}.ball{position:absolute;border:2px solid #111;border-radius:50%;background:linear-gradient(#f54747 48%,#222 48% 54%,#fff 54%)}.rally-message{position:absolute;top:15%;width:100%;text-align:center;font-size:1.8rem;font-weight:900;color:#fff;text-shadow:2px 2px #111}.practice{width:min(100%,800px);margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:7px}.question{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center}.question strong{font-size:1.25rem;color:#ffdc66}.letters{display:flex;flex-wrap:wrap;justify-content:center;gap:5px}.letters button,.controls button{min-width:35px;min-height:35px;border:1px solid #fff;border-radius:7px;background:#33466e;color:white;font-weight:bold;touch-action:none}.letters button:disabled{opacity:.3}.unlock{margin:0;color:#90ff9b}.controls{display:flex;gap:8px}.controls button{padding:8px 12px}.leave{background:#ef6969;color:white;padding:7px 14px}@media(max-height:660px){.pika-duel{gap:3px}.court{width:min(75vh,800px)}.panel{padding:10px}.letters button{min-height:28px}}
.pika::before,.pika::after{content:'';position:absolute;top:-24%;width:24%;height:52%;background:linear-gradient(#222 0 25%,#ffe333 25%);border:2px solid #d58a15;border-radius:50% 50% 0 0}.pika::before{left:4%;transform:rotate(-25deg)}.pika::after{right:4%;transform:rotate(25deg)}.face{position:relative;color:#533925;font-size:clamp(.65rem,2.7vw,1.4rem);font-weight:900}.pika.mine .face{color:#174f27}.top-back{border:0;background:transparent;color:#ffe65b;font:inherit;cursor:pointer;white-space:nowrap}
</style>
