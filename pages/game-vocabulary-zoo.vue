<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ZOO_ANIMALS, ZOO_FEEDS, ZOO_STAFF_TASKS, ZOO_TOOLS, ZOO_HEIGHT, ZOO_WIDTH, advanceZooDay, createZoo, upgradeZooMap, zooAdopt, zooAnimal, zooAssignStaff, zooBiome, zooBuild, zooBuyFeed, zooCare, zooDismissStaff, zooFeed, zooHabitatCapacity, zooHabitatHome, zooHabitatTiles, zooHireStaff, zooMetrics, zooReleaseAnimal, zooSetStaffTask, zooStaffCandidate, zooStaffMarket, zooStaffShiftTick, zooStaffWage, zooTool, zooTourRoute } from '~/lib/vocabulary-zoo';
import { playZooAnimalCall } from '~/lib/zoo-animal-audio';

const GAME_TYPE = '單字模擬動物園';
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = { version: typeof route.query.version === 'string' ? route.query.version : '', volume: typeof route.query.volume === 'string' ? route.query.volume : '', unit: typeof route.query.unit === 'string' ? route.query.unit : '' };
const zoo = ref(createZoo());
const words = ref([]);
const loading = ref(true);
const notice = ref('正在載入單字與園區…');
const saveNotice = ref('');
const selectedTool = ref('inspect');
const selectedId = ref(3 + 3 * ZOO_WIDTH);
const selectedAnimal = ref('giraffe');
const mapScale = ref(1);
const animalArtStyle = ref('classic');
const soundEnabled = ref(true);
const visitorStep = ref(0);
const panel = ref('build');
const staffView = ref('market');
const staffPeriod = ref('day');
const feedQuantity = ref(5);
const wallNow = ref(0);
const quiz = ref(null);
const pending = ref(null);
const activeSeconds = ref(0);
const lastQuestionAt = ref(0);
const nextQuestionAfter = ref(35000);
const photo = ref('');
const fullPhoto = ref('');
const photoCredit = ref('');
const wikiText = ref('');
const photoError = ref(false);
const photoOpen = ref(false);
const metrics = computed(() => zooMetrics(zoo.value));
const groupedTools = computed(() => ['基本', '動物棲地', '遊客服務', '教育與園務'].map(name => ({ name, tools: ZOO_TOOLS.filter(tool => tool.group === name) })));
const activeGuestFacilities = computed(() => Object.entries(metrics.value.facilityCounts)
  .filter(([kind]) => !['keeperStation', 'vetClinic'].includes(kind))
  .reduce((sum, [, count]) => sum + count, 0));
const tourRoute = computed(() => zooTourRoute(zoo.value));
const visitorMarkers = computed(() => {
  if (!metrics.value.active.length || tourRoute.value.length < 2) return [];
  const count = Math.min(8, Math.ceil(metrics.value.active.length * 1.5 + Math.min(3, zoo.value.visitors / 20)));
  const icons = ['🧑', '👩', '👨', '👧', '👴', '👩‍🦱', '🧒', '👨‍🦱'];
  return Array.from({ length: count }, (_, id) => {
    const tile = zoo.value.tiles[tourRoute.value[(visitorStep.value + id * 3) % tourRoute.value.length]];
    return { id, icon: icons[id], x: tile.x, y: tile.y };
  });
});
const selectedCell = computed(() => zoo.value.tiles[selectedId.value]);
const selected = computed(() => zooHabitatHome(zoo.value, selectedCell.value));
const selectedAnimalData = computed(() => zooAnimal(selected.value?.animalId));
const habitatSize = computed(() => zooHabitatTiles(zoo.value, selected.value).length);
const habitatCapacity = computed(() => zooHabitatCapacity(zoo.value, selected.value, selected.value?.animalId || selectedAnimal.value));
const marketStaff = computed(() => zooStaffMarket(zoo.value.day));
const staffStatus = computed(() => !zoo.value.staff.length && !zoo.value.keepers && !zoo.value.vets ? '尚未雇用人員' : zoo.value.staffRestUntil > wallNow.value
  ? `休息中，約 ${Math.ceil((zoo.value.staffRestUntil - wallNow.value) / 60000)} 分鐘後自動恢復` : `自動值班中 ${Math.floor((zoo.value.staffActiveMs || 0) / 60000)}/30 分鐘`);
const selectedConnected = computed(() => {
  const tile = selectedCell.value;
  if (!tile) return false;
  if (tile.kind === 'path') return metrics.value.paths.has(tile.id);
  const parts = tile.kind === 'habitat' ? zooHabitatTiles(zoo.value, tile) : [tile];
  return parts.some(part => zoo.value.tiles.some(path => path.kind === 'path' && metrics.value.paths.has(path.id) && Math.abs(path.x - part.x) + Math.abs(path.y - part.y) === 1));
});
const selectedDescription = computed(() => {
  const tile = selected.value;
  if (!tile?.kind) return '尚未建設，可選擇建造工具使用這塊地。';
  if (tile.kind === 'habitat') return selectedAnimalData.value?.fact || '這塊棲地尚無動物，可到動物圖鑑領養適合的物種。';
  return zooTool(tile.kind)?.description || '園區設施。';
});
const chosenAnimal = computed(() => zooAnimal(selectedAnimal.value));
const score = computed(() => zoo.value.correct.length * 10 + Math.min(500, zoo.value.totalVisitors) + zoo.value.conservation * 2);
const historyLink = computed(() => ({ path: '/history', query: { game: GAME_TYPE } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME_TYPE, ...lesson } }));
const storageKey = computed(() => `shjhs-vocabulary-zoo:v1:${student.value?.id || 'anon'}:${lesson.version}:${lesson.volume}:${lesson.unit}`);
let timer = null, lastTick = 0, accumulated = 0, lastDayAt = 0, saving = false, disposed = false;

