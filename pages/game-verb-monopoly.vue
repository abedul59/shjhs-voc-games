<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import maps from '~/data/monopoly-maps.json';
import { monopolyEvents } from '~/data/monopoly-events';
import MonopolyCityCard from '~/components/MonopolyCityCard.vue';

const db = useSupabaseClient(), student = useCookie('currentStudent');
const words = ref([]), boardWords = ref([]), owned = ref({});
const newPlayers = () => [{ name: '你', cash: 1500, pos: 0, direction: 1, shields: 0 }, { name: '電腦', cash: 1500, pos: 0, direction: 1, shields: 0 }];
const players = ref(newPlayers());
const turn = ref(0), round = ref(1), die = ref('—'), dice = ref([1, 1]), rolling = ref(false), done = ref(false);
const question = ref(null), answers = ref({}), message = ref('載入動詞題庫…'), aiStatus = ref('');
const aiBusy = ref(false), playerBusy = ref(false), responding = ref(false);
const selectedMap = ref('taiwan'), gameMap = ref('taiwan'), selectedGrade = ref(0), gameGrade = ref(0), started = ref(false), loading = ref(true);
const roundOptions = [10, 15, 20], selectedRounds = ref(20), gameRounds = ref(20), finishReason = ref('');
const viewedCity = ref(0), eventCard = ref(null), saveStatus = ref('');
const savingRecord = ref(false), recordSaved = ref(false), saveError = ref('');
const mistakes = ref(0), rightWords = ref([]), wrongWords = ref([]);
let startedAt = 0, aiTimer = null, disposed = false, eventResolve = null;
let pendingRecord = null, gameStudentId = null;
const gameType = computed(() => `動詞變化大富翁（${gameGrade.value === 9 ? '九' : '八'}年級）`);
const gradeName = computed(() => gameGrade.value === 9 ? '九年級' : '八年級');
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: gameType.value } }));
const timers = new Map();
const decks = { chance: [], fate: [] };

// The active board keeps its own map selection until the game ends.
const activeMap = computed(() => maps.find(map => map.id === (started.value ? gameMap.value : selectedMap.value)) || maps[0]);
const owner = id => owned.value[id] ?? -1;
const ownerLabel = id => owner(id) === 0 ? '我方土地' : owner(id) === 1 ? '電腦土地' : '待購土地';
const price = id => 100 + Math.max(0, Math.floor(boardWords.value.findIndex(word => word.id === id) / 4)) * 25;
const shuffle = items => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
function chooseBoard() {
  const pool = words.value.filter(word => selectedGrade.value !== 9 || canonical(word.past_participle));
  boardWords.value = shuffle(pool).slice(0, 12);
  viewedCity.value = 0;
  message.value = boardWords.value.length >= 2
    ? (selectedGrade.value === 8 ? '八年級只測驗過去式。選好國家與回合數即可開始。' : selectedGrade.value === 9 ? '九年級同時測驗過去式與過去分詞。選好國家與回合數即可開始。' : '先選八年級或九年級，再選國家與回合數。')
    : '此模式的動詞題庫不足，請由老師先匯入至少兩個動詞。';
}
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
const canSubmitAnswer = computed(() => !!question.value?.fields.every(field => String(answers.value[field.key] || '').trim()));

