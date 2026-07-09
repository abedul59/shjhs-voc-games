<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const verbs = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);
const searchQuery = ref('');

// 編輯彈窗狀態
const showEditModal = ref(false);
const editingVerb = ref({});

// 抓取現有單字
const fetchVerbs = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('irregular_verbs').select('*').order('base_form');
  if (data) verbs.value = data;
  isLoading.value = false;
};

onMounted(fetchVerbs);

// 搜尋過濾功能
const filteredVerbs = computed(() => {
  if (!searchQuery.value) return verbs.value;
  const q = searchQuery.value.toLowerCase().trim();
  return verbs.value.filter(v => 
    v.base_form.toLowerCase().includes(q) || 
    v.past_tense.toLowerCase().includes(q) || 
    v.chinese.includes(q)
  );
});

// CSV 匯入處理 (包含「重複覆蓋」邏輯)
const handleImportCsv = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  isUploading.value = true;

  // 先抓取資料庫中所有的動詞原形，用來比對是否重複
  const { data: existingVerbs } = await supabase.from('irregular_verbs').select('id, base_form');

  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const formattedData = results.data.map(row => {
        // 相容多種中英文欄位名稱
        const b = row['base_form'] || row['動詞原形'] || row['動詞'] || '';
        const pt = row['past_tense'] || row['過去式'] || '';
        const pp = row['past_participle'] || row['過去分詞'] || '';
        const c = row['chinese'] || row['中文'] || row['中文意義'] || '';

        const newRow = {
          base_form: b.trim().toLowerCase(),
          past_tense: pt.trim().toLowerCase(),
          past_participle: pp.trim().toLowerCase(),
          chinese: c.trim()
        };

        // 🌟 核心：如果 base_form 已經存在，就塞入它的 id，這樣 Supabase 的 upsert 就會執行「覆蓋更新」
        if (existingVerbs) {
          const found = existingVerbs.find(ev => ev.base_form.toLowerCase() === newRow.base_form);
          if (found) newRow.id = found.id;
        }
        return newRow;
      }).filter(r => r.base_form && r.past_tense && r.past_participle && r.chinese);

      if (formattedData.length > 0) {
        const { error } = await supabase.from('irregular_verbs').upsert(formattedData);
        if (error) alert("匯入失敗：" + error.message);
        else { alert(`✅ 成功匯入 / 覆蓋更新了 ${formattedData.length} 個不規則動詞！`); fetchVerbs(); }
      } else {
        alert("CSV 格式錯誤！請確保有 base_form, past_tense, past_participle, chinese 欄位。");
      }
      isUploading.value = false;
      event.target.value = ''; // 清空 input 讓下次能選同一個檔
    },
    error: (err) => { alert("解析失敗：" + err.message); isUploading.value = false; }
  });
};

const openEdit = (v) => { editingVerb.value = { ...v }; showEditModal.value = true; };

const saveEdit = async () => {
  const { id, ...updateData } = editingVerb.value;
  if (!updateData.base_form || !updateData.past_tense) return alert("欄位不得為空！");

  const { error } = await supabase.from('irregular_verbs').update(updateData).eq('id', id);
  if (error) alert("更新失敗：" + error.message);
  else { showEditModal.value = false; fetchVerbs(); }
};