function persist() {
  if (!import.meta.client || !student.value?.id) return;
  try { localStorage.setItem(storageKey.value, JSON.stringify(zoo.value)); }
  catch { saveNotice.value = '裝置儲存空間不足，請清理瀏覽器空間。'; }
}
function commit(result) {
  notice.value = result.error || result.message;
  if (!result.error) persist();
}
function tileName(tile) {
  if (!tile?.kind) return '空地';
  if (tile.kind === 'habitat') {
    const home = zooHabitatHome(zoo.value, tile);
    return `${zooBiome(tile.biome)?.name || ''}棲地${home.id !== tile.id ? ' · 擴建區' : home.animalId ? ` · ${zooAnimal(home.animalId)?.name} × ${home.animalCount || 1}` : ''}`;
  }
  return zooTool(tile.kind)?.name || tile.kind;
}
function toolIcon(tile) {
  if (tile.kind === 'habitat') return tile.id === zooHabitatHome(zoo.value, tile).id ? zooAnimal(tile.animalId)?.icon || zooBiome(tile.biome)?.icon : zooBiome(tile.biome)?.icon;
  return zooTool(tile.kind)?.icon || (tile.id % 11 === 0 ? '🌿' : '');
}
function selectTile(id) {
  selectedId.value = id;
  const tile = zoo.value.tiles[id], home = zooHabitatHome(zoo.value, tile);
  if (home.animalId) {
    selectedAnimal.value = home.animalId;
    if (soundEnabled.value) playZooAnimalCall(home.animalId);
  }
  if (tile.kind && selectedTool.value !== 'remove') {
    selectedTool.value = 'inspect';
    panel.value = home.animalId ? 'animals' : 'build';
    return;
  }
  if (selectedTool.value === 'inspect') { panel.value = home.animalId ? 'animals' : 'build'; return; }
  const tool = zooTool(selectedTool.value);
  if (!tool) return;
  if (selectedTool.value === 'remove' ? (!tile.kind || (tile.x === 0 && tile.y === 4)) : Boolean(tile.kind)) {
    notice.value = selectedTool.value === 'remove' ? '入口或空地不能拆除。' : `${tileName(tile)}已佔用這塊地，請選空地。`;
    return;
  }
  if (zoo.value.money < tool.cost) { notice.value = `需要 $${tool.cost}，資金不足。`; return; }
  requestAction({ type: 'build', id, tool: tool.id });
}
function requestAction(action) {
  if (quiz.value || loading.value || words.value.length < 4) return;
  if (!lastQuestionAt.value || Date.now() - lastQuestionAt.value >= nextQuestionAfter.value) openQuiz(action);
  else applyAction(action);
}
function applyAction(action) {
  if (!action) return;
  if (action.type === 'build') commit(zooBuild(zoo.value, action.id, action.tool));
  if (action.type === 'adopt') commit(zooAdopt(zoo.value, action.id, action.animal));
  if (action.type === 'care') commit(zooCare(zoo.value, action.id, action.kind));
  if (action.type === 'hireStaff') commit(zooHireStaff(zoo.value, action.id, action.period));
  if (action.type === 'dismissStaff') commit(zooDismissStaff(zoo.value, action.id));
  if (action.type === 'assignStaff') commit(zooAssignStaff(zoo.value, action.id, action.focus));
  if (action.type === 'staffTask') commit(zooSetStaffTask(zoo.value, action.id, action.enabled));
  if (action.type === 'buyFeed') commit(zooBuyFeed(zoo.value, action.id, action.quantity));
  if (action.type === 'releaseAnimal') commit(zooReleaseAnimal(zoo.value, action.id));
  if (action.type === 'grant') {
    if (zoo.value.money >= 200 || zoo.value.grantUsed) return;
    zoo.value.money += 700; zoo.value.grantUsed = true;
    notice.value = '保育教育補助 $700 已入帳；每座園區限領一次。'; persist();
  }
  if (action.type === 'ticket') {
    zoo.value.tickets = action.price;
    notice.value = `門票已調整為 $${action.price}。`;
    persist();
  }
}
function openQuiz(action) {
  if (quiz.value || words.value.length < 4) return;
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const distractors = words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase()).sort(() => Math.random() - .5).slice(0, 3);
  quiz.value = { word, choices: [word, ...distractors].sort(() => Math.random() - .5) };
  pending.value = action;
}
function answer(choice) {
  if (!quiz.value) return;
  const word = quiz.value.word;
  const correct = choice.trim().toLowerCase() === word.en_us.trim().toLowerCase();
  (correct ? zoo.value.correct : zoo.value.wrong).push(word.en_us);
  quiz.value = null;
  lastQuestionAt.value = Date.now();
  nextQuestionAfter.value = (30 + Math.floor(Math.random() * 11)) * 1000;
  if (correct) {
    zoo.value.money += 70;
    applyAction(pending.value);
    notice.value = `答對 ${word.en_us}！保育基金 +$70；${notice.value}`;
  }
  else notice.value = `答錯了：「${word.zh_tw}」是 ${word.en_us}；本次操作沒有執行。`;
  pending.value = null;
  persist();
}
function cancelQuiz() { quiz.value = null; pending.value = null; notice.value = '已取消這次操作；下次操作仍須答題。'; }
function adopt(animal) {
  selectedAnimal.value = animal.id;
  if (!selected.value || selected.value.kind !== 'habitat' || (selected.value.animalId && selected.value.animalId !== animal.id)) { notice.value = '請先在地圖選擇空棲地或已有同種動物的棲地。'; return; }
  if (selected.value.biome !== animal.biome) { notice.value = `${animal.name}需要${zooBiome(animal.biome).name}棲地。`; return; }
  const count = selected.value.animalId ? 1 : animal.minGroup;
  if ((selected.value.animalCount || 0) + count > zooHabitatCapacity(zoo.value, selected.value, animal.id)) { notice.value = '棲地格數不足，請先在相鄰空地擴建同類棲地。'; return; }
  if (zoo.value.money < animal.cost * count) { notice.value = `領養需要 $${animal.cost * count}。`; return; }
  requestAction({ type: 'adopt', id: selectedId.value, animal: animal.id });
}
function care(kind) {
  if (kind === 'feed' && selectedAnimalData.value && (zoo.value.feedStock[selectedAnimalData.value.feedId] || 0) < (selected.value.animalCount || 1)) {
    notice.value = `${zooFeed(selectedAnimalData.value.feedId).name}不足，請到「飼料」頁補貨。`;
    panel.value = 'feed';
    return;
  }
  requestAction({ type: 'care', id: selectedId.value, kind });
}
function changeTicket(event) { requestAction({ type: 'ticket', price: Number(event.target.value) }); }
function setAnimalArtStyle(style) {
  animalArtStyle.value = style;
  localStorage.setItem('shjhs-zoo-animal-art-style', style);
}
function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  localStorage.setItem('shjhs-zoo-animal-sound', soundEnabled.value ? 'on' : 'off');
}
function newZoo() {
  if (!confirm('建立新動物園會覆蓋目前的本機園區。確定繼續？')) return;
  const name = prompt('請替動物園命名', '晨光動物園');
  if (name === null) return;
  zoo.value = createZoo(); zoo.value.name = name.trim().slice(0, 20) || '晨光動物園';
  zoo.value.recordId = crypto.randomUUID(); zoo.value.startedAt = Date.now();
  selectedId.value = 3 + 3 * ZOO_WIDTH; selectedTool.value = 'inspect'; activeSeconds.value = 0; lastQuestionAt.value = 0; nextQuestionAfter.value = 35000; lastDayAt = 0;
  notice.value = '新園區已開幕。從初始草原棲地領養第一隻動物吧！'; persist();
}
async function saveRecord() {
  if (!student.value?.id || saving) return;
  saving = true;
  try {
    zoo.value.recordId ||= crypto.randomUUID(); zoo.value.startedAt ||= Date.now();
    if (!zoo.value.attemptNumber) {
      const { count, error } = await db.from('game_records').select('id', { count: 'exact', head: true })
        .eq('student_id', String(student.value.id)).eq('game_type', GAME_TYPE).eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
      if (error) throw error;
      zoo.value.attemptNumber = (count || 0) + 1;
    }
    const { error } = await db.from('game_records').upsert({
      id: zoo.value.recordId, student_id: String(student.value.id), game_type: GAME_TYPE,
      version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
      score: score.value, mistakes: zoo.value.wrong.length,
      correct_words: zoo.value.correct.join(', '), wrong_words: zoo.value.wrong.join(', '),
      attempt_number: zoo.value.attemptNumber, played_at: new Date(zoo.value.startedAt).toISOString(),
      time_taken_seconds: activeSeconds.value, device_info: navigator.userAgent
    }, { onConflict: 'id' });
    if (error) throw error;
    saveNotice.value = '成績與對錯單字已儲存到學生紀錄。'; persist();
  } catch (error) { saveNotice.value = `成績儲存失敗：${error.message}`; }
  finally { saving = false; }
}
async function loadWiki(animal) {
  photo.value = ''; fullPhoto.value = ''; photoCredit.value = ''; wikiText.value = ''; photoError.value = false; photoOpen.value = false;
  if (!animal || !import.meta.client) return;
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(animal.wiki)}`);
    if (!response.ok) return;
    const data = await response.json();
    if (chosenAnimal.value?.id !== animal.id) return;
    const src = data.thumbnail?.source || '';
    if (src.startsWith('https://thumb.wikimedia.org/wikipedia/commons/') || src.startsWith('https://upload.wikimedia.org/wikipedia/commons/')) {
      photo.value = src;
      const original = data.originalimage?.source || '';
      if (original.startsWith('https://upload.wikimedia.org/wikipedia/commons/')) fullPhoto.value = original;
      const filename = original.split('/').pop()?.split('?')[0];
      if (filename) photoCredit.value = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(decodeURIComponent(filename))}`;
    }
    wikiText.value = typeof data.extract === 'string' ? data.extract.slice(0, 280) : '';
  } catch { /* Wikipedia may be unavailable; keep local descriptions and icons. */ }
}
watch(() => chosenAnimal.value?.id, () => loadWiki(chosenAnimal.value), { immediate: true });
onMounted(async () => {
  if (!student.value?.id) { await navigateTo('/'); return; }
  animalArtStyle.value = localStorage.getItem('shjhs-zoo-animal-art-style') === 'raised' ? 'raised' : 'classic';
  soundEnabled.value = localStorage.getItem('shjhs-zoo-animal-sound') !== 'off';
  if (!lesson.version || !lesson.volume || !lesson.unit) { loading.value = false; notice.value = '請先在首頁選擇課本、冊次與單元。'; return; }
  const { data, error } = await db.from('vocabularies').select('en_us,zh_tw').eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
  if (disposed) return;
  loading.value = false;
  if (error) { notice.value = `單字載入失敗：${error.message}`; return; }
  const seen = new Set();
  words.value = (data || []).filter(word => { const key = word.en_us?.trim().toLowerCase(); if (!key || !word.zh_tw?.trim() || seen.has(key)) return false; seen.add(key); return true; });
  if (words.value.length < 4) { notice.value = '本課至少需要四筆不同的單字。'; return; }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey.value) || 'null');
    const upgraded = upgradeZooMap(saved);
    if (upgraded) zoo.value = upgraded;
  } catch { /* Use new zoo if local save is unreadable. */ }
  zoo.value.recordId ||= crypto.randomUUID(); zoo.value.startedAt ||= Date.now(); zoo.value.correct ||= []; zoo.value.wrong ||= []; zoo.value.events ||= [];
  persist(); notice.value = `歡迎來到 ${zoo.value.name}！請選擇初始棲地，領養動物。`;
  wallNow.value = Date.now();
  lastTick = Date.now();
  timer = window.setInterval(() => {
    wallNow.value = Date.now();
    const restNotice = zooStaffShiftTick(zoo.value, 0, wallNow.value);
    if (restNotice) { notice.value = restNotice; persist(); }
    if (document.hidden || zoo.value.paused || quiz.value || photoOpen.value) { lastTick = Date.now(); return; }
    const now = Date.now(); accumulated += Math.min(2000, Math.max(0, now - lastTick)); lastTick = now;
    if (accumulated < 1000) return;
    const elapsed = Math.floor(accumulated / 1000);
    activeSeconds.value += elapsed; visitorStep.value += elapsed; accumulated %= 1000;
    const shiftNotice = zooStaffShiftTick(zoo.value, elapsed * 1000, now);
    if (shiftNotice) { notice.value = shiftNotice; persist(); }
    if (activeSeconds.value - lastDayAt >= 45) {
      lastDayAt = activeSeconds.value;
      const report = advanceZooDay(zoo.value);
      notice.value = `新的一天：${report.visitors} 位遊客，收入 $${report.income}、支出 $${report.expense}。`;
      persist(); if (zoo.value.day % 3 === 0) saveRecord();
    }
  }, 1000);
});
onBeforeUnmount(() => { disposed = true; if (timer) clearInterval(timer); persist(); });
watch(() => zoo.value.paused, persist);
</script>

