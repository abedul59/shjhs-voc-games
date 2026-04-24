<template>
  <div class="min-h-screen bg-slate-100 py-10 px-4">
    <div class="max-w-3xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <button @click="prevQuestion" :disabled="currentIndex === 0" class="text-slate-500 disabled:opacity-30">← 上一題</button>
        <div class="text-slate-700 font-bold">
          題目 {{ currentIndex + 1 }} / {{ questions.length }}
        </div>
        <button @click="nextQuestion" :disabled="currentIndex === questions.length - 1" class="text-slate-500 disabled:opacity-30">下一題 →</button>
      </div>

      <div v-if="currentQ" class="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
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
            v-for="(text, index) in currentQ.options" 
            :key="index"
            :class="[
              'group relative bg-white border-2 rounded-xl p-4 transition-all duration-200',
              selectedAnswer === getLetter(index) ? 'border-indigo-500 shadow-md' : 'border-white hover:border-slate-200'
            ]"
          >
            <div class="flex items-start justify-between">
              <label class="flex items-start cursor-pointer flex-1 mr-4">
                <input 
                  type="radio" 
                  v-model="selectedAnswer" 
                  :value="getLetter(index)" 
                  class="mt-1 w-5 h-5 text-indigo-600"
                />
                <span class="ml-3 text-slate-700 leading-snug">
                  <span class="font-bold mr-1">{{ getLetter(index) }}.</span> {{ text }}
                </span>
              </label>

              <button 
                @click="toggleExp(getLetter(index))"
                class="shrink-0 bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 p-2 rounded-lg transition-colors"
                title="顯示此選項詳解"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <div 
              v-if="activeExp === getLetter(index)" 
              class="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2"
            >
              <div class="flex items-center gap-2 text-indigo-800 font-bold mb-1 text-sm">
                <span>解析 {{ getLetter(index) }}</span>
                <span v-if="currentQ.correct_answer === getLetter(index)" class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">正確答案</span>
              </div>
              <p class="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                {{ currentQ.explanations?.[getLetter(index)]?.text || '此選項暫無詳細解析。' }}
              </p>
              <a 
                v-if="currentQ.explanations?.[getLetter(index)]?.url" 
                :href="currentQ.explanations?.[getLetter(index)]?.url" 
                target="_blank" 
                class="mt-3 inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
              >
                🔗 點此查看法條或實務見解
              </a>
            </div>
          </div>
        </div>

        <div class="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
          <div class="text-sm text-slate-400">
            * 點擊選項右側圖示可直接查看該選項詳解
          </div>
          <button 
            @click="nextQuestion" 
            class="bg-indigo-600 text-white px-8 py-2 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            下一題
          </button>
        </div>
      </div>
      
      <div v-else class="text-center py-20 text-slate-500">
        題庫讀取中，或目前無題目...
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ 
  // 順序很重要：先檢查是否為管理員(auth)，再檢查是否通過司律驗證(law-auth)
  middleware: ["auth", "law-auth"] 
})

const supabase = useSupabaseClient()
const questions = ref([])
const currentIndex = ref(0)
const selectedAnswer = ref(null)
const activeExp = ref(null)

const getLetter = (i) => String.fromCharCode(65 + i)
const currentQ = computed(() => questions.value[currentIndex.value])

const fetchPractice = async () => {
  const { data } = await supabase.from('law_exam_questions').select('*')
  if (data) questions.value = data.sort(() => Math.random() - 0.5) // 隨機出題
}

const toggleExp = (letter) => {
  activeExp.value = activeExp.value === letter ? null : letter
}

const nextQuestion = () => {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    selectedAnswer.value = null
    activeExp.value = null
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    selectedAnswer.value = null
    activeExp.value = null
  }
}

onMounted(fetchPractice)
</script>