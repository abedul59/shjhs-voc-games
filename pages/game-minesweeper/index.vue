<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
  ]
});

const supabase = useSupabaseClient();
const route = useRoute();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('setup'); // setup, playing, end
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
const score = ref(0);
let timer = null;

const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

const config = ref({ time_limit: 300, penalty: 5, board_size: 7 });

// 💣 踩地雷狀態
const currentWord = ref(null);
const board = ref([]);
const mode = ref('dig'); // 'dig' ⛏️ 或 'flag' 🚩
const minesFound = ref(0);
const isBoardLocked = ref(false); // 爆炸後短暫鎖定

// --- 音效系統 ---
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playTone = (freq, type, duration, vol = 0.1) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
};

const sfx = {
  click: () => playTone(600, 'square', 0.05, 0.05),
  reveal: () => playTone(800, 'sine', 0.05, 0.05),
  correctFlag: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.2), 100); },
  wrongFlag: () => playTone(200, 'sawtooth', 0.2, 0.2),
  boom: () => { playTone(100, 'sawtooth', 0.5, 0.3); setTimeout(() => playTone(50, 'square', 0.5, 0.3), 100); },
  winWord: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2), i * 100)); }
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.minesweeper_time_limit) config.value.time_limit = settings.minesweeper_time_limit;
        if (settings.minesweeper_penalty) config.value.penalty = settings.minesweeper_penalty;
        if (settings.minesweeper_board_size) config.value.board_size = settings.minesweeper_board_size;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 單元單字不足！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }
  } catch (e) { console.error(e); }
});

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    score.value = 0; correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    gameStartTime.value = Date.now();
    gameStatus.value = 'playing'; 
    loadNextWord();
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('時間到');
    }, 1000);
};

const loadNextWord = () => {
    if (gameStatus.value !== 'playing') return;
    const randomWord = allWords.value[Math.floor(Math.random() * allWords.value.length)];
    const pureWord = randomWord.en_us.replace(/[^a-zA-Z]/g, '').toUpperCase();
    
    currentWord.value = { original: randomWord.en_us, pure: pureWord, zh: randomWord.zh_tw };
    minesFound.value = 0;
    isBoardLocked.value = false;
    
    generateBoard(pureWord);
};

const generateBoard = (word) => {
    const size = config.value.board_size;
    const totalCells = size * size;
    if (word.length > totalCells / 2) {
        // 防止單字太長塞滿地圖
        config.value.board_size = Math.ceil(Math.sqrt(word.length * 2.5));
    }
    
    const newBoard = Array.from({ length: size }, () => 
        Array.from({ length: size }, () => ({
            isMine: false, letter: '', revealed: false, flagged: false, adjacentMines: 0, boom: false, wrongFlag: false
        }))
    );

    // 隨機埋入「字母地雷」
    let lettersToPlace = word.split('');
    while (lettersToPlace.length > 0) {
        let r = Math.floor(Math.random() * size);
        let c = Math.floor(Math.random() * size);
        if (!newBoard[r][c].isMine) {
            newBoard[r][c].isMine = true;
            newBoard[r][c].letter = lettersToPlace.shift();
        }
    }

    // 計算周圍地雷數
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!newBoard[r][c].isMine) {
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        let nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && newBoard[nr][nc].isMine) count++;
                    }
                }
                newBoard[r][c].adjacentMines = count;
            }
        }
    }
    board.value = newBoard;
};

// --- 點擊邏輯 ---
const handleCellClick = (r, c) => {
    if (isBoardLocked.value || board.value[r][c].revealed) return;
    
    if (mode.value === 'dig') digCell(r, c);
    else flagCell(r, c);
};

const digCell = (r, c) => {
    let cell = board.value[r][c];
    if (cell.flagged) return; // 有插旗不可挖

    if (cell.isMine) {
        // 💥 踩到地雷了！
        sfx.boom();
        cell.boom = true;
        handleMistake();
        revealAllMines();
    } else {
        sfx.reveal();
        floodFill(r, c);
    }
};

const flagCell = (r, c) => {
    let cell = board.value[r][c];
    if (cell.flagged) return; // 已經標記正確的不可取消

    if (cell.isMine) {
        // ✅ 成功抓到字母！
        sfx.correctFlag();
        cell.revealed = true;
        cell.flagged = true;
        score.value += 10;
        minesFound.value++;
        
        if (minesFound.value === currentWord.value.pure.length) {
            sfx.winWord();
            score.value += 20; // 完殺獎勵
            if (!correctWordsList.value.includes(currentWord.value.original)) correctWordsList.value.push(currentWord.value.original);
            isBoardLocked.value = true;
            setTimeout(loadNextWord, 1500);
        }
    } else {
        // ❌ 標記錯誤 (空地當成地雷)
        sfx.wrongFlag();
        cell.wrongFlag = true;
        setTimeout(() => { cell.wrongFlag = false; }, 500); // 閃爍紅底提示
        handleMistake();
    }
};

