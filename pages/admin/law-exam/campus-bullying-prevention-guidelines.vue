<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const CONFIG = {
  tableName: 'campus_bullying_prevention_guidelines_clauses',
  pageTitle: '校園霸凌防制準則',
  primaryColor: '#ea580c', // 活力橘
  hoverColor: '#c2410c',
  lightBg: '#fff7ed',
  activeBg: '#ffedd5'
};

const LAW_TABLE_MAP = {
  '民法': 'civil_law_clauses',
  '刑法': 'criminal_law_clauses',
  '中華民國刑法': 'criminal_law_clauses',
  '民事訴訟法': 'civil_procedure_law_clauses',
  '刑事訴訟法': 'criminal_procedure_law_clauses',
  '憲法': 'constitutional_law_clauses',
  '教師法': 'teachers_act_clauses',
  '教育基本法': 'educational_fundamental_act_clauses'
};

const supabase = useSupabaseClient();
const clauses = ref([]);
const parentClausesMap = ref({});
const definedParentLawName = ref(''); 

const isLoading = ref(true);
const isUploading = ref(false);
const viewMode = ref('single'); 
const searchQuery = ref('');
const selectedClause = ref(null);
const selectedIds = ref([]);
const floatingReference = ref(null);
const isSaving = ref(false);
const showSavedToast = ref(false);
const showSidebar = ref(false);

const fetchData = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from(CONFIG.tableName).select('*');
  
  if (data) {
    clauses.value = data.map(c => ({
      ...c, urls: Array.isArray(c.urls) ? c.urls : (typeof c.urls === 'string' ? JSON.parse(c.urls || '[]') : [])
    })).sort((a, b) => parseFloat(String(a.article_num || '0').replace('-', '.')) - parseFloat(String(b.article_num || '0').replace('-', '.')));

    const art1 = clauses.value.find(c => String(c.article_num) === '1');
    if (art1 && art1.content) {
      const defMatch = art1.content.match(/([\u4e00-\u9fa5]{2,12}(?:法|條例))（以下簡稱本法）/);
      if (defMatch) definedParentLawName.value = defMatch[1];
    }

    const fetchPromises = Object.keys(LAW_TABLE_MAP).map(name => supabase.from(LAW_TABLE_MAP[name]).select('*'));
    const results = await Promise.all(fetchPromises);
    Object.keys(LAW_TABLE_MAP).forEach((name, idx) => {
      if (results[idx].data) parentClausesMap.value[name] = results[idx].data;
    });
  }
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

