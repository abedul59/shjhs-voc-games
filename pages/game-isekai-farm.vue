<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ISEKAI_CROPS, ISEKAI_GAME_TYPE, ISEKAI_REGIONS, applyIsekaiAction, cropById, freshIsekaiFarm, isekaiActionError, normalizeIsekaiFarm } from '~/lib/isekai-farm';

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
const farm = ref(freshIsekaiFarm());
const revision = ref(0);
const words = ref([]);
const loading = ref(true);
const busy = ref(false);
const notice = ref('正在翻開開拓日誌…');
const saveNotice = ref('');
const now = ref(Date.now());
const selectedPlot = ref(0);
const selectedCropId = ref('wheat');
const quiz = ref(null);
const answer = ref('');
const session = ref(null);
const sessionKey = computed(() => `isekai-farm-session:${studentId.value}:${lesson.version}:${lesson.volume}:${lesson.unit}`);
const activeRegion = computed(() => ISEKAI_REGIONS.find(region => region.id === farm.value.selectedRegion) || ISEKAI_REGIONS[0]);
const regionCrops = computed(() => ISEKAI_CROPS.filter(crop => crop.region === activeRegion.value.id));
const plots = computed(() => farm.value.plots[activeRegion.value.id] || []);
const selectedSite = computed(() => plots.value[selectedPlot.value]);
const totalProduce = computed(() => Object.values(farm.value.produce).reduce((sum, count) => sum + Number(count || 0), 0));
const currentScore = computed(() => (session.value?.correct.length || 0) * 10);
let clock;
let lastWordId = null;

function changeRegion(id) {
  if (!farm.value.unlockedRegions.includes(id)) return;
  farm.value.selectedRegion = id;
  selectedPlot.value = 0;
  selectedCropId.value = ISEKAI_CROPS.find(crop => crop.region === id)?.id || 'wheat';
}

function actionMessage(action) {
  if (action.type === 'unlock') return `開拓${ISEKAI_REGIONS.find(region => region.id === action.regionId)?.name}`;
  const crop = cropById(action.cropId || selectedSite.value?.cropId);
  return ({ buy: `購買${crop?.name || ''}種苗`, plant: `播種${crop?.name || ''}`, water: '為作物澆水', harvest: '收成作物', sell: `出售${crop?.name || ''}` })[action.type] || '農莊操作';
}

function can(action) {
  return !loading.value && !busy.value && !quiz.value && !isekaiActionError(farm.value, action, now.value);
}

function askAction(action) {
  if (busy.value || quiz.value) return;
  const error = isekaiActionError(farm.value, action, now.value);
  if (error) { notice.value = error; return; }
  if (!words.value.length) { notice.value = '本課單字尚未載入。'; return; }
  const candidates = words.value.filter(word => word.id !== lastWordId);
  const word = (candidates.length ? candidates : words.value)[Math.floor(Math.random() * (candidates.length || words.value.length))];
  lastWordId = word.id;
  const english = String(word.en_us).trim();
  const eligibleFill = /^[a-zA-Z]{3,}$/.test(english);
  const type = eligibleFill && Math.random() < .5 ? 'fill' : 'choice';
  const indices = type === 'fill' ? [...english].map((_, index) => index).sort(() => Math.random() - .5).slice(0, 2).sort((a, b) => a - b) : [];
  const options = type === 'choice'
    ? [english, ...words.filter(item => item.id !== word.id).sort(() => Math.random() - .5).slice(0, 3).map(item => item.en_us)].sort(() => Math.random() - .5)
    : [];
  quiz.value = { action, word, type, indices, options, title: actionMessage(action),
    masked: [...english].map((letter, index) => indices.includes(index) ? '＿' : letter).join(''),
    target: type === 'fill' ? indices.map(index => english[index]).join('').toLowerCase() : english.toLowerCase() };
  answer.value = '';
}

