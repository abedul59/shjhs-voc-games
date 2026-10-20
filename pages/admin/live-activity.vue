<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { getGameActivityName } from '~/lib/student-activity-labels';
import { regularClassPermissions, schoolClassNames, specialClassPermissionIds } from '~/lib/admin-class-permissions';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const isLoading = ref(true);
const lastRefreshTime = ref('');
const errorMessage = ref('');
const specialClasses = ref([]);
let autoRefreshTimer = null;

// 權限判斷
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');
const allowedClasses = Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : [];
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.includes('ALL'));
const allowedRegularClasses = computed(() => regularClassPermissions(allowedClasses));
const allowedSpecialClassIds = computed(() => specialClassPermissionIds(allowedClasses));

const regularClasses = computed(() => {
  if (isSuperAdmin.value) {
    return schoolClassNames();
  }
  return [...allowedRegularClasses.value].sort();
});

const displayClasses = computed(() => [
  ...regularClasses.value.map(name => ({ value: name, label: `${name} 班`, type: 'regular' })),
  ...specialClasses.value.map(group => ({
    value: `special:${group.id}`,
    label: `📚 ${group.name}（特殊班級）`,
    type: 'special'
  }))
]);

const selectedClass = ref('ALL');
const activityData = ref({}); 
const selectedSpecialClass = computed(() => {
  if (!selectedClass.value.startsWith('special:')) return null;
  const id = selectedClass.value.slice('special:'.length);
  return specialClasses.value.find(group => group.id === id) || null;
});

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diffSec < 60) return '剛剛';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分鐘前`;
  return `${Math.floor(diffSec / 3600)} 小時前`;
};

const loadSpecialClasses = async () => {
  const { data, error } = await supabase.from('special_classes')
    .select('id, grade, name').order('grade').order('name');
  if (error) {
    specialClasses.value = [];
    if (!['42P01', 'PGRST205'].includes(error.code)) errorMessage.value = `特殊班級讀取失敗：${error.message}`;
    return;
  }
  specialClasses.value = isSuperAdmin.value
    ? (data || [])
    : (data || []).filter(group => allowedSpecialClassIds.value.includes(group.id));
  if (selectedClass.value.startsWith('special:') && !selectedSpecialClass.value) selectedClass.value = 'ALL';
};

const fetchActivity = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  const specialClass = selectedSpecialClass.value;
  let specialMemberIds = null;

  if (specialClass) {
    const { data: memberships, error: memberError } = await supabase.from('special_class_members')
      .select('student_id').eq('special_class_id', specialClass.id);
    if (memberError) {
      errorMessage.value = `特殊班級名單讀取失敗：${memberError.message}`;
      activityData.value = {};
      isLoading.value = false;
      return;
    }
    specialMemberIds = (memberships || []).map(item => item.student_id);
    if (!specialMemberIds.length) {
      activityData.value = {};
      lastRefreshTime.value = new Date().toLocaleTimeString('zh-TW');
      isLoading.value = false;
      return;
    }
  }
  
  // 1. 抓取學生名單
  let query = supabase.from('students').select('id, student_id, real_name, seat_number, class_name');
  if (specialMemberIds) {
    query = query.in('id', specialMemberIds);
  } else if (selectedClass.value !== 'ALL') {
    query = query.eq('class_name', selectedClass.value);
  }
  const { data: students, error: studentError } = await query.order('class_name', { ascending: true }).order('seat_number', { ascending: true });
  
  if (studentError || !students) {
    errorMessage.value = `學生名單讀取失敗：${studentError?.message || '無法取得資料'}`;
    activityData.value = {};
    isLoading.value = false;
    return;
  }

  let visibleStudents = students;
  if (!isSuperAdmin.value && !specialClass) {
    if (selectedClass.value === 'ALL') {
      const memberIds = new Set();
      for (const specialId of allowedSpecialClassIds.value) {
        const { data: memberships } = await supabase.from('special_class_members')
          .select('student_id').eq('special_class_id', specialId);
        for (const membership of memberships || []) memberIds.add(membership.student_id);
      }
      visibleStudents = students.filter(student => allowedRegularClasses.value.includes(student.class_name) || memberIds.has(student.id));
    } else if (!allowedRegularClasses.value.includes(selectedClass.value)) {
      visibleStudents = [];
    }
  }

  // 2. 抓取今天的登入與遊戲紀錄
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const { data: logins } = await supabase.from('login_logs')
    .select('student_id, login_time, logout_time')
    .gte('login_time', todayStr)
    .order('login_time', { ascending: false });

  const { data: games } = await supabase.from('game_records')
    .select('student_id, game_type, played_at')
    .gte('played_at', todayStr)
    .order('played_at', { ascending: false });

  // 3. 整理與分類資料
  const grouped = {};
  visibleStudents.forEach(stu => {
    const groupName = specialClass ? `${specialClass.name}（特殊班級）` : `${stu.class_name} 班`;
    if (!grouped[groupName]) grouped[groupName] = [];

    const stuIdStr = String(stu.student_id);
    
    // 判斷上線狀態 (兩小時內有登入且無登出紀錄視為上線)
    const myLogins = logins?.filter(l => String(l.student_id) === stuIdStr) || [];
    const latestLogin = myLogins.length > 0 ? myLogins[0] : null;
    let isOnline = false;
    if (latestLogin && !latestLogin.logout_time) {
      const hoursDiff = (new Date() - new Date(latestLogin.login_time)) / (1000 * 60 * 60);
      if (hoursDiff < 2) isOnline = true;
    }

    // 取得最新活動
    const myGames = games?.filter(g => String(g.student_id) === stuIdStr) || [];
    const latestGame = myGames.length > 0 ? myGames[0] : null;

    grouped[groupName].push({
      ...stu,
      isOnline,
      latestGameType: getGameActivityName(latestGame?.game_type),
      latestGameTime: latestGame ? latestGame.played_at : null
    });
  });

  activityData.value = grouped;
  lastRefreshTime.value = new Date().toLocaleTimeString('zh-TW');
  isLoading.value = false;
};

// ✨ 新增：一鍵強制全體登出邏輯
const forceLogoutAll = async () => {
  const confirmMsg = `⚠️ 確定要執行「強制全體登出」嗎？\n\n系統將會把所有「未正常登出」的紀錄標記為已登出。\n這能有效清除忘記按登出就關閉網頁的「幽靈上線狀態」。`;
  
  if (!confirm(confirmMsg)) return;

  try {
    isLoading.value = true;
    const now = new Date().toISOString();
    
    // 將所有 logout_time 為 null 的登入紀錄強制填上現在時間
    const { data, error } = await supabase
      .from('login_logs')
      .update({ logout_time: now })
      .is('logout_time', null)
      .select('id');

    if (error) throw error;

    alert(`🧹 清理完成！\n共將 ${data ? data.length : 0} 個幽靈帳號標記為已登出。`);
    await fetchActivity(); // 重新整理畫面
  } catch (err) {
    console.error("強制登出失敗", err);
    alert("強制登出發生錯誤：" + err.message);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await loadSpecialClasses();
  if (regularClasses.value.length > 0 && !isSuperAdmin.value) {
    selectedClass.value = regularClasses.value[0];
  }
  await fetchActivity();
  // 自動每 30 秒更新一次
  autoRefreshTimer = setInterval(fetchActivity, 30000);
});

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});
</script>

<template>
  <div class="activity-container">
    <div class="header">
      <div class="title-area">
        <h1>📡 學生即時動態</h1>
        <NuxtLink to="/admin" class="retro-btn btn-back">⬅ 返回</NuxtLink>
      </div>
      
      <div class="controls">
        <select v-model="selectedClass" @change="fetchActivity" class="retro-input">
          <option value="ALL">顯示全部授權班級</option>
          <option v-for="cls in displayClasses" :key="cls.value" :value="cls.value">{{ cls.label }}</option>
        </select>
        
        <div class="action-buttons">
          <button class="retro-btn btn-refresh" @click="fetchActivity" :disabled="isLoading">
            {{ isLoading ? '🔄 讀取中...' : '🔄 立即重整' }}
          </button>
          
          <button class="retro-btn btn-danger" @click="forceLogoutAll" :disabled="isLoading" title="清除忘記登出的幽靈綠燈">
            🧹 強制全體登出
          </button>
        </div>
      </div>
    </div>
    
    <p class="refresh-note">最後更新時間：{{ lastRefreshTime }} (系統每 30 秒自動更新)</p>
    <p v-if="errorMessage" class="error-msg" role="alert">⚠️ {{ errorMessage }}</p>

    <div v-if="Object.keys(activityData).length === 0 && !isLoading" class="empty-msg">
      目前沒有學生資料
    </div>

    <div v-for="(students, className) in activityData" :key="className" class="class-section">
      <h2 class="class-title">{{ selectedSpecialClass ? '📚' : '🏫' }} {{ className }}</h2>
      
      <div class="students-grid">
        <div v-for="stu in students" :key="stu.student_id" 
             class="student-card retro-element" 
             :class="{ 'is-online': stu.isOnline }">
          
          <div class="card-header">
            <span class="seat-badge">{{ stu.seat_number }}</span>
            <span class="stu-name">{{ stu.real_name }}</span>
            <div class="status-indicator" :class="{ 'online': stu.isOnline }" :title="stu.isOnline ? '上線中' : '離線'"></div>
          </div>
          <div v-if="selectedSpecialClass" class="original-class">原班：{{ stu.class_name }} 班</div>
          
          <div class="card-body">
            <div class="activity-text">
              <span style="font-size:0.85rem; color:#666;">最新動態：</span><br>
              <b>{{ stu.latestGameType }}</b>
            </div>
            <div class="time-text" v-if="stu.latestGameTime">
              🕒 {{ timeAgo(stu.latestGameTime) }}
            </div>
          </div>
          
        </div>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
.activity-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px dashed #ccc; padding-bottom: 15px; margin-bottom: 10px; flex-wrap: wrap; gap: 15px;}
.title-area { display: flex; align-items: center; gap: 15px; }
.title-area h1 { margin: 0; color: #1565c0; font-weight: 900; }

.controls { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
.action-buttons { display: flex; gap: 10px; }

.refresh-note { text-align: right; color: #757575; font-size: 0.9rem; font-weight: bold; margin-bottom: 20px;}
.empty-msg { text-align: center; color: #999; font-size: 1.2rem; margin-top: 50px; font-weight: bold; }
.error-msg { padding: 12px; border: 2px solid #ef5350; border-radius: 8px; background: #ffebee; color: #b71c1c; font-weight: 800; }

.class-section { margin-bottom: 40px; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 2px solid #e0e0e0;}
.class-title { margin-top: 0; color: #2e7d32; font-size: 1.5rem; border-bottom: 2px solid #c8e6c9; padding-bottom: 10px; margin-bottom: 20px;}

.students-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }

.student-card { background: white; border: 2px solid #ccc; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; transition: 0.2s;}
.student-card.is-online { border-color: #4caf50; background: #f1f8e9; box-shadow: 0 4px 8px rgba(76, 175, 80, 0.2); }

.card-header { display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 8px; }
.seat-badge { background: #333; color: white; font-weight: bold; padding: 2px 8px; border-radius: 6px; font-size: 0.9rem; }
.student-card.is-online .seat-badge { background: #2e7d32; }
.stu-name { font-weight: 900; font-size: 1.1rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.original-class { color: #5d4037; font-size: .82rem; font-weight: 800; }

.status-indicator { width: 12px; height: 12px; border-radius: 50%; background: #bdbdbd; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
.status-indicator.online { background: #00e676; box-shadow: 0 0 8px #00e676, inset 0 2px 4px rgba(0,0,0,0.2); animation: pulse 2s infinite; }

.card-body { display: flex; flex-direction: column; gap: 5px; }
.activity-text { font-size: 1rem; color: #333; line-height: 1.4; }
.activity-text b { color: #1976d2; }
.time-text { font-size: 0.8rem; color: #888; font-weight: bold; text-align: right; margin-top: 5px;}

.retro-btn { padding: 8px 15px; font-weight: 900; border: 2px solid #333; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; transition: 0.1s;}
.retro-btn:active:not(:disabled) { transform: translateY(2px); }
.retro-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-back { background: #e0e0e0; color: #333; }
.btn-refresh { background: #ff9800; color: white; border-color: #e65100; box-shadow: 0 3px 0 #e65100;}
.btn-refresh:active:not(:disabled) { box-shadow: none; }
.btn-danger { background: #f44336; color: white; border-color: #c62828; box-shadow: 0 3px 0 #c62828;}
.btn-danger:active:not(:disabled) { box-shadow: none; }

.retro-input { padding: 8px 12px; border: 2px solid #ccc; border-radius: 8px; font-weight: bold; font-size: 1rem; outline: none;}

@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
@media (max-width: 600px) { 
  .header { flex-direction: column; align-items: flex-start; } 
  .controls { width: 100%; justify-content: space-between; } 
  .action-buttons { width: 100%; justify-content: flex-end; }
}
</style>
