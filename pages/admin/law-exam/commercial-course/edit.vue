<script setup>
import { ref, onMounted, nextTick } from 'vue';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const route = useRoute(); const router = useRouter(); const supabase = useSupabaseClient();
const isLoading = ref(true); const isSaving = ref(false); const activeTab = ref('basic'); 
const summaryRef = ref(null); const transcriptRef = ref(null); const urlsRef = ref(null);
const personalNotesList = ref(['']); 

const form = ref({
  id: null, subject: '商事法', topic: '', introduction: '', class_video_link: '', notebook_audio_link: '', document_link: '', notebook_infographic_link: '', notebook_quiz_link: '', notebook_flashcard_link: '', notebook_overall_link: '', summary: '', transcript: '', personal_notes: '', associated_urls: ''
});

onMounted(async () => {
  const noteId = route.query.id; const lessonNum = route.query.lesson;
  if (noteId) {
    const { data } = await supabase.from('course_notes').select('*').eq('id', noteId).single();
    if (data) {
      form.value = { ...data };
      if (data.personal_notes) {
        try { const parsed = JSON.parse(data.personal_notes); personalNotesList.value = Array.isArray(parsed) ? parsed : [data.personal_notes]; } 
        catch (e) { personalNotesList.value = [data.personal_notes]; }
      } else { personalNotesList.value = ['']; }
    }
  } else if (lessonNum) { form.value.topic = `第${lessonNum}講：`; }
  isLoading.value = false; await nextTick(); syncEditorsToForm();
});

const syncEditorsToForm = () => {
  if (summaryRef.value) summaryRef.value.innerHTML = form.value.summary || '';
  if (transcriptRef.value) transcriptRef.value.innerHTML = form.value.transcript || '';
  if (urlsRef.value) urlsRef.value.innerHTML = form.value.associated_urls || '';
  personalNotesList.value.forEach((note, index) => { const el = document.getElementById('personal-note-' + index); if (el) el.innerHTML = note || ''; });
};

const savePersonalNotesToState = () => { personalNotesList.value = personalNotesList.value.map((_, index) => { const el = document.getElementById('personal-note-' + index); return el ? el.innerHTML : ''; }); };
const addPersonalNote = async () => { savePersonalNotesToState(); personalNotesList.value.push(''); await nextTick(); syncEditorsToForm(); };
const removePersonalNote = async (index) => { if (confirm('確定要刪除這筆筆記嗎？')) { savePersonalNotesToState(); personalNotesList.value.splice(index, 1); if (personalNotesList.value.length === 0) personalNotesList.value.push(''); await nextTick(); syncEditorsToForm(); } };

const formatRichTextUrls = (htmlString, autoNumber = false) => {
  if (!htmlString) return ''; const tempDiv = document.createElement('div'); tempDiv.innerHTML = htmlString;
  const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
  const nodes = []; let node; while ((node = walker.nextNode())) { nodes.push(node); }
  nodes.forEach(n => {
    if (n.parentNode && n.parentNode.nodeName === 'A') return;
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    if (urlRegex.test(n.nodeValue)) {
      const span = document.createElement('span'); span.innerHTML = n.nodeValue.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      n.parentNode.replaceChild(span, n);
    }
  });
  let urlCounter = 1;
  tempDiv.querySelectorAll('a').forEach(a => {
    a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer');
    if (autoNumber) { let text = a.innerHTML; text = text.replace(/^(\d+\.\s*|\[\d+\]\s*)/, ''); a.innerHTML = `${urlCounter}. ${text}`; urlCounter++; }
  });
  return tempDiv.innerHTML;
};

