<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  FARM_CROPS, FARM_FERTILIZER_COST, FARM_GAME_TYPE, FARM_MAX_PLOTS,
  applyFarmAction, cropById, farmActionError, freshFarm
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
const selectedCrop = ref('carrot');
const now = ref(Date.now());
const loading = ref(true), busy = ref(false), ready = ref(false);
const notice = ref('載入農場與單字中…'), saveNotice = ref('');
const quiz = ref(null), answer = ref(''), quizError = ref(''), session = ref(null);
let clock = null, lastWordId = null;

const crop = id => cropById(id);
const selected = computed(() => farm.value.plots[selectedPlot.value] || null);
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
const plotIcon = plot => {
  if (!plot) return '🟫';
  if (!secondsLeft(plot)) return crop(plot.crop)?.icon || '🌿';
  return now.value < plot.plantedAt + 20000 ? '🌱' : '🌿';
};
const plotWeeds = plot => plot && now.value >= plot.weedAt && !plot.weedRemoved;
const plotPests = plot => plot && now.value >= plot.pestAt && !plot.pestRemoved;
const can = (action, cropId = selectedCrop.value) =>
  ready.value && !busy.value && !quiz.value && !farmActionError(farm.value, action, cropId, selectedPlot.value, now.value);

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
    farm.value = data.farm;
    revision.value = data.revision;
    return;
  }
  const { data: created, error: createError } = await db.from('happy_farm_states')
    .insert({ student_id: studentId.value, farm: freshFarm() }).select('farm,revision').single();
  if (createError) throw createError;
  farm.value = created.farm;
  revision.value = created.revision;
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
    buy: '買一包' + name + '種子', plant: '種下' + name, water: '澆水', fertilize: '施肥',
    weed: '除草', pest: '除蟲', harvest: '收成', sell: '賣出全部' + name, expand: '擴建田地'
  }[action] || action;
}
function beginAction(action, cropId = selectedCrop.value) {
  if (!ready.value || busy.value || quiz.value) return;
  const problem = farmActionError(farm.value, action, cropId, selectedPlot.value, Date.now());
  if (problem) { notice.value = problem; return; }
  quiz.value = { ...buildQuiz(), action, cropId, plotIndex: selectedPlot.value, actionText: actionLabel(action, cropId) };
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
      const problem = farmActionError(farm.value, q.action, q.cropId, q.plotIndex, Date.now());
      if (problem) { notice.value = problem; quiz.value = null; return; }
      result = applyFarmAction(farm.value, q.action, q.cropId, q.plotIndex, Date.now());
      await saveFarm(result.farm);
    }
    if (correct) session.value.correct.push(q.word.en_us);
    else session.value.wrong.push(q.word.en_us);
    rememberSession();
    await syncRecord();
    notice.value = correct
      ? '答對 ' + q.word.en_us + '！已完成「' + q.actionText + '」' + (q.action === 'harvest' ? '，' + result.detail : '') + '。'
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
    ready.value = true;
    notice.value = '點選田地，再選擇操作；每次操作都要先答一題單字。';
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
    <p class="notice" role="status" aria-live="polite">{{ notice }}</p>
    <p v-if="saveNotice" class="save-notice" role="status">{{ saveNotice }} <button v-if="saveNotice.startsWith('成績尚未同步')" type="button" @click="syncRecord">重試同步</button></p>
    <template v-if="ready">
      <section class="status-bar" aria-label="農場狀態">
        <div><span>🪙 金幣</span><strong>{{ farm.coins }}</strong></div>
        <div><span>🌾 累計收成</span><strong>{{ farm.harvested }}</strong></div>
        <div><span>🎒 倉庫作物</span><strong>{{ totalProduce }}</strong></div>
        <div><span>📖 本次答題</span><strong>{{ session?.correct.length || 0 }} 對／{{ session?.wrong.length || 0 }} 錯</strong></div>
        <NuxtLink :to="{ path: '/leaderboard', query: { game: '單字開心農場', version: lesson.version, volume: lesson.volume, unit: lesson.unit } }">🏆 英雄榜</NuxtLink>
        <NuxtLink :to="{ path: '/history', query: { game: '單字開心農場' } }">📊 學習紀錄</NuxtLink>
      </section>
      <div class="farm-layout">
        <section class="farm-field" aria-label="我的農地">
          <div class="scene-sky"><span>☀️</span><span>☁️</span><span>🐦</span></div>
          <div class="farm-barn">🏠 <span>我的小農舍</span></div>
          <div class="field-grid">
            <button v-for="(plot, index) in farm.plots" :key="index" type="button" class="plot"
              :class="{ chosen: selectedPlot === index, mature: plot && !secondsLeft(plot) }"
              :aria-pressed="selectedPlot === index" :aria-label="'第 ' + (index + 1) + ' 塊田：' + (plot ? crop(plot.crop)?.name + plotStage(plot) : '空地')"
              @click="selectedPlot = index">
              <span class="plot-number">{{ index + 1 }}</span><span class="plot-plant">{{ plotIcon(plot) }}</span>
              <span class="plot-name">{{ plot ? crop(plot.crop)?.name : '空地' }}</span>
              <span class="plot-progress">{{ plot ? timeLabel(plot) : '可播種' }}</span>
              <span class="plot-alert">{{ plotWeeds(plot) ? '🌾' : '' }}{{ plotPests(plot) ? '🐛' : '' }}</span>
            </button>
            <div v-for="n in FARM_MAX_PLOTS - farm.plots.length" :key="'locked-' + n" class="plot locked"><span>🔒</span><small>待擴建</small></div>
          </div>
          <div class="scene-footer">🌳　🌼　🌳　🌼　🌳　🌼　🌳</div>
        </section>
        <aside class="farm-controls">
          <section class="tool-card">
            <h2>🧤 第 {{ selectedPlot + 1 }} 塊田</h2>
            <p>{{ selected ? crop(selected.crop)?.name + ' · ' + plotStage(selected) : '空地 · 選擇種子後即可播種' }}</p>
            <label for="crop-select">目前種子</label>
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
          <section class="shop-card">
            <h2>🛒 種子店與倉庫</h2>
            <div v-for="item in FARM_CROPS" :key="item.id" class="shop-row">
              <div><strong>{{ item.icon }} {{ item.name }}</strong><small>{{ item.growMinutes }} 分鐘成熟 · 種子 {{ item.seed }} 金幣 · 售價 {{ item.sale }} 金幣/個</small><small>種子 {{ farm.seeds[item.id] || 0 }} · 庫存 {{ farm.produce[item.id] || 0 }}</small></div>
              <div><button type="button" :disabled="!can('buy', item.id)" @click="beginAction('buy', item.id)">買種子</button><button type="button" :disabled="!can('sell', item.id)" @click="beginAction('sell', item.id)">賣作物</button></div>
            </div>
            <button class="expand" type="button" :disabled="!can('expand')" @click="beginAction('expand')">🪵 擴建一塊田 · {{ 100 + farm.plots.length * 30 }} 金幣</button>
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
.notice,.save-notice{max-width:1320px;margin:12px auto;padding:10px 14px;border:2px solid #7da96b;border-radius:12px;background:#fffdf0;font-weight:700}
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
.tool-card,.shop-card{border:3px solid #8eb471;border-radius:18px;padding:16px;background:#fffdf0;box-shadow:0 6px 0 #bdd6a3}
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
@media(max-width:850px){.farm-layout{grid-template-columns:1fr}.farm-field{min-height:0}.field-grid{max-width:580px}.farm-controls{grid-template-columns:1fr 1fr}.status-bar a{margin-left:0}}
@media(max-width:620px){.farm-page{padding:12px 9px 25px}.farm-header{align-items:flex-start}.farm-header h1{font-size:1.5rem}.farm-top-actions{justify-content:flex-end}.farm-top-actions button{font-size:.74rem;padding:7px}.farm-controls{grid-template-columns:1fr}.farm-field{border-width:2px}.field-grid{gap:6px;margin:14px auto;padding:0 8px}.plot{min-height:76px;border-width:2px;border-radius:9px}.plot-plant{font-size:1.65rem}.plot-name,.plot-progress{font-size:.63rem}.plot-alert{font-size:.78rem}.scene-footer{font-size:1.4rem}.status-bar{gap:6px}.status-bar>div,.status-bar>a{font-size:.75rem;padding:7px}.choices{grid-template-columns:1fr}}
</style>
