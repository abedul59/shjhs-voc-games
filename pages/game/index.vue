<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const route = useRoute();
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const { toggleBgm, setBgmSource } = useBgmUnlock();

const currentStudent = ref(null);
const allVocabs = ref([]);
const cards = ref([]);
const firstSelection = ref(null);
const score = ref(0);
const matchedPairs = ref(0);
const timeSpent = ref(0);
let timer = null;

const errorMsg = ref('');
const isGameFinished = ref(false);
const attemptNumber = ref(1);

const correctWords = ref(new Set());
const wrongWords = ref(new Set());

// 單字統計：總耗時、作答次數與平均時間
const wordStats = ref({});

// 從全域設定取得的遊戲參數
const gameConfig = ref({ match_card_count: 8, match_penalty_points: 5 });

// 動態網格樣式計算：根據卡片總數調整欄數，避免過度擁擠
const gridStyle = computed(() => {
  const totalCards = gameConfig.value.match_card_count * 2;
  let cols = 4; // 預設 4 欄
  
  if (typeof window !== 'undefined' && window.innerWidth < 600) {
     // 手機版：為了避免太擠，最多 3 欄或 2 欄
     cols = totalCards <= 12 ? 2 : 3; 
  } else {
     // 電腦版
     if (totalCards <= 12) cols = 3;      
     else if (totalCards <= 16) cols = 4; 
     else if (totalCards <= 20) cols = 5; 
     else cols = 6; 
  }
  
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`
  };
});

// 🌟 輔助函式：標準的 Fisher-Yates 洗牌演算法
const shuffleArray = (array) => {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
};

onMounted(async () => {
  currentStudent.value = studentCookie.value;

  const { version, volume, unit } = route.query;
  if (!version || !volume || !unit) {
    errorMsg.value = '⚠️ 參數錯誤，請返回首頁重新選擇！';
    return;
  }

  // 取得後台設定
  try {
    const { data: settingsData } = await supabase.from('system_settings').select('match_card_count, match_penalty_points').eq('id', 1).single();
    if (settingsData) {
      if (settingsData.match_card_count) gameConfig.value.match_card_count = settingsData.match_card_count;
      if (settingsData.match_penalty_points !== null) gameConfig.value.match_penalty_points = settingsData.match_penalty_points;
    }
  } catch(e) { console.error("讀取設定失敗", e); }

  try {
    if (currentStudent.value && !currentStudent.value.isAnon) {
      const { data: records } = await supabase.from('game_records')
        .select('attempt_number')
        .eq('student_id', currentStudent.value.id)
        .eq('version', version).eq('volume', volume).eq('unit_played', unit)
        .or('game_type.eq.單字方塊消消樂,game_type.is.null')
        .order('attempt_number', { ascending: false }).limit(1);
      
      if (records && records.length > 0) attemptNumber.value = records[0].attempt_number + 1;
    }

    const { data, error } = await supabase.from('vocabularies')
      .select('*')
      .eq('version', version).eq('volume', volume).eq('unit', unit);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allVocabs.value = shuffleArray([...data]); 
      startRound();
    } else {
      errorMsg.value = '⚠️ 找不到該單元的單字！';
    }
  } catch (err) {
    console.error(err);
    errorMsg.value = '連線錯誤！';
  }
});

const startRound = () => {
  allVocabs.value = shuffleArray([...allVocabs.value]);
  
  const numPairs = Math.min(gameConfig.value.match_card_count, allVocabs.value.length);
  const selectedVocabs = allVocabs.value.slice(0, numPairs);
  let initialCards = [];
  
  selectedVocabs.forEach(vocab => {
    wordStats.value[vocab.en_us] = { totalTime: 0, count: 0, startTime: null };

    // 直接攤開，沒有 isFlipped
    initialCards.push({ id: vocab.id + '-en', text: vocab.en_us, pairId: vocab.id, type: 'en', isSelected: false, isMatched: false, vocab: vocab });
    initialCards.push({ id: vocab.id + '-zh', text: vocab.zh_tw, pairId: vocab.id, type: 'zh', isSelected: false, isMatched: false, vocab: vocab });
  });

  cards.value = shuffleArray(initialCards);

  score.value = 100;
  matchedPairs.value = 0;
  timeSpent.value = 0;
  isGameFinished.value = false;
  firstSelection.value = null;

  clearInterval(timer);
  timer = setInterval(() => { timeSpent.value++; }, 1000);
};

const flipCard = (index) => {
  const card = cards.value[index];
  if (card.isSelected || card.isMatched || isGameFinished.value) return;

  card.isSelected = true; 

  if (card.type === 'en' && wordStats.value[card.text]) {
      if (!wordStats.value[card.text].startTime) {
          wordStats.value[card.text].startTime = Date.now();
      }
  }

  if (!firstSelection.value) {
    firstSelection.value = { index, card };
  } else {
    const isMatch = firstSelection.value.card.pairId === card.pairId;
    let enWord = card.type === 'en' ? card.text : firstSelection.value.card.text;

    if (isMatch) {
      cards.value[firstSelection.value.index].isMatched = true;
      card.isMatched = true;
      matchedPairs.value++;
      
      correctWords.value.add(enWord);

      if (wordStats.value[enWord] && wordStats.value[enWord].startTime) {
          const timeDiff = (Date.now() - wordStats.value[enWord].startTime) / 1000;
          wordStats.value[enWord].totalTime += timeDiff;
          wordStats.value[enWord].count += 1;
          wordStats.value[enWord].startTime = null; 
      }

      if (matchedPairs.value === gameConfig.value.match_card_count || matchedPairs.value === allVocabs.value.length) {
        finishGame();
      }
    } else {
      score.value -= gameConfig.value.match_penalty_points;
      wrongWords.value.add(enWord);
      
      const firstIdx = firstSelection.value.index;
      setTimeout(() => {
        cards.value[firstIdx].isSelected = false;
        cards.value[index].isSelected = false;
      }, 400); // 縮短為 0.4 秒，加速節奏
    }
    firstSelection.value = null;
  }
};

const finishGame = async () => {
  clearInterval(timer);
  isGameFinished.value = true;
  
  if (score.value < 0) score.value = 0;
  
  if (score.value === 100) {
      const targetBgm = route.query.version === '南一' ? '/audio/nani-bgm.mp3' : '/audio/hanlin-bgm.mp3';
      setBgmSource(targetBgm);
      toggleBgm();
  }

  if (currentStudent.value && !currentStudent.value.isAnon) {
      const intervalsObj = {};
      for (const word in wordStats.value) {
          const stat = wordStats.value[word];
          if (stat.count > 0) {
              intervalsObj[word] = parseFloat((stat.totalTime / stat.count).toFixed(2));
          }
      }

      await supabase.from('game_records').insert([{
          student_id: currentStudent.value.id,
          version: route.query.version,
          volume: route.query.volume,
          unit_played: route.query.unit,
          score: score.value,
          time_spent: timeSpent.value,
          time_taken_seconds: timeSpent.value, 
          attempt_number: attemptNumber.value,
          correct_words: Array.from(correctWords.value).join(','),
          wrong_words: Array.from(wrongWords.value).join(','),
          word_intervals: JSON.stringify(intervalsObj),
          game_type: '單字方塊消消樂' 
      }]);
  }
};

onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="game-container">
    <div class="header-bar retro-element">
      <div class="stats">
        <span class="stat-item score">💯 分數: {{ score }}</span>
        <span class="stat-item time">⏳ 耗時: {{ timeSpent }}s</span>
        <span class="stat-item progress">✅ 進度: {{ matchedPairs }}/{{ gameConfig.match_card_count }}</span>
      </div>
      <NuxtLink to="/" class="retro-btn back-btn">放棄挑戰</NuxtLink>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="!isGameFinished" class="card-grid" :style="gridStyle">
      <div 
        v-for="(card, index) in cards" 
        :key="card.id" 
        class="card retro-element" 
        :class="{ selected: card.isSelected, matched: card.isMatched, 'en-card': card.type === 'en', 'zh-card': card.type === 'zh' }"
        @click="flipCard(index)"
      >
         {{ card.text }}
      </div>
    </div>

    <div v-if="isGameFinished" class="result-box retro-element">
      <h2>🎉 挑戰完成！</h2>
      <p class="final-score">最終得分: <strong>{{ score }}</strong></p>
      <p class="final-time">總耗時: <strong>{{ timeSpent }}</strong> 秒</p>
      <NuxtLink to="/" class="retro-btn return-btn">🔙 返回首頁</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.game-container { padding: 15px; max-width: 1000px; margin: 0 auto; min-height: 100vh;}
.header-bar { display: flex; justify-content: space-between; align-items: center; background-color: var(--box-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px 20px; margin-bottom: 20px; box-shadow: var(--shadow-box); flex-wrap: wrap; gap: 10px;}
.stats { display: flex; gap: 20px; font-size: 1.2rem; font-weight: 900; }
.score { color: var(--danger-color); }
.time { color: var(--primary-color); }
.progress { color: var(--success-color); }
.back-btn { font-size: 1rem; padding: 8px 15px; background-color: var(--btn-danger-bg); color: var(--text-main); }

/* 🌟 修正後的網格佈局 */
.card-grid {
  display: grid;
  gap: 12px;
  /* 根據卡片數量動態決定行高，避免全部擠在一起 */
  grid-auto-rows: minmax(80px, auto); 
}

/* 🌟 修正後的方塊卡片樣式 (兼容復古主題) */
.card {
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 10px 15px; /* 增加左右 padding 讓字不會貼邊 */
  word-break: break-word; /* 允許長單字換行 */
  font-weight: 900;
  line-height: 1.3;
  
  /* 繼承自復古主題的基底設定 */
  background-color: var(--box-bg);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-element);
  box-shadow: var(--shadow-btn); /* 讓按鈕立體 */
  
  transition: transform 0.1s, box-shadow 0.1s, border-color 0.2s, background-color 0.2s, opacity 0.3s;
  user-select: none;
}

/* 英文卡片字體與顏色 */
.card.en-card {
  font-family: monospace;
  color: var(--primary-color);
  font-size: 1.4rem;
}

/* 中文卡片字體與顏色 */
.card.zh-card {
  font-family: 'Noto Sans TC', sans-serif;
  color: var(--danger-color);
  font-size: 1.2rem;
}

/* 🖱️ 滑鼠懸停與點擊的物理回饋 */
.card:hover:not(.matched):not(.selected) {
  transform: translateY(-2px);
  filter: brightness(0.95);
}
.card:active:not(.matched):not(.selected) {
  transform: var(--transform-active);
  box-shadow: var(--shadow-btn-active);
}

/* ✨ 選取狀態 (等待配對中)：明顯高亮 */
.card.selected {
  background-color: var(--tab-active-bg);
  border-color: #ff9800; /* 亮橘色邊框提示 */
  color: var(--text-main); /* 確保字體在黃底上看清楚 */
  transform: var(--transform-active);
  box-shadow: inset 0 3px 5px rgba(0,0,0,0.1); /* 凹下去的感覺 */
}

/* ✅ 配對成功狀態：半透明、去色、不可點擊 */
.card.matched {
  background-color: var(--success-bg);
  border-color: var(--success-color);
  color: var(--success-color);
  opacity: 0.3; /* 明顯淡出 */
  pointer-events: none; /* 消除後不可再點擊 */
  box-shadow: none;
  transform: translateY(4px); /* 永久凹陷 */
}

.result-box {
  text-align: center;
  padding: 40px 20px;
  background-color: var(--success-bg);
  border: var(--border-width) solid var(--success-color);
  border-radius: var(--radius-box);
  margin-top: 40px;
  box-shadow: var(--shadow-box);
}
.result-box h2 { font-size: 2.5rem; color: var(--success-color); margin-bottom: 20px; font-weight: 900;}
.final-score { font-size: 1.8rem; color: var(--danger-color); margin: 10px 0;}
.final-time { font-size: 1.5rem; color: var(--text-main); margin-bottom: 30px;}
.return-btn { font-size: 1.5rem; padding: 15px 40px; background-color: var(--primary-color); color: white;}

.error-msg { background: var(--danger-bg); border: 2px dashed var(--danger-color); color: var(--danger-color); padding: 15px; text-align: center; font-weight: 900; border-radius: var(--radius-element); margin-bottom: 20px;}

@media (max-width: 600px) {
  .header-bar { flex-direction: column; align-items: stretch; }
  .stats { justify-content: space-between; font-size: 1rem; }
  
  /* 手機版稍微縮小字體與方塊高度 */
  .card-grid { grid-auto-rows: minmax(70px, auto); gap: 10px;}
  .card { padding: 8px; }
  .card.en-card { font-size: 1.1rem; }
  .card.zh-card { font-size: 1rem; }
}
</style>