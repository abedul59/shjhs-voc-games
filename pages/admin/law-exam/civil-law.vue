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

const editForm = ref({ notes: '', urls: [] });
const newUrlLabel = ref('');
const newUrlLink = ref('');
const floatingReference = ref(null);

const fetchClauses = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('civil_law_clauses').select('*');
  if (data) {
    clauses.value = data.sort((a, b) => {
      const numA = parseFloat(a.article_num.replace('-', '.'));
      const numB = parseFloat(b.article_num.replace('-', '.'));
      return numA - numB;
    });
  }
  isLoading.value = false;
};

onMounted(fetchClauses);

// 🌟 章節樹狀結構化邏輯
const groupedClauses = computed(() => {
  const groups = {};
  const data = searchQuery.value 
    ? clauses.value.filter(c => c.title.includes(searchQuery.value) || c.content.includes(searchQuery.value))
    : clauses.value;

  data.forEach(c => {
    const chapter = c.chapter_name || '未分類';
    const section = c.section_name || '一般條文';
    if (!groups[chapter]) groups[chapter] = {};
    if (!groups[chapter][section]) groups[chapter][section] = [];
    groups[chapter][section].push(c);
  });
  return groups;
});

// 🌟 匯入/匯出與刪除功能
const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const { error } = await supabase.from('civil_law_clauses').insert(results.data);
      if (error) alert('匯入失敗: ' + error.message);
      else { alert('成功匯入！'); fetchClauses(); }
      isUploading.value = false;
    }
  });
};

const exportCSV = () => {
  if (clauses.value.length === 0) return;
  const csv = Papa.unparse(clauses.value);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `civil_law_backup.csv`;
  link.click();
};

const deleteSingle = async (id) => {
  if (!confirm('確定刪除此條文？')) return;
  await supabase.from('civil_law_clauses').delete().eq('id', id);
  fetchClauses();
};

const batchDelete = async () => {
  if (selectedIds.value.length === 0) return;
  if (!confirm(`確定刪除選取的 ${selectedIds.value.length} 條法規？`)) return;
  await supabase.from('civil_law_clauses').delete().in('id', selectedIds.value);
  selectedIds.value = [];
  fetchClauses();
};

// 介面邏輯 (與上一版相同，包含跳轉功能)
const selectClause = (clause) => { selectedClause.value = clause; isEditing = false; };
const parseContentWithLinks = (text) => {
  if (!text) return '';
  const regex = /(第\s*\d+(?:-\d+)?\s*條)/g;
  return text.split(regex).map(part => {
    if (regex.test(part)) {
      const num = part.match(/\d+(?:-\d+)?/)[0];
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
</script>

<template>
  <div class="law-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <NuxtLink to="/admin/law-exam" class="back-link">← 回首頁</NuxtLink>
        <div class="top-actions">
          <label class="btn-tool">📥 匯入<input type="file" @change="handleImport" hidden /></label>
          <button @click="exportCSV" class="btn-tool">📤 匯出</button>
          <button @click="batchDelete" v-if="selectedIds.length" class="btn-tool danger">🗑 刪除 ({{selectedIds.length}})</button>
        </div>
        <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋法條..." />
      </div>

      <div class="tree-list">
        <div v-for="(sections, chapter) in groupedClauses" :key="chapter" class="chapter-group">
          <details open>
            <summary class="chapter-title">{{ chapter }}</summary>
            <div v-for="(items, section) in sections" :key="section" class="section-group">
              <details>
                <summary class="section-title">{{ section }}</summary>
                <div v-for="c in items" :key="c.id" class="clause-item" :class="{active: selectedClause?.id === c.id}">
                  <input type="checkbox" v-model="selectedIds" :value="c.id" />
                  <span @click="selectClause(c)" class="clause-label">{{ c.title }}</span>
                </div>
              </details>
            </div>
          </details>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div v-if="!selectedClause" class="empty-state">請選擇法條</div>
      <div v-else class="clause-detail">
        <div class="clause-header">
          <h1>{{ selectedClause.title }}</h1>
          <button @click="deleteSingle(selectedClause.id)" class="btn-delete-q">刪除此條</button>
        </div>
        <div class="content-box">
          <div class="breadcrumb">{{selectedClause.chapter_name}} > {{selectedClause.section_name}}</div>
          <div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div>
        </div>
        <div class="notes-section">
          <h3>📝 個人筆記與實務見解</h3>
          <textarea v-model="selectedClause.notes" @blur="supabase.from('civil_law_clauses').update({notes: selectedClause.notes}).eq('id', selectedClause.id)" class="note-edit" placeholder="點擊即可直接輸入筆記，離開後自動儲存..."></textarea>
        </div>
      </div>
    </div>

    <div v-if="floatingReference" class="floating-modal">
      <div class="float-header"><h4>{{ floatingReference.title }} 參照</h4><button @click="floatingReference = null">✕</button></div>
      <div class="float-body"><p>{{ floatingReference.content }}</p><button @click="selectClause(floatingReference); floatingReference = null" class="btn-jump">跳轉 ➔</button></div>
    </div>
  </div>
</template>

<style scoped>
.law-layout { display: flex; height: 100vh; background: #f8fafc; overflow: hidden; }
.sidebar { width: 350px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.sidebar-header { padding: 15px; border-bottom: 1px solid #e2e8f0; }
.top-actions { display: flex; gap: 5px; margin-bottom: 10px; }
.btn-tool { flex: 1; padding: 6px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: bold; text-align: center; cursor: pointer; }
.btn-tool.danger { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
.search-input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }

.tree-list { flex: 1; overflow-y: auto; padding: 10px; }
.chapter-title { padding: 8px; font-weight: bold; color: #1e293b; background: #f8fafc; border-radius: 6px; cursor: pointer; margin-top: 10px;}
.section-title { padding: 6px 20px; font-size: 14px; color: #475569; cursor: pointer; }
.clause-item { display: flex; align-items: center; gap: 8px; padding: 4px 40px; transition: 0.2s; }
.clause-item:hover { background: #f1f5f9; }
.clause-item.active { background: #eff6ff; color: #3b82f6; font-weight: bold; }
.clause-label { flex: 1; cursor: pointer; font-size: 13px; }

.main-content { flex: 1; overflow-y: auto; padding: 30px; position: relative; }
.clause-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.btn-delete-q { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; }
.breadcrumb { font-size: 12px; color: #94a3b8; margin-bottom: 10px; }
.content-box { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; line-height: 1.8; font-size: 16px; }
.note-edit { width: 100%; height: 200px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fffbeb; margin-top: 15px; font-family: inherit; font-size: 14px; }

:deep(.ref-btn) { background: #e0e7ff; color: #4338ca; border: none; padding: 0 6px; border-radius: 4px; font-size: 13px; font-weight: bold; cursor: pointer; }
.floating-modal { position: absolute; right: 20px; top: 20px; width: 300px; background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; z-index: 50; }
.float-header { background: #1e293b; color: white; padding: 10px 15px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; }
.float-body { padding: 15px; font-size: 13px; }

@media (max-width: 768px) {
  .law-layout { flex-direction: column; }
  .sidebar { width: 100%; height: 40%; }
  .main-content { padding: 15px; }
}
</style>
