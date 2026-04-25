<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const questions = ref([]);
const isLoading = ref(true);
const showEditModal = ref(false);
const isUploading = ref(false);

const selectedSubject = ref('ALL');
const selectedYear = ref('ALL');
const selectedIds = ref([]);
const showPreviewModal = ref(false);
const previewQ = ref(null);
const previewActiveExp = ref(null);

const editingQ = ref({
  subject: '', exam_year: '', question_text: '',
  opt_a: '', opt_b: '', opt_c: '', opt_d: '', answer: 'A',
  exp_a_text: '', exp_a_url: '', exp_b_text: '', exp_b_url: '',
  exp_c_text: '', exp_c_url: '', exp_d_text: '', exp_d_url: ''
});

const fetchQuestions = async () => {
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
  selectedIds.value = []; 
};

onMounted(fetchQuestions);

const subjects = computed(() => ['ALL', ...new Set(questions.value.map(q => q.subject))]);
const years = computed(() => ['ALL', ...new Set(questions.value.map(q => q.exam_year))]);

const filteredQuestions = computed(() => {
  return questions.value.filter(q => {
    const matchSubject = selectedSubject.value === 'ALL' || q.subject === selectedSubject.value;
    const matchYear = selectedYear.value === 'ALL' || q.exam_year === selectedYear.value;
    return matchSubject && matchYear;
  });
});

const isAllSelected = computed(() => filteredQuestions.value.length > 0 && filteredQuestions.value.every(q => selectedIds.value.includes(q.id)));

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    const filteredIds = filteredQuestions.value.map(q => q.id);
    selectedIds.value = selectedIds.value.filter(id => !filteredIds.includes(id));
  } else {
    const newSelections = filteredQuestions.value.map(q => q.id);
    selectedIds.value = [...new Set([...selectedIds.value, ...newSelections])];
  }
};

const toggleSelection = (id) => {
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter(i => i !== id);
  else selectedIds.value.push(id);
};

const openPreviewModal = (q) => {
  previewQ.value = q; previewActiveExp.value = null; showPreviewModal.value = true;
};
const togglePreviewExp = (letter) => {
  previewActiveExp.value = previewActiveExp.value === letter ? null : letter;
};

const openEditModal = (q = null) => {
  if (q) editingQ.value = { ...q };
  else {
    editingQ.value = {
      subject: '', exam_year: '', question_text: '',
      opt_a: '', opt_b: '', opt_c: '', opt_d: '', answer: 'A',
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
  else { showEditModal.value = false; fetchQuestions(); }
};

const deleteQuestion = async (id) => {
  if (!confirm('確定要刪除這道題目嗎？此動作無法復原。')) return;
  const { error } = await supabase.from('law_exam_questions').delete().eq('id', id);
  if (error) alert('刪除失敗: ' + error.message); else fetchQuestions();
};

const batchDelete = async () => {
  if (selectedIds.value.length === 0) return;
  if (!confirm(`確定要刪除選取的 ${selectedIds.value.length} 道題目嗎？此動作無法復原。`)) return;
  const { error } = await supabase.from('law_exam_questions').delete().in('id', selectedIds.value);
  if (error) alert('批次刪除失敗: ' + error.message); else fetchQuestions();
};

const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const mappedData = results.data.map(row => ({
        subject: row['科目'], exam_year: row['年份'], question_text: row['題目'],
        opt_a: row['選項A'], opt_b: row['選項B'], opt_c: row['選項C'], opt_d: row['選項D'],
        answer: row['正確答案'],
        exp_a_text: row['詳解A文字'], exp_a_url: row['詳解A網址'],
        exp_b_text: row['詳解B文字'], exp_b_url: row['詳解B網址'],
        exp_c_text: row['詳解C文字'], exp_c_url: row['詳解C網址'],
        exp_d_text: row['詳解D文字'], exp_d_url: row['詳解D網址']
      }));
      const { error } = await supabase.from('law_exam_questions').insert(mappedData);
      if (error) alert('匯入失敗: ' + error.message);
      else { alert(`成功匯入 ${mappedData.length} 筆題目！`); fetchQuestions(); }
      isUploading.value = false; e.target.value = ''; 
    }
  });
};

