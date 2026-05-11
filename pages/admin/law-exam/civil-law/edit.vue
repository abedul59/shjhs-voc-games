<script setup>
import { ref, onMounted } from 'vue';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();

const isSaving = ref(false);
const isLoading = ref(true);
const isEditing = ref(false); // 判斷是否為編輯模式

const form = ref({
  subject: '民法', // 強制鎖定科目
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
    // 編輯現有筆記
    isEditing.value = true;
    const { data, error } = await supabase.from('course_notes').select('*').eq('id', noteId).single();
    if (data) form.value = { ...data };
    if (error) alert('找不到該筆記資料');
  } else if (lessonNum) {
    // 新增筆記，自動帶入堂數
    form.value.topic = `第${lessonNum}講：`;
  }
  
  isLoading.value = false;
});

const saveNote = async () => {
  if (!form.value.topic) {
    alert('請至少填寫課程主題！');
    return;
  }

  isSaving.value = true;
  
  if (isEditing.value && form.value.id) {
    // 更新
    const { error } = await supabase.from('course_notes').update(form.value).eq('id', form.value.id);
    if (error) alert('更新失敗：' + error.message);
    else router.push(`/admin/law-exam/civil-law/view/${form.value.id}`);
  } else {
    // 新增
    const { data, error } = await supabase.from('course_notes').insert([form.value]).select('id').single();
    if (error) alert('新增失敗：' + error.message);
    else router.push(`/admin/law-exam/civil-law/view/${data.id}`); // 儲存後直接跳轉至閱讀頁
  }
  
  isSaving.value = false;
};
</script>

<template>
  <div class="edit-container">
    <div class="header">
      <button @click="router.back()" class="back-btn">← 取消並返回</button>
      <h1>{{ isEditing ? '📝 編輯課程筆記' : '➕ 新增課程筆記' }}</h1>
      <span class="subject-tag">{{ form.subject }}</span>
    </div>

    <div v-if="isLoading" class="loading">載入中...</div>

    <form v-else @submit.prevent="saveNote" class="form-layout">
      
      <div class="form-section">
        <h3>1. 基本資訊</h3>
        <div class="form-group">
          <label>課程主題 (必填)</label>
          <input v-model="form.topic" type="text" placeholder="例：第1講：權利主體" required class="input-field" />
        </div>
        <div class="form-group">
          <label>課程簡介</label>
          <textarea v-model="form.introduction" placeholder="簡單描述這堂課的核心概念..." rows="3" class="input-field"></textarea>
        </div>
      </div>

      <div class="form-section">
        <h3>2. 資源連結 (貼上網址即可)</h3>
        <div class="form-group">
          <label>▶️ 課程影片連結 (YouTube / Google Drive)</label>
          <input v-model="form.class_video_link" type="url" placeholder="https://..." class="input-field" />
        </div>
        <div class="form-group">
          <label>🎧 NotebookLM 音訊分享連結</label>
          <input v-model="form.notebook_audio_link" type="url" placeholder="https://notebooklm.google.com/share/..." class="input-field" />
        </div>
        <div class="form-group">
          <label>📄 課程講義連結 (PDF)</label>
          <input v-model="form.document_link" type="url" placeholder="https://..." class="input-field" />
        </div>
      </div>

      <div class="form-section">
        <h3>3. AI 匯出文字</h3>
        <div class="form-group">
          <label>📝 AI 重點摘要</label>
          <textarea v-model="form.summary" placeholder="貼上 NotebookLM 產生的重點整理..." rows="6" class="input-field"></textarea>
        </div>
        <div class="form-group">
          <label>📜 完整逐字稿</label>
          <textarea v-model="form.transcript" placeholder="貼上完整的影片逐字稿..." rows="10" class="input-field"></textarea>
        </div>
      </div>

      <div class="actions">
        <button type="submit" class="submit-btn" :disabled="isSaving">
          {{ isSaving ? '儲存中...' : '💾 儲存筆記' }}
        </button>
      </div>

    </form>
  </div>
</template>

<style scoped>
.edit-container { max-width: 800px; margin: 0 auto; padding: 30px 20px; font-family: sans-serif; color: #334155; }
.header { margin-bottom: 30px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;}
.back-btn { padding: 6px 14px; background: white; color: #475569; border: 1px solid #cbd5e1; border-radius: 20px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.back-btn:hover { background: #f1f5f9; }
.header h1 { margin: 0; font-size: 24px; color: #1e293b; }
.subject-tag { background: #1e3a8a; color: white; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold;}

.form-layout { display: flex; flex-direction: column; gap: 25px; }
.form-section { background: white; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.form-section h3 { margin: 0 0 20px 0; color: #1e293b; border-bottom: 2px dashed #e2e8f0; padding-bottom: 10px; }
.form-group { margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #475569; }
.input-field { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; font-family: inherit; color: #1e293b; box-sizing: border-box; transition: 0.2s; }
.input-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
textarea.input-field { resize: vertical; line-height: 1.6; }

.actions { display: flex; justify-content: flex-end; margin-top: 10px;}
.submit-btn { background: #10b981; color: white; border: none; padding: 12px 30px; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); }
.submit-btn:hover:not(:disabled) { background: #059669; transform: translateY(-2px); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
</style>
