<script setup>
import { computed, onMounted, ref } from 'vue';
import { ALCHEMISTS, ALCHEMY_GAME_TYPE, MATERIALS, PARTY, RECIPES, REGIONS, appendJournal, canSynthesize, freshAtelier, gather, materialById, normalizeAtelier, recipeById, regionById, synthesize, weatherFor } from '~/lib/alchemy-atelier';

const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const studentId = computed(() => student.value?.id ? String(student.value.id) : '');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const lessonLabel = [lesson.version, lesson.volume, lesson.unit].filter(Boolean).join(' · ');
const workshop = ref(freshAtelier());
const revision = ref(0);
const words = ref([]);
const loading = ref(true);
const busy = ref(false);
const notice = ref('正在打開鍊金日誌…');
const saveNotice = ref('');
const activeTab = ref('explore');
const mapScale = ref('continent');
const selectedRecipe = ref('healing');
const selectedCompanion = ref('');
const selectedItem = ref('');
const startingHero = ref('lia');
const startingParty = ref([]);
const selectedCarrier = ref('');
const battle = ref(null);
const quiz = ref(null);
const quizError = ref('');
const brewing = ref(false);
const brewPhase = ref('idle');
const answer = ref('');
const session = ref(null);
const sessionKey = computed(() => `alchemy-atlier:${studentId.value}:${lesson.version}:${lesson.volume}:${lesson.unit}`);
const localProgressKey = computed(() => `alchemy-atelier-progress:${studentId.value}`);
const storageMode = ref('cloud');

const activeRegion = computed(() => regionById(workshop.value.regionId));
const activeSpot = computed(() => activeRegion.value.spots.find(spot => spot.id === workshop.value.spotId) || activeRegion.value.spots[0]);
const weather = computed(() => weatherFor(activeRegion.value.id, workshop.value.weatherStep));
const recipe = computed(() => recipeById(selectedRecipe.value) || RECIPES[0]);
const recipeFilter = ref('all');
const recipeKinds = [
  { id: 'all', name: '全部' }, { id: 'damage', name: '攻擊' }, { id: 'heal', name: '療傷' },
  { id: 'shield', name: '防禦' }, { id: 'boost', name: '強化' }, { id: 'weaken', name: '弱化' },
  { id: 'drain', name: '吸收' }, { id: 'stun', name: '控制' }
];
const filteredRecipes = computed(() => recipeFilter.value === 'all' ? RECIPES : RECIPES.filter(item => item.kind === recipeFilter.value));
const score = computed(() => (session.value?.correct.length || 0) * 10);
const inventoryList = computed(() => MATERIALS.filter(material => (workshop.value.inventory[material.id]?.count || 0) > 0));
const productList = computed(() => RECIPES.filter(item => (workshop.value.items[item.id]?.count || 0) > 0));
const hero = computed(() => ALCHEMISTS.find(person => person.id === workshop.value.heroId));
const activeParty = computed(() => [hero.value, ...PARTY.filter(person => workshop.value.partyIds.includes(person.id))].filter(Boolean));
const allActors = computed(() => [hero.value, ...PARTY].filter(Boolean));
const battleItems = computed(() => RECIPES.filter(item => (workshop.value.loadouts[selectedCompanion.value]?.[item.id]?.count || 0) > 0));
const carriedCount = actorId => Object.values(workshop.value.loadouts[actorId] || {}).reduce((sum, entry) => sum + (entry?.count || 0), 0);
const worldProgress = computed(() => `${workshop.value.defeated.length}/${REGIONS.length}`);

function cloneWorkshop() { return normalizeAtelier(JSON.parse(JSON.stringify(workshop.value))); }

function toggleStartingCompanion(id) {
  if (startingParty.value.includes(id)) startingParty.value = startingParty.value.filter(value => value !== id);
  else if (startingParty.value.length < 3) startingParty.value = [...startingParty.value, id];
}

async function confirmCharacter() {
  if (busy.value || workshop.value.heroId) return;
  busy.value = true;
  try {
    const next = cloneWorkshop();
    next.heroId = startingHero.value;
    next.partyIds = [...startingParty.value];
    appendJournal(next, `選擇${ALCHEMISTS.find(person => person.id === next.heroId).name}為主角，與${next.partyIds.length}位同伴踏上旅途。`);
    await saveWorkshop(next);
    selectedCompanion.value = next.heroId;
    selectedCarrier.value = next.heroId;
    notice.value = '主角已確定。你可以隨時在「夥伴與圖鑑」調整出戰同伴與道具攜帶。';
  } catch (error) { notice.value = `角色選擇未完成：${error.message}`; }
  finally { busy.value = false; }
}

async function toggleCompanion(id) {
  if (busy.value || battle.value) { notice.value = '請先結束戰鬥，再調整出戰同伴。'; return; }
  const next = cloneWorkshop();
  if (next.partyIds.includes(id)) next.partyIds = next.partyIds.filter(value => value !== id);
  else if (next.partyIds.length < 3) next.partyIds.push(id);
  else { notice.value = '最多可帶三位同伴出戰。請先移除一位。'; return; }
  busy.value = true;
  try {
    await saveWorkshop(next);
    if (!activeParty.value.some(person => person.id === selectedCompanion.value)) selectedCompanion.value = next.heroId;
    notice.value = `已更新出戰隊伍：主角與${next.partyIds.length}位同伴。`;
  } catch (error) { notice.value = `隊伍設定失敗：${error.message}`; }
  finally { busy.value = false; }
}

async function moveItem(itemId, actorId, direction) {
  if (busy.value || battle.value || quiz.value) { notice.value = '請在戰鬥外調整道具。'; return; }
  const actor = allActors.value.find(person => person.id === actorId);
  const item = recipeById(itemId);
  if (!actor || !item) return;
  const next = cloneWorkshop();
  const source = direction === 'equip' ? next.items : (next.loadouts[actorId] || {});
  const target = direction === 'equip' ? (next.loadouts[actorId] ||= {}) : next.items;
  if (!source[itemId]?.count) { notice.value = '沒有可轉移的道具。'; return; }
  if (direction === 'equip' && Object.values(target).reduce((sum, entry) => sum + (entry?.count || 0), 0) >= 6) { notice.value = `${actor.name}最多可攜帶六件道具。`; return; }
  const quality = Math.round(source[itemId].totalQuality / source[itemId].count);
  source[itemId].count -= 1;
  source[itemId].totalQuality = source[itemId].count ? Math.max(0, source[itemId].totalQuality - quality) : 0;
  const existing = target[itemId] || { count: 0, totalQuality: 0 };
  target[itemId] = { count: existing.count + 1, totalQuality: existing.totalQuality + quality };
  busy.value = true;
  try {
    await saveWorkshop(next);
    notice.value = direction === 'equip' ? `已將${item.name}交給${actor.name}攜帶。` : `已從${actor.name}取回${item.name}。`;
  } catch (error) { notice.value = `道具轉移失敗：${error.message}`; }
  finally { busy.value = false; }
}

function chooseFighter(id) {
  selectedCompanion.value = id;
  selectedItem.value = RECIPES.find(item => (workshop.value.loadouts[id]?.[item.id]?.count || 0) > 0)?.id || '';
}

