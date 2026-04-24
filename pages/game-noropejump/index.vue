<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const { version, volume, unit } = route.query;

const allQuestions = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const totalJumpsDone = ref(0); 
const gameState = ref('loading'); 

// 單題狀態
const currentOptions = ref([]);
const currentWordScore = ref(10); 
const isAnsweredCorrectly = ref(false);

// 跳繩狀態
const targetJumps = ref(0);
const currentJumps = ref(0);
const lastJumpTime = ref(0);
const isSensorReady = ref(false); 
let lastMagnitude = 0;
let isJumpingLock = false;

onMounted(async () => {
  if (!studentCookie.value) { router.push('/'); return; }
  
  const { data } = await supabase.from('vocabularies')
    .select('*')
    .eq('version', version).eq('volume', volume).eq('unit', unit);

  if (!data || data.length < 4) {
    alert(`題庫單字不足 (目前僅 ${data?.length || 0} 個)，無法進行選擇題！請先確認是否有匯入單字。`);
    router.push('/');
    return;
  }

  allQuestions.value = data.sort(() => Math.random() - 0.5).slice(0, 10);
  prepareQuestion();
  gameState.value = 'playing_mcq';
});

const currentWord = computed(() => allQuestions.value[currentIndex.value] || {});

const prepareQuestion = () => {
  currentWordScore.value = 10;
  isAnsweredCorrectly.value = false;
  isSensorReady.value = false; 
  
  const correct = currentWord.value;
  let distractors = allQuestions.value.filter(w => w.id !== correct.id);
  distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
  
  currentOptions.value = [correct, ...distractors].sort(() => 0.5 - Math.random());
};

const checkAnswer = (selectedWord, event) => {
  if (isAnsweredCorrectly.value) return;

  if (selectedWord.id === currentWord.value.id) {
    event.target.classList.add('correct');
    isAnsweredCorrectly.value = true;
    score.value += currentWordScore.value;
    new Audio('/sounds/correct.mp3').play();
    
    setTimeout(() => {
      startJumpingPhase();
    }, 1000);
  } else {
    event.target.classList.add('wrong');
    currentWordScore.value = Math.max(0, currentWordScore.value - 3);
    new Audio('/sounds/wrong.mp3').play();
  }
};

const startJumpingPhase = () => {
  // 🌟 使用正確的欄位名稱 en_us
  const englishText = currentWord.value.en_us || '';
  const cleanWord = englishText.replace(/[^a-zA-Z]/g, '');
  
  targetJumps.value = cleanWord.length > 0 ? cleanWord.length : 5; 
  currentJumps.value = 0;
  gameState.value = 'playing_jump';
};

const requestMotionPermission = () => {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          isSensorReady.value = true;
          window.addEventListener('devicemotion', handleMotion);
        } else {
          alert('需要開啟動作感測器權限才能偵測跳躍喔！請重新整理頁面允許權限。');
        }
      })
      .catch(console.error);
  } else {
    isSensorReady.value = true;
    window.addEventListener('devicemotion', handleMotion);
  }
};

const handleMotion = (event) => {
  if (gameState.value !== 'playing_jump' || !isSensorReady.value) return;
  const acc = event.accelerationIncludingGravity;
  if (!acc) return;
  
  const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
  const delta = Math.abs(magnitude - lastMagnitude);
  lastMagnitude = magnitude;
  
  // 變化大於 4.5 m/s² 視為跳躍
  if (delta > 4.5 && !isJumpingLock) {
    isJumpingLock = true; 
    const now = Date.now();
    
    if (now - lastJumpTime.value > 350) {
      recordJump();
      lastJumpTime.value = now;
    }
    
    setTimeout(() => { isJumpingLock = false; }, 300);
  }
};

const recordJump = () => {
  if (currentJumps.value < targetJumps.value) {
    currentJumps.value++;
    totalJumpsDone.value++;
    new Audio('/sounds/correct.mp3').play(); 
    
    if (currentJumps.value >= targetJumps.value) {
      isSensorReady.value = false;
      window.removeEventListener('devicemotion', handleMotion);
      setTimeout(() => { finishQuestion(); }, 600);
    }
  }
};

const manualJump = () => {
  if (gameState.value === 'playing_jump') recordJump();
};

const finishQuestion = () => {
  if (currentIndex.value < allQuestions.value.length - 1 && currentIndex.value < 9) {
    currentIndex.value++;
    prepareQuestion();
    gameState.value = 'playing_mcq';
  } else {
    endGame();
  }
};

const endGame = async () => {
  gameState.value = 'end';
  window.removeEventListener('devicemotion', handleMotion);
  
  await supabase.from('game_records').insert([{
    student_id: studentCookie.value.id,
    real_name: studentCookie.value.real_name || studentCookie.value.name,
    class_name: studentCookie.value.class,
    unit_played: `${version} ${volume}-${unit}`,
    game_type: '單字無繩式跳繩',
    score: score.value,
    correct_words: `跳躍總數: ${totalJumpsDone.value} 下`, 
    time_taken_seconds: 0,
    is_anon: studentCookie.value.isAnon || false
  }]);
  
  if (!studentCookie.value.isAnon) {
    const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
    if (data) await supabase.from('students').update({ points: data.points + score.value }).eq('id', studentCookie.value.id);
  }
};

onUnmounted(() => { window.removeEventListener('devicemotion', handleMotion); });
</script>

