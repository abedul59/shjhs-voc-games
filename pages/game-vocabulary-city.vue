<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CITY_HEIGHT, CITY_TOOLS, CITY_WIDTH, advanceCityMonth, cityMetrics, cityPlacementQuote, citySelectionIds, createCity, placeCityArea, upgradeCityMap } from '~/lib/vocabulary-city';

const MAP_WIDTH = 1600;
const MAP_HEIGHT = 850;
const MAP_CENTER = { x: 800, y: 425 };
const ZOOM_LEVELS = [1, 1.25, 1.8, 2.6, 3.5];
const tileCenter = tile => ({ x: 740 + (tile.x - tile.y) * 22, y: 110 + (tile.x + tile.y) * 11 });

const GAME_TYPE = '單字城市建造家';
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const city = ref(createCity());
const words = ref([]);
const loading = ref(true);
const selectedTool = ref('residential');
const selectedTile = ref(null);
const quiz = ref(null);
const notice = ref('正在載入本課單字與城市…');
const saveNotice = ref('');
const activeSeconds = ref(0);
const lastQuestionAt = ref(0);
const screen = ref('build');
const mapLayer = ref('buildings');
const mapRef = ref(null);
const camera = ref({ ...MAP_CENTER, zoom: 1.25 });
const panMode = ref(false);
const dragStart = ref(null);
const dragEnd = ref(null);
const pending = ref(null);
const metrics = computed(() => cityMetrics(city.value));
const score = computed(() => city.value.correct.length * 10 + Math.min(300, Math.floor(city.value.population / 2)) + Math.min(100, Math.floor(city.value.happiness)));
const historyLink = computed(() => ({ path: '/history', query: { game: GAME_TYPE } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME_TYPE, ...lesson } }));
const groupedTools = computed(() => ['分區', '交通', '設施', '管理'].map(group => ({ group, tools: CITY_TOOLS.filter(tool => tool.group === group) })));
const selected = computed(() => selectedTile.value === null ? null : city.value.tiles[selectedTile.value]);
const tiles = computed(() => city.value.tiles.map((tile, id) => ({ ...tile, id, cx: tileCenter(tile).x, cy: tileCenter(tile).y })));
const viewBox = computed(() => {
  const width = MAP_WIDTH / camera.value.zoom, height = MAP_HEIGHT / camera.value.zoom;
  return `${camera.value.x - width / 2} ${camera.value.y - height / 2} ${width} ${height}`;
});
const networkSegments = computed(() => {
  const segments = [];
  for (const tile of city.value.tiles) {
    if (!['road', 'rail', 'station'].includes(tile.kind)) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const x = tile.x + dx, y = tile.y + dy;
      if (x >= CITY_WIDTH || y >= CITY_HEIGHT) continue;
      const next = city.value.tiles[y * CITY_WIDTH + x];
      if (!['road', 'rail', 'station'].includes(next?.kind)) continue;
      const kind = tile.kind === 'station' ? next.kind : next.kind === 'station' ? tile.kind : tile.kind === next.kind ? tile.kind : null;
      if (!kind || kind === 'station') continue;
      const a = tileCenter(tile), b = tileCenter(next);
      segments.push({ id: `${tile.x}-${tile.y}-${x}-${y}`, kind, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
  return segments;
});
const previewIds = computed(() => dragStart.value === null ? [] : citySelectionIds(dragStart.value, dragEnd.value ?? dragStart.value, selectedTool.value));
const previewSet = computed(() => new Set(previewIds.value));
const previewQuote = computed(() => previewIds.value.length ? cityPlacementQuote(city.value, previewIds.value, selectedTool.value) : null);
const iconByKind = Object.fromEntries(CITY_TOOLS.map(tool => [tool.id, tool.icon]));
const nameByKind = Object.fromEntries(CITY_TOOLS.map(tool => [tool.id, tool.name]));
const colorByKind = { road: '#617586', rail: '#626a73', station: '#b59e78', residential: '#64a99e', commercial: '#ceaa68', industrial: '#987f9d', power: '#db8762', water: '#6bafc0', park: '#5fa86d', school: '#8ca6d5', hospital: '#db999b', fire: '#d97668', police: '#8e9cca', stadium: '#68a886' };
const buildingKinds = ['residential', 'commercial', 'industrial', 'power', 'water', 'school', 'hospital', 'fire', 'police', 'station', 'stadium'];
let timer = null;
let disposed = false;
let lastTick = 0;
let elapsedMs = 0;
let lastAdvancedAt = 0;
let savingRecord = false;
let panStart = null;
const storageKey = computed(() => `shjhs-vocabulary-city:v1:${student.value?.id || 'anon'}:${lesson.version}:${lesson.volume}:${lesson.unit}`);

function persist() {
  if (typeof localStorage === 'undefined' || !student.value?.id) return;
  try { localStorage.setItem(storageKey.value, JSON.stringify(city.value)); }
  catch { saveNotice.value = '瀏覽器儲存空間不足；請先匯出或清理空間。'; }
}
function tileAtPointer(event) {
  const svg = mapRef.value;
  if (!svg) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX; point.y = event.clientY;
  const local = point.matrixTransform(svg.getScreenCTM().inverse());
  for (const tile of tiles.value) {
    if (Math.abs(local.x - tile.cx) / 22 + Math.abs(local.y - tile.cy) / 11 <= 1) return tile.id;
  }
  return null;
}
function clampCamera() {
  const halfX = MAP_WIDTH / camera.value.zoom / 2, halfY = MAP_HEIGHT / camera.value.zoom / 2;
  camera.value.x = Math.max(halfX, Math.min(MAP_WIDTH - halfX, camera.value.x));
  camera.value.y = Math.max(halfY, Math.min(MAP_HEIGHT - halfY, camera.value.y));
}
function zoomMap(direction) {
  const current = ZOOM_LEVELS.indexOf(camera.value.zoom);
  const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, current + direction));
  if (next === current) return;
  camera.value.zoom = ZOOM_LEVELS[next];
  clampCamera();
}
function focusSelected() {
  if (selectedTile.value === null) return;
  const focus = tileCenter(city.value.tiles[selectedTile.value]);
  camera.value = { x: focus.x, y: focus.y, zoom: Math.max(2.6, camera.value.zoom) };
  clampCamera();
}
function resetMapView() {
  camera.value = { ...MAP_CENTER, zoom: 1 };
  panMode.value = false;
}
function beginDrag(event) {
  if (quiz.value || loading.value || words.value.length < 4) return;
  if (panMode.value || event.button === 1) {
    event.preventDefault();
    mapRef.value.setPointerCapture(event.pointerId);
    panStart = { clientX: event.clientX, clientY: event.clientY, x: camera.value.x, y: camera.value.y };
    return;
  }
  const id = tileAtPointer(event);
  if (id === null) return;
  event.preventDefault();
  mapRef.value.setPointerCapture(event.pointerId);
  dragStart.value = id; dragEnd.value = id; selectedTile.value = id;
}
function moveDrag(event) {
  if (panStart) {
    const svg = mapRef.value;
    const scale = Math.min(svg.clientWidth / (MAP_WIDTH / camera.value.zoom), svg.clientHeight / (MAP_HEIGHT / camera.value.zoom));
    if (scale > 0) {
      camera.value.x = panStart.x - (event.clientX - panStart.clientX) / scale;
      camera.value.y = panStart.y - (event.clientY - panStart.clientY) / scale;
      clampCamera();
    }
    return;
  }
  if (dragStart.value === null) return;
  const id = tileAtPointer(event);
  if (id !== null) { dragEnd.value = id; selectedTile.value = id; }
}
function endDrag(event) {
  if (panStart) {
    panStart = null;
    if (mapRef.value?.hasPointerCapture(event.pointerId)) mapRef.value.releasePointerCapture(event.pointerId);
    return;
  }
  if (dragStart.value === null) return;
  moveDrag(event);
  const ids = citySelectionIds(dragStart.value, dragEnd.value ?? dragStart.value, selectedTool.value);
  dragStart.value = null; dragEnd.value = null;
  if (mapRef.value?.hasPointerCapture(event.pointerId)) mapRef.value.releasePointerCapture(event.pointerId);
  const quote = cityPlacementQuote(city.value, ids, selectedTool.value);
  if (quote.error) { notice.value = quote.error; return; }
  const action = { ids: quote.ids, kind: selectedTool.value };
  notice.value = `${quote.count} 格${quote.tool.name}，預計 $${quote.cost}。`;
  if (quote.tool.important || activeSeconds.value - lastQuestionAt.value >= 35) openQuiz(action);
  else applyAction(action);
}
function cancelDrag() { dragStart.value = null; dragEnd.value = null; panStart = null; }
function groundColor(tile) {
  if (mapLayer.value === 'traffic') return tile.kind === 'road' || tile.kind === 'rail' || tile.kind === 'station' ? '#f4cc75' : metrics.value.served(tile) ? '#75b390' : '#bf7778';
  if (mapLayer.value === 'pollution') return tile.terrain === 'water' ? '#3d829b' : city.value.tiles.some(other => ['industrial', 'power'].includes(other.kind) && Math.abs(other.x - tile.x) + Math.abs(other.y - tile.y) < 3) ? '#b46e69' : '#71aa8d';
  if (mapLayer.value === 'zones') return tile.kind ? colorByKind[tile.kind] : tile.terrain === 'water' ? '#3d829b' : '#8baf80';
  return tile.kind ? colorByKind[tile.kind] : tile.terrain === 'water' ? '#3d829b' : tile.terrain === 'forest' ? '#4b8a72' : '#8baf80';
}
function buildingHeight(tile) {
  return ['residential', 'commercial', 'industrial'].includes(tile.kind) ? 7 + tile.level * 9 : tile.kind === 'stadium' ? 7 : 17;
}
function applyAction(action) {
  const result = placeCityArea(city.value, action.ids, action.kind);
  notice.value = result.error || result.message;
  if (!result.error) persist();
}
function openQuiz(action) {
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const distractors = [...words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase())]
    .sort(() => Math.random() - .5).slice(0, 3);
  quiz.value = { word, choices: [word, ...distractors].sort(() => Math.random() - .5) };
  pending.value = action;
  lastQuestionAt.value = activeSeconds.value;
}
function answer(choice) {
  if (!quiz.value) return;
  const word = quiz.value.word;
  const correct = choice.trim().toLowerCase() === word.en_us.trim().toLowerCase();
  if (correct) city.value.correct.push(word.en_us);
  else city.value.wrong.push(word.en_us);
  quiz.value = null;
  if (correct) {
    if (pending.value?.kind === 'relief') {
      city.value.money += 700; city.value.totalEarned += 700; city.value.reliefUsed = true;
      notice.value = `答對 ${word.en_us}！市政紓困金 $700 已入帳；每座城市限一次。`;
    } else if (pending.value?.kind === 'bond') {
      city.value.money += 1000; city.value.debt = (city.value.debt || 0) + 1100;
      city.value.totalEarned += 1000;
      notice.value = '市政公債募集 $1000，未償餘額 $1100；每月從預算扣款。';
    } else if (pending.value?.kind === 'policy') {
      city.value.policy = pending.value.policy;
      notice.value = `已實施${pending.value.policy === 'green' ? '清潔城市' : pending.value.policy === 'transit' ? '大眾運輸' : '一般'}政策。`;
    } else if (pending.value) applyAction(pending.value);
    else { city.value.money += 80; city.value.totalEarned += 80; notice.value = `答對 ${word.en_us}！市政獎勵 $80。`; }
  } else notice.value = `答錯了。${word.zh_tw} 是 ${word.en_us}；這次建設未執行。`;
  pending.value = null;
  persist();
}
function cancelQuiz() { quiz.value = null; pending.value = null; notice.value = '已取消本次建設。'; }
function requestRelief() {
  if (city.value.money >= 200 || city.value.reliefUsed || quiz.value || words.value.length < 4) return;
  openQuiz({ kind: 'relief' });
}
function issueBond() {
  if (city.value.debt > 0 || quiz.value || words.value.length < 4) return;
  openQuiz({ kind: 'bond' });
}
function changePolicy(policy) {
  if (quiz.value || city.value.policy === policy || words.value.length < 4) return;
  openQuiz({ kind: 'policy', policy });
}
function setTax(value) {
  city.value.taxRate = Number(value);
  notice.value = `稅率設為 ${city.value.taxRate}%，下個月生效。`;
  persist();
}
function newCity() {
  if (!confirm('建立新城市會覆蓋目前城市存檔。確定繼續？')) return;
  const name = prompt('為新城市命名', '晨光市');
  if (name === null) return;
  city.value = createCity(name.trim().slice(0, 20) || '晨光市');
  city.value.recordId = crypto.randomUUID();
  city.value.startedAt = Date.now();
  city.value.attemptNumber = 0;
  activeSeconds.value = 0; lastQuestionAt.value = 0;
  selectedTile.value = null; quiz.value = null; pending.value = null;
  resetMapView();
  notice.value = `歡迎來到 ${city.value.name}，先在道路旁規劃住宅和工作機會。`;
  saveNotice.value = '';
  persist();
}
async function saveRecord() {
  if (!student.value?.id || savingRecord) return;
  savingRecord = true;
  try {
    if (!city.value.recordId) city.value.recordId = crypto.randomUUID();
    if (!city.value.startedAt) city.value.startedAt = Date.now();
    if (!city.value.attemptNumber) {
      const { count, error } = await db.from('game_records').select('id', { count: 'exact', head: true })
        .eq('student_id', String(student.value.id)).eq('game_type', GAME_TYPE)
        .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
      if (error) throw error;
      city.value.attemptNumber = (count || 0) + 1;
    }
    const { error } = await db.from('game_records').upsert({
      id: city.value.recordId, student_id: String(student.value.id), game_type: GAME_TYPE,
      version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
      score: score.value, mistakes: city.value.wrong.length,
      correct_words: city.value.correct.join(', '), wrong_words: city.value.wrong.join(', '),
      attempt_number: city.value.attemptNumber, played_at: new Date(city.value.startedAt).toISOString(),
      time_taken_seconds: activeSeconds.value, device_info: navigator.userAgent
    }, { onConflict: 'id' });
    if (error) throw error;
    saveNotice.value = '成績和對錯單字已更新至學生紀錄。';
    persist();
  } catch (error) { saveNotice.value = `成績儲存失敗：${error.message}`; }
  finally { savingRecord = false; }
}

