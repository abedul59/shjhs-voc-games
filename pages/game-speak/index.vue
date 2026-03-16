<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import { useBgmUnlock } from '~/composables/useBgmUnlock';
import { useRoute } from 'vue-router';

const route = useRoute();
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const maxScoreSetting = ref(10);
const penaltySetting = ref(3);
const skipPenaltySetting = ref(3);
const totalQuestions = 10;

const vocabularies = ref([]);
const currentQuestionIndex = ref(0);
const questionsCompleted = ref(0);
const totalScore = ref(0);
const currentQuestionScore = ref(10);
const currentTryCount = ref(0);

const isLoading = ref(true);
const isGameOver = ref(false);
// 用來控制是否已經點擊過「開始」按鈕 (破解手機靜音限制)
const gameStarted = ref(false); 
const gameStartTime = ref(0);

const isRecording = ref(false);
const recognizedText = ref('');
const feedbackStatus = ref(null);
let recognition = null;

const correctWords = ref(new Set());
const wrongWords = ref(new Set());

const currentWord = computed(() => vocabularies.value[currentQuestionIndex.value]);
const cleanWord = computed(() => currentWord.value ? currentWord.value.en_us.replace(/[?()!]/g, '').trim().toLowerCase() : '');

onMounted(async () => {
  if (!route.query.unit) { navigateTo('/'); return; }
  
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) {
    maxScoreSetting.value = settings.speak_max_score ?? 10;
    penaltySetting.value = settings.speak_retry_penalty ?? 3;
    skipPenaltySetting.value = settings.speak_skip_penalty ?? 3; 
  }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit);
  if (route.query.volume && route.query.volume !== 'undefined') query = query.eq('volume', route.query.volume);
  
  const { data } = await query;
  if (data && data.length > 0) {
    let pool = data.sort(() => Math.random() - 0.5);
    while (pool.length < totalQuestions) { pool = pool.concat([...data].sort(() => Math.random() - 0.5)); }
    vocabularies.value = pool.slice(0, totalQuestions);
    isLoading.value = false;
    // 這裡先不載入題目，等學生按了開始按鈕才啟動！
  } else {
    alert('單字庫為空，無法開始！'); navigateTo('/');
  }
});

// 學生點擊開始按鈕後觸發
const startGame = () => {
  gameStarted.value = true;
  gameStartTime.value = Date.now();
  
  // 偷偷播放一個無聲音檔來解鎖手機的 AudioContext
  const unlockUtterance = new SpeechSynthesisUtterance('');
  window.speechSynthesis.speak(unlockUtterance);

  initSpeechRecognition();
  loadQuestion();
};

const playWordSound = () => {
  if (!cleanWord.value) return;
  const utterance = new SpeechSynthesisUtterance(cleanWord.value);
  utterance.lang = 'en-US'; 
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};

const initSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('⚠️ 您的瀏覽器不支援語音辨識功能！\n(iPhone 建議使用 Safari，Android 建議使用 Chrome，並請不要在 LINE 裡面直接打開)');
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecording.value = true;
    recognizedText.value = '正在聆聽... 👂';
    feedbackStatus.value = null;
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().replace(/[.?!,]/g, '').trim();
    recognizedText.value = transcript;
    checkAnswer(transcript);
  };

  recognition.onerror = (event) => {
    console.error("語音辨識錯誤:", event.error);
    isRecording.value = false;
    if (event.error === 'not-allowed') {
      alert('⚠️ 無法存取麥克風！請檢查是否已允許網頁使用麥克風權限。');
    } else {
      recognizedText.value = '聽不清楚，請再試一次！';
      feedbackStatus.value = 'error';
    }
  };

  recognition.onend = () => {
    isRecording.value = false;
  };
};

const toggleRecording = () => {
  if (!recognition || feedbackStatus.value === 'success') return; 
  
  try {
    if (isRecording.value) {
      recognition.stop();
    } else {
      recognition.start();
    }
  } catch (error) {
    console.error("啟動錄音失敗:", error);
    recognition.stop();
  }
};

