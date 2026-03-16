<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import { useBgmUnlock } from '~/composables/useBgmUnlock';
import { useRoute } from 'vue-router';

const route = useRoute();
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const timeLimitSetting = ref(60); 
const maxScoreSetting = ref(20); // 每個單字完成得 20 分 (5個字共100分)
const penaltySetting = ref(3);   // 排錯一個字扣 3 分

const vocabularies = ref([]);
const currentWords = ref([]);
const totalScore = ref(0);
const scoreGained = ref(0); // 本次遊戲已獲得的分數
const mistakes = ref(0);

const isLoading = ref(true);
const isGameOver = ref(false);

const timeLeft = ref(60);
let timer = null;
const gameStartTime = ref(0);

// 填字遊戲核心變數
const grid = ref([]); // 2D 陣列 (地圖)
const gridSize = ref(15);
const wordsInfo = ref([]); // 記錄每個字在地圖上的位置與狀態
const letterPool = ref([]); // 旁邊打亂的字母方塊
const selectedCell = ref(null); // 目前選中的格子 { r, c }

const correctWords = ref(new Set());
const wrongWords = ref(new Set()); 

// 初始化地圖
const initGrid = () => {
  grid.value = Array(gridSize.value).fill(null).map(() => Array(gridSize.value).fill({ isActive: false }));
};

onMounted(async () => {
  if (!route.query.unit) { navigateTo('/'); return; }
  
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) {
    timeLimitSetting.value = settings.cross_game_time_limit ?? 60;
    maxScoreSetting.value = settings.cross_max_score ?? 20;
    penaltySetting.value = settings.cross_penalty ?? 3;
  }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit);
  if (route.query.volume && route.query.volume !== 'undefined') query = query.eq('volume', route.query.volume);
  
  const { data } = await query;
  if (data && data.length >= 5) {
    vocabularies.value = data;
    loadNewPuzzle();
    isLoading.value = false;
  } else {
    alert('單字庫不足 5 個，無法進行填字遊戲！'); navigateTo('/');
  }
});

