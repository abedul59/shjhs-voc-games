<script setup>
import { ref, onMounted, nextTick } from 'vue';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const route = useRoute(); const router = useRouter(); const supabase = useSupabaseClient();
const isLoading = ref(true); const isSaving = ref(false); const activeTab = ref('basic');
const summaryRef = ref(null); const transcriptRef = ref(null); const personalRef = ref(null); const urlsRef = ref(null);

const form = ref({
  id: null, subject: '商事法', topic: '', introduction: '', class_video_link: '', notebook_audio_link: '', document_link: '', notebook_infographic_link: '', notebook_quiz_link: '', notebook_flashcard_link: '', notebook_overall_link: '', summary: '', transcript: '', personal_notes: '', associated_urls: ''
});

onMounted(async () => {
  if (route.query.id) {
    const { data } = await supabase.from('course_notes').select('*').eq('id', route.query.id).single();
    if (data) form.value = { ...data };
  } else if (route.query.lesson) form.value.topic = `第${route.query.lesson}講：`;
  isLoading.value = false; await nextTick(); syncEditorsToForm();
});

const syncEditorsToForm = () => {
  if (summaryRef.value) summaryRef.value.innerHTML = form.value.summary || '';
  if (transcriptRef.value) transcriptRef.value.innerHTML = form.value.transcript || '';
  if (personalRef.value) personalRef.value.innerHTML = form.value.personal_notes || '';
  if (urlsRef.value) urlsRef.value.innerHTML = form.value.associated_urls || '';
};

const handleSave = async () => {
  syncEditorsToForm(); 
  if (!form.value.topic.trim()) { alert('請填寫課程主題！'); return; }
  isSaving.value = true;
  const payload = { ...form.value };
  if (!payload.id) delete payload.id; 

  const { data, error } = await supabase.from('course_notes').upsert([payload], { onConflict: 'id' }).select().single();
  if (error) alert('儲存失敗：' + error.message);
  else { form.value.id = data.id; alert('✅ 儲存成功！'); }
  isSaving.value = false;
};

const switchTab = async (tabName) => { syncEditorsToForm(); activeTab.value = tabName; await nextTick(); syncEditorsToForm(); };
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
    <div v-if="isLoading" class="loading-state">載入中...</div>
    <div v-else class="form-body">
      <section v-show="activeTab === 'basic'" class="tab-content">
        <div class="form-section">
          <h3>課程基本資訊</h3>
          <div class="form-group"><label>主題(必填)</label><input v-model="form.topic" class="input-field" /></div>
          <div class="form-group"><label>簡介</label><textarea v-model="form.introduction" rows="2" class="input-field"></textarea></div>
        </div>
        <div class="form-section link-grid-section">
          <h3>🤖 NotebookLM 資源連結</h3>
          <div class="link-grid">
            <div class="form-group"><label>▶️ 影片摘要</label><input v-model="form.class_video_link" class="input-field"/></div>
            <div class="form-group"><label>🎧 聲音摘要</label><input v-model="form.notebook_audio_link" class="input-field"/></div>
            <div class="form-group"><label>📄 簡報</label><input v-model="form.document_link" class="input-field"/></div>
            <div class="form-group"><label>📊 資訊圖表</label><input v-model="form.notebook_infographic_link" class="input-field"/></div>
            <div class="form-group"><label>📝 測驗</label><input v-model="form.notebook_quiz_link" class="input-field"/></div>
            <div class="form-group"><label>📇 學習卡</label><input v-model="form.notebook_flashcard_link" class="input-field"/></div>
            <div class="form-group"><label>📁 整體資源</label><input v-model="form.notebook_overall_link" class="input-field"/></div>
          </div>
        </div>
        <div class="tab-actions"><button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存</button></div>
      </section>
      <section v-show="activeTab === 'ai'" class="tab-content">
        <div class="form-section">
          <h3>AI 生成文本</h3>
          <div class="form-group"><label>📝 摘要</label><div ref="summaryRef" contenteditable="true" class="rich-textarea input-field"></div></div>
          <div class="form-group"><label>📜 逐字稿</label><div ref="transcriptRef" contenteditable="true" class="rich-textarea input-field"></div></div>
        </div>
        <div class="tab-actions"><button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存</button></div>
      </section>
      <section v-show="activeTab === 'study'" class="tab-content">
        <div class="form-section">
          <h3>專屬學習筆記</h3>
          <div class="form-group"><label>✍️ 自己的筆記</label><div ref="personalRef" contenteditable="true" class="rich-textarea input-field personal-bg"></div></div>
          <div class="form-group"><label>🔗 關聯網址</label><div ref="urlsRef" contenteditable="true" class="rich-textarea input-field"></div></div>
        </div>
        <div class="tab-actions"><button @click="handleSave" class="save-btn" :disabled="isSaving">💾 儲存</button></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.edit-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.header { margin-bottom: 20px; }
.back-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #ddd; background: white; cursor: pointer; font-weight: bold;}
.title-wrap { display: flex; align-items: center; gap: 15px; margin-top: 10px;}
.header h1 { margin: 0; font-size: 24px; color: #1e293b; }
.subject-tag { background: #0f766e; color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px;}
.tabs-nav { display: flex; gap: 5px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
.tabs-nav button { padding: 12px 24px; border: none; background: #f1f5f9; font-weight: bold; border-radius: 10px 10px 0 0; cursor: pointer;}
.tabs-nav button.active { background: #0f766e; color: white; }
.form-section { background: white; padding: 25px; border-radius: 15px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
.form-section h3 { margin: 0 0 20px 0; border-left: 5px solid #0f766e; padding-left: 12px; }
.link-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; font-size: 14px; }
.input-field { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; box-sizing: border-box; background: #fff;}
.rich-textarea { min-height: 250px; overflow-y: auto; }
.personal-bg { background: #f0fdfa; border-color: #5eead4; }
:deep(table) { width: 100%; border-collapse: collapse; margin: 10px 0; }
:deep(td), :deep(th) { border: 1px solid #cbd5e1; padding: 8px; }
.tab-actions { display: flex; justify-content: flex-end; padding-bottom: 40px; }
.save-btn { background: #10b981; color: white; border: none; padding: 15px 40px; border-radius: 12px; font-weight: bold; cursor: pointer; }
.loading-state { text-align: center; padding: 100px; font-weight: bold; }
</style>