const handleSave = async () => {
  if (summaryRef.value) form.value.summary = summaryRef.value.innerHTML;
  if (transcriptRef.value) form.value.transcript = transcriptRef.value.innerHTML;
  savePersonalNotesToState();
  const processedNotes = personalNotesList.value.map(note => formatRichTextUrls(note, false));
  personalNotesList.value = processedNotes; form.value.personal_notes = JSON.stringify(processedNotes);
  if (urlsRef.value) { form.value.associated_urls = formatRichTextUrls(urlsRef.value.innerHTML, true); }
  if (!form.value.topic.trim()) { alert('請填寫課程主題！'); return; }
  isSaving.value = true; const payload = { ...form.value }; if (!payload.id) delete payload.id;
  const { data, error } = await supabase.from('course_notes').upsert([payload], { onConflict: 'id' }).select().single();
  if (error) { alert('儲存失敗：' + error.message); } else { form.value.id = data.id; alert('✅ 本分頁內容已儲存成功！'); syncEditorsToForm(); }
  isSaving.value = false;
};

const switchTab = async (tabName) => {
  if (summaryRef.value) form.value.summary = summaryRef.value.innerHTML;
  if (transcriptRef.value) form.value.transcript = transcriptRef.value.innerHTML;
  savePersonalNotesToState();
  const processedNotes = personalNotesList.value.map(note => formatRichTextUrls(note, false)); personalNotesList.value = processedNotes; form.value.personal_notes = JSON.stringify(processedNotes);
  if (urlsRef.value) { form.value.associated_urls = formatRichTextUrls(urlsRef.value.innerHTML, true); }
  activeTab.value = tabName; await nextTick(); syncEditorsToForm(); 
};
</script>

<template>
  <div class="edit-container">
    <div class="header">
      <button @click="router.back()" class="back-btn">← 取消並返回</button>
      <div class="title-wrap"><h1>筆記編輯器</h1><span class="subject-tag">{{ form.subject }}學分班</span></div>
    </div>
    <div class="tabs-nav">
      <button :class="{ active: activeTab === 'basic' }" @click="switchTab('basic')">⚙️ 基礎與連結</button>
      <button :class="{ active: activeTab === 'ai' }" @click="switchTab('ai')">🤖 AI 匯出內容</button>
      <button :class="{ active: activeTab === 'study' }" @click="switchTab('study')">✍️ 個人筆記區</button>
    </div>
    <div v-if="isLoading" class="loading-state">載入中，請稍候...</div>
    <div v-else class="form-body">
      <section v-show="activeTab === 'basic'" class="tab-content">
        <div class="form-section">
          <h3>課程基本資訊</h3>
          <div class="form-group"><label>課程主題 (必填)</label><input v-model="form.topic" type="text" class="input-field" /></div>
          <div class="form-group"><label>課程簡介</label><textarea v-model="form.introduction" rows="3" class="input-field"></textarea></div>
        </div>
        <div class="form-section link-grid-section">
          <h3>🤖 NotebookLM 資源連結</h3>
          <div class="link-grid">
            <div class="form-group"><label>▶️ 影片摘要</label><input v-model="form.class_video_link" class="input-field" /></div>
            <div class="form-group"><label>🎧 聲音摘要</label><input v-model="form.notebook_audio_link" class="input-field" /></div>
            <div class="form-group"><label>📄 簡報</label><input v-model="form.document_link" class="input-field" /></div>
            <div class="form-group"><label>📊 資訊圖表</label><input v-model="form.notebook_infographic_link" class="input-field" /></div>
            <div class="form-group"><label>📝 測驗 Quiz</label><input v-model="form.notebook_quiz_link" class="input-field" /></div>
            <div class="form-group"><label>📇 學習卡</label><input v-model="form.notebook_flashcard_link" class="input-field" /></div>
            <div class="form-group"><label>📁 整體資源</label><input v-model="form.notebook_overall_link" class="input-field" /></div>
          </div>
        </div>
        <div class="tab-actions"><button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存此頁內容</button></div>
      </section>
      <section v-show="activeTab === 'ai'" class="tab-content">
        <div class="form-section">
          <h3>AI 生成文本</h3>
          <div class="form-group"><label>📝 重點摘要</label><div ref="summaryRef" contenteditable="true" class="rich-textarea input-field"></div></div>
          <div class="form-group"><label>📜 完整逐字稿</label><div ref="transcriptRef" contenteditable="true" class="rich-textarea input-field transcript-bg"></div></div>
        </div>
        <div class="tab-actions"><button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存 AI 內容</button></div>
      </section>
      <section v-show="activeTab === 'study'" class="tab-content">
        <div class="form-section">
          <h3>專屬學習筆記 (支援複數網頁自動轉超連結)</h3>
          <div v-for="(note, index) in personalNotesList" :key="index" class="personal-note-wrapper">
            <div class="note-header"><span class="note-badge">筆記 {{ index + 1 }}</span><button @click.prevent="removePersonalNote(index)" class="btn-remove-note">🗑️ 刪除</button></div>
            <div :id="'personal-note-' + index" contenteditable="true" class="rich-textarea input-field personal-bg" placeholder="在此整理專屬筆記，貼上網址存檔後自動變超連結..."></div>
          </div>
          <button @click.prevent="addPersonalNote" class="btn-add-note">➕ 新增一筆筆記</button>
          <hr class="divider">
          <div class="form-group">
            <label>🔗 關聯複數網址 (存檔後自動編號並可點擊)</label>
            <div ref="urlsRef" contenteditable="true" class="rich-textarea input-field" placeholder="貼上一堆網址，系統會自動編號..."></div>
          </div>
        </div>
        <div class="tab-actions"><button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存學習筆記</button></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.edit-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #334155; }
