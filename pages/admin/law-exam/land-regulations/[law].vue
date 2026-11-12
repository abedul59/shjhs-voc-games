<script setup>
import { computed, onMounted, ref } from 'vue';
import Papa from 'papaparse';
import { LAND_REGULATION_MAP } from '~/utils/landRegulations';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const supabase = useSupabaseClient();
const config = computed(() => LAND_REGULATION_MAP[String(route.params.law)] || LAND_REGULATION_MAP['land-registration-rules']);
const cssVars = computed(() => ({ '--primary': config.value.color, '--hover': config.value.hover, '--light': config.value.light, '--active': config.value.active }));

const clauses = ref([]);
const selectedClause = ref(null);
const selectedIds = ref([]);
const searchQuery = ref('');
const viewMode = ref('single');
const showSidebar = ref(false);
const isLoading = ref(true);
const isUploading = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const savedMessage = ref('');
const referenceClause = ref(null);
const newUrlLabel = ref('');
const newUrlLink = ref('');

const parseUrls = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
};

const articleParts = (value) => String(value || '0').split('-').map(part => Number(part) || 0);
const sortClauses = (a, b) => {
  const left = articleParts(a.article_num);
  const right = articleParts(b.article_num);
  return left[0] - right[0] || (left[1] || 0) - (right[1] || 0);
};

const fetchClauses = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  const { data, error } = await supabase.from(config.value.table).select('*');
  if (error) {
    errorMessage.value = `無法讀取${config.value.title}：${error.message}`;
    clauses.value = [];
  } else {
    clauses.value = (data || []).map(item => ({ ...item, urls: parseUrls(item.urls) })).sort(sortClauses);
    if (selectedClause.value) selectedClause.value = clauses.value.find(item => item.id === selectedClause.value.id) || null;
  }
  selectedIds.value = [];
  isLoading.value = false;
};

onMounted(fetchClauses);

const filteredClauses = computed(() => {
  const keyword = searchQuery.value.trim();
  if (!keyword) return clauses.value;
  return clauses.value.filter(item => `${item.title || ''}\n${item.content || ''}\n${item.notes || ''}`.includes(keyword));
});

const groupedClauses = computed(() => {
  const groups = {};
  for (const clause of filteredClauses.value) {
    const chapter = clause.chapter_name || '本文';
    const section = clause.section_name || '一般規定';
    groups[chapter] ||= {};
    groups[chapter][section] ||= [];
    groups[chapter][section].push(clause);
  }
  return groups;
});

const selectClause = (clause) => {
  selectedClause.value = clause;
  viewMode.value = 'single';
  showSidebar.value = false;
  referenceClause.value = null;
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' });
};

const normalizeArticle = (raw) => {
  const matched = String(raw).replace(/\s/g, '').match(/第(\d+)條(?:之(\d+))?/);
  return matched ? `${matched[1]}${matched[2] ? `-${matched[2]}` : ''}` : null;
};

const contentWithLinks = (content) => String(content || '').replace(/第\s*\d+\s*條(?:\s*之\s*\d+)?/g, raw => `<button class="ref-btn" data-article="${normalizeArticle(raw) || ''}">${raw}</button>`);
const handleContentClick = (event) => {
  const button = event.target.closest?.('.ref-btn');
  if (!button) return;
  referenceClause.value = clauses.value.find(item => String(item.article_num) === button.dataset.article) || null;
  if (!referenceClause.value) errorMessage.value = `找不到引用條文：${button.textContent}`;
};

const saveClause = async () => {
  if (!selectedClause.value) return;
  isSaving.value = true;
  savedMessage.value = '';
  const { error } = await supabase.from(config.value.table).update({ notes: selectedClause.value.notes || '', urls: selectedClause.value.urls || [] }).eq('id', selectedClause.value.id);
  isSaving.value = false;
  if (error) errorMessage.value = `儲存失敗：${error.message}`;
  else savedMessage.value = '已儲存筆記與連結';
};

const addUrl = () => {
  if (!selectedClause.value || !newUrlLabel.value.trim() || !newUrlLink.value.trim()) return;
  let url = newUrlLink.value.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  selectedClause.value.urls.push({ label: newUrlLabel.value.trim(), url });
  newUrlLabel.value = '';
  newUrlLink.value = '';
  saveClause();
};

