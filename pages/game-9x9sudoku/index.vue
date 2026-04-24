<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

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

const config = ref({ time_limit: 600, penalty: 5, blankCount: 45 });

// 🔢 數獨狀態
const selectedWords = ref([]); // 抽出的 9 個單字
const board = ref([]); // 9x9 網格
const selectedCell = ref(null); // { r, c }
const emptyCellsRemaining = ref(81);

// --- 音效與發音系統 ---
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
  correct: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.15), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2),
  win: () => { [523, 659, 783, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2), i * 150)); }
};

const speakWord = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.sudoku_time_limit) config.value.time_limit = settings.sudoku_time_limit;
        if (settings.sudoku_penalty) config.value.penalty = settings.sudoku_penalty;
        if (settings.sudoku_blank_count) config.value.blankCount = settings.sudoku_blank_count;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      // 確保單字量至少有 9 個
      if (data && data.length >= 9) {
          allWords.value = data.filter(v => v.en_us && v.en_us.trim().length > 0);
      } else { 
          errorMsg.value = '⚠️ 該單元單字不足 9 個，無法進行數獨遊戲！'; 
      }
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }
  } catch (e) { console.error(e); }
});

// --- 數獨產生演算法 ---
const generateSudoku = () => {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    
    const isValid = (grid, r, c, num) => {
        for (let i = 0; i < 9; i++) {
            if (grid[r][i] === num || grid[i][c] === num) return false;
        }
        const startR = Math.floor(r / 3) * 3;
        const startC = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[startR + i][startC + j] === num) return false;
            }
        }
        return true;
    };

    const fillGrid = (grid) => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (grid[r][c] === 0) {
                    const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
                    for (let num of nums) {
                        if (isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            if (fillGrid(grid)) return true;
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    };

    fillGrid(grid);
    return grid;
};

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    score.value = 0; correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    
    // 1. 隨機抽 9 個單字
    const shuffled = [...allWords.value].sort(() => 0.5 - Math.random());
    selectedWords.value = shuffled.slice(0, 9).map(w => ({ en: w.en_us.trim(), zh: w.zh_tw }));

    // 2. 產生解答盤面 (1~9 對應 selectedWords 0~8)
    const solutionGrid = generateSudoku();

    // 3. 挖空
    const puzzleGrid = JSON.parse(JSON.stringify(solutionGrid));
    let blanksToMake = config.value.blankCount;
    emptyCellsRemaining.value = blanksToMake;
    
    while (blanksToMake > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (puzzleGrid[r][c] !== 0) {
            puzzleGrid[r][c] = 0;
            blanksToMake--;
        }
    }

    // 4. 建立 UI 綁定陣列
    const newBoard = [];
    for (let r = 0; r < 9; r++) {
        const row = [];
        for (let c = 0; c < 9; c++) {
            row.push({
                solution: solutionGrid[r][c] - 1, // 對應單字 Index (0~8)
                value: puzzleGrid[r][c] !== 0 ? puzzleGrid[r][c] - 1 : null,
                isGiven: puzzleGrid[r][c] !== 0,
                isError: false
            });
        }
        newBoard.push(row);
    }
    board.value = newBoard;
    selectedCell.value = null;

    gameStartTime.value = Date.now();
    gameStatus.value = 'playing'; 
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('時間到');
    }, 1000);
};

const handleCellClick = (r, c) => {
    if (gameStatus.value !== 'playing') return;
    const cell = board.value[r][c];
    
    // 如果點擊已填入的單字，發音
    if (cell.value !== null) {
        speakWord(selectedWords.value[cell.value].en);
    }

    // 只有非固定的格子可以被選取
    if (!cell.isGiven) {
        selectedCell.value = { r, c };
        sfx.click();
    } else {
        selectedCell.value = null;
    }
};