onMounted(async () => {
  if (!student.value?.id) { await navigateTo('/'); return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) { loading.value = false; notice.value = '請先從首頁選擇課本、冊次和單元。'; return; }
  const { data, error } = await db.from('vocabularies').select('en_us,zh_tw')
    .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
  if (disposed) return;
  loading.value = false;
  if (error) { notice.value = `單字載入失敗：${error.message}`; return; }
  const seen = new Set();
  words.value = (data || []).filter(word => {
    const key = word.en_us?.trim().toLowerCase();
    if (!key || !word.zh_tw?.trim() || seen.has(key)) return false;
    seen.add(key); return true;
  });
  if (words.value.length < 4) { notice.value = '本課至少需要四筆不同單字。請回首頁選擇其他單元。'; return; }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey.value) || 'null');
    const upgraded = upgradeCityMap(saved);
    if (upgraded) city.value = upgraded;
  } catch { /* Invalid or unavailable local save: use a new city. */ }
  city.value.recordId ||= crypto.randomUUID();
  city.value.startedAt ||= Date.now();
  city.value.correct ||= []; city.value.wrong ||= [];
  city.value.events ||= [];
  persist();
  notice.value = `歡迎來到 ${city.value.name}！點選工具，再點地圖建設。`;
  lastTick = Date.now();
  timer = window.setInterval(() => {
    if (document.hidden || city.value.paused || quiz.value) { lastTick = Date.now(); return; }
    const now = Date.now();
    elapsedMs += Math.min(2000, Math.max(0, now - lastTick));
    lastTick = now;
    if (elapsedMs < 1000) return;
    activeSeconds.value += Math.floor(elapsedMs / 1000);
    elapsedMs %= 1000;
    if (activeSeconds.value - lastAdvancedAt >= 45) {
      lastAdvancedAt = activeSeconds.value;
      const report = advanceCityMonth(city.value);
      notice.value = `新月份：收入 $${report.income}，支出 $${report.expense}，人口 ${report.population}。`;
      persist();
      if (city.value.month % 3 === 0) saveRecord();
    }
  }, 1000);
});
onBeforeUnmount(() => { disposed = true; if (timer) clearInterval(timer); persist(); });
watch(() => city.value.paused, persist);
</script>

