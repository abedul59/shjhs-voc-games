<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import maps from '~/data/monopoly-maps.json';
import { monopolyEvents } from '~/data/monopoly-events';
import MonopolyCityCard from '~/components/MonopolyCityCard.vue';

const db = useSupabaseClient(), route = useRoute(), student = useCookie('currentStudent');
const words = ref([]), boardWords = ref([]), owned = ref({});
const newPlayers = () => [{ name: '你', cash: 1500, pos: 0, direction: 1, shields: 0 }, { name: '電腦', cash: 1500, pos: 0, direction: 1, shields: 0 }];
const players = ref(newPlayers());
const turn = ref(0), round = ref(1), die = ref('—'), dice = ref([1, 1]), rolling = ref(false), done = ref(false);
const question = ref(null), answer = ref(''), message = ref('載入題庫…'), aiStatus = ref('');
const aiBusy = ref(false), playerBusy = ref(false), responding = ref(false);
const selectedMap = ref('taiwan'), gameMap = ref('taiwan'), started = ref(false), loading = ref(true);
const viewedCity = ref(0), eventCard = ref(null), letterInput = ref(null), saveStatus = ref('');
const savingRecord = ref(false), recordSaved = ref(false), saveError = ref('');
const mistakes = ref(0), rightWords = ref([]), wrongWords = ref([]);
let startedAt = 0, aiTimer = null, disposed = false, eventResolve = null;
let pendingRecord = null, gameStudentId = null;
const gameLesson = ref({ version: '', volume: '', unit: '' });
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: '單字大富翁', version: gameLesson.value.version, volume: gameLesson.value.volume, unit: gameLesson.value.unit } }));
const timers = new Map();
const decks = { chance: [], fate: [] };

// The active board keeps its own map selection until the game ends.
const activeMap = computed(() => maps.find(map => map.id === (started.value ? gameMap.value : selectedMap.value)) || maps[0]);
const owner = id => owned.value[id] ?? -1;
const price = id => 100 + Math.max(0, Math.floor(boardWords.value.findIndex(word => word.id === id) / 4)) * 25;
const shuffle = items => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
const pause = ms => new Promise(resolve => {
  if (disposed) { resolve(false); return; }
  const timer = window.setTimeout(() => { timers.delete(timer); resolve(true); }, ms);
  timers.set(timer, resolve);
});
const dieSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const routeStops = computed(() => {
  const cityList = activeMap.value.cities, count = Math.min(boardWords.value.length, cityList.length, 12);
  return boardWords.value.slice(0, count).map((word, index) => {
    const cityIndex = count === 1 ? 0 : Math.round(index * (cityList.length - 1) / (count - 1));
    const eventType = count === 1 ? 'both' : index === Math.floor(count / 3) ? 'chance' : index === Math.floor(2 * count / 3) ? 'fate' : '';
    return { ...cityList[cityIndex], index, word, eventType };
  });
});
const routePoints = computed(() => routeStops.value.map(stop => stop.x + ',' + stop.y).join(' '));
const selectedCity = computed(() => routeStops.value[viewedCity.value] || routeStops.value[0]);
const eventLabel = type => type === 'chance' ? '機會' : type === 'fate' ? '命運' : '機會／命運';
const canRoll = computed(() => started.value && !done.value && turn.value === 0 && !question.value && !eventCard.value && !playerBusy.value && !aiBusy.value && !responding.value && routeStops.value.length);

