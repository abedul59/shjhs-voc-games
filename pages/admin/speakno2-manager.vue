<script setup>
import { ref, onMounted } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const articles = ref([]);
const isLoading = ref(true);
const showModal = ref(false);
const isEditing = ref(false);

const formData = ref({
  id: null,
  grade: 7,
  title: '',
  content: ''
});

const fetchArticles = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('speakno2_articles').select('*').order('grade', { ascending: true }).order('created_at', { ascending: false });
  if (!error && data) articles.value = data;
  isLoading.value = false;
};

onMounted(fetchArticles);

const openAddModal = () => {
  isEditing.value = false;
  formData.value = { id: null, grade: 7, title: '', content: '' };
  showModal.value = true;
};

const openEditModal = (article) => {
  isEditing.value = true;
  formData.value = { ...article };
  showModal.value = true;
};

const saveArticle = async () => {
  if (!formData.value.title || !formData.value.content) return alert("標題和內容不能為空！");
  
  if (isEditing.value) {
    await supabase.from('speakno2_articles').update({
      grade: formData.value.grade, title: formData.value.title, content: formData.value.content
    }).eq('id', formData.value.id);
  } else {
    await supabase.from('speakno2_articles').insert([{
      grade: formData.value.grade, title: formData.value.title, content: formData.value.content
    }]);
  }
  showModal.value = false;
  fetchArticles();
};

const deleteArticle = async (id) => {
  if (confirm("確定要刪除這篇文章嗎？刪除後無法恢復！")) {
    await supabase.from('speakno2_articles').delete().eq('id', id);
    fetchArticles();
  }
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <NuxtLink to="/admin" class="back-btn">⬅ 返回控制中心</NuxtLink>
      <h1>📖 口說學霸2 - 文章管理</h1>
      <button class="add-btn" @click="openAddModal">➕ 新增文章</button>
    </div>

    <div v-if="isLoading" class="loading">載入中...</div>
    <div v-else class="article-list">
      <div v-for="article in articles" :key="article.id" class="article-card">
        <div class="badge" :class="article.grade === 7 ? 'g7' : 'g8'">{{ article.grade }} 年級</div>
        <h2>{{ article.title }}</h2>
        <p class="preview">{{ article.content.substring(0, 50) }}...</p>
        <div class="actions">
          <button @click="openEditModal(article)" class="edit-btn">✏️ 編輯</button>
          <button @click="deleteArticle(article.id)" class="del-btn">🗑️ 刪除</button>
        </div>
      </div>
      <div v-if="articles.length === 0" class="empty">目前還沒有文章喔！</div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>{{ isEditing ? '編輯文章' : '新增文章' }}</h2>
        <div class="form-group">
          <label>年級：</label>
          <select v-model="formData.grade" class="retro-input">
            <option :value="7">七年級</option>
            <option :value="8">八年級</option>
          </select>
        </div>
        <div class="form-group">
          <label>文章標題：</label>
          <input type="text" v-model="formData.title" class="retro-input" placeholder="例如：The Boy Who Cried Wolf">
        </div>
        <div class="form-group">
          <label>文章內容：</label>
          <textarea v-model="formData.content" class="retro-input" rows="10" placeholder="請將整篇文章貼在此處..."></textarea>
        </div>
        <div class="modal-actions">
          <button @click="showModal = false" class="cancel-btn">取消</button>
          <button @click="saveArticle" class="save-btn">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px;}
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
h1 { margin: 0; color: #2c3e50; }
.add-btn { background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem;}

.article-list { display: flex; flex-direction: column; gap: 15px; }
.article-card { border: 2px solid #e0e0e0; border-radius: 12px; padding: 15px; background: #fff; position: relative;}
.badge { position: absolute; top: -10px; left: 15px; padding: 5px 15px; border-radius: 20px; font-weight: bold; color: white; font-size: 0.9rem;}
.badge.g7 { background: #ff9800; }
.badge.g8 { background: #9c27b0; }
.article-card h2 { margin: 15px 0 5px 0; color: #333; }
.preview { color: #666; font-size: 0.9rem; margin-bottom: 15px; }
.actions { display: flex; gap: 10px; }
.edit-btn, .del-btn { padding: 5px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 1px solid #ccc;}
.edit-btn { background: #e3f2fd; color: #1976d2; border-color: #90caf9;}
.del-btn { background: #ffebee; color: #c62828; border-color: #ef9a9a;}

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;}
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 90%; max-width: 600px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);}
.form-group { margin-bottom: 15px; display: flex; flex-direction: column; gap: 5px;}
.form-group label { font-weight: bold; color: #333; }
.retro-input { padding: 10px; border: 2px solid #ccc; border-radius: 8px; font-size: 1rem; font-family: inherit;}
.modal-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px;}
.cancel-btn, .save-btn { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 1.1rem;}
.cancel-btn { background: #e0e0e0; color: #333; }
.save-btn { background: #4caf50; color: white; }
</style>