<template>
  <main class="zoo-page">
    <header class="zoo-header"><div><span class="eyebrow">VOCABULARY · ZOO BUILDER</span><h1>🦁 單字模擬動物園</h1><p>照顧動物、設計棲地，讓單字成為園區成長的力量</p></div><nav><NuxtLink to="/">← 首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">英雄榜</NuxtLink></nav></header>
    <div class="zoo-layout"><section class="zoo-board"><div class="topline"><div><strong>{{zoo.name}}</strong><span>第 {{zoo.day}} 天</span></div><div class="top-actions"><span class="quiz-clock">📚 操作時最多每 30–40 秒一題</span><button @click="zoo.paused=!zoo.paused">{{zoo.paused?'▶ 繼續':'Ⅱ 暫停'}}</button><button @click="saveRecord" :disabled="loading||saving">儲存成績</button><button @click="newZoo">新園區</button></div></div>
      <div class="stats"><span>💰 ${{zoo.money}}</span><span>🎟️ 今日 {{zoo.visitors}} 人</span><span>🚶 園內 {{visitorMarkers.length}} 組模擬遊客</span><span>❤️ 福祉 {{metrics.welfare}}%</span><span>😊 遊客滿意度 {{metrics.guestSatisfaction}}%</span><span>🌿 保育 {{zoo.conservation}}</span><span>⭐ {{score}} 分</span><span>📖 {{zoo.correct.length}} 對／{{zoo.wrong.length}} 錯</span></div>
      <div class="board-note">園區已擴大為 {{ZOO_WIDTH}} × {{ZOO_HEIGHT}} 格。地圖可捲動、縮放；入口在左側，步道要緊鄰棲地與設施。</div>
      <div class="map-controls"><span>{{ZOO_WIDTH}} × {{ZOO_HEIGHT}} 格 · {{Math.round(mapScale*100)}}%</span><button :disabled="mapScale<=.75" @click="mapScale=Math.max(.75,mapScale-.25)">－ 縮小</button><button :disabled="mapScale>=1.5" @click="mapScale=Math.min(1.5,mapScale+.25)">＋ 放大</button><button @click="mapScale=1">原尺寸</button><span class="map-option-label">動物圖案</span><button :class="{active:animalArtStyle==='classic'}" @click="setAnimalArtStyle('classic')">🐾 原版可愛</button><button :class="{active:animalArtStyle==='raised'}" @click="setAnimalArtStyle('raised')">🐾 立體版</button><button :class="{active:soundEnabled}" @click="toggleSound">{{soundEnabled?'🔊 叫聲開':'🔇 叫聲關'}}</button></div>
      <div class="map-frame"><div class="zoo-grid" :class="`art-${animalArtStyle}`" :style="{'--cols':ZOO_WIDTH,'--tile-size':`${Math.round(80*mapScale)}px`}"><button v-for="tile in zoo.tiles" :key="tile.id" class="zoo-tile" :class="[tile.kind||'empty',{selected:selectedId===tile.id,connected:metrics.paths.has(tile.id),unconnected:tile.kind==='habitat'&&zooHabitatHome(zoo,tile).animalId&&!metrics.active.includes(zooHabitatHome(zoo,tile))}]" :style="tile.kind==='habitat'?{'--biome-color':zooBiome(tile.biome)?.color}:{}" :title="`${tile.x+1}, ${tile.y+1} · ${tileName(tile)}`" :aria-label="tileName(tile)" @click="selectTile(tile.id)"><span v-if="tile.kind==='habitat'" class="tile-kind">{{zooBiome(tile.biome)?.name}}棲地</span><span v-else-if="tile.kind&&!['path','tree'].includes(tile.kind)" class="tile-kind">{{tileName(tile)}}</span><span v-if="tile.kind!=='path'&&toolIcon(tile)" class="tile-object" :class="{'animal-object':Boolean(tile.kind==='habitat'&&tile.id===zooHabitatHome(zoo,tile).id&&tile.animalId),'facility-object':tile.kind&&!['habitat','path','tree'].includes(tile.kind)}"><span class="tile-icon">{{toolIcon(tile)}}</span></span><span v-if="tile.kind==='habitat'" class="tile-label">{{tile.id!==zooHabitatHome(zoo,tile).id?'活動空間':tile.animalId?`${zooAnimal(tile.animalId)?.name} × ${tile.animalCount||1}`:'待領養'}}</span><span v-if="tile.kind==='habitat'&&tile.id===zooHabitatHome(zoo,tile).id&&tile.animalId" class="tile-health" :style="{width:`${Math.round((zooHabitatHome(zoo,tile).hunger+zooHabitatHome(zoo,tile).clean)/2)}%`}"></span><span v-if="tile.x===0&&tile.y===4" class="entry-tag">入口</span></button><span v-for="visitor in visitorMarkers" :key="`visitor-${visitor.id}`" class="visitor-marker" :style="{left:`${9+visitor.x*(Math.round(80*mapScale)+4)+Math.round(80*mapScale)/2}px`,top:`${9+visitor.y*(Math.round(80*mapScale)+4)+Math.round(80*mapScale)/2}px`}" :aria-label="`遊客走到第${visitor.x+1}列第${visitor.y+1}行`">{{visitor.icon}}</span></div></div>
      <div class="notice" role="status">{{notice}}</div><p v-if="saveNotice" class="save-notice">{{saveNotice}}</p>
    </section>
    <aside class="sidebar"><div class="tabs"><button v-for="tab in [{id:'build',name:'建造'},{id:'animals',name:'動物'},{id:'manage',name:'經營'},{id:'staff',name:'人力'},{id:'feed',name:'飼料'},{id:'guide',name:'說明'}]" :key="tab.id" :class="{active:panel===tab.id}" @click="panel=tab.id">{{tab.name}}</button></div>
      <section v-if="selected" class="tile-details" aria-live="polite">
        <div class="detail-heading"><span class="detail-emoji">{{toolIcon(selected)||'🌱'}}</span><div><small>第 {{selectedCell.x+1}} 列 · 第 {{selectedCell.y+1}} 行</small><h2>{{tileName(selected)}}</h2></div></div>
        <p>{{selectedDescription}}</p>
        <div v-if="selected.kind==='habitat'" class="detail-facts">
          <span>土地：<b>{{zooBiome(selected.biome)?.name}}棲地</b></span>
          <span>動物：<b>{{selectedAnimalData?.name||'尚未領養'}} × {{selected.animalCount||0}}</b></span><span>棲地：<b>{{habitatSize}} 格 · 容量 {{habitatCapacity}} 隻</b></span>
          <span>步道：<b>{{selectedConnected?'已連通':'未連通'}}</b></span>
          <span v-if="selectedAnimalData">飼料 <b>{{zooFeed(selectedAnimalData.feedId)?.name}} · 庫存 {{zoo.feedStock[selectedAnimalData.feedId]||0}}</b></span><span v-if="selectedAnimalData">飽足 {{selected.hunger}}% · 飲水 {{selected.water}}% · 清潔 {{selected.clean}}% · 活動 {{selected.enrichment}}% · 健康 {{selected.health}}%</span>
        </div>
        <div v-else-if="selected.kind" class="detail-facts"><span>設施：<b>{{tileName(selected)}}</b></span><span v-if="selected.kind!=='tree'">步道：<b>{{selectedConnected?'已連通':'未連通'}}</b></span><span v-if="zooTool(selected.kind)?.dailyCost">日維護：<b>${{zooTool(selected.kind).dailyCost}}</b></span></div>
        <div v-if="selectedAnimalData" class="detail-actions"><button @click="care('feed')">🥬 配餐餵食</button><button @click="care('water')">🚰 補水</button><button @click="care('clean')">🧼 清潔</button><button @click="care('enrich')">🎾 活動豐富化</button><button @click="care('vet')">🩺 檢查</button><button @click="requestAction({type:'releaseAnimal',id:selectedId})">↗ 安置一隻</button><button @click="selectedAnimal=selected.animalId;panel='animals'">📖 照片與介紹</button></div>
        <div v-else-if="selected.kind==='habitat'" class="detail-actions"><button @click="panel='animals'">🐾 查看可領養動物</button></div>
      </section>
      <div class="sidebar-body" v-if="panel==='build'"><h2>建造工具</h2><p>選擇工具後點園區空地；按「查看」可選取棲地與照護動物。</p><div v-for="group in groupedTools" :key="group.name" class="tool-section"><h3>{{group.name}}</h3><div class="tool-grid"><button v-for="tool in group.tools" :key="tool.id" :class="{active:selectedTool===tool.id}" @click="selectedTool=tool.id"><span>{{tool.icon}}</span><strong>{{tool.name}}</strong><small>{{tool.cost?`$${tool.cost}`:'選取'}}</small></button></div></div></div>
      <div class="sidebar-body" v-else-if="panel==='animals'"><h2>動物圖鑑與領養</h2><p>先點選一塊空棲地，再選符合環境的動物；進行建設、領養等操作時才可能出題；答過一題後，30–40 秒內的操作不再出題。</p><div class="animal-list"><button v-for="animal in ZOO_ANIMALS" :key="animal.id" :class="{active:chosenAnimal?.id===animal.id}" @click="selectedAnimal=animal.id"><span>{{animal.icon}}</span><strong>{{animal.name}}<small>{{animal.en}}</small></strong><em>${{animal.cost}}</em></button></div><div v-if="chosenAnimal" class="wiki-card"><button v-if="photo&&!photoError" class="photo-preview" :aria-label="`放大檢視${chosenAnimal.name}完整照片`" @click="photoOpen=true"><img :src="photo" :alt="chosenAnimal.name" loading="lazy" @error="photoError=true"><span>點擊查看完整照片 ⤢</span></button><span v-else class="wiki-fallback">{{chosenAnimal.icon}}</span><h3>{{chosenAnimal.name}} · {{chosenAnimal.en}}</h3><p>{{chosenAnimal.fact}}</p><p class="wiki-extract" v-if="wikiText">{{wikiText}}</p><a :href="`https://en.wikipedia.org/wiki/${chosenAnimal.wiki}`" target="_blank" rel="noopener noreferrer">維基百科動物介紹 ↗</a><a v-if="photoCredit" :href="photoCredit" target="_blank" rel="noopener noreferrer">圖片來源與授權 ↗</a><button class="primary" :disabled="!selected||selected.kind!=='habitat'||(selected.animalId&&selected.animalId!==chosenAnimal.id)||selected.biome!==chosenAnimal.biome||(selected.animalCount||0)+(selected.animalId?1:chosenAnimal.minGroup)>zooHabitatCapacity(zoo,selected,chosenAnimal.id)||zoo.money<chosenAnimal.cost*(selected.animalId?1:chosenAnimal.minGroup)" @click="adopt(chosenAnimal)">領養 {{selected?.animalId?1:chosenAnimal.minGroup}} 隻{{chosenAnimal.name}} · ${{chosenAnimal.cost*(selected?.animalId?1:chosenAnimal.minGroup)}}</button><small>每隻需 {{chosenAnimal.space}} 格 · 初次至少 {{chosenAnimal.minGroup}} 隻 · 食物：{{zooFeed(chosenAnimal.feedId)?.name}} · 需要 {{chosenAnimal.enrichment}}</small></div></div>
      <div class="sidebar-body" v-else-if="panel==='staff'">
        <h2>👥 動物園人力市場</h2><p>{{staffStatus}}。每 3 個遊戲日換一批候選人；已雇用者會保留。日薪／周薪於雇用時預付，期滿且繼續值班時自動續付。工作 30 分鐘有效遊玩時間後休息 30 分鐘實際時間，無須按啟動鍵。</p>
        <div class="staff-tabs"><button v-for="item in [{id:'market',name:'招募'},{id:'roster',name:'排班'},{id:'history',name:'工作紀錄'}]" :key="item.id" :class="{active:staffView===item.id}" @click="staffView=item.id">{{item.name}}</button></div>
        <template v-if="staffView==='market'"><div class="staff-tabs"><button :class="{active:staffPeriod==='day'}" @click="staffPeriod='day'">日薪</button><button :class="{active:staffPeriod==='week'}" @click="staffPeriod='week'">周薪</button></div><article v-for="person in marketStaff" :key="person.id" class="staff-card"><div class="staff-card-head"><span>{{person.icon}}</span><div><strong>{{person.name}} · {{person.roleName}}</strong><small>能力 {{person.skill}} · {{person.description}}</small></div></div><small>可處理：{{person.tasks.map(id=>ZOO_STAFF_TASKS.find(task=>task.id===id)?.name).join('、')}}</small><small>日薪 ${{zooStaffWage(person,'day')}}／周薪 ${{zooStaffWage(person,'week')}}</small><button v-if="!zoo.staff.some(item=>item.id===person.id)" :disabled="zoo.money<zooStaffWage(person,staffPeriod)" @click="requestAction({type:'hireStaff',id:person.id,period:staffPeriod})">雇用 · 預付 ${{zooStaffWage(person,staffPeriod)}}</button><span v-else>已雇用</span></article></template>
        <template v-else-if="staffView==='roster'"><p v-if="!zoo.staff.length">目前尚無新進員工。舊存檔原有人力仍繼續工作。</p><article v-for="contract in zoo.staff" :key="contract.id" class="staff-card"><strong>{{zooStaffCandidate(contract.id)?.icon}} {{zooStaffCandidate(contract.id)?.name}} · {{zooStaffCandidate(contract.id)?.roleName}}</strong><small>{{contract.period==='week'?'周薪':'日薪'}} · 已付至第 {{contract.paidThroughDay}} 天</small><label>優先工作<select :value="contract.focus" @change="requestAction({type:'assignStaff',id:contract.id,focus:$event.target.value})"><option v-for="taskId in zooStaffCandidate(contract.id)?.tasks||[]" :key="taskId" :value="taskId">{{ZOO_STAFF_TASKS.find(task=>task.id===taskId)?.name}}</option></select></label><button @click="requestAction({type:'dismissStaff',id:contract.id})">解雇</button></article><h3>自動工作開關</h3><div class="task-list"><label v-for="task in ZOO_STAFF_TASKS" :key="task.id"><input type="checkbox" :checked="zoo.staffTasks[task.id]" @change="requestAction({type:'staffTask',id:task.id,enabled:$event.target.checked})">{{task.name}}</label></div><p>每位員工每天依優先工作與開關處理 2–3 項可執行工作；沒有任務、飼料或預算時會在紀錄中提示。</p></template>
        <template v-else><p v-if="!zoo.staffHistory.length">尚無工作紀錄。</p><div v-for="(entry,i) in zoo.staffHistory" :key="i" class="staff-log"><b>第 {{entry.day}} 天 · {{entry.person}}</b><span>{{entry.detail}}</span></div></template>
      </div>
      <div class="sidebar-body" v-else-if="panel==='feed'"><h2>🥬 飼料倉庫</h2><p>不同動物吃不同食物。餵食會消耗「動物數量」份；營養師啟用補購任務後會在庫存不足時自動採買。</p><label>每次購買數量 <input type="number" min="1" max="50" v-model.number="feedQuantity"></label><div class="feed-list"><article v-for="feed in ZOO_FEEDS" :key="feed.id"><strong>{{feed.icon}} {{feed.name}}</strong><span>庫存 {{zoo.feedStock[feed.id]||0}} 份 · 每份 ${{feed.price}}</span><button :disabled="!Number.isInteger(feedQuantity)||feedQuantity<1||feedQuantity>50||zoo.money<feed.price*feedQuantity" @click="requestAction({type:'buyFeed',id:feed.id,quantity:feedQuantity})">購買 {{feedQuantity}} 份 · ${{feed.price*feedQuantity}}</button></article></div></div>
      <div class="sidebar-body" v-else-if="panel==='manage'"><h2>每日經營</h2><div class="report-row"><span>已連通動物／全部</span><b>{{metrics.active.length}}／{{metrics.exhibits.length}}</b></div><div class="report-row"><span>物種數</span><b>{{metrics.diversity}}</b></div><div class="report-row"><span>園區聲望</span><b>{{zoo.reputation}}／100</b></div><div class="report-row"><span>昨日收入</span><b>${{zoo.lastReport?.income||0}}</b></div><div class="report-row"><span>昨日支出</span><b>${{zoo.lastReport?.expense||0}}</b></div><div class="report-row"><span>連通的服務設施</span><b>{{activeGuestFacilities}} 座</b></div><label class="ticket">門票 ${{zoo.tickets}}<input type="range" min="5" max="30" :value="zoo.tickets" @change="changeTicket"></label><p>票價太高會減少遊客；餐飲攤、洗手間與解說牌會改善收益或吸引力。</p><h2>人力與園務</h2><div class="report-row"><span>值班</span><b>{{staffStatus}}</b></div><div class="report-row"><span>清潔／設施狀況</span><b>{{zoo.cleanliness??100}}%／{{zoo.condition??100}}%</b></div><p>請到「人力」頁選擇經理、飼育員、獸醫、營養師、清潔員、維修員、售票員、解說員與保全，並安排自動工作。</p><p v-if="zoo.keepers||zoo.vets">舊存檔保留 {{zoo.keepers}} 位原有保育員與 {{zoo.vets}} 位原有獸醫；新聘任請到人力市場。</p><button v-if="zoo.money<200&&!zoo.grantUsed" class="primary" @click="requestAction({type:'grant'})">申請保育補助 $700</button><h2>園區日誌</h2><ul><li v-for="(entry,i) in zoo.events" :key="i">{{entry}}</li></ul></div>
      <div class="sidebar-body" v-else><h2>遊玩方法</h2><p>開局有 3 格相連草原棲地；動物各有空間需求、群居數量與專屬飼料。建造相鄰的同類棲地可擴建同一區，再按容量領養。新棲地、餐飲攤、洗手間與解說牌要建在空地，並以步道連到入口。地圖上有顏色的棲地是動物的家；未連通的棲地不會帶來遊客。地圖上的小人代表遊客群，會沿著已連通的步道走向動物與服務設施。</p><p>每 45 秒有效遊玩時間推進一天；暫停、答題、檢視大圖或切換分頁不計時。動物每天需要正確飼料、飲水、清潔、活動與健康檢查；缺乏照護會降低福祉。到飼料頁採買，再到人力頁雇用並排班，人員自動值班與留下工作紀錄。遊客支付門票；紀念品店、遊客中心、急救站、兒童遊戲區、觀景台、保育教室及其他設施有不同效果與每日成本。可在地圖上選擇動物圖案風格，點擊動物棲地聽模擬叫聲。人員每工作 30 分鐘有效遊玩時間就休息 30 分鐘實際時間，休息後自動復工。</p><p>進行建設、領養、照護等操作時才可能出英文題：首次操作需答題，答過後 30–40 秒內的操作免答，期限過後要等下一次操作才會出題。答對才會執行該次操作；沒有操作就不會出題。分數來自答對單字、累積遊客和保育點數。棲地格數與物種需求為遊戲化單位，不代表現實動物園的法定面積或專業飼養標準。園區保存在本裝置，成績另存入學生紀錄。</p><p>玩法參考《Planet Zoo》與《Zoo Tycoon》的動物福祉、棲地及遊客經營概念；本遊戲的地圖、美術與規則為獨立設計。動物照片及簡介由維基百科即時載入，未載入時改用圖示與本地文字；點圖鑑連結查看原文與圖片授權。</p></div>
    </aside></div>
    <div v-if="photoOpen&&photo&&!photoError" class="photo-overlay" role="dialog" aria-modal="true" :aria-label="`${chosenAnimal?.name}完整照片`" @click.self="photoOpen=false"><div class="photo-dialog"><button class="photo-close" aria-label="關閉照片" @click="photoOpen=false">✕</button><img :src="fullPhoto||photo" :alt="chosenAnimal?.name" @error="fullPhoto=''" ><div><strong>{{chosenAnimal?.name}} · {{chosenAnimal?.en}}</strong><a v-if="photoCredit" :href="photoCredit" target="_blank" rel="noopener noreferrer">查看維基共享資源的攝影者與授權 ↗</a></div></div></div>
    <div v-if="quiz" class="quiz-overlay"><section class="quiz-card" role="dialog" aria-modal="true" aria-label="單字挑戰"><span class="eyebrow">ZOO WORD CHALLENGE</span><h2>{{quiz.word.zh_tw}}</h2><p>選出正確英文，完成這次操作並獲得保育基金 $70。</p><div class="choices"><button v-for="(choice,i) in quiz.choices" :key="i" @click="answer(choice.en_us)">{{choice.en_us}}</button></div><button class="cancel" @click="cancelQuiz">取消操作</button></section></div>
  </main>
