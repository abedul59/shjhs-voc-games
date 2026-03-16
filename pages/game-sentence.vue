<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import { useBgmUnlock } from '~/composables/useBgmUnlock';

const route = useRoute();
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const timeLimitSetting = ref(15);
const penaltySetting = ref(2);

const vocabularies = ref([]);
const currentQuestionIndex = ref(0);
const score = ref(100); 
const mistakes = ref(0);
const isLoading = ref(true);
const isGameOver = ref(false);
const options = ref([]);

const timeLeft = ref(15);
let timer = null;
const showWrongFeedback = ref(false);

// 🌟 新增：用來控制答對後的定格與句子顯示
const showFullSentence = ref(false);
const isTransitioning = ref(false);

const correctWords = ref(new Set());
const wrongWords = ref(new Set());
const wordReactionTimes = ref({});
const gameStartTime = ref(0);
const currentQuestionStartTime = ref(0);

const currentWord = computed(() => vocabularies.value[currentQuestionIndex.value]);

const maskedSentence = computed(() => {
  if (!currentWord.value || !currentWord.value.example_en) return '';
  return currentWord.value.example_en.replace(new RegExp(`\\b${currentWord.value.en_us}[a-zA-Z]*\\b`, 'gi'), '_________');
});

const restartGame = () => { if (typeof window !== 'undefined') window.location.reload(); };

onMounted(async () => {
  if (!route.query.unit) { navigateTo('/'); return; }
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) { timeLimitSetting.value = settings.sentence_game_time_limit ?? 15; penaltySetting.value = settings.sentence_penalty ?? 2; }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit).limit(10);
  if (route.query.volume && route.query.volume !== 'undefined') query = query.eq('volume', route.query.volume);
  
  const { data } = await query;
  if (data && data.length >= 4) { 
    vocabularies.value = data.sort(() => Math.random() - 0.5); 
    gameStartTime.value = Date.now(); 
    generateOptions(); 
    startTimer(); 
    isLoading.value = false; 
  } else { alert('單字庫不足 4 個，無法進行選擇題！'); navigateTo('/'); }
});

// ==========================================
// 🔊 雙重發音系統 (單字真人 + 整句AI)
// ==========================================
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

const playFullSentence = (sentence) => {
  if (!sentence) return;
  if (window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  }
};
// ==========================================

const startTimer = () => {
  showFullSentence.value = false; // 隱藏完整句子
  isTransitioning.value = false;  // 解除按鈕鎖定

  clearInterval(timer); timeLeft.value = timeLimitSetting.value; currentQuestionStartTime.value = Date.now();
  timer = setInterval(() => { 
    timeLeft.value--; 
    if (timeLeft.value <= 0) { 
      mistakes.value++; score.value = Math.max(0, score.value - penaltySetting.value); 
      wrongWords.value.add(currentWord.value.en_us); 
      showWrongFeedback.value = true; setTimeout(() => { showWrongFeedback.value = false; }, 300); 
      nextQuestion(); 
    } 
  }, 1000);
};

const generateOptions = () => {
  let pool = vocabularies.value.filter(w => w.id !== currentWord.value.id).sort(() => Math.random() - 0.5).slice(0, 3);
  options.value = [...pool, currentWord.value].sort(() => Math.random() - 0.5);
};

const checkAnswer = (selectedWord) => {
  // 🌟 如果正在換題定格中，不允許重複點擊
  if (isTransitioning.value) return; 

  const reactionTime = ((Date.now() - currentQuestionStartTime.value) / 1000).toFixed(1);
  
  if (selectedWord.en_us === currentWord.value.en_us) { 
    
    isTransitioning.value = true; // 鎖定按鈕
    showFullSentence.value = true; // 顯示完整句子
    clearInterval(timer); // 停止倒數

    // 🌟 答對時，自動唸出整句英文！
    playFullSentence(currentWord.value.example_en);
    
    wordReactionTimes.value[currentWord.value.en_us] = reactionTime;
    if (!wrongWords.value.has(currentWord.value.en_us)) correctWords.value.add(currentWord.value.en_us);
    
    // 🌟 延遲 8 秒跳轉下一題，讓學生能聽完句子並看到完整拼法
    setTimeout(() => {
      nextQuestion();
    }, 8000);
    
  } else { 
    mistakes.value++; score.value = Math.max(0, score.value - penaltySetting.value); wrongWords.value.add(currentWord.value.en_us);
    showWrongFeedback.value = true; setTimeout(() => { showWrongFeedback.value = false; }, 300); 
  }
};

const nextQuestion = () => { if (currentQuestionIndex.value < vocabularies.value.length - 1) { currentQuestionIndex.value++; generateOptions(); startTimer(); } else { endGame(); } };

