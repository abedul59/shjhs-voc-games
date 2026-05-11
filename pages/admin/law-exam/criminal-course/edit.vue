<script setup>
import { ref, onMounted, nextTick } from 'vue';

// 確保只有登入且有權限的管理者可以進入
definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();

const isSaving = ref(false);
const isLoading = ref(true);
const isEditing = ref(false);

const summaryRef = ref(null);
const transcriptRef = ref(null);

// 表單預設資料
const form = ref({
  subject: '刑法',
  topic: '',
  introduction: '',
  summary: '',
  transcript: '',
  notebook_audio_link: '',
  class_video_link: '',
  document_link: ''
});

onMounted(async () => {
  const noteId = route.query.id;
  const lessonNum = route.query.lesson;

  if (noteId) {
    // 編輯模式：抓取舊資料
    isEditing.value = true;
    const { data, error } = await supabase
      .from('course_notes')
      .select('*')
      .eq('id', noteId)
      .single();
      
    if (data) {
      form.value = { ...data };
    }
    if (error) {
      alert('找不到該筆記資料，可能已被刪除。');
      router.push('/admin/law-exam/civil-course');
      return; // 提早結束
    }
  } else if (lessonNum) {
    // 新增模式：自動帶入堂數
    form.value.topic = `第${lessonNum}講：`;
  }
  
  // 關閉載入狀態
  isLoading.value = false;

  // 🌟【關鍵修復 1】：等待 Vue 把表單渲染到畫面上後，再把 HTML 塞進編輯區
  await nextTick();

  if (isEditing.value) {
    if (summaryRef.value) summaryRef.value.innerHTML = form.value.summary || '';
    if (transcriptRef.value) transcriptRef.value.innerHTML = form.value.transcript || '';
  }
});

// 監聽 Rich Text 編輯區的輸入，同步到 form 變數中
const handleInput = (field, event) => {
  form.value[field] = event.target.innerHTML;
};

const saveNote = async () => {
  // 🌟【關鍵修復 2】：儲存前，強制再從畫面抓取一次內容，避免貼上事件漏接
  if (summaryRef.value) form.value.summary = summaryRef.value.innerHTML;
  if (transcriptRef.value) form.value.transcript = transcriptRef.value.innerHTML;

  if (!form.value.topic.trim() || form.value.topic === `第${route.query.lesson}講：`) {
    alert('請填寫完整的「課程主題」！');
    return;
  }

  isSaving.value = true;
  
  if (isEditing.value && form.value.id) {
    // 更新現有資料
    const { error } = await supabase
      .from('course_notes')
      .update(form.value)
      .eq('id', form.value.id);
      
    if (error) {
      alert('更新失敗：' + error.message);
    } else {
      router.push(`/admin/law-exam/civil-course/${form.value.id}`);
    }
  } else {
    // 插入新資料
    const { data, error } = await supabase
      .from('course_notes')
      .insert([form.value])
      .select('id')
      .single();
      
    if (error) {
      alert('新增失敗：' + error.message);
    } else {
      router.push(`/admin/law-exam/civil-course/${data.id}`);
    }
  }
  
  isSaving.value = false;
};
</script>

