<script setup>
import { ref, onMounted } from 'vue';
definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();
const subjectName = route.params.subject; // 自動抓取網址上的科目名稱

const notes = ref([]);
const courseMeta = ref({ id: null, subject: subjectName, icon: '📚', theme_color: '#3b82f6' }); 
const isLoading = ref(true);

// 🌟 科目設定面板狀態
const showSettings = ref(false);
const editForm = ref({ subject: '', icon: '', theme_color: '' });

onMounted(async () => {
  // 1. 抓取科目顏色與圖示
  const { data: metaData } = await supabase.from('custom_courses').select('*').eq('subject', subjectName).single();
  if (metaData) {
    courseMeta.value = metaData;
    editForm.value = { ...metaData }; // 預填設定表單
  }

  // 2. 抓取該科目的所有筆記
  const { data } = await supabase.from('course_notes').select('id, topic, introduction, created_at').eq('subject', subjectName).order('created_at', { ascending: true });
  if (data) notes.value = data;
  isLoading.value = false;
});

const deleteNote = async (id) => {
  if (!confirm('確定要刪除此筆記嗎？')) return;
  await supabase.from('course_notes').delete().eq('id', id);
  notes.value = notes.value.filter(n => n.id !== id);
};

// 🌟 儲存科目設定 (包含改名、換顏色、換圖示)
const saveCourseSettings = async () => {
  if (!editForm.value.subject.trim()) return alert('請輸入科目名稱！');
  
  const newSubject = editForm.value.subject;
  const oldSubject = courseMeta.value.subject;
  
  // 如果有改名，連帶更新 course_notes，確保筆記不會遺失！
  if (newSubject !== oldSubject) {
    await supabase.from('course_notes').update({ subject: newSubject }).eq('subject', oldSubject);
  }
  
  // 更新 custom_courses 科目表
  const { error } = await supabase.from('custom_courses').update({
    subject: newSubject,
    icon: editForm.value.icon,
    theme_color: editForm.value.theme_color
  }).eq('id', courseMeta.value.id);
  
  if (error) return alert('更新失敗：' + error.message);
  
  alert('✅ 科目設定已更新！');
  showSettings.value = false;
  
  // 若改了名字，網址會變更，強制重新導向新網址
  if (newSubject !== oldSubject) {
    router.replace(`/admin/law-exam/custom-course/${newSubject}`);
  } else {
    courseMeta.value = { ...editForm.value };
  }
};

// 🌟 刪除整個科目
const deleteEntireCourse = async () => {
  if (!confirm(`⚠️ 嚴重警告：確定要刪除「${courseMeta.value.subject}」整個科目專區嗎？\n\n（注意：這會連同裡面的 ${notes.value.length} 篇筆記一併永久刪除，無法復原！）`)) return;
  
  // 1. 刪除該科目下所有筆記
  await supabase.from('course_notes').delete().eq('subject', courseMeta.value.subject);
  // 2. 刪除科目本身
  await supabase.from('custom_courses').delete().eq('id', courseMeta.value.id);
  
  alert('🗑️ 科目與相關筆記已徹底刪除。');
  router.replace('/admin/law-exam'); // 刪除後導回總控制台
};
</script>

<template>
  <div class="list-container" :style="{ '--theme': courseMeta.theme_color, '--theme-light': courseMeta.theme_color + '1A' }">
    <div class="header">
      <div class="nav-top">
        <NuxtLink to="/admin/law-exam" class="back-btn">← 回總專區</NuxtLink>
        <!-- 🌟 科目設定按鈕 -->
        <button @click="showSettings = !showSettings" class="btn-settings">
          {{ showSettings ? '關閉設定' : '⚙️ 科目設定' }}
        </button>
      </div>
      <h1 style="color: var(--theme);">{{ courseMeta.icon }} {{ subjectName }}</h1>
      <p>自由新增講次與專屬筆記</p>
    </div>

    <!-- 🌟 科目設定面板 -->
    <div v-if="showSettings" class="settings-panel">
      <h3>⚙️ 修改科目外觀與屬性</h3>
      <div class="add-grid">
        <div><label>科目名稱</label><input v-model="editForm.subject" class="add-input" /></div>
        <div><label>Emoji 圖示</label><input v-model="editForm.icon" class="add-input" /></div>
        <div><label>主題代表色</label><input type="color" v-model="editForm.theme_color" class="color-picker" /></div>
      </div>
      <div class="settings-actions">
        <button @click="deleteEntireCourse" class="btn-delete-course">🗑️ 刪除整個科目專區</button>
        <button @click="saveCourseSettings" class="btn-save-course">💾 儲存設定</button>
      </div>
    </div>

    <div v-if="!showSettings" class="actions-bar">
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
.nav-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.back-btn { padding: 6px 16px; background: white; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-decoration: none; color: #64748b; font-weight: bold; transition: 0.2s;}
.back-btn:hover { background: #f1f5f9; color: #1e293b; }

/* 🌟 設定按鈕與面板 CSS */
.btn-settings { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);}
.btn-settings:hover { background: #e2e8f0; color: #1e293b; }
.settings-panel { background: white; padding: 25px; border-radius: 16px; border: 2px dashed var(--theme); margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); animation: fadeIn 0.3s ease;}
.settings-panel h3 { margin: 0 0 20px 0; color: #1e293b; }
.add-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; margin-bottom: 25px;}
.add-grid label { display: block; font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 5px;}
.add-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; outline: none; font-size: 15px;}
.color-picker { width: 100%; height: 42px; border: none; border-radius: 8px; cursor: pointer; padding: 0;}
.settings-actions { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px;}
.btn-delete-course { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;}
.btn-delete-course:hover { background: #fecaca; }
.btn-save-course { background: var(--theme); color: white; border: none; padding: 10px 30px; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1);}
.btn-save-course:hover { opacity: 0.9; transform: translateY(-2px);}

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

@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 768px) { 
  .add-grid { grid-template-columns: 1fr; gap: 10px; } 
  .settings-actions { flex-direction: column; gap: 15px; }
  .btn-delete-course, .btn-save-course { width: 100%; text-align: center; }
}
</style>
