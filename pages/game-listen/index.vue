<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import { useBgmUnlock } from '~/composables/useBgmUnlock';
import { useRoute } from 'vue-router';

const route = useRoute();
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const timeLimitSetting = ref(20);
const penaltySetting = ref(2);
const hintPenaltySetting = ref(2);

const vocabularies = ref([]);
const currentQuestionIndex = ref(0);
const questionsCompleted = ref(0);

// 🌟 計分機制大升級
const totalScore = ref(0); // 總分從 0 開始累加
const currentQuestionScore = ref(10); // 每題一開始給你滿分 10 分

const mistakes = ref(0);
const isLoading = ref(true);
const isGameOver = ref(false);
const options = ref([]);

const timeLeft = ref(20);
let timer = null;
const showWrongFeedback = ref(false);

const hintUsedForCurrentQuestion = ref(false);
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
  if (settings) { 
    timeLimitSetting.value = settings.listen_game_time_limit ?? 20; 
    penaltySetting.value = settings.listen_penalty ?? 2; 
    hintPenaltySetting.value = settings.listen_hint_penalty ?? 2; 
  }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit).limit(20);
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

const playFullSentence = (sentence) => {
  if (!sentence) return;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  }
};

const startTimer = () => {
  hintUsedForCurrentQuestion.value = false;
  isTransitioning.value = false;  
  
  // 🌟 每換一題，本題分數就恢復滿分 10 分
  currentQuestionScore.value = 10; 

  clearInterval(timer); timeLeft.value = timeLimitSetting.value; currentQuestionStartTime.value = Date.now();
  
  playFullSentence(currentWord.value?.example_en);

  timer = setInterval(() => { 
    timeLeft.value--; 
    if (timeLeft.value <= 0) { 
      mistakes.value++; 
      
      // 時間到，這題拿 0 分，並加入總分
      currentQuestionScore.value = 0; 
      totalScore.value += currentQuestionScore.value;

      wrongWords.value.add(currentWord.value.en_us); 
      showWrongFeedback.value = true; setTimeout(() => { showWrongFeedback.value = false; }, 300); 
      finishQuestion(); 
    } 
  }, 1000);
};

const generateOptions = () => {
  let pool = vocabularies.value.filter(w => w.id !== currentWord.value.id).sort(() => Math.random() - 0.5).slice(0, 3);
  options.value = [...pool, currentWord.value].sort(() => Math.random() - 0.5);
};

const useHint = () => {
  if (!hintUsedForCurrentQuestion.value && !isTransitioning.value) {
    hintUsedForCurrentQuestion.value = true;
    // 🌟 按提示扣「本題」的分數，最低扣到 0 分
    currentQuestionScore.value = Math.max(0, currentQuestionScore.value - hintPenaltySetting.value);
  }
};

const skipQuestion = () => {
  if (isTransitioning.value) return;
  window.speechSynthesis.cancel();
  
  // 跳過不扣分，也不加分，不列入 10 題計算
  if (currentQuestionIndex.value < vocabularies.value.length - 1) {
    currentQuestionIndex.value++;
    generateOptions();
    startTimer();
  } else {
    endGame(); 
  }
};

const checkAnswer = (selectedWord) => {
  if (isTransitioning.value) return; 

  const reactionTime = ((Date.now() - currentQuestionStartTime.value) / 1000).toFixed(1);
  
  if (selectedWord.en_us === currentWord.value.en_us) { 
    isTransitioning.value = true; 
    clearInterval(timer); 
    
    // 🌟 答對了！把這題剩下的分數，存進撲滿裡
    totalScore.value += currentQuestionScore.value;
    
    wordReactionTimes.value[currentWord.value.en_us] = reactionTime;
    if (!wrongWords.value.has(currentWord.value.en_us)) correctWords.value.add(currentWord.value.en_us);
    
    setTimeout(() => { finishQuestion(); }, 800);
    
  } else { 
    mistakes.value++; 
    // 🌟 答錯了！扣「本題」的分數
    currentQuestionScore.value = Math.max(0, currentQuestionScore.value - penaltySetting.value);
    
    wrongWords.value.add(currentWord.value.en_us);
    showWrongFeedback.value = true; setTimeout(() => { showWrongFeedback.value = false; }, 300); 
  }
};

