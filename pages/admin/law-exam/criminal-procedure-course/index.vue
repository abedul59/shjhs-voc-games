<script setup>
import { ref, computed, onMounted } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const isLoading = ref(true);
const isExporting = ref(false);
const isImporting = ref(false);

const currentSubject = '刑事訴訟法'; // 🌟 強制對應資料庫欄位
const totalLessons = 55;
const courseNotes = ref([]);
const fileInput = ref(null);

const fetchNotes = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('course_notes').select('id, topic').eq('subject', currentSubject);
  if (!error) courseNotes.value = data || [];
  isLoading.value = false;
};

onMounted(fetchNotes);

const gridItems = computed(() => {
  const grid = [];
  for (let i = 1; i <= totalLessons; i++) {
    const prefix = `第${i}講`;
    const note = courseNotes.value.find(n => n.topic.startsWith(prefix));
    let displayTopic = note ? (note.topic.split(/：|:/)[1]?.trim() || note.topic) : '尚未建立筆記';
    grid.push({ lessonNumber: i, id: note ? note.id : null, topic: displayTopic, hasData: !!note });
  }
  return grid;
});

const exportCSV = async () => {
  isExporting.value = true;
  const { data } = await supabase.from('course_notes').select('*').eq('subject', currentSubject);
  const csv = '\uFEFF' + Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentSubject}學分班_備份.csv`;
  link.click();
  isExporting.value = false;
};

const handleImportCSV = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  isImporting.value = true;
  Papa.parse(file, {
    header: true,
    complete: async (results) => {
      const payload = results.data.map(row => {
        const cleanRow = { ...row };
        if (!cleanRow.id || cleanRow.id.trim() === '') delete cleanRow.id;
        if (!cleanRow.created_at) delete cleanRow.created_at;
        if (!cleanRow.updated_at) delete cleanRow.updated_at;
        cleanRow.subject = currentSubject;
        return cleanRow;
      });
      await supabase.from('course_notes').upsert(payload, { onConflict: 'id' });
      alert(`✅ ${currentSubject}資料更新成功！`);
      fetchNotes();
      isImporting.value = false;
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
          <button @click="exportCSV" class="csv-btn export-btn">📥 匯出</button>
          <button @click="fileInput.click()" class="csv-btn import-btn">📤 匯入</button>
          <input type="file" ref="fileInput" accept=".csv" style="display: none" @change="handleImportCSV" />
        </div>
      </div>
      <div class="title-area">
        <span class="subject-tag crp-tag">{{ currentSubject }}</span>
        <h1>學分班筆記總覽 (共 {{ totalLessons }} 講)</h1>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">載入中...</div>

    <div v-else class="grid-layout">
      <div v-for="item in gridItems" :key="item.lessonNumber" class="grid-card" :class="{ 'has-data': item.hasData }">
        <div class="card-top"><span class="lesson-num">第 {{ item.lessonNumber }} 講</span></div>
        <h3 class="topic-title">{{ item.topic }}</h3>
        <div class="card-action">
          <NuxtLink v-if="item.hasData" :to="`/admin/law-exam/criminal-procedure-course/${item.id}`" class="action-btn view-btn">📖 閱讀</NuxtLink>
          <NuxtLink v-else :to="`/admin/law-exam/criminal-procedure-course/edit?lesson=${item.lessonNumber}`" class="action-btn add-btn">➕ 新增</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-grid-container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; font-family: sans-serif; }
.header { margin-bottom: 40px; text-align: center; }
.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { padding: 8px 16px; background: white; color: #475569; text-decoration: none; border-radius: 20px; border: 1px solid #cbd5e1; }
.csv-btn { padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 14px; }
.export-btn { background: #1e293b; color: white; }
.import-btn { background: #ecfdf5; color: #059669; border: 1px solid #6ee7b7; }
.subject-tag.crp-tag { background: #059669; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 900; }
.grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
.grid-card { background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; }
.grid-card.has-data { border-color: #6ee7b7; background: #ecfdf5; }
.grid-card.has-data:hover { border-color: #059669; transform: translateY(-5px); }
.lesson-num { font-size: 14px; font-weight: 900; background: #e2e8f0; padding: 4px 10px; border-radius: 6px; }
.topic-title { font-size: 18px; margin: 15px 0 25px 0; flex-grow: 1; }
.action-btn { display: block; text-align: center; padding: 12px; border-radius: 10px; font-weight: bold; text-decoration: none; }
.view-btn { background: #059669; color: white; }
.add-btn { background: white; color: #059669; border: 1px solid #059669; }
</style>
