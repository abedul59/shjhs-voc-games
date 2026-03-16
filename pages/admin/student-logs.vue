<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');

const allLogs = ref([]); // 所有的足跡紀錄
const studentsMap = ref({}); // 用來對應學號與學生資料的字典
const classesList = ref([]); // 班級清單
const selectedClass = ref('ALL'); // 預設顯示全部班級
const selectedStudentId = ref(null); // 當前選中要查看詳細資料的學生 ID
const isLoading = ref(true);

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
  const { data: sData } = await supabase.from('students').select('*').limit(10000);
  if (sData) {
    const isSuperAdmin = isAdminCookie.value === true || isAdminCookie.value === 'superadmin';
    const allowedClasses = authCookie.value?.classes || [];
    
    const cSet = new Set();
    sData.forEach(s => {
      // 權限過濾：一般老師只能看到自己被授權的班級
      if (!isSuperAdmin && allowedClasses.length > 0 && !allowedClasses.includes(s.class_name)) return;
      
      studentsMap.value[String(s.student_id)] = s;
      if (s.class_name) cSet.add(s.class_name);
    });
    classesList.value = Array.from(cSet).sort();
  }
};

// 🌟 2. 抓取足跡資料
const fetchLogs = async () => {
  isLoading.value = true;
  selectedStudentId.value = null; // 重整時清空選定的學生
  
  const { data, error } = await supabase
    .from('student_logs')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(1000); // 撈最近的 1000 筆

  if (!error && data) {
    allLogs.value = data;
  }
  isLoading.value = false;
};

// 🌟 3. 計算屬性：根據「所選班級」或「所選學生」來過濾要顯示的紀錄
const displayLogs = computed(() => {
  return allLogs.value.filter(log => {
    // 如果這筆紀錄是匿名訪客 (anon_xxx)，系統內找不到對應學生資料
    const studentInfo = studentsMap.value[log.student_id];
    
    // 若在「全校/特定班級」總表模式
    if (!selectedStudentId.value) {
       if (selectedClass.value === 'ALL') return true; 
       // 如果選了特定班級，只顯示該班的紀錄
       return studentInfo && studentInfo.class_name === selectedClass.value;
    }
    
    // 若在「查看單一學生」模式，只顯示該學生的紀錄
    return log.student_id === selectedStudentId.value;
  });
});

// 輔助函式：取得學生的完整稱呼
const getStudentInfo = (id) => {
  if (!id) return { displayName: '未知', class: '-', seat: '-', fullName: '未知' };
  if (id.startsWith('anon_')) return { displayName: '匿名訪客', class: '無', seat: '-', fullName: `匿名訪客 (${id.slice(-4)})` };
  
  const s = studentsMap.value[id];
  if (!s) return { displayName: id, class: '-', seat: '-', fullName: `未知生 (${id})` };
  
  const seatNum = String(s.student_id).slice(-2); // 取學號後兩碼當座號
  const name = s.real_name || s.hidden_name;
  return { 
      displayName: name, 
      class: s.class_name, 
      seat: seatNum, 
      fullName: `${s.class_name} 班 ${seatNum} 號 - ${name}` 
  };
};

// 網址翻譯字典
const pathNames = {
  '/': '🏠 首頁大廳',
  '/history': '📜 歷史紀錄',
  '/leaderboard': '🏆 英雄榜',
  '/tarot': '🃏 塔羅牌',
  '/game': '🟦 方塊消消樂',
  '/game-move': '🔠 單字神移動',
  '/game-choice': '✅ 單字選選樂',
  '/game-fill': '⌨️ 單字填一填',
  '/game-sentence': '📝 例句神絕配',
  '/game-listen': '🎧 例句順風耳',
  '/game-puzzle': '🧩 單字拼起來',
  '/game-speak': '🎙️ 口說測一測',
  '/game-cross': '🔠 單字填字FUN',
  '/game-review': '✍️ 單字複習趣',
  '/game-battle': '⚔️ 單字方塊陣',
  '/game-tetris': '🧱 單字俄羅斯方塊',
  '/game-pinball': '🎰 單字彈珠台',
  '/game-angrybirds': '🐦 單字憤怒鳥'
};