const finishQuestion = () => {
  questionsCompleted.value++;
  if (questionsCompleted.value >= 10 || currentQuestionIndex.value >= vocabularies.value.length - 1) { 
    endGame(); 
  } else { 
    currentQuestionIndex.value++; 
    generateOptions(); 
    startTimer(); 
  } 
};

const endGame = async () => {
  isGameOver.value = true; clearInterval(timer); confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);

  if (studentCookie.value && !studentCookie.value.isAnon) {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch (e) {}
    const { count } = await supabase.from('game_records').select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id).eq('unit_played', route.query.unit).eq('game_type', '單字例句順風耳');
    await supabase.from('game_records').insert([{ student_id: studentCookie.value.id, game_type: '單字例句順風耳', version: route.query.version, volume: route.query.volume || '', unit_played: route.query.unit, score: totalScore.value, mistakes: mistakes.value, correct_words: Array.from(correctWords.value).join(', '), wrong_words: Array.from(wrongWords.value).join(', '), word_intervals: wordReactionTimes.value, time_taken_seconds: totalTimeTaken, attempt_number: (count || 0) + 1, ip_address: userIp, device_info: navigator.userAgent }]);
    
    const { checkAndUnlockBgm } = useBgmUnlock(); const unlockedThemeName = await checkAndUnlockBgm(); 
    if (unlockedThemeName) alert(unlockedThemeName === "已全解鎖" ? "🏆 您已解鎖所有風格！" : `🎉 解鎖專屬風格：【${unlockedThemeName}】`); 

    // 塔羅牌機制
    try {
      const { data: set } = await supabase.from('system_settings').select('tarot_unlock_count, tarot_unlock_score').eq('id', 1).single();
      const uCount = set?.tarot_unlock_count || 10;
      const uScore = set?.tarot_unlock_score || 0;

      const { count: totalPlays } = await supabase.from('game_records')
        .select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id)
        .eq('version', route.query.version).eq('volume', route.query.volume || '') 
        .eq('unit_played', route.query.unit).gte('score', uScore); 

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
    } catch (err) { console.error("塔羅牌解鎖錯誤:", err); }
  }
};
onUnmounted(() => { clearInterval(timer); window.speechSynthesis.cancel(); });
</script>

<template>
  <div class="game-container" :class="{ 'wrong-flash': showWrongFeedback }">
    <div class="game-box retro-element" v-if="!isLoading && !isGameOver">
      <div class="progress-bar retro-element">🎯 挑戰進度: 第 {{ questionsCompleted + 1 }} / 10 題</div>
      
      <div class="header-info">
        <div class="score-box">
          💯 累積總分: <span class="highlight">{{ totalScore }}</span>
          <span class="sub-score">(本題還剩: <strong>{{ currentQuestionScore }}</strong> 分)</span>
        </div>
        <div class="time-box">⏳ {{ timeLeft }}s</div>
      </div>
      
      <div class="sentence-board retro-element">
        <h2 class="en-sentence">{{ maskedSentence }}</h2>
        <p v-if="hintUsedForCurrentQuestion" class="zh-sentence">{{ currentWord?.example_zh }}</p>
      </div>

      <div class="actions-board">
        <button class="action-btn play-btn" @click="playFullSentence(currentWord?.example_en)">🔊 重新聽一次</button>
        <button class="action-btn hint-btn" @click="useHint" :disabled="hintUsedForCurrentQuestion">
          {{ hintUsedForCurrentQuestion ? '已顯示中文' : `👀 顯示例句中文 (扣 ${hintPenaltySetting} 分)` }}
        </button>
        <button class="action-btn skip-btn" @click="skipQuestion">⏭️ 聲音有問題，換下一題</button>
      </div>
      
      <div class="options-grid">
        <button v-for="(opt, index) in options" :key="index" class="option-btn" 
                :class="{ 'correct': isTransitioning && opt.en_us === currentWord?.en_us }"
                @click="checkAnswer(opt)" :disabled="isTransitioning">
          <span>{{ opt.en_us }}</span>
        </button>
      </div>

    </div>

    <div class="game-box retro-element text-center" v-if="isGameOver">
      <h1>🎉 挑戰結束！</h1>
      <div class="final-score">{{ totalScore }} 分</div>
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
.game-box { background: var(--box-bg); padding: 25px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); width: 100%; max-width: 1000px; box-sizing: border-box; }

