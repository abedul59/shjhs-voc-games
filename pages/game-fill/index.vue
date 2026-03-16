<script setup>
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import { useBgmUnlock } from '~/composables/useBgmUnlock';
import { useRoute } from 'vue-router';

const route = useRoute();
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const timeLimitSetting = ref(20);
const penaltySetting = ref(2);

const vocabularies = ref([]);
const currentQuestionIndex = ref(0);
const score = ref(0);
const mistakes = ref(0);
const isLoading = ref(true);
const isGameOver = ref(false);
const userInput = ref('');
const inputRef = ref(null);

const currentWordScore = ref(10); // 每題固定 10 分
const timeLeft = ref(20);
let timer = null;
const showWrongFeedback = ref(false);

const correctWords = ref(new Set());
const wrongWords = ref(new Set());
const wordReactionTimes = ref({});
const gameStartTime = ref(0);
const currentQuestionStartTime = ref(0);

const currentWord = computed(() => vocabularies.value[currentQuestionIndex.value]);

const keyboardRows = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const restartGame = () => { if (typeof window !== 'undefined') window.location.reload(); };

onMounted(async () => {
  if (!route.query.unit) { navigateTo('/'); return; }
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) { 
    timeLimitSetting.value = settings.fill_game_time_limit ?? 20; 
    penaltySetting.value = settings.fill_penalty ?? 2; 
  }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit);
  if (route.query.volume && route.query.volume !== 'undefined') query = query.eq('volume', route.query.volume);
  const { data } = await query;
  
  if (data && data.length > 0) { 
    // 🌟 自動補滿 10 題機制
    let pool = data.sort(() => Math.random() - 0.5);
    while (pool.length < 10) { 
      pool = pool.concat([...data].sort(() => Math.random() - 0.5)); 
    }
    vocabularies.value = pool.slice(0, 10);
    
    gameStartTime.value = Date.now(); 
    loadQuestion(); 
    isLoading.value = false; 
  } else { 
    alert('找不到單字！'); navigateTo('/'); 
  }
});

