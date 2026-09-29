<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import countryMaps from '~/data/monopoly-maps.json';
import taiwanRail from '~/data/railway-taiwan.json';

const GAME_TYPE = '單字鐵路旅遊高手';
const railwayMaps = [taiwanRail];
const ATLAS_STAMPS = 3;
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const lessonLabel = [lesson.version, lesson.volume, lesson.unit].filter(Boolean).join(' · ');
const selectedMapId = ref('taiwan');
const activeMap = computed(() => railwayMaps.find(map => map.id === selectedMapId.value) || railwayMaps[0]);
const islandOutline = computed(() => countryMaps.find(map => map.id === activeMap.value.id)?.shapes?.[0] || '');
const stationById = computed(() => Object.fromEntries(activeMap.value.stations.map(station => [station.id, station])));
const selectedRegionId = ref('north');
const progress = ref({ visitedIds: [], lastStations: {} });
const regionById = computed(() => Object.fromEntries(activeMap.value.regions.map(region => [region.id, region])));
const activeRegion = computed(() => regionById.value[selectedRegionId.value] || activeMap.value.regions[0]);
const regionStations = computed(() => activeRegion.value.stationIds.map(id => stationById.value[id]).filter(Boolean));
const regionStationIds = computed(() => new Set(activeRegion.value.stationIds));
const links = computed(() => activeMap.value.links.filter(([a, b]) => regionStationIds.value.has(a) && regionStationIds.value.has(b))
  .map(([a, b, line]) => ({ a: stationById.value[a], b: stationById.value[b], line })));
const regionCounts = computed(() => Object.fromEntries(activeMap.value.regions.map(region =>
  [region.id, region.stationIds.filter(id => progress.value.visitedIds.includes(id)).length])));
const committedRegionId = computed(() => regionById.value[progress.value.lastStations._activeRegion]
  ? progress.value.lastStations._activeRegion : '');
const committedRegionCompleted = computed(() => !committedRegionId.value ||
  regionCounts.value[committedRegionId.value] === regionById.value[committedRegionId.value].stationIds.length);
const canChooseRegion = region => !committedRegionId.value || committedRegionCompleted.value || region.id === committedRegionId.value;
const regionStampCount = computed(() => regionCounts.value[activeRegion.value.id] || 0);
const atlasUnlocked = computed(() => regionStampCount.value >= ATLAS_STAMPS);
const currentId = ref(taiwanRail.regions[0].startId);
const viewedId = ref(taiwanRail.regions[0].startId);
const visited = ref([]);
const invested = ref([]);
const coins = ref(100);
const completedTrips = ref(0);
const contractId = ref('');
const maxTurns = ref(18);
const turn = ref(1);
const turnOptions = [12, 18, 24];
const started = ref(false);
const finished = ref(false);
const loading = ref(true);
const message = ref('正在載入單字…');
const words = ref([]);
const question = ref(null);
const pendingAction = ref(null);
const answer = ref('');
const resolving = ref(false);
const correctWords = ref([]);
const wrongWords = ref([]);
const saveStatus = ref('');
const saving = ref(false);
const saved = ref(false);
const imageFailures = ref([]);
const progressStatus = ref('');
const mapMode = ref('nearby');
let deck = [];
let startedAt = 0;
let pendingRecord = null;
let gameStudentId = null;
let regionCompleteAtStart = false;

const currentStation = computed(() => stationById.value[currentId.value]);
const viewedStation = computed(() => stationById.value[viewedId.value] || currentStation.value);
const viewedInAtlas = computed(() => atlasUnlocked.value && progress.value.visitedIds.includes(viewedStation.value.id));
const viewedWiki = computed(() => viewedStation.value);
const regionBounds = computed(() => {
  const points = regionStations.value;
  const minX = Math.min(...points.map(station => station.x));
  const maxX = Math.max(...points.map(station => station.x));
  const minY = Math.min(...points.map(station => station.y));
  const maxY = Math.max(...points.map(station => station.y));
  const padX = Math.max(25, (maxX - minX) * .13);
  const padY = Math.max(25, (maxY - minY) * .13);
  return { x: minX - padX, y: minY - padY, width: maxX - minX + padX * 2, height: maxY - minY + padY * 2 };
});
const adjacent = computed(() => links.value.filter(link => link.a.id === currentId.value || link.b.id === currentId.value)
  .map(link => ({ station: link.a.id === currentId.value ? link.b : link.a, line: link.line })));