const retryRecording = () => {
  currentQuestionScore.value = Math.max(0, currentQuestionScore.value - penaltySetting.value);
  currentTryCount.value++;
  feedbackStatus.value = null;
  recognizedText.value = '';
  toggleRecording();
};

const checkAnswer = (spokenText) => {
  const cleanSpoken = spokenText.replace(/[^\w\s]/g, '').trim();
  
  if (cleanSpoken.includes(cleanWord.value)) {
    feedbackStatus.value = 'success';
    recognizedText.value = `✅ 完美！您說了: "${spokenText}"`;
    totalScore.value += currentQuestionScore.value;
    correctWords.value.add(currentWord.value.en_us);
    setTimeout(() => { nextQuestion(); }, 1500);
  } else {
    feedbackStatus.value = 'error';
    recognizedText.value = `❌ 哎呀，系統聽到的是: "${spokenText}"`;
    wrongWords.value.add(currentWord.value.en_us);
  }
};

const loadQuestion = () => {
  currentQuestionScore.value = maxScoreSetting.value;
  currentTryCount.value = 0;
  recognizedText.value = '';
  feedbackStatus.value = null;
  
  setTimeout(() => playWordSound(), 800);
};

const skipQuestion = () => {
  if (isRecording.value) recognition.stop();
  const scoreAfterSkip = Math.max(0, currentQuestionScore.value - skipPenaltySetting.value);
  totalScore.value += scoreAfterSkip;
  wrongWords.value.add(currentWord.value.en_us);
  nextQuestion();
};

const nextQuestion = () => {
  questionsCompleted.value++;
  if (questionsCompleted.value >= totalQuestions) { endGame(); } 
  else { currentQuestionIndex.value++; loadQuestion(); }
};

