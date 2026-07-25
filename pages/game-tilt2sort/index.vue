<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

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
const permissionGranted = ref(false);
const permissionError = ref('');

// Physics & Tilt State
const tiltX = ref(0); // -10 到 10 之間，代表傾斜程度
const itemX = ref(50); // 掉落物的 X 座標 (0-100%)
const itemY = ref(0);  // 掉落物的 Y 座標 (0-100%)
let gameLoop = null;
const isFalling = ref(false);

// Current Question State
const currentQuestion = ref('');
const leftAnswer = ref('');
const rightAnswer = ref('');
const correctAnswerSide = ref(''); // 'left' or 'right'

// Audio setup
const playSound = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (type === 'correct') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'wrong') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
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
    
  if (error || !data || data.length < 2) {
    alert("載入單字失敗，或單字量不足！");
    router.push('/');
    return;
  }
  
  // Shuffle words
  vocabList.value = data.sort(() => Math.random() - 0.5);
  isLoading.value = false;
});

// Permission handling for iOS 13+ (DeviceOrientationEvent for Tilt)
const requestPermission = async () => {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permissionState = await DeviceOrientationEvent.requestPermission();
      if (permissionState === 'granted') {
        permissionGranted.value = true;
        startGame();
      } else {
        permissionError.value = "需要陀螺儀權限才能遊玩！";
      }
    } catch (e) {
      permissionError.value = "授權發生錯誤：" + e.message;
    }
  } else {
    // Non-iOS 13+ devices or HTTP fallback
    permissionGranted.value = true;
    startGame();
  }
};

const startGame = () => {
  window.addEventListener('deviceorientation', handleOrientation, false);
  setupNextQuestion();
};

const handleOrientation = (event) => {
  // gamma is the left-to-right tilt in degrees, where right is positive
  let tilt = event.gamma; 
  if (tilt === null) return;
  
  // Limit tilt angle
  if (tilt > 45) tilt = 45;
  if (tilt < -45) tilt = -45;
  
  // Normalize to -5 to 5 for game speed
  tiltX.value = (tilt / 45) * 5; 
};

const setupNextQuestion = () => {
  if (currentIndex.value >= vocabList.value.length || lives.value <= 0) {
    endGame();
    return;
  }
  
  const correctItem = vocabList.value[currentIndex.value];
  currentQuestion.value = correctItem.zh_tw; // 掉落物是中文
  
  // 找一個錯誤的英文單字
  let wrongItem = vocabList.value[Math.floor(Math.random() * vocabList.value.length)];
  while (wrongItem.en_us === correctItem.en_us) {
    wrongItem = vocabList.value[Math.floor(Math.random() * vocabList.value.length)];
  }
  
  // 決定左右籃子誰是正確的
  if (Math.random() > 0.5) {
    leftAnswer.value = correctItem.en_us;
    rightAnswer.value = wrongItem.en_us;
    correctAnswerSide.value = 'left';
  } else {
    leftAnswer.value = wrongItem.en_us;
    rightAnswer.value = correctItem.en_us;
    correctAnswerSide.value = 'right';
  }
  
  // 重置掉落物位置
  itemX.value = 50; 
  itemY.value = 0;
  isFalling.value = true;
  
  // 啟動物理引擎
  gameLoop = setInterval(updatePhysics, 50);
};

const updatePhysics = () => {
  if (!isFalling.value) return;
  
  // 1. 往下掉
  itemY.value += 1.5; 
  
  // 2. 根據傾斜度左右平移
  itemX.value += tiltX.value;
  if (itemX.value < 5) itemX.value = 5;
  if (itemX.value > 95) itemX.value = 95;
  
  // 3. 判斷是否掉進籃子 (Y > 85 算進籃子)
  if (itemY.value >= 85) {
    clearInterval(gameLoop);
    isFalling.value = false;
    checkCollision();
  }
};

