<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Supabase & Routing
const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

// Game State
const isLoading = ref(true);
const vocabList = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const lives = ref(3);
const isGameOver = ref(false);
const gameMode = ref(''); // 'A' (Basic) or 'B' (Advanced Voice)
const permissionGranted = ref(false);
const permissionError = ref('');

// Physics, Ghosts & Wand State
let gameLoop = null;
let spawnInterval = null;
const ghosts = ref([]);
let ghostIdCounter = 0;
const isFiring = ref(false);
const hitFeedback = ref(''); // 'correct', 'wrong', 'miss', ''

// Sensor State
let lastShakeTime = 0;
const SWING_THRESHOLD = 15; // 揮動加速度門檻

// Speech Recognition (Mode B)
let recognition = null;
const isSpellCharged = ref(false);
const recognizedText = ref('');

// Audio setup
const playSound = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (type === 'fire') {
    // 咻！魔法發射聲
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } else if (type === 'correct') {
    // 叮咚！擊中正解
    osc.type = 'square'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } else if (type === 'wrong') {
    // 嗡！擊中錯字
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } else if (type === 'charge') {
    // 嗡嗡嗡...魔杖充能聲
    osc.type = 'triangle'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  }
};

const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// Initialize
onMounted(async () => {
  const { version, volume, unit } = route.query;
  if (!version || !volume || !unit) {
    alert("缺少單元資訊，返回首頁！");
    router.push('/');
    return;
  }
  const { data, error } = await supabase.from('vocabularies')
    .select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
    
  if (error || !data || data.length === 0) {
    alert("載入單字失敗！");
    router.push('/');
    return;
  }
  
  // 為了語音辨識與畫面整潔，過濾掉片語，只保留純單字
  const filteredData = data.filter(item => /^[a-zA-Z]+$/.test(item.en_us.trim()));
  
  if (filteredData.length === 0) {
    alert("本單元沒有適合的單字（可能全是片語）！");
    router.push('/');
    return;
  }

  vocabList.value = filteredData.sort(() => Math.random() - 0.5);
  isLoading.value = false;
});

const currentVocab = computed(() => vocabList.value[currentIndex.value] || {});

// Permission handling
const requestPermission = async (mode) => {
  gameMode.value = mode;
  
  // 如果是進階版，初始化語音辨識
  if (mode === 'B') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      permissionError.value = "您的瀏覽器不支援語音辨識，請使用 Chrome 或 Safari，或改玩基本版！";
      gameMode.value = '';
      return;
    }
    
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript.toLowerCase() + ' ';
      }
      recognizedText.value = transcript.trim();
      
      const targetWord = currentVocab.value.en_us.trim().toLowerCase();
      // 如果唸出的句子中包含目標單字，且尚未充能
      if (recognizedText.value.includes(targetWord) && !isSpellCharged.value) {
        isSpellCharged.value = true;
        playSound('charge');
        vibrate([50, 50, 100]);
      }
    };

    recognition.onend = () => {
      if (!isGameOver.value && gameMode.value === 'B') recognition.start();
    };
    recognition.start();
  }

  // 請求動作感測器權限 (iOS 13+)
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const permissionState = await DeviceMotionEvent.requestPermission();
      if (permissionState === 'granted') {
        permissionGranted.value = true;
        startGame();
      } else {
        permissionError.value = "需要動作感測器權限才能揮動魔杖！";
        if (recognition) recognition.stop();
        gameMode.value = '';
      }
    } catch (e) {
      permissionError.value = "授權發生錯誤：" + e.message;
      if (recognition) recognition.stop();
      gameMode.value = '';
    }
  } else {
    permissionGranted.value = true;
    startGame();
  }
};

const startGame = () => {
  window.addEventListener('devicemotion', handleMotion, false);
  
  // 開始生成幽靈與遊戲迴圈
  spawnInterval = setInterval(spawnGhost, 1500);
  gameLoop = requestAnimationFrame(updatePhysics);
};

const spawnGhost = () => {
  if (isGameOver.value || isFiring.value) return;
  
  // 35% 機率出正確的單字
  const isCorrect = Math.random() < 0.35;
  let word = '';
  
  if (isCorrect) {
    word = currentVocab.value.en_us.trim();
  } else {
    let wrongWords = vocabList.value.filter(v => v.en_us.trim() !== currentVocab.value.en_us.trim());
    if(wrongWords.length > 0) {
      word = wrongWords[Math.floor(Math.random() * wrongWords.length)].en_us.trim();
    } else {
      word = currentVocab.value.en_us.trim();
    }
  }

  const startLeft = Math.random() > 0.5;
  ghosts.value.push({
    id: ghostIdCounter++,
    text: word,
    x: startLeft ? -20 : 120, // 起始位置 (vw)
    y: 20 + Math.random() * 50, // 高度 (vh)
    speed: (startLeft ? 1 : -1) * (0.2 + Math.random() * 0.4), // 隨機速度
    isCorrect: isCorrect
  });
};

