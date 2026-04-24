<script setup>
import { ref, onMounted } from 'vue';

const supabase = useSupabaseClient();
const announcements = ref([]);

onMounted(async () => {
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8); 
    
  if (data) announcements.value = data;
});

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()}`;
};

// 🌟 核心防護：確保 links 格式絕對正確 (防止資料庫存成字串導致無法顯示)
const getValidLinks = (linksData) => {
  if (!linksData) return [];
  if (typeof linksData === 'string') {
    try { return JSON.parse(linksData); } catch (e) { return []; }
  }
  if (Array.isArray(linksData)) return linksData;
  return [];
};
</script>

<template>
  <div class="bbs-container retro-element" v-if="announcements.length > 0">
    <h3 class="bbs-title">📢 校園佈告欄</h3>
    <ul class="bbs-list">
      <li v-for="item in announcements" :key="item.id" class="bbs-item" :class="{ 'pinned': item.is_pinned }">
        <div class="bbs-header">
          <span v-if="item.is_pinned" class="pin-icon" title="置頂公告">📌</span>
          <span v-else class="bbs-date">{{ formatDate(item.created_at) }}</span>
          
          <span class="bbs-badge" :class="item.type">
            {{ item.type === 'info' ? '一般' : (item.type === 'warning' ? '重要' : '更新') }}
          </span>
          <strong class="bbs-subject">{{ item.title }}</strong>
        </div>
        
        <div v-if="item.content" class="bbs-content">
          {{ item.content }}
        </div>
        
        <div v-if="getValidLinks(item.links).length > 0" class="bbs-links">
          <a v-for="(link, idx) in getValidLinks(item.links)" :key="idx" :href="link.url" target="_blank" class="bbs-link-btn">
            🔗 {{ link.title }}
          </a>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.bbs-container { background: #fffde7; border: 3px solid #ffb300; border-radius: 12px; padding: 15px; margin-bottom: 25px; box-shadow: 4px 4px 0 #ffca28; width: 100%; max-width: 450px; box-sizing: border-box;}
.bbs-title { margin: 0 0 15px 0; color: #f57f17; font-weight: 900; font-size: 1.2rem; border-bottom: 2px dashed #ffca28; padding-bottom: 8px;}

.bbs-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.bbs-item { background: white; border: 2px solid #ffe082; border-radius: 8px; padding: 12px; transition: 0.2s;}
.bbs-item:hover { border-color: #ffb300; transform: translateX(3px);}

.bbs-item.pinned { border: 2px solid #ff9800; background: #fff8e1; box-shadow: 2px 2px 0 #ffcc80;}
.pin-icon { font-size: 1.2rem; margin-right: -2px; animation: bounce 2s infinite;}
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

.bbs-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;}
.bbs-date { font-size: 0.85rem; color: #795548; font-weight: bold; background: #efebe9; padding: 2px 6px; border-radius: 4px;}
.bbs-badge { font-size: 0.8rem; padding: 3px 8px; border-radius: 12px; font-weight: bold; color: white;}
.bbs-badge.info { background: #29b6f6; }
.bbs-badge.update { background: #66bb6a; }
.bbs-badge.warning { background: #ef5350; }

.bbs-subject { font-size: 1.05rem; color: #333; line-height: 1.3;}
.bbs-content { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee; font-size: 0.95rem; color: #555; white-space: pre-wrap; line-height: 1.5;}

.bbs-links { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.bbs-link-btn { display: inline-block; background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; text-decoration: none; transition: 0.2s; box-shadow: 1px 1px 0 #90caf9;}
.bbs-link-btn:hover { background: #bbdefb; transform: translateY(-1px); box-shadow: 2px 2px 0 #64b5f6; }
.bbs-link-btn:active { transform: translateY(1px); box-shadow: none; }
</style>