const adjacentIds = computed(() => adjacent.value.map(item => item.station.id));
const nearbyIds = computed(() => {
  const distance = { [currentId.value]: 0 };
  const queue = [currentId.value];
  for (const id of queue) {
    if (distance[id] >= 2) continue;
    for (const link of links.value) {
      const neighbor = link.a.id === id ? link.b.id : link.b.id === id ? link.a.id : null;
      if (neighbor && distance[neighbor] === undefined) {
        distance[neighbor] = distance[id] + 1;
        queue.push(neighbor);
      }
    }
  }
  return new Set(queue);
});
const mapBounds = computed(() => {
  if (mapMode.value === 'overview') return regionBounds.value;
  const near = regionStations.value.filter(station => nearbyIds.value.has(station.id));
  const minX = Math.min(...near.map(station => station.x));
  const maxX = Math.max(...near.map(station => station.x));
  const minY = Math.min(...near.map(station => station.y));
  const maxY = Math.max(...near.map(station => station.y));
  const width = Math.max(38, maxX - minX + 24);
  const height = Math.max(52, maxY - minY + 24);
  return { x: (minX + maxX - width) / 2, y: (minY + maxY - height) / 2, width, height };
});
const mapViewBox = computed(() => {
  const { x, y, width, height } = mapBounds.value;
  return `${x} ${y} ${width} ${height}`;
});
const visibleStations = computed(() => regionStations.value.filter(station => {
  const { x, y, width, height } = mapBounds.value;
  return (mapMode.value === 'overview' || nearbyIds.value.has(station.id)) &&
    station.x >= x && station.x <= x + width && station.y >= y && station.y <= y + height;
}));
const visibleLinks = computed(() => {
  const shown = new Set(visibleStations.value.map(station => station.id));
  return links.value.filter(link => shown.has(link.a.id) && shown.has(link.b.id));
});
const mapUnit = computed(() => Math.max(mapBounds.value.width / 650, mapBounds.value.height / 450));
const markerRadius = computed(() => Math.max(.55, mapUnit.value * 5));
const markerHitRadius = computed(() => Math.max(1.2, mapUnit.value * 12));
const contractStation = computed(() => stationById.value[contractId.value]);
const income = computed(() => invested.value.length * 12);
const score = computed(() => Math.max(0, Math.round((coins.value + visited.value.length * 25
  + correctWords.value.length * 10 + invested.value.length * 40 + completedTrips.value * 70) * 18 / maxTurns.value)));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME_TYPE, ...lesson } }));
const historyLink = { path: '/history', query: { game: GAME_TYPE } };
const shuffle = source => {
  const array = [...source];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
const wikiUrl = station => 'https://zh.wikipedia.org/wiki/' + encodeURIComponent(station.wiki.replaceAll(' ', '_'));
const progressKey = () => `railway-tour-v2:${String(student.value?.id || 'guest')}`;

function saveProgressLocally() {
  if (!import.meta.client) return;
  try { localStorage.setItem(progressKey(), JSON.stringify(progress.value)); }
  catch { progressStatus.value = '瀏覽器無法儲存本機進度，請檢查瀏覽器儲存設定。'; }
}

async function saveProgress() {
  saveProgressLocally();
  if (!student.value?.id) return;
  const { data, error } = await db.rpc('railway_stamp_station', {
    p_student_id: String(student.value.id), p_station_ids: progress.value.visitedIds,
    p_station_id: currentId.value,
    p_region_id: activeRegion.value.id
  });
  if (!error && data?.[0]) {
    progress.value.visitedIds = [...new Set([...progress.value.visitedIds, ...(data[0].visited_stations || [])])];
    progress.value.lastStations = { ...progress.value.lastStations, ...(data[0].last_stations || {}) };
    saveProgressLocally();
  }
  progressStatus.value = error ? '雲端進度未儲存；本瀏覽器仍保留車站章。請執行鐵路進度 SQL。' : '車站章已同步至雲端。';
}

async function saveRegionChoice() {
  progress.value.lastStations = { ...progress.value.lastStations, _activeRegion: selectedRegionId.value };
  saveProgressLocally();
  if (!student.value?.id) return;
  const { data, error } = await db.rpc('railway_stamp_station', {
    p_student_id: String(student.value.id), p_station_ids: progress.value.visitedIds,
    p_station_id: selectedRegionId.value, p_region_id: '_activeRegion'
  });
  if (error) {
    progressStatus.value = '區域選擇暫存於本瀏覽器；雲端進度同步失敗。';
    return;
  }
  if (data?.[0]) {
    progress.value.visitedIds = [...new Set([...progress.value.visitedIds, ...(data[0].visited_stations || [])])];
    progress.value.lastStations = { ...progress.value.lastStations, ...(data[0].last_stations || {}) };
    saveProgressLocally();
  }
}

async function loadProgress() {
  let local = { visitedIds: [], lastStations: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(progressKey()) || '{}');
    if (Array.isArray(parsed.visitedIds)) local.visitedIds = parsed.visitedIds;
    if (parsed.lastStations && typeof parsed.lastStations === 'object') local.lastStations = parsed.lastStations;
  } catch {}
  if (student.value?.id) {
    const { data, error } = await db.from('railway_tour_progress')
      .select('visited_stations,last_stations').eq('student_id', String(student.value.id)).maybeSingle();
    if (!error && data) {
      local.visitedIds = [...new Set([...local.visitedIds, ...(data.visited_stations || [])])];
      local.lastStations = { ...(data.last_stations || {}), ...local.lastStations };
    } else if (error) progressStatus.value = '雲端進度尚未啟用；目前使用本瀏覽器保存車站章。';
  }
  const known = new Set(activeMap.value.stations.map(station => station.id));
  progress.value = {
    visitedIds: local.visitedIds.filter(id => known.has(id)),
    lastStations: Object.fromEntries(Object.entries(local.lastStations).filter(([regionId, stationId]) =>
      regionId === '_activeRegion' ? !!regionById.value[stationId] : regionById.value[regionId]?.stationIds.includes(stationId)))
  };
  if (!committedRegionId.value) {
    const unfinished = activeMap.value.regions.find(region =>
      regionCounts.value[region.id] > 0 && regionCounts.value[region.id] < region.stationIds.length);
    if (unfinished) progress.value.lastStations = { ...progress.value.lastStations, _activeRegion: unfinished.id };
  }
  if (committedRegionId.value) selectedRegionId.value = committedRegionId.value;
  saveProgressLocally();
  resetRegionPosition();
}