function chooseRegion(id) {
  if (battle.value) { notice.value = '請先完成或撤退目前的戰鬥，再移動到其他區域。'; return; }
  const region = regionById(id);
  if (!workshop.value.unlocked.includes(region.id)) { notice.value = '這片土地尚未解鎖。先挑戰目前區域的守衛。'; return; }
  workshop.value.regionId = region.id;
  workshop.value.spotId = region.spots[0].id;
  mapScale.value = 'region';
  notice.value = `已前往${region.name}。選擇採集地或挑戰守衛。`;
}

function chooseSpot(id) {
  workshop.value.spotId = id;
  mapScale.value = 'site';
  notice.value = `已抵達${activeSpot.value.name}。`;
}

function chooseQuestion(operation) {
  if (busy.value || quiz.value) return;
  if (words.value.length < 4) { notice.value = '本課單字不足四筆，請先在首頁選擇有單字的範圍。'; return; }
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const target = String(word.en_us || '').trim();
  const distinct = [...new Set(words.value.map(item => String(item.en_us || '').trim()).filter(Boolean))].filter(value => value !== target);
  const useLetters = /^[A-Za-z]{4,}$/.test(target) && Math.random() < .45;
  if (useLetters) {
    const first = 1 + Math.floor(Math.random() * (target.length - 2));
    const second = first + 1;
    const prompt = target.split('').map((letter, index) => index === first || index === second ? '＿' : letter).join(' ');
    quiz.value = { word, operation, mode: 'letters', target: `${target[first]}${target[second]}`.toLowerCase(), prompt };
  } else {
    const alternatives = distinct.sort(() => Math.random() - .5).slice(0, 3);
    const options = [target, ...alternatives].sort(() => Math.random() - .5);
    quiz.value = { word, operation, mode: 'choice', target: target.toLowerCase(), options };
  }
  answer.value = '';
  quizError.value = '';
}

function newBattle() {
  if (battle.value || !workshop.value.heroId) return;
  const region = activeRegion.value;
  battle.value = { regionId: region.id, enemy: region.enemy, hp: region.hp, maxHp: region.hp, guarding: false, shield: 0, bonus: 0, weakenPower: 0, weakenTurns: 0, stunned: false, round: 1 };
  chooseFighter(workshop.value.heroId);
  activeTab.value = 'battle';
  notice.value = `${region.enemy}現身！選擇夥伴與招式，每次行動回答單字題。`;
}

function abandonBattle() {
  battle.value = null;
  notice.value = '隊伍安全撤離。';
}

function restore() {
  if (busy.value || quiz.value || battle.value) return;
  if (workshop.value.hp === 100 && workshop.value.energy === 12) { notice.value = '隊伍已經休息充足。'; return; }
  chooseQuestion({ type: 'rest' });
}

function addDrop(state, id, quantity = 1, quality = 66) {
  const old = state.inventory[id] || { count: 0, totalQuality: 0 };
  state.inventory[id] = { count: old.count + quantity, totalQuality: old.totalQuality + quality * quantity };
  if (!state.discoveries.includes(id)) state.discoveries.push(id);
}

async function executeOperation(operation) {
  // Vue refs hold reactive proxies, which structuredClone cannot clone in browsers.
  const next = cloneWorkshop();
  let message = '';
  let nextBattle = battle.value ? { ...battle.value } : null;
  if (operation.type === 'gather') {
    message = gather(next, operation.regionId, operation.spotId);
  } else if (operation.type === 'synthesize') {
    message = synthesize(next, operation.recipeId);
  } else if (operation.type === 'rest') {
    next.hp = 100;
    next.energy = 12;
    message = '隊伍在工房休息，生命與採集體力已恢復。';
    appendJournal(next, message);
  } else if (operation.type === 'battle') {
    if (!nextBattle || nextBattle.regionId !== next.regionId) throw new Error('戰鬥已結束，請重新挑戰。');
    const fighter = [...ALCHEMISTS, ...PARTY].find(person => person.id === operation.companionId);
    if (!fighter || ![next.heroId, ...next.partyIds].includes(fighter.id)) throw new Error('這位角色不在目前出戰隊伍。');
    const selected = recipeById(operation.itemId);
    let damage = 0;
    if (operation.move === 'attack') damage = fighter.damage + Math.floor(Math.random() * 7);
    else if (operation.move === 'skill') damage = fighter.damage + 9 + Math.floor(Math.random() * 6);
    else if (operation.move === 'guard') nextBattle.guarding = true;
    else if (operation.move === 'item') {
      if (!selected || (next.loadouts[fighter.id]?.[selected.id]?.count || 0) < 1) throw new Error('這位角色沒有攜帶該道具，請在戰鬥前分配。');
      const stored = next.loadouts[fighter.id][selected.id];
      const quality = Math.round(stored.totalQuality / stored.count);
      const strength = Math.max(1, Math.round(selected.power * (.75 + quality / 200)));
      stored.count -= 1;
      stored.totalQuality = stored.count ? Math.max(0, stored.totalQuality - quality) : 0;
      if (selected.kind === 'heal') next.hp = Math.min(100, next.hp + strength);
      else if (selected.kind === 'shield') nextBattle.shield = Math.min(120, (nextBattle.shield || 0) + strength);
      else if (selected.kind === 'boost') nextBattle.bonus = Math.min(100, (nextBattle.bonus || 0) + strength);
      else if (selected.kind === 'weaken') { nextBattle.weakenPower = strength; nextBattle.weakenTurns = 2; }
      else if (selected.kind === 'stun') nextBattle.stunned = true;
      else if (selected.kind === 'drain') { damage = strength; next.hp = Math.min(100, next.hp + Math.ceil(strength / 2)); }
      else damage = strength;
    }
    if (damage > 0 && nextBattle.bonus > 0) { damage += nextBattle.bonus; nextBattle.bonus = 0; }
    nextBattle.hp = Math.max(0, nextBattle.hp - damage);
    message = `${fighter.name}${operation.move === 'item' ? `使用${selected.name}` : operation.move === 'guard' ? '架起防禦' : operation.move === 'skill' ? `施展${fighter.skill}` : '發動攻擊'}${damage ? `，造成 ${damage} 傷害` : ''}。`;
    if (nextBattle.hp <= 0) {
      const region = regionById(nextBattle.regionId);
      region.drops.forEach(id => addDrop(next, id, 2));
      next.victories += 1;
      if (!next.defeated.includes(region.id)) next.defeated.push(region.id);
      const index = REGIONS.findIndex(item => item.id === region.id);
      const nextRegion = REGIONS[index + 1];
      if (nextRegion && !next.unlocked.includes(nextRegion.id)) { next.unlocked.push(nextRegion.id); message += ` ${nextRegion.name}已解鎖！`; }
      message += ` 擊退${region.enemy}並取得素材。`;
      nextBattle = null;
    } else {
      const region = regionById(nextBattle.regionId);
      const baseIncoming = nextBattle.stunned ? 0 : Math.max(1, Math.floor((region.attack + Math.random() * 5 - (nextBattle.weakenPower || 0)) * (nextBattle.guarding ? .5 : 1)));
      const absorbed = Math.min(nextBattle.shield || 0, baseIncoming);
      const incoming = baseIncoming - absorbed;
      nextBattle.shield = Math.max(0, (nextBattle.shield || 0) - absorbed);
      nextBattle.stunned = false;
      if (nextBattle.weakenTurns > 0) nextBattle.weakenTurns -= 1;
      if (nextBattle.weakenTurns === 0) nextBattle.weakenPower = 0;
      next.hp = Math.max(0, next.hp - incoming);
      nextBattle.guarding = false;
      nextBattle.round += 1;
      message += baseIncoming === 0 ? ` ${region.enemy}被控制，本回合無法反擊。` : ` ${region.enemy}反擊，護盾吸收 ${absorbed}、隊伍受到 ${incoming} 傷害。`;
      if (next.hp === 0) { next.hp = 35; nextBattle = null; message += ' 隊伍敗退，回工房恢復至 35 HP。'; }
    }
    appendJournal(next, message);
  } else throw new Error('未知的操作。');
  await saveWorkshop(next);
  battle.value = nextBattle;
  if (operation.type === 'battle' && operation.move === 'item') chooseFighter(operation.companionId);
  return message;
}

