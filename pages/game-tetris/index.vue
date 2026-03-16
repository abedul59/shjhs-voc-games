<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

// 鎖死瀏覽器的預設縮放與滾動，進入原生 APP 級別的鎖定
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
  ]
});

const supabase = useSupabaseClient();
const route = useRoute();
const studentCookie = useCookie('currentStudent');

const isLoading = ref(true);
const matchStatus = ref('idle'); 

// 雙軌計分系統 (🌟 已解除 100 分上限，無限疊加！)
const score = ref(0); 
const wordScore = ref(0); 
const linesCleared = ref(0);

// 即時時間計算
let gameStartTime = 0;
const playTime = ref(0);
let timeInterval = null;

const tetrisBlankCount = ref(5); 

// 音效引擎
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playTone = (freq, type, duration, vol = 0.1) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
};

const sfx = {
  move: () => playTone(300, 'sine', 0.05, 0.05),
  rotate: () => playTone(400, 'triangle', 0.1, 0.05),
  drop: () => playTone(150, 'square', 0.1, 0.1),
  lock: () => playTone(200, 'sawtooth', 0.1, 0.1),
  clear: () => { playTone(800, 'sine', 0.1); setTimeout(() => playTone(1200, 'sine', 0.2), 100); },
  correct: () => { playTone(880, 'sine', 0.1); setTimeout(() => playTone(1100, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2),
  unlock: () => { playTone(1000, 'square', 0.1, 0.05); }, 
  gameover: () => { [300, 250, 200, 150].forEach((f, i) => setTimeout(() => playTone(f, 'sawtooth', 0.4, 0.2), i * 300)); }
};

// 俄羅斯方塊核心
const COLS = 10;
const ROWS = 20;
const board = ref(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));

const SHAPES = [
  [], 
  [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], 
  [[2,0,0], [2,2,2], [0,0,0]], 
  [[0,0,3], [3,3,3], [0,0,0]], 
  [[4,4], [4,4]], 
  [[0,5,5], [5,5,0], [0,0,0]], 
  [[0,6,0], [6,6,6], [0,0,0]], 
  [[7,7,0], [0,7,7], [0,0,0]]  
];
const COLORS = ['transparent', '#00ffff', '#0000ff', '#ff7f00', '#ffff00', '#00ff00', '#800080', '#ff0000'];

const currentPiece = ref(null);
let dropInterval = null;
let dropSpeed = 1000;

// 單字解鎖核心
const words = ref([]);
const currentWordObj = ref(null);
const pureEnText = ref('');
const blanks = ref([]); 
const letterOptions = ref([]); 
const isWrong = ref(false);

const lockedControls = ref([]); 
const CONTROLS_LIST = ['left', 'right', 'down', 'drop', 'rotate'];

onMounted(async () => {
  try {
    const { data: settingsData } = await supabase.from('system_settings').select('tetris_blank_count').eq('id', 1).single();
    if (settingsData && settingsData.tetris_blank_count) {
      tetrisBlankCount.value = Number(settingsData.tetris_blank_count);
    }
    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies')
        .select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length > 0) words.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length >= 4);
    }
    if (words.value.length === 0) words.value = [{ en_us: 'apple', zh_tw: '蘋果' }, { en_us: 'banana', zh_tw: '香蕉' }];
  } catch (e) { console.error(e); }
  isLoading.value = false;
});

const startGame = () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  board.value = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score.value = 0; wordScore.value = 0; linesCleared.value = 0; playTime.value = 0; dropSpeed = 1000;
  matchStatus.value = 'playing'; gameStartTime = Date.now();
  
  if (timeInterval) clearInterval(timeInterval);
  timeInterval = setInterval(() => { playTime.value = Math.round((Date.now() - gameStartTime) / 1000); }, 1000);

  spawnPiece(); startGameLoop();
};