<template>
  <div class="game-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div class="stats-board">
        <span>⭐ 分數: {{ score }}</span> | 
        <span>🏃‍♂️ 總跳躍: {{ totalJumpsDone }}</span>
      </div>
    </div>

    <div v-if="gameState === 'playing_mcq'" class="quiz-box retro-element">
      <div class="progress">第 {{ currentIndex + 1 }} / 10 題</div>
      <div class="word-display">{{ currentWord.en_us }}</div>
      <p class="instruction">請問這個單字的中文意思是什麼？<br><small>(答錯將扣 3 分喔！)</small></p>
      
      <div class="options-grid">
        <button v-for="(opt, index) in currentOptions" :key="index" 
          class="opt-btn retro-btn"
          @click="checkAnswer(opt, $event)"
          :disabled="isAnsweredCorrectly"
        >
          {{ opt.zh_tw }}
        </button>
      </div>
    </div>

    <div v-else-if="gameState === 'playing_jump'" class="jump-box retro-element">
      <div class="word-display jump-word">{{ currentWord.en_us }}</div>
      <h2>答對了！準備跳繩！</h2>
      <p class="jump-rule">這個單字有 <strong>{{ targetJumps }}</strong> 個字母，所以要跳 <strong>{{ targetJumps }}</strong> 下！</p>
      
      <button v-if="!isSensorReady" class="start-jump-btn" @click="requestMotionPermission">
        📱 點我開啟感測器<br>開始跳繩！
      </button>

      <div v-else>
        <div class="jump-counter">
          <span class="current-jump">{{ currentJumps }}</span> / {{ targetJumps }}
        </div>
        <div class="progress-bar">
          <div class="fill" :style="{ width: (currentJumps / targetJumps * 100) + '%' }"></div>
        </div>
      </div>

      <button class="manual-btn retro-btn" @click="manualJump">💻 電腦版測試：點我模擬跳躍</button>
    </div>

    <div v-else-if="gameState === 'end'" class="result-box retro-element">
      <h1>🎉 運動與學習完成！</h1>
      <div class="final-stats">
        <div class="stat-card">
          <div class="title">單字得分</div>
          <div class="value text-orange">{{ score }}</div>
        </div>
        <div class="stat-card">
          <div class="title">消耗卡路里 (總跳躍)</div>
          <div class="value text-green">{{ totalJumpsDone }}</div>
        </div>
      </div>
      <NuxtLink to="/" class="retro-btn home-btn">返回首頁</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.game-container { max-width: 600px; margin: 30px auto; padding: 20px; font-family: 'PingFang TC', sans-serif; text-align: center;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;}
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.stats-board { background: #333; color: white; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 1.1rem;}

.quiz-box, .jump-box, .result-box { background: white; padding: 30px; border-radius: 16px; border: 3px solid #333; box-shadow: 6px 6px 0 #ccc;}

.word-display { font-size: 3.5rem; font-weight: 900; color: #2c3e50; margin: 20px 0; letter-spacing: 2px; word-break: break-word;}
.instruction { color: #d32f2f; font-weight: bold; margin-bottom: 20px; font-size: 1.1rem;}
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px;}
.opt-btn { padding: 15px 10px; font-size: 1.1rem; background: #e3f2fd; border-color: #1976d2; color: #0d47a1; transition: 0.2s;}
.opt-btn.correct { background: #4caf50; border-color: #2e7d32; color: white;}
.opt-btn.wrong { background: #ffebee; border-color: #d32f2f; color: #b71c1c; opacity: 0.6; text-decoration: line-through;}

.jump-word { font-size: 3rem; color: #4caf50; margin: 10px 0;}
.jump-rule { font-size: 1.2rem; color: #555; margin-bottom: 20px;}
.start-jump-btn { display: block; width: 100%; padding: 20px; font-size: 1.5rem; font-weight: bold; background: #ff9800; color: white; border: none; border-radius: 16px; cursor: pointer; box-shadow: 0 6px 0 #e65100; margin: 20px 0; animation: pulse 1s infinite;}
.start-jump-btn:active { transform: translateY(6px); box-shadow: none;}
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }

.jump-counter { font-size: 2.5rem; font-weight: bold; color: #888; margin: 20px 0;}
.current-jump { font-size: 6rem; color: #e65100;}
.progress-bar { width: 100%; height: 20px; background: #eee; border-radius: 10px; overflow: hidden; margin-bottom: 20px;}
.progress-bar .fill { height: 100%; background: #ff9800; transition: width 0.2s ease-out;}
.manual-btn { background: #f5f5f5; color: #777; border-color: #ccc; margin-top: 20px; font-size: 0.9rem; padding: 10px; width: 100%;}

.final-stats { display: flex; justify-content: center; gap: 20px; margin: 30px 0;}
.stat-card { background: #f9f9f9; border: 2px solid #ddd; padding: 20px; border-radius: 12px; min-width: 150px;}
.stat-card .title { font-size: 1.1rem; color: #666; font-weight: bold; margin-bottom: 10px;}
.stat-card .value { font-size: 3rem; font-weight: 900;}
.text-orange { color: #ff9800; } .text-green { color: #4caf50; }
.home-btn { background: #3f51b5; color: white; padding: 15px 40px; font-size: 1.2rem; display: inline-block; text-decoration: none;}

.retro-btn { font-family: inherit; font-weight: bold; border-radius: 8px; border: 2px solid; cursor: pointer; box-shadow: 2px 2px 0 rgba(0,0,0,0.2);}
.retro-btn:active:not(:disabled) { transform: translateY(2px); box-shadow: none;}
</style>