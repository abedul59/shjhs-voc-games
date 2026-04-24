<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
  ]
});

const supabase = useSupabaseClient();
const route = useRoute();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('setup'); // setup, playing, result, end
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
let timer = null;

// 計分系統
const wordScoreTotal = ref(0);
const sentenceScoreTotal = ref(0);
const config = ref({ 
    word_score: 10, 
    word_penalty: 2, 
    sentence_score: 100, 
    sentences_raw: '' 
});

// 測驗題庫狀態
const sentences = ref([]);
const currentIndex = ref(0);
const currentSentence = computed(() => sentences.value[currentIndex.value]);

// 語音辨識狀態
let recognition = null;
const isRecording = ref(false);
const transcript = ref('');
const isEvaluated = ref(false);

// 音效系統
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

// TTS 語音朗讀
const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[^a-zA-Z\s]/g, ''));
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // 稍微放慢讓學生聽清楚
    window.speechSynthesis.speak(utterance);
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }

    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.speak_word_score !== undefined) config.value.word_score = settings.speak_word_score;
        if (settings.speak_word_penalty !== undefined) config.value.word_penalty = settings.speak_word_penalty;
        if (settings.speak_sentence_score !== undefined) config.value.sentence_score = settings.speak_sentence_score;
        if (settings.speak_sentences) config.value.sentences_raw = settings.speak_sentences;
    }

    // 解析後台傳來的句子
    const rawLines = config.value.sentences_raw.split('\n').filter(l => l.trim() !== '');
    if (rawLines.length === 0) {
        rawLines.push('How are you today?|你好嗎？'); // 預設防呆
        rawLines.push('Practice makes perfect.|熟能生巧。');
    }

    sentences.value = rawLines.map((line, id) => {
        const parts = line.split('|');
        const en = parts[0].trim();
        const zh = parts[1] ? parts[1].trim() : '';
        
        // 將英文句子拆成單字陣列 (保留標點符號供顯示，另存乾淨單字供比對)
        const words = en.split(' ').map(w => {
            const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
            return { original: w, clean: clean, status: 'pending' };
        });

        return { id, en, zh, words, sentenceScoreEarned: 0, wordScoreEarned: 0 };
    });

    initSpeechRecognition();

  } catch (e) { console.error(e); }
});

const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        errorMsg.value = '⚠️ 您的瀏覽器不支援語音辨識功能！請使用最新版 Google Chrome、Edge 或 Safari。';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true; // 即時顯示辨識結果
    recognition.continuous = false;    // 講完一句自動停止

    recognition.onstart = () => { 
        isRecording.value = true; 
        transcript.value = '聽取中...'; 
        isEvaluated.value = false;
    };
    
    recognition.onresult = (event) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
        }
        transcript.value = current;
    };
    
    recognition.onend = () => {
        if (isRecording.value) {
            isRecording.value = false;
            if (transcript.value === '聽取中...' || transcript.value.trim() === '') {
                transcript.value = '(未能聽取到聲音，請再試一次)';
            } else {
                evaluateSpeech();
            }
        }
    };
    
    recognition.onerror = (event) => {
        isRecording.value = false;
        if (event.error === 'not-allowed') {
            transcript.value = '⚠️ 麥克風權限被拒絕！請允許瀏覽器使用麥克風。';
        } else {
            transcript.value = `(辨識發生錯誤: ${event.error})`;
        }
    };
};

const toggleRecording = () => {
    if (!recognition) return;
    if (isRecording.value) {
        recognition.stop();
    } else {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        
        // 重置當前題目的狀態
        currentSentence.value.words.forEach(w => w.status = 'pending');
        isEvaluated.value = false;
        transcript.value = '';
        
        try { recognition.start(); } catch (e) { recognition.stop(); setTimeout(()=>recognition.start(), 300); }
    }
};

