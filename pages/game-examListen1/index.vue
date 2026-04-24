<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

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
const gameWords = ref([]); 
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
let timer = null;
let replayTimeout = null;

// 計分系統
const score = ref(0);
const currentQuestionIndex = ref(0);
const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

const config = ref({ 
    card_set: '1', 
    card_set_kangxuan: '1k', 
    score_per_q: 10, 
    penalty: 3,
    hint_penalty: 3 
});

const currentQuestion = ref(null);
const options = ref([]); // 3張牌
const isProcessing = ref(false);
const showHint = ref(false);

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
  correct: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2),
  hint: () => playTone(440, 'triangle', 0.2, 0.1),
  win: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.15), i * 100)); }
};

const speakSentence = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // 放慢語速適合聽力測驗
    window.speechSynthesis.speak(utterance);
  }
};

// ==========================================
// 🌟 圖片讀取邏輯 (塔羅牌)
// ==========================================
const getCardImage = (word) => {
    if (!word) return ''; 
    let cleanWord = word.replace(/[^a-zA-Z\s-]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
    const encodedWord = encodeURIComponent(cleanWord);
    const version = route.query.version;
    let setNum = '';

    if (version === '康軒') {
        setNum = config.value.card_set_kangxuan || '1k';
        if (setNum === 'random') {
            const kSets = ['1k', '2k', '3k', '4k'];
            setNum = kSets[Math.floor(Math.random() * kSets.length)];
        }
    } else {
        setNum = config.value.card_set || '1';
        if (setNum === 'random') setNum = Math.floor(Math.random() * 3) + 1;
    }
    return `https://pyfbsdk59.github.io/tarot-cards-${setNum}/${encodedWord}.webp`;
};

// 🌟 移除了暴力隱藏圖片的 handleImageError，改用 Vue 的響應式變數來判斷

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }

    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.examListen1_card_set) config.value.card_set = settings.examListen1_card_set;
        if (settings.examListen1_card_set_kangxuan) config.value.card_set_kangxuan = settings.examListen1_card_set_kangxuan;
        
        // 🌟 強制將分數參數轉為「數字 Number」，解決總分字串相加變成 10 位數的問題！
        if (settings.examListen1_score_per_q !== undefined) config.value.score_per_q = Number(settings.examListen1_score_per_q);
        if (settings.examListen1_penalty !== undefined) config.value.penalty = Number(settings.examListen1_penalty);
        if (settings.examListen1_hint_penalty !== undefined) config.value.hint_penalty = Number(settings.examListen1_hint_penalty);
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      
      if (data) {
          const validWords = data.filter(v => v.en_us && v.example_en && v.example_en.trim().length > 0);
          
          if (validWords.length >= 3) {
              allWords.value = validWords;
          } else {
              errorMsg.value = '⚠️ 該單元擁有「英文例句」的單字數量不足 (至少需 3 個才能產生選項)！請至題庫補充例句。';
          }
      }
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }

  } catch (e) { console.error(e); }
});

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    score.value = 0;
    currentQuestionIndex.value = 0;
    correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    
    // 隨機抽取 10 題
    let shuffled = [...allWords.value].sort(() => 0.5 - Math.random());
    gameWords.value = shuffled.slice(0, Math.min(10, shuffled.length));

    gameStatus.value = 'playing';
    gameStartTime.value = Date.now();
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
    }, 1000);

    loadQuestion();
};

const playExamAudio = () => {
    clearTimeout(replayTimeout);
    speakSentence(currentQuestion.value.example_en);
    
    // 會考模式：4秒後自動唸第二次
    replayTimeout = setTimeout(() => {
        if (!isProcessing.value && gameStatus.value === 'playing') {
            speakSentence(currentQuestion.value.example_en);
        }
    }, 4500); 
};

const loadQuestion = () => {
    isProcessing.value = false;
    showHint.value = false;
    currentQuestion.value = gameWords.value[currentQuestionIndex.value];
    
    // 產生選項 (1個正確 + 2個錯誤)
    let wrongOptions = allWords.value.filter(w => w.id !== currentQuestion.value.id);
    wrongOptions = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    let allOpts = [currentQuestion.value, ...wrongOptions].map(w => ({
        ...w,
        isCorrect: w.id === currentQuestion.value.id,
        status: 'normal', // normal, correct, wrong
        imgError: false // 🌟 加入圖片錯誤標記，確保換題時能正確刷新
    }));
    
    options.value = allOpts.sort(() => 0.5 - Math.random());

    // 播放音檔 (間隔重播)
    setTimeout(playExamAudio, 500);
};

const useHint = () => {
    if (showHint.value || isProcessing.value) return;
    sfx.hint();
    showHint.value = true;
    score.value = Math.max(0, score.value - config.value.hint_penalty);
};

