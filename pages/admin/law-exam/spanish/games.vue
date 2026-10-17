<script setup>
import { computed, onMounted, ref } from 'vue';
import { createDefaultSpanishProgress, spanishVocabulary } from '~/lib/spanish-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const progressApi = useSpanishProgress();
const progress = ref(createDefaultSpanishProgress());
const levels = ['全部', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const modes = [
  { id: 'choice', engine: 'choice', rounds: 10, icon: '🎯', title: '看西語選中文', text: '快速建立詞義連結' },
  { id: 'reverse', engine: 'reverse', rounds: 10, icon: '🔄', title: '看中文選西語', text: '反向提取西語詞形' },
  { id: 'listen', engine: 'listen', rounds: 10, icon: '🎧', title: '聽音選詞義', text: '使用西班牙語語音辨音' },
  { id: 'spell', engine: 'spell', rounds: 10, icon: '⌨️', title: '中文拼西語', text: '強化拼字與重音符號' },
  { id: 'dictation', engine: 'dictation', rounds: 10, icon: '🎙️', title: '西語聽寫', text: '只聽發音完成拼字' },
  { id: 'match-six', engine: 'match', pairs: 6, icon: '🧩', title: '經典翻牌 6 組', text: '配對西語與中文卡片' },
  { id: 'match-four', engine: 'match', pairs: 4, icon: '🌱', title: '入門翻牌 4 組', text: '較少卡片熟悉規則' },
  { id: 'match-eight', engine: 'match', pairs: 8, icon: '🧠', title: '進階翻牌 8 組', text: '挑戰工作記憶容量' },
  { id: 'flash', engine: 'flash', rounds: 10, icon: '🃏', title: '單字閃卡 10', text: '自行判斷熟悉程度' },
  { id: 'flash-long', engine: 'flash', rounds: 20, icon: '📚', title: '深度閃卡 20', text: '較長回合集中複習' },
  { id: 'a1-sprint', engine: 'choice', rounds: 10, levels: ['A1'], icon: '🚲', title: 'A1 生存衝刺', text: '鎖定初學高頻詞彙' },
  { id: 'a2-sprint', engine: 'reverse', rounds: 10, levels: ['A2'], icon: '🚌', title: 'A2 日常挑戰', text: '反向練習生活用語' },
  { id: 'b1-listen', engine: 'listen', rounds: 15, levels: ['B1'], icon: '🗣️', title: 'B1 聽力闖關', text: '15 題獨立溝通詞彙' },
  { id: 'b2-choice', engine: 'choice', rounds: 15, levels: ['B2'], icon: '📰', title: 'B2 新聞詞彙', text: '15 題進階抽象概念' },
  { id: 'c-mastery', engine: 'spell', rounds: 15, levels: ['C1', 'C2'], icon: '🏆', title: 'C1／C2 精準拼字', text: '挑戰高階詞形與重音' },
  { id: 'verb-lab', engine: 'reverse', rounds: 15, theme: '動詞與情態搭配', icon: '⚙️', title: '動詞搭配實驗室', text: '練習 quiero、puedo、debo' },
  { id: 'noun-lab', engine: 'choice', rounds: 15, theme: '名詞與介系詞搭配', icon: '🔗', title: '名詞搭配工坊', text: '練習 sobre、sin 等搭配' },
  { id: 'mixed-twenty', engine: 'choice', rounds: 20, icon: '🎲', title: '混合挑戰 20', text: '跨程度隨機抽題' },
  { id: 'listening-marathon', engine: 'listen', rounds: 30, icon: '🏃', title: '聽力馬拉松 30', text: '長回合建立辨音耐力' },
  { id: 'spelling-boss', engine: 'dictation', rounds: 20, icon: '👑', title: '終極聽寫王', text: '20 題不顯示中文提示' }
];
const mode = ref('choice');
const level = ref(levels.includes(String(route.query.level)) ? String(route.query.level) : '全部');
const started = ref(false); const finished = ref(false); const questionIndex = ref(0); const score = ref(0); const questions = ref([]);
const options = ref([]); const locked = ref(false); const selected = ref(''); const spelling = ref(''); const revealed = ref(false);
const cards = ref([]); const firstCard = ref(null); const secondCard = ref(null); const matched = ref([]);
const activeMode = computed(() => modes.find(item => item.id === mode.value) || modes[0]);
const engine = computed(() => activeMode.value.engine);
const targetTotal = computed(() => engine.value === 'match' ? activeMode.value.pairs : activeMode.value.rounds);
const pool = computed(() => spanishVocabulary.filter(word => {
  const allowedLevels = activeMode.value.levels || (level.value === '全部' ? null : [level.value]);
  return (!allowedLevels || allowedLevels.includes(word.level)) && (!activeMode.value.theme || word.theme === activeMode.value.theme);
}));
const current = computed(() => questions.value[questionIndex.value]);
const accuracy = computed(() => progress.value.games.played ? Math.round(progress.value.games.correct / progress.value.games.played * 100) : 0);
const shuffle = values => [...values].sort(() => Math.random() - 0.5);
const normalize = value => value.trim().toLocaleLowerCase('es');

function speak(text) {
  if (!import.meta.client || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES'; utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}
function prepareQuestion() {
  selected.value = ''; spelling.value = ''; revealed.value = false; locked.value = false;
  if (!current.value) return;
  const wrong = shuffle(pool.value.filter(word => word.id !== current.value.id)).slice(0, 3);
  options.value = shuffle([current.value, ...wrong]);
  if (engine.value === 'listen' || engine.value === 'dictation') window.setTimeout(() => speak(current.value.es), 150);
}
function prepareMatch() {
  const words = shuffle(pool.value).slice(0, activeMode.value.pairs);
  cards.value = shuffle(words.flatMap(word => [{ key: `${word.id}-es`, pair: word.id, text: word.es, lang: 'es' }, { key: `${word.id}-zh`, pair: word.id, text: word.zh, lang: 'zh' }])).map((card, index) => ({ ...card, number: index + 1 }));
  firstCard.value = null; secondCard.value = null; matched.value = []; locked.value = false;
}
function start() {
  score.value = 0; questionIndex.value = 0; finished.value = false; started.value = true;
  if (engine.value === 'match') prepareMatch();
  else { questions.value = shuffle(pool.value).slice(0, activeMode.value.rounds); prepareQuestion(); }
}
async function finish(total = 10) {
  finished.value = true; started.value = false;
  const games = progress.value.games || createDefaultSpanishProgress().games;
  games.played += total; games.correct += score.value; games.best = Math.max(games.best, score.value);
  games.history = [{ mode: mode.value, level: level.value, score: score.value, total, at: new Date().toISOString() }, ...(games.history || [])].slice(0, 20);
  progress.value.games = games;
  try { await progressApi.saveProgress(progress.value); } catch { /* composable 顯示錯誤 */ }
}
function next(correct) {
  if (correct) score.value += 1;
  locked.value = true;
  window.setTimeout(() => {
    if (questionIndex.value >= questions.value.length - 1) finish(questions.value.length);
    else { questionIndex.value += 1; prepareQuestion(); }
  }, 500);
}
function choose(option) { if (!locked.value) { selected.value = option.id; next(option.id === current.value.id); } }
function submitSpelling() { if (!locked.value && spelling.value.trim()) next(normalize(spelling.value) === normalize(current.value.es)); }
function rateFlash(known) { if (!locked.value) next(known); }
function flip(card) {
  if (locked.value || matched.value.includes(card.pair) || firstCard.value?.key === card.key) return;
  if (!firstCard.value) { firstCard.value = card; if (card.lang === 'es') speak(card.text); return; }
  secondCard.value = card;
  if (firstCard.value.pair === card.pair) {
    matched.value.push(card.pair); score.value += 1; firstCard.value = null; secondCard.value = null;
    if (matched.value.length === activeMode.value.pairs) window.setTimeout(() => finish(activeMode.value.pairs), 400);
  } else {
    locked.value = true;
    window.setTimeout(() => { firstCard.value = null; secondCard.value = null; locked.value = false; }, 650);
  }
}
function cardVisible(card) { return matched.value.includes(card.pair) || firstCard.value?.key === card.key || secondCard.value?.key === card.key; }
onMounted(async () => { progress.value = await progressApi.loadProgress(); });
</script>

<template>
  <main class="game-page">
    <header><NuxtLink to="/admin/law-exam/spanish">← 回西班牙語課程</NuxtLink><p>PRIVATE SPANISH ARCADE</p><h1>西語單字遊戲室</h1><span>沿用前台英語遊戲的核心玩法，改為私人西班牙語詞庫與個人成績。</span></header>
    <section class="stats"><article><small>累計作答</small><b>{{ progress.games.played }}</b></article><article><small>總正確率</small><b>{{ accuracy }}%</b></article><article><small>單局最佳</small><b>{{ progress.games.best }}</b></article><article><small>詞庫規模</small><b>{{ spanishVocabulary.length }}</b></article></section>
    <section v-if="!started" class="setup">
      <div class="filters"><label>程度<select v-model="level"><option v-for="item in levels" :key="item">{{ item }}</option></select></label><span>20 種遊戲 · 目前可練習 {{ pool.length }} 個詞彙</span></div>
      <div class="mode-grid"><button v-for="item in modes" :key="item.id" :class="{ active: mode === item.id }" @click="mode = item.id"><i>{{ item.icon }}</i><strong>{{ item.title }}</strong><span>{{ item.text }}</span></button></div>
      <button class="start" @click="start">{{ finished ? '再玩一局' : '開始練習' }}</button>
      <div v-if="finished" class="result"><b>{{ score }}</b><span>/ {{ targetTotal }} 分</span><p>成績已同步至私人資料庫。</p></div>
      <div v-if="progress.games.history?.length" class="history"><h2>最近紀錄</h2><p v-for="item in progress.games.history.slice(0, 5)" :key="item.at">{{ item.mode }} · {{ item.level }}：{{ item.score }}/{{ item.total }}</p></div>
    </section>
    <section v-else-if="engine === 'match'" class="play"><div class="play-head"><b>已配對 {{ matched.length }}/{{ activeMode.pairs }}</b><span>分數 {{ score }}</span></div><h2>找出西班牙語與中文配對</h2><p class="match-help">橘色 ES 是西班牙語牌，藍色「中」是中文牌；編號用來辨識卡片位置，不代表配對答案。</p><div class="match-grid"><button v-for="card in cards" :key="card.key" :class="['card-' + card.lang, { open: cardVisible(card), matched: matched.includes(card.pair) }]" @click="flip(card)"><span class="card-side">{{ card.lang === 'es' ? 'ES' : '中' }}</span><b>{{ cardVisible(card) ? card.text : `第 ${card.number} 號牌` }}</b></button></div></section>
    <section v-else class="play">
      <div class="play-head"><b>第 {{ questionIndex + 1 }}/{{ questions.length }} 題</b><span>分數 {{ score }}</span></div>
      <template v-if="engine === 'choice' || engine === 'reverse' || engine === 'listen'"><button v-if="engine === 'listen'" class="speaker" @click="speak(current.es)">🔊 再聽一次</button><h2>{{ engine === 'choice' ? current.es : engine === 'reverse' ? current.zh : '請選出聽到詞彙的意思' }}</h2><div class="options"><button v-for="option in options" :key="option.id" :class="{ selected: selected === option.id }" @click="choose(option)">{{ engine === 'reverse' ? option.es : option.zh }}</button></div></template>
      <template v-else-if="engine === 'spell' || engine === 'dictation'"><p class="theme">{{ current.theme }} · {{ current.level }}</p><button v-if="engine === 'dictation'" class="speaker" @click="speak(current.es)">🔊 播放題目</button><h2>{{ engine === 'dictation' ? '請輸入聽到的西班牙語' : current.zh }}</h2><form @submit.prevent="submitSpelling"><input v-model="spelling" autocomplete="off" autocapitalize="off" placeholder="輸入西班牙語……"><button>確認拼字</button></form></template>
      <template v-else><div class="flash" @click="revealed = true"><small>{{ revealed ? current.zh : current.level + ' · ' + current.theme }}</small><h2>{{ current.es }}</h2><p>{{ revealed ? '點選下方熟悉度' : '點卡片查看中文' }}</p></div><button class="speaker" @click="speak(current.es)">🔊 發音</button><div v-if="revealed" class="rating"><button @click="rateFlash(false)">需要複習</button><button @click="rateFlash(true)">已經熟悉</button></div></template>
    </section>
    <p v-if="progressApi.syncError.value" class="error">⚠️ {{ progressApi.syncError.value }}</p>
  </main>
</template>

<style scoped>
.game-page{min-height:100vh;padding:28px;background:radial-gradient(circle at top,#7c2d12,#1c1917 55%);color:#fff;font-family:Inter,'Noto Sans TC',system-ui,sans-serif}.game-page>header,.setup,.play,.stats,.error{max-width:1000px;margin-left:auto;margin-right:auto}.game-page>header{padding:35px 0}.game-page>header a{color:#fde68a;text-decoration:none;font-weight:900}.game-page>header p{margin:30px 0 4px;color:#fbbf24;font-weight:900;letter-spacing:.18em}.game-page>header h1{margin:0;font-size:clamp(40px,7vw,72px)}.game-page>header span{color:#fed7aa}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.stats article{padding:18px;border:1px solid #ffffff20;border-radius:14px;background:#ffffff0d}.stats small{display:block;color:#fdba74}.stats b{font-size:30px}.setup,.play{margin-top:22px;padding:26px;border-radius:22px;background:#fff;color:#292524}.filters{display:flex;justify-content:space-between;align-items:center}.filters label{font-weight:900}.filters select{margin-left:8px;padding:9px;border-radius:8px}.mode-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:20px 0}.mode-grid button{display:flex;flex-direction:column;gap:6px;min-height:150px;padding:17px;border:2px solid #fed7aa;border-radius:15px;background:#fff7ed;text-align:left}.mode-grid button.active{border-color:#ea580c;background:#ffedd5}.mode-grid i{font-size:32px;font-style:normal}.mode-grid strong{color:#9a3412}.mode-grid span{color:#78716c}.start,.play form button{padding:13px 25px;border:0;border-radius:10px;background:#ea580c;color:#fff;font-weight:900;cursor:pointer}.result{text-align:center}.result b{font-size:55px;color:#ea580c}.history{margin-top:25px;padding-top:15px;border-top:1px solid #e7e5e4}.history p{display:inline-block;margin:5px;padding:7px 10px;border-radius:8px;background:#f5f5f4}.play{text-align:center}.play-head{display:flex;justify-content:space-between;color:#9a3412}.play h2{font-size:clamp(27px,5vw,45px)}.options{display:grid;grid-template-columns:1fr 1fr;gap:12px}.options button,.rating button,.match-grid button{padding:20px;border:2px solid #fed7aa;border-radius:12px;background:#fff7ed;font-size:17px;font-weight:900;cursor:pointer}.options button.selected{border-color:#ea580c;background:#ffedd5}.speaker{padding:12px 20px;border:0;border-radius:99px;background:#fef3c7;cursor:pointer}.play form{display:flex;justify-content:center;gap:10px}.play form input{min-width:260px;padding:13px;border:2px solid #fed7aa;border-radius:10px;font-size:18px}.flash{max-width:480px;margin:25px auto;padding:50px 25px;border-radius:22px;background:linear-gradient(135deg,#fff7ed,#fde68a);box-shadow:0 15px 35px #7c2d1220;cursor:pointer}.flash h2{color:#9a3412}.rating{display:flex;justify-content:center;gap:10px}.match-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.match-grid button{min-height:95px}.match-grid button.open{border-color:#f97316;background:#ffedd5}.match-grid button.matched{border-color:#16a34a;background:#dcfce7;color:#166534}.error{padding:12px;color:#fecaca}@media(max-width:760px){.stats{grid-template-columns:1fr 1fr}.mode-grid{grid-template-columns:1fr 1fr}.match-grid{grid-template-columns:repeat(3,1fr)}.options{grid-template-columns:1fr}}@media(max-width:460px){.game-page{padding:12px}.mode-grid,.match-grid{grid-template-columns:1fr 1fr}.filters{display:block}.play form{display:grid}.play form input{min-width:0}.stats{grid-template-columns:1fr}}
.match-help{padding:12px;border-radius:10px;background:#f5f5f4;color:#57534e}.match-grid button{position:relative;display:grid;place-items:center;min-height:105px;padding-top:32px}.match-grid .card-es{border-color:#fb923c;background:#fff7ed}.match-grid .card-zh{border-color:#60a5fa;background:#eff6ff}.card-side{position:absolute;top:7px;left:8px;padding:3px 7px;border-radius:6px;background:#ea580c;color:#fff;font-size:12px;font-weight:900}.card-zh .card-side{background:#2563eb}.match-grid button.open{box-shadow:0 0 0 3px #fbbf24}.match-grid button.matched{border-color:#16a34a;background:#dcfce7;color:#166534;opacity:.75}
</style>