const generateVocabChallenge = () => {
  const wordObj = words.value[Math.floor(Math.random() * words.value.length)];
  currentWordObj.value = wordObj;
  pureEnText.value = wordObj.en_us.replace(/[^a-zA-Z]/g, '').toUpperCase();

  let numBlanks = Math.min(tetrisBlankCount.value, pureEnText.value.length - 1, 5);
  numBlanks = Math.max(1, numBlanks);

  let indices = [];
  while(indices.length < numBlanks) {
    let r = Math.floor(Math.random() * pureEnText.value.length);
    if(!indices.includes(r)) indices.push(r);
  }
  indices.sort((a,b) => a - b);

  let targetChars = [];
  blanks.value = indices.map(idx => {
    targetChars.push(pureEnText.value[idx]);
    return { index: idx, expected: pureEnText.value[idx], filledWith: null, optionId: null };
  });

  lockedControls.value = [...CONTROLS_LIST].sort(() => 0.5 - Math.random()).slice(0, numBlanks);

  let opts = [...targetChars];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  while(opts.length < Math.max(6, numBlanks + 3)) opts.push(alphabet[Math.floor(Math.random() * 26)]);
  opts.sort(() => 0.5 - Math.random());
  letterOptions.value = opts.map((char, i) => ({ id: `opt_${i}_${Date.now()}`, char, used: false }));
};

const selectOption = (opt) => {
  if (opt.used) return;
  const emptyBlank = blanks.value.find(b => b.filledWith === null);
  if (emptyBlank) {
    if (opt.char === emptyBlank.expected) {
      emptyBlank.filledWith = opt.char;
      emptyBlank.optionId = opt.id;
      opt.used = true;
      sfx.correct();

      if (lockedControls.value.length > 0) {
          lockedControls.value.pop(); 
          sfx.unlock(); 
      }
      
      // 🌟 解除上限：只要拼對單字，分數無限制 +10 加上去！
      if (blanks.value.every(b => b.filledWith !== null)) { 
          wordScore.value += 10; 
      }
    } else {
      sfx.wrong();
      isWrong.value = true;
      setTimeout(() => isWrong.value = false, 400);
    }
  }
};

const returnOption = (blank) => {
  if (blank.filledWith === null) return;
  const opt = letterOptions.value.find(o => o.id === blank.optionId);
  if (opt) opt.used = false;
  blank.filledWith = null;
  blank.optionId = null;
};

const spawnPiece = () => {
  const typeId = Math.floor(Math.random() * 7) + 1;
  const shape = SHAPES[typeId];
  currentPiece.value = { shape, type: typeId, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
  if (!isValid(currentPiece.value.shape, currentPiece.value.x, currentPiece.value.y)) triggerGameOver();
  else generateVocabChallenge(); 
};

const isValid = (shape, offsetX, offsetY) => {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        let newX = offsetX + x;
        let newY = offsetY + y;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return false;
        if (newY >= 0 && board.value[newY][newX] !== 0) return false;
      }
    }
  }
  return true;
};

const rotatePiece = (e) => {
  if(e) e.preventDefault();
  if (lockedControls.value.includes('rotate') || matchStatus.value !== 'playing') return;
  const shape = currentPiece.value.shape;
  const N = shape.length;
  const rotated = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) { rotated[x][N - 1 - y] = shape[y][x]; }
  }
  if (isValid(rotated, currentPiece.value.x, currentPiece.value.y)) {
    currentPiece.value.shape = rotated;
    sfx.rotate();
  }
};

const movePiece = (dirX, dirY, e) => {
  if(e) e.preventDefault();
  if (matchStatus.value !== 'playing') return false;
  if (dirX === -1 && lockedControls.value.includes('left')) return false;
  if (dirX === 1 && lockedControls.value.includes('right')) return false;
  if (dirY === 1 && lockedControls.value.includes('down')) return false;

  if (isValid(currentPiece.value.shape, currentPiece.value.x + dirX, currentPiece.value.y + dirY)) {
    currentPiece.value.x += dirX;
    currentPiece.value.y += dirY;
    if(dirX !== 0) sfx.move();
    return true;
  }
  return false;
};

const hardDrop = (e) => {
  if(e) e.preventDefault();
  if (lockedControls.value.includes('drop') || matchStatus.value !== 'playing') return;
  while (movePiece(0, 1)) { }
  lockPiece();
};

const autoDrop = () => {
  if (matchStatus.value !== 'playing') return;
  if (!isValid(currentPiece.value.shape, currentPiece.value.x, currentPiece.value.y + 1)) lockPiece();
  else currentPiece.value.y++;
};

