<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

// 遊戲狀態
const isLoadingData = ref(true);
const vocabList = ref([]);
const score = ref(0);
const caughtCount = ref(0);
const isGameOver = ref(false);
const gameStarted = ref(false);
const permissionError = ref('');

// GPS 與移動狀態
const DISTANCE_TO_ENCOUNTER = 15; // 每移動 15 公尺遭遇一次怪獸
let watchId = null;
const currentLat = ref(0);
const currentLon = ref(0);
const lastLat = ref(null);
const lastLon = ref(null);
const totalDistance = ref(0); // 總移動距離 (公尺)
const distanceSinceLastEncounter = ref(0); // 距離上次遭遇的距離 (公尺)

// 戰鬥 (遭遇) 狀態
const isEncountering = ref(false);
const currentMonster = ref(null);
const options = ref([]);
const battleFeedback = ref(''); // 'correct', 'wrong', ''

// 音效系統
const playSound = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  if (type === 'encounter') {
    // 遭遇怪獸的警告聲 (登愣！)
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } else if (type === 'catch') {
    // 收服成功 (叮叮叮)
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(1600, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } else if (type === 'escape') {
    // 答錯逃跑 (噗噗)
    osc.type = 'square'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }
};

const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// 載入單字庫
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
  
  vocabList.value = data.sort(() => Math.random() - 0.5);
  isLoadingData.value = false;
});

// 計算兩個 GPS 座標之間的距離 (Haversine 公式，回傳公尺)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // 地球半徑 (公尺)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
};

// 1. 啟動 GPS 追蹤
const startTracking = () => {
  if (!navigator.geolocation) {
    permissionError.value = "您的設備不支援 GPS 定位！";
    return;
  }

  gameStarted.value = true;

  // 請求高精度定位
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      currentLat.value = latitude;
      currentLon.value = longitude;

      if (lastLat.value !== null && lastLon.value !== null) {
        // 算出這次移動了幾公尺
        const dist = calculateDistance(lastLat.value, lastLon.value, latitude, longitude);
        
        // 忽略微小的 GPS 飄移 (小於 1 公尺不計)
        if (dist > 1) {
          totalDistance.value += dist;
          distanceSinceLastEncounter.value += dist;
          checkEncounter();
        }
      }

      lastLat.value = latitude;
      lastLon.value = longitude;
    },
    (err) => {
      console.error(err);
      permissionError.value = "無法取得位置，請確認已開啟手機的 GPS (定位服務) 並允許網頁存取權限！";
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
};

// 2. 檢查是否觸發野生怪獸遭遇
const checkEncounter = () => {
  // 如果正在戰鬥中，或是還沒走到指定距離，就不觸發
  if (isEncountering.value || distanceSinceLastEncounter.value < DISTANCE_TO_ENCOUNTER) return;

  // 觸發戰鬥！
  distanceSinceLastEncounter.value = 0; // 重置里程表
  triggerEncounter();
};

// 3. 準備遭遇戰 (產生題目與選項)
const triggerEncounter = () => {
  isEncountering.value = true;
  playSound('encounter');
  vibrate([200, 100, 200]);

  // 隨機挑選一隻單字怪獸
  const target = vocabList.value[Math.floor(Math.random() * vocabList.value.length)];
  currentMonster.value = target;

  // 產生 3 個錯誤的中文選項
  let wrongOptions = vocabList.value.filter(v => v.zh_tw !== target.zh_tw).sort(() => 0.5 - Math.random()).slice(0, 3);
  // 防呆：如果題庫太少
  while(wrongOptions.length < 3) wrongOptions.push(vocabList.value[0]);

  const allOptions = [
    { text: target.zh_tw, isCorrect: true },
    ...wrongOptions.map(w => ({ text: w.zh_tw, isCorrect: false }))
  ];

  // 打亂選項順序
  options.value = allOptions.sort(() => Math.random() - 0.5);
};

