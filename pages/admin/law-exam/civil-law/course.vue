<script setup>
import { ref, onMounted, computed } from 'vue';

// 假設您的全域認證 middleware 叫做 auth 與 law-auth
definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const isLoading = ref(true);

// 定義本頁面的科目
const currentSubject = '民法';
const totalLessons = 55;

// 儲存從資料庫抓回來的真實資料
const courseNotes = ref([]);

// 產生 1~55 堂課的網格資料，並將真實資料對應進去
const gridItems = computed(() => {
  const grid = [];
  for (let i = 1; i <= totalLessons; i++) {
    // 尋找資料庫中是否有這堂課的資料 (利用 title 中是否包含 "第 i 講" 來粗略判斷，
    // 實務上建議資料庫多一個 lesson_number 欄位會更精準，這邊先用 topic 比對)
    // 為了精準，我們強制規定 topic 的格式必須是 "第X講：主題"
    const prefix = `第${i}講`;
    const note = courseNotes.value.find(n => n.topic.startsWith(prefix));

    grid.push({
      lessonNumber: i,
      id: note ? note.id : null,
      topic: note ? note.topic.replace(`${prefix}：`, '').replace(`${prefix}:`, '').trim() : '',
      hasData: !!note
    });
  }
  return grid;
});

// 載入資料
const fetchNotes = async () => {
  isLoading.value = true;
  const { data, error } = await supabase
    .from('course_notes')
    .select('id, topic')
    .eq('subject', currentSubject);

  if (error) {
    console.error('載入筆記失敗:', error);
    alert('載入筆記失敗，請檢查資料庫連線。');
  } else {
    courseNotes.value = data || [];
  }
  isLoading.value = false;
};

onMounted(fetchNotes);
</script>

<template>
  <div class="course-grid-container">
    <div class="header">
      <NuxtLink to="/admin/law-exam" class="back-btn">← 回司律專區</NuxtLink>
      <div class="title-area">
        <span class="subject-tag">{{ currentSubject }}</span>
        <h1>學分班筆記總覽 (共 {{ totalLessons }} 講)</h1>
      </div>
      <p class="subtitle">點擊格子即可閱讀或編輯您的課程筆記。</p>
    </div>

    <div v-if="isLoading" class="loading-state">
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
          {{ item.hasData ? item.topic : '尚未建立課程主題' }}
        </h3>

        <div class="card-action">
          <NuxtLink 
            v-if="item.hasData" 
            :to="`/admin/law-exam/civil-law/view/${item.id}`" 
            class="action-btn view-btn"
          >
            📖 閱讀筆記
          </NuxtLink>
          
          <NuxtLink 
            v-else 
            :to="`/admin/law-exam/civil-law/edit?lesson=${item.lessonNumber}`" 
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

.header {
  margin-bottom: 30px;
  text-align: center;
}

.back-btn {
  display: inline-block;
  padding: 6px 14px;
  background: white;
  color: #475569;
  text-decoration: none;
  border-radius: 20px;
  font-weight: bold;
  margin-bottom: 15px;
  border: 1px solid #cbd5e1;
  transition: 0.2s;
}

.back-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.title-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
}

.subject-tag {
  background: #1e3a8a; /* 民法專屬深藍色 */
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 14px;
}

.header h1 {
  margin: 0;
  color: #1e293b;
  font-size: 28px;
}

.subtitle {
  color: #64748b;
  font-size: 15px;
}

.loading-state {
  text-align: center;
  padding: 50px;
  color: #94a3b8;
  font-size: 18px;
  font-weight: bold;
}

/* 網格佈局 */
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

/* 卡片設計 */
.grid-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.grid-card.has-data {
  border-color: #bfdbfe;
  background: #f8fafc;
}

.grid-card.has-data:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  border-color: #3b82f6;
}

.grid-card.empty {
  border-style: dashed;
  background: #fafaf9;
}

.grid-card.empty:hover {
  border-color: #d97706;
}

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
  padding: 4px 8px;
  border-radius: 6px;
}

.status-badge {
  font-size: 12px;
  font-weight: bold;
  padding: 4px 8px;
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

.topic-title {
  font-size: 18px;
  color: #0f172a;
  margin: 0 0 20px 0;
  line-height: 1.4;
  flex-grow: 1; /* 讓按鈕對齊底部 */
}

.grid-card.empty .topic-title {
  color: #94a3b8;
  font-style: italic;
}

.card-action {
  margin-top: auto;
}

.action-btn {
  display: block;
  width: 100%;
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  font-weight: bold;
  text-decoration: none;
  transition: 0.2s;
  box-sizing: border-box;
}

.view-btn {
  background: #3b82f6;
  color: white;
}

.view-btn:hover {
  background: #2563eb;
}

.add-btn {
  background: white;
  color: #d97706;
  border: 1px solid #d97706;
}

.add-btn:hover {
  background: #fef3c7;
}
</style>
