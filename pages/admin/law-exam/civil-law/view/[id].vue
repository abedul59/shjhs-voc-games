<script setup>
import { ref, onMounted } from 'vue';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const supabase = useSupabaseClient();
const noteData = ref(null);
const isLoading = ref(true);
const activeTextTab = ref('summary'); 

onMounted(async () => {
  const { data, error } = await supabase.from('course_notes').select('*').eq('id', route.params.id).single();
  if (data) noteData.value = data;
  if (error) alert('載入失敗，可能資料不存在。');
  isLoading.value = false;
});

const openLink = (url) => {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
};
</script>

<template>
  <div class="course-portal-container">
    <div v-if="isLoading" class="loading">載入中...</div>
    
    <div v-else-if="noteData">
      <div class="header">
        <div class="header-actions">
          <NuxtLink to="/admin/law-exam/civil-law" class="back-btn">← 回課程列表</NuxtLink>
          <NuxtLink :to="`/admin/law-exam/civil-law/edit?id=${noteData.id}`" class="edit-btn">⚙️ 編輯此筆記</NuxtLink>
        </div>
        <div class="title-area">
          <span class="subject-tag">{{ noteData.subject }}</span>
          <h1>{{ noteData.topic }}</h1>
        </div>
      </div>

      <div class="layout-grid">
        <div class="text-section">
          <div v-if="noteData.introduction" class="intro-box">
            <h3>📌 課程簡介</h3>
            <p>{{ noteData.introduction }}</p>
          </div>

          <div class="content-tabs">
            <button :class="{ active: activeTextTab === 'summary' }" @click="activeTextTab = 'summary'">📝 AI 文字摘要</button>
            <button :class="{ active: activeTextTab === 'transcript' }" @click="activeTextTab = 'transcript'">📜 完整逐字稿</button>
          </div>
          
          <div class="content-reader">
            <div v-if="activeTextTab === 'summary'" class="reader-text">
              {{ noteData.summary || '尚無摘要內容。' }}
            </div>
            <div v-if="activeTextTab === 'transcript'" class="reader-text">
              {{ noteData.transcript || '尚無逐字稿內容。' }}
            </div>
          </div>
        </div>

        <div class="portal-section">
          <h3>🚀 資源傳送門</h3>
          <p class="portal-desc">點擊下方按鈕，開啟外部學習資源。</p>

          <div class="portal-cards">
            <div class="portal-card" :class="{ 'disabled': !noteData.class_video_link }">
              <div class="card-icon">▶️</div>
              <div class="card-info">
                <h4>課程原始影片</h4>
                <p>觀看老師上課實況</p>
              </div>
              <button class="action-btn" :disabled="!noteData.class_video_link" @click="openLink(noteData.class_video_link)">
                {{ noteData.class_video_link ? '立即觀看' : '無資源' }}
              </button>
            </div>

            <div class="portal-card" :class="{ 'disabled': !noteData.notebook_audio_link }">
              <div class="card-icon">🎧</div>
              <div class="card-info">
                <h4>NotebookLM 聲音摘要</h4>
                <p>Podcast 重點精華</p>
              </div>
              <button class="action-btn" :disabled="!noteData.notebook_audio_link" @click="openLink(noteData.notebook_audio_link)">
                {{ noteData.notebook_audio_link ? '立即收聽' : '無資源' }}
              </button>
            </div>

            <div class="portal-card" :class="{ 'disabled': !noteData.document_link }">
              <div class="card-icon">📄</div>
              <div class="card-info">
                <h4>課程講義與筆記</h4>
                <p>原始參考檔案</p>
              </div>
              <button class="action-btn" :disabled="!noteData.document_link" @click="openLink(noteData.document_link)">
                {{ noteData.document_link ? '開啟講義' : '無資源' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-portal-container { max-width: 1200px; margin: 0 auto; padding: 30px; font-family: sans-serif; color: #334155; }
.loading { text-align: center; padding: 50px; font-size: 18px; color: #64748b; font-weight: bold;}
.header { margin-bottom: 30px; }
.header-actions { display: flex; justify-content: space-between; margin-bottom: 15px;}
.back-btn, .edit-btn { padding: 8px 16px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 8px; font-weight: bold; transition: 0.2s;}
.back-btn:hover { background: #e2e8f0; }
.edit-btn { background: #e0e7ff; color: #4f46e5; border: 1px solid #c7d2fe;}
.edit-btn:hover { background: #c7d2fe; }

.title-area { display: flex; align-items: center; gap: 15px; }
.subject-tag { background: #1e3a8a; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; }
.header h1 { margin: 0; color: #1e293b; font-size: 28px; line-height: 1.3;}

.layout-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }

/* 左側文字區 */
.intro-box { background: #fffbeb; padding: 20px; border-radius: 12px; border-left: 5px solid #fbbf24; margin-bottom: 20px; }
.intro-box h3 { margin: 0 0 10px 0; color: #b45309; font-size: 16px; }
.intro-box p { margin: 0; line-height: 1.6; }

.content-tabs { display: flex; gap: 5px; }
.content-tabs button { padding: 12px 24px; background: #e2e8f0; color: #64748b; border: none; border-radius: 12px 12px 0 0; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.2s; }
.content-tabs button.active { background: white; color: #3b82f6; border-top: 3px solid #3b82f6; }
.content-reader { background: white; border: 1px solid #e2e8f0; border-radius: 0 12px 12px 12px; padding: 30px; height: 60vh; overflow-y: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.reader-text { white-space: pre-wrap; line-height: 1.8; font-size: 16px; }

/* 右側傳送門 */
.portal-section { background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; height: fit-content;}
.portal-section h3 { margin: 0 0 5px 0; color: #1e293b; }
.portal-desc { font-size: 14px; color: #64748b; margin-bottom: 20px; }
.portal-cards { display: flex; flex-direction: column; gap: 15px; }
.portal-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #cbd5e1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; transition: 0.2s; }
.portal-card:hover:not(.disabled) { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #94a3b8; }
.portal-card.disabled { opacity: 0.6; background: #f1f5f9; }
.card-icon { font-size: 36px; }
.card-info h4 { margin: 0 0 5px 0; font-size: 16px; color: #1e293b; }
.card-info p { margin: 0; font-size: 13px; color: #64748b; }
.action-btn { width: 100%; padding: 10px; background: #1e293b; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; margin-top: 5px; }
.action-btn:hover:not(:disabled) { background: #3b82f6; }
.action-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

@media (max-width: 900px) { .layout-grid { grid-template-columns: 1fr; } .content-reader { height: 400px;} }
</style>
