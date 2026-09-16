<script setup>
import { ref, onMounted } from 'vue';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const route = useRoute();
const supabase = useSupabaseClient();
const subjectName = route.params.subject; // 自動抓取網址上的科目名稱

const notes = ref([]);
const courseMeta = ref({ icon: '📚', theme_color: '#3b82f6' }); 
const isLoading = ref(true);

onMounted(async () => {
  const { data: metaData } = await supabase.from('custom_courses').select('*').eq('subject', subjectName).single();
  if (metaData) courseMeta.value = metaData;

  const { data } = await supabase.from('course_notes').select('id, topic, introduction, created_at').eq('subject', subjectName).order('created_at', { ascending: true });
  if (data) notes.value = data;
  isLoading.value = false;
});

const deleteNote = async (id) => {
  if (!confirm('確定要刪除此筆記嗎？')) return;
  await supabase.from('course_notes').delete().eq('id', id);
  notes.value = notes.value.filter(n => n.id !== id);
};
</script>

<template>
  <div class="list-container" :style="{ '--theme': courseMeta.theme_color, '--theme-light': courseMeta.theme_color + '1A' }">
    <div class="header">
      <NuxtLink to="/admin/law-exam" class="back-btn">← 回總專區</NuxtLink>
      <h1 style="color: var(--theme);">{{ courseMeta.icon }} {{ subjectName }}</h1>
      <p>自由新增講次與專屬筆記</p>
    </div>

    <div class="actions-bar">
      <NuxtLink :to="`/admin/law-exam/custom-course/${subjectName}/edit`" class="btn-add-new" style="background: var(--theme);">➕ 新增講次 / 筆記</NuxtLink>
    </div>

    <div v-if="isLoading" class="loading-state">資料載入中...</div>
    <div v-else-if="notes.length === 0" class="empty-state">
      <div class="icon">📝</div><h3>目前還沒有任何筆記</h3><p>點擊上方按鈕開始建立您的第一講吧！</p>
    </div>

    <div v-else class="notes-grid">
      <div v-for="(note, index) in notes" :key="note.id" class="note-card">
        <div class="card-header">
          <span class="lecture-badge" style="background: var(--theme-light); color: var(--theme);">第 {{ index + 1 }} 筆</span>
          <button @click.prevent="deleteNote(note.id)" class="btn-delete">🗑️</button>
        </div>
        <h2 class="note-title">{{ note.topic || '未命名主題' }}</h2>
        <p class="note-intro">{{ note.introduction || '無簡介' }}</p>
        <div class="card-actions">
          <NuxtLink :to="`/admin/law-exam/custom-course/${subjectName}/${note.id}`" class="btn-read" style="background: var(--theme);">📖 閱讀</NuxtLink>
          <NuxtLink :to="`/admin/law-exam/custom-course/${subjectName}/edit?id=${note.id}`" class="btn-edit">⚙️ 編輯</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif; color: #1e293b; }
.header { text-align: center; margin-bottom: 30px; }
.back-btn { display: inline-block; margin-bottom: 15px; padding: 6px 16px; background: white; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-decoration: none; color: #64748b; font-weight: bold; }
.header h1 { font-size: 32px; margin: 0 0 10px 0; }
.header p { color: #64748b; }
.actions-bar { display: flex; justify-content: center; margin-bottom: 40px; }
.btn-add-new { color: white; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: transform 0.2s; }
.btn-add-new:hover { transform: translateY(-3px); }
.notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.note-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; transition: 0.2s; }
.note-card:hover { border-color: var(--theme); box-shadow: 0 10px 15px -3px var(--theme-light); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.lecture-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
.btn-delete { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; }
.btn-delete:hover { opacity: 1; transform: scale(1.1); }
.note-title { font-size: 18px; margin: 0 0 10px 0; color: #1e293b; line-height: 1.4; }
.note-intro { font-size: 14px; color: #64748b; line-height: 1.6; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-read, .btn-edit { flex: 1; text-align: center; padding: 10px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 14px; }
.btn-read { color: white; }
.btn-edit { background: #f1f5f9; color: #475569; }
.loading-state, .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
.empty-state .icon { font-size: 48px; margin-bottom: 15px; }
</style>
