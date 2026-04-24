<script setup>
import { ref, onMounted } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const songs = ref([]);
const isLoading = ref(true);
const showModal = ref(false);
const isEditing = ref(false);

const formData = ref({ id: null, title: '', lyrics: '', youtube_url: '' });

const fetchSongs = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('speakno3_songs').select('*').order('created_at', { ascending: false });
  if (!error && data) songs.value = data;
  isLoading.value = false;
};

onMounted(fetchSongs);

const openAddModal = () => {
  isEditing.value = false;
  formData.value = { id: null, title: '', lyrics: '', youtube_url: '' };
  showModal.value = true;
};

const openEditModal = (song) => {
  isEditing.value = true;
  formData.value = { ...song };
  showModal.value = true;
};

const saveSong = async () => {
  if (!formData.value.title || !formData.value.lyrics) return alert("歌名和歌詞不能為空！");
  
  if (isEditing.value) {
    await supabase.from('speakno3_songs').update({
      title: formData.value.title, lyrics: formData.value.lyrics, youtube_url: formData.value.youtube_url
    }).eq('id', formData.value.id);
  } else {
    await supabase.from('speakno3_songs').insert([{
      title: formData.value.title, lyrics: formData.value.lyrics, youtube_url: formData.value.youtube_url
    }]);
  }
  showModal.value = false;
  fetchSongs();
};

const deleteSong = async (id) => {
  if (confirm("確定要刪除這首歌嗎？")) {
    await supabase.from('speakno3_songs').delete().eq('id', id);
    fetchSongs();
  }
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <NuxtLink to="/admin" class="back-btn">⬅ 返回控制中心</NuxtLink>
      <h1>🎵 口說學霸3 - 歌單管理 (八年級專屬)</h1>
      <button class="add-btn" @click="openAddModal">➕ 新增歌曲</button>
    </div>

    <div v-if="isLoading" class="loading">載入中...</div>
    <div v-else class="song-list">
      <div v-for="song in songs" :key="song.id" class="song-card">
        <div class="badge">🎸 八年級特訓</div>
        <h2>{{ song.title }}</h2>
        <a v-if="song.youtube_url" :href="song.youtube_url" target="_blank" class="yt-link">▶️ YouTube 連結</a>
        <p class="preview">{{ song.lyrics.substring(0, 60) }}...</p>
        <div class="actions">
          <button @click="openEditModal(song)" class="edit-btn">✏️ 編輯</button>
          <button @click="deleteSong(song.id)" class="del-btn">🗑️ 刪除</button>
        </div>
      </div>
      <div v-if="songs.length === 0" class="empty">目前還沒有歌曲喔！</div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>{{ isEditing ? '編輯歌曲' : '新增歌曲' }}</h2>
        <div class="form-group">
          <label>歌曲名稱：</label>
          <input type="text" v-model="formData.title" class="retro-input" placeholder="例如：Let It Go">
        </div>
        <div class="form-group">
          <label>YouTube 連結 (選填)：</label>
          <input type="text" v-model="formData.youtube_url" class="retro-input" placeholder="貼上 YouTube 網址">
        </div>
        <div class="form-group">
          <label>完整歌詞：(請一行一句排版)</label>
          <textarea v-model="formData.lyrics" class="retro-input" rows="10" placeholder="請將歌詞貼在此處..."></textarea>
        </div>
        <div class="modal-actions">
          <button @click="showModal = false" class="cancel-btn">取消</button>
          <button @click="saveSong" class="save-btn">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px;}
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
h1 { margin: 0; color: #2c3e50; font-size: 1.8rem;}
.add-btn { background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem;}
.song-list { display: flex; flex-direction: column; gap: 15px; }
.song-card { border: 2px solid #e0e0e0; border-radius: 12px; padding: 15px; background: #fff; position: relative;}
.badge { position: absolute; top: -10px; left: 15px; background: #e91e63; padding: 5px 15px; border-radius: 20px; font-weight: bold; color: white; font-size: 0.9rem;}
.song-card h2 { margin: 15px 0 5px 0; color: #333; }
.yt-link { display: inline-block; background: #ffebee; color: #d32f2f; padding: 4px 10px; border-radius: 6px; font-size: 0.9rem; text-decoration: none; font-weight: bold; margin-bottom: 10px;}
.preview { color: #666; font-size: 0.9rem; margin-bottom: 15px; white-space: pre-line; }
.actions { display: flex; gap: 10px; }
.edit-btn, .del-btn { padding: 5px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 1px solid #ccc;}
.edit-btn { background: #e3f2fd; color: #1976d2; border-color: #90caf9;}
.del-btn { background: #ffebee; color: #c62828; border-color: #ef9a9a;}
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;}
.modal-content { background: white; padding: 30px; border-radius: 16px; width: 90%; max-width: 600px;}
.form-group { margin-bottom: 15px; display: flex; flex-direction: column; gap: 5px;}
.retro-input { padding: 10px; border: 2px solid #ccc; border-radius: 8px; font-size: 1rem; font-family: inherit;}
.modal-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px;}
.cancel-btn, .save-btn { padding: 10px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 1.1rem;}
.cancel-btn { background: #e0e0e0; color: #333; } .save-btn { background: #4caf50; color: white; }
</style>