<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const questions = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);

// 🌟 編輯彈窗狀態
const showEditModal = ref(false);
const editingQ = ref({});

// 🌟 篩選器狀態
const selectedVersion = ref('ALL');
const selectedVolume = ref('ALL');
const selectedUnit = ref('ALL');

// 🌟 批次選取狀態
const selectedIds = ref([]);

const fetchQuestions = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('grammar_questions').select('*').order('version').order('volume').order('unit').order('id');
  if (data) questions.value = data;
  isLoading.value = false;
  selectedIds.value = []; // 重新載入時清空選取
};

onMounted(fetchQuestions);

// 🌟 連動篩選器邏輯
const availableVersions = computed(() => {
  return ['ALL', ...new Set(questions.value.map(q => q.version))];
});

const availableVolumes = computed(() => {
  let qs = questions.value;
  if (selectedVersion.value !== 'ALL') qs = qs.filter(q => q.version === selectedVersion.value);
  return ['ALL', ...new Set(qs.map(q => q.volume))];
});

const availableUnits = computed(() => {
  let qs = questions.value;
  if (selectedVersion.value !== 'ALL') qs = qs.filter(q => q.version === selectedVersion.value);
  if (selectedVolume.value !== 'ALL') qs = qs.filter(q => q.volume === selectedVolume.value);
  return ['ALL', ...new Set(qs.map(q => q.unit))];
});

// 當上層選項改變時，重置下層選項
const onVersionChange = () => { selectedVolume.value = 'ALL'; selectedUnit.value = 'ALL'; };
const onVolumeChange = () => { selectedUnit.value = 'ALL'; };

// 🌟 計算最終顯示的題目列表
const filteredQuestions = computed(() => {
  return questions.value.filter(q => {
    const matchV = selectedVersion.value === 'ALL' || q.version === selectedVersion.value;
    const matchVol = selectedVolume.value === 'ALL' || q.volume === selectedVolume.value;
    const matchU = selectedUnit.value === 'ALL' || q.unit === selectedUnit.value;
    return matchV && matchVol && matchU;
  });
});

// 防呆：當篩選條件改變時，自動清空打勾狀態，避免跨單元誤刪
watch(filteredQuestions, () => {
  selectedIds.value = [];
});

// 🌟 批次刪除邏輯
const toggleSelectAll = () => {
  if (selectedIds.value.length === filteredQuestions.value.length && filteredQuestions.value.length > 0) {
    selectedIds.value = []; // 全不選
  } else {
    selectedIds.value = filteredQuestions.value.map(q => q.id); // 全選目前的篩選結果
  }
};

const deleteSelected = async () => {
  if (selectedIds.value.length === 0) return;
  if (confirm(`確定要刪除打勾的 ${selectedIds.value.length} 題嗎？`)) {
    const { error } = await supabase.from('grammar_questions').delete().in('id', selectedIds.value);
    if (error) alert("刪除失敗：" + error.message);
    else { fetchQuestions(); }
  }
};

const deleteAllFiltered = async () => {
  if (filteredQuestions.value.length === 0) return;
  if (confirm(`⚠️ 警告：確定要刪除目前畫面上篩選出的【全部 ${filteredQuestions.value.length} 題】嗎？\n（此操作無法復原！）`)) {
    const idsToDelete = filteredQuestions.value.map(q => q.id);
    const { error } = await supabase.from('grammar_questions').delete().in('id', idsToDelete);
    if (error) alert("刪除失敗：" + error.message);
    else { fetchQuestions(); }
  }
};

