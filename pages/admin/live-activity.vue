<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const isLoading = ref(true);
const lastRefreshTime = ref('');
let autoRefreshTimer = null;

// 權限判斷
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');
const allowedClasses = Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : [];
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.includes('ALL'));

const displayClasses = computed(() => {
  if (isSuperAdmin.value) {
    const list = ['000']; 
    for (let grade of [7, 8, 9]) { 
      for (let i = 1; i <= 14; i++) { list.push(`${grade}${String(i).padStart(2, '0')}`); } 
    } 
    list.push('999'); 
    return list;
  }
  return [...allowedClasses].sort();
});

const selectedClass = ref('ALL');
const activityData = ref({}); // 存放分類後的學生資料

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diffSec < 60) return '剛剛';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分鐘前`;
  return `${Math.floor(diffSec / 3600)} 小時前`;
};

const fetchActivity = async () => {
  isLoading.value = true;
  
  // 1. 抓取學生名單
  let query = supabase.from('students').select('student_id, real_name, seat_number, class_name');
  if (selectedClass.value !== 'ALL') {
    query = query.eq('class_name', selectedClass.value);
  } else if (!isSuperAdmin.value && allowedClasses.length > 0) {
    query = query.in('class_name', allowedClasses);
  }
  const { data: students } = await query.order('class_name', { ascending: true }).order('seat_number', { ascending: true });
  
  if (!students) {
    isLoading.value = false;
    return;
  }

  // 2. 抓取今天的登入與遊戲紀錄 (為了效能，一次抓今天全部再比對)
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
  students.forEach(stu => {
    if (!grouped[stu.class_name]) grouped[stu.class_name] = [];

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

    grouped[stu.class_name].push({
      ...stu,
      isOnline,
      latestGameType: latestGame ? latestGame.game_type : '無紀錄',
      latestGameTime: latestGame ? latestGame.played_at : null
    });
  });

  activityData.value = grouped;
  lastRefreshTime.value = new Date().toLocaleTimeString();
  isLoading.value = false;
};

onMounted(() => {
  if (displayClasses.value.length > 0 && !isSuperAdmin.value) {
    selectedClass.value = displayClasses.value[0];
  }
  fetchActivity();
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
          <option v-for="cls in displayClasses" :key="cls" :value="cls">{{ cls }} 班</option>
        </select>
        <button class="retro-btn btn-refresh" @click="fetchActivity" :disabled="isLoading">
          {{ isLoading ? '🔄 讀取中...' : '🔄 立即重整' }}
        </button>
      </div>
    </div>
    
    <p class="refresh-note">最後更新時間：{{ lastRefreshTime }} (系統每 30 秒自動更新)</p>

    <div v-if="Object.keys(activityData).length === 0 && !isLoading" class="empty-msg">
      目前沒有學生資料
    </div>

    <div v-for="(students, className) in activityData" :key="className" class="class-section">
      <h2 class="class-title">🏫 {{ className }} 班</h2>
      
      <div class="students-grid">
        <div v-for="stu in students" :key="stu.student_id" 
             class="student-card retro-element" 
             :class="{ 'is-online': stu.isOnline }">
          
          <div class="card-header">
            <span class="seat-badge">{{ stu.seat_number }}</span>
            <span class="stu-name">{{ stu.real_name }}</span>
            <div class="status-indicator" :class="{ 'online': stu.isOnline }" :title="stu.isOnline ? '上線中' : '離線'"></div>
          </div>
          
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
.controls { display: flex; gap: 10px; align-items: center; }

.refresh-note { text-align: right; color: #757575; font-size: 0.9rem; font-weight: bold; margin-bottom: 20px;}
.empty-msg { text-align: center; color: #999; font-size: 1.2rem; margin-top: 50px; font-weight: bold; }

.class-section { margin-bottom: 40px; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 2px solid #e0e0e0;}
.class-title { margin-top: 0; color: #2e7d32; font-size: 1.5rem; border-bottom: 2px solid #c8e6c9; padding-bottom: 10px; margin-bottom: 20px;}

.students-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }

.student-card { background: white; border: 2px solid #ccc; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 10px; transition: 0.2s;}
.student-card.is-online { border-color: #4caf50; background: #f1f8e9; box-shadow: 0 4px 8px rgba(76, 175, 80, 0.2); }

.card-header { display: flex; align-items: center; gap: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 8px; }
.seat-badge { background: #333; color: white; font-weight: bold; padding: 2px 8px; border-radius: 6px; font-size: 0.9rem; }
.student-card.is-online .seat-badge { background: #2e7d32; }
.stu-name { font-weight: 900; font-size: 1.1rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
.retro-input { padding: 8px 12px; border: 2px solid #ccc; border-radius: 8px; font-weight: bold; font-size: 1rem; outline: none;}

@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
@media (max-width: 600px) { .header { flex-direction: column; align-items: flex-start; } .controls { width: 100%; justify-content: space-between; } }
</style>
