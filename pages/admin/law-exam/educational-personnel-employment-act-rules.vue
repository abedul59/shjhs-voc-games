<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';
import { LAW_TABLE_MAP } from '~/utils/lawMap';
definePageMeta({ middleware: ['auth', 'law-auth'] });

const CONFIG = {
  tableName: 'educational_personnel_employment_act_rules_clauses',
  pageTitle: '教育人員任用條例施行細則',
  parentLawName: '教育人員任用條例', // 🌟 母法連動
  primaryColor: '#0891b2', hoverColor: '#0e7490', lightBg: '#cffafe', activeBg: '#a5f3fc'
};

const supabase = useSupabaseClient();
const clauses = ref([]); const parentClausesMap = ref({}); const customLawMap = ref({}); 
const isLoading = ref(true); const isUploading = ref(false); const viewMode = ref('single'); 
const searchQuery = ref(''); const selectedClause = ref(null); const selectedIds = ref([]);
const floatingReference = ref(null); const isSaving = ref(false); const showSidebar = ref(false);
const newMapWrong = ref(''); const newMapCorrect = ref(CONFIG.pageTitle);

const cssVars = computed(() => ({ '--primary': CONFIG.primaryColor, '--hover': CONFIG.hoverColor, '--bg-light': CONFIG.lightBg, '--bg-active': CONFIG.activeBg }));
const uniqueLawNames = computed(() => Array.from(new Set(Object.keys(LAW_TABLE_MAP))).sort());

const fetchData = async () => {
  isLoading.value = true;
  const { data: mapData } = await supabase.from('law_local_alias_mapping').select('*').eq('context_law', CONFIG.tableName);
  if (mapData) { const tempMap = {}; mapData.forEach(item => { tempMap[item.wrong_name] = item.correct_name; }); customLawMap.value = tempMap; }
  const { data } = await supabase.from(CONFIG.tableName).select('*');
  if (data) {
    clauses.value = data.map(c => ({ ...c, urls: typeof c.urls === 'string' ? JSON.parse(c.urls||'[]') : (c.urls||[]) }))
      .sort((a, b) => parseFloat(String(a.article_num||'0').replace('-','.')) - parseFloat(String(b.article_num||'0').replace('-','.')));
    const uniqueTables = [...new Set(Object.values(LAW_TABLE_MAP))];
    const results = await Promise.all(uniqueTables.map(tName => supabase.from(tName).select('*')));
    const tableDataMap = {}; results.forEach((res, idx) => { tableDataMap[uniqueTables[idx]] = res.data; });
    Object.keys(LAW_TABLE_MAP).forEach(lawName => { if (tableDataMap[LAW_TABLE_MAP[lawName]]) parentClausesMap.value[lawName] = tableDataMap[LAW_TABLE_MAP[lawName]]; });
  }
  isLoading.value = false;
};
onMounted(fetchData);

const addCustomMap = async () => { if (!newMapWrong.value) return; const wrong = newMapWrong.value.trim().replace(/\s/g, ''); customLawMap.value[wrong] = newMapCorrect.value; await supabase.from('law_local_alias_mapping').upsert({ context_law: CONFIG.tableName, wrong_name: wrong, correct_name: newMapCorrect.value }, { onConflict: 'context_law, wrong_name' }); newMapWrong.value = ''; };
const removeCustomMap = async (wrongName) => { delete customLawMap.value[wrongName]; await supabase.from('law_local_alias_mapping').delete().eq('context_law', CONFIG.tableName).eq('wrong_name', wrongName); };

const filteredFlatClauses = computed(() => clauses.value.filter(c => (c.title||'').includes(searchQuery.value) || (c.content||'').includes(searchQuery.value)));
const selectClause = (c) => { selectedClause.value = c; viewMode.value = 'single'; showSidebar.value = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };

