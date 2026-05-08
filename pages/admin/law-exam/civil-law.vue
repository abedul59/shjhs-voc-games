<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const clauses = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);
const viewMode = ref('single'); // 'single' (逐條) or 'all' (全部)

const searchQuery = ref('');
const selectedClause = ref(null);
const selectedIds = ref([]);
const floatingReference = ref(null);

// 🌟 用於新增網址的暫存狀態
const newUrlLabel = ref('');
const newUrlLink = ref('');

// 🌟 中文數字轉阿拉伯數字對照表 (用於偵測跳轉)
const chineseToNum = (text) => {
  const table = { '〇':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'百':100,'千':1000 };
  let result = 0, temp = 0, section = 0;
  // 這裡我們簡化處理，因為條號通常不超過 2000。
  // 更穩健的方法是正則匹配，但針對條號搜尋，我們可以直接比對標題。
  return text; 
};

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

// 章節樹狀結構化
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

// 🌟 自動偵測內文中的「第 XX 條」
const parseContentWithLinks = (text) => {
  if (!text) return '';
  // 正則表達式：支援阿拉伯數字(78)與中文數字(七十八)
  const regex = /(第\s*[0-9一二三四五六七八九十百千-]+[條之]*[0-9一二三四五六七八九十百千-]*\s*條)/g;
  
  return text.split(regex).map(part => {
    if (regex.test(part)) {
      return `<button class="ref-btn" data-raw="${part}">${part}</button>`;
    }
    return part;
  }).join('');
};

const handleContentClick = (e) => {
  if (e.target.classList.contains('ref-btn')) {
    const rawText = e.target.getAttribute('data-raw');
    // 嘗試比對 title 找到目標 (如 "第 78 條" 或 "第 78-1 條")
    // 我們將輸入與資料庫中的 title 進行模糊比對
    const target = clauses.value.find(c => {
      const cleanTarget = rawText.replace(/\s/g, '');
      const cleanTitle = c.title.replace(/\s/g, '');
      return cleanTitle === cleanTarget || c.article_num === rawText.match(/[0-9-]+/)?.[0];
    });
    
    if (target) floatingReference.value = target;
    else alert(`系統暫時無法定位：${rawText}`);
  }
};

const saveCurrentData = async (clause) => {
  await supabase.from('civil_law_clauses')
    .update({ notes: clause.notes, urls: clause.urls })
    .eq('id', clause.id);
};

const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const { error } = await supabase.from('civil_law_clauses').insert(results.data);
      if (error) alert(error.message);
      else fetchClauses();
      isUploading.value = false;
    }
  });
};

const addNewUrl = (clause) => {
  if (!newUrlLabel.value || !newUrlLink.value) return;
  if (!clause.urls) clause.urls = [];
  let link = newUrlLink.value;
  if (!link.startsWith('http')) link = 'https://' + link;
  clause.urls.push({ label: newUrlLabel.value, url: link });
  newUrlLabel.value = ''; newUrlLink.value = '';
  saveCurrentData(clause);
};

const removeUrl = (clause, index) => {
  clause.urls.splice(index, 1);
  saveCurrentData(clause);
};
</script>

