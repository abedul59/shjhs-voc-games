<script setup>
import { ref, onMounted, computed } from 'vue';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const supabase = useSupabaseClient();

const noteData = ref(null);
const isLoading = ref(true);
const activeTab = ref('summary'); 

onMounted(async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('course_notes').select('*').eq('id', route.params.id).single();
  if (data) noteData.value = data;
  isLoading.value = false;
});

// 🌟 解析複數筆記 JSON
const parsedPersonalNotes = computed(() => {
  if (!noteData.value || !noteData.value.personal_notes) return [];
  try {
    const parsed = JSON.parse(noteData.value.personal_notes);
    // 過濾掉全空的筆記
    const validNotes = (Array.isArray(parsed) ? parsed : [noteData.value.personal_notes]).filter(n => n.trim() !== '');
    return validNotes;
  } catch (e) {
    return noteData.value.personal_notes.trim() ? [noteData.value.personal_notes] : [];
  }
});

const openPortal = (url) => {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
};
</script>

<template>
  <div class="reader-container">
    <div v-if="isLoading" class="loading-overlay">載入中...</div>

    <template v-else-if="noteData">
      <div class="reader-header">
        <div class="nav-bar">
          <NuxtLink to="/admin/law-exam/civil-course" class="btn-back">← 回課程列表</NuxtLink>
          <NuxtLink :to="`/admin/law-exam/civil-course/edit?id=${noteData.id}`" class="btn-edit">⚙️ 編輯內容</NuxtLink>
        </div>
        <div class="title-section">
          <span class="subject-label">{{ noteData.subject }}學分班</span>
          <h1>{{ noteData.topic }}</h1>
        </div>
      </div>

      <div class="content-layout">
        <main class="text-area">
          <section v-if="noteData.introduction" class="intro-card"><p>{{ noteData.introduction }}</p></section>

          <div class="tabs-nav">
            <button :class="{ active: activeTab === 'summary' }" @click="activeTab = 'summary'">📝 重點摘要</button>
            <button :class="{ active: activeTab === 'transcript' }" @click="activeTab = 'transcript'">📜 逐字稿</button>
            <button :class="{ active: activeTab === 'personal' }" @click="activeTab = 'personal'">✍️ 自己的筆記</button>
            <button :class="{ active: activeTab === 'urls' }" @click="activeTab = 'urls'">🔗 關聯網址</button>
          </div>

          <div class="reading-window">
            <div v-show="activeTab === 'summary'" class="formatted-rich-text"><div v-html="noteData.summary || '<p class=empty-hint>尚未新增摘要</p>'"></div></div>
            <div v-show="activeTab === 'transcript'" class="formatted-rich-text transcript-font"><div v-html="noteData.transcript || '<p class=empty-hint>尚未新增逐字稿</p>'"></div></div>
            
            <div v-show="activeTab === 'personal'" class="formatted-rich-text personal-font">
              <div v-if="parsedPersonalNotes.length === 0" class="empty-hint">尚未新增筆記</div>
              <div v-else class="notes-stack">
                <div v-for="(note, index) in parsedPersonalNotes" :key="index" class="note-display-card">
                  <div class="note-badge">筆記 {{ index + 1 }}</div>
                  <div class="note-content" v-html="note"></div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'urls'" class="formatted-rich-text urls-font"><div v-html="noteData.associated_urls || '<p class=empty-hint>尚未新增網址</p>'"></div></div>
          </div>
        </main>

        <aside class="portal-sidebar">
          <div class="portal-group">
            <h3>🤖 NotebookLM 資源</h3>
            <div class="portal-list">
              <button class="portal-btn" :disabled="!noteData.class_video_link" @click="openPortal(noteData.class_video_link)"><span class="icon">▶️</span><div class="label"><strong>影片摘要</strong></div></button>
              <button class="portal-btn" :disabled="!noteData.notebook_audio_link" @click="openPortal(noteData.notebook_audio_link)"><span class="icon">🎧</span><div class="label"><strong>聲音摘要</strong></div></button>
              <button class="portal-btn" :disabled="!noteData.document_link" @click="openPortal(noteData.document_link)"><span class="icon">📄</span><div class="label"><strong>NotebookLM簡報</strong></div></button>
              <button class="portal-btn" :disabled="!noteData.notebook_infographic_link" @click="openPortal(noteData.notebook_infographic_link)"><span class="icon">📊</span><div class="label"><strong>資訊圖表</strong></div></button>
              <button class="portal-btn" :disabled="!noteData.notebook_quiz_link" @click="openPortal(noteData.notebook_quiz_link)"><span class="icon">📝</span><div class="label"><strong>測驗 Quiz</strong></div></button>
              <button class="portal-btn" :disabled="!noteData.notebook_flashcard_link" @click="openPortal(noteData.notebook_flashcard_link)"><span class="icon">📇</span><div class="label"><strong>學習卡</strong></div></button>
              <button class="portal-btn" :disabled="!noteData.notebook_overall_link" @click="openPortal(noteData.notebook_overall_link)"><span class="icon">📁</span><div class="label"><strong>整體資源</strong></div></button>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reader-container { max-width: 1400px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #1e293b; }
.nav-bar { display: flex; justify-content: space-between; margin-bottom: 20px; }
.btn-back, .btn-edit { text-decoration: none; font-weight: bold; font-size: 14px; padding: 8px 16px; border-radius: 8px; }
.btn-back { background: #f1f5f9; color: #475569; }
.btn-edit { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
.subject-label { background: #1e3a8a; color: white; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 900; }
.title-section h1 { margin: 10px 0 0 0; font-size: 32px; color: #0f172a; }
.content-layout { display: grid; grid-template-columns: 1fr 300px; gap: 30px; align-items: start; }
.intro-card { background: #fffbeb; border-left: 6px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 25px; }

.tabs-nav { display: flex; gap: 5px; flex-wrap: wrap;}
.tabs-nav button { padding: 12px 20px; border: none; background: #e2e8f0; color: #64748b; font-weight: 900; cursor: pointer; border-radius: 12px 12px 0 0; }
.tabs-nav button.active { background: white; color: #1e3a8a; border-top: 3px solid #1e3a8a; }

.reading-window { background: white; border: 1px solid #e2e8f0; border-radius: 0 12px 12px 12px; padding: 40px; min-height: 600px; }
.formatted-rich-text { line-height: 1.8; font-size: 17px; color: #334155; }
:deep(.formatted-rich-text table) { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #cbd5e1; }
:deep(.formatted-rich-text th), :deep(.formatted-rich-text td) { border: 1px solid #cbd5e1; padding: 12px; }
.empty-hint { color: #94a3b8; font-style: italic; text-align: center; }

/* 🌟 複數筆記閱讀區樣式 */
.notes-stack { display: flex; flex-direction: column; gap: 25px; }
.note-display-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 25px; position: relative;}
.note-badge { position: absolute; top: -12px; left: 20px; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);}
.note-content { margin-top: 5px; }

/* 確保連結換行 */
:deep(.urls-font a) { color: #2563eb; word-break: break-all; }

.portal-sidebar { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; position: sticky; top: 20px; }
.portal-group h3 { margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;}
.portal-list { display: flex; flex-direction: column; gap: 8px; }
.portal-btn { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #cbd5e1; background: white; border-radius: 10px; cursor: pointer; transition: 0.2s; }
.portal-btn .icon { font-size: 22px; }
.portal-btn:hover:not(:disabled) { border-color: #1e3a8a; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.portal-btn:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 1000px) { .content-layout { grid-template-columns: 1fr; } .portal-sidebar { position: static; } }
@media (max-width: 600px) { .reading-window { padding: 20px; } }
</style>
