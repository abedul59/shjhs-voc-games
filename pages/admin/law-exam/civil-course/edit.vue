<script setup>
import { ref, onMounted, nextTick } from 'vue';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();

const isSaving = ref(false);
const isLoading = ref(true);
const isEditing = ref(false);

const summaryRef = ref(null);
const transcriptRef = ref(null);
const personalNotesRef = ref(null);
const associatedUrlsRef = ref(null);

const form = ref({
  subject: '民法',
  topic: '',
  introduction: '',
  summary: '',
  transcript: '',
  notebook_audio_link: '',
  class_video_link: '',
  document_link: '',
  notebook_infographic_link: '',
  notebook_quiz_link: '',
  notebook_flashcard_link: '',
  notebook_overall_link: '',
  personal_notes: '',
  associated_urls: ''
});

onMounted(async () => {
  const noteId = route.query.id;
  const lessonNum = route.query.lesson;
  if (noteId) {
    isEditing.value = true;
    const { data } = await supabase.from('course_notes').select('*').eq('id', noteId).single();
    if (data) form.value = { ...data };
  } else if (lessonNum) {
    form.value.topic = `第${lessonNum}講：`;
  }
  isLoading.value = false;
  await nextTick();
  if (isEditing.value) {
    if (summaryRef.value) summaryRef.value.innerHTML = form.value.summary || '';
    if (transcriptRef.value) transcriptRef.value.innerHTML = form.value.transcript || '';
    if (personalNotesRef.value) personalNotesRef.value.innerHTML = form.value.personal_notes || '';
    if (associatedUrlsRef.value) associatedUrlsRef.value.innerHTML = form.value.associated_urls || '';
  }
});

const saveNote = async () => {
  if (summaryRef.value) form.value.summary = summaryRef.value.innerHTML;
  if (transcriptRef.value) form.value.transcript = transcriptRef.value.innerHTML;
  if (personalNotesRef.value) form.value.personal_notes = personalNotesRef.value.innerHTML;
  if (associatedUrlsRef.value) form.value.associated_urls = associatedUrlsRef.value.innerHTML;

  if (!form.value.topic.trim()) { alert('請填寫主題'); return; }
  isSaving.value = true;
  const { data, error } = await supabase.from('course_notes').upsert([form.value]).select('id').single();
  if (!error) router.push(`/admin/law-exam/civil-course/${data.id}`);
  isSaving.value = false;
};
</script>

<template>
  <div class="edit-container">
    <div class="header">
      <button @click="router.back()" class="back-btn">← 取消</button>
      <div class="title-wrap"><h1>{{ isEditing ? '編輯筆記' : '新增筆記' }}</h1></div>
    </div>

    <form v-if="!isLoading" @submit.prevent="saveNote" class="form-layout">
      <div class="form-section">
        <h3>1. 基本資訊</h3>
        <div class="form-group"><label>課程主題</label><input v-model="form.topic" class="input-field" /></div>
        <div class="form-group"><label>課程簡介</label><textarea v-model="form.introduction" rows="2" class="input-field"></textarea></div>
      </div>

      <div class="form-section link-section">
        <h3>2. NotebookLM 資源 (請貼上共享連結)</h3>
        <div class="link-grid">
          <div class="form-group"><label>▶️ 影片摘要</label><input v-model="form.class_video_link" class="input-field" /></div>
          <div class="form-group"><label>🎧 聲音摘要</label><input v-model="form.notebook_audio_link" class="input-field" /></div>
          <div class="form-group"><label>📄 NotebookLM簡報</label><input v-model="form.document_link" class="input-field" /></div>
          <div class="form-group"><label>📊 資訊圖表</label><input v-model="form.notebook_infographic_link" class="input-field" /></div>
          <div class="form-group"><label>📝 測驗 Quiz</label><input v-model="form.notebook_quiz_link" class="input-field" /></div>
          <div class="form-group"><label>📇 學習卡</label><input v-model="form.notebook_flashcard_link" class="input-field" /></div>
          <div class="form-group"><label>📁 整體資源</label><input v-model="form.notebook_overall_link" class="input-field" /></div>
        </div>
      </div>

      <div class="form-section">
        <h3>3. 內容詳情 (支援直接貼上格式)</h3>
        <div class="form-group"><label>📝 重點摘要</label><div ref="summaryRef" contenteditable="true" class="rich-textarea input-field"></div></div>
        <div class="form-group"><label>📜 完整逐字稿</label><div ref="transcriptRef" contenteditable="true" class="rich-textarea input-field"></div></div>
        <div class="form-group"><label>✍️ 自己的筆記</label><div ref="personalNotesRef" contenteditable="true" class="rich-textarea input-field personal-box"></div></div>
        <div class="form-group"><label>🔗 關聯網址</label><div ref="associatedUrlsRef" contenteditable="true" class="rich-textarea input-field"></div></div>
      </div>

      <div class="actions"><button type="submit" class="submit-btn" :disabled="isSaving">💾 儲存筆記</button></div>
    </form>
  </div>
</template>

<style scoped>
.edit-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #334155; }
.header { margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
.back-btn { padding: 6px 15px; border-radius: 20px; border: 1px solid #ddd; background: white; cursor: pointer; }
.form-layout { display: flex; flex-direction: column; gap: 20px; }
.form-section { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
.form-section h3 { margin: 0 0 15px 0; font-size: 17px; border-bottom: 2px dashed #eee; padding-bottom: 8px; }
.link-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 14px; color: #64748b; }
.input-field { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; }
.rich-textarea { min-height: 150px; overflow-y: auto; }
.personal-box { background: #f0fdf4; }
.actions { display: flex; justify-content: flex-end; }
.submit-btn { background: #10b981; color: white; border: none; padding: 12px 40px; border-radius: 10px; font-weight: bold; cursor: pointer; }
:deep(.rich-textarea table) { width: 100%; border-collapse: collapse; }
:deep(.rich-textarea th), :deep(.rich-textarea td) { border: 1px solid #ddd; padding: 8px; }
@media (max-width: 600px) { .link-grid { grid-template-columns: 1fr; } }
</style>