const exportCSV = () => {
  let targetQs = selectedIds.value.length > 0 ? questions.value.filter(q => selectedIds.value.includes(q.id)) : filteredQuestions.value;
  if (targetQs.length === 0) return alert('目前沒有題目可以匯出');
  const exportData = targetQs.map(q => ({
    '科目': q.subject, '年份': q.exam_year, '題目': q.question_text,
    '選項A': q.opt_a, '選項B': q.opt_b, '選項C': q.opt_c, '選項D': q.opt_d, '正確答案': q.answer,
    '詳解A文字': q.exp_a_text, '詳解A網址': q.exp_a_url, '詳解B文字': q.exp_b_text, '詳解B網址': q.exp_b_url,
    '詳解C文字': q.exp_c_text, '詳解C網址': q.exp_c_url, '詳解D文字': q.exp_d_text, '詳解D網址': q.exp_d_url,
  }));
  const csv = Papa.unparse(exportData);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `law_questions.csv`; link.click();
};
</script>

<template>
  <div class="law-admin-container">
    <div class="header-section">
      <div class="title-area">
        <NuxtLink to="/admin/law-exam" class="back-link">← 回專區首頁</NuxtLink>
        <h1>題庫管理</h1>
      </div>
      <div class="action-buttons">
        <label class="btn btn-warning" :class="{ disabled: isUploading }">
          <span v-if="isUploading">⏳ 處理中...</span><span v-else>📥 匯入</span>
          <input type="file" accept=".csv" @change="handleImport" :disabled="isUploading" style="display:none;" />
        </label>
        <button @click="exportCSV" class="btn btn-success">📤 匯出</button>
        <button @click="batchDelete" class="btn btn-danger" v-if="selectedIds.length > 0">🗑️ 刪除選取 ({{ selectedIds.length }})</button>
        <button @click="openEditModal()" class="btn btn-dark">＋ 新增題目</button>
      </div>
    </div>

    <div class="filter-bar" v-if="questions.length > 0">
      <label class="checkbox-container select-all-btn">
        <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
        <span class="checkmark"></span> 全選
      </label>
      <div class="filter-group-mobile">
        <select v-model="selectedSubject" class="styled-select"><option v-for="s in subjects" :key="s" :value="s">{{ s === 'ALL' ? '全部科目' : s }}</option></select>
        <select v-model="selectedYear" class="styled-select"><option v-for="y in years" :key="y" :value="y">{{ y === 'ALL' ? '全部年份' : y }}</option></select>
      </div>
    </div>

    <div class="question-list">
      <div v-if="isLoading" class="empty-msg">資料載入中...</div>
      <div v-else-if="filteredQuestions.length === 0" class="empty-msg">無符合題目。</div>
      <div v-else v-for="q in filteredQuestions" :key="q.id" class="q-card" :class="{ 'is-selected': selectedIds.includes(q.id) }">
        <label class="checkbox-container item-checkbox">
          <input type="checkbox" :checked="selectedIds.includes(q.id)" @change="toggleSelection(q.id)" /><span class="checkmark"></span>
        </label>
        <div class="q-content">
          <div class="q-tags"><span class="tag-subject">{{ q.subject }}</span><span class="tag-year">{{ q.exam_year }}</span></div>
          <h3 class="q-text">{{ q.question_text }}</h3>
        </div>
        <div class="q-actions">
          <button @click="openPreviewModal(q)" class="btn-small btn-preview">預覽</button>
          <button @click="openEditModal(q)" class="btn-small btn-edit">編輯</button>
          <button @click="deleteQuestion(q.id)" class="btn-small btn-delete">刪除</button>
        </div>
      </div>
    </div>

    <div v-if="showPreviewModal" class="modal-overlay" @click.self="showPreviewModal = false">
      <div class="modal-content preview-content">
        <div class="modal-header"><h2>👀 題目預覽</h2><button class="close-btn" @click="showPreviewModal = false">✕</button></div>
        <div class="modal-body preview-body">
          <div class="exam-header"><h2 class="question-title">{{ previewQ.question_text }}</h2></div>
          <div class="options-container">
            <div v-for="letter in ['A', 'B', 'C', 'D']" :key="letter" class="option-row" :class="{ 'is-correct': previewQ.answer === letter }">
              <div class="option-main">
                <div class="option-label"><span class="opt-radio-mock"></span><span class="opt-text"><strong>{{ letter }}.</strong> {{ previewQ['opt_' + letter.toLowerCase()] }}</span></div>
                <button @click="togglePreviewExp(letter)" class="toggle-btn">解析</button>
              </div>
              <div v-if="previewActiveExp === letter" class="explanation-box">
                <div class="exp-header"><span class="exp-title">解析 {{ letter }}</span><span v-if="previewQ.answer === letter" class="correct-badge">正確</span></div>
                <p class="exp-text">{{ previewQ['exp_' + letter.toLowerCase() + '_text'] || '暫無解析' }}</p>
                <a v-if="previewQ['exp_' + letter.toLowerCase() + '_url']" :href="previewQ['exp_' + letter.toLowerCase() + '_url']" target="_blank" class="exp-link">🔗 相關連結</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header"><h2>{{ editingQ.id ? '編輯題目' : '新增題目' }}</h2><button class="close-btn" @click="showEditModal = false">✕</button></div>
        <div class="modal-body">
          <div class="form-group row">
            <div class="col"><label>科目</label><input v-model="editingQ.subject" type="text" /></div>
            <div class="col"><label>年份</label><input v-model="editingQ.exam_year" type="text" /></div>
          </div>
          <div class="form-group"><label>題目內文</label><textarea v-model="editingQ.question_text" rows="4"></textarea></div>
          <div class="options-section">
            <div v-for="letter in ['a', 'b', 'c', 'd']" :key="letter" class="option-card" :class="{ active: editingQ.answer === letter.toUpperCase() }">
              <div class="opt-header">
                <span class="opt-letter">{{ letter.toUpperCase() }}</span>
                <input v-model="editingQ['opt_' + letter]" type="text" class="opt-input" placeholder="選項內容" />
                <label class="radio-label"><input type="radio" v-model="editingQ.answer" :value="letter.toUpperCase()" />正確</label>
              </div>
              <div class="exp-area">
                <textarea v-model="editingQ['exp_' + letter + '_text']" rows="2" placeholder="解析..."></textarea>
                <input v-model="editingQ['exp_' + letter + '_url']" type="url" placeholder="網址" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showEditModal = false" class="btn btn-outline">取消</button>
          <button @click="saveQuestion" class="btn btn-primary">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.law-admin-container { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px 40px; background: #f4f6f8; min-height: 100vh; color: #333; }
.back-link { font-size: 14px; font-weight: bold; color: #4338ca; text-decoration: none; margin-bottom: 5px; display: inline-block; }
.header-section { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
.title-area h1 { margin: 0; font-size: 24px; color: #1e293b; }
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }

.filter-bar { display: flex; gap: 15px; align-items: center; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; flex-wrap: wrap;}
.filter-group-mobile { display: flex; gap: 10px; flex: 1; }
.styled-select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; flex: 1; outline: none; background: #f8fafc;}

.checkbox-container { display: flex; align-items: center; position: relative; cursor: pointer; font-size: 14px; font-weight: bold; padding-left: 30px;}
.checkbox-container input { position: absolute; opacity: 0; }
.checkmark { position: absolute; top: 50%; left: 0; transform: translateY(-50%); height: 22px; width: 22px; background-color: #e2e8f0; border-radius: 6px; }
.checkbox-container input:checked ~ .checkmark { background-color: #3b82f6; }
.checkmark:after { content: ""; position: absolute; display: none; left: 8px; top: 4px; width: 5px; height: 10px; border: solid white; border-width: 0 3px 3px 0; transform: rotate(45deg); }
.checkbox-container input:checked ~ .checkmark:after { display: block; }
.select-all-btn { padding: 8px 12px 8px 40px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; }

.btn { padding: 8px 16px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 14px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: white;}
.btn-primary { background: #3b82f6; } .btn-warning { background: #f59e0b; } .btn-success { background: #10b981; } .btn-dark { background: #475569; } .btn-danger { background: #ef4444; } .btn-outline { background: white; color: #475569; border: 1px solid #cbd5e1; }
.btn-small { padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid transparent; cursor: pointer; }
.btn-preview { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0;} .btn-edit { background: #eff6ff; color: #2563eb; border-color: #bfdbfe;} .btn-delete { background: #fef2f2; color: #dc2626; border-color: #fecaca;}

.q-card { background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; margin-bottom: 12px; }
.q-card.is-selected { background: #f0fdf4; border-color: #86efac; }
.q-content { flex: 1; padding-right: 15px; overflow: hidden; }
.q-text { margin: 8px 0 0 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.q-tags span { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 5px; }
.tag-subject { background: #e0e7ff; color: #4338ca; } .tag-year { background: #f1f5f9; color: #64748b; }
.q-actions { display: flex; gap: 8px; flex-shrink: 0; }
.empty-msg { text-align: center; padding: 30px; color: #64748b; background: white; border-radius: 12px; border: 2px dashed #cbd5e1; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 15px; }
.modal-content { background: white; border-radius: 16px; width: 100%; max-width: 700px; max-height: 90vh; display: flex; flex-direction: column; }
.modal-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; font-size: 18px; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 15px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }

.form-group { margin-bottom: 15px; } .form-group.row { display: flex; gap: 15px; } .col { flex: 1; }
.modal-body label { display: block; font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 5px; }
.modal-body input, .modal-body textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; box-sizing: border-box;}
.options-section { display: flex; flex-direction: column; gap: 15px; }
.option-card { border: 2px solid #e2e8f0; padding: 15px; border-radius: 12px; }
.option-card.active { border-color: #3b82f6; background: #eff6ff; }
.opt-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.opt-letter { background: #cbd5e1; color: white; width: 28px; height: 28px; display: flex; justify-content: center; align-items: center; border-radius: 6px; font-weight: bold; }
.option-card.active .opt-letter { background: #3b82f6; }
.opt-input { flex: 1; border: none !important; border-bottom: 1px solid #cbd5e1 !important; border-radius: 0 !important; background: transparent !important; }
.exp-area input, .exp-area textarea { margin-top: 5px; }

/* 預覽模式 */
.preview-body { background: #f0f4f8; padding: 0; }
.exam-header { padding: 20px; background: white; border-bottom: 1px solid #e2e8f0; }
.question-title { margin: 0; font-size: 16px; line-height: 1.5; white-space: pre-wrap; }
.options-container { padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.option-row { background: white; border: 2px solid #e2e8f0; border-radius: 12px; padding: 15px; }
.option-row.is-correct { border-color: #22c55e; }
.option-main { display: flex; justify-content: space-between; align-items: flex-start; }
.option-label { display: flex; flex: 1; }
.opt-radio-mock { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1; margin-right: 10px; margin-top: 2px; flex-shrink: 0;}
.option-row.is-correct .opt-radio-mock { border-color: #22c55e; background: #22c55e; box-shadow: inset 0 0 0 3px white; }
.opt-text { font-size: 15px; line-height: 1.4; word-break: break-word;}
.toggle-btn { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-left: 10px; cursor: pointer; flex-shrink:0;}
.explanation-box { margin-top: 15px; padding: 15px; background: #eef2ff; border-radius: 8px; border-left: 4px solid #4f46e5; }
.exp-text { font-size: 14px; white-space: pre-wrap; line-height: 1.5; margin: 10px 0;}

/* 🌟 手機版 (Mobile) 專屬優化 */
@media (max-width: 768px) {
  .law-admin-container { padding: 15px 10px; }
  .header-section { flex-direction: column; align-items: stretch; gap: 15px; }
  .action-buttons { flex-direction: column; width: 100%; }
  .action-buttons > * { width: 100%; text-align: center; }
  
  .filter-bar { flex-direction: column; align-items: stretch; }
  .filter-group-mobile { flex-direction: column; }
  
  .q-card { flex-direction: column; align-items: stretch; gap: 12px; }
  .q-content { padding-right: 0; }
  .q-text { white-space: normal; /* 取消省略號，讓手機顯示完整題目預覽 */ }
  .q-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; }
  .btn-small { text-align: center; padding: 8px 0; }

  .form-group.row { flex-direction: column; gap: 15px; }
  .opt-header { flex-wrap: wrap; }
  .opt-input { min-width: 100%; margin-top: 5px; }

  /* 預覽彈窗在手機上的優化 */
  .option-main { flex-direction: column; gap: 10px; }
  .toggle-btn { width: 100%; margin-left: 0; padding: 10px 0; }
}
</style>
