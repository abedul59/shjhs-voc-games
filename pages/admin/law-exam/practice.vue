<script setup>
import { ref, computed, onMounted } from 'vue';

definePageMeta({ middleware: ["auth", "law-auth"] });

const supabase = useSupabaseClient();
const questions = ref([]);
const currentIndex = ref(0);
const selectedAnswer = ref(null);
const activeExp = ref(null);
const isLoading = ref(true);

const currentQ = computed(() => questions.value[currentIndex.value]);

const fetchPractice = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('law_exam_questions').select('*');
  if (data) questions.value = data.sort(() => Math.random() - 0.5); 
  isLoading.value = false;
};

const toggleExp = (letter) => {
  activeExp.value = activeExp.value === letter ? null : letter;
};

const nextQuestion = () => {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++; selectedAnswer.value = null; activeExp.value = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--; selectedAnswer.value = null; activeExp.value = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

onMounted(fetchPractice);
</script>

<template>
  <div class="practice-container">
    <div class="top-nav">
      <NuxtLink to="/admin/law-exam" class="back-link">← 回題庫管理</NuxtLink>
      <div class="progress-text" v-if="questions.length > 0">
        題目 {{ currentIndex + 1 }} / {{ questions.length }}
      </div>
      <div style="width: 100px;"></div>
    </div>

    <div v-if="isLoading" class="status-box">題庫讀取中...</div>
    <div v-else-if="questions.length === 0" class="status-box">目前沒有可以練習的題目，請先至後台匯入題庫。</div>

    <div v-else class="exam-card">
      <div class="exam-header">
        <div class="tags">
          <span class="subject-tag">{{ currentQ.subject }}</span>
          <span class="year-tag">{{ currentQ.exam_year }}</span>
        </div>
        <h2 class="question-title">{{ currentQ.question_text }}</h2>
      </div>

      <div class="options-container">
        <div v-for="letter in ['A', 'B', 'C', 'D']" :key="letter" 
             class="option-row" :class="{ selected: selectedAnswer === letter }">
          
          <div class="option-main">
            <label class="option-label">
              <input type="radio" v-model="selectedAnswer" :value="letter" class="opt-radio" />
              <span class="opt-text"><strong>{{ letter }}.</strong> {{ currentQ['opt_' + letter.toLowerCase()] }}</span>
            </label>
            <button @click="toggleExp(letter)" class="toggle-btn">
              {{ activeExp === letter ? '隱藏解析' : '看解析' }}
            </button>
          </div>

          <div v-if="activeExp === letter" class="explanation-box">
            <div class="exp-header">
              <span class="exp-title">解析 {{ letter }}</span>
              <span v-if="currentQ.answer === letter" class="correct-badge">這是正確答案</span>
            </div>
            <p class="exp-text">{{ currentQ['exp_' + letter.toLowerCase() + '_text'] || '（此選項暫無詳細解析）' }}</p>
            <a v-if="currentQ['exp_' + letter.toLowerCase() + '_url']" :href="currentQ['exp_' + letter.toLowerCase() + '_url']" target="_blank" class="exp-link">
              🔗 點此查看法條或實務見解
            </a>
          </div>
        </div>
      </div>

      <div class="exam-footer">
        <button @click="prevQuestion" :disabled="currentIndex === 0" class="nav-btn prev-btn">← 上一題</button>
        <button @click="nextQuestion" :disabled="currentIndex === questions.length - 1" class="nav-btn next-btn">下一題 →</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.practice-container { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; min-height: 100vh; color: #333;}
.top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.back-link { background: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; color: #4338ca; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: 0.2s; }
.back-link:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-1px); }
.progress-text { font-weight: bold; color: #475569; font-size: 16px; }
.status-box { text-align: center; padding: 60px; background: white; border-radius: 16px; font-weight: bold; color: #64748b; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }

/* 卡片主體 */
.exam-card { background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
.exam-header { padding: 30px; border-bottom: 1px solid #f1f5f9; }
.tags { display: flex; gap: 10px; margin-bottom: 15px; }
.subject-tag { background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 1px; }
.year-tag { background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
.question-title { margin: 0; font-size: 20px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-weight: 500; }

/* 選項區塊 */
.options-container { padding: 25px 30px; background: #fafaf9; display: flex; flex-direction: column; gap: 15px; }
.option-row { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px 20px; transition: all 0.2s ease; }
.option-row.selected { border-color: #4f46e5; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15); transform: translateY(-2px); }
.option-main { display: flex; justify-content: space-between; align-items: flex-start; }
.option-label { display: flex; align-items: flex-start; cursor: pointer; flex: 1; margin: 0; }
.opt-radio { margin-top: 5px; margin-right: 15px; transform: scale(1.2); cursor: pointer; }
.opt-text { font-size: 16px; line-height: 1.5; color: #334155; }
.toggle-btn { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 6px; color: #64748b; font-weight: bold; cursor: pointer; font-size: 13px; margin-left: 15px; flex-shrink: 0; transition: 0.2s; }
.toggle-btn:hover { background: #e0e7ff; color: #4338ca; }

/* 詳解彈出區 */
.explanation-box { margin-top: 15px; padding: 15px 20px; background: #eef2ff; border-radius: 8px; border-left: 4px solid #4f46e5; animation: fadeIn 0.3s ease; }
.exp-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.exp-title { font-weight: bold; color: #3730a3; font-size: 14px; }
.correct-badge { background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.exp-text { margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
.exp-link { display: inline-block; margin-top: 10px; color: #4f46e5; font-size: 13px; font-weight: bold; text-decoration: none; }
.exp-link:hover { text-decoration: underline; }

/* 底部按鈕 */
.exam-footer { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; background: white; }
.nav-btn { padding: 12px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; border: none; font-size: 16px; transition: 0.2s; }
.prev-btn { background: transparent; color: #64748b; }
.prev-btn:hover:not(:disabled) { color: #4338ca; background: #f8fafc; }
.next-btn { background: #4f46e5; color: white; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2); }
.next-btn:hover:not(:disabled) { background: #4338ca; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(79, 70, 229, 0.3); }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>