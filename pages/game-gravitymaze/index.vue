<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Supabase & Routing
const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

// 🌟 預先暫存單元資訊，避免跳出時 route.query 遺失
const qVersion = route.query.version;
const qVolume = route.query.volume;
const qUnit = route.query.unit;

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
let baseBeta = null;
let baseGamma = null;
const ball = ref({ x: 50, y: 50, vx: 0, vy: 0, radius: 4 }); 
let gameLoop = null;

// Current Question State
const currentQuestion = ref(''); 
const holes = ref([
  { id: 0, x: 15, y: 15, word: '', isCorrect: false, color: '#f44336' },
  { id: 1, x: 85, y: 15, word: '', isCorrect: false, color: '#2196f3' },
  { id: 2, x: 15, y: 85, word: '', isCorrect: false, color: '#4caf50' },
  { id: 3, x: 85, y: 85, word: '', isCorrect: false, color: '#ff9800' }
]);
const holeRadius = 12; 

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
  } else if (type === 'bounce') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
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
    
  if (error || !data || data.length < 4) {
    alert("載入單字失敗，或單字量不足 (至少需要 4 個單字)！");
    router.push('/');
    return;
  }
  
  vocabList.value = data.sort(() => Math.random() - 0.5);
  isLoading.value = false;
});

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
    permissionGranted.value = true;
    startGame();
  }
};

const startGame = () => {
  baseBeta = null; 
  baseGamma = null;
  window.addEventListener('deviceorientation', handleOrientation, false);
  setupNextQuestion();
  gameLoop = requestAnimationFrame(updatePhysics);
};

const handleOrientation = (event) => {
  if (baseBeta === null || baseGamma === null) {
    baseBeta = event.beta;
    baseGamma = event.gamma;
    return;
  }

  let dBeta = event.beta - baseBeta;
  let dGamma = event.gamma - baseGamma;

  if (dBeta > 45) dBeta = 45; if (dBeta < -45) dBeta = -45;
  if (dGamma > 45) dGamma = 45; if (dGamma < -45) dGamma = -45;

  ball.value.vy += (dBeta / 45) * 0.4;
  ball.value.vx += (dGamma / 45) * 0.4;
};

const handleKeyDown = (e) => {
  const speed = 1.5;
  if (e.key === 'ArrowUp' || e.key === 'w') ball.value.vy -= speed;
  if (e.key === 'ArrowDown' || e.key === 's') ball.value.vy += speed;
  if (e.key === 'ArrowLeft' || e.key === 'a') ball.value.vx -= speed;
  if (e.key === 'ArrowRight' || e.key === 'd') ball.value.vx += speed;
};

const setupNextQuestion = () => {
  if (currentIndex.value >= vocabList.value.length || lives.value <= 0) {
    endGame();
    return;
  }
  
  ball.value.x = 50; ball.value.y = 50;
  ball.value.vx = 0; ball.value.vy = 0;

  const correctItem = vocabList.value[currentIndex.value];
  currentQuestion.value = correctItem.zh_tw;
  
  let wrongWords = vocabList.value.filter(v => v.en_us !== correctItem.en_us).sort(() => Math.random() - 0.5).slice(0, 3);
  
  while(wrongWords.length < 3) wrongWords.push(vocabList.value[0]);

  const options = [correctItem.en_us, wrongWords[0].en_us, wrongWords[1].en_us, wrongWords[2].en_us].sort(() => Math.random() - 0.5);

  holes.value.forEach((hole, index) => {
    hole.word = options[index];
    hole.isCorrect = (options[index] === correctItem.en_us);
  });
};

const isProcessingHole = ref(false);