const evaluateSpeech = () => {
    if (!currentSentence.value) return;

    // 將辨識到的句子轉小寫並拆成陣列
    const spokenWords = transcript.value.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    let correctCount = 0;
    let earnedWordScore = 0;

    // 比對每個目標單字
    currentSentence.value.words.forEach(w => {
        if (w.clean.length === 0) return; // 略過純標點

        const idx = spokenWords.indexOf(w.clean);
        if (idx !== -1) {
            w.status = 'correct';
            correctCount++;
            spokenWords.splice(idx, 1); // 消耗掉該單字，避免重複計分
            earnedWordScore += config.value.word_score;
        } else {
            w.status = 'wrong';
            earnedWordScore -= config.value.word_penalty;
        }
    });

    // 防止單字總分扣到負的
    earnedWordScore = Math.max(0, earnedWordScore);
    
    // 計算句子總分 (正確比例 * 滿分)
    const validWordsLength = currentSentence.value.words.filter(w => w.clean.length > 0).length;
    const ratio = validWordsLength > 0 ? (correctCount / validWordsLength) : 0;
    const earnedSentenceScore = Math.round(ratio * config.value.sentence_score);

    // 寫入當前題目分數
    currentSentence.value.wordScoreEarned = earnedWordScore;
    currentSentence.value.sentenceScoreEarned = earnedSentenceScore;
    
    // 累加至全域總分
    wordScoreTotal.value += earnedWordScore;
    sentenceScoreTotal.value += earnedSentenceScore;

    isEvaluated.value = true;
    
    if (ratio === 1) sfx.win();
    else if (ratio > 0.5) sfx.correct();
    else sfx.wrong();
};

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    wordScoreTotal.value = 0;
    sentenceScoreTotal.value = 0;
    currentIndex.value = 0;
    gameStartTime.value = Date.now();
    gameStatus.value = 'playing'; 
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
    }, 1000);
};

const nextSentence = () => {
    transcript.value = '';
    isEvaluated.value = false;
    if (currentIndex.value < sentences.value.length - 1) {
        currentIndex.value++;
    } else {
        endGame();
    }
};

const totalCombinedScore = computed(() => wordScoreTotal.value + sentenceScoreTotal.value);

const endGame = async () => {
    gameStatus.value = 'end';
    clearInterval(timer);
    if (recognition && isRecording.value) recognition.stop();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, 
            game_type: '英語口說學霸', 
            score: totalCombinedScore.value, 
            time_taken_seconds: timeSpent.value,
            correct_words: `單字得分:${wordScoreTotal.value}, 句子得分:${sentenceScoreTotal.value}`
        }]);
    }
};

onUnmounted(() => { 
    clearInterval(timer); 
    if (recognition && isRecording.value) recognition.stop();
    window.speechSynthesis.cancel();
});
</script>

