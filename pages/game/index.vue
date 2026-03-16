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

// 動態網格樣式計算
const gridStyle = computed(() => {
  const totalCards = gameConfig.value.match_card_count * 2;
  let cols = 4;
  if (totalCards === 12) cols = 3;      // 6 對 (12 張) -> 3x4
  else if (totalCards === 16) cols = 4; // 8 對 (16 張) -> 4x4
  else if (totalCards === 20) cols = 4; // 10 對 (20 張) -> 4x5
  else if (totalCards === 24) cols = 4; // 12 對 (24 張) -> 4x6
  
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`
  };
});

// 🌟 輔助函式：標準的 Fisher-Yates 洗牌演算法 (真正的隨機打亂)
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
    // 查詢目前挑戰次數
    if (currentStudent.value && !currentStudent.value.isAnon) {
      const { data: records } = await supabase.from('game_records')
        .select('attempt_number')
        .eq('student_id', currentStudent.value.id)
        .eq('version', version).eq('volume', volume).eq('unit_played', unit)
        .or('game_type.eq.單字方塊消消樂,game_type.is.null')
        .order('attempt_number', { ascending: false }).limit(1);
      
      if (records && records.length > 0) attemptNumber.value = records[0].attempt_number + 1;
    }

    // 取得單字資料
    const { data, error } = await supabase.from('vocabularies')
      .select('*')
      .eq('version', version).eq('volume', volume).eq('unit', unit);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // 🌟 關鍵修正：使用 Fisher-Yates 演算法進行真正的隨機打亂
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
  // 🌟 再次打亂，確保如果有「再來一局」的功能，每次取的字都不一樣
  allVocabs.value = shuffleArray([...allVocabs.value]);
  
  const numPairs = Math.min(gameConfig.value.match_card_count, allVocabs.value.length);
  const selectedVocabs = allVocabs.value.slice(0, numPairs);
  let initialCards = [];
  
  selectedVocabs.forEach(vocab => {
    wordStats.value[vocab.en_us] = { totalTime: 0, count: 0, startTime: null };

    initialCards.push({ id: vocab.id + '-en', text: vocab.en_us, pairId: vocab.id, type: 'en', isFlipped: false, isMatched: false, vocab: vocab });
    initialCards.push({ id: vocab.id + '-zh', text: vocab.zh_tw, pairId: vocab.id, type: 'zh', isFlipped: false, isMatched: false, vocab: vocab });
  });

  // 🌟 卡片也要用標準演算法打亂
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
  if (card.isFlipped || card.isMatched || isGameFinished.value) return;

  card.isFlipped = true;

  if (card.type === 'en') {
      wordStats.value[card.text].startTime = Date.now();
  }

  if (!firstSelection.value) {
    firstSelection.value = { index, card };
  } else {
    const isMatch = firstSelection.value.card.pairId === card.pairId;
    
    // 找出這個 pair 的英文單字是什麼
    let enWord = card.type === 'en' ? card.text : firstSelection.value.card.text;

    if (isMatch) {
      cards.value[firstSelection.value.index].isMatched = true;
      card.isMatched = true;
      matchedPairs.value++;
      
      correctWords.value.add(enWord);

      // 計算答題耗時
      if (wordStats.value[enWord] && wordStats.value[enWord].startTime) {
          const timeDiff = (Date.now() - wordStats.value[enWord].startTime) / 1000;
          wordStats.value[enWord].totalTime += timeDiff;
          wordStats.value[enWord].count += 1;
          wordStats.value[enWord].startTime = null; // 重置
      }

      if (matchedPairs.value === gameConfig.value.match_card_count || matchedPairs.value === allVocabs.value.length) {
        finishGame();
      }
    } else {
      score.value -= gameConfig.value.match_penalty_points;
      
      wrongWords.value.add(enWord);
      
      const firstIdx = firstSelection.value.index;
      setTimeout(() => {
        cards.value[firstIdx].isFlipped = false;
        cards.value[index].isFlipped = false;
      }, 1000);
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
        :class="{ flipped: card.isFlipped, matched: card.isMatched }"
        @click="flipCard(index)"
      >
        <div class="card-inner">
          <div class="card-front">❓</div>
          <div class="card-back" :class="card.type">{{ card.text }}</div>
        </div>
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
.game-container { padding: 15px; max-width: 800px; margin: 0 auto; min-height: 100vh;}
.header-bar { display: flex; justify-content: space-between; align-items: center; background-color: var(--box-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px 20px; margin-bottom: 20px; box-shadow: var(--shadow-box); flex-wrap: wrap; gap: 10px;}
.stats { display: flex; gap: 20px; font-size: 1.2rem; font-weight: 900; }
.score { color: var(--danger-color); }
.time { color: var(--primary-color); }
.progress { color: var(--success-color); }
.back-btn { font-size: 1rem; padding: 8px 15px; background-color: var(--btn-danger-bg); color: var(--text-main); }

.card-grid {
  display: grid;
  gap: 15px;
  perspective: 1000px;
}

.card {
  width: 100%;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  position: relative;
  background-color: transparent;
  border: none;
  box-shadow: none;
  border-radius: var(--radius-element);
}

.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

.card.flipped .card-inner, .card.matched .card-inner { transform: rotateY(180deg); }

.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  font-weight: 900;
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-element);
  box-sizing: border-box;
  text-align: center;
  padding: 10px;
  word-break: break-word;
}

.card-front {
  background-color: var(--primary-color);
  color: white;
  font-size: 3rem;
  box-shadow: inset -4px -4px 0px rgba(0,0,0,0.2);
}

.card-back {
  background-color: #fff;
  color: var(--text-main);
  transform: rotateY(180deg);
  box-shadow: var(--shadow-btn);
}
.card-back.en { font-family: monospace; color: var(--primary-color); font-size: 1.8rem; }
.card-back.zh { font-family: 'Noto Sans TC', sans-serif; color: var(--danger-color); font-size: 1.5rem;}

.card.matched .card-back {
  background-color: var(--success-bg);
  border-color: var(--success-color);
  color: var(--success-color);
  opacity: 0.8;
  box-shadow: none;
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
  .card-front { font-size: 2rem; }
  .card-back.en { font-size: 1.2rem; }
  .card-back.zh { font-size: 1.1rem; }
}
</style>