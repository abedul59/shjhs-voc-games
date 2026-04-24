<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');
const router = useRouter();

const allQuestions = ref([]);
const groupedQuestions = ref([]); 
const availableYears = ref([]);

const gameState = ref('setup'); 
const selectedYear = ref('ALL');
const currentGroupIndex = ref(0);

// 計分機制
const totalCorrect = ref(0);
const totalQuestionsCompleted = ref(0);

// 計時器
const timeLimit = ref(240); 
const timeLeft = ref(240);
let timerInterval = null;

const isImageZoomed = ref(false);

const currentGroup = computed(() => groupedQuestions.value[currentGroupIndex.value] || { questions: [] });
const userAnswers = ref({}); 
const isGroupSubmitted = ref(false);

// ✨ 新增：用來暫存這回合所有作答細節的陣列，最後再一次性寫入資料庫
const sessionLogs = ref([]);

const correctSound = ref(null);
const wrongSound = ref(null);

onMounted(async () => {
  if (!studentCookie.value || !studentCookie.value.id) { alert('請先登入！'); router.push('/'); return; }
  correctSound.value = new Audio('/sounds/correct.mp3');
  wrongSound.value = new Audio('/sounds/wrong.mp3');

  const { data: sysData } = await supabase.from('system_settings').select('examRead2_time_limit').eq('id', 1).single();
  if (sysData && sysData.examRead2_time_limit) {
    timeLimit.value = sysData.examRead2_time_limit;
  }

  const { data } = await supabase.from('exam2_questions').select('*').order('year', { ascending: false }).order('group_id', { ascending: true }).order('question_num', { ascending: true });
  
  if (data && data.length > 0) {
    allQuestions.value = data;
    availableYears.value = [...new Set(data.map(q => q.year))];
  }
});

const startTimer = () => {
  clearInterval(timerInterval);
  timeLeft.value = timeLimit.value;
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      clearInterval(timerInterval);
      alert('⏳ 時間到！系統自動為您送出本題組。');
      submitGroup(true);
    }
  }, 1000);
};

const startTest = () => {
  let filtered = JSON.parse(JSON.stringify(allQuestions.value)); 
  if (selectedYear.value !== 'ALL') filtered = filtered.filter(q => q.year === parseInt(selectedYear.value));
  
  // 1. 進行題組打包
  const groupsMap = {};
  filtered.forEach(q => {
    if (!groupsMap[q.group_id]) {
      groupsMap[q.group_id] = { id: q.group_id, year: q.year, image_url: q.image_url, questions: [] };
    }
    groupsMap[q.group_id].questions.push(q);
  });
  
  // 2. 依照會考順序排序
  const sortedGroups = Object.values(groupsMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  });

  // 3. 確保每個題組內的題目編號也是正確的
  sortedGroups.forEach(group => {
    group.questions.sort((a, b) => parseInt(a.question_num) - parseInt(b.question_num));
  });

  groupedQuestions.value = sortedGroups;
  
  if (groupedQuestions.value.length === 0) return alert('此條件下目前沒有題組！');
  
  currentGroupIndex.value = 0;
  totalCorrect.value = 0;
  totalQuestionsCompleted.value = 0;
  sessionLogs.value = []; // 初始化暫存日誌
  resetGroupState();
  gameState.value = 'playing';
  startTimer();
};

const resetGroupState = () => {
  userAnswers.value = {};
  isGroupSubmitted.value = false;
};

const selectAnswer = (qId, option) => {
  if (isGroupSubmitted.value) return;
  userAnswers.value[qId] = option;
};

const submitGroup = (isAutoSubmit = false) => {
  if (!isAutoSubmit && Object.keys(userAnswers.value).length < currentGroup.value.questions.length) {
    return alert('這大題還有題目沒寫完喔！');
  }

  isGroupSubmitted.value = true;
  clearInterval(timerInterval);
  
  let allCorrect = true;
  
  // ✨ 計算這個題組花費的時間，並平均分配給每一小題
  const timeSpentOnGroup = timeLimit.value - timeLeft.value;
  const avgTimePerQuestion = Math.round(timeSpentOnGroup / currentGroup.value.questions.length) || 1;

  currentGroup.value.questions.forEach(q => {
    const isCorrect = userAnswers.value[q.id] === q.answer;
    if (isCorrect) {
      totalCorrect.value++;
    } else {
      allCorrect = false;
    }

    // ✨ 將每一格小題的作答結果記錄到暫存陣列中
    sessionLogs.value.push({
      student_id: studentCookie.value.id,
      q_id: q.id,
      is_correct: isCorrect,
      time_spent: avgTimePerQuestion
    });
  });

  totalQuestionsCompleted.value += currentGroup.value.questions.length;
  if (allCorrect) correctSound.value?.play(); else wrongSound.value?.play();
};