const handleInputWord = (wordIndex) => {
    if (gameStatus.value !== 'playing' || !selectedCell.value) return;

    const r = selectedCell.value.r;
    const c = selectedCell.value.c;
    const cell = board.value[r][c];
    const wordEng = selectedWords.value[wordIndex].en;

    if (cell.solution === wordIndex) {
        // ✅ 填對了！
        if (cell.value === null) {
            emptyCellsRemaining.value--;
            score.value += 10;
        }
        cell.value = wordIndex;
        cell.isError = false;
        selectedCell.value = null;
        sfx.correct();
        speakWord(wordEng);
        
        if (!correctWordsList.value.includes(wordEng)) correctWordsList.value.push(wordEng);

        // 檢查是否全滿獲勝
        if (emptyCellsRemaining.value === 0) {
            sfx.win();
            score.value += 100; // 完殺大獎
            endGame('成功解開數獨！');
        }

    } else {
        // ❌ 填錯了！
        cell.isError = true;
        sfx.wrong();
        score.value = Math.max(0, score.value - config.value.penalty);
        mistakesCount.value++;
        if (!wrongWordsList.value.includes(wordEng)) wrongWordsList.value.push(wordEng);
        
        setTimeout(() => { cell.isError = false; }, 800);
    }
};

const endGame = async (reason) => {
    gameStatus.value = 'end';
    clearInterval(timer);
    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reason} | 分數: ${score.value}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字9x9數獨', score: score.value, time_taken_seconds: timeSpent.value,
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
  <div class="sudoku-root">
    <header class="t-header retro-element">
      <h2 class="t-title">🔢 單字 9x9 數獨</h2>
      <div v-if="gameStatus === 'playing'" class="t-stats">
         <span style="color:#ffeb3b; margin-right:10px;">🏆 {{ score }}</span>
         <span>⏱️ {{ config.time_limit - timeSpent }}s</span>
      </div>
      <button class="retro-btn btn-small btn-danger" @click="quitGame">放棄</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element">
        <div class="icon-big" style="color: #9c27b0;">🔢</div>
        <h2 style="color:#e1bee7; margin-bottom: 10px;">單字九宮精選陣</h2>
        
        <div class="rules-box">
            <h3 style="color: #ce93d8; text-align: center; margin-top: 0; margin-bottom: 10px;">📜 遊戲規則 📜</h3>
            <p>1️⃣ <b>單字代碼</b>：本局抽出 9 個單字取代傳統的數字 1~9。</p>
            <p>2️⃣ <b>數獨邏輯</b>：在 9x9 的網格中，保證「每行」、「每列」與「每個 3x3 粗線區塊」內，這 9 個單字<b>皆不能重複</b>。</p>
            <p>3️⃣ <b>中文解碼</b>：<br>
               🔸 先點擊你要填寫的空白格子。<br>
               🔸 利用邏輯推敲出該格應填入的英文單字後，在下方的<b>「中文選字盤」</b>點擊正確的中文解釋來填入！
            </p>
            <p>4️⃣ <b>發音提示</b>：點擊盤面上已填好的英文單字，系統會朗讀發音！填錯將會扣分。</p>
        </div>

        <button class="retro-btn btn-primary" style="margin-top:20px; width:100%; padding:15px; font-size: 1.3rem;" @click="startGame">進入矩陣</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="game-board">
        
        <div class="board-container">
            <div class="sudoku-grid">
                <template v-for="(row, r) in board" :key="r">
                    <div v-for="(cell, c) in row" :key="c" 
                         class="s-cell" 
                         :class="{ 
                             'given': cell.isGiven, 
                             'selected': selectedCell?.r === r && selectedCell?.c === c,
                             'error-flash': cell.isError,
                             'border-r': c % 3 === 2 && c !== 8,
                             'border-b': r % 3 === 2 && r !== 8
                         }"
                         @click="handleCellClick(r, c)">
                        
                        <span v-if="cell.value !== null" class="cell-text">
                            {{ selectedWords[cell.value].en }}
                        </span>
                    </div>
                </template>
            </div>
        </div>

        <div class="palette-container retro-element">
            <div class="palette-title">中文選字盤 (點選填入)</div>
            <div class="palette-grid">
                <button v-for="(word, idx) in selectedWords" :key="idx" 
                        class="retro-btn palette-btn" 
                        :disabled="!selectedCell"
                        @click="handleInputWord(idx)">
                    {{ word.zh }}
                </button>
            </div>
        </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>挑戰結束</h1>
          <p class="winner-text" style="color:#ce93d8;">得分：{{ score }}</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ errorMsg || '時間到或通關' }}</p>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
       </div>
    </div>

  </div>