async function loadFarm() {
  const { data, error } = await db.from('isekai_farm_states').select('farm,revision').eq('student_id', studentId.value).maybeSingle();
  if (error) throw error;
  if (data) { farm.value = normalizeIsekaiFarm(data.farm); revision.value = data.revision; return; }
  const { data: created, error: createError } = await db.from('isekai_farm_states')
    .insert({ student_id: studentId.value, farm: freshIsekaiFarm() }).select('farm,revision').single();
  if (createError?.code === '23505') return loadFarm();
  if (createError) throw createError;
  farm.value = normalizeIsekaiFarm(created.farm);
  revision.value = created.revision;
}

async function saveFarm(next) {
  const { data, error } = await db.from('isekai_farm_states')
    .update({ farm: next, revision: revision.value + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', revision.value).select('revision').maybeSingle();
  if (error) throw error;
  if (!data) { await loadFarm(); throw new Error('另一個分頁已更新農莊，請重新操作。'); }
  farm.value = next;
  revision.value = data.revision;
}

function rememberSession() {
  try { sessionStorage.setItem(sessionKey.value, JSON.stringify(session.value)); }
  catch { saveNotice.value = '本機暫存不可用；請保持頁面開啟直到成績同步。'; }
}

async function syncRecord() {
  const entry = session.value;
  if (!entry || !(entry.correct.length + entry.wrong.length)) return;
  const { error } = await db.from('game_records').upsert([{
    id: entry.id, student_id: studentId.value, game_type: ISEKAI_GAME_TYPE,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: entry.correct.length * 10, mistakes: entry.wrong.length,
    correct_words: entry.correct.join(', '), wrong_words: entry.wrong.join(', '),
    attempt_number: entry.attemptNumber, played_at: new Date(entry.startedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - entry.startedAt) / 1000),
    device_info: navigator.userAgent
  }], { onConflict: 'id' });
  saveNotice.value = error ? `成績尚未同步：${error.message}。請按「重試同步」。` : '農莊進度與本次答題成績已同步。';
}

async function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey.value) || 'null');
    if (saved?.id && Array.isArray(saved.correct) && Array.isArray(saved.wrong) && Number.isFinite(saved.startedAt)) session.value = saved;
  } catch { /* Start a new record if browser storage is unavailable. */ }
  if (!session.value) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId.value).eq('game_type', ISEKAI_GAME_TYPE)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    session.value = { id: crypto.randomUUID(), startedAt: Date.now(), correct: [], wrong: [], attemptNumber: (count || 0) + 1 };
    rememberSession();
  } else await syncRecord();
}

async function submitAnswer() {
  if (!quiz.value || busy.value || !answer.value.trim()) return;
  busy.value = true;
  const question = quiz.value;
  const correct = answer.value.trim().toLowerCase() === question.target;
  try {
    let detail = '';
    if (correct) {
      const result = applyIsekaiAction(farm.value, question.action, Date.now());
      await saveFarm(result.farm);
      detail = result.detail;
      session.value.correct.push(question.word.en_us);
    } else session.value.wrong.push(question.word.en_us);
    rememberSession();
    await syncRecord();
    notice.value = correct ? `答對 ${question.word.en_us}！${detail}。` : `答錯了：${question.word.en_us}＝${question.word.zh_tw}。這次未執行操作。`;
    quiz.value = null;
    now.value = Date.now();
  } catch (error) {
    notice.value = `操作未完成：${error.message}`;
  } finally { busy.value = false; }
}

async function leaveFarm() {
  if (busy.value || quiz.value) return;
  busy.value = true;
  try {
    await syncRecord();
    if (saveNotice.value.startsWith('成績尚未同步')) return;
    try { sessionStorage.removeItem(sessionKey.value); } catch { /* Browser storage may be unavailable. */ }
    await navigateTo('/');
  } finally { busy.value = false; }
}