async function saveWorkshop(next) {
  if (storageMode.value === 'local') { saveLocalWorkshop(next); return; }
  const { data, error } = await db.from('alchemy_atelier_states')
    .update({ workshop: next, revision: revision.value + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', revision.value).select('revision').maybeSingle();
  if (error) { saveLocalWorkshop(next); return; }
  if (!data) { await loadWorkshop(); throw new Error('另一個分頁已更新鍊金工房，請重新操作。'); }
  workshop.value = next;
  revision.value = data.revision;
}

function readLocalWorkshop() {
  try {
    const value = JSON.parse(localStorage.getItem(localProgressKey.value) || 'null');
    return value?.workshop && Number.isFinite(value.savedAt) ? value : null;
  } catch { return null; }
}

function saveLocalWorkshop(next) {
  let saved = false;
  try { localStorage.setItem(localProgressKey.value, JSON.stringify({ workshop: next, savedAt: Date.now() })); saved = true; }
  catch { /* Keep the current workshop in memory and explain the limitation below. */ }
  workshop.value = next;
  storageMode.value = 'local';
  saveNotice.value = saved
    ? '工房進度目前只保存在這台裝置。請在 Supabase 執行鍊金工房 SQL 後按「同步雲端進度」。'
    : '瀏覽器無法儲存進度；進度只保留在目前頁面，請勿關閉。';
}

async function loadWorkshop() {
  const local = readLocalWorkshop();
  const { data, error } = await db.from('alchemy_atelier_states').select('workshop,revision,updated_at').eq('student_id', studentId.value).maybeSingle();
  if (error) { saveLocalWorkshop(normalizeAtelier(local?.workshop || workshop.value)); return; }
  if (data) {
    if (local && local.savedAt > new Date(data.updated_at).getTime()) {
      const { data: recovered, error: recoverError } = await db.from('alchemy_atelier_states')
        .update({ workshop: local.workshop, revision: data.revision + 1, updated_at: new Date().toISOString() })
        .eq('student_id', studentId.value).eq('revision', data.revision).select('revision').maybeSingle();
      if (recoverError || !recovered) { saveLocalWorkshop(normalizeAtelier(local.workshop)); return; }
      workshop.value = normalizeAtelier(local.workshop);
      revision.value = recovered.revision;
    } else { workshop.value = normalizeAtelier(data.workshop); revision.value = data.revision; }
    storageMode.value = 'cloud';
    try { localStorage.removeItem(localProgressKey.value); } catch { /* The cloud copy is saved. */ }
    saveNotice.value = '工房進度已同步到雲端。';
    return;
  }
  const { data: created, error: createError } = await db.from('alchemy_atelier_states')
    .insert({ student_id: studentId.value, workshop: local?.workshop || freshAtelier() }).select('workshop,revision').single();
  if (createError?.code === '23505') return loadWorkshop();
  if (createError) { saveLocalWorkshop(normalizeAtelier(local?.workshop || workshop.value)); return; }
  workshop.value = normalizeAtelier(created.workshop);
  revision.value = created.revision;
  storageMode.value = 'cloud';
  try { localStorage.removeItem(localProgressKey.value); } catch { /* The cloud copy is saved. */ }
  saveNotice.value = '工房進度已同步到雲端。';
}

async function retryCloudSave() {
  if (busy.value) return;
  busy.value = true;
  try { await loadWorkshop(); notice.value = storageMode.value === 'cloud' ? '工房進度已同步到雲端。' : '雲端存檔仍無法連線，進度已保存在這台裝置。'; }
  finally { busy.value = false; }
}

function rememberSession() {
  try { sessionStorage.setItem(sessionKey.value, JSON.stringify(session.value)); }
  catch { saveNotice.value = '本機暫存無法使用；請保持頁面開啟直到成績同步。'; }
}

async function syncRecord() {
  const entry = session.value;
  if (!entry || !(entry.correct.length + entry.wrong.length)) return;
  const { error } = await db.from('game_records').upsert([{
    id: entry.id, student_id: studentId.value, game_type: ALCHEMY_GAME_TYPE,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: entry.correct.length * 10, mistakes: entry.wrong.length,
    correct_words: entry.correct.join(', '), wrong_words: entry.wrong.join(', '),
    attempt_number: entry.attemptNumber, played_at: new Date(entry.startedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - entry.startedAt) / 1000), device_info: navigator.userAgent
  }], { onConflict: 'id' });
  saveNotice.value = error ? `成績尚未同步：${error.message}。請按「重試同步」。`
    : storageMode.value === 'local' ? '答題成績已同步；工房進度目前只保存在這台裝置，請按「同步雲端進度」。'
      : '工房進度與本次答題成績已同步。';
}

async function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey.value) || 'null');
    if (saved?.id && Array.isArray(saved.correct) && Array.isArray(saved.wrong) && Number.isFinite(saved.startedAt)) session.value = saved;
  } catch { /* Start a fresh record. */ }
  if (!session.value) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId.value).eq('game_type', ALCHEMY_GAME_TYPE)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    session.value = { id: crypto.randomUUID(), startedAt: Date.now(), correct: [], wrong: [], attemptNumber: (count || 0) + 1 };
    rememberSession();
  } else await syncRecord();
}

async function submitAnswer(value = answer.value) {
  if (!quiz.value || busy.value || !String(value).trim()) return;
  busy.value = true;
  const question = quiz.value;
  const correct = String(value).trim().toLowerCase() === question.target;
  let result = '';
  quizError.value = '';
  try {
    if (correct && question.operation.type === 'synthesize') {
      brewing.value = true;
      brewPhase.value = 'brewing';
      await new Promise(resolve => setTimeout(resolve, 1350));
    }
    if (correct) result = await executeOperation(question.operation);
    if (brewing.value) {
      brewPhase.value = 'complete';
      setTimeout(() => { if (brewPhase.value === 'complete') brewPhase.value = 'idle'; }, 2300);
    }
    if (correct) session.value.correct.push(question.word.en_us);
    else session.value.wrong.push(question.word.en_us);
    rememberSession();
    notice.value = correct ? `答對 ${question.word.en_us}！${result}` : `答錯了：${question.word.en_us}＝${question.word.zh_tw}。這次未執行操作。`;
    quiz.value = null;
    answer.value = '';
    await syncRecord();
  } catch (error) { brewPhase.value = 'idle'; quizError.value = `操作未完成：${error.message}`; notice.value = quizError.value; }
  finally { brewing.value = false; busy.value = false; }
}