const removeUrl = (index) => {
  selectedClause.value.urls.splice(index, 1);
  saveClause();
};

const handleImport = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async ({ data }) => {
      const payload = data.map(row => {
        const clean = { ...row };
        if (!clean.id) delete clean.id;
        clean.urls = parseUrls(clean.urls);
        return clean;
      });
      const { error } = await supabase.from(config.value.table).insert(payload);
      isUploading.value = false;
      event.target.value = '';
      if (error) errorMessage.value = `匯入失敗：${error.message}`;
      else await fetchClauses();
    }
  });
};

const exportCsv = () => {
  if (!clauses.value.length) return;
  const csv = Papa.unparse(clauses.value.map(item => ({ ...item, urls: JSON.stringify(item.urls || []) })));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  link.download = `${config.value.title}_backup.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const deleteSelected = async () => {
  if (!selectedIds.value.length || !confirm(`確定刪除選取的 ${selectedIds.value.length} 條法規？`)) return;
  const { error } = await supabase.from(config.value.table).delete().in('id', selectedIds.value);
  if (error) errorMessage.value = `刪除失敗：${error.message}`;
  else { selectedClause.value = null; await fetchClauses(); }
};

const clearAll = async () => {
  if (!confirm(`確定清空「${config.value.title}」全部條文？`)) return;
  const { error } = await supabase.from(config.value.table).delete().neq('article_num', '__KEEP_NONE__');
  if (error) errorMessage.value = `清空失敗：${error.message}`;
  else { selectedClause.value = null; await fetchClauses(); }
};
</script>

<template>
  <div class="law-layout" :style="cssVars" :class="{ 'all-mode': viewMode === 'all' }">
    <div class="mobile-bar">
      <button @click="showSidebar = true">☰ 目錄</button>
      <strong>{{ config.title }}</strong>
      <div class="mode-buttons"><button :class="{ active: viewMode === 'single' }" @click="viewMode = 'single'">逐條</button><button :class="{ active: viewMode === 'all' }" @click="viewMode = 'all'">全覽</button></div>
    </div>

    <aside class="sidebar" :class="{ open: showSidebar }">
      <header>
        <div class="header-row"><NuxtLink to="/admin/law-exam">← 回專區</NuxtLink><button class="close" @click="showSidebar = false">✕</button></div>
        <h1>{{ config.title }}</h1>
        <p v-if="config.scopeNote" class="scope-note">{{ config.scopeNote }}</p>
        <div class="desktop mode-buttons"><button :class="{ active: viewMode === 'single' }" @click="viewMode = 'single'">逐條觀看</button><button :class="{ active: viewMode === 'all' }" @click="viewMode = 'all'">全部觀看</button></div>
        <details class="admin-tools">
          <summary>⚙️ 管理工具</summary>
          <div><label class="tool primary">📥 {{ isUploading ? '匯入中' : '匯入 CSV' }}<input type="file" accept=".csv" hidden @change="handleImport"></label><button class="tool" @click="exportCsv">📤 匯出</button></div>
          <div><button class="tool danger" :disabled="!selectedIds.length" @click="deleteSelected">刪除選取</button><button class="tool danger" @click="clearAll">清空全部</button></div>
        </details>
        <input v-model="searchQuery" class="search" placeholder="🔍 搜尋條號、內容或筆記">
      </header>

      <div class="tree">
        <p v-if="isLoading">資料載入中…</p>
        <p v-else-if="!filteredClauses.length">尚無條文資料</p>
        <details v-for="(sections, chapter) in groupedClauses" :key="chapter" open>
          <summary class="chapter">{{ chapter }}</summary>
          <details v-for="(items, section) in sections" :key="section" open>
            <summary class="section">{{ section }}</summary>
            <label v-for="clause in items" :key="clause.id" class="clause-link" :class="{ active: selectedClause?.id === clause.id }">
              <input v-model="selectedIds" type="checkbox" :value="clause.id">
              <button @click="selectClause(clause)">{{ clause.title || `第 ${clause.article_num} 條` }}</button>
            </label>
          </details>
        </details>
      </div>
    </aside>

    <main>
      <p v-if="errorMessage" class="message error">⚠️ {{ errorMessage }}</p>
      <template v-if="viewMode === 'single'">
        <section v-if="selectedClause" class="article-card">
          <p class="eyebrow">{{ config.title }}</p>
          <h2>{{ selectedClause.title || `第 ${selectedClause.article_num} 條` }}</h2>
          <p v-if="config.scopeNote" class="scope-banner">{{ config.scopeNote }}</p>
          <div class="law-content" @click="handleContentClick" v-html="contentWithLinks(selectedClause.content)"></div>
          <div class="study-box">
            <h3>✍️ 個人筆記</h3>
            <textarea v-model="selectedClause.notes" rows="8" placeholder="整理要件、實務見解與考點…"></textarea>
            <h3>🔗 參考連結</h3>
            <div v-for="(item, index) in selectedClause.urls" :key="`${item.url}-${index}`" class="saved-url"><a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.label }}</a><button @click="removeUrl(index)">移除</button></div>
            <div class="url-form"><input v-model="newUrlLabel" placeholder="名稱"><input v-model="newUrlLink" placeholder="網址"><button @click="addUrl">新增</button></div>
            <div class="save-row"><span>{{ savedMessage }}</span><button :disabled="isSaving" @click="saveClause">{{ isSaving ? '儲存中…' : '💾 儲存筆記' }}</button></div>
          </div>
        </section>
        <section v-else class="empty"><div>⚖️</div><h2>{{ config.title }}</h2><p>請從目錄選擇條文。</p><button @click="showSidebar = true">開啟目錄</button></section>
      </template>

      <section v-else class="all-articles">
        <header><p class="eyebrow">地政士法規專區</p><h2>{{ config.title }}・全部條文</h2><p v-if="config.scopeNote" class="scope-banner">{{ config.scopeNote }}</p></header>
        <article v-for="clause in filteredClauses" :key="clause.id">
          <h3>{{ clause.title || `第 ${clause.article_num} 條` }}</h3>
          <div class="law-content" @click="handleContentClick" v-html="contentWithLinks(clause.content)"></div>
          <p v-if="clause.notes" class="note-preview">📝 {{ clause.notes }}</p>
        </article>
      </section>
    </main>

    <div v-if="showSidebar" class="scrim" @click="showSidebar = false"></div>
    <div v-if="referenceClause" class="reference" @click.self="referenceClause = null"><section><button class="close-ref" @click="referenceClause = null">✕</button><small>引用條文</small><h2>{{ referenceClause.title }}</h2><p>{{ referenceClause.content }}</p><button class="jump" @click="selectClause(referenceClause)">前往此條</button></section></div>
  </div>
</template>

<style scoped>
.law-layout{--primary:#059669;--hover:#047857;--light:#ecfdf5;--active:#d1fae5;min-height:100vh;background:#f8fafc;color:#1e293b;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif}.sidebar{position:fixed;inset:0 auto 0 0;width:340px;background:white;border-right:1px solid #dbe3ed;display:flex;flex-direction:column;z-index:20}.sidebar header{padding:20px;border-bottom:1px solid #e2e8f0}.header-row{display:flex;justify-content:space-between;align-items:center}.header-row a{color:#64748b;text-decoration:none;font-weight:800}.sidebar h1{margin:16px 0;color:var(--primary);font-size:25px}.close{display:none}.mode-buttons{display:flex;gap:5px}.mode-buttons button,.mobile-bar>button{border:1px solid #cbd5e1;background:white;padding:8px 10px;border-radius:8px;cursor:pointer}.mode-buttons button.active{background:var(--primary);border-color:var(--primary);color:white}.admin-tools{margin:14px 0 10px;background:#f8fafc;border-radius:10px;padding:10px}.admin-tools summary{cursor:pointer;font-weight:800}.admin-tools>div{display:flex;gap:6px;margin-top:8px}.tool{flex:1;border:1px solid #cbd5e1;background:white;padding:8px;border-radius:7px;cursor:pointer;text-align:center;font:inherit}.tool.primary{background:var(--primary);color:white;border-color:var(--primary)}.tool.danger{color:#b91c1c}.tool:disabled{opacity:.4}.search{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:11px;font:inherit}.tree{padding:12px 14px 30px;overflow:auto}.tree>p{text-align:center;color:#94a3b8}.chapter,.section{cursor:pointer;font-weight:900;padding:9px 5px}.chapter{color:var(--primary);font-size:17px}.section{color:#475569;margin-left:8px}.clause-link{display:grid;grid-template-columns:22px 1fr;align-items:start;padding:3px 4px 3px 14px;border-radius:8px}.clause-link.active{background:var(--active)}.clause-link input{margin-top:10px}.clause-link button{border:0;background:none;text-align:left;padding:8px;color:#334155;cursor:pointer;font:inherit;width:100%}.mobile-bar{display:none}main{margin-left:340px;padding:34px;min-height:100vh;box-sizing:border-box}.message{max-width:950px;margin:0 auto 15px;padding:12px 15px;border-radius:8px}.message.error{background:#fff1f2;border:1px solid #fda4af;color:#9f1239}.article-card,.all-articles{max-width:950px;margin:auto;background:white;border-radius:18px;padding:clamp(24px,5vw,60px);box-shadow:0 8px 30px #0f172a12}.eyebrow{color:var(--primary);font-weight:900;letter-spacing:.12em}.article-card h2,.all-articles h2{font-size:clamp(26px,4vw,40px);margin:8px 0 28px}.law-content{white-space:pre-wrap;font-family:'Noto Serif TC',serif;font-size:19px;line-height:2;color:#27364a}.study-box{margin-top:40px;padding:22px;background:var(--light);border-radius:14px;border:1px solid var(--active)}.study-box h3{margin:10px 0}.study-box textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:9px;padding:12px;font:inherit;resize:vertical}.saved-url{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #cbd5e1}.saved-url a{color:var(--primary);font-weight:800}.saved-url button{border:0;background:none;color:#be123c;cursor:pointer}.url-form{display:grid;grid-template-columns:1fr 2fr auto;gap:7px;margin-top:10px}.url-form input{min-width:0;padding:9px;border:1px solid #cbd5e1;border-radius:7px}.url-form button,.save-row button,.empty button,.jump{border:0;border-radius:8px;background:var(--primary);color:white;padding:10px 16px;font-weight:900;cursor:pointer}.save-row{display:flex;justify-content:space-between;align-items:center;margin-top:16px;color:var(--primary);font-weight:800}.empty{max-width:700px;margin:80px auto;text-align:center;background:white;border-radius:18px;padding:70px 20px}.empty>div{font-size:60px}.all-articles article{padding:24px 0;border-top:1px solid #e2e8f0}.all-articles article h3{color:var(--primary);font-size:22px}.note-preview{background:var(--light);padding:12px;border-radius:8px;white-space:pre-wrap}.reference{position:fixed;inset:0;background:#0f172ab3;display:grid;place-items:center;padding:20px;z-index:50}.reference section{position:relative;width:min(620px,100%);max-height:80vh;overflow:auto;background:white;border-radius:16px;padding:30px}.reference section>small{color:var(--primary);font-weight:900}.reference section>p{white-space:pre-wrap;line-height:1.8}.close-ref{position:absolute;right:15px;top:12px;border:0;background:none;font-size:20px;cursor:pointer}:deep(.ref-btn){display:inline;border:0;border-bottom:2px dashed var(--primary);background:var(--light);color:var(--hover);padding:0 3px;font:inherit;cursor:pointer}.scrim{display:none}
.scope-note{margin:-8px 0 14px;color:#64748b;font-size:13px;line-height:1.5}.scope-banner{margin:-14px 0 24px;padding:12px 14px;border-left:4px solid var(--primary);background:var(--light);border-radius:7px;color:#475569;line-height:1.6}
@media(max-width:800px){.mobile-bar{position:sticky;top:0;z-index:15;display:flex;justify-content:space-between;align-items:center;gap:6px;padding:9px;background:white;border-bottom:1px solid #e2e8f0}.mobile-bar strong{font-size:14px}.mobile-bar .mode-buttons button{padding:6px}.sidebar{transform:translateX(-105%);transition:.2s;width:min(88vw,340px)}.sidebar.open{transform:translateX(0)}.close{display:block;border:0;background:none;font-size:20px}.scrim{display:block;position:fixed;inset:0;background:#0f172a80;z-index:10}main{margin-left:0;padding:14px}.desktop{display:none}.article-card,.all-articles{padding:22px 17px}.law-content{font-size:17px}.url-form{grid-template-columns:1fr}.save-row{align-items:flex-end;gap:10px}.all-mode .mobile-bar{position:sticky}}
</style>