.progress-bar { background: var(--info-bg); padding: 10px; border-radius: 8px; font-size: 1.3rem; font-weight: 900; text-align: center; margin-bottom: 20px; border: 2px dashed var(--border-color); color: var(--text-main); box-shadow: var(--shadow-btn);}
.header-info { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; color: var(--text-main); font-size: 1.1rem;} .highlight { color: var(--danger-color); font-size: 1.4rem; }
.sub-score { font-size: 0.9rem; color: #888; margin-left: 10px; font-weight: bold; }

.sentence-board { background: var(--info-bg); padding: 30px 20px; border-radius: var(--radius-element); text-align: center; margin-bottom: 20px; border: 2px dashed var(--border-color);} 
.en-sentence { color: var(--text-main); font-size: 1.8rem; font-weight: 900; line-height: 1.5; margin: 0; word-break: break-word;} 
.zh-sentence { color: #d4af37; font-size: 1.3rem; margin-top: 15px; font-weight: bold; background: #222; padding: 10px; border-radius: 8px;} 

.actions-board { display: flex; gap: 10px; justify-content: center; margin-bottom: 25px; flex-wrap: wrap; }
.action-btn { flex: 1; min-width: 200px; padding: 12px 15px; font-size: 1rem; border-radius: 10px; font-weight: bold; cursor: pointer; border: 2px solid var(--border-color); box-shadow: 0 4px 0 var(--border-color); transition: all 0.1s; font-family: inherit;}
.action-btn:active { transform: translateY(4px); box-shadow: none; }
.play-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
.hint-btn { background: #f39c12; color: #111; border-color: #e67e22; box-shadow: 0 4px 0 #e67e22;}
.hint-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; background: #bdc3c7; border-color: #95a5a6; color: #555;}
.skip-btn { background: var(--tab-bg); color: var(--text-main); }

.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.option-btn { display: flex; justify-content: center; align-items: center; background: var(--tab-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 20px; font-size: 1.5rem; font-weight: 900; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-btn); font-family: inherit;}
.option-btn:hover:not(:disabled) { background: var(--tab-active-bg); color: var(--tab-active-text); transform: translateY(-2px);}
.option-btn:active:not(:disabled) { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.option-btn.correct { background: var(--success-bg) !important; border-color: var(--success-color) !important; color: var(--success-color) !important; box-shadow: none; transform: translateY(2px); }

.text-center { text-align: center; } .final-score { font-size: 4rem; font-weight: 900; margin: 20px 0; color: var(--danger-color); }
.action-buttons { display: flex; flex-direction: column; gap: 15px; } .retro-btn { width: 100%; padding: 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); cursor: pointer; text-decoration: none; text-align: center; font-size: 1.1rem; border-radius: var(--radius-element); box-sizing: border-box;} .restart-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text);} .home-btn { background: var(--btn-secondary-bg); color: var(--text-main); }

@media (min-width: 768px) { .game-box { padding: 40px; } .en-sentence { font-size: 2.2rem; } .option-btn { font-size: 1.8rem; padding: 25px; } .options-grid { gap: 20px; } }
@media (max-width: 600px) { .options-grid { grid-template-columns: 1fr; } .en-sentence { font-size: 1.4rem; } .actions-board { flex-direction: column; } .sub-score { display: block; margin-top: 5px; margin-left: 0;} }
</style>