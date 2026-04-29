<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

// Game State
const isLoadingData = ref(true);
const vocabList = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const lives = ref(3);
const isGameOver = ref(false);

// Camera State
const videoElement = ref(null);
let stream = null; 
const cameraError = ref('');
const cameraStarted = ref(false);

// Targets State
const targets = ref([]);
let targetIdCounter = 0;
let spawnInterval = null;
let gameLoop = null;

const isFiring = ref(false);

// Audio setup
const playSound = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (type === 'shoot') {
    osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } else if (type === 'hit') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, ctx.currentTime); osc.frequency.setValueAtTime(1600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } else if (type === 'wrong') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
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
  
  const filteredData = data.filter(item => /^[a-zA-Z]+$/.test(item.en_us.trim()));
  if (filteredData.length === 0) {
    alert("本單元沒有適合的單字！");
    router.push('/');
    return;
  }

  vocabList.value = filteredData.sort(() => Math.random() - 0.5);
  isLoadingData.value = false;
});

const currentVocab = computed(() => vocabList.value[currentIndex.value] || {});

// 啟動相機 (最原生的方法，保證不閃退)
const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    if (videoElement.value) {
      videoElement.value.srcObject = stream;
      videoElement.value.onloadedmetadata = () => {
        cameraStarted.value = true;
        startGame();
      };
    }
  } catch (err) {
    console.error("相機啟動失敗:", err);
    cameraError.value = "無法開啟相機！將以黑畫面模式進行。";
    cameraStarted.value = true; 
    startGame();
  }
};

const startGame = () => {
  spawnInterval = setInterval(spawnTarget, 1000);
  gameLoop = requestAnimationFrame(updatePhysics);
};

const spawnTarget = () => {
  if (isGameOver.value) return;
  
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
  const scale = 0.6 + Math.random() * 0.6;
  
  targets.value.push({
    id: targetIdCounter++,
    text: word,
    x: startLeft ? -20 : 120, // X 座標 (vw)
    y: 15 + Math.random() * 55, // Y 座標 (vh)
    speedX: (startLeft ? 1 : -1) * (0.3 + Math.random() * 0.6), 
    speedY: (Math.random() - 0.5) * 0.4, 
    scale: scale,
    isCorrect: isCorrect,
    hit: false
  });
};

const updatePhysics = () => {
  if (isGameOver.value) return;

  targets.value.forEach(t => { 
    if(!t.hit) {
      t.x += t.speedX; 
      t.y += t.speedY; 
    }
  });
  
  targets.value = targets.value.filter(t => t.x > -30 && t.x < 130 && !t.hit);
  gameLoop = requestAnimationFrame(updatePhysics);
};

// 🎯 中央狙擊鏡開火判定
const fireWeapon = () => {
  if (isGameOver.value || isFiring.value) return;
  
  isFiring.value = true;
  playSound('shoot');
  
  // 尋找在螢幕正中央 (50vw, 50vh) 附近的飛碟
  let hitIndex = -1;
  let minDistance = 15; // 命中判定半徑 (vw)
  
  for (let i = 0; i < targets.value.length; i++) {
    const t = targets.value[i];
    if (t.hit) continue;
    
    // 飛碟的中心點估算
    const tCenterX = t.x + 8; 
    const tCenterY = t.y + 5; 
    
    // 計算與螢幕中央 (50, 50) 的距離
    const dist = Math.sqrt(Math.pow(50 - tCenterX, 2) + Math.pow(50 - tCenterY, 2));
    
    if (dist < minDistance) {
      minDistance = dist;
      hitIndex = i;
    }
  }

  if (hitIndex !== -1) {
    const target = targets.value[hitIndex];
    target.hit = true;
    
    if (target.isCorrect) {
      playSound('hit'); vibrate([100, 50, 100]);
      score.value += 10;
      setTimeout(nextQuestion, 500); 
    } else {
      playSound('wrong'); vibrate([300]);
      lives.value -= 1;
      if (lives.value <= 0) setTimeout(endGame, 500);
    }
  } else {
    // 沒打中
    vibrate(50);
  }
  
  setTimeout(() => {
    isFiring.value = false;
  }, 200);
};

const nextQuestion = () => {
  currentIndex.value++;
  targets.value = []; 
  if (currentIndex.value >= vocabList.value.length) endGame();
};

const stopCamera = () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
};

