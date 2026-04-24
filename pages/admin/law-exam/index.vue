<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';

// 同時套用基礎身分驗證與司律二重驗證
definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();

const questions = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);

// 編輯彈窗狀態
const showEditModal = ref(false);
const editingQ = ref({
  subject: '', exam_year: '', question_text: '',
  opt_a: '', opt_b: '', opt_c: '', opt_d: '',
  answer: 'A',
  exp_a_text: '', exp_a_url: '', exp_b_text: '', exp_b_url: '',
  exp_c_text: '', exp_c_url: '', exp_d_text: '', exp_d_url: ''
});

// 篩選與搜尋
const searchQuery = ref('');
const selectedSubject = ref('ALL');

const fetchQuestions = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('law_exam_questions').select('*').order('created_at', { ascending: false });
  if (data) questions.value = data;
  isLoading.value = false;
};

onMounted(fetchQuestions);

const filteredQuestions = computed(() => {
  let qs = questions.value;
  if (selectedSubject.value !== 'ALL') qs = qs.filter(q => q.subject === selectedSubject.value);
  if (searchQuery.value) qs = qs.filter(q => q.question_text.includes(searchQuery.value));
  return qs;
});

const subjects = computed(() => ['ALL', ...new Set(questions.value.map(q => q.subject))]);

// 🌟 開啟新增/編輯彈窗
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

// 🌟 儲存編輯內容
const saveQuestion = async () => {
  const { id, ...payload } = editingQ.value;
  let error;
  
  if (id) {
    ({ error } = await supabase.from('law_exam_questions').update(payload).eq('id', id));
  } else {
    ({ error } = await supabase.from('law_exam_questions').insert([payload]));
  }

  if (error) alert('儲存失敗: ' + error.message);
  else {
    showEditModal.value = false;
    fetchQuestions();
  }
};

const deleteQuestion = async (id) => {
  if (!confirm('確定要刪除這題嗎？')) return;
  const { error } = await supabase.from('law_exam_questions').delete().eq('id', id);
  if (!error) fetchQuestions();
};

// 🌟 CSV 匯入與匯出 (保留原功能)
const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const { error } = await supabase.from('law_exam_questions').insert(results.data);
      if (error) alert('匯入失敗: ' + error.message);
      else {
        alert('匯入成功！');
        fetchQuestions();
      }
      isUploading.value = false;
    }
  });
};

const exportCSV = () => {
  const csv = Papa.unparse(questions.value);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `law_questions_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
};
</script>

<template>
  <div class="admin-container p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-slate-800">司律題庫管理中心</h1>
      <div class="flex gap-2">
        <button @click="openEditModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">＋ 新增題目</button>
        <button @click="exportCSV" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">📤 匯出 CSV</button>
        <label class="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 cursor-pointer">
          📥 匯入 CSV
          <input type="file" @change="handleImport" class="hidden" accept=".csv" />
        </label>
      </div>
    </div>

    <div class="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-center">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">科目篩選:</span>
        <select v-model="selectedSubject" class="border rounded-md px-2 py-1">
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <input v-model="searchQuery" type="text" placeholder="搜尋題目關鍵字..." class="border rounded-md px-3 py-1 flex-1" />
    </div>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-100 text-slate-600 text-sm">
          <tr>
            <th class="p-4 border-b">科目/年份</th>
            <th class="p-4 border-b">題目內容</th>
            <th class="p-4 border-b">正確答案</th>
            <th class="p-4 border-b text-center w-32">操作</th>
          </tr>
        </thead>
        <tbody v-if="!isLoading">
          <tr v-for="q in filteredQuestions" :key="q.id" class="hover:bg-slate-50 border-b last:border-0 transition-colors">
            <td class="p-4">
              <span class="font-bold text-indigo-600 block">{{ q.subject }}</span>
              <span class="text-xs text-slate-400">{{ q.exam_year }}</span>
            </td>
            <td class="p-4 max-w-lg truncate">{{ q.question_text }}</td>
            <td class="p-4 font-mono font-bold">{{ q.answer }}</td>
            <td class="p-4">
              <div class="flex gap-2 justify-center">
                <button @click="openEditModal(q)" class="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100">編輯</button>
                <button @click="deleteQuestion(q.id)" class="p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100">刪除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="isLoading" class="p-10 text-center text-slate-400">載入中...</div>
    </div>

    <div v-if="showEditModal" class="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 overflow-y-auto">
      <div class="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold mb-6 text-indigo-900 border-b pb-4">{{ editingQ.id ? '編輯題目' : '新增題目' }}</h3>
        
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div class="col-span-1">
            <label class="block text-sm font-bold mb-1">科目</label>
            <input v-model="editingQ.subject" type="text" class="w-full border rounded-lg p-2" placeholder="例如：民法" />
          </div>
          <div class="col-span-1">
            <label class="block text-sm font-bold mb-1">年份/來源</label>
            <input v-model="editingQ.exam_year" type="text" class="w-full border rounded-lg p-2" placeholder="例如：112司律一試" />
          </div>
          <div class="col-span-2">
            <label class="block text-sm font-bold mb-1">題目內容</label>
            <textarea v-model="editingQ.question_text" rows="4" class="w-full border rounded-lg p-2"></textarea>
          </div>
        </div>

        <div class="space-y-6">
          <div v-for="letter in ['a', 'b', 'c', 'd']" :key="letter" class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="flex gap-4 mb-2">
              <div class="flex-1">
                <label class="block text-sm font-bold text-slate-700 mb-1 uppercase">選項 {{ letter }} 內容</label>
                <input v-model="editingQ['opt_' + letter]" type="text" class="w-full border rounded-lg p-2 bg-white" />
              </div>
              <div class="w-32 flex items-end pb-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" v-model="editingQ.answer" :value="letter.toUpperCase()" class="w-4 h-4" />
                  <span class="text-sm font-bold">正確答案</span>
                </label>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-2 border-t pt-3 border-dashed border-slate-300">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1 uppercase">選項 {{ letter }} 詳解文字</label>
                <textarea v-model="editingQ['exp_' + letter + '_text']" rows="2" class="w-full border rounded p-2 text-sm bg-white"></textarea>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1 uppercase">選項 {{ letter }} 法條網址 (URL)</label>
                <input v-model="editingQ['exp_' + letter + '_url']" type="url" class="w-full border rounded p-2 text-sm bg-white" placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-8 sticky bottom-0 bg-white pt-4">
          <button @click="showEditModal = false" class="px-6 py-2 border rounded-lg hover:bg-gray-50">取消</button>
          <button @click="saveQuestion" class="px-10 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">儲存變更</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { font-family: 'Inter', sans-serif; }
table th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
</style>