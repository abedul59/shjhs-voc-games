<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('selectGrade'); // selectGrade -> selectArticle -> playing -> end
const selectedGrade = ref(null);
const articles = ref([]);
const selectedArticle = ref(null);

const parsedArticle = ref([]);
const currentTarget = ref(null); // { type: 'word'|'sentence', text: '...', clean: '' }

const isRecording = ref(false);
const transcript = ref('');
const evalResult = ref(null); // { score: 0, text: '' }

// 計分與紀錄系統
const score = ref(0);
const gameStartTime = ref(0);
const correctWordsList = ref([]);
const wrongWordsSet = ref(new Set());
let recognition = null;

// 音效
const playTone = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  if (type === 'correct') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  } else {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
  }
  gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (type === 'correct'?0.1:0.3));
  osc.start(); osc.stop(ctx.currentTime + (type === 'correct'?0.1:0.3));
};

onMounted(() => {
  if (!studentCookie.value || !studentCookie.value.id) {
    alert('請先登入！'); router.push('/'); return;
  }
});

const chooseGrade = async (grade) => {
  selectedGrade.value = grade;
  const { data } = await supabase.from('speakno2_articles').select('*').eq('grade', grade).order('created_at', { ascending: false });
  articles.value = data || [];
  gameStatus.value = 'selectArticle';
};

