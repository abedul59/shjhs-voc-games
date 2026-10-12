<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SPEAKNO2_CATEGORIES, speakno2CategoryLabel, countSpeakno2Words, formatSpeakno2Duration, normalizeSpeakno2Links, isSafeSpeakno2Url } from '~/utils/speakno2Article';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const articles = ref([]);
const isLoading = ref(true);
const showModal = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const errorMessage = ref('');
const practiceSeconds = ref(0);
const practiceStartedAt = ref(0);
const isPracticing = ref(false);
let practiceTimer = null;

const formData = ref({
  id: null,
  grade: 7,
  title: '',
  content: '',
  resource_links: []
});

const wordCount = computed(() => countSpeakno2Words(formData.value.content));
const estimatedSeconds = computed(() => Math.ceil(wordCount.value * 60 / 130));

const stopPracticeTimer = () => {
  if (!isPracticing.value) return;
  practiceSeconds.value = Math.floor((Date.now() - practiceStartedAt.value) / 1000);
  isPracticing.value = false;
  clearInterval(practiceTimer);
  practiceTimer = null;
};

const startPracticeTimer = () => {
  practiceSeconds.value = 0;
  practiceStartedAt.value = Date.now();
  isPracticing.value = true;
  clearInterval(practiceTimer);
  practiceTimer = setInterval(() => {
    practiceSeconds.value = Math.floor((Date.now() - practiceStartedAt.value) / 1000);
  }, 250);
};

const closeModal = () => {
  stopPracticeTimer();
  showModal.value = false;
};

onUnmounted(() => clearInterval(practiceTimer));

const fetchArticles = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('speakno2_articles').select('*').order('grade', { ascending: true }).order('created_at', { ascending: false });
  if (error) errorMessage.value = `載入文章失敗：${error.message}`;
  else if (data) articles.value = data;
  isLoading.value = false;
};

onMounted(fetchArticles);

const openAddModal = () => {
  isEditing.value = false;
  errorMessage.value = '';
  practiceSeconds.value = 0;
  formData.value = { id: null, grade: 7, title: '', content: '', resource_links: [] };
  showModal.value = true;
};

const openEditModal = (article) => {
  isEditing.value = true;
  errorMessage.value = '';
  practiceSeconds.value = 0;
  formData.value = { ...article, resource_links: Array.isArray(article.resource_links) ? article.resource_links.map(link => ({ ...link })) : [] };
  showModal.value = true;
};

const saveArticle = async () => {
  errorMessage.value = '';
  if (!formData.value.title.trim() || !formData.value.content.trim()) {
    errorMessage.value = '標題和內容不能為空。';
    return;
  }
  const unfinishedLink = formData.value.resource_links.some(link => Boolean(link.name?.trim()) !== Boolean(link.url?.trim()));
  if (unfinishedLink) {
    errorMessage.value = '每組參考網址都需要填寫名稱和網址。';
    return;
  }
  const links = normalizeSpeakno2Links(formData.value.resource_links);
  if (links.some(link => !isSafeSpeakno2Url(link.url))) {
    errorMessage.value = '網址必須是有效的 http:// 或 https:// 網址。';
    return;
  }
  isSaving.value = true;
  const payload = {
    grade: Number(formData.value.grade),
    title: formData.value.title.trim(),
    content: formData.value.content.trim(),
    resource_links: links
  };
  const { error } = isEditing.value
    ? await supabase.from('speakno2_articles').update(payload).eq('id', formData.value.id)
    : await supabase.from('speakno2_articles').insert([payload]);
  isSaving.value = false;
  if (error) {
    errorMessage.value = `儲存失敗：${error.message}。若提示找不到 resource_links 欄位，請先執行新增欄位的 SQL。`;
    return;
  }
  closeModal();
  await fetchArticles();
};

