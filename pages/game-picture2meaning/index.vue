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
const gameWords = ref([]); // 隨機抽取的 10 個單字
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
let timer = null;

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
    penalty: 3 
});

const currentQuestion = ref(null);
const options = ref([]);
const isProcessing = ref(false);

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
  win: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.15), i * 100)); }
};

const speakWord = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[^a-zA-Z\s-]/g, ''));
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

// ==========================================
// 🌟 圖片讀取邏輯 (塔羅牌相容)
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

const handleImageError = (e) => { 
    e.target.style.display = 'none'; 
    if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }

    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.p2m_card_set) config.value.card_set = settings.p2m_card_set;
        if (settings.p2m_card_set_kangxuan) config.value.card_set_kangxuan = settings.p2m_card_set_kangxuan;
        if (settings.p2m_score_per_q !== undefined) config.value.score_per_q = settings.p2m_score_per_q;
        if (settings.p2m_penalty !== undefined) config.value.penalty = settings.p2m_penalty;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 4) {
          allWords.value = data.filter(v => v.en_us && v.zh_tw);
      } else {
          errorMsg.value = '⚠️ 該單元單字數量不足 (至少需 4 個單字才能產生選項)！';
      }
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }

  } catch (e) { console.error(e); }
});

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    score.value = 0;
    currentQuestionIndex.value = 0;
    correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    
    // 隨機抽取 10 個單字 (若不足 10 個則全取)
    let shuffled = [...allWords.value].sort(() => 0.5 - Math.random());
    gameWords.value = shuffled.slice(0, Math.min(10, shuffled.length));

    gameStatus.value = 'playing';
    gameStartTime.value = Date.now();
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
    }, 1000);

    loadQuestion();
};

const loadQuestion = () => {
    isProcessing.value = false;
    currentQuestion.value = gameWords.value[currentQuestionIndex.value];
    
    // 產生選項 (1個正確 + 3個錯誤)
    let wrongOptions = allWords.value.filter(w => w.id !== currentQuestion.value.id);
    wrongOptions = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    let allOpts = [currentQuestion.value, ...wrongOptions].map(w => ({
        zh: w.zh_tw,
        isCorrect: w.id === currentQuestion.value.id,
        status: 'normal' // normal, correct, wrong
    }));
    
    options.value = allOpts.sort(() => 0.5 - Math.random());

    // 自動發音
    setTimeout(() => speakWord(currentQuestion.value.en_us), 300);
};

const handleOptionClick = (opt) => {
    if (isProcessing.value || opt.status !== 'normal') return;

    if (opt.isCorrect) {
        sfx.correct();
        opt.status = 'correct';
        isProcessing.value = true;
        
        // 答對給分
        score.value += config.value.score_per_q;
        if (!correctWordsList.value.includes(currentQuestion.value.en_us)) correctWordsList.value.push(currentQuestion.value.en_us);
        
        setTimeout(nextQuestion, 1000);
    } else {
        sfx.wrong();
        opt.status = 'wrong';
        mistakesCount.value++;
        
        // 答錯扣分
        score.value = Math.max(0, score.value - config.value.penalty);
        if (!wrongWordsList.value.includes(currentQuestion.value.en_us)) wrongWordsList.value.push(currentQuestion.value.en_us);
    }
};

const skipQuestion = () => {
    if (isProcessing.value) return;
    isProcessing.value = true;
    sfx.wrong(); // 或可以加一個專屬的跳過音效
    
    // 不扣分，直接顯示正確答案
    const correctOpt = options.value.find(o => o.isCorrect);
    if (correctOpt) correctOpt.status = 'correct';
    
    setTimeout(nextQuestion, 1000);
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
    sfx.win();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, 
            game_type: '單字看圖辨義', 
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
    window.speechSynthesis.cancel();
});
</script>

