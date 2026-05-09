<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const CONFIG = {
  tableName: 'teachers_dismissal_regulations_clauses',
  parentTableName: 'teachers_act_clauses',
  pageTitle: '教師解聘不續聘辦法',
  primaryColor: '#ec4899', // 櫻花粉
  hoverColor: '#be185d',
  lightBg: '#fdf2f8',
  activeBg: '#fce7f3'
};

  
const supabase = useSupabaseClient();
const clauses = ref([]);
const parentClauses = ref([]); 
const isLoading = ref(true);
const isUploading = ref(false);
const viewMode = ref('single'); 
const searchQuery = ref('');
const selectedClause = ref(null);
const selectedIds = ref([]);
const floatingReference = ref(null);
const newUrlLabel = ref('');
const newUrlLink = ref('');
const isSaving = ref(false);
const showSavedToast = ref(false);
const showSidebar = ref(false);

const fetchData = async () => {
  isLoading.value = true;
  const [childRes, parentRes] = await Promise.all([
    supabase.from(CONFIG.tableName).select('*'),
    supabase.from(CONFIG.parentTableName).select('*')
  ]);

  if (childRes.data) {
    clauses.value = childRes.data.map(c => ({
      ...c, urls: Array.isArray(c.urls) ? c.urls : (typeof c.urls === 'string' ? JSON.parse(c.urls || '[]') : [])
    })).sort((a, b) => parseFloat((a.article_num || '0').replace('-', '.')) - parseFloat((b.article_num || '0').replace('-', '.')));
  }
  if (parentRes.data) parentClauses.value = parentRes.data;
  isLoading.value = false;
};
onMounted(fetchData);

const groupedClauses = computed(() => {
  const groups = {};
  const data = searchQuery.value ? clauses.value.filter(c => (c.title || '').includes(searchQuery.value) || (c.content || '').includes(searchQuery.value)) : clauses.value;
  data.forEach(c => {
    const chapter = c.chapter_name || '未分類編';
    const section = c.section_name || '未分類章';
    if (!groups[chapter]) groups[chapter] = {};
    if (!groups[chapter][section]) groups[chapter][section] = [];
    groups[chapter][section].push(c);
  });
  return groups;
});

const filteredFlatClauses = computed(() => {
  if (!searchQuery.value) return clauses.value;
  return clauses.value.filter(c => (c.title || '').includes(searchQuery.value) || (c.content || '').includes(searchQuery.value));
});

