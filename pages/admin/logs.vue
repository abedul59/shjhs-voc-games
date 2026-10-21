<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Papa from 'papaparse';
import { regularClassPermissions, schoolClassNames, specialClassPermissionIds } from '~/lib/admin-class-permissions';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();
const logs = ref([]);
const isLoading = ref(true);
const identityMode = ref('student'); 
const selectedClass = ref('ALL');
const studentsMap = ref({});
const specialClasses = ref([]);
const specialMemberIds = ref({});
const errorMessage = ref('');
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');
const allowedClasses = computed(() => Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : []);
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.value.includes('ALL'));
const allowedRegularClasses = computed(() => regularClassPermissions(allowedClasses.value));
const allowedSpecialIds = computed(() => specialClassPermissionIds(allowedClasses.value));
const classOptions = computed(() => [
  ...(isSuperAdmin.value ? schoolClassNames() : allowedRegularClasses.value).map(name => ({ value: name, label: `${name} 班` })),
  ...specialClasses.value.map(group => ({ value: `special:${group.id}`, label: `📚 ${group.name}（特殊班級）` }))
]);

const loadClassData = async () => {
  const [{ data: students, error: studentError }, { data: groups, error: groupError }] = await Promise.all([
    supabase.from('students').select('*').limit(10000),
    supabase.from('special_classes').select('id,grade,name').order('grade').order('name')
  ]);
  if (studentError) errorMessage.value = `學生資料讀取失敗：${studentError.message}`;
  if (groupError && !['42P01', 'PGRST205'].includes(groupError.code)) errorMessage.value = `特殊班級讀取失敗：${groupError.message}`;
  specialClasses.value = isSuperAdmin.value ? (groups || []) : (groups || []).filter(group => allowedSpecialIds.value.includes(group.id));
  const memberships = {};
  await Promise.all(specialClasses.value.map(async group => {
    const { data } = await supabase.from('special_class_members').select('student_id').eq('special_class_id', group.id);
    memberships[group.id] = new Set((data || []).map(item => item.student_id));
  }));
  specialMemberIds.value = memberships;
  studentsMap.value = Object.fromEntries((students || []).map(student => [String(student.student_id), student]));
};

const fetchLogs = async () => {
  isLoading.value = true;
  const { data, error } = await supabase.from('login_logs').select('*').order('login_time', { ascending: false }).limit(2000);
  if (data) logs.value = data;
  isLoading.value = false;
};

onMounted(async () => {
  await Promise.all([loadClassData(), fetchLogs()]);
});

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    if (identityMode.value === 'anon') return !!log.is_anon;
    if (log.is_anon) return false;
    const student = studentsMap.value[String(log.student_id)];
    if (!student) return isSuperAdmin.value && selectedClass.value === 'ALL';
    const authorizedByRegular = isSuperAdmin.value || allowedRegularClasses.value.includes(student.class_name);
    const authorizedBySpecial = specialClasses.value.some(group => specialMemberIds.value[group.id]?.has(student.id));
    if (!authorizedByRegular && !authorizedBySpecial) return false;
    if (selectedClass.value === 'ALL') return true;
    if (selectedClass.value.startsWith('special:')) {
      const specialId = selectedClass.value.slice('special:'.length);
      return specialMemberIds.value[specialId]?.has(student.id) || false;
    }
    return student.class_name === selectedClass.value;
  });
});

watch(identityMode, () => { selectedClass.value = 'ALL'; });

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

const loginMethodLabel = (log) => {
  if (log.is_anon || log.login_method === 'anonymous') return '匿名訪客';
  if (log.login_method === 'school_student_id') return '正式學號';
  if (log.login_method === 'class_seat') return '班級＋座號';
  return '舊紀錄（未標示）';
};

const exportToCSV = () => {
  if (filteredLogs.value.length === 0) return alert('目前沒有任何紀錄可以匯出！');
  const exportData = filteredLogs.value.map(log => ({
    '身分': log.is_anon ? '匿名訪客' : '實名學生',
    '登入方式': loginMethodLabel(log),
    '遊戲帳號': log.student_id,
    '正式學號': studentsMap.value[String(log.student_id)]?.school_student_id || '',
    '姓名': log.real_name,
    '原班': studentsMap.value[String(log.student_id)]?.class_name || (log.is_anon ? '無' : '未知'),
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
      <label v-if="identityMode === 'student'" class="class-filter">班級篩選
        <select v-model="selectedClass" class="retro-input">
          <option value="ALL">🌟 全部授權班級</option>
          <option v-for="option in classOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
    </div>

    <p v-if="errorMessage" class="error-msg" role="alert">⚠️ {{ errorMessage }}</p>

    <div class="table-container retro-element">
      <p v-if="isLoading" class="loading-msg">⏳ 讀取中...</p>
      <table v-else class="retro-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>登入方式</th>
            <th>正式學號</th>
            <th>遊戲帳號</th>
            <th>原班</th>
            <th>登入時間</th>
            <th>登出時間</th>
            <th>設備</th>
            <th>IP 位址</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredLogs.length === 0"><td colspan="9" class="empty-msg">沒有符合的紀錄。</td></tr>
          <tr v-for="log in filteredLogs" :key="log.id">
            <td><strong>{{ log.real_name }}</strong></td>
            <td>{{ loginMethodLabel(log) }}</td>
            <td>{{ studentsMap[String(log.student_id)]?.school_student_id || '—' }}</td>
            <td>{{ log.student_id }}</td>
            <td>{{ studentsMap[String(log.student_id)]?.class_name || (log.is_anon ? '無' : '未知') }}</td>
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
.class-filter { display:flex;align-items:center;gap:10px;margin-top:14px;font-weight:900;color:var(--text-main); }
.retro-input { min-width:230px;padding:9px 12px;border:2px solid var(--border-color);border-radius:8px;background:var(--input-bg);color:var(--text-main);font:inherit;font-weight:800; }
.error-msg { padding:12px;border:2px solid #ef5350;border-radius:8px;background:#ffebee;color:#b71c1c;font-weight:800; }
.id-btn { flex: 1; min-width: 30%; padding: 10px; font-size: 1rem; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); background: var(--box-bg); color: var(--text-main); transition: all 0.2s;}
.id-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.table-container { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); overflow-x: auto; }
.retro-table { width: 100%; border-collapse: collapse; text-align: left; color: var(--text-main); }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 2px solid var(--border-color); white-space: nowrap; font-weight: bold;}
.retro-table th { background: var(--tab-bg); font-weight: 900; }
.time-col { font-family: monospace; font-size: 0.95rem; }
.empty-msg, .loading-msg { text-align: center; padding: 20px; font-weight: 900; }
</style>