const handleOptionClick = (opt) => {
    if (isProcessing.value || opt.status !== 'normal') return;

    if (opt.isCorrect) {
        sfx.correct();
        opt.status = 'correct';
        isProcessing.value = true;
        clearTimeout(replayTimeout); // 答對就停止第二次重播
        window.speechSynthesis.cancel();
        
        score.value += config.value.score_per_q; // 🌟 已經強制變為純數字相加
        if (!correctWordsList.value.includes(currentQuestion.value.en_us)) correctWordsList.value.push(currentQuestion.value.en_us);
        
        setTimeout(nextQuestion, 1500);
    } else {
        sfx.wrong();
        opt.status = 'wrong';
        mistakesCount.value++;
        
        score.value = Math.max(0, score.value - config.value.penalty);
        if (!wrongWordsList.value.includes(currentQuestion.value.en_us)) wrongWordsList.value.push(currentQuestion.value.en_us);
    }
};

const skipQuestion = () => {
    if (isProcessing.value) return;
    isProcessing.value = true;
    clearTimeout(replayTimeout);
    window.speechSynthesis.cancel();
    sfx.wrong(); 
    
    const correctOpt = options.value.find(o => o.isCorrect);
    if (correctOpt) correctOpt.status = 'correct';
    
    setTimeout(nextQuestion, 1500);
};

const nextQuestion = () => {
    if (currentQuestionIndex.value < gameWords.value.length - 1) {
        currentQuestionIndex.value++;
        loadQuestion();
    } else {
        endGame();
    }
};

const endGame = async () => {
    gameStatus.value = 'end';
    clearInterval(timer);
    clearTimeout(replayTimeout);
    window.speechSynthesis.cancel();
    sfx.win();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, 
            game_type: '仿會考辨識句意', 
            score: score.value, 
            time_taken_seconds: timeSpent.value,
            version: route.query.version, 
            volume: route.query.volume, 
            unit_played: route.query.unit,
            correct_words: correctWordsList.value.join(', '), 
            wrong_words: wrongWordsList.value.join(', '), 
            mistakes: mistakesCount.value
        }]);
    }
};

onUnmounted(() => { 
    clearInterval(timer); 
    clearTimeout(replayTimeout);
    window.speechSynthesis.cancel();
});
</script>

<template>
  <div class="exam-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🎧 仿會考-辨識句意</h2>
      <div v-if="gameStatus === 'playing'" class="t-timer">
         <span style="color:#ffeb3b; margin-right: 15px;">🏆 總分: {{ score }}</span>
         <span>⏱️ {{ timeSpent }}s</span>
      </div>
      <NuxtLink to="/" class="retro-btn btn-small btn-danger" style="text-decoration:none;">離開</NuxtLink>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 550px;">
        <div class="icon-big">🎧</div>
        <h2 style="color:#c5cae9; margin-bottom: 15px;">會考挑戰：辨識句意</h2>
        
        <div class="rules-box" style="border-color: #3f51b5; margin-bottom: 20px;">
            <p>1️⃣ <b>會考模式</b>：進入題目後，系統會自動唸出題庫中的英文例句，並在 4 秒後<b>自動重播第二次</b>。</p>
            <p>2️⃣ <b>選出正解</b>：請根據聽到的句意，從下方 3 張塔羅牌中選出正確的圖片。</p>
            <p>3️⃣ <b>求救機制</b>：若聽不懂，可點擊「顯示中文句意」，但會扣除 <b>{{ config.hint_penalty }}</b> 分。</p>
            <p>💡 每題答對得 <b>{{ config.score_per_q }}</b> 分，選錯扣 <b>{{ config.penalty }}</b> 分。共 10 題！</p>
        </div>

        <button class="retro-btn btn-primary" style="width:100%; font-size: 1.3rem; padding: 15px; background: #3f51b5; border-color: #7986cb;" @click="startGame">開始聽力測驗</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing'" class="game-container">
        
        <div class="progress-bar">
            <span>題號: {{ currentQuestionIndex + 1 }} / {{ gameWords.length }}</span>
        </div>

        <div class="audio-hint-zone retro-element">
            <button class="retro-btn play-btn" @click="playExamAudio" title="手動重聽">
                ▶️ 重聽英文句意
            </button>
            
            <div v-if="!showHint" class="hint-placeholder">
                <button class="retro-btn hint-btn" @click="useHint" :disabled="isProcessing">
                    👁️ 顯示中文句意 (扣 {{ config.hint_penalty }} 分)
                </button>
            </div>
            <div v-else class="hint-text">
                📝 {{ currentQuestion.example_zh || '此題無中文翻譯' }}
            </div>
        </div>

        <div class="cards-zone">
            <div v-for="(opt, i) in options" :key="i" 
                 class="tarot-card retro-element" :class="opt.status" 
                 @click="handleOptionClick(opt)">
                 
                <img v-show="!opt.imgError" :src="getCardImage(opt.en_us)" class="card-img" @error="opt.imgError = true" />
                <div v-show="opt.imgError" class="img-fallback">
                    <span>無圖片<br>{{ opt.en_us }}</span>
                </div>
                
                <div class="answer-label" v-if="opt.status === 'correct'">
                    {{ opt.en_us }}<br><span style="font-size:0.8rem">{{ opt.zh_tw }}</span>
                </div>
            </div>
        </div>

        <div class="skip-zone">
            <button class="retro-btn skip-btn" @click="skipQuestion" :disabled="isProcessing">
                ⏭️ 圖片怪怪的，跳過本題 (不扣分)
            </button>
        </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>🎉 測驗完成</h1>
          <p class="winner-text" style="color:#ffeb3b; font-size: 3rem; font-weight: 900; margin: 15px 0; text-shadow: 2px 2px 0 #000;">
              {{ score }} 分
          </p>
          <div style="color:#aaa; font-weight:bold; margin-bottom:15px;">
              正確數：{{ 10 - mistakesCount }} / 10 <br>
              答錯/扣分次數：{{ mistakesCount }}
          </div>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block; width:100%;">返回首頁</NuxtLink>
       </div>
    </div>
  </div>
