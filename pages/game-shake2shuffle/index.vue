<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Supabase & Routing
const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

// 🌟 預先暫存單元資訊
const qVersion = route.query.version;
const qVolume = route.query.volume;
const qUnit = route.query.unit;

// Game State
const isLoading = ref(true);
const vocabList = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const isGameOver = ref(false);
const gameMode = ref(''); 
const permissionGranted = ref(false);
const permissionError = ref('');

// Shake & Sensor data
let lastX = null, lastY = null, lastZ = null;
const SHAKE_THRESHOLD = 25; 
let lastShakeTime = 0;
const isShakingAllowed = ref(false); 

const currentScrambled = ref([]);
const currentRandomWord = ref('');

// ==========================================
// 🌟 核心紀錄與對錯分析引擎
// ==========================================
const studentCookie = useCookie('currentStudent');
const gameStartTime = Date.now();
const correctWordsList = ref([]);
const wrongWordsSet = ref(new Set());

const uploadRecord = async (gameName) => {
  const student = studentCookie.value || {};
  if (!student.id) return;
  
  try {
    await supabase.from('game_records').insert([{ 
      student_id: student.id, 
      real_name: student.real_name || student.name,
      class_name: student.class || '未分班', 
      version: qVersion, // 🌟 使用變數
      volume: qVolume, 
      unit_played: qUnit,
      game_type: gameName, 
      score: Math.round(score.value),
      time_taken_seconds: Math.round((Date.now() - gameStartTime) / 1000),
      correct_words: correctWordsList.value.join(', '),
      wrong_words: Array.from(wrongWordsSet.value).join(', '),
      device_info: navigator.userAgent,
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

// Audio setup
const playSound = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (type === 'correct') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'wrong') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } else if (type === 'shake') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(200, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  }
};

const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// Initialize
onMounted(async () => {
  if (!qVersion || !qVolume || !qUnit) {
    alert("缺少單元資訊，返回首頁！");
    router.push('/');
    return;
  }
  const { data, error } = await supabase.from('vocabularies')
    .select('*').eq('version', qVersion).eq('volume', qVolume).eq('unit', qUnit);
    
  if (error || !data || data.length === 0) {
    alert("載入單字失敗！");
    router.push('/');
    return;
  }
  
  const filteredData = data.filter(item => /^[a-zA-Z]+$/.test(item.en_us.trim()));
  if (filteredData.length === 0) {
    alert("本單元沒有適合搖搖杯的單字！");
    router.push('/');
    return;
  }

  vocabList.value = filteredData.sort(() => Math.random() - 0.5);
  isLoading.value = false;
});

const currentVocab = computed(() => vocabList.value[currentIndex.value] || {});

const requestPermission = async (mode) => {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const permissionState = await DeviceMotionEvent.requestPermission();
      if (permissionState === 'granted') {
        permissionGranted.value = true;
        startGame(mode);
      } else {
        permissionError.value = "需要動作感測器權限才能遊玩！";
      }
    } catch (e) {
      permissionError.value = "授權發生錯誤：" + e.message;
    }
  } else {
    permissionGranted.value = true;
    startGame(mode);
  }
};

const startGame = (mode) => {
  gameMode.value = mode;
  setupCurrentWord();
  window.addEventListener('devicemotion', handleMotion, false);
  isShakingAllowed.value = false;
  setTimeout(() => { isShakingAllowed.value = true; }, 1000);
};

const handleMotion = (event) => {
  if (!isShakingAllowed.value) return; 
  const current = event.accelerationIncludingGravity;
  if (!current.x && !current.y && !current.z) return;

  if (lastX !== null) {
    const deltaX = Math.abs(lastX - current.x);
    const deltaY = Math.abs(lastY - current.y);
    const deltaZ = Math.abs(lastZ - current.z);

    if (deltaX + deltaY + deltaZ > SHAKE_THRESHOLD) {
      const now = Date.now();
      if (now - lastShakeTime > 300) { 
        lastShakeTime = now;
        onShake();
      }
    }
  }
  lastX = current.x; lastY = current.y; lastZ = current.z;
};

