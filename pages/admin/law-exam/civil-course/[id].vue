<script setup>
import { ref, onMounted } from 'vue';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const supabase = useSupabaseClient();

const noteData = ref(null);
const isLoading = ref(true);
const activeTab = ref('summary'); // 預設顯示摘要

onMounted(async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('course_notes').select('*').eq('id', route.params.id).single();

  if (data) noteData.value = data;
  if (error) alert('找不到該筆記內容，請回列表重試。');
  isLoading.value = false;
});

const openPortal = (url) => {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
};
</script>

<template>
  <div class="reader-container">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loader"></div>
      <p>正在從雲端讀取筆記...</p>
    </div>

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
          <section v-if="noteData.introduction" class="intro-card">
            <h3>📌 課程簡介</h3>
            <p>{{ noteData.introduction }}</p>
          </section>

          <div class="tabs-nav">
            <button :class="{ active: activeTab === 'summary' }" @click="activeTab = 'summary'">📝 重點摘要</button>
            <button :class="{ active: activeTab === 'transcript' }" @click="activeTab = 'transcript'">📜 逐字稿</button>
            <button :class="{ active: activeTab === 'personal' }" @click="activeTab = 'personal'">✍️ 自己的筆記</button>
            <button :class="{ active: activeTab === 'urls' }" @click="activeTab = 'urls'">🔗 關聯網址</button>
          </div>

          <div class="reading-window">
            <div v-show="activeTab === 'summary'" class="formatted-rich-text">
              <div v-if="noteData.summary" v-html="noteData.summary"></div>
              <p v-else class="empty-hint">（尚未新增摘要內容）</p>
            </div>
            
            <div v-show="activeTab === 'transcript'" class="formatted-rich-text transcript-font">
              <div v-if="noteData.transcript" v-html="noteData.transcript"></div>
              <p v-else class="empty-hint">（尚未新增逐字稿內容）</p>
            </div>

            <div v-show="activeTab === 'personal'" class="formatted-rich-text personal-font">
              <div v-if="noteData.personal_notes" v-html="noteData.personal_notes"></div>
              <p v-else class="empty-hint">（尚未新增專屬筆記）</p>
            </div>

            <div v-show="activeTab === 'urls'" class="formatted-rich-text urls-font">
              <div v-if="noteData.associated_urls" v-html="noteData.associated_urls"></div>
              <p v-else class="empty-hint">（尚未新增關聯網址）</p>
            </div>
          </div>
        </main>

        <aside class="portal-sidebar">
          
          <div class="portal-group">
            <h3>🎬 影音與講義</h3>
            <div class="portal-list">
              <button class="portal-btn" :disabled="!noteData.class_video_link" @click="openPortal(noteData.class_video_link)">
                <span class="icon">▶️</span>
                <div class="label"><strong>影片摘要</strong></div>
              </button>
              <button class="portal-btn" :disabled="!noteData.notebook_audio_link" @click="openPortal(noteData.notebook_audio_link)">
                <span class="icon">🎧</span>
                <div class="label"><strong>聲音摘要</strong></div>
              </button>
              <button class="portal-btn" :disabled="!noteData.document_link" @click="openPortal(noteData.document_link)">
                <span class="icon">📄</span>
                <div class="label"><strong>NotebookLM簡報</strong></div>
              </button>
            </div>
          </div>

          <div class="portal-group" style="margin-top: 25px;">
            <h3>🤖 NotebookLM 資源</h3>
            <div class="portal-list small-list">
              <button class="portal-btn small-btn" :disabled="!noteData.notebook_infographic_link" @click="openPortal(noteData.notebook_infographic_link)">
                <span class="icon">📊</span><div class="label"><strong>資訊圖表</strong></div>
              </button>
              <button class="portal-btn small-btn" :disabled="!noteData.notebook_quiz_link" @click="openPortal(noteData.notebook_quiz_link)">
                <span class="icon">📝</span><div class="label"><strong>測驗 Quiz</strong></div>
              </button>
              <button class="portal-btn small-btn" :disabled="!noteData.notebook_flashcard_link" @click="openPortal(noteData.notebook_flashcard_link)">
                <span class="icon">📇</span><div class="label"><strong>學習卡</strong></div>
              </button>
              <button class="portal-btn small-btn" :disabled="!noteData.notebook_overall_link" @click="openPortal(noteData.notebook_overall_link)">
                <span class="icon">📁</span><div class="label"><strong>整體資源</strong></div>
              </button>
            </div>
          </div>

          <div class="sidebar-footer">
            更新於：{{ new Date(noteData.updated_at || noteData.created_at).toLocaleDateString() }}
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reader-container { max-width: 1400px; margin: 0 auto; padding: 20px; font-family: sans-serif; color: #1e293b; }
.reader-header { margin-bottom: 30px; }
.nav-bar { display: flex; justify-content: space-between; margin-bottom: 20px; }
.btn-back, .btn-edit { text-decoration: none; font-weight: bold; font-size: 14px; padding: 8px 16px; border-radius: 8px; }
.btn-back { background: #f1f5f9; color: #475569; }
.btn-edit { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
.subject-label { background: #1e3a8a; color: white; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 900; }
.title-section h1 { margin: 10px 0 0 0; font-size: 32px; color: #0f172a; }
.content-layout { display: grid; grid-template-columns: 1fr 320px; gap: 30px; align-items: start; }

.intro-card { background: #fffbeb; border-left: 6px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 25px; }
.intro-card h3 { margin: 0 0 8px 0; font-size: 16px; color: #92400e; }
.intro-card p { margin: 0; line-height: 1.6; font-size: 15px; color: #78350f; }

.tabs-nav { display: flex; gap: 5px; flex-wrap: wrap;}
.tabs-nav button { padding: 12px 20px; border: none; background: #e2e8f0; color: #64748b; font-weight: 900; cursor: pointer; border-radius: 12px 12px 0 0; }
.tabs-nav button.active { background: white; color: #1e3a8a; border-top: 3px solid #1e3a8a; }
.reading-window { background: white; border: 1px solid #e2e8f0; border-radius: 0 12px 12px 12px; padding: 40px; min-height: 600px; }
.empty-hint { color: #94a3b8; font-style: italic; text-align: center; margin-top: 50px; }

/* Rich Text 渲染專屬樣式 */
.formatted-rich-text { line-height: 1.8; font-size: 17px; color: #334155; }
.transcript-font { font-size: 15px; }
.personal-font { font-size: 16px; color: #064e3b; } /* 自己的筆記文字微調顏色區分 */
.urls-font a { color: #2563eb; text-decoration: underline; word-break: break-all; } /* 網址強制換行防破版 */

:deep(.formatted-rich-text table) { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px; background-color: white; }
:deep(.formatted-rich-text th) { background-color: #f1f5f9; font-weight: bold; text-align: left; color: #1e293b; padding: 12px 15px; border: 1px solid #cbd5e1;}
:deep(.formatted-rich-text td) { border: 1px solid #cbd5e1; padding: 12px 15px; }
:deep(.formatted-rich-text tr:nth-child(even)) { background-color: #f8fafc; }

/* 右側 Sidebar */
.portal-sidebar { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; position: sticky; top: 20px; }
.portal-group h3 { margin: 0 0 15px 0; font-size: 18px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;}
.portal-list { display: flex; flex-direction: column; gap: 10px; }
.small-list { gap: 8px; } /* 新資源按鈕稍微靠緊一點 */

.portal-btn { display: flex; align-items: center; gap: 15px; padding: 15px; border: 1px solid #cbd5e1; background: white; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; }
.portal-btn .icon { font-size: 24px; }
.portal-btn .label strong { display: block; font-size: 15px; color: #1e293b; }

.small-btn { padding: 10px 15px; } /* 新資源按鈕小一點 */
.small-btn .icon { font-size: 20px; }
.small-btn .label strong { font-size: 14px; }

.portal-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 12px -3px rgba(0,0,0,0.1); border-color: #1e3a8a; }
.portal-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #f1f5f9; }

.sidebar-footer { margin-top: 25px; text-align: center; font-size: 12px; color: #94a3b8; }
.loading-overlay { text-align: center; padding: 100px; color: #64748b; }
.loader { border: 4px solid #f3f3f3; border-top: 4px solid #1e3a8a; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 1000px) { .content-layout { grid-template-columns: 1fr; } .portal-sidebar { position: static; } }
</style>