</template>

<style scoped>
.zoo-page{min-height:100vh;box-sizing:border-box;padding:14px clamp(10px,2vw,30px);background:radial-gradient(circle at 50% 0,#416e65,#173744 55%,#102933);color:#f6f4e7;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif}.zoo-header{max-width:1700px;margin:0 auto 12px;display:flex;align-items:end;justify-content:space-between;gap:12px}.eyebrow{font-size:11px;letter-spacing:.18em;color:#f5d697;font-weight:800}.zoo-header h1{font:700 clamp(29px,3vw,45px) Georgia,'Noto Serif TC',serif;margin:3px 0}.zoo-header p{margin:0;color:#d3e6dd}.zoo-header nav,.top-actions{display:flex;flex-wrap:wrap;gap:6px}.zoo-header a,.top-actions button{border:1px solid #8db4a3;border-radius:9px;background:#ffffff14;color:#f7f5e8;text-decoration:none;padding:8px 10px;font:inherit;cursor:pointer}.zoo-layout{max-width:1700px;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(325px,365px);gap:12px;height:calc(100vh - 120px);min-height:615px}.zoo-board,.sidebar{min-height:0;border-radius:18px;border:1px solid #abc9a766;background:#244e48dd;box-shadow:0 18px 50px #001b2380}.zoo-board{padding:12px;display:flex;flex-direction:column}.topline{display:flex;justify-content:space-between;align-items:center;gap:8px}.topline>div:first-child{display:flex;align-items:baseline;gap:10px}.topline strong{font-size:23px}.topline span{color:#f4d995}.top-actions button{padding:6px 9px;font-size:13px}.top-actions button:disabled{opacity:.5}.stats{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.stats span{padding:7px 10px;border-radius:8px;background:#0b303666;border:1px solid #ffffff1b;font-size:13px;font-weight:700}.board-note{font-size:13px;color:#dcead8;margin:0 0 8px}.map-frame{flex:1;min-height:0;overflow:auto;border-radius:14px;border:3px solid #b09c6f;background:radial-gradient(circle at 30% 20%,#98bd84,#6a9778 75%);display:grid;place-items:center;padding:10px}.zoo-grid{display:grid;grid-template-columns:repeat(var(--cols),var(--tile-size));grid-auto-rows:var(--tile-size);border:4px solid #356348;border-radius:8px;box-shadow:0 12px 30px #133b2e88}.zoo-tile{position:relative;min-width:0;min-height:0;border:1px solid #acc89988;border-radius:5px;background:linear-gradient(135deg,#a5c584,#83ac75);color:#182f29;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}.zoo-tile.empty:nth-child(11n){background:linear-gradient(135deg,#8bb789,#729e70)}.zoo-tile.path{background:repeating-linear-gradient(45deg,#c4ad80 0 9px,#b9a071 9px 11px);border-color:#e1ca9c}.zoo-tile.path.connected{box-shadow:inset 0 0 0 2px #ebd7a1}.zoo-tile.habitat{background:linear-gradient(145deg,color-mix(in srgb,var(--biome-color),white 20%),var(--biome-color));border:3px solid #ead28c}.zoo-tile.shop,.zoo-tile.toilet,.zoo-tile.education{background:#d6b987}.zoo-tile.tree{background:#6f9c63}.zoo-tile.selected{outline:3px solid #fff7a3;outline-offset:-3px;z-index:1}.zoo-tile.unconnected{filter:grayscale(.55)}.tile-icon{font-size:clamp(17px,2.4vw,38px);line-height:1.1;filter:drop-shadow(1px 2px 2px #152b2d77)}.tile-label{font-size:clamp(9px,.85vw,14px);font-weight:900;background:#f8eecddc;border-radius:5px;padding:0 3px;white-space:nowrap}.tile-health{position:absolute;bottom:0;left:0;height:4px;background:#51d784}.entry-tag{position:absolute;bottom:1px;left:1px;background:#304d42;color:#fff;padding:0 3px;font-size:10px}.notice{margin-top:9px;background:#31695d;border-left:4px solid #f2d18c;padding:9px 11px;border-radius:5px;font-size:14px;min-height:20px}.save-notice{margin:5px 0 0;font-size:12px;color:#f3d792}.sidebar{display:flex;flex-direction:column;overflow:hidden}.tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:9px 8px 0}.tabs button{background:#153e40;color:#d7e5df;border:0;border-bottom:2px solid #74988e;padding:10px 3px;cursor:pointer;font-size:14px}.tabs button.active{background:#ddbd77;color:#1b383b;border-color:#fff0ad;font-weight:900}.sidebar-body{flex:1;overflow:auto;padding:10px 14px 16px}.sidebar-body h2{font-size:17px;color:#f4d592;margin:10px 0}.sidebar-body p{line-height:1.5;font-size:13px;color:#e2ebe1;margin:6px 0 12px}.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tool-grid button{min-height:65px;display:grid;grid-template-columns:25px 1fr;grid-template-rows:1fr 1fr;align-items:center;gap:0 3px;padding:5px;border-radius:8px;border:1px solid #89a999;background:#38675b;color:#fff7e3;text-align:left;cursor:pointer}.tool-grid button.active{background:#e4bd75;color:#233c37}.tool-grid span{grid-row:span 2;font-size:22px}.tool-grid strong{font-size:12px}.tool-grid small{font-size:11px}.selected-card,.care-card,.wiki-card{border-top:1px solid #ffffff3d;margin-top:12px;padding-top:8px}.animal-list{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.animal-list button{display:flex;gap:5px;align-items:center;border:1px solid #8ca99b;border-radius:8px;background:#315c54;color:#f5f4e5;padding:5px;text-align:left;cursor:pointer}.animal-list button.active{background:#d2ad70;color:#233b37}.animal-list button>span{font-size:25px}.animal-list strong{font-size:12px}.animal-list small{display:block;font-size:10px;font-weight:400}.animal-list em{margin-left:auto;font-size:11px;font-style:normal}.wiki-card img{max-width:100%;height:auto;object-fit:contain;border-radius:10px}.wiki-fallback{font-size:65px;display:block;text-align:center;background:#416e65;border-radius:10px}.wiki-card h3{margin:6px 0;font-size:16px}.wiki-extract{font-size:11px!important;color:#bad9cb!important}.wiki-card a{display:block;color:#ffdb91;margin:6px 0;font-size:12px}.primary,.care-card button,.hire button{border:1px solid #ffe1a6;border-radius:8px;background:#ddb46e;color:#17383c;padding:9px;font-weight:800;cursor:pointer}.primary{width:100%;margin-top:7px}.primary:disabled,.hire button:disabled{opacity:.45;cursor:not-allowed}.wiki-card>small{display:block;color:#dce9d8;margin:7px 0}.care-card>div,.hire{display:flex;flex-wrap:wrap;gap:6px}.care-card button,.hire button{font-size:12px}.report-row{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #ffffff25;font-size:13px}.report-row b{color:#ffdf9d}.ticket{display:block;font-weight:800;margin:12px 0}.ticket input{display:block;width:100%;accent-color:#eac474}.sidebar-body ul{padding-left:20px;font-size:12px;line-height:1.5;color:#d5e6da}.sidebar-body li{margin:5px 0}.quiz-overlay{position:fixed;inset:0;background:#071c20de;z-index:20;display:grid;place-items:center;padding:12px}.quiz-card{width:min(95vw,470px);background:#fbf3db;border:5px solid #c8a568;color:#203a37;border-radius:20px;padding:26px;box-shadow:0 25px 60px #0008}.quiz-card h2{font-size:38px;margin:8px 0}.quiz-card p{line-height:1.5}.choices{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.choices button{border:1px solid #bdaf90;border-radius:9px;background:#fffdfa;padding:12px;color:#203a37;font-size:16px;font-weight:800;cursor:pointer}.choices button:hover{background:#e8d39d}.cancel{border:0;background:none;color:#566e6b;margin-top:12px;cursor:pointer}@media(max-width:950px){.zoo-layout{height:auto;grid-template-columns:1fr}.zoo-board{min-height:560px}.sidebar{max-height:580px}.zoo-header{align-items:start;flex-direction:column}}@media(max-width:600px){.zoo-page{padding:8px 5px}.zoo-header h1{font-size:28px}.zoo-header p{font-size:12px}.zoo-board{min-height:450px;padding:7px}.topline{align-items:start;flex-direction:column}.map-frame{place-items:start;min-height:275px}.tile-icon{font-size:20px}.tile-label{font-size:9px}.stats span{font-size:11px;padding:5px}.sidebar{max-height:570px}}

.map-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 7px;color:#e6f2e8;font-size:12px}
.map-controls span{margin-right:auto;font-weight:800}
.map-controls button{padding:5px 10px;border:1px solid #a3c4aa;border-radius:7px;background:#225249;color:#fff4d6;cursor:pointer}
.map-controls button:disabled{opacity:.45;cursor:not-allowed}
.map-frame{display:block;scrollbar-color:#deb978 #2d594b}
.zoo-grid{width:max-content;min-width:0;aspect-ratio:auto;grid-template-columns:repeat(var(--cols),var(--tile-size));grid-auto-rows:var(--tile-size);gap:4px;padding:5px;background:repeating-linear-gradient(35deg,#6a9b76 0 70px,#77a47c 70px 140px)}
.zoo-tile{border-radius:8px;border:1px solid #d4ecc14d;box-shadow:inset 0 2px 2px #ffffff70,inset 0 -5px 5px #31573b55,0 4px 3px #1b493970;transition:transform .14s,box-shadow .14s}
.zoo-tile:hover{transform:translateY(-3px);box-shadow:inset 0 2px 2px #ffffff80,0 7px 5px #173b2e9c}
.zoo-tile.empty:nth-child(11n){background:radial-gradient(circle at 35% 25%,#a8cb8d,#75a36e)}
.zoo-tile.habitat{border:3px solid #f3dfa2;box-shadow:inset 0 4px 6px #ffffff5c,inset 0 -8px 5px #304e4a50,0 5px 4px #183d35af}
.zoo-tile.shop,.zoo-tile.toilet,.zoo-tile.education{background:linear-gradient(145deg,#f7dda6,#b98e61);box-shadow:inset 0 3px 2px #fff2cd,0 5px 4px #5a4134a8}
.zoo-tile.tree{background:radial-gradient(circle at 45% 35%,#91bf72,#4f8255)}
.tile-kind{position:absolute;top:2px;left:2px;right:2px;z-index:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#153d35dd;color:#fff7dc;border:1px solid #ffffff65;border-radius:4px;padding:1px 2px;font-size:10px;line-height:1.2;font-weight:900;text-shadow:0 1px 2px #102b25}
.tile-object{position:relative;display:grid;place-items:center;width:70%;height:62%;border-radius:45% 45% 34% 34%;background:radial-gradient(circle at 32% 23%,#fff7d9,#dfd39c 65%,#a99968);box-shadow:inset 0 2px 3px #ffffffb0,inset 0 -5px 5px #765c3b87,0 6px 2px #28463190;transform:translateY(2px)}
.tile-object:after{content:'';position:absolute;inset:auto 12% -5px;height:7px;border-radius:50%;background:#233d3166;filter:blur(2px);z-index:-1}
.tile-object.animal-object{background:radial-gradient(circle at 32% 23%,#fff9dd,#d3d3a0 60%,#9b9865);animation:zoo-breathe 3.2s ease-in-out infinite}
.tile-object.facility-object{border-radius:9px 9px 4px 4px;background:linear-gradient(130deg,#ffe6b0,#d1925f 65%,#9a5c4d);box-shadow:inset 3px 3px 4px #fff2cd,6px 6px 0 #6f493b,0 9px 3px #263d3799}
.tile-icon{font-size:clamp(23px,2.3vw,38px);line-height:1;filter:drop-shadow(0 2px 1px #6954398c);transform:translateY(-2px)}
.tile-label{position:absolute;left:2px;right:2px;bottom:5px;z-index:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;font-size:11px;background:#fff6d9ed;color:#28372d;border:1px solid #755f4380;padding:1px 2px;box-shadow:0 2px 2px #36423270}
.tile-health{z-index:3}
.entry-tag{z-index:3}
@keyframes zoo-breathe{0%,100%{transform:translateY(2px) rotate(-2deg)}50%{transform:translateY(-1px) rotate(2deg)}}
@media(prefers-reduced-motion:reduce){.tile-object.animal-object{animation:none}.zoo-tile{transition:none}}
.photo-preview{display:block;width:100%;padding:8px;border:1px solid #8cae9d;border-radius:11px;background:#183c39;color:#f8e6b9;cursor:zoom-in;text-align:center}
.photo-preview img{display:block;width:auto;max-width:100%;height:auto;max-height:300px;margin:auto;object-fit:contain;border-radius:6px}
.photo-preview span{display:block;margin-top:5px;font-size:12px}
.photo-overlay{position:fixed;inset:0;z-index:30;background:#041a1de8;display:grid;place-items:center;padding:15px}
.photo-dialog{position:relative;max-width:min(96vw,1100px);max-height:94vh;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px;background:#f7efdd;color:#213937;border-radius:14px;box-shadow:0 22px 70px #0009}
.photo-dialog img{display:block;max-width:100%;max-height:calc(94vh - 105px);width:auto;height:auto;object-fit:contain}
.photo-dialog>div{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:13px}
.photo-dialog a{color:#245d66}
.photo-close{position:absolute;top:8px;right:8px;border:0;border-radius:50%;width:32px;height:32px;background:#244d48;color:#fff;cursor:pointer}

/* Keep the terrain and occupant labels in separate rows; the animal never sits over either label. */
.zoo-tile{display:grid;grid-template-rows:clamp(15px,calc(var(--tile-size)*.2),22px) minmax(0,1fr) clamp(15px,calc(var(--tile-size)*.2),22px);justify-items:center;align-items:center;padding:1px}
.tile-kind{position:static;grid-row:1;align-self:start;box-sizing:border-box;width:100%;min-width:0;margin:0;padding:1px;text-align:center;font-size:clamp(9px,calc(var(--tile-size)*.14),12px);line-height:1.1}
.tile-object{grid-row:2;align-self:center;justify-self:center;margin:0}
.tile-label{position:static;grid-row:3;align-self:end;box-sizing:border-box;width:100%;min-width:0;margin:0 0 2px;padding:1px;text-align:center;font-size:clamp(9px,calc(var(--tile-size)*.15),12px);line-height:1.1}
.tile-object.animal-object{width:100%;height:100%;border-radius:0;background:none;box-shadow:none;animation:none;transform:none}
.tile-object.animal-object:after{display:none}
.animal-object .tile-icon{font-size:clamp(23px,calc(var(--tile-size)*.44),43px);line-height:1;filter:drop-shadow(0 2px 1px #24413655);transform:none}
.tile-object.facility-object{width:68%;height:78%}
.tile-object.facility-object .tile-icon{font-size:clamp(18px,calc(var(--tile-size)*.3),34px)}

.tile-details{flex:none;max-height:min(42vh,330px);overflow:auto;margin:8px 10px 0;padding:10px 12px;border:1px solid #e5d1959e;border-radius:12px;background:linear-gradient(155deg,#356656,#234a45);box-shadow:inset 0 1px 0 #ffffff38,0 5px 12px #102f2d66}
.detail-heading{display:flex;align-items:center;gap:9px}
.detail-emoji{display:grid;place-items:center;width:42px;height:42px;flex:none;border-radius:10px;background:#e8d7a6;font-size:29px;box-shadow:inset 0 1px #fff8d8,0 3px 3px #173c3480}
.detail-heading small{color:#d4e8dc;font-size:11px}
.detail-heading h2{margin:2px 0;color:#ffe3a2;font-size:18px;line-height:1.2}
.tile-details p{margin:7px 0;line-height:1.4;color:#e8f1e7;font-size:12px}
.detail-facts{display:flex;flex-wrap:wrap;gap:4px 10px;margin:7px 0;font-size:12px}
.detail-facts span{white-space:nowrap}
.detail-facts b{color:#ffe5ab}
.detail-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.detail-actions button{border:1px solid #f0d49f;border-radius:7px;background:#dfbc7a;color:#1e3e39;padding:5px 8px;font-size:12px;font-weight:800;cursor:pointer}
@media(max-width:950px){.tile-details{max-height:260px}}

.quiz-clock{align-self:center;padding:6px 9px;border:1px solid #b9d2b4;border-radius:8px;background:#173f3b;color:#ffe7ab;font-size:12px;font-weight:800}
.map-controls .map-option-label{margin:0 0 0 5px}
.map-controls button.active{background:#e8c379;color:#1c3a36;border-color:#fff2bf;font-weight:900}
.tool-section{margin:12px 0}
.tool-section h3{margin:7px 0;color:#f5d58f;font-size:13px}
.tool-grid button{min-height:70px}
.tool-grid strong{overflow-wrap:anywhere}
.zoo-tile.giftShop,.zoo-tile.visitorCenter,.zoo-tile.playground,.zoo-tile.waterFountain,.zoo-tile.bench{background:linear-gradient(145deg,#f6e4ab,#bca275);box-shadow:inset 0 3px 2px #fff2d0,0 5px 4px #5a4834a8}
.zoo-tile.firstAid,.zoo-tile.educationCenter,.zoo-tile.viewingDeck,.zoo-tile.keeperStation,.zoo-tile.vetClinic{background:linear-gradient(145deg,#d2e4d2,#819f96);box-shadow:inset 0 3px 2px #efffed,0 5px 4px #354f4c9e}
.zoo-grid{position:relative}
.visitor-marker{position:absolute;z-index:5;display:grid;place-items:center;pointer-events:none;width:25px;height:25px;border-radius:50%;background:#ffefcfde;border:1px solid #6c755b;box-shadow:0 2px 5px #1f403ca8;font-size:17px;line-height:1;transform:translate(-50%,-50%);transition:left .75s ease,top .75s ease}
.zoo-grid.art-raised .tile-object.animal-object{width:78%;height:87%;border-radius:45% 45% 34% 34%;background:radial-gradient(circle at 32% 23%,#fff9dd,#d3d3a0 60%,#9b9865);box-shadow:inset 0 2px 3px #ffffffb0,inset 0 -4px 5px #765c3b80,0 4px 3px #28463190;animation:zoo-breathe 3.2s ease-in-out infinite}
.zoo-grid.art-raised .tile-object.animal-object:after{display:block}
.zoo-grid.art-raised .animal-object .tile-icon{font-size:clamp(20px,calc(var(--tile-size)*.34),38px)}
@media(prefers-reduced-motion:reduce){.zoo-grid.art-raised .tile-object.animal-object{animation:none}.visitor-marker{transition:none}}
.staff-tabs{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.staff-tabs button{border:1px solid #b9d7b8;border-radius:7px;background:#27554c;color:#fff0d0;padding:6px 10px;cursor:pointer}.staff-tabs button.active{background:#e5bf7a;color:#1d3b37;font-weight:900}
.staff-card,.feed-list article{display:grid;gap:5px;margin:8px 0;padding:9px;border:1px solid #a6c3a288;border-radius:9px;background:#17423e}.staff-card-head{display:flex;align-items:center;gap:8px}.staff-card-head>span{font-size:29px}.staff-card strong,.feed-list strong{font-size:13px;color:#ffe2a5}.staff-card small,.feed-list span{display:block;font-size:11px;color:#deebe0}.staff-card button,.feed-list button{border:1px solid #f0d49f;border-radius:7px;background:#dfbc7a;color:#1e3e39;padding:6px 8px;font-size:12px;font-weight:800;cursor:pointer}.staff-card button:disabled,.feed-list button:disabled{opacity:.45;cursor:not-allowed}.staff-card label{font-size:12px}.staff-card select,.sidebar-body input[type=number]{max-width:100%;padding:5px;border-radius:6px;border:1px solid #cddbc4;background:#f9f5e8;color:#1d3934}.task-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.task-list label{display:flex;align-items:center;gap:4px;padding:6px;border:1px solid #a5c1af88;border-radius:6px;font-size:12px}.staff-log{display:grid;gap:2px;padding:6px 0;border-bottom:1px solid #ffffff33;font-size:12px}.staff-log b{color:#f4d591}.feed-list article{grid-template-columns:1fr auto;align-items:center}.feed-list article button{grid-column:1/-1}
</style>
