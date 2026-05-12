<script setup>
import { ref, onMounted, nextTick } from 'vue';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();

const isLoading = ref(true);
const isSaving = ref(false);
const activeTab = ref('basic'); // basic, ai, study

// 編輯框的引用
const summaryRef = ref(null);
const transcriptRef = ref(null);
const personalRef = ref(null);
const urlsRef = ref(null);

const form = ref({
  id: null,
  subject: '民法',
  topic: '',
  introduction: '',
  class_video_link: '',
  notebook_audio_link: '',
  document_link: '',
  notebook_infographic_link: '',
  notebook_quiz_link: '',
  notebook_flashcard_link: '',
  notebook_overall_link: '',
  summary: '',
  transcript: '',
  personal_notes: '',
  associated_urls: ''
});

onMounted(async () => {
  const noteId = route.query.id;
  const lessonNum = route.query.lesson;

  if (noteId) {
    const { data, error } = await supabase.from('course_notes').select('*').eq('id', noteId).single();
    if (data) form.value = data;
  } else if (lessonNum) {
    form.value.topic = `第${lessonNum}講：`;
  }
  
  isLoading.value = false;
  await nextTick();
  syncEditorsToForm();
});

// 將資料庫內容同步到 Rich Text 編輯框
const syncEditorsToForm = () => {
  if (summaryRef.value) summaryRef.value.innerHTML = form.value.summary || '';
  if (transcriptRef.value) transcriptRef.value.innerHTML = form.value.transcript || '';
  if (personalRef.value) personalRef.value.innerHTML = form.value.personal_notes || '';
  if (urlsRef.value) urlsRef.value.innerHTML = form.value.associated_urls || '';
};

// 儲存邏輯 (支援個別分頁儲存)
const handleSave = async (targetFields) => {
  // 1. 同步當前編輯框內容到變數
  if (summaryRef.value) form.value.summary = summaryRef.value.innerHTML;
  if (transcriptRef.value) form.value.transcript = transcriptRef.value.innerHTML;
  if (personalRef.value) form.value.personal_notes = personalRef.value.innerHTML;
  if (urlsRef.value) form.value.associated_urls = urlsRef.value.innerHTML;

  if (!form.value.topic.trim()) {
    alert('請填寫課程主題！');
    return;
  }

  isSaving.value = true;

  // 2. 準備要更新的資料 (只抓取目前頁面相關或全部，這裏採全部以確保完整性)
  const payload = { ...form.value };

  const { data, error } = await supabase
    .from('course_notes')
    .upsert([payload], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    alert('儲存失敗：' + error.message);
  } else {
    form.value.id = data.id; // 確保新增後拿到 ID 變成編輯模式
    alert('✅ 本分頁內容已儲存成功！');
  }
  
  isSaving.value = false;
};

// 換頁時自動同步 (防止切換後丟失編輯)
const switchTab = async (tabName) => {
  if (summaryRef.value) form.value.summary = summaryRef.value.innerHTML;
  if (transcriptRef.value) form.value.transcript = transcriptRef.value.innerHTML;
  if (personalRef.value) form.value.personal_notes = personalRef.value.innerHTML;
  if (urlsRef.value) form.value.associated_urls = urlsRef.value.innerHTML;
  
  activeTab.value = tabName;
  await nextTick();
  syncEditorsToForm(); // 重新掛載後再次同步
};
</script>

