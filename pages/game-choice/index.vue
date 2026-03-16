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

const vocabularies = ref([]); // 存放本局的 10 個題目
const allUnitWords = ref([]); // 存放該單元所有的單字 (用來產生錯誤選項)
const currentQuestionIndex = ref(0);
const score = ref(0);
const mistakes = ref(0);
const isLoading = ref(true);
const isGameOver = ref(false);
const options = ref([]);

const currentWordScore = ref(10); // 每題固定 10 分
const timeLeft = ref(20);
let timer = null;

const correctWords = ref(new Set());
const wrongWords = ref(new Set());
const wordReactionTimes = ref({});
const gameStartTime = ref(0);
const currentQuestionStartTime = ref(0);

const currentWord = computed(() => vocabularies.value[currentQuestionIndex.value]);

const restartGame = () => { if (typeof window !== 'undefined') window.location.reload(); };

onMounted(async () => {
  if (!route.query.unit) { navigateTo('/'); return; }
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) { 
    timeLimitSetting.value = settings.choice_game_time_limit ?? 20; 
    penaltySetting.value = settings.choice_penalty ?? 2; 
  }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit);
  if (route.query.volume && route.query.volume !== 'undefined') query = query.eq('volume', route.query.volume);
  
  const { data } = await query;
  if (data && data.length >= 4) { 
    // 儲存全部單字，用來當作干擾選項的題庫
    allUnitWords.value = data;
    
    // 🌟 自動補滿 10 題機制
    let pool = data.sort(() => Math.random() - 0.5);
    while (pool.length < 10) { 
      pool = pool.concat([...data].sort(() => Math.random() - 0.5)); 
    }
    vocabularies.value = pool.slice(0, 10);
    
    gameStartTime.value = Date.now(); 
    generateOptions(); startTimer(); isLoading.value = false; 
  } else { alert('單字庫不足 4 個，無法進行選擇題！'); navigateTo('/'); }
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

const startTimer = () => {
  currentWordScore.value = 10; clearInterval(timer); timeLeft.value = timeLimitSetting.value; currentQuestionStartTime.value = Date.now();
  timer = setInterval(() => { 
    timeLeft.value--; 
    // 移除時間倒扣機制，每題就是 10 分
    if (timeLeft.value <= 0) {
      mistakes.value++; 
      score.value = Math.max(0, score.value - penaltySetting.value); 
      wrongWords.value.add(currentWord.value.en_us); 
      nextQuestion(); 
    } 
  }, 1000);
};

const generateOptions = () => {
  // 從「所有單字池」裡面抽 3 個不一樣的來當干擾選項，避免題目重複時選項不夠
  let pool = allUnitWords.value.filter(w => w.en_us !== currentWord.value.en_us).sort(() => Math.random() - 0.5).slice(0, 3);
  options.value = [...pool, currentWord.value].map(w => ({ text: w.en_us, state: 'normal' })).sort(() => Math.random() - 0.5);
};

const selectOption = (opt) => {
  if (opt.state !== 'normal') return;
  const reactionTime = ((Date.now() - currentQuestionStartTime.value) / 1000).toFixed(1);
  
  if (opt.text === currentWord.value.en_us) {
    opt.state = 'correct'; 
    score.value += currentWordScore.value; // 固定加 10 分
    
    playPronunciation(opt.text);
    
    wordReactionTimes.value[currentWord.value.en_us] = reactionTime;
    if (!wrongWords.value.has(currentWord.value.en_us)) correctWords.value.add(currentWord.value.en_us);
    clearInterval(timer); 
    setTimeout(() => { 
      nextQuestion();
    }, 800); 
  } else {
    opt.state = 'wrong'; 
    // 答錯時從當前題目的 10 分裡面扣除，扣到 0 為止，不會倒扣總分
    currentWordScore.value = Math.max(0, currentWordScore.value - penaltySetting.value); 
    mistakes.value++; 
    wrongWords.value.add(currentWord.value.en_us);
  }
};

const nextQuestion = () => { 
  currentQuestionIndex.value++; 
  if(currentQuestionIndex.value < 10) { 
    generateOptions(); startTimer(); 
  } else { 
    endGame(); 
  } 
};

