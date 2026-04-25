<script setup>
import { ref, computed, onMounted } from 'vue';

definePageMeta({ middleware: ["auth", "law-auth"] });

const supabase = useSupabaseClient();
const questions = ref([]);
const currentIndex = ref(0);
const selectedAnswer = ref(null);
const activeExp = ref(null);
const isLoading = ref(true);

const selectedSubject = ref('ALL');
const selectedYear = ref('ALL');

const fetchPractice = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('law_exam_questions').select('*');
  if (data) {
    const getQNum = (text) => {
      const match = text?.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 9999;
    };
    questions.value = data.sort((a, b) => {
      if (a.exam_year !== b.exam_year) return (b.exam_year || '').localeCompare(a.exam_year || '');
      if (a.subject !== b.subject) return (a.subject || '').localeCompare(b.subject || '');
      return getQNum(a.question_text) - getQNum(b.question_text);
    });
  }
  isLoading.value = false;
};

const subjects = computed(() => ['ALL', ...new Set(questions.value.map(q => q.subject))]);
const years = computed(() => ['ALL', ...new Set(questions.value.map(q => q.exam_year))]);

const filteredQuestions = computed(() => {
  return questions.value.filter(q => {
    const matchSubject = selectedSubject.value === 'ALL' || q.subject === selectedSubject.value;
    const matchYear = selectedYear.value === 'ALL' || q.exam_year === selectedYear.value;
    return matchSubject && matchYear;
  });
});

const currentQ = computed(() => filteredQuestions.value[currentIndex.value]);

const resetProgress = () => { currentIndex.value = 0; selectedAnswer.value = null; activeExp.value = null; };
const toggleExp = (letter) => { activeExp.value = activeExp.value === letter ? null : letter; };

const nextQuestion = () => {
  if (currentIndex.value < filteredQuestions.value.length - 1) {
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
      <NuxtLink to="/admin/law-exam" class="back-link">← 回專區首頁</NuxtLink>
      
      <div class="filter-group" v-if="questions.length > 0">
        <select v-model="selectedSubject" @change="resetProgress" class="styled-select">
          <option v-for="s in subjects" :key="s" :value="s">{{ s === 'ALL' ? '所有科目' : s }}</option>
        </select>
        <select v-model="selectedYear" @change="resetProgress" class="styled-select">
          <option v-for="y in years" :key="y" :value="y">{{ y === 'ALL' ? '所有年份' : y }}</option>
        </select>
      </div>

      <div class="progress-text" v-if="filteredQuestions.length > 0">
        {{ currentIndex + 1 }} / {{ filteredQuestions.length }}
      </div>
    </div>

    <div v-if="isLoading" class="status-box">題庫讀取中...</div>
    <div v-else-if="questions.length === 0" class="status-box">目前沒有可以練習的題目。</div>

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
              <span v-if="currentQ.answer === letter" class="correct-badge">正確</span>
            </div>
            <p class="exp-text">{{ currentQ['exp_' + letter.toLowerCase() + '_text'] || '暫無解析' }}</p>
            <a v-if="currentQ['exp_' + letter.toLowerCase() + '_url']" :href="currentQ['exp_' + letter.toLowerCase() + '_url']" target="_blank" class="exp-link">🔗 相關法條</a>
          </div>
        </div>
      </div>

      <div class="exam-footer">
        <button @click="prevQuestion" :disabled="currentIndex === 0" class="nav-btn prev-btn">上一題</button>
        <button @click="nextQuestion" :disabled="currentIndex === filteredQuestions.length - 1" class="nav-btn next-btn">下一題</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.practice-container { max-width: 800px; margin: 0 auto; padding: 30px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f4f8; min-height: 100vh; color: #333;}
.top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 10px;}
.back-link { background: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; color: #4338ca; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.05); white-space: nowrap;}
.filter-group { display: flex; gap: 10px; flex: 1; justify-content: center;}
.styled-select { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; background: white; outline: none; font-weight: bold; max-width: 100%;}
.progress-text { font-weight: bold; color: #475569; font-size: 16px; white-space: nowrap;}
.status-box { text-align: center; padding: 60px; background: white; border-radius: 16px; font-weight: bold; color: #64748b; }

.exam-card { background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.exam-header { padding: 25px; border-bottom: 1px solid #f1f5f9; }
.tags { display: flex; gap: 10px; margin-bottom: 15px; }
.tags span { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
.subject-tag { background: #e0e7ff; color: #4338ca; } .year-tag { background: #f1f5f9; color: #64748b; }
.question-title { margin: 0; font-size: 18px; line-height: 1.6; white-space: pre-wrap; font-weight: 500; word-break: break-word;}

.options-container { padding: 20px 25px; background: #fafaf9; display: flex; flex-direction: column; gap: 12px; }
.option-row { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; }
.option-row.selected { border-color: #4f46e5; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15); }
.option-main { display: flex; justify-content: space-between; align-items: flex-start; }
.option-label { display: flex; align-items: flex-start; cursor: pointer; flex: 1; }
.opt-radio { margin-top: 3px; margin-right: 12px; transform: scale(1.2); flex-shrink: 0;}
.opt-text { font-size: 15px; line-height: 1.5; word-break: break-word; }
.toggle-btn { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-left: 10px; cursor: pointer; flex-shrink: 0;}

.explanation-box { margin-top: 15px; padding: 15px; background: #eef2ff; border-radius: 8px; border-left: 4px solid #4f46e5; }
.exp-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-weight: bold; color: #3730a3; font-size: 14px;}
.correct-badge { background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.exp-text { margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }

.exam-footer { padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; }
.nav-btn { padding: 12px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; border: none; font-size: 15px; }
.prev-btn { background: #f1f5f9; color: #64748b; } .next-btn { background: #4f46e5; color: white; }

/* 🌟 手機版 (Mobile) 專屬優化 */
@media (max-width: 768px) {
  .practice-container { padding: 15px 10px; }
  .top-nav { flex-direction: column; align-items: stretch; gap: 15px; }
  .filter-group { flex-direction: column; }
  .styled-select { width: 100%; padding: 10px; }
  .progress-text { text-align: center; margin-bottom: 10px;}
  
  .exam-header { padding: 20px 15px; }
  .options-container { padding: 15px; }
  .option-main { flex-direction: column; gap: 12px; }
  .toggle-btn { width: 100%; margin-left: 0; padding: 10px 0; }
  
  .exam-footer { flex-direction: column-reverse; gap: 10px; padding: 15px; }
  .nav-btn { width: 100%; }
}
</style>