const translatePath = (path) => {
  if (!path) return '未知頁面';
  const base = path.split('?')[0]; 
  return pathNames[base] || `📄 其他頁面 (${base})`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '--';
  const d = new Date(timeStr);
  return `${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
};

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
       <template v-if="!selectedStudentId">
           <label style="font-weight: bold; font-size: 1.1rem;">過濾班級：</label>
           <select v-model="selectedClass" class="retro-input class-select">
               <option value="ALL">🌟 顯示全部班級紀錄</option>
               <option v-for="c in classesList" :key="c" :value="c">{{ c }} 班</option>
           </select>
       </template>
       
       <template v-else>
           <div class="student-focus-mode">
               <span class="focus-title">🔍 正在查看：<strong>{{ getStudentInfo(selectedStudentId).fullName }}</strong> 的個人足跡</span>
               <button class="retro-btn exit-focus-btn" @click="selectedStudentId = null">❌ 關閉個人紀錄，返回總表</button>
           </div>
       </template>
    </div>

    <p v-if="isLoading" class="loading-msg">⏳ 資料讀取中...</p>
    <div v-else-if="displayLogs.length === 0" class="empty-msg retro-element">沒有符合條件的足跡紀錄！</div>
    
    <div class="table-wrapper retro-element" v-else>
      <table class="records-table">
        <thead>
          <tr>
            <th>班級</th>
            <th>座號</th>
            <th>學號</th>
            <th>姓名 (點擊看詳細)</th>
            <th>進入時間</th>
            <th>停留時間</th>
            <th>造訪頁面</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in displayLogs" :key="log.id" :class="{'highlight-row': selectedStudentId === log.student_id}">
            <td class="info-col">{{ getStudentInfo(log.student_id).class }}</td>
            <td class="info-col">{{ getStudentInfo(log.student_id).seat }}</td>
            <td class="info-col" style="font-family: monospace;">{{ log.student_id }}</td>
            <td class="name-col">
               <button class="name-link-btn" @click="selectedStudentId = log.student_id" :title="'查看 ' + getStudentInfo(log.student_id).displayName + ' 的所有紀錄'">
                  👤 {{ getStudentInfo(log.student_id).displayName }}
               </button>
            </td>
            
            <td class="time-col">{{ formatTime(log.start_time) }}</td>
            <td class="duration-col" :class="{'danger-time': log.duration_seconds > 300}">
               {{ formatDuration(log.duration_seconds) }}
            </td>
            <td class="path-col">
               <span class="path-badge">{{ translatePath(log.page_path) }}</span>
               <br>
               <small class="raw-url">{{ log.page_path }}</small>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
.control-panel { background: #e3f2fd; border: 3px solid #2196f3; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 4px 0 #2196f3; display: flex; align-items: center; gap: 15px;}
.class-select { padding: 10px; border: 2px solid #1565c0; border-radius: 8px; background: #fff; font-size: 1.1rem; font-weight: bold; font-family: inherit; color: #0d47a1;}
.student-focus-mode { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 10px;}
.focus-title { font-size: 1.2rem; color: #0d47a1; }
.exit-focus-btn { background-color: #ffebee; color: #c62828; border-color: #ef5350; box-shadow: 0 4px 0 #ef5350;}

.loading-msg, .empty-msg { text-align: center; font-weight: bold; font-size: 1.2rem; padding: 30px; }
.empty-msg { background: var(--box-bg); border: 2px dashed var(--border-color); border-radius: var(--radius-element);}

/* 表格樣式 */
.table-wrapper { overflow-x: auto; background: var(--box-bg); padding: 10px; border-radius: var(--radius-element); border: var(--border-width) solid var(--border-color); }
.records-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.records-table th { background: #f5f5f5; padding: 12px; text-align: center; border-bottom: 3px solid var(--border-color); font-weight: 900; white-space: nowrap; color: #333;}
.records-table td { padding: 12px; border-bottom: 1px dashed #ccc; font-size: 1rem; vertical-align: middle; text-align: center;}

/* 表格欄位細節 */
.info-col { color: #555; font-weight: bold; }
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
.raw-url { color: #9e9e9e; font-family: monospace; font-size: 0.8rem; word-break: break-all;}

/* 選中某學生時的強調色 */
.highlight-row { background-color: #fffde7; }
</style>