// 🌟 簡易 Crossword 產生器演算法
// 🌟 升級版 Crossword 產生器演算法 (保證 5 個字絕對會出現)
const generateCrossword = (words) => {
  initGrid();
  wordsInfo.value = [];
  let availableLetters = [];

  // 檢查是否可以放置單字的函數
  const canPlaceWord = (word, startR, startC, dir) => {
    if (dir === 'H' && startC + word.length > gridSize.value) return false;
    if (dir === 'V' && startR + word.length > gridSize.value) return false;
    if (startR < 0 || startC < 0) return false;

    for (let i = 0; i < word.length; i++) {
      let r = dir === 'V' ? startR + i : startR;
      let c = dir === 'H' ? startC + i : startC;
      let cell = grid.value[r][c];
      
      // 如果這格已經有字，而且不是我們要交集的那個字母，就代表碰撞了
      if (cell.isActive && cell.char !== word[i]) {
        return false;
      }
    }
    return true;
  };

  // 實際把單字寫入地圖的函數
  const placeWordOnGrid = (w, r, c, dir, zh) => {
    wordsInfo.value.push({ word: w, zh: zh, r: r, c: c, dir: dir, isCompleted: false, wrongTries: 0 });
    for (let k = 0; k < w.length; k++) {
      let currR = dir === 'V' ? r + k : r;
      let currC = dir === 'H' ? c + k : c;
      
      if (!grid.value[currR][currC].isActive) {
        grid.value[currR][currC] = { isActive: true, char: w[k], current: k === 0 ? w[0] : '', isHint: k === 0 };
        if (k !== 0) availableLetters.push(w[k]);
      }
    }
  };

  // 1. 第一個字放中間 (橫向)
  const firstWord = words[0];
  const w1 = firstWord.en_us.replace(/[?()!]/g, '').trim().toUpperCase();
  let startC = Math.floor((gridSize.value - w1.length) / 2);
  let startR = Math.floor(gridSize.value / 2);
  placeWordOnGrid(w1, startR, startC, 'H', firstWord.zh_tw);

  // 2. 嘗試將剩下的字放進去
  for (let i = 1; i < words.length; i++) {
    const w = words[i].en_us.replace(/[?()!]/g, '').trim().toUpperCase();
    let placed = false;

    // 優先嘗試：尋找交集點 (製造十字交叉)
    for (let info of wordsInfo.value) {
      if (placed) break;
      for (let j = 0; j < w.length; j++) {
        const intersectionIndex = info.word.indexOf(w[j]);
        if (intersectionIndex !== -1) {
          let newDir = info.dir === 'H' ? 'V' : 'H';
          let newR = info.dir === 'H' ? info.r - j : info.r + intersectionIndex;
          let newC = info.dir === 'H' ? info.c + intersectionIndex : info.c - j;

          if (canPlaceWord(w, newR, newC, newDir)) {
            placeWordOnGrid(w, newR, newC, newDir, words[i].zh_tw);
            placed = true;
            break;
          }
        }
      }
    }
    
    // 備案嘗試：如果找不到交集，或者交集會撞到別的字，就找個乾淨的空位橫向放
    if (!placed) {
      // 從上到下、從左到右尋找可以放的空位
      for (let r = 0; r < gridSize.value; r += 2) { // 隔行找避免太擠
        if (placed) break;
        for (let c = 0; c <= gridSize.value - w.length; c++) {
          // 確保這整行包含上下都盡量是空的
          let isRowClean = true;
          for (let k = -1; k <= w.length; k++) {
            let checkC = c + k;
            if (checkC >= 0 && checkC < gridSize.value) {
               if (grid.value[r][checkC]?.isActive || 
                  (r > 0 && grid.value[r-1][checkC]?.isActive) || 
                  (r < gridSize.value-1 && grid.value[r+1][checkC]?.isActive)) {
                 isRowClean = false;
                 break;
               }
            }
          }
          
          if (isRowClean && canPlaceWord(w, r, c, 'H')) {
            placeWordOnGrid(w, r, c, 'H', words[i].zh_tw);
            placed = true;
            break;
          }
        }
      }
    }
    
    // 極端情況備案：如果上面還是找不到空位，硬塞到最底層
    if (!placed) {
      for (let r = 0; r < gridSize.value; r++) {
         for(let c = 0; c <= gridSize.value - w.length; c++) {
             if(canPlaceWord(w, r, c, 'H')) {
                 placeWordOnGrid(w, r, c, 'H', words[i].zh_tw);
                 placed = true;
                 break;
             }
         }
         if(placed) break;
      }
    }
  }

  // 3. 打亂字母方塊
  letterPool.value = availableLetters.sort(() => Math.random() - 0.5).map((char, id) => ({ id, char, isUsed: false }));
};

const loadNewPuzzle = () => {
  clearInterval(timer);
  selectedCell.value = null;
  scoreGained.value = 0;
  
  // 隨機抽 5 題
  currentWords.value = [...vocabularies.value].sort(() => Math.random() - 0.5).slice(0, 5);
  generateCrossword(currentWords.value);
  
  gameStartTime.value = Date.now();
  timeLeft.value = timeLimitSetting.value;
  startTimer();
};

const startTimer = () => {
  timer = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      clearInterval(timer);
      endGame();
    }
  }, 1000);
};

// 點擊格子準備填字
const selectCell = (r, c) => {
  const cell = grid.value[r][c];
  if (cell.isActive && !cell.isHint && !isGameOver.value) {
    // 如果這格已經有字，退回字母池
    if (cell.current) {
      const poolItem = letterPool.value.find(p => p.char === cell.current && p.isUsed);
      if (poolItem) poolItem.isUsed = false;
      cell.current = '';
    }
    selectedCell.value = { r, c };
  }
};

// 點擊字母池把字填入選中的格子
const fillLetter = (poolItem) => {
  if (poolItem.isUsed || !selectedCell.value || isGameOver.value) return;
  
  const { r, c } = selectedCell.value;
  grid.value[r][c].current = poolItem.char;
  poolItem.isUsed = true;
  selectedCell.value = null; // 填完取消選取
  
  checkWords();
};

