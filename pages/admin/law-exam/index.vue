<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const questions = ref([]);
const isLoading = ref(true);
const showEditModal = ref(false);

const editingQ = ref({
  subject: '', exam_year: '', question_text: '',
  opt_a: '', opt_b: '', opt_c: '', opt_d: '',
  answer: 'A',
  exp_a_text: '', exp_a_url: '', exp_b_text: '', exp_b_url: '',
  exp_c_text: '', exp_c_url: '', exp_d_text: '', exp_d_url: ''
});

const fetchQuestions = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('law_exam_questions').select('*').order('created_at', { ascending: false });
  if (data) questions.value = data;
  isLoading.value = false;
};

onMounted(fetchQuestions);

const openEditModal = (q = null) => {
  if (q) {
    editingQ.value = { ...q };
  } else {
    editingQ.value = {
      subject: '', exam_year: '', question_text: '',
      opt_a: '', opt_b: '', opt_c: '', opt_d: '',
      answer: 'A',
      exp_a_text: '', exp_a_url: '', exp_b_text: '', exp_b_url: '',
      exp_c_text: '', exp_c_url: '', exp_d_text: '', exp_d_url: ''
    };
  }
  showEditModal.value = true;
};

const saveQuestion = async () => {
  const { id, ...payload } = editingQ.value;
  let error;
  if (id) ({ error } = await supabase.from('law_exam_questions').update(payload).eq('id', id));
  else ({ error } = await supabase.from('law_exam_questions').insert([payload]));

  if (error) alert('儲存失敗');
  else {
    showEditModal.value = false;
    fetchQuestions();
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 p-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex justify-between items-end mb-8 border-b-2 border-slate-200 pb-4">
        <div>
          <h1 class="text-3xl font-black text-slate-800 tracking-tight">司律題庫管理</h1>
          <p class="text-slate-500 mt-1">管理法律考試題目、選項與詳細解析</p>
        </div>
        <button @click="openEditModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95">
          ＋ 新增考試題目
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div v-for="q in questions" :key="q.id" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:border-indigo-200 transition-colors">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded uppercase">{{ q.subject }}</span>
              <span class="text-slate-400 text-xs">{{ q.exam_year }}</span>
            </div>
            <h3 class="text-slate-700 font-medium truncate max-w-2xl">{{ q.question_text }}</h3>
          </div>
          <div class="flex gap-2 ml-4">
            <button @click="openEditModal(q)" class="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">編輯</button>
            <button class="text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">刪除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh]">
        
        <div class="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <h3 class="text-xl font-black text-slate-800">編輯司律題目資訊</h3>
          <button @click="showEditModal = false" class="text-slate-400 hover:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-8 overflow-y-auto space-y-8">
          
          <section>
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-6 bg-indigo-500 rounded-full"></div>
              <h4 class="font-bold text-slate-700">題目基本資訊</h4>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">科目名稱</label>
                <input v-model="editingQ.subject" type="text" class="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="如：民法" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">年份/來源</label>
                <input v-model="editingQ.exam_year" type="text" class="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="如：112 司律一試" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 mb-1">題目內文</label>
                <textarea v-model="editingQ.question_text" rows="3" class="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="請輸入完整題目內容..."></textarea>
              </div>
            </div>
          </section>

          <section class="space-y-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-6 bg-indigo-500 rounded-full"></div>
              <h4 class="font-bold text-slate-700">選項、解析與法條</h4>
            </div>

            <div v-for="letter in ['a', 'b', 'c', 'd']" :key="letter" 
                 :class="['p-6 rounded-2xl border-2 transition-all', 
                          editingQ.answer === letter.toUpperCase() ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 bg-white']">
              
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <span :class="['w-8 h-8 flex items-center justify-center rounded-lg font-bold text-white', 
                                editingQ.answer === letter.toUpperCase() ? 'bg-indigo-500' : 'bg-slate-300']">
                    {{ letter.toUpperCase() }}
                  </span>
                  <input v-model="editingQ['opt_' + letter]" type="text" class="bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none py-1 w-[400px] font-medium" placeholder="請輸入選項內容" />
                </div>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" v-model="editingQ.answer" :value="letter.toUpperCase()" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span :class="['text-sm font-bold', editingQ.answer === letter.toUpperCase() ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600']">正確解答</span>
                </label>
              </div>

              <div class="grid grid-cols-1 gap-3 bg-white/60 p-4 rounded-xl border border-dashed border-slate-200">
                <div>
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">該選項詳解文字</label>
                  <textarea v-model="editingQ['exp_' + letter + '_text']" rows="2" class="w-full bg-transparent border-0 p-0 text-sm focus:ring-0" placeholder="請輸入此選項的法律分析..."></textarea>
                </div>
                <div class="flex items-center gap-2 border-t pt-2 border-slate-100">
                  <span class="text-slate-400">🔗</span>
                  <input v-model="editingQ['exp_' + letter + '_url']" type="url" class="flex-1 bg-transparent border-0 text-xs text-indigo-600 underline focus:ring-0 p-0" placeholder="法條網址 (https://...)" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="p-6 border-t flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
          <button @click="showEditModal = false" class="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-700 transition-colors">
            取消修改
          </button>
          <button @click="saveQuestion" class="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95">
            儲存題庫資料
          </button>
        </div>
      </div>
    </div>
  </div>
</template>