const lockPiece = () => {
  sfx.lock();
  const shape = currentPiece.value.shape;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        let boardY = currentPiece.value.y + y;
        let boardX = currentPiece.value.x + x;
        if (boardY >= 0) board.value[boardY][boardX] = currentPiece.value.type;
      }
    }
  }
  clearLines();
  spawnPiece();
};

const clearLines = () => {
  let lines = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    let isFull = true;
    for (let x = 0; x < COLS; x++) {
      if (board.value[y][x] === 0) { isFull = false; break; }
    }
    if (isFull) {
      board.value.splice(y, 1);
      board.value.unshift(Array(COLS).fill(0));
      lines++; y++; 
    }
  }
  if (lines > 0) {
    sfx.clear();
    linesCleared.value += lines;
    
    // 🌟 解除上限：消除行數的分數無限疊加！
    score.value += (lines * 10);
    
    dropSpeed = Math.max(150, 1000 - (linesCleared.value * 25)); 
    resetGameLoop();
  }
};

const startGameLoop = () => {
  if (dropInterval) clearInterval(dropInterval);
  dropInterval = setInterval(autoDrop, dropSpeed);
};
const resetGameLoop = () => { startGameLoop(); };

const renderGrid = computed(() => {
  let displayBoard = board.value.map(row => [...row]);
  if (currentPiece.value && matchStatus.value === 'playing') {
    const shape = currentPiece.value.shape;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          let boardY = currentPiece.value.y + y;
          let boardX = currentPiece.value.x + x;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            displayBoard[boardY][boardX] = currentPiece.value.type;
          }
        }
      }
    }
  }
  return displayBoard;
});

const renderWordChars = computed(() => {
  if (!pureEnText.value) return [];
  let chars = [];
  for (let i = 0; i < pureEnText.value.length; i++) {
    const blankObj = blanks.value.find(b => b.index === i);
    if (blankObj) chars.push({ isBlank: true, char: blankObj.filledWith, obj: blankObj });
    else chars.push({ isBlank: false, char: pureEnText.value[i] });
  }
  return chars;
});

const triggerGameOver = async () => {
  matchStatus.value = 'gameover';
  if (dropInterval) clearInterval(dropInterval);
  if (timeInterval) clearInterval(timeInterval);
  sfx.gameover();

  if (studentCookie.value && !studentCookie.value.isAnon) {
    await supabase.from('game_records').insert([{
      student_id: studentCookie.value.id,
      game_type: '單字俄羅斯方塊',
      score: wordScore.value,
      time_taken_seconds: playTime.value,
      version: route.query.version,
      volume: route.query.volume,
      unit_played: route.query.unit,
      correct_words: `方塊分: ${score.value} | 消除行數: ${linesCleared.value}`
    }]);
  }
};

const quitGame = () => {
  if (dropInterval) clearInterval(dropInterval);
  if (timeInterval) clearInterval(timeInterval);
  navigateTo('/');
};

onUnmounted(() => { 
    if (dropInterval) clearInterval(dropInterval); 
    if (timeInterval) clearInterval(timeInterval);
});

