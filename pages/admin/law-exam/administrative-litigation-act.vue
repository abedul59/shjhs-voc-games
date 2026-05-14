<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';
import { LAW_TABLE_MAP } from '~/utils/lawMap';
definePageMeta({ middleware: ['auth', 'law-auth'] });

const CONFIG = {
  tableName: 'administrative_litigation_act_clauses',
  pageTitle: '行政訴訟法',
  parentLawName: '行政訴訟法',
  primaryColor: '#6d28d9',
  hoverColor: '#5b21b6',
  lightBg: '#ede9fe',
  activeBg: '#ddd6fe'
};

const supabase = useSupabaseClient();
const clauses = ref([]);
const parentClausesMap = ref({});
const customLawMap = ref({}); 

const isLoading = ref(true);
const isUploading = ref(false);

const viewMode = ref('single'); 
const selectedChapter = ref(null); 
const selectedSection = ref(null); 

const searchQuery = ref('');
const selectedClause = ref(null);
const selectedIds = ref([]);
const floatingReference = ref(null);
const isSaving = ref(false);
const showSavedToast = ref(false);
const showSidebar = ref(false);

const newMapWrong = ref('');
const newMapCorrect = ref(CONFIG.pageTitle);

const cssVars = computed(() => ({
  '--primary': CONFIG.primaryColor,
  '--hover': CONFIG.hoverColor,
  '--bg-light': CONFIG.lightBg,
  '--bg-active': CONFIG.activeBg
}));

const uniqueLawNames = computed(() => {
  const names = new Set(Object.keys(LAW_TABLE_MAP));
  return Array.from(names).sort();
});

const fetchData = async () => {
  isLoading.value = true;
  const { data: mapData } = await supabase.from('law_local_alias_mapping').select('*').eq('context_law', CONFIG.tableName);
  if (mapData) {
    const tempMap = {};
    mapData.forEach(item => { tempMap[item.wrong_name] = item.correct_name; });
    customLawMap.value = tempMap;
  }

  const { data, error } = await supabase.from(CONFIG.tableName).select('*');
  if (data) {
    clauses.value = data.map(c => ({
      ...c, urls: Array.isArray(c.urls) ? c.urls : (typeof c.urls === 'string' ? JSON.parse(c.urls || '[]') : [])
    })).sort((a, b) => parseFloat(String(a.article_num || '0').replace('-', '.')) - parseFloat(String(b.article_num || '0').replace('-', '.')));

    const uniqueTables = [...new Set(Object.values(LAW_TABLE_MAP))];
    const fetchPromises = uniqueTables.map(tName => supabase.from(tName).select('*'));
    const results = await Promise.all(fetchPromises);
    const tableDataMap = {};
    uniqueTables.forEach((tName, idx) => { tableDataMap[tName] = results[idx].data; });
    Object.keys(LAW_TABLE_MAP).forEach(lawName => {
      const tName = LAW_TABLE_MAP[lawName];
      if (tableDataMap[tName]) parentClausesMap.value[lawName] = tableDataMap[tName];
    });
  }
  isLoading.value = false;
};
onMounted(fetchData);

const addCustomMap = async () => {
  if (!newMapWrong.value || !newMapCorrect.value) return;
  const wrong = newMapWrong.value.trim().replace(/\s/g, ''); 
  const correct = newMapCorrect.value;
  customLawMap.value[wrong] = correct;
  await supabase.from('law_local_alias_mapping').upsert({ context_law: CONFIG.tableName, wrong_name: wrong, correct_name: correct }, { onConflict: 'context_law, wrong_name' });
  newMapWrong.value = '';
};
const removeCustomMap = async (wrongName) => {
  delete customLawMap.value[wrongName];
  await supabase.from('law_local_alias_mapping').delete().eq('context_law', CONFIG.tableName).eq('wrong_name', wrongName);
};

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