onMounted(async () => {
  if (!studentId.value) { await navigateTo('/'); return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) { notice.value = '請從首頁選好單字範圍，再進入鍊金工房。'; loading.value = false; return; }
  try {
    const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
    if (error) throw error;
    words.value = (data || []).filter(word => word.en_us && word.zh_tw);
    await loadWorkshop();
    selectedCompanion.value = workshop.value.heroId || '';
    selectedCarrier.value = workshop.value.heroId || '';
    await loadSession();
    notice.value = words.value.length < 4 ? '本課單字不足四筆，請回首頁換一個範圍。' : '鍊金工房已開啟。採集、調合與戰鬥都會出現本課單字題。';
  } catch (error) { notice.value = `載入失敗：${error.message}。請確認新專案已執行鍊金工房 SQL。`; }
  finally { loading.value = false; }
});
</script>

<template>
  <main class="atelier-page">
    <div class="atelier-shell">
      <header class="hero">
        <div class="hero-title"><span class="eyebrow">ASTERIA / VOCABULARY ADVENTURE</span><h1>✧ 單字鍊金工房</h1><p>採集萬物，調合希望，與夥伴探索大陸 15 個區域</p></div>
        <div class="hero-actions"><NuxtLink to="/" class="ghost-button">← 回首頁</NuxtLink><NuxtLink :to="{ path: '/history', query: { game: ALCHEMY_GAME_TYPE } }" class="ghost-button">學習紀錄</NuxtLink><NuxtLink :to="{ path: '/leaderboard', query: { game: ALCHEMY_GAME_TYPE, ...lesson } }" class="ghost-button">全校英雄榜</NuxtLink></div>
      </header>

      <p v-if="loading" class="loading-card">正在調製冒險世界…</p>
      <template v-else>
        <section class="status-row">
          <div><small>單字範圍</small><strong>{{ lessonLabel || '尚未選擇' }}</strong></div>
          <div><small>隊伍生命</small><strong>♥ {{ workshop.hp }} / 100</strong></div>
          <div><small>採集體力</small><strong>⚡ {{ workshop.energy }} / 12</strong></div>
          <div><small>區域攻略</small><strong>{{ worldProgress }}</strong></div>
          <div><small>本次成績</small><strong>{{ score }} 分 · {{ session?.wrong.length || 0 }} 錯</strong></div>
        </section>
        <div class="notice" role="status">{{ notice }}<button v-if="saveNotice.includes('尚未同步')" :disabled="busy" @click="syncRecord">重試同步</button><button v-if="storageMode === 'local'" :disabled="busy" @click="retryCloudSave">同步雲端進度</button></div>
        <div class="tabs"><button v-for="tab in [{ id: 'explore', label: '🗺️ 探索採集' }, { id: 'synthesis', label: '⚗️ 鍊金融合' }, { id: 'battle', label: '⚔️ 戰鬥' }, { id: 'party', label: '✦ 夥伴與圖鑑' }]" :key="tab.id" :class="{ selected: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button></div>

        <section v-if="activeTab === 'explore'" class="main-grid">
          <div class="panel map-panel">
            <div class="panel-title"><div><span class="eyebrow">ATLAS</span><h2>大陸十五區圖誌</h2></div><span class="weather">{{ weather === '晴朗' ? '☀️' : weather === '細雨' ? '🌧️' : weather === '薄霧' ? '🌫️' : '🍃' }} {{ weather }}</span></div>
            <div class="scale-tabs"><button :class="{ on: mapScale === 'continent' }" @click="mapScale = 'continent'">大陸圖</button><button :class="{ on: mapScale === 'region' }" @click="mapScale = 'region'">區域圖</button><button :class="{ on: mapScale === 'site' }" @click="mapScale = 'site'">採集地</button></div>
            <div v-if="mapScale === 'continent'" class="continent-map"><img src="/maps/alchemy-continent.svg" alt="大陸由西向東分成十五個探索區域的地圖"/><button v-for="(region, index) in REGIONS" :key="region.id" class="map-pin" :class="{ current: workshop.regionId === region.id, locked: !workshop.unlocked.includes(region.id) }" :style="{ left: region.x + '%', top: region.y + '%' }" :title="`${index + 1}. ${region.name}`" :aria-label="`${index + 1}. ${region.name}${workshop.unlocked.includes(region.id) ? '' : '，尚未解鎖'}`" @click="chooseRegion(region.id)">{{ workshop.unlocked.includes(region.id) ? index + 1 : '🔒' }}</button></div>
            <div v-else-if="mapScale === 'region'" class="region-map" :style="{ '--region-color': activeRegion.color }"><div class="region-orb"><span>✦</span><h3>{{ activeRegion.name }}</h3><p>{{ activeRegion.subtitle }}</p></div><div class="site-grid"><button v-for="spot in activeRegion.spots" :key="spot.id" :class="{ on: activeSpot.id === spot.id }" @click="chooseSpot(spot.id)"><span>{{ spot.icon }}</span>{{ spot.name }}</button></div></div>
            <div v-else class="site-map" :style="{ '--region-color': activeRegion.color }"><span class="site-icon">{{ activeSpot.icon }}</span><h3>{{ activeSpot.name }}</h3><p>{{ activeRegion.name }} · {{ weather }}</p><div class="site-materials"><span v-for="id in activeSpot.materials" :key="id">{{ materialById(id)?.icon }} {{ materialById(id)?.name }}</span></div><p>採集消耗 1 體力，天氣可能改變素材與品質。</p><button class="primary-button" :disabled="busy || workshop.energy < 1 || words.length < 4" @click="chooseQuestion({ type: 'gather', regionId: activeRegion.id, spotId: activeSpot.id })">採集素材 · 答單字題</button></div>
            <p class="map-caption">大陸海岸線參考《優米雅的鍊金工房》由西向東的長形破碎陸帶與東側環形遺跡；地名、採集點與冒險內容為本站原創。</p>
          </div>
          <aside class="side-stack"><div class="panel"><div class="panel-title"><div><span class="eyebrow">REGION</span><h2>{{ activeRegion.name }}</h2></div><span>解鎖 {{ workshop.unlocked.length }} / {{ REGIONS.length }}</span></div><p>{{ activeRegion.subtitle }} · 守衛：{{ activeRegion.enemy }}</p><div class="region-list"><button v-for="(region, index) in REGIONS" :key="region.id" :disabled="!workshop.unlocked.includes(region.id)" :class="{ on: workshop.regionId === region.id }" @click="chooseRegion(region.id)">{{ workshop.unlocked.includes(region.id) ? `${index + 1}.` : '🔒' }} {{ region.name }} <small>{{ workshop.defeated.includes(region.id) ? '已踏破' : region.subtitle }}</small></button></div><button class="primary-button" :disabled="busy || words.length < 4 || !!battle" @click="newBattle">挑戰 {{ activeRegion.enemy }}</button></div><div class="panel rest-panel"><span>⛺</span><div><h3>工房休息</h3><p>答一題可回滿生命與採集體力。</p></div><button @click="restore" :disabled="busy || !!battle">休息</button></div></aside>
        </section>

        <section v-if="activeTab === 'synthesis'" class="main-grid">
          <div class="panel">
            <div class="panel-title"><div><span class="eyebrow">SYNTHESIS</span><h2>調合釜 · {{ RECIPES.length }} 種配方</h2></div><span>已調合 {{ workshop.synthesisCount }} 次</span></div>
            <AlchemyCauldron :active="brewing" :success="brewPhase === 'complete'"/>
            <p class="intro">從不同採集地取得素材，品質與屬性會延續到成品。調合時鍊金釜會展示融合動畫。</p>
            <div class="recipe-filters"><button v-for="kind in recipeKinds" :key="kind.id" :class="{ on: recipeFilter === kind.id }" @click="recipeFilter = kind.id">{{ kind.name }}</button></div>
            <div class="recipe-grid"><button v-for="item in filteredRecipes" :key="item.id" :class="{ on: selectedRecipe === item.id }" @click="selectedRecipe = item.id"><span>{{ item.icon }}</span><strong>{{ item.name }}</strong><small>{{ item.effect }}</small></button></div>
            <div class="recipe-detail"><div><h3>{{ recipe.icon }} {{ recipe.name }}</h3><p>{{ recipe.effect }} · 可在戰鬥使用</p><div class="ingredient-list"><span v-for="(count, id) in recipe.ingredients" :key="id" :class="{ missing: (workshop.inventory[id]?.count || 0) < count }">{{ materialById(id)?.icon }} {{ materialById(id)?.name }} {{ workshop.inventory[id]?.count || 0 }}/{{ count }}</span></div></div><button class="primary-button" :disabled="busy || !canSynthesize(workshop, recipe) || words.length < 4" @click="chooseQuestion({ type: 'synthesize', recipeId: recipe.id })">投入鍊金釜 · 答單字題</button></div>
          </div>
          <aside class="side-stack"><div class="panel"><div class="panel-title"><div><span class="eyebrow">BAG</span><h2>素材背包</h2></div></div><div v-if="inventoryList.length" class="stock-list"><div v-for="material in inventoryList" :key="material.id"><span>{{ material.icon }} {{ material.name }}<small>{{ material.element }}屬性 · 平均品質 {{ Math.round(workshop.inventory[material.id].totalQuality / workshop.inventory[material.id].count) }}</small></span><b>×{{ workshop.inventory[material.id].count }}</b></div></div><p v-else>背包是空的。先到大陸探索採集。</p></div><div class="panel"><h3>調合成品 · 工房背包</h3><p class="intro">成品先放在工房；交給角色攜帶後，該角色出戰才能使用。每位角色最多攜帶六件。</p><label class="carrier-select">交給角色 <select v-model="selectedCarrier"><option v-for="person in allActors" :key="person.id" :value="person.id">{{ person.name }} · {{ person.job }}{{ activeParty.some(member => member.id === person.id) ? '（出戰）' : '' }}</option></select></label><div v-if="productList.length" class="stock-list"><div v-for="item in productList" :key="item.id"><span>{{ item.icon }} {{ item.name }}<small>{{ item.effect }}</small></span><div class="stock-actions"><b>×{{ workshop.items[item.id].count }}</b><button :disabled="busy || !!battle || !selectedCarrier || carriedCount(selectedCarrier) >= 6" @click="moveItem(item.id, selectedCarrier, 'equip')">交給角色</button></div></div></div><p v-else>尚未完成任何調合，或成品已全部交給角色。</p></div></aside>
        </section>

        <section v-if="activeTab === 'battle'" class="main-grid">
          <div class="panel battle-panel">
            <div class="panel-title"><div><span class="eyebrow">BATTLE</span><h2>{{ battle ? `對戰 · ${battle.enemy}` : '隊伍戰鬥' }}</h2></div><span>擊敗守衛可解鎖下一區</span></div>
            <div v-if="!battle" class="battle-idle"><span>⚔️</span><h3>前往 {{ activeRegion.name }} 的守衛戰</h3><p>主角與最多三位同伴出戰。戰鬥道具須先在工房背包交給角色攜帶。</p><button class="primary-button" :disabled="busy || words.length < 4 || !hero" @click="newBattle">開始挑戰 {{ activeRegion.enemy }}</button></div>
            <template v-else>
              <div class="enemy-card"><span>👁️</span><div><h3>{{ battle.enemy }}</h3><p>第 {{ battle.round }} 回合 · {{ activeRegion.name }}</p><div class="hp-track"><i :style="{ width: (battle.hp / battle.maxHp * 100) + '%' }"></i></div><strong>{{ battle.hp }} / {{ battle.maxHp }} HP</strong></div></div>
              <div class="fighter-list"><button v-for="person in activeParty" :key="person.id" :class="{ on: selectedCompanion === person.id }" @click="chooseFighter(person.id)"><img :src="person.portrait" :alt="person.name + '立繪'"/><span><strong>{{ person.name }}</strong><small>{{ person.job }} · 攜帶 {{ carriedCount(person.id) }} 件</small></span></button></div>
              <div class="battle-actions"><button :disabled="busy" @click="chooseQuestion({ type: 'battle', move: 'attack', companionId: selectedCompanion })">⚔ 普通攻擊</button><button :disabled="busy" @click="chooseQuestion({ type: 'battle', move: 'skill', companionId: selectedCompanion })">✦ 職業技能</button><button :disabled="busy" @click="chooseQuestion({ type: 'battle', move: 'guard', companionId: selectedCompanion })">🛡 防禦</button><select v-model="selectedItem" aria-label="選擇目前角色攜帶的道具"><option v-if="!battleItems.length" value="">未攜帶道具</option><option v-for="item in battleItems" :key="item.id" :value="item.id">{{ item.name }} ×{{ workshop.loadouts[selectedCompanion]?.[item.id]?.count || 0 }}</option></select><button :disabled="busy || !selectedItem || !workshop.loadouts[selectedCompanion]?.[selectedItem]?.count" @click="chooseQuestion({ type: 'battle', move: 'item', companionId: selectedCompanion, itemId: selectedItem })">🧪 使用道具</button><button class="ghost-button" :disabled="busy || !!quiz" @click="abandonBattle">撤退</button></div>
            </template>
          </div>
          <aside class="side-stack"><div class="panel"><h3>出戰隊伍</h3><div v-for="person in activeParty" :key="person.id" class="member-line"><span>{{ person.icon }} {{ person.name }} · {{ person.job }}</span><small>{{ person.skill }} / 基礎 {{ person.damage }} / 攜帶 {{ carriedCount(person.id) }} 件</small></div><button v-if="!battle" class="ghost-button" @click="activeTab = 'party'">調整同伴與行囊</button></div><div class="panel"><h3>戰鬥提示</h3><p>每次出手都需回答單字題。答錯不會出手，敵人也不會反擊；HP 歸零會返回工房。</p></div></aside>
        </section>

        <section v-if="activeTab === 'party'" class="party-layout">
          <div class="panel"><div class="panel-title"><div><span class="eyebrow">COMPANIONS</span><h2>主角與冒險夥伴</h2></div><span>出戰 {{ workshop.partyIds.length }} / 3 位同伴</span></div><p class="intro">主角固定出戰。從十位同伴中選最多三位；調整隊伍後，已攜帶的道具會留在原角色身上。</p><div v-if="hero" class="hero-summary"><img :src="hero.portrait" :alt="hero.name + '立繪'"/><div><small>主角 · {{ hero.gender }} · {{ hero.job }}</small><h3>{{ hero.name }}</h3><p>{{ hero.skill }} · 基礎傷害 {{ hero.damage }} · 攜帶 {{ carriedCount(hero.id) }} 件</p></div></div><div class="portrait-grid"><article v-for="person in PARTY" :key="person.id" class="portrait-card" :class="{ enlisted: workshop.partyIds.includes(person.id) }"><div class="portrait-frame"><img :src="person.portrait" :alt="person.name + '立繪'" loading="lazy"/></div><div><small>{{ person.race }} · {{ person.job }}</small><h3>{{ person.name }}</h3><p>{{ person.skill }} · 傷害 {{ person.damage }} · 攜帶 {{ carriedCount(person.id) }} 件</p><button :disabled="busy || !!battle || (!workshop.partyIds.includes(person.id) && workshop.partyIds.length >= 3)" @click="toggleCompanion(person.id)">{{ workshop.partyIds.includes(person.id) ? '移出隊伍' : '加入隊伍' }}</button></div></article></div></div>
          <aside class="side-stack"><div class="panel"><h3>角色行囊</h3><p class="intro">已分配道具可在此取回工房。未出戰角色的道具無法在戰鬥中使用。</p><div v-for="person in allActors" :key="person.id" class="loadout-person"><strong>{{ person.name }}{{ activeParty.some(member => member.id === person.id) ? ' · 出戰' : '' }}（{{ carriedCount(person.id) }}/6）</strong><div v-if="carriedCount(person.id)" class="loadout-items"><div v-for="item in RECIPES.filter(recipe => workshop.loadouts[person.id]?.[recipe.id]?.count)" :key="item.id"><span>{{ item.icon }} {{ item.name }} ×{{ workshop.loadouts[person.id][item.id].count }}</span><button :disabled="busy || !!battle" @click="moveItem(item.id, person.id, 'return')">取回</button></div></div><small v-else>未攜帶道具</small></div></div><div class="panel"><div class="panel-title"><div><span class="eyebrow">CODEX</span><h2>素材圖鑑與鍊金日誌</h2></div><span>{{ workshop.discoveries.length }}/{{ MATERIALS.length }}</span></div><div class="discovery-grid"><span v-for="material in MATERIALS" :key="material.id" :class="{ unknown: !workshop.discoveries.includes(material.id) }">{{ workshop.discoveries.includes(material.id) ? `${material.icon} ${material.name}` : '？ 未發現' }}</span></div><h3>最近冒險</h3><p v-for="(entry, index) in workshop.journal" :key="index" class="journal-line">{{ entry }}</p></div></aside>
        </section>
        <p class="save-note">{{ saveNotice }}　採集 {{ workshop.gatheringCount }} 次 · 調合 {{ workshop.synthesisCount }} 次 · 勝利 {{ workshop.victories }} 次</p>
      </template>

      <div v-if="!loading && !workshop.heroId && lessonLabel" class="character-overlay" role="dialog" aria-modal="true" aria-label="選擇鍊金術士主角">
        <div class="character-card"><span class="eyebrow">BEGIN YOUR STORY</span><h2>選擇你的鍊金術士</h2><p>三位女性、三位男性，選定後將成為這份工房存檔的主角。原有玩家的採集與調合進度會保留。</p>
          <div class="starter-grid"><button v-for="person in ALCHEMISTS" :key="person.id" :class="{ on: startingHero === person.id }" @click="startingHero = person.id"><img :src="person.portrait" :alt="person.name + '立繪'"/><strong>{{ person.name }}</strong><small>{{ person.gender }} · {{ person.job }} · {{ person.skill }}</small></button></div>
          <h3>挑選起始同伴 <small>可選 0–3 位，之後仍可調整</small></h3><div class="starter-companions"><button v-for="person in PARTY" :key="person.id" :class="{ on: startingParty.includes(person.id) }" :disabled="!startingParty.includes(person.id) && startingParty.length >= 3" @click="toggleStartingCompanion(person.id)"><img :src="person.portrait" :alt="person.name + '立繪'"/><span>{{ person.name }}<small>{{ person.job }}</small></span></button></div>
          <button class="primary-button start-button" :disabled="busy" @click="confirmCharacter">{{ busy ? '儲存中…' : '確定主角，開始冒險' }}</button>
        </div>
      </div>

      <div v-if="quiz" class="quiz-overlay"><div class="quiz-card">
        <span class="eyebrow">VOCABULARY CHALLENGE</span><h2>{{ brewing ? '鍊金融合中…' : '回答單字，完成行動' }}</h2>
        <template v-if="brewing"><AlchemyCauldron active/><p class="brew-message">素材正在鍊金釜中融合，請稍候。</p></template>
        <template v-else><p>「{{ quiz.word.zh_tw }}」的英文是？</p>
          <template v-if="quiz.mode === 'choice'"><div class="quiz-choices"><button v-for="option in quiz.options" :key="option" :disabled="busy" :class="{ selected: answer === option }" @click="answer = option">{{ option }}</button></div></template>
          <template v-else><div class="letter-prompt">{{ quiz.prompt }}</div><label class="answer-label">請填入缺少的兩個英文字母<input v-model="answer" maxlength="2" autocomplete="off" autocapitalize="off" @keyup.enter="submitAnswer()"/></label></template>
          <button class="primary-button submit-quiz" :disabled="busy || (quiz.mode === 'letters' ? answer.trim().length !== 2 : !answer)" @click="submitAnswer()">{{ busy ? '處理中…' : '送出答案' }}</button>
          <p v-if="quizError" class="quiz-error" role="alert">{{ quizError }}</p>
          <p v-if="busy" class="quiz-processing">正在儲存進度，請稍候…</p>
          <button class="cancel-quiz" :disabled="busy" @click="quiz = null">取消這次操作</button>
        </template>
      </div></div>
    </div>
  </main>
