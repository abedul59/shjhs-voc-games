<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('playing'); // playing, end
const score = ref(0);
const gameStartTime = ref(Date.now());
const masteredRules = ref(new Set()); // 記錄成功發音的規則

// 語音辨識相關
let recognition = null;
const isRecording = ref(false);
const transcript = ref('');
const evalResult = ref(null);

// 🔤 自然發音法 (Phonics) 基礎字群資料庫
const phonicsData = {
  shortVowels: [
    { rule: 'Short a (短母音 a)', letters: 'a', words: ['cat', 'bat', 'hat', 'map'] },
    { rule: 'Short e (短母音 e)', letters: 'e', words: ['bed', 'red', 'pen', 'net'] },
    { rule: 'Short i (短母音 i)', letters: 'i', words: ['pig', 'sit', 'win', 'lip'] },
    { rule: 'Short o (短母音 o)', letters: 'o', words: ['dog', 'hot', 'box', 'pot'] },
    { rule: 'Short u (短母音 u)', letters: 'u', words: ['sun', 'cup', 'bug', 'run'] }
  ],
  longVowels: [
    { rule: 'Long a (a_e)', letters: 'a_e', words: ['cake', 'bake', 'name', 'late'] },
    { rule: 'Long i (i_e)', letters: 'i_e', words: ['bike', 'time', 'five', 'nine'] },
    { rule: 'Long o (o_e)', letters: 'o_e', words: ['nose', 'home', 'bone', 'rope'] },
    { rule: 'Long u (u_e)', letters: 'u_e', words: ['cute', 'tube', 'mule', 'huge'] },
    { rule: 'Vowel Team (ee/ea)', letters: 'ee/ea', words: ['see', 'tree', 'sea', 'tea'] }
  ],
  consonantBlends: [
    { rule: 'sh (無聲氣音)', letters: 'sh', words: ['ship', 'shoe', 'fish', 'shop'] },
    { rule: 'ch (破擦音)', letters: 'ch', words: ['chat', 'chin', 'much', 'rich'] }, // 避開容易誤判的字
    { rule: 'th (咬舌音)', letters: 'th', words: ['thin', 'math', 'this', 'that'] },
    { rule: 'ck (短 k 音)', letters: 'ck', words: ['duck', 'sick', 'kick', 'back'] },
    { rule: 'L-blends', letters: 'bl/cl/fl', words: ['blue', 'clap', 'flag', 'play'] }
  ]
};

const currentTab = ref('shortVowels'); // shortVowels, longVowels, consonantBlends
const currentList = computed(() => phonicsData[currentTab.value]);
const selectedRule = ref(null);

onMounted(() => {
  if (!studentCookie.value || !studentCookie.value.id) {
    alert('請先登入！'); router.push('/'); return;
  }
});

const selectRule = (item) => {
  if (isRecording.value) return;
  selectedRule.value = item;
  transcript.value = '';
  evalResult.value = null;
};

const playAudio = async () => {
  if (!selectedRule.value) return;
  const words = selectedRule.value.words;
  
  for (let word of words) {
    const msg = new SpeechSynthesisUtterance(word);
    msg.lang = 'en-US';
    msg.rate = 0.85; // 稍微放慢速度
    window.speechSynthesis.speak(msg);
    await new Promise(resolve => {
        msg.onend = () => setTimeout(resolve, 500); // 單字間停頓 0.5 秒
    });
  }
};

const playTone = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  if (type === 'correct') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  } else if (type === 'partial') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
  } else {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
  }
  gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (type === 'wrong'?0.3:0.2));
  osc.start(); osc.stop(ctx.currentTime + (type === 'wrong'?0.3:0.2));
};

const startRecording = () => {
  if (!selectedRule.value) return alert('請先點選一個發音規則！');
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return alert('您的瀏覽器不支援語音辨識，建議使用 Chrome！');

  isRecording.value = true;
  transcript.value = ''; evalResult.value = null;

  recognition = new SpeechRec();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  // 允許較長的錄音時間以念完多個單字
  recognition.continuous = false; 

  recognition.onresult = (event) => {
    transcript.value = event.results[0][0].transcript.toLowerCase().replace(/[^a-z\s]/g, '');
    evaluateSpeech();
  };
  recognition.onerror = () => { isRecording.value = false; alert('沒聽清楚，請再試一次！'); };
  recognition.onend = () => { isRecording.value = false; };
  recognition.start();
};