const deleteVerb = async (id) => {
  if (confirm("確定要刪除這個不規則動詞嗎？")) { 
    await supabase.from('irregular_verbs').delete().eq('id', id); 
    fetchVerbs(); 
  }
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <NuxtLink to="/admin" class="back-btn">⬅ 返回控制中心</NuxtLink>
      <h1>🌀 不規則動詞題庫管理</h1>
      <div class="actions">
        <input type="file" accept=".csv" id="csv-up" @change="handleImportCsv" style="display:none">
        <label for="csv-up" class="retro-btn upload-btn">{{ isUploading ? '處理中...' : '⬆️ 匯入 CSV' }}</label>
      </div>
    </div>

    <div class="filter-panel retro-element">
      <label>🔍 快速搜尋：</label>
      <input type="text" v-model="searchQuery" class="retro-input search-input" placeholder="輸入動詞原形、過去式或中文...">
    </div>

    <div v-if="isLoading" class="loading">⏳ 載入中...</div>
    <div v-else class="table-container retro-element">
      <p class="summary">目前共有 <strong>{{ filteredVerbs.length }}</strong> 個不規則動詞</p>
      <table class="retro-table">
        <thead>
          <tr>
            <th width="20%">動詞原形</th>
            <th width="25%">過去式</th>
            <th width="25%">過去分詞</th>
            <th width="20%">中文意義</th>
            <th width="10%">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in filteredVerbs" :key="v.id">
            <td class="verb-main">{{ v.base_form }}</td>
            <td class="verb-variant">{{ v.past_tense }}</td>
            <td class="verb-variant">{{ v.past_participle }}</td>
            <td class="verb-zh">{{ v.chinese }}</td>
            <td class="action-cell">
              <button @click="openEdit(v)" class="edit-btn" title="編輯">✏️</button>
              <button @click="deleteVerb(v.id)" class="del-btn" title="刪除">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredVerbs.length === 0" class="empty-msg">沒有找到符合條件的動詞喔！</div>
    </div>

    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content retro-element">
        <h3>✏️ 編輯不規則動詞</h3>
        
        <div class="form-group full-width">
          <label>動詞原形 (Base Form)</label>
          <input type="text" v-model="editingVerb.base_form" class="retro-input main-input">
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>過去式 (Past Tense)</label>
            <input type="text" v-model="editingVerb.past_tense" class="retro-input">
            <small>多種寫法請用斜線分隔，如: was/were</small>
          </div>
          <div class="form-group">
            <label>過去分詞 (Past Participle)</label>
            <input type="text" v-model="editingVerb.past_participle" class="retro-input">
            <small>如: been</small>
          </div>
        </div>
        
        <div class="form-group full-width">
          <label>中文意義</label>
          <input type="text" v-model="editingVerb.chinese" class="retro-input">
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
.admin-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.retro-btn { cursor: pointer; background: #eee; padding: 10px 15px; border-radius: 8px; border: 2px solid #333; font-weight: bold; box-shadow: 2px 2px 0 #333; transition: 0.1s;}
.retro-btn:active { transform: translateY(2px); box-shadow: none;}
.upload-btn { background: #e8f5e9; color: #1b5e20; }

.filter-panel { background: #fdfdfd; padding: 15px; border-radius: 12px; border: 2px solid #ddd; margin-bottom: 20px; display: flex; gap: 15px; align-items: center;}
.search-input { flex: 1; max-width: 400px;}
.retro-input { width: 100%; padding: 10px; border: 2px solid #9fa8da; border-radius: 8px; font-size: 1rem; outline: none; box-sizing: border-box; font-family: inherit;}

.table-container { background: white; padding: 20px; border-radius: 16px; border: 2px solid #ccc;}
.summary { margin-top: 0; color: #e65100; font-size: 1.1rem;}
.retro-table { width: 100%; border-collapse: collapse;}
.retro-table th, .retro-table td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: middle; }
.retro-table th { background: #f5f5f5; font-weight: bold;}
.verb-main { font-size: 1.2rem; font-weight: 900; color: #1a237e;}
.verb-variant { font-size: 1.1rem; color: #2e7d32; font-weight: bold;}
.verb-zh { color: #555; font-size: 1rem;}

.action-cell { display: flex; gap: 5px; justify-content: center;}
.edit-btn, .del-btn { padding: 6px 10px; border-radius: 6px; cursor: pointer; border: 1px solid #ccc; font-size: 1.1rem;}
.edit-btn { background: #e3f2fd; } .del-btn { background: #ffebee; }
.empty-msg { text-align: center; padding: 40px; color: #999; font-size: 1.2rem; font-weight: bold;}

.modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:100; padding: 20px;}
.modal-content { background:white; padding:30px; border-radius:16px; width:100%; max-width:600px; border: 3px solid #333; max-height: 90vh; overflow-y: auto;}
.modal-content h3 { margin-top: 0; color: #303f9f; border-bottom: 2px dashed #ccc; padding-bottom: 10px;}
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;}
.form-group { display: flex; flex-direction: column; gap: 5px;}
.form-group label { font-weight: bold; color: #555;}
.form-group small { color: #888; font-size: 0.8rem;}
.full-width { margin-bottom: 15px;}
.main-input { font-size: 1.3rem; font-weight: bold; color: #1a237e;}
.modal-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px;}
.save-btn { background: #4caf50; color: white; border-color: #2e7d32;}
.cancel-btn { background: #f5f5f5;}
</style>