</template>

<style scoped>
.sudoku-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #20124d; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: rgba(49, 27, 146, 0.95); border: 2px solid #8e24aa; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); padding: 10px; box-sizing: border-box; }
.retro-btn { background: #4a148c; color: #fff; border: 2px solid #ce93d8; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.1s; font-family: inherit;}
.retro-btn:active:not(:disabled) { transform: translateY(3px); }
.btn-primary { background: #7b1fa2; border-color: #e1bee7; }
.btn-danger { background: #d32f2f; border-color: #e57373; }
.btn-small { padding: 5px 10px; }

.t-header { display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 5px; background: #311b92;}
.t-title { margin: 0; font-size: 1.1rem; color: #e1bee7; }
.t-stats { font-weight: bold; font-size: 1.1rem; }

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 500px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.rules-box { text-align: left; background: rgba(0,0,0,0.4); padding: 15px; border-radius: 8px; font-size: 0.95rem; border: 1px dashed #ce93d8;}

/* 🌟 遊戲佈局 */
.game-board { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 5px; gap: 10px; position: relative; min-height: 0;}

/* 🔢 數獨網格設計 */
.board-container { width: 100%; max-width: 500px; aspect-ratio: 1/1; display: flex; justify-content: center; align-items: center; margin-top: 5px; flex-shrink: 0;}
.sudoku-grid { display: grid; grid-template-columns: repeat(9, 1fr); grid-template-rows: repeat(9, 1fr); width: 100%; height: 100%; background: #fff; border: 3px solid #000; box-sizing: border-box; }

.s-cell { background: #fff; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; display: flex; justify-content: center; align-items: center; cursor: pointer; position: relative; overflow: hidden; padding: 2px;}
.s-cell.border-r { border-right: 3px solid #000; }
.s-cell.border-b { border-bottom: 3px solid #000; }

.s-cell.given { background: #e0e0e0; color: #000; cursor: pointer; }
.s-cell.selected { background: #fff59d; box-shadow: inset 0 0 0 2px #f57f17; }
.s-cell.error-flash { animation: flashRed 0.4s ease; }
@keyframes flashRed { 0% { background: #f44336; color: #fff;} 100% { background: #fff; } }

/* 🌟 單字字型自適應縮放，確保 9x9 塞得下英文單字 */
.cell-text { font-size: clamp(0.5rem, 2.5vw, 1.1rem); font-weight: 900; word-break: break-all; line-height: 1; text-align: center; color: #1a237e; }
.s-cell.given .cell-text { color: #000; }

/* 🎨 中文選字盤 */
.palette-container { width: 100%; max-width: 600px; padding: 10px; flex: 1; display: flex; flex-direction: column; min-height: 0;}
.palette-title { text-align: center; font-weight: bold; color: #e1bee7; margin-bottom: 8px; font-size: 0.9rem;}
.palette-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; flex: 1;}
.palette-btn { margin: 0; font-size: 0.95rem; display: flex; justify-content: center; align-items: center; padding: 5px; word-break: break-word; line-height: 1.2;}
.palette-btn:disabled { opacity: 0.4; filter: grayscale(100%); cursor: not-allowed; transform: none; }

@media (min-width: 768px) {
    .game-board { flex-direction: row; justify-content: center; align-items: stretch; gap: 20px; padding: 20px; }
    .board-container { max-width: 600px; }
    .cell-text { font-size: clamp(0.8rem, 1.5vw, 1.2rem); }
    .palette-container { max-width: 350px; justify-content: center;}
    .palette-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: minmax(60px, auto); }
    .palette-btn { font-size: 1.2rem; }
}
</style>