<script setup>
import { prepareEnglishUtterance } from '~/utils/englishSpeech';
import { ref, onMounted, onUnmounted, computed } from 'vue';

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
  ]
});

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('setup'); // setup, playing, result, end
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
const selectedGrade = ref(null);
const isLoadingSentences = ref(false);
let timer = null;

// 計分系統
const sentenceMaxScore = 100;
const config = ref({ 
    sentences_raw: '' 
});

// 測驗題庫狀態
const sentences = ref([]);
const currentIndex = ref(0);
const currentSentence = computed(() => sentences.value[currentIndex.value]);
const defaultSentences = {
    7: [
        { english: 'How are you today?', chinese: '你今天好嗎？' },
        { english: 'I am a junior high school student.', chinese: '我是一名國中生。' },
        { english: 'How old is he?', chinese: '他幾歲了？' }
    ],
    8: [
        { english: 'Practice makes perfect.', chinese: '熟能生巧。' },
        { english: 'Could you tell me how to get there?', chinese: '你可以告訴我怎麼去那裡嗎？' },
        { english: 'I have been learning English for three years.', chinese: '我學英文已經三年了。' }
    ],
    9: [
        { english: 'Learning from mistakes helps us grow.', chinese: '從錯誤中學習能幫助我們成長。' },
        { english: 'We should take action to protect the environment.', chinese: '我們應該採取行動保護環境。' },
        { english: 'The more we practice, the more confident we become.', chinese: '我們練習得越多，就會越有自信。' }
    ]
};

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
    window.speechSynthesis.speak(prepareEnglishUtterance(utterance));
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }

    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.speak_sentences) config.value.sentences_raw = settings.speak_sentences;
    }

    initSpeechRecognition();

  } catch (e) { console.error(e); }
});

const buildSentences = items => items.map((item, id) => {
        const en = String(item.english || '').trim();
        const zh = String(item.chinese || '').trim();
        // 將英文句子拆成單字陣列 (保留標點符號供顯示，另存乾淨單字供比對)
        const words = en.split(' ').map(w => {
            const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
            return { original: w, clean: clean, status: 'pending' };
        });

        return {
            id, en, zh, words, scoreEarned: 0, correctCount: 0,
            wordCount: words.filter(word => word.clean).length,
            missedWords: [], extraWords: [], completed: false, transcript: ''
        };
    }).filter(item => item.en);

const legacySentenceItems = () => config.value.sentences_raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
        const [english, ...translation] = line.split('|');
        return { english, chinese: translation.join('|') };
    });

const selectGrade = async grade => {
    selectedGrade.value = grade;
    isLoadingSentences.value = true;
    errorMsg.value = '';
    const { data, error } = await supabase
        .from('speakno1_sentences')
        .select('id, english, chinese, sort_order')
        .eq('grade', grade)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true });

    let items = !error && data?.length ? data : legacySentenceItems();
    const usedEnglish = new Set(items.map(item => String(item.english || '').trim().toLowerCase()));
    if (items.length < 3) {
        items = [...items, ...defaultSentences[grade].filter(item => !usedEnglish.has(item.english.toLowerCase()))];
    }
    items = items.slice(0, 3);
    if (error) console.warn('年級句子題庫尚未建立，暫時使用原有句子：', error.message);
    sentences.value = buildSentences(items);
    isLoadingSentences.value = false;
};

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
                isEvaluated.value = Boolean(currentSentence.value?.completed);
            } else {
                evaluateSpeech();
            }
        }
    };
    
    recognition.onerror = (event) => {
        isRecording.value = false;
        isEvaluated.value = Boolean(currentSentence.value?.completed);
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

    // 比對每個目標單字
    currentSentence.value.words.forEach(w => {
        if (w.clean.length === 0) return; // 略過純標點

        const idx = spokenWords.indexOf(w.clean);
        if (idx !== -1) {
            w.status = 'correct';
            correctCount++;
            spokenWords.splice(idx, 1); // 消耗掉該單字，避免重複計分
        } else {
            w.status = 'wrong';
        }
    });

    // 每句固定 100 分，每個目標單字平均分配分數。
    const validWordsLength = currentSentence.value.words.filter(w => w.clean.length > 0).length;
    const ratio = validWordsLength > 0 ? (correctCount / validWordsLength) : 0;
    const earnedSentenceScore = Math.round(ratio * sentenceMaxScore);

    // 寫入當前題目分數
    currentSentence.value.scoreEarned = earnedSentenceScore;
    currentSentence.value.correctCount = correctCount;
    currentSentence.value.wordCount = validWordsLength;
    currentSentence.value.missedWords = currentSentence.value.words
        .filter(word => word.clean && word.status === 'wrong')
        .map(word => word.original);
    currentSentence.value.extraWords = spokenWords.filter(Boolean);
    currentSentence.value.completed = true;
    currentSentence.value.transcript = transcript.value;

    isEvaluated.value = true;
    
    if (ratio === 1) sfx.win();
    else if (ratio > 0.5) sfx.correct();
    else sfx.wrong();
};