function resetRegionPosition() {
  const lastId = progress.value.lastStations[activeRegion.value.id];
  currentId.value = activeRegion.value.stationIds.includes(lastId) ? lastId : activeRegion.value.startId;
  viewedId.value = currentId.value;
}


function chooseContract() {
  const remaining = activeRegion.value.stationIds.filter(id =>
    id !== currentId.value && !progress.value.visitedIds.includes(id) && id !== contractId.value);
  if (!remaining.length) { contractId.value = ''; return; }
  const distance = { [currentId.value]: 0 };
  const queue = [currentId.value];
  for (const id of queue) {
    for (const link of links.value) {
      const neighbor = link.a.id === id ? link.b.id : link.b.id === id ? link.a.id : null;
      if (neighbor && distance[neighbor] === undefined) {
        distance[neighbor] = distance[id] + 1;
        queue.push(neighbor);
      }
    }
  }
  const nearby = remaining.filter(id => distance[id] >= 2 && distance[id] <= 6);
  contractId.value = shuffle(nearby.length ? nearby : remaining.sort((a, b) => distance[a] - distance[b]).slice(0, 6))[0];
}

function nextWord() {
  if (!deck.length) deck = shuffle(words.value);
  return deck.pop();
}

async function startGame() {
  if (loading.value || words.value.length < 2 || started.value || !canChooseRegion(activeRegion.value)) return;
  started.value = true;
  finished.value = false;
  startedAt = Date.now();
  gameStudentId = student.value?.id ? String(student.value.id) : null;
  regionCompleteAtStart = regionStampCount.value === activeRegion.value.stationIds.length;
  maxTurns.value = turnOptions.includes(Number(maxTurns.value)) ? Number(maxTurns.value) : 18;
  chooseContract();
  message.value = `從${currentStation.value.name}探索${activeRegion.value.name}！答對英文單字即可搭車集章。`;
  await saveRegionChoice();
}

function beginAction(type, targetId = '') {
  if (!started.value || finished.value || resolving.value || question.value) return;
  if (type === 'travel' && !adjacentIds.value.includes(targetId)) return;
  if (type === 'invest' && (invested.value.includes(currentId.value) || coins.value < 80)) return;
  const word = nextWord();
  if (!word) return;
  const letters = [...word.en_us].map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter(index => index >= 0);
  const options = shuffle([word, ...shuffle(words.value.filter(item => item.en_us.trim().toLowerCase() !== word.en_us.trim().toLowerCase()))
    .filter((item, index, array) => array.findIndex(other => other.en_us.trim().toLowerCase() === item.en_us.trim().toLowerCase()) === index).slice(0, 3)]);
  const kind = letters.length >= 2 && Math.random() < .5 ? 'letters' : 'choice';
  const masked = [...word.en_us];
  const missing = [];
  if (kind === 'letters') {
    for (const index of shuffle(letters).slice(0, 2).sort((a, b) => a - b)) {
      missing.push(masked[index].toLowerCase());
      masked[index] = '＿';
    }
  }
  pendingAction.value = { type, targetId };
  question.value = { word, kind, options, masked: masked.join(''), missing };
  answer.value = '';
}

function cancelQuestion() {
  if (!question.value || resolving.value) return;
  deck.push(question.value.word);
  question.value = null;
  pendingAction.value = null;
  answer.value = '';
}

async function saveRecord() {
  if (!pendingRecord || saved.value || saving.value) return;
  saving.value = true;
  saveStatus.value = '正在儲存成績與對錯單字…';
  try {
    if (!pendingRecord.attempt_number) {
      let query = db.from('game_records').select('id', { count: 'exact', head: true })
        .eq('student_id', pendingRecord.student_id).eq('game_type', GAME_TYPE);
      for (const key of ['version', 'volume', 'unit_played']) {
        query = pendingRecord[key] === null ? query.is(key, null) : query.eq(key, pendingRecord[key]);
      }
      const { count, error } = await query;
      if (error) throw error;
      pendingRecord.attempt_number = (count || 0) + 1;
    }
    const { error } = await db.from('game_records').insert([pendingRecord]);
    if (error) {
      if (error.code !== '23505') throw error;
      const { data, error: lookupError } = await db.from('game_records').select('id').eq('id', pendingRecord.id)
        .eq('student_id', pendingRecord.student_id).eq('game_type', GAME_TYPE).maybeSingle();
      if (lookupError || !data) throw lookupError || error;
    }
    saved.value = true;
    saveStatus.value = '已儲存到學習紀錄、英雄榜及後台對錯分析。';
  } catch (error) {
    saveStatus.value = '儲存失敗：' + (error?.message || '請稍後重試。');
  } finally {
    saving.value = false;
  }
}

