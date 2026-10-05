<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue';
import { Chess } from 'chess.js';

const GAME_TYPE = '單字西洋棋';
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const pieceName = { k: '國王', q: '皇后', r: '城堡', b: '主教', n: '騎士', p: '士兵' };
const glyph = { w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }, b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' } };
const value = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const rules = [
  ['目標', '將死對方國王：王被將軍且無合法解法。國王不能被直接吃掉。'],
  ['棋子走法', '王一次走一格；后直線與斜線皆可；車走直線；象走斜線；馬走日字並可跳過棋子；兵直進斜吃。'],
  ['王車易位', '王與同側城堡都未走過，兩者之間無棋子，且王不能正受將軍、經過或抵達受攻擊格。先點國王，再點目標格。'],
  ['吃過路兵', '敵兵從起點前進兩格並經過我方兵可攻擊的格時，僅下一手能斜移至該經過格吃掉它。'],
  ['兵升變', '兵到達對方底線，可升為皇后、城堡、主教或騎士。'],
  ['和棋', '無合法走法但未被將軍是逼和；另有子力不足、重複局面與五十步規則。達成和棋條件時對局結束。']
];
const game = ref(markRaw(new Chess()));
const board = ref(game.value.board());
const selected = ref('');
const pendingMove = ref(null);
const promotion = ref('');
const quiz = ref(null);
const answer = ref('');
const words = ref([]);
const loading = ref(true);
const busy = ref(false);
const started = ref(false);
const finished = ref(false);
const outcome = ref('');
const notice = ref('正在讀取本課單字…');
const saveNotice = ref('');
const correctWords = ref([]);
const wrongWords = ref([]);
const moveList = ref([]);
const lastMove = ref(null);
const playerColor = ref('w');
const startedAt = ref(0);
const recordId = ref('');
const attemptNumber = ref(0);
let aiTimer = null;
let disposed = false;
const files = 'abcdefgh';
const squares = computed(() => {
  const ranks = playerColor.value === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const cols = playerColor.value === 'w' ? [...files] : [...files].reverse();
  return ranks.flatMap((rank, row) => cols.map((file, col) => ({
    id: `${file}${rank}`, row, col, piece: board.value[8 - rank][files.indexOf(file)]
  })));
});
const legalTargets = computed(() => selected.value ? game.value.moves({ square: selected.value, verbose: true }).map(move => move.to) : []);
const turnLabel = computed(() => {
  board.value; // Recompute after each chess.js move; the engine itself is intentionally not reactive.
  return finished.value ? '對局結束' : busy.value ? '電腦思考中…' : game.value.turn() === playerColor.value ? '輪到你' : '輪到電腦';
});
const score = computed(() => correctWords.value.length * 10 + (outcome.value === '勝利' ? 100 : outcome.value === '和棋' ? 40 : 0));
const historyLink = computed(() => ({ path: '/history', query: { game: GAME_TYPE } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME_TYPE, ...lesson } }));
const checkSquare = computed(() => {
  if (!game.value.isCheck()) return '';
  return squares.value.find(square => square.piece?.type === 'k' && square.piece.color === game.value.turn())?.id || '';
});
function updateBoard() { board.value = game.value.board(); moveList.value = game.value.history(); }
function reset() {
  if (aiTimer) clearTimeout(aiTimer);
  game.value = markRaw(new Chess()); updateBoard();
  selected.value = ''; pendingMove.value = null; promotion.value = ''; quiz.value = null;
  answer.value = ''; correctWords.value = []; wrongWords.value = []; lastMove.value = null;
  finished.value = false; outcome.value = ''; busy.value = false; started.value = true;
  startedAt.value = Date.now(); recordId.value = crypto.randomUUID(); attemptNumber.value = 0; saveNotice.value = '';
  notice.value = playerColor.value === 'w' ? '你執白棋先行。點選棋子，再點亮起的合法目標格。' : '電腦執白棋先行。';
  if (playerColor.value === 'b') scheduleAi();
}
function pickSquare(square) {
  if (!started.value || finished.value || busy.value || quiz.value || promotion.value || game.value.turn() !== playerColor.value) return;
  const piece = game.value.get(square);
  if (selected.value && legalTargets.value.includes(square)) {
    const move = { from: selected.value, to: square };
    selected.value = '';
    if (game.value.moves({ square: move.from, verbose: true }).some(item => item.to === move.to && item.isPromotion())) {
      pendingMove.value = move; promotion.value = 'choose'; return;
    }
    prepareQuiz(move); return;
  }
  selected.value = piece?.color === playerColor.value ? square : '';
}
function selectPromotion(type) {
  const move = { ...pendingMove.value, promotion: type };
  promotion.value = ''; pendingMove.value = null; prepareQuiz(move);
}
function shuffle(items) { return [...items].sort(() => Math.random() - .5); }
function prepareQuiz(move) {
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const distractors = shuffle(words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase())).slice(0, 3);
  pendingMove.value = move;
  quiz.value = { word, choices: shuffle([word, ...distractors]) };
  answer.value = '';
  notice.value = `要走 ${move.from} → ${move.to}，先回答單字題。`;
}
async function submitAnswer(choice = answer.value) {
  if (!quiz.value || !choice || busy.value) return;
  const current = quiz.value;
  const right = String(choice).trim().toLowerCase() === current.word.en_us.trim().toLowerCase();
  if (right) correctWords.value.push(current.word.en_us);
  else wrongWords.value.push(current.word.en_us);
  quiz.value = null; answer.value = '';
  if (!right) { pendingMove.value = null; notice.value = `答錯了。${current.word.zh_tw}＝${current.word.en_us}；棋子尚未移動，可再次嘗試。`; return; }
  try {
    const move = game.value.move(pendingMove.value);
    pendingMove.value = null;
    lastMove.value = move; updateBoard();
    notice.value = `答對！你走了 ${move.san}。`;
    if (finishIfOver()) return;
    if (game.value.isCheck()) notice.value += ' 電腦國王被將軍！';
    scheduleAi();
  } catch { pendingMove.value = null; notice.value = '這步棋已無效，請重新選擇。'; }
}
function evaluate(chess, color) {
  if (chess.isCheckmate()) return chess.turn() === color ? -100000 : 100000;
  let score = 0;
  for (const row of chess.board()) for (const piece of row) if (piece) {
    const sign = piece.color === color ? 1 : -1;
    score += sign * value[piece.type];
  }
  return score;
}
function chooseAiMove() {
  const color = game.value.turn();
  const moves = game.value.moves({ verbose: true });
  let best = -Infinity, candidates = [];
  for (const move of moves) {
    game.value.move(move);
    let rating = evaluate(game.value, color);
    if (game.value.isCheck()) rating += 35;
    if (!game.value.isGameOver()) {
      let reply = Infinity;
      for (const replyMove of game.value.moves({ verbose: true })) {
        game.value.move(replyMove);
        reply = Math.min(reply, evaluate(game.value, color));
        game.value.undo();
      }
      rating = rating * .35 + reply * .65;
    }
    game.value.undo();
    rating += Math.random() * 8;
    if (rating > best + .01) { best = rating; candidates = [move]; }
    else if (Math.abs(rating - best) < .01) candidates.push(move);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
function scheduleAi() {
  busy.value = true; notice.value = '電腦正在思考下一步…';
  aiTimer = window.setTimeout(() => {
    if (disposed || finished.value || !started.value) return;
    const move = chooseAiMove();
    if (move) { lastMove.value = game.value.move(move); updateBoard(); notice.value = `電腦走了 ${lastMove.value.san}。${game.value.isCheck() ? '你的國王被將軍，必須先解將。' : '輪到你。'}`; }
    busy.value = false; finishIfOver();
  }, 950);
}
function finishIfOver() {
  if (!game.value.isGameOver()) return false;
  if (game.value.isCheckmate()) { outcome.value = game.value.turn() === playerColor.value ? '落敗' : '勝利'; notice.value = `將死！${outcome.value}。`; }
  else { outcome.value = '和棋'; notice.value = game.value.isStalemate() ? '逼和：輪到走棋的一方沒有合法走法。' : '本局和棋。'; }
  finished.value = true; busy.value = false; saveRecord(); return true;
}
function resign() {
  if (!started.value || finished.value) return;
  if (!window.confirm('確定認輸並結束這局？')) return;
  if (aiTimer) clearTimeout(aiTimer);
  quiz.value = null; promotion.value = ''; finished.value = true; outcome.value = '認輸';
  notice.value = '你已認輸。本局結束。'; saveRecord();
}
async function saveRecord() {
  if (!student.value?.id || !recordId.value) return;
  if (!attemptNumber.value) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', String(student.value.id)).eq('game_type', GAME_TYPE)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    attemptNumber.value = (count || 0) + 1;
  }
  const { error } = await db.from('game_records').upsert({
    id: recordId.value, student_id: String(student.value.id), game_type: GAME_TYPE,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: score.value, mistakes: wrongWords.value.length,
    correct_words: correctWords.value.join(', '), wrong_words: wrongWords.value.join(', '),
    attempt_number: attemptNumber.value, played_at: new Date(startedAt.value).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - startedAt.value) / 1000), device_info: navigator.userAgent
  }, { onConflict: 'id' });
  saveNotice.value = error ? `紀錄儲存失敗：${error.message}，請按「重試儲存」。` : '本局分數及對錯單字已記錄。';
}
onMounted(async () => {
  if (!student.value?.id) { await navigateTo('/'); return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) { loading.value = false; notice.value = '請先從首頁選擇課本、冊次和單元。'; return; }
  const { data, error } = await db.from('vocabularies').select('en_us,zh_tw')
    .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
  loading.value = false;
  if (error) { notice.value = `單字載入失敗：${error.message}`; return; }
  const seen = new Set();
  words.value = (data || []).filter(word => {
    const key = word.en_us?.trim().toLowerCase();
    if (!key || !word.zh_tw?.trim() || seen.has(key)) return false;
    seen.add(key); return true;
  });
  notice.value = words.value.length >= 4 ? '請選擇執白棋或黑棋，再開始對局。' : '本課至少需要四筆不同單字；請回首頁選其他單元。';
});
onBeforeUnmount(() => { disposed = true; if (aiTimer) clearTimeout(aiTimer); });
</script>