const updatePhysics = () => {
  if (isGameOver.value) return;

  ghosts.value.forEach(g => { g.x += g.speed; });
  // 移除飛出畫面的幽靈
  ghosts.value = ghosts.value.filter(g => g.x > -30 && g.x < 130);

  gameLoop = requestAnimationFrame(updatePhysics);
};

const handleMotion = (event) => {
  const acc = event.acceleration; // 不含重力的加速度
  if (!acc.x && !acc.y && !acc.z) return;

  // 計算三軸總加速度向量
  const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

  if (magnitude > SWING_THRESHOLD) {
    const now = Date.now();
    if (now - lastShakeTime > 800) { // 揮動冷卻時間 0.8 秒
      lastShakeTime = now;
      handleSwing();
    }
  }
};

const handleSwing = () => {
  if (isGameOver.value || isFiring.value) return;

  if (gameMode.value === 'B' && !isSpellCharged.value) {
    // 進階版：未詠唱就揮動
    hitFeedback.value = 'need-spell';
    setTimeout(() => hitFeedback.value = '', 1000);
    playSound('wrong');
    vibrate(200);
    return;
  }

  fireMagic();
};

const fireMagic = () => {
  isFiring.value = true;
  playSound('fire');
  vibrate(100);

  // 尋找在準心附近 (35vw ~ 65vw) 的幽靈
  const hitIndex = ghosts.value.findIndex(g => g.x > 35 && g.x < 65);

  if (hitIndex !== -1) {
    const hitGhost = ghosts.value[hitIndex];
    if (hitGhost.isCorrect) {
      hitFeedback.value = 'correct';
      playSound('correct'); vibrate([100, 50, 100]);
      score.value += 10;
      ghosts.value.splice(hitIndex, 1); // 擊殺幽靈
      
      setTimeout(() => {
        hitFeedback.value = '';
        nextQuestion();
      }, 1000);
      
    } else {
      hitFeedback.value = 'wrong';
      playSound('wrong'); vibrate([300]);
      lives.value -= 1;
      ghosts.value.splice(hitIndex, 1);
      
      setTimeout(() => {
        hitFeedback.value = '';
        isFiring.value = false;
        if (lives.value <= 0) endGame();
      }, 1000);
    }
  } else {
    // 沒打中任何東西
    hitFeedback.value = 'miss';
    setTimeout(() => {
      hitFeedback.value = '';
      isFiring.value = false;
    }, 500);
  }
  
  // 消耗掉充能
  if (gameMode.value === 'B') isSpellCharged.value = false;
};

// 網頁測試用按鈕
const manualFire = () => handleSwing();
const manualCharge = () => { isSpellCharged.value = true; playSound('charge'); };

const nextQuestion = () => {
  currentIndex.value++;
  isSpellCharged.value = false;
  recognizedText.value = '';
  isFiring.value = false;
  ghosts.value = []; // 清空畫面上的幽靈
  
  if (currentIndex.value >= vocabList.value.length) {
    endGame();
  }
};

const endGame = () => {
  uploadRecord('霍格華茲單字杖');
  isGameOver.value = true;
  cancelAnimationFrame(gameLoop);
  clearInterval(spawnInterval);
  window.removeEventListener('devicemotion', handleMotion);
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
  }
};

onUnmounted(() => {
  endGame();
});


// ==========================================
// 🌟 核心紀錄與對錯分析引擎 (純淨優化版)
// ==========================================
const studentCookie = useCookie('currentStudent');
const gameStartTime = Date.now();
const correctWordsList = ref([]);
const wrongWordsSet = ref(new Set());

const uploadRecord = async (gameName) => {
  const student = studentCookie.value || {};
  if (!student.id) return;
  
  try {
    let userIp = 'Unknown'; 
    try { 
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      userIp = data.ip; 
    } catch (e) {
      console.log('無法取得 IP');
    }
    
    await supabase.from('game_records').insert([{ 
      student_id: student.id, 
      real_name: student.real_name || student.name,
      class_name: student.class, 
      version: route.query.version,
      volume: route.query.volume, 
      unit_played: route.query.unit,
      game_type: gameName, 
      score: Math.round(score.value),
      time_taken_seconds: Math.round((Date.now() - gameStartTime) / 1000),
      correct_words: correctWordsList.value.join(', '),
      wrong_words: Array.from(wrongWordsSet.value).join(', '),
      device_info: navigator.userAgent, 
      ip_address: userIp,
      is_anon: student.isAnon || false, 
      browser_id: student.browserId || 'unknown'
    }]);

    if (!student.isAnon) {
      const { data: currentData } = await supabase.from('students').select('points').eq('id', student.id).single();
      if (currentData) {
        await supabase.from('students').update({ 
          points: currentData.points + Math.round(score.value) 
        }).eq('id', student.id);
      }
    }
  } catch(err) { 
    console.error('成績上傳失敗', err); 
  }
};
// ==========================================
</script>