// 🌟 核心魔法：將文章拆解為句子與單字，保留標點符號排版
const parseText = (text) => {
  const sentenceRegex = /[^.?!]+[.?!]+(?:\s+|$)|[^.?!]+$/g;
  const rawSentences = text.match(sentenceRegex) || [text];
  
  return rawSentences.map(s => {
    const tokens = s.split(/(\s+|[.,?!;:"]+)/).filter(Boolean);
    const words = tokens.map(token => ({
      raw: token,
      clean: token.replace(/[^a-zA-Z0-9']/g, '').toLowerCase(),
      isPunctuationOrSpace: !/[a-zA-Z0-9]/.test(token)
    }));
    return { raw: s.trim(), words };
  });
};

const startArticle = (article) => {
  selectedArticle.value = article;
  parsedArticle.value = parseText(article.content);
  gameStartTime.value = Date.now();
  gameStatus.value = 'playing';
};

const setTarget = (type, rawText, cleanText) => {
  if (isRecording.value) return;
  currentTarget.value = { type, raw: rawText, clean: cleanText || rawText.replace(/[^a-zA-Z0-9'\s]/g, '').toLowerCase() };
  evalResult.value = null;
  playTTS(rawText);
};

const playTTS = (text) => {
  const msg = new SpeechSynthesisUtterance();
  msg.text = text; msg.lang = 'en-US'; msg.rate = 0.9;
  window.speechSynthesis.speak(msg);
};

// 語音辨識與評分
const startRecording = () => {
  if (!currentTarget.value) return alert('請先點擊你想唸的單字或句子！');
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return alert('瀏覽器不支援語音辨識，請使用 Chrome！');

  transcript.value = ''; evalResult.value = null; isRecording.value = true;
  recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const speech = event.results[0][0].transcript;
    transcript.value = speech;
    evaluateSpeech(speech);
  };
  recognition.onerror = () => { isRecording.value = false; alert('沒聽清楚，請再試一次！'); };
  recognition.onend = () => { isRecording.value = false; };
  recognition.start();
};

const evaluateSpeech = (speech) => {
  const inputWords = speech.toLowerCase().match(/\b\w+\b/g) || [];
  const targetWords = currentTarget.value.clean.toLowerCase().match(/\b\w+\b/g) || [];
  
  if (targetWords.length === 0) return;

  if (currentTarget.value.type === 'word') {
    // 單字模式：寬鬆比對 (包含即算對)
    const targetWord = targetWords[0];
    const isMatch = inputWords.includes(targetWord) || speech.toLowerCase().includes(targetWord);
    
    if (isMatch) {
      playTone('correct'); evalResult.value = { score: 100, text: 'Perfect! 🎉' };
      score.value += 10; correctWordsList.value.push(targetWord);
    } else {
      playTone('wrong'); evalResult.value = { score: 0, text: '再試一次喔！ 💪' };
      wrongWordsSet.value.add(targetWord);
    }
  } else {
    // 句子模式：計算單字命中率
    let matches = 0;
    targetWords.forEach(tw => { if (inputWords.includes(tw)) matches++; });
    const accuracy = Math.round((matches / targetWords.length) * 100);
    
    if (accuracy >= 80) { playTone('correct'); evalResult.value = { score: accuracy, text: 'Excellent! 🌟' }; score.value += 50; }
    else if (accuracy >= 50) { playTone('correct'); evalResult.value = { score: accuracy, text: 'Good job! 👍' }; score.value += 20; }
    else { playTone('wrong'); evalResult.value = { score: accuracy, text: '多加練習！ 💪' }; }
  }
};

const endGame = async () => {
  gameStatus.value = 'end';
  if (!studentCookie.value || !studentCookie.value.id) return;
  try {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch(e){}
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, real_name: studentCookie.value.real_name || studentCookie.value.name, class_name: studentCookie.value.class, 
      unit_played: `G${selectedGrade.value}-${selectedArticle.value.title}`,
      game_type: '英語口說學霸2', score: score.value, time_taken_seconds: Math.round((Date.now() - gameStartTime.value) / 1000),
      correct_words: correctWordsList.value.join(', '), wrong_words: Array.from(wrongWordsSet.value).join(', '),
      device_info: navigator.userAgent, ip_address: userIp, is_anon: studentCookie.value.isAnon || false, browser_id: studentCookie.value.browserId
    }]);
    if (!studentCookie.value.isAnon) {
      const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
      if (data) await supabase.from('students').update({ points: data.points + score.value }).eq('id', studentCookie.value.id);
    }
  } catch(err) { console.error('成績上傳失敗', err); }
};

onUnmounted(() => { if (recognition) recognition.abort(); });
</script>

<template>
  <div class="speak-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div v-if="gameStatus === 'playing'" class="score-board">得點：{{ score }} pt</div>
    </div>

    <div v-if="gameStatus === 'selectGrade'" class="center-screen">
      <h1>📖 口說學霸 2<br><small>朗讀與說故事</small></h1>
      <p>請選擇你要挑戰的年級！</p>
      <div class="grade-btns">
        <button @click="chooseGrade(7)" class="grade-btn g7">七年級區</button>
        <button @click="chooseGrade(8)" class="grade-btn g8">八年級區</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'selectArticle'" class="center-screen">
      <h2>請選擇 {{ selectedGrade }} 年級的文章</h2>
      <div class="article-grid">
        <button v-for="art in articles" :key="art.id" class="article-btn" @click="startArticle(art)">
          📜 {{ art.title }}
        </button>
      </div>
      <p v-if="articles.length === 0" class="empty-msg">老師還沒新增文章喔！</p>
      <button @click="gameStatus = 'selectGrade'" class="text-btn">返回重新選擇</button>
    </div>

    <div v-else-if="gameStatus === 'playing'" class="play-screen">
      <h2 class="article-title">{{ selectedArticle.title }}</h2>
      <div class="tip">💡 提示：點擊 🔊 可整句發音，點擊「英文單字」可單獨發音與測驗。</div>

      <div class="article-content retro-element">
        <span v-for="(sentence, sIdx) in parsedArticle" :key="sIdx" class="sentence-box" :class="{ 'active-target': currentTarget?.raw === sentence.raw }">
          <button @click="setTarget('sentence', sentence.raw)" class="sentence-play-btn" title="整句發音">🔊</button>
          
          <span v-for="(token, wIdx) in sentence.words" :key="wIdx">
            <span v-if="token.isPunctuationOrSpace">{{ token.raw }}</span>
            <span v-else class="clickable-word" :class="{ 'active-word': currentTarget?.clean === token.clean }" @click="setTarget('word', token.raw, token.clean)">
              {{ token.raw }}
            </span>
          </span>
        </span>
      </div>

      <div class="control-panel retro-element">
        <div v-if="currentTarget" class="target-display">
          <div class="target-type">{{ currentTarget.type === 'word' ? '📍 當前挑戰單字' : '📍 當前挑戰句子' }}</div>
          <div class="target-text">{{ currentTarget.raw }}</div>
        </div>
        <div v-else class="target-display placeholder">請在上方點選你要挑戰的單字或句子！</div>

        <div class="action-buttons">
          <button class="action-btn play-btn" @click="playTTS(currentTarget.raw)" :disabled="!currentTarget">🔊 聽示範</button>
          <button class="action-btn mic-btn" :class="{ recording: isRecording }" @click="startRecording" :disabled="!currentTarget">
            {{ isRecording ? '🎙️ 聆聽中...' : '🎙️ 按下開口說' }}
          </button>
        </div>

        <div class="result-box" v-if="transcript">
          <p class="transcript">你說的是：<br><strong>{{ transcript }}</strong></p>
          <div class="eval-result" :class="{ good: evalResult?.score >= 60, bad: evalResult?.score < 60 }">
            {{ evalResult?.text }} (精準度: {{ evalResult?.score }}%)
          </div>
        </div>

        <button class="end-btn" @click="endGame">🛑 結束測驗並上傳成績</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'end'" class="center-screen">
      <h1>🎉 恭喜完成朗讀！</h1>
      <h2>總得分：{{ score }} pt</h2>
      <NuxtLink to="/" class="end-home-btn">返回首頁</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.speak-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif; min-height: 100vh;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.score-board { font-size: 1.2rem; font-weight: bold; background: #fff8e1; padding: 5px 15px; border-radius: 20px; color: #f57f17; border: 2px solid #fbc02d;}

.center-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; text-align: center;}
h1 { font-size: 2.5rem; color: #2c3e50; margin-bottom: 10px;}
h1 small { font-size: 1.5rem; color: #7f8c8d; display: block; margin-top: 5px;}

.grade-btns { display: flex; gap: 20px; margin-top: 30px;}
.grade-btn { font-size: 1.5rem; font-weight: bold; padding: 20px 40px; border-radius: 16px; border: none; cursor: pointer; color: white; box-shadow: 0 6px 0 rgba(0,0,0,0.2); transition: 0.1s;}
.grade-btn:active { transform: translateY(6px); box-shadow: none;}
.grade-btn.g7 { background: #ff9800; box-shadow: 0 6px 0 #e65100;}
.grade-btn.g8 { background: #9c27b0; box-shadow: 0 6px 0 #6a1b9a;}

.article-grid { display: flex; flex-direction: column; gap: 15px; width: 100%; max-width: 500px; margin: 20px 0;}
.article-btn { background: white; border: 2px solid #3498db; padding: 15px; border-radius: 12px; font-size: 1.2rem; font-weight: bold; color: #2980b9; cursor: pointer; transition: 0.2s;}
.article-btn:hover { background: #ebf5fb; transform: translateY(-2px);}
.text-btn { background: transparent; border: none; color: #7f8c8d; text-decoration: underline; cursor: pointer; margin-top: 20px;}

.article-title { text-align: center; color: #2c3e50; font-size: 1.8rem; margin-bottom: 5px;}
.tip { text-align: center; color: #e65100; font-weight: bold; margin-bottom: 15px; font-size: 0.95rem;}

.article-content { background: #fff; padding: 20px; border-radius: 16px; border: 2px solid #e0e0e0; line-height: 2.2; font-size: 1.2rem; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
.sentence-box { position: relative; padding: 2px 5px; border-radius: 8px; transition: 0.2s; display: inline;}
.sentence-box:hover { background: #f5f5f5; }
.sentence-box.active-target { background: #fff8e1; border: 1px dashed #fbc02d; }
.sentence-play-btn { background: transparent; border: none; cursor: pointer; font-size: 1.2rem; padding: 0 5px; opacity: 0.6; transition: 0.2s;}
.sentence-play-btn:hover { opacity: 1; transform: scale(1.2);}
.clickable-word { cursor: pointer; color: #2c3e50; border-bottom: 1px dashed #ccc; transition: 0.2s;}
.clickable-word:hover { color: #1976d2; border-bottom-color: #1976d2; background: #e3f2fd; border-radius: 4px;}
.clickable-word.active-word { color: #e65100; font-weight: bold; background: #ffe0b2; border-bottom: none; border-radius: 4px; padding: 0 2px;}

.control-panel { background: #f8f9fa; border: 2px solid #cfd8dc; border-radius: 16px; padding: 20px; text-align: center;}
.target-display { background: white; padding: 15px; border-radius: 12px; border: 1px solid #ddd; margin-bottom: 15px; min-height: 80px; display: flex; flex-direction: column; justify-content: center;}
.target-display.placeholder { color: #999; font-style: italic; }
.target-type { font-size: 0.85rem; color: #666; font-weight: bold; margin-bottom: 5px;}
.target-text { font-size: 1.5rem; font-weight: bold; color: #1565c0; word-break: break-word;}

.action-buttons { display: flex; gap: 15px; justify-content: center; margin-bottom: 15px;}
.action-btn { flex: 1; padding: 15px; border-radius: 12px; font-size: 1.2rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.2); transition: 0.1s;}
.action-btn:active { transform: translateY(4px); box-shadow: none;}
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 0 4px 0 rgba(0,0,0,0.2);}
.play-btn { background: #4caf50; color: white; box-shadow: 0 4px 0 #388e3c;}
.mic-btn { background: #2196f3; color: white; box-shadow: 0 4px 0 #1565c0;}
.mic-btn.recording { background: #f44336; animation: pulse 1s infinite; box-shadow: 0 4px 0 #c62828;}

.result-box { background: white; border: 2px dashed #ccc; padding: 15px; border-radius: 12px; margin-bottom: 15px; animation: popIn 0.3s ease;}
.transcript { margin: 0 0 10px 0; color: #555; }
.transcript strong { color: #333; font-size: 1.2rem;}
.eval-result { font-weight: bold; font-size: 1.3rem; padding: 10px; border-radius: 8px;}
.eval-result.good { background: #e8f5e9; color: #2e7d32;}
.eval-result.bad { background: #ffebee; color: #c62828;}

.end-btn { width: 100%; background: transparent; border: 2px solid #e53935; color: #e53935; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.end-btn:hover { background: #ffebee;}

.end-home-btn { display: inline-block; background: #ff9800; color: white; font-weight: bold; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-size: 1.2rem; margin-top: 20px;}

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>