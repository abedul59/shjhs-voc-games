<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('playing'); // playing, end
const score = ref(0);
const gameStartTime = ref(Date.now());
const masteredSymbols = ref(new Set()); // 記錄成功發音的音標

// 語音辨識相關
let recognition = null;
const isRecording = ref(false);
const transcript = ref('');
const evalResult = ref(null);

// 🔤 台灣標準 KK 音標與代表單字庫
const phoneticsData = {
  vowels: [
    { symbol: 'i', example: 'see', type: '長母音' }, { symbol: 'ɪ', example: 'sit', type: '短母音' },
    { symbol: 'e', example: 'say', type: '長母音' }, { symbol: 'ɛ', example: 'bed', type: '短母音' },
    { symbol: 'æ', example: 'cat', type: '短母音' }, { symbol: 'ɑ', example: 'father', type: '長母音' },
    { symbol: 'o', example: 'go', type: '長母音' }, { symbol: 'ɔ', example: 'dog', type: '短母音' },
    { symbol: 'u', example: 'too', type: '長母音' }, { symbol: 'ʊ', example: 'book', type: '短母音' },
    { symbol: 'ʌ', example: 'cup', type: '短母音' }, { symbol: 'ə', example: 'ago', type: '短母音' },
    { symbol: 'ɝ', example: 'bird', type: '捲舌母音' }, { symbol: 'ɚ', example: 'sister', type: '短捲舌' }
  ],
  diphthongs: [
    { symbol: 'aɪ', example: 'my', type: '雙母音' }, { symbol: 'aʊ', example: 'cow', type: '雙母音' },
    { symbol: 'ɔɪ', example: 'boy', type: '雙母音' }
  ],
  consonants: [
    { symbol: 'p', example: 'pig', type: '無聲子音' }, { symbol: 'b', example: 'boy', type: '有聲子音' },
    { symbol: 't', example: 'tea', type: '無聲子音' }, { symbol: 'd', example: 'dog', type: '有聲子音' },
    { symbol: 'k', example: 'cat', type: '無聲子音' }, { symbol: 'g', example: 'go', type: '有聲子音' },
    { symbol: 'f', example: 'fan', type: '無聲子音' }, { symbol: 'v', example: 'van', type: '有聲子音' },
    { symbol: 's', example: 'see', type: '無聲子音' }, { symbol: 'z', example: 'zoo', type: '有聲子音' },
    { symbol: 'θ', example: 'thin', type: '無聲子音' }, { symbol: 'ð', example: 'this', type: '有聲子音' },
    { symbol: 'ʃ', example: 'shoe', type: '無聲子音' }, { symbol: 'ʒ', example: 'vision', type: '有聲子音' },
    { symbol: 'tʃ', example: 'chair', type: '無聲子音' }, { symbol: 'dʒ', example: 'jump', type: '有聲子音' },
    { symbol: 'm', example: 'man', type: '鼻音' }, { symbol: 'n', example: 'no', type: '鼻音' },
    { symbol: 'ŋ', example: 'sing', type: '鼻音' }, { symbol: 'l', example: 'leg', type: '流音' },
    { symbol: 'r', example: 'red', type: '流音' }, { symbol: 'h', example: 'hat', type: '無聲子音' },
    { symbol: 'j', example: 'yes', type: '半母音' }, { symbol: 'w', example: 'we', type: '半母音' }
  ]
};

const currentTab = ref('vowels'); // vowels, diphthongs, consonants
const currentList = computed(() => phoneticsData[currentTab.value]);
const selectedTarget = ref(null);

onMounted(() => {
  if (!studentCookie.value || !studentCookie.value.id) {
    alert('請先登入！'); router.push('/'); return;
  }
});

const selectTarget = (item) => {
  if (isRecording.value) return;
  selectedTarget.value = item;
  transcript.value = '';
  evalResult.value = null;
  playAudio();
};

const playAudio = () => {
  if (!selectedTarget.value) return;
  const msg = new SpeechSynthesisUtterance();
  msg.text = selectedTarget.value.example;
  msg.lang = 'en-US';
  msg.rate = 0.8;
  window.speechSynthesis.speak(msg);
};

