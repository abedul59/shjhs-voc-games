<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse'; // 🌟 引入強大的 CSV 處理套件

// 確保只有登入且有權限的管理者可以進入
definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const isLoading = ref(true);
const isExporting = ref(false);
const isImporting = ref(false);

const currentSubject = '民法';
const totalLessons = 55;
const courseNotes = ref([]);
const fileInput = ref(null); // 用來綁定隱藏的上傳元件

// 載入該科目的所有筆記
const fetchNotes = async () => {
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
};

onMounted(fetchNotes);

// 動態產生 55 堂課的網格資料
const gridItems = computed(() => {
  const grid = [];
  for (let i = 1; i <= totalLessons; i++) {
    const prefix = `第${i}講`;
    const note = courseNotes.value.find(n => n.topic.startsWith(prefix));

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

// ==============================
// 🌟 CSV 匯出功能
// ==============================
const exportCSV = async () => {
  try {
    isExporting.value = true;
    
    // 抓取該科目「所有欄位」的完整資料
    const { data, error } = await supabase
      .from('course_notes')
      .select('*')
      .eq('subject', currentSubject);
      
    if (error) throw error;
    if (!data || data.length === 0) {
      alert('目前沒有資料可以匯出喔！');
      return;
    }

    // 轉換為 CSV 格式，加入 \uFEFF 確保 Excel 打開不會亂碼 (BOM)
    const csv = '\uFEFF' + Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 建立隱藏連結並觸發下載
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentSubject}學分班_全部筆記備份_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('匯出失敗：' + err.message);
  } finally {
    isExporting.value = false;
  }
};

// ==============================
// 🌟 CSV 匯入功能
// ==============================
const triggerImport = () => {
  fileInput.value.click(); // 觸發隱藏的 input file
};

const handleImportCSV = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isImporting.value = true;
  
  Papa.parse(file, {
    header: true,         // 標題列當作 key
    skipEmptyLines: true, // 略過空行
    complete: async (results) => {
      try {
        const rows = results.data;
        
        // 整理資料，準備進資料庫
        const payload = rows.map(row => {
          const cleanRow = { ...row };
          
          // 如果 id 是空的，刪除該屬性讓 Supabase 自動產生新 ID
          if (!cleanRow.id || cleanRow.id.trim() === '') {
            delete cleanRow.id;
          }
          
          // 確保建立時間等不會干擾寫入
          if (!cleanRow.created_at) delete cleanRow.created_at;
          if (!cleanRow.updated_at) delete cleanRow.updated_at;
          
          // 強制鎖定科目，防止把刑法的 CSV 誤傳進民法
          cleanRow.subject = currentSubject; 
          
          return cleanRow;
        });

        // 執行批次 Upsert (新增或更新)
        const { error } = await supabase
          .from('course_notes')
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;

        alert(`✅ 成功匯入 / 更新了 ${payload.length} 筆資料！`);
        await fetchNotes(); // 重新載入畫面
      } catch (err) {
        alert('匯入發生錯誤：' + err.message);
      } finally {
        isImporting.value = false;
        event.target.value = ''; // 清空選擇的檔案，允許重複上傳同一個檔案
      }
    },
    error: (err) => {
      alert('CSV 解析失敗：' + err.message);
      isImporting.value = false;
      event.target.value = '';
    }
  });
};
</script>

<template>
  <div class="course-grid-container">
    
    <div class="header">
      <div class="header-top">
        <NuxtLink to="/admin/law-exam" class="back-btn">← 回司律專區</NuxtLink>
        
        <div class="csv-actions">
          <button @click="exportCSV" :disabled="isExporting || isLoading" class="csv-btn export-btn">
            {{ isExporting ? '⏳ 處理中...' : '📥 匯出 CSV' }}
          </button>
          <button @click="triggerImport" :disabled="isImporting || isLoading" class="csv-btn import-btn">
            {{ isImporting ? '⏳ 處理中...' : '📤 匯入 CSV' }}
          </button>
          <input type="file" ref="fileInput" accept=".csv" style="display: none" @change="handleImportCSV" />
        </div>
      </div>

      <div class="title-area">
        <span class="subject-tag">{{ currentSubject }}</span>
        <h1>學分班筆記總覽 (共 {{ totalLessons }} 講)</h1>
      </div>
      <p class="subtitle">點擊格子即可閱讀筆記，或使用右上角功能進行批次管理。</p>
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
        
        <h3 class="topic-title">{{ item.topic }}</h3>

        <div class="card-action">
          <NuxtLink v-if="item.hasData" :to="`/admin/law-exam/civil-course/${item.id}`" class="action-btn view-btn">
            📖 閱讀筆記
          </NuxtLink>
          <NuxtLink v-else :to="`/admin/law-exam/civil-course/edit?lesson=${item.lessonNumber}`" class="action-btn add-btn">
            ➕ 新增筆記
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-grid-container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; font-family: sans-serif; }

