<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const questions = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);

// 🌟 篩選與分類用狀態
const selectedYearFilter = ref('ALL');
const showEditModal = ref(false);
const editingQuestion = ref({});

const fetchQuestions = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('exam2_questions').select('*').order('year', { ascending: false }).order('group_id', { ascending: true }).order('question_num', { ascending: true });
  if (data) questions.value = data;
  isLoading.value = false;
};

onMounted(fetchQuestions);

// 🌟 計算目前有哪些年份可供篩選
const availableYears = computed(() => {
  const years = questions.value.map(q => q.year);
  return [...new Set(years)].sort((a, b) => b - a);
});

// 🌟 根據選中的年份篩選題目
const filteredQuestions = computed(() => {
  if (selectedYearFilter.value === 'ALL') return questions.value;
  return questions.value.filter(q => q.year === parseInt(selectedYearFilter.value));
});

// 🌟 CSV 匯出功能 (包含防逗號切斷處理)
const handleExportCsv = () => {
  if (questions.value.length === 0) return alert("目前沒有資料可以匯出！");
  
  const exportData = questions.value.map(q => ({
    "年份": q.year,
    "題組編號": q.group_id,
    "圖片網址": q.image_url,
    "題號": q.question_num,
    "題目": q.question_text,
    "選項A": q.option_a,
    "選項B": q.option_b,
    "選項C": q.option_c,
    "選項D": q.option_d,
    "答案": q.answer
  }));

  // 使用 PapaParse 轉回 CSV，它會自動處理引號包覆
  const csv = Papa.unparse(exportData, {
    quotes: true, // 強制幫所有欄位加引號
    header: true
  });

  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `會考閱讀題組匯出_${new Date().toLocaleDateString()}.csv`);
  link.click();
};

// CSV 匯入處理
const handleImportCsv = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  isUploading.value = true;

  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const formattedData = results.data.map(row => ({
        year: parseInt(row['年份']),
        group_id: row['題組編號'],
        image_url: row['圖片網址'] || '',
        question_num: row['題號'],
        question_text: row['題目'],
        option_a: row['選項A'], option_b: row['選項B'], option_c: row['選項C'], option_d: row['選項D'],
        answer: row['答案'] ? row['答案'].trim().toUpperCase() : ''
      })).filter(row => row.year && row.group_id && row.question_num && row.answer);

      if (formattedData.length > 0) {
        const { error } = await supabase.from('exam2_questions').insert(formattedData);
        if (error) alert("匯入失敗：" + error.message);
        else { alert(`✅ 成功匯入 ${formattedData.length} 題題組！`); fetchQuestions(); }
      } else { alert("CSV 格式錯誤或沒有有效資料！"); }
      isUploading.value = false;
      event.target.value = '';
    },
    error: (err) => { alert("解析失敗：" + err.message); isUploading.value = false; }
  });
};

const openEditModal = (q) => {
  editingQuestion.value = { ...q };
  showEditModal.value = true;
};

const saveQuestion = async () => {
  if (!editingQuestion.value.question_text || !editingQuestion.value.answer) return alert('題目與答案不能為空！');
  const { id, year, group_id, image_url, question_num, question_text, option_a, option_b, option_c, option_d, answer } = editingQuestion.value;
  const { error } = await supabase.from('exam2_questions').update({
    year, group_id, image_url, question_num, question_text, option_a, option_b, option_c, option_d, answer: answer.toUpperCase()
  }).eq('id', id);
  if (error) alert("更新失敗：" + error.message);
  else { showEditModal.value = false; fetchQuestions(); }
};