function remaining(plot) {
  const seconds = Math.ceil(Math.max(0, plot.readyAt - now.value) / 1000);
  if (seconds <= 0) return '可以收成';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

onMounted(async () => {
  clock = window.setInterval(() => { now.value = Date.now(); }, 1000);
  if (!studentId.value) { notice.value = '請先從首頁登入學生帳號。'; loading.value = false; return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) { notice.value = '請從首頁選擇版本、冊數與單元。'; loading.value = false; return; }
  try {
    const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
    if (error) throw error;
    words.value = (data || []).filter(word => String(word.en_us || '').trim() && String(word.zh_tw || '').trim());
    if (words.value.length < 2) { notice.value = '這個單元至少需要兩筆中英對照單字。'; return; }
    await loadFarm();
    changeRegion(farm.value.selectedRegion);
    await loadSession();
    notice.value = '選擇田地與操作，答對單字就能執行。收成後可出售，累積資金開拓北方與南方。';
  } catch (error) { notice.value = `農莊無法載入：${error.message}。請確認已在此站 Supabase 執行異世界農莊 SQL。`; }
  finally { loading.value = false; }
});
onUnmounted(() => { if (clock) window.clearInterval(clock); });
</script>

<template>
  <main class="isekai-page">
    <header class="isekai-header">
      <div><span class="eyebrow">THE CHRONICLE OF A NEW HOMESTEAD</span><h1>單字異世界悠閒農莊</h1><p>{{ lessonLabel }} · 獨立冒險存檔</p></div>
      <nav><NuxtLink :to="{ path: '/history', query: { game: ISEKAI_GAME_TYPE } }">學習紀錄</NuxtLink><NuxtLink :to="{ path: '/leaderboard', query: { game: ISEKAI_GAME_TYPE, ...lesson } }">英雄榜</NuxtLink><button @click="leaveFarm" :disabled="busy || !!quiz">返回遊戲選單</button></nav>
    </header>
    <div class="notice" role="status">{{ notice }} <button v-if="saveNotice.startsWith('成績尚未同步')" @click="syncRecord">重試同步</button></div>
    <div class="isekai-layout">
      <section class="atlas panel" aria-label="中央大陸地圖">
        <div class="section-heading"><span>01 · 大陸圖誌</span><strong>中央大陸</strong></div>
        <div class="map-frame">
          <img src="/maps/central-continent.svg" alt="以北方雪原、西部平原與南方狹長谷地構成的中央大陸輪廓" />
          <button v-for="region in ISEKAI_REGIONS" :key="region.id" class="map-marker" :class="{ active: activeRegion.id === region.id, locked: !farm.unlockedRegions.includes(region.id) }" :style="{ left: `${region.x / 8}%`, top: `${region.y / 9}%` }" @click="changeRegion(region.id)" :title="region.name">
            <span class="marker-dot">{{ farm.unlockedRegions.includes(region.id) ? '✧' : '◆' }}</span><span class="marker-name">{{ region.name.replace('中央大陸', '') }}</span>
          </button>
        </div>
        <p class="map-note">依公開世界設定繪製的遊戲示意輪廓；非官方地圖。</p>
        <div class="region-list">
          <div v-for="region in ISEKAI_REGIONS" :key="region.id" class="region-row" :class="{ selected: activeRegion.id === region.id }">
            <button v-if="farm.unlockedRegions.includes(region.id)" @click="changeRegion(region.id)"><b>{{ region.name }}</b><small>{{ region.subtitle }}</small></button>
            <div v-else><b>{{ region.name }}</b><small>收成 3 次後可解鎖 · {{ region.cost }} 金幣</small></div>
            <button v-if="!farm.unlockedRegions.includes(region.id)" class="unlock" :disabled="!can({ type: 'unlock', regionId: region.id })" @click="askAction({ type: 'unlock', regionId: region.id })">開拓</button>
          </div>
        </div>
      </section>

      <section class="homestead panel" aria-label="農莊">
        <div class="section-heading"><span>02 · 領地經營</span><strong>{{ activeRegion.name }}</strong></div>
        <p class="region-description">{{ activeRegion.description }}</p>
        <div class="resource-bar"><span>◈ 金幣 <b>{{ farm.coins }}</b></span><span>✧ 聲望 <b>{{ farm.renown }}</b></span><span>收成 <b>{{ farm.harvested }}</b> 次</span><span>單字 <b>{{ currentScore }}</b> 分</span></div>
        <div class="field-scene"><div class="horizon"><span class="sun">✺</span><span class="hills hill-back"></span><span class="hills hill-front"></span></div>
          <div class="field-grid">
            <button v-for="(plot, index) in plots" :key="index" class="field-tile" :class="{ selected: selectedPlot === index, grown: plot && now >= plot.readyAt }" @click="selectedPlot = index">
              <span class="tile-index">田地 {{ index + 1 }}</span><span v-if="plot" class="crop-glyph" :style="{ color: cropById(plot.cropId)?.color }">{{ cropById(plot.cropId)?.symbol }}</span><span v-else class="empty-glyph">＋</span>
              <strong>{{ plot ? cropById(plot.cropId)?.name : '尚未播種' }}</strong><small>{{ plot ? remaining(plot) : '等待開墾' }}</small>
            </button>
          </div>
        </div>
        <div class="workbench">
          <div class="work-title"><strong>第 {{ selectedPlot + 1 }} 塊田</strong><span>{{ selectedSite ? cropById(selectedSite.cropId)?.name : '空地' }}</span></div>
          <div class="crop-picker"><button v-for="crop in regionCrops" :key="crop.id" :class="{ chosen: selectedCropId === crop.id }" @click="selectedCropId = crop.id"><span :style="{ color: crop.color }">{{ crop.symbol }}</span> {{ crop.name }} <small>種苗 {{ farm.seeds[crop.id] || 0 }}</small></button></div>
          <div class="action-grid">
            <button :disabled="!can({ type: 'buy', regionId: activeRegion.id, cropId: selectedCropId })" @click="askAction({ type: 'buy', regionId: activeRegion.id, cropId: selectedCropId })">購買種苗 <small>{{ cropById(selectedCropId)?.seed }} 金幣</small></button>
            <button :disabled="!can({ type: 'plant', regionId: activeRegion.id, plotIndex: selectedPlot, cropId: selectedCropId })" @click="askAction({ type: 'plant', regionId: activeRegion.id, plotIndex: selectedPlot, cropId: selectedCropId })">播種</button>
            <button :disabled="!can({ type: 'water', regionId: activeRegion.id, plotIndex: selectedPlot })" @click="askAction({ type: 'water', regionId: activeRegion.id, plotIndex: selectedPlot })">澆水・催生</button>
            <button :disabled="!can({ type: 'harvest', regionId: activeRegion.id, plotIndex: selectedPlot })" @click="askAction({ type: 'harvest', regionId: activeRegion.id, plotIndex: selectedPlot })">收成</button>
          </div>
        </div>
      </section>

      <aside class="ledger panel"><div class="section-heading"><span>03 · 開拓日誌</span><strong>倉庫與交易</strong></div>
        <div class="stock-list"><div v-for="crop in ISEKAI_CROPS" :key="crop.id" class="stock-row" v-show="farm.unlockedRegions.includes(crop.region)"><span :style="{ color: crop.color }">{{ crop.symbol }}</span><div><b>{{ crop.name }}</b><small>售價 {{ crop.sale }} 金幣 / 份</small></div><strong>× {{ farm.produce[crop.id] || 0 }}</strong><button :disabled="!can({ type: 'sell', cropId: crop.id })" @click="askAction({ type: 'sell', cropId: crop.id })">出售</button></div></div>
        <p v-if="!totalProduce" class="empty-stock">收成的作物會存放在這裡。</p>
        <div class="journal"><h3>最近記事</h3><p v-for="(entry, index) in farm.journal" :key="index"><time>{{ new Date(entry.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }}</time>{{ entry.text }}</p></div>
        <small class="sync-note">{{ saveNotice || '每個動作答題後，農莊將自動儲存。' }}</small>
      </aside>
    </div>

    <div v-if="quiz" class="quiz-scrim"><section class="quiz-card" role="dialog" aria-modal="true" aria-labelledby="quiz-title"><span class="eyebrow">WORD MAGIC · 單字咒語</span><h2 id="quiz-title">{{ quiz.title }}</h2><p>「{{ quiz.word.zh_tw }}」的英文是什麼？</p>
      <div v-if="quiz.type === 'choice'" class="quiz-options"><button v-for="option in quiz.options" :key="option" :class="{ chosen: answer === option }" @click="answer = option">{{ option }}</button></div>
      <label v-else class="fill-answer">補上缺少的兩個字母 <strong>{{ quiz.masked }}</strong><input v-model="answer" maxlength="2" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="輸入兩個字母" @keyup.enter="submitAnswer" /></label>
      <div class="quiz-actions"><button @click="quiz = null; answer = ''" :disabled="busy">取消操作</button><button class="cast" @click="submitAnswer" :disabled="busy || !answer.trim()">{{ busy ? '保存中…' : '施放咒語' }}</button></div>
    </section></div>
  </main>
</template>

<style scoped>
.isekai-page{--ink:#f3e8cb;--muted:#b9baa8;min-height:100vh;background:radial-gradient(circle at 12% 4%,#465149,#1c302f 38%,#101d23 100%);color:var(--ink);padding:18px 24px 26px;font-family:Georgia,'Noto Serif TC','Songti TC',serif}.isekai-page *{box-sizing:border-box}.isekai-page button{font:inherit;cursor:pointer}.isekai-page button:disabled{opacity:.45;cursor:not-allowed}.isekai-header{display:flex;justify-content:space-between;gap:20px;align-items:center;min-height:84px;border-bottom:1px solid #bda77b80;margin-bottom:12px}.isekai-header h1{font-size:clamp(22px,2.1vw,34px);letter-spacing:.08em;margin:3px 0}.isekai-header p{margin:0 0 7px;color:var(--muted);font-size:13px}.eyebrow{font-size:10px;letter-spacing:.2em;color:#e1c281;font-weight:bold}.isekai-header nav{display:flex;gap:8px;flex-wrap:wrap}.isekai-header nav a,.isekai-header nav button{background:#13242c;color:#f2dfbb;text-decoration:none;border:1px solid #a68c5c;border-radius:5px;padding:9px 12px;font-size:13px}.notice{background:#d6bf8e;color:#26352f;padding:9px 14px;border-radius:5px;margin-bottom:12px;min-height:38px;font-size:14px}.notice button{background:#2d413e;color:white;border:0;border-radius:4px;margin-left:8px}.isekai-layout{display:grid;grid-template-columns:minmax(280px,.96fr) minmax(480px,1.54fr) minmax(270px,.9fr);gap:14px;height:calc(100vh - 166px);min-height:620px}.panel{min-height:0;background:linear-gradient(150deg,#1d3338e8,#14262de8);border:1px solid #a88e5b99;box-shadow:inset 0 0 0 4px #e9d5a010,0 7px 22px #06111680;border-radius:8px;padding:15px;overflow:auto}.section-heading{display:flex;justify-content:space-between;align-items:baseline;gap:8px;border-bottom:1px solid #af976780;padding-bottom:9px;margin-bottom:10px}.section-heading span{font-size:11px;color:#d5bd8f;letter-spacing:.14em}.section-heading strong{font-size:19px}.atlas{display:flex;flex-direction:column}.map-frame{position:relative;max-width:100%;flex:1;min-height:260px;overflow:hidden;background:#213941;border:1px solid #6d786c;border-radius:6px}.map-frame img{height:100%;width:100%;object-fit:contain}.map-marker{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;color:#fef4d8;display:flex;flex-direction:column;align-items:center;text-shadow:0 2px 3px #10211d;min-width:52px}.marker-dot{display:grid;place-items:center;width:29px;height:29px;background:#bb8345;border:2px solid #f4d49a;border-radius:50%;box-shadow:0 0 12px #f6d18b80}.map-marker.active .marker-dot{background:#496b59;box-shadow:0 0 0 4px #f5e5b674}.map-marker.locked .marker-dot{background:#626a69}.marker-name{font-size:12px;font-weight:bold;white-space:nowrap;background:#14272bbf;padding:1px 4px;border-radius:3px}.map-note{font-size:10px;color:#bcbba6;margin:6px 0 8px}.region-list{display:grid;gap:5px}.region-row{display:flex;align-items:center;gap:6px;border:1px solid #8f8160;background:#10262b8a;border-radius:5px;min-height:50px}.region-row.selected{border-color:#e3bf7b;background:#385044}.region-row>button:first-child,.region-row>div{flex:1;text-align:left;background:none;border:none;color:var(--ink);padding:6px 8px}.region-row b,.region-row small{display:block}.region-row b{font-size:12px}.region-row small{font-size:10px;color:#cad1bc}.region-row .unlock{margin-right:6px;padding:6px 9px;border:1px solid #d5b77d;border-radius:4px;background:#946c3c;color:#fff4d7;font-size:11px}.homestead{display:flex;flex-direction:column}.region-description{color:#c6c9b5;margin:0 0 10px;font-size:13px}.resource-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.resource-bar span{background:#bda4751f;border:1px solid #bda47564;border-radius:4px;text-align:center;padding:9px 4px;font-size:12px}.resource-bar b{font-size:17px;color:#f1d48c}.field-scene{position:relative;flex:1;min-height:260px;border:1px solid #997f50;border-radius:6px;overflow:hidden;background:linear-gradient(#344d51 0%,#688471 42%,#6a6448 43%,#554d37 100%);display:flex;align-items:flex-end}.horizon{position:absolute;inset:0;pointer-events:none}.sun{position:absolute;top:8%;right:14%;font-size:40px;color:#f8dfa1;text-shadow:0 0 30px #fff4bd}.hills{position:absolute;width:120%;height:45%;left:-10%;bottom:42%;background:#445f58;border-radius:50% 50% 0 0}.hill-front{left:29%;bottom:37%;height:34%;background:#3b564e}.field-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;padding:12px}.field-tile{height:clamp(96px,14vh,148px);min-width:0;border:2px solid #caa876;border-radius:7px;background:repeating-linear-gradient(155deg,#655039,#655039 10px,#735a3e 12px,#735a3e 22px);color:#fff1d7;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 8px 0 #332e28b3;text-shadow:0 2px 3px #251c17}.field-tile.selected{border-color:#f7df92;outline:3px solid #e8c67980}.field-tile.grown{background:repeating-linear-gradient(155deg,#496546,#496546 10px,#56754d 12px,#56754d 22px)}.tile-index{font-size:11px;color:#f6e4b9}.crop-glyph,.empty-glyph{font-size:clamp(30px,4vw,52px);line-height:1.2}.field-tile strong{font-size:13px}.field-tile small{font-size:11px}.workbench{margin-top:12px}.work-title{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:7px}.work-title span{color:#c6c2a5;font-size:12px}.crop-picker{display:flex;gap:6px}.crop-picker button{flex:1;background:#1d3937;border:1px solid #8d906e;color:#eee4c6;border-radius:4px;padding:8px;font-size:12px}.crop-picker button.chosen{border-color:#f5ce83;background:#4d5940}.crop-picker button>span{font-size:18px}.crop-picker small{display:block}.action-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.action-grid button{border:1px solid #dabd85;border-radius:4px;background:#866538;color:#fff5dc;min-height:43px;font-size:13px}.action-grid small{display:block;font-size:10px}.ledger{display:flex;flex-direction:column}.stock-list{display:grid;gap:5px}.stock-row{display:grid;grid-template-columns:22px 1fr auto auto;gap:6px;align-items:center;background:#bfa97f1a;border:1px solid #a98b5d55;border-radius:4px;padding:7px}.stock-row>span{font-size:20px}.stock-row b,.stock-row small{display:block}.stock-row b{font-size:12px}.stock-row small{font-size:10px;color:#bcbca8}.stock-row strong{font-size:12px}.stock-row button{border:1px solid #ba9e6b;background:#3b5c4d;color:#fff2cc;border-radius:4px;padding:5px;font-size:11px}.empty-stock{color:#bdbda8;font-size:12px}.journal{margin-top:10px;overflow:auto;flex:1;border-top:1px solid #bda47564}.journal h3{font-size:15px;margin:10px 0}.journal p{margin:0;border-bottom:1px solid #cbb28231;padding:7px 0;font-size:12px;line-height:1.4}.journal time{color:#d9bb80;margin-right:6px}.sync-note{display:block;color:#d4c59e;margin-top:10px;font-size:11px}.quiz-scrim{position:fixed;z-index:1000;inset:0;background:#06171ac9;display:grid;place-items:center;padding:16px}.quiz-card{width:min(450px,100%);background:linear-gradient(150deg,#efe2ba,#cdb582);color:#28342e;border:7px double #71583b;border-radius:9px;padding:26px;box-shadow:0 20px 80px #000a;text-align:center}.quiz-card .eyebrow{color:#71583b}.quiz-card h2{margin:5px 0 15px;font-size:25px}.quiz-card p{font-size:17px}.quiz-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.quiz-options button{border:1px solid #816b4b;border-radius:5px;background:#fff7dd;padding:12px;color:#29332f}.quiz-options button.chosen{background:#4c6957;color:white}.fill-answer{display:grid;gap:10px}.fill-answer strong{font-size:25px;letter-spacing:.15em}.fill-answer input{width:100%;padding:11px;border:1px solid #806749;border-radius:5px;text-align:center;font-size:17px}.quiz-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.quiz-actions button{border:1px solid #765c3d;border-radius:4px;background:#f6e7c6;color:#253930;padding:9px 15px}.quiz-actions .cast{background:#385d50;color:#fff4d5}
@media(max-width:1150px){.isekai-layout{grid-template-columns:minmax(270px,1fr) minmax(430px,1.5fr);height:auto;min-height:0}.ledger{grid-column:1/-1;max-height:270px}.stock-list{grid-template-columns:repeat(3,1fr)}.map-frame{height:520px;flex:none}}
@media(max-width:760px){.isekai-page{padding:10px}.isekai-header{display:block}.isekai-header nav{margin:10px 0}.isekai-layout{display:flex;flex-direction:column}.panel{overflow:visible}.atlas{order:1}.homestead{order:0}.ledger{order:2}.map-frame{height:430px}.field-scene{min-height:300px}.field-tile{height:94px}.stock-list{grid-template-columns:1fr 1fr}.resource-bar{grid-template-columns:repeat(2,1fr)}.action-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:440px){.stock-list{grid-template-columns:1fr}.map-frame{height:350px}.field-grid{gap:5px;padding:8px}.field-tile{height:86px}.field-tile strong{font-size:11px}.crop-picker button{font-size:11px;padding:5px}.quiz-options{grid-template-columns:1fr}}
.map-frame{flex:none;aspect-ratio:8 / 9;min-height:0;height:auto}
.map-frame img{display:block;object-fit:fill}
@media(max-width:1150px){.map-frame{height:auto}}
@media(max-width:760px){.map-frame{height:auto}}
@media(max-width:440px){.map-frame{height:auto}}
</style>