/* --- Header 區域 --- */
.header { margin-bottom: 40px; text-align: center; }

/* 🌟 頂部按鈕群 (返回 + CSV) */
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.back-btn { display: inline-block; padding: 8px 16px; background: white; color: #475569; text-decoration: none; border-radius: 20px; font-weight: bold; border: 1px solid #cbd5e1; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.back-btn:hover { background: #f1f5f9; border-color: #94a3b8; color: #1e293b; }

.csv-actions { display: flex; gap: 10px; }
.csv-btn { padding: 8px 16px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 14px;}
.export-btn { background: #1e293b; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.export-btn:hover:not(:disabled) { background: #334155; transform: translateY(-2px); }
.import-btn { background: #f8fafc; color: #3b82f6; border: 1px solid #bfdbfe; }
.import-btn:hover:not(:disabled) { background: #eff6ff; border-color: #93c5fd; transform: translateY(-2px); }
.csv-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.title-area { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px; }
.subject-tag { background: #1e3a8a; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 900; font-size: 15px; }
.header h1 { margin: 0; color: #1e293b; font-size: 28px; }
.subtitle { color: #64748b; font-size: 16px; margin: 0; }

.loading-state { text-align: center; padding: 80px 20px; color: #94a3b8; font-size: 18px; font-weight: bold; }
.spinner { font-size: 32px; margin-bottom: 15px; animation: pulse 1.5s infinite; }

/* --- 網格佈局 --- */
.grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }

/* --- 卡片設計 --- */
.grid-card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
.grid-card.has-data { border-color: #bfdbfe; background: #f8fafc; }
.grid-card.has-data:hover { transform: translateY(-5px); box-shadow: 0 12px 20px -5px rgba(59, 130, 246, 0.15); border-color: #3b82f6; }
.grid-card.empty { border-style: dashed; background: #fafaf9; }
.grid-card.empty:hover { border-color: #d97706; background: #fffbeb; }

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.lesson-num { font-size: 14px; font-weight: 900; color: #334155; background: #e2e8f0; padding: 4px 10px; border-radius: 6px; }
.status-badge { font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 12px; }
.status-badge.check { background: #dcfce7; color: #059669; }
.status-badge.pending { background: #fef3c7; color: #d97706; }

.topic-title { font-size: 18px; color: #0f172a; margin: 0 0 25px 0; line-height: 1.5; flex-grow: 1; }
.grid-card.empty .topic-title { color: #94a3b8; font-style: italic; }

.card-action { margin-top: auto; }
.action-btn { display: block; width: 100%; text-align: center; padding: 12px; border-radius: 10px; font-weight: bold; text-decoration: none; transition: all 0.2s; box-sizing: border-box; }
.view-btn { background: #3b82f6; color: white; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2); }
.view-btn:hover { background: #2563eb; transform: translateY(-2px); }
.add-btn { background: white; color: #d97706; border: 1px solid #d97706; }
.add-btn:hover { background: #fef3c7; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
@media (max-width: 600px) { .grid-layout { grid-template-columns: 1fr; } }
</style>