<template>
  <div class="edit-container">
    <div class="header">
      <button @click="router.back()" class="back-btn">← 取消並返回</button>
      <div class="title-wrap">
        <h1>{{ isEditing ? '📝 編輯課程筆記' : '➕ 新增課程筆記' }}</h1>
        <span class="subject-tag">{{ form.subject }}學分班</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      載入中，請稍候...
    </div>

    <form v-else @submit.prevent="saveNote" class="form-layout">
      
      <div class="form-section">
        <h3>1. 基本資訊</h3>
        <div class="form-group">
          <label>課程主題 (必填)</label>
          <input 
            v-model="form.topic" 
            type="text" 
            placeholder="例：第1講：權利主體與行為能力" 
            required 
            class="input-field" 
          />
        </div>
        <div class="form-group">
          <label>課程簡介</label>
          <textarea 
            v-model="form.introduction" 
            placeholder="簡單描述這堂課的核心概念或學習目標..." 
            rows="3" 
            class="input-field"
          ></textarea>
        </div>
      </div>

      <div class="form-section link-section">
        <h3>2. 資源連結 (請貼上共享網址)</h3>
        <p class="section-desc">若無資源請留白，閱讀頁面會自動隱藏該按鈕。</p>
        
        <div class="form-group">
          <label>▶️ 影片摘要 (YouTube / Google Drive)</label>
          <input v-model="form.class_video_link" type="url" placeholder="https://..." class="input-field" />
        </div>
        <div class="form-group">
          <label>🎧 聲音摘要 (Podcast)</label>
          <input v-model="form.notebook_audio_link" type="url" placeholder="https://notebooklm.google.com/share/..." class="input-field" />
        </div>
        <div class="form-group">
          <label>📄 NotebookLM簡報 (簡報或講義連結)</label>
          <input v-model="form.document_link" type="url" placeholder="https://..." class="input-field" />
        </div>
      </div>

      <div class="form-section">
        <h3>3. 匯出文字 (支援直接貼上表格)</h3>
        
        <div class="form-group">
          <label>📝 重點摘要</label>
          <div 
            ref="summaryRef"
            class="rich-textarea input-field" 
            contenteditable="true" 
            @input="e => handleInput('summary', e)"
            placeholder="請直接從 NotebookLM 反白複製並貼上，表格不會散掉..."
          ></div>
        </div>
        
        <div class="form-group">
          <label>📜 完整逐字稿</label>
          <div 
            ref="transcriptRef"
            class="rich-textarea input-field transcript-field" 
            contenteditable="true" 
            @input="e => handleInput('transcript', e)"
            placeholder="請貼上完整的逐字稿內容..."
          ></div>
        </div>
      </div>

      <div class="actions">
        <button type="submit" class="submit-btn" :disabled="isSaving">
          {{ isSaving ? '⏳ 儲存中...' : '💾 儲存筆記' }}
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
.edit-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px 20px;
  font-family: sans-serif;
  color: #334155;
}

/* --- Header 區域 --- */
.header { margin-bottom: 30px; }
.back-btn { display: inline-block; padding: 6px 14px; background: white; color: #475569; border: 1px solid #cbd5e1; border-radius: 20px; font-weight: bold; cursor: pointer; margin-bottom: 15px; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.back-btn:hover { background: #f1f5f9; border-color: #94a3b8; color: #1e293b; }
.title-wrap { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
.header h1 { margin: 0; font-size: 26px; color: #1e293b; }
.subject-tag { background: #be123c; color: white; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; }
.loading-state { text-align: center; padding: 50px; color: #64748b; font-size: 18px; font-weight: bold; }

/* --- 表單區塊設計 --- */
.form-layout { display: flex; flex-direction: column; gap: 25px; }
.form-section { background: white; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.link-section { background: #f8fafc; }
.form-section h3 { margin: 0 0 10px 0; color: #1e293b; font-size: 18px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 10px; }
.section-desc { font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 20px; }

/* --- 輸入框設計 --- */
.form-group { margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #475569; }
.input-field { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; font-family: inherit; color: #1e293b; box-sizing: border-box; background: #fff; transition: all 0.2s; }
.input-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
textarea.input-field { resize: vertical; line-height: 1.6; }

/* 🌟 Rich Text 編輯區專屬樣式 */
.rich-textarea {
  min-height: 200px;
  overflow-y: auto;
  line-height: 1.6;
}
.rich-textarea:empty:before {
  content: attr(placeholder);
  color: #94a3b8;
  pointer-events: none;
}
.transcript-field { background: #fafaf9; }

/* 讓表格在編輯時也有基本框線，方便辨識 */
:deep(.rich-textarea table) { width: 100%; border-collapse: collapse; margin: 10px 0; }
:deep(.rich-textarea th), :deep(.rich-textarea td) { border: 1px solid #cbd5e1; padding: 8px; }

/* --- 底部按鈕 --- */
.actions { display: flex; justify-content: flex-end; margin-top: 10px; }
.submit-btn { background: #10b981; color: white; border: none; padding: 14px 35px; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); }
.submit-btn:hover:not(:disabled) { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3); }
.submit-btn:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; opacity: 0.8; }

@media (max-width: 600px) {
  .actions { justify-content: stretch; }
  .submit-btn { width: 100%; }
}
</style>
