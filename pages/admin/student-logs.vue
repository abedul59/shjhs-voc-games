<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { getStudentActivity, studentActivityPaths } from '~/lib/student-activity-labels';
import { regularClassPermissions, specialClassPermissionIds } from '~/lib/admin-class-permissions';

const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');

const allLogs = ref([]); // 所有的足跡紀錄
const studentsMap = ref({}); // 用來對應學號與學生資料的字典
const classesList = ref([]); // 班級清單
const specialClasses = ref([]);
const specialMemberIds = ref({});
const selectedClass = ref('ALL'); // 預設顯示全部班級
const selectedStudentId = ref(null); // 當前選中要查看詳細資料的學生 ID
const isLoading = ref(true);
const errorMessage = ref('');
const perspective = ref('all');
const selectedGamePath = ref('/game');
const selectedPeriodDays = ref(7);
const selectedDate = ref(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date()));
const allowedClasses = computed(() => Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : []);
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.value.includes('ALL'));
const classOptions = computed(() => [
  ...classesList.value.map(name => ({ value: name, label: `${name} 班` })),
  ...specialClasses.value.map(group => ({ value: `special:${group.id}`, label: `📚 ${group.name}（特殊班級）` }))
]);
const periodOptions = [
  { days: 7, label: '過去一週' },
  { days: 14, label: '過去兩週' },
  { days: 30, label: '過去一個月' }
];
const gameOptions = Object.entries(studentActivityPaths)
  .filter(([path]) => path.startsWith('/game'))
  .map(([path, label]) => ({ path, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
const studentOptions = computed(() => Object.values(studentsMap.value)
  .filter(student => {
    if (selectedClass.value === 'ALL') return true;
    if (selectedClass.value.startsWith('special:')) {
      const specialId = selectedClass.value.slice('special:'.length);
      return specialMemberIds.value[specialId]?.has(student.id);
    }
    return student.class_name === selectedClass.value;
  })
  .sort((a, b) => `${a.class_name}${String(a.seat_number).padStart(3, '0')}`.localeCompare(`${b.class_name}${String(b.seat_number).padStart(3, '0')}`, 'zh-Hant', { numeric: true }))
  .map(student => ({
    id: String(student.student_id),
    label: `${student.class_name} 班 ${student.seat_number} 號－${student.real_name || student.hidden_name}${student.school_student_id ? `（${student.school_student_id}）` : ''}`
  })));
let fetchSequence = 0;

onMounted(async () => {
  // 安全權限檢查
  const hasAuth = isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || (authCookie.value && authCookie.value.classes);
  if (!hasAuth) {
    navigateTo('/admin/login');
    return;
  }
  
  await fetchStudentData();
  await fetchLogs();
});

// 🌟 1. 先抓取所有學生資料，建立「學號 -> 學生資訊」的字典
const fetchStudentData = async () => {
  errorMessage.value = '';
  const regularAllowed = regularClassPermissions(allowedClasses.value);
  const specialAllowed = specialClassPermissionIds(allowedClasses.value);
  const [{ data: sData, error: studentError }, { data: groups, error: groupError }] = await Promise.all([
    supabase.from('students').select('*').limit(10000),
    supabase.from('special_classes').select('id,grade,name').order('grade').order('name')
  ]);
  if (studentError) { errorMessage.value = `學生資料讀取失敗：${studentError.message}`; return; }
  if (groupError && !['42P01', 'PGRST205'].includes(groupError.code)) errorMessage.value = `特殊班級讀取失敗：${groupError.message}`;

  specialClasses.value = isSuperAdmin.value ? (groups || []) : (groups || []).filter(group => specialAllowed.includes(group.id));
  const membershipMap = {};
  await Promise.all(specialClasses.value.map(async group => {
    const { data } = await supabase.from('special_class_members').select('student_id').eq('special_class_id', group.id);
    membershipMap[group.id] = new Set((data || []).map(item => item.student_id));
  }));
  specialMemberIds.value = membershipMap;

  const cSet = new Set();
  const nextStudentsMap = {};
  for (const student of sData || []) {
    const inSpecialClass = specialClasses.value.some(group => membershipMap[group.id]?.has(student.id));
    const inRegularClass = isSuperAdmin.value || regularAllowed.includes(student.class_name);
    if (!isSuperAdmin.value && !inRegularClass && !inSpecialClass) continue;
    nextStudentsMap[String(student.student_id)] = student;
    if (student.class_name && (isSuperAdmin.value || regularAllowed.includes(student.class_name))) cSet.add(student.class_name);
  }
  studentsMap.value = nextStudentsMap;
  classesList.value = [...cSet].sort();
};

// 🌟 2. 抓取足跡資料
const fetchLogs = async () => {
  const sequence = ++fetchSequence;
  isLoading.value = true;
  errorMessage.value = '';
  const collected = [];
  const maxRows = perspective.value === 'all' ? 3000 : 10000;
  const batchSize = 1000;
  let queryError = null;
  let dateStart = null;
  let dateEnd = null;
  let periodStart = null;
  if (perspective.value === 'date' && selectedDate.value) {
    dateStart = new Date(`${selectedDate.value}T00:00:00+08:00`);
    dateEnd = new Date(dateStart.getTime() + 86400000);
  }
  if (['student', 'game'].includes(perspective.value)) {
    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    periodStart = new Date(`${todayKey}T00:00:00+08:00`);
    periodStart = new Date(periodStart.getTime() - (Number(selectedPeriodDays.value) - 1) * 86400000);
  }

  for (let offset = 0; offset < maxRows; offset += batchSize) {
    let query = supabase.from('student_logs').select('*').order('start_time', { ascending: false });
    if (perspective.value === 'date' && dateStart) {
      query = query.gte('start_time', dateStart.toISOString()).lt('start_time', dateEnd.toISOString());
    } else {
      if (periodStart) query = query.gte('start_time', periodStart.toISOString());
      if (perspective.value === 'student' && selectedStudentId.value) query = query.eq('student_id', selectedStudentId.value);
      if (perspective.value === 'game' && selectedGamePath.value) {
        query = query.or(`page_path.eq.${selectedGamePath.value},page_path.like.${selectedGamePath.value}?%`);
      }
    }
    const { data, error } = await query.range(offset, offset + batchSize - 1);
    if (error) { queryError = error; break; }
    collected.push(...(data || []));
    if (!data || data.length < batchSize) break;
  }

  if (sequence !== fetchSequence) return;
  allLogs.value = collected;
  if (queryError) errorMessage.value = `足跡資料讀取失敗：${queryError.message}`;
  isLoading.value = false;
};

watch([perspective, selectedGamePath, selectedDate, selectedPeriodDays, selectedStudentId], ([mode]) => {
  if (mode === 'game' && !selectedGamePath.value) return;
  if (mode === 'date' && !selectedDate.value) return;
  if (mode === 'student' && !selectedStudentId.value) return;
  fetchLogs();
});

watch([perspective, selectedClass, studentOptions], ([mode, , students]) => {
  if (mode !== 'student') return;
  if (!students.some(student => student.id === selectedStudentId.value)) selectedStudentId.value = students[0]?.id || null;
});

const openStudentPerspective = (studentId) => {
  selectedStudentId.value = String(studentId);
  perspective.value = 'student';
};

const closeStudentPerspective = () => {
  selectedStudentId.value = null;
  perspective.value = 'all';
};

// 🌟 3. 計算屬性：根據「所選班級」或「所選學生」來過濾要顯示的紀錄
const displayLogs = computed(() => {
  return allLogs.value.filter(log => {
    // 如果這筆紀錄是匿名訪客 (anon_xxx)，系統內找不到對應學生資料
    const studentInfo = studentsMap.value[log.student_id];
    
    // 若在「全校/特定班級」總表模式
    let identityAllowed = false;
    if (perspective.value !== 'student') {
       if (selectedClass.value === 'ALL') identityAllowed = isSuperAdmin.value || !!studentInfo;
       if (selectedClass.value.startsWith('special:')) {
         const specialId = selectedClass.value.slice('special:'.length);
         identityAllowed = !!studentInfo && specialMemberIds.value[specialId]?.has(studentInfo.id);
       } else if (selectedClass.value !== 'ALL') {
         identityAllowed = !!studentInfo && studentInfo.class_name === selectedClass.value;
       }
    } else {
      identityAllowed = String(log.student_id) === selectedStudentId.value;
    }
    if (!identityAllowed) return false;

    if (perspective.value === 'game') return getStudentActivity(log.page_path).pathname === selectedGamePath.value;
    if (perspective.value === 'date') return taipeiDateKey(log.start_time) === selectedDate.value;
    if (perspective.value === 'student') return String(log.student_id) === selectedStudentId.value;
    return true;
  });
});

// 輔助函式：取得學生的完整稱呼
const getStudentInfo = (id) => {
  if (!id) return { displayName: '未知', class: '-', seat: '-', schoolStudentId: '-', account: '-', fullName: '未知' };
  const studentId = String(id);
  if (studentId.startsWith('anon_')) return { displayName: '匿名訪客', class: '無', seat: '-', schoolStudentId: '-', account: studentId, fullName: `匿名訪客 (${studentId.slice(-4)})` };
  
  const s = studentsMap.value[studentId];
  if (!s) return { displayName: studentId, class: '-', seat: '-', schoolStudentId: '-', account: studentId, fullName: `未知生 (${studentId})` };
  
  const seatNum = s.seat_number || String(s.student_id).slice(-2);
  const name = s.real_name || s.hidden_name;
  return { 
      displayName: name, 
      class: s.class_name, 
      seat: seatNum, 
      schoolStudentId: s.school_student_id || '-',
      account: s.student_id || studentId,
      fullName: `${s.class_name} 班 ${seatNum} 號 - ${name}` 
  };
};

const taipeiDateKey = (timeStr) => {
  if (!timeStr) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(timeStr));
};

const formatDateTime = (timeStr) => {
  if (!timeStr) return '--';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).format(new Date(timeStr));
};

const studentSummary = computed(() => {
  const map = new Map();
  for (const log of displayLogs.value) {
    if (!map.has(log.student_id)) {
      map.set(log.student_id, { studentId: log.student_id, visits: 0, duration: 0, durationCount: 0, first: log.start_time, last: log.start_time, activities: new Map() });
    }
    const row = map.get(log.student_id);
    row.visits += 1;
    if (log.duration_seconds !== null && log.duration_seconds !== undefined && Number.isFinite(Number(log.duration_seconds))) {
      row.duration += Number(log.duration_seconds); row.durationCount += 1;
    }
    if (new Date(log.start_time) < new Date(row.first)) row.first = log.start_time;
    if (new Date(log.start_time) > new Date(row.last)) row.last = log.start_time;
    const activity = getStudentActivity(log.page_path);
    row.activities.set(activity.pathname || log.page_path, activity.name);
  }
  return [...map.values()].map(row => ({
    ...row,
    averageDuration: row.durationCount ? Math.round(row.duration / row.durationCount) : null,
    activityNames: [...row.activities.values()]
  })).sort((a, b) => {
    const left = getStudentInfo(a.studentId);
    const right = getStudentInfo(b.studentId);
    return `${left.class}${String(left.seat).padStart(3, '0')}`.localeCompare(`${right.class}${String(right.seat).padStart(3, '0')}`, 'zh-Hant', { numeric: true });
  });
});

const totalDuration = computed(() => displayLogs.value.reduce((sum, log) => sum + (Number(log.duration_seconds) || 0), 0));
const resultLimit = computed(() => perspective.value === 'all' ? 3000 : 10000);
const resultCapped = computed(() => allLogs.value.length >= resultLimit.value);
const perspectiveLabel = computed(() => {
  const periodLabel = periodOptions.find(period => period.days === Number(selectedPeriodDays.value))?.label || `${selectedPeriodDays.value} 天`;
  if (perspective.value === 'student') return `${getStudentInfo(selectedStudentId.value).fullName}－${periodLabel}`;
  if (perspective.value === 'game') return `${gameOptions.find(game => game.path === selectedGamePath.value)?.label || '指定遊戲'}－${periodLabel}`;
  if (perspective.value === 'date') return `${selectedDate.value}（台灣時間）`;
  return '最近活動總覽';
});

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '仍在該頁面 / 未知';
  return seconds > 60 ? `${Math.floor(seconds/60)}分${seconds%60}秒` : `${seconds}秒`;
};
</script>

