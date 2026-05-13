<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const isLoading = ref(true);
const isExporting = ref(false);
const isImporting = ref(false);

const currentSubject = '刑法'; // 🌟 已更改為刑法
const totalLessons = 55;
const courseNotes = ref([]);
const fileInput = ref(null);

const fetchNotes = async () => {
  isLoading.value = true;
  const { data, error } = await supabase
    .from('course_notes')
    .select('id, topic')
    .eq('subject', currentSubject);

  if (error) {
    console.error('載入失敗:', error);
  } else {
    courseNotes.value = data || [];
  }
  isLoading.value = false;
};

onMounted(fetchNotes);

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
    grid.push({ lessonNumber: i, id: note ? note.id : null, topic: displayTopic, hasData: !!note });
  }
  return grid;
});

const exportCSV = async () => {
  try {
    isExporting.value = true;
    const { data, error } = await supabase.from('course_notes').select('*').eq('subject', currentSubject);
    if (error) throw error;
    const csv = '\uFEFF' + Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentSubject}學分班_筆記備份_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('匯出失敗：' + err.message);
  } finally {
    isExporting.value = false;
  }
};

const handleImportCSV = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  isImporting.value = true;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const payload = results.data.map(row => {
          const cleanRow = { ...row };
          if (!cleanRow.id || cleanRow.id.trim() === '') delete cleanRow.id;
          if (!cleanRow.created_at) delete cleanRow.created_at;
          if (!cleanRow.updated_at) delete cleanRow.updated_at;
          cleanRow.subject = currentSubject;
          return cleanRow;
        });
        const { error } = await supabase.from('course_notes').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        alert(`✅ 成功匯入 / 更新了 ${payload.length} 筆刑法筆記！`);
        await fetchNotes();
      } catch (err) {
        alert('匯入發生錯誤：' + err.message);
      } finally {
        isImporting.value = false;
        event.target.value = '';
      }
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
          <button @click="exportCSV" :disabled="isExporting || isLoading" class="csv-btn export-btn">📥 匯出 CSV</button>
          <button @click="fileInput.click()" :disabled="isImporting || isLoading" class="csv-btn import-btn">📤 匯入 CSV</button>
          <input type="file" ref="fileInput" accept=".csv" style="display: none" @change="handleImportCSV" />
        </div>
      </div>
      <div class="title-area">
        <span class="subject-tag criminal-tag">{{ currentSubject }}</span>
        <h1>學分班筆記總覽 (共 {{ totalLessons }} 講)</h1>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">載入中...</div>

    <div v-else class="grid-layout">
      <div v-for="item in gridItems" :key="item.lessonNumber" class="grid-card" :class="{ 'has-data': item.hasData, 'empty': !item.hasData }">
        <div class="card-top">
          <span class="lesson-num">第 {{ item.lessonNumber }} 講</span>
          <span v-if="item.hasData" class="status-badge check">已完成</span>
        </div>
        <h3 class="topic-title">{{ item.topic }}</h3>
        <div class="card-action">
          <NuxtLink v-if="item.hasData" :to="`/admin/law-exam/criminal-course/${item.id}`" class="action-btn view-btn">📖 閱讀</NuxtLink>
          <NuxtLink v-else :to="`/admin/law-exam/criminal-course/edit?lesson=${item.lessonNumber}`" class="action-btn add-btn">➕ 新增</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 基礎樣式與民法相同，僅修改顏色 */
.course-grid-container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; font-family: sans-serif; }
.header { margin-bottom: 40px; text-align: center; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { padding: 8px 16px; background: white; color: #475569; text-decoration: none; border-radius: 20px; font-weight: bold; border: 1px solid #cbd5e1; }
.csv-actions { display: flex; gap: 10px; }
.csv-btn { padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 14px; }
.export-btn { background: #1e293b; color: white; }
.import-btn { background: #fef2f2; color: #be123c; border: 1px solid #fecaca; }
.title-area { display: flex; align-items: center; justify-content: center; gap: 15px; }
.subject-tag.criminal-tag { background: #be123c; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 900; }
.grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
.grid-card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; }
.grid-card.has-data { border-color: #fecaca; background: #fffafb; }
.grid-card.has-data:hover { transform: translateY(-5px); border-color: #be123c; }
.lesson-num { font-size: 14px; font-weight: 900; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; }
.status-badge.check { background: #dcfce7; color: #059669; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 12px; }
.topic-title { font-size: 18px; margin: 15px 0 25px 0; flex-grow: 1; }
.action-btn { display: block; text-align: center; padding: 12px; border-radius: 10px; font-weight: bold; text-decoration: none; }
.view-btn { background: #be123c; color: white; }
.add-btn { background: white; color: #991b1b; border: 1px solid #991b1b; }
</style>