<template>
  <main class="chess-page">
    <header class="chess-header">
      <div><span class="eyebrow">VOCABULARY · CHESS</span><h1>♔ 單字西洋棋</h1><p>與電腦對弈 · 答對本課單字才能落子</p></div>
      <nav><NuxtLink to="/">← 回首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">全校英雄榜</NuxtLink></nav>
    </header>
    <div class="chess-layout">
      <section class="play-panel">
        <div class="toolbar">
          <div><strong>{{ turnLabel }}</strong><small>{{ lesson.version }} · {{ lesson.volume }} · {{ lesson.unit }}</small></div>
          <div class="toolbar-actions"><select v-model="playerColor" :disabled="started && !finished" aria-label="選擇棋子顏色"><option value="w">我執白棋</option><option value="b">我執黑棋</option></select><button :disabled="loading || words.length < 4 || (started && !finished)" @click="reset">{{ started ? '再玩一局' : '開始遊戲' }}</button><button v-if="started && !finished" class="outline" @click="resign">認輸</button></div>
        </div>
        <div class="board-wrap">
          <div class="chess-board" role="grid" aria-label="西洋棋棋盤">
            <button v-for="square in squares" :key="square.id" class="square" :class="{ dark: (square.row + square.col) % 2 === 1, selected: selected === square.id, target: legalTargets.includes(square.id), recent: lastMove && [lastMove.from, lastMove.to].includes(square.id), checked: checkSquare === square.id }" :aria-label="`${square.id} ${square.piece ? (square.piece.color === 'w' ? '白' : '黑') + pieceName[square.piece.type] : '空格'}`" :disabled="!started || finished || busy || !!quiz || !!promotion" @click="pickSquare(square.id)">
              <span v-if="square.col === 0" class="coordinate rank">{{ square.id[1] }}</span><span v-if="square.row === 7" class="coordinate file">{{ square.id[0] }}</span>
              <span v-if="square.piece" class="piece" :class="square.piece.color === 'w' ? 'white-piece' : 'black-piece'">{{ glyph[square.piece.color][square.piece.type] }}</span>
              <span v-else-if="legalTargets.includes(square.id)" class="target-dot"></span>
            </button>
          </div>
        </div>
        <div class="game-notice" role="status">{{ notice }}</div>
        <div class="stats"><span>答對 <strong>{{ correctWords.length }}</strong></span><span>答錯 <strong>{{ wrongWords.length }}</strong></span><span>本局分數 <strong>{{ score }}</strong></span><span v-if="outcome">結果 <strong>{{ outcome }}</strong></span></div>
        <p v-if="saveNotice" class="save-status">{{ saveNotice }} <button v-if="saveNotice.includes('失敗')" @click="saveRecord">重試儲存</button></p>
      </section>
      <aside class="guide-panel">
        <div class="guide-top"><span class="eyebrow">FIELD GUIDE</span><h2>棋局說明</h2><a class="rule-source" href="https://handbook.fide.com/chapter/e012023" target="_blank" rel="noopener noreferrer">FIDE 西洋棋規則 ↗</a><p>選自己的棋子，亮點是可走的格子。每走一步先回答英文單字選擇題；答錯不落子，也不換電腦走。</p></div>
        <details v-for="rule in rules" :key="rule[0]" :open="['目標', '棋子走法'].includes(rule[0])"><summary>{{ rule[0] }}</summary><p>{{ rule[1] }}</p></details>
        <div class="notation"><h3>走棋紀錄</h3><p v-if="!moveList.length">對局開始後顯示每一步的記譜。</p><div v-else class="move-grid"><span v-for="(move, index) in moveList" :key="index"><small v-if="index % 2 === 0">{{ Math.floor(index / 2) + 1 }}.</small> {{ move }}</span></div></div>
      </aside>
    </div>
    <div v-if="quiz || promotion" class="modal-backdrop"><section class="dialog" role="dialog" aria-modal="true" :aria-label="promotion ? '選擇升變棋子' : '單字題目'">
      <template v-if="promotion"><span class="eyebrow">PAWN PROMOTION</span><h2>士兵升變</h2><p>請選擇新棋子，再回答單字題。</p><div class="promotion-list"><button v-for="type in ['q','r','b','n']" :key="type" @click="selectPromotion(type)">{{ glyph[playerColor][type] }} {{ pieceName[type] }}</button></div></template>
      <template v-else><span class="eyebrow">WORD CHALLENGE</span><h2>{{ quiz.word.zh_tw }}</h2><p>選出正確的英文單字，才能走這一步。</p><div class="choice-grid"><button v-for="(choice, index) in quiz.choices" :key="index" @click="submitAnswer(choice.en_us)">{{ choice.en_us }}</button></div><button class="cancel-quiz" @click="quiz = null; pendingMove = null; notice = '已取消這步棋。'">取消走棋</button></template>
    </section></div>
  </main>
