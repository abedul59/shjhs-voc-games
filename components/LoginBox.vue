<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({ schoolPhone: { type: String, default: '0000' } });
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent', { maxAge: 60 * 60 * 24 * 7 });

const classOptions = ref([]);
const seatOptions = Array.from({ length: 40 }, (_, i) => i + 1);
const selectedClass = ref('');
const selectedSeat = ref('');
const pinCode = ref('');
const errorMsg = ref('');
const isLoading = ref(false);
const loginMode = ref('student');

// ✨ 新增：登入阻擋機制相關變數
const accessSettings = ref({ restrict_play_time: false });
const showBlockModal = ref(false);
const blockMessage = ref('');

onMounted(async () => {
  // 1. 抓取班級選單 (你原本的邏輯)
  const { data: studentsData } = await supabase.from('students').select('class_name');
  if (studentsData) {
    const classes = new Set(studentsData.map(s => s.class_name).filter(Boolean));
    classOptions.value = Array.from(classes).sort();
    if (classOptions.value.length > 0) selectedClass.value = classOptions.value[0];
  }

  // ✨ 2. 新增：抓取系統開放時間設定
  const { data: sysData } = await supabase.from('system_settings')
    .select('restrict_play_time, allow_play_days, allow_play_start, allow_play_end, login_blocked_message')
    .eq('id', 1).single();
  if (sysData) accessSettings.value = sysData;
});

// ✨ 新增：驗證現在是否為開放時間的函數
const checkTimeAllowed = () => {
  if (!accessSettings.value.restrict_play_time) return true;
  
  const now = new Date();
  const currentDay = now.getDay(); // 0=日, 1=一, 2=二...
  
  // 檢查星期
  if (accessSettings.value.allow_play_days && !accessSettings.value.allow_play_days.includes(currentDay)) {
    return false;
  }
  
  // 檢查時間
  const currentStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const startStr = accessSettings.value.allow_play_start ? accessSettings.value.allow_play_start.substring(0, 5) : '00:00';
  const endStr = accessSettings.value.allow_play_end ? accessSettings.value.allow_play_end.substring(0, 5) : '23:59';
  
  return currentStr >= startStr && currentStr <= endStr;
};

const handleLogin = async () => {
  // 🚨 ✨ 登入阻擋機制：在最一開始攔截！(不管匿名或學生都適用)
  if (!checkTimeAllowed()) {
    blockMessage.value = accessSettings.value.login_blocked_message || '⚠️ 目前為系統管制時間，暫不開放登入喔！';
    showBlockModal.value = true;
    return; // 中斷執行，不往下跑登入流程
  }

  // -----------------------------------------------------------
  // 以下完全保留你原本的程式碼邏輯，不作任何更動！
  // -----------------------------------------------------------
  errorMsg.value = ''; isLoading.value = true;
  let newStudentData = null;
  
  if (loginMode.value === 'student') {
    if (!selectedClass.value || !selectedSeat.value || !pinCode.value) { 
      errorMsg.value = '⚠️ 請填寫完整登入資料！'; isLoading.value = false; return; 
    }
    const studentIdStr = `${selectedClass.value}${String(selectedSeat.value).padStart(2, '0')}`;
    
    const { data, error } = await supabase.from('students').select('*').eq('student_id', studentIdStr).eq('pin_code', pinCode.value.trim()).single();
    if (error || !data) { errorMsg.value = '❌ 找不到該學生或密碼錯誤！'; isLoading.value = false; return; }
    
    // 🛡️ 設備防盜用/防代考機制 (依據後台設定)
    let browserId = localStorage.getItem('device_browser_id');
    if (!browserId) {
      browserId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('device_browser_id', browserId);
    }

    const { data: sysSettings } = await supabase.from('system_settings').select('anti_cheat_enabled, anti_cheat_cooldown').eq('id', 1).single();
    
    if (sysSettings && sysSettings.anti_cheat_enabled) {
      const { data: recentLogs } = await supabase.from('login_logs')
        .select('student_id, login_time').eq('browser_id', browserId).order('login_time', { ascending: false }).limit(1);

      if (recentLogs && recentLogs.length > 0) {
        const lastLog = recentLogs[0];
        if (lastLog.student_id !== data.student_id) {
          const diffMins = (Date.now() - new Date(lastLog.login_time).getTime()) / 60000;
          const cooldown = sysSettings.anti_cheat_cooldown || 5;
          if (diffMins < cooldown) {
            errorMsg.value = `🛡️ 防盜系統攔截：同一設備切換帳號需等 ${cooldown} 分鐘。請再等 ${Math.ceil(cooldown - diffMins)} 分鐘！`;
            isLoading.value = false; return; 
          }
        }
      }
    }
    
    newStudentData = { id: data.student_id, name: data.hidden_name || data.real_name, class: data.class_name, isAnon: false, real_name: data.real_name, browserId };
  } else {
    let anonId = localStorage.getItem('anon_device_uuid');
    if (!anonId) { anonId = 'anon_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('anon_device_uuid', anonId); }
    newStudentData = { id: anonId, name: '匿名訪客', class: '無', isAnon: true, real_name: '匿名訪客', browserId: anonId };
  }

  let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch (e) {}
  const { data: logData } = await supabase.from('login_logs').insert({
    student_id: newStudentData.id, real_name: newStudentData.real_name, is_anon: newStudentData.isAnon, ip_address: userIp, device_info: navigator.userAgent, browser_id: newStudentData.browserId
  }).select('id').single();

  if (logData) localStorage.setItem('current_login_log_id', logData.id);
  studentCookie.value = { id: newStudentData.id, name: newStudentData.name, class: newStudentData.class, isAnon: newStudentData.isAnon };
  isLoading.value = false;
  window.location.reload(); 
};
</script>

<template>
  <div>
    <div class="tabs">
      <button class="tab-btn" :class="{ active: loginMode === 'student' }" @click="loginMode = 'student'">🧑‍🎓 學生登入</button>
      <button class="tab-btn" :class="{ active: loginMode === 'anon' }" @click="loginMode = 'anon'">🕵️ 匿名挑戰</button>
    </div>
    
    <div v-if="loginMode === 'student'" class="login-section">
      <div class="form-grid">
        <div class="input-group"><label>班級</label><select v-model="selectedClass" class="retro-input"><option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option></select></div>
        <div class="input-group"><label>座號</label><select v-model="selectedSeat" class="retro-input"><option v-for="s in seatOptions" :key="s" :value="s">{{ s }}</option></select></div>
      </div>
      <div class="input-group" style="margin-top:15px;">
        <label>🔑 通關密碼</label>
        <input type="password" v-model="pinCode" class="retro-input" :placeholder="`例：王小明(438) + ${schoolPhone.slice(-4)}`" @keyup.enter="handleLogin" />
      </div>
    </div>
    <div v-if="loginMode === 'anon'" class="login-section anon-notice"><p>⚠️ 系統將綁定設備產生專屬身分碼，更換設備紀錄將無法合併。</p></div>

    <button class="retro-btn start-btn" @click="handleLogin" :disabled="isLoading">{{ isLoading ? '登入中...' : '🔐 登入帳號' }}</button>
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="showBlockModal" class="modal-overlay block-overlay" @click.self="showBlockModal = false">
      <div class="modal-box retro-element block-modal">
        <h2 class="block-title">🛑 登入受阻</h2>
        <p class="block-msg-text">{{ blockMessage }}</p>
        <button class="retro-btn block-btn" @click="showBlockModal = false">我知道了</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tabs { display: flex; margin-bottom: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); overflow: hidden; }