function chooseMap() {
  if (started.value) return;
  viewedCity.value = 0;
  try { localStorage.setItem('shjhs_monopoly_map', selectedMap.value); } catch { /* Storage may be unavailable. */ }
}
function startGame() {
  if (started.value || loading.value || !routeStops.value.length) return;
  gameMap.value = selectedMap.value; started.value = true; startedAt = Date.now();
  gameStudentId = student.value?.id ? String(student.value.id) : null;
  for (const key of ['version', 'volume', 'unit']) gameLesson.value[key] = typeof route.query[key] === 'string' ? route.query[key] : '';
  message.value = '地圖已鎖定。沿城市路線往返，答對買地；標記站點先抽機會或命運卡。輪到你擲骰！';
}
function newGame() {
  if (!done.value) return;
  selectedMap.value = gameMap.value;
  players.value = newPlayers(); owned.value = {}; boardWords.value = shuffle(words.value).slice(0, 12);
  turn.value = 0; round.value = 1; die.value = '—'; dice.value = [1, 1]; viewedCity.value = 0;
  question.value = null; eventCard.value = null; aiStatus.value = ''; saveStatus.value = '';
  pendingRecord = null; recordSaved.value = false; saveError.value = ''; savingRecord.value = false;
  mistakes.value = 0; rightWords.value = []; wrongWords.value = [];
  aiBusy.value = false; playerBusy.value = false; responding.value = false;
  decks.chance = []; decks.fate = []; started.value = false; done.value = false;
  message.value = '新的一局已準備好。選擇國家後按「開始遊戲」。';
}
function ask(word) {
  const letters = [...word.en_us].map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter(index => index >= 0);
  const type = Math.random() < .5 || letters.length < 2 ? 'choice' : 'letters';
  const seen = new Set([word.en_us.trim().toLowerCase()]);
  const others = shuffle(words.value).filter(item => {
    const key = item.en_us.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 3);
  const masked = [...word.en_us], missing = [];
  if (type === 'letters') {
    for (const index of shuffle(letters).slice(0, 2).sort((a, b) => a - b)) { missing.push(masked[index].toLowerCase()); masked[index] = '＿'; }
  }
  question.value = { word, type, choices: shuffle([word, ...others]), masked: masked.join(''), missing };
  answer.value = '';
  if (turn.value === 0 && type === 'letters') nextTick(() => letterInput.value?.focus());
}
function advance(player) {
  const last = routeStops.value.length - 1;
  if (last < 1) return;
  let next = player.pos + player.direction;
  if (next > last) { player.direction = -1; next = last - 1; }
  else if (next < 0) { player.direction = 1; next = 1; player.cash += 200; message.value = player.name + ' 經過起點，領取 $200。'; }
  player.pos = next;
}
async function saveGameRecord() {
  if (!pendingRecord || savingRecord.value || recordSaved.value) return;
  savingRecord.value = true; saveError.value = ''; saveStatus.value = '儲存遊戲紀錄中…';
  try {
    // Freeze one UUID and result per game so a lost response can be retried safely.
    if (!pendingRecord.attempt_number) {
      let query = db.from('game_records').select('id', { count: 'exact', head: true })
        .eq('student_id', pendingRecord.student_id).eq('game_type', '單字大富翁');
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
      // The previous request may have committed before the connection was lost.
      const { data, error: lookupError } = await db.from('game_records').select('id')
        .eq('id', pendingRecord.id).eq('student_id', pendingRecord.student_id).eq('game_type', '單字大富翁').maybeSingle();
      if (lookupError || !data) throw lookupError || error;
    }
    recordSaved.value = true;
    saveStatus.value = '分數與對錯單字已儲存，可在學習紀錄、英雄榜與後台報表查看。';
  } catch (error) {
    saveStatus.value = '本局尚未儲存，請按「重試儲存」。';
    saveError.value = error?.message || '連線中斷，請稍後重試。';
  } finally { savingRecord.value = false; }
}
async function endTurn() {
  if (disposed || done.value) return;
  question.value = null;
  const nextRound = round.value + (turn.value === 1 ? 1 : 0);
  if (nextRound > 20 || players.value.some(player => player.cash <= 0)) {
    done.value = true; aiStatus.value = '';
    if (aiTimer) window.clearTimeout(aiTimer);
    if (gameStudentId) {
      pendingRecord = {
        id: crypto.randomUUID(), student_id: gameStudentId, game_type: '單字大富翁',
        version: gameLesson.value.version || null, volume: gameLesson.value.volume || null, unit_played: gameLesson.value.unit || null,
        score: players.value[0].cash, played_at: new Date().toISOString(),
        time_taken_seconds: Math.floor((Date.now() - startedAt) / 1000), mistakes: mistakes.value,
        // Preserve every student answer for per-word counts; AI answers never enter these arrays.
        correct_words: rightWords.value.join(', '), wrong_words: wrongWords.value.join(', '),
        device_info: navigator.userAgent
      };
      await saveGameRecord();
    } else saveStatus.value = '本局沒有登入身分，未儲存成績；請先登入學生帳號再遊玩。';
    return;
  }
  round.value = nextRound; turn.value = 1 - turn.value;
}
async function respond(correct, automated = false) {
  if (!question.value || responding.value || disposed) return;
  responding.value = true;
  const word = question.value.word, player = players.value[turn.value];
  if (turn.value === 0) { if (correct) rightWords.value.push(word.en_us); else { mistakes.value++; wrongWords.value.push(word.en_us); } }
  if (correct && player.cash >= price(word.id)) { owned.value[word.id] = turn.value; player.cash -= price(word.id); message.value = player.name + ' 答對並買下「' + word.zh_tw + '」！'; }
  else if (correct) message.value = player.name + ' 答對了，但現金不足，無法買地。';
  else message.value = player.name + ' 答錯了，答案是 ' + word.en_us + '＝' + word.zh_tw + '。';
  question.value = null;
  try {
    if (automated) { aiStatus.value = message.value + ' 稍後換你。'; if (!await pause(1700)) return; }
    await endTurn();
  } finally { responding.value = false; }
}
function submit() {
  if (!question.value || turn.value !== 0 || responding.value) return;
  const q = question.value;
  respond(q.type === 'choice' ? answer.value === q.word.id : answer.value.trim().toLowerCase() === q.missing.join(''));
}
async function animateDice() {
  rolling.value = true;
  for (let i = 0; i < 12; i++) {
    dice.value = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    if (!await pause(70)) return null;
  }
  const total = dice.value[0] + dice.value[1]; die.value = String(total); rolling.value = false; return total;
}
function continueEvent() {
  if (!eventResolve || !eventCard.value || turn.value !== 0) return;
  const resolve = eventResolve; eventResolve = null; resolve(true);
}
async function drawEvent(type, index) {
  if (!decks[type].length) decks[type] = shuffle(monopolyEvents[type]);
  const card = decks[type].pop(), player = players.value[index], before = player.cash;
  if (card.cash) player.cash += card.cash;
  const shieldsBefore = player.shields;
  if (card.shield) player.shields = Math.min(2, player.shields + card.shield);
  const effect = card.cash ? (card.cash > 0 ? '+' : '−') + '$' + Math.abs(card.cash) + '（$' + before + ' → $' + player.cash + '）' : player.shields > shieldsBefore ? '獲得免租券 ×1，目前共 ' + player.shields + ' 張' : '免租券已達上限，保留 2 張';
  eventCard.value = { ...card, type, player: player.name, effect };
  message.value = player.name + ' 抽到「' + eventLabel(type) + '：' + card.title + '」' + effect;
  let proceed;
  if (index === 1) { aiStatus.value = '🤖 電腦抽卡：' + card.title + '。' + effect + '，稍後繼續本站。'; proceed = await pause(3600); }
  else proceed = await new Promise(resolve => { eventResolve = resolve; });
  eventResolve = null; eventCard.value = null;
  return proceed && !disposed;
}
async function play(index) {
  if (!started.value || turn.value !== index || question.value || eventCard.value || done.value || aiBusy.value || playerBusy.value || responding.value || !routeStops.value.length) return;
  const computer = index === 1, player = players.value[index];
  if (computer) { aiBusy.value = true; aiStatus.value = '🤖 電腦正在擲骰…'; } else playerBusy.value = true;
  try {
    const roll = await animateDice();
    if (roll === null || disposed) return;
    if (computer) { aiStatus.value = '🤖 電腦擲出 ' + roll + ' 點，準備前往城市…'; if (!await pause(750)) return; }
    for (let step = 0; step < roll; step++) {
      if (!await pause(computer ? 380 : 130)) return;
      advance(player);
      if (computer) aiStatus.value = '🤖 電腦前往第 ' + (player.pos + 1) + ' 站：' + routeStops.value[player.pos].name + '…';
    }
    const stop = routeStops.value[player.pos], word = stop.word;
    viewedCity.value = player.pos;
    if (stop.eventType) {
      const type = stop.eventType === 'both' ? (round.value % 2 ? 'chance' : 'fate') : stop.eventType;
      if (!await drawEvent(type, index)) return;
      if (player.cash <= 0) { await endTurn(); return; }
    }
    const propertyOwner = owner(word.id);
    if (propertyOwner >= 0) {
      if (propertyOwner !== index) {
        if (player.shields > 0) { player.shields--; message.value = player.name + ' 使用免租券，本次不用付租金。'; }
        else { player.cash -= 30; players.value[propertyOwner].cash += 30; message.value = player.name + ' 到了對手的城市土地，支付 $30 租金。'; }
      } else message.value = player.name + ' 回到自己的城市土地：「' + stop.name + '」。';
      if (computer) { aiStatus.value = '🤖 電腦停在「' + stop.name + '」：' + message.value + ' 即將換你。'; if (!await pause(1700)) return; }
      await endTurn(); return;
    }
    ask(word);
    if (computer) {
      aiStatus.value = '🤖 電腦停在「' + stop.name + '」，正在思考' + (question.value.type === 'choice' ? '英文選擇' : '兩個字母') + '…';
      if (!await pause(2600)) return;
      await respond(Math.random() < .7, true);
    }
  } finally { aiBusy.value = false; playerBusy.value = false; rolling.value = false; }
}
watch(turn, next => {
  if (aiTimer) window.clearTimeout(aiTimer);
  if (next === 1 && started.value && !done.value && !disposed) { aiStatus.value = '🤖 輪到電腦，稍候擲骰…'; aiTimer = window.setTimeout(() => play(1), 1800); }
  else if (next === 0) aiStatus.value = '';
});
onMounted(async () => {
  try { const stored = localStorage.getItem('shjhs_monopoly_map'); if (maps.some(map => map.id === stored)) selectedMap.value = stored; } catch { /* Use the default map if storage is unavailable. */ }
  try {
    let query = db.from('vocabularies').select('id,en_us,zh_tw');
    for (const key of ['version', 'volume', 'unit']) if (route.query[key]) query = query.eq(key, route.query[key]);
    const { data, error } = await query.limit(500);
    if (disposed) return;
    if (error) throw error;
    words.value = (data || []).filter(word => word.en_us && word.zh_tw);
    boardWords.value = shuffle(words.value).slice(0, 12);
    message.value = boardWords.value.length ? '選擇國家後按「開始遊戲」。本局最多 12 個單字；點城市可看照片與介紹。' : '找不到單字，請返回選擇有單字的單元。';
  } catch (error) { if (!disposed) message.value = '題庫載入失敗：' + error.message; }
  finally { if (!disposed) loading.value = false; }
});
onBeforeUnmount(() => {
  disposed = true;
  if (aiTimer) window.clearTimeout(aiTimer);
  for (const [timer, resolve] of timers) { window.clearTimeout(timer); resolve(false); }
  timers.clear(); eventResolve?.(false); eventResolve = null;
});
</script>

<template>
<main class="page">
 <header class="topbar">
  <div class="title-block"><NuxtLink class="back-link" to="/">← 遊戲選單</NuxtLink><div><h1>🏘️ 單字大富翁</h1><p>探索世界城市 · 答對單字買地</p></div></div>
  <div v-if="!started" class="map-picker">
   <label for="country">開局地圖</label>
   <select id="country" v-model="selectedMap" @change="chooseMap"><option v-for="map in maps" :key="map.id" :value="map.id">{{ map.flag }} {{ map.name }}</option></select>
   <button class="start-button" type="button" :disabled="loading || !routeStops.length" @click="startGame">{{ loading ? '載入單字…' : '開始遊戲' }}</button>
  </div>
  <p v-else class="locked-map">{{ activeMap.flag }} {{ activeMap.name }} <span>🔒 本局地圖已固定</span></p>
  <div class="dice-controls">
   <div class="dice-display" :class="{ rolling }" role="status" :aria-label="rolling ? '骰子滾動中' : '骰子點數：' + die"><span aria-hidden="true">{{ dieSymbols[dice[0]-1] }}</span><span aria-hidden="true">{{ dieSymbols[dice[1]-1] }}</span><b>{{ die }}</b></div>
   <button class="roll-button" type="button" :disabled="!canRoll" @click="play(0)">🎲 擲骰</button>
  </div>
 </header>
 <section class="scores">
  <div v-for="(player, i) in players" :key="i" :class="{ active: started && turn === i }"><b>{{ player.name }}</b><strong>$ {{ player.cash }}</strong><span>第 {{ player.pos+1 }} 站 · 土地 {{ Object.values(owned).filter(v => v === i).length }} · 免租券 {{ player.shields }}</span></div>
  <div class="round-card">{{ started ? '第 ' + round + ' / 20 回合' : '選好國家再出發' }}</div>
 </section>
 <section v-if="routeStops.length" class="map-layout">
  <div class="map-main">
   <div class="map-canvas" :aria-label="activeMap.name + '城市路線地圖'">
    <svg class="map-svg" :viewBox="activeMap.viewBox" preserveAspectRatio="xMidYMid meet" role="group" :aria-label="activeMap.name + '國界與城市路線'">
     <path v-for="(shape, i) in activeMap.shapes" :key="i" class="country-outline" :d="shape"/>
     <polyline v-if="routeStops.length > 1" class="city-route" :points="routePoints"/>
     <g v-for="(stop, i) in routeStops" :key="stop.name" class="city-marker" role="button" tabindex="0" :aria-label="'第 ' + (i+1) + ' 站 ' + stop.name + ' ' + stop.en + '，查看城市介紹'" @click="viewedCity = i" @keydown.enter.prevent="viewedCity = i" @keydown.space.prevent="viewedCity = i">
      <title>{{ stop.name }} {{ stop.en }}{{ stop.eventType ? ' · ' + eventLabel(stop.eventType) : '' }}</title>
      <circle :cx="stop.x" :cy="stop.y" :r="viewedCity === i ? 19 : 14" :class="{ start: i === 0, owned: owner(stop.word.id) >= 0, chance: stop.eventType === 'chance', fate: stop.eventType === 'fate', viewed: viewedCity === i }"/>
      <text class="city-number" :x="stop.x" :y="stop.y + 5">{{ i+1 }}</text>
      <text v-if="players[0].pos === i" class="player-token" :x="stop.x - 12" :y="stop.y - 21">🧑‍🎓</text>
      <text v-if="players[1].pos === i" class="player-token" :x="stop.x + 8" :y="stop.y - 21">🤖</text>
     </g>
    </svg>
    <div class="map-caption">{{ activeMap.flag }} {{ activeMap.extent || activeMap.name }} · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a></div>
   </div>
   <section v-if="eventCard" class="event-card" :class="eventCard.type" role="status" aria-live="polite">
    <div class="event-icon" aria-hidden="true">{{ eventCard.type === 'chance' ? '🎁' : '🔮' }}</div>
    <div class="event-copy"><p>{{ eventCard.player }}的{{ eventLabel(eventCard.type) }}</p><h2>{{ eventCard.title }}</h2><p>{{ eventCard.text }}</p><strong>{{ eventCard.effect }}</strong></div>
    <button v-if="turn === 0" type="button" @click="continueEvent">繼續這一站 →</button><span v-else class="event-wait">電腦閱讀卡片中…</span>
   </section>
   <MonopolyCityCard v-else-if="selectedCity" :city="selectedCity" :country="activeMap.name"/>
  </div>
  <aside class="route-panel">
   <header><strong>城市路線</strong><span>點城市看介紹</span></header>
   <p class="route-legend"><span>🎁 機會</span><span>🔮 命運</span>到站抽卡後照常買地</p>
   <ol>
    <li v-for="(stop, i) in routeStops" :key="stop.name">
     <button type="button" :class="{ you: players[0].pos === i, cpu: players[1].pos === i, viewed: viewedCity === i }" :aria-pressed="viewedCity === i" :title="stop.name + ' ' + stop.en + ' · ' + stop.word.zh_tw" @click="viewedCity = i">
      <span class="route-number">{{ i+1 }}</span>
      <span class="stop-copy"><b>{{ stop.name }} <i v-if="stop.eventType">{{ stop.eventType === 'fate' ? '🔮' : stop.eventType === 'both' ? '🎁🔮' : '🎁' }}</i></b><small>{{ stop.en }}</small><span>{{ stop.word.zh_tw }}</span></span>
      <span class="stop-side"><span class="stop-owner">{{ owner(stop.word.id) < 0 ? '$' + price(stop.word.id) : players[owner(stop.word.id)].name + '的土地' }}</span><span class="stop-token">{{ players[0].pos === i ? '🧑‍🎓' : '' }}{{ players[1].pos === i ? '🤖' : '' }}</span></span>
     </button>
    </li>
   </ol>
   <p v-if="aiStatus" class="ai-status" role="status" aria-live="polite">{{ aiStatus }}</p>
   <p v-else class="route-hint">到終點折返 · 經起點 +$200 · 租金 $30</p>
  </aside>
 </section>
 <section v-else class="empty-board">{{ loading ? '正在準備城市旅行…' : '本單元暫無可用單字' }}</section>
 <p class="message" role="status" aria-live="polite">{{ message }}</p>
 <div v-if="question" class="overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="單字購地問答">
  <template v-if="turn === 1"><p class="modal-turn">🤖 電腦回合 · 正在思考答案</p><h2>「{{ question.word.zh_tw }}」</h2><p>{{ question.type === 'choice' ? '電腦正在選擇英文單字' : '電腦正在補出兩個字母' }}</p><div class="thinking-dots" aria-label="電腦思考中"><i></i><i></i><i></i></div><p>請稍候看電腦的作答結果。</p></template>
  <template v-else>
   <p class="modal-turn">{{ routeStops[players[0].pos]?.name }} · {{ routeStops[players[0].pos]?.en }}<br>答對即可花 $ {{ price(question.word.id) }} 買下土地</p>
   <template v-if="question.type === 'choice'"><h2>「{{ question.word.zh_tw }}」對應哪個英文單字？</h2><div class="answers"><button v-for="choice in question.choices" :key="choice.id" type="button" :disabled="responding" @click="answer = choice.id; submit()">{{ choice.en_us }}</button></div></template>
   <form v-else @submit.prevent="submit"><h2>「{{ question.word.zh_tw }}」<br>請補出英文單字缺少的兩個字母</h2><p class="masked-word">{{ question.masked }}</p><label class="letter-label" for="missing-letters">依空格順序，輸入兩個英文字母</label><input id="missing-letters" ref="letterInput" v-model="answer" autocomplete="off" autocapitalize="none" :spellcheck="false" maxlength="2" minlength="2" pattern="[A-Za-z]{2}" required placeholder="輸入兩個字母"><button type="submit" :disabled="responding">確認答案</button></form>
  </template>
 </section></div>
 <div v-if="done" class="overlay"><section class="modal result-modal" role="dialog" aria-modal="true" aria-label="遊戲結果">
  <h1>🏁 {{ players[0].cash === players[1].cash ? '平手' : players[0].cash > players[1].cash ? '你贏了！' : '電腦獲勝' }}</h1>
  <p><strong>本局分數：{{ players[0].cash }} 分（結算現金）</strong></p>
  <p>電腦：{{ players[1].cash }} 元 · 你答對 {{ rightWords.length }} 次／答錯 {{ mistakes }} 次</p>
  <details class="result-words"><summary>查看本局對錯單字</summary><p>✅ 答對：{{ rightWords.join(', ') || '無' }}</p><p>❌ 答錯：{{ wrongWords.join(', ') || '無' }}</p></details>
  <p role="status">{{ saveStatus }}</p>
  <p v-if="saveError" class="save-error">{{ saveError }}</p>
  <button v-if="saveError" type="button" :disabled="savingRecord" @click="saveGameRecord">重試儲存</button>
  <p v-if="recordSaved" class="result-links"><NuxtLink :to="{ path: '/history', query: { game: '單字大富翁' } }">📊 我的學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">🏆 全校英雄榜</NuxtLink></p>
  <button type="button" :disabled="savingRecord || aiBusy || responding" @click="newGame">再玩一次・重新選國家</button>
  <p><NuxtLink to="/">回遊戲選單</NuxtLink></p>
 </section></div>
</main>
</template>

<style scoped>

.page{height:100vh;height:100dvh;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:8px;overflow:hidden;padding:10px 16px;box-sizing:border-box;color:var(--text-main,#222);background:var(--bg-color,#f4f0e6)}
.topbar,.scores,.map-layout,.message{width:min(100%,1440px);margin:0 auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px}.title-block{display:flex;align-items:center;gap:12px;white-space:nowrap}.title-block h1{margin:0;font-size:1.25rem}.title-block p{margin:2px 0 0;font-size:.78rem;opacity:.78}.back-link{font-size:.82rem}
.map-picker{display:flex;flex-wrap:wrap;justify-content:center;gap:5px}.map-picker button{padding:6px 9px;border:1px solid #becab9;border-radius:18px;background:#fff;color:#344438;font-size:.82rem;font-weight:700;cursor:pointer}.map-picker button.selected{border:2px solid #39784c;background:#eaf3e7}
.dice-controls{display:flex;align-items:center;gap:8px}.dice-display{display:flex;align-items:center;gap:3px;padding:4px 8px;border:1px solid #d8c398;border-radius:10px;background:#fffaf0}.dice-display span{font-size:1.55rem;line-height:1}.dice-display b{min-width:1.1em;color:#a86e13;font-size:1.1rem;text-align:center}.dice-display.rolling{animation:tumble .14s linear infinite alternate}@keyframes tumble{from{transform:translateY(-3px) rotate(-8deg)}to{transform:translateY(3px) rotate(8deg)}}
.roll-button,.modal button,.modal input{padding:8px 12px;border:2px solid #347144;border-radius:9px;background:#72c984;color:#143b20;font:inherit;font-weight:800;cursor:pointer}.roll-button:disabled{opacity:.48;cursor:not-allowed}
.scores{display:flex;gap:8px}.scores>div{flex:1;display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 8px;min-height:42px;padding:5px 10px;border:2px solid #bdc9b9;border-radius:9px;background:#fff}.scores .active{border-color:#278443;box-shadow:0 0 0 2px #27844322}.scores strong{grid-column:2;grid-row:1/3;color:#168342;font-size:1.05rem}.scores span{font-size:.74rem}.scores .round-card{display:flex;justify-content:center;align-items:center;font-weight:800;color:#334b3b}
.map-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,320px);gap:10px;min-height:0}.map-canvas{position:relative;min-width:0;min-height:0;overflow:hidden;border:1px solid #bdcdb3;border-radius:16px;background:radial-gradient(ellipse at center,#fbfff6,#e7f1df);box-shadow:0 8px 22px #244a3017}.map-svg{position:absolute;inset:0;width:100%;height:100%}.country-outline{fill:#bad8bd;fill-opacity:.54;stroke:#527a5b;stroke-width:1.1;stroke-linejoin:round;vector-effect:non-scaling-stroke}.city-route{fill:none;stroke:#d38c29;stroke-width:3;stroke-dasharray:7 5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.city-marker circle{fill:#fff;stroke:#485f4b;stroke-width:2;vector-effect:non-scaling-stroke}.city-marker circle.start{fill:#ffe8a9;stroke:#b47716;stroke-width:3}.city-marker circle.owned{fill:#cce6d1}.city-number{fill:#26392b;text-anchor:middle;font-size:18px;font-weight:900;pointer-events:none}.player-token{font-size:22px;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:2px;stroke-linejoin:round}.map-caption{position:absolute;right:9px;bottom:7px;padding:4px 8px;border-radius:14px;background:#ffffffd9;color:#4d5e4e;font-size:.68rem}
.route-panel{display:flex;min-height:0;flex-direction:column;overflow:hidden;border:1px solid #bdcdb3;border-radius:15px;background:#fff;box-shadow:0 8px 22px #244a3012}.route-panel>header{display:flex;align-items:baseline;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #e0e8db}.route-panel>header strong{font-size:1rem}.route-panel>header span{font-size:.7rem;color:#667366}.route-panel ol{display:flex;min-height:0;flex:1;flex-direction:column;gap:3px;overflow:auto;margin:0;padding:7px;list-style:none}.route-panel li{position:relative;display:flex;min-height:34px;align-items:center;gap:8px;padding:4px 7px;border:1px solid transparent;border-radius:8px;background:#f7f9f5}.route-panel li.you{border-color:#1884d5;background:#e8f4ff}.route-panel li.cpu{border-color:#df594d;background:#fff0ed}.route-panel li.owned:not(.you):not(.cpu){background:#eff7ef}.route-number{display:grid;width:24px;height:24px;flex:none;place-items:center;border-radius:50%;background:#e7e9e2;color:#344538;font-size:.73rem;font-weight:900}.stop-copy{display:flex;min-width:0;flex:1;flex-direction:column;line-height:1.15}.stop-copy b{font-size:.78rem}.stop-copy span{overflow:hidden;color:#425849;font-size:.78rem;text-overflow:ellipsis;white-space:nowrap}.stop-owner{color:#667366;font-size:.65rem}.stop-token{font-size:.85rem;white-space:nowrap}.ai-status{margin:0;padding:8px 10px;border-top:1px solid #d8e2f5;background:#edf2ff;color:#283c77;font-size:.75rem;font-weight:800}
.message{min-height:26px;display:flex;align-items:center;padding:4px 10px;border-radius:8px;background:#fff;font-size:.8rem}
.overlay{position:fixed;inset:0;z-index:10;display:grid;place-items:center;padding:18px;background:#142117bb}.modal{width:min(440px,100%);padding:23px;border-radius:18px;background:#fff;color:#233;text-align:center;box-shadow:0 16px 60px #0005}.modal h2{font-size:1.25rem}.modal-turn{margin-top:0;color:#46704e;font-weight:800}.answers,.modal form{display:grid;gap:9px}.modal input{width:100%;border-color:#d3d9d0;background:#fff;box-sizing:border-box;text-align:center;letter-spacing:.25em}.modal form button{background:#71c784}.masked-word{margin:10px 0;color:#243c2a;font-family:monospace;font-size:1.8rem;font-weight:900;letter-spacing:.24em}.thinking-dots{display:flex;justify-content:center;gap:7px;margin:16px 0}.thinking-dots i{width:11px;height:11px;border-radius:50%;background:#547dbe;animation:think 1s infinite ease-in-out}.thinking-dots i:nth-child(2){animation-delay:.15s}.thinking-dots i:nth-child(3){animation-delay:.3s}@keyframes think{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-7px)}}
@media(max-width:850px){.page{height:auto;min-height:100dvh;overflow:auto;padding:10px}.topbar{flex-wrap:wrap;justify-content:flex-start}.title-block{width:100%}.map-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(360px,55vh) auto}.route-panel{max-height:44vh}.route-panel ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.dice-controls{margin-left:auto}}

/* World cities, setup and event additions */
.page{color:#253b32}.title-block p{color:#586c59}.back-link{color:#346c4a}
.map-picker{display:flex;align-items:center;gap:7px}.map-picker label{font-size:.75rem;font-weight:700}.map-picker select{max-width:150px;padding:8px;border:1px solid #9bb39e;border-radius:8px;font:inherit;font-size:.85rem;color:#253b32;background:#fff}.map-picker .start-button,.event-card button{padding:8px 12px;border:2px solid #347144;border-radius:9px;background:#72c984;color:#143b20;font:inherit;font-weight:800;cursor:pointer}.start-button:disabled,.modal button:disabled{opacity:.48;cursor:not-allowed}.locked-map{margin:0;font-size:.95rem;font-weight:800}.locked-map span{display:block;margin-top:3px;font-size:.68rem;color:#647664}
button:focus-visible,select:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #d59029;outline-offset:2px}.scores span{font-size:.7rem}.scores .round-card{flex:.65;font-size:.9rem}.dice-display span{font-size:1.8rem}
.map-layout{grid-template-columns:minmax(0,1fr) minmax(260px,310px)}.map-main{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;min-width:0;min-height:0}.city-marker{cursor:pointer;outline:none}.city-marker circle.chance{fill:#ffe3a6}.city-marker circle.fate{fill:#e4d8ff}.city-marker circle.viewed,.city-marker:focus-visible circle{stroke:#b56813;stroke-width:4}.player-token{pointer-events:none}.map-caption{font-size:.62rem}.map-caption a{color:inherit}
.route-panel>header{padding:8px 10px;border:0}.route-panel>header strong{font-size:.95rem}.route-panel>header span{font-size:.68rem}.route-legend{display:flex;justify-content:space-between;gap:4px;margin:0;padding:5px 8px;background:#f7f1e3;font-size:.6rem}.route-panel ol{gap:2px;overflow:hidden;padding:5px}.route-panel li{flex:1;min-height:0;padding:0;border:0;border-radius:0;background:transparent}.route-panel li>button{position:relative;display:flex;width:100%;min-height:0;align-items:center;gap:7px;padding:2px 5px;border:1px solid transparent;border-radius:7px;background:#f7f9f5;text-align:left;font:inherit;color:inherit;cursor:pointer}.route-panel button.you{background:#e8f4ff;border-color:#1884d5}.route-panel button.cpu{background:#fff0ed;border-color:#df594d}.route-panel button.viewed{box-shadow:inset 3px 0 #ba7c27}.route-number{width:22px;height:22px;font-size:.7rem}.stop-copy{line-height:1.12}.stop-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.76rem}.stop-copy i{font-style:normal}.stop-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.6rem;color:#6a7569}.stop-copy>span{font-size:.7rem}.stop-side{display:flex;align-items:flex-end;flex-direction:column;gap:2px}.stop-owner{font-size:.6rem;white-space:nowrap}.stop-token{font-size:.8rem}.ai-status{font-size:.72rem}.route-hint{margin:0;padding:6px;text-align:center;font-size:.6rem;color:#607163}
.event-card{display:flex;align-items:center;gap:12px;min-height:112px;box-sizing:border-box;border:2px solid #ddad51;border-radius:14px;padding:12px;background:#fff5d9}.event-card.fate{border-color:#a98dce;background:#f2eaff}.event-icon{font-size:2.6rem}.event-copy{flex:1}.event-copy h2{margin:3px 0;font-size:1.1rem}.event-copy p{margin:3px 0;font-size:.75rem}.event-copy strong{font-size:.8rem;color:#5a3d12}.event-card button{font-size:.78rem;white-space:nowrap}.event-wait{font-size:.7rem}.message{box-sizing:border-box;font-size:.78rem}.empty-board{display:grid;place-items:center}.overlay{overflow:auto}.modal{box-sizing:border-box}.modal-turn{line-height:1.6}.letter-label{font-size:.8rem}.masked-word{overflow-wrap:anywhere}
@media(max-height:740px) and (min-width:851px){.page{gap:5px;padding:7px 12px}.topbar{min-height:45px}.scores>div{min-height:36px}.route-panel>header{padding:5px 8px}.route-hint{padding:3px}.route-legend{padding:3px 6px}.stop-copy b{font-size:.68rem}.stop-copy small{font-size:.55rem}.stop-copy>span{font-size:.64rem}.ai-status{padding:5px 7px}.event-card{min-height:110px;padding:8px}}
@media(max-width:1050px){.title-block{gap:8px}.title-block h1{font-size:1.05rem}.title-block p{display:none}.map-picker label{display:none}.map-layout{grid-template-columns:minmax(0,1fr) 270px}}
@media(max-width:850px){.map-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto}.map-main{grid-template-rows:minmax(320px,48vh) auto}.route-panel{max-height:none}.route-panel ol{overflow:visible}.route-panel li>button{min-height:48px}.scores{flex-wrap:wrap}.scores .round-card{min-width:100px}.event-card{flex-wrap:wrap}.event-copy{min-width:65%}.event-card button{margin-left:auto}}
@media(prefers-reduced-motion:reduce){.dice-display.rolling,.thinking-dots i{animation:none}}
.result-modal{max-height:calc(100dvh - 36px);overflow:auto}.result-words{text-align:left;line-height:1.5;overflow-wrap:anywhere}.result-words summary{cursor:pointer;font-weight:700}.result-links{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.save-error{color:#a12222;font-size:.8rem}
</style>