const endGame = async () => {
  isGameOver.value = true; confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  
  if (studentCookie.value && !studentCookie.value.isAnon) {
    const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);
    
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, game_type: '單字口說測一測', version: route.query.version, volume: route.query.volume || '', unit_played: route.query.unit, 
      score: totalScore.value, mistakes: wrongWords.value.size, correct_words: Array.from(correctWords.value).join(', '), wrong_words: Array.from(wrongWords.value).join(', '), time_taken_seconds: totalTimeTaken 
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
onUnmounted(() => { if (recognition) { recognition.onend = null; recognition.stop(); } window.speechSynthesis.cancel(); });
</script>

<template>
  <div class="game-container">
    
    <div class="game-box retro-element start-screen" v-if="!isLoading && !gameStarted">
      <h1 class="text-center">🎙️ 口說測一測</h1>
      
      <div class="alert-box">
        <h3>⚠️ 手機玩家必看指南 ⚠️</h3>
        <p>如果您等一下按下麥克風時，跳出<strong>「網站無法要求權限 / 重疊視窗」</strong>的錯誤，請按照以下步驟自救：</p>
        
        <div class="step-card">
          <h4>💡 解法一：關閉擋住畫面的 APP (最常見)</h4>
          <ul>
            <li>關閉 Messenger 的<strong>聊天大頭貼 (泡泡)</strong></li>
            <li>關閉<strong>抗藍光 / 護眼濾鏡 APP</strong></li>
            <li>關閉螢幕錄影、小白點等「懸浮按鈕」</li>
          </ul>
        </div>

        <div class="step-card">
          <h4>💡 解法二：手動暴力開啟 (最快)</h4>
          <ul>
            <li>點擊網址列旁邊的 <strong>「鎖頭 🔒」</strong> 或 <strong>「設定 ⚙️」</strong></li>
            <li>選擇「權限」或「網站設定」</li>
            <li>找到「麥克風」，把它改成 <strong>「允許 (Allow)」</strong></li>
            <li>重新整理網頁！</li>
          </ul>
        </div>
        
        <p class="line-warning">🚫 <strong>強烈警告：</strong>請絕對不要在 LINE 或 FB 裡面直接玩！請點擊右上角「以預設瀏覽器開啟 (Chrome 或 Safari)」。</p>
      </div>

      <button class="retro-btn start-btn" @click="startGame">🟢 我知道了，開始測驗！</button>
    </div>

    <div class="game-box retro-element" v-if="gameStarted && !isGameOver">
      
      <div class="header-info">
        <div class="progress">🎙️ 第 {{ questionsCompleted + 1 }} / 10 題</div>
      </div>
      
      <div class="score-board">
        <span>🏆 總分: <strong style="color: var(--danger-color); font-size: 1.4rem;">{{ totalScore }}</strong></span>
        <span class="current-score">(本題剩餘: {{ currentQuestionScore }} 分)</span>
      </div>

      <div class="word-card">
        <h2 class="word-title">{{ currentWord.en_us }}</h2>
        <p class="word-zh">{{ currentWord.zh_tw }}</p>
        <button class="action-btn play-btn" @click="playWordSound">🔊 聽標準發音</button>
      </div>
      
      <div class="mic-section" :class="{ 'recording': isRecording }">
        <template v-if="feedbackStatus !== 'error'">
          <button class="mic-btn" :class="{ 'is-active': isRecording }" @click="toggleRecording" :disabled="feedbackStatus === 'success'">
            <span class="mic-icon">{{ isRecording ? '🛑' : '🎤' }}</span>
          </button>
          <p class="mic-hint">{{ isRecording ? '請對著麥克風唸出單字... (點擊停止)' : '點擊麥克風開始錄音' }}</p>
        </template>

        <template v-else>
          <div class="retry-container">
            <button class="retry-btn" @click="retryRecording">
              🔄 重新測驗 (扣 {{ penaltySetting }} 分)
            </button>
          </div>
        </template>

        <div class="feedback-box" v-if="recognizedText" :class="feedbackStatus">
          {{ recognizedText }}
        </div>
      </div>

      <div class="controls" style="margin-top: 30px; border-top: 2px dashed #ccc; padding-top: 20px;">
        <button class="action-btn skip-btn" @click="skipQuestion">
          ⏭️ 不會唸，跳過這題 (扣 {{ skipPenaltySetting }} 分)
        </button>
      </div>
    </div>

    <div class="game-box retro-element text-center" v-if="isGameOver">
      <h1>🎙️ 口說挑戰結束！</h1>
      <div class="final-score">{{ totalScore }} 分</div>
      <div class="action-buttons">
        <button class="retro-btn restart-btn" @click="restartGame">🔄 再練一次</button>
        <NuxtLink to="/" class="retro-btn home-btn">🏠 回首頁</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container { min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box; background: var(--bg-color);}
.game-box { background: var(--box-bg); padding: 30px; border: var(--box-border-width) solid var(--border-color); border-radius: 20px; width: 100%; max-width: 600px; text-align: center; box-shadow: var(--shadow-box);}

/* 🌟 啟動畫面與除錯說明樣式 */
.start-screen h1 { font-size: 2.5rem; color: var(--text-main); margin-bottom: 20px;}
.alert-box { background: #fff3cd; border: 3px solid #ffeeba; padding: 20px; border-radius: 15px; text-align: left; color: #856404; margin-bottom: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);}
.alert-box h3 { margin-top: 0; color: #856404; font-size: 1.4rem; text-align: center; border-bottom: 2px dashed #ffeeba; padding-bottom: 10px;}
.step-card { background: white; padding: 15px; border-radius: 10px; margin-top: 15px; border-left: 5px solid #f39c12; }
.step-card h4 { margin: 0 0 10px 0; color: #d35400; font-size: 1.1rem;}
.step-card ul { margin: 0; padding-left: 20px; color: #555; font-weight: bold; line-height: 1.5;}
.line-warning { margin-top: 20px; color: #c0392b; font-weight: 900; background: #fadbd8; padding: 10px; border-radius: 8px; text-align: center;}

.start-btn { background: var(--success-bg); color: var(--success-color); font-size: 1.3rem; padding: 20px; width: 100%; animation: pulse-btn 2s infinite;}
@keyframes pulse-btn { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }

/* 🌟 原有遊戲畫面樣式 */
.header-info { display: flex; justify-content: space-between; font-weight: 900; font-size: 1.2rem; margin-bottom: 10px; color: var(--text-main);}
.score-board { font-size: 1.2rem; font-weight: bold; color: var(--text-main); margin-bottom: 20px; border-bottom: 2px dashed #ccc; padding-bottom: 10px; }
.current-score { color: #888; font-size: 1rem; margin-left: 10px; transition: color 0.3s; }

.word-card { background: var(--tab-bg); padding: 30px 20px; border-radius: 15px; border: 2px solid var(--border-color); margin-bottom: 30px; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); }
.word-title { font-size: 3rem; margin: 0 0 10px 0; color: var(--text-main); font-weight: 900; letter-spacing: 1px; }
.word-zh { font-size: 1.5rem; color: #555; margin: 0 0 20px 0; font-weight: bold; }

.play-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }

.mic-section { background: #f8f9fa; padding: 30px 20px; border-radius: 15px; border: 2px dashed #bdc3c7; transition: 0.3s; }
.mic-section.recording { background: #ffeaa7; border-color: #f39c12; box-shadow: 0 0 20px rgba(243, 156, 18, 0.3); }

.mic-btn { width: 100px; height: 100px; border-radius: 50%; border: none; background: #fff; font-size: 3rem; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: all 0.2s; display: flex; justify-content: center; align-items: center; margin: 0 auto; outline: none; }
.mic-btn:hover:not(:disabled) { transform: scale(1.05); }
.mic-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mic-btn.is-active { background: var(--danger-color); color: white; animation: pulse-mic 1.5s infinite; }
.mic-hint { margin-top: 15px; font-weight: bold; color: #666; font-size: 1.1rem; }

.retry-container { margin: 15px 0; }
.retry-btn { background: #f39c12; color: #111; border: 2px solid #e67e22; padding: 15px 30px; border-radius: 15px; font-size: 1.2rem; font-weight: 900; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 0 #e67e22; }
.retry-btn:active { transform: translateY(4px); box-shadow: none; }
.retry-btn:hover { background: #f1c40f; }

.feedback-box { margin-top: 20px; padding: 15px; border-radius: 10px; font-weight: bold; font-size: 1.2rem; background: #eee; }
.feedback-box.success { background: var(--success-bg); color: #155724; border: 2px solid var(--success-color); }
.feedback-box.error { background: #fadbd8; color: #d63031; border: 2px solid #d63031; }

.action-btn { border: 2px solid #000; padding: 12px 25px; border-radius: 20px; font-weight: 900; cursor: pointer; font-size: 1.1rem; transition: 0.2s; box-shadow: 0 4px 0 #000; width: 100%; box-sizing: border-box;}
.action-btn:active { transform: translateY(4px); box-shadow: none; }
.skip-btn { background: #eee; color: #555; }

.final-score { font-size: 4rem; color: var(--danger-color); font-weight: 900; margin: 20px 0; }
.action-buttons { display: flex; gap: 10px; justify-content: center; flex-direction: column; }
.retro-btn { padding: 15px 20px; border: 2px solid #000; border-radius: 10px; font-weight: bold; cursor: pointer; text-decoration: none; color: #000; font-size: 1.2rem;}
.restart-btn { background: var(--success-bg); } .home-btn { background: #eee; }

@keyframes pulse-mic { 0% { box-shadow: 0 0 0 0 rgba(214, 48, 49, 0.7); } 70% { box-shadow: 0 0 0 20px rgba(214, 48, 49, 0); } 100% { box-shadow: 0 0 0 0 rgba(214, 48, 49, 0); } }
</style>