const checkCollision = () => {
  let userChoice = '';
  if (itemX.value < 50) {
    userChoice = 'left';
  } else {
    userChoice = 'right';
  }
  
  if (userChoice === correctAnswerSide.value) {
    playSound('correct'); vibrate([50]);
    score.value += 10;
  } else {
    playSound('wrong'); vibrate([300]);
    lives.value -= 1;
    alert(`❌ 掉錯籃子囉！正確答案在${correctAnswerSide.value === 'left' ? '左邊' : '右邊'}！`);
  }
  
  currentIndex.value++;
  setTimeout(setupNextQuestion, 500);
};

// 網頁測試用：按鈕控制
const tiltLeft = () => { tiltX.value = -3; };
const tiltRight = () => { tiltX.value = 3; };
const stopTilt = () => { tiltX.value = 0; };
const manualStart = () => { permissionGranted.value = true; startGame(); };

// 🌟 修正點：加上 async/await
const endGame = async () => {
  isGameOver.value = true;
  clearInterval(gameLoop);
  window.removeEventListener('deviceorientation', handleOrientation);
  await uploadRecord('單字天平');
};

onUnmounted(() => {
  clearInterval(gameLoop);
  window.removeEventListener('deviceorientation', handleOrientation);
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

    // 計算這是該單元的第幾次挑戰
    const { count } = await supabase.from('game_records')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('unit_played', route.query.unit)
      .eq('game_type', gameName);
    
    // 🌟 修正點：移除不屬於 game_records 的欄位，對齊標準存檔格式
    const { error } = await supabase.from('game_records').insert([{ 
      student_id: student.id, 
      game_type: gameName, 
      score: Math.round(score.value),
      time_taken_seconds: Math.round((Date.now() - gameStartTime) / 1000),
      version: route.query.version,
      volume: route.query.volume || '', 
      unit_played: route.query.unit,
      attempt_number: (count || 0) + 1,
      correct_words: correctWordsList.value.join(', '),
      wrong_words: Array.from(wrongWordsSet.value).join(', '),
      device_info: navigator.userAgent, 
      ip_address: userIp
    }]);

    if (error) {
      alert(`🚨 資料庫寫入失敗！請截圖給老師：\n${error.message}`);
      console.error("寫入錯誤:", error);
      return;
    }

    // 幫一般登入學生加總分
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
    alert(`🚨 發生未知的錯誤：\n${err.message}`);
  }
};
// ==========================================
</script>

