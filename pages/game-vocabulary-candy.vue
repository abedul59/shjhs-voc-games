<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const GAME = '單字Candy Crush';
const SIZE = 8;
const COLORS = ['莓果紅', '檸檬黃', '薄荷綠', '葡萄紫', '海洋藍', '蜜橘橙'];
const SYMBOLS = ['♥', '✦', '✿', '◆', '★', '●'];
const CHAPTERS = [
  { name: '糖霜小鎮', icon: '🍓', places: ['糖果街口', '奶油廣場', '餅乾小橋', '焦糖鐘樓', '甜心車站'] },
  { name: '果凍花園', icon: '🌼', places: ['果香入口', '軟糖溫室', '蜜蜂小徑', '彩葉池畔', '果凍花塔'] },
  { name: '太妃山谷', icon: '🍯', places: ['蜂蜜坡道', '布丁瀑布', '脆糖棧道', '奶糖岩洞', '太妃山頂'] },
  { name: '薄荷森林', icon: '🌿', places: ['清涼樹林', '棒棒糖橋', '泡泡溪流', '綠光迷宮', '薄荷月台'] },
  { name: '星光糖屋', icon: '🌟', places: ['流星庭院', '月光廚房', '銀河糖罐', '星塵陽台', '夜空鐘塔'] },
  { name: '彩虹城堡', icon: '🌈', places: ['七色城門', '雲朵走廊', '彩虹宴會廳', '夢幻高塔', '終點王座'] }
];
const LEVELS = CHAPTERS.flatMap((chapter, chapterIndex) => chapter.places.map((place, stepIndex) => ({
  name: `${chapter.name}・${place}`,
  icon: chapter.icon,
  moves: 26 + chapterIndex * 3 + Math.floor(stepIndex / 2),
  goal: 5 + chapterIndex + (stepIndex === 4 ? 1 : 0)
})));
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const words = ref([]);
const board = ref([]);
const phase = ref('loading');
const level = ref(0);
const unlockedLevel = ref(0);
const runStartLevel = ref(0);
const levelWords = ref([]);
const levelColors = ref([]);
const wordIndex = ref(0);
const collected = ref(0);
const moves = ref(0);
const score = ref(0);
const selected = ref(-1);
const busy = ref(false);
const flash = ref([]);
const quiz = ref(null);
const correctWords = ref([]);
const wrongWords = ref([]);
const notice = ref('正在讀取單字…');
const saveNotice = ref('');
const soundOn = ref(true);
const target = computed(() => levelWords.value[wordIndex.value]);
const targetColor = computed(() => levelColors.value[wordIndex.value] ?? 0);
const goal = computed(() => LEVELS[level.value].goal);
const chapterStart = computed(() => Math.floor(level.value / 5) * 5);
const progressKey = computed(() => `vocabulary-candy-unlock-v1:${student.value?.id || 'guest'}:${lesson.version}:${lesson.volume}:${lesson.unit}`);
const historyLink = computed(() => ({ path: '/history', query: { game: GAME } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME, ...lesson } }));
let nextCellId = 0;
let startedAt = 0;
let recordId = '';
let attemptNumber = 0;
let disposed = false;
let pointerStart = null;
let audioContext = null;
let usedWordKeys = new Set();