const selectClause = (clause) => { selectedClause.value = clause; viewMode.value = 'single'; showSavedToast.value = false; showSidebar.value = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const saveManual = async (clause) => { if (!clause) return; isSaving.value = true; await supabase.from(CONFIG.tableName).update({ notes: clause.notes, urls: clause.urls }).eq('id', clause.id); isSaving.value = false; showSavedToast.value = true; setTimeout(() => { showSavedToast.value = false; }, 2500); };

const parseNum = (str) => { 
  if (!str) return ''; 
  if (/^[0-9-]+$/.test(str)) return str; 
  const dict = { '〇':0, '零':0, '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '百':100, '千':1000 }; 
  let total = 0, current = 0; 
  for (let i = 0; i < str.length; i++) { 
    let val = dict[str[i]]; 
    if (val === undefined) continue; 
    if (val >= 10) { if (current === 0) current = 1; total += current * val; current = 0; } else current = val; 
  } 
  return (total + current).toString(); 
};

// 🌟 修正：先提取條號數字，再清理法律名稱，避免誤抓「有」
const getNormalizedArticleNum = (rawText) => { 
  let text = rawText.replace(/\s/g, '');
  // 只保留從「第」開始到最後的內容，並移除「條」字，精準鎖定數字部分
  let match = text.match(/第(.+)條(?:之(.+))?/); 
  if (!match) return null; 
  let mainNum = parseNum(match[1]); 
  let subNum = match[2] ? '-' + parseNum(match[2]) : ''; 
  return mainNum + subNum; 
};

// 🌟 核心：智慧語境追蹤引擎 (加入雜訊清理)
const parseContentWithLinks = (text) => { 
  if (!text) return ''; 
  const regex = /((?:(?:本法|本辦法|本細則|[\u4e00-\u9fa5]{2,12}(?:法|條例|辦法|細則))\s*)?第\s*[0-9一二三四五六七八九十百千-]+\s*條(?:之\s*[0-9一二三四五六七八九十百千-]+)?)/g; 
  
  let currentLawContext = 'self'; 
  const parts = text.split(regex);
  return parts.map(part => {
    if (regex.test(part)) {
      let targetLaw = currentLawContext;
      let cleanPart = part.trim();

      if (cleanPart.includes('本法')) {
        targetLaw = definedParentLawName.value || '教師法'; 
        currentLawContext = targetLaw;
      } else if (cleanPart.includes('本辦法') || cleanPart.includes('本細則')) {
        targetLaw = 'self';
        currentLawContext = 'self';
      } else {
        // 🌟 雜訊清理邏輯：移除法律名稱前的動詞 (如: 有、及、依、為)
        const specificLawMatch = cleanPart.match(/^(?:有|及|依|為)?([\u4e00-\u9fa5]{2,12}(?:法|條例|辦法|細則))/);
        if (specificLawMatch && !specificLawMatch[1].includes('本')) {
          targetLaw = specificLawMatch[1];
          currentLawContext = targetLaw; 
        } else {
          targetLaw = currentLawContext;
        }
      }
      return `<button class="ref-btn" data-law="${targetLaw}" data-raw="${part}">${part}</button>`;
    } else {
      if (!part.match(/[、及]/) && (part.includes('。') || part.includes('\n'))) {
        currentLawContext = 'self';
      }
      return part;
    }
  }).join(''); 
};

const handleContentClick = (e) => { 
  if (e.target.classList.contains('ref-btn')) { 
    const rawText = e.target.getAttribute('data-raw');
    let targetLawName = e.target.getAttribute('data-law');
    
    // 再次確保 targetLawName 本身不包含雜訊
    targetLawName = targetLawName.replace(/^(?:有|及|依|為)/, '');
    
    const convertedNum = getNormalizedArticleNum(rawText); 
    let target = null;
    let displayTitle = '';

    if (targetLawName === 'self') {
      target = clauses.value.find(c => String(c.article_num) === String(convertedNum));
      displayTitle = target?.title;
    } else {
      const db = parentClausesMap.value[targetLawName];
      if (db) {
        target = db.find(c => String(c.article_num) === String(convertedNum));
        displayTitle = target ? `【${targetLawName}】${target.title}` : '';
      } else {
        alert(`📚 系統尚未匯入「${targetLawName}」的資料庫。`);
        return;
      }
    }

    if (target) {
      floatingReference.value = { ...target, displayTitle, canJump: targetLawName === 'self' };
    } else {
      alert(`無法定位：${targetLawName} 第 ${convertedNum} 條`);
    }
  } 
};

const handleImport = (e) => { const file = e.target.files[0]; if (!file) return; isUploading.value = true; Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => { await supabase.from(CONFIG.tableName).insert(results.data); fetchData(); isUploading.value = false; e.target.value = ''; } }); };
const exportCSV = () => { const csv = Papa.unparse(clauses.value); const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${CONFIG.pageTitle}_backup.csv`; link.click(); };
const batchDelete = async () => { if (!confirm(`確定刪除？`)) return; await supabase.from(CONFIG.tableName).delete().in('id', selectedIds.value); fetchData(); };
const clearAll = async () => { if (!confirm('確定清空？')) return; await supabase.from(CONFIG.tableName).delete().neq('article_num', 'CLEAN_ALL'); selectedClause.value = null; fetchData(); };
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
          <div class="mode-toggle desktop-only">
            <button @click="viewMode = 'single'" :class="{ active: viewMode === 'single' }">逐條觀看</button>
            <button @click="viewMode = 'all'" :class="{ active: viewMode === 'all' }">全部觀看</button>
          </div>
        </div>
        <details class="admin-tools">
          <summary>⚙️ 管理工具</summary>
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
          <details open><summary class="chapter-title">{{ chapter }}</summary>
            <div v-for="(items, section) in sections" :key="section" class="section-group">
              <details open><summary class="section-title">{{ section }}</summary>
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
          <div class="empty-box"><h2>🧑‍🏫</h2><p>請從目錄選擇法條以檢視內容</p><button class="btn-open-menu-large" @click="showSidebar = true">開啟目錄</button></div>
        </div>
        <div v-else class="clause-detail">
          <div class="clause-header">
            <div class="breadcrumb">{{selectedClause.chapter_name}} > {{selectedClause.section_name}}</div>
            <h1 :style="{ borderLeft: '5px solid ' + CONFIG.primaryColor, paddingLeft: '15px' }">{{ selectedClause.title }}</h1>
          </div>
          <div class="content-box"><div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div></div>
          <div class="notes-section">
            <div class="notes-header"><h3>📝 筆記與實務見解</h3><div class="save-actions"><span v-if="showSavedToast" class="save-success-tag">✅ 已儲存</span><button @click="saveManual(selectedClause)" class="btn-save-manual" :disabled="isSaving">💾 儲存筆記</button></div></div>
            <textarea v-model="selectedClause.notes" class="note-edit" placeholder="在此貼上實務見解... (保留排版)"></textarea>
          </div>
        </div>
      </div>

      <div v-else class="full-text-view">
        <div class="clauses-container">
          <div v-for="c in filteredFlatClauses" :key="c.id" class="full-clause-card">
            <div class="card-side"><span class="card-num" :style="{color: CONFIG.primaryColor}">{{ c.title }}</span><button @click="selectClause(c)" class="btn-jump-edit">📝 編輯</button></div>
            <div class="card-main"><div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div><div v-if="c.notes" class="card-note-preview">{{ c.notes }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="floatingReference" class="floating-modal-overlay" @click.self="floatingReference = null">
      <div class="floating-modal">
        <div class="float-header" :style="{ background: CONFIG.primaryColor }"><h4>{{ floatingReference.displayTitle }}</h4><button @click="floatingReference = null">✕</button></div>
        <div class="float-body"><p class="float-content-text">{{ floatingReference.content }}</p>
          <div v-if="floatingReference.notes" class="float-note-preview">{{ floatingReference.notes }}</div>
          <button v-if="floatingReference.canJump" @click="selectClause(floatingReference); floatingReference = null" class="btn-jump-main" :style="{ background: CONFIG.primaryColor }">詳細內容與編輯 ➔</button>
          <button v-else @click="floatingReference = null" class="btn-jump-main" style="background: #94a3b8">關閉視窗</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 樣式部分保持與終極通用版一致，僅補充 CONFIG.primaryColor 綁定 */
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
.clause-label { flex: 1; cursor: pointer; font-size: 14px; }
.main-content { flex: 1; overflow-y: auto; padding: 30px; position: relative; scroll-behavior: smooth;}
.empty-state { height: 100%; display: center; align-items: center; text-align: center; color: #94a3b8;}
.btn-open-menu-large { display: none; background: v-bind('CONFIG.primaryColor'); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;}
.content-box { background: white; padding: 35px; border-radius: 16px; border: 1px solid #e2e8f0; line-height: 1.8; font-size: 18px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.content-text { white-space: pre-wrap; color: #334155;}
:deep(.ref-btn) { background: v-bind('CONFIG.activeBg'); color: v-bind('CONFIG.primaryColor'); border: none; padding: 2px 8px; border-radius: 4px; font-size: 15px; font-weight: 800; cursor: pointer; margin: 0 4px; transition: 0.2s; vertical-align: baseline;}
:deep(.ref-btn:hover) { background: v-bind('CONFIG.primaryColor'); color: white; transform: translateY(-1px); }
.notes-section { background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.note-edit { width: 100%; height: 250px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fffbeb; font-family: inherit; font-size: 15px; line-height: 1.6; resize: vertical; outline: none; margin-bottom: 25px; white-space: pre-wrap; }
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
.btn-jump-main { width: 100%; padding: 14px; background: v-bind('CONFIG.primaryColor'); border: none; border-radius: 10px; font-weight: 800; font-size: 15px; color: white; cursor: pointer; transition: 0.2s;}

@media (max-width: 768px) {
  .mobile-nav { display: flex; }
  .desktop-only { display: none; }
  .btn-open-menu-large { display: inline-block; }
  .sidebar { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; transform: translateX(-100%); }
  .sidebar.mobile-open { transform: translateX(0); }
  .btn-close-sidebar { display: block; }
  .main-content { padding: 20px 15px; height: calc(100vh - 60px); }
  .full-clause-card { flex-direction: column; }
  .card-side { width: 100%; flex-direction: row; justify-content: space-between; border-right: none; border-bottom: 1px solid #e2e8f0; padding: 15px 20px;}
  .floating-modal-overlay { align-items: flex-end; }
  .floating-modal { width: 100%; border-radius: 24px 24px 0 0; animation: slideUp 0.3s; }
}
@keyframes popUp { from { transform: scale(0.95) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