</template>

<style scoped>
.exam-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0a0a1a; display: flex; flex-direction: column; overflow-y: auto; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; color: #fff; }
.retro-element { background: rgba(10, 10, 30, 0.9); border: 2px solid #3f51b5; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); color: #fff; padding: 15px; box-sizing: border-box; }
.retro-btn { background: #283593; color: #fff; border: 2px solid #5c6bc0; border-radius: 6px; font-weight: bold; cursor: pointer; padding: 10px 15px; box-shadow: 0 4px 0 #1a237e; transition: 0.1s; font-family: inherit;}
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; }
.btn-primary { background: #3f51b5; border-color: #7986cb; box-shadow: 0 4px 0 #283593; }
.btn-danger { background: #d32f2f; border-color: #e57373; box-shadow: 0 4px 0 #b71c1c; }
.btn-small { padding: 5px 10px; font-size: 1rem; box-shadow: 0 2px 0 #b71c1c; }

.t-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 10px;}
.t-title { margin: 0; font-size: 1.2rem; color: #c5cae9;}
.t-timer { font-weight: bold; font-size: 1rem; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 6px;}

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; min-height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; box-sizing: border-box;}
.rpg-dialog { max-width: 500px; width: 100%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.rules-box { text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px dashed #3f51b5; font-size: 0.95rem; }

/* 遊戲畫面佈局 */
.game-container { flex: 1; display: flex; flex-direction: column; max-width: 900px; margin: 0 auto; width: 100%; padding: 0 15px 20px 15px; box-sizing: border-box; }
.progress-bar { text-align: center; color: #aaa; font-weight: bold; font-size: 1.1rem; margin-bottom: 10px; }

/* 🎧 聽力與提示區 */
.audio-hint-zone { display: flex; flex-direction: column; align-items: center; gap: 15px; margin-bottom: 20px; background: rgba(40, 53, 147, 0.2); }
.play-btn { font-size: 1.2rem; background: #00838f; border-color: #4dd0e1; box-shadow: 0 4px 0 #006064; width: 100%; max-width: 300px;}
.hint-placeholder { width: 100%; display: flex; justify-content: center; }
.hint-btn { background: #424242; border-color: #757575; box-shadow: 0 4px 0 #212121; color: #ffcc80; }
.hint-text { font-size: 1.3rem; color: #ffeb3b; font-weight: bold; text-align: center; animation: fadeIn 0.3s ease-in; line-height: 1.4;}

@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

/* 🃏 三選一卡牌區 */
.cards-zone { display: flex; justify-content: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;}
.tarot-card { 
    flex: 1; min-width: 120px; max-width: 250px; aspect-ratio: 1 / 1.5; 
    padding: 0; border: 4px solid #fff; border-radius: 12px; overflow: hidden; 
    box-shadow: 0 6px 12px rgba(0,0,0,0.8); background: #000; cursor: pointer;
    transition: 0.2s; position: relative;
}
.tarot-card:hover:not(.correct):not(.wrong) { transform: translateY(-10px); border-color: #ffeb3b; box-shadow: 0 10px 20px rgba(255,235,59,0.4); }

.tarot-card.correct { border-color: #4caf50; box-shadow: 0 0 30px #4caf50; transform: scale(1.05); z-index: 10; }
.tarot-card.wrong { border-color: #f44336; opacity: 0.5; filter: grayscale(1); transform: translateY(5px); }

.card-img { width: 100%; height: 100%; object-fit: cover; }
.img-fallback { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; text-align: center; color: #ffeb3b; font-weight: bold; padding: 10px; font-size: 1rem; }

.answer-label { position: absolute; bottom: 0; width: 100%; background: rgba(76, 175, 80, 0.9); color: #fff; text-align: center; padding: 8px 5px; font-weight: 900; font-size: 1.2rem; line-height: 1.1; box-sizing: border-box; animation: slideUp 0.3s ease-out;}
@keyframes slideUp { from { bottom: -50px; } to { bottom: 0; } }

/* ⏭️ 跳過按鈕 */
.skip-zone { text-align: center; margin-top: auto; }
.skip-btn { background: #555; border-color: #777; color: #ccc; box-shadow: 0 3px 0 #333; font-size: 0.95rem; padding: 10px; width: 100%; max-width: 300px;}

@media (min-width: 768px) {
    .audio-hint-zone { flex-direction: row; justify-content: center; }
    .play-btn, .hint-placeholder { width: auto; }
    .cards-zone { gap: 25px; flex-wrap: nowrap; }
}
</style>