const indexAt = (row, col) => row * SIZE + col;
const randomKind = () => Math.floor(Math.random() * COLORS.length);
const newCandy = (kind = randomKind()) => ({ id: ++nextCellId, kind, special: '' });
const pause = ms => new Promise(resolve => window.setTimeout(resolve, ms));
function sound(notes) {
  if (!soundOn.value || typeof window === 'undefined') return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    notes.forEach(([frequency, delay, length]) => {
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(.0001, now + delay);
      volume.gain.exponentialRampToValueAtTime(.11, now + delay + .012);
      volume.gain.exponentialRampToValueAtTime(.0001, now + delay + length);
      oscillator.connect(volume).connect(audioContext.destination);
      oscillator.start(now + delay); oscillator.stop(now + delay + length + .02);
    });
  } catch { /* Sound is optional when the browser blocks audio. */ }
}
function groupsIn(cells) {
  const groups = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE;) {
      const kind = cells[indexAt(row, col)]?.kind;
      let end = col + 1;
      while (end < SIZE && cells[indexAt(row, end)]?.kind === kind) end++;
      if (kind !== undefined && end - col >= 3) {
        groups.push({ axis: 'row', indices: Array.from({ length: end - col }, (_, n) => indexAt(row, col + n)) });
      }
      col = end;
    }
  }
  for (let col = 0; col < SIZE; col++) {
    for (let row = 0; row < SIZE;) {
      const kind = cells[indexAt(row, col)]?.kind;
      let end = row + 1;
      while (end < SIZE && cells[indexAt(end, col)]?.kind === kind) end++;
      if (kind !== undefined && end - row >= 3) {
        groups.push({ axis: 'col', indices: Array.from({ length: end - row }, (_, n) => indexAt(row + n, col)) });
      }
      row = end;
    }
  }
  return groups;
}
function hasMove(cells) {
  for (let i = 0; i < cells.length; i++) {
    for (const j of [i % SIZE < SIZE - 1 ? i + 1 : -1, i + SIZE < cells.length ? i + SIZE : -1]) {
      if (j < 0) continue;
      if (cells[i].special === 'bomb' || cells[j].special === 'bomb') return true;
      [cells[i], cells[j]] = [cells[j], cells[i]];
      const works = groupsIn(cells).length > 0;
      [cells[i], cells[j]] = [cells[j], cells[i]];
      if (works) return true;
    }
  }
  return false;
}
function freshBoard() {
  for (let attempt = 0; attempt < 120; attempt++) {
    const cells = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const allowed = COLORS.map((_, kind) => kind).filter(kind =>
          !(col >= 2 && cells[indexAt(row, col - 1)].kind === kind && cells[indexAt(row, col - 2)].kind === kind)
          && !(row >= 2 && cells[indexAt(row - 1, col)].kind === kind && cells[indexAt(row - 2, col)].kind === kind));
        cells.push(newCandy(allowed[Math.floor(Math.random() * allowed.length)]));
      }
    }
    if (hasMove(cells)) return cells;
  }
  // A fixed valid pattern protects the first turn even after unlucky random draws.
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => newCandy((Math.floor(i / SIZE) * 2 + i % SIZE) % COLORS.length));
  cells[indexAt(1, 2)] = newCandy(cells[indexAt(0, 0)].kind);
  return cells;
}
function pickLevelWords() {
  const unused = words.value.filter(word => !usedWordKeys.has(word.en_us.toLowerCase()));
  const pool = (unused.length >= 3 ? unused : words.value).slice().sort(() => Math.random() - .5);
  levelWords.value = pool.slice(0, 3);
  levelWords.value.forEach(word => usedWordKeys.add(word.en_us.toLowerCase()));
  levelColors.value = [...COLORS.keys()].sort(() => Math.random() - .5).slice(0, 3);
  wordIndex.value = 0;
  collected.value = 0;
}
function enterLevel(number) {
  level.value = number;
  moves.value = LEVELS[number].moves;
  board.value = freshBoard();
  pickLevelWords();
  selected.value = -1;
  busy.value = false;
  phase.value = 'playing';
  notice.value = `第 ${number + 1} 關：消除指定顏色的糖果，解鎖三個單字。`;
}
function unlockNextLevel(number) {
  const next = Math.min(LEVELS.length - 1, number);
  if (next <= unlockedLevel.value) return;
  unlockedLevel.value = next;
  try { localStorage.setItem(progressKey.value, String(next)); } catch { /* Private browsing may block storage. */ }
}
function startGame(startAt = 0) {
  if (words.value.length < 4) return;
  score.value = 0;
  correctWords.value = [];
  wrongWords.value = [];
  saveNotice.value = '';
  usedWordKeys = new Set();
  startedAt = Date.now();
  recordId = crypto.randomUUID();
  attemptNumber = 0;
  runStartLevel.value = Math.min(Math.max(0, startAt), unlockedLevel.value);
  enterLevel(runStartLevel.value);
}
function finishLevel() {
  const completed = level.value + 1;
  score.value += moves.value * 20;
  unlockNextLevel(completed);
  if (completed === LEVELS.length) {
    endGame('30 關全部完成！你是單字糖果大師！');
  } else if (completed % 5 === 0) {
    phase.value = 'checkpoint';
    notice.value = `第 ${completed} 關完成！可結算本輪，或繼續挑戰第 ${completed + 1} 關。`;
    saveNotice.value = '正在儲存本輪成績…';
    void saveRecord();
  } else {
    phase.value = 'intermission';
    notice.value = `第 ${completed} 關完成！準備前往下一關。`;
  }
}
function adjacent(a, b) {
  return Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) + Math.abs(a % SIZE - b % SIZE) === 1;
}
function selectCandy(index) {
  if (phase.value !== 'playing' || busy.value) return;
  if (selected.value === index) { selected.value = -1; return; }
  if (selected.value >= 0 && adjacent(selected.value, index)) {
    const first = selected.value;
    selected.value = -1;
    void swapCandy(first, index);
  } else selected.value = index;
}
function pointerDown(index, event) {
  if (phase.value !== 'playing' || busy.value) return;
  pointerStart = { index, x: event.clientX, y: event.clientY };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}