async function finishGame() {
  if (!started.value || finished.value || question.value || resolving.value) return;
  finished.value = true;
  message.value = (regionStampCount.value === activeRegion.value.stationIds.length
    ? `🎉 ${activeRegion.value.name}全站踏破！可在下一局選擇其他區域。` : '旅程結束！')
    + ' 本局到站 ' + visited.value.length + ' 座、完成 ' + completedTrips.value + ' 項目的地任務。';
  if (!gameStudentId) {
    saveStatus.value = '未登入學生帳號，本局不儲存成績。';
    return;
  }
  pendingRecord = {
    id: crypto.randomUUID(), student_id: gameStudentId, game_type: GAME_TYPE,
    version: lesson.version || null, volume: lesson.volume || null, unit_played: lesson.unit || null,
    score: score.value, played_at: new Date().toISOString(),
    time_taken_seconds: Math.floor((Date.now() - startedAt) / 1000),
    mistakes: wrongWords.value.length, correct_words: correctWords.value.join(', '),
    wrong_words: wrongWords.value.join(', '), device_info: navigator.userAgent
  };
  await saveRecord();
}

async function submitAnswer() {
  if (!question.value || !pendingAction.value || resolving.value) return;
  resolving.value = true;
  const q = question.value;
  const action = pendingAction.value;
  let completedNow = false;
  const correct = q.kind === 'choice'
    ? answer.value === String(q.word.id)
    : answer.value.trim().replace(/\s/g, '').toLowerCase() === q.missing.join('');
  if (correct) {
    correctWords.value.push(q.word.en_us);
    if (action.type === 'travel') {
      const destination = stationById.value[action.targetId];
      const firstVisit = !progress.value.visitedIds.includes(destination.id);
      currentId.value = destination.id;
      viewedId.value = destination.id;
      if (!visited.value.includes(destination.id)) visited.value.push(destination.id);
      if (firstVisit) progress.value.visitedIds.push(destination.id);
      progress.value.lastStations = { ...progress.value.lastStations, [activeRegion.value.id]: destination.id };
      coins.value += 25 + (firstVisit ? 20 : 0) + income.value;
      message.value = '答對！搭車抵達 ' + destination.name + '，' + (firstVisit ? '集章並獲得首次到站獎勵。' : '再次造訪。');
      if (contractId.value === destination.id) {
        completedTrips.value++;
        coins.value += 100;
        message.value += ' 🎯 完成目的地任務，獎勵 100 旅費！';
        chooseContract();
      }
      if (firstVisit && regionStampCount.value === activeRegion.value.stationIds.length) {
        completedNow = true;
        message.value += ` 🎉 ${activeRegion.value.name}全站踏破！下一局可選擇其他區域。`;
      }
      await saveProgress();
    } else {
      coins.value -= 80;
      invested.value.push(currentId.value);
      message.value = '答對！升級 ' + currentStation.value.name + ' 車站；往後每次成功搭車增加 12 旅費。';
    }
  } else {
    wrongWords.value.push(q.word.en_us);
    coins.value = Math.max(0, coins.value - 10);
    message.value = '答錯：' + q.word.en_us + '＝' + q.word.zh_tw + '。列車延誤，留在原站，旅費 −10。';
  }
  question.value = null;
  pendingAction.value = null;
  resolving.value = false;
  if (turn.value >= maxTurns.value || (completedNow && !regionCompleteAtStart)) await finishGame();
  else turn.value++;
}

function newGame() {
  if (!finished.value || saving.value) return;
  if (pendingRecord && !saved.value && !window.confirm('本局成績尚未儲存。確定放棄這筆紀錄並開始新旅程？')) return;
  resetRegionPosition();
  visited.value = [];
  invested.value = [];
  coins.value = 100;
  completedTrips.value = 0;
  contractId.value = '';
  turn.value = 1;
  correctWords.value = [];
  wrongWords.value = [];
  deck = [];
  pendingRecord = null;
  saved.value = false;
  saveStatus.value = '';
  finished.value = false;
  started.value = false;
  message.value = '新旅程已準備好，選擇回合數後開始。';
}

watch([selectedMapId, selectedRegionId], () => {
  if (started.value && !finished.value) return;
  resetRegionPosition();
  visited.value = [];
});