// 4. 玩家選擇答案 (丟精靈球)
const throwBall = (option) => {
  if (battleFeedback.value !== '') return; // 防止重複點擊

  if (option.isCorrect) {
    battleFeedback.value = 'correct';
    playSound('catch'); vibrate([100, 50, 100]);
    score.value += 10;
    caughtCount.value += 1;
    
    setTimeout(() => {
      endEncounter();
    }, 1500);
  } else {
    battleFeedback.value = 'wrong';
    playSound('escape'); vibrate([300]);
    
    // 答錯就讓怪獸逃跑
    setTimeout(() => {
      endEncounter();
    }, 1500);
  }
};

const endEncounter = () => {
  isEncountering.value = false;
  battleFeedback.value = '';
  currentMonster.value = null;
  options.value = [];
  
  // 檢查是否收服了足夠數量的怪獸 (例如 10 隻就通關)
  if (caughtCount.value >= 10) {
    endGame();
  }
};

// 🌟 教師備課/測試用的「模擬移動」按鈕
const simulateMovement = () => {
  totalDistance.value += 15;
  distanceSinceLastEncounter.value += 15;
  checkEncounter();
};

const stopTracking = () => {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

// 🌟 修正點：加上 async/await
const endGame = async () => {
  isGameOver.value = true;
  stopTracking();
  await uploadRecord('單字地圖 GO');
};

onUnmounted(() => {
  stopTracking();
});

// 計算距離下一次遭遇的進度條百分比
const progressPercent = computed(() => {
  return Math.min(100, (distanceSinceLastEncounter.value / DISTANCE_TO_ENCOUNTER) * 100);
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
  <div class="gps-container">
    
    <div class="header">
      <NuxtLink to="/" class="back-btn" @click="stopTracking">⬅ 結束探索</NuxtLink>
      <div class="stats">
        <span class="score-board">✨ 積分: {{ score }}</span>
        <span class="caught-board">🎒 收服: {{ caughtCount }}/10</span>
      </div>
    </div>

    <div v-if="isLoadingData" class="loading">載入地圖資料中...</div>

    <div v-else-if="!gameStarted" class="intro-screen">
      <h1 class="neon-title">🌍 單字地圖 GO</h1>
      
      <div class="instruction-card">
        <h3>🚶‍♂️ 戶外探索規則</h3>
        <ol>
          <li>這是一個<b>需要真實走路</b>的遊戲！</li>
          <li>請允許 GPS 定位權限。</li>
          <li>帶著手機去操場、公園或回家的路上散步。</li>
          <li>每走 <b>15 公尺</b>，就會遭遇一隻「單字怪獸」！</li>
          <li>選出正確的中文翻譯來收服牠們！目標收服 10 隻！</li>
        </ol>
      </div>
      
      <button class="action-btn" @click="startTracking">
        🧭 開啟 GPS 開始探索
      </button>
      
      <p v-if="permissionError" class="error">{{ permissionError }}</p>
    </div>

    <div v-else-if="!isGameOver && !isEncountering" class="radar-screen">
      
      <div class="radar-wrapper">
        <div class="radar">
          <div class="sweep"></div>
          <div class="circle c1"></div>
          <div class="circle c2"></div>
          <div class="circle c3"></div>
          
          <div class="player-dot"></div>
        </div>
      </div>

      <div class="tracking-info">
        <div class="distance-text">總步程: <b>{{ Math.round(totalDistance) }}</b> m</div>
        
        <div class="progress-container">
          <div class="progress-label">尋找下一隻怪獸... (距離 {{ DISTANCE_TO_ENCOUNTER - Math.round(distanceSinceLastEncounter) }}m)</div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>
        
        <div class="gps-coords">
          <small>GPS 訊號鎖定中...<br>Lat: {{ currentLat.toFixed(5) }}, Lon: {{ currentLon.toFixed(5) }}</small>
        </div>
      </div>
      
      <button class="simulate-btn" @click="simulateMovement">👟 模擬移動 15m</button>

    </div>

    <div v-else-if="!isGameOver && isEncountering" class="encounter-screen">
      
      <div class="encounter-alert" v-if="!battleFeedback">
        ⚠️ 遭遇野生單字怪獸！
      </div>

      <div class="monster-area" :class="battleFeedback">
        <div class="monster-sprite">👾</div>
        
        <div class="monster-word">{{ currentMonster.en_us }}</div>
        <div class="monster-hint" v-if="battleFeedback !== 'correct'">這隻怪獸的意思是？</div>
      </div>

      <div class="options-grid" v-if="!battleFeedback">
        <button v-for="(opt, index) in options" :key="index" class="option-btn" @click="throwBall(opt)">
          {{ opt.text }}
        </button>
      </div>

      <div class="feedback-area" v-if="battleFeedback">
        <div v-if="battleFeedback === 'correct'" class="msg success">
          ✨ 成功收服！<br><small>{{ currentMonster.en_us }} = {{ currentMonster.zh_tw }}</small>
        </div>
        <div v-else-if="battleFeedback === 'wrong'" class="msg error">
          💨 答錯了！怪獸逃跑了...<br><small>正確答案是: {{ currentMonster.zh_tw }}</small>
        </div>
      </div>

    </div>

    <div v-else class="result-screen">
      <h1 class="neon-title">🏆 探險結束！</h1>
      <h2 class="final-score">總移動距離：{{ Math.round(totalDistance) }} 公尺</h2>
      <h2 class="final-score">最終積分：{{ score }}</h2>
      <p>你今天不僅學習了單字，還運動了一下呢！</p>
      <NuxtLink to="/" class="action-btn">領取獎勵並返回</NuxtLink>
    </div>

  </div>
</template>

<style scoped>
.gps-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #1b5e20; font-family: 'PingFang TC', sans-serif;}

.header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; z-index: 50; background: rgba(0,0,0,0.5);}
.back-btn { text-decoration: none; font-weight: bold; color: #fff; background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; backdrop-filter: blur(5px);}
.stats { display: flex; gap: 10px; }
.score-board { background: #ffeb3b; color: #f57f17; font-weight: 900; padding: 5px 15px; border-radius: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);}
.caught-board { background: #4caf50; color: #fff; font-weight: 900; padding: 5px 15px; border-radius: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); border: 2px solid #fff;}

.neon-title { color: #69f0ae; font-size: 2.2rem; text-shadow: 0 0 10px #00e676; margin-bottom: 20px; text-align: center;}
.error { color: #ff5252; font-weight: bold; margin-top: 15px; text-align: center; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px;}

.intro-screen, .result-screen { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; text-align: center; color: #fff; background: linear-gradient(135deg, #1b5e20, #004d40);}

.instruction-card { background: rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 25px; margin-bottom: 30px; text-align: left; border: 1px solid rgba(255,255,255,0.2); max-width: 90%;}
.instruction-card h3 { color: #69f0ae; margin-top: 0; text-align: center; font-size: 1.5rem;}
.instruction-card ol { color: #e0e0e0; font-size: 1.1rem; line-height: 1.8; padding-left: 20px;}
.instruction-card b { color: #ffeb3b; }

.action-btn { background: #00c853; color: #fff; font-size: 1.3rem; font-weight: bold; border: 3px solid #b9f6ca; padding: 15px 35px; border-radius: 50px; cursor: pointer; box-shadow: 0 5px 15px rgba(0,200,83,0.4); transition: 0.2s; text-decoration: none; }
.action-btn:active { transform: scale(0.95); }

/* 📡 雷達畫面 */
.radar-screen { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e8f5e9; }

.radar-wrapper { position: relative; width: 300px; height: 300px; margin-bottom: 40px;}
.radar { width: 100%; height: 100%; background: #c8e6c9; border-radius: 50%; position: relative; overflow: hidden; border: 4px solid #4caf50; box-shadow: 0 10px 30px rgba(0,0,0,0.2), inset 0 0 50px rgba(76, 175, 80, 0.5);}
.circle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 1px dashed #81c784; border-radius: 50%;}
.c1 { width: 75px; height: 75px; }
.c2 { width: 150px; height: 150px; }
.c3 { width: 225px; height: 225px; }
.player-dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 16px; height: 16px; background: #d32f2f; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px #f44336; z-index: 10;}
.sweep { position: absolute; top: 50%; left: 50%; width: 150px; height: 150px; background: conic-gradient(from 0deg, transparent 70%, rgba(0, 230, 118, 0.8) 100%); transform-origin: 0 0; animation: radar-spin 2s linear infinite; border-right: 2px solid #00e676;}
@keyframes radar-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.tracking-info { background: #fff; padding: 20px; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); width: 85%; max-width: 400px; text-align: center;}
.distance-text { font-size: 1.5rem; color: #2e7d32; margin-bottom: 15px;}
.distance-text b { font-size: 2.2rem; color: #1b5e20;}

.progress-container { margin-bottom: 15px;}
.progress-label { font-size: 0.9rem; color: #555; margin-bottom: 5px; font-weight: bold;}
.progress-bar-bg { width: 100%; height: 15px; background: #eee; border-radius: 10px; overflow: hidden; box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);}
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #69f0ae); transition: width 0.3s ease-out;}

.gps-coords { color: #9e9e9e; font-family: monospace; }

/* 模擬按鈕 */
.simulate-btn { position: absolute; bottom: 20px; right: 20px; background: #ff9800; color: #fff; border: none; padding: 10px 15px; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.2); cursor: pointer;}
.simulate-btn:active { transform: translateY(2px); }

/* ⚔️ 遭遇戰鬥畫面 */
.encounter-screen { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle, #37474f, #102027); padding: 20px;}

.encounter-alert { background: #ff5252; color: #fff; padding: 10px 20px; border-radius: 30px; font-weight: 900; font-size: 1.2rem; margin-bottom: 30px; animation: pulse-alert 1s infinite alternate; box-shadow: 0 0 20px rgba(255,82,82,0.5);}
@keyframes pulse-alert { from { transform: scale(1); } to { transform: scale(1.05); } }

.monster-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 40px; transition: 0.3s;}
.monster-area.correct { transform: scale(0.5); opacity: 0; filter: brightness(2) drop-shadow(0 0 50px #69f0ae);}
.monster-area.wrong { transform: translateX(100vw); opacity: 0;} /* 逃跑動畫 */

.monster-sprite { font-size: 6rem; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5)); animation: float-monster 2s ease-in-out infinite alternate;}
@keyframes float-monster { from { transform: translateY(0); } to { transform: translateY(-20px); } }

.monster-word { background: rgba(0,0,0,0.6); color: #fff; font-size: 2.5rem; font-weight: 900; padding: 10px 30px; border-radius: 20px; border: 3px solid #64ffda; margin-top: -10px; z-index: 10; text-shadow: 2px 2px 0 #000;}
.monster-hint { color: #b0bec5; margin-top: 10px; font-weight: bold;}

.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; max-width: 400px;}
.option-btn { background: #fff; border: 4px solid #cfd8dc; padding: 20px 10px; border-radius: 16px; font-size: 1.2rem; font-weight: bold; color: #263238; cursor: pointer; box-shadow: 0 5px 0 #b0bec5; transition: 0.1s;}
.option-btn:active { transform: translateY(5px); box-shadow: 0 0 0 #b0bec5;}

.feedback-area { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 400px; text-align: center; z-index: 100;}
.msg { padding: 30px 20px; border-radius: 20px; font-weight: 900; font-size: 2rem; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-shadow: 2px 2px 4px rgba(0,0,0,0.3);}
.msg.success { background: #00c853; border: 4px solid #b9f6ca;}
.msg.error { background: #d50000; border: 4px solid #ff8a80;}
.msg small { display: block; font-size: 1.2rem; margin-top: 10px; font-weight: normal;}

</style>