function pointerUp(event) {
  if (!pointerStart) return;
  const { index, x, y } = pointerStart;
  pointerStart = null;
  const dx = event.clientX - x, dy = event.clientY - y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { selectCandy(index); return; }
  const neighbor = Math.abs(dx) > Math.abs(dy) ? index + (dx > 0 ? 1 : -1) : index + (dy > 0 ? SIZE : -SIZE);
  if (neighbor >= 0 && neighbor < SIZE * SIZE && adjacent(index, neighbor)) {
    selected.value = -1;
    void swapCandy(index, neighbor);
  }
}
function pointerCancel() { pointerStart = null; }
function expandSpecials(clear, cells) {
  const queue = [...clear];
  const triggered = new Set();
  for (let n = 0; n < queue.length; n++) {
    const index = queue[n];
    if (triggered.has(index)) continue;
    triggered.add(index);
    const candy = cells[index];
    if (!candy?.special) continue;
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const add = target => { if (!clear.has(target)) { clear.add(target); queue.push(target); } };
    if (candy.special === 'row') for (let c = 0; c < SIZE; c++) add(indexAt(row, c));
    if (candy.special === 'col') for (let r = 0; r < SIZE; r++) add(indexAt(r, col));
    if (candy.special === 'wrap') {
      for (let r = Math.max(0, row - 1); r <= Math.min(SIZE - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(SIZE - 1, col + 1); c++) add(indexAt(r, c));
      }
    }
    if (candy.special === 'bomb') cells.forEach((item, i) => { if (item?.kind === candy.kind) add(i); });
  }
}
function specialForGroups(groups, cells, preferred) {
  const specials = new Map();
  const crossed = new Map();
  for (const group of groups) group.indices.forEach(index => crossed.set(index, (crossed.get(index) || 0) + 1));
  const intersection = [...crossed].find(([, count]) => count > 1)?.[0];
  if (intersection !== undefined && !cells[intersection].special) specials.set(intersection, 'wrap');
  for (const group of groups) {
    if (group.indices.length < 4) continue;
    const anchor = [preferred, ...group.indices].find(index => group.indices.includes(index) && !cells[index].special && !specials.has(index));
    if (anchor !== undefined) specials.set(anchor, group.indices.length >= 5 ? 'bomb' : group.axis);
  }
  return specials;
}
async function settleBoard(initialClear = null, preferred = -1) {
  let chain = 0;
  let directClear = initialClear;
  while (!disposed && chain < 16) {
    const cells = board.value;
    const groups = directClear ? [] : groupsIn(cells);
    if (!directClear && !groups.length) break;
    chain++;
    const clear = directClear || new Set(groups.flatMap(group => group.indices));
    const created = directClear ? new Map() : specialForGroups(groups, cells, chain === 1 ? preferred : -1);
    for (const index of created.keys()) clear.delete(index);
    expandSpecials(clear, cells);
    flash.value = [...clear];
    sound([[420 + chain * 70, 0, .1], [610 + chain * 80, .08, .14]]);
    await pause(170);
    if (disposed) return;
    const next = [...cells];
    for (const index of clear) {
      if (next[index]?.kind === targetColor.value) collected.value++;
      next[index] = null;
    }
    score.value += clear.size * 12 * chain + created.size * 45;
    for (const [index, special] of created) next[index] = { ...cells[index], special };
    for (let col = 0; col < SIZE; col++) {
      const survivors = [];
      for (let row = SIZE - 1; row >= 0; row--) {
        const cell = next[indexAt(row, col)];
        if (cell) survivors.push(cell);
      }
      for (let row = SIZE - 1; row >= 0; row--) next[indexAt(row, col)] = survivors[SIZE - 1 - row] || newCandy();
    }
    board.value = next;
    flash.value = [];
    directClear = null;
    await pause(160);
  }
  if (chain > 1) notice.value = `${chain} 連鎖！糖果大量消除，獲得加分。`;
  if (!hasMove(board.value)) {
    board.value = freshBoard();
    notice.value = '沒有可交換的糖果，已免費重新排列。';
  }
  return chain;
}
async function swapCandy(first, second) {
  if (phase.value !== 'playing' || busy.value || !adjacent(first, second)) return;
  busy.value = true;
  const cells = [...board.value];
  [cells[first], cells[second]] = [cells[second], cells[first]];
  board.value = cells;
  await pause(140);
  if (disposed) return;
  const bomb = cells[first].special === 'bomb' ? first : cells[second].special === 'bomb' ? second : -1;
  let directClear = null;
  if (bomb >= 0) {
    const other = bomb === first ? second : first;
    directClear = new Set([first, second]);
    cells.forEach((cell, index) => { if (cell.kind === cells[other].kind) directClear.add(index); });
  }
  if (!directClear && !groupsIn(cells).length) {
    [cells[first], cells[second]] = [cells[second], cells[first]];
    board.value = [...cells];
    selected.value = -1;
    notice.value = '交換後要連成三顆以上，這一步不扣次數。';
    sound([[240, 0, .12]]);
    busy.value = false;
    return;
  }
  moves.value--;
  const chains = await settleBoard(directClear, second);
  if (disposed) return;
  busy.value = false;
  if (phase.value !== 'playing') return;
  if (collected.value >= goal.value) openQuiz();
  else if (moves.value <= 0) endGame('步數用完了，再挑戰一次吧！');
  else if (chains <= 1) notice.value = `再收集 ${goal.value - collected.value} 顆${COLORS[targetColor.value]}糖果即可解鎖單字題。`;
}
function openQuiz() {
  const word = target.value;
  const others = words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase())
    .sort(() => Math.random() - .5).slice(0, 3);
  quiz.value = { word, choices: [word, ...others].sort(() => Math.random() - .5) };
  phase.value = 'quiz';
  sound([[660, 0, .12], [880, .1, .2]]);
  notice.value = '糖果能量集滿了！答對單字即可完成這張卡片。';
}
function answer(choice) {
  if (phase.value !== 'quiz' || !quiz.value) return;
  const word = quiz.value.word;
  const correct = choice.en_us === word.en_us;
  quiz.value = null;
  if (correct) {
    correctWords.value.push(word.en_us);
    score.value += 180;
    moves.value += 2;
    wordIndex.value++;
    collected.value = 0;
    sound([[660, 0, .1], [880, .12, .1], [1100, .24, .2]]);
    if (wordIndex.value === 3) {
      finishLevel();
      return;
    }
    phase.value = 'playing';
    notice.value = `答對！${word.zh_tw}＝${word.en_us}。獎勵 2 步，開始收集下一種糖果。`;
  } else {
    wrongWords.value.push(word.en_us);
    score.value = Math.max(0, score.value - 30);
    collected.value = Math.floor(goal.value / 2);
    sound([[300, 0, .2], [220, .15, .25]]);
    phase.value = 'playing';
    notice.value = `答錯了：${word.zh_tw}＝${word.en_us}。再收集一些糖果就能重答。`;
  }
  if (moves.value <= 0) endGame('步數用完了，再挑戰一次吧！');
}
function endGame(message) {
  if (phase.value === 'ended') return;
  phase.value = 'ended';
  quiz.value = null;
  selected.value = -1;
  notice.value = message;
  if (recordId) { saveNotice.value = '正在儲存本輪成績…'; void saveRecord(); }
}
async function saveRecord() {
  if (!student.value?.id || !recordId) return;
  const currentId = recordId;
  const currentStarted = startedAt;
  const currentScore = score.value;
  const correct = [...correctWords.value];
  const wrong = [...wrongWords.value];
  let attempt = attemptNumber;
  if (!attempt) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', String(student.value.id)).eq('game_type', GAME)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    attempt = (count || 0) + 1;
    if (recordId === currentId) attemptNumber = attempt;
  }
  const { error } = await db.from('game_records').upsert({
    id: currentId, student_id: String(student.value.id), game_type: GAME,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: currentScore, mistakes: wrong.length,
    correct_words: correct.join(', '), wrong_words: wrong.join(', '),
    attempt_number: attempt, played_at: new Date(currentStarted).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - currentStarted) / 1000), device_info: navigator.userAgent
  }, { onConflict: 'id' });
  if (recordId === currentId) saveNotice.value = error ? `紀錄儲存失敗：${error.message}` : '分數與單字對錯已記錄。';
}
onMounted(async () => {
  if (!student.value?.id) { await navigateTo('/'); return; }
  try {
    const saved = Number(localStorage.getItem(progressKey.value));
    if (Number.isInteger(saved)) unlockedLevel.value = Math.min(LEVELS.length - 1, Math.max(0, saved));
  } catch { /* The game remains playable without local storage. */ }
  if (!lesson.version || !lesson.volume || !lesson.unit) {
    phase.value = 'ready'; notice.value = '請從首頁選擇課本、冊次和單元。'; return;
  }
  const { data, error } = await db.from('vocabularies').select('en_us,zh_tw')
    .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
  if (disposed) return;
  if (error) { phase.value = 'ready'; notice.value = `載入單字失敗：${error.message}`; return; }
  const seen = new Set();
  words.value = (data || []).filter(item => {
    const key = item.en_us?.trim().toLowerCase();
    if (!key || !item.zh_tw?.trim() || seen.has(key)) return false;
    seen.add(key); return true;
  });
  phase.value = 'ready';
  notice.value = words.value.length >= 4 ? '選擇開始遊戲，交換相鄰糖果組成三顆以上。' : '本課至少需要四筆不同單字。';
});
onBeforeUnmount(() => {
  disposed = true;
  audioContext?.close?.();
});
</script>