<template>
  <div class="p2m-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🖼️ 單字看圖辨義</h2>
      <div v-if="gameStatus === 'playing'" class="t-timer">
         <span style="color:#ffeb3b; margin-right: 15px;">🏆 總分: {{ score }}</span>
         <span>⏱️ {{ timeSpent }}s</span>
      </div>
      <NuxtLink to="/" class="retro-btn btn-small btn-danger" style="text-decoration:none;">離開</NuxtLink>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 500px;">
        <div class="icon-big">🖼️</div>
        <h2 style="color:#29b6f6; margin-bottom: 15px;">單字看圖辨義</h2>
        
        <div class="rules-box" style="border-color: #0288d1; margin-bottom: 20px;">
            <p>1️⃣ <b>看圖聽音</b>：畫面會展示精美的塔羅牌圖庫，並自動唸出英文發音。</p>
            <p>2️⃣ <b>選出字義</b>：請根據圖片與發音，從下方 4 個選項中選出正確的中文意思。</p>
            <p>3️⃣ <b>計分規則</b>：每題答對得 <b>{{ config.score_per_q }}</b> 分，答錯扣 <b>{{ config.penalty }}</b> 分。共 10 題，滿分 100 分！</p>
            <p style="color:#aaa;">💡 若圖片無法載入或不確定，可點擊「跳過本題」(不扣分)。</p>
        </div>

        <button class="retro-btn btn-primary" style="width:100%; font-size: 1.3rem; padding: 15px; background: #0288d1; border-color: #b3e5fc;" @click="startGame">開始挑戰</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing'" class="game-container">
        
        <div class="progress-bar">
            <span>進度: {{ currentQuestionIndex + 1 }} / {{ gameWords.length }}</span>
        </div>

        <div class="card-display-zone">
            <div class="tarot-card retro-element">
                <img :src="getCardImage(currentQuestion.en_us)" class="card-img" @error="handleImageError" />
                <div class="img-fallback" style="display: none;">
                    <span>圖片載入失敗<br>請依靠發音判斷</span>
                </div>
            </div>
            
            <button class="speak-btn retro-element" @click="speakWord(currentQuestion.en_us)" title="重聽發音">
                🔊 重聽單字
            </button>
        </div>

        <div class="options-zone">
            <button v-for="(opt, i) in options" :key="i" 
                    class="retro-btn opt-btn" :class="opt.status" 
                    @click="handleOptionClick(opt)" 
                    :disabled="isProcessing || opt.status !== 'normal'">
                {{ opt.zh }}
            </button>
        </div>

        <div class="skip-zone">
            <button class="retro-btn skip-btn" @click="skipQuestion" :disabled="isProcessing">
                ⏭️ 圖片怪怪的，跳過本題 (不扣分)
            </button>
        </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>🎉 挑戰完成</h1>
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
.p2m-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0d1b2a; display: flex; flex-direction: column; overflow-y: auto; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; color: #fff; }
.retro-element { background: rgba(22, 33, 62, 0.9); border: 2px solid #0f3460; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); color: #fff; padding: 15px; box-sizing: border-box; }
.retro-btn { background: #0f3460; color: #fff; border: 2px solid #4a4e69; border-radius: 6px; font-weight: bold; cursor: pointer; padding: 10px 15px; box-shadow: 0 4px 0 #0a2240; transition: 0.1s; font-family: inherit;}
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; }
.btn-danger { background: #d32f2f; border-color: #e57373; box-shadow: 0 4px 0 #b71c1c; }
.btn-small { padding: 5px 10px; font-size: 1rem; box-shadow: 0 2px 0 #b71c1c; }

.t-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 10px;}
.t-title { margin: 0; font-size: 1.2rem; color: #29b6f6;}
.t-timer { font-weight: bold; font-size: 1rem; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 6px;}

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; min-height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; box-sizing: border-box;}
.rpg-dialog { max-width: 500px; width: 100%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.rules-box { text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px dashed #0f3460; font-size: 0.95rem; }

/* 遊戲畫面佈局 */
.game-container { flex: 1; display: flex; flex-direction: column; max-width: 600px; margin: 0 auto; width: 100%; padding: 0 15px 20px 15px; box-sizing: border-box; }

.progress-bar { text-align: center; color: #aaa; font-weight: bold; font-size: 1.1rem; margin-bottom: 15px; }

/* 🃏 卡牌顯示區 */
.card-display-zone { display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; position: relative; }
.tarot-card { 
    width: 100%; max-width: 260px; aspect-ratio: 1 / 1.5; 
    padding: 0; border: 4px solid #fbc02d; border-radius: 12px; overflow: hidden; 
    box-shadow: 0 10px 20px rgba(0,0,0,0.8); background: #000;
}
.card-img { width: 100%; height: 100%; object-fit: cover; }
.img-fallback { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; text-align: center; color: #ffeb3b; font-weight: bold; padding: 20px; font-size: 1.2rem; }

.speak-btn { position: absolute; bottom: -15px; background: #0288d1; color: white; border-color: #81d4fa; border-radius: 30px; font-size: 1.1rem; padding: 8px 20px; box-shadow: 0 4px 0 #01579b; z-index: 10; }
.speak-btn:active { transform: translateY(4px); box-shadow: none; }

/* 🔠 選擇題選項區 */
.options-zone { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.opt-btn { font-size: 1.2rem; padding: 15px 10px; background: #1f4068; border-color: #4a4e69; box-shadow: 0 4px 0 #16213e; display: flex; justify-content: center; align-items: center; text-align: center;}
.opt-btn.correct { background: #4caf50 !important; border-color: #81c784 !important; box-shadow: 0 4px 0 #2e7d32 !important; color: white; transform: scale(1.05); z-index: 10;}
.opt-btn.wrong { background: #d32f2f !important; border-color: #e57373 !important; box-shadow: none !important; color: #ffcdd2; transform: translateY(4px); opacity: 0.7; }

/* ⏭️ 跳過按鈕 */
.skip-zone { text-align: center; margin-top: auto; }
.skip-btn { background: #555; border-color: #777; color: #ccc; box-shadow: 0 3px 0 #333; font-size: 0.95rem; padding: 10px; width: 100%; max-width: 300px;}

@media (min-width: 768px) {
    .tarot-card { max-width: 300px; }
    .opt-btn { font-size: 1.4rem; padding: 20px 10px; }
    .speak-btn { font-size: 1.3rem; padding: 10px 25px; bottom: -20px; }
}
</style>