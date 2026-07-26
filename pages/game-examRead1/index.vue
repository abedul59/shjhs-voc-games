<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent'); // 取得當前學生資訊
const allQuestions = ref([]);
const questions = ref([]);
const availableYears = ref([]);

const gameState = ref('setup'); 
const selectedMode = ref('random');
const currentIndex = ref(0);
const score = ref(0);
const isLoaded = ref(false);

const isAnswered = ref(false);
const selectedOption = ref('');
const currentOptions = ref([]);

const timerTotal = ref(20);
const timeLeft = ref(20);
let timerInterval = null;

const correctSound = ref(null);
const wrongSound = ref(null);

// 🌟 新增：用來暫存這回合的作答紀錄
const questionLogs = ref([]); 

onMounted(async () => {
  correctSound.value = new Audio('/sounds/correct.mp3');
  wrongSound.value = new Audio('/sounds/wrong.mp3');

  const { data: sysData } = await supabase.from('system_settings').select('exam_timer_seconds').eq('id', 1).single();
  if (sysData && sysData.exam_timer_seconds) timerTotal.value = sysData.exam_timer_seconds;

  const { data } = await supabase.from('exam_questions').select('*').order('year', { ascending: false }).order('question_id', { ascending: true });
  if (data && data.length > 0) {
    const validQuestions = data.filter(q => q.answer && q.answer !== '?');
    allQuestions.value = validQuestions;
    const years = [...new Set(validQuestions.map(q => q.year))];
    availableYears.value = years.sort((a, b) => b - a);
  }
  isLoaded.value = true;
});

onUnmounted(() => { clearInterval(timerInterval); });

const startGame = () => {
  if (selectedMode.value === 'random') {
    const shuffled = [...allQuestions.value].sort(() => 0.5 - Math.random());
    questions.value = shuffled.slice(0, 20);
  } else {
    const targetYear = parseInt(selectedMode.value);
    questions.value = allQuestions.value.filter(q => q.year === targetYear).sort((a, b) => a.question_id - b.question_id);
  }
  if (questions.value.length === 0) { alert('⚠️ 找不到符合條件的題目！'); return; }

  currentIndex.value = 0;
  score.value = 0;
  questionLogs.value = []; // 清空紀錄
  gameState.value = 'playing';
  setupQuestion();
};

const currentQ = computed(() => questions.value[currentIndex.value] || {});

const setupQuestion = () => {
  isAnswered.value = false;
  selectedOption.value = '';
  
  let opts = [
    { originalKey: 'A', text: currentQ.value.option_a },
    { originalKey: 'B', text: currentQ.value.option_b },
    { originalKey: 'C', text: currentQ.value.option_c },
    { originalKey: 'D', text: currentQ.value.option_d }
  ];
  
  // 🌟 修正點 1：移除 opts.sort() 隨機打亂，固定 A B C D 順序避免錯位
  currentOptions.value = opts;

  timeLeft.value = timerTotal.value;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) handleTimeout();
  }, 1000);
};

// 🌟 紀錄作答資料
const recordAnswer = (isCorrect) => {
  const timeSpent = timerTotal.value - Math.max(0, timeLeft.value);
  questionLogs.value.push({
    q_id: currentQ.value.id,
    is_correct: isCorrect,
    time_spent: timeSpent
  });
};

const selectAnswer = (opt) => {
  if (isAnswered.value) return; 
  clearInterval(timerInterval); 
  isAnswered.value = true;
  selectedOption.value = opt.originalKey;

  // 🌟 修正點 2：加入 .trim().toUpperCase() 防呆，無視資料庫裡多餘的空白與大小寫
  const correctAnswer = currentQ.value.answer?.trim().toUpperCase();
  const isCorrect = (opt.originalKey === correctAnswer);
  
  recordAnswer(isCorrect);

  if (isCorrect) { score.value++; playSound(correctSound.value); } 
  else { playSound(wrongSound.value); }
};

const handleTimeout = () => {
  clearInterval(timerInterval);
  isAnswered.value = true;
  selectedOption.value = 'TIMEOUT'; 
  recordAnswer(false); // 超時視為答錯
  playSound(wrongSound.value);
  setTimeout(() => { nextQuestion(); }, 2000);
};

const getOptionClass = (opt) => {
  if (!isAnswered.value) return 'option-btn';
  
  // 🌟 確保按鈕變色邏輯也套用防呆
  const correctAnswer = currentQ.value.answer?.trim().toUpperCase();
  if (opt.originalKey === correctAnswer) return 'option-btn correct';
  if (opt.originalKey === selectedOption.value) return 'option-btn wrong';
  return 'option-btn disabled';
};

const nextQuestion = async () => {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++;
    setupQuestion();
  } else {
    clearInterval(timerInterval);
    gameState.value = 'result';
    await submitGameData(); // 🌟 遊戲結束，上傳數據
  }
};