</template>

<style scoped>
.atelier-page{min-height:100vh;background:radial-gradient(circle at 15% 3%,#365b64 0,transparent 34%),linear-gradient(140deg,#0c1727,#14263a 48%,#0c1727);color:#f3ebd8;font-family:'Noto Sans TC',sans-serif;padding:18px}.atelier-shell{max-width:1700px;margin:auto}.hero{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 24px;border:1px solid #bba87955;border-radius:20px;background:linear-gradient(100deg,#233745ee,#15283bee);box-shadow:0 12px 36px #030b17aa}.hero h1{font-family:serif;font-size:clamp(27px,3vw,45px);letter-spacing:.08em;margin:4px 0}.hero p{margin:0;color:#c9d7d1}.eyebrow{font-size:11px;letter-spacing:.23em;color:#d8c089;font-weight:800}.hero-actions{display:flex;gap:8px;flex-wrap:wrap}.ghost-button,.hero-actions a{display:inline-flex;align-items:center;justify-content:center;color:#f2e2bd;border:1px solid #bca67e88;background:#263c4b;border-radius:9px;padding:9px 12px;text-decoration:none;cursor:pointer}.status-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:14px 0}.status-row>div{border:1px solid #627b80aa;background:#1b3440d9;border-radius:12px;padding:9px 13px}.status-row small,.status-row strong{display:block}.status-row small{font-size:12px;color:#afc4c2}.status-row strong{margin-top:4px;color:#f5e4be}.notice{min-height:42px;padding:10px 15px;background:#efce8350;border-left:4px solid #f2cf8c;color:#fff4d8;border-radius:6px;margin-bottom:12px}.notice button{margin-left:10px}.tabs,.scale-tabs{display:flex;gap:8px;flex-wrap:wrap}.tabs{margin:0 0 12px}.tabs button,.scale-tabs button{border:1px solid #6b8588;background:#193445;color:#d6e9e4;border-radius:9px;padding:10px 16px;cursor:pointer;font-weight:700}.tabs button.selected,.scale-tabs button.on{background:#c99e62;color:#182736;border-color:#f2d5a0}.main-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(290px,.8fr);gap:12px}.panel{background:linear-gradient(145deg,#203845e8,#182d3ce8);border:1px solid #708c8b88;border-radius:17px;padding:17px;box-shadow:0 8px 20px #0003}.panel-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.panel-title h2{font-family:serif;font-size:25px;margin:3px 0}.panel-title>span,.weather{color:#d6c290;font-size:13px}.side-stack{display:flex;flex-direction:column;gap:12px}.map-panel{min-width:0;overflow-x:auto}.continent-map{position:relative;aspect-ratio:14/5;background:#11283a;border:3px solid #9b805f;border-radius:12px;overflow:hidden}.continent-map img{display:block;width:100%;height:100%;object-fit:fill}.map-pin{position:absolute;transform:translate(-50%,-50%);z-index:1;border:1px solid #f1e6bd;background:#172e3de8;color:#f9eccb;border-radius:20px;font-size:12px;font-weight:800;white-space:nowrap;padding:5px 9px;box-shadow:0 3px 12px #0019;cursor:pointer}.map-pin span{margin-right:4px}.map-pin.current{background:#e8bf77;color:#162737}.map-pin.locked{opacity:.7}.map-caption,.intro{font-size:13px;color:#b7cbc9;line-height:1.6}.region-map,.site-map{min-height:370px;background:radial-gradient(circle at 50% 50%,var(--region-color),transparent 58%),linear-gradient(145deg,#204c50,#173143 70%);border:2px solid #a8b79a;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px}.region-orb{background:#142c3cc9;border:2px solid var(--region-color);box-shadow:0 0 35px var(--region-color);border-radius:50%;width:175px;height:175px;display:flex;align-items:center;justify-content:center;flex-direction:column}.region-orb span{font-size:42px}.region-orb h3,.site-map h3{margin:0;font-family:serif;font-size:26px}.region-orb p,.site-map p{font-size:13px;margin:0}.site-grid{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.site-grid button{background:#203747ee;border:1px solid #d3c396;border-radius:12px;color:#f8ebcd;padding:12px;min-width:130px;cursor:pointer}.site-grid button span{display:block;font-size:30px}.site-grid button.on{background:#b98f61;color:#152a35}.site-icon{font-size:75px}.site-materials,.ingredient-list{display:flex;gap:7px;flex-wrap:wrap}.site-materials span,.ingredient-list span{background:#132f3c;border:1px solid #6b8a87;border-radius:8px;padding:7px 10px}.primary-button{background:linear-gradient(110deg,#f5cf86,#ca995e);border:1px solid #ffdf99;border-radius:9px;color:#202f35;font-weight:900;padding:11px 17px;cursor:pointer}.primary-button:disabled,button:disabled{opacity:.48;cursor:not-allowed}.region-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:14px 0}.region-list button{display:flex;flex-direction:column;text-align:left;gap:2px;background:#254453;border:1px solid #738a85;color:#f7e8c7;border-radius:8px;padding:8px;cursor:pointer}.region-list button.on{border-color:#ffd381;background:#536147}.region-list small{color:#c5d6ce}.rest-panel{display:flex;align-items:center;gap:10px}.rest-panel>span{font-size:30px}.rest-panel h3,.rest-panel p{margin:2px}.rest-panel button{margin-left:auto;padding:8px;border-radius:8px;border:1px solid #e6c580;background:#38515a;color:#fff;cursor:pointer}.recipe-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.recipe-grid button{min-height:100px;background:#24404a;border:1px solid #64837e;border-radius:11px;color:#f5e8cd;cursor:pointer;padding:8px}.recipe-grid button.on{background:#6e674d;border-color:#eed399}.recipe-grid button span,.recipe-grid button strong,.recipe-grid button small{display:block}.recipe-grid button span{font-size:27px}.recipe-grid button small{font-size:11px;color:#c2d4ce}.recipe-detail{display:flex;justify-content:space-between;align-items:end;gap:12px;background:#122d3c;border-radius:11px;margin-top:12px;padding:16px}.recipe-detail h3{margin:0}.recipe-detail p{margin:4px 0 12px}.ingredient-list .missing{border-color:#cd796a;color:#ffc4b5}.stock-list>div{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #64828266;padding:8px 0}.stock-list small{display:block;color:#abc1bd}.battle-idle{text-align:center;padding:65px 15px}.battle-idle>span{font-size:74px}.battle-idle p{color:#b7cdca}.enemy-card{display:flex;gap:22px;align-items:center;background:radial-gradient(circle at 20% 40%,#9d5a6d55,#263449);padding:20px;border-radius:12px}.enemy-card>span{font-size:72px}.enemy-card>div{flex:1}.enemy-card h3,.enemy-card p{margin:4px 0}.hp-track{width:100%;height:15px;border-radius:9px;background:#15222d;overflow:hidden}.hp-track i{display:block;height:100%;background:linear-gradient(90deg,#da6a68,#f2a577)}.fighter-list{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0}.fighter-list button{display:flex;align-items:center;background:#233d4c;color:#fff0d3;border:1px solid #6c8987;border-radius:10px;padding:4px;cursor:pointer}.fighter-list button.on{background:#6b674c;border-color:#f2d197}.fighter-list img{width:48px;height:58px;object-fit:cover;object-position:top;border-radius:6px;margin-right:6px}.fighter-list small{display:block}.battle-actions{display:flex;gap:8px;flex-wrap:wrap}.battle-actions button,.battle-actions select{border:1px solid #bbad87;background:#2e5060;color:#fff0d3;border-radius:9px;padding:9px;cursor:pointer}.member-line{padding:8px;border-bottom:1px solid #68858855}.member-line span,.member-line small{display:block}.member-line small{color:#b3ceca}.party-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(290px,1fr);gap:12px}.portrait-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.portrait-card{background:#142e3c;border:1px solid #8a9384;border-radius:12px;overflow:hidden}.portrait-frame{height:320px;overflow:hidden}.portrait-frame img{width:100%;height:100%;object-fit:cover;object-position:top}.portrait-card>div:last-child{padding:10px}.portrait-card small{color:#c6d8ca}.portrait-card h3{margin:4px 0;font-family:serif}.portrait-card p{margin:0;font-size:12px}.discovery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:14px 0}.discovery-grid span{padding:8px;background:#274454;border-radius:8px}.discovery-grid span.unknown{opacity:.48}.journal-line{margin:4px 0;padding:5px;border-bottom:1px solid #68858855;font-size:12px}.save-note{color:#b4c8c4;text-align:right}.loading-card{padding:50px;text-align:center}.quiz-overlay{position:fixed;inset:0;background:#06131acf;display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}.quiz-card{width:min(550px,100%);background:linear-gradient(145deg,#283f4e,#182d3a);border:2px solid #f1cc89;box-shadow:0 15px 70px #000a;border-radius:18px;padding:25px;text-align:center}.quiz-card h2{font-family:serif}.quiz-card>p{font-size:23px;font-weight:900;color:#ffe2a7}.quiz-choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quiz-choices button{background:#2c5664;border:1px solid #a8c1af;color:#fff;border-radius:9px;padding:14px;cursor:pointer;font-size:18px}.quiz-choices button:hover{background:#89724e}.letter-prompt{font-size:30px;letter-spacing:.17em;margin:20px 0;color:#ffe2a7}.answer-label{display:block;margin:12px}.answer-label input{display:block;margin:8px auto;background:#f7f0e1;padding:10px;font-size:23px;text-align:center;width:120px;border-radius:8px}.cancel-quiz{display:block;margin:15px auto 0;border:0;background:none;color:#e2ccaa;text-decoration:underline;cursor:pointer}
.map-pin{width:32px;height:32px;padding:0;border-radius:50%;font-size:12px;text-align:center}
.region-list{max-height:380px;overflow-y:auto;padding-right:4px}
.recipe-filters{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}
.recipe-filters button{padding:7px 12px;border:1px solid #7d9990;background:#1c3a48;color:#e8efdc;border-radius:20px;cursor:pointer}
.recipe-filters button.on{background:#d8ad6d;color:#17303a;font-weight:800}
.recipe-grid{max-height:420px;overflow-y:auto;padding-right:5px}
.quiz-error{font-size:14px!important;color:#fff2e2!important;background:#8a3540;border:1px solid #ffc9b5;border-radius:9px;padding:10px;line-height:1.5}
.quiz-choices button.selected{background:#d4a768;color:#142a36;border-color:#fff0ba;box-shadow:0 0 0 3px #eac99255}
.submit-quiz{margin-top:14px;min-width:150px}
.quiz-processing,.brew-message{font-size:14px!important;color:#d9eadf!important}
.quiz-card .cauldron-scene{height:240px;width:min(100%,330px)}
.character-overlay{position:fixed;inset:0;z-index:1100;background:#06131aef;display:flex;align-items:center;justify-content:center;padding:15px}
.character-card{width:min(1180px,100%);max-height:calc(100dvh - 30px);overflow:auto;background:linear-gradient(145deg,#263f4c,#142938);border:2px solid #d7b777;border-radius:18px;padding:22px;box-shadow:0 20px 75px #000b}
.character-card h2{font:700 32px serif;margin:4px 0}.character-card p{color:#d1ded5}.character-card h3 small{font:400 13px 'Noto Sans TC',sans-serif;color:#cbd8ce}
.starter-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.starter-grid button{background:#183542;border:2px solid #688583;border-radius:12px;color:#f8eed8;padding:7px;cursor:pointer;text-align:left}.starter-grid button.on,.starter-companions button.on{border-color:#ffda8c;background:#5a5d48;box-shadow:0 0 0 2px #f7ce7955}.starter-grid img{display:block;width:100%;height:200px;object-fit:cover;object-position:top;border-radius:7px}.starter-grid strong,.starter-grid small{display:block;margin-top:5px}.starter-grid small{font-size:12px;color:#d0dfd7}
.starter-companions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.starter-companions button{display:flex;align-items:center;gap:7px;background:#1d3b49;color:#f5ecd9;border:2px solid #718c87;border-radius:10px;padding:5px;cursor:pointer;text-align:left}.starter-companions img{width:40px;height:52px;object-fit:cover;object-position:top;border-radius:5px}.starter-companions small{display:block;color:#c3d7ce}.start-button{display:block;margin:18px auto 0;font-size:17px}
.carrier-select{display:block;margin:8px 0 12px}.carrier-select select{display:block;width:100%;margin-top:6px;background:#163745;border:1px solid #b8b08d;border-radius:8px;color:#f8efd8;padding:9px}.stock-actions{display:flex;align-items:center;gap:8px}.stock-actions button,.loadout-items button,.portrait-card button{background:#335467;border:1px solid #cdb98b;border-radius:7px;color:#fff0d0;padding:6px 8px;cursor:pointer}.stock-actions button:disabled,.loadout-items button:disabled{opacity:.5}.hero-summary{display:flex;align-items:center;gap:15px;margin:12px 0 18px;background:#314b52;border:1px solid #d8bc87;border-radius:12px;overflow:hidden}.hero-summary img{width:105px;height:140px;object-fit:cover;object-position:top}.hero-summary h3{font:700 25px serif;margin:5px 0}.hero-summary p{margin:0}.portrait-card.enlisted{border:2px solid #efca87}.portrait-card button{margin-top:10px}.loadout-person{border-bottom:1px solid #6d878477;padding:10px 0}.loadout-person>small{display:block;color:#b4c9c1;margin-top:4px}.loadout-items>div{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:5px;background:#163642;border-radius:7px;padding:5px}.loadout-items span{font-size:13px}
@media(max-width:950px){.starter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.starter-companions{grid-template-columns:repeat(3,minmax(0,1fr))}.starter-grid img{height:170px}}
@media(max-width:600px){.character-card{padding:12px}.character-card h2{font-size:25px}.starter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.starter-grid img{height:170px}.starter-companions{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-summary img{width:85px;height:115px}.hero-summary p{font-size:12px}.stock-actions{flex-direction:column;align-items:flex-end}}
@media(max-width:1050px){.main-grid,.party-layout{grid-template-columns:1fr}.side-stack{display:grid;grid-template-columns:1fr 1fr}.portrait-frame{height:250px}}@media(max-width:700px){.atelier-page{padding:8px}.hero{display:block;padding:14px}.hero-actions{margin-top:12px}.status-row{grid-template-columns:repeat(2,1fr)}.status-row>div:last-child{grid-column:span 2}.tabs button{flex:1 1 40%}.panel{padding:12px}.continent-map{min-width:680px}.map-pin{font-size:10px;padding:4px}.side-stack{display:flex}.recipe-grid,.fighter-list,.portrait-grid{grid-template-columns:repeat(2,1fr)}.portrait-frame{height:260px}.recipe-detail{display:block}.recipe-detail button{margin-top:12px}.battle-actions>*{flex:1 1 43%}.discovery-grid{grid-template-columns:repeat(2,1fr)}}
</style>
