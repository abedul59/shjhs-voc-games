<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import maps from '~/data/monopoly-maps.json';
import MonopolyCityCard from '~/components/MonopolyCityCard.vue';
import { useMonopolyDuel } from '~/composables/useMonopolyDuel';
import { DUEL_NAME, ROUND_OPTIONS, stopsFor, landPrice, eventLabel } from '~/lib/monopoly-duel';

const { state, room, words, loading, busy, error, accessError, searching, active, connected, myIndex, myTurn, opponentAway,
  saving, saved, saveError, todayEscapes, maxEscapes, lesson, startMatchmaking, cancelMatchmaking, act, saveResults, resetRoom, leaveRoute, syncRoom } = useMonopolyDuel();
const selectedMap = ref('taiwan'), selectedRounds = ref(20), roundOptions = ROUND_OPTIONS;
const viewedCity = ref(0), answer = ref(''), letterInput = ref(null), animatedDice = ref([1, 1]);
const student = useCookie('currentStudent');
const displayState = computed(() => state.value || { mapId: selectedMap.value, board: words.value.slice(0, 12), owned: {} });
const started = computed(() => !!state.value && state.value.phase !== 'waiting');
const done = computed(() => state.value?.phase === 'over');
const activeMap = computed(() => maps.find(map => map.id === displayState.value.mapId) || maps[0]);
const routeStops = computed(() => stopsFor(displayState.value));
const routePoints = computed(() => routeStops.value.map(stop => stop.x + ',' + stop.y).join(' '));
const selectedCity = computed(() => routeStops.value[viewedCity.value] || routeStops.value[0]);
const players = computed(() => state.value?.players.length === 2 ? state.value.players : [state.value?.players[0] || { name: student.value?.name || '你', cash: 1500, pos: 0, shields: 0 }, { name: '等待對手', cash: 1500, pos: 0, shields: 0 }]);
const localIndex = computed(() => myIndex.value >= 0 ? myIndex.value : 0);
const myPlayer = computed(() => players.value[localIndex.value]);
const opponent = computed(() => players.value[1 - localIndex.value]);
const owned = computed(() => state.value?.owned || {});
const owner = id => owned.value[id] ?? -1;
const ownerLabel = id => owner(id) < 0 ? '待購土地' : owner(id) === localIndex.value ? '我方土地' : '對手土地';
const price = id => landPrice(displayState.value, id);
const turn = computed(() => state.value?.turn || 0), round = computed(() => state.value?.round || 1);
const gameRounds = computed(() => state.value?.rounds || selectedRounds.value);
const rolling = computed(() => state.value?.phase === 'rolling');
const dice = computed(() => rolling.value ? animatedDice.value : state.value?.dice || [1, 1]);
const die = computed(() => rolling.value ? '…' : state.value?.die || '—');
const dicePips = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const question = computed(() => state.value?.question), eventCard = computed(() => state.value?.eventCard);
const canRoll = computed(() => myTurn.value && state.value.phase === 'ready' && !busy.value && connected.value);
const responding = computed(() => busy.value || !connected.value);
const message = computed(() => state.value?.message || '選擇相同課程、地圖與回合數後，兩位同學各按「尋找對手」。');
const turnStatus = computed(() => !connected.value && room.value ? '連線中斷，正在重新連線；操作暫停。' : opponentAway.value ? '對手暫時離線，保留進度等待重連（超過 90 秒判離場）。' : active.value && !myTurn.value ? state.value.message + '（對手回合）' : '');
const finishReason = computed(() => state.value?.finishReason || '');
const rightWords = computed(() => myPlayer.value.correct || []), wrongWords = computed(() => myPlayer.value.wrong || []);
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: DUEL_NAME, ...(state.value?.lesson || lesson) } }));
const saveStatus = computed(() => saved.value ? '雙方分數、勝敗與對錯單字已儲存，可在學習紀錄、英雄榜與後台報表查看。' : saving.value ? '儲存雙方遊戲紀錄中…' : '成績尚未全部儲存，請按「重試儲存」。');
const resultTitle = computed(() => state.value?.escaped === myIndex.value ? '你已離場' : state.value?.winner === null ? '平手' : state.value?.winner === myIndex.value ? '你贏了！' : '對手獲勝');
function chooseMap() { viewedCity.value = 0; }
async function newMatch() {
  selectedMap.value = state.value?.mapId || selectedMap.value;
  selectedRounds.value = state.value?.rounds || selectedRounds.value;
  await resetRoom(); viewedCity.value = 0;
}
function submit() {
  if (!myTurn.value || !question.value || responding.value) return;
  void act({ type: 'answer', questionId: question.value.id, answer: answer.value });
}
watch(() => state.value?.question?.id, () => {
  answer.value = '';
  if (myTurn.value && question.value?.type === 'letters') nextTick(() => letterInput.value?.focus());
});
watch(() => state.value ? `${state.value.turn}:${state.value.players[state.value.turn]?.pos}` : '', () => { if (active.value) viewedCity.value = players.value[turn.value].pos; });
let diceTimer = null;
watch(rolling, value => {
  clearInterval(diceTimer);
  if (value) diceTimer = setInterval(() => { animatedDice.value = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]; }, 80);
});
onBeforeUnmount(() => clearInterval(diceTimer));
onBeforeRouteLeave(leaveRoute);
</script>