// 🌟 匯出 CSV 功能
const handleExportCsv = () => {
  // 可以選擇匯出「全部」或「目前篩選」，這裡預設匯出「全部」，若要改為篩選結果請將 questions 改為 filteredQuestions
  const exportTarget = questions.value; 

  if (exportTarget.length === 0) return alert("目前沒有資料可以匯出！");
  
  const exportData = exportTarget.map(q => ({
    "版本": q.version,
    "冊數": q.volume,
    "單元": q.unit,
    "題目": q.question_text,
    "選項1": q.option_1,
    "選項2": q.option_2,
    "選項3": q.option_3,
    "選項4": q.option_4,
    "答案": q.answer
  }));

  // 使用 PapaParse 轉回 CSV，自動處理引號包覆，避免逗號切斷
  const csv = Papa.unparse(exportData, {
    quotes: true, 
    header: true
  });

  const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `全部文法題庫匯出_${new Date().toLocaleDateString()}.csv`);
  link.click();
};

// 🌟 匯入 CSV 處理
const handleImportCsv = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const formatted = results.data.map(row => ({
        version: row['版本'], volume: row['冊數'], unit: row['單元'],
        question_text: row['題目'], 
        option_1: row['選項1'], option_2: row['選項2'], option_3: row['選項3'], option_4: row['選項4'],
        answer: parseInt(row['答案'])
      })).filter(r => r.version && r.question_text && r.answer);

      if (formatted.length > 0) {
        const { error } = await supabase.from('grammar_questions').insert(formatted);
        if (error) alert("匯入失敗：" + error.message);
        else { alert(`✅ 成功匯入 ${formatted.length} 題文法題！`); fetchQuestions(); }
      } else {
        alert("CSV 格式錯誤或沒有有效資料！");
      }
      isUploading.value = false;
      event.target.value = '';
    },
    error: (err) => { alert("解析失敗：" + err.message); isUploading.value = false; }
  });
};

const openEdit = (q) => { editingQ.value = { ...q }; showEditModal.value = true; };

const saveEdit = async () => {
  const { id, ...updateData } = editingQ.value;
  if(!updateData.question_text || !updateData.answer) return alert("題目與答案不得為空！");

  const { error } = await supabase.from('grammar_questions').update(updateData).eq('id', id);
  if (error) alert("更新失敗：" + error.message);
  else {
    showEditModal.value = false;
    fetchQuestions();
  }
};