const endGame = async () => {
  isGameOver.value = true; clearInterval(timer); confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);

  if (studentCookie.value && !studentCookie.value.isAnon) {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch (e) {}
    const { count } = await supabase.from('game_records').select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id).eq('unit_played', route.query.unit).eq('game_type', '單字例句神絕配');
    await supabase.from('game_records').insert([{ student_id: studentCookie.value.id, game_type: '單字例句神絕配', version: route.query.version, volume: route.query.volume || '', unit_played: route.query.unit, score: score.value, mistakes: mistakes.value, correct_words: Array.from(correctWords.value).join(', '), wrong_words: Array.from(wrongWords.value).join(', '), word_intervals: wordReactionTimes.value, time_taken_seconds: totalTimeTaken, attempt_number: (count || 0) + 1, ip_address: userIp, device_info: navigator.userAgent }]);
    const { checkAndUnlockBgm } = useBgmUnlock(); const unlockedThemeName = await checkAndUnlockBgm(); 
    if (unlockedThemeName) alert(unlockedThemeName === "已全解鎖" ? "🏆 您已解鎖所有風格！" : `🎉 解鎖專屬風格：【${unlockedThemeName}】`); 

    // 🌟 新增：塔羅牌動畫解鎖邏輯
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
          }, 1500); // 延遲1.5秒讓學生先看到結算分數
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
      
      <div class="sentence-board retro-element">
        <p class="zh-sentence">{{ currentWord?.example_zh }}</p>
        
        <h2 class="en-sentence" v-if="!showFullSentence">{{ maskedSentence }}</h2>
        <h2 class="en-sentence correct-text" v-else>{{ currentWord?.example_en }}</h2>
      </div>
      
      <div class="options-grid">
        <button v-for="(opt, index) in options" :key="index" class="retro-btn option-btn" 
                :class="{ 'correct': showFullSentence && opt.en_us === currentWord?.en_us }"
                @click="checkAnswer(opt)" :disabled="isTransitioning">
          <span>{{ opt.en_us }}</span>
          <span class="mini-sound-btn" @click.stop="playPronunciation(opt.en_us)" title="單字發音">🔊</span>
        </button>
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

/* 🌟 放寬至 1000px (例句需要大空間) */
.game-box { background: var(--box-bg); padding: 25px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); width: 100%; max-width: 1000px; box-sizing: border-box; }

.progress-bar { background: var(--info-bg); padding: 10px; border-radius: 8px; font-size: 1.3rem; font-weight: 900; text-align: center; margin-bottom: 20px; border: 2px dashed var(--border-color); color: var(--text-main); box-shadow: var(--shadow-btn);}
.header-info { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; color: var(--text-main); font-size: 1.1rem;} .highlight { color: var(--danger-color); font-size: 1.3rem; }

.sentence-board { background: var(--info-bg); padding: 30px 20px; border-radius: var(--radius-element); text-align: center; margin-bottom: 25px; border: 2px dashed var(--border-color);} 
.zh-sentence { color: var(--text-muted); font-size: 1.2rem; margin-bottom: 15px; font-weight: bold;} 
.en-sentence { color: var(--text-main); font-size: 1.8rem; font-weight: 900; line-height: 1.5; margin: 0; word-break: break-word;} 
.correct-text { color: var(--success-color); animation: popIn 0.3s ease-out; } /* 填入答案時的特效 */

@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

.option-btn { display: flex; justify-content: space-between; align-items: center; background: var(--tab-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px 20px; font-size: 1.3rem; font-weight: 900; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-btn); font-family: inherit;}
.option-btn:hover:not(:disabled) { background: var(--tab-active-bg); color: var(--tab-active-text); transform: translateY(-2px);}
.option-btn:active:not(:disabled) { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.option-btn:disabled { cursor: not-allowed; opacity: 0.8; }

.option-btn.correct { background: var(--success-bg) !important; border-color: var(--success-color) !important; color: var(--success-color) !important; box-shadow: none; transform: translateY(2px); }

/* 🔊 小喇叭按鈕 */
.mini-sound-btn { background: var(--btn-secondary-bg); color: var(--text-main); padding: 5px 10px; border-radius: 8px; border: 2px solid var(--border-color); font-size: 1rem; transition: transform 0.1s;}
.mini-sound-btn:active { transform: translateY(2px); background: var(--box-bg); }

.text-center { text-align: center; } .final-score { font-size: 4rem; font-weight: 900; margin: 20px 0; color: var(--danger-color); }
.action-buttons { display: flex; flex-direction: column; gap: 15px; } .retro-btn { width: 100%; padding: 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); cursor: pointer; text-decoration: none; text-align: center; font-size: 1.1rem; border-radius: var(--radius-element); box-sizing: border-box;} .restart-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text);} .home-btn { background: var(--btn-secondary-bg); color: var(--text-main); }

@media (min-width: 768px) {
  .game-box { padding: 40px; }
  .sentence-display { font-size: 2.2rem; line-height: 1.8; }
  .en-sentence { font-size: 2.2rem; }
  .option-btn { font-size: 1.6rem; padding: 25px; }
  .mini-sound-btn { font-size: 1.4rem; padding: 5px 15px; }
  .options-grid { gap: 20px; }
}

@media (max-width: 600px) { 
  .options-grid { grid-template-columns: 1fr; } 
  .en-sentence { font-size: 1.4rem; }
}
</style>