const playPronunciation = (word) => {
  if (!word) return;
  const cleanWord = word.toLowerCase().trim();
  const audio = new Audio(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${cleanWord}--_us_1.mp3`);
  audio.play().catch(() => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US'; utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  });
};

const loadQuestion = () => {
  userInput.value = ''; 
  currentWordScore.value = 10; 
  clearInterval(timer); 
  timeLeft.value = timeLimitSetting.value; 
  currentQuestionStartTime.value = Date.now();
  
  playPronunciation(currentWord.value?.en_us);
  
  nextTick(() => { if (inputRef.value) inputRef.value.focus(); });
  
  timer = setInterval(() => { 
    timeLeft.value--; 
    // 取消時間倒扣機制
    if (timeLeft.value <= 0) { 
      mistakes.value++; 
      wrongWords.value.add(currentWord.value.en_us); 
      showWrongFeedback.value = true; 
      setTimeout(() => { showWrongFeedback.value = false; }, 300); 
      nextQuestion(); 
    } 
  }, 1000);
};

const checkAnswer = () => {
  if (!userInput.value.trim()) return;
  const reactionTime = ((Date.now() - currentQuestionStartTime.value) / 1000).toFixed(1);
  
  if (userInput.value.trim().toLowerCase() === currentWord.value.en_us.toLowerCase()) {
    score.value += currentWordScore.value; 
    wordReactionTimes.value[currentWord.value.en_us] = reactionTime;
    if (!wrongWords.value.has(currentWord.value.en_us)) correctWords.value.add(currentWord.value.en_us);
    clearInterval(timer); 
    nextQuestion();
  } else {
    mistakes.value++; 
    // 答錯時扣除該題分數，不會倒扣總分
    currentWordScore.value = Math.max(0, currentWordScore.value - penaltySetting.value); 
    wrongWords.value.add(currentWord.value.en_us);
    
    showWrongFeedback.value = true; 
    setTimeout(() => { showWrongFeedback.value = false; }, 300);
    userInput.value = ''; 
    nextTick(() => { if (inputRef.value) inputRef.value.focus(); });
  }
};

const nextQuestion = () => { 
  if (currentQuestionIndex.value < vocabularies.value.length - 1) { 
    currentQuestionIndex.value++; 
    loadQuestion(); 
  } else { 
    endGame(); 
  } 
};

const typeKey = (key) => { userInput.value += key; nextTick(() => { if (inputRef.value) inputRef.value.focus(); }); };
const backspace = () => { userInput.value = userInput.value.slice(0, -1); nextTick(() => { if (inputRef.value) inputRef.value.focus(); }); };

const endGame = async () => {
  isGameOver.value = true; clearInterval(timer); confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);
  
  if (studentCookie.value && !studentCookie.value.isAnon) {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch (e) {}
    const { count } = await supabase.from('game_records').select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id).eq('unit_played', route.query.unit).eq('game_type', '單字填一填');
    
    // 🚨 使用 JSON.stringify 避免存檔錯誤，加上抓漏雷達
    const { error } = await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, 
      game_type: '單字填一填', 
      version: route.query.version, 
      volume: route.query.volume || '', 
      unit_played: route.query.unit, 
      score: score.value, 
      mistakes: mistakes.value, 
      correct_words: Array.from(correctWords.value).join(', '), 
      wrong_words: Array.from(wrongWords.value).join(', '), 
      word_intervals: JSON.stringify(wordReactionTimes.value), 
      time_taken_seconds: totalTimeTaken, 
      attempt_number: (count || 0) + 1, 
      ip_address: userIp, 
      device_info: navigator.userAgent 
    }]);

    if (error) {
      alert(`🚨 資料庫存檔失敗！\n錯誤訊息：${error.message}`);
      console.error(error);
      return;
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
      
      <div class="question-board retro-element">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
          <h2 class="zh-word" style="margin:0;">{{ currentWord?.zh_tw }}</h2>
          <button class="sound-btn retro-element" @click="playPronunciation(currentWord?.en_us)" title="聽發音">🔊</button>
        </div>
        <p class="hint-text">本題剩餘: {{ currentWordScore }} 分</p>
      </div>

      <div class="input-area"><input type="text" v-model="userInput" ref="inputRef" @keyup.enter="checkAnswer" class="retro-input typing-input" autocomplete="off" spellcheck="false" placeholder="輸入單字..." /></div>
      <div class="keyboard-area">
        <div class="kb-row" v-for="(row, rIndex) in keyboardRows" :key="rIndex"><button v-for="key in row" :key="key" class="kb-key" @click="typeKey(key.toLowerCase())">{{ key }}</button></div>
        <div class="kb-row action-row"><button class="kb-key kb-action" style="flex: 1;" @click="typeKey('-')">- (橫槓)</button><button class="kb-key kb-action" style="flex: 3;" @click="typeKey(' ')">␣ 空白鍵</button></div>
        <div class="kb-row action-row" style="margin-top:0;"><button class="kb-key kb-action kb-backspace" @click="backspace">⌫ 刪除</button><button class="kb-key kb-action kb-submit" @click="checkAnswer">送出 (Enter)</button></div>
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
.game-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; transition: 0.1s; box-sizing: border-box; } 
.wrong-flash { background-color: var(--danger-color) !important; }

.game-box { background: var(--box-bg); padding: 25px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); width: 100%; max-width: 800px; box-sizing: border-box; }

.progress-bar { background: var(--info-bg); padding: 10px; border-radius: 8px; font-size: 1.3rem; font-weight: 900; text-align: center; margin-bottom: 20px; border: 2px dashed var(--border-color); color: var(--text-main); box-shadow: var(--shadow-btn);}
.header-info { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; color: var(--text-main); font-size: 1.1rem;} .highlight { color: var(--danger-color); font-size: 1.3rem; }
.question-board { background: var(--info-bg); border-radius: var(--radius-element); padding: 30px 20px; text-align: center; margin-bottom: 20px; } .zh-word { font-size: 2.5rem; margin: 0; color: var(--text-main); font-weight: 900; } .hint-text { color: var(--text-muted); font-weight: bold; margin-top: 10px; }

/* 🔊 發音按鈕樣式 */
.sound-btn { background: var(--btn-secondary-bg); color: var(--text-main); font-size: 1.5rem; width: 45px; height: 45px; border-radius: 50%; border: var(--border-width) solid var(--border-color); display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: var(--shadow-btn); transition: transform 0.1s;}
.sound-btn:active { transform: translateY(3px); box-shadow: none;}

/* 輸入框樣式 */
.input-area { display: flex; margin-bottom: 20px; } 
.typing-input { flex: 1; padding: 15px; font-size: 1.8rem; text-align: center; background: var(--input-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); color: var(--text-main); font-weight: 900; letter-spacing: 2px; width: 100%; box-sizing: border-box;} 

/* ⌨️ 虛擬鍵盤樣式 */
.keyboard-area { display: flex; flex-direction: column; gap: 8px; background: var(--tab-bg); padding: 15px; border-radius: var(--radius-element); border: 2px solid var(--border-color); box-sizing: border-box; width: 100%;}
.kb-row { display: flex; justify-content: center; gap: 6px; width: 100%;}
.kb-key { background: var(--box-bg); border: 2px solid var(--border-color); border-radius: 6px; font-size: 1.2rem; font-weight: 900; color: var(--text-main); padding: 12px 0; min-width: 0; flex: 1; cursor: pointer; transition: all 0.1s; box-shadow: 0 4px 0 var(--border-color); text-align: center;}
.kb-key:active { transform: translateY(4px); box-shadow: 0 0 0 var(--border-color); background: var(--info-bg); }
.action-row { margin-top: 5px; gap: 10px; }
.kb-action { padding: 12px; font-size: 1.1rem; }
.kb-backspace { background: var(--danger-bg); color: var(--danger-color); flex: 1; }
.kb-submit { background: var(--btn-primary-bg); color: var(--btn-primary-text); flex: 2; }

.text-center { text-align: center; } .final-score { font-size: 4rem; font-weight: 900; margin: 20px 0; color: var(--danger-color); }
.action-buttons { display: flex; gap: 15px; flex-direction: column;} .retro-btn { flex: 1; padding: 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); cursor: pointer; text-decoration: none; text-align: center; border-radius: var(--radius-element);} .restart-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text);} .home-btn { background: var(--btn-secondary-bg); color: var(--text-main); }

@media (min-width: 768px) {
  .game-box { padding: 40px; }
  .zh-word { font-size: 3.5rem; }
  .typing-input { font-size: 2.5rem; padding: 20px; }
  .kb-key { font-size: 1.6rem; padding: 18px 0; }
  .kb-action { font-size: 1.4rem; padding: 18px 0; }
  .keyboard-area { padding: 25px; gap: 12px;}
  .kb-row { gap: 10px; }
  .sound-btn { width: 55px; height: 55px; font-size: 2rem;}
}

@media (max-width: 600px) { 
  .game-container { padding: 10px; }
  .game-box { padding: 15px; }
  .keyboard-area { padding: 10px; gap: 6px; }
  .kb-row { gap: 4px; }
  .kb-key { font-size: 1.1rem; padding: 10px 0; } 
  .kb-action { font-size: 1rem; padding: 10px 0; }
  .typing-input { font-size: 1.5rem; padding: 10px; } 
  .zh-word { font-size: 2rem; }
}
</style>