<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();
const logs = ref([]);
const isLoading = ref(true);
const identityMode = ref('student'); 

const fetchLogs = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('login_logs').select('*').order('login_time', { ascending: false }).limit(2000);
  if (data) logs.value = data;
  isLoading.value = false;
};

onMounted(fetchLogs);

const filteredLogs = computed(() => {
  return logs.value.filter(log => identityMode.value === 'student' ? !log.is_anon : log.is_anon);
});

const formatDateTime = (dateString) => {
  if (!dateString) return '未登出 / 關閉網頁';
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
};

const parseDevice = (ua) => {
  if (!ua) return '未知';
  if (ua.includes('iPhone')) return '📱 iPhone';
  if (ua.includes('iPad')) return '📱 iPad';
  if (ua.includes('Android')) return '📱 Android';
  if (ua.includes('Windows')) return '💻 Windows';
  if (ua.includes('Mac OS')) return '💻 Mac';
  return '🖥️ 其他';
};

const exportToCSV = () => {
  if (filteredLogs.value.length === 0) return alert('目前沒有任何紀錄可以匯出！');
  const exportData = filteredLogs.value.map(log => ({
    '身分': log.is_anon ? '匿名訪客' : '實名學生',
    '學號/ID': log.student_id,
    '姓名': log.real_name,
    'IP位址': log.ip_address,
    '設備系統': parseDevice(log.device_info),
    '完整設備資訊': log.device_info,
    '登入時間': formatDateTime(log.login_time),
    '登出時間': formatDateTime(log.logout_time)
  }));
  const csvString = Papa.unparse(exportData);
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = `登入紀錄_${identityMode.value === 'student' ? '實名' : '匿名'}.csv`;
  link.click();
};
</script>

<template>
  <div class="admin-container">
    <div class="header"><h1>🔐 登入紀錄</h1></div>
    <div class="top-actions">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回</NuxtLink>
      <button class="retro-btn export-btn" @click="exportToCSV" :disabled="isLoading">📊 匯出CSV</button>
    </div>

    <div class="filters-panel retro-element">
      <div class="identity-tabs">
        <button class="id-btn" :class="{active: identityMode === 'student'}" @click="identityMode = 'student'">🧑‍🎓 實名學生</button>
        <button class="id-btn" :class="{active: identityMode === 'anon'}" @click="identityMode = 'anon'">🕵️ 匿名訪客</button>
      </div>
    </div>

    <div class="table-container retro-element">
      <p v-if="isLoading" class="loading-msg">⏳ 讀取中...</p>
      <table v-else class="retro-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>學號/ID</th>
            <th>登入時間</th>
            <th>登出時間</th>
            <th>設備</th>
            <th>IP 位址</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredLogs.length === 0"><td colspan="6" class="empty-msg">沒有符合的紀錄。</td></tr>
          <tr v-for="log in filteredLogs" :key="log.id">
            <td><strong>{{ log.real_name }}</strong></td>
            <td>{{ log.student_id }}</td>
            <td class="time-col" style="color:var(--success-color);">🟢 {{ formatDateTime(log.login_time) }}</td>
            <td class="time-col" :style="{color: log.logout_time ? 'var(--danger-color)' : 'var(--text-muted)'}">
              {{ log.logout_time ? '🔴 ' + formatDateTime(log.logout_time) : '未登出' }}
            </td>
            <td>{{ parseDevice(log.device_info) }}</td>
            <td><code>{{ log.ip_address }}</code></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1200px; margin: 0 auto; box-sizing: border-box; }
.header { text-align: center; margin-bottom: 20px; }
.header h1 { font-size: 2rem; color: var(--text-main); font-weight: 900; margin: 0; }
.top-actions { display: flex; justify-content: space-between; margin-bottom: 20px; }

.retro-btn { padding: 10px 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); cursor: pointer; background: var(--box-bg); color: var(--text-main); text-decoration: none; transition: all 0.15s;}
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.export-btn { background-color: var(--btn-primary-bg); color: var(--btn-primary-text); }

.filters-panel { background: var(--tab-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 20px; box-shadow: var(--shadow-btn); }
.identity-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.id-btn { flex: 1; min-width: 30%; padding: 10px; font-size: 1rem; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); background: var(--box-bg); color: var(--text-main); transition: all 0.2s;}
.id-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.table-container { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); overflow-x: auto; }
.retro-table { width: 100%; border-collapse: collapse; text-align: left; color: var(--text-main); }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 2px solid var(--border-color); white-space: nowrap; font-weight: bold;}
.retro-table th { background: var(--tab-bg); font-weight: 900; }
.time-col { font-family: monospace; font-size: 0.95rem; }
.empty-msg, .loading-msg { text-align: center; padding: 20px; font-weight: 900; }
</style>