const endGame = async () => {
  isGameOver.value = true; clearInterval(timer); confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);
  
  if (studentCookie.value && !studentCookie.value.isAnon) {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch (e) {}
    const { count } = await supabase.from('game_records').select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id).eq('unit_played', route.query.unit).eq('game_type', '單字選選樂');
    
    // 🚨 使用 JSON.stringify 避免存檔錯誤
    const { error } = await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, 
      game_type: '單字選選樂', 
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
  <div class="game-container">
    <div class="game-box retro-element" v-if="!isLoading && !isGameOver">
      <div class="progress-bar retro-element">🎯 挑戰進度: 第 {{ currentQuestionIndex + 1 }} / {{ vocabularies.length }} 題</div>
      <div class="header-info"><div class="score-box">💯 分數: <span class="highlight">{{ score }}</span></div><div class="time-box">⏳ {{ timeLeft }}s</div></div>
      <div class="question-board retro-element"><h2 class="zh-word">{{ currentWord?.zh_tw }}</h2></div>
      
      <div class="options-grid">
        <button v-for="(opt, idx) in options" :key="idx" class="option-btn retro-element" :class="opt.state" @click="selectOption(opt)">
          <span>{{ opt.text }}</span>
          <span class="mini-sound-btn" @click.stop="playPronunciation(opt.text)" title="試聽選項發音">🔊</span>
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
.game-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; box-sizing: border-box; } 

/* 🌟 放寬至 800px */
.game-box { background: var(--box-bg); padding: 30px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); width: 100%; max-width: 800px; box-sizing: border-box; }

.progress-bar { background: var(--info-bg); padding: 10px; border-radius: 8px; font-size: 1.3rem; font-weight: 900; text-align: center; margin-bottom: 20px; border: 2px dashed var(--border-color); color: var(--text-main); box-shadow: var(--shadow-btn);}
.header-info { display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 20px; color: var(--text-main); font-size: 1.1rem;} .highlight { color: var(--danger-color); font-size: 1.3rem; }
.question-board { background: var(--info-bg); border-radius: var(--radius-element); padding: 40px 20px; text-align: center; margin-bottom: 25px; } .zh-word { font-size: 2.8rem; margin: 0; color: var(--text-main); font-weight: 900; word-break: break-word;}

.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; } 

/* 🌟 選項按鈕排版微調，讓喇叭可以靠右 */
.option-btn { display: flex; justify-content: space-between; align-items: center; background: var(--box-bg); border: var(--border-width) solid var(--border-color); padding: 15px 20px; font-size: 1.5rem; font-weight: 900; cursor: pointer; color: var(--text-main); font-family: inherit;}
.option-btn.correct { background: var(--success-bg) !important; border-color: var(--success-color) !important; color: var(--success-color) !important;}
.option-btn.wrong { background: var(--danger-bg) !important; border-color: var(--danger-color) !important; color: var(--danger-color) !important; opacity: 0.6;}

/* 🔊 小喇叭按鈕 */
.mini-sound-btn { background: var(--btn-secondary-bg); color: var(--text-main); padding: 5px 10px; border-radius: 8px; border: 2px solid var(--border-color); font-size: 1rem; transition: transform 0.1s;}
.mini-sound-btn:active { transform: translateY(2px); background: var(--box-bg); }

.text-center { text-align: center; } .final-score { font-size: 4rem; font-weight: 900; margin: 20px 0; color: var(--danger-color); }
.action-buttons { display: flex; flex-direction: column; gap: 15px; } 
.retro-btn { width: 100%; padding: 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); cursor: pointer; text-decoration: none; text-align: center; font-size: 1.1rem; border-radius: var(--radius-element); box-sizing: border-box;} 
.restart-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); } 
.home-btn { background: var(--btn-secondary-bg); color: var(--text-main); }

/* 🌟 電腦大螢幕優化 */
@media (min-width: 768px) {
  .game-box { padding: 40px; }
  .zh-word { font-size: 5rem; }
  .option-btn { font-size: 1.8rem; padding: 25px; }
  .mini-sound-btn { font-size: 1.4rem; padding: 5px 15px; }
  .options-grid { gap: 20px; }
}

@media (max-width: 600px) { .options-grid { grid-template-columns: 1fr; } .zh-word { font-size: 2.5rem; } }
</style>