<template>
<main class="page" :class="{ playing: started && !done }">
 <header class="topbar">
  <div class="title-block"><NuxtLink class="back-link" to="/">← 遊戲選單</NuxtLink><div><h1>🏘️ 單字大富翁（雙人）</h1><p>同課程配對 · 輪流答題買地</p></div></div>
  <div v-if="!room" class="map-picker">
   <div class="setup-field"><label for="country">開局地圖</label><select id="country" v-model="selectedMap" @change="chooseMap"><option v-for="map in maps" :key="map.id" :value="map.id">{{ map.flag }} {{ map.name }}</option></select></div>
   <div class="setup-field"><label for="round-count">遊戲回合</label><select id="round-count" v-model.number="selectedRounds"><option v-for="count in roundOptions" :key="count" :value="count">{{ count }} 回合</option></select></div>
   <button class="start-button" type="button" :disabled="loading || busy || !routeStops.length || !!accessError" @click="startMatchmaking(selectedMap, selectedRounds)">{{ loading ? '載入單字…' : busy ? '配對中…' : '🔍 尋找對手' }}</button>
  </div>
  <p v-else class="locked-map">{{ activeMap.flag }} {{ activeMap.name }} · {{ gameRounds }} 回合 <span>🔒 開局設定已固定</span><button v-if="searching" class="cancel-match" :disabled="busy" @click="cancelMatchmaking">取消配對</button></p>
  <div v-if="started" class="dice-controls" :class="{ 'pre-game': !started, 'game-ended': done }">
   <div class="dice-row"><div class="dice-display" :class="{ rolling }" role="status" :aria-label="rolling ? '骰子滾動中' : '骰子點數：' + die"><span v-for="(value, index) in dice" :key="index" class="die-face" aria-hidden="true"><i v-for="pip in 9" :key="pip" class="pip" :class="{ visible: dicePips[value].includes(pip-1) }" /></span><b>{{ die }}</b></div>
   <button class="roll-button" type="button" :disabled="!canRoll" @click="act({ type: 'roll' })">🎲 {{ myTurn ? '擲骰' : '對手回合' }}</button></div>
   <p class="mobile-turn-status">{{ turnStatus || message }}</p>
  </div>
  <div v-if="error || accessError" class="connection-banner" role="alert">{{ error || accessError }} <button v-if="room" @click="syncRoom">重新連線</button></div>
 </header>
 <section class="scores">
  <div v-for="(player, i) in players" :key="i" :class="{ active: started && turn === i, 'score-you': i === localIndex, 'score-cpu': i !== localIndex }"><b>{{ i === localIndex ? '🧑‍🎓 我方' : '🧑‍🚀 對手' }} · {{ player.name }}</b><strong>$ {{ player.cash }}</strong><span>第 {{ player.pos+1 }} 站 · 土地 {{ Object.values(owned).filter(v => v === i).length }} · 免租券 {{ player.shields }}</span></div>
  <div class="round-card">{{ started ? '第 ' + round + ' / ' + gameRounds + ' 回合' : '本局 ' + gameRounds + ' 回合' }}<small>雙方各行動一次＝1 回合</small></div>
 </section>
 <section v-if="routeStops.length" class="map-layout">
  <div class="map-main">
   <div class="map-canvas" :aria-label="activeMap.name + '城市路線地圖'">
    <svg class="map-svg" :viewBox="activeMap.viewBox" preserveAspectRatio="xMidYMid meet" role="group" :aria-label="activeMap.name + '國界與城市路線'">
     <path v-for="(shape, i) in activeMap.shapes" :key="i" class="country-outline" :d="shape"/>
     <polyline v-if="routeStops.length > 1" class="city-route" :points="routePoints"/>
     <g v-for="(stop, i) in routeStops" :key="stop.name" class="city-marker" :class="{ 'owned-you': owner(stop.word.id) === localIndex, 'owned-cpu': owner(stop.word.id) >= 0 && owner(stop.word.id) !== localIndex }" role="button" tabindex="0" :aria-label="'第 ' + (i+1) + ' 站 ' + stop.name + ' ' + stop.en + '，' + ownerLabel(stop.word.id) + '，查看城市介紹'" @click="viewedCity = i" @keydown.enter.prevent="viewedCity = i" @keydown.space.prevent="viewedCity = i">
      <title>{{ stop.name }} {{ stop.en }} · {{ ownerLabel(stop.word.id) }}{{ stop.eventType ? ' · ' + eventLabel(stop.eventType) : '' }}</title>
      <circle class="selection-ring" :class="{ visible: viewedCity === i }" :cx="stop.x" :cy="stop.y" r="23"/>
      <circle class="property-dot" :cx="stop.x" :cy="stop.y" r="17" :class="{ start: i === 0, chance: stop.eventType === 'chance', fate: stop.eventType === 'fate' }"/>
      <text class="city-number" :x="stop.x" :y="stop.y + 5">{{ i+1 }}</text>
      <text v-if="myPlayer.pos === i" class="player-token" :x="stop.x - 12" :y="stop.y - 21">🧑‍🎓</text>
      <text v-if="opponent.pos === i" class="player-token" :x="stop.x + 8" :y="stop.y - 21">🧑‍🚀</text>
     </g>
    </svg>
    <div class="map-caption">{{ activeMap.flag }} {{ activeMap.extent || activeMap.name }} · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a></div>
   </div>
   <section v-if="eventCard" class="event-card" :class="eventCard.type" role="status" aria-live="polite">
    <div class="event-icon" aria-hidden="true">{{ eventCard.type === 'chance' ? '🎁' : '🔮' }}</div>
    <div class="event-copy"><p>{{ eventCard.player }}的{{ eventLabel(eventCard.type) }}</p><h2>{{ eventCard.title }}</h2><p>{{ eventCard.text }}</p><strong>{{ eventCard.effect }}</strong></div>
    <button v-if="myTurn" type="button" :disabled="responding" @click="act({ type: 'continue' })">繼續這一站 →</button><span v-else class="event-wait">等待對手閱讀卡片…</span>
   </section>
   <MonopolyCityCard v-else-if="selectedCity" :city="selectedCity" :country="activeMap.name"/>
  </div>
  <aside class="route-panel">
   <header><strong>城市路線</strong><span>點城市看介紹</span></header>
   <div class="ownership-legend" aria-label="土地顏色圖例"><span><i class="swatch you"></i>藍：我方</span><span><i class="swatch cpu"></i>橘：對手</span><span><i class="swatch vacant"></i>待購</span></div>
   <p class="route-legend"><span>🎁 機會</span><span>🔮 命運</span>到站抽卡後照常買地</p>
   <ol>
    <li v-for="(stop, i) in routeStops" :key="stop.name">
     <button type="button" :class="{ 'owned-you': owner(stop.word.id) === localIndex, 'owned-cpu': owner(stop.word.id) >= 0 && owner(stop.word.id) !== localIndex, 'current-stop': myPlayer.pos === i || opponent.pos === i, viewed: viewedCity === i }" :aria-pressed="viewedCity === i" :title="stop.name + ' ' + stop.en + ' · ' + stop.word.zh_tw + ' · ' + ownerLabel(stop.word.id)" @click="viewedCity = i">
      <span class="route-number">{{ i+1 }}</span>
      <span class="stop-copy"><b>{{ stop.name }} <i v-if="stop.eventType">{{ stop.eventType === 'fate' ? '🔮' : stop.eventType === 'both' ? '🎁🔮' : '🎁' }}</i></b><small>{{ stop.en }}</small><span>{{ stop.word.zh_tw }}</span></span>
      <span class="stop-side"><span class="stop-owner">{{ owner(stop.word.id) < 0 ? '待購 $' + price(stop.word.id) : ownerLabel(stop.word.id) }}</span><span class="stop-token" aria-label="目前所在玩家">{{ myPlayer.pos === i ? '🧑‍🎓' : '' }}{{ opponent.pos === i ? '🧑‍🚀' : '' }}</span></span>
     </button>
    </li>
   </ol>
   <p v-if="turnStatus" class="ai-status" role="status" aria-live="polite">{{ turnStatus }}</p>
   <p v-else class="route-hint">到終點折返 · 經起點 +$200 · 租金 $30</p>
  </aside>
 </section>
 <section v-else class="empty-board">{{ loading ? '正在準備城市旅行…' : '本單元暫無可用單字' }}</section>
 <p class="message" role="status" aria-live="polite">{{ message }}<small v-if="!started">今日離場 {{ todayEscapes }}／{{ maxEscapes }} 次 · 超過 90 秒未連線判離場；重新整理可接回棋盤。</small></p>
 <div v-if="question" class="overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="單字購地問答">
  <p v-if="!connected || error" role="status" class="save-error">{{ error || '正在重新連線，作答暫停；原題與棋盤會保留。' }}</p>
  <template v-if="!myTurn"><p class="modal-turn">🧑‍🚀 {{ players[turn].name }} 的回合 · 正在思考答案</p><h2>「{{ question.word.zh_tw }}」</h2><p>{{ question.type === 'choice' ? '對手正在選擇英文單字' : '對手正在補出兩個字母' }}</p><div class="thinking-dots" aria-label="對手思考中"><i></i><i></i><i></i></div><p>請稍候看對手的作答結果。</p></template>
  <template v-else>
   <p class="modal-turn">{{ routeStops[myPlayer.pos]?.name }} · {{ routeStops[myPlayer.pos]?.en }}<br>答對即可花 $ {{ price(question.word.id) }} 買下土地</p>
   <template v-if="question.type === 'choice'"><h2>「{{ question.word.zh_tw }}」對應哪個英文單字？</h2><div class="answers"><button v-for="choice in question.choices" :key="choice.id" type="button" :disabled="responding" @click="answer = choice.id; submit()">{{ choice.en_us }}</button></div></template>
   <form v-else @submit.prevent="submit"><h2>「{{ question.word.zh_tw }}」<br>請補出英文單字缺少的兩個字母</h2><p class="masked-word">{{ question.masked }}</p><label class="letter-label" for="missing-letters">依空格順序，輸入兩個英文字母</label><input id="missing-letters" ref="letterInput" v-model="answer" autocomplete="off" autocapitalize="none" :spellcheck="false" maxlength="2" minlength="2" pattern="[A-Za-z]{2}" required placeholder="輸入兩個字母"><button type="submit" :disabled="responding">確認答案</button></form>
  </template>
  <p v-if="opponentAway" role="status">對手暫時離線，等待重新連線中；超過 90 秒判定離場。</p>
  <NuxtLink class="question-exit" to="/">離開對戰（記為逃跑）</NuxtLink>
 </section></div>
 <div v-if="done" class="overlay"><section class="modal result-modal" role="dialog" aria-modal="true" aria-label="遊戲結果">
  <h1>🏁 {{ resultTitle }}</h1>
  <p>{{ finishReason }}</p>
  <p><strong>本局分數：{{ myPlayer.cash }} 分（結算現金）</strong></p>
  <p>對手：{{ opponent.cash }} 元 · 你答對 {{ rightWords.length }} 次／答錯 {{ wrongWords.length }} 次</p>
  <details class="result-words"><summary>查看本局對錯單字</summary><p>✅ 答對：{{ rightWords.join(', ') || '無' }}</p><p>❌ 答錯：{{ wrongWords.join(', ') || '無' }}</p></details>
  <p role="status">{{ saveStatus }}</p>
  <p v-if="saveError" class="save-error">{{ saveError }}</p>
  <button v-if="saveError" type="button" :disabled="saving" @click="saveResults">重試儲存</button>
  <p v-if="saved" class="result-links"><NuxtLink :to="{ path: '/history', query: { game: DUEL_NAME } }">📊 我的學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">🏆 全校英雄榜</NuxtLink></p>
  <button type="button" :disabled="saving || !saved" @click="newMatch">再玩一次・重新配對</button>
  <p><NuxtLink to="/">回遊戲選單</NuxtLink></p>
 </section></div>