.tab-btn { flex: 1; padding: 10px; font-size: 1.1rem; font-weight: 900; background: var(--tab-bg); color: var(--text-muted); border: none; cursor: pointer; transition: all 0.3s ease; }
.tab-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); }
.tab-btn:first-child { border-right: var(--border-width) solid var(--border-color); }
.login-section { min-height: 160px; }
.anon-notice { background: var(--info-bg); padding: 15px; border: 2px dashed var(--border-color); border-radius: var(--radius-element); line-height: 1.5; font-size: 0.95rem; display: flex; align-items: center; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.input-group { display: flex; flex-direction: column; gap: 5px; } .input-group label { font-weight: bold; color: var(--text-main); font-size: 0.9rem;}
.retro-input { width: 100%; padding: 12px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background-color: var(--input-bg); color: var(--text-main); font-size: 1rem; font-family: inherit; font-weight: bold; box-sizing: border-box; transition: all 0.3s; }
.retro-input:focus { background-color: var(--input-focus); outline: none; }
.retro-btn { width: 100%; padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); font-size: 1.3rem; font-weight: 900; cursor: pointer; text-align: center; margin-top: 10px; transition: all 0.15s; font-family: inherit;}
.start-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.error-msg { background: var(--danger-bg); border: 2px dashed var(--danger-color); color: var(--danger-color); margin-top: 15px; font-weight: 900; padding: 10px; text-align: center; border-radius: var(--radius-element); }

/* ✨ 登入阻擋專屬樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box;}
.modal-box { background: var(--box-bg); padding: 25px; border-radius: var(--radius-box); border: var(--box-border-width) solid var(--border-color); box-shadow: var(--shadow-box); width: 100%; max-width: 400px; }
.block-overlay { background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(3px); }
.block-modal { border-color: var(--danger-color); border-width: 4px; text-align: center; }
.block-title { color: var(--danger-color); margin-top: 0; font-size: 1.8rem; font-weight: 900; border-bottom: 2px dashed var(--danger-color); padding-bottom: 10px; }
.block-msg-text { font-size: 1.15rem; font-weight: bold; color: var(--text-main); line-height: 1.6; margin: 20px 0; white-space: pre-wrap; background: #ffebee; padding: 15px; border-radius: 8px; border: 1px solid #ffcdd2;}
.block-btn { background: var(--danger-color); color: white; border-color: #b71c1c; margin-top: 10px; }
</style>