<script setup>
import { ref, computed, onMounted } from 'vue';

// 確保刷題頁面也有雙重保護
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
  // 隨機撈取題目，或者您可以拿掉 .order('random') 改為順序播放
  const { data } = await supabase.from('law_exam_questions').select('*');
  if (data) {
    // 在前端做個簡單的隨機打亂
    questions.value = data.sort(() => Math.random() - 0.5); 
  }
  isLoading.value = false;
};

const toggleExp = (letter) => {
  activeExp.value = activeExp.value === letter ? null : letter;
};

const nextQuestion = () => {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++;
    selectedAnswer.value = null;
    activeExp.value = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    selectedAnswer.value = null;
    activeExp.value = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

onMounted(fetchPractice);
</script>

<template>
  <div class="min-h-screen bg-slate-100 py-10 px-4">
    <div class="max-w-3xl mx-auto">
      
      <div class="flex justify-between items-center mb-6">
        <NuxtLink to="/admin/law-exam" class="text-indigo-600 hover:text-indigo-800 font-bold bg-white px-4 py-2 rounded-lg shadow-sm transition-all hover:shadow-md">
          ← 回題庫管理
        </NuxtLink>
        <div class="text-slate-700 font-bold" v-if="questions.length > 0">
          題目 {{ currentIndex + 1 }} / {{ questions.length }}
        </div>
        <div class="w-28"></div> </div>

      <div v-if="isLoading" class="text-center py-20 text-slate-500 font-bold text-xl">
        題庫讀取中...
      </div>

      <div v-else-if="questions.length === 0" class="text-center py-20 text-slate-500 font-bold text-xl bg-white rounded-2xl shadow">
        目前沒有可以練習的題目，請先至後台匯入題庫。
      </div>

      <div v-else class="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        <div class="p-6 md:p-8 bg-white border-b border-slate-100">
          <div class="flex gap-2 mb-4">
            <span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {{ currentQ.subject }}
            </span>
            <span class="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {{ currentQ.exam_year }}
            </span>
          </div>
          <h2 class="text-xl text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
            {{ currentQ.question_text }}
          </h2>
        </div>

        <div class="p-4 md:p-6 space-y-4 bg-slate-50">
          <div 
            v-for="letter in ['A', 'B', 'C', 'D']" 
            :key="letter"
            :class="[
              'group relative bg-white border-2 rounded-xl p-4 transition-all duration-200',
              selectedAnswer === letter ? 'border-indigo-500 shadow-md' : 'border-white hover:border-slate-200'
            ]"
          >
            <div class="flex items-start justify-between">
              <label class="flex items-start cursor-pointer flex-1 mr-4">
                <input 
                  type="radio" 
                  v-model="selectedAnswer" 
                  :value="letter" 
                  class="mt-1 w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                />
                <span class="ml-3 text-slate-700 leading-snug">
                  <span class="font-bold mr-1">{{ letter }}.</span> {{ currentQ['opt_' + letter.toLowerCase()] }}
                </span>
              </label>

              <button 
                @click="toggleExp(letter)"
                class="shrink-0 bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                title="顯示此選項詳解"
              >
                {{ activeExp === letter ? '隱藏解析' : '看解析' }}
              </button>
            </div>

            <div 
              v-if="activeExp === letter" 
              class="mt-4 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2"
            >
              <div class="flex items-center gap-2 text-indigo-800 font-bold mb-2 text-sm">
                <span>解析 {{ letter }}</span>
                <span v-if="currentQ.answer === letter" class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">這是正確答案</span>
              </div>
              
              <p class="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                {{ currentQ['exp_' + letter.toLowerCase() + '_text'] || '（此選項暫無詳細解析）' }}
              </p>
              
              <a 
                v-if="currentQ['exp_' + letter.toLowerCase() + '_url']" 
                :href="currentQ['exp_' + letter.toLowerCase() + '_url']" 
                target="_blank" 
                class="mt-3 inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors underline underline-offset-2"
              >
                🔗 點此查看法條或實務見解
              </a>
            </div>
          </div>
        </div>

        <div class="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
          <button 
            @click="prevQuestion" 
            :disabled="currentIndex === 0" 
            class="text-slate-500 font-bold disabled:opacity-30 hover:text-indigo-600 transition-colors"
          >
            ← 上一題
          </button>

          <button 
            @click="nextQuestion" 
            :disabled="currentIndex === questions.length - 1"
            class="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none active:scale-95"
          >
            下一題 →
          </button>
        </div>
      </div>
      
    </div>
  </div>
</template>