// 🌟 將紀錄上傳到資料庫
const submitGameData = async () => {
  // 1. 上傳每題的對錯與時間
  if (questionLogs.value.length > 0) {
    await supabase.from('exam_question_logs').insert(questionLogs.value);
  }
  
  // 2. 如果是「非隨機模式」，紀錄該學生的考卷總成績
  if (selectedMode.value !== 'random') {
    const student = studentCookie.value || { class: '訪客', name: '未登入' };
    await supabase.from('exam_history').insert([{
      student_class: student.class,
      student_name: student.name,
      exam_mode: selectedMode.value.toString(),
      correct_count: score.value,
      wrong_count: questions.value.length - score.value
    }]);
  }
};

const restart = () => { gameState.value = 'setup'; };
const playSound = (audio) => { if (audio) { audio.currentTime = 0; audio.play().catch(e => {}); } };
</script>

<template>
  <div class="exam-container">
    <div class="top-nav">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <h2 class="game-title">📜 會考閱讀考古學 - 單題篇</h2>
      <div style="width: 80px;"></div>
    </div>

    <div v-if="!isLoaded" class="loading">⏳ 正在展開古代卷軸...</div>
    <div v-else-if="allQuestions.length === 0" class="loading">❌ 題庫內沒有題目，請由後台匯入資料。</div>

    <div v-else-if="gameState === 'setup'" class="parchment-board setup-board">
      <h2>🎒 選擇考古範圍</h2>
      <p class="desc">請選擇您要挑戰的會考年份，或進行隨機特訓！</p>
      <div class="form-group">
        <select v-model="selectedMode" class="retro-input">
          <option value="random">🔀 綜合歷屆題庫 (隨機 20 題)</option>
          <option v-for="y in availableYears" :key="y" :value="y">📜 {{ y }} 年會考單題 (全套)</option>
        </select>
      </div>
      <button class="next-btn start-btn" @click="startGame">開始挖掘 ⛏️</button>
    </div>

    <div v-else-if="gameState === 'playing'" class="parchment-board">
      <div class="timer-container">
        <div class="timer-bar" :style="{ width: `${(timeLeft / timerTotal) * 100}%`, backgroundColor: timeLeft <= 5 ? '#d32f2f' : '#388e3c' }"></div>
        <div class="timer-text">⏳ {{ timeLeft }} 秒</div>
      </div>
      <div class="exam-header">
        <span class="year-badge">{{ currentQ.year }} 年會考</span>
        <span class="progress-badge">第 {{ currentIndex + 1 }} / {{ questions.length }} 題</span>
      </div>
      <div class="question-section">
        <span class="q-num">{{ selectedMode === 'random' ? (currentIndex + 1) : currentQ.question_id }}.</span>
        <div class="q-content">
          <p class="q-text">{{ currentQ.question }}</p>
          <div v-if="currentQ.image_url" class="q-image-container">
            <img :src="currentQ.image_url" alt="Question Image" class="q-image" />
          </div>
        </div>
      </div>
      <div class="options-section">
        <button v-for="(opt, index) in currentOptions" :key="index" @click="selectAnswer(opt)" :class="getOptionClass(opt)">
          <span class="opt-label">({{ ['A', 'B', 'C', 'D'][index] }})</span> {{ opt.text }}
        </button>
      </div>
      <div class="feedback-section" v-if="isAnswered">
        <div v-if="selectedOption === currentQ.answer?.trim().toUpperCase()" class="feedback correct-text">⭕ 答對了！非常棒！</div>
        <div v-else-if="selectedOption === 'TIMEOUT'" class="feedback wrong-text">⏰ 時間到！正確答案是 <strong>({{ currentQ.answer?.trim().toUpperCase() }})</strong></div>
        <div v-else class="feedback wrong-text">❌ 答錯了... 正確答案是 <strong>({{ currentQ.answer?.trim().toUpperCase() }})</strong></div>
        <button class="next-btn" @click="nextQuestion">{{ currentIndex < questions.length - 1 ? '下一題 ➡' : '查看成績 📜' }}</button>
      </div>
    </div>

    <div v-else-if="gameState === 'result'" class="parchment-board result-board">
      <h2>🎉 考古挖掘完成！</h2>
      <div class="score-display">
        答對題數： <span class="highlight">{{ score }}</span> / {{ questions.length }}
      </div>
      <p class="comment" v-if="score === questions.length">太神啦！你是 A++ 會考學霸！ 🏆</p>
      <p class="comment" v-else-if="score >= questions.length * 0.8">非常優秀！基礎已經相當穩固！ 🌟</p>
      <p class="comment" v-else>繼續努力！多刷幾次語感就會出來了！ 💪</p>
      <p style="color: #1565c0; font-weight: bold; margin-bottom: 20px;">📡 您的作答紀錄已傳送至資料庫</p>
      <button class="restart-btn" @click="restart">🔄 選擇其他考卷</button>
      <NuxtLink to="/" class="restart-btn" style="background:#555; margin-left:10px;">🏠 回到大廳</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Noto+Serif+TC:wght@400;700;900&display=swap');