<template>
  <div class="admin-logs-container">
    <div class="header-box retro-element">
      <h1>👣 學生足跡追蹤</h1>
      <p>STUDENT FOOTPRINT LOGS</p>
    </div>

    <div class="top-nav">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回後台首頁</NuxtLink>
      <button @click="fetchLogs" class="retro-btn refresh-btn">🔄 重新整理最新資料</button>
    </div>

    <div class="control-panel retro-element">
       <div class="perspective-controls">
         <strong>追蹤視角：</strong>
         <label><input v-model="perspective" type="radio" value="all"> 最近總覽</label>
         <label><input v-model="perspective" type="radio" value="student"> 個別學生</label>
         <label><input v-model="perspective" type="radio" value="game"> 指定遊戲</label>
         <label><input v-model="perspective" type="radio" value="date"> 指定日期</label>
         <select v-if="perspective === 'student'" v-model="selectedStudentId" class="retro-input perspective-input student-select" aria-label="選擇學生">
           <option v-if="studentOptions.length === 0" :value="null" disabled>此班級沒有可選學生</option>
           <option v-for="student in studentOptions" :key="student.id" :value="student.id">{{ student.label }}</option>
         </select>
         <select v-if="perspective === 'game'" v-model="selectedGamePath" class="retro-input perspective-input">
           <option v-for="game in gameOptions" :key="game.path" :value="game.path">{{ game.label }}</option>
         </select>
         <select v-if="perspective === 'student' || perspective === 'game'" v-model.number="selectedPeriodDays" class="retro-input perspective-input period-select" aria-label="選擇觀察期間">
           <option v-for="period in periodOptions" :key="period.days" :value="period.days">{{ period.label }}</option>
         </select>
         <input v-if="perspective === 'date'" v-model="selectedDate" type="date" class="retro-input perspective-input">
       </div>
       <div class="class-controls">
         <label for="footprint-class" class="class-label">過濾班級：</label>
         <select id="footprint-class" v-model="selectedClass" class="retro-input class-select">
           <option value="ALL">🌟 顯示全部班級紀錄</option>
           <option v-for="option in classOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
         </select>
       </div>

       <div v-if="perspective === 'student' && selectedStudentId" class="student-focus-mode">
         <span class="focus-title">🔍 正在查看：<strong>{{ getStudentInfo(selectedStudentId).fullName }}</strong> 的{{ periodOptions.find(period => period.days === selectedPeriodDays)?.label }}足跡</span>
         <button class="retro-btn exit-focus-btn" @click="closeStudentPerspective">❌ 關閉個人紀錄，返回總表</button>
       </div>
    </div>

    <p v-if="errorMessage" class="error-msg" role="alert">⚠️ {{ errorMessage }}</p>
    <p v-if="resultCapped" class="limit-msg">⚠️ 此視角資料超過 {{ resultLimit.toLocaleString() }} 筆，目前顯示最新 {{ resultLimit.toLocaleString() }} 筆。</p>

    <p v-if="isLoading" class="loading-msg">⏳ 資料讀取中...</p>
    <div v-else-if="displayLogs.length === 0" class="empty-msg retro-element">沒有符合條件的足跡紀錄！</div>

    <template v-else>
      <section class="overview-section" aria-label="足跡統計摘要">
        <h2>📌 {{ perspectiveLabel }}</h2>
        <div class="summary-cards">
          <div class="summary-card"><span>使用學生</span><strong>{{ studentSummary.length }}</strong><small>人</small></div>
          <div class="summary-card"><span>活動紀錄</span><strong>{{ displayLogs.length }}</strong><small>筆</small></div>
          <div class="summary-card"><span>累計停留</span><strong>{{ formatDuration(totalDuration) }}</strong></div>
          <div class="summary-card"><span>平均每筆</span><strong>{{ formatDuration(displayLogs.length ? Math.round(totalDuration / displayLogs.length) : 0) }}</strong></div>
        </div>
      </section>

      <div class="table-wrapper retro-element summary-table-wrapper">
        <h2>👥 學生使用彙總</h2>
        <table class="records-table summary-table">
          <thead><tr><th>班級</th><th>座號</th><th>正式學號</th><th>遊戲帳號</th><th>姓名</th><th>造訪次數</th><th>累計停留</th><th>平均停留</th><th>首次使用</th><th>最後使用</th><th>使用活動</th></tr></thead>
          <tbody>
            <tr v-for="row in studentSummary" :key="row.studentId">
              <td class="info-col">{{ getStudentInfo(row.studentId).class }}</td>
              <td class="info-col">{{ getStudentInfo(row.studentId).seat }}</td>
              <td class="info-col account-col">{{ getStudentInfo(row.studentId).schoolStudentId }}</td>
              <td class="info-col account-col">{{ getStudentInfo(row.studentId).account }}</td>
              <td><button class="name-link-btn" @click="openStudentPerspective(row.studentId)">👤 {{ getStudentInfo(row.studentId).displayName }}</button></td>
              <td><strong>{{ row.visits }}</strong> 次</td>
              <td>{{ formatDuration(row.duration) }}</td>
              <td>{{ formatDuration(row.averageDuration) }}</td>
              <td class="time-col">{{ formatDateTime(row.first) }}</td>
              <td class="time-col">{{ formatDateTime(row.last) }}</td>
              <td class="path-col"><span v-for="name in row.activityNames" :key="name" class="mini-activity">{{ name }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="details-heading">🧾 原始足跡明細</h2>
      <div class="table-wrapper retro-element">
      <table class="records-table">
        <thead>
          <tr>
            <th>班級</th>
            <th>座號</th>
            <th>正式學號</th>
            <th>遊戲帳號</th>
            <th>姓名 (點擊看詳細)</th>
            <th>進入時間</th>
            <th>停留時間</th>
            <th>造訪頁面</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in displayLogs" :key="log.id" :class="{'highlight-row': perspective === 'student' && selectedStudentId === String(log.student_id)}">
            <td class="info-col">{{ getStudentInfo(log.student_id).class }}</td>
            <td class="info-col">{{ getStudentInfo(log.student_id).seat }}</td>
            <td class="info-col account-col">{{ getStudentInfo(log.student_id).schoolStudentId }}</td>
            <td class="info-col account-col">{{ getStudentInfo(log.student_id).account }}</td>
            <td class="name-col">
               <button class="name-link-btn" @click="openStudentPerspective(log.student_id)" :title="'查看 ' + getStudentInfo(log.student_id).displayName + ' 的期間紀錄'">
                  👤 {{ getStudentInfo(log.student_id).displayName }}
               </button>
            </td>
            
            <td class="time-col">{{ formatDateTime(log.start_time) }}</td>
            <td class="duration-col" :class="{'danger-time': log.duration_seconds > 300}">
               {{ formatDuration(log.duration_seconds) }}
            </td>
            <td class="path-col">
               <span class="path-badge">{{ getStudentActivity(log.page_path).name }}</span>
               <span v-if="getStudentActivity(log.page_path).details.length" class="activity-detail">
                 {{ getStudentActivity(log.page_path).details.join('　') }}
               </span>
               <br>
               <small class="raw-url">{{ log.page_path }}</small>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-logs-container { padding: 20px; box-sizing: border-box; max-width: 1200px; margin: 0 auto; }
.header-box { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); text-align: center; padding: 20px; margin-bottom: 20px; }
.header-box h1 { margin: 0 0 5px 0; font-weight: 900; color: #1565c0; font-size: 2.2rem;}
.header-box p { color: var(--text-muted); font-weight: bold; margin: 0; letter-spacing: 2px;}

.top-nav { margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;}
.retro-btn { display: inline-block; padding: 10px 20px; color: var(--btn-secondary-text); text-decoration: none; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); background-color: var(--btn-secondary-bg); cursor: pointer; transition: 0.1s; font-family: inherit; font-size: 1rem;}
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.refresh-btn { background-color: #fff9c4; color: #f57f17; border-color: #fbc02d;}

/* 控制面板 */
.control-panel { background: #e3f2fd; border: 3px solid #2196f3; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 4px 0 #2196f3; display: flex; flex-direction: column; align-items: stretch; gap: 15px;}
.perspective-controls, .class-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.perspective-controls label { display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 8px; background: white; color: #0d47a1; font-weight: bold; cursor: pointer; }
.perspective-input { min-width: 250px; padding: 9px; border: 2px solid #7e57c2; border-radius: 8px; background: white; font: inherit; font-weight: bold; color: #4a148c; }
.student-select { min-width: min(430px, 100%); }
.period-select { min-width: 150px; }
.class-label { font-weight: bold; font-size: 1.1rem; }
.class-select { padding: 10px; border: 2px solid #1565c0; border-radius: 8px; background: #fff; font-size: 1.1rem; font-weight: bold; font-family: inherit; color: #0d47a1;}
.student-focus-mode { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;}
.focus-title { font-size: 1.2rem; color: #0d47a1; }
.exit-focus-btn { background-color: #ffebee; color: #c62828; border-color: #ef5350; box-shadow: 0 4px 0 #ef5350;}

.loading-msg, .empty-msg { text-align: center; font-weight: bold; font-size: 1.2rem; padding: 30px; }
.empty-msg { background: var(--box-bg); border: 2px dashed var(--border-color); border-radius: var(--radius-element);}
.error-msg { padding:12px;border:2px solid #ef5350;border-radius:8px;background:#ffebee;color:#b71c1c;font-weight:800; }
.limit-msg { padding: 10px 12px; border-left: 5px solid #ff9800; background: #fff3e0; color: #bf360c; font-weight: bold; }

.overview-section { margin: 20px 0; }
.overview-section h2, .summary-table-wrapper h2, .details-heading { color: #0d47a1; }
.summary-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-card { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; padding: 14px; border: 2px solid #90caf9; border-radius: 10px; background: #e3f2fd; }
.summary-card span { width: 100%; color: #455a64; font-weight: bold; }
.summary-card strong { color: #0d47a1; font-size: 1.5rem; }
.summary-card small { color: #455a64; font-weight: bold; }
.summary-table-wrapper { margin-bottom: 24px; }
.summary-table-wrapper h2 { margin: 4px 4px 12px; }
.summary-table { min-width: 1450px !important; }
.details-heading { margin: 24px 0 10px; }

/* 表格樣式 */
.table-wrapper { overflow-x: auto; background: var(--box-bg); padding: 10px; border-radius: var(--radius-element); border: var(--border-width) solid var(--border-color); }
.records-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.records-table th { background: #f5f5f5; padding: 12px; text-align: center; border-bottom: 3px solid var(--border-color); font-weight: 900; white-space: nowrap; color: #333;}
.records-table td { padding: 12px; border-bottom: 1px dashed #ccc; font-size: 1rem; vertical-align: middle; text-align: center;}

/* 表格欄位細節 */
.info-col { color: #555; font-weight: bold; }
.account-col { font-family: monospace; white-space: nowrap; }
.name-col { text-align: left !important; }
.name-link-btn { 
    background: none; border: none; padding: 5px 10px; font-size: 1.1rem; font-weight: 900; 
    color: #1976d2; cursor: pointer; text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 4px;
    transition: 0.1s; font-family: inherit;
}
.name-link-btn:hover { color: #d32f2f; background: #fff9c4; border-radius: 5px;}

.time-col { color: #666; font-family: monospace; font-size: 0.95rem; white-space: nowrap;}
.duration-col { font-weight: bold; color: #333; white-space: nowrap; }
.duration-col.danger-time { color: #d32f2f; } 

.path-col { text-align: left !important; max-width: 350px; }
.path-badge { background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 5px; border: 1px solid #a5d6a7;}
.activity-detail { display: block; margin: 2px 0 5px; color: #0d47a1; font-size: .86rem; font-weight: 800; }
.mini-activity { display: inline-block; margin: 2px; padding: 3px 6px; border-radius: 5px; background: #e8f5e9; color: #2e7d32; font-size: .78rem; font-weight: bold; }
.raw-url { color: #9e9e9e; font-family: monospace; font-size: 0.8rem; word-break: break-all;}

/* 選中某學生時的強調色 */
.highlight-row { background-color: #fffde7; }

@media (max-width: 760px) {
  .summary-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .perspective-input, .class-select { width: 100%; min-width: 0; }
}
</style>
