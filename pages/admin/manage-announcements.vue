<script setup>
import { ref, onMounted } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const announcements = ref([]);
const isLoading = ref(true);

const showModal = ref(false);
const isEditing = ref(false);
const formData = ref({ id: null, title: '', content: '', type: 'info', is_active: true, is_pinned: false, links: [] });

const fetchAnnouncements = async () => {
  isLoading.value = true;
  const { data } = await supabase.from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false }) 
    .order('created_at', { ascending: false });
  if (data) announcements.value = data;
  isLoading.value = false;
};

onMounted(fetchAnnouncements);

const openAddModal = () => {
  isEditing.value = false;
  formData.value = { id: null, title: '', content: '', type: 'info', is_active: true, is_pinned: false, links: [] };
  showModal.value = true;
};

const openEditModal = (item) => {
  isEditing.value = true;
  
  // 🌟 防護：確保編輯時能正確讀取陣列
  let parsedLinks = [];
  if (item.links) {
    if (typeof item.links === 'string') {
      try { parsedLinks = JSON.parse(item.links); } catch(e) {}
    } else if (Array.isArray(item.links)) {
      parsedLinks = [...item.links];
    }
  }

  formData.value = { ...item, links: parsedLinks };
  showModal.value = true;
};

const addLink = () => {
  formData.value.links.push({ title: '', url: '' });
};
const removeLink = (index) => {
  formData.value.links.splice(index, 1);
};

const saveAnnouncement = async () => {
  if (!formData.value.title) return alert('標題不能為空！');
  
  const validLinks = formData.value.links.filter(l => l.title.trim() !== '' && l.url.trim() !== '');

  const payload = {
    title: formData.value.title,
    content: formData.value.content,
    type: formData.value.type,
    is_active: formData.value.is_active,
    is_pinned: formData.value.is_pinned,
    links: validLinks // 存入陣列
  };

  if (isEditing.value) {
    await supabase.from('announcements').update(payload).eq('id', formData.value.id);
  } else {
    await supabase.from('announcements').insert([payload]);
  }
  
  showModal.value = false;
  fetchAnnouncements();
};

const toggleActive = async (item) => {
  await supabase.from('announcements').update({ is_active: !item.is_active }).eq('id', item.id);
  fetchAnnouncements();
};

const togglePin = async (item) => {
  await supabase.from('announcements').update({ is_pinned: !item.is_pinned }).eq('id', item.id);
  fetchAnnouncements();
};

const deleteAnnouncement = async (id) => {
  if (confirm('確定要刪除這則公告嗎？')) {
    await supabase.from('announcements').delete().eq('id', id);
    fetchAnnouncements();
  }
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>📢 公佈欄管理系統</h1>
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回控制中心</NuxtLink>
    </div>

    <div class="toolbar">
      <button class="retro-btn add-btn" @click="openAddModal">➕ 新增公告</button>
    </div>

    <div class="table-container retro-element">
      <p v-if="isLoading">⏳ 讀取中...</p>
      <table v-else class="retro-table">
        <thead>
          <tr>
            <th width="100">發布日期</th>
            <th width="80">置頂</th>
            <th width="80">狀態</th>
            <th width="80">類型</th>
            <th>標題</th>
            <th width="150">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in announcements" :key="item.id" :class="{ 'pinned-row': item.is_pinned }">
            <td>{{ formatDate(item.created_at) }}</td>
            <td>
              <button class="status-btn" :class="item.is_pinned ? 'active-pin' : 'inactive'" @click="togglePin(item)">
                {{ item.is_pinned ? '📌 是' : '否' }}
              </button>
            </td>
            <td>
              <button class="status-btn" :class="item.is_active ? 'active' : 'inactive'" @click="toggleActive(item)">
                {{ item.is_active ? '👁️ 顯示' : '🙈 隱藏' }}
              </button>
            </td>
            <td>
              <span class="badge" :class="item.type">
                {{ item.type === 'info' ? '一般' : (item.type === 'warning' ? '重要' : '更新') }}
              </span>
            </td>
            <td style="font-weight: bold;">
              {{ item.title }}
              <span v-if="Array.isArray(item.links) && item.links.length > 0" style="color: #1976d2; font-size: 0.85rem; margin-left: 5px;">(🔗 {{ item.links.length }})</span>
              <span v-else-if="typeof item.links === 'string' && item.links.includes('url')" style="color: #1976d2; font-size: 0.85rem; margin-left: 5px;">(🔗 附連結)</span>
            </td>
            <td class="action-cell">
              <button class="action-btn edit" @click="openEditModal(item)">✏️</button>
              <button class="action-btn del" @click="deleteAnnouncement(item.id)">🗑️</button>
            </td>
          </tr>
          <tr v-if="announcements.length === 0"><td colspan="6" class="empty-msg">目前尚無公告</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-box retro-element">
        <h2>{{ isEditing ? '✏️ 編輯公告' : '➕ 新增公告' }}</h2>
        
        <div class="form-group-inline">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.is_pinned"> 📌 設為置頂公告
          </label>
        </div>

        <div class="form-group">
          <label>標題 *</label>
          <input type="text" v-model="formData.title" class="retro-input" placeholder="請輸入公告標題">
        </div>
        
        <div class="form-group">
          <label>類型 (選擇「重要通知」會呈現紅色)</label>
          <select v-model="formData.type" class="retro-input">
            <option value="info">🟦 一般公告</option>
            <option value="update">🟩 系統更新</option>
            <option value="warning">🟥 重要通知</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>詳細內容 (選填)</label>
          <textarea v-model="formData.content" class="retro-input" rows="3" placeholder="請輸入詳細說明..."></textarea>
        </div>

        <div class="links-section">
          <label>🔗 相關連結 / 附件網址 (選填)</label>
          <div v-for="(link, idx) in formData.links" :key="idx" class="link-row">
            <input type="text" v-model="link.title" class="retro-input link-title" placeholder="按鈕文字 (例: 點我報名)">
            <input type="text" v-model="link.url" class="retro-input link-url" placeholder="https://...">
            <button class="del-link-btn" @click="removeLink(idx)">❌</button>
          </div>
          <button class="add-link-btn" @click="addLink">➕ 增加一個網址</button>
        </div>

        <div class="modal-actions">
          <button class="retro-btn save-btn" @click="saveAnnouncement">💾 儲存</button>
          <button class="retro-btn cancel-btn" @click="showModal = false">❌ 取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1100px; margin: 0 auto; box-sizing: border-box; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;}