<template>
  <div class="speak-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🗣️ 英語口說學霸</h2>
      <div v-if="gameStatus === 'playing' || gameStatus === 'end'" class="t-timer">
         <span style="color:#4caf50; margin-right: 10px;">單字: {{ wordScoreTotal }}</span>
         <span style="color:#ff9800; margin-right: 15px;">句子: {{ sentenceScoreTotal }}</span>
         <span>⏱️ {{ timeSpent }}s</span>
      </div>
      <NuxtLink to="/" class="retro-btn btn-small btn-danger" style="text-decoration:none;">離開</NuxtLink>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 600px;">
        <div class="icon-big">🎤</div>
        <h2 style="color:#ffeb3b; margin-bottom: 15px;">英語口說多元評量</h2>
        
        <div class="rules-box" style="margin-bottom: 20px; border-color: #ff9800;">
            <p>1️⃣ <b>發音練習</b>：點擊喇叭可聽整句發音，點擊「個別單字」可單獨聽單字發音。</p>
            <p>2️⃣ <b>錄音檢測</b>：點擊錄音鈕後對著麥克風唸出句子，系統會自動評分！</p>
            <p>3️⃣ <b>計分方式</b>：<br>
               🔸 單字唸對 +{{ config.word_score }}，漏唸或唸錯 -{{ config.word_penalty }} 分。<br>
               🔸 句子完整度最高可得 {{ config.sentence_score }} 分。
            </p>
        </div>

        <div class="warning-box">
            <h4 style="margin: 0 0 5px 0; color: #f44336;">📱 手機用戶注意事項</h4>
            <p style="margin:0; font-size: 0.85rem;">首次錄音時，瀏覽器會要求<b>麥克風權限</b>，請務必點選「允許」。若點擊錄音無反應，請至手機的「設定 > 隱私權 > 麥克風」中確認是否已開啟瀏覽器的權限。</p>
        </div>

        <button class="retro-btn btn-primary" style="margin-top:20px; width:100%; font-size: 1.3rem; padding: 15px;" @click="startGame">開始測驗</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing'" class="game-container">
        
        <div class="progress-bar">
            <span>題目進度: {{ currentIndex + 1 }} / {{ sentences.length }}</span>
        </div>

        <div class="sentence-box retro-element">
            <button class="speak-btn" @click="speakText(currentSentence.en)" title="聽整句發音">🔊 播放整句</button>
            
            <div class="words-container">
                <span v-for="(word, i) in currentSentence.words" :key="i" 
                      class="word-span" :class="word.status"
                      @click="speakText(word.clean)">
                    {{ word.original }}
                </span>
            </div>
            
            <div class="zh-text">{{ currentSentence.zh }}</div>
            <p class="hint-text">💡 點擊上方個別英文單字，可以單獨聽發音喔！</p>
        </div>

        <div class="record-box retro-element">
            <button class="record-btn" :class="{ 'is-recording': isRecording }" @click="toggleRecording">
                <span v-if="!isRecording">🎤 點擊開始錄音</span>
                <span v-else>🛑 錄音中... (點擊停止)</span>
            </button>
            
            <div class="transcript-box">
                <div class="t-label">🗣️ 系統聽到的句子：</div>
                <div class="t-result" :class="{ 'pulsing': isRecording }">
                    {{ transcript || '(尚無錄音資料)' }}
                </div>
            </div>
        </div>

        <div v-if="isEvaluated" class="evaluation-box retro-element">
            <h3 style="margin-top:0; color: #ffeb3b;">📊 評分結果</h3>
            <div class="score-details">
                <div class="s-card">
                    <div class="s-title">單字得分</div>
                    <div class="s-val" style="color: #4caf50;">+{{ currentSentence.wordScoreEarned }}</div>
                </div>
                <div class="s-card">
                    <div class="s-title">句子完整度</div>
                    <div class="s-val" style="color: #ff9800;">+{{ currentSentence.sentenceScoreEarned }} <span style="font-size:0.8rem; color:#aaa;">/ {{ config.sentence_score }}</span></div>
                </div>
            </div>
            <button class="retro-btn btn-primary" style="width: 100%; margin-top: 15px; font-size: 1.2rem; padding: 10px;" @click="nextSentence">
                {{ currentIndex < sentences.length - 1 ? '⏭️ 繼續下一題' : '🏁 完成測驗' }}
            </button>
        </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>🎉 測驗完成</h1>
          <div class="final-score-box">
              <p style="color:#4caf50;">單字總分：{{ wordScoreTotal }}</p>
              <p style="color:#ff9800;">句子總分：{{ sentenceScoreTotal }}</p>
              <hr style="border-color: #555; margin: 10px 0;">
              <h2 style="margin:0; color:#fff;">總成績：{{ totalCombinedScore }}</h2>
          </div>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:20px; display:inline-block; width: 100%;">返回首頁</NuxtLink>
       </div>
    </div>
  </div>
</template>

