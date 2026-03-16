<script setup>
import { ref, onMounted } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');

const logs = ref([]);
const isLoading = ref(true);

onMounted(() => {
  // 安全防護：只有總管理員能看
  if (!authCookie.value || !authCookie.value.classes.includes('ALL')) {
    alert('⛔ 拒絕存取：您沒有最高管理員權限！');
    navigateTo('/admin');
    return;
  }
  fetchLogs();
});

const fetchLogs = async () => {
  isLoading.value = true;
  // 抓取最近的 200 筆紀錄，依照時間由新到舊排序
  const { data, error } = await supabase
    .from('teacher_logs')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(200);

  if (!error && data) {
    logs.value = data;
  }
  isLoading.value = false;
};

// 把網址翻譯成人類看得懂的名稱
const translatePath = (path) => {
  if (path === '/admin') return '🏠 後台首頁 (Dashboard)';
  if (path === '/admin/students') return '🧑‍🎓 學生名單管理';
  if (path === '/admin/records') return '🏆 紀錄報表';
  if (path === '/admin/stats') return '📈 對錯分析';
  if (path === '/admin/leaderboard') return '🏅 英雄榜';
  if (path === '/admin/logs') return '🕒 學生登入紀錄';
  return `📄 其他頁面 (${path})`;
};

// 格式化時間
const formatTime = (timeStr) => {
  if (!timeStr) return '--';
  const d = new Date(timeStr);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
};

// 格式化停留秒數
const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '未結算 (仍在頁面或直接關閉)';
  if (seconds < 60) return `${seconds} 秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} 分 ${secs} 秒`;
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>🕵️ 教師活動足跡追蹤</h1>
      <p class="role-badge">🔒 總管理員專屬頁面</p>
    </div>

    <div class="top-actions">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回控制中心</NuxtLink>
      <button class="retro-btn reload-btn" @click="fetchLogs">🔄 重新整理</button>
    </div>

    <div class="table-container retro-element">
      <p v-if="isLoading" class="loading-msg">⏳ 調閱紀錄中...</p>
      <table v-else class="retro-table">
        <thead>
          <tr>
            <th>教師姓名</th>
            <th>瀏覽頁面</th>
            <th>進入時間</th>
            <th>停留時間</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="logs.length === 0">
            <td colspan="4" class="empty-msg">目前尚無其他教師的操作紀錄。</td>
          </tr>
          <tr v-for="log in logs" :key="log.id">
            <td class="name-text"><strong>{{ log.teacher_name }}</strong></td>
            <td><span class="path-badge">{{ translatePath(log.page_path) }}</span></td>
            <td>{{ formatTime(log.start_time) }}</td>
            <td :class="{'highlight-time': log.duration_seconds !== null}">
              {{ formatDuration(log.duration_seconds) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 900px; margin: 0 auto; min-height: 100vh;}
.header h1 { font-size: 2rem; color: var(--text-main); font-weight: 900; margin-bottom: 5px; text-align: center; }
.role-badge { text-align: center; color: var(--danger-color); font-weight: bold; margin-bottom: 20px; background: var(--danger-bg); padding: 5px 15px; border-radius: 20px; display: inline-block; border: 2px solid var(--danger-color);}
.header { text-align: center; }

.top-actions { display: flex; justify-content: space-between; margin-bottom: 20px; }

.table-container { background: var(--box-bg); padding: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); overflow-x: auto;}
.retro-table { width: 100%; border-collapse: collapse; text-align: left; }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 2px dashed #ccc; color: var(--text-main); font-weight: bold;}
.retro-table th { background: var(--tab-bg); font-size: 1.1rem; border-bottom: 2px solid var(--border-color);}

.name-text { font-size: 1.1rem; color: #0277bd; }
.path-badge { background: #eee; padding: 5px 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.95rem; }
.highlight-time { color: var(--success-color); font-weight: 900; }
.empty-msg { text-align: center; padding: 30px; color: var(--text-muted); font-weight: bold;}

.retro-btn { padding: 10px 15px; font-weight: bold; font-size: 1rem; cursor: pointer; border: 2px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 0 var(--border-color); transition: 0.1s; text-decoration: none; display: inline-block;}
.retro-btn:active { transform: translateY(4px); box-shadow: none; }
.back-btn { background: var(--tab-bg); color: var(--text-main); }
.reload-btn { background: var(--info-bg); color: var(--text-main); }
</style>