const startGame = () => {
    if (!selectedGrade.value || !sentences.value.length || isLoadingSentences.value) return;
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    timeSpent.value = 0;
    sentences.value.forEach(sentence => {
        sentence.scoreEarned = 0;
        sentence.correctCount = 0;
        sentence.missedWords = [];
        sentence.extraWords = [];
        sentence.completed = false;
        sentence.transcript = '';
        sentence.words.forEach(word => { word.status = 'pending'; });
    });
    currentIndex.value = 0;
    transcript.value = '';
    isEvaluated.value = false;
    gameStartTime.value = Date.now();
    gameStatus.value = 'playing'; 
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
    }, 1000);
};

const selectSentence = index => {
    if (isRecording.value || index === currentIndex.value) return;
    currentIndex.value = index;
    transcript.value = currentSentence.value.transcript || '';
    isEvaluated.value = currentSentence.value.completed;
};

const totalCombinedScore = computed(() => sentences.value.reduce((total, sentence) => total + sentence.scoreEarned, 0));
const completedCount = computed(() => sentences.value.filter(sentence => sentence.completed).length);
const allCompleted = computed(() => sentences.value.length === 3 && completedCount.value === 3);

const endGame = async () => {
    if (!allCompleted.value || gameStatus.value === 'end') return;
    gameStatus.value = 'end';
    clearInterval(timer);
    if (recognition && isRecording.value) recognition.stop();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        const missedWords = sentences.value.flatMap(sentence => sentence.missedWords);
        const speakingDetails = {
            version: 2,
            sentenceMaxScore,
            totalMaxScore: sentences.value.length * sentenceMaxScore,
            sentences: sentences.value.map((sentence, index) => ({
                number: index + 1,
                target: sentence.en,
                transcript: sentence.transcript,
                score: sentence.scoreEarned,
                correctCount: sentence.correctCount,
                wordCount: sentence.wordCount,
                pointsPerWord: sentence.wordCount ? Number((sentenceMaxScore / sentence.wordCount).toFixed(2)) : 0,
                missedWords: sentence.missedWords,
                extraWords: sentence.extraWords
            }))
        };
        const { error } = await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, 
            game_type: '英語口說學霸', 
            version: '口說多元評量',
            volume: `${selectedGrade.value}年級`,
            unit_played: `${selectedGrade.value}年級（${sentences.value.length}題）`,
            score: totalCombinedScore.value, 
            time_taken_seconds: timeSpent.value,
            mistakes: missedWords.length,
            wrong_words: speakingDetails.sentences
                .filter(sentence => sentence.missedWords.length)
                .map(sentence => `第${sentence.number}句：${sentence.missedWords.join('、')}`)
                .join('；'),
            correct_words: `SPEAKING_V2:${JSON.stringify(speakingDetails)}`,
            device_info: navigator.userAgent
        }]);
        if (error) errorMsg.value = `⚠️ 成績儲存失敗：${error.message}`;
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
      <span v-if="selectedGrade" class="grade-chip">{{ selectedGrade }} 年級</span>
      <div v-if="gameStatus === 'playing' || gameStatus === 'end'" class="t-timer">
         <template v-if="allCompleted || gameStatus === 'end'">
           <span style="color:#4caf50; margin-right: 15px;">總分: {{ totalCombinedScore }} / 300</span>
         </template>
         <span v-else style="color:#ffeb3b; margin-right: 15px;">完成 {{ completedCount }} / 3</span>
         <span>⏱️ {{ timeSpent }}s</span>
      </div>
      <NuxtLink to="/" class="retro-btn btn-small btn-danger" style="text-decoration:none;">離開</NuxtLink>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 600px;">
        <div class="icon-big">🎤</div>
        <h2 style="color:#ffeb3b; margin-bottom: 15px;">英語口說多元評量</h2>

        <div class="grade-picker">
          <h3>請先選擇年級</h3>
          <div class="grade-options">
            <button v-for="grade in [7, 8, 9]" :key="grade" class="grade-btn" :class="{ selected: selectedGrade === grade }" @click="selectGrade(grade)">
              {{ grade }} 年級
            </button>
          </div>
          <p v-if="isLoadingSentences">題庫載入中…</p>
          <p v-else-if="selectedGrade">已載入 {{ selectedGrade }} 年級，共 {{ sentences.length }} 題。</p>
        </div>
        
        <div class="rules-box" style="margin-bottom: 20px; border-color: #ff9800;">
            <p>1️⃣ <b>發音練習</b>：點擊喇叭可聽整句發音，點擊「個別單字」可單獨聽單字發音。</p>
            <p>2️⃣ <b>錄音檢測</b>：點擊錄音鈕後對著麥克風唸出句子，系統會自動評分！</p>
            <p>3️⃣ <b>自由選題</b>：三句可用任意順序練習，全部完成後才會結算並儲存成績。</p>
            <p>4️⃣ <b>計分方式</b>：<br>
               🔸 每句滿分 100 分，三句合計 300 分。<br>
               🔸 每個單字平均分配該句 100 分；例如 5 個字，每字 20 分。
            </p>
        </div>

        <div class="warning-box">
            <h4 style="margin: 0 0 5px 0; color: #f44336;">📱 手機用戶注意事項</h4>
            <p style="margin:0; font-size: 0.85rem;">首次錄音時，瀏覽器會要求<b>麥克風權限</b>，請務必點選「允許」。若點擊錄音無反應，請至手機的「設定 > 隱私權 > 麥克風」中確認是否已開啟瀏覽器的權限。</p>
        </div>

        <button class="retro-btn btn-primary" :disabled="!selectedGrade || !sentences.length || isLoadingSentences" style="margin-top:20px; width:100%; font-size: 1.3rem; padding: 15px;" @click="startGame">{{ selectedGrade ? `開始 ${selectedGrade} 年級測驗` : '請先選擇年級' }}</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing'" class="game-container">
        
        <div class="progress-bar">
            <span>完成進度：{{ completedCount }} / 3</span>
            <small>三句可自由選擇，全部完成後才會結算成績</small>
        </div>

        <div class="sentence-picker" aria-label="選擇練習句子">
            <button v-for="(sentence, index) in sentences" :key="sentence.id" type="button"
                    class="sentence-choice" :class="{ active: currentIndex === index, completed: sentence.completed }"
                    :disabled="isRecording" @click="selectSentence(index)">
                <span class="choice-number">{{ sentence.completed ? '✓' : index + 1 }}</span>
                <span class="choice-text">{{ sentence.en }}</span>
                <small>{{ sentence.completed ? '已完成，可重新練習' : '尚未完成' }}</small>
            </button>
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
                    <div class="s-title">正確單字</div>
                    <div class="s-val" style="color: #4caf50;">{{ currentSentence.correctCount }} / {{ currentSentence.wordCount }}</div>
                    <small>每字 {{ currentSentence.wordCount ? (100 / currentSentence.wordCount).toFixed(2) : 0 }} 分</small>
                </div>
                <div class="s-card">
                    <div class="s-title">本句得分</div>
                    <div class="s-val" style="color: #ff9800;">{{ currentSentence.scoreEarned }} <span style="font-size:0.8rem; color:#aaa;">/ 100</span></div>
                </div>
            </div>
            <button class="retro-btn btn-primary" :disabled="!allCompleted" style="width: 100%; margin-top: 15px; font-size: 1.2rem; padding: 10px;" @click="endGame">
                {{ allCompleted ? '🏁 三句皆完成，結算成績' : `尚有 ${3 - completedCount} 句未完成` }}
            </button>
        </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>🎉 測驗完成</h1>
          <div class="final-score-box">
              <p v-for="(sentence, index) in sentences" :key="sentence.id" style="color:#ffcc80;">第 {{ index + 1 }} 句：{{ sentence.scoreEarned }} / 100</p>
              <hr style="border-color: #555; margin: 10px 0;">
              <h2 style="margin:0; color:#fff;">總成績：{{ totalCombinedScore }} / 300</h2>
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
.retro-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.grade-chip { background:#ff9800; color:#1a1a2e; padding:5px 10px; border-radius:999px; font-weight:900; }
.grade-picker { margin: 0 0 20px; padding: 15px; border: 2px solid #4a4e69; border-radius: 10px; background: #111827; }
.grade-picker h3 { margin: 0 0 12px; color: #fff; }
.grade-picker p { margin: 10px 0 0; color: #cbd5e1; }
.grade-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.grade-btn { padding: 14px 8px; border: 2px solid #ff9800; border-radius: 8px; background: #1f2937; color: #ffcc80; font: inherit; font-weight: 900; cursor: pointer; }
.grade-btn.selected { background: #ff9800; color: #111827; box-shadow: 0 0 0 3px #ffcc8055; }

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

.progress-bar { display:flex; flex-direction:column; gap:4px; text-align: center; color: #ddd; font-weight: bold; font-size: 1.1rem; }
.progress-bar small { color:#ffcc80; font-size:.82rem; }
.sentence-picker { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.sentence-choice { min-height:110px; display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:12px; border:2px solid #4a4e69; border-radius:9px; background:#101526; color:#fff; text-align:left; cursor:pointer; font:inherit; transition:.15s; }
.sentence-choice:hover:not(:disabled), .sentence-choice.active { border-color:#ff9800; transform:translateY(-2px); }
.sentence-choice.active { box-shadow:0 0 0 3px #ff980044; }
.sentence-choice.completed { border-color:#4caf50; background:#102418; }
.sentence-choice:disabled { cursor:not-allowed; opacity:.7; }
.choice-number { display:grid; place-items:center; min-width:28px; height:28px; padding:0 4px; border-radius:999px; background:#ff9800; color:#111827; font-weight:900; }
.sentence-choice.completed .choice-number { background:#4caf50; color:#fff; }
.choice-text { font-weight:900; line-height:1.3; }
.sentence-choice small { margin-top:auto; color:#aaa; }
.sentence-choice.completed small { color:#a5d6a7; }

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
@media (max-width: 700px) {
    .sentence-picker { grid-template-columns:1fr; }
    .sentence-choice { min-height:88px; }
    .t-header { flex-wrap:wrap; gap:8px; }
}
</style>
