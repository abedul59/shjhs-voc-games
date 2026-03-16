<script setup>
import { ref, onMounted, watch } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const vocabularies = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);

// 畫面上的篩選器狀態
const selectedVersion = ref('翰林');
const selectedVolume = ref('B4');
const selectedUnit = ref('U1');

// 編輯或新增單字的表單資料 (🌟 已修正為 example_en 與 example_zh)
const showModal = ref(false);
const isEditing = ref(false);
const formData = ref({
  id: null,
  version: '',
  volume: '',
  unit: '',
  en_us: '',
  zh_tw: '',
  example_en: '',
  example_zh: ''
});

// 從資料庫載入單字列表
const fetchVocabularies = async () => {
  isLoading.value = true;
  let query = supabase.from('vocabularies').select('*')
    .eq('version', selectedVersion.value)
    .eq('volume', selectedVolume.value)
    .eq('unit', selectedUnit.value)
    .order('id', { ascending: true });

  const { data, error } = await query;
  if (!error && data) {
    vocabularies.value = data;
  }
  isLoading.value = false;
};

// 監聽篩選條件變化，自動重新載入
watch([selectedVersion, selectedVolume, selectedUnit], () => {
  fetchVocabularies();
});

onMounted(() => {
  fetchVocabularies();
});

// 打開新增視窗
const openAddModal = () => {
  isEditing.value = false;
  formData.value = { 
    id: null, 
    version: selectedVersion.value, 
    volume: selectedVolume.value, 
    unit: selectedUnit.value, 
    en_us: '', 
    zh_tw: '',
    example_en: '',
    example_zh: ''
  };
  showModal.value = true;
};

// 打開編輯視窗
const openEditModal = (item) => {
  isEditing.value = true;
  formData.value = { ...item };
  showModal.value = true;
};

// 關閉視窗
const closeModal = () => {
  showModal.value = false;
};

// 儲存單字 (🌟 已修正對齊資料庫真實欄位)
const saveVocabulary = async () => {
  if (!formData.value.en_us || !formData.value.zh_tw) {
    alert('英文與中文為必填欄位！');
    return;
  }
  
  if (isEditing.value) {
    const { error } = await supabase.from('vocabularies').update({
      en_us: formData.value.en_us,
      zh_tw: formData.value.zh_tw,
      example_en: formData.value.example_en,
      example_zh: formData.value.example_zh
    }).eq('id', formData.value.id);
    if (error) alert('更新失敗：' + error.message);
  } else {
    const { error } = await supabase.from('vocabularies').insert([{
      version: formData.value.version,
      volume: formData.value.volume,
      unit: formData.value.unit,
      en_us: formData.value.en_us,
      zh_tw: formData.value.zh_tw,
      example_en: formData.value.example_en,
      example_zh: formData.value.example_zh
    }]);
    if (error) alert('新增失敗：' + error.message);
  }
  
  closeModal();
  fetchVocabularies();
};

// 刪除單字
const deleteVocabulary = async (id) => {
  if (!confirm('確定要刪除這個單字嗎？刪除後無法復原！')) return;
  const { error } = await supabase.from('vocabularies').delete().eq('id', id);
  if (error) alert('刪除失敗：' + error.message);
  else fetchVocabularies();
};