const floodFill = (r, c) => {
    const size = config.value.board_size;
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    
    let cell = board.value[r][c];
    if (cell.revealed || cell.flagged || cell.isMine) return;

    cell.revealed = true;

    if (cell.adjacentMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                floodFill(r + dr, c + dc);
            }
        }
    }
};

const handleMistake = () => {
    score.value = Math.max(0, score.value - config.value.penalty);
    mistakesCount.value++;
    if (!wrongWordsList.value.includes(currentWord.value.original)) wrongWordsList.value.push(currentWord.value.original);
};

const revealAllMines = () => {
    isBoardLocked.value = true;
    const size = config.value.board_size;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            let cell = board.value[r][c];
            if (cell.isMine) {
                cell.revealed = true;
                cell.flagged = true;
            }
        }
    }
    // 爆炸後 2 秒換下一題
    setTimeout(loadNextWord, 2000);
};

const getNumberColor = (num) => {
    const colors = ['', '#1976d2', '#388e3c', '#d32f2f', '#7b1fa2', '#f57c00', '#0097a7', '#424242', '#616161'];
    return colors[num] || '#000';
};

const endGame = async (reason) => {
    gameStatus.value = 'end';
    clearInterval(timer);
    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reason} | 分數: ${score.value}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字踩地雷', score: score.value, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: cw, wrong_words: wrongWordsList.value.join(', '), mistakes: mistakesCount.value
        }]);
    }
};

const quitGame = () => {
    if (gameStatus.value === 'playing') endGame('主動放棄');
    else navigateTo('/');
};

onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="ms-root">
    <header class="t-header retro-element">
      <h2 class="t-title">💣 單字踩地雷</h2>
      <div v-if="gameStatus === 'playing'" class="t-stats">
         <span style="color:#ffeb3b; margin-right:10px;">🏆 {{ score }}</span>
         <span>⏱️ {{ config.time_limit - timeSpent }}s</span>
      </div>
      <button class="retro-btn btn-small btn-danger" @click="quitGame">放棄</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element">
        <div class="icon-big">💣</div>
        <h2 style="color:#ffeb3b; margin-bottom: 10px;">尋找字母地雷</h2>
        
        <div class="rules-box">
            <h3 style="color: #00bcd4; text-align: center; margin-top: 0; margin-bottom: 10px;">📜 掃雷規則 📜</h3>
            <p>1️⃣ <b>地雷就是單字</b>：地圖上藏著目標單字的字母 (例如 APPLE 就藏有 5 個地雷)。</p>
            <p>2️⃣ <b>兩種操作模式</b>：<br>
               🔸 ⛏️ <b>挖掘模式</b>：點擊空地可獲得數字情報 (代表周圍 8 格藏有幾個字母)。<br>
               🔸 🚩 <b>標記模式</b>：當你推測某格藏有字母，切換至標記並點擊它！
            </p>
            <p>3️⃣ <b>對錯判定</b>：<br>
               🔸 標記正確：成功找出一枚字母，得 10 分！<br>
               🔸 標記錯誤 (空地)：扣分！<br>
               🔸 挖到地雷：<span style="color:#ff5252;">💣 爆炸扣分並直接跳下一題！</span>
            </p>
            <p>找齊單字所有字母即可大獲全勝，繼續挑戰下一字！</p>
        </div>

        <button class="retro-btn btn-primary" style="margin-top:20px; width:100%; padding:15px; font-size: 1.3rem;" @click="startGame">開始掃雷</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="game-board">
        
        <div class="hint-panel retro-element" v-if="currentWord">
            <div class="zh-hint">{{ currentWord.zh }}</div>
            <div class="word-progress">
                找出字母進度：<span style="color:#ffeb3b; font-size: 1.4rem;">{{ minesFound }} / {{ currentWord.pure.length }}</span>
            </div>
        </div>

        <div class="board-container">
            <div class="ms-grid" :style="{ gridTemplateColumns: `repeat(${config.board_size}, 1fr)` }">
                <template v-for="(row, r) in board" :key="r">
                    <div v-for="(cell, c) in row" :key="c" 
                         class="ms-cell" 
                         :class="{ 'revealed': cell.revealed, 'boom': cell.boom, 'wrong-flag': cell.wrongFlag }"
                         @click="handleCellClick(r, c)">
                        
                        <div v-if="!cell.revealed" class="cell-cover"></div>
                        
                        <div v-else class="cell-content">
                            <span v-if="cell.isMine" class="mine-letter" :class="{'boom-text': cell.boom}">{{ cell.letter }}</span>
                            <span v-else-if="cell.adjacentMines > 0" class="adjacent-num" :style="{ color: getNumberColor(cell.adjacentMines) }">{{ cell.adjacentMines }}</span>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <div class="control-panel retro-element">
            <div class="toggle-container">
                <button class="mode-btn" :class="{ 'active': mode === 'dig' }" @click="mode = 'dig'; sfx.click()">
                    <span class="icon">⛏️</span> 挖掘空地
                </button>
                <button class="mode-btn flag-btn" :class="{ 'active': mode === 'flag' }" @click="mode = 'flag'; sfx.click()">
                    <span class="icon">🚩</span> 標記字母
                </button>
            </div>
        </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>任務結束</h1>
          <p class="winner-text" style="color:#4caf50;">得分：{{ score }}</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ errorMsg || '時間到' }}</p>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
       </div>
    </div>

  </div>
