<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  FARM_CROPS, FARM_DISTRICTS, FARM_FERTILIZER_COST, FARM_GAME_TYPE, FARM_MAX_PLOTS, XINHUA_VILLAGE_IDS,
  applyFarmAction, cropById, farmActionError, freshFarm, withVillageLand, villagePrice, villagePlotCount,
  villageById, neighborAccess, landSalePrice
} from '~/lib/happy-farm';

const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const studentId = computed(() => student.value?.id ? String(student.value.id) : '');
const farm = ref(freshFarm());
const words = ref([]);
const revision = ref(0);
const selectedPlot = ref(0);
const selectedVillage = ref('');
const selectedDistrict = ref('新化區');
const selectedCrop = ref('carrot');
const activePanel = ref('tools');
const classmates = ref([]);
const chosenClassmateId = ref('');
const visiting = ref(null), peerFarm = ref(null);
const recentVisits = ref([]), dailySteals = ref(0);
const lastAction = ref(null);
const loadingPeer = ref(false);
const socialError = ref('');
const now = ref(Date.now());
const loading = ref(true), busy = ref(false), ready = ref(false);
const notice = ref('載入農場與單字中…'), saveNotice = ref('');
const quiz = ref(null), answer = ref(''), quizError = ref(''), session = ref(null);
let clock = null, lastWordId = null;

const crop = id => cropById(id);
const viewFarm = computed(() => visiting.value && peerFarm.value ? peerFarm.value : farm.value);
const currentMap = computed(() => FARM_DISTRICTS.find(item => item.name === selectedDistrict.value) || FARM_DISTRICTS[0]);
const villages = computed(() => currentMap.value.villages);
const villageName = id => villageById(id)?.name || '未知里別';
const neighborOpen = computed(() => neighborAccess(viewFarm.value));
const xinhuaOwned = computed(() => XINHUA_VILLAGE_IDS.filter(id => viewFarm.value.ownedVillages?.includes(id)).length);
const ownedVillage = computed(() => viewFarm.value.ownedVillages?.includes(selectedVillage.value));
const visiblePlots = computed(() => viewFarm.value.plots
  .map((plot, index) => ({ plot, index }))
  .filter(item => (viewFarm.value.plotVillages?.[item.index] || viewFarm.value.homeVillage) === selectedVillage.value));
const villageCost = computed(() => villagePrice(farm.value));
const villageRefund = computed(() => landSalePrice(farm.value, selectedVillage.value));
const expansionCost = computed(() => 100 + villagePlotCount(farm.value, selectedVillage.value) * 30);
function chooseDistrict(name) {
  if (name !== '新化區' && !neighborOpen.value) return;
  selectedDistrict.value = name;
  const district = FARM_DISTRICTS.find(item => item.name === name);
  chooseVillage(district.villages.find(item => viewFarm.value.ownedVillages.includes(item.id))?.id || district.villages[0].id);
}
function chooseVillage(id) {
  const village = villageById(id);
  if (!village || (village.district !== '新化區' && !neighborOpen.value)) return;
  selectedDistrict.value = village.district;
  selectedVillage.value = id;
  selectedPlot.value = viewFarm.value.plotVillages?.findIndex(value => value === id) ?? -1;
}
const selected = computed(() => viewFarm.value.plots[selectedPlot.value] || null);
const totalProduce = computed(() => Object.values(farm.value.produce).reduce((sum, count) => sum + Number(count || 0), 0));
const lessonLabel = computed(() => [lesson.version, lesson.volume, lesson.unit].join(' · '));
const sessionKey = computed(() => 'shjhs_happy_farm_session:' + [studentId.value, lesson.version, lesson.volume, lesson.unit].join(':'));
const secondsLeft = plot => Math.max(0, Math.ceil((plot.readyAt - now.value) / 1000));
const timeLabel = plot => {
  const seconds = secondsLeft(plot);
  return seconds ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') : '可以收成';
};
const plotStage = plot => {
  if (!plot) return '空地';
  if (!secondsLeft(plot)) return '成熟';
  const elapsed = (now.value - plot.plantedAt) / (plot.readyAt - plot.plantedAt);
  return elapsed < .35 ? '發芽' : elapsed < .75 ? '成長中' : '快成熟';
};
const plotWeeds = plot => plot && now.value >= plot.weedAt && !plot.weedRemoved;
const plotPests = plot => plot && now.value >= plot.pestAt && !plot.pestRemoved;
const careStatus = plot => {
  if (!plot) return [];
  return [
    { key: 'water', icon: '💧', text: plot.watered ? '已澆水' : '未澆水', state: plot.watered ? 'done' : 'pending' },
    { key: 'fertilize', icon: '✨', text: plot.fertilized ? '已施肥' : '未施肥', state: plot.fertilized ? 'done' : 'pending' },
    { key: 'weed', icon: '🌾', text: plot.weedRemoved ? '已除草' : plotWeeds(plot) ? '待除草' : '尚無雜草', state: plot.weedRemoved ? 'done' : plotWeeds(plot) ? 'urgent' : 'pending' },
    { key: 'pest', icon: '🐛', text: plot.pestRemoved ? '已除蟲' : plotPests(plot) ? '待除蟲' : '尚無害蟲', state: plot.pestRemoved ? 'done' : plotPests(plot) ? 'urgent' : 'pending' }
  ];
};
const pulseIcon = action => ({ water: '💧', fertilize: '✨', weed: '🌾', pest: '🛡️' })[action] || '';
const can = (action, cropId = selectedCrop.value) =>
  ready.value && !visiting.value && !busy.value && !quiz.value && !farmActionError(farm.value, action, cropId, selectedPlot.value, now.value, selectedVillage.value);
function visitProblem(action, plotIndex = selectedPlot.value) {
  const plot = peerFarm.value?.plots?.[plotIndex];
  if (!plot) return '這塊田尚未播種。';
  if (action === 'water') return now.value >= plot.readyAt || plot.watered ? '作物已成熟或已澆水。' : '';
  if (action === 'weed') return now.value >= plot.weedAt && !plot.weedRemoved ? '' : '目前沒有雜草。';
  if (action === 'pest') return now.value >= plot.pestAt && !plot.pestRemoved ? '' : '目前沒有害蟲。';
  if (action === 'steal') {
    if (now.value < plot.readyAt) return '作物還沒成熟。';
    if ((plot.stolen || 0) >= 1) return '這塊田已被摘取過。';
    if (dailySteals.value >= 3) return '今天已達三次摘取上限。';
    const cropInfo = crop(plot.crop);
    if (!cropInfo) return '作物資料無效。';
    const possible = Math.max(1, cropInfo.yield + Number(plot.watered) + Number(plot.fertilized)
      - Number(now.value >= plot.weedAt && !plot.weedRemoved)
      - Number(now.value >= plot.pestAt && !plot.pestRemoved) - Number(plot.stolen || 0));
    return possible > 1 ? '' : '必須替主人保留至少一份收成。';
  }
  return '此操作無法用於同學農場。';
}
const canVisit = action => ready.value && !!visiting.value && !socialError.value && !busy.value && !quiz.value && !visitProblem(action);

