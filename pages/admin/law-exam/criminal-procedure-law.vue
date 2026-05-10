<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

// 🌟🌟🌟 依據不同的法規專頁，替換此 CONFIG 區塊 🌟🌟🌟
// (此處以《民法》為例，您可自行更改 tableName 與顏色)
const CONFIG = {
  tableName: 'criminal_procedure_law_clauses',
  pageTitle: '刑事訴訟法',
  parentLawName: '刑事訴訟法', // 刑訴本身即為母法
  primaryColor: '#059669', // 翡翠綠
  hoverColor: '#047857',
  lightBg: '#ecfdf5',
  activeBg: '#d1fae5'
};
// 🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟

// 涵蓋系統內所有的母法與子法
const LAW_TABLE_MAP = {
  '民法': 'civil_law_clauses',
  '刑法': 'criminal_law_clauses',
  '中華民國刑法': 'criminal_law_clauses',
  '民事訴訟法': 'civil_procedure_law_clauses',
  '刑事訴訟法': 'criminal_procedure_law_clauses',
  '憲法': 'constitutional_law_clauses',
  '中華民國憲法': 'constitutional_law_clauses',
  '教師法': 'teachers_act_clauses',
  '教育基本法': 'educational_fundamental_act_clauses',
  '教師法施行細則': 'teachers_act_enforcement_rules_clauses',
  '校園霸凌防制準則': 'campus_bullying_prevention_guidelines_clauses',
  '解聘不續聘停聘或資遣辦法': 'teachers_dismissal_regulations_clauses'
};

const supabase = useSupabaseClient();
const clauses = ref([]);
const parentClausesMap = ref({});

const customLawMap = ref({});
const newMapWrong = ref('');
const newMapCorrect = ref(CONFIG.pageTitle); 

const isLoading = ref(true);
const isUploading = ref(false);

// 🌟 觀看模式：'single'(逐條), 'chapter'(分章節), 'all'(全覽)
const viewMode = ref('single'); 
const selectedChapter = ref(null); // 當前選擇的章/編
const selectedSection = ref(null); // 當前選擇的節

const searchQuery = ref('');
const selectedClause = ref(null);
const selectedIds = ref([]);
const floatingReference = ref(null);
const isSaving = ref(false);
const showSavedToast = ref(false);
const showSidebar = ref(false);

const cssVars = computed(() => ({
  '--primary': CONFIG.primaryColor,
  '--hover': CONFIG.hoverColor,
  '--bg-light': CONFIG.lightBg,
  '--bg-active': CONFIG.activeBg
}));