// 檢查單字是否完成
const checkWords = () => {
  let allCompleted = true;

  wordsInfo.value.forEach((info, idx) => {
    if (info.isCompleted) return;

    let isWordFull = true;
    let currentWordStr = '';
    
    // 檢查這個詞的格子是否都填滿了
    for (let i = 0; i < info.word.length; i++) {
      let r = info.dir === 'V' ? info.r + i : info.r;
      let c = info.dir === 'H' ? info.c + i : info.c;
      if (!grid.value[r][c].current) {
        isWordFull = false;
        break;
      }
      currentWordStr += grid.value[r][c].current;
    }

    if (isWordFull) {
      if (currentWordStr === info.word) {
        // 拼對了！
        info.isCompleted = true;
        // 計算這題的得分 (滿分扣掉錯誤次數)
        let earned = Math.max(0, maxScoreSetting.value - (info.wrongTries * penaltySetting.value));
        scoreGained.value += earned;
        correctWords.value.add(currentWords.value[idx].en_us);
        
        // 鎖定這些格子
        for (let i = 0; i < info.word.length; i++) {
          let r = info.dir === 'V' ? info.r + i : info.r;
          let c = info.dir === 'H' ? info.c + i : info.c;
          grid.value[r][c].isHint = true; 
        }
      } else {
        // 拼滿了但拼錯！彈出錯誤，並扣分
        info.wrongTries++;
        mistakes.value++;
        wrongWords.value.add(currentWords.value[idx].en_us);
        
        // 將該字除了 hint 以外的字母彈回池子
        for (let i = 0; i < info.word.length; i++) {
          let r = info.dir === 'V' ? info.r + i : info.r;
          let c = info.dir === 'H' ? info.c + i : info.c;
          let cell = grid.value[r][c];
          if (!cell.isHint && cell.current) {
            const pItem = letterPool.value.find(p => p.char === cell.current && p.isUsed);
            if (pItem) pItem.isUsed = false;
            cell.current = '';
          }
        }
      }
    }
    
    if (!info.isCompleted) allCompleted = false;
  });

  if (allCompleted) {
    totalScore.value += scoreGained.value;
    endGame(true);
  }
};

const skipPuzzle = () => {
  // 不計分、不紀錄，直接重抽
  loadNewPuzzle();
};

const endGame = async (isWin = false) => {
  isGameOver.value = true;
  clearInterval(timer);
  
  if (isWin) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  
  // 如果時間到沒拼完，把未完成的算進總分
  if (!isWin) {
    totalScore.value += scoreGained.value;
  }

  if (studentCookie.value && !studentCookie.value.isAnon) {
    const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);
    
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, game_type: '單字填字FUN', version: route.query.version, volume: route.query.volume || '', unit_played: route.query.unit, 
      score: totalScore.value, mistakes: mistakes.value, correct_words: Array.from(correctWords.value).join(', '), wrong_words: Array.from(wrongWords.value).join(', '), time_taken_seconds: totalTimeTaken 
    }]);

    const { checkAndUnlockBgm } = useBgmUnlock(); 
    const unlockedThemeName = await checkAndUnlockBgm();
    if (unlockedThemeName) alert(`🎉 解鎖專屬風格：【${unlockedThemeName}】`);

    try {
      const { data: set } = await supabase.from('system_settings').select('tarot_unlock_count, tarot_unlock_score').eq('id', 1).single();
      const uCount = set?.tarot_unlock_count || 10;
      const uScore = set?.tarot_unlock_score || 0;

      const { count: totalPlays } = await supabase.from('game_records')
        .select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id).eq('unit_played', route.query.unit).gte('score', uScore);

      if (totalPlays > 0 && totalPlays % uCount === 0) {
        const unlockedIndex = Math.floor(totalPlays / uCount) - 1;
        let wordQuery = supabase.from('vocabularies').select('en_us').eq('version', route.query.version).eq('unit', route.query.unit).order('id', { ascending: true });
        if (route.query.volume && route.query.volume !== 'undefined') wordQuery = wordQuery.eq('volume', route.query.volume);
        const { data: words } = await wordQuery;
        if (words && words[unlockedIndex]) {
          const targetWord = words[unlockedIndex].en_us.replace(/[?()!]/g, '').trim();
          setTimeout(() => {
            alert(`🎊 命運的齒輪開始轉動！您已達成 ${totalPlays} 次完美練習，獲得一張神祕塔羅牌！`);
            navigateTo(`/tarot?reveal_word=${targetWord}&set=1`);
          }, 1500);
        }
      }
    } catch(e) {}
  }
};

