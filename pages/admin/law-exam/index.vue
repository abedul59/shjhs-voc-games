<script setup>
import { ref, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const questions = ref([]);
const isLoading = ref(true);
const showEditModal = ref(false);
const isUploading = ref(false);

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

  if (error) alert('儲存失敗: ' + error.message);
  else {
    showEditModal.value = false;
    fetchQuestions();
  }
};

const deleteQuestion = async (id) => {
  if (!confirm('確定要刪除這道題目嗎？此動作無法復原。')) return;
  const { error } = await supabase.from('law_exam_questions').delete().eq('id', id);
  if (error) alert('刪除失敗: ' + error.message);
  else fetchQuestions();
};

// 🌟 修正後的匯入功能：將 CSV 中文標題轉為 DB 英文欄位
const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  isUploading.value = true;
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      // 進行欄位映射轉換
      const mappedData = results.data.map(row => ({
        subject: row['科目'],
        exam_year: row['年份'],
        question_text: row['題目'],
        opt_a: row['選項A'],
        opt_b: row['選項B'],
        opt_c: row['選項C'],
        opt_d: row['選項D'],
        answer: row['正確答案'],
        exp_a_text: row['詳解A文字'],
        exp_a_url: row['詳解A網址'],
        exp_b_text: row['詳解B文字'],
        exp_b_url: row['詳解B網址'],
        exp_c_text: row['詳解C文字'],
        exp_c_url: row['詳解C網址'],
        exp_d_text: row['詳解D文字'],
        exp_d_url: row['詳解D網址']
      }));

      const { error } = await supabase.from('law_exam_questions').insert(mappedData);
      if (error) {
        alert('匯入失敗，請檢查格式或資料表欄位: ' + error.message);
      } else {
        alert(`成功匯入 ${mappedData.length} 筆題目！`);
        fetchQuestions();
      }
      isUploading.value = false;
      e.target.value = '';
    }
  });
};

// 🌟 修正後的匯出功能：將 DB 英文欄位轉為 CSV 中文標題
const exportCSV = () => {
  if (questions.value.length === 0) return alert('目前沒有題目可以匯出');
  
  const exportData = questions.value.map(q => ({
    '科目': q.subject,
    '年份': q.exam_year,
    '題目': q.question_text,
    '選項A': q.opt_a,
    '選項B': q.opt_b,
    '選項C': q.opt_c,
    '選項D': q.opt_d,
    '正確答案': q.answer,
    '詳解A文字': q.exp_a_text, '詳解A網址': q.exp_a_url,
    '詳解B文字': q.exp_b_text, '詳解B網址': q.exp_b_url,
    '詳解C文字': q.exp_c_text, '詳解C網址': q.exp_c_url,
    '詳解D文字': q.exp_d_text, '詳解D網址': q.exp_d_url,
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `law_questions_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 p-8">
    <div class="max-w-6xl mx-auto">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b-2 border-slate-200 pb-4 gap-4">
        <div>
          <h1 class="text-3xl font-black text-slate-800 tracking-tight">司律題庫管理</h1>
          <p class="text-slate-500 mt-1">管理法律考試題目、選項與詳細解析</p>
        </div>
        
        <div class="flex flex-wrap gap-3">
          <label class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm cursor-pointer active:scale-95 transition-all">
            <span v-if="isUploading">⏳ 處理中...</span>
            <span v-else>📥 匯入 CSV</span>
            <input type="file" accept=".csv" class="hidden" @change="handleImport" :disabled="isUploading" />
          </label>
          
          <button @click="exportCSV" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm active:scale-95 transition-all">
            📤 匯出備份
          </button>
          
          <button @click="openEditModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all">
            ＋ 新增考試題目
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div v-if="isLoading" class="text-center py-10 text-slate-400 font-bold">資料載入中...</div>
        
        <div v-else-if="questions.length === 0" class="text-center py-10 text-slate-400 font-bold bg-white rounded-2xl border border-dashed border-slate-300">
          目前題庫為空，請點擊上方按鈕新增或匯入題目。
        </div>

        <div v-else v-for="q in questions" :key="q.id" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:border-indigo-200 transition-all">
          <div class="flex-1 overflow-hidden pr-4">
            <div class="flex items-center gap-2 mb-1">
              <span class="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{{ q.subject }}</span>
              <span class="text-slate-400 text-xs">{{ q.exam_year }}</span>
              <span class="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">正確答案: {{ q.answer }}</span>
            </div>
            <h3 class="text-slate-700 font-medium truncate">{{ q.question_text }}</h3>
          </div>
          <div class="flex gap-2 shrink-0">
            <button @click="openEditModal(q)" class="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">編輯</button>
            <button @click="deleteQuestion(q.id)" class="text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">刪除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div class="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh]">
        <div class="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <h3 class="text-xl font-black text-slate-800">{{ editingQ.id ? '編輯司律題目資訊' : '新增司律題目' }}</h3>
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
                <input v-model="editingQ.subject" type="text" class="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1">年份/來源</label>
                <input v-model="editingQ.exam_year" type="text" class="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-bold text-slate-400 mb-1">題目內文</label>
                <textarea v-model="editingQ.question_text" rows="3" class="w-full bg-slate-50 border-0 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition-all"></textarea>
              </div>
            </div>
          </section>

          <section class="space-y-6 pb-4">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-6 bg-indigo-500 rounded-full"></div>
              <h4 class="font-bold text-slate-700">選項內容與詳細解析</h4>
            </div>

            <div v-for="letter in ['a', 'b', 'c', 'd']" :key="letter" 
                 :class="['p-6 rounded-2xl border-2 transition-all', 
                          editingQ.answer === letter.toUpperCase() ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 bg-white']">
              
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3 flex-1">
                  <span :class="['w-8 h-8 flex items-center justify-center rounded-lg font-bold text-white shrink-0', 
                                editingQ.answer === letter.toUpperCase() ? 'bg-indigo-500' : 'bg-slate-300']">
                    {{ letter.toUpperCase() }}
                  </span>
                  <input v-model="editingQ['opt_' + letter]" type="text" class="bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none py-1 w-full max-w-lg font-medium" />
                </div>
                <label class="flex items-center gap-2 cursor-pointer group ml-4 shrink-0">
                  <input type="radio" v-model="editingQ.answer" :value="letter.toUpperCase()" class="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span :class="['text-sm font-bold', editingQ.answer === letter.toUpperCase() ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600']">正確解答</span>
                </label>
              </div>

              <div class="grid grid-cols-1 gap-3 bg-white/60 p-4 rounded-xl border border-dashed border-slate-200">
                <div>
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">該選項詳解文字</label>
                  <textarea v-model="editingQ['exp_' + letter + '_text']" rows="2" class="w-full bg-transparent border-0 p-0 text-sm focus:ring-0" placeholder="請輸入解析..."></textarea>
                </div>
                <div class="flex items-center gap-2 border-t pt-2 border-slate-100">
                  <span class="text-slate-400 text-xs">🔗 參考網址:</span>
                  <input v-model="editingQ['exp_' + letter + '_url']" type="url" class="flex-1 bg-transparent border-0 text-xs text-indigo-600 underline focus:ring-0 p-0" placeholder="https://..." />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="p-6 border-t flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
          <button @click="showEditModal = false" class="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-700 transition-colors">取消</button>
          <button @click="saveQuestion" class="px-10 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all">儲存題庫資料</button>
        </div>
      </div>
    </div>
  </div>
</template>