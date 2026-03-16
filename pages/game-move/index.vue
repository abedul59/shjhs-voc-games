<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useBgmUnlock } from '~/composables/useBgmUnlock';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');
const route = useRoute();

const vocabularies = ref([]);
const currentQuestionIndex = ref(0);
const currentWord = computed(() => vocabularies.value[currentQuestionIndex.value]);

const score = ref(0);
const timeLeft = ref(20);
const isLoading = ref(true);
const isGameOver = ref(false);
let timer = null;

const slots = ref([]);
const scrambledLettersPool = ref([]);
const draggedLetter = ref(null);

const timeLimitSetting = ref(20);
const penaltySetting = ref(2);

// 統計資料
const mistakes = ref(0);
const correctWords = ref(new Set());
const wrongWords = ref(new Set());
const wordReactionTimes = ref({});
let gameStartTime = 0;
let questionStartTime = 0;
const showWrongFeedback = ref(false);

onMounted(async () => {
  if (!studentCookie.value || !route.query.unit) { alert('請先登入！'); navigateTo('/'); return; }
  
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) {
    timeLimitSetting.value = settings.move_game_time_limit ?? 20;
    penaltySetting.value = settings.move_penalty ?? 2;
  }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit);
  if (route.query.volume && route.query.volume !== 'undefined') query = query.eq('volume', route.query.volume);
  const { data } = await query;

  if (data && data.length > 0) {
    let pool = data.sort(() => Math.random() - 0.5);
    while (pool.length < 10) { pool = pool.concat([...data].sort(() => Math.random() - 0.5)); }
    vocabularies.value = pool.slice(0, 10);
    gameStartTime = Date.now();
    loadQuestion();
    isLoading.value = false;
  } else { alert('找不到單字！'); navigateTo('/'); }
});