</main>
</template>

<style scoped>
.page{position:fixed;inset:0;height:100vh;height:100dvh;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:8px;overflow:hidden;padding:10px 16px;box-sizing:border-box;color:#253b32;background:var(--bg-color,#f4f0e6)}
.page *{box-sizing:border-box}.topbar,.scores,.map-layout,.message,.empty-board{width:min(100%,1440px);margin:0 auto;min-width:0}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:62px}.title-block{display:flex;align-items:center;gap:12px;white-space:nowrap}.title-block h1{margin:0;font-size:1.2rem}.title-block p{margin:3px 0 0;font-size:.75rem;color:#586c59}.back-link{font-size:.8rem;color:#346c4a}
.map-picker{display:grid;grid-template-columns:minmax(95px,1fr) minmax(90px,1fr) auto;align-items:end;gap:7px;max-width:410px;flex:1;min-width:0}.setup-field{display:grid;gap:4px;min-width:0}.setup-field label{font-size:.7rem;font-weight:700}.setup-field select{width:100%;min-height:40px;padding:6px;border:1px solid #9bb39e;border-radius:8px;font:inherit;font-size:.85rem;color:#253b32;background:#fff}.locked-map{margin:0;font-size:.9rem;font-weight:800}.locked-map span{display:block;margin-top:3px;font-size:.65rem;color:#647664}
.roll-button,.start-button,.event-card button,.modal button,.modal input{min-height:40px;padding:8px 12px;border:2px solid #347144;border-radius:9px;background:#72c984;color:#143b20;font:inherit;font-size:.9rem;font-weight:800;cursor:pointer}.start-button{white-space:nowrap}.roll-button:disabled,.start-button:disabled,.modal button:disabled{opacity:.48;cursor:not-allowed}button:focus-visible,select:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #9b610b;outline-offset:2px}
.dice-controls{flex:none}.dice-row{display:flex;align-items:center;gap:8px}.dice-display{display:flex;align-items:center;gap:3px;min-height:40px;padding:4px 8px;border:1px solid #d8c398;border-radius:10px;background:#fffaf0}.dice-display span{font-size:1.8rem;line-height:1}.dice-display b{min-width:1.2em;color:#8b5907;font-size:1.1rem;text-align:center}.dice-display.rolling{animation:tumble .14s linear infinite alternate}.mobile-turn-status{display:none}@keyframes tumble{from{transform:translateY(-3px) rotate(-8deg)}to{transform:translateY(3px) rotate(8deg)}}
.scores{display:grid;grid-template-columns:1fr 1fr minmax(145px,.65fr);gap:8px}.scores>div{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2px 8px;min-width:0;min-height:55px;padding:5px 10px;border:1px solid #bdc9b9;border-radius:9px;background:#fff}.scores .score-you{border-top:4px solid #1d4ed8}.scores .score-cpu{border-top:4px solid #c2410c}.scores .active{box-shadow:inset 0 0 0 2px #334155}.scores strong{grid-column:2;grid-row:1/3;font-size:1.05rem}.score-you strong{color:#1d4ed8}.score-cpu strong{color:#c2410c}.scores span{font-size:.68rem}.scores .round-card{display:flex;flex-direction:column;justify-content:center;font-size:.88rem;font-weight:800;text-align:center}.round-card small{font-weight:400;font-size:.6rem}
.map-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,315px);gap:10px;min-height:0}.map-main{display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;min-width:0;min-height:0}.map-canvas{position:relative;min-width:0;min-height:0;overflow:hidden;border:1px solid #bdcdb3;border-radius:16px;background:radial-gradient(ellipse at center,#fbfff6,#e7f1df);box-shadow:0 8px 22px #244a3017}.map-svg{position:absolute;inset:0;width:100%;height:100%}.country-outline{fill:#bad8bd;fill-opacity:.54;stroke:#527a5b;stroke-width:1.1;stroke-linejoin:round;vector-effect:non-scaling-stroke}.city-route{fill:none;stroke:#a87929;stroke-width:3;stroke-dasharray:7 5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.city-marker{cursor:pointer;outline:none}.property-dot{fill:#fff;stroke:#485f4b;stroke-width:2;vector-effect:non-scaling-stroke}.property-dot.start{fill:#ffe8a9;stroke:#9c6512}.property-dot.chance{fill:#ffe3a6}.property-dot.fate{fill:#e4d8ff}.city-marker.owned-you .property-dot{fill:#1d4ed8;stroke:#172e7b}.city-marker.owned-cpu .property-dot{fill:#c2410c;stroke:#79290c}.selection-ring{fill:none;stroke:#273547;stroke-width:2;stroke-dasharray:3 3;opacity:0;vector-effect:non-scaling-stroke;pointer-events:none}.selection-ring.visible,.city-marker:focus-visible .selection-ring{opacity:1}.city-number{fill:#26392b;text-anchor:middle;font-size:18px;font-weight:900;pointer-events:none}.owned-you .city-number,.owned-cpu .city-number{fill:#fff}.player-token{font-size:23px;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:2px;stroke-linejoin:round;pointer-events:none}.map-caption{position:absolute;right:8px;bottom:6px;max-width:calc(100% - 16px);padding:3px 7px;border-radius:12px;background:#fffffff0;color:#4d5e4e;font-size:.6rem}.map-caption a{color:inherit}
.route-panel{display:flex;min-height:0;min-width:0;flex-direction:column;overflow:hidden;border:1px solid #bdcdb3;border-radius:15px;background:#fff}.route-panel>header{display:flex;align-items:baseline;justify-content:space-between;padding:7px 10px;gap:8px}.route-panel>header strong{font-size:.95rem}.route-panel>header span{font-size:.65rem;color:#667366}.ownership-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding:4px 6px;background:#fff;font-size:.66rem;font-weight:700}.ownership-legend>span{display:flex;align-items:center;gap:4px}.swatch{width:12px;height:12px;border-radius:3px;border:1px solid #879286;display:inline-block}.swatch.you{background:#1d4ed8;border-color:#172e7b}.swatch.cpu{background:#c2410c;border-color:#79290c}.swatch.vacant{background:#fff}.route-legend{display:flex;justify-content:space-between;gap:4px;margin:0;padding:4px 8px;background:#f7f1e3;font-size:.6rem}.route-panel ol{display:flex;min-height:0;flex:1;flex-direction:column;gap:3px;overflow:hidden;margin:0;padding:5px;list-style:none}.route-panel li{display:flex;flex:1;min-height:0}.route-panel li>button{position:relative;display:flex;width:100%;min-height:0;min-width:0;align-items:center;gap:6px;padding:2px 5px;border:1px solid #e2e8df;border-left:5px solid #cbd2c8;border-radius:7px;background:#f7f9f5;text-align:left;font:inherit;color:inherit;cursor:pointer}
.route-panel button.owned-you{background:#dbeafe;border-color:#93b4fb;border-left-color:#1d4ed8}.route-panel button.owned-cpu{background:#ffedd5;border-color:#f5b28b;border-left-color:#c2410c}.route-panel button.viewed{box-shadow:inset 0 0 0 2px #334155}.route-panel button.current-stop .route-number{outline:2px dashed #334155;outline-offset:1px}.route-number{display:grid;width:22px;height:22px;flex:none;place-items:center;border-radius:50%;background:#fff;color:#344538;font-size:.7rem;font-weight:900}.stop-copy{display:flex;min-width:0;flex:1;flex-direction:column;line-height:1.1}.stop-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.75rem}.stop-copy i{font-style:normal}.stop-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.6rem;color:#52604e}.stop-copy>span{overflow:hidden;color:#314738;font-size:.7rem;text-overflow:ellipsis;white-space:nowrap}.stop-side{display:flex;align-items:flex-end;flex-direction:column;gap:2px}.stop-owner{padding:2px 4px;border-radius:4px;background:#fff;color:#52604e;font-size:.6rem;font-weight:800;white-space:nowrap}.owned-you .stop-owner{background:#1d4ed8;color:#fff}.owned-cpu .stop-owner{background:#c2410c;color:#fff}.stop-token{font-size:.85rem;white-space:nowrap}.ai-status{margin:0;padding:7px 9px;border-top:1px solid #d8e2f5;background:#edf2ff;color:#283c77;font-size:.7rem;font-weight:800}.route-hint{margin:0;padding:5px;text-align:center;font-size:.6rem;color:#607163}
.event-card{display:flex;align-items:center;gap:12px;min-height:112px;border:2px solid #ddad51;border-radius:14px;padding:12px;background:#fff5d9}.event-card.fate{border-color:#a98dce;background:#f2eaff}.event-icon{font-size:2.6rem}.event-copy{flex:1;min-width:0}.event-copy h2{margin:3px 0;font-size:1.1rem}.event-copy p{margin:3px 0;font-size:.75rem}.event-copy strong{font-size:.8rem;color:#5a3d12}.event-card button{font-size:.78rem;white-space:nowrap}.event-wait{font-size:.7rem}.message{min-height:26px;display:flex;align-items:center;padding:4px 10px;border-radius:8px;background:#fff;font-size:.78rem;overflow-wrap:anywhere}.empty-board{display:grid;place-items:center}
.overlay{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:18px;background:#142117bb;overflow:auto}.modal{width:min(440px,100%);max-height:calc(100dvh - 36px);overflow:auto;padding:23px;border-radius:18px;background:#fff;color:#233;text-align:center;box-shadow:0 16px 60px #0005}.modal h2{font-size:1.25rem}.modal-turn{margin-top:0;color:#46704e;font-weight:800;line-height:1.6;overflow-wrap:anywhere}.answers,.modal form{display:grid;gap:9px}.modal input{width:100%;border-color:#d3d9d0;background:#fff;text-align:center;letter-spacing:.25em;font-size:16px}.letter-label{font-size:.8rem}.masked-word{margin:10px 0;color:#243c2a;font-family:monospace;font-size:1.8rem;font-weight:900;letter-spacing:.24em;overflow-wrap:anywhere}.thinking-dots{display:flex;justify-content:center;gap:7px;margin:16px 0}.thinking-dots i{width:11px;height:11px;border-radius:50%;background:#547dbe;animation:think 1s infinite ease-in-out}.thinking-dots i:nth-child(2){animation-delay:.15s}.thinking-dots i:nth-child(3){animation-delay:.3s}@keyframes think{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-7px)}}
.result-words{text-align:left;line-height:1.5;overflow-wrap:anywhere}.result-words summary{cursor:pointer;font-weight:700}.result-links{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.save-error{color:#a12222;font-size:.8rem}
@media(max-width:1100px){.title-block{gap:8px;flex-direction:column;align-items:flex-start}.title-block h1{font-size:1.05rem}.title-block p{display:none}.map-layout{grid-template-columns:minmax(0,1fr) 290px}.map-picker{max-width:370px}.topbar{gap:8px}}
@media(max-height:850px) and (min-width:851px){.page{gap:5px;padding:7px 12px}.topbar{min-height:55px}.scores>div{min-height:48px}.route-panel>header{padding:5px 8px}.ownership-legend{padding:3px}.route-hint{padding:3px}.route-legend{padding:3px 6px}.route-panel li>button{padding-top:1px;padding-bottom:1px}.stop-copy{line-height:1}.stop-copy b{font-size:.68rem}.stop-copy small{font-size:.54rem}.stop-copy>span{font-size:.64rem}.route-panel ol{gap:2px}.ai-status{padding:5px 7px}.event-card{min-height:110px;padding:8px}}
@media(max-width:850px){
 .page{position:static;height:auto;min-height:100dvh;overflow:visible;grid-template-rows:auto auto auto auto;padding:10px;gap:10px;padding-bottom:max(12px,env(safe-area-inset-bottom))}.page.playing{padding-bottom:calc(155px + env(safe-area-inset-bottom))}
 .topbar{display:flex;flex-wrap:wrap;gap:12px}.title-block{width:100%;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;white-space:normal}.title-block h1{font-size:1.2rem}.title-block .back-link{padding:8px 0;min-height:40px;display:flex;align-items:center}.map-picker{width:100%;max-width:none;flex:auto;grid-template-columns:1fr 1fr;gap:8px}.setup-field label{font-size:.8rem}.setup-field select{min-height:44px;font-size:16px}.start-button{grid-column:1/-1;min-height:46px;font-size:1rem}.locked-map{font-size:.95rem}.locked-map span{display:inline;margin-left:8px;font-size:.72rem}
 .dice-controls{position:fixed;bottom:0;left:0;right:0;z-index:8;max-height:150px;padding:9px 12px calc(9px + env(safe-area-inset-bottom));background:#fffffff7;border-top:2px solid #bdcdb3;box-shadow:0 -4px 18px #24382b22}.dice-controls.pre-game,.dice-controls.game-ended{display:none}.dice-row{justify-content:space-between;gap:12px;max-width:650px;margin:0 auto}.dice-display{min-width:120px;justify-content:center;min-height:44px}.roll-button{min-height:46px;flex:1;max-width:340px;font-size:1rem}.mobile-turn-status{display:block;margin:6px auto 0;max-width:650px;max-height:3.9em;overflow:auto;font-size:.82rem;line-height:1.3;overflow-wrap:anywhere}
 .scores{grid-template-columns:1fr 1fr;gap:7px}.scores>div{min-height:62px;padding:6px 8px}.scores b{font-size:.85rem}.scores strong{font-size:1.1rem}.scores span{grid-column:1/-1;font-size:.72rem}.scores strong{grid-row:1}.scores .round-card{grid-column:1/-1;min-height:32px;flex-direction:row;gap:9px;padding:5px 8px}.round-card small{font-size:.68rem}
 .map-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto;gap:10px}.map-main{grid-template-rows:clamp(280px,48svh,430px) auto;gap:10px}.map-caption{font-size:.65rem}.route-panel{overflow:visible}.route-panel>header{padding:10px 12px}.route-panel>header strong{font-size:1rem}.route-panel>header span{font-size:.8rem}.ownership-legend{padding:7px;gap:15px;font-size:.8rem}.swatch{width:14px;height:14px}.route-legend{padding:7px 10px;font-size:.75rem;flex-wrap:wrap;justify-content:flex-start;gap:12px}.route-panel ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:8px;gap:6px;overflow:visible}.route-panel li>button{min-height:76px;align-items:center;padding:6px;gap:8px}.route-number{width:26px;height:26px;font-size:.8rem}.stop-copy{line-height:1.25}.stop-copy b,.stop-copy small,.stop-copy>span{white-space:normal;overflow-wrap:anywhere}.stop-copy b{font-size:.9rem}.stop-copy small{font-size:.72rem}.stop-copy>span{font-size:.85rem}.stop-owner{font-size:.65rem;padding:3px 4px}.stop-token{font-size:1rem}.ai-status,.route-hint{padding:9px 12px;font-size:.8rem}
 .event-card{flex-wrap:wrap;gap:8px;padding:12px}.event-icon{font-size:2rem}.event-copy{flex-basis:75%}.event-copy h2{font-size:1.1rem}.event-copy p,.event-copy strong{font-size:.88rem}.event-card button{width:100%;min-height:44px;font-size:1rem}.event-wait{width:100%;font-size:.85rem;text-align:center}.message{font-size:.85rem;line-height:1.5;padding:9px 11px}.overlay{padding:12px;align-items:start;padding-top:max(12px,env(safe-area-inset-top))}.modal{max-height:calc(100dvh - 24px - env(safe-area-inset-top));margin:auto;padding:20px 16px}.modal h1{font-size:1.45rem}.modal h2{font-size:1.15rem}.modal button{min-height:46px;font-size:1rem;overflow-wrap:anywhere}.modal input{min-height:46px}.masked-word{font-size:clamp(1.2rem,6vw,1.8rem);letter-spacing:.12em}.result-links{flex-direction:column;gap:4px}.result-links a{padding:10px 5px;min-height:44px}.result-words summary{min-height:44px;padding:10px 0}
}
@media(max-width:480px){.route-panel ol{grid-template-columns:minmax(0,1fr)}.route-panel li>button{min-height:72px;padding:8px 10px}.stop-owner{font-size:.75rem}.stop-copy small{font-size:.8rem}.stop-side{min-width:65px}.scores span{font-size:.66rem}.scores .round-card{flex-wrap:wrap;gap:3px 8px}.title-block h1{font-size:1.1rem}.locked-map span{display:block;margin:4px 0 0}}
@media(prefers-reduced-motion:reduce){.dice-display.rolling,.thinking-dots i{animation:none}}


/* Only the new multiplayer page uses these additions. */
.question-exit{display:inline-flex;align-items:center;min-height:44px;margin-top:10px;color:#7f1d1d;font-size:.85rem}
.topbar{flex-wrap:wrap}.title-block h1{font-size:1.05rem}.scores b{overflow-wrap:anywhere;font-size:.8rem}.scores>div{min-width:0}.message{flex-wrap:wrap;gap:5px}.message small{width:100%;font-size:.68rem}.connection-banner{flex-basis:100%;padding:8px 10px;border:1px solid #b45309;border-radius:8px;background:#fff4d9;color:#713f12;font-size:.85rem;overflow-wrap:anywhere}.connection-banner button,.cancel-match{min-height:40px;margin:4px;padding:6px 12px;border:1px solid #64748b;border-radius:7px;background:#fff;color:#253b32;font:inherit;cursor:pointer}.dice-display .die-face{display:grid;width:30px;height:30px;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:2px;padding:4px;border:1px solid #46574b;border-radius:5px;background:#fff}.pip{width:100%;height:100%;border-radius:50%;background:#253b32;opacity:0}.pip.visible{opacity:1}.modal .modal-turn{overflow-wrap:anywhere}
@media(max-width:850px){.title-block{flex-wrap:wrap}.title-block h1{font-size:1.08rem}.scores>div{grid-template-columns:minmax(0,1fr) auto}.scores b{font-size:.76rem}.scores strong{font-size:1rem}.dice-display .die-face{width:33px;height:33px}.connection-banner button,.cancel-match{min-height:44px}.message small{line-height:1.5}}
</style>