const handleKeydown = (e) => {
  if (matchStatus.value !== 'playing') return;
  switch(e.key) {
    case 'ArrowLeft': if(!lockedControls.value.includes('left')) movePiece(-1, 0, e); break;
    case 'ArrowRight': if(!lockedControls.value.includes('right')) movePiece(1, 0, e); break;
    case 'ArrowDown': if(!lockedControls.value.includes('down')) { movePiece(0, 1, e); } break;
    case 'ArrowUp': if(!lockedControls.value.includes('rotate')) rotatePiece(e); break;
    case ' ': e.preventDefault(); if(!lockedControls.value.includes('drop')) hardDrop(e); break;
  }
};
onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <div class="tetris-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🧱 俄羅斯</h2>
      <div class="t-scores">
         <span class="sc-word">字: {{ wordScore }}</span> | 
         <span class="sc-tetris">塊: {{ score }}</span> | 
         <span class="sc-time">{{ playTime }}s</span>
      </div>
      <button class="t-btn-exit" @pointerdown.prevent="quitGame">離開</button>
    </header>

    <div v-if="matchStatus !== 'playing'" class="t-overlay">
      <div class="t-dialog retro-element">
        <div class="icon-big">{{ matchStatus === 'gameover' ? '💀' : '🧩' }}</div>
        <h2>{{ matchStatus === 'gameover' ? '遊戲結束！' : '極限拼字守護戰' }}</h2>
        <template v-if="matchStatus === 'gameover'">
          <p style="color:#4caf50; font-weight:bold;">🎯 單字分數： {{ wordScore }}</p>
          <p style="color:#2196f3; font-weight:bold;">🧱 方塊分數： {{ score }}</p>
          <p style="color:#777; font-size:0.9rem;">(消除: {{ linesCleared }} | 時間: {{ playTime }}s)</p>
        </template>
        <template v-else>
          <p style="font-size:0.9rem; color:#555;">(支援直向/橫向，電腦版支援鍵盤方向鍵)</p>
        </template>
        <button class="t-btn-play" @pointerdown.prevent="startGame">{{ matchStatus === 'gameover' ? '🔄 再玩一次' : '🚀 挑戰開始' }}</button>
      </div>
    </div>

    <div v-else class="t-workspace">
      
      <div class="t-panel-word retro-element" :class="{ 'locked-shake': isWrong, 'unlocked': lockedControls.length === 0 }">
        <div class="word-header">
          <div class="word-zh">{{ currentWordObj?.zh_tw }}</div>
          <div class="word-status">
            <span v-if="lockedControls.length > 0" class="status-lock">⚠️剩 {{ lockedControls.length }} 鎖</span>
            <span v-else class="status-ok">🔓全解鎖</span>
          </div>
        </div>
        
        <div class="word-slots">
          <span v-for="(item, i) in renderWordChars" :key="i" class="w-char" :class="{ 'is-blank': item.isBlank }">
            <template v-if="!item.isBlank">{{ item.char }}</template>
            <template v-else>
              <div class="blank-slot" :class="{ 'filled': item.obj.filledWith }" @pointerdown.prevent="returnOption(item.obj)">
                 {{ item.obj.filledWith || '_' }}
              </div>
            </template>
          </span>
        </div>

        <div class="word-options" v-if="blanks.some(b => b.filledWith === null)">
          <button v-for="opt in letterOptions" :key="opt.id" 
                  class="opt-btn" :class="{ 'used': opt.used }" 
                  @pointerdown.prevent="selectOption(opt)">
            {{ opt.char }}
          </button>
        </div>
      </div>

      <div class="t-panel-board">
        <div class="tetris-board">
          <div v-for="(row, y) in renderGrid" :key="y" class="t-row">
            <div v-for="(cell, x) in row" :key="x" class="t-cell" 
                 :style="{ backgroundColor: COLORS[cell], border: cell ? '1px solid rgba(0,0,0,0.5)' : '1px solid #333' }">
            </div>
          </div>
        </div>
      </div>

      <div class="t-panel-dpad">
         <div class="dpad-cross">
           <button class="joy-btn up-btn" @pointerdown.prevent="hardDrop" :class="{ 'disabled': lockedControls.includes('drop') }">
             <span v-if="lockedControls.includes('drop')">🔒</span><span v-else>⏫</span>
           </button>
           <button class="joy-btn left-btn" @pointerdown.prevent="movePiece(-1,0, $event)" :class="{ 'disabled': lockedControls.includes('left') }">
             <span v-if="lockedControls.includes('left')">🔒</span><span v-else>⬅️</span>
           </button>
           <div class="dpad-center"></div>
           <button class="joy-btn right-btn" @pointerdown.prevent="movePiece(1,0, $event)" :class="{ 'disabled': lockedControls.includes('right') }">
             <span v-if="lockedControls.includes('right')">🔒</span><span v-else>➡️</span>
           </button>
           <button class="joy-btn down-btn" @pointerdown.prevent="movePiece(0,1, $event)" :class="{ 'disabled': lockedControls.includes('down') }">
             <span v-if="lockedControls.includes('down')">🔒</span><span v-else>⬇️</span>
           </button>
         </div>
         
         <button class="joy-btn rotate-btn rotate-btn-left" @pointerdown.prevent="rotatePiece" :class="{ 'disabled': lockedControls.includes('rotate') }">
            <span v-if="lockedControls.includes('rotate')">🔒</span><span v-else>🔄 轉</span>
         </button>
      </div>

      <div class="t-panel-action">
         <button class="joy-btn rotate-btn rotate-btn-right" @pointerdown.prevent="rotatePiece" :class="{ 'disabled': lockedControls.includes('rotate') }">
            <span v-if="lockedControls.includes('rotate')">🔒</span><span v-else>🔄<br>轉</span>
         </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.tetris-root {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: var(--bg-color, #f4f4f9);
  display: flex; flex-direction: column; overflow: hidden;
  touch-action: none; -webkit-user-select: none; user-select: none;
}
button, .blank-slot { touch-action: manipulation; }

.t-header {
  flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center;
  background: var(--box-bg, #fff); padding: 5px 10px; border-bottom: 2px solid var(--border-color, #ccc);
}
.t-title { margin: 0; font-size: 1.1rem; font-weight: 900; }
.t-scores { font-weight: bold; font-size: 0.9rem; }
.sc-word { color: #4caf50; }
.sc-tetris { color: #2196f3; margin-left: 5px;}
.sc-time { color: #ff9800; font-family: monospace; margin-left: 5px;}
.t-btn-exit { background: #e0e0e0; border: 2px solid #ccc; border-radius: 5px; padding: 4px 10px; font-weight: bold; cursor: pointer; }

.t-overlay { flex: 1; display: flex; justify-content: center; align-items: center; padding: 20px; background: rgba(0,0,0,0.05); }
.t-dialog { background: var(--box-bg, #fff); padding: 30px 20px; border-radius: 15px; text-align: center; border: 4px solid var(--border-color, #ccc); box-shadow: 0 8px 0 var(--border-color, #ccc); }
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.t-btn-play { margin-top: 20px; background: #4caf50; color: white; border: 2px solid #2e7d32; padding: 12px 25px; font-size: 1.2rem; font-weight: bold; border-radius: 8px; box-shadow: 0 5px 0 #2e7d32; cursor: pointer; }
.t-btn-play:active { transform: translateY(5px); box-shadow: none; }

.t-workspace {
  flex: 1; display: grid; padding: 8px; gap: 8px; min-height: 0;
  padding-bottom: env(safe-area-inset-bottom, 10px);
  
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas:
    "word word"
    "board board"
    "dpad action";
  justify-items: center; align-items: center;
}

.t-panel-word {
  grid-area: word; width: 100%; max-width: 600px;
  background: var(--warning-bg, #fff3e0); border: 3px dashed #ff9800; border-radius: 10px;
  padding: 6px 10px; transition: 0.3s;
}
.t-panel-word.unlocked { background: var(--success-bg, #e8f5e9); border-color: #4caf50; }
.word-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 2px; }
.word-zh { font-size: 1rem; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-lock { background: rgba(255,255,255,0.8); color: #d32f2f; padding: 2px 6px; border-radius: 8px; font-weight: bold; font-size: 0.8rem;}
.status-ok { color: #2e7d32; font-weight: bold; font-size: 0.8rem; }

.word-slots { display: flex; justify-content: center; flex-wrap: wrap; gap: 4px; font-family: monospace; font-size: 1.3rem; font-weight: bold; margin-bottom: 6px; }
.w-char { min-width: 20px; text-align: center; }
.w-char.is-blank { color: #d32f2f; }
.t-panel-word.unlocked .w-char.is-blank { color: #fbc02d; }
.blank-slot { background: white; border: 2px solid #ccc; border-radius: 4px; padding: 0 4px; box-shadow: 0 2px 0 #999; cursor: pointer; min-width: 20px; }
.blank-slot.filled { background: #4caf50; color: white; border-color: #2e7d32; box-shadow: none; transform: translateY(2px); }

.word-options { display: flex; justify-content: center; flex-wrap: wrap; gap: 5px; }
.opt-btn { background: white; border: 2px solid #bbb; border-radius: 6px; font-size: 1.1rem; padding: 6px 10px; font-weight: bold; box-shadow: 0 3px 0 #999; cursor: pointer; }
.opt-btn:active { transform: translateY(3px); box-shadow: none; }
.opt-btn.used { opacity: 0; pointer-events: none; }

.t-panel-board {
  grid-area: board; width: 100%; height: 100%;
  display: flex; justify-content: center; align-items: center;
  min-height: 0; min-width: 0;
}
.tetris-board {
  height: 100%; max-width: 100%; aspect-ratio: 10 / 20;
  background: #111; border: 3px solid #555; border-radius: 5px;
  display: flex; flex-direction: column;
}
.t-row { display: flex; flex: 1; }
.t-cell { flex: 1; box-sizing: border-box; }

.joy-btn {
  width: 100%; height: 100%; border-radius: 50%;
  background: #e0e0e0; border: 3px solid #999; font-size: 1.2rem; font-weight: bold;
  display: flex; justify-content: center; align-items: center; text-align: center;
  box-shadow: 0 4px 0 #999; transition: 0.1s; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.joy-btn:active:not(.disabled) { background: #ccc; transform: translateY(4px); box-shadow: none; }
.joy-btn.disabled { opacity: 0.4; filter: grayscale(100%); pointer-events: none; transform: translateY(4px); box-shadow: none;}

.t-panel-dpad { grid-area: dpad; justify-self: end; padding-right: 15px; display: flex; flex-direction: column; align-items: center; gap: 8px;}
.dpad-cross {
  display: grid;
  grid-template-columns: repeat(3, min(14vw, 55px));
  grid-template-rows: repeat(3, min(14vw, 55px));
  gap: 3px;
}
.up-btn { grid-column: 2; grid-row: 1; }
.left-btn { grid-column: 1; grid-row: 2; }
.right-btn { grid-column: 3; grid-row: 2; }
.down-btn { grid-column: 2; grid-row: 3; }

.rotate-btn {
  background: var(--primary-color) !important; color: white;
  border-color: #0277bd !important; box-shadow: 0 5px 0 #0277bd !important; line-height: 1.1;
}
.rotate-btn:active:not(.disabled) { background: #0277bd !important; }

.t-panel-action { grid-area: action; justify-self: start; padding-left: 15px;}
.rotate-btn-right { width: min(20vw, 80px) !important; height: min(20vw, 80px) !important; }
.rotate-btn-left { display: none; }

@media (orientation: landscape) {
  .t-workspace {
    grid-template-columns: 1fr auto 1.5fr;
    grid-template-rows: 1fr;
    grid-template-areas: "dpad board word";
    
    padding-right: max(env(safe-area-inset-right, 10px), 100px); 
    padding-left: env(safe-area-inset-left, 10px);
    max-width: 1400px; margin: 0 auto;
  }
  
  .t-panel-word { align-self: center; justify-self: center; padding: 10px; transform: scale(0.9); }
  .t-panel-dpad { justify-self: center; align-self: center; padding-right: 0;}
  .dpad-cross {
    grid-template-columns: repeat(3, min(10vh, 45px));
    grid-template-rows: repeat(3, min(10vh, 45px));
  }
  .t-panel-action { display: none; }
  .rotate-btn-left { 
    display: flex; 
    width: min(20vh, 80px) !important; height: min(10vh, 40px) !important; border-radius: 20px;
    margin-top: 5px; font-size: 1rem;
  }
}

@media (min-width: 768px) {
  .t-workspace { 
    grid-template-columns: 1fr auto 1fr; 
    gap: 40px; 
    padding-right: 120px; 
  }
  
  .t-panel-word { 
    padding: 20px; transform: scale(1); border-width: 5px; 
    max-width: 450px;
  }
  .word-zh { font-size: 1.8rem; margin-bottom: 10px;}
  .word-slots { font-size: 2.5rem; gap: 8px; margin-bottom: 15px; }
  .w-char { min-width: 35px; }
  .blank-slot { padding: 0 10px; min-width: 35px; border-width: 3px; border-radius: 8px;}
  .opt-btn { font-size: 1.6rem; padding: 10px 20px; border-width: 3px; border-radius: 10px;}

  .dpad-cross {
    grid-template-columns: repeat(3, 60px);
    grid-template-rows: repeat(3, 60px);
    gap: 8px;
  }
  .joy-btn { font-size: 1.4rem; border-width: 4px; box-shadow: 0 6px 0 #999;}
  .joy-btn:active:not(.disabled) { transform: translateY(6px); }

  .rotate-btn-left { width: 150px !important; height: 60px !important; font-size: 1.4rem !important; border-radius: 30px; margin-top: 15px;}
}

@media (min-width: 768px) and (orientation: landscape) {
  .t-workspace { padding-right: 120px; gap: 40px;}
}
</style>