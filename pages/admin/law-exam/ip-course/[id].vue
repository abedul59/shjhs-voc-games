<script setup>
import { ref, onMounted } from 'vue';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const route = useRoute(); const supabase = useSupabaseClient();
const noteData = ref(null); const isLoading = ref(true); const activeTab = ref('summary'); 

onMounted(async () => {
  const { data } = await supabase.from('course_notes').select('*').eq('id', route.params.id).single();
  if (data) noteData.value = data;
  isLoading.value = false;
});
const openPortal = (url) => { if (url) window.open(url, '_blank'); };
</script>

<template>
  <div class="reader-container">
    <div v-if="isLoading" class="loading-overlay">載入中...</div>
    <template v-else-if="noteData">
      <div class="reader-header">
        <div class="nav-bar">
          <NuxtLink to="/admin/law-exam/ip-course" class="btn-back">← 回列表</NuxtLink>
          <NuxtLink :to="`/admin/law-exam/ip-course/edit?id=${noteData.id}`" class="btn-edit">⚙️ 編輯</NuxtLink>
        </div>
        <div class="title-section"><span class="subject-label">{{ noteData.subject }}學分班</span><h1>{{ noteData.topic }}</h1></div>
      </div>
      <div class="content-layout">
        <main class="text-area">
          <section v-if="noteData.introduction" class="intro-card"><p>{{ noteData.introduction }}</p></section>
          <div class="tabs-nav">
            <button :class="{ active: activeTab === 'summary' }" @click="activeTab = 'summary'">📝 摘要</button>
            <button :class="{ active: activeTab === 'transcript' }" @click="activeTab = 'transcript'">📜 逐字稿</button>
            <button :class="{ active: activeTab === 'personal' }" @click="activeTab = 'personal'">✍️ 筆記</button>
            <button :class="{ active: activeTab === 'urls' }" @click="activeTab = 'urls'">🔗 網址</button>
          </div>
          <div class="reading-window">
            <div v-show="activeTab === 'summary'" class="formatted-rich-text"><div v-html="noteData.summary || '尚未新增'"></div></div>
            <div v-show="activeTab === 'transcript'" class="formatted-rich-text"><div v-html="noteData.transcript || '尚未新增'"></div></div>
            <div v-show="activeTab === 'personal'" class="formatted-rich-text"><div v-html="noteData.personal_notes || '尚未新增'"></div></div>
            <div v-show="activeTab === 'urls'" class="formatted-rich-text urls-font"><div v-html="noteData.associated_urls || '尚未新增'"></div></div>
          </div>
        </main>
        <aside class="portal-sidebar">
          <div class="portal-group">
            <h3>🤖 NotebookLM 資源</h3>
            <div class="portal-list">
              <button class="portal-btn" :disabled="!noteData.class_video_link" @click="openPortal(noteData.class_video_link)"><span class="icon">▶️</span><strong>影片摘要</strong></button>
              <button class="portal-btn" :disabled="!noteData.notebook_audio_link" @click="openPortal(noteData.notebook_audio_link)"><span class="icon">🎧</span><strong>聲音摘要</strong></button>
              <button class="portal-btn" :disabled="!noteData.document_link" @click="openPortal(noteData.document_link)"><span class="icon">📄</span><strong>簡報</strong></button>
              <button class="portal-btn" :disabled="!noteData.notebook_infographic_link" @click="openPortal(noteData.notebook_infographic_link)"><span class="icon">📊</span><strong>資訊圖表</strong></button>
              <button class="portal-btn" :disabled="!noteData.notebook_quiz_link" @click="openPortal(noteData.notebook_quiz_link)"><span class="icon">📝</span><strong>測驗</strong></button>
              <button class="portal-btn" :disabled="!noteData.notebook_flashcard_link" @click="openPortal(noteData.notebook_flashcard_link)"><span class="icon">📇</span><strong>學習卡</strong></button>
              <button class="portal-btn" :disabled="!noteData.notebook_overall_link" @click="openPortal(noteData.notebook_overall_link)"><span class="icon">📁</span><strong>整體資源</strong></button>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reader-container { max-width: 1400px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.nav-bar { display: flex; justify-content: space-between; margin-bottom: 20px; }
.btn-back, .btn-edit { padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; }
.btn-back { background: #f1f5f9; color: #475569; }
.btn-edit { background: #f5f3ff; color: #7c3aed; border: 1px solid #c4b5fd; }
.subject-label { background: #7c3aed; color: white; padding: 4px 12px; border-radius: 6px; font-weight: bold; }
.content-layout { display: grid; grid-template-columns: 1fr 300px; gap: 30px; }
.intro-card { background: #fffbeb; border-left: 6px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
.tabs-nav { display: flex; gap: 5px; }
.tabs-nav button { padding: 12px 20px; border: none; background: #e2e8f0; font-weight: bold; border-radius: 12px 12px 0 0; cursor: pointer; }
.tabs-nav button.active { background: white; color: #7c3aed; border-top: 3px solid #7c3aed; }
.reading-window { background: white; border: 1px solid #e2e8f0; padding: 40px; min-height: 500px; }
.formatted-rich-text { line-height: 1.8; font-size: 16px; }
:deep(.formatted-rich-text table) { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #cbd5e1; }
:deep(.formatted-rich-text th), :deep(.formatted-rich-text td) { border: 1px solid #cbd5e1; padding: 12px; }
.urls-font a { color: #2563eb; word-break: break-all; }
.portal-sidebar { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; position: sticky; top: 20px; }
.portal-group h3 { border-bottom: 2px solid #7c3aed; padding-bottom: 8px; margin-bottom: 15px;}
.portal-list { display: flex; flex-direction: column; gap: 8px; }
.portal-btn { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #cbd5e1; background: white; border-radius: 10px; cursor: pointer; }
.portal-btn:hover:not(:disabled) { border-color: #7c3aed; }
.portal-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
