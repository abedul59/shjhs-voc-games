<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const clauses = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);

const searchQuery = ref('');
const selectedClause = ref(null);
const isEditing = ref(false);

const editForm = ref({ notes: '', urls: [] });
const newUrlLabel = ref('');
const newUrlLink = ref('');

// 🌟 浮動視窗狀態
const floatingReference = ref(null); 

const fetchClauses = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('civil_law_clauses').select('*');
  if (data) {
    // 依據條號數字排序 (處理 11-1 這種情況)
    clauses.value = data.sort((a, b) => {
      const numA = parseFloat(a.article_num.replace('-', '.'));
      const numB = parseFloat(b.article_num.replace('-', '.'));
      return numA - numB;
    });
  }
  isLoading.value = false;
};

onMounted(fetchClauses);

// 搜尋過濾
const filteredClauses = computed(() => {
  if (!searchQuery.value) return clauses.value;
  return clauses.value.filter(c => 
    c.title.includes(searchQuery.value) || c.content.includes(searchQuery.value) || (c.notes && c.notes.includes(searchQuery.value))
  );
});

// 匯入 CSV
const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const mappedData = results.data.map(row => ({
        article_num: row['article_num'],
        title: row['title'],
        content: row['content'],
        notes: row['notes'] || '',
        urls: []
      }));
      const { error } = await supabase.from('civil_law_clauses').insert(mappedData);
      if (error) alert('匯入失敗: ' + error.message);
      else { alert(`成功匯入 ${mappedData.length} 條法規！`); fetchClauses(); }
      isUploading.value = false; e.target.value = '';
    }
  });
};

// 選擇法條
const selectClause = (clause) => {
  selectedClause.value = clause;
  isEditing.value = false;
};

// 編輯筆記與網址
const startEdit = () => {
  editForm.value = { 
    notes: selectedClause.value.notes || '', 
    urls: JSON.parse(JSON.stringify(selectedClause.value.urls || [])) 
  };
  isEditing.value = true;
};

const addUrl = () => {
  if (!newUrlLabel.value || !newUrlLink.value) return alert('請輸入名稱與網址');
  editForm.value.urls.push({ label: newUrlLabel.value, link: newUrlLink.value });
  newUrlLabel.value = ''; newUrlLink.value = '';
};

const removeUrl = (index) => {
  editForm.value.urls.splice(index, 1);
};

const saveEdit = async () => {
  const { error } = await supabase.from('civil_law_clauses')
    .update({ notes: editForm.value.notes, urls: editForm.value.urls })
    .eq('id', selectedClause.value.id);
  
  if (error) alert('儲存失敗: ' + error.message);
  else {
    selectedClause.value.notes = editForm.value.notes;
    selectedClause.value.urls = editForm.value.urls;
    isEditing.value = false;
  }
};

// 🌟 自動辨識內文的法條並轉換為按鈕
const parseContentWithLinks = (text) => {
  if (!text) return '';
  // 尋找「第 X 條」或「第 X-Y 條」的格式
  const regex = /(第\s*\d+(?:-\d+)?\s*條)/g;
  const parts = text.split(regex);
  
  return parts.map(part => {
    if (regex.test(part)) {
      // 提取數字部分以供查詢
      const match = part.match(/\d+(?:-\d+)?/);
      const num = match ? match[0] : '';
      return `<button class="ref-btn" data-target="${num}">${part}</button>`;
    }
    return part;
  }).join('');
};

// 🌟 處理點擊參照按鈕
const handleContentClick = (e) => {
  if (e.target.classList.contains('ref-btn')) {
    const targetNum = e.target.getAttribute('data-target');
    const targetClause = clauses.value.find(c => c.article_num === targetNum);
    if (targetClause) {
      floatingReference.value = targetClause;
    } else {
      alert(`找不到第 ${targetNum} 條的資料`);
    }
  }
};
</script>