</template>

<style scoped>
.ms-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #e0f7fa; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: rgba(0, 96, 100, 0.95); border: 2px solid #00bcd4; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); padding: 10px; box-sizing: border-box; }
.retro-btn { background: #00838f; color: #fff; border: 2px solid #80deea; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.1s; }
.retro-btn:active:not(:disabled) { transform: translateY(3px); }
.btn-primary { background: #0277bd; border-color: #4fc3f7; }
.btn-danger { background: #d32f2f; border-color: #e57373; }
.btn-small { padding: 5px 10px; }

.t-header { display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 10px; background: #006064;}
.t-title { margin: 0; font-size: 1.1rem; color: #e0f7fa; }
.t-stats { font-weight: bold; font-size: 1.1rem; }

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 500px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.rules-box { text-align: left; background: rgba(0,0,0,0.4); padding: 15px; border-radius: 8px; font-size: 0.95rem; border: 1px dashed #00bcd4;}

/* 🌟 遊戲佈局 */
.game-board { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 5px; gap: 10px; position: relative; }

.hint-panel { width: 100%; max-width: 500px; text-align: center; padding: 10px; border-color: #ffeb3b; }
.zh-hint { font-size: 2rem; font-weight: 900; color: #fff; margin-bottom: 5px; text-shadow: 1px 1px 0 #000; }
.word-progress { font-size: 1rem; font-weight: bold; color: #b2ebf2; }

/* 💣 地雷網格 (經典 Win98 立體風格) */
.board-container { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; min-height: 0; }
.ms-grid { display: grid; gap: 2px; background: #9e9e9e; padding: 4px; border: 3px solid; border-top-color: #616161; border-left-color: #616161; border-bottom-color: #eee; border-right-color: #eee; width: 100%; max-width: 500px; aspect-ratio: 1/1; box-sizing: border-box; }

.ms-cell { width: 100%; height: 100%; position: relative; display: flex; justify-content: center; align-items: center; background: #e0e0e0; cursor: pointer; font-family: 'Arial', sans-weight; font-weight: 900; box-sizing: border-box; }

/* 未翻開的立體蓋子 */
.cell-cover { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #bdbdbd; border: 3px solid; border-top-color: #fff; border-left-color: #fff; border-bottom-color: #757575; border-right-color: #757575; box-sizing: border-box; }
.cell-cover:active { border-top-color: #757575; border-left-color: #757575; border-bottom-color: #fff; border-right-color: #fff; }

/* 翻開後的內容 */
.ms-cell.revealed { border: 1px solid #9e9e9e; border-top-color: #757575; border-left-color: #757575; }
.cell-content { font-size: clamp(1.2rem, 5vw, 2.5rem); }
.adjacent-num { text-shadow: 1px 1px 0 rgba(255,255,255,0.5); }
.mine-letter { color: #fff; background: #4caf50; padding: 2px 5px; border-radius: 4px; box-shadow: 0 0 5px #4caf50; }

/* 錯誤與爆炸 */
.ms-cell.boom { background: #f44336; }
.boom-text { background: transparent; box-shadow: none; color: #fff; }
.wrong-flag { animation: flashRed 0.5s; }
@keyframes flashRed { 0% { background: #f44336; } 100% { background: #e0e0e0; } }

/* 🎮 控制切換按鈕 */
.control-panel { width: 100%; max-width: 500px; margin-bottom: 10px; padding: 5px; }
.toggle-container { display: flex; gap: 5px; height: 60px; }
.mode-btn { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #37474f; border: 2px solid #546e7a; color: #b0bec5; font-size: 1rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.mode-btn .icon { font-size: 1.5rem; margin-bottom: 2px; filter: grayscale(100%); opacity: 0.5;}
.mode-btn.active { background: #00838f; color: #fff; border-color: #80deea; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); }
.mode-btn.active .icon { filter: none; opacity: 1; transform: scale(1.2); }
.flag-btn.active { background: #d32f2f; border-color: #ffcdd2; }

@media (min-width: 768px) {
    .ms-grid { gap: 3px; border-width: 4px; }
    .cell-cover { border-width: 4px; }
    .toggle-container { height: 80px; }
    .mode-btn { font-size: 1.2rem; flex-direction: row; gap: 10px; }
    .mode-btn .icon { font-size: 2rem; margin-bottom: 0; }
}
</style>