function chooseMap() {
  if (started.value) return;
  viewedCity.value = 0;
  try { localStorage.setItem('shjhs_monopoly_map', selectedMap.value); } catch { /* Storage may be unavailable. */ }
}
function startGame() {
  if (started.value || loading.value || ![8, 9].includes(selectedGrade.value) || routeStops.value.length < 2) return;
  gameMap.value = selectedMap.value; gameGrade.value = selectedGrade.value; started.value = true; startedAt = Date.now();
  gameRounds.value = roundOptions.includes(Number(selectedRounds.value)) ? Number(selectedRounds.value) : 20;
  finishReason.value = '';
  gameStudentId = student.value?.id ? String(student.value.id) : null;
  message.value = gradeName.value + '：本局共 ' + gameRounds.value + ' 回合（雙方各行動一次）。模式與地圖已鎖定，輪到你擲骰！';
}
function newGame() {
  if (!done.value) return;
  selectedMap.value = gameMap.value; selectedGrade.value = gameGrade.value;
  selectedRounds.value = gameRounds.value; finishReason.value = '';
  players.value = newPlayers(); owned.value = {}; chooseBoard();
  turn.value = 0; round.value = 1; die.value = '—'; dice.value = [1, 1]; viewedCity.value = 0;
  question.value = null; eventCard.value = null; aiStatus.value = ''; saveStatus.value = '';
  pendingRecord = null; recordSaved.value = false; saveError.value = ''; savingRecord.value = false;
  mistakes.value = 0; rightWords.value = []; wrongWords.value = [];
  aiBusy.value = false; playerBusy.value = false; responding.value = false;
  decks.chance = []; decks.fate = []; started.value = false; done.value = false;
  if (boardWords.value.length >= 2) message.value = '新的一局已準備好。選擇年級、國家與回合數後開始。';
}
const variants = value => String(value || '').split(/[\/、,，；;]/).map(part => part.trim().toLowerCase()).filter(Boolean);
const canonical = value => variants(value)[0] || '';
function makeField(word, key, label) {
  const target = canonical(word[key]);
  const letters = [...target].map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter(index => index >= 0);
  if (Math.random() < .5 && letters.length >= 2) {
    const masked = [...target], missing = [];
    for (const index of shuffle(letters).slice(0, 2).sort((a, b) => a - b)) {
      missing.push(masked[index]); masked[index] = '＿';
    }
    return { key, label, type: 'letters', target, masked: masked.join(''), missing: missing.join('') };
  }
  const alternatives = [...new Set(shuffle(words.value).map(item => canonical(item[key])).filter(value => value && value !== target))].slice(0, 3);
  if (alternatives.length >= 2) return { key, label, type: 'choice', target, choices: shuffle([target, ...alternatives]) };
  return { key, label, type: 'spelling', target };
}
function ask(word) {
  const fields = [makeField(word, 'past_tense', '過去式')];
  if (gameGrade.value === 9) fields.push(makeField(word, 'past_participle', '過去分詞'));
  question.value = { word, fields };
  answers.value = Object.fromEntries(fields.map(field => [field.key, '']));
  if (turn.value === 0) nextTick(() => document.querySelector('.verb-answer-input')?.focus());
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
        .eq('student_id', pendingRecord.student_id).eq('game_type', gameType.value);
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
        .eq('id', pendingRecord.id).eq('student_id', pendingRecord.student_id).eq('game_type', gameType.value).maybeSingle();
      if (lookupError || !data) throw lookupError || error;
    }
    recordSaved.value = true;
    saveStatus.value = '分數與對錯動詞已儲存，可在學習紀錄、英雄榜與後台報表查看。';
  } catch (error) {
    saveStatus.value = '本局尚未儲存，請按「重試儲存」。';
    saveError.value = error?.message || '連線中斷，請稍後重試。';
  } finally { savingRecord.value = false; }
}
async function endTurn() {
  if (disposed || done.value) return;
  question.value = null;
  const nextRound = round.value + (turn.value === 1 ? 1 : 0);
  const bankrupt = players.value.some(player => player.cash <= 0);
  if (nextRound > gameRounds.value || bankrupt) {
    finishReason.value = bankrupt ? '有玩家現金用盡，本局提前結算。' : '已完成 ' + gameRounds.value + ' 回合，自動結束遊戲。';
    done.value = true; aiStatus.value = '';
    if (aiTimer) window.clearTimeout(aiTimer);
    if (gameStudentId) {
      pendingRecord = {
        id: crypto.randomUUID(), student_id: gameStudentId, game_type: gameType.value,
        version: null, volume: null, unit_played: gradeName.value + '動詞變化',
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
  const city = routeStops.value[player.pos];
  if (turn.value === 0) { if (correct) rightWords.value.push(word.en_us); else { mistakes.value++; wrongWords.value.push(word.en_us); } }
  if (correct && player.cash >= price(word.id)) { owned.value[word.id] = turn.value; player.cash -= price(word.id); message.value = player.name + ' 答對並買下「' + city.name + '／' + word.en_us + '（' + word.zh_tw + '）」的土地！'; }
  else if (correct) message.value = player.name + ' 答對了，但現金不足，無法買地。';
  else message.value = player.name + ' 答錯了，' + word.en_us + ' 的過去式是 ' + word.past_tense + (gameGrade.value === 9 ? '，過去分詞是 ' + word.past_participle : '') + '。';
  question.value = null;
  try {
    if (automated) aiStatus.value = message.value + ' 稍後換你。';
    // Leave both players' purchase/result messages visible before the next turn.
    if (!await pause(1700)) return;
    await endTurn();
  } finally { responding.value = false; }
}
function submit() {
  if (!question.value || turn.value !== 0 || responding.value) return;
  const fields = question.value.fields;
  if (fields.some(field => !String(answers.value[field.key] || '').trim())) return;
  respond(fields.every(field => {
    const input = String(answers.value[field.key]).trim().toLowerCase();
    if (field.type === 'letters') return input === field.missing;
    if (field.type === 'spelling') return variants(question.value.word[field.key]).includes(input);
    return input === field.target;
  }));
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
      aiStatus.value = '🤖 電腦停在「' + stop.name + '」，正在思考' + (gameGrade.value === 9 ? '過去式與過去分詞' : '過去式') + '…';
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
watch(selectedGrade, () => { if (!started.value) chooseBoard(); });
onMounted(async () => {
  try { const stored = localStorage.getItem('shjhs_monopoly_map'); if (maps.some(map => map.id === stored)) selectedMap.value = stored; } catch { /* Use the default map if storage is unavailable. */ }
  try {
    const { data, error } = await db.from('irregular_verbs').select('id,base_form,past_tense,past_participle,chinese').limit(500);
    if (disposed) return;
    if (error) throw error;
    words.value = (data || []).filter(verb => String(verb.base_form || '').trim() && canonical(verb.past_tense) && String(verb.chinese || '').trim())
      .map(verb => ({ ...verb, en_us: verb.base_form.trim(), zh_tw: verb.chinese.trim() }));
    chooseBoard();
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
<main class="page" :class="{ playing: started && !done }">
 <header class="topbar">
  <div class="title-block"><NuxtLink class="back-link" to="/">← 遊戲選單</NuxtLink><div><h1>🏘️ 動詞變化大富翁</h1><p>探索世界城市 · 答對動詞變化買地</p></div></div>
  <div v-if="!started" class="map-picker">
   <div class="setup-field"><label for="verb-grade">版本</label><select id="verb-grade" v-model.number="selectedGrade"><option :value="0" disabled>選擇年級</option><option :value="8">八年級（過去式）</option><option :value="9">九年級（過去式＋過去分詞）</option></select></div>
   <div class="setup-field"><label for="country">開局地圖</label><select id="country" v-model="selectedMap" @change="chooseMap"><option v-for="map in maps" :key="map.id" :value="map.id">{{ map.flag }} {{ map.name }}</option></select></div>
   <div class="setup-field"><label for="round-count">遊戲回合</label><select id="round-count" v-model.number="selectedRounds"><option v-for="count in roundOptions" :key="count" :value="count">{{ count }} 回合</option></select></div>
   <button class="start-button" type="button" :disabled="loading || routeStops.length < 2 || !selectedGrade" @click="startGame">{{ loading ? '載入動詞…' : '開始遊戲' }}</button>
  </div>
  <p v-else class="locked-map">{{ gradeName }} · {{ activeMap.flag }} {{ activeMap.name }} · {{ gameRounds }} 回合 <span>🔒 開局設定已固定</span></p>
  <div class="dice-controls" :class="{ 'pre-game': !started, 'game-ended': done }">
   <div class="dice-row"><div class="dice-display" :class="{ rolling }" role="status" :aria-label="rolling ? '骰子滾動中' : '骰子點數：' + die"><span aria-hidden="true">{{ dieSymbols[dice[0]-1] }}</span><span aria-hidden="true">{{ dieSymbols[dice[1]-1] }}</span><b>{{ die }}</b></div>
   <button class="roll-button" type="button" :disabled="!canRoll" @click="play(0)">🎲 {{ !started ? '請先開始遊戲' : turn === 1 ? '電腦回合' : '擲骰' }}</button></div>
   <p class="mobile-turn-status">{{ aiStatus || message }}</p>
  </div>
 </header>
 <section class="scores">
  <div v-for="(player, i) in players" :key="i" :class="{ active: started && turn === i, 'score-you': i === 0, 'score-cpu': i === 1 }"><b>{{ i === 0 ? '🧑‍🎓 你' : '🤖 電腦' }}</b><strong>$ {{ player.cash }}</strong><span>第 {{ player.pos+1 }} 站 · 土地 {{ Object.values(owned).filter(v => v === i).length }} · 免租券 {{ player.shields }}</span></div>
  <div class="round-card">{{ started ? '第 ' + round + ' / ' + gameRounds + ' 回合' : '本局 ' + selectedRounds + ' 回合' }}<small>雙方各行動一次＝1 回合</small></div>
 </section>
 <section v-if="routeStops.length" class="map-layout">
  <div class="map-main">
   <div class="map-canvas" :aria-label="activeMap.name + '城市路線地圖'">
    <svg class="map-svg" :viewBox="activeMap.viewBox" preserveAspectRatio="xMidYMid meet" role="group" :aria-label="activeMap.name + '國界與城市路線'">
     <path v-for="(shape, i) in activeMap.shapes" :key="i" class="country-outline" :d="shape"/>
     <polyline v-if="routeStops.length > 1" class="city-route" :points="routePoints"/>
     <g v-for="(stop, i) in routeStops" :key="stop.name" class="city-marker" :class="{ 'owned-you': owner(stop.word.id) === 0, 'owned-cpu': owner(stop.word.id) === 1 }" role="button" tabindex="0" :aria-label="'第 ' + (i+1) + ' 站 ' + stop.name + ' ' + stop.en + '，' + ownerLabel(stop.word.id) + '，查看城市介紹'" @click="viewedCity = i" @keydown.enter.prevent="viewedCity = i" @keydown.space.prevent="viewedCity = i">
      <title>{{ stop.name }} {{ stop.en }} · {{ ownerLabel(stop.word.id) }}{{ stop.eventType ? ' · ' + eventLabel(stop.eventType) : '' }}</title>
      <circle class="selection-ring" :class="{ visible: viewedCity === i }" :cx="stop.x" :cy="stop.y" r="23"/>
      <circle class="property-dot" :cx="stop.x" :cy="stop.y" r="17" :class="{ start: i === 0, chance: stop.eventType === 'chance', fate: stop.eventType === 'fate' }"/>
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
   <div class="ownership-legend" aria-label="土地顏色圖例"><span><i class="swatch you"></i>藍：我方</span><span><i class="swatch cpu"></i>橘：電腦</span><span><i class="swatch vacant"></i>待購</span></div>
   <p class="route-legend"><span>🎁 機會</span><span>🔮 命運</span>到站抽卡後照常買地</p>
   <ol>
    <li v-for="(stop, i) in routeStops" :key="stop.name">
     <button type="button" :class="{ 'owned-you': owner(stop.word.id) === 0, 'owned-cpu': owner(stop.word.id) === 1, 'current-stop': players[0].pos === i || players[1].pos === i, viewed: viewedCity === i }" :aria-pressed="viewedCity === i" :title="stop.name + ' ' + stop.en + ' · ' + stop.word.zh_tw + ' · ' + ownerLabel(stop.word.id)" @click="viewedCity = i">
      <span class="route-number">{{ i+1 }}</span>
      <span class="stop-copy"><b>{{ stop.name }} <i v-if="stop.eventType">{{ stop.eventType === 'fate' ? '🔮' : stop.eventType === 'both' ? '🎁🔮' : '🎁' }}</i></b><small>{{ stop.en }}</small><span>{{ stop.word.zh_tw }}</span></span>
      <span class="stop-side"><span class="stop-owner">{{ owner(stop.word.id) < 0 ? '待購 $' + price(stop.word.id) : ownerLabel(stop.word.id) }}</span><span class="stop-token" aria-label="目前所在玩家">{{ players[0].pos === i ? '🧑‍🎓' : '' }}{{ players[1].pos === i ? '🤖' : '' }}</span></span>
     </button>
    </li>
   </ol>
   <p v-if="aiStatus" class="ai-status" role="status" aria-live="polite">{{ aiStatus }}</p>
   <p v-else class="route-hint">到終點折返 · 經起點 +$200 · 租金 $30</p>
  </aside>
 </section>
 <section v-else class="empty-board">{{ loading ? '正在準備城市旅行…' : '動詞題庫不足' }}</section>
 <p class="message" role="status" aria-live="polite">{{ message }}</p>
 <div v-if="question" class="overlay"><section class="modal verb-modal" role="dialog" aria-modal="true" aria-label="動詞變化購地問答">
  <template v-if="turn === 1"><p class="modal-turn">🤖 電腦回合 · 正在思考答案</p><h2>{{ question.word.en_us }}（{{ question.word.zh_tw }}）</h2><p>電腦正在回答{{ gameGrade === 9 ? '過去式與過去分詞' : '過去式' }}…</p><div class="thinking-dots" aria-label="電腦思考中"><i></i><i></i><i></i></div><p>請稍候看電腦的作答結果。</p></template>
  <form v-else @submit.prevent="submit">
   <p class="modal-turn">{{ routeStops[players[0].pos]?.name }} · {{ routeStops[players[0].pos]?.en }}<br>全部答對即可花 $ {{ price(question.word.id) }} 買下土地</p>
   <h2>{{ question.word.en_us }}（{{ question.word.zh_tw }}）</h2>
   <div v-for="field in question.fields" :key="field.key" class="verb-field">
    <h3>{{ field.label }}</h3>
    <template v-if="field.type === 'choice'">
     <p>請選正確的{{ field.label }}</p>
     <div class="answers"><button v-for="choice in field.choices" :key="choice" type="button" :disabled="responding" :class="{ selected: answers[field.key] === choice }" :aria-pressed="answers[field.key] === choice" @click="answers[field.key] = choice">{{ choice }}</button></div>
    </template>
    <template v-else-if="field.type === 'letters'">
     <p class="masked-word">{{ field.masked }}</p><label :for="field.key">依空格順序補上兩個字母</label>
     <input :id="field.key" v-model="answers[field.key]" class="verb-answer-input" autocomplete="off" autocapitalize="none" :spellcheck="false" maxlength="2" pattern="[A-Za-z]{2}" placeholder="兩個字母">
    </template>
    <template v-else><label :for="field.key">請拼寫{{ field.label }}</label><input :id="field.key" v-model="answers[field.key]" class="verb-answer-input" autocomplete="off" autocapitalize="none" :spellcheck="false" placeholder="輸入完整答案"></template>
   </div>
   <button type="submit" :disabled="responding || !canSubmitAnswer">確認答案</button>
  </form>
 </section></div>
 <div v-if="done" class="overlay"><section class="modal result-modal" role="dialog" aria-modal="true" aria-label="遊戲結果">
  <h1>🏁 {{ players[0].cash === players[1].cash ? '平手' : players[0].cash > players[1].cash ? '你贏了！' : '電腦獲勝' }}</h1>
  <p>{{ finishReason }}</p>
  <p><strong>本局分數：{{ players[0].cash }} 分（結算現金）</strong></p>
  <p>電腦：{{ players[1].cash }} 元 · 你答對 {{ rightWords.length }} 次／答錯 {{ mistakes }} 次</p>
  <details class="result-words"><summary>查看本局對錯動詞</summary><p>✅ 答對：{{ rightWords.join(', ') || '無' }}</p><p>❌ 答錯：{{ wrongWords.join(', ') || '無' }}</p></details>
  <p role="status">{{ saveStatus }}</p>
  <p v-if="saveError" class="save-error">{{ saveError }}</p>
  <button v-if="saveError" type="button" :disabled="savingRecord" @click="saveGameRecord">重試儲存</button>
  <p v-if="recordSaved" class="result-links"><NuxtLink :to="{ path: '/history', query: { game: gameType } }">📊 我的學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">🏆 全校英雄榜</NuxtLink></p>
  <button type="button" :disabled="savingRecord || aiBusy || responding" @click="newGame">再玩一次・重新選模式與國家</button>
  <p><NuxtLink to="/">回遊戲選單</NuxtLink></p>
 </section></div>
</main>
</template>

<style scoped>
.page{position:fixed;inset:0;height:100vh;height:100dvh;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:8px;overflow:hidden;padding:10px 16px;box-sizing:border-box;color:#253b32;background:var(--bg-color,#f4f0e6)}
.page *{box-sizing:border-box}.topbar,.scores,.map-layout,.message,.empty-board{width:min(100%,1440px);margin:0 auto;min-width:0}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:62px}.title-block{display:flex;align-items:center;gap:12px;white-space:nowrap}.title-block h1{margin:0;font-size:1.2rem}.title-block p{margin:3px 0 0;font-size:.75rem;color:#586c59}.back-link{font-size:.8rem;color:#346c4a}
.map-picker{display:grid;grid-template-columns:minmax(140px,1.4fr) minmax(95px,1fr) minmax(90px,.8fr) auto;align-items:end;gap:7px;max-width:660px;flex:1;min-width:0}.setup-field{display:grid;gap:4px;min-width:0}.setup-field label{font-size:.7rem;font-weight:700}.setup-field select{width:100%;min-height:40px;padding:6px;border:1px solid #9bb39e;border-radius:8px;font:inherit;font-size:.85rem;color:#253b32;background:#fff}.locked-map{margin:0;font-size:.9rem;font-weight:800}.locked-map span{display:block;margin-top:3px;font-size:.65rem;color:#647664}
.roll-button,.start-button,.event-card button,.modal button,.modal input{min-height:40px;padding:8px 12px;border:2px solid #347144;border-radius:9px;background:#72c984;color:#143b20;font:inherit;font-size:.9rem;font-weight:800;cursor:pointer}.start-button{white-space:nowrap}.roll-button:disabled,.start-button:disabled,.modal button:disabled{opacity:.48;cursor:not-allowed}button:focus-visible,select:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #9b610b;outline-offset:2px}
.dice-controls{flex:none}.dice-row{display:flex;align-items:center;gap:8px}.dice-display{display:flex;align-items:center;gap:3px;min-height:40px;padding:4px 8px;border:1px solid #d8c398;border-radius:10px;background:#fffaf0}.dice-display span{font-size:1.8rem;line-height:1}.dice-display b{min-width:1.2em;color:#8b5907;font-size:1.1rem;text-align:center}.dice-display.rolling{animation:tumble .14s linear infinite alternate}.mobile-turn-status{display:none}@keyframes tumble{from{transform:translateY(-3px) rotate(-8deg)}to{transform:translateY(3px) rotate(8deg)}}
.scores{display:grid;grid-template-columns:1fr 1fr minmax(145px,.65fr);gap:8px}.scores>div{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 8px;min-width:0;min-height:55px;padding:5px 10px;border:1px solid #bdc9b9;border-radius:9px;background:#fff}.scores .score-you{border-top:4px solid #1d4ed8}.scores .score-cpu{border-top:4px solid #c2410c}.scores .active{box-shadow:inset 0 0 0 2px #334155}.scores strong{grid-column:2;grid-row:1/3;font-size:1.05rem}.score-you strong{color:#1d4ed8}.score-cpu strong{color:#c2410c}.scores span{font-size:.68rem}.scores .round-card{display:flex;flex-direction:column;justify-content:center;font-size:.88rem;font-weight:800;text-align:center}.round-card small{font-weight:400;font-size:.6rem}
.map-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,315px);gap:10px;min-height:0}.map-main{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;min-width:0;min-height:0}.map-canvas{position:relative;min-width:0;min-height:0;overflow:hidden;border:1px solid #bdcdb3;border-radius:16px;background:radial-gradient(ellipse at center,#fbfff6,#e7f1df);box-shadow:0 8px 22px #244a3017}.map-svg{position:absolute;inset:0;width:100%;height:100%}.country-outline{fill:#bad8bd;fill-opacity:.54;stroke:#527a5b;stroke-width:1.1;stroke-linejoin:round;vector-effect:non-scaling-stroke}.city-route{fill:none;stroke:#a87929;stroke-width:3;stroke-dasharray:7 5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.city-marker{cursor:pointer;outline:none}.property-dot{fill:#fff;stroke:#485f4b;stroke-width:2;vector-effect:non-scaling-stroke}.property-dot.start{fill:#ffe8a9;stroke:#9c6512}.property-dot.chance{fill:#ffe3a6}.property-dot.fate{fill:#e4d8ff}.city-marker.owned-you .property-dot{fill:#1d4ed8;stroke:#172e7b}.city-marker.owned-cpu .property-dot{fill:#c2410c;stroke:#79290c}.selection-ring{fill:none;stroke:#273547;stroke-width:2;stroke-dasharray:3 3;opacity:0;vector-effect:non-scaling-stroke;pointer-events:none}.selection-ring.visible,.city-marker:focus-visible .selection-ring{opacity:1}.city-number{fill:#26392b;text-anchor:middle;font-size:18px;font-weight:900;pointer-events:none}.owned-you .city-number,.owned-cpu .city-number{fill:#fff}.player-token{font-size:23px;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:2px;stroke-linejoin:round;pointer-events:none}.map-caption{position:absolute;right:8px;bottom:6px;max-width:calc(100% - 16px);padding:3px 7px;border-radius:12px;background:#fffffff0;color:#4d5e4e;font-size:.6rem}.map-caption a{color:inherit}
.route-panel{display:flex;min-height:0;min-width:0;flex-direction:column;overflow:hidden;border:1px solid #bdcdb3;border-radius:15px;background:#fff}.route-panel>header{display:flex;align-items:baseline;justify-content:space-between;padding:7px 10px;gap:8px}.route-panel>header strong{font-size:.95rem}.route-panel>header span{font-size:.65rem;color:#667366}.ownership-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding:4px 6px;background:#fff;font-size:.66rem;font-weight:700}.ownership-legend>span{display:flex;align-items:center;gap:4px}.swatch{width:12px;height:12px;border-radius:3px;border:1px solid #879286;display:inline-block}.swatch.you{background:#1d4ed8;border-color:#172e7b}.swatch.cpu{background:#c2410c;border-color:#79290c}.swatch.vacant{background:#fff}.route-legend{display:flex;justify-content:space-between;gap:4px;margin:0;padding:4px 8px;background:#f7f1e3;font-size:.6rem}.route-panel ol{display:flex;min-height:0;flex:1;flex-direction:column;gap:3px;overflow:hidden;margin:0;padding:5px;list-style:none}.route-panel li{display:flex;flex:1;min-height:0}.route-panel li>button{position:relative;display:flex;width:100%;min-height:0;min-width:0;align-items:center;gap:6px;padding:2px 5px;border:1px solid #e2e8df;border-left:5px solid #cbd2c8;border-radius:7px;background:#f7f9f5;text-align:left;font:inherit;color:inherit;cursor:pointer}
.route-panel button.owned-you{background:#dbeafe;border-color:#93b4fb;border-left-color:#1d4ed8}.route-panel button.owned-cpu{background:#ffedd5;border-color:#f5b28b;border-left-color:#c2410c}.route-panel button.viewed{box-shadow:inset 0 0 0 2px #334155}.route-panel button.current-stop .route-number{outline:2px dashed #334155;outline-offset:1px}.route-number{display:grid;width:22px;height:22px;flex:none;place-items:center;border-radius:50%;background:#fff;color:#344538;font-size:.7rem;font-weight:900}.stop-copy{display:flex;min-width:0;flex:1;flex-direction:column;line-height:1.1}.stop-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.75rem}.stop-copy i{font-style:normal}.stop-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.6rem;color:#52604e}.stop-copy>span{overflow:hidden;color:#314738;font-size:.7rem;text-overflow:ellipsis;white-space:nowrap}.stop-side{display:flex;align-items:flex-end;flex-direction:column;gap:2px}.stop-owner{padding:2px 4px;border-radius:4px;background:#fff;color:#52604e;font-size:.6rem;font-weight:800;white-space:nowrap}.owned-you .stop-owner{background:#1d4ed8;color:#fff}.owned-cpu .stop-owner{background:#c2410c;color:#fff}.stop-token{font-size:.85rem;white-space:nowrap}.ai-status{margin:0;padding:7px 9px;border-top:1px solid #d8e2f5;background:#edf2ff;color:#283c77;font-size:.7rem;font-weight:800}.route-hint{margin:0;padding:5px;text-align:center;font-size:.6rem;color:#607163}
.event-card{display:flex;align-items:center;gap:12px;min-height:112px;border:2px solid #ddad51;border-radius:14px;padding:12px;background:#fff5d9}.event-card.fate{border-color:#a98dce;background:#f2eaff}.event-icon{font-size:2.6rem}.event-copy{flex:1;min-width:0}.event-copy h2{margin:3px 0;font-size:1.1rem}.event-copy p{margin:3px 0;font-size:.75rem}.event-copy strong{font-size:.8rem;color:#5a3d12}.event-card button{font-size:.78rem;white-space:nowrap}.event-wait{font-size:.7rem}.message{min-height:26px;display:flex;align-items:center;padding:4px 10px;border-radius:8px;background:#fff;font-size:.78rem;overflow-wrap:anywhere}.empty-board{display:grid;place-items:center}
.overlay{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:18px;background:#142117bb;overflow:auto}.modal{width:min(440px,100%);max-height:calc(100dvh - 36px);overflow:auto;padding:23px;border-radius:18px;background:#fff;color:#233;text-align:center;box-shadow:0 16px 60px #0005}.modal h2{font-size:1.25rem}.modal-turn{margin-top:0;color:#46704e;font-weight:800;line-height:1.6;overflow-wrap:anywhere}.answers,.modal form{display:grid;gap:9px}.modal input{width:100%;border-color:#d3d9d0;background:#fff;text-align:center;letter-spacing:.25em;font-size:16px}.letter-label{font-size:.8rem}.masked-word{margin:10px 0;color:#243c2a;font-family:monospace;font-size:1.8rem;font-weight:900;letter-spacing:.24em;overflow-wrap:anywhere}.thinking-dots{display:flex;justify-content:center;gap:7px;margin:16px 0}.thinking-dots i{width:11px;height:11px;border-radius:50%;background:#547dbe;animation:think 1s infinite ease-in-out}.thinking-dots i:nth-child(2){animation-delay:.15s}.thinking-dots i:nth-child(3){animation-delay:.3s}@keyframes think{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-7px)}}
.verb-modal{width:min(520px,100%)}.verb-modal .verb-field{display:grid;gap:7px;padding:10px;border:1px solid #d9e5d9;border-radius:10px}.verb-field h3,.verb-field p{margin:0}.verb-field h3{font-size:1rem}.verb-field label{font-size:.82rem}.verb-field .answers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.verb-field .answers button{overflow-wrap:anywhere;background:#f5fbf3}.verb-field .answers button.selected{background:#72c984;box-shadow:inset 0 0 0 2px #174d25}.verb-field .masked-word{font-size:1.4rem}
.result-words{text-align:left;line-height:1.5;overflow-wrap:anywhere}.result-words summary{cursor:pointer;font-weight:700}.result-links{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.save-error{color:#a12222;font-size:.8rem}
@media(max-width:1100px){.title-block{gap:8px;flex-direction:column;align-items:flex-start}.title-block h1{font-size:1.05rem}.title-block p{display:none}.map-layout{grid-template-columns:minmax(0,1fr) 290px}.map-picker{max-width:600px}.topbar{gap:8px}}
@media(max-height:850px) and (min-width:851px){.page{gap:5px;padding:7px 12px}.topbar{min-height:55px}.scores>div{min-height:48px}.route-panel>header{padding:5px 8px}.ownership-legend{padding:3px}.route-hint{padding:3px}.route-legend{padding:3px 6px}.route-panel li>button{padding-top:1px;padding-bottom:1px}.stop-copy{line-height:1}.stop-copy b{font-size:.68rem}.stop-copy small{font-size:.54rem}.stop-copy>span{font-size:.64rem}.route-panel ol{gap:2px}.ai-status{padding:5px 7px}.event-card{min-height:110px;padding:8px}}
@media(max-width:850px){
 .page{position:static;height:auto;min-height:100dvh;overflow:visible;grid-template-rows:auto auto auto auto;padding:10px;gap:10px;padding-bottom:max(12px,env(safe-area-inset-bottom))}.page.playing{padding-bottom:calc(155px + env(safe-area-inset-bottom))}
 .topbar{display:flex;flex-wrap:wrap;gap:12px}.title-block{width:100%;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;white-space:normal}.title-block h1{font-size:1.2rem}.title-block .back-link{padding:8px 0;min-height:40px;display:flex;align-items:center}.map-picker{width:100%;max-width:none;flex:auto;grid-template-columns:1fr 1fr;gap:8px}.map-picker .setup-field:first-child{grid-column:1/-1}.setup-field label{font-size:.8rem}.setup-field select{min-height:44px;font-size:16px}.start-button{grid-column:1/-1;min-height:46px;font-size:1rem}.locked-map{font-size:.95rem}.locked-map span{display:inline;margin-left:8px;font-size:.72rem}
 .dice-controls{position:fixed;bottom:0;left:0;right:0;z-index:8;max-height:150px;padding:9px 12px calc(9px + env(safe-area-inset-bottom));background:#fffffff7;border-top:2px solid #bdcdb3;box-shadow:0 -4px 18px #24382b22}.dice-controls.pre-game,.dice-controls.game-ended{display:none}.dice-row{justify-content:space-between;gap:12px;max-width:650px;margin:0 auto}.dice-display{min-width:120px;justify-content:center;min-height:44px}.roll-button{min-height:46px;flex:1;max-width:340px;font-size:1rem}.mobile-turn-status{display:block;margin:6px auto 0;max-width:650px;max-height:3.9em;overflow:auto;font-size:.82rem;line-height:1.3;overflow-wrap:anywhere}
 .scores{grid-template-columns:1fr 1fr;gap:7px}.scores>div{min-height:62px;padding:6px 8px}.scores b{font-size:.85rem}.scores strong{font-size:1.1rem}.scores span{grid-column:1/-1;font-size:.72rem}.scores strong{grid-row:1}.scores .round-card{grid-column:1/-1;min-height:32px;flex-direction:row;gap:9px;padding:5px 8px}.round-card small{font-size:.68rem}
 .map-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto;gap:10px}.map-main{grid-template-rows:clamp(280px,48svh,430px) auto;gap:10px}.map-caption{font-size:.65rem}.route-panel{overflow:visible}.route-panel>header{padding:10px 12px}.route-panel>header strong{font-size:1rem}.route-panel>header span{font-size:.8rem}.ownership-legend{padding:7px;gap:15px;font-size:.8rem}.swatch{width:14px;height:14px}.route-legend{padding:7px 10px;font-size:.75rem;flex-wrap:wrap;justify-content:flex-start;gap:12px}.route-panel ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:8px;gap:6px;overflow:visible}.route-panel li>button{min-height:76px;align-items:center;padding:6px;gap:8px}.route-number{width:26px;height:26px;font-size:.8rem}.stop-copy{line-height:1.25}.stop-copy b,.stop-copy small,.stop-copy>span{white-space:normal;overflow-wrap:anywhere}.stop-copy b{font-size:.9rem}.stop-copy small{font-size:.72rem}.stop-copy>span{font-size:.85rem}.stop-owner{font-size:.65rem;padding:3px 4px}.stop-token{font-size:1rem}.ai-status,.route-hint{padding:9px 12px;font-size:.8rem}
 .event-card{flex-wrap:wrap;gap:8px;padding:12px}.event-icon{font-size:2rem}.event-copy{flex-basis:75%}.event-copy h2{font-size:1.1rem}.event-copy p,.event-copy strong{font-size:.88rem}.event-card button{width:100%;min-height:44px;font-size:1rem}.event-wait{width:100%;font-size:.85rem;text-align:center}.message{font-size:.85rem;line-height:1.5;padding:9px 11px}.overlay{padding:12px;align-items:start;padding-top:max(12px,env(safe-area-inset-top))}.modal{max-height:calc(100dvh - 24px - env(safe-area-inset-top));margin:auto;padding:20px 16px}.modal h1{font-size:1.45rem}.modal h2{font-size:1.15rem}.modal button{min-height:46px;font-size:1rem;overflow-wrap:anywhere}.modal input{min-height:46px}.masked-word{font-size:clamp(1.2rem,6vw,1.8rem);letter-spacing:.12em}.result-links{flex-direction:column;gap:4px}.result-links a{padding:10px 5px;min-height:44px}.result-words summary{min-height:44px;padding:10px 0}
}
@media(max-width:480px){.route-panel ol{grid-template-columns:minmax(0,1fr)}.route-panel li>button{min-height:72px;padding:8px 10px}.stop-owner{font-size:.75rem}.stop-copy small{font-size:.8rem}.stop-side{min-width:65px}.scores span{font-size:.66rem}.scores .round-card{flex-wrap:wrap;gap:3px 8px}.title-block h1{font-size:1.1rem}.locked-map span{display:block;margin:4px 0 0}}
@media(prefers-reduced-motion:reduce){.dice-display.rolling,.thinking-dots i{animation:none}}

</style>