const chapterClauses = computed(() => {
  return filteredFlatClauses.value.filter(c => {
    const matchChap = (c.chapter_name || '未分類編') === selectedChapter.value;
    if (selectedSection.value) return matchChap && (c.section_name || '未分類章') === selectedSection.value;
    return matchChap;
  });
});

const viewChapter = (chapter) => { selectedChapter.value = chapter; selectedSection.value = null; viewMode.value = 'chapter'; showSidebar.value = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const viewSection = (chapter, section) => { selectedChapter.value = chapter; selectedSection.value = section; viewMode.value = 'chapter'; showSidebar.value = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const goBackToChapter = () => { if (selectedClause.value) { selectedChapter.value = selectedClause.value.chapter_name || '未分類編'; selectedSection.value = selectedClause.value.section_name || '未分類章'; } viewMode.value = 'chapter'; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const selectClause = (clause) => { selectedClause.value = clause; viewMode.value = 'single'; showSidebar.value = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const saveManual = async (clause) => { if (!clause) return; isSaving.value = true; await supabase.from(CONFIG.tableName).update({ notes: clause.notes, urls: clause.urls }).eq('id', clause.id); isSaving.value = false; showSavedToast.value = true; setTimeout(() => { showSavedToast.value = false; }, 2500); };

const parseNum = (str) => { 
  if (!str) return ''; if (/^[0-9-]+$/.test(str)) return str; 
  const dict = { '〇':0, '零':0, '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '百':100, '千':1000 }; 
  let total = 0, current = 0; 
  for (let i = 0; i < str.length; i++) { 
    let val = dict[str[i]]; if (val === undefined) continue; 
    if (val >= 10) { if (current === 0) current = 1; total += current * val; current = 0; } else current = val; 
  } 
  return (total + current).toString(); 
};

const getNormalizedArticleNum = (rawText) => { 
  let text = rawText.replace(/\s/g, '');
  const match = text.match(/第(.+)條(?:之(.+))?/); 
  if (!match) return null; return parseNum(match[1]) + (match[2] ? '-' + parseNum(match[2]) : ''); 
};

const parseContentWithLinks = (text) => { 
  if (!text) return ''; 
  const articleRegex = /(第\s*[0-9一二三四五六七八九十百千-]+\s*條(?:之\s*[0-9一二三四五六七八九十百千-]+)?)/g; 
  let currentContextKeyword = 'self'; 
  const parts = text.split(articleRegex);
  return parts.map(part => {
    if (/^第\s*[0-9一二三四五六七八九十百千-]+\s*條/.test(part)) return `<button class="ref-btn" data-law="${currentContextKeyword}" data-raw="${part}">${part}</button>`;
    if (part.includes('。') || part.includes('\n')) currentContextKeyword = 'self'; 
    const lawMatches = [...part.matchAll(/([一-龥]{2,12}(?:法|條例|辦法|細則|準則)|本法|本辦法|本細則|本準則|同法|該法|前法)/g)];
    if (lawMatches.length > 0) {
      let lastLaw = lawMatches[lawMatches.length - 1][1]; 
      if (!['方法', '無法', '依法', '合法', '修法', '用法'].includes(lastLaw)) currentContextKeyword = lastLaw; 
    }
    return part; 
  }).join(''); 
};

const handleContentClick = (e) => { 
  if (e.target.classList.contains('ref-btn')) { 
    const rawText = e.target.getAttribute('data-raw');
    const cleanRawText = rawText.replace(/\s/g, ''); 
    let inheritedContext = e.target.getAttribute('data-law');
    let finalTargetLaw = '';

    if (['self', '本法', '該法', '同法', '前法'].includes(inheritedContext)) finalTargetLaw = (inheritedContext === 'self') ? CONFIG.pageTitle : CONFIG.parentLawName;
    else finalTargetLaw = inheritedContext;

    if (customLawMap.value[cleanRawText]) finalTargetLaw = customLawMap.value[cleanRawText];
    else if (customLawMap.value[inheritedContext]) finalTargetLaw = customLawMap.value[inheritedContext];
    
    const convertedNum = getNormalizedArticleNum(rawText); 
    let target = null; let displayTitle = '';

    if (finalTargetLaw === CONFIG.pageTitle) {
      target = clauses.value.find(c => String(c.article_num) === String(convertedNum));
      displayTitle = target?.title;
    } else {
      const db = parentClausesMap.value[finalTargetLaw];
      if (db) {
        target = db.find(c => String(c.article_num) === String(convertedNum));
        displayTitle = target ? `【${finalTargetLaw}】${target.title}` : '';
      } else {
        alert(`📚 找不到「${finalTargetLaw}」的資料。請在左側校正字典將「${cleanRawText}」對應到正確法律！`); return;
      }
    }

    if (target) floatingReference.value = { ...target, displayTitle, canJump: (finalTargetLaw === CONFIG.pageTitle) };
    else alert(`無法定位：${finalTargetLaw} 第 ${convertedNum} 條`);
  } 
};

const handleImport = (e) => { const file = e.target.files[0]; if (!file) return; isUploading.value = true; Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => { await supabase.from(CONFIG.tableName).insert(results.data); fetchData(); isUploading.value = false; } }); };
const exportCSV = () => { const csv = Papa.unparse(clauses.value); const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${CONFIG.pageTitle}_backup.csv`; link.click(); };
const batchDelete = async () => { if (!confirm(`確定刪除？`)) return; await supabase.from(CONFIG.tableName).delete().in('id', selectedIds.value); fetchData(); };
const clearAll = async () => { if (!confirm('確定清空？')) return; await supabase.from(CONFIG.tableName).delete().neq('article_num', 'CLEAN_ALL'); selectedClause.value = null; fetchData(); };
</script>

<template>
  <div class="law-layout" :style="cssVars">
    <div class="mobile-nav">
      <button class="btn-menu" @click="showSidebar = true">☰ 目錄</button>
      <div class="mode-toggle">
        <button @click="viewMode = 'single'" :class="{ active: viewMode === 'single' }">逐條</button>
        <button @click="viewMode = 'chapter'" :class="{ active: viewMode === 'chapter' }">章節</button>
        <button @click="viewMode = 'all'" :class="{ active: viewMode === 'all' }">全覽</button>
      </div>
    </div>
    
    <div class="sidebar" :class="{ 'mobile-open': showSidebar }">
      <div class="sidebar-header">
        <button class="btn-close-sidebar" @click="showSidebar = false" v-show="showSidebar">✖ 關閉目錄</button>
        <div class="header-top">
          <NuxtLink to="/admin/law-exam" class="back-link">← 回專區</NuxtLink>
          <div class="mode-toggle desktop-only">
            <button @click="viewMode = 'single'" :class="{ active: viewMode === 'single' }">逐條</button>
            <button @click="viewMode = 'chapter'" :class="{ active: viewMode === 'chapter' }">章節</button>
            <button @click="viewMode = 'all'" :class="{ active: viewMode === 'all' }">全覽</button>
          </div>
        </div>
        
        <details class="admin-tools">
          <summary>⚙️ 管理與校正字典</summary>
          <div class="tools-panel">
            <div class="top-actions">
              <label class="btn-tool primary">📥 匯入<input type="file" @change="handleImport" hidden /></label>
              <button @click="exportCSV" class="btn-tool">📤 匯出</button>
            </div>
            <div class="mapping-tool">
              <h4>🔗 條文指涉校正</h4>
              <div class="map-list" v-if="Object.keys(customLawMap).length > 0">
                <div v-for="(correct, wrong) in customLawMap" :key="wrong" class="map-item">
                  <span>{{ wrong }} ➔ {{ correct }}</span><button @click="removeCustomMap(wrong)">✕</button>
                </div>
              </div>
              <div class="map-add-form">
                <input v-model="newMapWrong" placeholder="如:第十六條" />
                <select v-model="newMapCorrect">
                  <option :value="CONFIG.pageTitle">【自身】</option>
                  <option v-for="law in uniqueLawNames" :key="law" :value="law">{{ law }}</option>
                </select>
                <button @click="addCustomMap" class="btn-add-map">新增</button>
              </div>
            </div>
            <div class="danger-zone" style="margin-top:10px;"><button @click="batchDelete" class="btn-tool danger">🗑️ 刪除</button><button @click="clearAll" class="btn-tool danger-filled">🔥 清空</button></div>
          </div>
        </details>
        <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋條號或關鍵字..." />
      </div>

      <div class="tree-list">
        <div v-if="isLoading" class="list-msg">載入中...</div>
        <div v-else v-for="(sections, chapter) in groupedClauses" :key="chapter" class="chapter-group">
          <details open>
            <summary class="chapter-title">
              <span>{{ chapter }}</span><button @click.prevent="viewChapter(chapter)" class="btn-view-group">📖 讀此編</button>
            </summary>
            <div v-for="(items, section) in sections" :key="section" class="section-group">
              <details open>
                <summary class="section-title">
                  <span>{{ section }}</span><button @click.prevent="viewSection(chapter, section)" class="btn-view-group">📖 讀此節</button>
                </summary>
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
            <div class="empty-box"><h2>{{ CONFIG.pageTitle }}</h2><p>請從左側目錄選擇條文</p><button class="btn-open-menu-large" @click="showSidebar = true">開啟目錄</button></div>
        </div>
        <div v-else class="clause-detail">
          <div class="clause-header">
            <button @click="goBackToChapter" class="btn-back-inner">← 返回所在章節</button>
            <div class="breadcrumb">{{selectedClause.chapter_name}} > {{selectedClause.section_name}}</div>
            <h1>{{ selectedClause.title }}</h1>
          </div>
          <div class="content-box"><div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div></div>
          <div class="notes-section">
            <div class="notes-header"><h3>📝 筆記與實務見解</h3><button @click="saveManual(selectedClause)" class="btn-save-manual" :disabled="isSaving">💾 儲存筆記</button></div>
            <textarea v-model="selectedClause.notes" class="note-edit" placeholder="在此輸入筆記..."></textarea>
          </div>
        </div>
      </div>

      <div v-else-if="viewMode === 'chapter'">
        <div v-if="!selectedChapter" class="empty-state"><div class="empty-box"><h2>📖 章節導讀</h2><p>請點選左側目錄的「讀此編/節」</p></div></div>
        <div v-else class="full-text-view">
          <div class="view-header"><h1>{{ selectedChapter }} <span v-if="selectedSection">> {{ selectedSection }}</span> ({{ chapterClauses.length }} 條)</h1></div>
          <div class="clauses-container">
            <div v-for="c in chapterClauses" :key="c.id" class="full-clause-card">
              <div class="card-side"><span class="card-num">{{ c.title }}</span><button @click="selectClause(c)" class="btn-jump-edit">📝 編輯</button></div>
              <div class="card-main"><div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div><div v-if="c.notes" class="card-note-preview">{{ c.notes }}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="full-text-view">
        <div class="view-header"><h1>全部條文預覽 ({{ filteredFlatClauses.length }} 條)</h1></div>
        <div class="clauses-container">
          <div v-for="c in filteredFlatClauses" :key="c.id" class="full-clause-card">
            <div class="card-side"><span class="card-num">{{ c.title }}</span><button @click="selectClause(c)" class="btn-jump-edit">📝 編輯</button></div>
            <div class="card-main"><div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div><div v-if="c.notes" class="card-note-preview">{{ c.notes }}</div></div>
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
          <button v-if="floatingReference.canJump" @click="selectClause(floatingReference); floatingReference = null" class="btn-jump-main">進入本條 ➔</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.law-layout { display: flex; height: 100vh; background: #f8fafc; font-family: sans-serif; overflow: hidden; position: relative;}
.mobile-nav { display: none; justify-content: space-between; align-items: center; background: white; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; z-index: 50;}
.btn-menu { background: var(--primary); color: white; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-close-sidebar { display: none; }

.sidebar { width: 360px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; z-index: 200; transition: 0.3s;}
.sidebar-header { padding: 15px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.back-link { font-size: 13px; font-weight: bold; color: var(--primary); text-decoration: none; }

.mode-toggle { display: flex; background: #e2e8f0; padding: 4px; border-radius: 8px; }
.mode-toggle button { flex: 1; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; background: transparent; color: #64748b; transition: 0.2s;}
.mode-toggle button.active { background: white; color: var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.admin-tools { margin-bottom: 15px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;}
.admin-tools summary { padding: 8px; font-size: 13px; font-weight: bold; color: #475569; cursor: pointer; background: #f1f5f9; text-align: center;}
.tools-panel { padding: 10px; border-top: 1px solid #e2e8f0;}
.btn-tool { flex: 1; padding: 6px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: center;}
.top-actions { display: flex; gap: 5px; }
.btn-tool.primary { background: var(--primary); color: white; border: none; }
.btn-tool.danger { color: #dc2626; border-color: #fecaca; }
.btn-tool.danger-filled { background: #dc2626; color: white; border: none; }

.mapping-tool { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 8px; border-radius: 8px; margin-top: 8px; }
.map-list { max-height: 120px; overflow-y: auto; margin-bottom: 8px; }
.map-item { font-size: 11px; background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; margin-bottom: 4px;}
.map-add-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 4px; }
.map-add-form input, .map-add-form select { font-size: 11px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; box-sizing: border-box;}
.btn-add-map { font-size: 11px; background: #334155; color: white; border: none; border-radius: 4px; padding: 0 8px; cursor: pointer; }

.danger-zone { display: flex; gap: 5px; }

.search-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.tree-list { flex: 1; overflow-y: auto; padding: 10px; }

.chapter-title, .section-title { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: bold; padding: 8px; cursor: pointer;}
.chapter-title { background: #f1f5f9; border-radius: 8px; margin-top: 10px;}
.btn-view-group { font-size: 10px; background: white; color: var(--primary); border: 1px solid var(--primary); padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.btn-view-group:hover { background: var(--primary); color: white;}

.clause-item { display: flex; align-items: center; gap: 8px; padding: 6px 20px; border-radius: 6px; transition: 0.2s;}
.clause-item.active { background: var(--bg-light); color: var(--primary); font-weight: bold; }
.clause-label { flex: 1; cursor: pointer; font-size: 13px; }

/* 🌟 主內容區塊 */
.main-content { flex: 1; overflow-y: auto; padding: 30px; position: relative; scroll-behavior: smooth;}
.btn-back-inner { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; color: #475569; cursor: pointer; margin-bottom: 15px;}

/* 🌟 修正重點 1：空白提示狀態 (Empty State)，修復照片中的巨大按鈕破版 */
.empty-state { display: flex; justify-content: center; align-items: center; min-height: 60vh; }
.empty-box { background: white; padding: 40px 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; width: 100%; max-width: 400px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
.empty-box h2 { color: var(--primary); margin: 0 0 10px 0; font-size: 24px; }
.empty-box p { color: #64748b; margin-bottom: 25px; font-size: 15px; }
.btn-open-menu-large { background: var(--primary); color: white; border: none; padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }

/* 🌟 修正重點 2：逐條檢視的排版補回 */
.clause-detail { width: 100%; }
.clause-header { margin-bottom: 20px; }
.breadcrumb { font-size: 13px; color: #64748b; margin-bottom: 8px; }
.clause-header h1 { margin: 0; color: var(--primary); font-size: 24px; line-height: 1.4; }

.content-box { background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; line-height: 1.8; font-size: 18px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.content-text { white-space: pre-wrap; color: #334155;}
:deep(.ref-btn) { background: var(--bg-active); color: var(--primary); border: none; padding: 2px 8px; border-radius: 4px; font-size: 16px; font-weight: 800; cursor: pointer; margin: 0 4px; vertical-align: baseline;}
:deep(table) { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-collapse: collapse; margin: 15px 0; }
:deep(th), :deep(td) { border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 100px;}

.notes-section { background: white; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; }
.notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.notes-header h3 { margin: 0; font-size: 18px; color: #1e293b;}
.btn-save-manual { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.note-edit { width: 100%; height: 200px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fffbeb; font-family: inherit; resize: vertical; box-sizing: border-box;}

/* 🌟 修正重點 3：章節/全覽檢視標題補回 */
.full-text-view { width: 100%; }
.view-header { margin-bottom: 20px; border-bottom: 2px solid var(--primary); padding-bottom: 10px; }
.view-header h1 { margin: 0; font-size: 22px; color: var(--primary); }
.clauses-container { display: flex; flex-direction: column; gap: 20px; }

.full-clause-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; margin-bottom: 20px; overflow: hidden;}
.card-side { width: 120px; background: #f8fafc; padding: 20px 10px; display: flex; flex-direction: column; align-items: center; border-right: 1px solid #e2e8f0; flex-shrink: 0;}
.card-num { font-weight: 800; color: var(--primary); margin-bottom: 10px; text-align: center;}
.btn-jump-edit { font-size: 11px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--primary); background: white; color: var(--primary); cursor: pointer;}
.card-main { flex: 1; padding: 20px; }
.card-content { white-space: pre-wrap; line-height: 1.8; font-size: 17px; color: #334155; }
.card-note-preview { margin-top: 15px; padding: 12px; background: #fffbeb; border-radius: 8px; font-size: 14px; border-left: 4px solid #fbbf24; white-space: pre-wrap; }

.floating-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 300; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);}
.floating-modal { width: 450px; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.float-header { padding: 15px 20px; background: var(--primary); color: white; display: flex; justify-content: space-between; align-items: center; }
.float-header h4 { margin: 0; font-size: 16px; }
.float-header button { background: transparent; border: none; color: white; font-size: 18px; cursor: pointer; }
.float-body { padding: 20px; max-height: 450px; overflow-y: auto; }
.float-content-text { line-height: 1.7; font-size: 16px; color: #334155; white-space: pre-wrap; margin-bottom: 15px;}
.float-note-preview { background: #fef9c3; padding: 12px; border-radius: 10px; font-size: 14px; border-left: 4px solid #fbbf24; margin-bottom: 15px; }
.btn-jump-main { width: 100%; padding: 12px; background: var(--primary); border: none; border-radius: 10px; font-weight: bold; color: white; cursor: pointer; }

/* =========================================
   🌟 手機版排版深度優化 (Mobile RWD Fixes)
   ========================================= */
@media (max-width: 768px) {
  .law-layout { height: 100dvh; flex-direction: column; } 
  .mobile-nav { display: flex; }
  .desktop-only { display: none; }
  
  .sidebar { position: fixed; top: 0; left: 0; width: 100%; height: 100dvh; transform: translateX(-100%); z-index: 999; padding-bottom: env(safe-area-inset-bottom); }
  .sidebar.mobile-open { transform: translateX(0); }
  .btn-close-sidebar { display: block; background: var(--primary); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; margin-bottom: 15px; width: 100%; font-size: 16px;}
  
  .main-content { padding: 15px; height: calc(100dvh - 60px); overflow-y: auto;}
  .content-box { padding: 15px; margin-bottom: 20px; font-size: 16px; }
  .clause-header h1 { font-size: 20px; }
  .content-text { word-break: break-word; overflow-wrap: break-word; }

  .full-clause-card { flex-direction: column; }
  .card-side { width: 100%; flex-direction: row; justify-content: space-between; border-right: none; border-bottom: 1px solid #e2e8f0; padding: 12px 15px;}
  .card-main { padding: 15px; }

  .floating-modal { width: 90vw; max-height: 80dvh; }
  .float-body { max-height: calc(80dvh - 60px); }
}
</style>