const nextGroup = () => {
  if (currentGroupIndex.value < groupedQuestions.value.length - 1) {
    currentGroupIndex.value++;
    resetGroupState();
    startTimer();
  } else {
    endGame();
  }
};

const endGame = async () => {
  gameState.value = 'end';
  clearInterval(timerInterval);
  
  try {
    const finalPercentageScore = Math.round((totalCorrect.value / totalQuestionsCompleted.value) * 100) || 0;
    
    // 🌟 1. 更新學生的遊戲總積分 (原本的邏輯)
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, class_name: studentCookie.value.class, 
      unit_played: `會考題組(${selectedYear.value})`, game_type: '會考閱讀考古學(題組)', 
      score: finalPercentageScore, time_taken_seconds: 0,
      correct_words: `答對 ${totalCorrect.value} / 共 ${totalQuestionsCompleted.value} 題`
    }]);
    
    const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
    if (data) await supabase.from('students').update({ points: data.points + finalPercentageScore }).eq('id', studentCookie.value.id);

    // 🌟 2. 寫入大數據：題組測驗總歷史 (exam2_history)
    await supabase.from('exam2_history').insert([{
      student_id: studentCookie.value.id,
      student_name: studentCookie.value.name,
      student_class: studentCookie.value.class,
      exam_mode: selectedYear.value.toString(),
      correct_count: totalCorrect.value,
      wrong_count: totalQuestionsCompleted.value - totalCorrect.value
    }]);

    // 🌟 3. 寫入大數據：題組作答詳細日誌 (exam2_question_logs)
    if (sessionLogs.value.length > 0) {
      await supabase.from('exam2_question_logs').insert(sessionLogs.value);
    }

  } catch(err) {
    console.error('寫入數據失敗：', err);
  }
};

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60);
  const s = (timeLeft.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

onUnmounted(() => { clearInterval(timerInterval); });
</script>

<template>
  <div class="exam-container">
    <div v-if="isImageZoomed" class="image-modal" @click="isImageZoomed = false">
      <img :src="currentGroup.image_url" alt="閱讀文本放大" class="zoomed-img">
      <div class="zoom-hint">點擊任意處關閉圖片</div>
    </div>

    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div v-if="gameState === 'playing'" class="timer-board" :class="{ 'warning': timeLeft <= 30 }">
        ⏳ 剩餘時間: {{ formattedTime }}
      </div>
    </div>

    <div v-if="gameState === 'setup'" class="setup-screen retro-element">
      <h1>📜 會考閱讀考古學<br><small>(題組特訓篇)</small></h1>
      <div class="setting-box">
        <label>選擇年份：</label>
        <select v-model="selectedYear" class="retro-input">
          <option value="ALL">🌟 全部歷屆題目</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年會考</option>
        </select>
      </div>
      <p class="intro-text">⚠️ 每個題組限時 <strong>{{ timeLimit / 60 }} 分鐘</strong>，順序將依題號編號排列。</p>
      <button class="start-btn" @click="startTest">🚀 開始挑戰</button>
    </div>

    <div v-else-if="gameState === 'playing'" class="play-layout">
      <div class="reading-panel retro-element">
        <div class="group-info">題組：{{ currentGroup.id }} ({{ currentGroup.year }}年)</div>
        <div class="image-box" @click="currentGroup.image_url && (isImageZoomed = true)" title="點擊放大圖片">
          <img v-if="currentGroup.image_url" :src="currentGroup.image_url" alt="閱讀文本" class="reading-img">
          <div v-else class="no-img">此題組沒有圖片</div>
          <div v-if="currentGroup.image_url" class="click-hint">🔍 點擊圖片可放大</div>
        </div>
      </div>

      <div class="questions-panel retro-element">
        <div v-for="q in currentGroup.questions" :key="q.id" class="question-card">
          <div class="q-title"><strong>{{ q.question_num }}.</strong> {{ q.question_text }}</div>
          <div class="options-grid">
            <button v-for="opt in ['A', 'B', 'C', 'D']" :key="opt" 
                    class="option-btn" 
                    :class="{ 
                      'selected': userAnswers[q.id] === opt,
                      'correct-ans': isGroupSubmitted && q.answer === opt,
                      'wrong-ans': isGroupSubmitted && userAnswers[q.id] === opt && q.answer !== opt
                    }"
                    @click="selectAnswer(q.id, opt)" :disabled="isGroupSubmitted">
              <span class="opt-label">{{ opt }}</span> {{ q[`option_${opt.toLowerCase()}`] }}
            </button>
          </div>
        </div>

        <div class="action-area">
          <button v-if="!isGroupSubmitted" class="submit-btn" @click="submitGroup(false)">📝 提交本大題答案</button>
          <button v-else class="next-btn" @click="nextGroup">
            {{ currentGroupIndex < groupedQuestions.length - 1 ? '➡️ 下一題組' : '🏆 查看總成績' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else class="end-screen retro-element">
      <h1>🎉 題組特訓完成！</h1>
      <div class="final-stats">
        <div class="stat-circle correct"><span>答對</span><strong>{{ totalCorrect }}</strong></div>
        <div class="stat-divider">/</div>
        <div class="stat-circle total"><span>總題數</span><strong>{{ totalQuestionsCompleted }}</strong></div>
      </div>
      <p class="final-percent">正確率：{{ Math.round((totalCorrect / totalQuestionsCompleted) * 100) }}%</p>
      <NuxtLink to="/" class="home-btn">返回首頁</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
/* 樣式保持不變 */
.exam-container { max-width: 1300px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.timer-board { font-size: 1.3rem; font-weight: bold; background: #e8f5e9; color: #2e7d32; padding: 5px 15px; border-radius: 20px; border: 2px solid #4caf50;}
.timer-board.warning { background: #ffebee; color: #c62828; border-color: #f44336; animation: pulseRed 1s infinite;}
@keyframes pulseRed { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

.image-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: zoom-out;}
.zoomed-img { max-width: 95%; max-height: 90vh; object-fit: contain; border-radius: 8px;}
.zoom-hint { color: white; margin-top: 15px; font-size: 1.2rem; font-weight: bold;}

.setup-screen { max-width: 500px; margin: 50px auto; text-align: center; padding: 40px; background: white; border-radius: 16px; border: 3px solid #ccc;}
.setup-screen h1 { color: #303f9f; margin-bottom: 30px;}
.retro-input { width: 100%; padding: 12px; border: 2px solid #9fa8da; border-radius: 8px; font-size: 1.1rem;}
.intro-text { color: #d32f2f; margin: 15px 0; font-size: 1.1rem; }
.start-btn { width: 100%; padding: 15px; font-size: 1.3rem; font-weight: bold; background: #3f51b5; color: white; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 5px 0 #1a237e;}

.play-layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; height: 82vh;}
@media (max-width: 900px) { .play-layout { grid-template-columns: 1fr; height: auto;} }

.reading-panel { background: white; padding: 15px; border-radius: 16px; border: 2px solid #ccc; display: flex; flex-direction: column; overflow: hidden;}
.group-info { background: #e8eaf6; color: #303f9f; padding: 10px; font-weight: bold; text-align: center; border-radius: 8px; margin-bottom: 10px;}
.image-box { flex: 1; overflow-y: auto; text-align: center; background: #f5f5f5; border-radius: 8px; border: 1px dashed #bbb; padding: 10px; position: relative; cursor: zoom-in;}
.reading-img { width: 100%; height: auto;}
.click-hint { position: absolute; bottom: 15px; right: 15px; background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 8px; pointer-events: none;}

.questions-panel { background: #fdfdfd; padding: 20px; border-radius: 16px; border: 2px solid #ccc; overflow-y: auto; display: flex; flex-direction: column; gap: 20px;}
.question-card { background: white; padding: 15px; border-radius: 12px; border: 1px solid #eee;}
.q-title { font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; line-height: 1.5;}
.options-grid { display: flex; flex-direction: column; gap: 10px;}
.option-btn { text-align: left; padding: 12px; background: #fff; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer;}
.option-btn.selected { border-color: #3f51b5; background: #e8eaf6; font-weight: bold;}
.option-btn.correct-ans { background: #e8f5e9 !important; border-color: #4caf50 !important; color: #2e7d32; font-weight: bold; position: relative;}
.option-btn.correct-ans::after { content: '✅'; position: absolute; right: 10px; }
.option-btn.wrong-ans { background: #ffebee !important; border-color: #f44336 !important; color: #c62828; text-decoration: line-through;}

.action-area { margin-top: auto; padding-top: 20px;}
.submit-btn, .next-btn { width: 100%; padding: 15px; font-size: 1.2rem; font-weight: bold; border: none; border-radius: 12px; cursor: pointer;}
.submit-btn { background: #ff9800; color: white; box-shadow: 0 4px 0 #e65100;}
.next-btn { background: #4caf50; color: white; box-shadow: 0 4px 0 #2e7d32;}

.end-screen { text-align: center; padding: 60px; background: white; border-radius: 16px; border: 3px solid #ccc;}
.final-stats { display: flex; justify-content: center; align-items: center; gap: 20px; margin: 30px 0;}
.stat-divider { font-size: 3rem; font-weight: bold; color: #aaa;}
.stat-circle { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 100px; border-radius: 50%; border: 4px solid;}
.stat-circle.correct { border-color: #4caf50; color: #2e7d32; background: #e8f5e9;}
.stat-circle.total { border-color: #3f51b5; color: #1a237e; background: #e8eaf6;}
.final-percent { font-size: 1.5rem; font-weight: bold; color: #ff9800; margin-bottom: 30px;}
.home-btn { display: inline-block; background: #3f51b5; color: white; padding: 15px 40px; font-weight: bold; text-decoration: none; border-radius: 30px;}
</style>