const deleteQ = async (id) => {
  if (confirm("確定刪除這題嗎？")) { 
    await supabase.from('grammar_questions').delete().eq('id', id); 
    fetchQuestions(); 
  }
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <NuxtLink to="/admin" class="back-btn">⬅ 返回控制中心</NuxtLink>
      <h1>🎡 文法題庫管理</h1>
      <div class="actions">
        <NuxtLink to="/admin/grammar-stats" class="retro-btn stats-btn">📊 查看學習診斷</NuxtLink>
        <button @click="handleExportCsv" class="retro-btn export-btn">⬇️ 匯出全部 CSV</button>
        <input type="file" accept=".csv" id="csv-up" @change="handleImportCsv" style="display:none">
        <label for="csv-up" class="retro-btn upload-btn">{{ isUploading ? '處理中...' : '⬆️ 匯入 CSV' }}</label>
      </div>
    </div>

    <div class="filter-panel retro-element">
      <div class="filter-item">
        <label>📚 版本：</label>
        <select v-model="selectedVersion" @change="onVersionChange" class="retro-input">
          <option v-for="v in availableVersions" :key="v" :value="v">{{ v === 'ALL' ? '全部版本' : v }}</option>
        </select>
      </div>
      <div class="filter-item">
        <label>📖 冊數：</label>
        <select v-model="selectedVolume" @change="onVolumeChange" class="retro-input" :disabled="selectedVersion === 'ALL'">
          <option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol === 'ALL' ? '全部冊數' : vol }}</option>
        </select>
      </div>
      <div class="filter-item">
        <label>🔖 單元：</label>
        <select v-model="selectedUnit" class="retro-input" :disabled="selectedVolume === 'ALL'">
          <option v-for="u in availableUnits" :key="u" :value="u">{{ u === 'ALL' ? '全部單元' : u }}</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="loading">⏳ 載入中...</div>
    <div v-else class="table-container retro-element">
      
      <div class="batch-actions">
        <p class="summary">目前篩選條件下共有 <strong>{{ filteredQuestions.length }}</strong> 題</p>
        <div class="btn-group">
          <button v-if="selectedIds.length > 0" @click="deleteSelected" class="retro-btn batch-del-btn">
            🗑️ 刪除已選取 ({{ selectedIds.length }})
          </button>
          <button v-if="filteredQuestions.length > 0" @click="deleteAllFiltered" class="retro-btn nuke-btn">
            ⚠️ 刪除目前篩選的全部
          </button>
        </div>
      </div>

      <table class="retro-table">
        <thead>
          <tr>
            <th width="4%" class="center-align">
              <input type="checkbox" class="large-checkbox"
                     :checked="filteredQuestions.length > 0 && selectedIds.length === filteredQuestions.length" 
                     @change="toggleSelectAll" title="全選/取消全選">
            </th>
            <th width="10%">範圍</th>
            <th width="45%">題目</th>
            <th width="24%">選項 (正確標紅)</th>
            <th width="9%">答案</th>
            <th width="8%">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in filteredQuestions" :key="q.id" :class="{'selected-row': selectedIds.includes(q.id)}">
            <td class="center-align">
              <input type="checkbox" :value="q.id" v-model="selectedIds" class="large-checkbox">
            </td>
            <td class="badge-cell"><span class="badge">{{ q.version }} {{ q.volume }}-{{ q.unit }}</span></td>
            <td class="q-cell">{{ q.question_text }}</td>
            <td class="opt-cell">
              <div :class="{'correct-opt': q.answer === 1}">(1) {{ q.option_1 }}</div>
              <div :class="{'correct-opt': q.answer === 2}">(2) {{ q.option_2 }}</div>
              <div :class="{'correct-opt': q.answer === 3}">(3) {{ q.option_3 }}</div>
              <div :class="{'correct-opt': q.answer === 4}">(4) {{ q.option_4 }}</div>
            </td>
            <td class="ans-cell">{{ q.answer }}</td>
            <td class="action-cell">
              <button @click="openEdit(q)" class="edit-btn" title="編輯">✏️</button>
              <button @click="deleteQ(q.id)" class="del-btn" title="刪除單題">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredQuestions.length === 0" class="empty-msg">沒有找到符合條件的題目喔！</div>
    </div>

    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content retro-element">
        <h3>✏️ 編輯文法題目</h3>
        
        <div class="form-grid">
          <div class="form-group"><label>版本</label><input type="text" v-model="editingQ.version" class="retro-input"></div>
          <div class="form-group"><label>冊數</label><input type="text" v-model="editingQ.volume" class="retro-input"></div>
          <div class="form-group"><label>單元</label><input type="text" v-model="editingQ.unit" class="retro-input"></div>
        </div>

        <div class="form-group full-width">
          <label>題目內容</label>
          <textarea v-model="editingQ.question_text" class="retro-input" rows="3"></textarea>
        </div>

        <div class="opt-grid">
          <div class="form-group"><label>選項 1</label><input v-model="editingQ.option_1" class="retro-input"></div>
          <div class="form-group"><label>選項 2</label><input v-model="editingQ.option_2" class="retro-input"></div>
          <div class="form-group"><label>選項 3</label><input v-model="editingQ.option_3" class="retro-input"></div>
          <div class="form-group"><label>選項 4</label><input v-model="editingQ.option_4" class="retro-input"></div>
        </div>
        
        <div class="form-group ans-group">
          <label>正確答案 (1-4)：</label>
          <input type="number" v-model="editingQ.answer" class="retro-input ans-input" min="1" max="4">
        </div>

        <div class="modal-actions">
          <button @click="showEditModal = false" class="retro-btn cancel-btn">取消</button>
          <button @click="saveEdit" class="retro-btn save-btn">💾 儲存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;}
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.actions { display: flex; gap: 10px; flex-wrap: wrap;}
.retro-btn { cursor: pointer; background: #eee; padding: 10px 15px; border-radius: 8px; border: 2px solid #333; font-weight: bold; box-shadow: 2px 2px 0 #333; transition: 0.1s;}
.retro-btn:active { transform: translateY(2px); box-shadow: none;}
.upload-btn { background: #e8f5e9; color: #1b5e20; }
.stats-btn { background: #3f51b5; color: white; border-color: #1a237e; text-decoration: none;}
.export-btn { background: #fff9c4; color: #f57f17; border-color: #fbc02d;}

/* 篩選器面板 */
.filter-panel { background: #f5f5f5; padding: 15px; border-radius: 12px; border: 2px solid #ddd; margin-bottom: 20px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap;}
.filter-item { display: flex; align-items: center; gap: 10px;}
.filter-item label { font-weight: bold; color: #555;}
.filter-item select { min-width: 150px; }
.retro-input { width: 100%; padding: 10px; border: 2px solid #9fa8da; border-radius: 8px; font-size: 1rem; outline: none; font-family: inherit;}
.retro-input:disabled { background: #e0e0e0; cursor: not-allowed; opacity: 0.7;}

/* 表格與批次操作區塊 */
.table-container { background: white; padding: 20px; border-radius: 16px; border: 2px solid #ccc; overflow-x: auto;}
.batch-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px dashed #eee; flex-wrap: wrap; gap: 10px;}
.btn-group { display: flex; gap: 10px; }
.summary { margin: 0; color: #e65100; font-size: 1.1rem;}
.batch-del-btn { background: #ff9800; color: white; border-color: #e65100;}
.nuke-btn { background: #d32f2f; color: white; border-color: #b71c1c; animation: pulse 2s infinite;}

@keyframes pulse { 0% { opacity: 0.9; } 50% { opacity: 1; transform: scale(1.02); } 100% { opacity: 0.9; } }

.retro-table { width: 100%; border-collapse: collapse; min-width: 900px;}
.retro-table th, .retro-table td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: middle; transition: background-color 0.2s;}
.retro-table th { background: #f5f5f5; font-weight: bold;}
.selected-row td { background-color: #fff3e0 !important; } /* 打勾時的整行高亮 */
.center-align { text-align: center !important;}
.large-checkbox { width: 20px; height: 20px; cursor: pointer; accent-color: #ff9800;}

.badge { background: #ffe0b2; color: #e65100; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 0.9rem;}
.q-cell { font-size: 1.05rem; font-weight: bold; color: #333;}
.opt-cell div { font-size: 0.95rem; color: #666; margin-bottom: 4px;}
.correct-opt { color: #d32f2f !important; font-weight: bold; text-decoration: underline;}
.ans-cell { font-size: 1.5rem; font-weight: bold; color: #d32f2f; text-align: center;}
.empty-msg { text-align: center; padding: 40px; color: #999; font-size: 1.2rem; font-weight: bold;}

.action-cell { display: flex; flex-direction: column; gap: 5px; align-items: center;}
.edit-btn, .del-btn { padding: 6px; border-radius: 6px; cursor: pointer; border: 1px solid #ccc; font-size: 1.2rem; width: 100%;}
.edit-btn { background: #e3f2fd; } .del-btn { background: #ffebee; }

/* 編輯彈窗 */
.modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:100; padding: 20px;}
.modal-content { background:white; padding:30px; border-radius:16px; width:100%; max-width:700px; border: 3px solid #333; max-height: 90vh; overflow-y: auto;}
.modal-content h3 { margin-top: 0; color: #303f9f; border-bottom: 2px dashed #ccc; padding-bottom: 10px;}
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;}
.opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;}
.form-group { display: flex; flex-direction: column; gap: 5px;}
.form-group label { font-weight: bold; color: #555; font-size: 0.9rem;}
.full-width { margin-bottom: 15px;}
.ans-group { width: 50%; margin: 0 auto; text-align: center; align-items: center;}
.ans-input { text-align: center; font-size: 1.5rem; color: #d32f2f; width: 100px;}
.modal-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px;}
.save-btn { background: #4caf50; color: white; border-color: #2e7d32;}
.cancel-btn { background: #f5f5f5;}
</style>