const parseNum = (str) => { if (!str) return ''; if (/^[0-9-]+$/.test(str)) return str; const dict = { '〇':0, '零':0, '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '百':100 }; let total = 0, current = 0; for (let i = 0; i < str.length; i++) { let val = dict[str[i]]; if (val === undefined) continue; if (val >= 10) { if (current === 0) current = 1; total += current * val; current = 0; } else current = val; } return (total + current).toString(); };
const getNormalizedArticleNum = (raw) => { const m = raw.replace(/\s/g, '').match(/第(.+)(?:條|點)(?:之(.+))?/); return m ? parseNum(m[1]) + (m[2] ? '-' + parseNum(m[2]) : '') : null; };

const parseContentWithLinks = (text) => {
  if (!text) return ''; let ctx = 'self'; const parts = text.split(/(第\s*[0-9一二三四五六七八九十百-]+\s*(?:條|點)(?:之\s*[0-9一二三四五六七八九十百-]+)?)/g);
  return parts.map(p => {
    if (/^第/.test(p)) return `<button class="ref-btn" data-law="${ctx}" data-raw="${p}">${p}</button>`;
    if (p.includes('。') || p.includes('\n')) ctx = 'self'; 
    const m = [...p.matchAll(/([一-龥]{2,12}(?:法|條例|辦法|細則|規則|準則|要點)|本法|本條例|本規則|本辦法|本細則|本準則|本要點|同法|該法|前法)/g)];
    if (m.length > 0) ctx = m[m.length - 1][1];
    return p; 
  }).join(''); 
};

const handleContentClick = (e) => { 
  if (e.target.classList.contains('ref-btn')) { 
    const raw = e.target.getAttribute('data-raw'); let inherited = e.target.getAttribute('data-law'); let final = '';
    // 🌟 在細則中，本條例/本法代表母法
    if (['self', '本細則', '本辦法'].includes(inherited)) final = CONFIG.pageTitle;
    else if (['該法', '同法', '前法', '本條例', '本法'].includes(inherited)) final = CONFIG.parentLawName;
    else final = inherited;

    if (customLawMap.value[raw.replace(/\s/g, '')]) final = customLawMap.value[raw.replace(/\s/g, '')];
    else if (customLawMap.value[inherited]) final = customLawMap.value[inherited];
    
    const num = getNormalizedArticleNum(raw); let target = null;
    if (final === CONFIG.pageTitle) target = clauses.value.find(c => String(c.article_num) === String(num));
    else { const db = parentClausesMap.value[final]; if (db) target = db.find(c => String(c.article_num) === String(num)); }
    if (target) floatingReference.value = { ...target, displayTitle: final === CONFIG.pageTitle ? target.title : `【${final}】${target.title}`, canJump: final === CONFIG.pageTitle };
    else alert(`無法定位：${final} 第 ${num} 條`);
  } 
};

const handleImport = (e) => { Papa.parse(e.target.files[0], { header: true, skipEmptyLines: true, complete: async (r) => { isUploading.value = true; const payload = r.data.map(row => { const clean = {...row}; if(!clean.id||clean.id==='') delete clean.id; return clean; }); await supabase.from(CONFIG.tableName).insert(payload); alert('匯入成功'); fetchData(); isUploading.value = false; } }); };
const exportCSV = () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\uFEFF" + Papa.unparse(clauses.value)], { type: 'text/csv;charset=utf-8;' })); link.download = `${CONFIG.pageTitle}.csv`; link.click(); };
const batchDelete = async () => { if (!confirm(`刪除勾選？`)) return; await supabase.from(CONFIG.tableName).delete().in('id', selectedIds.value); selectedIds.value = []; fetchData(); };
const clearAll = async () => { if (!confirm('清空？')) return; await supabase.from(CONFIG.tableName).delete().neq('article_num', 'CLEAN_ALL'); selectedClause.value = null; fetchData(); };
const saveManual = async (c) => { isSaving.value = true; await supabase.from(CONFIG.tableName).update({ notes: c.notes }).eq('id', c.id); isSaving.value = false; alert('已儲存'); };
</script>

<template>
  <div class="law-layout" :style="cssVars">
    <div class="mobile-nav"><button class="btn-menu" @click="showSidebar = true">☰ 目錄</button><div class="mode-toggle"><button @click="viewMode='single'" :class="{active: viewMode==='single'}">逐條</button><button @click="viewMode='all'" :class="{active: viewMode==='all'}">全覽</button></div></div>
    <div class="sidebar" :class="{ 'mobile-open': showSidebar }">
      <div class="sidebar-header">
        <button class="btn-close-sidebar" @click="showSidebar = false" v-show="showSidebar">✖ 關閉目錄</button>
        <div class="header-top"><NuxtLink to="/admin/law-exam" class="back-link">← 回專區</NuxtLink></div>
        <details class="admin-tools"><summary>⚙️ 管理與校正</summary><div class="tools-panel">
          <div class="top-actions"><label class="btn-tool primary">📥 匯入<input type="file" @change="handleImport" hidden /></label><button @click="exportCSV" class="btn-tool">📤 匯出</button></div>
          <div class="danger-zone"><button @click="batchDelete" class="btn-tool danger">🗑️ 刪除勾選</button><button @click="clearAll" class="btn-tool danger-filled">🔥 清空全部</button></div>
          <div class="mapping-tool"><h4>🔗 校正字典</h4>
            <div class="map-list"><div v-for="(corr, wrg) in customLawMap" :key="wrg" class="map-item"><span>{{wrg}}➔{{corr}}</span><button @click="removeCustomMap(wrg)">✕</button></div></div>
            <div class="map-add-form"><input v-model="newMapWrong" placeholder="如:第十六條"/><select v-model="newMapCorrect"><option :value="CONFIG.pageTitle">【自身】</option><option v-for="law in uniqueLawNames" :key="law" :value="law">{{law}}</option></select><button @click="addCustomMap" class="btn-add-map">新增</button></div>
          </div>
        </div></details>
        <input v-model="searchQuery" class="search-input" placeholder="🔍 搜尋..." />
      </div>
      <div class="tree-list">
        <div v-if="isLoading" class="list-msg">載入中...</div>
        <div v-else class="flat-list">
          <div v-for="c in filteredFlatClauses" :key="c.id" class="clause-item" :class="{active: selectedClause?.id === c.id}"><input type="checkbox" v-model="selectedIds" :value="c.id"/><span @click="selectClause(c)" class="clause-label">{{ c.title }}</span></div>
        </div>
      </div>
    </div>
    <div class="main-content">
      <div v-if="viewMode === 'single'">
        <div v-if="!selectedClause" class="empty-state"><div class="empty-box"><h2>{{ CONFIG.pageTitle }}</h2><button class="btn-open-menu-large" @click="showSidebar = true">開啟目錄</button></div></div>
        <div v-else class="clause-detail">
          <div class="clause-header"><button @click="viewMode='all'" class="btn-back-inner">← 返回清單</button><h1>{{ selectedClause.title }}</h1></div>
          <div class="content-box"><div class="content-text" v-html="parseContentWithLinks(selectedClause.content)" @click="handleContentClick"></div></div>
          <div class="notes-section"><div class="notes-header"><h3>📝 筆記</h3><button @click="saveManual(selectedClause)" class="btn-save-manual">💾 儲存</button></div><textarea v-model="selectedClause.notes" class="note-edit"></textarea></div>
        </div>
      </div>
      <div v-else class="full-text-view">
        <div class="view-header"><h1>全部條文預覽</h1></div>
        <div class="clauses-container"><div v-for="c in filteredFlatClauses" :key="c.id" class="full-clause-card"><div class="card-side"><span>{{ c.title }}</span><button @click="selectClause(c)" class="btn-jump-edit">編輯</button></div><div class="card-main"><div class="card-content" v-html="parseContentWithLinks(c.content)" @click="handleContentClick"></div></div></div></div>
      </div>
    </div>
    <div v-if="floatingReference" class="floating-modal-overlay" @click.self="floatingReference = null"><div class="floating-modal"><div class="float-header"><h4>{{ floatingReference.displayTitle }}</h4><button @click="floatingReference = null">✕</button></div><div class="float-body"><p class="float-content-text">{{ floatingReference.content }}</p><button v-if="floatingReference.canJump" @click="selectClause(floatingReference); floatingReference = null" class="btn-jump-main">進入本條 ➔</button></div></div></div>
  </div>
</template>

<style scoped>
/* 此處請貼上最下方統一提供的 CSS 代碼 */
</style>