const evaluateSpeech = () => {
  const spokenWords = transcript.value.split(/\s+/);
  const targetWords = selectedRule.value.words.map(w => w.toLowerCase());
  
  let matchCount = 0;
  let matchedWords = [];
  
  targetWords.forEach(tw => {
    if (spokenWords.includes(tw)) {
      matchCount++;
      matchedWords.push(tw);
    }
  });

  const accuracy = matchCount / targetWords.length;

  if (accuracy === 1) {
    playTone('correct');
    evalResult.value = { success: true, text: `Perfect! 完美命中全部單字！🎉 (+20pt)` };
    if (!masteredRules.value.has(selectedRule.value.letters)) {
      masteredRules.value.add(selectedRule.value.letters);
      score.value += 20;
    }
  } else if (accuracy > 0) {
    playTone('partial');
    evalResult.value = { success: true, text: `Good! 命中了 ${matchCount} 個單字 (${matchedWords.join(', ')})！ (+10pt)` };
    score.value += 10;
  } else {
    playTone('wrong');
    evalResult.value = { success: false, text: '再試一次！請看著單字慢慢念 💪' };
  }
};

const endGame = async () => {
  gameStatus.value = 'end';
  if (!studentCookie.value || !studentCookie.value.id) return;
  try {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch(e){}
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, real_name: studentCookie.value.real_name || studentCookie.value.name, class_name: studentCookie.value.class, 
      unit_played: '自然發音法特訓', game_type: '自然發音法初學/複習趣', score: score.value, time_taken_seconds: Math.round((Date.now() - gameStartTime.value) / 1000),
      correct_words: Array.from(masteredRules.value).map(s => `[${s}]`).join(', '),
      device_info: navigator.userAgent, ip_address: userIp, is_anon: studentCookie.value.isAnon || false, browser_id: studentCookie.value.browserId
    }]);
    if (!studentCookie.value.isAnon) {
      const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
      if (data) await supabase.from('students').update({ points: data.points + score.value }).eq('id', studentCookie.value.id);
    }
  } catch(err) { console.error('成績上傳失敗', err); }
};

onUnmounted(() => { 
    if (recognition) recognition.abort(); 
    window.speechSynthesis.cancel();
});
</script>

