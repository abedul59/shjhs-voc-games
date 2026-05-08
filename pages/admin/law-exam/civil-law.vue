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
const selectedIds = ref([]); // 用於批次刪除

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
  selectedIds.value = []; 
};

onMounted(fetchClauses);

// 🌟 章節樹狀結構化邏輯
const groupedClauses = computed(() => {
  const groups = {};
  const data = searchQuery.value 
    ? clauses.value.filter(c => c.title.includes(searchQuery.value) || c.content.includes(searchQuery.value))
    : clauses.value;

  data.forEach(c => {
    const chapter = c.chapter_name || '未分類編';
    const section = c.section_name || '未分類章';
    if (!groups[chapter]) groups[chapter] = {};
    if (!groups[chapter][section]) groups[chapter][section] = [];
    groups[chapter][section].push(c);
  });
  return groups;
});

// 🌟 匯入/匯出功能
const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const { error } = await supabase.from('civil_law_clauses').insert(results.data);
      if (error) alert('匯入失敗: ' + error.message);
      else { alert(`成功匯入 ${results.data.length} 條法規！`); fetchClauses(); }
      isUploading.value = false;
    }
  });
};

const exportCSV = () => {
  if (clauses.value.length === 0) return alert('目前沒有資料可以匯出');
  const csv = Papa.unparse(clauses.value);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `civil_law_backup_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};

// 🌟 刪除功能
const deleteSingle = async (id) => {
  if (!confirm('確定刪除此條文？此動作無法復原。')) return;
  const { error } = await supabase.from('civil_law_clauses').delete().eq('id', id);
  if (error) alert('刪除失敗');
  else { selectedClause.value = null; fetchClauses(); }
};

const batchDelete = async () => {
  if (selectedIds.value.length === 0) return alert('請先勾選要刪除的條文');
  if (!confirm(`確定刪除選取的 ${selectedIds.value.length} 條法規？此動作無法復原。`)) return;
  const { error } = await supabase.from('civil_law_clauses').delete().in('id', selectedIds.value);
  if (error) alert('批次刪除失敗');
  else { selectedIds.value = []; fetchClauses(); }
};

const clearAll = async () => {
  if (!confirm('🚨 嚴重警告：這將會永久刪除「所有」民法條文、筆記與網址！確定要清空嗎？')) return;
  const { error } = await supabase.from('civil_law_clauses').delete().neq('article_num', 'CLEAN_ALL');
  if (error) alert('清空失敗: ' + error.message);
  else { alert('已成功清空所有資料'); selectedClause.value = null; fetchClauses(); }
};

// 介面邏輯
const selectClause = (clause) => { selectedClause.value = clause; isEditing.value = false; };
const parseContentWithLinks = (text) => {
  if (!text) return '';
  const regex = /(第\s*\d+(?:-\d+)?\s*條)/g;
  return text.split(regex).map(part => {
    if (regex.test(part)) {
      const numMatch = part.match(/\d+(?:-\d+)?/);
      const num = numMatch ? numMatch[0] : '';
      return `<button class="ref-btn" data-target="${num}">${part}</button>`;
    }
    return part;
  }).join('');
};
const handleContentClick = (e) => {
  if (e.target.classList.contains('ref-btn')) {
    const target = clauses.value.find(c => c.article_num === e.target.getAttribute('data-target'));
    if (target) floatingReference.value = target;
  }
};

const saveNote = async () => {
  if (!selectedClause.value) return;
  await supabase.from('civil_law_clauses').update({notes: selectedClause.value.notes}).eq('id', selectedClause.value.id);
};
</script>

<template>
  <div class="law-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <NuxtLink to="/admin/law-exam" class="back-link">← 回首頁</NuxtLink>
        
        <div class="top-actions">
          <label class="btn-tool primary">📥 匯入<input type="file" @change="handleImport" hidden /></label>
          <button @click="exportCSV" class="btn-tool">📤 匯出</button>
        </div>

        <div class="danger-zone">
          <button @click="batchDelete" class="btn-tool danger" :disabled="!selectedIds.length">
            🗑️ 刪除選取 ({{selectedIds.length}})
          </button>
          <button @click="clearAll" class="btn-tool danger-filled">
            🔥 全部清空
          </button>
        </div>

        <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋條號或內容..." />
      </div>

      <div class="tree-list">
        <div v-if="isLoading" class="list-msg">資料載入中...</div>
        <div v-else v-for="(sections, chapter) in groupedClauses" :key="chapter" class="chapter-group">
          <details open>
            <summary class="chapter-title">{{ chapter }}</summary>
            <div v-for="(items, section) in sections" :key="section" class="section-group">
              <details open>
                <summary class="section-title">{{ section }}</summary>
                <div v-for="c in items" :key="c.id" class="clause-item" :class="{active: selectedClause?.id === c.id}">
                  <input type="checkbox" v-model="selectedIds" :value="c.id" class="q-checkbox" />
                  <span @click="selectClause(c)" class="clause-label">{{ c.title }}</span>
                </div>
              </details>
            </div>
          </details>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div v-if="!selectedClause" class="empty-state">
        <div class="empty-info">
          <p>⚖️ 請從左側目錄選擇法條以檢視內容</p>
          <p class="sub-info">您可以點擊「匯入」來上傳完美版民法 CSV</p>
        </div>
      </div>
      
      <div v-else class="clause-detail">
        <div class="clause-header">
          <div class="title-with-path">
            <div class="breadcrumb">{{selectedClause.chapter_name}} > {{selectedClause.section_name}}</div>
            <h1>{{ selectedClause.title }}</h1>
          </div>
          <button @click="deleteSingle(selectedClause.id)" class="btn-delete-single">刪除此條文</button>
        </div>

        <div class="content-box">
          <div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div>
        </div>

        <div class="notes-section">
          <div class="notes-header">
            <h3>📝 個人筆記與實務見解</h3>
            <span class="auto-save-tag">自動儲存中</span>
          </div>
          <textarea 
            v-model="selectedClause.notes" 
            @blur="saveNote" 
            class="note-edit" 
            placeholder="點擊此處輸入筆記或實務見解，離開後會自動儲存..."
          ></textarea>
        </div>
      </div>
    </div>

    <div v-if="floatingReference" class="floating-modal">
      <div class="float-header">
        <h4>{{ floatingReference.title }} 參照</h4>
        <button @click="floatingReference = null" class="close-float">✕</button>
      </div>
      <div class="float-body">
        <div class="float-path">{{floatingReference.chapter_name}}</div>
        <p class="float-content-text">{{ floatingReference.content }}</p>
        <div v-if="floatingReference.notes" class="float-note-preview">
          <strong>我的筆記：</strong><br>{{ floatingReference.notes }}
        </div>
        <button @click="selectClause(floatingReference); floatingReference = null" class="btn-jump">
          查看完整條文 ➔
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.law-layout { display: flex; height: 100vh; background: #f1f5f9; font-family: 'Helvetica Neue', Arial, sans-serif; overflow: hidden; }

/* 側邊欄 */
.sidebar { width: 360px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-header { padding: 15px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.back-link { font-size: 13px; font-weight: bold; color: #4f46e5; text-decoration: none; margin-bottom: 10px; display: inline-block; }

.top-actions, .danger-zone { display: flex; gap: 8px; margin-bottom: 10px; }
.btn-tool { flex: 1; padding: 8px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: bold; text-align: center; cursor: pointer; transition: 0.2s; }
.btn-tool:hover { background: #f1f5f9; }
.btn-tool.primary { background: #4f46e5; color: white; border: none; }
.btn-tool.danger { color: #dc2626; border-color: #fecaca; }
.btn-tool.danger:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-tool.danger-filled { background: #dc2626; color: white; border: none; }
.btn-tool.danger-filled:hover { background: #b91c1c; }

.search-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; }

/* 樹狀列表 */
.tree-list { flex: 1; overflow-y: auto; padding: 10px; background: #fff; }
.chapter-title { padding: 10px; font-weight: 800; color: #1e293b; background: #f1f5f9; border-radius: 8px; cursor: pointer; margin-top: 12px; font-size: 14px; }
.section-title { padding: 8px 15px; font-size: 13px; font-weight: bold; color: #64748b; cursor: pointer; }
.clause-item { display: flex; align-items: center; gap: 10px; padding: 6px 30px; transition: 0.2s; border-radius: 6px; }
.clause-item:hover { background: #f8fafc; }
.clause-item.active { background: #eef2ff; color: #4f46e5; font-weight: bold; }
.q-checkbox { width: 16px; height: 16px; cursor: pointer; }
.clause-label { flex: 1; cursor: pointer; font-size: 14px; }

/* 主內容區 */
.main-content { flex: 1; overflow-y: auto; padding: 40px; position: relative; }
.empty-state { height: 100%; display: flex; justify-content: center; align-items: center; text-align: center; color: #94a3b8; }
.sub-info { font-size: 14px; margin-top: 10px; }

.clause-detail { max-width: 850px; margin: 0 auto; animation: fadeIn 0.3s ease; }
.clause-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
.breadcrumb { font-size: 12px; color: #94a3b8; margin-bottom: 5px; font-weight: bold; }
.clause-header h1 { margin: 0; font-size: 28px; color: #1e293b; }
.btn-delete-single { background: #fff; color: #ef4444; border: 1px solid #fecaca; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: bold; cursor: pointer; }

.content-box { background: white; padding: 35px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; line-height: 1.8; font-size: 18px; color: #334155; margin-bottom: 30px; }
.content-text { white-space: pre-wrap; }

/* 參照按鈕 */
:deep(.ref-btn) { background: #e0e7ff; color: #4338ca; border: none; padding: 0 8px; border-radius: 4px; font-size: 14px; font-weight: 800; cursor: pointer; margin: 0 2px; vertical-align: baseline; transition: 0.2s; }
:deep(.ref-btn:hover) { background: #c7d2fe; transform: translateY(-1px); }

.notes-section { background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.auto-save-tag { font-size: 11px; color: #10b981; font-weight: bold; background: #d1fae5; padding: 2px 8px; border-radius: 10px; }
.note-edit { width: 100%; height: 250px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fffbeb; font-family: inherit; font-size: 15px; line-height: 1.6; resize: vertical; outline: none; }
.note-edit:focus { border-color: #fbbf24; box-shadow: 0 0 0 4px rgba(251,191,36,0.1); }

/* 浮動視窗 */
.floating-modal { position: absolute; right: 40px; top: 40px; width: 340px; background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); border: 1px solid #e2e8f0; z-index: 100; animation: slideIn 0.3s ease-out; }
.float-header { background: #1e293b; color: white; padding: 15px 20px; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; }
.close-float { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 18px; }
.float-body { padding: 20px; max-height: 500px; overflow-y: auto; }
.float-path { font-size: 11px; color: #94a3b8; font-weight: bold; margin-bottom: 10px; }
.float-content-text { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 15px; white-space: pre-wrap; }
.float-note-preview { background: #fef9c3; padding: 12px; border-radius: 8px; font-size: 13px; color: #854d0e; margin-bottom: 15px; border-left: 4px solid #fbbf24; }
.btn-jump { width: 100%; padding: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: bold; color: #4f46e5; cursor: pointer; }

@keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 1024px) {
  .sidebar { width: 300px; }
}

@media (max-width: 768px) {
  .law-layout { flex-direction: column; overflow: auto; }
  .sidebar { width: 100%; height: 40vh; border-right: none; border-bottom: 2px solid #e2e8f0; }
  .main-content { padding: 20px 15px; }
  .floating-modal { position: fixed; bottom: 0; top: auto; right: 0; left: 0; width: 100%; border-radius: 20px 20px 0 0; }
}
</style>