// 🌟 修正點：加上 async/await
const endGame = async () => {
  isGameOver.value = true;
  cancelAnimationFrame(gameLoop);
  clearInterval(spawnInterval);
  stopCamera();
  await uploadRecord('AR實境單字狙擊手');
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
      class_name: student.class || '未分班', // 🌟 修正點：加上防呆
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
  <div class="ar-container">
    
    <video ref="videoElement" class="camera-bg" autoplay playsinline muted :class="{ 'hidden': !cameraStarted || isGameOver }"></video>

    <div class="game-ui">
      <div class="header">
        <NuxtLink to="/" class="back-btn" @click="stopCamera">⬅ 返回</NuxtLink>
        <div class="stats">
          <span class="lives">❤️ x {{ lives }}</span>
          <span class="score-board">分數: {{ score }}</span>
        </div>
      </div>

      <div v-if="isLoadingData" class="loading">載入中...</div>

      <div v-else-if="!cameraStarted" class="intro-screen">
        <h1 class="neon-title">🔫 實境狙擊手</h1>
        <p>雙手握緊手機，瞄準飛過的單字幽浮！</p>
        <ul class="how-to-play">
          <li>👁️ 飛碟會在畫面中穿梭。</li>
          <li>🎯 等待正確單字飛入<b>中央狙擊鏡</b>。</li>
          <li>💥 按下底部的<b>「扣板機」</b>開火！</li>
        </ul>
        <button class="action-btn" @click="startCamera">📸 開啟鏡頭出任務</button>
        <p v-if="cameraError" class="error">{{ cameraError }}</p>
      </div>

      <div v-else-if="!isGameOver" class="game-screen">
        
        <div class="hud-top">
          <div class="progress">第 {{ currentIndex + 1 }} 題 / 共 {{ vocabList.length }} 題</div>
          <div class="target-zh">🎯 狙擊目標：{{ currentVocab.zh_tw }}</div>
        </div>

        <div class="sniper-crosshair" :class="{ 'firing': isFiring }">
          <div class="cross-line vertical"></div>
          <div class="cross-line horizontal"></div>
          <div class="center-dot"></div>
        </div>

        <div class="play-area">
          <div v-for="target in targets" :key="target.id" 
               class="ufo-target" 
               :style="{ left: target.x + 'vw', top: target.y + 'vh', transform: `scale(${target.scale})` }">
            
            <div class="ufo-body" v-if="!target.hit">
              <div class="ufo-glass"></div>
              <div class="ufo-base">
                <span class="ufo-word">{{ target.text }}</span>
              </div>
            </div>

            <div class="explosion" v-if="target.hit">💥</div>
          </div>
        </div>
        
        <div class="trigger-container">
          <button class="fire-btn" :class="{ 'btn-pressed': isFiring }" @mousedown.prevent="fireWeapon" @touchstart.prevent="fireWeapon">
            💥 扣板機 FIRE
          </button>
        </div>
        
      </div>

      <div v-else class="result-screen">
        <h1 class="neon-title">🎉 狙擊任務完成！</h1>
        <h2 v-if="lives <= 0" style="color: #ff5252;">💔 生命值耗盡！</h2>
        <h2 class="final-score">總得分：{{ score }}</h2>
        <NuxtLink to="/" class="action-btn">回首頁挑戰</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ar-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #000; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif;}

.camera-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
.camera-bg.hidden { display: none; }

.game-ui { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; display: flex; flex-direction: column; }

.header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; z-index: 50; background: rgba(0,0,0,0.4);}
.back-btn { text-decoration: none; font-weight: bold; color: #69f0ae; border: 2px solid #69f0ae; padding: 5px 10px; border-radius: 8px; text-shadow: 0 0 5px #000;}
.stats { display: flex; gap: 15px; font-size: 1.2rem; font-weight: bold; text-shadow: 0 0 5px #000; color: #fff;}
.lives { color: #ff5252; }
.score-board { background: rgba(0, 230, 118, 0.2); padding: 5px 15px; border-radius: 20px; border: 2px solid #00e676;}

.neon-title { color: #69f0ae; font-size: 2.5rem; text-shadow: 0 0 10px #00e676, 0 0 20px #00c853; margin-bottom: 20px; text-align: center;}
.error { color: #ff5252; font-weight: bold; margin-top: 15px; text-align: center; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px;}

.intro-screen, .result-screen { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(0, 0, 0, 0.8); padding: 20px; text-align: center; color: #fff; }
.intro-screen p { font-size: 1.2rem; color: #b9f6ca; margin-bottom: 20px; line-height: 1.6;}
.how-to-play { list-style: none; padding: 0; margin: 0 0 30px 0; color: #fff; font-size: 1.1rem; line-height: 1.8; text-align: left; background: rgba(0,200,83,0.2); padding: 15px; border-radius: 12px; border: 1px solid #00e676;}

.action-btn { background: #00c853; color: #fff; font-size: 1.3rem; font-weight: bold; border: 3px solid #b9f6ca; padding: 15px 30px; border-radius: 50px; cursor: pointer; box-shadow: 0 0 15px #00e676; transition: 0.1s; text-decoration: none; }
.action-btn:active { transform: scale(0.95); box-shadow: none; }

.game-screen { flex: 1; position: relative; overflow: hidden; }
.hud-top { position: absolute; top: 20px; width: 100%; display: flex; flex-direction: column; align-items: center; z-index: 50; }
.progress { color: #fff; font-weight: bold; text-shadow: 0 0 5px #000; margin-bottom: 5px; background: rgba(0,0,0,0.5); padding: 2px 10px; border-radius: 10px;}
.target-zh { font-size: 2.5rem; font-weight: 900; color: #fff; background: rgba(213, 0, 0, 0.8); padding: 10px 40px; border-radius: 50px; border: 3px solid #ff5252; box-shadow: 0 0 20px #d50000; text-shadow: 2px 2px 4px #000; }

/* 🎯 固定狙擊鏡 */
.sniper-crosshair {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 120px; height: 120px; border: 3px dashed rgba(0, 230, 118, 0.6); border-radius: 50%;
  z-index: 40; pointer-events: none; transition: 0.1s;
  background: radial-gradient(circle, rgba(0,230,118,0.1) 0%, rgba(0,0,0,0) 70%);
}
.sniper-crosshair.firing { border-color: #ff3d00; border-style: solid; box-shadow: 0 0 30px #ff3d00; transform: translate(-50%, -50%) scale(1.1); background: radial-gradient(circle, rgba(255,61,0,0.3) 0%, rgba(0,0,0,0) 70%);}
.cross-line { position: absolute; background: rgba(0, 230, 118, 0.8); }
.sniper-crosshair.firing .cross-line { background: #ff3d00; }
.vertical { width: 2px; height: 140px; top: -10px; left: 59px; }
.horizontal { width: 140px; height: 2px; top: 59px; left: -10px; }
.center-dot { position: absolute; top: 56px; left: 56px; width: 8px; height: 8px; background: #00e676; border-radius: 50%; box-shadow: 0 0 10px #00e676;}
.sniper-crosshair.firing .center-dot { background: #ff3d00; box-shadow: 0 0 10px #ff3d00;}

/* 飛碟區 */
.play-area { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 30; pointer-events: none;}
.ufo-target { position: absolute; display: flex; flex-direction: column; align-items: center; transition: opacity 0.2s;}
.ufo-glass { width: 60px; height: 40px; background: rgba(128, 222, 234, 0.6); border-radius: 50px 50px 0 0; border: 2px solid #4dd0e1; margin-bottom: -15px; box-shadow: inset 0 5px 10px rgba(255,255,255,0.8); z-index: 2; position: relative; }
.ufo-base { background: #37474f; border-radius: 50px; border: 3px solid #90a4ae; padding: 10px 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.5), inset 0 -5px 10px rgba(0,0,0,0.5), 0 15px 20px rgba(0, 230, 118, 0.4); display: flex; justify-content: center; align-items: center; min-width: 120px; z-index: 3; }
.ufo-word { color: #fff; font-size: 1.5rem; font-weight: 900; text-shadow: 1px 1px 2px #000; letter-spacing: 1px; }
.explosion { font-size: 5rem; animation: pop 0.3s ease-out forwards; text-shadow: 0 0 20px #ffeb3b;}

/* 💥 巨型發射按鈕 */
.trigger-container { position: absolute; bottom: 40px; width: 100%; display: flex; justify-content: center; z-index: 60;}
.fire-btn {
  background: linear-gradient(to bottom, #ff5252, #d50000); color: #fff; font-size: 2rem; font-weight: 900;
  border: 4px solid #fff; padding: 20px 60px; border-radius: 100px; cursor: pointer;
  box-shadow: 0 10px 0 #b71c1c, 0 15px 20px rgba(0,0,0,0.5); transition: 0.1s;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5); -webkit-user-select: none; user-select: none;
}
.fire-btn:active, .btn-pressed { transform: translateY(10px); box-shadow: 0 0 0 #b71c1c, 0 5px 10px rgba(0,0,0,0.5); background: #d50000;}

.final-score { color: #ffeb3b; font-size: 3rem; margin-bottom: 30px; text-shadow: 0 0 20px #fbc02d;}
@keyframes pop { 0% { transform: scale(0.5); opacity: 1; } 50% { transform: scale(1.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
</style>
