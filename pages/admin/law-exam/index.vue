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

// 🌟 產生可選的科目與年份清單
const subjects = computed(() => {
  return ['ALL', ...new Set(questions.value.map(q => q.subject))];
});

const years = computed(() => {
  return ['ALL', ...new Set(questions.value.map(q => q.exam_year))];
});

// 🌟 篩選後的題目陣列
const filteredQuestions = computed(() => {
  return questions.value.filter(q => {
    const matchSubject = selectedSubject.value === 'ALL' || q.subject === selectedSubject.value;
    const matchYear = selectedYear.value === 'ALL' || q.exam_year === selectedYear.value;
    return matchSubject && matchYear;
  });
});

const openEditModal = (q = null) => {
  if (q) {
    editingQ.value = { ...q };
  } else {
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
  if (filteredQuestions.value.length === 0) return alert('目前沒有題目可以匯出');
  // 🌟 只匯出目前篩選出的題目
  const exportData = filteredQuestions.value.map(q => ({
    '科目': q.subject, '年份': q.exam_year, '題目': q.question_text,
    '選項A': q.opt_a, '選項B': q.opt_b, '選項C': q.opt_c, '選項D': q.opt_d,
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
  <div class="law-admin-container">
    <div class="header-section">
      <div class="title-area">
        <h1>司律題庫管理</h1>
        <p>管理法律考試題目、選項與詳細解析</p>
      </div>
      <div class="action-buttons">
        <NuxtLink to="/admin/law-exam/practice" class="btn btn-primary">🎯 開始刷題練習</NuxtLink>
        <label class="btn btn-warning" :class="{ disabled: isUploading }">
          <span v-if="isUploading">⏳ 處理中...</span>
          <span v-else>📥 匯入 CSV</span>
          <input type="file" accept=".csv" @change="handleImport" :disabled="isUploading" style="display:none;" />
        </label>
        <button @click="exportCSV" class="btn btn-success">📤 匯出備份</button>
        <button @click="openEditModal()" class="btn btn-dark">＋ 新增考試題目</button>
      </div>
    </div>

    <div class="filter-bar" v-if="questions.length > 0">
      <div class="filter-item">
        <label>科目篩選：</label>
        <select v-model="selectedSubject" class="styled-select">
          <option v-for="s in subjects" :key="s" :value="s">{{ s === 'ALL' ? '全部科目' : s }}</option>
        </select>
      </div>
      <div class="filter-item">
        <label>年份篩選：</label>
        <select v-model="selectedYear" class="styled-select">
          <option v-for="y in years" :key="y" :value="y">{{ y === 'ALL' ? '全部年份' : y }}</option>
        </select>
      </div>
      <div class="filter-info">
        共找到 {{ filteredQuestions.length }} 題
      </div>
    </div>

    <div class="question-list">
      <div v-if="isLoading" class="loading-msg">資料載入中...</div>
      <div v-else-if="questions.length === 0" class="empty-msg">目前題庫為空，請點擊上方按鈕新增或匯入題目。</div>
      <div v-else-if="filteredQuestions.length === 0" class="empty-msg">找不到符合該篩選條件的題目。</div>
      
      <div v-else v-for="q in filteredQuestions" :key="q.id" class="q-card">
        <div class="q-content">
          <div class="q-tags">
            <span class="tag-subject">{{ q.subject }}</span>
            <span class="tag-year">{{ q.exam_year }}</span>
            <span class="tag-answer">解答: {{ q.answer }}</span>
          </div>
          <h3 class="q-text">{{ q.question_text }}</h3>
        </div>
        <div class="q-actions">
          <button @click="openEditModal(q)" class="btn-small btn-edit">編輯</button>
          <button @click="deleteQuestion(q.id)" class="btn-small btn-delete">刪除</button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingQ.id ? '編輯司律題目' : '新增司律題目' }}</h2>
          <button class="close-btn" @click="showEditModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group row">
            <div class="col">
              <label>科目名稱</label>
              <input v-model="editingQ.subject" type="text" placeholder="如：民法" />
            </div>
            <div class="col">
              <label>年份/來源</label>
              <input v-model="editingQ.exam_year" type="text" placeholder="如：112 司律" />
            </div>
          </div>
          <div class="form-group">
            <label>題目內文</label>
            <textarea v-model="editingQ.question_text" rows="4"></textarea>
          </div>

          <div class="options-section">
            <div v-for="letter in ['a', 'b', 'c', 'd']" :key="letter" class="option-card" :class="{ active: editingQ.answer === letter.toUpperCase() }">
              <div class="opt-header">
                <span class="opt-letter">{{ letter.toUpperCase() }}</span>
                <input v-model="editingQ['opt_' + letter]" type="text" class="opt-input" placeholder="請輸入選項內容" />
                <label class="radio-label">
                  <input type="radio" v-model="editingQ.answer" :value="letter.toUpperCase()" />
                  正確解答
                </label>
              </div>
              <div class="exp-area">
                <label>詳解文字</label>
                <textarea v-model="editingQ['exp_' + letter + '_text']" rows="2" placeholder="請輸入解析..."></textarea>
                <label>參考網址</label>
                <input v-model="editingQ['exp_' + letter + '_url']" type="url" placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showEditModal = false" class="btn btn-outline">取消</button>
          <button @click="saveQuestion" class="btn btn-primary">儲存題庫資料</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 基礎重置與排版 */
.law-admin-container { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px 40px; background: #f4f6f8; min-height: 100vh; color: #333; }
.header-section { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
.title-area h1 { margin: 0; font-size: 28px; color: #1e293b; }
.title-area p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }

/* 🌟 篩選列樣式 */
.filter-bar { display: flex; gap: 20px; align-items: center; background: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; border: 1px solid #e2e8f0; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label { font-size: 14px; font-weight: bold; color: #64748b; }
.styled-select { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; color: #334155; background: #f8fafc; outline: none; cursor: pointer; }
.styled-select:focus { border-color: #3b82f6; }
.filter-info { margin-left: auto; font-size: 14px; font-weight: bold; color: #3b82f6; background: #eff6ff; padding: 6px 12px; border-radius: 6px; }

/* 按鈕樣式 */
.btn { padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.btn:active { transform: scale(0.96); }
.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #2563eb; }
.btn-warning { background: #f59e0b; color: white; }
.btn-warning:hover { background: #d97706; }
.btn-success { background: #10b981; color: white; }
.btn-success:hover { background: #059669; }
.btn-dark { background: #475569; color: white; }
.btn-dark:hover { background: #334155; }
.btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
.btn-outline:hover { background: #f8fafc; }
.btn-small { padding: 6px 12px; border-radius: 6px; font-weight: bold; border: none; cursor: pointer; font-size: 13px; }
.btn-edit { background: #eff6ff; color: #2563eb; }
.btn-edit:hover { background: #dbeafe; }
.btn-delete { background: #fef2f2; color: #dc2626; }
.btn-delete:hover { background: #fee2e2; }

/* 列表樣式 */
.question-list { display: flex; flex-direction: column; gap: 15px; }
.q-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; }
.q-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.q-content { flex: 1; padding-right: 20px; overflow: hidden; }
.q-text { margin: 10px 0 0 0; font-size: 16px; font-weight: 500; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.q-tags { display: flex; gap: 8px; align-items: center; }
.q-tags span { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.tag-subject { background: #e0e7ff; color: #4338ca; }
.tag-year { background: #f1f5f9; color: #64748b; }
.tag-answer { background: #dcfce3; color: #15803d; }
.q-actions { display: flex; gap: 8px; flex-shrink: 0; }
.loading-msg, .empty-msg { text-align: center; padding: 40px; color: #64748b; background: white; border-radius: 12px; border: 2px dashed #cbd5e1; }

/* 彈窗樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.7); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; }
.modal-content { background: white; border-radius: 16px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 16px 16px 0 0; }
.modal-header h2 { margin: 0; font-size: 20px; color: #1e293b; }
.close-btn { background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; border-radius: 0 0 16px 16px; }

/* 表單樣式 */
.form-group { margin-bottom: 20px; }
.form-group.row { display: flex; gap: 15px; }
.form-group .col { flex: 1; }
.modal-body label { display: block; font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 6px; }
.modal-body input[type="text"], .modal-body input[type="url"], .modal-body textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; font-family: inherit; font-size: 14px; box-sizing: border-box; }
.modal-body input:focus, .modal-body textarea:focus { outline: none; border-color: #3b82f6; background: white; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

/* 選項卡片樣式 */
.options-section { display: flex; flex-direction: column; gap: 15px; border-top: 2px dashed #e2e8f0; padding-top: 20px; }
.option-card { border: 2px solid #e2e8f0; padding: 15px; border-radius: 12px; transition: all 0.2s; }
.option-card.active { border-color: #3b82f6; background: #eff6ff; }
.opt-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.opt-letter { background: #cbd5e1; color: white; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; border-radius: 6px; font-weight: bold; flex-shrink: 0; }
.option-card.active .opt-letter { background: #3b82f6; }
.opt-input { flex: 1; border: none !important; border-bottom: 1px solid #cbd5e1 !important; border-radius: 0 !important; background: transparent !important; padding: 5px !important; }
.radio-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: bold; cursor: pointer; color: #64748b; margin: 0; }
.option-card.active .radio-label { color: #2563eb; }
.exp-area { background: rgba(255,255,255,0.6); padding: 12px; border-radius: 8px; border: 1px dashed #cbd5e1; }
.exp-area label { font-size: 10px; margin-top: 8px; }
.exp-area label:first-child { margin-top: 0; }
</style>