<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const { version, volume, unit } = route.query;

const allQuestions = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const gameState = ref('loading'); 
const selectedIdx = ref(null);
const isAnswered = ref(false);

const sessionLogs = [];

// ✨ 新增：單題計時器變數
let questionStartTime = 0; 
let timeSpentThisQuestion = 0;

onMounted(async () => {
  if (!studentCookie.value) { router.push('/'); return; }
  
  const { data } = await supabase.from('grammar_questions')
    .select('*').eq('version', version).eq('volume', volume).eq('unit', unit);

  if (!data || data.length < 10) {
    alert(`題庫題目不足 (目前僅 ${data?.length || 0} 題)，請老師先到後台匯入至少 10 題！`);
    router.push('/');
    return;
  }

  allQuestions.value = data.sort(() => Math.random() - 0.5).slice(0, 10);
  gameState.value = 'playing';
  
  // ✨ 第一題開始計時
  questionStartTime = Date.now();
});

const currentQ = computed(() => allQuestions.value[currentIndex.value]);

const formatQuestionText = (text) => {
  if (!text) return '';
  return text.replace(/　+/g, ' _________ ').replace(/\s{3,}/g, ' _________ ');
};

const checkAnswer = (idx) => {
  if (isAnswered.value) return;
  selectedIdx.value = idx;
  isAnswered.value = true;
  
  // ✨ 學生按下的瞬間停止計時，計算秒數 (毫秒轉秒，四捨五入)
  timeSpentThisQuestion = Math.round((Date.now() - questionStartTime) / 1000);
  
  // 加上防呆機制：如果學生秒答 (小於1秒) 記為 1 秒，如果發呆超過 5 分鐘記為 300 秒極限值
  if (timeSpentThisQuestion < 1) timeSpentThisQuestion = 1;
  if (timeSpentThisQuestion > 300) timeSpentThisQuestion = 300;

  const isCorrect = (idx === currentQ.value.answer);
  
  if (isCorrect) {
    score.value += 10;
    new Audio('/sounds/correct.mp3').play();
  } else {
    new Audio('/sounds/wrong.mp3').play();
  }

  // 🌟 將秒數一起存入作答結果中
  sessionLogs.push({
    student_id: studentCookie.value.id,
    real_name: studentCookie.value.real_name || studentCookie.value.name,
    class_name: studentCookie.value.class || '未分班',
    version: version,
    volume: volume,
    unit: unit,
    question_id: currentQ.value.id,
    is_correct: isCorrect,
    time_spent: timeSpentThisQuestion // ✨ 這裡把秒數包進去準備寫入資料庫！
  });
};

const nextQuestion = () => {
  if (currentIndex.value < 9) {
    currentIndex.value++;
    isAnswered.value = false;
    selectedIdx.value = null;
    
    // ✨ 進入下一題，碼表歸零重新計時
    questionStartTime = Date.now();
  } else {
    endGame();
  }
};

const endGame = async () => {
  gameState.value = 'end';
  
  await supabase.from('game_records').insert([{
    student_id: studentCookie.value.id,
    real_name: studentCookie.value.real_name || studentCookie.value.name,
    class_name: studentCookie.value.class,
    unit_played: `${version} ${volume}-${unit}`,
    game_type: '文法遊樂園',
    score: score.value,
    time_taken_seconds: 0,
    is_anon: studentCookie.value.isAnon || false,
    browser_id: studentCookie.value.browserId
  }]);
  
  if (!studentCookie.value.isAnon) {
    const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
    if (data) await supabase.from('students').update({ points: data.points + score.value }).eq('id', studentCookie.value.id);
  }

  if (sessionLogs.length > 0) {
    await supabase.from('grammar_student_answers').insert(sessionLogs);
  }
};
</script>

<template>
  <div class="game-container">
    <div v-if="gameState === 'playing'" class="quiz-box retro-element">
      <div class="header-info">
        <span class="progress">第 {{ currentIndex + 1 }} / 10 題</span>
        <span class="score">目前得分：{{ score }}</span>
      </div>
      
      <div class="question-text">{{ formatQuestionText(currentQ.question_text) }}</div>
      
      <div class="options-list">
        <button v-for="i in 4" :key="i" 
          class="opt-btn"
          :class="{
            'correct': isAnswered && currentQ.answer === i,
            'wrong': isAnswered && selectedIdx === i && currentQ.answer !== i,
            'selected': selectedIdx === i
          }"
          @click="checkAnswer(i)"
          :disabled="isAnswered"
        >
          {{ currentQ['option_' + i] }}
        </button>
      </div>
      <button v-if="isAnswered" class="next-btn" @click="nextQuestion">
        {{ currentIndex < 9 ? '下一題 ➡️' : '查看結果 🏆' }}
      </button>
    </div>

    <div v-else-if="gameState === 'end'" class="result-box retro-element">
      <h1>🎡 挑戰結束！</h1>
      <div class="final-score">{{ score }}<span>分</span></div>
      <NuxtLink to="/" class="back-home">返回首頁</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.game-container { max-width: 700px; margin: 40px auto; padding: 20px; font-family: 'PingFang TC', sans-serif; }
.quiz-box { background: #fff8e1; border: 3px solid #ff9800; padding: 30px; border-radius: 20px; text-align: center; box-shadow: 0 8px 16px rgba(0,0,0,0.1);}
.header-info { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #ffb74d; padding-bottom: 15px; margin-bottom: 20px; font-weight: bold; color: #e65100; font-size: 1.1rem;}
.score { background: #ffe082; padding: 5px 15px; border-radius: 20px;}
.question-text { font-size: 1.6rem; font-weight: bold; margin: 30px 0; line-height: 1.8; min-height: 100px; color: #333; word-break: break-word;}
.options-list { display: flex; flex-direction: column; gap: 12px; }
.opt-btn { padding: 15px; font-size: 1.2rem; border: 2px solid #ccc; border-radius: 12px; cursor: pointer; background: white; transition: 0.2s; text-align: left; padding-left: 20px;}
.opt-btn:hover:not(:disabled) { border-color: #ff9800; background: #fff3e0; transform: translateX(5px);}
.opt-btn.correct { background: #e8f5e9; border-color: #4caf50; color: #2e7d32; font-weight: bold; position: relative;}
.opt-btn.correct::after { content: '✅'; position: absolute; right: 15px;}
.opt-btn.wrong { background: #ffebee; border-color: #f44336; color: #c62828; text-decoration: line-through; position: relative;}
.opt-btn.wrong::after { content: '❌'; position: absolute; right: 15px;}
.next-btn { width: 100%; margin-top: 25px; padding: 15px; background: #ff9800; color: white; border: none; border-radius: 12px; font-size: 1.3rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 0 #e65100; transition: 0.1s;}
.next-btn:active { transform: translateY(4px); box-shadow: none;}
.result-box { text-align: center; background: white; padding: 50px; border-radius: 20px; border: 3px solid #ff9800;}
.final-score { font-size: 5rem; color: #ff9800; font-weight: 900; margin: 20px 0; }
.final-score span { font-size: 2rem; color: #777;}
.back-home { display: inline-block; padding: 15px 40px; background: #3f51b5; color: white; text-decoration: none; border-radius: 30px; font-size: 1.2rem; font-weight: bold; margin-top: 20px;}
</style>