.header h1 { margin: 0; color: #333; font-weight: 900;}

.retro-btn { padding: 8px 15px; font-weight: 900; border: 2px solid #333; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; transition: 0.1s;}
.retro-btn:active { transform: translateY(2px); }
.back-btn { background: #e0e0e0; color: #333;}
.add-btn { background: #3f51b5; color: white; margin-bottom: 15px;}

.table-container { background: white; border: 2px solid #ccc; border-radius: 12px; padding: 15px;}
.retro-table { width: 100%; border-collapse: collapse; text-align: left; }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
.retro-table th { background: #f5f5f5; font-weight: 900; }
.pinned-row { background: #fffde7; } 

.status-btn { padding: 5px 10px; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-weight: bold; background: white;}
.status-btn.active { color: #2e7d32; border-color: #4caf50; background: #e8f5e9;}
.status-btn.active-pin { color: #e65100; border-color: #ffb300; background: #fff8e1;}
.status-btn.inactive { color: #777; background: #eee;}

.badge { padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; color: white;}
.badge.info { background: #2196f3; }
.badge.update { background: #4caf50; }
.badge.warning { background: #f44336; }

.action-cell { display: flex; gap: 5px;}
.action-btn { background: none; border: 1px solid #ccc; border-radius: 6px; font-size: 1.2rem; cursor: pointer; padding: 4px 8px;}
.action-btn:hover { background: #eee; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px;}
.modal-box { background: white; border: 3px solid #333; border-radius: 12px; padding: 25px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto;}

.form-group { display: flex; flex-direction: column; margin-bottom: 15px; }
.form-group label { font-weight: bold; margin-bottom: 5px; }
.form-group-inline { margin-bottom: 15px; }
.checkbox-label { font-weight: bold; color: #d32f2f; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; gap: 5px;}
.checkbox-label input { width: 18px; height: 18px; cursor: pointer;}
.retro-input { padding: 10px; border: 2px solid #ccc; border-radius: 8px; font-family: inherit; font-size: 1rem; }

.links-section { background: #f5f5f5; padding: 15px; border-radius: 8px; border: 1px dashed #ccc; margin-bottom: 15px;}
.links-section label { font-weight: bold; margin-bottom: 10px; display: block; color: #1976d2;}
.link-row { display: flex; gap: 5px; margin-bottom: 10px; }
.link-title { width: 30%; }
.link-url { width: 60%; }
.del-link-btn { background: none; border: none; cursor: pointer; font-size: 1.2rem; }
.add-link-btn { background: #e3f2fd; color: #1976d2; border: 1px solid #90caf9; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%;}
.add-link-btn:hover { background: #bbdefb; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.save-btn { background: #4caf50; color: white; }
.cancel-btn { background: #eee; color: #333; }
.empty-msg { text-align: center; color: #999; padding: 20px; font-weight: bold; }
</style>