const deleteQuestion = async (id) => {
  if (confirm("確定要刪除這題嗎？")) {
    await supabase.from('exam2_questions').delete().eq('id', id);
    fetchQuestions();
  }
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <NuxtLink to="/admin" class="back-btn">⬅ 返回控制中心</NuxtLink>
      <h1>📜 會考閱讀題組管理</h1>
    </div>

    <div class="toolbar">
      <div class="actions-panel">
        <input type="file" accept=".csv" id="csv-upload" @change="handleImportCsv" style="display: none;" />
        <label for="csv-upload" class="retro-btn upload-btn">{{ isUploading ? '匯入中...' : '⬆️ 匯入 CSV' }}</label>
        <button @click="handleExportCsv" class="retro-btn export-btn">⬇️ 匯出 CSV</button>
      </div>

      <div class="filter-panel">
        <label>📅 年份分類：</label>
        <select v-model="selectedYearFilter" class="retro-select">
          <option value="ALL">顯示全部年份</option>
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年會考</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="loading">⏳ 載入中...</div>
    <div v-else class="table-container retro-element">
      <div class="stats-summary">目前顯示：{{ filteredQuestions.length }} 題</div>
      <table class="retro-table">
        <thead>
          <tr><th>年份</th><th>題組</th><th>題號</th><th>圖片</th><th>題目與選項</th><th>答案</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="q in filteredQuestions" :key="q.id">
            <td>{{ q.year }}</td>
            <td><span class="badge">{{ q.group_id }}</span></td>
            <td><strong>{{ q.question_num }}</strong></td>
            <td>
                <a :href="q.image_url" target="_blank" v-if="q.image_url" class="img-link">🔗</a>
                <span v-else style="color:#ccc">無</span>
            </td>
            <td class="text-cell">
              <strong>{{ q.question_text }}</strong><br>
              <small>(A) {{ q.option_a }} (B) {{ q.option_b }} (C) {{ q.option_c }} (D) {{ q.option_d }}</small>
            </td>
            <td class="ans-cell">{{ q.answer }}</td>
            <td class="action-cell">
              <button @click="openEditModal(q)" class="edit-btn">✏️</button>
              <button @click="deleteQuestion(q.id)" class="del-btn">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content retro-element">
        <h2>✏️ 編輯題組題目</h2>
        <div class="form-grid">
          <div class="form-group"><label>年份</label><input type="number" v-model="editingQuestion.year" class="retro-input"></div>
          <div class="form-group"><label>題組編號</label><input type="text" v-model="editingQuestion.group_id" class="retro-input"></div>
          <div class="form-group"><label>題號</label><input type="text" v-model="editingQuestion.question_num" class="retro-input"></div>
          <div class="form-group"><label>答案 (A-D)</label><input type="text" v-model="editingQuestion.answer" class="retro-input ans-input" maxlength="1"></div>
        </div>
        <div class="form-group full-width"><label>圖片網址</label><input type="text" v-model="editingQuestion.image_url" class="retro-input"></div>
        <div class="form-group full-width"><label>題目內容</label><textarea v-model="editingQuestion.question_text" class="retro-input" rows="3"></textarea></div>
        <div class="form-grid options-grid">
          <div class="form-group"><label>(A)</label><input type="text" v-model="editingQuestion.option_a" class="retro-input"></div>
          <div class="form-group"><label>(B)</label><input type="text" v-model="editingQuestion.option_b" class="retro-input"></div>
          <div class="form-group"><label>(C)</label><input type="text" v-model="editingQuestion.option_c" class="retro-input"></div>
          <div class="form-group"><label>(D)</label><input type="text" v-model="editingQuestion.option_d" class="retro-input"></div>
        </div>
        <div class="modal-actions">
          <button @click="showEditModal = false" class="retro-btn cancel-btn">取消</button>
          <button @click="saveQuestion" class="retro-btn save-btn">💾 儲存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px;}
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}

/* 工具列排版 */
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; flex-wrap: wrap;}
.actions-panel { display: flex; gap: 10px;}
.filter-panel { background: #f5f5f5; padding: 10px 15px; border-radius: 10px; border: 1px solid #ddd; display: flex; align-items: center; gap: 10px;}
.filter-panel label { font-weight: bold; color: #555; }
.retro-select { padding: 8px; border-radius: 6px; border: 2px solid #333; font-weight: bold; outline: none;}

.retro-btn { padding: 10px 20px; font-weight: bold; border-radius: 8px; border: 2px solid #333; cursor: pointer; box-shadow: 2px 2px 0 #333; transition: 0.1s;}
.retro-btn:active { transform: translateY(2px); box-shadow: none;}
.upload-btn { background: #e8f5e9; color: #1b5e20; }
.export-btn { background: #fff9c4; color: #f57f17; }

.table-container { background: white; padding: 15px; border-radius: 12px; border: 2px solid #ccc;}
.stats-summary { margin-bottom: 10px; font-weight: bold; color: #666; font-size: 0.9rem;}
.retro-table { width: 100%; border-collapse: collapse;}
.retro-table th, .retro-table td { border: 1px solid #ddd; padding: 10px; text-align: left;}
.retro-table th { background: #f5f5f5; white-space: nowrap;}
.badge { background: #ffe0b2; color: #e65100; padding: 3px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold;}
.img-link { text-decoration: none; font-size: 1.2rem; }
.text-cell { max-width: 400px; font-size: 0.95rem; }
.text-cell small { color: #777; display: block; margin-top: 4px; }
.ans-cell { font-weight: bold; color: #d32f2f; text-align: center; }

.action-cell { display: flex; gap: 5px;}
.edit-btn, .del-btn { padding: 5px 10px; border-radius: 6px; cursor: pointer; border: 1px solid #ccc; font-size: 1.1rem;}
.edit-btn { background: #e3f2fd; color: #1976d2; }
.del-btn { background: #ffebee; color: #c62828; }

/* Modal 彈窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;}
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 100%; max-width: 800px; border: 3px solid #333; max-height: 90vh; overflow-y: auto;}
.form-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 15px;}
.options-grid { grid-template-columns: 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 5px;}
.form-group label { font-weight: bold; font-size: 0.9rem; color: #555;}
.full-width { margin-bottom: 15px; }
.retro-input { padding: 10px; border: 2px solid #ccc; border-radius: 8px; font-family: inherit;}
.ans-input { text-align: center; font-weight: bold; color: #d32f2f; text-transform: uppercase;}
.modal-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 25px;}
.save-btn { background: #4caf50; color: white; }
.cancel-btn { background: #eee; }
</style>