<template>
  <main class="city-page">
    <header class="city-header">
      <div><span class="eyebrow">VOCABULARY · CITY BUILDER</span><h1>單字城市建造家</h1><p>規劃街區、照顧市民，靠英文單字推動城市發展</p></div>
      <nav><NuxtLink to="/">← 首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">英雄榜</NuxtLink></nav>
    </header>
    <div class="city-shell">
      <section class="city-main">
        <div class="city-bar"><div><span class="city-seal">◆</span><strong>{{ city.name }}</strong><small>第 {{ city.year }} 年 {{ city.month }} 月</small></div><div class="city-bar-actions"><button v-if="!loading&&words.length>=4&&activeSeconds-lastQuestionAt>=35&&!quiz" @click="openQuiz(null)">📚 市政單字</button><button @click="city.paused=!city.paused">{{city.paused?'▶ 繼續':'Ⅱ 暫停'}}</button><button @click="saveRecord" :disabled="loading||savingRecord">儲存成績</button><button @click="newCity">新城市</button></div></div>
        <div class="map-layer-bar"><span>地圖圖層</span><button v-for="layer in [{id:'buildings',name:'建築'},{id:'zones',name:'分區'},{id:'traffic',name:'交通'},{id:'pollution',name:'污染'}]" :key="layer.id" :class="{active:mapLayer===layer.id}" @click="mapLayer=layer.id">{{layer.name}}</button></div>
        <div class="map-zoom-bar"><span>{{CITY_WIDTH}} × {{CITY_HEIGHT}} 格 · {{Math.round(camera.zoom*100)}}%</span><button aria-label="縮小地圖" :disabled="camera.zoom===ZOOM_LEVELS[0]" @click="zoomMap(-1)">− 縮小</button><button aria-label="放大地圖" :disabled="camera.zoom===ZOOM_LEVELS[ZOOM_LEVELS.length-1]" @click="zoomMap(1)">＋ 放大</button><button :disabled="selectedTile===null" @click="focusSelected">看選中地</button><button :class="{active:panMode}" :aria-pressed="panMode" @click="panMode=!panMode">✋ 拖曳移動</button><button @click="resetMapView">全區</button><small v-if="previewQuote" class="preview-bill">{{previewQuote.error||`${previewQuote.count} 格，總價 $${previewQuote.cost}`}}</small></div>
        <div class="city-map-wrap"><svg ref="mapRef" class="city-map" :viewBox="viewBox" role="img" aria-label="城市地圖，拖曳可劃定分區；開啟拖曳移動可平移視角" @pointerdown="beginDrag" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="cancelDrag" @wheel.prevent="zoomMap($event.deltaY<0?1:-1)">
          <defs><linearGradient id="city-bg" x2="0" y2="1"><stop stop-color="#172e49"/><stop offset="1" stop-color="#244c61"/></linearGradient><filter id="tile-shadow"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#071a29" flood-opacity=".45"/></filter></defs>
          <rect :width="MAP_WIDTH" :height="MAP_HEIGHT" fill="url(#city-bg)"/><path d="M0 720 Q250 650 500 725 T1000 720 T1600 710 V850 H0Z" fill="#254c56" opacity=".55"/>
          <g v-for="tile in tiles" :key="tile.id" class="map-tile" :class="{picked:selectedTile===tile.id}">
            <title>{{tile.x+1}} 列 {{tile.y+1}} 行：{{tile.kind?nameByKind[tile.kind]:tile.terrain==='water'?'水域':tile.terrain==='forest'?'林地':'空地'}}{{tile.level?`，等級 ${tile.level}`:''}}</title>
            <path :d="`M${tile.cx} ${tile.cy-11} l22 11 -22 11 -22 -11 Z`" :fill="groundColor(tile)" :stroke="previewSet.has(tile.id)?'#fff2b7':selectedTile===tile.id?'#ffdd8c':'#193d50'" :stroke-width="previewSet.has(tile.id)?3.5:selectedTile===tile.id?2.5:1.2" filter="url(#tile-shadow)"/>
            <g v-if="mapLayer==='buildings'&&buildingKinds.includes(tile.kind)&&(tile.level>0||!['residential','commercial','industrial'].includes(tile.kind))" class="building-model">
              <path :d="`M${tile.cx-10} ${tile.cy+1} L${tile.cx} ${tile.cy+6} L${tile.cx} ${tile.cy+6-buildingHeight(tile)} L${tile.cx-10} ${tile.cy+1-buildingHeight(tile)} Z`" :fill="tile.kind==='industrial'?'#695772':tile.kind==='commercial'?'#9f7548':tile.kind==='residential'?'#477f75':'#597891'"/>
              <path :d="`M${tile.cx} ${tile.cy+6} L${tile.cx+10} ${tile.cy+1} L${tile.cx+10} ${tile.cy+1-buildingHeight(tile)} L${tile.cx} ${tile.cy+6-buildingHeight(tile)} Z`" :fill="tile.kind==='industrial'?'#473d55':tile.kind==='commercial'?'#765a40':tile.kind==='residential'?'#315d60':'#3d596c'"/>
              <path :d="`M${tile.cx-10} ${tile.cy+1-buildingHeight(tile)} L${tile.cx} ${tile.cy-4-buildingHeight(tile)} L${tile.cx+10} ${tile.cy+1-buildingHeight(tile)} L${tile.cx} ${tile.cy+6-buildingHeight(tile)} Z`" :fill="tile.kind==='residential'?'#c57562':tile.kind==='industrial'?'#aea2a4':tile.kind==='commercial'?'#e3c58b':'#bfd0c2'" stroke="#f8e9c5" stroke-width=".8"/>
              <path v-if="tile.kind==='residential'&&tile.level===1" :d="`M${tile.cx-10} ${tile.cy+1-buildingHeight(tile)} L${tile.cx} ${tile.cy-11-buildingHeight(tile)} L${tile.cx+10} ${tile.cy+1-buildingHeight(tile)} Z`" fill="#aa6558"/>
              <g v-for="windowIndex in Math.min(3,Math.max(1,tile.level))" :key="windowIndex"><rect :x="tile.cx-8" :y="tile.cy+2-buildingHeight(tile)+windowIndex*6" width="3" height="3" fill="#f9e2aa"/><rect :x="tile.cx+4" :y="tile.cy+2-buildingHeight(tile)+windowIndex*6" width="3" height="3" fill="#f9e2aa"/></g>
              <text v-if="!['residential','commercial','industrial'].includes(tile.kind)" :x="tile.cx" :y="tile.cy-buildingHeight(tile)-5" class="building-sign">{{iconByKind[tile.kind]}}</text>
            </g>
            <text v-else-if="tile.kind&&mapLayer!=='buildings'&&!['road','rail'].includes(tile.kind)" :x="tile.cx" :y="tile.cy+5" class="tile-icon">{{iconByKind[tile.kind]}}</text>
            <text v-else-if="tile.kind&&tile.level===0&&!['road','rail'].includes(tile.kind)" :x="tile.cx" :y="tile.cy+5" class="tile-icon">{{iconByKind[tile.kind]}}</text>
            <text v-else-if="tile.terrain==='forest'" :x="tile.cx" :y="tile.cy+4" class="tile-scenery">♠</text>
            <text v-else-if="tile.terrain==='water'&&tile.id%3===0" :x="tile.cx" :y="tile.cy+3" class="tile-water">﹏</text>
            <text v-if="tile.level>1" :x="tile.cx+11" :y="tile.cy-5" class="level-tag">{{tile.level}}</text>
          </g>
          <g class="network-overlay" pointer-events="none">
            <g v-for="segment in networkSegments" :key="segment.id">
              <line :x1="segment.x1" :y1="segment.y1" :x2="segment.x2" :y2="segment.y2" :stroke="segment.kind==='road'?'#23384a':'#35414b'" stroke-width="13" stroke-linecap="round"/>
              <line :x1="segment.x1" :y1="segment.y1" :x2="segment.x2" :y2="segment.y2" :stroke="segment.kind==='road'?'#a6afb2':'#d2bd87'" :stroke-width="segment.kind==='road'?8:7" stroke-linecap="round"/>
              <line v-if="segment.kind==='road'" :x1="segment.x1" :y1="segment.y1" :x2="segment.x2" :y2="segment.y2" stroke="#f9e7bd" stroke-width="1.2" stroke-dasharray="4 4"/>
              <line v-else :x1="segment.x1" :y1="segment.y1" :x2="segment.x2" :y2="segment.y2" stroke="#3e4750" stroke-width="2" stroke-dasharray="2 4"/>
            </g>
            <circle v-for="tile in tiles.filter(item=>item.kind==='road'||item.kind==='rail')" :key="`hub-${tile.id}`" :cx="tile.cx" :cy="tile.cy" :r="tile.kind==='road'?5:4" :fill="tile.kind==='road'?'#a6afb2':'#d2bd87'"/>
          </g>
          <text x="280" y="150" class="map-caption">{{lesson.version}} · {{lesson.volume}} · {{lesson.unit}}</text>
          <text x="280" y="720" class="map-tip">拖曳劃分住宅／商業／工業區 · 放大後使用「拖曳移動」查看全城</text>
        </svg></div>
        <div class="city-notice" role="status">{{notice}}</div>
        <div class="city-metrics"><span>💰 預算 <b :class="{negative:city.money<0}">${{city.money}}</b></span><span>👥 人口 <b>{{city.population}}</b></span><span>☺ 滿意度 <b>{{metrics.happiness}}%</b></span><span>📚 單字 <b>{{city.correct.length}} 對／{{city.wrong.length}} 錯</b></span><span>🏆 分數 <b>{{score}}</b></span></div>
      </section>
      <aside class="city-sidebar">
        <div class="side-tabs"><button v-for="tab in [{id:'build',label:'建設'},{id:'report',label:'市政'},{id:'guide',label:'說明'}]" :key="tab.id" :class="{active:screen===tab.id}" @click="screen=tab.id">{{tab.label}}</button></div>
        <div v-if="screen==='build'" class="side-body"><p class="side-intro">地圖已擴大為 28 × 22 格。拖曳可一次劃定住宅／商業／工業區；道路與鐵路沿線鋪設。要移動畫面，先按「拖曳移動」；可放大查看建築。</p><div v-for="group in groupedTools" :key="group.group" class="tool-group"><h2>{{group.group}}</h2><div class="tool-grid"><button v-for="tool in group.tools" :key="tool.id" :class="{active:selectedTool===tool.id}" @click="selectedTool=tool.id"><span>{{tool.icon}}</span><strong>{{tool.name}}</strong><small>${{tool.cost}}</small></button></div></div><div class="selection"><h2>選中地塊</h2><p v-if="selected">{{selected.x+1}} 列 {{selected.y+1}} 行 · {{selected.kind?nameByKind[selected.kind]:selected.terrain==='water'?'水域':selected.terrain==='forest'?'林地':'空地'}} <span v-if="selected.level">· 等級 {{selected.level}}</span></p><p v-else>點選地圖查看位置。</p></div></div>
        <div v-else-if="screen==='report'" class="side-body"><h2>市府財務</h2><div class="report-row"><span>本月預估稅收</span><b>${{metrics.monthlyIncome}}</b></div><div class="report-row"><span>設施維護支出</span><b>${{metrics.monthlyExpense}}</b></div><div class="report-row"><span>上月結餘</span><b>{{city.lastReport?`$${city.lastReport.balance}`:'尚無'}}</b></div><label class="tax">稅率 {{city.taxRate}}%<input type="range" min="0" max="20" :value="city.taxRate" @change="setTax($event.target.value)"></label><button v-if="city.money<200&&!city.reliefUsed" class="relief-button" @click="requestRelief">市政紓困 $700 · 答題申請一次</button><button v-if="!(city.debt>0)" class="relief-button" @click="issueBond">發行市政公債 $1000 · 分期償還 $1100</button><div v-else class="report-row"><span>公債未償餘額</span><b>${{city.debt}}</b></div><h2>市政政策</h2><div class="policy-buttons"><button v-for="policy in [{id:'none',name:'一般'},{id:'green',name:'清潔城市 $22／月'},{id:'transit',name:'大眾運輸 $18／月'}]" :key="policy.id" :class="{active:(city.policy||'none')===policy.id}" @click="changePolicy(policy.id)">{{policy.name}}</button></div><h2>城市供需</h2><div class="report-row"><span>道路可達分區</span><b>{{metrics.activeZones}}／{{metrics.zones}}</b></div><div class="report-row"><span>電力容量／需求</span><b :class="{negative:!metrics.powered}">{{metrics.electricity}}／{{metrics.demand}}</b></div><div class="report-row"><span>供水容量／需求</span><b :class="{negative:!metrics.watered}">{{metrics.water}}／{{metrics.demand}}</b></div><div class="report-row"><span>住宅容量／工作機會</span><b>{{metrics.housing}}／{{metrics.jobs}}</b></div><div class="report-row"><span>污染指數</span><b>{{metrics.pollution}}</b></div><h2>市民消息</h2><ul class="city-news"><li v-for="(event,i) in city.events" :key="i">{{event}}</li></ul></div>
        <div v-else class="side-body"><h2>如何經營城市</h2><p>住宅、商業與工業分區沿道路配置；住宅提供人口，另外兩區提供工作。需要足夠電力與水，分區才會逐月發展。</p><p>每 45 秒有效遊玩時間推進一個月；切換分頁或暫停不計時。每月收稅並支付維護費。提高稅率能增加收入，也可能降低滿意度。</p><p>分區會隨道路、水電、工作機會及滿意度逐月長出建築。可拖曳劃區、鋪設會自動接合的道路與鐵路；放大後可用拖曳移動查看不同街區，按全區返回總覽。交通、污染和分區圖層可協助規劃。公園、學校、醫院、消防局和警察局改善服務；工業會增加污染。每隔數月可能發生火災或暴雨；消防局可降低部分損失。公債可救急，政策有每月成本。答對單字才能完成重要建設。城市與答題自動保存在此裝置，按「儲存成績」將分數送至學生紀錄。</p><p>這是原創的單字建城遊戲，不使用《模擬城市》的地圖、圖像或程式。</p></div>
        <p v-if="saveNotice" class="city-save">{{saveNotice}}</p>
      </aside>
    </div>
    <div v-if="quiz" class="quiz-backdrop"><section class="quiz-card" role="dialog" aria-modal="true" aria-label="單字題"><span class="eyebrow">CITY WORD CHALLENGE</span><h2>{{quiz.word.zh_tw}}</h2><p>選出正確英文 {{pending?'才能完成這次建設':'即可獲得市政獎勵'}}。</p><div class="quiz-choices"><button v-for="(choice,i) in quiz.choices" :key="i" @click="answer(choice.en_us)">{{choice.en_us}}</button></div><button class="quiz-cancel" @click="cancelQuiz">取消</button></section></div>
  </main>