const updatePhysics = () => {
  if (isGameOver.value || isProcessingHole.value) return;

  ball.value.vx *= 0.95;
  ball.value.vy *= 0.95;

  ball.value.x += ball.value.vx;
  ball.value.y += ball.value.vy;

  let bounced = false;
  if (ball.value.x < ball.value.radius) { ball.value.x = ball.value.radius; ball.value.vx *= -0.6; bounced = true; }
  if (ball.value.x > 100 - ball.value.radius) { ball.value.x = 100 - ball.value.radius; ball.value.vx *= -0.6; bounced = true; }
  if (ball.value.y < ball.value.radius) { ball.value.y = ball.value.radius; ball.value.vy *= -0.6; bounced = true; }
  if (ball.value.y > 100 - ball.value.radius) { ball.value.y = 100 - ball.value.radius; ball.value.vy *= -0.6; bounced = true; }
  
  if (bounced && (Math.abs(ball.value.vx) > 0.5 || Math.abs(ball.value.vy) > 0.5)) playSound('bounce');

  checkHoleCollision();

  if (!isProcessingHole.value && !isGameOver.value) {
    gameLoop = requestAnimationFrame(updatePhysics);
  }
};

const checkHoleCollision = () => {
  if (isProcessingHole.value) return;
  
  for (let hole of holes.value) {
    const dx = ball.value.x - hole.x;
    const dy = ball.value.y - hole.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < holeRadius) {
      handleHoleEnter(hole);
      break;
    }
  }
};

const handleHoleEnter = (hole) => {
  isProcessingHole.value = true; 
  ball.value.vx = 0; ball.value.vy = 0;
  
  if (hole.isCorrect) {
    playSound('correct'); vibrate([100, 50, 100]);
    score.value += 10;
    currentIndex.value++;
    
    setTimeout(() => {
      isProcessingHole.value = false;
      setupNextQuestion();
      if (!isGameOver.value) gameLoop = requestAnimationFrame(updatePhysics);
    }, 500);
    
  } else {
    playSound('wrong'); vibrate([300]);
    lives.value -= 1;
    
    setTimeout(() => {
      alert(`❌ 掉進錯的洞囉！這個字是 ${hole.word}`);
      isProcessingHole.value = false;
      
      if (lives.value > 0) {
        ball.value.x = 50; ball.value.y = 50; 
        if (!isGameOver.value) gameLoop = requestAnimationFrame(updatePhysics);
      } else {
        endGame();
      }
    }, 100); 
  }
};

const endGame = async () => {
  isGameOver.value = true;
  cancelAnimationFrame(gameLoop);
  window.removeEventListener('deviceorientation', handleOrientation);
  window.removeEventListener('keydown', handleKeyDown);
  await uploadRecord('單字迷宮滾滾球'); // 🌟 加入 await 確保上傳完成
};

onMounted(() => { window.addEventListener('keydown', handleKeyDown); });
onUnmounted(() => { 
  cancelAnimationFrame(gameLoop);
  window.removeEventListener('deviceorientation', handleOrientation);
  window.removeEventListener('keydown', handleKeyDown); 
});

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
      version: qVersion, // 🌟 使用暫存的變數
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
</script>