const playTone = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  if (type === 'correct') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  } else {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
  }
  gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (type === 'correct'?0.1:0.3));
  osc.start(); osc.stop(ctx.currentTime + (type === 'correct'?0.1:0.3));
};

const startRecording = () => {
  if (!selectedTarget.value) return alert('請先點選一個音標！');
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return alert('您的瀏覽器不支援語音辨識，建議使用 Chrome！');

  isRecording.value = true;
  transcript.value = ''; evalResult.value = null;

  recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    transcript.value = event.results[0][0].transcript.toLowerCase().replace(/[^a-z\s]/g, '');
    evaluateSpeech();
  };
  recognition.onerror = () => { isRecording.value = false; alert('沒聽清楚，請再試一次！'); };
  recognition.onend = () => { isRecording.value = false; };
  recognition.start();
};

const evaluateSpeech = () => {
  const targetWord = selectedTarget.value.example.toLowerCase();
  const spokenWords = transcript.value.split(' ');
  
  if (spokenWords.includes(targetWord) || transcript.value.includes(targetWord)) {
    playTone('correct');
    evalResult.value = { success: true, text: 'Perfect! 發音很標準！ 🎉' };
    if (!masteredSymbols.value.has(selectedTarget.value.symbol)) {
      masteredSymbols.value.add(selectedTarget.value.symbol);
      score.value += 10;
    }
  } else {
    playTone('wrong');
    evalResult.value = { success: false, text: '再試一次！注意發音部位喔 💪' };
  }
};