const onShake = () => {
  playSound('shake');
  vibrate(50);
  const correctWord = currentVocab.value.en_us.trim();

  if (gameMode.value === 'A') {
    currentScrambled.value = currentScrambled.value.sort(() => Math.random() - 0.5);
  } else if (gameMode.value === 'B') {
    const isCorrectNext = Math.random() < 0.25;
    if (isCorrectNext) {
      currentRandomWord.value = correctWord;
    } else {
      let wrongWords = vocabList.value.filter(v => v.en_us.trim() !== correctWord && v.en_us.trim() !== currentRandomWord.value);
      if (wrongWords.length === 0) wrongWords = vocabList.value.filter(v => v.en_us.trim() !== correctWord);
      
      if (wrongWords.length > 0) {
        currentRandomWord.value = wrongWords[Math.floor(Math.random() * wrongWords.length)].en_us.trim();
      } else {
        currentRandomWord.value = correctWord; 
      }
    }
  }
};

const setupCurrentWord = () => {
  if (currentIndex.value >= vocabList.value.length) {
    endGame();
    return;
  }
  const correctWord = currentVocab.value.en_us.trim();
  
  if (gameMode.value === 'A') {
    let scrambled = correctWord.split('').sort(() => Math.random() - 0.5);
    while(scrambled.join('') === correctWord && correctWord.length > 1) scrambled = correctWord.split('').sort(() => Math.random() - 0.5);
    currentScrambled.value = scrambled;
  } else if (gameMode.value === 'B') {
    let wrongWords = vocabList.value.filter(v => v.en_us.trim() !== correctWord);
    if (wrongWords.length > 0) {
      currentRandomWord.value = wrongWords[Math.floor(Math.random() * wrongWords.length)].en_us.trim();
    } else {
      currentRandomWord.value = "SHAKE_ME";
    }
  }
};

const checkAnswerA = () => {
  const userWord = currentScrambled.value.join('');
  const correctWord = currentVocab.value.en_us.trim();

  if (userWord === correctWord) {
    playSound('correct'); vibrate([100, 50, 100]);
    score.value += 10;
    correctWordsList.value.push(correctWord); 
    nextWord();
  } else {
    playSound('wrong'); vibrate([300]);
    wrongWordsSet.value.add(correctWord); 
    alert("❌ 拼字錯誤！請繼續搖晃手機重新洗牌！");
  }
};

const checkAnswerB = () => {
  const correctWord = currentVocab.value.en_us.trim();

  if (currentRandomWord.value === correctWord) {
    playSound('correct'); vibrate([100, 50, 100]);
    score.value += 10;
    correctWordsList.value.push(correctWord); 
    nextWord();
  } else {
    playSound('wrong'); vibrate([300]);
    wrongWordsSet.value.add(correctWord); 
    alert(`❌ 抓錯囉！你抓到的是 ${currentRandomWord.value}\n正確單字是：${correctWord}`);
    nextWord();
  }
};

const manualShake = () => {
  isShakingAllowed.value = true;
  onShake();
};

const nextWord = () => {
  isShakingAllowed.value = false;
  currentIndex.value++;
  setupCurrentWord();
  setTimeout(() => { isShakingAllowed.value = true; }, 800);
};

const endGame = async () => {
  isGameOver.value = true;
  window.removeEventListener('devicemotion', handleMotion);
  await uploadRecord('單字搖搖杯'); // 🌟 加入 await 確保上傳
};

onUnmounted(() => {
  window.removeEventListener('devicemotion', handleMotion);
});
</script>