const restartGame = () => { if (typeof window !== 'undefined') window.location.reload(); };
onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="game-container">
    <div class="game-box retro-element" v-if="!isLoading && !isGameOver">
      
      <div class="header-info">
        <div class="timer" :class="{'low-time': timeLeft <= 10}">⏳ 倒數: {{ timeLeft }}s</div>
        <div class="score-display">本局得分: <strong style="color: var(--danger-color);">{{ scoreGained }}</strong> / 100</div>
      </div>

      <div class="layout-split">
        <div class="hints-panel retro-element">
          <h3>📖 詞意提示</h3>
          <ul>
            <li v-for="(info, index) in wordsInfo" :key="index" :class="{'completed': info.isCompleted}">
              {{ info.zh }}
              <span v-if="info.isCompleted">✅</span>
              <span v-else-if="info.wrongTries > 0" class="err-hint"> (已扣 {{ info.wrongTries * penaltySetting }} 分)</span>
            </li>
          </ul>
        </div>

        <div class="grid-panel">
          <div class="crossword-grid">
            <div v-for="(row, rIndex) in grid" :key="rIndex" class="grid-row">
              <div 
                v-for="(cell, cIndex) in row" :key="cIndex" 
                class="grid-cell"
                :class="{ 
                  'active': cell.isActive, 
                  'hint': cell.isHint,
                  'selected': selectedCell?.r === rIndex && selectedCell?.c === cIndex
                }"
                @click="selectCell(rIndex, cIndex)"
              >
                {{ cell.isActive ? cell.current : '' }}
              </div>
            </div>
          </div>
        </div>

        <div class="letters-panel retro-element">
          <h3>🔠 字母區</h3>
          <div class="letters-pool">
            <button 
              v-for="item in letterPool" :key="item.id"
              class="letter-btn"
              :class="{'used': item.isUsed}"
              @click="fillLetter(item)"
              :disabled="item.isUsed || !selectedCell"
            >
              {{ item.char }}
            </button>
          </div>
          <p class="helper-text" v-if="!selectedCell">請先點擊地圖上的空白格</p>
        </div>
      </div>

      <div class="controls" style="margin-top: 20px; text-align: center;">
        <button class="retro-btn skip-btn" @click="skipPuzzle">⏭️ 太難了，換下一組單字 (不計分)</button>
      </div>
    </div>

    <div class="game-box retro-element text-center" v-if="isGameOver">
      <h1>🔠 填字挑戰結束！</h1>
      <div class="final-score">{{ totalScore }} 分</div>
      <div class="action-buttons" style="margin-top: 20px;">
        <button class="retro-btn restart-btn" @click="restartGame">🔄 再玩一次</button>
        <NuxtLink to="/" class="retro-btn home-btn">🏠 回首頁</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container { min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 20px; box-sizing: border-box; background: var(--bg-color);}
.game-box { background: var(--box-bg); padding: 20px; border: var(--box-border-width) solid var(--border-color); border-radius: 20px; width: 100%; max-width: 1100px; box-shadow: var(--shadow-box); margin-top: 20px;}

