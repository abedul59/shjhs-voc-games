<script setup>
import { ref, computed, onMounted } from 'vue';

// 確保只有登入且有權限的管理者可以進入
definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const isLoading = ref(true);

const currentSubject = '刑法';
const totalLessons = 55;
const courseNotes = ref([]);

// 載入該科目的所有筆記
onMounted(async () => {
  isLoading.value = true;
  const { data, error } = await supabase
    .from('course_notes')
    .select('id, topic')
    .eq('subject', currentSubject);

  if (error) {
    console.error('載入筆記失敗:', error);
    alert('載入失敗，請檢查資料庫。');
  } else {
    courseNotes.value = data || [];
  }
  isLoading.value = false;
});

// 動態產生 55 堂課的網格資料
const gridItems = computed(() => {
  const grid = [];
  for (let i = 1; i <= totalLessons; i++) {
    const prefix = `第${i}講`;
    // 尋找是否有標題以 "第X講" 開頭的筆記
    const note = courseNotes.value.find(n => n.topic.startsWith(prefix));

    // 如果有資料，把 "第X講：" 這個前綴截掉，讓卡片只顯示乾淨的主題名稱
    let displayTopic = '尚未建立筆記';
    if (note) {
      const parts = note.topic.split(/：|:/);
      displayTopic = parts.length > 1 ? parts[1].trim() : note.topic;
    }

    grid.push({
      lessonNumber: i,
      id: note ? note.id : null,
      topic: displayTopic,
      hasData: !!note
    });
  }
  return grid;
});
</script>

<template>
  <div class="course-grid-container">
    <div class="header">
      <NuxtLink to="/admin/law-exam" class="back-btn">← 回司律專區</NuxtLink>
      <div class="title-area">
        <span class="subject-tag">{{ currentSubject }}</span>
        <h1>學分班筆記總覽 (共 {{ totalLessons }} 講)</h1>
      </div>
      <p class="subtitle">點擊格子即可閱讀 NotebookLM 匯出的筆記或新增資源。</p>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner">⏳</div>
      載入中，請稍候...
    </div>

    <div v-else class="grid-layout">
      <div 
        v-for="item in gridItems" 
        :key="item.lessonNumber"
        class="grid-card"
        :class="{ 'has-data': item.hasData, 'empty': !item.hasData }"
      >
        <div class="card-top">
          <span class="lesson-num">第 {{ item.lessonNumber }} 講</span>
          <span v-if="item.hasData" class="status-badge check">已完成</span>
          <span v-else class="status-badge pending">待填寫</span>
        </div>
        
        <h3 class="topic-title">
          {{ item.topic }}
        </h3>

        <div class="card-action">
          <NuxtLink 
            v-if="item.hasData" 
            :to="`/admin/law-exam/criminal-course/${item.id}`" 
            class="action-btn view-btn"
          >
            📖 閱讀筆記
          </NuxtLink>
          
          <NuxtLink 
            v-else 
            :to="`/admin/law-exam/criminal-course/edit?lesson=${item.lessonNumber}`" 
            class="action-btn add-btn"
          >
            ➕ 新增筆記
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-grid-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
  font-family: sans-serif;
}

/* --- Header 區域 --- */
.header {
  margin-bottom: 40px;
  text-align: center;
}

.back-btn {
  display: inline-block;
  padding: 8px 16px;
  background: white;
  color: #475569;
  text-decoration: none;
  border-radius: 20px;
  font-weight: bold;
  margin-bottom: 20px;
  border: 1px solid #cbd5e1;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.back-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #1e293b;
}

.title-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
}

.subject-tag {
  background: #be123c;
  color: white;
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 900;
  font-size: 15px;
}

.header h1 {
  margin: 0;
  color: #1e293b;
  font-size: 28px;
}

.subtitle {
  color: #64748b;
  font-size: 16px;
  margin: 0;
}

.loading-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
  font-size: 18px;
  font-weight: bold;
}

.spinner {
  font-size: 32px;
  margin-bottom: 15px;
  animation: pulse 1.5s infinite;
}

/* --- 網格佈局 --- */
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

/* --- 卡片設計 --- */
.grid-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

/* 有資料的卡片樣式 */
.grid-card.has-data {
  border-color: #bfdbfe;
  background: #f8fafc;
}

.grid-card.has-data:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 20px -5px rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
}

/* 空白待新增的卡片樣式 */
.grid-card.empty {
  border-style: dashed;
  background: #fafaf9;
}

.grid-card.empty:hover {
  border-color: #d97706;
  background: #fffbeb;
}

/* 卡片上半部 (標籤) */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.lesson-num {
  font-size: 14px;
  font-weight: 900;
  color: #334155;
  background: #e2e8f0;
  padding: 4px 10px;
  border-radius: 6px;
}

.status-badge {
  font-size: 12px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 12px;
}

.status-badge.check {
  background: #dcfce7;
  color: #059669;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

/* 卡片標題 */
.topic-title {
  font-size: 18px;
  color: #0f172a;
  margin: 0 0 25px 0;
  line-height: 1.5;
  flex-grow: 1; /* 推擠讓下方按鈕永遠貼底 */
}

.grid-card.empty .topic-title {
  color: #94a3b8;
  font-style: italic;
}

/* 下方按鈕區 */
.card-action {
  margin-top: auto;
}

.action-btn {
  display: block;
  width: 100%;
  text-align: center;
  padding: 12px;
  border-radius: 10px;
  font-weight: bold;
  text-decoration: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.view-btn {
  background: #3b82f6;
  color: white;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.view-btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.add-btn {
  background: white;
  color: #d97706;
  border: 1px solid #d97706;
}

.add-btn:hover {
  background: #fef3c7;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

@media (max-width: 600px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>