<template>
  <div class="shake-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div class="score-board">分數: {{ score }} / {{ vocabList.length * 10 }}</div>
    </div>

    <div v-if="isLoading" class="loading">載入中...</div>

    <div v-else-if="!gameMode" class="intro-screen">
      <h1>🧋 單字搖搖杯</h1>
      <p>請選擇你喜歡的體感玩法！<br><b>(注意：請雙手握緊手機，小心飛出！)</b></p>
      
      <div class="mode-cards">
        <div class="mode-card" @click="requestPermission('A')">
          <h2>🅰️ 字母搖搖杯</h2>
          <p>看著中文，用力搖晃手機把打亂的字母「搖」回正確的順序！</p>
        </div>
        <div class="mode-card" @click="requestPermission('B')">
          <h2>🅱️ 命運單字卡</h2>
          <p>看著中文，搖晃手機切換字卡。看到正確單字的瞬間，趕快抓住它！</p>
        </div>
      </div>
      <p v-if="permissionError" class="error">{{ permissionError }}</p>
    </div>

    <div v-else-if="!isGameOver" class="game-screen">
      <div class="progress">進度：{{ currentIndex + 1 }} / {{ vocabList.length }}</div>
      
      <div class="target-zh">{{ currentVocab.zh_tw }}</div>

      <div v-if="gameMode === 'A'" class="mode-a">
        <p class="instruction" :class="{ 'disabled-shake': !isShakingAllowed }">
          {{ isShakingAllowed ? '📳 搖晃手機重新排列字母 📳' : '⏳ 準備中...' }}
        </p>
        <div class="letter-container">
          <span v-for="(char, idx) in currentScrambled" :key="idx" class="letter-box">{{ char }}</span>
        </div>
        <button class="action-btn" @click="checkAnswerA">🔒 鎖定答案</button>
      </div>

      <div v-if="gameMode === 'B'" class="mode-b">
        <p class="instruction" :class="{ 'disabled-shake': !isShakingAllowed }">
          {{ isShakingAllowed ? '📳 搖晃手機切換單字 📳' : '⏳ 準備中...' }}
        </p>
        <div class="flashcard">
          {{ currentRandomWord }}
        </div>
        <button class="action-btn grab-btn" @click="checkAnswerB">✋ 抓住它！</button>
      </div>

      <button class="test-shake-btn" @click="manualShake">💻 電腦版點此模擬搖晃</button>
    </div>

    <div v-else class="result-screen">
      <h1>🎉 挑戰完成！</h1>
      <h2>總得分：{{ score }}</h2>
      <NuxtLink to="/" class="action-btn">回首頁挑戰其他遊戲</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.shake-container {
  max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif;
  text-align: center; background: #fffde7; min-height: 100vh;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { text-decoration: none; font-weight: bold; color: #d84315; border: 2px solid #d84315; padding: 5px 10px; border-radius: 8px; }
.score-board { font-size: 1.2rem; font-weight: bold; background: #ffe082; padding: 5px 15px; border-radius: 20px; color: #e65100; border: 2px solid #ffb300;}

h1 { color: #e65100; font-size: 2.2rem; text-shadow: 2px 2px 0px #ffe0b2; margin-bottom: 10px;}
.error { color: red; font-weight: bold; margin-top: 15px; }

.intro-screen p { font-size: 1.1rem; color: #5d4037; }
.mode-cards { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
.mode-card {
  background: #fff; border: 3px solid #ffb300; border-radius: 12px; padding: 20px;
  cursor: pointer; box-shadow: 0 4px 0 #ffca28; transition: 0.1s;
}
.mode-card:active { transform: translateY(4px); box-shadow: none; }
.mode-card h2 { margin: 0 0 10px 0; color: #f57c00; }

.game-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh;}
.progress { font-weight: bold; color: #795548; margin-bottom: 10px; }
.target-zh { font-size: 2.5rem; font-weight: 900; color: #3e2723; margin-bottom: 30px; }
.instruction { font-size: 1.2rem; color: #d84315; animation: pulse 1.5s infinite; font-weight: bold; transition: 0.3s;}
.disabled-shake { color: #9e9e9e; animation: none; }

.letter-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 20px 0 40px 0; }
.letter-box { 
  font-size: 2.5rem; font-weight: bold; background: #fff; color: #1565c0;
  border: 3px solid #1976d2; border-radius: 12px; padding: 10px 20px;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.1); text-transform: uppercase;
}

.flashcard {
  font-size: 3.5rem; font-weight: bold; background: #fff; color: #2e7d32;
  border: 4px dashed #4caf50; border-radius: 20px; padding: 40px; margin: 20px 0 40px 0;
  min-width: 250px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); text-transform: lowercase;
}
.grab-btn { background: #4caf50 !important; border-color: #388e3c !important; box-shadow: 0 5px 0 #2e7d32 !important; }
.grab-btn:active { box-shadow: none !important; }

.action-btn {
  background: #ff9800; color: #fff; font-size: 1.5rem; font-weight: bold;
  border: 3px solid #f57c00; padding: 15px 40px; border-radius: 50px; cursor: pointer;
  box-shadow: 0 5px 0 #e65100; transition: 0.1s; text-decoration: none; display: inline-block;
}
.action-btn:active { transform: translateY(5px); box-shadow: none; }

.test-shake-btn { margin-top: 50px; background: transparent; border: 1px dashed #9e9e9e; color: #757575; padding: 5px 10px; cursor: pointer; border-radius: 6px;}

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
</style>
