<script setup>
import { computed, onMounted, ref } from 'vue';
import { ALCHEMY_GAME_TYPE, MATERIALS, PARTY, RECIPES, REGIONS, appendJournal, canSynthesize, freshAtelier, gather, materialById, normalizeAtelier, recipeById, regionById, synthesize, weatherFor } from '~/lib/alchemy-atelier';

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
const selectedCompanion = ref('alchemist');
const selectedItem = ref('spark');
const battle = ref(null);
const quiz = ref(null);
const answer = ref('');
const session = ref(null);
const sessionKey = computed(() => `alchemy-atlier:${studentId.value}:${lesson.version}:${lesson.volume}:${lesson.unit}`);

const activeRegion = computed(() => regionById(workshop.value.regionId));
const activeSpot = computed(() => activeRegion.value.spots.find(spot => spot.id === workshop.value.spotId) || activeRegion.value.spots[0]);
const weather = computed(() => weatherFor(activeRegion.value.id, workshop.value.weatherStep));
const recipe = computed(() => recipeById(selectedRecipe.value) || RECIPES[0]);
const score = computed(() => (session.value?.correct.length || 0) * 10);
const inventoryList = computed(() => MATERIALS.filter(material => (workshop.value.inventory[material.id]?.count || 0) > 0));
const productList = computed(() => RECIPES.filter(item => (workshop.value.items[item.id]?.count || 0) > 0));
const worldProgress = computed(() => `${workshop.value.defeated.length}/${REGIONS.length}`);

function chooseRegion(id) {
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
}

function newBattle() {
  if (battle.value) return;
  const region = activeRegion.value;
  battle.value = { regionId: region.id, enemy: region.enemy, hp: region.hp, maxHp: region.hp, guarding: false, round: 1 };
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
  const next = normalizeAtelier(structuredClone(workshop.value));
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
    const fighter = PARTY.find(person => person.id === operation.companionId) || PARTY[0];
    const selected = recipeById(operation.itemId);
    let damage = 0;
    if (operation.move === 'attack') damage = fighter.damage + Math.floor(Math.random() * 7);
    else if (operation.move === 'skill') damage = fighter.damage + 9 + Math.floor(Math.random() * 6);
    else if (operation.move === 'guard') nextBattle.guarding = true;
    else if (operation.move === 'item') {
      if (!selected || (next.items[selected.id]?.count || 0) < 1) throw new Error('這項道具已經用完。');
      next.items[selected.id].count -= 1;
      if (['healing', 'elixir'].includes(selected.id)) next.hp = Math.min(100, next.hp + selected.power);
      else if (selected.id === 'ward') nextBattle.guarding = true;
      else damage = selected.power + Math.floor((next.items[selected.id].totalQuality || 0) / Math.max(1, next.items[selected.id].count + 1) / 10);
    }
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
      const incoming = Math.max(1, Math.floor((region.attack + Math.random() * 5) * (nextBattle.guarding ? .5 : 1)));
      next.hp = Math.max(0, next.hp - incoming);
      nextBattle.guarding = false;
      nextBattle.round += 1;
      message += ` ${region.enemy}反擊，隊伍受到 ${incoming} 傷害。`;
      if (next.hp === 0) { next.hp = 35; nextBattle = null; message += ' 隊伍敗退，回工房恢復至 35 HP。'; }
    }
    appendJournal(next, message);
  } else throw new Error('未知的操作。');
  await saveWorkshop(next);
  battle.value = nextBattle;
  return message;
}