const deleteArticle = async (id) => {
  if (confirm("確定要刪除這篇文章嗎？刪除後無法恢復！")) {
    const { error } = await supabase.from('speakno2_articles').delete().eq('id', id);
    if (error) errorMessage.value = `刪除失敗：${error.message}`;
    else await fetchArticles();
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
    <p v-if="errorMessage && !showModal" class="error-message" role="alert">{{ errorMessage }}</p>

    <div v-if="isLoading" class="loading">載入中...</div>
    <div v-else class="article-list">
      <div v-for="article in articles" :key="article.id" class="article-card">
        <div class="badge" :class="`g${article.grade}`">{{ speakno2CategoryLabel(article.grade) }}</div>
        <h2>{{ article.title }}</h2>
        <p class="preview">{{ article.content.substring(0, 50) }}...</p>
        <p class="article-meta">{{ countSpeakno2Words(article.content) }} 字 · 預估朗讀 {{ formatSpeakno2Duration(Math.ceil(countSpeakno2Words(article.content) * 60 / 130)) }} · {{ normalizeSpeakno2Links(article.resource_links).length }} 個參考網址</p>
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
            <option v-for="category in SPEAKNO2_CATEGORIES" :key="category.grade" :value="category.grade">{{ category.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>文章標題：</label>
          <input type="text" v-model="formData.title" class="retro-input" placeholder="例如：The Boy Who Cried Wolf">
        </div>
        <div class="form-group">
          <label>文章內容：</label>
          <textarea v-model="formData.content" class="retro-input" rows="10" placeholder="請將整篇文章貼在此處..."></textarea>
          <small>英文 {{ wordCount }} 字 · 以每分鐘 130 字估算約 {{ formatSpeakno2Duration(estimatedSeconds) }}；學生的實際朗讀時間會在遊戲中計時。</small>
          <div class="practice-timer">
            <span>朗讀試計時：{{ formatSpeakno2Duration(practiceSeconds) }}</span>
            <button v-if="!isPracticing" type="button" @click="startPracticeTimer">開始計時</button>
            <button v-else type="button" @click="stopPracticeTimer">停止計時</button>
          </div>
        </div>
        <div class="form-group">
          <label>參考網址（可加入多組名稱與網址）：</label>
          <div v-for="(link, index) in formData.resource_links" :key="index" class="link-row">
            <input v-model="link.name" type="text" class="retro-input" :aria-label="`第 ${index + 1} 組網址名稱`" placeholder="名稱，例如：示範朗讀">
            <input v-model="link.url" type="url" class="retro-input" :aria-label="`第 ${index + 1} 組網址`" placeholder="https://...">
            <button type="button" class="remove-link" :aria-label="`移除第 ${index + 1} 組網址`" @click="formData.resource_links.splice(index, 1)">移除</button>
          </div>
          <button type="button" class="add-link" @click="formData.resource_links.push({ name: '', url: '' })">＋ 新增一組網址</button>
        </div>
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <div class="modal-actions">
          <button @click="closeModal" class="cancel-btn">取消</button>
          <button @click="saveArticle" class="save-btn" :disabled="isSaving">{{ isSaving ? '儲存中...' : '儲存' }}</button>
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
.badge.g9 { background: #1976d2; }
.badge.g10 { background: #00796b; }
.article-card h2 { margin: 15px 0 5px 0; color: #333; }
.preview { color: #666; font-size: 0.9rem; margin-bottom: 15px; }
.article-meta { color: #455a64; font-weight: bold; margin: 0 0 12px; }
.actions { display: flex; gap: 10px; }
.edit-btn, .del-btn { padding: 5px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 1px solid #ccc;}
.edit-btn { background: #e3f2fd; color: #1976d2; border-color: #90caf9;}
.del-btn { background: #ffebee; color: #c62828; border-color: #ef9a9a;}

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;}
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);}
.form-group { margin-bottom: 15px; display: flex; flex-direction: column; gap: 5px;}
.form-group label { font-weight: bold; color: #333; }
.retro-input { padding: 10px; border: 2px solid #ccc; border-radius: 8px; font-size: 1rem; font-family: inherit;}
.link-row { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(180px, 2fr) auto; gap: 8px; }
.link-row .retro-input { min-width: 0; }
.add-link, .remove-link { border: 1px solid #90caf9; border-radius: 8px; padding: 8px 12px; color: #1565c0; background: #e3f2fd; cursor: pointer; font-weight: bold; }
.add-link { align-self: flex-start; }
.remove-link { color: #b71c1c; border-color: #ef9a9a; background: #ffebee; }
.error-message { color: #b71c1c; background: #ffebee; padding: 10px; border-radius: 8px; }
.practice-timer { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; color: #263238; font-weight: bold; }
.practice-timer button { background: #e3f2fd; color: #0d47a1; border: 1px solid #90caf9; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px;}
.cancel-btn, .save-btn { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 1.1rem;}
.cancel-btn { background: #e0e0e0; color: #333; }
.save-btn { background: #4caf50; color: white; }
@media (max-width: 600px) {
  .header { flex-wrap: wrap; gap: 12px; }
  .modal-content { padding: 18px; }
  .link-row { grid-template-columns: 1fr; }
}
</style>