.exam-container { min-height: 100vh; background-color: #2c3e50; padding: 20px; display: flex; flex-direction: column; align-items: center; font-family: 'Lora', 'Noto Serif TC', serif; }
.top-nav { width: 100%; max-width: 800px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; color: white; }
.back-btn { color: #fff; text-decoration: none; background: rgba(255,255,255,0.2); padding: 8px 15px; border-radius: 20px; font-weight: bold; font-family: sans-serif; }
.game-title { margin: 0; font-weight: 900; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
.loading { color: white; font-size: 1.5rem; margin-top: 100px; }
.parchment-board { width: 100%; max-width: 800px; background-color: #f4e8d3; border: 3px double #a67c52; box-shadow: inset 0 0 60px rgba(166, 124, 82, 0.3), 5px 5px 20px rgba(0,0,0,0.5); border-radius: 8px; padding: 40px; color: #3e2723; position: relative; box-sizing: border-box; }
.setup-board { text-align: center; padding: 60px 40px; }
.setup-board h2 { font-size: 2rem; margin-bottom: 10px; color: #5d4037; }
.desc { font-size: 1.2rem; color: #795548; margin-bottom: 30px; }
.form-group { margin-bottom: 30px; }
.retro-input { width: 100%; max-width: 400px; padding: 15px; font-size: 1.2rem; border: 2px solid #a67c52; border-radius: 8px; background: #fff3e0; color: #3e2723; font-family: inherit; font-weight: bold; text-align: center; cursor: pointer; }
.start-btn { width: 100%; max-width: 400px; padding: 15px; font-size: 1.4rem; background: #3e2723; }
.timer-container { width: 100%; height: 25px; background: #d7ccc8; border-radius: 15px; overflow: hidden; margin-bottom: 20px; position: relative; border: 1px solid #8d6e63; }
.timer-bar { height: 100%; transition: width 1s linear, background-color 0.5s ease; }
.timer-text { position: absolute; top: 0; left: 0; width: 100%; text-align: center; font-weight: bold; line-height: 25px; font-family: sans-serif; color: #fff; text-shadow: 1px 1px 2px #000; }
.exam-header { display: flex; justify-content: space-between; border-bottom: 2px solid #d7ccc8; padding-bottom: 10px; margin-bottom: 25px; font-weight: bold; color: #5d4037; }
.year-badge { background: #795548; color: #f4e8d3; padding: 4px 12px; border-radius: 4px; }
.question-section { display: flex; gap: 10px; font-size: 1.4rem; line-height: 1.8; margin-bottom: 30px; font-weight: 700; }
.q-num { font-size: 1.6rem; color: #5d4037; }
.q-content { display: flex; flex-direction: column; width: 100%; }
.q-text { margin: 0 0 15px 0; }
.q-image-container { margin: 15px 0; text-align: left; }
.q-image { max-width: 100%; max-height: 250px; border-radius: 8px; border: 2px solid #a67c52; box-shadow: 2px 2px 8px rgba(0,0,0,0.2); object-fit: contain; }
.options-section { display: flex; flex-direction: column; gap: 12px; }
.option-btn { background: rgba(255, 255, 255, 0.5); border: 2px solid #bcaaa4; padding: 15px 20px; font-size: 1.2rem; font-family: inherit; color: #3e2723; text-align: left; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 15px; }
.option-btn:hover:not(.disabled):not(.correct):not(.wrong) { background: #fff3e0; border-color: #8d6e63; transform: translateX(5px); }
.opt-label { font-weight: bold; color: #795548; }
.option-btn.correct { background: #dcedc8; border-color: #33691e; color: #1b5e20; font-weight: bold; box-shadow: 0 0 10px rgba(104, 159, 56, 0.4); }
.option-btn.wrong { background: #ffcdd2; border-color: #b71c1c; color: #b71c1c; text-decoration: line-through; }
.option-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.feedback-section { margin-top: 30px; border-top: 2px dashed #bcaaa4; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; animation: fadeIn 0.3s ease; }
.feedback { font-size: 1.3rem; font-weight: bold; }
.correct-text { color: #2e7d32; }
.wrong-text { color: #c62828; }
.next-btn, .restart-btn { background: #5d4037; color: #f4e8d3; border: none; padding: 12px 25px; font-size: 1.2rem; font-family: inherit; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 2px 2px 5px rgba(0,0,0,0.3); transition: 0.1s; text-decoration: none; display: inline-block; }
.next-btn:hover, .restart-btn:hover { background: #3e2723; transform: translateY(2px); }
.result-board { text-align: center; padding: 60px 40px; }
.score-display { font-size: 2rem; margin: 30px 0; font-weight: bold; }
.highlight { font-size: 4rem; color: #c62828; }
.comment { font-size: 1.5rem; margin-bottom: 20px; color: #5d4037; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 600px) { .parchment-board { padding: 20px; } .question-section { font-size: 1.2rem; flex-direction: column; } .q-num { margin-bottom: -15px; } .option-btn { font-size: 1.1rem; padding: 12px; } .feedback-section { flex-direction: column; gap: 15px; text-align: center; } .next-btn { width: 100%; } }
</style>