<template>
  <div class="tilt-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div class="stats">
        <span class="lives">❤️ x {{ lives }}</span>
        <span class="score-board">分數: {{ score }}</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">載入中...</div>

    <div v-else-if="!permissionGranted" class="intro-screen">
      <h1>⚖️ 左右為難：單字天平</h1>
      <p>天上會掉下「中文意思」，<br>請像拿著平衡木一樣，<br><b>將手機向左或向右傾斜</b>，<br>讓單字滑進正確的英文籃子裡！</p>
      
      <button class="action-btn" @click="requestPermission">📱 手機版：點此開始 (需授權)</button>
      <button class="test-btn" @click="manualStart">💻 電腦版：點此開始測試</button>
      
      <p v-if="permissionError" class="error">{{ permissionError }}</p>
    </div>

    <div v-else-if="!isGameOver" class="game-screen">
      <div class="progress">進度：{{ currentIndex + 1 }} / {{ vocabList.length }}</div>
      
      <div class="play-area">
        <div class="falling-item" :style="{ left: itemX + '%', top: itemY + '%' }">
          {{ currentQuestion }}
        </div>
        
        <div class="basket left-basket">
          <div class="basket-label">{{ leftAnswer }}</div>
        </div>
        <div class="basket right-basket">
          <div class="basket-label">{{ rightAnswer }}</div>
        </div>
      </div>

      <div class="pc-controls">
        <button @mousedown="tiltLeft" @mouseup="stopTilt" @mouseleave="stopTilt" @touchstart="tiltLeft" @touchend="stopTilt">⬅️ 向左傾斜</button>
        <button @mousedown="tiltRight" @mouseup="stopTilt" @mouseleave="stopTilt" @touchstart="tiltRight" @touchend="stopTilt">向右傾斜 ➡️</button>
      </div>
    </div>

    <div v-else class="result-screen">
      <h1>🎉 遊戲結束！</h1>
      <h2 v-if="lives <= 0" style="color: red;">💔 愛心用盡了！</h2>
      <h2>總得分：{{ score }}</h2>
      <NuxtLink to="/" class="action-btn">回首頁挑戰其他遊戲</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.tilt-container {
  max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif;
  text-align: center; background: #e0f2f1; min-height: 100vh; overflow: hidden;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.back-btn { text-decoration: none; font-weight: bold; color: #00695c; border: 2px solid #00695c; padding: 5px 10px; border-radius: 8px; }
.stats { display: flex; gap: 15px; font-size: 1.2rem; font-weight: bold; }
.lives { color: #d32f2f; }
.score-board { background: #b2dfdb; padding: 5px 15px; border-radius: 20px; color: #004d40; border: 2px solid #00796b;}

h1 { color: #00796b; font-size: 2rem; text-shadow: 1px 1px 0px #b2dfdb; margin-bottom: 10px;}
.error { color: red; font-weight: bold; margin-top: 15px; }

.intro-screen p { font-size: 1.1rem; color: #004d40; line-height: 1.6; margin-bottom: 30px;}

.action-btn {
  background: #009688; color: #fff; font-size: 1.2rem; font-weight: bold;
  border: 3px solid #00695c; padding: 15px 30px; border-radius: 50px; cursor: pointer;
  box-shadow: 0 5px 0 #004d40; transition: 0.1s; display: block; width: 100%; margin-bottom: 15px;
}
.action-btn:active { transform: translateY(5px); box-shadow: none; }
.test-btn { background: #fff; color: #00796b; border: 2px dashed #00796b; padding: 10px; border-radius: 8px; width: 100%; cursor: pointer;}

.game-screen { display: flex; flex-direction: column; align-items: center; }
.progress { font-weight: bold; color: #004d40; margin-bottom: 10px; }

.play-area {
  position: relative; width: 100%; height: 65vh; background: #fff;
  border: 4px solid #80cbc4; border-radius: 12px; overflow: hidden;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
}

/* 掉落物 */
.falling-item {
  position: absolute; transform: translateX(-50%); width: auto; max-width: 80%;
  background: #ffca28; color: #e65100; font-size: 1.5rem; font-weight: bold;
  padding: 15px 25px; border-radius: 15px; border: 3px solid #ffb300;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: left 0.1s linear, top 0.05s linear;
  z-index: 10; pointer-events: none;
}

/* 左右籃子 */
.basket {
  position: absolute; bottom: 0; width: 50%; height: 15%;
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 15px;
}
.left-basket { left: 0; background: linear-gradient(to top, rgba(244,67,54,0.3), transparent); border-right: 2px dashed #ccc;}
.right-basket { right: 0; background: linear-gradient(to top, rgba(33,150,243,0.3), transparent); }

.basket-label {
  font-size: 1.5rem; font-weight: bold; background: rgba(255,255,255,0.9);
  padding: 10px 20px; border-radius: 8px; border: 2px solid #333;
}
.left-basket .basket-label { color: #d32f2f; border-color: #d32f2f; }
.right-basket .basket-label { color: #1976d2; border-color: #1976d2; }

/* 電腦版控制項 */
.pc-controls { display: flex; gap: 20px; margin-top: 20px; width: 100%; justify-content: center;}
.pc-controls button {
  padding: 15px 20px; font-size: 1.2rem; font-weight: bold; background: #e0e0e0;
  border: 2px solid #9e9e9e; border-radius: 8px; cursor: pointer; user-select: none;
}
.pc-controls button:active { background: #bdbdbd; }
</style>