<template>
  <div class="phonics-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div v-if="gameStatus === 'playing'" class="score-board">得點：{{ score }} pt</div>
    </div>

    <div v-if="gameStatus === 'playing'" class="main-layout">
      <div class="left-panel retro-element">
        <h1 class="title">🔤 自然發音學霸</h1>
        <div class="tabs">
          <button :class="{ active: currentTab === 'shortVowels' }" @click="currentTab = 'shortVowels'">短母音</button>
          <button :class="{ active: currentTab === 'longVowels' }" @click="currentTab = 'longVowels'">長母音</button>
          <button :class="{ active: currentTab === 'consonantBlends' }" @click="currentTab = 'consonantBlends'">複合子音</button>
        </div>

        <div class="rules-list">
          <button v-for="item in currentList" :key="item.letters" 
                  class="rule-btn" 
                  :class="{ active: selectedRule?.letters === item.letters, mastered: masteredRules.has(item.letters) }"
                  @click="selectRule(item)">
            <span class="rule-name">{{ item.rule }}</span>
            <span v-if="masteredRules.has(item.letters)" class="check-icon">✅</span>
          </button>
        </div>
      </div>

      <div class="right-panel retro-element">
        <div v-if="selectedRule" class="practice-area">
          <div class="big-letters">{{ selectedRule.letters }}</div>
          
          <div class="word-family">
            <span v-for="word in selectedRule.words" :key="word" class="family-word">
                {{ word }}
            </span>
          </div>
          <p class="instruction">💡 提示：按 🔊 聽機器人連續朗讀，然後按 🎙️ 自己一口氣念出這些單字！</p>

          <div class="actions">
            <button class="action-btn play-btn" @click="playAudio">🔊 聽連讀示範</button>
            <button class="action-btn mic-btn" :class="{ recording: isRecording }" @click="startRecording">
              {{ isRecording ? '🎙️ 聆聽中...' : '🎙️ 我來連讀' }}
            </button>
          </div>

          <div v-if="transcript" class="result-box" :class="evalResult?.success ? 'success' : 'fail'">
            <p class="t-title">你念的是：</p>
            <p class="t-text"><strong>{{ transcript }}</strong></p>
            <p class="eval-msg">{{ evalResult?.text }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
          👉 請從左側點選一個自然發音規則開始練習！
        </div>
      </div>
    </div>

    <div v-else class="end-screen retro-element">
      <h1>🎉 恭喜完成自然發音特訓！</h1>
      <h2>總得分：{{ score }} pt</h2>
      <p>成功掌握了 {{ masteredRules.size }} 組發音字群！</p>
      <NuxtLink to="/" class="end-home-btn">返回首頁</NuxtLink>
    </div>

    <button v-if="gameStatus === 'playing'" class="end-btn" @click="endGame">🛑 結束特訓並上傳成績</button>
  </div>
</template>

<style scoped>
.phonics-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif; min-height: 100vh;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.score-board { font-size: 1.2rem; font-weight: bold; background: #fff8e1; padding: 5px 15px; border-radius: 20px; color: #f57f17; border: 2px solid #fbc02d;}

.main-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; }
@media (max-width: 768px) { .main-layout { grid-template-columns: 1fr; } }

.left-panel, .right-panel { background: white; padding: 20px; border-radius: 16px; border: 2px solid #cfd8dc; box-shadow: 0 4px 10px rgba(0,0,0,0.05);}
.title { font-size: 1.8rem; color: #2c3e50; margin-top: 0; text-align: center; border-bottom: 2px dashed #eee; padding-bottom: 10px;}

.tabs { display: flex; gap: 5px; margin-bottom: 15px; }
.tabs button { flex: 1; padding: 10px 5px; border: none; background: #e0e0e0; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 0.95rem;}
.tabs button.active { background: #673ab7; color: white; box-shadow: 0 3px 0 #512da8;}

.rules-list { display: flex; flex-direction: column; gap: 10px; }
.rule-btn { position: relative; padding: 15px; font-size: 1.1rem; font-weight: bold; text-align: left; background: #f5f5f5; border: 2px solid #ccc; border-radius: 12px; cursor: pointer; transition: 0.1s;}
.rule-btn:hover { background: #ede7f6; border-color: #7e57c2; }
.rule-btn.active { background: #f3e5f5; border-color: #9c27b0; color: #6a1b9a; transform: translateX(5px);}
.rule-btn.mastered { border-color: #4caf50; background: #e8f5e9; color: #2e7d32;}
.check-icon { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); font-size: 1.2rem; }

.practice-area { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;}
.big-letters { font-size: 4.5rem; font-weight: bold; color: #9c27b0; margin-bottom: 20px; text-shadow: 2px 2px 0px #f3e5f5;}

.word-family { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-bottom: 20px;}
.family-word { font-size: 2rem; font-weight: bold; color: #333; background: #fffde7; border: 2px dashed #fbc02d; padding: 10px 25px; border-radius: 12px; letter-spacing: 2px;}

.instruction { color: #e65100; font-weight: bold; margin-bottom: 20px; font-size: 1rem;}

.actions { display: flex; gap: 15px; width: 100%; margin-bottom: 20px;}
.action-btn { flex: 1; padding: 15px; border-radius: 12px; font-size: 1.2rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.2);}
.action-btn:active { transform: translateY(4px); box-shadow: none;}
.play-btn { background: #ff9800; color: white; box-shadow: 0 4px 0 #e65100;}
.mic-btn { background: #2196f3; color: white; box-shadow: 0 4px 0 #1565c0;}
.mic-btn.recording { background: #f44336; animation: pulse 1s infinite; box-shadow: 0 4px 0 #c62828;}

.result-box { width: 100%; padding: 15px; border-radius: 12px; border: 2px dashed #ccc; font-size: 1.1rem; animation: popIn 0.3s;}
.result-box.success { background: #e8f5e9; border-color: #4caf50; color: #2e7d32;}
.result-box.fail { background: #ffebee; border-color: #f44336; color: #c62828;}
.t-title { margin: 0 0 5px 0; font-size: 0.9rem; color: #666;}
.t-text { font-size: 1.3rem; margin: 0; word-break: break-word;}
.eval-msg { font-weight: bold; font-size: 1.2rem; margin: 10px 0 0 0;}

.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #999; font-weight: bold; font-style: italic;}
.end-btn { width: 100%; background: transparent; border: 2px solid #e53935; color: #e53935; padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.2rem; cursor: pointer; margin-top: 20px;}
.end-screen { text-align: center; padding: 50px; background: white; border-radius: 16px; border: 2px solid #ccc;}
.end-home-btn { display: inline-block; background: #ff9800; color: white; font-weight: bold; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-size: 1.2rem; margin-top: 20px;}

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>