onMounted(async () => {
  await loadProgress();
  if (!lesson.version || !lesson.volume || !lesson.unit) {
    message.value = '請從首頁選擇版本、冊數與單元後進入鐵路旅遊遊戲。';
    loading.value = false;
    return;
  }
  try {
    const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(500);
    if (error) throw error;
    words.value = (data || []).filter(word => word.en_us?.trim() && word.zh_tw?.trim());
    message.value = words.value.length >= 2
      ? '第一次可自由選擇探索區域；選定後踏破該區，再選下一區。每區累積 3 站章後開啟已到訪車站圖鑑。'
      : '本單元至少需要兩筆有效單字，請返回首頁改選單元。';
  } catch (error) {
    message.value = '載入單字失敗：' + (error?.message || '請稍後重試。');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="rail-page">
    <header class="rail-header">
      <div><NuxtLink to="/" class="back-link">← 遊戲選單</NuxtLink><h1>🚂 單字鐵路旅遊高手</h1><p>{{ lessonLabel || '臺灣鐵道之旅' }} · 答單字搭車、集章、升級車站</p></div>
      <div class="setup">
        <label>鐵路地圖 <select v-model="selectedMapId" :disabled="started && !finished"><option v-for="map in railwayMaps" :key="map.id" :value="map.id">{{ map.name }}</option></select></label>
        <label>旅程回合 <select v-model.number="maxTurns" :disabled="started"><option v-for="count in turnOptions" :key="count" :value="count">{{ count }} 回合</option></select></label>
        <button v-if="!started" type="button" :disabled="loading || words.length < 2 || !canChooseRegion(activeRegion)" @click="startGame">開始旅程</button>
        <button v-else-if="!finished" type="button" :disabled="!!question" @click="finishGame">提前結算</button>
        <button v-else type="button" :disabled="saving" @click="newGame">再玩一次</button>
      </div>
    </header>

    <nav class="region-picker" aria-label="臺灣鐵路探索區域">
      <button v-for="region in activeMap.regions" :key="region.id" type="button"
        :class="{ chosen: selectedRegionId === region.id, complete: regionCounts[region.id] === region.stationIds.length }"
        :disabled="!canChooseRegion(region) || (started && !finished)"
        @click="selectedRegionId = region.id">
        <strong>{{ canChooseRegion(region) ? '🚉' : '🔒' }} {{ region.name }}</strong>
        <small>{{ regionCounts[region.id] }} / {{ region.stationIds.length }} 站{{ regionCounts[region.id] === region.stationIds.length ? ' · 踏破' : '' }}</small>
      </button>
    </nav>

    <section class="rail-status" aria-label="旅程狀態">
      <div><span>🚉 {{ activeRegion.name }}</span><strong>{{ currentStation.name }}</strong></div>
      <div><span>🎫 旅費</span><strong>{{ coins }}</strong></div>
      <div><span>📍 區域車站章</span><strong>{{ regionStampCount }} / {{ activeRegion.stationIds.length }}</strong></div>
      <div><span>🏗️ 升級車站</span><strong>{{ invested.length }} · 每趟 +{{ income }}</strong></div>
      <div><span>📖 單字</span><strong>{{ correctWords.length }} 對 / {{ wrongWords.length }} 錯</strong></div>
      <div><span>🏆 經營分</span><strong>{{ score }}</strong></div>
      <NuxtLink :to="leaderboardLink">英雄榜</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink>
    </section>

    <p class="notice" role="status" aria-live="polite">{{ message }} <small v-if="progressStatus">{{ progressStatus }}</small></p>
    <div class="rail-layout">
      <section class="map-card" aria-label="臺灣鐵路旅遊地圖">
        <div class="map-title"><strong>{{ activeMap.flag }} {{ activeRegion.name }} · {{ regionStations.length }} 站</strong><div class="map-controls"><button type="button" :class="{ active: mapMode === 'nearby' }" :aria-pressed="mapMode === 'nearby'" @click="mapMode = 'nearby'">🔍 附近放大</button><button type="button" :class="{ active: mapMode === 'overview' }" :aria-pressed="mapMode === 'overview'" @click="mapMode = 'overview'">🗺️ 全區總覽</button></div></div>
        <svg :viewBox="mapViewBox" class="rail-map" role="group" :aria-label="activeRegion.name + (mapMode === 'nearby' ? '目前車站附近路線' : '全區路線')">
          <path :d="islandOutline" class="island"/>
          <line v-for="link in visibleLinks" :key="link.a.id + link.b.id" :x1="link.a.x" :y1="link.a.y" :x2="link.b.x" :y2="link.b.y" class="rail-line" :class="{ reachable: adjacentIds.includes(link.a.id) && link.b.id === currentId || adjacentIds.includes(link.b.id) && link.a.id === currentId }"/>
          <g v-for="station in visibleStations" :key="station.id" class="station-marker" :class="{ current: currentId === station.id, reachable: adjacentIds.includes(station.id) && started && !finished, stamped: progress.visitedIds.includes(station.id), viewed: viewedId === station.id }" role="button" tabindex="0" :aria-label="station.name + '車站，' + (progress.visitedIds.includes(station.id) ? '已集章' : '未集章') + '，查看收集狀態'" @click="viewedId = station.id" @keydown.enter.prevent="viewedId = station.id" @keydown.space.prevent="viewedId = station.id">
            <title>{{ station.name }}車站 · {{ station.line }}</title>
            <circle class="hit-area" :cx="station.x" :cy="station.y" :r="markerHitRadius"/>
            <circle :cx="station.x" :cy="station.y" :r="markerRadius"/>
            <text v-if="currentId === station.id || viewedId === station.id" :x="station.x + markerRadius + mapUnit * 3" :y="station.y - markerRadius" :style="{ fontSize: mapUnit * 12 + 'px' }">{{ station.name }}</text>
          </g>
          <g class="train-token" :style="{ transform: 'translate(' + currentStation.x + 'px,' + currentStation.y + 'px)' }"><text :x="-mapUnit * 5" :y="-mapUnit * 8" :style="{ fontSize: mapUnit * 16 + 'px' }">🚂</text></g>
        </svg>
        <p class="map-caption">附近放大會跟隨目前車站，只顯示兩站距離內的路線；全區總覽可查看本站區全部車站。搭車請使用右側「可搭往」按鈕。資料：<a href="https://data.gov.tw/dataset/33425" target="_blank" rel="noopener noreferrer">臺鐵車站 ↗</a>、<a href="https://www.railway.gov.tw/tra-tip-web/tip/tip001/tip111/view?code=E040" target="_blank" rel="noopener noreferrer">路線順序 ↗</a>；輪廓沿用<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">原有臺灣地圖 ↗</a>。</p>
      </section>

      <section class="station-card" aria-label="車站小百科">
        <div class="station-photo">
          <img v-if="viewedInAtlas && viewedWiki.image && !imageFailures.includes(viewedStation.id)" :key="viewedStation.id" :src="viewedWiki.image" :alt="viewedStation.name + '車站照片'" referrerpolicy="no-referrer" @error="imageFailures.push(viewedStation.id)">
          <div v-else class="photo-fallback">{{ viewedInAtlas ? '🚉' : '🔒' }}<span>{{ viewedInAtlas ? '照片暫時無法載入，可開啟維基百科查看' : '到站集章且本區累積 3 站後解鎖圖鑑' }}</span></div>
        </div>
        <div class="station-info">
          <p class="eyebrow">{{ viewedStation.line }} · {{ viewedStation.en }}</p>
          <h2>{{ viewedStation.name }}車站 <span v-if="progress.visitedIds.includes(viewedStation.id)">📍 已集章</span></h2>
          <p>{{ viewedInAtlas ? (viewedWiki.summary || '正在載入維基百科簡介…') : `圖鑑尚未解鎖：先到達這座車站，並在${activeRegion.name}累積 ${ATLAS_STAMPS} 座不同車站章。` }}</p>
          <div v-if="viewedInAtlas" class="source-links"><a :href="wikiUrl(viewedStation)" target="_blank" rel="noopener noreferrer">維基百科簡介 ↗</a><a v-if="viewedWiki.imagePage" :href="viewedWiki.imagePage" target="_blank" rel="noopener noreferrer" :title="(viewedWiki.imageAuthor || 'Wikimedia Commons') + ' · ' + (viewedWiki.imageLicense || '請於圖片頁查看授權')">圖片：{{ viewedWiki.imageAuthor || 'Wikimedia Commons' }} · {{ viewedWiki.imageLicense || '授權資訊見圖片頁' }} ↗</a></div>
        </div>
      </section>

      <aside class="trip-card">
        <h2>🧭 旅程控制</h2>
        <p class="turn-indicator">{{ finished ? '旅程結束' : started ? '第 ' + turn + ' / ' + maxTurns + ' 回合' : '尚未出發' }}</p>
        <div class="mission"><strong>🎯 目的地任務</strong><span>{{ contractStation ? '首次抵達 ' + contractStation.name + '：+100 旅費' : '所有目的地已完成' }}</span><small>已完成 {{ completedTrips }} 次</small></div>
        <h3>從 {{ currentStation.name }} 可搭往</h3>
        <div class="destinations">
          <button v-for="item in adjacent" :key="item.station.id" type="button" :disabled="!started || finished || !!question || resolving" @click="beginAction('travel', item.station.id)">
            <strong>🚆 {{ item.station.name }}</strong><small>{{ item.line }} · {{ progress.visitedIds.includes(item.station.id) ? '已集章' : '新車站章' }}</small>
          </button>
        </div>
        <details class="station-atlas"><summary>📚 {{ activeRegion.name }}車站圖鑑 · {{ regionStampCount }} / {{ activeRegion.stationIds.length }}</summary>
          <p v-if="!atlasUnlocked">再到 {{ ATLAS_STAMPS - regionStampCount }} 座不同車站，解鎖已收集的車站圖鑑。</p>
          <div v-else><button v-for="station in regionStations.filter(item => progress.visitedIds.includes(item.id))" :key="station.id" type="button" :class="{ viewed: viewedId === station.id }" @click="viewedId = station.id">📍 {{ station.name }}</button></div>
          <p v-if="atlasUnlocked">其餘 {{ activeRegion.stationIds.length - regionStampCount }} 座車站到站後才加入圖鑑。</p>
        </details>
        <button class="invest-button" type="button" :disabled="!started || finished || !!question || resolving || invested.includes(currentId) || coins < 80" @click="beginAction('invest')">🏗️ 升級 {{ currentStation.name }}車站 · 80 旅費</button>
        <p class="rules">每次操作先答一題。答對搭車得 25 旅費，首次到站再得 20；升級後每趟加收 12。答錯留站並扣 10。每題都佔一回合。</p>
        <p class="score-rules">經營分＝（旅費＋集章×25＋答對×10＋升級×40＋任務×70）換算為 18 回合，方便不同長度旅程排名。</p>
        <div v-if="finished" class="finished-box"><strong>🏁 本局 {{ score }} 分</strong><p>{{ saveStatus }}</p><button v-if="!saved && gameStudentId" type="button" :disabled="saving" @click="saveRecord">{{ saving ? '儲存中…' : '重試儲存' }}</button></div>
      </aside>
    </div>

    <div v-if="question" class="question-shade">
      <section class="question-card" role="dialog" aria-modal="true" aria-label="單字鐵路問答">
        <p class="eyebrow">{{ pendingAction?.type === 'travel' ? '答對才可搭車' : '答對才可升級車站' }}</p>
        <h2>「{{ question.word.zh_tw }}」的英文是什麼？</h2>
        <template v-if="question.kind === 'choice'">
          <div class="choices"><button v-for="option in question.options" :key="option.id" type="button" :class="{ selected: answer === String(option.id) }" @click="answer = String(option.id)">{{ option.en_us }}</button></div>
        </template>
        <template v-else>
          <p class="masked">{{ question.masked }}</p><label for="rail-letters">依序填入兩個缺少的英文字母</label><input id="rail-letters" v-model="answer" maxlength="2" autocomplete="off" autocapitalize="off" spellcheck="false" @keyup.enter="submitAnswer">
        </template>
        <div class="question-actions"><button type="button" class="cancel" @click="cancelQuestion">取消</button><button type="button" :disabled="!answer || resolving" @click="submitAnswer">確認答案</button></div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.rail-page{box-sizing:border-box;min-height:100vh;padding:14px clamp(12px,2vw,32px);background:#dcebf0;color:#173b49;font-family:system-ui,-apple-system,sans-serif}
.rail-page button,.rail-page input,.rail-page select{font:inherit}.rail-page button{cursor:pointer}.rail-page button:disabled{opacity:.5;cursor:not-allowed}
.rail-header{display:flex;align-items:center;justify-content:space-between;gap:18px}.rail-header h1{margin:2px 0;font-size:clamp(1.5rem,2vw,2.2rem);color:#12465b}.rail-header p{margin:2px 0}.back-link{color:#0a6079;font-weight:800}.setup{display:flex;align-items:end;gap:8px;flex-wrap:wrap}.setup label{display:grid;gap:3px;font-size:.78rem;font-weight:800}.setup select,.setup button{border:2px solid #458499;border-radius:9px;background:#fff;padding:8px 11px;color:#163e50}.setup button{background:#ffdf80;font-weight:900}
.region-picker{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:10px 0 0}.region-picker button{display:flex;justify-content:space-between;align-items:center;gap:5px;min-width:0;border:2px solid #8badb7;border-radius:10px;background:#f9fdff;color:#1b4b5c;padding:7px 9px;text-align:left}.region-picker button.chosen{background:#ffe7a0;border-color:#a56a1d}.region-picker button.complete{background:#d8f1d6;border-color:#56945b}.region-picker strong{font-size:.81rem}.region-picker small{white-space:nowrap;font-size:.72rem}
.rail-status{display:grid;grid-template-columns:repeat(6,minmax(0,1fr)) auto auto;gap:7px;margin:12px 0}.rail-status>div,.rail-status>a{display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0;padding:7px 9px;border:2px solid #98bdc8;border-radius:11px;background:#fff;box-shadow:0 3px #aecbd3}.rail-status span{font-size:.72rem}.rail-status strong{font-size:1rem}.rail-status>a{color:#125777;text-align:center;text-decoration:none;font-weight:900;font-size:.82rem}
.notice{margin:0 0 10px;padding:9px 13px;border-left:5px solid #21829f;border-radius:7px;background:#effafe;font-weight:750}.notice small{display:block;font-size:.7rem}.rail-layout{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(270px,.65fr) minmax(300px,.7fr);gap:12px;align-items:stretch}
.map-card,.station-card,.trip-card{min-width:0;border:2px solid #7aa8b3;border-radius:17px;background:#f9fdff;box-shadow:0 5px 0 #b4cbd0;overflow:hidden}.map-card{display:flex;flex-direction:column;background:#d3e8e8}.map-title{display:flex;justify-content:space-between;gap:9px;padding:10px 13px;background:#e9f6f3}.map-title span{font-size:.73rem}.rail-map{width:100%;height:0;flex:1;min-height:340px}.island{fill:#d8dfb6;stroke:#517e70;stroke-width:1}.rail-line{stroke:#856942;stroke-width:1.2;stroke-linecap:round}.rail-line.reachable{stroke:#e68a19;stroke-width:2}.station-marker{cursor:pointer}.station-marker circle{fill:#f5f2e3;stroke:#345969;stroke-width:1}.station-marker .hit-area{fill:transparent;stroke:none}.station-marker.stamped circle:not(.hit-area){fill:#65c18b}.station-marker.reachable circle:not(.hit-area){fill:#ffd56f;stroke:#965300;stroke-width:1.5}.station-marker.current circle:not(.hit-area){fill:#dc6f53;stroke:#832d19;stroke-width:1.5}.station-marker.viewed circle:not(.hit-area){stroke-width:2}.station-marker text{font-size:5.5px;font-weight:900;paint-order:stroke;stroke:#eef7ea;stroke-width:1.2;fill:#163c43}.station-marker:focus{outline:none}.station-marker:focus circle:not(.hit-area){stroke:#202d9a;stroke-width:2}.train-token{font-size:10px;pointer-events:none;transition:transform .65s ease-in-out}.map-caption{margin:0;padding:8px 11px;background:#eff6ed;font-size:.69rem;line-height:1.4}.map-caption a{color:#126481}
.station-card{display:flex;flex-direction:column}.station-photo{height:43%;min-height:180px;background:#c8dbde}.station-photo img{display:block;width:100%;height:100%;object-fit:cover}.photo-fallback{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:3rem}.photo-fallback span{font-size:.9rem;text-align:center}.station-info{padding:14px;overflow:auto}.eyebrow{margin:0 0 5px;color:#497783;font-size:.75rem;font-weight:900;letter-spacing:.04em}.station-info h2{margin:0 0 9px;color:#164758;font-size:1.28rem}.station-info h2 span{font-size:.72rem;color:#328257}.station-info>p:not(.eyebrow){margin:0;line-height:1.6;font-size:.9rem}.source-links{display:grid;gap:6px;margin-top:14px;font-size:.72rem;overflow-wrap:anywhere}.source-links a{color:#155f79}
.trip-card{padding:14px;display:flex;flex-direction:column;gap:9px}.trip-card h2,.trip-card h3{margin:0}.trip-card h2{font-size:1.2rem}.trip-card h3{font-size:.9rem}.turn-indicator{margin:0;font-weight:900;color:#b4571b}.mission{display:grid;gap:3px;padding:9px;border:1px solid #e2b970;border-radius:9px;background:#fff4d5}.mission small{color:#72582e}.destinations{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.destinations button{display:grid;gap:4px;text-align:left;padding:10px;border:2px solid #6fa0b2;border-radius:10px;background:#ecf8fb;color:#16475a}.destinations button:hover:not(:disabled){background:#d9f0f7}.destinations small{font-size:.7rem}.invest-button{padding:10px;border:2px solid #8c742a;border-radius:10px;background:#ffedaa;color:#514014;font-weight:900}.rules,.score-rules{margin:0;line-height:1.45;font-size:.73rem}.score-rules{color:#5d6d73}.finished-box{margin-top:auto;padding:10px;border-radius:10px;background:#e1f4e5}.finished-box p{font-size:.77rem}.finished-box button{border:1px solid #3d8272;border-radius:7px;background:#fff;padding:6px}
.question-shade{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:12px;background:#102e3bc9}.question-card{box-sizing:border-box;width:min(100%,520px);max-height:calc(100dvh - 24px);overflow:auto;padding:22px;border:4px solid #69a5b7;border-radius:18px;background:#faffff;box-shadow:0 12px #315565}.question-card h2{margin:4px 0 18px}.choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.choices button{padding:12px;border:2px solid #9cb9c2;border-radius:9px;background:#fff;color:#234457;font-weight:850}.choices button.selected{background:#ffeda6;border-color:#c17d20}.masked{font-size:1.65rem;font-weight:900;letter-spacing:.12em}.question-card label{display:block;margin-bottom:6px}.question-card input{width:100%;box-sizing:border-box;padding:11px;border:2px solid #83a5ae;border-radius:8px}.question-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.question-actions button{padding:9px 14px;border:2px solid #42859a;border-radius:9px;background:#c8ecf3;font-weight:850}.question-actions .cancel{background:#fff}
.trip-card{overflow:auto}.station-atlas{border:1px solid #b7d0d5;border-radius:8px;background:#f1f8f7;padding:5px 8px}.station-atlas summary{cursor:pointer;font-size:.8rem;font-weight:850}.station-atlas>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;max-height:170px;overflow:auto;margin-top:7px}.station-atlas p{margin:6px 0;font-size:.7rem}.station-atlas button{border:1px solid #aac4c9;border-radius:6px;background:#fff;padding:5px 2px;color:#1f5965;font-size:.72rem}.station-atlas button.viewed{background:#ffedaf;border-color:#be8c3c}
.rail-layout{grid-template-columns:minmax(0,1.7fr) minmax(260px,.55fr) minmax(300px,.7fr)}
.map-title{align-items:center;flex-wrap:wrap}.map-controls{display:flex;gap:5px}.map-controls button{border:1px solid #6b9aa5;border-radius:7px;background:#fff;color:#205062;padding:5px 8px;font-size:.74rem;font-weight:800}.map-controls button.active{background:#ffe3a3;border-color:#b77b22}
.island,.rail-line,.station-marker circle:not(.hit-area),.station-marker text{vector-effect:non-scaling-stroke}.rail-line{stroke-width:1.5}.rail-line.reachable{stroke-width:3}.station-marker circle:not(.hit-area){stroke-width:1.5}.station-marker.reachable circle:not(.hit-area),.station-marker.current circle:not(.hit-area){stroke-width:2}.station-marker.viewed circle:not(.hit-area){stroke-width:2.5}.station-marker text{stroke-width:2}
@media(min-width:1200px) and (min-height:720px){.rail-page{height:100dvh;overflow:hidden;display:flex;flex-direction:column}.rail-header,.rail-status,.notice,.region-picker{flex:none}.rail-layout{min-height:0;flex:1}.rail-map{min-height:0}.station-photo{min-height:0}}
@media(max-width:1150px){.rail-status{grid-template-columns:repeat(4,minmax(0,1fr))}.rail-layout{grid-template-columns:minmax(0,1fr) minmax(270px,.8fr)}.trip-card{grid-column:1/-1}.station-photo{min-height:160px}.rail-map{min-height:450px}.region-picker{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.rail-header{align-items:flex-start;flex-direction:column}.setup{width:100%}.rail-status{grid-template-columns:repeat(2,minmax(0,1fr))}.rail-layout{grid-template-columns:1fr}.trip-card{grid-column:auto}.rail-map{height:470px;min-height:0;flex:none}.station-card{display:grid;grid-template-columns:38% 1fr}.station-photo{height:100%;min-height:185px}.station-info{padding:10px}.station-info h2{font-size:1rem}.station-info>p:not(.eyebrow){font-size:.78rem}.map-title{flex-direction:column}.choices{grid-template-columns:1fr}.region-picker{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:430px){.station-card{grid-template-columns:1fr}.station-photo{height:180px}.rail-map{height:420px}.rail-status>div,.rail-status>a{padding:6px;font-size:.77rem}.rail-status strong{font-size:.86rem}}
@media(prefers-reduced-motion:reduce){.train-token{transition:none}}
</style>