const selectClause = (clause) => { selectedClause.value = clause; viewMode.value = 'single'; showSavedToast.value = false; showSidebar.value = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const saveManual = async (clause) => { if (!clause) return; isSaving.value = true; await supabase.from(CONFIG.tableName).update({ notes: clause.notes, urls: clause.urls }).eq('id', clause.id); isSaving.value = false; showSavedToast.value = true; setTimeout(() => { showSavedToast.value = false; }, 2500); };
const addNewUrl = async (clause) => { if (!newUrlLabel.value || !newUrlLink.value) return; if (!clause.urls) clause.urls = []; let link = newUrlLink.value; if (!link.startsWith('http')) link = 'https://' + link; clause.urls.push({ label: newUrlLabel.value, url: link }); newUrlLabel.value = ''; newUrlLink.value = ''; await saveManual(clause); };
const removeUrl = async (clause, index) => { clause.urls.splice(index, 1); await saveManual(clause); };

const parseNum = (str) => { if (!str) return ''; if (/^\d+$/.test(str)) return str; const dict = { '〇':0, '零':0, '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '百':100, '千':1000 }; let total = 0, current = 0; for (let i = 0; i < str.length; i++) { let val = dict[str[i]]; if (val === undefined) continue; if (val >= 10) { if (current === 0) current = 1; total += current * val; current = 0; } else current = val; } return (total + current).toString(); };
const getNormalizedArticleNum = (rawText) => { 
  let text = rawText.replace(/\s/g, '').replace(/本法|教師法/g, ''); 
  let match = text.match(/^第(.+)條(?:之(.+))?$/); 
  if (!match) return null; 
  let mainNum = parseNum(match[1]); 
  let subNum = match[2] ? '-' + parseNum(match[2]) : ''; 
  return mainNum + subNum; 
};
const parseContentWithLinks = (text) => { 
  if (!text) return ''; 
  const regex = /((?:本法|教師法)?第\s*[0-9一二三四五六七八九十百千-]+[條之]*[0-9一二三四五六七八九十百千-]*\s*條)/g; 
  return text.split(regex).map(part => {
    if (regex.test(part)) {
      const isParent = part.includes('本法') || part.includes('教師法');
      return `<button class="ref-btn" data-type="${isParent ? 'parent' : 'self'}" data-raw="${part}">${part}</button>`;
    }
    return part;
  }).join(''); 
};
const handleContentClick = (e) => { 
  if (e.target.classList.contains('ref-btn')) { 
    const rawText = e.target.getAttribute('data-raw');
    const type = e.target.getAttribute('data-type');
    const convertedNum = getNormalizedArticleNum(rawText); 
    let target = type === 'parent' ? parentClauses.value.find(c => c.article_num === convertedNum) : clauses.value.find(c => c.article_num === convertedNum);
    if (target) floatingReference.value = { ...target, displayTitle: type === 'parent' ? `【教師法】${target.title}` : target.title, canJump: type === 'self' };
    else alert(`無法定位：${rawText} (條號 ${convertedNum})`);
  } 
};

const handleImport = (e) => { const file = e.target.files[0]; if (!file) return; isUploading.value = true; Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => { await supabase.from(CONFIG.tableName).insert(results.data); fetchData(); isUploading.value = false; } }); };
const exportCSV = () => { const csv = Papa.unparse(clauses.value); const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${CONFIG.pageTitle}_backup.csv`; link.click(); };
const batchDelete = async () => { if (!confirm(`確定刪除選取的 ${selectedIds.value.length} 條法規？`)) return; await supabase.from(CONFIG.tableName).delete().in('id', selectedIds.value); fetchData(); };
const clearAll = async () => { if (!confirm('確定清空所有資料嗎？')) return; await supabase.from(CONFIG.tableName).delete().neq('article_num', 'CLEAN_ALL'); selectedClause.value = null; fetchData(); };
</script>

<template>
  <div class="law-layout" :class="{ 'mode-all': viewMode === 'all' }">
    <div class="mobile-nav">
      <button class="btn-menu" @click="showSidebar = true">☰ 目錄</button>
      <div class="mode-toggle">
        <button @click="viewMode = 'single'" :class="{ active: viewMode === 'single' }">逐條</button>
        <button @click="viewMode = 'all'" :class="{ active: viewMode === 'all' }">全覽</button>
      </div>
    </div>

    <div class="sidebar" :class="{ 'mobile-open': showSidebar }">
      <div class="sidebar-header">
        <div class="header-top">
          <NuxtLink to="/admin/law-exam" class="back-link">← 回專區</NuxtLink>
          <button class="btn-close-sidebar" @click="showSidebar = false">✕</button>
        </div>
        <details class="admin-tools">
          <summary>⚙️ 管理與批次工具</summary>
          <div class="tools-panel">
            <div class="top-actions">
              <label class="btn-tool primary">📥 匯入<input type="file" @change="handleImport" hidden /></label>
              <button @click="exportCSV" class="btn-tool">📤 匯出</button>
            </div>
            <div class="danger-zone">
              <button @click="batchDelete" class="btn-tool danger" :disabled="!selectedIds.length">🗑️ 刪除</button>
              <button @click="clearAll" class="btn-tool danger-filled">🔥 清空</button>
            </div>
          </div>
        </details>
        <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋條號..." />
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
      <div v-if="viewMode === 'single'">
        <div v-if="!selectedClause" class="empty-state">
          <div class="empty-box">
            <h2>🧑‍🏫</h2><p>請從目錄選擇法條以檢視內容</p>
            <button class="btn-open-menu-large" @click="showSidebar = true">開啟目錄</button>
          </div>
        </div>
        <div v-else class="clause-detail">
          <div class="clause-header">
            <div class="breadcrumb">{{selectedClause.chapter_name}} > {{selectedClause.section_name}}</div>
            <h1>{{ selectedClause.title }}</h1>
          </div>
          <div class="content-box">
            <div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div>
          </div>
          <div class="notes-section">
            <div class="notes-header">
              <h3>📝 筆記與實務見解</h3>
              <div class="save-actions">
                <span v-if="showSavedToast" class="save-success-tag">✅ 已儲存</span>
                <button @click="saveManual(selectedClause)" class="btn-save-manual" :disabled="isSaving">💾 儲存筆記</button>
              </div>
            </div>
            <textarea v-model="selectedClause.notes" class="note-edit" placeholder="在此貼上實務見解... (保留排版)"></textarea>
            <div class="urls-manager">
              <h4 class="url-section-title">🔗 參考網址</h4>
              <div v-for="(linkObj, index) in selectedClause.urls" :key="index" class="url-card">
                <a :href="linkObj.url" target="_blank">{{ linkObj.label }}</a>
                <button @click="removeUrl(selectedClause, index)" class="btn-remove-url">✕</button>
              </div>
              <div class="url-add-form">
                <input v-model="newUrlLabel" placeholder="名稱" class="url-input" />
                <input v-model="newUrlLink" placeholder="網址" class="url-input" />
                <button @click="addNewUrl(selectedClause)" class="btn-add-url">＋ 新增</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="full-text-view">
        <div class="clauses-container">
          <div v-for="c in filteredFlatClauses" :key="c.id" class="full-clause-card">
            <div class="card-side">
              <span class="card-num">{{ c.title }}</span>
              <button @click="selectClause(c)" class="btn-jump-edit">📝 編輯</button>
            </div>
            <div class="card-main">
              <div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div>
              <div v-if="c.notes" class="card-note-preview">{{ c.notes }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="floatingReference" class="floating-modal-overlay" @click.self="floatingReference = null">
      <div class="floating-modal">
        <div class="float-header"><h4>{{ floatingReference.displayTitle }}</h4><button @click="floatingReference = null">✕</button></div>
        <div class="float-body">
          <p class="float-content-text">{{ floatingReference.content }}</p>
          <div v-if="floatingReference.notes" class="float-note-preview">{{ floatingReference.notes }}</div>
          <button v-if="floatingReference.canJump" @click="selectClause(floatingReference); floatingReference = null" class="btn-jump-main">詳細內容與編輯 ➔</button>
          <button v-else @click="floatingReference = null" class="btn-jump-main" style="background: #94a3b8">關閉視窗</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.law-layout { display: flex; height: 100vh; background: #f8fafc; font-family: sans-serif; overflow: hidden; position: relative;}
.mobile-nav { display: none; justify-content: space-between; align-items: center; background: white; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; z-index: 50;}
.btn-menu { background: v-bind('CONFIG.primaryColor'); color: white; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; }
.sidebar { width: 360px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; z-index: 200; transition: transform 0.3s ease;}
.sidebar-header { padding: 15px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.back-link { font-size: 13px; font-weight: bold; color: v-bind('CONFIG.primaryColor'); text-decoration: none; }
.btn-close-sidebar { display: none; background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;}
.mode-toggle { display: flex; background: #e2e8f0; padding: 4px; border-radius: 8px; }
.mode-toggle button { border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s; background: transparent; color: #64748b;}
.mode-toggle button.active { background: white; color: v-bind('CONFIG.primaryColor'); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.admin-tools { margin-bottom: 15px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;}
.admin-tools summary { padding: 10px; font-size: 13px; font-weight: bold; color: #475569; cursor: pointer; background: #f1f5f9; list-style: none; text-align: center;}
.tools-panel { padding: 10px; border-top: 1px solid #e2e8f0;}
.top-actions, .danger-zone { display: flex; gap: 8px; margin-bottom: 8px; }
.btn-tool { flex: 1; padding: 8px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: bold; text-align: center; cursor: pointer; }
.btn-tool.primary { background: v-bind('CONFIG.primaryColor'); color: white; border: none; }
.btn-tool.danger { color: #dc2626; border-color: #fecaca; }
.btn-tool.danger-filled { background: #dc2626; color: white; border: none; }
.search-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.tree-list { flex: 1; overflow-y: auto; padding: 10px; background: #fff; }
.chapter-title { padding: 10px; font-weight: 800; color: #1e293b; background: #f1f5f9; border-radius: 8px; cursor: pointer; margin-top: 10px; font-size: 14px; }
.section-title { padding: 8px 15px; font-size: 13px; font-weight: bold; color: #64748b; cursor: pointer; }
.clause-item { display: flex; align-items: center; gap: 10px; padding: 6px 30px; transition: 0.2s; border-radius: 6px; }
.clause-item:hover { background: #f8fafc; }
.clause-item.active { background: v-bind('CONFIG.lightBg'); color: v-bind('CONFIG.primaryColor'); font-weight: bold; }
.q-checkbox { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;}
.clause-label { flex: 1; cursor: pointer; font-size: 14px; }
.main-content { flex: 1; overflow-y: auto; padding: 30px; position: relative; scroll-behavior: smooth;}
.empty-state { height: 100%; display: flex; justify-content: center; align-items: center; text-align: center; color: #94a3b8;}
.btn-open-menu-large { display: none; background: v-bind('CONFIG.primaryColor'); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;}
.clause-header { margin-bottom: 25px; }
.breadcrumb { font-size: 12px; color: #94a3b8; font-weight: bold; margin-bottom: 8px;}
.clause-header h1 { margin: 0; font-size: 28px; color: #1e293b; }
.content-box { background: white; padding: 35px; border-radius: 16px; border: 1px solid #e2e8f0; line-height: 1.8; font-size: 18px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.content-text { white-space: pre-wrap; color: #334155;}
:deep(.ref-btn) { background: v-bind('CONFIG.activeBg'); color: v-bind('CONFIG.primaryColor'); border: none; padding: 2px 8px; border-radius: 4px; font-size: 15px; font-weight: 800; cursor: pointer; margin: 0 4px; transition: 0.2s; vertical-align: baseline;}
:deep(.ref-btn:hover) { background: v-bind('CONFIG.primaryColor'); color: white; transform: translateY(-1px); }
.notes-section { background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.save-success-tag { font-size: 13px; color: #10b981; font-weight: bold; animation: fadeIn 0.2s; }
.btn-save-manual { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.btn-save-manual:hover { background: #059669; transform: translateY(-1px); }
.note-edit { width: 100%; height: 250px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fffbeb; font-family: inherit; font-size: 15px; line-height: 1.6; resize: vertical; outline: none; margin-bottom: 25px; white-space: pre-wrap; }
.url-section-title { font-size: 16px; color: #475569; margin: 0 0 15px 0; border-top: 1px solid #f1f5f9; padding-top: 20px;}
.url-card { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;}
.url-add-form { display: grid; grid-template-columns: 1fr 2fr auto; gap: 10px; margin-top: 15px; background: #f1f5f9; padding: 15px; border-radius: 12px;}
.url-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;}
.btn-add-url { background: #1e293b; color: white; border: none; padding: 10px 15px; border-radius: 8px; font-weight: bold; cursor: pointer;}
.full-clause-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; margin-bottom: 20px; overflow: hidden;}
.card-side { width: 120px; background: #f8fafc; padding: 20px 15px; display: flex; flex-direction: column; align-items: center; border-right: 1px solid #e2e8f0; }
.btn-jump-edit { font-size: 12px; padding: 6px 10px; border-radius: 6px; border: 1px solid v-bind('CONFIG.primaryColor'); background: v-bind('CONFIG.lightBg'); color: v-bind('CONFIG.primaryColor'); font-weight: bold; cursor: pointer;}
.card-main { flex: 1; padding: 25px; }
.card-note-preview { margin-top: 15px; padding: 12px 15px; background: #fffbeb; border-radius: 8px; font-size: 14px; border-left: 4px solid #fbbf24; white-space: pre-wrap; line-height: 1.6;}
.floating-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); z-index: 300; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);}
.floating-modal { width: 450px; background: white; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.float-header { padding: 18px 25px; background: #1e293b; color: white; display: flex; justify-content: space-between; align-items: center;}
.float-body { padding: 25px; max-height: 500px; overflow-y: auto; }
.float-content-text { line-height: 1.8; font-size: 16px; color: #334155; margin-bottom: 20px; white-space: pre-wrap;}
.float-note-preview { background: #fef9c3; padding: 15px; border-radius: 12px; font-size: 14px; color: #854d0e; margin-bottom: 20px; border-left: 4px solid #fbbf24; white-space: pre-wrap; }
.btn-jump-main { width: 100%; padding: 14px; background: v-bind('CONFIG.primaryColor'); border: none; border-radius: 10px; font-weight: 800; color: white; cursor: pointer; }

@media (max-width: 768px) {
  .mobile-nav { display: flex; }
  .btn-open-menu-large { display: inline-block; }
  .sidebar { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; transform: translateX(-100%); }
  .sidebar.mobile-open { transform: translateX(0); }
  .btn-close-sidebar { display: block; }
  .main-content { padding: 20px 15px; height: calc(100vh - 60px); }
  .full-clause-card { flex-direction: column; }
  .card-side { width: 100%; flex-direction: row; justify-content: space-between; border-right: none; border-bottom: 1px solid #e2e8f0; padding: 15px 20px;}
  .floating-modal-overlay { align-items: flex-end; }
  .floating-modal { width: 100%; border-radius: 24px 24px 0 0; animation: slideUp 0.3s; }
  .url-add-form { grid-template-columns: 1fr; }
}
@keyframes popUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