<template>
  <main class="candy-page">
    <header class="topbar">
      <div><span class="eyebrow">VOCABULARY MATCH ADVENTURE</span><h1>🍬 單字 Candy Crush</h1><p>交換糖果・連鎖消除・收集單字</p></div>
      <nav><NuxtLink to="/">← 回首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">全校英雄榜</NuxtLink></nav>
    </header>
    <div class="game-shell">
      <section class="board-panel">
        <div class="board-heading"><span>{{ LEVELS[level].icon }} 第 {{ level + 1 }}/{{ LEVELS.length }} 關 · {{ LEVELS[level].name }}</span><strong>⭐ {{ score.toLocaleString() }} 分</strong></div>
        <div class="board-frame">
          <div class="board" role="grid" aria-label="糖果棋盤">
            <button v-for="(candy, index) in board" :key="candy.id" class="tile" :class="[{ selected: selected === index, flashed: flash.includes(index) }, `kind-${candy.kind}`, candy.special ? `special-${candy.special}` : '']" type="button" role="gridcell" :disabled="phase !== 'playing' || busy" :aria-label="`第 ${Math.floor(index / 8) + 1} 列第 ${index % 8 + 1} 格，${COLORS[candy.kind]}${candy.special ? '特殊糖果' : ''}`" @pointerdown="pointerDown(index, $event)" @pointerup="pointerUp" @pointercancel="pointerCancel" @keydown.enter.prevent="selectCandy(index)" @keydown.space.prevent="selectCandy(index)">
              <span class="sweet" aria-hidden="true"><span class="glyph">{{ candy.special === 'bomb' ? '✺' : SYMBOLS[candy.kind] }}</span><span v-if="candy.special === 'row' || candy.special === 'col'" class="stripe" :class="candy.special"></span><span v-if="candy.special === 'wrap'" class="wrapper">✧</span></span>
            </button>
          </div>
          <div v-if="phase !== 'playing' && phase !== 'loading'" class="board-overlay">
            <div v-if="phase === 'ready'" class="overlay-card"><h2>🍭 糖果探險開始</h2><p>交換相鄰糖果，三顆以上連線就能消除。四連產生條紋糖，五連產生彩虹糖。</p><p>全程 30 關，每五關可結算一次。收集指定糖果解鎖單字題，答對還能獲得額外步數！</p><div class="end-actions"><button :disabled="words.length < 4" @click="startGame(0)">從第 1 關開始</button><button v-if="unlockedLevel > 0" :disabled="words.length < 4" @click="startGame(unlockedLevel)">從第 {{ unlockedLevel + 1 }} 關接續</button></div><small v-if="unlockedLevel > 0">此瀏覽器已解鎖至第 {{ unlockedLevel + 1 }} 關</small></div>
            <div v-else-if="phase === 'quiz' && quiz" class="overlay-card quiz-card"><span class="mini-label">單字卡 {{ wordIndex + 1 }}/3</span><h2>{{ quiz.word.zh_tw }}</h2><p>選出相對應的英文單字</p><div class="answers"><button v-for="choice in quiz.choices" :key="choice.en_us" @click="answer(choice)">{{ choice.en_us }}</button></div></div>
            <div v-else-if="phase === 'intermission'" class="overlay-card"><h2>🎉 第 {{ level + 1 }} 關完成！</h2><p>三張單字卡已完成，剩餘步數也轉為分數。</p><button @click="enterLevel(level + 1)">進入第 {{ level + 2 }} 關</button></div>
            <div v-else-if="phase === 'checkpoint'" class="overlay-card"><h2>🏁 五關結算點</h2><p>第 {{ level + 1 }} 關完成；從第 {{ runStartLevel + 1 }} 關玩到現在。</p><div class="checkpoint-results"><strong>⭐ {{ score.toLocaleString() }} 分</strong><span>✅ 答對 {{ correctWords.length }} 題</span><span>❌ 答錯 {{ wrongWords.length }} 題</span></div><small>{{ saveNotice }}</small><div class="end-actions"><button @click="endGame(`已在第 ${level + 1} 關結算本輪。`)">結算本輪</button><button @click="enterLevel(level + 1)">繼續第 {{ level + 2 }} 關</button><button v-if="saveNotice.includes('失敗')" @click="saveRecord">重試儲存</button></div></div>
            <div v-else-if="phase === 'ended'" class="overlay-card"><h2>{{ level === LEVELS.length - 1 && wordIndex === 3 ? '🏆 30 關全部通關！' : '🍬 本局結束' }}</h2><p>{{ notice }}</p><strong>本局 {{ score.toLocaleString() }} 分 · 答對 {{ correctWords.length }} 題 · 答錯 {{ wrongWords.length }} 題</strong><small>{{ saveNotice }}</small><div class="end-actions"><button @click="startGame(level)">重玩第 {{ level + 1 }} 關</button><button @click="startGame(0)">從第 1 關重玩</button><button v-if="unlockedLevel > level" @click="startGame(unlockedLevel)">接續第 {{ unlockedLevel + 1 }} 關</button><button v-if="saveNotice.includes('失敗')" @click="saveRecord">重試儲存</button></div></div>
          </div>
          <div v-if="phase === 'loading'" class="board-overlay"><div class="overlay-card">正在準備糖果和單字…</div></div>
        </div>
        <div class="board-footer"><span>👆 點兩顆相鄰糖果，或在手機上滑動交換</span><button @click="soundOn = !soundOn">{{ soundOn ? '🔊 音效開' : '🔇 音效關' }}</button></div>
      </section>
      <aside class="side-panel">
        <div class="headline"><span>🎯 第 {{ level + 1 }} 關任務</span><strong>{{ moves }} 步</strong></div>
        <div class="chapter-progress" :aria-label="`本區第 ${chapterStart + 1} 至 ${chapterStart + 5} 關`"><span v-for="offset in 5" :key="offset" :class="{ done: chapterStart + offset - 1 < level, current: chapterStart + offset - 1 === level }">{{ chapterStart + offset }}</span></div>
        <div class="word-cards"><div v-for="(word, index) in levelWords" :key="`${level}-${index}`" class="word-card" :class="{ done: index < wordIndex, current: index === wordIndex }"><span class="color-dot" :class="`kind-${levelColors[index]}`"></span><div><small>單字 {{ index + 1 }} · {{ COLORS[levelColors[index]] }}</small><strong>{{ word.zh_tw }}</strong><em>{{ index < wordIndex ? word.en_us : index === wordIndex ? '收集糖果後答題' : '尚未解鎖' }}</em></div><span class="check">{{ index < wordIndex ? '✓' : '🔒' }}</span></div></div>
        <div class="meter"><div class="meter-copy"><strong>{{ target ? `收集 ${COLORS[targetColor]}糖果` : '本關完成' }}</strong><span>{{ Math.min(collected, goal) }}/{{ goal }}</span></div><div class="meter-track"><span :style="{ width: `${Math.min(100, collected / goal * 100)}%` }"></span></div></div>
        <p class="notice" role="status">{{ notice }}</p>
        <details class="help"><summary>✨ 特殊糖果與玩法說明</summary><p>四連：條紋糖可清除整列或整行。五連：彩虹糖可消除同色糖果。十字連線：包裝糖可消除周圍九格。</p><p>無效交換不扣步數；答錯會保留一半的收集進度，繼續消除就能重答。每完成五關可選擇結算或繼續。</p></details>
        <button v-if="['playing', 'quiz', 'intermission'].includes(phase)" class="quit" @click="endGame('你已結束本局。')">結束並記錄成績</button>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.candy-page{min-height:100dvh;padding:clamp(10px,1.8vw,24px);background:radial-gradient(circle at 7% 15%,#ffe5f7 0,#ffe5f700 29%),radial-gradient(circle at 95% 95%,#d6f5ff 0,#d6f5ff00 35%),linear-gradient(135deg,#7758b7,#b45aa0 54%,#ed8e9f);color:#4b275d;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif}.topbar{max-width:1320px;margin:0 auto 14px;display:flex;justify-content:space-between;align-items:end;gap:20px}.topbar h1{color:#fff;margin:0;font-size:clamp(28px,3vw,44px);text-shadow:0 3px 0 #823d8b,0 6px 14px #4c276f77}.topbar p,.eyebrow{color:#fff4e9;margin:0;font-weight:800}.eyebrow{font-size:11px;letter-spacing:.16em}.topbar nav{display:flex;flex-wrap:wrap;gap:8px}.topbar a{background:#fff3db;border:2px solid #fff;color:#693d80;padding:8px 12px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:900;box-shadow:0 4px 0 #8b548d}.game-shell{max-width:1320px;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,350px);gap:16px;align-items:start}.board-panel,.side-panel{border:3px solid #ffe2f3;background:#fff9f8eF;border-radius:24px;box-shadow:0 12px 0 #78488977,0 24px 35px #4e296855;overflow:hidden}.board-heading{padding:12px 18px;display:flex;justify-content:space-between;gap:12px;align-items:center;color:#fff;background:linear-gradient(90deg,#f26597,#9860bc);font-size:clamp(15px,1.5vw,21px);font-weight:900}.board-heading strong{white-space:nowrap}.board-frame{position:relative;width:min(100%,min(68dvh,700px));margin:12px auto;padding:10px;border:5px solid #ad69ae;border-radius:22px;background:linear-gradient(135deg,#ffcced,#d7c2ff);box-shadow:inset 0 4px 13px #fff,0 7px 0 #71498b}.board{aspect-ratio:1;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));gap:clamp(2px,.55vw,5px)}.tile{position:relative;display:grid;place-items:center;min-width:0;min-height:0;padding:0;border:2px solid #ffffff77;border-radius:13px;background:linear-gradient(145deg,#ffffff9a,#ffffff19);cursor:pointer;touch-action:none;box-shadow:inset 0 2px 4px #fff9,0 2px 4px #7d4a9c50}.tile:nth-child(16n+1),.tile:nth-child(16n+3),.tile:nth-child(16n+5),.tile:nth-child(16n+7),.tile:nth-child(16n+10),.tile:nth-child(16n+12),.tile:nth-child(16n+14),.tile:nth-child(16n+16){background:linear-gradient(145deg,#f1d5ff,#ead0ff)}.tile.selected{outline:4px solid #fff5a7;z-index:2;transform:scale(1.06)}.tile.flashed{filter:brightness(1.6);transform:scale(1.15)}.tile:disabled{cursor:default}.sweet{position:relative;display:grid;place-items:center;width:86%;height:86%;border-radius:36% 42% 39% 44%;background:radial-gradient(circle at 28% 20%,#fff9,transparent 28%),radial-gradient(circle at 72% 76%,#0003,transparent 35%),var(--sweet);border:2px solid #fff8;box-shadow:inset 0 5px 5px #fff8,inset 0 -7px 4px #0002,0 4px 3px #48326c66;transform:rotate(-8deg);animation:drop-in .3s both}.glyph{font-size:clamp(17px,2.8vw,30px);color:#fff;text-shadow:0 2px 2px #0005;line-height:1}.kind-0{--sweet:linear-gradient(145deg,#ff89a4,#d83269)}.kind-1{--sweet:linear-gradient(145deg,#ffe583,#eca92a)}.kind-2{--sweet:linear-gradient(145deg,#93e9b1,#28aa73)}.kind-3{--sweet:linear-gradient(145deg,#d6a2ef,#8f4ec1)}.kind-4{--sweet:linear-gradient(145deg,#90dffa,#3787ce)}.kind-5{--sweet:linear-gradient(145deg,#ffc388,#ee7939)}.special-bomb .sweet{--sweet:conic-gradient(#f55,#ffda54,#45cf83,#54adff,#c173ec,#f55);border:3px solid #fff2b0;animation:glow 1.2s infinite alternate}.special-bomb .glyph{font-size:clamp(25px,3.6vw,39px)}.stripe{position:absolute;inset:20%;border:3px dashed #fffdeb;border-radius:25%;transform:rotate(35deg)}.stripe.col{transform:rotate(-35deg)}.wrapper{position:absolute;right:-5px;bottom:-8px;color:#fff6a6;font-size:24px;text-shadow:0 2px 3px #692a7c}.board-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 16px 14px;color:#784c80;font-size:13px;font-weight:800}.board-footer button{border:0;border-radius:9px;background:#e8cefb;padding:7px;cursor:pointer}.board-overlay{position:absolute;inset:0;display:grid;place-items:center;background:#4e2d77ad;border-radius:18px;padding:10px;z-index:5}.overlay-card{width:min(100%,420px);max-height:100%;overflow:auto;padding:clamp(14px,2vw,24px);border-radius:22px;border:5px solid #fff;background:#fff8f0;text-align:center;box-shadow:0 9px 0 #a157a3,0 15px 30px #27103380}.overlay-card h2{margin:4px 0 12px;color:#823b99;font-size:clamp(22px,2.4vw,31px)}.overlay-card p{line-height:1.5}.overlay-card button{border:2px solid #fff;border-radius:12px;background:linear-gradient(180deg,#ffca67,#ff8c78);color:#663864;padding:10px 18px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #be668a}.overlay-card button:disabled{opacity:.5;cursor:not-allowed}.overlay-card small{display:block;margin-top:10px}.mini-label{font-size:12px;font-weight:900;color:#c45e84}.answers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:14px}.answers button{min-width:0;overflow-wrap:anywhere}.end-actions{display:flex;justify-content:center;gap:8px;margin-top:12px}.side-panel{padding:16px}.headline{display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:18px}.headline strong{padding:6px 11px;border-radius:12px;background:#f75f8f;color:white;font-size:24px}.word-cards{display:grid;gap:8px;margin:12px 0}.word-card{display:flex;align-items:center;gap:10px;min-height:69px;border:2px solid #e6c6e9;border-radius:13px;background:#fff;padding:7px 9px;opacity:.62}.word-card.current{opacity:1;border-color:#d56cb2;background:#fff3fa;box-shadow:0 3px 0 #dfa5d8}.word-card.done{opacity:1;border-color:#68c9a3;background:#edfff7}.color-dot{width:22px;height:22px;flex:none;border-radius:50%;background:var(--sweet);box-shadow:inset 0 2px 3px #fff9,0 2px 2px #0002}.word-card div{min-width:0;display:grid;gap:1px}.word-card small{font-size:10px;color:#975b91;font-weight:800}.word-card strong{font-size:16px;line-height:1.2}.word-card em{font-size:11px;color:#aa7c9e;font-style:normal}.check{margin-left:auto}.meter-copy{display:flex;justify-content:space-between;font-size:13px}.meter-track{height:14px;border:2px solid #e5badd;border-radius:999px;background:#fff;margin-top:6px;overflow:hidden}.meter-track span{display:block;height:100%;background:linear-gradient(90deg,#ffa35d,#fb5f93);border-radius:999px;transition:width .25s}.notice{min-height:58px;padding:11px;border-radius:12px;background:#fcebf9;font-weight:800;line-height:1.4}.help{border-top:1px solid #e8cfeb;padding-top:11px;font-size:12px;line-height:1.5}.help p{margin:5px 0}.quit{width:100%;margin-top:7px;border:0;border-radius:9px;background:#a570a8;color:white;padding:10px;font-weight:900;cursor:pointer}@keyframes drop-in{from{opacity:.3;transform:translateY(-10px) rotate(-10deg)}to{opacity:1;transform:translateY(0) rotate(-8deg)}}@keyframes glow{to{filter:brightness(1.25);transform:rotate(7deg) scale(1.06)}}@media(max-width:940px){.game-shell{grid-template-columns:1fr}.board-frame{width:min(100%,min(72dvh,620px))}.side-panel{display:grid;grid-template-columns:1fr 1fr;gap:9px}.side-panel .word-cards{grid-row:span 3;margin:0}.help{grid-column:1/-1}}@media(max-width:610px){.topbar{display:block}.topbar nav{margin-top:10px}.game-shell{gap:10px}.board-heading{font-size:14px}.board-frame{width:100%;margin:7px auto;padding:5px;border-width:3px}.board{gap:2px}.tile{border-radius:8px;border-width:1px}.sweet{border-width:1px}.glyph{font-size:clamp(12px,4vw,20px)}.board-footer{font-size:11px}.side-panel{display:block;padding:12px}.side-panel .word-cards{margin:10px 0}.word-card{min-height:50px}.word-card strong{font-size:14px}.help{font-size:11px}.overlay-card{padding:10px}.overlay-card p{font-size:13px}.answers button{font-size:13px;padding:8px}}
</style>

<style scoped>
.board-frame{box-sizing:border-box}
.chapter-progress{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:7px 0 10px}
.chapter-progress span{text-align:center;border-radius:8px;padding:5px 0;background:#efddf3;color:#8b698f;font-size:12px;font-weight:900}
.chapter-progress span.current{background:#f76996;color:white;box-shadow:0 3px 0 #b04e85}
.chapter-progress span.done{background:#7dd9af;color:#225943}
.help{padding:7px 0 0}
.help summary{cursor:pointer;font-weight:900}
.help[open]{padding-bottom:4px}
.end-actions{flex-wrap:wrap}
.checkpoint-results{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin:12px 0}
.checkpoint-results>*{padding:7px 9px;border-radius:9px;background:#fce1ef;font-size:13px}
@media (min-width:941px) and (min-height:650px){
  .candy-page{height:100dvh;min-height:0;overflow:hidden;display:flex;flex-direction:column;padding:9px clamp(12px,1.4vw,20px)}
  .topbar{width:100%;flex:0 0 auto;margin-bottom:8px;align-items:center}
  .topbar h1{font-size:clamp(24px,2.5vw,36px)}
  .topbar p{font-size:12px}
  .game-shell{width:100%;flex:1;min-height:0;align-items:stretch;gap:12px}
  .board-panel{display:flex;flex-direction:column;min-height:0}
  .board-heading{padding:8px 13px;font-size:clamp(14px,1.3vw,18px)}
  .board-frame{width:min(100%,calc(100dvh - 230px),700px);margin:auto;padding:7px;border-width:4px}
  .board-footer{padding:4px 12px 8px;font-size:11px}
  .side-panel{display:flex;flex-direction:column;min-height:0;padding:10px 12px;overflow-y:auto}
  .headline{font-size:15px}
  .headline strong{font-size:20px;padding:4px 8px}
  .word-cards{gap:5px;margin:6px 0}
  .word-card{min-height:0;padding:4px 7px;gap:7px}
  .word-card strong{font-size:14px}
  .word-card em{font-size:10px}
  .color-dot{width:19px;height:19px}
  .notice{min-height:0;padding:7px;margin:8px 0;font-size:12px}
  .help{margin-top:auto}
  .quit{margin-top:6px;padding:7px}
}
@media (max-width:610px){
  .candy-page{padding:7px}
  .topbar h1{font-size:26px}
  .topbar p,.eyebrow{font-size:10px}
  .topbar nav{gap:5px;margin-top:7px}
  .topbar a{padding:5px 8px;font-size:11px}
  .board-heading{padding:7px 9px;font-size:12px}
  .board-heading span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .board-frame{border-radius:13px}
  .board-footer{padding:3px 8px 7px}
  .side-panel{padding:10px}
  .chapter-progress{margin:6px 0}
  .word-cards{gap:5px;margin:7px 0}
  .word-card{padding:5px;gap:6px}
  .notice{min-height:0;margin:7px 0;padding:7px;font-size:12px}
  .overlay-card{max-height:100%;padding:8px}
  .overlay-card h2{font-size:19px;margin:2px 0 6px}
  .overlay-card p{margin:5px 0;font-size:12px}
  .overlay-card button{padding:7px 9px;font-size:12px}
  .checkpoint-results{margin:6px 0}
}
</style>