<template>
  <div class="law-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <NuxtLink to="/admin/law-exam" class="back-link">← 回首頁</NuxtLink>
        <h2>🏛️ 民法典籍</h2>
        <div class="actions">
          <label class="btn-import">
            <span v-if="isUploading">處理中...</span><span v-else>📥 匯入法條</span>
            <input type="file" accept=".csv" @change="handleImport" :disabled="isUploading" style="display:none;" />
          </label>
        </div>
        <input v-model="searchQuery" type="text" class="search-input" placeholder="🔍 搜尋條文或內容..." />
      </div>

      <div class="clause-list">
        <div v-if="isLoading" class="list-msg">載入中...</div>
        <div v-else-if="filteredClauses.length === 0" class="list-msg">無資料</div>
        <button 
          v-else 
          v-for="c in filteredClauses" 
          :key="c.id" 
          class="list-item" 
          :class="{ active: selectedClause?.id === c.id }"
          @click="selectClause(c)"
        >
          {{ c.title }}
        </button>
      </div>
    </div>

    <div class="main-content">
      <div v-if="!selectedClause" class="empty-state">
        請從左側選擇法條以檢視內容
      </div>
      
      <div v-else class="clause-detail">
        <div class="clause-header">
          <h1>{{ selectedClause.title }}</h1>
        </div>

        <div class="content-box">
          <div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div>
        </div>

        <div class="notes-section">
          <div class="section-header">
            <h3>📝 個人筆記與實務見解</h3>
            <button v-if="!isEditing" @click="startEdit" class="btn-edit">編輯內容</button>
          </div>

          <div v-if="!isEditing">
            <div class="notes-display">{{ selectedClause.notes || '尚未新增筆記。' }}</div>
            <div v-if="selectedClause.urls && selectedClause.urls.length > 0" class="url-list">
              <a v-for="(u, idx) in selectedClause.urls" :key="idx" :href="u.link" target="_blank" class="url-item">
                🔗 {{ u.label }}
              </a>
            </div>
          </div>

          <div v-else class="edit-form">
            <textarea v-model="editForm.notes" rows="5" class="edit-textarea" placeholder="在這裡輸入您的筆記..."></textarea>
            
            <div class="url-manager">
              <h4>相關網址</h4>
              <div v-for="(u, idx) in editForm.urls" :key="idx" class="url-row">
                <span class="url-label">{{ u.label }}</span>
                <button @click="removeUrl(idx)" class="btn-remove">✕</button>
              </div>
              <div class="add-url-row">
                <input v-model="newUrlLabel" type="text" placeholder="標題(如: 最高法院判例)" class="url-input" />
                <input v-model="newUrlLink" type="url" placeholder="https://..." class="url-input" />
                <button @click="addUrl" class="btn-add-url">＋ 新增</button>
              </div>
            </div>

            <div class="form-actions">
              <button @click="isEditing = false" class="btn-cancel">取消</button>
              <button @click="saveEdit" class="btn-save">儲存變更</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="floatingReference" class="floating-modal">
      <div class="float-header">
        <h4>{{ floatingReference.title }} 參照</h4>
        <button @click="floatingReference = null" class="btn-close-float">✕</button>
      </div>
      <div class="float-body">
        <p class="float-content">{{ floatingReference.content }}</p>
        <div v-if="floatingReference.notes" class="float-notes">
          <strong>筆記：</strong> {{ floatingReference.notes }}
        </div>
        <button @click="selectClause(floatingReference); floatingReference = null" class="btn-jump">
          跳轉至此法條 ➔
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.law-layout { display: flex; height: 100vh; background: #f0f4f8; font-family: 'Helvetica Neue', Arial, sans-serif; overflow: hidden;}
.sidebar { width: 320px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0;}
.sidebar-header { padding: 20px; border-bottom: 1px solid #e2e8f0; }
.back-link { font-size: 13px; font-weight: bold; color: #6366f1; text-decoration: none; margin-bottom: 10px; display: inline-block;}
.sidebar-header h2 { margin: 0 0 15px 0; font-size: 20px; color: #1e293b;}
.btn-import { background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; display: inline-block; margin-bottom: 15px;}
.search-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: #f8fafc; outline: none;}
.search-input:focus { border-color: #6366f1; }

.clause-list { flex: 1; overflow-y: auto; padding: 10px; }
.list-item { display: block; width: 100%; text-align: left; padding: 12px 15px; border: none; background: transparent; font-size: 15px; font-weight: bold; color: #475569; border-radius: 8px; cursor: pointer; transition: 0.2s;}
.list-item:hover { background: #f1f5f9; color: #1e293b;}
.list-item.active { background: #eef2ff; color: #4f46e5; }
.list-msg { padding: 20px; text-align: center; color: #94a3b8; font-size: 14px;}

.main-content { flex: 1; overflow-y: auto; padding: 40px; position: relative;}
.empty-state { height: 100%; display: flex; justify-content: center; align-items: center; color: #94a3b8; font-size: 18px; font-weight: bold;}
.clause-detail { max-width: 800px; margin: 0 auto;}
.clause-header h1 { font-size: 28px; color: #1e293b; margin: 0 0 20px 0;}
.content-box { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 30px; border: 1px solid #e2e8f0; font-size: 17px; line-height: 1.8; color: #334155; white-space: pre-wrap;}

/* 🌟 自動產生的參照按鈕樣式 */
:deep(.ref-btn) { background: #e0e7ff; color: #4338ca; border: none; padding: 2px 8px; border-radius: 4px; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.2s; vertical-align: baseline; margin: 0 4px;}
:deep(.ref-btn:hover) { background: #c7d2fe; transform: translateY(-1px);}

.notes-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;}
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;}
.section-header h3 { margin: 0; color: #1e293b; font-size: 18px;}
.btn-edit { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; color: #475569;}
.btn-edit:hover { background: #f1f5f9; }

.notes-display { font-size: 15px; color: #475569; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;}
.url-list { display: flex; flex-direction: column; gap: 10px;}
.url-item { color: #6366f1; text-decoration: none; font-weight: bold; font-size: 14px; background: #eef2ff; padding: 8px 12px; border-radius: 6px; display: inline-block;}
.url-item:hover { background: #e0e7ff; }

.edit-form { display: flex; flex-direction: column; gap: 20px;}
.edit-textarea { width: 100%; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; box-sizing: border-box; resize: vertical; outline: none; font-family: inherit;}
.edit-textarea:focus { border-color: #6366f1; }

.url-manager h4 { margin: 0 0 10px 0; font-size: 14px; color: #475569;}
.url-row { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e2e8f0;}
.url-label { font-size: 14px; font-weight: bold; color: #334155;}
.btn-remove { background: #fee2e2; color: #dc2626; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 12px; font-weight: bold;}
.add-url-row { display: flex; gap: 10px; margin-top: 10px;}
.url-input { flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none;}
.btn-add-url { background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 0 15px; font-weight: bold; cursor: pointer;}

.form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 15px; border-top: 1px solid #e2e8f0;}
.btn-cancel { background: transparent; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;}
.btn-save { background: #10b981; color: white; border: none; padding: 8px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(16,185,129,0.2);}

/* 🌟 浮動視窗 (Floating Reference) */
.floating-modal { position: absolute; right: 40px; top: 100px; width: 350px; background: white; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #e2e8f0; z-index: 50; animation: slideIn 0.3s ease-out;}
.float-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: #1e293b; color: white; border-radius: 12px 12px 0 0;}
.float-header h4 { margin: 0; font-size: 16px;}
.btn-close-float { background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer;}
.btn-close-float:hover { color: white; }
.float-body { padding: 20px; max-height: 400px; overflow-y: auto;}
.float-content { margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;}
.float-notes { background: #fef9c3; padding: 10px; border-radius: 6px; font-size: 13px; color: #854d0e; margin-bottom: 15px;}
.btn-jump { width: 100%; padding: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: bold; color: #4f46e5; cursor: pointer; transition: 0.2s;}
.btn-jump:hover { background: #e0e7ff; border-color: #a5b4fc;}

@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* 手機版適應 */
@media (max-width: 768px) {
  .law-layout { flex-direction: column; overflow: auto; height: auto;}
  .sidebar { width: 100%; height: 300px; border-right: none; border-bottom: 2px solid #e2e8f0;}
  .main-content { padding: 20px 15px; overflow: visible;}
  .add-url-row { flex-direction: column; }
  .btn-add-url { padding: 10px; }
  .floating-modal { position: fixed; bottom: 0; left: 0; right: 0; top: auto; width: 100%; border-radius: 20px 20px 0 0; animation: slideUp 0.3s ease-out;}
  .float-header { border-radius: 20px 20px 0 0; }
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