<template>
  <div class="law-layout" :class="{ 'mode-all': viewMode === 'all' }">
    <div class="sidebar" v-if="viewMode === 'single' || !isMobile">
      <div class="sidebar-header">
        <div class="header-top">
          <NuxtLink to="/admin/law-exam" class="back-link">← 回專區</NuxtLink>
          <div class="mode-toggle">
            <button @click="viewMode = 'single'" :class="{ active: viewMode === 'single' }">逐條</button>
            <button @click="viewMode = 'all'" :class="{ active: viewMode === 'all' }">全覽</button>
          </div>
        </div>
        
        <div class="top-actions">
          <label class="btn-tool primary">📥 匯入<input type="file" @change="handleImport" hidden /></label>
          <button @click="fetchClauses" class="btn-tool">🔄 刷新</button>
        </div>
        <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋條號或關鍵字..." />
      </div>

      <div class="tree-list">
        <div v-for="(sections, chapter) in groupedClauses" :key="chapter" class="chapter-group">
          <details open>
            <summary class="chapter-title">{{ chapter }}</summary>
            <div v-for="(items, section) in sections" :key="section" class="section-group">
              <details open>
                <summary class="section-title">{{ section }}</summary>
                <div v-for="c in items" :key="c.id" class="clause-item" :class="{active: selectedClause?.id === c.id}">
                  <span @click="selectClause(c)" class="clause-label">{{ c.title }}</span>
                </div>
              </details>
            </div>
          </details>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div v-if="viewMode === 'single'">
        <div v-if="!selectedClause" class="empty-state">⚖️ 請從左側目錄選擇法條</div>
        <div v-else class="clause-detail">
          <div class="clause-header">
            <div class="title-with-path">
              <div class="breadcrumb">{{selectedClause.chapter_name}} > {{selectedClause.section_name}}</div>
              <h1>{{ selectedClause.title }}</h1>
            </div>
          </div>
          <div class="content-box">
            <div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div>
          </div>

          <div class="notes-section">
            <h3>📝 筆記與實務見解</h3>
            <textarea v-model="selectedClause.notes" @blur="saveCurrentData(selectedClause)" class="note-edit"></textarea>
            
            <div class="urls-manager">
              <h4>🔗 參考網址</h4>
              <div class="url-list">
                <div v-for="(linkObj, index) in selectedClause.urls" :key="index" class="url-card">
                  <a :href="linkObj.url" target="_blank">{{ linkObj.label }}</a>
                  <button @click="removeUrl(selectedClause, index)">✕</button>
                </div>
              </div>
              <div class="url-add-form">
                <input v-model="newUrlLabel" placeholder="名稱" />
                <input v-model="newUrlLink" placeholder="網址" />
                <button @click="addNewUrl(selectedClause)">新增</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="full-text-view">
        <div class="view-header">
          <h1>全部條文預覽 ({{clauses.length}} 條)</h1>
          <button @click="viewMode = 'single'" class="btn-tool">切換回逐條模式</button>
        </div>
        <div class="clauses-container">
          <div v-for="c in clauses" :key="c.id" class="full-clause-card">
            <div class="card-side">
              <span class="card-num">{{ c.title }}</span>
              <button @click="selectClause(c); viewMode = 'single'" class="btn-jump-edit">編輯筆記</button>
            </div>
            <div class="card-main">
              <div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div>
              <div v-if="c.notes" class="card-note-preview">💡 {{ c.notes }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="floatingReference" class="floating-modal-overlay" @click.self="floatingReference = null">
      <div class="floating-modal">
        <div class="float-header">
          <h4>{{ floatingReference.title }}</h4>
          <button @click="floatingReference = null">✕</button>
        </div>
        <div class="float-body">
          <p class="float-content-text">{{ floatingReference.content }}</p>
          <div v-if="floatingReference.notes" class="float-note-preview">
            <strong>筆記：</strong> {{ floatingReference.notes }}
          </div>
          <button @click="selectedClause = floatingReference; floatingReference = null; viewMode = 'single'" class="btn-jump-main">查看完整條文與網址 ➔</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.law-layout { display: flex; height: 100vh; background: #f8fafc; font-family: 'Helvetica Neue', Arial, sans-serif; overflow: hidden; }

/* 側邊欄與模式切換 */
.sidebar { width: 340px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-header { padding: 15px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.mode-toggle { display: flex; background: #e2e8f0; padding: 3px; border-radius: 8px; }
.mode-toggle button { border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.mode-toggle button.active { background: white; color: #4f46e5; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.top-actions { display: flex; gap: 8px; margin-bottom: 10px; }
.btn-tool { flex: 1; padding: 8px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: bold; text-align: center; cursor: pointer; }
.btn-tool.primary { background: #4f46e5; color: white; border: none; }
.search-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; }

/* 內容區 */
.main-content { flex: 1; overflow-y: auto; padding: 30px; position: relative; scroll-behavior: smooth;}
.clause-detail { max-width: 800px; margin: 0 auto; }
.content-box { background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; line-height: 1.8; font-size: 18px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }

/* 🌟 強化的參照按鈕 */
:deep(.ref-btn) { 
  background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; 
  padding: 0 6px; border-radius: 4px; font-size: 15px; font-weight: bold; 
  cursor: pointer; margin: 0 2px; transition: 0.2s; vertical-align: middle;
}
:deep(.ref-btn:hover) { background: #4f46e5; color: white; transform: translateY(-1px); }

/* 全覽模式樣式 */
.full-text-view { max-width: 900px; margin: 0 auto; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.full-clause-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; margin-bottom: 15px; overflow: hidden; }
.card-side { width: 100px; background: #f8fafc; padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-right: 1px solid #e2e8f0; }
.card-num { font-weight: 800; font-size: 14px; color: #4f46e5; text-align: center; }
.btn-jump-edit { font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; background: white; cursor: pointer; }
.card-main { flex: 1; padding: 20px; }
.card-content { font-size: 16px; line-height: 1.6; }
.card-note-preview { margin-top: 12px; padding: 8px 12px; background: #fffbeb; border-radius: 6px; font-size: 13px; color: #854d0e; }

/* 浮動視窗樣式 */
.floating-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.2); z-index: 100; display: flex; justify-content: center; align-items: center; }
.floating-modal { width: 400px; background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; animation: popUp 0.2s ease; }
.float-header { padding: 15px 20px; background: #1e293b; color: white; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; }
.float-header button { background: none; border: none; color: white; cursor: pointer; font-size: 18px; }
.float-body { padding: 20px; max-height: 400px; overflow-y: auto; }
.float-content-text { line-height: 1.6; color: #334155; margin-bottom: 15px; }
.btn-jump-main { width: 100%; padding: 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: bold; color: #4f46e5; cursor: pointer; }

/* 筆記區與網址區 (簡化版) */
.note-edit { width: 100%; height: 120px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fffbeb; font-family: inherit; margin-bottom: 20px; }
.url-card { display: flex; justify-content: space-between; background: #f1f5f9; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }
.url-add-form { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; margin-top: 15px; }
.url-add-form input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; }

@keyframes popUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* 🌟 手機版 (Mobile) 優化 */
@media (max-width: 768px) {
  .law-layout { flex-direction: column; overflow: auto; }
  .sidebar { width: 100%; height: 35vh; border-right: none; border-bottom: 2px solid #e2e8f0; }
  .main-content { padding: 20px 15px; }
  .full-clause-card { flex-direction: column; }
  .card-side { width: 100%; flex-direction: row; justify-content: space-between; border-right: none; border-bottom: 1px solid #e2e8f0; }
  .floating-modal { width: 90%; position: fixed; bottom: 20px; }
  .url-add-form { grid-template-columns: 1fr; }
}
</style>