<style scoped>
.speak-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #1a1a2e; display: flex; flex-direction: column; overflow-y: auto; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; color: #fff; }
.retro-element { background: rgba(15, 20, 35, 0.9); border: 2px solid #4a4e69; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); color: #fff; padding: 15px; box-sizing: border-box; }
.retro-btn { background: #e94560; color: #fff; border: 2px solid #ff7b93; border-radius: 6px; font-weight: bold; cursor: pointer; padding: 10px 15px; box-shadow: 0 4px 0 #b33045; transition: 0.1s; }
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.btn-primary { background: #0f3460; border-color: #4a4e69; box-shadow: 0 4px 0 #0a2240; }
.btn-danger { background: #d32f2f; border-color: #e57373; box-shadow: 0 4px 0 #b71c1c; }
.btn-small { padding: 5px 10px; font-size: 1rem; box-shadow: 0 2px 0 #b71c1c; }

.t-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 10px;}
.t-title { margin: 0; font-size: 1.2rem; color: #e94560;}
.t-timer { font-weight: bold; font-size: 1rem; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 6px;}

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; min-height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; box-sizing: border-box;}
.rpg-dialog { max-width: 500px; width: 100%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.rules-box { text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px dashed #4a4e69; font-size: 0.95rem; }
.warning-box { text-align: left; background: rgba(244, 67, 54, 0.1); border-left: 4px solid #f44336; padding: 10px 15px; border-radius: 4px; }

/* 遊戲畫面佈局 */
.game-container { flex: 1; display: flex; flex-direction: column; max-width: 800px; margin: 0 auto; width: 100%; padding: 0 10px 20px 10px; gap: 15px; box-sizing: border-box; }

.progress-bar { text-align: center; color: #aaa; font-weight: bold; font-size: 1.1rem; }

/* 句子顯示區 */
.sentence-box { display: flex; flex-direction: column; align-items: center; border-color: #0f3460; }
.speak-btn { background: #e94560; color: white; border: none; padding: 8px 20px; border-radius: 20px; font-size: 1rem; font-weight: bold; cursor: pointer; margin-bottom: 15px; box-shadow: 0 3px 0 #b33045; }
.speak-btn:active { transform: translateY(3px); box-shadow: none; }

.words-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 15px; }
.word-span { font-size: 2rem; font-weight: 900; cursor: pointer; padding: 2px 5px; border-radius: 6px; transition: 0.2s; border-bottom: 3px solid transparent; line-height: 1.2; }
.word-span:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
.word-span.pending { color: #fff; border-bottom-color: #555; }
.word-span.correct { color: #4caf50; border-bottom-color: #4caf50; text-shadow: 0 0 10px rgba(76, 175, 80, 0.5); }
.word-span.wrong { color: #f44336; border-bottom-color: #f44336; text-decoration: line-through; opacity: 0.7;}

.zh-text { font-size: 1.2rem; color: #e1bee7; margin-bottom: 10px; text-align: center; font-weight: bold;}
.hint-text { font-size: 0.85rem; color: #888; margin: 0; }

/* 錄音區 */
.record-box { display: flex; flex-direction: column; align-items: center; border-color: #e94560; }
.record-btn { width: 100%; max-width: 300px; padding: 15px; border-radius: 30px; font-size: 1.2rem; font-weight: bold; border: none; background: #0f3460; color: white; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.5); transition: 0.3s; margin-bottom: 15px; border: 2px solid #4a4e69; }
.record-btn.is-recording { background: #e94560; border-color: #ff7b93; animation: pulseRecord 1s infinite alternate; }

@keyframes pulseRecord { 0% { transform: scale(1); box-shadow: 0 0 10px #e94560; } 100% { transform: scale(1.05); box-shadow: 0 0 30px #ff7b93; } }

.transcript-box { width: 100%; background: rgba(0,0,0,0.5); border-radius: 8px; padding: 15px; box-sizing: border-box; border: 1px solid #4a4e69;}
.t-label { font-size: 0.9rem; color: #aaa; margin-bottom: 5px; }
.t-result { font-size: 1.3rem; color: #ffeb3b; min-height: 40px; font-weight: bold; word-break: break-word;}
.t-result.pulsing { animation: textPulse 1s infinite alternate; opacity: 0.8; }
@keyframes textPulse { 0% { opacity: 0.5; } 100% { opacity: 1; } }

/* 評分區 */
.evaluation-box { text-align: center; animation: slideUp 0.5s ease-out; border-color: #4caf50; background: rgba(20, 40, 20, 0.9); }
.score-details { display: flex; justify-content: space-around; gap: 10px; }
.s-card { background: rgba(0,0,0,0.4); padding: 15px; border-radius: 8px; flex: 1; border: 1px solid #333;}
.s-title { font-size: 0.9rem; color: #ccc; margin-bottom: 5px; }
.s-val { font-size: 2rem; font-weight: 900; }

@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.final-score-box { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; font-size: 1.4rem; font-weight: bold; border: 1px solid #555; }

@media (min-width: 768px) {
    .word-span { font-size: 2.5rem; }
    .t-result { font-size: 1.5rem; }
}
</style>