const playPronunciation = (word) => {
  if (!word) return;
  const cleanWord = word.toLowerCase().trim();
  const audio = new Audio(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${cleanWord}--_us_1.mp3`);
  audio.play().catch(() => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  });
};

const loadQuestion = () => {
  clearInterval(timer);
  timeLeft.value = timeLimitSetting.value;
  questionStartTime = Date.now();

  const wordStr = currentWord.value.en_us;
  const chars = wordStr.split('');
  
  const hintIndex = Math.floor(Math.random() * chars.length);
  
  slots.value = chars.map((char, index) => ({
    index,
    correctChar: char,
    isHint: index === hintIndex,
    filledWith: index === hintIndex ? { id: `hint_${index}`, char } : null
  }));

  const poolChars = chars.filter((_, index) => index !== hintIndex);
  scrambledLettersPool.value = poolChars.sort(() => Math.random() - 0.5).map((char, i) => ({ id: `pool_${i}`, char }));

  playPronunciation(wordStr);

  timer = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) { handleMistake(); loadNextQuestion(); }
  }, 1000);
};

const handleMistake = () => {
  mistakes.value++;
  score.value = Math.max(0, score.value - penaltySetting.value);
  wrongWords.value.add(currentWord.value.en_us);
  
  showWrongFeedback.value = true;
  setTimeout(() => showWrongFeedback.value = false, 300);
  
  slots.value.forEach(slot => {
    if (!slot.isHint && slot.filledWith) {
      if (slot.filledWith.char !== slot.correctChar) {
        scrambledLettersPool.value.push(slot.filledWith);
        slot.filledWith = null;
      }
    }
  });
};

const checkWin = () => {
  const isWin = slots.value.every(slot => slot.filledWith && slot.filledWith.char === slot.correctChar);
  if (isWin) {
    score.value += 10;
    const timeTaken = ((Date.now() - questionStartTime) / 1000).toFixed(1);
    wordReactionTimes.value[currentWord.value.en_us] = timeTaken;
    if (!wrongWords.value.has(currentWord.value.en_us)) correctWords.value.add(currentWord.value.en_us);
    loadNextQuestion();
  } else if (slots.value.every(slot => slot.filledWith)) {
    handleMistake();
  }
};

const loadNextQuestion = () => {
  currentQuestionIndex.value++;
  if (currentQuestionIndex.value >= vocabularies.value.length) endGame();
  else loadQuestion();
};

const onDragStart = (event, letter) => { draggedLetter.value = letter; };
const onDrop = (event, targetSlot) => {
  if (targetSlot.isHint || targetSlot.filledWith || !draggedLetter.value) return;
  targetSlot.filledWith = draggedLetter.value;
  scrambledLettersPool.value = scrambledLettersPool.value.filter(l => l.id !== draggedLetter.value.id);
  draggedLetter.value = null;
  checkWin();
};

const selectLetter = (letter) => {
  const emptySlot = slots.value.find(s => !s.filledWith);
  if (emptySlot) {
    emptySlot.filledWith = letter;
    scrambledLettersPool.value = scrambledLettersPool.value.filter(l => l.id !== letter.id);
    checkWin();
  }
};

const unselectLetter = (slot) => {
  if (slot.isHint || !slot.filledWith) return;
  scrambledLettersPool.value.push(slot.filledWith);
  slot.filledWith = null;
};

const restartGame = () => { currentQuestionIndex.value = 0; score.value = 0; mistakes.value = 0; correctWords.value.clear(); wrongWords.value.clear(); wordReactionTimes.value = {}; gameStartTime = Date.now(); isGameOver.value = false; vocabularies.value = vocabularies.value.sort(() => Math.random() - 0.5); loadQuestion(); };

const endGame = async () => {
  clearInterval(timer); isGameOver.value = true;
  const totalTimeTaken = Math.floor((Date.now() - gameStartTime) / 1000);
  
  if (!studentCookie.value.isAnon) {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch (e) {}
    const { count } = await supabase.from('game_records').select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id).eq('unit_played', route.query.unit).eq('game_type', '單字神移動');
    
    // 🚨 【抓漏雷達啟動】: 嚴格捕捉存檔錯誤並強制顯示
    const { data, error } = await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, 
      game_type: '單字神移動', 
      version: route.query.version, 
      volume: route.query.volume || '', 
      unit_played: route.query.unit, 
      score: score.value, 
      mistakes: mistakes.value, 
      correct_words: Array.from(correctWords.value).join(', '), 
      wrong_words: Array.from(wrongWords.value).join(', '), 
      word_intervals: JSON.stringify(wordReactionTimes.value), // 強制轉字串，避免格式不合
      time_taken_seconds: totalTimeTaken, 
      attempt_number: (count || 0) + 1, 
      ip_address: userIp, 
      device_info: navigator.userAgent 
    }]);

    if (error) {
      alert(`🚨 糟糕！資料庫拒絕存檔！\n錯誤訊息：${error.message}\n請將此畫面截圖給開發者！`);
      console.error("Supabase 寫入失敗:", error);
      return; // 終止，不跑後續解鎖
    }

    const { checkAndUnlockBgm } = useBgmUnlock(); const unlockedThemeName = await checkAndUnlockBgm(); 
    if (unlockedThemeName) alert(unlockedThemeName === "已全解鎖" ? "🏆 您已解鎖所有風格！" : `🎉 解鎖專屬風格：【${unlockedThemeName}】`);

    try {
      const { count: totalPlays } = await supabase.from('game_records')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentCookie.value.id)
        .eq('version', route.query.version)
        .eq('volume', route.query.volume || '')
        .eq('unit_played', route.query.unit);

      if (totalPlays > 0 && totalPlays % 10 === 0) {
        const unlockedIndex = Math.floor(totalPlays / 10) - 1;
        let wordQuery = supabase.from('vocabularies').select('en_us').eq('version', route.query.version).eq('unit', route.query.unit).order('id', { ascending: true });
        if (route.query.volume && route.query.volume !== 'undefined') wordQuery = wordQuery.eq('volume', route.query.volume);
        
        const { data: words } = await wordQuery;
        if (words && words[unlockedIndex]) {
          const targetWord = words[unlockedIndex].en_us.replace(/[?()!]/g, '').trim();
          setTimeout(() => {
            alert(`🎊 命運的齒輪開始轉動！您已在該單元完成 ${totalPlays} 次練習，獲得一張神祕塔羅牌！`);
            navigateTo(`/tarot?reveal_word=${targetWord}&set=1`);
          }, 1500); 
        }
      }
    } catch (err) { console.error("塔羅牌解鎖錯誤:", err); }
  }
};
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="game-container" :class="{ 'wrong-flash': showWrongFeedback }">
    <div class="game-box retro-element" v-if="!isLoading && !isGameOver">
      <div class="progress-bar retro-element">🎯 挑戰進度: 第 {{ currentQuestionIndex + 1 }} / {{ vocabularies.length }} 題</div>
      <div class="header-info"><div class="score-box">💯 分數: <span class="highlight">{{ score }}</span></div><div class="time-box">⏳ {{ timeLeft }}s</div></div>
      
      <div class="hint-box retro-element">
        <span class="hint-label">中文提示</span>
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 15px;">
          <h2 class="zh-word" style="margin:0;">{{ currentWord?.zh_tw }}</h2>
          <button class="sound-btn retro-element" @click="playPronunciation(currentWord?.en_us)" title="聽發音">🔊</button>
        </div>
      </div>
      
      <div class="slots-container">
        <div class="slot" v-for="slot in slots" :key="slot.index" :class="{'hint-slot': slot.isHint}" @dragover.prevent @drop="onDrop($event, slot)" @click="unselectLetter(slot)">
          <span v-if="slot.filledWith">{{ slot.filledWith.char }}</span>
        </div>
      </div>

      <div class="letters-pool">
        <button v-for="letter in scrambledLettersPool" :key="letter.id" class="letter-btn retro-element" draggable="true" @dragstart="onDragStart($event, letter)" @click="selectLetter(letter)">{{ letter.char }}</button>
      </div>
    </div>

    <div class="game-box retro-element text-center" v-if="isGameOver">
      <h1>🎉 挑戰結束！</h1>
      <div class="final-score">{{ score }} 分</div>
      <div class="stats-overview" style="margin-bottom: 20px; text-align: left; background: var(--tab-bg); padding: 15px; border-radius: 8px;">
        <p style="margin: 5px 0;">⏱️ 總耗時：<strong>{{ Math.floor((Date.now() - gameStartTime) / 1000) }}</strong> 秒</p>
        <p style="margin: 5px 0;">❌ 點錯次數：<strong>{{ mistakes }}</strong> 次</p>
        <p v-if="wrongWords.size > 0" style="margin: 5px 0; color: var(--danger-color);">⚠️ 需加強單字：<strong>{{ Array.from(wrongWords).join(', ') }}</strong></p>
      </div>
      <div class="action-buttons">
        <button class="retro-btn restart-btn" @click="restartGame">🔄 再玩一次</button>
        <NuxtLink to="/" class="retro-btn home-btn">🏠 本次結束回首頁 (不登出)</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; transition: 0.1s; box-sizing: border-box;} 
.wrong-flash { background-color: var(--danger-color) !important; }

/* 🌟 電腦大螢幕加寬 */
.game-box { background: var(--box-bg); padding: 25px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); width: 100%; max-width: 800px; box-sizing: border-box; }

.progress-bar { background: var(--info-bg); padding: 10px; border-radius: 8px; font-size: 1.3rem; font-weight: 900; text-align: center; margin-bottom: 20px; border: 2px dashed var(--border-color); color: var(--text-main); box-shadow: var(--shadow-btn);}
.header-info { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; color: var(--text-main); font-size: 1.1rem;} .highlight { color: var(--danger-color); font-size: 1.3rem; }
.hint-box { background: var(--tab-bg); border: var(--box-border-width) solid var(--border-color); padding: 20px; text-align: center; margin-bottom: 30px; } 
.hint-label { background: var(--text-main); color: var(--box-bg); padding: 4px 10px; border-radius: 12px; font-weight: bold;} 
.zh-word { font-size: 2.5rem; color: var(--text-main); font-weight: 900; }

/* 🔊 發音按鈕樣式 */
.sound-btn { background: var(--btn-secondary-bg); color: var(--text-main); font-size: 1.5rem; width: 45px; height: 45px; border-radius: 50%; border: var(--border-width) solid var(--border-color); display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: var(--shadow-btn); transition: transform 0.1s;}
.sound-btn:active { transform: translateY(3px); box-shadow: none;}

.slots-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 40px; } 
.slot { width: 45px; height: 55px; border: 3px dashed var(--text-muted); border-radius: 8px; font-size: 2rem; font-weight: 900; display: flex; justify-content: center; align-items: center; background: var(--tab-bg); color: var(--text-main); cursor: pointer;}
.slot.hint-slot { background: var(--success-bg); border: 2px solid var(--success-color); color: var(--success-color); cursor: default; }
.letters-pool { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; min-height: 80px; } 
.letter-btn { width: 55px; height: 65px; background: var(--btn-secondary-bg); font-size: 2rem; font-weight: 900; border: var(--border-width) solid var(--border-color); cursor: grab; box-shadow: var(--shadow-btn); color: var(--text-main); transition: transform 0.1s;} 
.letter-btn:active { cursor: grabbing; transform: translateY(3px); box-shadow: none;}
.text-center { text-align: center; } .final-score { font-size: 4rem; font-weight: 900; margin: 20px 0; color: var(--danger-color); }

.action-buttons { display: flex; flex-direction: column; gap: 15px; } 
.retro-btn { width: 100%; padding: 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); cursor: pointer; text-decoration: none; text-align: center; font-size: 1.1rem; border-radius: var(--radius-element); box-sizing: border-box;} 
.restart-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); } 
.home-btn { background: var(--btn-secondary-bg); color: var(--text-main); }

/* 🌟 電腦大螢幕優化 (保留上一輪 RWD 修改) */
@media (min-width: 768px) {
  .game-box { padding: 40px; }
  .zh-word { font-size: 3.5rem; }
  .letter-btn { font-size: 2.5rem; width: 65px; height: 75px; }
  .slot { width: 55px; height: 65px; font-size: 2.5rem; }
  .sound-btn { width: 55px; height: 55px; font-size: 2rem;}
}
</style>