.header { margin-bottom: 20px; }
.back-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #ddd; background: white; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.05);}
.title-wrap { display: flex; align-items: center; gap: 15px; margin-top: 10px;}
.header h1 { margin: 0; font-size: 24px; color: #1e293b; }
.subject-tag { background: #0f766e; color: white; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; }
.tabs-nav { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; flex-wrap: wrap;}
.tabs-nav button { padding: 12px 24px; border: none; background: #f1f5f9; color: #64748b; font-weight: bold; cursor: pointer; border-radius: 10px 10px 0 0; transition: 0.2s; }
.tabs-nav button.active { background: #0f766e; color: white; }
.form-section { background: white; padding: 25px; border-radius: 15px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; }
.form-section h3 { margin: 0 0 20px 0; font-size: 18px; color: #1e293b; border-left: 5px solid #0f766e; padding-left: 12px; }
.link-grid-section { background: #f8fafc; }
.link-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #475569; }
.input-field { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 15px; box-sizing: border-box; background: #fff; line-height: 1.6;}
.rich-textarea { min-height: 250px; overflow-y: auto; }
.rich-textarea:empty:before { content: attr(placeholder); color: #94a3b8; pointer-events: none; }
.transcript-bg { background: #fafaf9; }
.personal-note-wrapper { margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;}
.note-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.note-badge { background: #10b981; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
.btn-remove-note { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;}
.btn-remove-note:hover { background: #fecaca; }
.personal-bg { background: #f0fdf4; border-color: #86efac; min-height: 200px;}
.btn-add-note { display: block; width: 100%; padding: 12px; background: #f0fdfa; color: #0f766e; border: 2px dashed #5eead4; border-radius: 10px; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.2s;}
.btn-add-note:hover { background: #ccfbf1; }
.divider { border: none; border-top: 1px dashed #cbd5e1; margin: 30px 0; }
:deep(table) { width: 100%; border-collapse: collapse; margin: 10px 0; }
:deep(td), :deep(th) { border: 1px solid #cbd5e1; padding: 8px; }
:deep(a) { color: #2563eb; text-decoration: underline; font-weight: 500; cursor: pointer; }
:deep(.urls-font a) { display: block; padding: 5px; margin: 5px 0; background: #f1f5f9; border-radius: 5px; border: 1px solid #cbd5e1; }
.tab-actions { display: flex; justify-content: flex-end; padding-bottom: 40px; }
.save-btn { background: #10b981; color: white; border: none; padding: 15px 40px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
.loading-state { text-align: center; padding: 100px; font-weight: bold; color: #94a3b8; font-size: 18px;}
@media (max-width: 768px) { .link-grid { grid-template-columns: 1fr; } .tabs-nav button { flex: 1; text-align: center; padding: 10px;} .tab-actions { justify-content: stretch; } .save-btn { width: 100%; } }
</style>