async function saveWorkshop(next) {
  const { data, error } = await db.from('alchemy_atelier_states')
    .update({ workshop: next, revision: revision.value + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', revision.value).select('revision').maybeSingle();
  if (error) throw error;
  if (!data) { await loadWorkshop(); throw new Error('另一個分頁已更新鍊金工房，請重新操作。'); }
  workshop.value = next;
  revision.value = data.revision;
}

async function loadWorkshop() {
  const { data, error } = await db.from('alchemy_atelier_states').select('workshop,revision').eq('student_id', studentId.value).maybeSingle();
  if (error) throw error;
  if (data) { workshop.value = normalizeAtelier(data.workshop); revision.value = data.revision; return; }
  const { data: created, error: createError } = await db.from('alchemy_atelier_states')
    .insert({ student_id: studentId.value, workshop: freshAtelier() }).select('workshop,revision').single();
  if (createError?.code === '23505') return loadWorkshop();
  if (createError) throw createError;
  workshop.value = normalizeAtelier(created.workshop);
  revision.value = created.revision;
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
  saveNotice.value = error ? `成績尚未同步：${error.message}。請按「重試同步」。` : '進度與本次答題成績已同步。';
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
  try {
    if (correct) result = await executeOperation(question.operation);
    if (correct) session.value.correct.push(question.word.en_us);
    else session.value.wrong.push(question.word.en_us);
    rememberSession();
    await syncRecord();
    notice.value = correct ? `答對 ${question.word.en_us}！${result}` : `答錯了：${question.word.en_us}＝${question.word.zh_tw}。這次未執行操作。`;
    quiz.value = null;
    answer.value = '';
  } catch (error) { notice.value = `操作未完成：${error.message}`; }
  finally { busy.value = false; }
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
        <div class="hero-title"><span class="eyebrow">ASTERIA / VOCABULARY ADVENTURE</span><h1>✧ 單字鍊金工房</h1><p>採集萬物，調合希望，與夥伴穿越六域大陸</p></div>
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
        <div class="notice" role="status">{{ notice }}<button v-if="saveNotice.includes('尚未同步')" @click="syncRecord">重試同步</button></div>
        <div class="tabs"><button v-for="tab in [{ id: 'explore', label: '🗺️ 探索採集' }, { id: 'synthesis', label: '⚗️ 鍊金融合' }, { id: 'battle', label: '⚔️ 戰鬥' }, { id: 'party', label: '✦ 夥伴與圖鑑' }]" :key="tab.id" :class="{ selected: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button></div>

        <section v-if="activeTab === 'explore'" class="main-grid">
          <div class="panel map-panel">
            <div class="panel-title"><div><span class="eyebrow">ATLAS</span><h2>六域大陸圖誌</h2></div><span class="weather">{{ weather === '晴朗' ? '☀️' : weather === '細雨' ? '🌧️' : weather === '薄霧' ? '🌫️' : '🍃' }} {{ weather }}</span></div>
            <div class="scale-tabs"><button :class="{ on: mapScale === 'continent' }" @click="mapScale = 'continent'">大陸圖</button><button :class="{ on: mapScale === 'region' }" @click="mapScale = 'region'">區域圖</button><button :class="{ on: mapScale === 'site' }" @click="mapScale = 'site'">採集地</button></div>
            <div v-if="mapScale === 'continent'" class="continent-map"><img src="/maps/alchemy-continent.svg" alt="六域大陸的破碎海岸、北方半島和區域位置"/><button v-for="region in REGIONS" :key="region.id" class="map-pin" :class="{ current: workshop.regionId === region.id, locked: !workshop.unlocked.includes(region.id) }" :style="{ left: region.x + '%', top: region.y + '%' }" @click="chooseRegion(region.id)"><span>{{ workshop.unlocked.includes(region.id) ? '✦' : '🔒' }}</span>{{ region.name }}</button></div>
            <div v-else-if="mapScale === 'region'" class="region-map" :style="{ '--region-color': activeRegion.color }"><div class="region-orb"><span>✦</span><h3>{{ activeRegion.name }}</h3><p>{{ activeRegion.subtitle }}</p></div><div class="site-grid"><button v-for="spot in activeRegion.spots" :key="spot.id" :class="{ on: activeSpot.id === spot.id }" @click="chooseSpot(spot.id)"><span>{{ spot.icon }}</span>{{ spot.name }}</button></div></div>
            <div v-else class="site-map" :style="{ '--region-color': activeRegion.color }"><span class="site-icon">{{ activeSpot.icon }}</span><h3>{{ activeSpot.name }}</h3><p>{{ activeRegion.name }} · {{ weather }}</p><div class="site-materials"><span v-for="id in activeSpot.materials" :key="id">{{ materialById(id)?.icon }} {{ materialById(id)?.name }}</span></div><p>採集消耗 1 體力，天氣可能改變素材與品質。</p><button class="primary-button" :disabled="busy || workshop.energy < 1 || words.length < 4" @click="chooseQuestion({ type: 'gather', regionId: activeRegion.id, spotId: activeSpot.id })">採集素材 · 答單字題</button></div>
            <p class="map-caption">大陸海岸線參考《優米雅的鍊金工房》由西向東的長形破碎陸帶與東側環形遺跡；地名、採集點與冒險內容為本站原創。</p>
          </div>
          <aside class="side-stack"><div class="panel"><div class="panel-title"><div><span class="eyebrow">REGION</span><h2>{{ activeRegion.name }}</h2></div><span>解鎖 {{ workshop.unlocked.length }} / {{ REGIONS.length }}</span></div><p>{{ activeRegion.subtitle }} · 守衛：{{ activeRegion.enemy }}</p><div class="region-list"><button v-for="region in REGIONS" :key="region.id" :disabled="!workshop.unlocked.includes(region.id)" :class="{ on: workshop.regionId === region.id }" @click="chooseRegion(region.id)">{{ workshop.unlocked.includes(region.id) ? '✦' : '🔒' }} {{ region.name }} <small>{{ workshop.defeated.includes(region.id) ? '已踏破' : region.subtitle }}</small></button></div><button class="primary-button" :disabled="busy || words.length < 4 || !!battle" @click="newBattle">挑戰 {{ activeRegion.enemy }}</button></div><div class="panel rest-panel"><span>⛺</span><div><h3>工房休息</h3><p>答一題可回滿生命與採集體力。</p></div><button @click="restore" :disabled="busy || !!battle">休息</button></div></aside>
        </section>

        <section v-if="activeTab === 'synthesis'" class="main-grid"><div class="panel"><div class="panel-title"><div><span class="eyebrow">SYNTHESIS</span><h2>調合釜</h2></div><span>已調合 {{ workshop.synthesisCount }} 次</span></div><p class="intro">從不同採集地取得素材，品質與屬性會延續到成品。調合前需要答對本課單字。</p><div class="recipe-grid"><button v-for="item in RECIPES" :key="item.id" :class="{ on: selectedRecipe === item.id }" @click="selectedRecipe = item.id"><span>{{ item.icon }}</span><strong>{{ item.name }}</strong><small>{{ item.effect }}</small></button></div><div class="recipe-detail"><div><h3>{{ recipe.icon }} {{ recipe.name }}</h3><p>{{ recipe.effect }}</p><div class="ingredient-list"><span v-for="(count, id) in recipe.ingredients" :key="id" :class="{ missing: (workshop.inventory[id]?.count || 0) < count }">{{ materialById(id)?.icon }} {{ materialById(id)?.name }} {{ workshop.inventory[id]?.count || 0 }}/{{ count }}</span></div></div><button class="primary-button" :disabled="busy || !canSynthesize(workshop, recipe) || words.length < 4" @click="chooseQuestion({ type: 'synthesize', recipeId: recipe.id })">調合 · 答單字題</button></div></div><aside class="side-stack"><div class="panel"><div class="panel-title"><div><span class="eyebrow">BAG</span><h2>素材背包</h2></div></div><div v-if="inventoryList.length" class="stock-list"><div v-for="material in inventoryList" :key="material.id"><span>{{ material.icon }} {{ material.name }}<small>{{ material.element }}屬性 · 平均品質 {{ Math.round(workshop.inventory[material.id].totalQuality / workshop.inventory[material.id].count) }}</small></span><b>×{{ workshop.inventory[material.id].count }}</b></div></div><p v-else>背包是空的。先到大陸探索採集。</p></div><div class="panel"><h3>成品</h3><div v-if="productList.length" class="stock-list"><div v-for="item in productList" :key="item.id"><span>{{ item.icon }} {{ item.name }}</span><b>×{{ workshop.items[item.id].count }}</b></div></div><p v-else>尚未完成任何調合。</p></div></aside></section>

        <section v-if="activeTab === 'battle'" class="main-grid"><div class="panel battle-panel"><div class="panel-title"><div><span class="eyebrow">BATTLE</span><h2>{{ battle ? `對戰 · ${battle.enemy}` : '隊伍戰鬥' }}</h2></div><span>擊敗守衛可解鎖下一區</span></div><div v-if="!battle" class="battle-idle"><span>⚔️</span><h3>前往 {{ activeRegion.name }} 的守衛戰</h3><p>夥伴擁有不同傷害與技能；調合的藥劑和炸彈也能帶進戰鬥。</p><button class="primary-button" :disabled="busy || words.length < 4" @click="newBattle">開始挑戰 {{ activeRegion.enemy }}</button></div><template v-else><div class="enemy-card"><span>👁️</span><div><h3>{{ battle.enemy }}</h3><p>第 {{ battle.round }} 回合 · {{ activeRegion.name }}</p><div class="hp-track"><i :style="{ width: (battle.hp / battle.maxHp * 100) + '%' }"></i></div><strong>{{ battle.hp }} / {{ battle.maxHp }} HP</strong></div></div><div class="fighter-list"><button v-for="person in PARTY" :key="person.id" :class="{ on: selectedCompanion === person.id }" @click="selectedCompanion = person.id"><img :src="person.portrait" :alt="person.name + '立繪'"/><span><strong>{{ person.name }}</strong><small>{{ person.job }}</small></span></button></div><div class="battle-actions"><button :disabled="busy" @click="chooseQuestion({ type: 'battle', move: 'attack', companionId: selectedCompanion })">⚔ 普通攻擊</button><button :disabled="busy" @click="chooseQuestion({ type: 'battle', move: 'skill', companionId: selectedCompanion })">✦ 職業技能</button><button :disabled="busy" @click="chooseQuestion({ type: 'battle', move: 'guard', companionId: selectedCompanion })">🛡 防禦</button><select v-model="selectedItem"><option v-for="item in RECIPES" :key="item.id" :value="item.id">{{ item.name }} ×{{ workshop.items[item.id]?.count || 0 }}</option></select><button :disabled="busy || !workshop.items[selectedItem]?.count" @click="chooseQuestion({ type: 'battle', move: 'item', companionId: selectedCompanion, itemId: selectedItem })">🧪 使用道具</button><button class="ghost-button" @click="abandonBattle">撤退</button></div></template></div><aside class="side-stack"><div class="panel"><h3>夥伴技能</h3><div v-for="person in PARTY" :key="person.id" class="member-line"><span>{{ person.icon }} {{ person.name }} · {{ person.race }}{{ person.job }}</span><small>{{ person.skill }} / 基礎 {{ person.damage }}</small></div></div><div class="panel"><h3>戰鬥提示</h3><p>每次出手都需回答單字題。答錯不會出手，敵人也不會反擊；HP 歸零會返回工房。</p></div></aside></section>

        <section v-if="activeTab === 'party'" class="party-layout"><div class="panel"><div class="panel-title"><div><span class="eyebrow">COMPANIONS</span><h2>冒險夥伴</h2></div></div><div class="portrait-grid"><article v-for="person in PARTY" :key="person.id" class="portrait-card"><div class="portrait-frame"><img :src="person.portrait" :alt="person.name + '立繪'"/></div><div><small>{{ person.race }} · {{ person.job }}</small><h3>{{ person.name }}</h3><p>{{ person.skill }} · 傷害基礎 {{ person.damage }}</p></div></article></div></div><div class="panel"><div class="panel-title"><div><span class="eyebrow">CODEX</span><h2>素材圖鑑與鍊金日誌</h2></div><span>{{ workshop.discoveries.length }}/{{ MATERIALS.length }}</span></div><div class="discovery-grid"><span v-for="material in MATERIALS" :key="material.id" :class="{ unknown: !workshop.discoveries.includes(material.id) }">{{ workshop.discoveries.includes(material.id) ? `${material.icon} ${material.name}` : '？ 未發現' }}</span></div><h3>最近冒險</h3><p v-for="(entry, index) in workshop.journal" :key="index" class="journal-line">{{ entry }}</p></div></section>
        <p class="save-note">{{ saveNotice }}　採集 {{ workshop.gatheringCount }} 次 · 調合 {{ workshop.synthesisCount }} 次 · 勝利 {{ workshop.victories }} 次</p>
      </template>

      <div v-if="quiz" class="quiz-overlay"><div class="quiz-card"><span class="eyebrow">VOCABULARY CHALLENGE</span><h2>回答單字，完成行動</h2><p>「{{ quiz.word.zh_tw }}」的英文是？</p><template v-if="quiz.mode === 'choice'"><div class="quiz-choices"><button v-for="option in quiz.options" :key="option" :disabled="busy" @click="submitAnswer(option)">{{ option }}</button></div></template><template v-else><div class="letter-prompt">{{ quiz.prompt }}</div><label class="answer-label">請填入缺少的兩個英文字母<input v-model="answer" maxlength="2" autocomplete="off" autocapitalize="off" @keyup.enter="submitAnswer()"/></label><button class="primary-button" :disabled="busy || answer.length !== 2" @click="submitAnswer()">送出答案</button></template><button class="cancel-quiz" :disabled="busy" @click="quiz = null">取消這次操作</button></div></div>
    </div>
  </main>
</template>

<style scoped>
.atelier-page{min-height:100vh;background:radial-gradient(circle at 15% 3%,#365b64 0,transparent 34%),linear-gradient(140deg,#0c1727,#14263a 48%,#0c1727);color:#f3ebd8;font-family:'Noto Sans TC',sans-serif;padding:18px}.atelier-shell{max-width:1700px;margin:auto}.hero{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 24px;border:1px solid #bba87955;border-radius:20px;background:linear-gradient(100deg,#233745ee,#15283bee);box-shadow:0 12px 36px #030b17aa}.hero h1{font-family:serif;font-size:clamp(27px,3vw,45px);letter-spacing:.08em;margin:4px 0}.hero p{margin:0;color:#c9d7d1}.eyebrow{font-size:11px;letter-spacing:.23em;color:#d8c089;font-weight:800}.hero-actions{display:flex;gap:8px;flex-wrap:wrap}.ghost-button,.hero-actions a{display:inline-flex;align-items:center;justify-content:center;color:#f2e2bd;border:1px solid #bca67e88;background:#263c4b;border-radius:9px;padding:9px 12px;text-decoration:none;cursor:pointer}.status-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:14px 0}.status-row>div{border:1px solid #627b80aa;background:#1b3440d9;border-radius:12px;padding:9px 13px}.status-row small,.status-row strong{display:block}.status-row small{font-size:12px;color:#afc4c2}.status-row strong{margin-top:4px;color:#f5e4be}.notice{min-height:42px;padding:10px 15px;background:#efce8350;border-left:4px solid #f2cf8c;color:#fff4d8;border-radius:6px;margin-bottom:12px}.notice button{margin-left:10px}.tabs,.scale-tabs{display:flex;gap:8px;flex-wrap:wrap}.tabs{margin:0 0 12px}.tabs button,.scale-tabs button{border:1px solid #6b8588;background:#193445;color:#d6e9e4;border-radius:9px;padding:10px 16px;cursor:pointer;font-weight:700}.tabs button.selected,.scale-tabs button.on{background:#c99e62;color:#182736;border-color:#f2d5a0}.main-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(290px,.8fr);gap:12px}.panel{background:linear-gradient(145deg,#203845e8,#182d3ce8);border:1px solid #708c8b88;border-radius:17px;padding:17px;box-shadow:0 8px 20px #0003}.panel-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.panel-title h2{font-family:serif;font-size:25px;margin:3px 0}.panel-title>span,.weather{color:#d6c290;font-size:13px}.side-stack{display:flex;flex-direction:column;gap:12px}.map-panel{min-width:0;overflow-x:auto}.continent-map{position:relative;aspect-ratio:14/5;background:#11283a;border:3px solid #9b805f;border-radius:12px;overflow:hidden}.continent-map img{display:block;width:100%;height:100%;object-fit:fill}.map-pin{position:absolute;transform:translate(-50%,-50%);z-index:1;border:1px solid #f1e6bd;background:#172e3de8;color:#f9eccb;border-radius:20px;font-size:12px;font-weight:800;white-space:nowrap;padding:5px 9px;box-shadow:0 3px 12px #0019;cursor:pointer}.map-pin span{margin-right:4px}.map-pin.current{background:#e8bf77;color:#162737}.map-pin.locked{opacity:.7}.map-caption,.intro{font-size:13px;color:#b7cbc9;line-height:1.6}.region-map,.site-map{min-height:370px;background:radial-gradient(circle at 50% 50%,var(--region-color),transparent 58%),linear-gradient(145deg,#204c50,#173143 70%);border:2px solid #a8b79a;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px}.region-orb{background:#142c3cc9;border:2px solid var(--region-color);box-shadow:0 0 35px var(--region-color);border-radius:50%;width:175px;height:175px;display:flex;align-items:center;justify-content:center;flex-direction:column}.region-orb span{font-size:42px}.region-orb h3,.site-map h3{margin:0;font-family:serif;font-size:26px}.region-orb p,.site-map p{font-size:13px;margin:0}.site-grid{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.site-grid button{background:#203747ee;border:1px solid #d3c396;border-radius:12px;color:#f8ebcd;padding:12px;min-width:130px;cursor:pointer}.site-grid button span{display:block;font-size:30px}.site-grid button.on{background:#b98f61;color:#152a35}.site-icon{font-size:75px}.site-materials,.ingredient-list{display:flex;gap:7px;flex-wrap:wrap}.site-materials span,.ingredient-list span{background:#132f3c;border:1px solid #6b8a87;border-radius:8px;padding:7px 10px}.primary-button{background:linear-gradient(110deg,#f5cf86,#ca995e);border:1px solid #ffdf99;border-radius:9px;color:#202f35;font-weight:900;padding:11px 17px;cursor:pointer}.primary-button:disabled,button:disabled{opacity:.48;cursor:not-allowed}.region-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:14px 0}.region-list button{display:flex;flex-direction:column;text-align:left;gap:2px;background:#254453;border:1px solid #738a85;color:#f7e8c7;border-radius:8px;padding:8px;cursor:pointer}.region-list button.on{border-color:#ffd381;background:#536147}.region-list small{color:#c5d6ce}.rest-panel{display:flex;align-items:center;gap:10px}.rest-panel>span{font-size:30px}.rest-panel h3,.rest-panel p{margin:2px}.rest-panel button{margin-left:auto;padding:8px;border-radius:8px;border:1px solid #e6c580;background:#38515a;color:#fff;cursor:pointer}.recipe-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.recipe-grid button{min-height:100px;background:#24404a;border:1px solid #64837e;border-radius:11px;color:#f5e8cd;cursor:pointer;padding:8px}.recipe-grid button.on{background:#6e674d;border-color:#eed399}.recipe-grid button span,.recipe-grid button strong,.recipe-grid button small{display:block}.recipe-grid button span{font-size:27px}.recipe-grid button small{font-size:11px;color:#c2d4ce}.recipe-detail{display:flex;justify-content:space-between;align-items:end;gap:12px;background:#122d3c;border-radius:11px;margin-top:12px;padding:16px}.recipe-detail h3{margin:0}.recipe-detail p{margin:4px 0 12px}.ingredient-list .missing{border-color:#cd796a;color:#ffc4b5}.stock-list>div{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #64828266;padding:8px 0}.stock-list small{display:block;color:#abc1bd}.battle-idle{text-align:center;padding:65px 15px}.battle-idle>span{font-size:74px}.battle-idle p{color:#b7cdca}.enemy-card{display:flex;gap:22px;align-items:center;background:radial-gradient(circle at 20% 40%,#9d5a6d55,#263449);padding:20px;border-radius:12px}.enemy-card>span{font-size:72px}.enemy-card>div{flex:1}.enemy-card h3,.enemy-card p{margin:4px 0}.hp-track{width:100%;height:15px;border-radius:9px;background:#15222d;overflow:hidden}.hp-track i{display:block;height:100%;background:linear-gradient(90deg,#da6a68,#f2a577)}.fighter-list{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0}.fighter-list button{display:flex;align-items:center;background:#233d4c;color:#fff0d3;border:1px solid #6c8987;border-radius:10px;padding:4px;cursor:pointer}.fighter-list button.on{background:#6b674c;border-color:#f2d197}.fighter-list img{width:48px;height:58px;object-fit:cover;object-position:top;border-radius:6px;margin-right:6px}.fighter-list small{display:block}.battle-actions{display:flex;gap:8px;flex-wrap:wrap}.battle-actions button,.battle-actions select{border:1px solid #bbad87;background:#2e5060;color:#fff0d3;border-radius:9px;padding:9px;cursor:pointer}.member-line{padding:8px;border-bottom:1px solid #68858855}.member-line span,.member-line small{display:block}.member-line small{color:#b3ceca}.party-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(290px,1fr);gap:12px}.portrait-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.portrait-card{background:#142e3c;border:1px solid #8a9384;border-radius:12px;overflow:hidden}.portrait-frame{height:320px;overflow:hidden}.portrait-frame img{width:100%;height:100%;object-fit:cover;object-position:top}.portrait-card>div:last-child{padding:10px}.portrait-card small{color:#c6d8ca}.portrait-card h3{margin:4px 0;font-family:serif}.portrait-card p{margin:0;font-size:12px}.discovery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:14px 0}.discovery-grid span{padding:8px;background:#274454;border-radius:8px}.discovery-grid span.unknown{opacity:.48}.journal-line{margin:4px 0;padding:5px;border-bottom:1px solid #68858855;font-size:12px}.save-note{color:#b4c8c4;text-align:right}.loading-card{padding:50px;text-align:center}.quiz-overlay{position:fixed;inset:0;background:#06131acf;display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}.quiz-card{width:min(550px,100%);background:linear-gradient(145deg,#283f4e,#182d3a);border:2px solid #f1cc89;box-shadow:0 15px 70px #000a;border-radius:18px;padding:25px;text-align:center}.quiz-card h2{font-family:serif}.quiz-card>p{font-size:23px;font-weight:900;color:#ffe2a7}.quiz-choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quiz-choices button{background:#2c5664;border:1px solid #a8c1af;color:#fff;border-radius:9px;padding:14px;cursor:pointer;font-size:18px}.quiz-choices button:hover{background:#89724e}.letter-prompt{font-size:30px;letter-spacing:.17em;margin:20px 0;color:#ffe2a7}.answer-label{display:block;margin:12px}.answer-label input{display:block;margin:8px auto;background:#f7f0e1;padding:10px;font-size:23px;text-align:center;width:120px;border-radius:8px}.cancel-quiz{display:block;margin:15px auto 0;border:0;background:none;color:#e2ccaa;text-decoration:underline;cursor:pointer}
@media(max-width:1050px){.main-grid,.party-layout{grid-template-columns:1fr}.side-stack{display:grid;grid-template-columns:1fr 1fr}.portrait-frame{height:250px}}@media(max-width:700px){.atelier-page{padding:8px}.hero{display:block;padding:14px}.hero-actions{margin-top:12px}.status-row{grid-template-columns:repeat(2,1fr)}.status-row>div:last-child{grid-column:span 2}.tabs button{flex:1 1 40%}.panel{padding:12px}.continent-map{min-width:680px}.map-pin{font-size:10px;padding:4px}.side-stack{display:flex}.recipe-grid,.fighter-list,.portrait-grid{grid-template-columns:repeat(2,1fr)}.portrait-frame{height:260px}.recipe-detail{display:block}.recipe-detail button{margin-top:12px}.battle-actions>*{flex:1 1 43%}.discovery-grid{grid-template-columns:repeat(2,1fr)}}
</style>