function makeSession() {
  return { id: crypto.randomUUID(), startedAt: Date.now(), correct: [], wrong: [], attemptNumber: 1 };
}
function rememberSession() {
  if (!session.value) return;
  try { sessionStorage.setItem(sessionKey.value, JSON.stringify(session.value)); }
  catch { saveNotice.value = '本機暫存不可用；請保持頁面開啟直到成績同步。'; }
}
async function syncRecord() {
  if (!session.value || !studentId.value || !(session.value.correct.length + session.value.wrong.length)) return;
  const entry = session.value;
  const { error } = await db.from('game_records').upsert([{
    id: entry.id, student_id: studentId.value, game_type: FARM_GAME_TYPE,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: entry.correct.length * 10, mistakes: entry.wrong.length,
    correct_words: entry.correct.join(', '), wrong_words: entry.wrong.join(', '),
    attempt_number: entry.attemptNumber, played_at: new Date(entry.startedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - entry.startedAt) / 1000),
    device_info: navigator.userAgent
  }], { onConflict: 'id' });
  saveNotice.value = error ? '成績尚未同步：' + error.message + '。按「重試同步」。' : '農場與本次答題成績已儲存。';
}
async function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey.value) || 'null');
    if (saved?.id && Array.isArray(saved.correct) && Array.isArray(saved.wrong) && Number.isFinite(saved.startedAt)) session.value = saved;
  } catch { /* Start a new record if browser storage is unavailable. */ }
  if (!session.value) {
    session.value = makeSession();
    const { count, error } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId.value).eq('game_type', FARM_GAME_TYPE)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    if (!error) session.value.attemptNumber = (count || 0) + 1;
    rememberSession();
  } else await syncRecord();
}
async function loadFarm() {
  const { data, error } = await db.from('happy_farm_states').select('farm,revision').eq('student_id', studentId.value).maybeSingle();
  if (error) throw error;
  if (data) {
    const fallback = FARM_DISTRICTS[0].villages[Math.floor(Math.random() * XINHUA_VILLAGE_IDS.length)].id;
    farm.value = withVillageLand(data.farm, fallback);
    revision.value = data.revision;
    if (JSON.stringify(farm.value) !== JSON.stringify(data.farm)) {
      const { data: migrated, error: migrationError } = await db.from('happy_farm_states')
        .update({ farm: farm.value, revision: revision.value + 1, updated_at: new Date().toISOString() })
        .eq('student_id', studentId.value).eq('revision', revision.value).select('farm,revision').maybeSingle();
      if (migrationError) throw migrationError;
      if (migrated) { farm.value = migrated.farm; revision.value = migrated.revision; }
      else return loadFarm();
    }
    if (!selectedVillage.value || !farm.value.ownedVillages.includes(selectedVillage.value)) chooseVillage(farm.value.homeVillage);
    return;
  }
  const startVillage = FARM_DISTRICTS[0].villages[Math.floor(Math.random() * XINHUA_VILLAGE_IDS.length)].id;
  const { data: created, error: createError } = await db.from('happy_farm_states')
    .insert({ student_id: studentId.value, farm: freshFarm(startVillage) }).select('farm,revision').single();
  if (createError) throw createError;
  farm.value = created.farm;
  revision.value = created.revision;
  chooseVillage(startVillage);
}
async function saveFarm(next) {
  const { data, error } = await db.from('happy_farm_states')
    .update({ farm: next, revision: revision.value + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', revision.value).select('revision').maybeSingle();
  if (error) throw error;
  if (!data) {
    await loadFarm();
    throw new Error('農場已在另一個分頁或裝置更新，請重新選擇操作並答題。');
  }
  farm.value = next;
  revision.value = data.revision;
}
async function loadClassmates() {
  if (student.value?.isAnon || !student.value?.class) return;
  const { data, error } = await db.from('students')
    .select('student_id,hidden_name,seat_number,class_name')
    .eq('class_name', student.value.class).neq('student_id', studentId.value)
    .order('seat_number', { ascending: true }).limit(60);
  if (error) { notice.value = '同班名單暫時無法讀取：' + error.message; return; }
  classmates.value = data || [];
  if (!classmates.value.some(person => person.student_id === chosenClassmateId.value)) {
    chosenClassmateId.value = classmates.value[0]?.student_id || '';
  }
}
async function loadVisitActivity() {
  if (student.value?.isAnon) return;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const { count, error } = await db.from('happy_farm_visits').select('id', { count: 'exact', head: true })
    .eq('actor_id', studentId.value).eq('action', 'steal')
    .gte('created_at', new Date(today + 'T00:00:00+08:00').toISOString());
  if (error) {
    socialError.value = '互訪尚未啟用；請先在新 Supabase 執行開心農場互訪 SQL。';
    return;
  }
  socialError.value = '';
  dailySteals.value = count || 0;
  const { data } = await db.from('happy_farm_visits').select('actor_id,action,crop,created_at')
    .eq('owner_id', studentId.value).order('created_at', { ascending: false }).limit(3);
  recentVisits.value = data || [];
}
async function openClassmate(person) {
  if (busy.value || quiz.value || student.value?.isAnon) return;
  loadingPeer.value = true;
  try {
    const { data, error } = await db.from('happy_farm_states').select('farm')
      .eq('student_id', person.student_id).maybeSingle();
    if (error) throw error;
    if (!data) { notice.value = person.hidden_name + ' 還沒有開設農場。'; return; }
    peerFarm.value = withVillageLand(data.farm, XINHUA_VILLAGE_IDS[0]);
    visiting.value = person;
    chooseVillage(peerFarm.value.homeVillage);
    activePanel.value = 'visitors';
    notice.value = '正在拜訪 ' + person.hidden_name + ' 的農場。幫忙照料或摘取作物都要先答單字題。';
  } catch (error) { notice.value = '無法進入同學農場：' + error.message; }
  finally { loadingPeer.value = false; }
}
function visitChosenClassmate() {
  const person = classmates.value.find(item => item.student_id === chosenClassmateId.value);
  if (person) openClassmate(person);
}
const classmateName = id => classmates.value.find(person => person.student_id === id)?.hidden_name || '同班同學';
const visitActionText = action => ({ water: '澆水', weed: '除草', pest: '除蟲', steal: '摘取一份作物' })[action] || action;
async function refreshPeer() {
  if (!visiting.value) return;
  const { data, error } = await db.from('happy_farm_states').select('farm')
    .eq('student_id', visiting.value.student_id).maybeSingle();
  if (!error && data) peerFarm.value = withVillageLand(data.farm, XINHUA_VILLAGE_IDS[0]);
}
async function returnHomeFarm() {
  if (busy.value || quiz.value) return;
  visiting.value = null;
  peerFarm.value = null;
  activePanel.value = 'tools';
  try { await loadFarm(); chooseVillage(farm.value.homeVillage); await loadVisitActivity(); }
  catch (error) { notice.value = '更新我的農場失敗：' + error.message; }
}
async function refreshSocial() {
  if (busy.value || quiz.value) return;
  try {
    if (visiting.value) await refreshPeer();
    else await loadFarm();
    await loadVisitActivity();
    notice.value = '農場與互訪紀錄已更新。';
  } catch (error) { notice.value = '更新失敗：' + error.message; }
}
async function applyVisit(q) {
  const { data, error } = await db.rpc('happy_farm_visit', {
    p_actor_id: studentId.value, p_owner_id: q.ownerId,
    p_action: q.action, p_plot_index: q.plotIndex
  });
  if (error) {
    await refreshPeer();
    await loadVisitActivity();
    throw error;
  }
  farm.value = withVillageLand(data.actor_farm, farm.value.homeVillage);
  revision.value = data.actor_revision;
  peerFarm.value = withVillageLand(data.owner_farm, peerFarm.value?.homeVillage || XINHUA_VILLAGE_IDS[0]);
  dailySteals.value = data.daily_steals;
  return { detail: q.action === 'steal' ? '已摘取一份 ' + crop(q.cropId).name + '，主人至少保留一份。' : '已幫同學照料作物。' };
}
function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function buildQuiz() {
  const pool = words.value.filter(word => word.id !== lastWordId);
  const word = shuffle(pool.length ? pool : words.value)[0];
  lastWordId = word.id;
  const english = String(word.en_us).trim();
  const chinese = String(word.zh_tw).trim();
  const direction = Math.random() < .5 ? 'enToZh' : 'zhToEn';
  const target = direction === 'enToZh' ? chinese : english;
  const others = [...new Set(shuffle(words.value).map(item => String(direction === 'enToZh' ? item.zh_tw : item.en_us).trim()).filter(value => value && value !== target))].slice(0, 3);
  if (others.length >= 2) return {
    word, mode: 'choice', prompt: direction === 'enToZh' ? '「' + english + '」的中文意思是？' : '「' + chinese + '」的英文是？',
    choices: shuffle([target, ...others]), target
  };
  const letters = [...english].map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter(index => index >= 0);
  if (letters.length < 2) return { word, mode: 'spell', prompt: '請輸入「' + chinese + '」的英文', target: english };
  const positions = shuffle(letters).slice(0, 2).sort((a, b) => a - b);
  const masked = [...english], missing = positions.map(index => masked[index]).join('');
  positions.forEach(index => { masked[index] = '＿'; });
  return { word, mode: 'letters', prompt: '補上「' + chinese + '」的兩個字母', masked: masked.join(''), target: missing };
}
function actionLabel(action, cropId) {
  const name = crop(cropId)?.name || '';
  return {
    buy: '買一份' + name + '種苗', plant: '種下' + name, water: '澆水', fertilize: '施肥',
    weed: '除草', pest: '除蟲', harvest: '收成', sell: '賣出全部' + name, expand: '擴建田地',
    steal: '摘取一份' + name, buyLand: '買下' + villageName(selectedVillage.value) + '農地', sellLand: '出售' + villageName(selectedVillage.value) + '農地'
  }[action] || action;
}
function beginAction(action, cropId = selectedCrop.value) {
  if (!ready.value || busy.value || quiz.value) return;
  if (visiting.value && socialError.value) { notice.value = socialError.value; return; }
  const ownerId = visiting.value?.student_id || null;
  const targetCrop = visiting.value ? selected.value?.crop : cropId;
  const problem = visiting.value
    ? visitProblem(action)
    : farmActionError(farm.value, action, targetCrop, selectedPlot.value, Date.now(), selectedVillage.value);
  if (problem) { notice.value = problem; return; }
  quiz.value = { ...buildQuiz(), action, cropId: targetCrop, plotIndex: selectedPlot.value, villageId: selectedVillage.value, ownerId,
    actionText: (visiting.value && action !== 'steal' ? '幫同學' : '') + actionLabel(action, targetCrop) };
  answer.value = '';
  quizError.value = '';
}
async function submitAnswer() {
  if (!quiz.value || busy.value || !String(answer.value).trim()) return;
  busy.value = true;
  const q = quiz.value;
  const correct = answer.value.trim().toLocaleLowerCase() === q.target.toLocaleLowerCase();
  try {
    let result = null;
    if (correct) {
      const problem = q.ownerId
        ? visitProblem(q.action, q.plotIndex)
        : farmActionError(farm.value, q.action, q.cropId, q.plotIndex, Date.now(), q.villageId);
      if (problem) { notice.value = problem; quiz.value = null; return; }
      if (q.ownerId) result = await applyVisit(q);
      else {
        result = applyFarmAction(farm.value, q.action, q.cropId, q.plotIndex, Date.now(), q.villageId);
        await saveFarm(result.farm);
        if (q.action === 'buyLand') chooseVillage(q.villageId);
        if (q.action === 'sellLand') chooseVillage(q.villageId);
        if (q.action === 'expand') chooseVillage(q.villageId);
      }
      if (pulseIcon(q.action)) lastAction.value = { plotIndex: q.plotIndex, action: q.action, at: Date.now() };
    }
    if (correct) session.value.correct.push(q.word.en_us);
    else session.value.wrong.push(q.word.en_us);
    rememberSession();
    await syncRecord();
    notice.value = correct
      ? '答對 ' + q.word.en_us + '！已完成「' + q.actionText + '」' + (q.action === 'harvest' || q.ownerId ? '，' + result.detail : '') + '。'
      : '答錯了：' + q.word.en_us + '＝' + q.word.zh_tw + '。這次沒有執行「' + q.actionText + '」。';
    quiz.value = null;
    now.value = Date.now();
  } catch (error) {
    notice.value = '操作未完成：' + error.message + '。請重試儲存或重新作答。';
    quizError.value = notice.value;
  } finally { busy.value = false; }
}
async function finishVisit() {
  if (busy.value || quiz.value) return;
  busy.value = true;
  try {
    await syncRecord();
    if (saveNotice.value.startsWith('成績尚未同步')) return;
    try { sessionStorage.removeItem(sessionKey.value); } catch { /* Browser storage may be unavailable. */ }
    await navigateTo('/');
  } finally { busy.value = false; }
}

onMounted(async () => {
  clock = window.setInterval(() => { now.value = Date.now(); }, 1000);
  if (!studentId.value) { notice.value = '請先回首頁登入，再開啟個人農場。'; loading.value = false; return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) {
    notice.value = '請從首頁選擇版本、冊數、單元，再進入單字開心農場。';
    loading.value = false; return;
  }
  try {
    const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
    if (error) throw error;
    words.value = (data || []).filter(item => String(item.en_us || '').trim() && String(item.zh_tw || '').trim());
    if (words.value.length < 2) { notice.value = '這個單元需要至少兩筆中英對照單字，請改選其他單元。'; return; }
    await loadFarm();
    await loadSession();
    await Promise.all([loadClassmates(), loadVisitActivity()]);
    ready.value = true;
    notice.value = '點田地後選操作，答對單字即可執行；「同學」分頁可拜訪同班農場。';
  } catch (error) {
    notice.value = '農場無法載入：' + error.message + '。請確認新專案已執行開心農場 SQL。';
  } finally { loading.value = false; }
});
onUnmounted(() => { if (clock) window.clearInterval(clock); });
</script>

<template>
  <main class="farm-page">
    <header class="farm-header">
      <div><p class="eyebrow">VOCAB HAPPY FARM · 個人農場</p><h1>🌻 單字開心農場</h1><p>{{ lessonLabel }}</p></div>
      <div class="farm-top-actions"><NuxtLink to="/" class="quiet-link">← 返回首頁</NuxtLink><button v-if="ready" type="button" @click="finishVisit" :disabled="busy">完成本次學習</button></div>
    </header>
    <div class="feedback">
      <p class="notice" role="status" aria-live="polite">{{ notice }}</p>
      <p v-if="saveNotice.startsWith('成績尚未同步')" class="save-notice" role="alert">{{ saveNotice }} <button type="button" @click="syncRecord">重試同步</button></p>
    </div>
    <template v-if="ready">
      <section class="status-bar" aria-label="農場狀態">
        <div><span>🪙 我的金幣</span><strong>{{ farm.coins }}</strong></div>
        <div><span>🌾 累計收成</span><strong>{{ farm.harvested }}</strong></div>
        <div><span>🎒 倉庫作物</span><strong>{{ totalProduce }}</strong></div>
        <div><span>📖 本次答題</span><strong>{{ session?.correct.length || 0 }} 對／{{ session?.wrong.length || 0 }} 錯</strong></div>
        <NuxtLink :to="{ path: '/leaderboard', query: { game: '單字開心農場', version: lesson.version, volume: lesson.volume, unit: lesson.unit } }">🏆 英雄榜</NuxtLink>
        <NuxtLink :to="{ path: '/history', query: { game: '單字開心農場' } }">📊 學習紀錄</NuxtLink>
      </section>
      <div class="farm-layout">
        <section class="farm-field" aria-label="我的農地">
          <div class="scene-sky"><span>☀️</span><span>☁️</span><span>🐦</span></div>
          <div class="farm-barn">🏠 <span>{{ visiting ? visiting.hidden_name + ' 的農場' : '我的小農舍' }} · {{ villageName(selectedVillage) }}</span></div>
          <div class="land-layout">
            <div class="map-panel">
              <div class="map-heading"><strong>臺南市{{ selectedDistrict }} · {{ villages.length }} 里</strong><span>{{ visiting ? '同學已擁有 ' + viewFarm.ownedVillages.length + ' 里' : '已擁有 ' + farm.ownedVillages.length + ' 里' }}</span></div>
              <div class="district-picker"><label for="district-select">區域地圖</label><select id="district-select" :value="selectedDistrict" @change="chooseDistrict($event.target.value)"><option v-for="district in FARM_DISTRICTS" :key="district.name" :value="district.name" :disabled="district.name !== '新化區' && !neighborOpen">{{ district.name }}{{ district.name !== '新化區' && !neighborOpen ? '（尚未解鎖）' : '' }}</option></select></div>
              <p class="unlock-hint">{{ neighborOpen ? '✅ 已解鎖鄰區，可購買與出售各里的農地' : '🔒 買齊新化區 16 里後解鎖鄰區（' + xinhuaOwned + '/16）' }}</p>
              <svg class="village-map" :viewBox="currentMap.viewBox" role="img" :aria-label="selectedDistrict + '各里地圖；下方可點選里名'">
                <path v-for="item in villages" :key="item.id" :d="item.path" class="village-shape"
                  :class="{ owned: viewFarm.ownedVillages.includes(item.id), home: viewFarm.homeVillage === item.id, selected: selectedVillage === item.id }"
                  tabindex="0" role="button" :aria-label="item.name + (viewFarm.ownedVillages.includes(item.id) ? '，已擁有' : '，尚未購買')"
                  @click="chooseVillage(item.id)" @keydown.enter.prevent="chooseVillage(item.id)" @keydown.space.prevent="chooseVillage(item.id)"><title>{{ item.name }}</title></path>
                <path :d="currentMap.outline" class="district-outline" />
              </svg>
              <div v-if="selectedDistrict === '新化區'" class="village-list" aria-label="選擇新化區的里">
                <button v-for="item in villages" :key="item.id" type="button" :class="{ owned: viewFarm.ownedVillages.includes(item.id), home: viewFarm.homeVillage === item.id, selected: selectedVillage === item.id }" :aria-pressed="selectedVillage === item.id" @click="chooseVillage(item.id)">{{ item.name }}</button>
              </div>
              <select v-else class="neighbor-village-picker" :value="selectedVillage" :aria-label="'選擇' + selectedDistrict + '的里'" @change="chooseVillage($event.target.value)"><option v-for="item in villages" :key="item.id" :value="item.id">{{ item.name }}{{ viewFarm.ownedVillages.includes(item.id) ? ' · 已擁有' : '' }}</option></select>
              <a class="map-source" href="https://maps.nlsc.gov.tw/pro/download.jsp" target="_blank" rel="noopener">村里界資料：國土測繪中心（2026）</a>
            </div>
            <div class="village-field">
              <p class="village-heading"><strong>{{ villageName(selectedVillage) }}</strong><span>{{ ownedVillage ? (viewFarm.homeVillage === selectedVillage ? '起始農地' : '已購農地') : '尚未購買' }}</span></p>
              <div v-if="ownedVillage" class="field-grid">
                <button v-for="(entry, localIndex) in visiblePlots" :key="entry.index" type="button" class="plot"
                  :class="{ chosen: selectedPlot === entry.index, mature: entry.plot && !secondsLeft(entry.plot) }"
                  :aria-pressed="selectedPlot === entry.index" :aria-label="villageName(selectedVillage) + '第 ' + (localIndex + 1) + ' 塊田：' + (entry.plot ? crop(entry.plot.crop)?.name + plotStage(entry.plot) : '空地')"
                  @click="selectedPlot = entry.index">
                  <span class="plot-number">{{ localIndex + 1 }}</span><FarmCrop class="plot-plant" :crop="entry.plot?.crop || ''" :stage="plotStage(entry.plot)" />
                  <span class="plot-name">{{ entry.plot ? crop(entry.plot.crop)?.name : '空地' }}</span>
                  <span class="plot-progress">{{ entry.plot ? timeLabel(entry.plot) : '可播種' }}</span>
                  <span v-if="entry.plot" class="plot-care" aria-hidden="true"><span v-for="status in careStatus(entry.plot)" :key="status.key" :class="status.state" :title="status.text">{{ status.icon }}{{ status.state === 'done' ? '✓' : status.state === 'urgent' ? '!' : '·' }}</span></span>
                  <span class="plot-alert">{{ entry.plot?.stolen ? '🧺' : '' }}</span>
                  <span v-if="lastAction?.plotIndex === entry.index && now - lastAction.at < 1800" class="action-pop" aria-hidden="true">{{ pulseIcon(lastAction.action) }}</span>
                </button>
                <div v-for="n in FARM_MAX_PLOTS - visiblePlots.length" :key="'locked-' + n" class="plot locked"><span>🔒</span><small>待擴建</small></div>
              </div>
              <div v-else class="unowned-land"><span>🌾</span><strong>這塊里地還未開墾</strong><p v-if="!visiting">累積金幣後，答對單字即可買下 {{ villageName(selectedVillage) }}，取得 4 塊新田。</p><p v-else>同學尚未購買這個里的農地。</p></div>
            </div>
          </div>
        </section>
        <aside class="farm-controls">
          <div v-if="!ownedVillage && !visiting" class="land-buy-card"><strong>🏡 {{ villageName(selectedVillage) }}</strong><span>購地 {{ villageCost }} 金幣 · 獲得 4 塊田</span><button type="button" :disabled="!can('buyLand')" @click="beginAction('buyLand')">答題購買此里農地</button></div>
          <div v-if="ownedVillage && !visiting && selectedVillage !== farm.homeVillage" class="land-buy-card"><strong>🏡 {{ villageName(selectedVillage) }}</strong><span>收成此里作物後，可售地獲得 {{ villageRefund }} 金幣</span><button type="button" :disabled="!can('sellLand')" @click="beginAction('sellLand')">答題出售農地</button></div>
          <nav class="panel-tabs" aria-label="農場操作">
            <button type="button" :class="{ active: activePanel === 'tools' }" :disabled="!!visiting" @click="activePanel = 'tools'">🧤 農具</button>
            <button type="button" :class="{ active: activePanel === 'shop' }" :disabled="!!visiting" @click="activePanel = 'shop'">🛒 商店</button>
            <button type="button" :class="{ active: activePanel === 'visitors' }" @click="activePanel = 'visitors'">🏘️ 同學</button>
          </nav>
          <section v-if="activePanel === 'tools' && !visiting && ownedVillage" class="tool-card">
            <h2>🧤 {{ villageName(selectedVillage) }} · 第 {{ visiblePlots.findIndex(item => item.index === selectedPlot) + 1 }} 塊田</h2>
            <p>{{ selected ? crop(selected.crop)?.name + ' · ' + plotStage(selected) : '空地 · 選擇種苗後即可播種' }}</p>
            <div v-if="selected" class="care-detail" aria-label="這塊田的照料狀態"><span v-for="status in careStatus(selected)" :key="status.key" :class="status.state">{{ status.icon }} {{ status.text }}</span></div>
            <label for="crop-select">目前種苗</label>
            <select id="crop-select" v-model="selectedCrop"><option v-for="item in FARM_CROPS" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }}（剩 {{ farm.seeds[item.id] || 0 }}）</option></select>
            <div class="tool-grid">
              <button type="button" :disabled="!can('plant')" @click="beginAction('plant')">🌱 播種</button>
              <button type="button" :disabled="!can('water')" @click="beginAction('water')">💧 澆水</button>
              <button type="button" :disabled="!can('fertilize')" @click="beginAction('fertilize')">✨ 施肥 {{ FARM_FERTILIZER_COST }} 金幣</button>
              <button type="button" :disabled="!can('weed')" @click="beginAction('weed')">🌾 除草</button>
              <button type="button" :disabled="!can('pest')" @click="beginAction('pest')">🐛 除蟲</button>
              <button type="button" :disabled="!can('harvest')" @click="beginAction('harvest')">🧺 收成</button>
            </div>
            <p class="help">澆水、施肥可加快成熟；清除雜草與害蟲能保住收成。作物會在離線時繼續生長。</p>
          </section>
          <section v-if="activePanel === 'shop' && !visiting" class="shop-card">
            <h2>🛒 種苗店與倉庫 <small>新化五寶：鳳梨、麻竹筍、地瓜、橄欖、胡麻</small></h2>
            <div class="shop-list"><div v-for="item in FARM_CROPS" :key="item.id" class="shop-row">
              <div><strong>{{ item.icon }} {{ item.name }}</strong><small>{{ item.growMinutes }} 分鐘成熟 · 種苗 {{ item.seed }} 金幣 · 售價 {{ item.sale }} 金幣/個</small><small>種苗 {{ farm.seeds[item.id] || 0 }} · 庫存 {{ farm.produce[item.id] || 0 }}</small></div>
              <div><button type="button" :disabled="!can('buy', item.id)" @click="beginAction('buy', item.id)">買種苗</button><button type="button" :disabled="!can('sell', item.id)" @click="beginAction('sell', item.id)">賣作物</button></div>
            </div></div>
            <button v-if="ownedVillage" class="expand" type="button" :disabled="!can('expand')" @click="beginAction('expand')">🪵 擴建 {{ villageName(selectedVillage) }} 一塊田 · {{ expansionCost }} 金幣</button>
          </section>
          <section v-if="activePanel === 'visitors'" class="visit-card">
            <div class="visit-card-heading"><h2>🏘️ 同班互訪</h2><button type="button" @click="refreshSocial" :disabled="busy || !!quiz">更新農場</button></div>
            <p v-if="student?.isAnon" class="help">匿名訪客不能拜訪同學農場，請先以學生帳號登入。</p>
            <template v-else>
              <p v-if="socialError" class="visit-warning">{{ socialError }}</p>
              <div class="friend-picker">
                <select v-model="chosenClassmateId" aria-label="選擇同班同學" :disabled="loadingPeer || busy || !!quiz">
                  <option value="" disabled>選擇同班同學</option>
                  <option v-for="person in classmates" :key="person.student_id" :value="person.student_id">{{ person.seat_number }} 號 · {{ person.hidden_name }}</option>
                </select>
                <button type="button" :disabled="!chosenClassmateId || loadingPeer || busy || !!quiz" @click="visitChosenClassmate">{{ loadingPeer ? '載入中…' : '前往拜訪' }}</button>
              </div>
              <p v-if="!classmates.length" class="help">目前沒有可選的同班學生。</p>
              <template v-if="visiting">
                <div class="visit-heading"><strong>正在拜訪：{{ visiting.hidden_name }}</strong><button type="button" @click="returnHomeFarm" :disabled="busy || !!quiz">回我的農場</button></div>
                <p class="visit-target">第 {{ selectedPlot + 1 }} 塊田：{{ selected ? crop(selected.crop)?.name + ' · ' + plotStage(selected) : '空地' }}</p>
                <div v-if="selected" class="care-detail" aria-label="同學田地的照料狀態"><span v-for="status in careStatus(selected)" :key="status.key" :class="status.state">{{ status.icon }} {{ status.text }}</span></div>
                <div class="visit-actions">
                  <button type="button" :disabled="!canVisit('water')" @click="beginAction('water')">💧 幫忙澆水</button>
                  <button type="button" :disabled="!canVisit('weed')" @click="beginAction('weed')">🌾 幫忙除草</button>
                  <button type="button" :disabled="!canVisit('pest')" @click="beginAction('pest')">🐛 幫忙除蟲</button>
                  <button type="button" :disabled="!canVisit('steal')" @click="beginAction('steal')">🧺 偷菜一份</button>
                </div>
                <p class="help">每天最多偷菜三次（已用 {{ dailySteals }}/3）；每塊田只能被偷一次，主人至少保留一份。</p>
              </template>
              <div class="visit-log">
                <strong>最近來訪</strong>
                <p v-if="!recentVisits.length">尚無同學來訪紀錄。</p>
                <p v-for="(event, index) in recentVisits" :key="index">{{ classmateName(event.actor_id) }} {{ event.action === 'steal' ? '摘取了' + crop(event.crop)?.name : '幫忙' + visitActionText(event.action) }}</p>
              </div>
            </template>
          </section>
        </aside>
      </div>
    </template>
    <section v-else-if="!loading" class="start-help"><NuxtLink to="/">返回首頁選擇單元</NuxtLink></section>
    <div v-if="quiz" class="quiz-shade">
      <section class="quiz-card" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
        <p class="eyebrow">答對即可完成一次農場操作</p>
        <h2 id="quiz-title">{{ quiz.actionText }}</h2>
        <p class="quiz-prompt">{{ quiz.prompt }}</p>
        <p v-if="quizError" class="quiz-error" role="alert">{{ quizError }}</p>
        <form @submit.prevent="submitAnswer">
          <div v-if="quiz.mode === 'choice'" class="choices">
            <button v-for="choice in quiz.choices" :key="choice" type="button" :class="{ picked: answer === choice }" @click="answer = choice">{{ choice }}</button>
          </div>
          <div v-else class="write-answer"><strong v-if="quiz.masked">{{ quiz.masked }}</strong><input v-model="answer" autocomplete="off" autocapitalize="off" spellcheck="false" :maxlength="quiz.mode === 'letters' ? 2 : 60" :placeholder="quiz.mode === 'letters' ? '輸入兩個字母' : '輸入英文'" /></div>
          <div class="quiz-actions"><button type="button" class="cancel" :disabled="busy" @click="quiz = null">取消操作</button><button type="submit" :disabled="busy || !answer.trim()">{{ busy ? '儲存中…' : '送出答案' }}</button></div>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.farm-page{min-height:100vh;padding:22px clamp(12px,3vw,40px) 38px;color:#264028;background:linear-gradient(#afdfef 0 220px,#e9f7ce 220px 100%);font-family:system-ui,-apple-system,sans-serif}
.farm-header,.status-bar,.farm-layout{max-width:1320px;margin:auto}
.farm-header{display:flex;justify-content:space-between;align-items:center;gap:20px}
.farm-header h1{margin:3px 0;font-size:clamp(1.6rem,3vw,2.5rem);color:#245b38}
.farm-header p{margin:2px 0}
.eyebrow{letter-spacing:.12em;font-size:.72rem;font-weight:900;color:#466d4a}
.farm-top-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.farm-page button,.farm-page select,.farm-page input{font:inherit}
.farm-page button{cursor:pointer}
.farm-top-actions button,.status-bar a,.quiz-actions button,.expand{border:2px solid #2e7546;border-radius:12px;background:#fff8db;color:#275b38;padding:9px 13px;font-weight:800;text-decoration:none}
.quiet-link{color:#245b38;font-weight:800}
.feedback{display:flex;gap:8px;max-width:1320px;margin:8px auto}
.notice,.save-notice{max-width:1320px;margin:12px auto;padding:10px 14px;border:2px solid #7da96b;border-radius:12px;background:#fffdf0;font-weight:700}
.feedback .notice,.feedback .save-notice{margin:0}.feedback .notice{flex:1;min-width:0}
.save-notice{font-size:.82rem}
.save-notice button{margin-left:8px;border:0;background:transparent;text-decoration:underline;color:#125b85}
.status-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.status-bar>div,.status-bar>a{display:flex;gap:8px;align-items:center;background:#fffdf1;border:2px solid #9dbb72;border-radius:12px;padding:9px 14px;box-shadow:0 3px 0 #b4c888}
.status-bar strong{color:#a5521a}
.status-bar a{margin-left:auto}
.farm-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,1fr);gap:16px;align-items:start}
.farm-field{position:relative;min-height:560px;overflow:hidden;border:4px solid #74a45a;border-radius:22px;background:radial-gradient(ellipse at 50% 90%,#89c66f,#78b85e 70%,#64a650);box-shadow:0 12px 0 #b8d69d}
.scene-sky{height:63px;display:flex;justify-content:space-around;align-items:center;font-size:2rem;background:linear-gradient(#a9dff3,#e0f5e9)}
.farm-barn{width:max-content;max-width:75%;margin:15px auto 10px;padding:10px 20px;border:3px solid #9b6435;border-radius:16px;background:#f8e0a0;box-shadow:0 6px #a37a48;font-size:1.7rem}
.farm-barn span{font-size:.95rem;font-weight:900}
.field-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;max-width:620px;margin:25px auto 24px;padding:0 16px;transform:rotate(-2deg)}
.plot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:94px;border:4px solid #915c35;border-radius:14px;background:repeating-linear-gradient(25deg,#bd8654 0 12px,#a46d43 13px 24px);color:#fffbe4;text-shadow:0 2px 2px #533321;box-shadow:0 6px 0 #6d492d;transition:transform .15s}
.plot:hover,.plot.chosen{transform:translateY(-4px);outline:4px solid #ffe57d}
.plot.mature{background:#986439}
.plot.locked{cursor:default;border-color:#899588;background:#b5c2ae;box-shadow:none;opacity:.7}
.plot-number{position:absolute;top:4px;left:8px;font-size:.68rem}
.plot-plant{font-size:2.3rem;line-height:1.1}
.plot-name{font-weight:900;font-size:.78rem}
.plot-progress{font-size:.7rem}
.plot-alert{position:absolute;right:3px;top:3px;font-size:1rem}
.scene-footer{text-align:center;font-size:1.9rem}
.farm-controls{display:grid;gap:14px}
.panel-tabs{display:flex;gap:6px}
.panel-tabs button{flex:1;border:2px solid #74a65d;border-radius:10px;background:#fffdf0;color:#315b39;padding:8px 5px;font-weight:850}
.panel-tabs button.active{background:#d8f1a9;border-color:#3d8451}
.tool-card,.shop-card{border:3px solid #8eb471;border-radius:18px;padding:16px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3}
.visit-card{border:3px solid #8eb471;border-radius:18px;padding:16px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3}
.visit-card h2{margin:0 0 7px;color:#326341;font-size:1.15rem}
.visit-card-heading{display:flex;justify-content:space-between;align-items:center;gap:8px}
.visit-card-heading button{border:1px solid #418151;border-radius:8px;background:#fff;padding:4px 7px;color:#245338;font-size:.73rem;font-weight:800}
.friend-picker{display:flex;gap:6px}
.friend-picker select{min-width:0;flex:1;border:2px solid #9bbc7c;border-radius:9px;background:#fff;padding:9px}
.friend-picker button,.visit-heading button,.visit-actions button{border:2px solid #418151;border-radius:10px;background:#e2f3bb;padding:8px;color:#245338;font-size:.82rem;font-weight:800}
.visit-heading{display:flex;justify-content:space-between;align-items:center;gap:7px;margin-top:12px}
.visit-target{margin:8px 0;font-size:.85rem}
.visit-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.visit-card .help{font-size:.74rem;line-height:1.45}
.visit-warning{border:2px solid #c78e42;border-radius:8px;background:#fff3d8;padding:8px;font-size:.78rem}
.visit-log{border-top:1px dashed #adcaa0;margin-top:10px;padding-top:8px;font-size:.74rem}
.visit-log p{margin:3px 0}
.tool-card h2,.shop-card h2{margin:0 0 6px;color:#326341;font-size:1.15rem}
.tool-card p{margin:5px 0 10px}
.tool-card label{display:block;font-size:.78rem;font-weight:800;margin:9px 0 4px}
.tool-card select{width:100%;padding:9px;border:2px solid #9bbc7c;border-radius:9px;background:#fff}
.tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:12px 0}
.tool-grid button,.shop-row button{border:2px solid #418151;border-radius:10px;background:#e2f3bb;padding:9px 5px;color:#245338;font-size:.83rem;font-weight:800}
.farm-page button:disabled{opacity:.45;cursor:not-allowed}
.tool-card .help{font-size:.78rem;line-height:1.5;color:#607460}
.shop-row{display:flex;justify-content:space-between;gap:8px;align-items:center;border-top:1px dashed #b6cba6;padding:9px 0}
.shop-row>div:first-child{display:grid;gap:2px}
.shop-row small{font-size:.72rem;color:#6d7862}
.shop-row>div:last-child{display:flex;flex-direction:column;gap:5px;flex-shrink:0}
.shop-row button{padding:5px 8px}
.expand{width:100%;margin-top:8px}
.start-help{text-align:center;padding:28px}
.quiz-shade{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:14px;background:#153c28ae}
.quiz-card{width:min(100%,490px);max-height:calc(100vh - 30px);overflow:auto;border:4px solid #7da859;border-radius:22px;background:#fffdf1;box-shadow:0 14px 0 #34512b;padding:24px}
.quiz-card h2{margin:5px 0 15px}
.quiz-prompt{font-size:1.15rem;font-weight:800}
.quiz-error{border:2px solid #c45144;border-radius:9px;padding:9px;background:#fff0eb;color:#9b3028}
.choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.choices button{border:2px solid #a4bd85;border-radius:11px;background:#fff;padding:13px 8px;color:#263f28;font-weight:800}
.choices button.picked{background:#e1f5b1;border-color:#4c8a42}
.write-answer strong{display:block;font-size:1.8rem;letter-spacing:.15em;margin:10px 0}
.write-answer input{width:100%;box-sizing:border-box;padding:12px;border:2px solid #9fbc82;border-radius:10px}
.quiz-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}
.quiz-actions button:last-child{background:#d9ef9f}
.quiz-actions .cancel{background:#fff}
@media(max-width:850px){.farm-layout{grid-template-columns:1fr}.farm-field{min-height:0}.field-grid{max-width:580px}.farm-controls{display:flex;flex-direction:column}.status-bar a{margin-left:0}}
@media(max-width:620px){.farm-page{padding:12px 9px 25px}.farm-header{align-items:flex-start}.farm-header h1{font-size:1.5rem}.farm-top-actions{justify-content:flex-end}.farm-top-actions button{font-size:.74rem;padding:7px}.farm-controls{grid-template-columns:1fr}.farm-field{border-width:2px}.field-grid{gap:6px;margin:14px auto;padding:0 8px}.plot{min-height:76px;border-width:2px;border-radius:9px}.plot-plant{font-size:1.65rem}.plot-name,.plot-progress{font-size:.63rem}.plot-alert{font-size:.78rem}.scene-footer{font-size:1.4rem}.status-bar{gap:6px}.status-bar>div,.status-bar>a{font-size:.75rem;padding:7px}.choices{grid-template-columns:1fr}}
@media(min-width:900px) and (min-height:560px){
  .farm-page{box-sizing:border-box;height:100dvh;min-height:0;overflow:hidden;display:flex;flex-direction:column;padding:8px 16px}
  .farm-header{width:100%;flex:none}.farm-header h1{font-size:1.55rem;margin:0}.farm-header .eyebrow{font-size:.6rem}.farm-header p{font-size:.78rem}
  .feedback{width:100%;flex:none;margin:5px auto}.feedback .notice,.feedback .save-notice{padding:6px 10px;font-size:.78rem}
  .status-bar{width:100%;flex:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) auto auto;gap:6px;margin:0 auto 7px}
  .status-bar>div,.status-bar>a{padding:5px 7px;min-width:0;font-size:.7rem;box-shadow:none}
  .status-bar a{margin-left:0;white-space:nowrap}
  .farm-layout{width:100%;height:0;flex:1;min-height:0;margin:0 auto;grid-template-columns:minmax(0,1.5fr) minmax(320px,.9fr);gap:10px}
  .farm-field{box-sizing:border-box;min-height:0;height:100%;display:flex;flex-direction:column;box-shadow:none}
  .scene-sky{height:35px;flex:none;font-size:1.45rem}
  .farm-barn{flex:none;margin:5px auto;padding:4px 12px;font-size:1.15rem;box-shadow:0 3px #a37a48}
  .farm-barn span{font-size:.78rem}
  .field-grid{box-sizing:border-box;width:min(100%,680px);max-width:none;min-height:0;flex:1;grid-auto-rows:minmax(0,1fr);gap:6px;margin:5px auto;padding:0 10px}
  .plot{min-height:0;border-width:2px;box-shadow:0 3px #6d492d}.plot-plant{font-size:clamp(1.35rem,3vh,2rem)}
  .plot-name,.plot-progress{font-size:.65rem}.scene-footer{flex:none;font-size:1.25rem;line-height:1.3}
  .farm-controls{display:flex;flex-direction:column;min-height:0;height:100%;gap:7px}
  .panel-tabs{flex:none}.panel-tabs button{padding:5px 3px;font-size:.78rem}
  .tool-card,.shop-card,.visit-card{box-sizing:border-box;flex:1;min-height:0;overflow:hidden;padding:10px;box-shadow:none}
  .tool-card h2,.shop-card h2,.visit-card h2{font-size:.98rem}
  .tool-card p{margin:3px 0}.tool-card label{margin:5px 0 3px}.tool-card select{padding:6px}
  .tool-grid{margin:7px 0;gap:5px}.tool-grid button{padding:7px 3px;font-size:.75rem}
  .shop-row{padding:5px 0}.shop-row small{font-size:.66rem}.shop-row button{padding:3px 6px}
  .visit-heading{margin-top:7px}.visit-target{margin:4px 0}.visit-actions{gap:5px}
  .visit-actions button{padding:5px}.visit-card .help{margin:6px 0}
  .visit-log{margin-top:6px;padding-top:5px}.visit-log p{margin:2px 0}
}
.land-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;min-height:0;padding:4px 10px 12px;box-sizing:border-box}
.map-panel,.village-field{min-width:0;min-height:0;display:flex;flex-direction:column}
.map-heading,.village-heading{display:flex;justify-content:space-between;align-items:center;gap:6px;margin:0 0 4px;padding:4px 7px;border-radius:8px;background:#ecf8cd;color:#285d38;font-size:.78rem}
.village-heading{background:#fff3c7}
.map-heading span,.village-heading span{font-size:.7rem}
.village-map{display:block;min-height:0;max-height:295px;width:100%;flex:1;overflow:visible;filter:drop-shadow(0 3px 2px #2e663e58)}
.village-shape{fill:#b6d39c;stroke:#fff9df;stroke-width:2;cursor:pointer;transition:fill .16s}
.village-shape:hover,.village-shape:focus{fill:#f7d876;outline:none;stroke:#835e28;stroke-width:4}
.village-shape.owned{fill:#69b56c}.village-shape.home{fill:#3e9153}.village-shape.selected{fill:#f4c457;stroke:#613f26;stroke-width:6}
.district-outline{fill:none;stroke:#285b36;stroke-width:6;pointer-events:none}
.village-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;margin-top:4px}
.village-list button{min-width:0;border:1px solid #5c915e;border-radius:6px;background:#edf2d5;color:#25452c;font-size:.65rem;font-weight:800;padding:3px 1px;white-space:nowrap}
.village-list button.owned{background:#c1efb7}.village-list button.home{background:#82cb8b}.village-list button.selected{background:#ffe193;border:2px solid #8b5d28}
.map-source{margin-top:3px;color:#225744;text-align:center;font-size:.59rem}
.village-field{background:#d1ad80;border:2px solid #a57548;border-radius:12px;padding:5px;box-sizing:border-box}
.village-field .field-grid{width:100%;max-width:325px;min-height:0;margin:0 auto;padding:2px;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));gap:6px;transform:none}
.village-field .plot{min-height:64px;max-height:80px;padding:3px 1px;box-sizing:border-box}
.village-field .plot-plant{flex:none}
.village-field .plot-name,.village-field .plot-progress{line-height:1.1}
.plot-care{position:absolute;bottom:2px;left:2px;right:2px;display:flex;justify-content:center;gap:2px;line-height:1}
.plot-care span{padding:1px;border-radius:3px;background:#fffaf0d9;color:#526759;font-size:.56rem;text-shadow:none}
.plot-care span.done{background:#b9f2bd;color:#174a27}.plot-care span.urgent{background:#ffdda0;color:#8b311a;font-weight:900}
.village-field .plot-progress{padding-bottom:11px}
.action-pop{position:absolute;inset:10% 0;display:grid;place-items:center;font-size:2rem;pointer-events:none;animation:action-pop 1.6s ease-out both;text-shadow:0 2px #fff}
@keyframes action-pop{from{opacity:0;transform:translateY(12px) scale(.6)}25%{opacity:1;transform:translateY(-5px) scale(1.2)}to{opacity:0;transform:translateY(-24px) scale(1)}}
.care-detail{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:5px 0}
.care-detail span{display:block;border:1px solid #bacbb0;border-radius:6px;background:#f3f2e5;padding:3px 5px;font-size:.72rem;font-weight:800;color:#597059}
.care-detail span.done{background:#d9f2c9;color:#23603a}.care-detail span.urgent{background:#ffdfac;border-color:#cc8c4b;color:#8c391c}
.district-picker{display:flex;align-items:center;gap:5px;margin:2px 0;font-size:.7rem;font-weight:800}
.district-picker select,.neighbor-village-picker{min-width:0;flex:1;border:1px solid #618b5f;border-radius:6px;background:#fffdf0;color:#245338;padding:3px;font-size:.7rem}
.unlock-hint{margin:2px 0;padding:3px 6px;border-radius:6px;background:#e9f4d0;color:#2f5a39;font-size:.67rem;font-weight:800;text-align:center}
.neighbor-village-picker{flex:none;width:100%;margin-top:5px;font-size:.79rem;padding:6px}
.shop-card{display:flex;flex-direction:column}
.shop-card h2 small{display:block;font-size:.62rem;color:#50705a}
.shop-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;min-height:0;flex:1;overflow:auto;align-content:start}
.shop-list .shop-row{display:block;min-width:0;border:1px solid #b6cba6;border-radius:7px;padding:3px 5px;background:#fbffe9}
.shop-list .shop-row>div:first-child{gap:0}.shop-list .shop-row>div:last-child{flex-direction:row;gap:3px;margin-top:2px}
.shop-list .shop-row small{font-size:.59rem;white-space:nowrap}
.shop-list .shop-row button{flex:1;padding:2px;font-size:.62rem}
.shop-card .expand{flex:none;padding:5px;margin-top:5px;font-size:.75rem}
.unowned-land{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:#fff5da;border:2px dashed #a8814e;border-radius:12px;padding:15px;color:#654a2a}
.unowned-land span{font-size:2rem}.unowned-land p{max-width:260px;font-size:.8rem}
.land-buy-card{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 8px;border:2px solid #8eb471;border-radius:10px;background:#fff5d2;font-size:.75rem}
.land-buy-card span{flex:1}.land-buy-card button{border:1px solid #418151;border-radius:7px;background:#d8ecac;color:#245338;padding:5px;font-weight:800}
@media(min-width:900px) and (min-height:560px){
  .land-layout{flex:1;height:0;overflow:hidden;padding:2px 8px 8px}
  .village-map{max-height:none;height:0}
  .village-field .field-grid{flex:1;height:0;grid-auto-rows:minmax(0,1fr)}
  .village-field .plot{max-height:none;min-height:0}
  .village-field .plot-plant{width:clamp(28px,5vh,42px);height:clamp(28px,5vh,42px)}
}
@media(max-width:899px){.farm-field{min-height:0}.village-map{height:300px;flex:none}.land-layout{padding-bottom:12px}}
@media(max-width:620px){
  .land-layout{grid-template-columns:1fr;gap:10px}
  .village-map{height:265px;max-height:265px}
  .village-list button{font-size:.7rem;padding:5px 1px}
  .village-field .field-grid{max-width:400px;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:5px auto}
  .village-field .plot{min-height:78px;max-height:none}
  .shop-list{grid-template-columns:1fr 1fr}
  .shop-list .shop-row small{white-space:normal}
}
@media(max-width:360px){.village-list button{font-size:.62rem}}
@media(min-width:1500px) and (min-height:850px){
  .farm-page{padding:14px clamp(22px,2vw,40px) 18px}
  .farm-header,.feedback,.status-bar,.farm-layout{max-width:none}
  .farm-header h1{font-size:2rem}
  .farm-header p{font-size:.9rem}
  .farm-header .eyebrow{font-size:.72rem}
  .feedback{margin:8px auto}
  .feedback .notice,.feedback .save-notice{padding:9px 13px;font-size:.9rem}
  .status-bar{gap:10px;margin-bottom:12px}
  .status-bar>div,.status-bar>a{padding:9px 11px;font-size:.88rem}
  .farm-layout{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:18px}
  .scene-sky{height:45px;font-size:1.75rem}
  .farm-barn{margin:8px auto;padding:7px 16px;font-size:1.4rem}
  .farm-barn span{font-size:1rem}
  .land-layout{gap:16px;padding:8px 16px 16px}
  .map-heading,.village-heading{padding:8px 10px;font-size:1rem}
  .village-heading strong{font-size:1.1rem}
  .map-heading span,.village-heading span{font-size:.86rem}
  .district-picker{gap:9px;margin:6px 0;font-size:.9rem}
  .district-picker select,.neighbor-village-picker{padding:7px;font-size:.9rem}
  .unlock-hint{margin:4px 0;padding:7px;font-size:.82rem}
  .village-list{gap:6px;margin-top:8px}
  .village-list button{padding:7px 3px;font-size:.88rem}
  .map-source{margin-top:7px;font-size:.75rem}
  .village-field{padding:10px}
  .village-field .field-grid{max-width:560px;gap:9px;padding:4px}
  .village-field .plot{padding:8px 4px;border-width:3px}
  .village-field .plot-plant{width:clamp(44px,6vh,64px);height:clamp(44px,6vh,64px)}
  .plot-number{font-size:.84rem}
  .village-field .plot-name{font-size:1.05rem;line-height:1.25}
  .village-field .plot-progress{font-size:.86rem;line-height:1.2;padding-bottom:17px}
  .plot-care{bottom:5px;gap:4px}
  .plot-care span{padding:2px 3px;font-size:.75rem}
  .plot-alert{font-size:1.25rem}
  .farm-controls{gap:12px}
  .panel-tabs button{padding:9px 5px;font-size:.95rem}
  .tool-card,.shop-card,.visit-card{padding:18px}
  .tool-card h2,.shop-card h2,.visit-card h2{font-size:1.2rem}
  .tool-card p,.visit-card p{font-size:.95rem}
  .tool-card label{font-size:.9rem}
  .tool-card select{padding:9px;font-size:.95rem}
  .tool-grid{gap:9px;margin:14px 0}
  .tool-grid button{padding:11px 5px;font-size:.95rem}
  .tool-card .help,.visit-card .help{font-size:.86rem}
  .care-detail span{padding:6px 8px;font-size:.85rem}
  .shop-card h2 small{font-size:.85rem}
  .shop-list{gap:9px}
  .shop-list .shop-row{padding:8px}
  .shop-list .shop-row strong{font-size:.98rem}
  .shop-list .shop-row small{font-size:.78rem;white-space:normal}
  .shop-list .shop-row button{padding:7px 4px;font-size:.84rem}
  .shop-card .expand{padding:9px;font-size:.9rem}
  .land-buy-card{padding:10px;font-size:.9rem}
  .land-buy-card button{padding:8px;font-size:.88rem}
  .visit-actions button,.friend-picker button{font-size:.9rem}
  .visit-log{font-size:.85rem}
}
@media(prefers-reduced-motion:reduce){.action-pop{animation:none}}
</style>
