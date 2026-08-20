<script setup>
import { ref, onMounted } from 'vue';
definePageMeta({ middleware: ['auth', 'law-auth'] });

const supabase = useSupabaseClient();
const notes = ref([]);
const isLoading = ref(true);

const fetchNotes = async () => {
  isLoading.value = true;
  // 🌟 只抓取此科目的筆記，並依照建立時間或自訂順序排列
  const { data, error } = await supabase.from('course_notes').select('id, topic, introduction, created_at').eq('subject', '土地登記規則').order('created_at', { ascending: true });
  if (data) notes.value = data;
  isLoading.value = false;
};

onMounted(fetchNotes);

const deleteNote = async (id) => {
  if (!confirm('確定要刪除此筆記嗎？')) return;
  await supabase.from('course_notes').delete().eq('id', id);
  fetchNotes();
};
</script>

<template>
  <div class="list-container">
    <div class="header">
      <NuxtLink to="/admin/law-exam" class="back-btn">← 回總專區</NuxtLink>
      <h1>📜 土地登記規則</h1>
      <p>自由新增講次與專屬筆記</p>
    </div>

    <div class="actions-bar">
      <!-- 🌟 無限新增按鈕 -->
      <NuxtLink to="/admin/law-exam/land-registration-rule-course/edit" class="btn-add-new">
        ➕ 新增講次 / 筆記
      </NuxtLink>
    </div>

    <div v-if="isLoading" class="loading-state">資料載入中...</div>
    
    <div v-else-if="notes.length === 0" class="empty-state">
      <div class="icon">📝</div>
      <h3>目前還沒有任何筆記</h3>
      <p>點擊上方按鈕開始建立您的第一講吧！</p>
    </div>

    <div v-else class="notes-grid">
      <div v-for="(note, index) in notes" :key="note.id" class="note-card">
        <div class="card-header">
          <span class="lecture-badge">第 {{ index + 1 }} 筆</span>
          <button @click.prevent="deleteNote(note.id)" class="btn-delete">🗑️</button>
        </div>
        <h2 class="note-title">{{ note.topic || '未命名主題' }}</h2>
        <p class="note-intro">{{ note.introduction || '無簡介' }}</p>
        <div class="card-actions">
          <NuxtLink :to="`/admin/law-exam/land-registration-rule-course/${note.id}`" class="btn-read">📖 閱讀</NuxtLink>
          <NuxtLink :to="`/admin/law-exam/land-registration-rule-course/edit?id=${note.id}`" class="btn-edit">⚙️ 編輯</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; font-family: sans-serif; color: #1e293b; }
.header { text-align: center; margin-bottom: 30px; }
.back-btn { display: inline-block; margin-bottom: 15px; padding: 6px 16px; background: white; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-decoration: none; color: #64748b; font-weight: bold; }
.header h1 { font-size: 32px; margin: 0 0 10px 0; color: #10b981; }
.header p { color: #64748b; }

.actions-bar { display: flex; justify-content: center; margin-bottom: 40px; }
.btn-add-new { background: #10b981; color: white; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); transition: transform 0.2s; }
.btn-add-new:hover { transform: translateY(-3px); }

.notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.note-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; transition: 0.2s; }
.note-card:hover { border-color: #10b981; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.1); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.lecture-badge { background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
.btn-delete { background: transparent; border: none; cursor: pointer; opacity: 0.5; transition: 0.2s; }
.btn-delete:hover { opacity: 1; transform: scale(1.1); }

.note-title { font-size: 18px; margin: 0 0 10px 0; color: #1e293b; line-height: 1.4; }
.note-intro { font-size: 14px; color: #64748b; line-height: 1.6; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.card-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-read, .btn-edit { flex: 1; text-align: center; padding: 10px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 14px; }
.btn-read { background: #10b981; color: white; }
.btn-edit { background: #f1f5f9; color: #475569; }

.loading-state, .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
.empty-state .icon { font-size: 48px; margin-bottom: 15px; }
</style>