<template>
  <div class="maze-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div class="stats">
        <span class="lives">❤️ x {{ lives }}</span>
        <span class="score-board">分數: {{ score }}</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading">載入中...</div>

    <div v-else-if="!permissionGranted" class="intro-screen">
      <h1>🔮 單字迷宮滾滾球</h1>
      <p>畫面上會出現一顆鋼球與 4 個寫著英文的洞口。<br>
         請<b>平穩地傾斜手機</b>，<br>將鋼球滾進符合上方「中文提示」的洞裡！</p>
      
      <button class="action-btn" @click="requestPermission">📱 手機版：準備好並點此開始</button>
      <button class="test-btn" @click="() => { permissionGranted = true; startGame(); }">💻 電腦版：使用方向鍵控制</button>
      
      <p v-if="permissionError" class="error">{{ permissionError }}</p>
    </div>

    <div v-else-if="!isGameOver" class="game-screen">
      <div class="progress">第 {{ currentIndex + 1 }} 題 / 共 {{ vocabList.length }} 題</div>
      
      <div class="target-zh">{{ currentQuestion }}</div>
      
      <div class="play-area">
        
        <div v-for="hole in holes" :key="hole.id" class="hole" 
             :style="{ left: hole.x + '%', top: hole.y + '%', border: '4px solid ' + hole.color }">
          <div class="hole-inner"></div>
          <span class="hole-text" :style="{ color: hole.color }">{{ hole.word }}</span>
        </div>

        <div class="ball" :style="{ left: ball.x + '%', top: ball.y + '%' }"></div>
      </div>

      <p class="hint">💡 提示：手機平拿，像托盤一樣微微傾斜即可控制方向。</p>
    </div>

    <div v-else class="result-screen">
      <h1>🎉 遊戲結束！</h1>
      <h2 v-if="lives <= 0" style="color: #d32f2f;">💔 愛心用盡了！</h2>
      <h2>總得分：{{ score }}</h2>
      <NuxtLink to="/" class="action-btn">回首頁挑戰其他遊戲</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.maze-container {
  max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif;
  text-align: center; background: #eefeeb; min-height: 100vh; overflow: hidden;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.back-btn { text-decoration: none; font-weight: bold; color: #2e7d32; border: 2px solid #2e7d32; padding: 5px 10px; border-radius: 8px; }
.stats { display: flex; gap: 15px; font-size: 1.2rem; font-weight: bold; }
.lives { color: #d32f2f; }
.score-board { background: #c8e6c9; padding: 5px 15px; border-radius: 20px; color: #1b5e20; border: 2px solid #388e3c;}

h1 { color: #2e7d32; font-size: 2rem; text-shadow: 1px 1px 0px #a5d6a7; margin-bottom: 10px;}
.error { color: red; font-weight: bold; margin-top: 15px; }

.intro-screen p { font-size: 1.1rem; color: #333; line-height: 1.6; margin-bottom: 30px;}

.action-btn {
  background: #4caf50; color: #fff; font-size: 1.2rem; font-weight: bold;
  border: 3px solid #2e7d32; padding: 15px 30px; border-radius: 50px; cursor: pointer;
  box-shadow: 0 5px 0 #1b5e20; transition: 0.1s; display: block; width: 100%; margin-bottom: 15px; text-decoration: none;
}
.action-btn:active { transform: translateY(5px); box-shadow: none; }
.test-btn { background: #fff; color: #4caf50; border: 2px dashed #4caf50; padding: 10px; border-radius: 8px; width: 100%; cursor: pointer;}

.game-screen { display: flex; flex-direction: column; align-items: center; }
.progress { font-weight: bold; color: #555; margin-bottom: 10px; }

.target-zh {
  font-size: 2.2rem; font-weight: 900; color: #bf360c; background: #ffccbc;
  padding: 10px 30px; border-radius: 12px; border: 3px dashed #e64a19; margin-bottom: 20px;
}

.play-area {
  position: relative; width: 100%; aspect-ratio: 1 / 1.1; background: #d7ccc8;
  border: 8px solid #795548; border-radius: 12px; overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.3), 0 10px 20px rgba(0,0,0,0.2);
  background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px);
}

.hole {
  position: absolute; width: 22%; aspect-ratio: 1 / 1; border-radius: 50%;
  transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center;
  background: #eceff1; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.hole-inner {
  position: absolute; width: 50%; height: 50%; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #333, #000);
  box-shadow: inset 0 3px 5px rgba(0,0,0,0.8);
}
.hole-text {
  position: absolute; bottom: -25px; font-weight: bold; font-size: 1rem;
  text-shadow: 1px 1px 0 #fff; white-space: nowrap; background: rgba(255,255,255,0.8); padding: 2px 6px; border-radius: 4px;
}

.ball {
  position: absolute; width: 6%; aspect-ratio: 1 / 1; border-radius: 50%;
  transform: translate(-50%, -50%); z-index: 10;
  background: radial-gradient(circle at 30% 30%, #fff, #9e9e9e 40%, #424242);
  box-shadow: 2px 4px 6px rgba(0,0,0,0.4);
}

.hint { margin-top: 20px; color: #555; font-size: 0.9rem; }
</style>
