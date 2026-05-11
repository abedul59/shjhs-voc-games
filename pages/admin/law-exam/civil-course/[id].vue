<script setup>
import { ref, onMounted } from 'vue';

// 確保權限驗證
definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const supabase = useSupabaseClient();

const noteData = ref(null);
const isLoading = ref(true);
const activeTab = ref('summary'); // 預設顯示摘要

onMounted(async () => {
  isLoading.value = true;
  // 根據網址列的 ID 取得特定筆記資料
  const { data, error } = await supabase
    .from('course_notes')
    .select('*')
    .eq('id', route.params.id)
    .single();

  if (data) {
    noteData.value = data;
  }
  
  if (error) {
    console.error('載入失敗:', error);
    alert('找不到該筆記內容，請回列表重試。');
  }
  isLoading.value = false;
});

// 開啟外部資源的輔助函式
const openPortal = (url) => {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
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
            <button 
              :class="{ active: activeTab === 'summary' }" 
              @click="activeTab = 'summary'"
            >
              📝 重點摘要
            </button>
            <button 
              :class="{ active: activeTab === 'transcript' }" 
              @click="activeTab = 'transcript'"
            >
              📜 完整逐字稿
            </button>
          </div>

          <div class="reading-window">
            <div v-if="activeTab === 'summary'" class="formatted-text">
              <template v-if="noteData.summary">
                {{ noteData.summary }}
              </template>
              <p v-else class="empty-hint">（尚未新增摘要內容）</p>
            </div>
            
            <div v-if="activeTab === 'transcript'" class="formatted-text transcript-font">
              <template v-if="noteData.transcript">
                {{ noteData.transcript }}
              </template>
              <p v-else class="empty-hint">（尚未新增逐字稿內容）</p>
            </div>
          </div>
        </main>

        <aside class="portal-sidebar">
          <div class="portal-header">
            <h3>🚀 資源傳送門</h3>
            <p>快速開啟 NotebookLM 與多媒體連結</p>
          </div>

          <div class="portal-list">
            <button 
              class="portal-btn video" 
              :disabled="!noteData.class_video_link"
              @click="openPortal(noteData.class_video_link)"
            >
              <span class="icon">▶️</span>
              <div class="label">
                <strong>影片摘要</strong>
                <span>{{ noteData.class_video_link ? '立即觀看' : '尚未提供連結' }}</span>
              </div>
            </button>

            <button 
              class="portal-btn audio" 
              :disabled="!noteData.notebook_audio_link"
              @click="openPortal(noteData.notebook_audio_link)"
            >
              <span class="icon">🎧</span>
              <div class="label">
                <strong>聲音摘要 (Podcast)</strong>
                <span>{{ noteData.notebook_audio_link ? '立即收聽' : '尚未提供連結' }}</span>
              </div>
            </button>

            <button 
              class="portal-btn document" 
              :disabled="!noteData.document_link"
              @click="openPortal(noteData.document_link)"
            >
              <span class="icon">📄</span>
              <div class="label">
                <strong>NotebookLM簡報</strong>
                <span>{{ noteData.document_link ? '開啟簡報' : '尚未提供連結' }}</span>
              </div>
            </button>
          </div>

          <div class="sidebar-footer">
            最後更新於：{{ new Date(noteData.updated_at || noteData.created_at).toLocaleDateString() }}
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reader-container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  color: #1e293b;
}

/* --- Header --- */
.reader-header {
  margin-bottom: 30px;
}
.nav-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.btn-back, .btn-edit {
  text-decoration: none;
  font-weight: bold;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 8px;
  transition: 0.2s;
}
.btn-back { background: #f1f5f9; color: #475569; }
.btn-back:hover { background: #e2e8f0; }
.btn-edit { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
.btn-edit:hover { background: #c7d2fe; }

.subject-label {
  background: #1e3a8a;
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 900;
}
.title-section h1 {
  margin: 10px 0 0 0;
  font-size: 32px;
  color: #0f172a;
}

/* --- Layout --- */
.content-layout {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 30px;
  align-items: start;
}

/* --- 文字區 --- */
.intro-card {
  background: #fffbeb;
  border-left: 6px solid #f59e0b;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 25px;
}
.intro-card h3 { margin: 0 0 8px 0; font-size: 16px; color: #92400e; }
.intro-card p { margin: 0; line-height: 1.6; font-size: 15px; color: #78350f; }

.tabs-nav {
  display: flex;
  gap: 8px;
}
.tabs-nav button {
  padding: 12px 25px;
  border: none;
  background: #e2e8f0;
  color: #64748b;
  font-weight: 900;
  cursor: pointer;
  border-radius: 12px 12px 0 0;
  transition: 0.2s;
}
.tabs-nav button.active {
  background: white;
  color: #1e3a8a;
  border-top: 3px solid #1e3a8a;
}

.reading-window {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0 12px 12px 12px;
  padding: 40px;
  min-height: 600px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
}
.formatted-text {
  white-space: pre-wrap;
  line-height: 2;
  font-size: 17px;
  letter-spacing: 0.5px;
}
.transcript-font {
  font-size: 16px;
  color: #334155;
}
.empty-hint { color: #94a3b8; font-style: italic; text-align: center; margin-top: 50px; }

/* --- 傳送門 Sidebar --- */
.portal-sidebar {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 25px;
  position: sticky;
  top: 20px;
}
.portal-header h3 { margin: 0; font-size: 20px; }
.portal-header p { margin: 5px 0 20px 0; font-size: 13px; color: #64748b; }

.portal-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.portal-btn {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 18px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 15px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.portal-btn .icon { font-size: 28px; }
.portal-btn .label strong { display: block; font-size: 15px; margin-bottom: 2px; }
.portal-btn .label span { font-size: 12px; color: #64748b; }

.portal-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  border-color: #1e3a8a;
}
.portal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f1f5f9;
}

.sidebar-footer {
  margin-top: 30px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
}

/* --- Loading --- */
.loading-overlay { text-align: center; padding: 100px; color: #64748b; }
.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1e3a8a;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 1000px) {
  .content-layout { grid-template-columns: 1fr; }
  .portal-sidebar { position: static; }
}
</style>