</template>

<style scoped>
.city-page{min-height:100vh;background:radial-gradient(circle at 50% -20%,#304f63,#101f33 60%,#0d1929);color:#edf3ee;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;padding:16px clamp(12px,2.5vw,40px);box-sizing:border-box}.city-header{max-width:1650px;margin:auto auto 14px;display:flex;align-items:end;justify-content:space-between;gap:20px}.eyebrow{font-size:11px;letter-spacing:.23em;color:#e9c88e;font-weight:800}.city-header h1{font:700 clamp(30px,3vw,46px) Georgia,'Noto Serif TC',serif;margin:3px 0}.city-header p{color:#c8d7d8;margin:0}.city-header nav{display:flex;gap:8px;flex-wrap:wrap}.city-header a,.city-bar button{border:1px solid #739497;background:#ffffff12;color:#f6eedc;text-decoration:none;border-radius:10px;padding:9px 12px;cursor:pointer;font:inherit}.city-shell{max-width:1650px;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,350px);gap:14px;height:calc(100vh - 125px);min-height:600px}.city-main,.city-sidebar{background:#20384bdf;border:1px solid #84a39a66;border-radius:18px;box-shadow:0 20px 45px #0005;min-height:0}.city-main{display:flex;flex-direction:column;padding:12px}.city-bar{display:flex;align-items:center;justify-content:space-between;gap:10px}.city-bar>div:first-child{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}.city-seal{color:#f4d08b}.city-bar strong{font-size:22px}.city-bar small{color:#b9d0d5}.city-bar-actions{display:flex;gap:5px;flex-wrap:wrap}.city-bar button{padding:7px 10px;font-size:13px}.city-bar button:disabled{opacity:.5}.city-map-wrap{flex:1;min-height:0;margin:10px 0;border:1px solid #5b8791;border-radius:14px;overflow:hidden;background:#183345}.city-map{width:100%;height:100%;min-height:400px;display:block}.map-tile{cursor:pointer}.map-tile:hover path{stroke:#f9e5b0;stroke-width:2.7}.tile-icon,.tile-scenery,.tile-water,.level-tag{text-anchor:middle;pointer-events:none;font-weight:900}.tile-icon{font-size:19px;fill:#fcf6da;paint-order:stroke;stroke:#254251;stroke-width:2px}.tile-icon.high{font-size:22px}.tile-scenery{font-size:15px;fill:#245d48}.tile-water{font-size:18px;fill:#b9e3ee}.level-tag{font-size:10px;fill:#fff}.map-caption,.map-tip{font-size:18px;fill:#f6e6bd;font-weight:700}.map-tip{font-size:14px;fill:#d1e5e2}.city-notice{background:#31566a;border-left:4px solid #e8c785;padding:9px 12px;border-radius:5px;min-height:24px}.city-metrics{display:flex;gap:7px;flex-wrap:wrap;padding-top:10px}.city-metrics span{background:#ffffff10;border:1px solid #ffffff12;border-radius:8px;padding:7px 10px;font-size:13px}.city-metrics b{color:#ffe1a0}.negative{color:#ff9b96!important}.city-sidebar{display:flex;flex-direction:column;overflow:hidden}.side-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:10px 10px 0}.side-tabs button{background:transparent;color:#c4d6d8;border:0;border-bottom:2px solid #718f96;padding:9px;cursor:pointer;font-size:15px}.side-tabs button.active{color:#ffdc9a;border-color:#e7b96e;font-weight:800}.side-body{overflow:auto;padding:10px 16px;flex:1}.side-body h2{font-size:15px;color:#f5d593;letter-spacing:.04em;margin:15px 0 8px}.side-body p{line-height:1.55;color:#d5e1df;margin:8px 0;font-size:14px}.side-intro{font-size:13px!important}.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.tool-grid button{min-height:67px;border:1px solid #789ba3;background:#284b5a;color:#f5efe1;border-radius:9px;cursor:pointer;display:grid;grid-template-columns:24px 1fr;grid-template-rows:1fr 1fr;align-items:center;text-align:left;padding:6px;gap:1px 3px}.tool-grid button.active{background:#d7aa67;color:#162e3c;border-color:#ffe1a1}.tool-grid span{grid-row:span 2;font-size:21px;text-align:center}.tool-grid strong{font-size:12px}.tool-grid small{font-size:11px}.selection{border-top:1px solid #ffffff26;margin-top:12px}.report-row{display:flex;justify-content:space-between;border-bottom:1px solid #ffffff1a;padding:7px 0;font-size:14px}.report-row b{color:#f6dfa9}.tax{display:block;margin-top:12px;font-weight:700}.tax input{width:100%;accent-color:#e6bd79}.city-news{padding-left:20px;line-height:1.5;font-size:13px;color:#d8e3df}.city-news li{margin:5px 0}.city-save{margin:0;padding:9px 15px;background:#345766;font-size:12px}.quiz-backdrop{position:fixed;inset:0;background:#091724d9;display:grid;place-items:center;padding:15px;z-index:10}.quiz-card{background:#f5ecda;color:#223844;border:5px solid #d3a96d;border-radius:22px;padding:27px;width:min(95vw,490px);box-shadow:0 25px 80px #0009}.quiz-card h2{font-size:36px;margin:10px 0}.quiz-card p{line-height:1.5}.quiz-choices{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.quiz-choices button{border:1px solid #b8aa91;background:#fffaf0;color:#223844;border-radius:9px;padding:14px;font-size:16px;font-weight:750;cursor:pointer}.quiz-choices button:hover{background:#e7cd94}.quiz-cancel{background:transparent;border:0;color:#607075;margin-top:12px;cursor:pointer}@media(max-width:950px){.city-shell{height:auto;grid-template-columns:1fr}.city-main{min-height:630px}.city-sidebar{max-height:520px}.city-header{align-items:start;flex-direction:column}}@media(max-width:600px){.city-page{padding:10px 6px}.city-header{gap:8px}.city-header p{font-size:13px}.city-shell{gap:8px}.city-main{min-height:480px;padding:7px}.city-map{min-height:320px}.city-bar{align-items:start;flex-direction:column}.city-map-wrap{margin:6px 0}.city-sidebar{max-height:530px}.tool-grid{grid-template-columns:repeat(3,1fr)}.city-metrics span{font-size:12px;padding:5px}.quiz-card{padding:17px}}
.relief-button{width:100%;margin:12px 0 2px;padding:10px;border:1px solid #ebc788;border-radius:9px;background:#c29a60;color:#172c3c;font-weight:800;cursor:pointer}
.city-map{touch-action:none;user-select:none}.building-model{pointer-events:none;filter:drop-shadow(1px 3px 2px #12273599)}.building-sign{font-size:13px;fill:#ffecb5;text-anchor:middle;paint-order:stroke;stroke:#314b59;stroke-width:2px;pointer-events:none}.map-layer-bar{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:#d2e4e0}.map-layer-bar button,.policy-buttons button{background:#2b4c5e;color:#e9f0e7;border:1px solid #78969b;border-radius:7px;padding:5px 8px;cursor:pointer}.map-layer-bar button.active,.policy-buttons button.active{background:#e1ba78;color:#162b38;font-weight:800;border-color:#ffe8ad}.policy-buttons{display:flex;flex-wrap:wrap;gap:6px}
.map-zoom-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:6px 0 0;color:#d2e4e0;font-size:12px}.map-zoom-bar span{margin-right:auto;font-weight:700}.map-zoom-bar button{border:1px solid #819fa0;border-radius:7px;background:#2b4c5e;color:#f5efdf;padding:5px 9px;cursor:pointer;font-size:12px}.map-zoom-bar button.active{background:#e1ba78;color:#172b37;font-weight:800}.map-zoom-bar button:disabled{opacity:.45;cursor:not-allowed}.network-overlay{filter:drop-shadow(0 1px 1px #17273599)}
.preview-bill{flex-basis:100%;color:#ffe0a0;font-weight:800;font-size:12px}
</style>