// 匯出 CSV 
const exportToCSV = () => {
  if (vocabularies.value.length === 0) {
    alert('目前沒有資料可以匯出。');
    return;
  }
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + "version,volume,unit,en_us,zh_tw,example_en,example_zh\n"
    + vocabularies.value.map(v => `${v.version},${v.volume},${v.unit},${v.en_us},${v.zh_tw},${v.example_en || ''},${v.example_zh || ''}`).join("\n");
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `vocabularies_${selectedVersion.value}_${selectedVolume.value}_${selectedUnit.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 匯入 CSV
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isUploading.value = true;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const cleanData = [];
      for (const row of results.data) {
        if (row.en_us && row.zh_tw) {
          cleanData.push({
            version: row.version ? row.version.trim() : selectedVersion.value,
            volume: row.volume ? row.volume.trim() : selectedVolume.value,
            unit: row.unit ? row.unit.trim() : selectedUnit.value,
            en_us: row.en_us.trim(),
            zh_tw: row.zh_tw.trim(),
            example_en: row.example_en ? row.example_en.trim() : null,
            example_zh: row.example_zh ? row.example_zh.trim() : null
          });
        }
      }

      if (cleanData.length > 0) {
        const { error } = await supabase.from('vocabularies').insert(cleanData);
        if (error) {
          alert('匯入失敗：' + error.message);
        } else {
          alert(`✅ 成功匯入 ${cleanData.length} 個單字！`);
          fetchVocabularies(); 
        }
      } else {
        alert('CSV 格式錯誤或沒有有效資料 (請確認表頭有 en_us 和 zh_tw)');
      }
      isUploading.value = false;
      event.target.value = ''; 
    },
    error: (err) => {
      alert('解析 CSV 失敗：' + err.message);
      isUploading.value = false;
    }
  });
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>📝 編輯單字庫</h1>
    </div>

    <div class="top-actions">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回後台</NuxtLink>
      
      <div class="action-group">
        <button class="retro-btn add-btn" @click="openAddModal">➕ 新增單字</button>
        <button class="retro-btn export-btn" @click="exportToCSV" :disabled="isLoading">📊 匯出單字</button>
        
        <label class="retro-btn import-btn" :class="{ disabled: isUploading }">
          <input type="file" @change="handleFileUpload" accept=".csv" style="display: none;" :disabled="isUploading" />
          {{ isUploading ? '匯入中...' : '📥 匯入CSV' }}
        </label>
      </div>
    </div>

    <div class="filters-panel retro-element">
      <div class="filter-group">
        <label>版本：</label>
        <select v-model="selectedVersion" class="retro-input">
          <option value="康軒">康軒</option>
          <option value="翰林">翰林</option>
          <option value="南一">南一</option>
        </select>
      </div>
      <div class="filter-group">
        <label>冊數：</label>
        <select v-model="selectedVolume" class="retro-input">
          <option value="B1">第一冊 (B1)</option>
          <option value="B2">第二冊 (B2)</option>
          <option value="B3">第三冊 (B3)</option>
          <option value="B4">第四冊 (B4)</option>
          <option value="B5">第五冊 (B5)</option>
          <option value="B6">第六冊 (B6)</option>
        </select>
      </div>
      <div class="filter-group">
        <label>單元：</label>
        <select v-model="selectedUnit" class="retro-input">
          <option value="Get Ready">課前準備 (Get Ready)</option>
          <option v-for="i in 10" :key="i" :value="`U${i}`">單元 {{ i }} (U{{ i }})</option>
        </select>
      </div>
    </div>

    <div class="table-container retro-element">
      <p v-if="isLoading" class="loading-msg">⏳ 讀取中...</p>
      <table v-else class="retro-table">
        <thead>
          <tr>
            <th>英文 (English)</th>
            <th>中文 (Chinese)</th>
            <th>例句 (包含中英)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="vocabularies.length === 0">
            <td colspan="4" class="empty-msg">此單元目前沒有單字，請點擊右上方新增或匯入。</td>
          </tr>
          <tr v-for="word in vocabularies" :key="word.id">
            <td class="en-text"><strong>{{ word.en_us }}</strong></td>
            <td class="zh-text">{{ word.zh_tw }}</td>
            <td class="example-text">
              <div v-if="word.example_en">
                <span class="en-ex">{{ word.example_en }}</span><br>
                <span class="zh-ex">{{ word.example_zh }}</span>
              </div>
              <div v-else class="no-ex">-</div>
            </td>
            <td class="actions-col">
              <button class="action-btn edit-btn" @click="openEditModal(word)">✏️</button>
              <button class="action-btn delete-btn" @click="deleteVocabulary(word.id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-box retro-element">
        <h2>{{ isEditing ? '✏️ 編輯單字' : '➕ 新增單字' }}</h2>
        <div class="form-group">
          <label>所屬分類 (防呆檢查)</label>
          <p class="read-only-info">{{ formData.version }} / {{ formData.volume }} / {{ formData.unit }}</p>
        </div>
        <div class="form-group">
          <label>英文單字 (必填)</label>
          <input type="text" v-model="formData.en_us" class="retro-input" placeholder="例如: apple" />
        </div>
        <div class="form-group">
          <label>中文意義 (必填)</label>
          <input type="text" v-model="formData.zh_tw" class="retro-input" placeholder="例如: 蘋果" />
        </div>
        <div class="form-group">
          <label>英文例句 (選填)</label>
          <input type="text" v-model="formData.example_en" class="retro-input" placeholder="例如: This is an apple." />
        </div>
        <div class="form-group">
          <label>例句中文翻譯 (選填)</label>
          <input type="text" v-model="formData.example_zh" class="retro-input" placeholder="例如: 這是一顆蘋果。" />
        </div>
        
        <div class="modal-actions">
          <button class="retro-btn cancel-btn" @click="closeModal">取消</button>
          <button class="retro-btn save-btn" @click="saveVocabulary">💾 儲存</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1000px; margin: 0 auto; min-height: 100vh;}
.header h1 { font-size: 2rem; color: var(--text-main); font-weight: 900; margin-bottom: 20px; text-align: center; }

.top-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;}
.action-group { display: flex; gap: 10px; flex-wrap: wrap;}

.filters-panel { background: var(--box-bg); padding: 15px 20px; display: flex; gap: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); margin-bottom: 20px; flex-wrap: wrap; align-items: center;}
.filter-group { display: flex; align-items: center; gap: 10px; font-weight: bold; color: var(--text-main); }
.retro-input { padding: 8px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 1rem; font-family: inherit; font-weight: bold; }

.table-container { background: var(--box-bg); padding: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); overflow-x: auto;}
.retro-table { width: 100%; border-collapse: collapse; text-align: left; }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 2px dashed #ccc; color: var(--text-main); font-weight: bold;}
.retro-table th { background: var(--tab-bg); font-size: 1.1rem; border-bottom: 2px solid var(--border-color);}
.en-text { font-size: 1.2rem; color: #000; }
.example-text { font-size: 0.95rem; line-height: 1.4; }
.en-ex { color: #0277bd; }
.zh-ex { color: #666; font-size: 0.85rem;}
.no-ex { color: #aaa; font-style: italic; }
.empty-msg { text-align: center; padding: 30px; color: var(--text-muted); }
.actions-col { white-space: nowrap; width: 100px; text-align: center;}

.retro-btn { padding: 10px 15px; font-weight: bold; font-size: 1rem; cursor: pointer; border: 2px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 0 var(--border-color); transition: 0.1s; text-decoration: none; display: inline-block;}
.retro-btn:active:not(.disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn.disabled { opacity: 0.6; cursor: not-allowed; }

.back-btn { background: var(--tab-bg); color: var(--text-main); }
.add-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
.export-btn { background: var(--info-bg); color: var(--text-main); }
.import-btn { background: var(--success-bg); color: var(--success-color); cursor: pointer; border-color: var(--success-color); box-shadow: 0 4px 0 var(--success-color);}

.action-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; margin: 0 5px; transition: 0.2s;}
.action-btn:hover { transform: scale(1.2); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; box-sizing: border-box;}
.modal-box { background: var(--bg-color); padding: 30px; width: 100%; max-width: 500px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
.modal-box h2 { margin-top: 0; border-bottom: 2px solid var(--text-main); padding-bottom: 10px; }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 5px; color: var(--text-main); }
.form-group input { width: 100%; box-sizing: border-box; }
.read-only-info { background: #eee; padding: 10px; border-radius: 8px; font-weight: bold; color: #555; margin: 0;}
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
.cancel-btn { background: #e0e0e0; color: #333; }
.save-btn { background: var(--success-bg); color: #fff; border-color: #2e7d32; box-shadow: 0 4px 0 #2e7d32; }

@media (max-width: 600px) {
  .top-actions { flex-direction: column; align-items: stretch; }
  .action-group { justify-content: space-between; }
  .filters-panel { flex-direction: column; align-items: stretch; }
  .retro-table th, .retro-table td { padding: 8px; font-size: 0.9rem;}
}
</style>