</template>

<style scoped>
.chess-page{min-height:100vh;padding:24px clamp(12px,3vw,48px);background:radial-gradient(circle at 10% 0%,#304c61,#102533 55%,#0a1924);color:#f6eee0;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif}.chess-header{max-width:1500px;margin:0 auto 22px;display:flex;justify-content:space-between;gap:20px;align-items:end}.eyebrow{color:#dfbd78;letter-spacing:.23em;font-size:11px;font-weight:800}.chess-header h1{font-family:Georgia,serif;font-size:clamp(32px,4vw,56px);margin:4px 0}.chess-header p{margin:0;color:#b9cbd0}.chess-header nav{display:flex;gap:8px;flex-wrap:wrap}.chess-header a,.toolbar button,.save-status button{color:#f9edda;border:1px solid #b89965;background:#213f4b;border-radius:9px;padding:10px 14px;text-decoration:none;cursor:pointer}.chess-layout{max-width:1500px;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,380px);gap:24px}.play-panel,.guide-panel{border:1px solid #71919877;border-radius:20px;background:#193440d9;box-shadow:0 18px 42px #0005;padding:20px}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.toolbar strong{display:block;font-size:22px}.toolbar small{display:block;color:#b8c9cc}.toolbar-actions{display:flex;flex-wrap:wrap;gap:8px}.toolbar select{background:#f4e8d4;color:#20333a;border-radius:8px;padding:9px}.toolbar button{background:#b18c51;color:#142833;font-weight:800}.toolbar button:disabled,.toolbar select:disabled{opacity:.5;cursor:not-allowed}.toolbar .outline{background:transparent;color:#f9edda}.board-wrap{display:flex;justify-content:center}.chess-board{width:min(100%,min(72vh,760px));aspect-ratio:1;display:grid;grid-template-columns:repeat(8,1fr);border:9px solid #8e714c;box-shadow:0 15px 30px #0008,inset 0 0 0 2px #ddc391;border-radius:8px;overflow:hidden}.square{position:relative;border:0;border-radius:0;display:grid;place-items:center;background:#e9d8b4;padding:0;cursor:pointer;min-width:0;min-height:0}.square.dark{background:#71938f}.square.recent{box-shadow:inset 0 0 0 100px #f6d87555}.square.selected{box-shadow:inset 0 0 0 4px #f6d875}.square.checked{background:#db7d6e}.square.target:has(.piece){box-shadow:inset 0 0 0 5px #f6d875}.square:disabled{cursor:default}.coordinate{position:absolute;font-weight:800;font-size:clamp(8px,1vw,12px);opacity:.7;z-index:2}.rank{top:3px;left:4px}.file{bottom:2px;right:4px}.piece{font-family:Georgia,"DejaVu Serif",serif;font-size:clamp(30px,5.4vw,76px);line-height:1;z-index:1;filter:drop-shadow(1px 4px 2px #132a3888);transition:transform .2s}.square:hover .piece{transform:translateY(-2px)}.white-piece{color:#fff9ea;-webkit-text-stroke:1.2px #55442e;text-shadow:0 2px #c3a777,1px 4px #544739}.black-piece{color:#20333a;-webkit-text-stroke:.8px #d6b882;text-shadow:0 2px #796b57}.target-dot{width:24%;aspect-ratio:1;border-radius:50%;background:#123c4f77}.game-notice{margin:16px 0;padding:12px 15px;border-left:4px solid #d8b770;background:#234751;border-radius:5px;min-height:50px}.stats{display:flex;gap:10px;flex-wrap:wrap}.stats span{background:#244a54;padding:9px 13px;border-radius:9px}.stats strong{color:#ffe0a0}.save-status{color:#e5d5af}.guide-top h2{font-family:Georgia,serif;font-size:30px;margin:4px 0 8px}.guide-top p,.guide-panel details p,.notation p{line-height:1.65;color:#d2e0de}.guide-panel details{border-top:1px solid #ffffff26;padding:13px 2px}.guide-panel summary{cursor:pointer;font-weight:800;color:#f3dba8}.guide-panel details p{margin:9px 0 0}.notation{border-top:1px solid #ffffff26;padding-top:12px}.move-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-height:190px;overflow:auto}.move-grid span{background:#244b54;border-radius:6px;padding:4px 8px}.move-grid small{color:#e2c487}.modal-backdrop{position:fixed;inset:0;background:#07151dc9;z-index:10;display:grid;place-items:center;padding:16px}.dialog{width:min(100%,500px);background:#f7eddd;color:#213843;border:5px solid #c49b63;border-radius:20px;padding:30px;box-shadow:0 20px 80px #000a}.dialog h2{font-family:Georgia,serif;font-size:32px;margin:9px 0}.dialog p{line-height:1.6}.choice-grid,.promotion-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.dialog button{border:1px solid #bda87f;border-radius:10px;background:#fffaf0;color:#263e45;padding:15px;font-weight:800;cursor:pointer;font-size:16px}.dialog button:hover,.dialog button:focus-visible{background:#e7ce94}.dialog .cancel-quiz{border:0;background:transparent;color:#53656a;margin-top:12px;padding:8px}.promotion-list button{font-size:22px}@media(max-width:900px){.chess-layout{grid-template-columns:1fr}.guide-panel{max-width:none}.chess-header{align-items:start;flex-direction:column}.chess-board{width:min(100%,650px)}}@media(max-width:540px){.chess-page{padding:12px 8px}.play-panel,.guide-panel{padding:10px}.toolbar{align-items:start;flex-direction:column}.chess-board{border-width:5px}.piece{font-size:clamp(30px,10vw,55px)}.choice-grid{grid-template-columns:1fr 1fr}.dialog{padding:18px}}
.rule-source{display:inline-block;color:#f3dba8;font-size:12px;margin:0 0 5px}
</style>
<style scoped>
@media (min-width: 901px) {
  .chess-page{height:100vh;min-height:690px;overflow:hidden;padding:12px clamp(14px,2vw,32px);background:radial-gradient(circle at 15% 0%,#566876 0,#253948 42%,#171f32 100%)}
  .chess-header{max-width:1540px;margin-bottom:12px;align-items:center}
  .chess-header h1{font-size:clamp(30px,3vw,43px);margin:0 0 2px}
  .chess-header p{font-size:13px}
  .chess-header a{padding:8px 11px;background:#ffffff16;border-color:#b4c4b477}
  .chess-layout{max-width:1540px;height:calc(100vh - 105px);min-height:580px;grid-template-columns:minmax(0,1fr) minmax(285px,340px);gap:14px}
  .play-panel,.guide-panel{padding:13px;border-radius:17px;border-color:#bcc5af66;background:linear-gradient(145deg,#3b5361e8,#273b4bed)}
  .play-panel{display:flex;flex-direction:column;align-items:center;min-height:0;overflow:hidden}
  .toolbar{width:100%;min-height:45px;margin-bottom:8px}
  .toolbar strong{font-size:18px}
  .toolbar select,.toolbar button{padding:7px 9px;font-size:13px}
  .toolbar button{background:#d8bd87;color:#24333d}
  .board-wrap{width:100%;flex:1;min-height:0;align-items:center}
  .chess-board{width:min(100%,calc(100vh - 235px),700px);border-color:#8b7863}
  .square{background:#efe9d7}.square.dark{background:#869e98}
  .game-notice{width:100%;min-height:39px;margin:7px 0;padding:8px 12px;background:#4d6b70;border-color:#e1c48a;font-size:13px}
  .stats{width:100%;margin-top:2px}.stats span{padding:5px 9px;background:#ffffff15;font-size:12px}
  .guide-panel{overflow-y:auto;scrollbar-width:thin}
  .guide-top h2{font-size:26px;margin:2px 0}.guide-top p,.guide-panel details p,.notation p{font-size:13px;line-height:1.4}
  .guide-panel details{padding:8px 2px}.guide-panel summary{font-size:14px}
  .notation{padding-top:7px}.notation h3{font-size:15px;margin:5px 0}.move-grid{max-height:110px;font-size:12px}
}
</style>