const uniqueLawNames = computed(() => {
  const names = new Set(Object.keys(LAW_TABLE_MAP));
  names.delete(CONFIG.pageTitle); 
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

// 🌟 篩選當前章節的條文
const chapterClauses = computed(() => {
  return filteredFlatClauses.value.filter(c => {
    const matchChap = (c.chapter_name || '未分類編') === selectedChapter.value;
    if (selectedSection.value) {
      return matchChap && (c.section_name || '未分類章') === selectedSection.value;
    }
    return matchChap;
  });
});

// 🌟 切換至「分章節觀看」模式
const viewChapter = (chapter) => {
  selectedChapter.value = chapter;
  selectedSection.value = null; // null 表示顯示該編/章底下的所有節
  viewMode.value = 'chapter';
  showSidebar.value = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const viewSection = (chapter, section) => {
  selectedChapter.value = chapter;
  selectedSection.value = section;
  viewMode.value = 'chapter';
  showSidebar.value = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 🌟 返回鍵邏輯
const goBackToChapter = () => {
  if (selectedClause.value) {
    selectedChapter.value = selectedClause.value.chapter_name || '未分類編';
    selectedSection.value = selectedClause.value.section_name || '未分類章';
  }
  viewMode.value = 'chapter';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const selectClause = (clause) => { selectedClause.value = clause; viewMode.value = 'single'; showSavedToast.value = false; showSidebar.value = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
const saveManual = async (clause) => { if (!clause) return; isSaving.value = true; await supabase.from(CONFIG.tableName).update({ notes: clause.notes, urls: clause.urls }).eq('id', clause.id); isSaving.value = false; showSavedToast.value = true; setTimeout(() => { showSavedToast.value = false; }, 2500); };
const addNewUrl = async (clause) => { if (!newUrlLabel.value || !newUrlLink.value) return; if (!clause.urls) clause.urls = []; let link = newUrlLink.value; if (!link.startsWith('http')) link = 'https://' + link; clause.urls.push({ label: newUrlLabel.value, url: link }); newUrlLabel.value = ''; newUrlLink.value = ''; await saveManual(clause); };
const removeUrl = async (clause, index) => { clause.urls.splice(index, 1); await saveManual(clause); };

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

const getNormalizedArticleNum = (rawText) => { 
  let text = rawText.replace(/\s/g, '');
  const match = text.match(/第(.+)條(?:之(.+))?/); 
  if (!match) return null; 
  return parseNum(match[1]) + (match[2] ? '-' + parseNum(match[2]) : ''); 
};

const parseContentWithLinks = (text) => { 
  if (!text) return ''; 
  const articleRegex = /(第\s*[0-9一二三四五六七八九十百千-]+\s*條(?:之\s*[0-9一二三四五六七八九十百千-]+)?)/g; 
  let currentContextKeyword = '本辦法'; 
  const parts = text.split(articleRegex);
  return parts.map(part => {
    if (/^第\s*[0-9一二三四五六七八九十百千-]+\s*條/.test(part)) {
      return `<button class="ref-btn" data-law="${currentContextKeyword}" data-raw="${part}">${part}</button>`;
    } else {
      if (part.includes('。') || part.includes('\n')) currentContextKeyword = '本辦法'; 
      const lawMatches = [...part.matchAll(/([一-龥]{2,12}(?:法|條例|辦法|細則|準則)|本法|本辦法|本細則|本準則|同法|該法|前法)/g)];
      if (lawMatches.length > 0) {
        let lastLaw = lawMatches[lawMatches.length - 1][1]; 
        if (!['方法', '無法', '依法', '合法', '修法', '用法'].includes(lastLaw)) currentContextKeyword = lastLaw; 
      }
      return part; 
    }
  }).join(''); 
};

const handleContentClick = (e) => { 
  if (e.target.classList.contains('ref-btn')) { 
    const rawText = e.target.getAttribute('data-raw');
    const cleanRawText = rawText.replace(/\s/g, ''); 
    let targetLawName = e.target.getAttribute('data-law');

    if (['本法', '該法', '同法', '前法'].includes(targetLawName)) targetLawName = CONFIG.parentLawName;
    if (['本辦法', '本細則', '本準則'].includes(targetLawName)) targetLawName = CONFIG.pageTitle;

    if (customLawMap.value[cleanRawText]) targetLawName = customLawMap.value[cleanRawText];
    else if (customLawMap.value[targetLawName]) targetLawName = customLawMap.value[targetLawName];
    
    const convertedNum = getNormalizedArticleNum(rawText); 
    let target = null;
    let displayTitle = '';

    if (targetLawName === CONFIG.pageTitle) {
      target = clauses.value.find(c => String(c.article_num) === String(convertedNum));
      displayTitle = target?.title;
    } else {
      const targetTable = LAW_TABLE_MAP[targetLawName];
      if (targetTable && parentClausesMap.value[targetLawName]) {
        target = parentClausesMap.value[targetLawName].find(c => String(c.article_num) === String(convertedNum));
        displayTitle = target ? `【${targetLawName}】${target.title}` : '';
      } else {
        alert(`📚 系統找不到「${targetLawName}」的資料庫。\n請在左側校正字典中對應正確的法律！`);
        return;
      }
    }

    if (target) floatingReference.value = { ...target, displayTitle, canJump: (targetLawName === CONFIG.pageTitle) };
    else alert(`無法定位：${targetLawName} 第 ${convertedNum} 條`);
  } 
};

const handleImport = (e) => { const file = e.target.files[0]; if (!file) return; isUploading.value = true; Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => { await supabase.from(CONFIG.tableName).insert(results.data); fetchData(); isUploading.value = false; e.target.value = ''; } }); };
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
        <div class="header-top">
          <NuxtLink to="/admin/law-exam" class="back-link">← 回專區</NuxtLink>
          <button class="btn-close-sidebar" @click="showSidebar = false">✕</button>
          
          <div class="mode-toggle desktop-only">
            <button @click="viewMode = 'single'" :class="{ active: viewMode === 'single' }">逐條</button>
            <button @click="viewMode = 'chapter'" :class="{ active: viewMode === 'chapter' }">分節</button>
            <button @click="viewMode = 'all'" :class="{ active: viewMode === 'all' }">全覽</button>
          </div>
        </div>
        
        <details class="admin-tools">
          <summary>⚙️ 管理工具與校正</summary>
          <div class="tools-panel">
            <div class="top-actions">
              <label class="btn-tool primary">📥 匯入<input type="file" @change="handleImport" hidden /></label>
              <button @click="exportCSV" class="btn-tool">📤 匯出</button>
            </div>
            
            <div class="mapping-tool">
              <h4>🔗 本法專屬校正字典</h4>
              <p class="mapping-desc">此處新增的對應規則僅套用於當前法規。</p>
              <div class="map-list" v-if="Object.keys(customLawMap).length > 0">
                <div v-for="(correct, wrong) in customLawMap" :key="wrong" class="map-item">
                  <span class="map-wrong">{{ wrong }}</span> ➔ <span class="map-correct">{{ correct }}</span>
                  <button @click="removeCustomMap(wrong)" class="btn-remove-map">✕</button>
                </div>
              </div>
              <div class="map-add-form">
                <input v-model="newMapWrong" placeholder="錯誤字(如:第十六條)" class="map-input" />
                <select v-model="newMapCorrect" class="map-select">
                  <option :value="CONFIG.pageTitle">【自身】{{ CONFIG.pageTitle }}</option>
                  <option v-for="law in uniqueLawNames" :key="law" :value="law">{{ law }}</option>
                </select>
                <button @click="addCustomMap" class="btn-add-map">新增</button>
              </div>
            </div>
            <div class="danger-zone" style="margin-top: 15px;"><button @click="batchDelete" class="btn-tool danger" :disabled="!selectedIds.length">🗑️ 刪除</button><button @click="clearAll" class="btn-tool danger-filled">🔥 清空</button></div>
          </div>
        </details>
        <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋條號..." />
      </div>

      <div class="tree-list">
        <div v-if="isLoading" class="list-msg">載入中...</div>
        <div v-else v-for="(sections, chapter) in groupedClauses" :key="chapter" class="chapter-group">
          <details open>
            <summary class="chapter-title">
              <span>{{ chapter }}</span>
              <button @click.prevent="viewChapter(chapter)" class="btn-view-group">📖 讀此編</button>
            </summary>
            
            <div v-for="(items, section) in sections" :key="section" class="section-group">
              <details open>
                <summary class="section-title">
                  <span>{{ section }}</span>
                  <button @click.prevent="viewSection(chapter, section)" class="btn-view-group">📖 讀此節</button>
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
          <div class="empty-box"><h2>{{ CONFIG.pageTitle }}</h2><p>請開啟目錄選擇法條</p><button class="btn-open-menu-large" @click="showSidebar = true">開啟目錄</button></div>
        </div>
        <div v-else class="clause-detail">
          <div class="clause-header">
            <button @click="goBackToChapter" class="btn-back-inner">← 返回所在章節</button>
            <div class="breadcrumb">{{selectedClause.chapter_name}} > {{selectedClause.section_name}}</div>
            <h1>{{ selectedClause.title }}</h1>
          </div>
          <div class="content-box"><div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div></div>
          <div class="notes-section">
            <div class="notes-header">
              <h3>📝 筆記與實務見解</h3>
              <div class="save-actions"><span v-if="showSavedToast" class="save-success-tag">✅ 已儲存</span><button @click="saveManual(selectedClause)" class="btn-save-manual" :disabled="isSaving">💾 儲存筆記</button></div>
            </div>
            <textarea v-model="selectedClause.notes" class="note-edit" placeholder="在此貼上實務見解..."></textarea>
            <div class="urls-manager">
              <h4 class="url-section-title">🔗 參考網址</h4>
              <div v-for="(linkObj, index) in selectedClause.urls" :key="index" class="url-card"><a :href="linkObj.url" target="_blank">{{ linkObj.label }}</a><button @click="removeUrl(selectedClause, index)" class="btn-remove-url">✕</button></div>
              <div class="url-add-form"><input v-model="newUrlLabel" placeholder="名稱" class="url-input" /><input v-model="newUrlLink" placeholder="網址" class="url-input" /><button @click="addNewUrl(selectedClause)" class="btn-add-url">＋ 新增</button></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="viewMode === 'chapter'">
        <div v-if="!selectedChapter" class="empty-state">
          <div class="empty-box"><h2>📖 分章節觀看</h2><p>請從左側目錄點選「讀此節」或「讀此編」</p></div>
        </div>
        <div v-else class="full-text-view">
          <div class="view-header"><h1>{{ selectedChapter }} <span v-if="selectedSection">> {{ selectedSection }}</span> ({{ chapterClauses.length }} 條)</h1></div>
          <div class="clauses-container">
            <div v-for="c in chapterClauses" :key="c.id" class="full-clause-card">
              <div class="card-side"><span class="card-num" :style="{color: CONFIG.primaryColor}">{{ c.title }}</span><button @click="selectClause(c)" class="btn-jump-edit">📝 進入本條</button></div>
              <div class="card-main"><div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div><div v-if="c.notes" class="card-note-preview">{{ c.notes }}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="full-text-view">
        <div class="view-header"><h1>全部條文預覽 ({{ filteredFlatClauses.length }} 條)</h1></div>
        <div class="clauses-container">
          <div v-for="c in filteredFlatClauses" :key="c.id" class="full-clause-card">
            <div class="card-side"><span class="card-num" :style="{color: CONFIG.primaryColor}">{{ c.title }}</span><button @click="selectClause(c)" class="btn-jump-edit">📝 進入本條</button></div>
            <div class="card-main"><div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div><div v-if="c.notes" class="card-note-preview">{{ c.notes }}</div></div>
          </div>
        </div>
      </div>
      
    </div>

    <div v-if="floatingReference" class="floating-modal-overlay" @click.self="floatingReference = null">
      <div class="floating-modal">
        <div class="float-header" :style="{ background: CONFIG.primaryColor }"><h4>{{ floatingReference.displayTitle }}</h4><button @click="floatingReference = null">✕</button></div>
        <div class="float-body">
          <p class="float-content-text">{{ floatingReference.content }}</p>
          <div v-if="floatingReference.notes" class="float-note-preview">{{ floatingReference.notes }}</div>
          <button v-if="floatingReference.canJump" @click="selectClause(floatingReference); floatingReference = null" class="btn-jump-main" :style="{ background: CONFIG.primaryColor }">詳細內容與編輯 ➔</button>
          <button v-else @click="floatingReference = null" class="btn-jump-main" style="background: #94a3b8">關閉視窗</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.law-layout { display: flex; height: 100vh; background: #f8fafc; font-family: sans-serif; overflow: hidden; position: relative;}
.mobile-nav { display: none; justify-content: space-between; align-items: center; background: white; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; z-index: 50;}
.btn-menu { background: var(--primary); color: white; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; }
.sidebar { width: 360px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; z-index: 200; transition: transform 0.3s ease;}
.sidebar-header { padding: 15px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.back-link { font-size: 13px; font-weight: bold; color: var(--primary); text-decoration: none; }
.btn-close-sidebar { display: none; background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;}
.mode-toggle { display: flex; background: #e2e8f0; padding: 4px; border-radius: 8px; }
.mode-toggle button { border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; transition: 0.2s; background: transparent; color: #64748b;}
.mode-toggle button.active { background: white; color: var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.admin-tools { margin-bottom: 15px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;}
.admin-tools summary { padding: 10px; font-size: 13px; font-weight: bold; color: #475569; cursor: pointer; background: #f1f5f9; list-style: none; text-align: center;}
.tools-panel { padding: 10px; border-top: 1px solid #e2e8f0;}
.top-actions, .danger-zone { display: flex; gap: 8px; margin-bottom: 8px; }
.danger-zone { margin-bottom: 0; }
.btn-tool { flex: 1; padding: 8px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: bold; text-align: center; cursor: pointer; transition: 0.2s;}
.btn-tool:hover { background: #f1f5f9; }
.btn-tool.primary { background: var(--primary); color: white; border: none; }
.btn-tool.danger { color: #dc2626; border-color: #fecaca; }
.btn-tool.danger:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-tool.danger-filled { background: #dc2626; color: white; border: none; }

.mapping-tool { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 8px; margin-top: 10px; text-align: left; }
.mapping-tool h4 { margin: 0 0 5px 0; font-size: 13px; color: #334155; }
.mapping-desc { font-size: 11px; color: #64748b; margin-bottom: 10px; line-height: 1.4; }
.map-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; max-height: 160px; overflow-y: auto; padding-right: 4px; }
.map-list::-webkit-scrollbar { width: 5px; }
.map-list::-webkit-scrollbar-track { background: transparent; }
.map-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

.map-item { font-size: 12px; background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.map-wrong { color: #ef4444; font-weight: bold; }
.map-correct { color: #10b981; font-weight: bold; }
.btn-remove-map { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 12px; }
.map-add-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 5px; align-items: stretch; }
.map-input, .map-select { font-size: 11px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; outline: none; width: 100%; box-sizing: border-box;}
.btn-add-map { font-size: 12px; background: #334155; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 0 12px; font-weight: bold; transition: 0.2s; white-space: nowrap;}
.btn-add-map:hover { background: #1e293b; }

.search-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.tree-list { flex: 1; overflow-y: auto; padding: 10px; background: #fff; }
.list-msg { padding: 20px; text-align: center; color: #94a3b8; font-size: 14px;}

/* 🌟 章節與快捷按鈕樣式 */
.chapter-title, .section-title { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: bold; padding: 8px 10px; cursor: pointer;}
.chapter-title { background: #f1f5f9; border-radius: 8px; margin-top: 10px; color: #1e293b;}
.section-title { color: #64748b; font-size: 13px; }
.btn-view-group { font-size: 11px; background: white; color: var(--primary); border: 1px solid var(--primary); padding: 2px 8px; border-radius: 4px; cursor: pointer; transition: 0.2s;}
.btn-view-group:hover { background: var(--primary); color: white;}

.clause-item { display: flex; align-items: center; gap: 10px; padding: 6px 30px; transition: 0.2s; border-radius: 6px; }
.clause-item:hover { background: #f8fafc; }
.clause-item.active { background: var(--bg-light); color: var(--primary); font-weight: bold; }
.q-checkbox { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;}
.clause-label { flex: 1; cursor: pointer; font-size: 14px; }

.main-content { flex: 1; overflow-y: auto; padding: 30px; position: relative; scroll-behavior: smooth;}
.empty-state { height: 100%; display: flex; justify-content: center; align-items: center; text-align: center; color: #94a3b8;}
.empty-box h2 { font-size: 40px; margin: 0 0 10px 0;}
.empty-box p { font-size: 16px; font-weight: bold; margin-bottom: 20px;}
.btn-open-menu-large { display: none; background: var(--primary); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;}

/* 🌟 返回鍵樣式 */
.btn-back-inner { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; color: #475569; cursor: pointer; margin-bottom: 15px; transition: 0.2s;}
.btn-back-inner:hover { background: #e2e8f0; color: #1e293b;}

.clause-header { margin-bottom: 25px; }
.breadcrumb { font-size: 12px; color: #94a3b8; font-weight: bold; margin-bottom: 8px;}
.clause-header h1 { margin: 0; font-size: 28px; color: #1e293b; border-left: 5px solid var(--primary); padding-left: 15px;}
.content-box { background: white; padding: 35px; border-radius: 16px; border: 1px solid #e2e8f0; line-height: 1.8; font-size: 18px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.content-text { white-space: pre-wrap; color: #334155;}
:deep(.ref-btn) { background: var(--bg-active); color: var(--primary); border: none; padding: 2px 8px; border-radius: 4px; font-size: 15px; font-weight: 800; cursor: pointer; margin: 0 4px; transition: 0.2s; vertical-align: baseline;}
:deep(.ref-btn:hover) { background: var(--primary); color: white; transform: translateY(-1px); }

.notes-section { background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.save-success-tag { font-size: 13px; color: #10b981; font-weight: bold; animation: fadeIn 0.2s; }
.btn-save-manual { background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.btn-save-manual:hover { background: #059669; transform: translateY(-1px); }
.note-edit { width: 100%; height: 250px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fffbeb; font-family: inherit; font-size: 15px; line-height: 1.6; resize: vertical; outline: none; margin-bottom: 25px; white-space: pre-wrap; }

.url-section-title { font-size: 16px; color: #475569; margin: 0 0 15px 0; border-top: 1px solid #f1f5f9; padding-top: 20px;}
.url-card { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;}
.url-link-text { font-size: 14px; font-weight: bold; color: var(--primary); text-decoration: none; }
.url-link-text:hover { text-decoration: underline; }
.btn-remove-url { background: #fee2e2; color: #dc2626; border: none; width: 26px; height: 26px; border-radius: 50%; font-weight: bold; cursor: pointer; }
.no-urls { font-size: 13px; color: #94a3b8; font-style: italic; }
.url-add-form { display: grid; grid-template-columns: 1fr 2fr auto; gap: 10px; margin-top: 15px; background: #f1f5f9; padding: 15px; border-radius: 12px;}
.url-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;}
.btn-add-url { background: #1e293b; color: white; border: none; padding: 10px 15px; border-radius: 8px; font-weight: bold; cursor: pointer;}

.view-header { margin-bottom: 25px; }
.view-header h1 { font-size: 24px; color: #1e293b; margin: 0;}
.full-clause-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; margin-bottom: 20px; overflow: hidden;}
.card-side { width: 120px; background: #f8fafc; padding: 20px 15px; display: flex; flex-direction: column; align-items: center; gap: 15px; border-right: 1px solid #e2e8f0; flex-shrink: 0;}
.card-num { font-weight: 800; font-size: 15px; color: var(--primary); text-align: center; }
.btn-jump-edit { font-size: 12px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--primary); background: var(--bg-light); color: var(--primary); font-weight: bold; cursor: pointer;}
.btn-jump-edit:hover { background: var(--primary); color: white;}
.card-main { flex: 1; padding: 25px; }
.card-content { font-size: 17px; line-height: 1.8; color: #334155; white-space: pre-wrap;}
.card-note-preview { margin-top: 15px; padding: 12px 15px; background: #fffbeb; border-radius: 8px; font-size: 14px; color: #854d0e; border-left: 4px solid #fbbf24; white-space: pre-wrap; line-height: 1.6;}

.floating-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); z-index: 300; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);}
.floating-modal { width: 450px; background: white; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.float-header { padding: 18px 25px; background: var(--primary); color: white; display: flex; justify-content: space-between; align-items: center;}
.float-header h4 { margin: 0; font-size: 18px; letter-spacing: 1px;}
.float-header button { background: none; border: none; color: white; opacity: 0.7; cursor: pointer; font-size: 22px; transition: 0.2s;}
.float-header button:hover { opacity: 1; transform: rotate(90deg);}
.float-body { padding: 25px; max-height: 500px; overflow-y: auto; }
.float-content-text { line-height: 1.8; font-size: 16px; color: #334155; margin-bottom: 20px; white-space: pre-wrap;}
.float-note-preview { background: #fef9c3; padding: 15px; border-radius: 12px; font-size: 14px; color: #854d0e; margin-bottom: 20px; border-left: 4px solid #fbbf24; white-space: pre-wrap; }
.btn-jump-main { width: 100%; padding: 14px; background: var(--primary); border: none; border-radius: 10px; font-weight: 800; font-size: 15px; color: white; cursor: pointer; transition: 0.2s;}
.btn-jump-main:hover { background: var(--hover); box-shadow: 0 4px 12px rgba(0,0,0,0.15);}

@media (max-width: 768px) {
  .mobile-nav { display: flex; }
  .desktop-only { display: none; }
  .btn-open-menu-large { display: inline-block; }
  .law-layout { flex-direction: column; overflow: hidden; }
  .main-content { padding: 20px 15px; height: calc(100vh - 60px); overflow-y: auto;}
  .sidebar { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: 200; transform: translateX(-100%); border-right: none; box-shadow: 5px 0 25px rgba(0,0,0,0.1);}
  .sidebar.mobile-open { transform: translateX(0); }
  .btn-close-sidebar { display: block; }
  .full-clause-card { flex-direction: column; }
  .card-side { width: 100%; flex-direction: row; justify-content: space-between; border-right: none; border-bottom: 1px solid #e2e8f0; padding: 15px 20px;}
  .floating-modal-overlay { align-items: flex-end; }
  .floating-modal { width: 100%; border-radius: 24px 24px 0 0; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .map-add-form { grid-template-columns: 1fr; } 
}
@keyframes popUp { from { transform: scale(0.95) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