const endGame = async () => {
  gameStatus.value = 'end';
  if (!studentCookie.value || !studentCookie.value.id) return;
  try {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch(e){}
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, real_name: studentCookie.value.real_name || studentCookie.value.name, class_name: studentCookie.value.class, 
      unit_played: 'KK音標特訓', game_type: 'KK音標初學/複習趣', score: score.value, time_taken_seconds: Math.round((Date.now() - gameStartTime.value) / 1000),
      correct_words: Array.from(masteredSymbols.value).map(s => `[${s}]`).join(', '),
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
  <div class="kk-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div v-if="gameStatus === 'playing'" class="score-board">得點：{{ score }} pt</div>
    </div>

    <div v-if="gameStatus === 'playing'" class="main-layout">
      <div class="left-panel retro-element">
        <h1 class="title">🔤 KK音標學霸</h1>
        <div class="tabs">
          <button :class="{ active: currentTab === 'vowels' }" @click="currentTab = 'vowels'">單母音</button>
          <button :class="{ active: currentTab === 'diphthongs' }" @click="currentTab = 'diphthongs'">雙母音</button>
          <button :class="{ active: currentTab === 'consonants' }" @click="currentTab = 'consonants'">子音</button>
        </div>

        <div class="phonetics-grid">
          <button v-for="item in currentList" :key="item.symbol" 
                  class="phonetic-btn" 
                  :class="{ active: selectedTarget?.symbol === item.symbol, mastered: masteredSymbols.has(item.symbol) }"
                  @click="selectTarget(item)">
            <span class="symbol">[{{ item.symbol }}]</span>
            <span v-if="masteredSymbols.has(item.symbol)" class="check-icon">✅</span>
          </button>
        </div>
      </div>

      <div class="right-panel retro-element">
        <div v-if="selectedTarget" class="practice-area">
          <div class="type-badge">{{ selectedTarget.type }}</div>
          <div class="big-symbol">[{{ selectedTarget.symbol }}]</div>
          <div class="example-word">
            代表單字：<strong>{{ selectedTarget.example }}</strong>
          </div>

          <div class="actions">
            <button class="action-btn play-btn" @click="playAudio">🔊 聽發音</button>
            <button class="action-btn mic-btn" :class="{ recording: isRecording }" @click="startRecording">
              {{ isRecording ? '🎙️ 聆聽中...' : '🎙️ 我來念念看' }}
            </button>
          </div>

          <div v-if="transcript" class="result-box" :class="evalResult?.success ? 'success' : 'fail'">
            <p>你念的是：<strong>{{ transcript }}</strong></p>
            <p class="eval-msg">{{ evalResult?.text }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
          👉 請從左側點選一個音標開始練習！
        </div>
      </div>
    </div>

    <div v-else class="end-screen retro-element">
      <h1>🎉 恭喜完成音標特訓！</h1>
      <h2>總得分：{{ score }} pt</h2>
      <p>成功掌握了 {{ masteredSymbols.size }} 個音標！</p>
      <NuxtLink to="/" class="end-home-btn">返回首頁</NuxtLink>
    </div>

    <button v-if="gameStatus === 'playing'" class="end-btn" @click="endGame">🛑 結束特訓並上傳成績</button>
  </div>
</template>

<style scoped>
.kk-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif; min-height: 100vh;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.score-board { font-size: 1.2rem; font-weight: bold; background: #fff8e1; padding: 5px 15px; border-radius: 20px; color: #f57f17; border: 2px solid #fbc02d;}

.main-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .main-layout { grid-template-columns: 1fr; } }

.left-panel, .right-panel { background: white; padding: 20px; border-radius: 16px; border: 2px solid #cfd8dc; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
.title { font-size: 1.8rem; color: #2c3e50; margin-top: 0; text-align: center; border-bottom: 2px dashed #eee; padding-bottom: 10px;}

.tabs { display: flex; gap: 10px; margin-bottom: 15px; }
.tabs button { flex: 1; padding: 10px; border: none; background: #e0e0e0; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.tabs button.active { background: #4caf50; color: white; box-shadow: 0 3px 0 #388e3c;}

.phonetics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; }
.phonetic-btn { position: relative; padding: 15px 5px; font-size: 1.5rem; font-weight: bold; background: #f5f5f5; border: 2px solid #ccc; border-radius: 12px; cursor: pointer; transition: 0.1s;}
.phonetic-btn:hover { background: #e3f2fd; border-color: #2196f3; }
.phonetic-btn.active { background: #fff3e0; border-color: #ff9800; color: #e65100; transform: scale(1.05);}
.phonetic-btn.mastered { border-color: #4caf50; background: #e8f5e9; }
.check-icon { position: absolute; top: -8px; right: -8px; font-size: 1rem; }

.practice-area { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;}
.type-badge { background: #9c27b0; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin-bottom: 15px;}
.big-symbol { font-size: 5rem; font-weight: bold; color: #1976d2; margin-bottom: 10px;}
.example-word { font-size: 1.5rem; color: #555; margin-bottom: 30px;}
.example-word strong { color: #d84315; font-size: 2rem;}

.actions { display: flex; gap: 15px; width: 100%; margin-bottom: 20px;}
.action-btn { flex: 1; padding: 15px; border-radius: 12px; font-size: 1.2rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.2);}
.action-btn:active { transform: translateY(4px); box-shadow: none;}
.play-btn { background: #ff9800; color: white; box-shadow: 0 4px 0 #e65100;}
.mic-btn { background: #2196f3; color: white; box-shadow: 0 4px 0 #1565c0;}
.mic-btn.recording { background: #f44336; animation: pulse 1s infinite; box-shadow: 0 4px 0 #c62828;}

.result-box { width: 100%; padding: 15px; border-radius: 12px; border: 2px dashed #ccc; font-size: 1.1rem; animation: popIn 0.3s;}
.result-box.success { background: #e8f5e9; border-color: #4caf50; color: #2e7d32;}
.result-box.fail { background: #ffebee; border-color: #f44336; color: #c62828;}
.eval-msg { font-weight: bold; font-size: 1.3rem; margin: 10px 0 0 0;}

.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #999; font-weight: bold; font-style: italic;}
.end-btn { width: 100%; background: transparent; border: 2px solid #e53935; color: #e53935; padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.2rem; cursor: pointer; margin-top: 20px;}
.end-screen { text-align: center; padding: 50px; background: white; border-radius: 16px; border: 2px solid #ccc;}
.end-home-btn { display: inline-block; background: #ff9800; color: white; font-weight: bold; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-size: 1.2rem; margin-top: 20px;}

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>