<template>
  <div class="magic-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回</NuxtLink>
      <div class="stats">
        <span class="lives">❤️ x {{ lives }}</span>
        <span class="score-board">分數: {{ score }}</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">載入中...</div>

    <div v-else-if="!gameMode" class="intro-screen">
      <h1>🪄 霍格華茲單字杖</h1>
      <p>請選擇施法模式，並允許動作感測器權限。</p>
      
      <div class="mode-cards">
        <div class="mode-card" @click="requestPermission('A')">
          <h2>🅰️ 基本版：無聲施法</h2>
          <p>看著上方中文提示。當正確的英文幽靈飛過中央準心時，<b>向前揮動手機</b>發射魔法擊落它！</p>
        </div>
        <div class="mode-card advanced" @click="requestPermission('B')">
          <h2>🅱️ 進階版：詠唱咒語 🎙️</h2>
          <p>請先對著手機唸出正確的單字來<b>「充能」</b>魔杖，魔杖發光後，再揮動手機擊落幽靈！</p>
        </div>
      </div>
      <p v-if="permissionError" class="error">{{ permissionError }}</p>
    </div>

    <div v-else-if="!isGameOver" class="game-screen" :class="{ 'flash-correct': hitFeedback === 'correct', 'flash-wrong': hitFeedback === 'wrong' }">
      
      <div class="hud-top">
        <div class="target-zh">🔮 目標：{{ currentVocab.zh_tw }}</div>
        
        <div v-if="gameMode === 'B'" class="wand-status" :class="{ 'charged': isSpellCharged }">
          <div class="wand-icon">🪄</div>
          <div class="status-text">{{ isSpellCharged ? '✨ 魔杖已充能！快揮動！' : '🎙️ 請唸出單字充能...' }}</div>
          <div class="speech-debug" v-if="!isSpellCharged">辨識結果: {{ recognizedText || '...' }}</div>
        </div>
      </div>

      <div class="crosshair" :class="{ 'firing': isFiring }">
        <div class="cross-line vertical"></div>
        <div class="cross-line horizontal"></div>
        <div class="center-dot"></div>
      </div>

      <div class="play-area">
        <div v-for="ghost in ghosts" :key="ghost.id" class="ghost" :style="{ left: ghost.x + 'vw', top: ghost.y + 'vh' }">
          👻 <br> <span class="ghost-word">{{ ghost.text }}</span>
        </div>
      </div>

      <transition name="fade">
        <div v-if="hitFeedback" class="feedback-msg" :class="hitFeedback">
          {{ hitFeedback === 'correct' ? '✨ 擊中正解！' : hitFeedback === 'wrong' ? '❌ 打錯隻了！' : hitFeedback === 'need-spell' ? '⚠️ 尚未詠唱咒語！' : '💨 沒打中...' }}
        </div>
      </transition>

      <div class="pc-controls">
        <button v-if="gameMode === 'B'" @click="manualCharge">🎙️ (測試)模擬詠唱充能</button>
        <button @click="manualFire" :disabled="isFiring">🪄 (測試)點此模擬揮動</button>
      </div>
    </div>

    <div v-else class="result-screen">
      <h1>🎉 施法訓練結束！</h1>
      <h2 v-if="lives <= 0" style="color: #ff5252;">💔 愛心用盡了！</h2>
      <h2>總得分：{{ score }}</h2>
      <NuxtLink to="/" class="action-btn">回首頁挑戰其他遊戲</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.magic-container {
  max-width: 800px; margin: 0 auto; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif;
  text-align: center; background: #121212; color: #fff; min-height: 100vh; overflow: hidden; position: relative;
}
.header { display: flex; justify-content: space-between; align-items: center; padding: 20px; z-index: 100; position: relative;}
.back-btn { text-decoration: none; font-weight: bold; color: #b39ddb; border: 2px solid #b39ddb; padding: 5px 10px; border-radius: 8px; }
.stats { display: flex; gap: 15px; font-size: 1.2rem; font-weight: bold; }
.lives { color: #ff5252; }
.score-board { background: #311b92; padding: 5px 15px; border-radius: 20px; color: #b39ddb; border: 2px solid #5e35b1;}

h1 { color: #b39ddb; font-size: 2.2rem; text-shadow: 0 0 10px #7e57c2; margin-bottom: 10px;}
.error { color: #ff5252; font-weight: bold; margin-top: 15px; }

.intro-screen p { font-size: 1.1rem; color: #d1c4e9; margin-bottom: 20px;}
.mode-cards { display: flex; flex-direction: column; gap: 15px; padding: 0 20px; }
.mode-card {
  background: #212121; border: 3px solid #5e35b1; border-radius: 12px; padding: 20px;
  cursor: pointer; box-shadow: 0 4px 0 #4527a0; transition: 0.1s; color: #ede7f6;
}
.mode-card.advanced { border-color: #fbc02d; box-shadow: 0 4px 0 #f57f17; }
.mode-card.advanced h2 { color: #fff59d; }
.mode-card:active { transform: translateY(4px); box-shadow: none; }
.mode-card h2 { margin: 0 0 10px 0; color: #b39ddb; }

.game-screen { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; transition: background 0.3s;}
.game-screen.flash-correct { background: rgba(76, 175, 80, 0.3); }
.game-screen.flash-wrong { background: rgba(244, 67, 54, 0.3); }

.hud-top { position: absolute; top: 80px; width: 100%; z-index: 50; display: flex; flex-direction: column; align-items: center; gap: 10px;}
.target-zh {
  font-size: 2rem; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6);
  padding: 10px 30px; border-radius: 50px; border: 2px solid #b39ddb; box-shadow: 0 0 15px #7e57c2;
}

.wand-status { background: rgba(0,0,0,0.8); border: 2px solid #555; border-radius: 12px; padding: 10px; width: 80%; transition: 0.3s; }
.wand-status.charged { border-color: #ffeb3b; box-shadow: 0 0 20px #fbc02d; background: rgba(255,235,59,0.2); }
.wand-icon { font-size: 2rem; animation: float 2s infinite ease-in-out; }
.status-text { font-weight: bold; color: #ccc; margin-top: 5px; }
.charged .status-text { color: #fff59d; text-shadow: 0 0 5px #ffeb3b; }
.speech-debug { font-size: 0.8rem; color: #888; margin-top: 5px; }

/* 準心 */
.crosshair {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 100px; height: 100px; border: 2px dashed rgba(255,255,255,0.3); border-radius: 50%;
  z-index: 40; transition: 0.1s;
}
.crosshair.firing { border-color: #ffeb3b; border-style: solid; box-shadow: 0 0 30px #fbc02d; transform: translate(-50%, -50%) scale(1.2); }
.cross-line { position: absolute; background: rgba(255,255,255,0.5); }
.crosshair.firing .cross-line { background: #ffeb3b; }
.vertical { width: 2px; height: 120px; top: -10px; left: 49px; }
.horizontal { width: 120px; height: 2px; top: 49px; left: -10px; }
.center-dot { position: absolute; top: 46px; left: 46px; width: 8px; height: 8px; background: red; border-radius: 50%; box-shadow: 0 0 10px red;}

/* 幽靈 */
.play-area { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 30;}
.ghost { position: absolute; font-size: 3rem; text-align: center; animation: float 3s infinite ease-in-out alternate; text-shadow: 0 0 10px rgba(255,255,255,0.8);}
.ghost-word { font-size: 1.5rem; font-weight: bold; color: #fff; background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 8px; display: block; margin-top: -10px;}

.feedback-msg {
  position: absolute; top: 60%; left: 50%; transform: translate(-50%, -50%);
  font-size: 2.5rem; font-weight: 900; z-index: 100; text-shadow: 0 0 20px #000;
}
.feedback-msg.correct { color: #69f0ae; }
.feedback-msg.wrong { color: #ff5252; }
.feedback-msg.need-spell { color: #ffd54f; font-size: 2rem;}
.feedback-msg.miss { color: #9e9e9e; font-size: 2rem;}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.pc-controls { position: absolute; bottom: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 100; width: 100%; align-items: center;}
.pc-controls button { background: rgba(255,255,255,0.2); border: 1px solid #fff; color: #fff; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 1rem; width: 80%;}
.pc-controls button:disabled { opacity: 0.5; }

.action-btn {
  background: #673ab7; color: #fff; font-size: 1.2rem; font-weight: bold;
  border: 3px solid #5e35b1; padding: 15px 30px; border-radius: 50px; cursor: pointer;
  box-shadow: 0 5px 0 #4527a0; transition: 0.1s; display: inline-block; text-decoration: none; margin-top: 20px;
}
.action-btn:active { transform: translateY(5px); box-shadow: none; }

.result-screen { position: relative; z-index: 100; padding-top: 100px; }

@keyframes float { 0% { transform: translateY(0); } 100% { transform: translateY(-20px); } }
</style>