<template>
  <div class="edit-container">
    <div class="header">
      <button @click="router.back()" class="back-btn">← 取消並返回</button>
      <div class="title-wrap">
        <h1>筆記編輯器</h1>
        <span class="subject-tag">{{ form.subject }}學分班</span>
      </div>
    </div>

    <div class="tabs-nav">
      <button :class="{ active: activeTab === 'basic' }" @click="switchTab('basic')">⚙️ 基礎與連結</button>
      <button :class="{ active: activeTab === 'ai' }" @click="switchTab('ai')">🤖 AI 匯出內容</button>
      <button :class="{ active: activeTab === 'study' }" @click="switchTab('study')">✍️ 個人筆記區</button>
    </div>

    <div v-if="isLoading" class="loading-state">載入中...</div>

    <div v-else class="form-body">
      
      <section v-show="activeTab === 'basic'" class="tab-content">
        <div class="form-section">
          <h3>課程基本資訊</h3>
          <div class="form-group">
            <label>課程主題 (必填)</label>
            <input v-model="form.topic" type="text" class="input-field" />
          </div>
          <div class="form-group">
            <label>課程簡介</label>
            <textarea v-model="form.introduction" rows="3" class="input-field"></textarea>
          </div>
        </div>

        <div class="form-section link-grid-section">
          <h3>🤖 NotebookLM 資源連結</h3>
          <div class="link-grid">
            <div class="form-group"><label>▶️ 影片摘要</label><input v-model="form.class_video_link" class="input-field" /></div>
            <div class="form-group"><label>🎧 聲音摘要</label><input v-model="form.notebook_audio_link" class="input-field" /></div>
            <div class="form-group"><label>📄 NotebookLM 簡報</label><input v-model="form.document_link" class="input-field" /></div>
            <div class="form-group"><label>📊 資訊圖表</label><input v-model="form.notebook_infographic_link" class="input-field" /></div>
            <div class="form-group"><label>📝 測驗 Quiz</label><input v-model="form.notebook_quiz_link" class="input-field" /></div>
            <div class="form-group"><label>📇 學習卡</label><input v-model="form.notebook_flashcard_link" class="input-field" /></div>
            <div class="form-group"><label>📁 整體資源</label><input v-model="form.notebook_overall_link" class="input-field" /></div>
          </div>
        </div>
        <div class="tab-actions">
          <button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存此頁內容</button>
        </div>
      </section>

      <section v-show="activeTab === 'ai'" class="tab-content">
        <div class="form-section">
          <h3>AI 生成文本</h3>
          <div class="form-group">
            <label>📝 重點摘要</label>
            <div ref="summaryRef" contenteditable="true" class="rich-textarea input-field"></div>
          </div>
          <div class="form-group">
            <label>📜 完整逐字稿</label>
            <div ref="transcriptRef" contenteditable="true" class="rich-textarea input-field transcript-bg"></div>
          </div>
        </div>
        <div class="tab-actions">
          <button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存 AI 內容</button>
        </div>
      </section>

      <section v-show="activeTab === 'study'" class="tab-content">
        <div class="form-section">
          <h3>專屬學習筆記</h3>
          <div class="form-group">
            <label>✍️ 自己的筆記</label>
            <div ref="personalRef" contenteditable="true" class="rich-textarea input-field personal-bg"></div>
          </div>
          <div class="form-group">
            <label>🔗 關聯複數網址</label>
            <div ref="urlsRef" contenteditable="true" class="rich-textarea input-field"></div>
          </div>
        </div>
        <div class="tab-actions">
          <button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存學習筆記</button>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.edit-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #334155; }
.header { margin-bottom: 20px; }
.back-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #ddd; background: white; cursor: pointer; transition: 0.2s; font-weight: bold;}
.back-btn:hover { background: #f1f5f9; }
.title-wrap { display: flex; align-items: center; gap: 15px; margin-top: 10px;}
.header h1 { margin: 0; font-size: 24px; color: #1e293b; }
.subject-tag { background: #1e3a8a; color: white; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; }

/* 🌟 分頁導覽列 */
.tabs-nav { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
.tabs-nav button { padding: 12px 24px; border: none; background: #f1f5f9; color: #64748b; font-weight: bold; cursor: pointer; border-radius: 10px 10px 0 0; transition: 0.2s; }
.tabs-nav button.active { background: #3b82f6; color: white; }

/* 폼 內容 */
.form-section { background: white; padding: 25px; border-radius: 15px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; }
.form-section h3 { margin: 0 0 20px 0; font-size: 18px; color: #1e293b; border-left: 5px solid #3b82f6; padding-left: 12px; }
.link-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #475569; }
.input-field { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 15px; box-sizing: border-box; background: #fff; line-height: 1.6;}
.input-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

/* Rich Text */
.rich-textarea { min-height: 250px; overflow-y: auto; }
.transcript-bg { background: #fafaf9; }
.personal-bg { background: #f0fdf4; border-color: #86efac; }
:deep(table) { width: 100%; border-collapse: collapse; margin: 10px 0; }
:deep(td), :deep(th) { border: 1px solid #cbd5e1; padding: 8px; }

/* 儲存按鈕 */
.tab-actions { display: flex; justify-content: flex-end; padding-bottom: 40px; }
.save-btn { background: #10b981; color: white; border: none; padding: 15px 40px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
.save-btn:hover { background: #059669; transform: translateY(-2px); }
.save-btn:disabled { background: #94a3b8; cursor: not-allowed; }

.loading-state { text-align: center; padding: 100px; font-weight: bold; color: #94a3b8; }

@media (max-width: 768px) { .link-grid { grid-template-columns: 1fr; } .tabs-nav { flex-direction: column; } }
</style>