.header-info { display: flex; justify-content: space-between; font-weight: 900; font-size: 1.4rem; margin-bottom: 20px; color: var(--text-main); border-bottom: 2px dashed #ccc; padding-bottom: 10px;}
.low-time { color: var(--danger-color); animation: pulse 1s infinite; }

/* 🌟 版型佈局：預設電腦版為橫向並排 */
.layout-split { display: flex; gap: 20px; flex-wrap: wrap; }

/* 提示面板 */
.hints-panel { flex: 1; min-width: 250px; background: #e3f2fd; padding: 15px; border-radius: 12px; border: 2px solid #0277bd;}
.hints-panel h3 { margin-top: 0; color: #0277bd; border-bottom: 2px solid #0277bd; padding-bottom: 5px;}
.hints-panel ul { padding-left: 20px; margin: 0; font-size: 1.1rem; font-weight: bold; line-height: 1.8;}
.completed { color: var(--success-color); text-decoration: line-through; }
.err-hint { color: var(--danger-color); font-size: 0.9rem; }

/* 地圖面板 */
.grid-panel { flex: 2; display: flex; justify-content: center; align-items: flex-start; overflow-x: auto; padding-bottom: 10px;}
.crossword-grid { display: flex; flex-direction: column; gap: 2px; background: #333; padding: 4px; border-radius: 8px;}
.grid-row { display: flex; gap: 2px; }
.grid-cell { 
  width: 35px; height: 35px; background: #222; border-radius: 4px;
  display: flex; justify-content: center; align-items: center;
  font-size: 1.4rem; font-weight: 900; color: #111;
  transition: 0.2s;
}
.grid-cell.active { background: #fff; cursor: pointer; box-shadow: inset 0 0 5px rgba(0,0,0,0.1); }
.grid-cell.hint { background: #ffeaa7; color: #d35400; cursor: not-allowed; }
.grid-cell.selected { background: #74b9ff; color: white; transform: scale(1.1); box-shadow: 0 0 10px #0984e3; z-index: 10;}

/* 字母面板 */
.letters-panel { flex: 1; min-width: 250px; background: #fdfefe; padding: 15px; border-radius: 12px; border: 2px solid #d35400;}
.letters-panel h3 { margin-top: 0; color: #d35400; border-bottom: 2px solid #d35400; padding-bottom: 5px;}
.letters-pool { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; justify-content: center;}
.letter-btn { width: 45px; height: 45px; font-size: 1.5rem; font-weight: 900; background: var(--btn-primary-bg); color: var(--btn-primary-text); border: 2px solid #333; border-radius: 8px; cursor: pointer; transition: 0.1s; box-shadow: 0 4px 0 #333; }
.letter-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.letter-btn.used { background: #eee; color: #aaa; border-color: #ccc; box-shadow: none; cursor: not-allowed; }
.helper-text { color: #e74c3c; font-weight: bold; font-size: 0.9rem; text-align: center; margin: 0; animation: pulse 2s infinite;}

.controls { margin-top: 20px; text-align: center; }
.retro-btn { padding: 15px 25px; font-weight: 900; border: 2px solid #000; border-radius: 10px; cursor: pointer; text-decoration: none; display: inline-block; font-size: 1.2rem; width: 100%; box-sizing: border-box;}
.skip-btn { background: var(--tab-bg); color: var(--text-main); font-size: 1rem; padding: 12px 20px;}
.restart-btn { background: var(--success-bg); margin-bottom: 10px;} .home-btn { background: #eee; color: #000;}

.text-center { text-align: center; }
.final-score { font-size: 5rem; color: var(--danger-color); font-weight: 900; margin: 20px 0; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

/* 📱 手機版專屬排版優化 (RWD) */
@media (max-width: 900px) {
  .layout-split { flex-direction: column; gap: 15px; }
  
  /* 讓地圖在手機上盡量大，且有橫向卷軸可以滑動 */
  .grid-panel { order: 2; width: 100%; justify-content: flex-start; padding: 10px 0; border-radius: 8px;}
  
  /* 讓提示面板排在最上面 */
  .hints-panel { order: 1; width: 100%; box-sizing: border-box;}
  .hints-panel ul { font-size: 1rem; line-height: 1.5; padding-left: 15px;}
  
  /* 讓字母按鈕區在最下面 */
  .letters-panel { order: 3; width: 100%; box-sizing: border-box;}
  
  /* 微調格子跟按鈕大小以適應手指點擊 */
  .grid-cell { width: 30px; height: 30px; font-size: 1.2rem; }
  .letter-btn { width: 40px; height: 40px; font-size: 1.3rem; }
  
  .header-info { font-size: 1.1rem; }
}
</style>