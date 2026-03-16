<script setup>
import { ref, onMounted } from 'vue';
import { getStrokeArrayAsync } from '~/utils/strokeCounter';

const props = defineProps({ schoolPhone: { type: String, default: '學校市話' } });
const supabase = useSupabaseClient(); // 🌟 呼叫資料庫讀取後台設定

const queryName = ref('');
const queryResultMsg = ref('');
const isQuerying = ref(false);
const errorMsg = ref('');
let countdownInterval = null;

// 預設的防護設定 (如果資料庫沒抓到就會用這組)
const limitWindow = ref(1);   // 幾分鐘內
const limitCount = ref(1);    // 只能查幾次
const limitCooldown = ref(3); // 違規就鎖幾分鐘

onMounted(async () => {
  // 從資料庫讀取您在後台設定的參數
  const { data: settings } = await supabase.from('system_settings').select('stroke_limit_window, stroke_limit_count, stroke_cooldown').eq('id', 1).single();
  if (settings) {
    limitWindow.value = settings.stroke_limit_window ?? 1;
    limitCount.value = settings.stroke_limit_count ?? 1;
    limitCooldown.value = settings.stroke_cooldown ?? 3;
  }
  checkLockStatus(); // 畫面載入時檢查是不是還在被鎖定中
});

// 檢查是否處於鎖定狀態
const checkLockStatus = () => {
  const lockedUntil = localStorage.getItem('stroke_locked_until');
  if (lockedUntil && Date.now() < parseInt(lockedUntil)) {
    startCountdown(parseInt(lockedUntil));
  }
};

// 啟動鎖定倒數計時器
const startCountdown = (endTime) => {
  clearInterval(countdownInterval);
  isQuerying.value = true;
  
  const updateTimer = () => {
    const remaining = Math.ceil((endTime - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      isQuerying.value = false;
      errorMsg.value = '';
      localStorage.removeItem('stroke_locked_until');
      localStorage.removeItem('stroke_queries'); // 解除鎖定，給他重新做人
    } else {
      errorMsg.value = `🚨 查詢過於頻繁！請等待 ${remaining} 秒後再試！`;
    }
  };
  
  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
};

const handleStrokeQuery = async () => {
  if (!queryName.value.trim()) return;
  
  // 1. 檢查是否還在坐牢 (被鎖定)
  const lockedUntil = localStorage.getItem('stroke_locked_until');
  if (lockedUntil && Date.now() < parseInt(lockedUntil)) {
    startCountdown(parseInt(lockedUntil));
    return;
  }

  // 2. 讀取過去的查詢紀錄
  let queries = JSON.parse(localStorage.getItem('stroke_queries') || '[]');
  const now = Date.now();
  const windowTimeMs = limitWindow.value * 60 * 1000;
  
  // 3. 清除安全時間外的舊紀錄
  queries = queries.filter(t => now - t < windowTimeMs);
  
  // 4. 如果達到查詢次數上限，觸發鎖定封鎖線！
  if (queries.length >= limitCount.value) {
    const lockEndTime = now + (limitCooldown.value * 60 * 1000);
    localStorage.setItem('stroke_locked_until', lockEndTime.toString());
    startCountdown(lockEndTime);
    return;
  }
  
  // 5. 如果沒超過上限，記錄這次的查詢時間
  queries.push(now);
  localStorage.setItem('stroke_queries', JSON.stringify(queries));

  // 6. 正常執行查詢
  isQuerying.value = true; 
  queryResultMsg.value = '';
  errorMsg.value = '';
  
  try {
    const name = queryName.value.trim();
    const strokesArray = await getStrokeArrayAsync(name);
    const breakdown = name.split('').map((char, i) => `${char}(${strokesArray[i]})`).join(' ');
    queryResultMsg.value = `✅ ${breakdown} ➡ 密碼為：【 ${strokesArray.join('')} 】`; 
  } catch (error) {
    queryResultMsg.value = '❌ 查詢失敗，請稍後再試。';
  }
  
  isQuerying.value = false;
};

// 🌟 解決中文輸入法「選字按 Enter」會誤觸送出的問題
const handleEnter = (e) => {
  if (e.isComposing) return; // 如果正在選字中，就直接忽略，不執行查詢！
  handleStrokeQuery();
};
</script>

<template>
  <div class="query-box retro-element">
    <h3 style="margin-top: 0; color: var(--text-main); font-weight: 900;">🔍 忘記密碼？姓名筆畫查詢</h3>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
      <input type="text" v-model="queryName" class="retro-input" placeholder="輸入中文姓名" style="flex: 1;" @keydown.enter="handleEnter" :disabled="!!errorMsg" />
      <button class="retro-btn query-btn" @click="handleStrokeQuery" :disabled="isQuerying || !!errorMsg">{{ isQuerying && !errorMsg ? '查詢中' : '查詢' }}</button>
    </div>
    
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    
    <p v-if="queryResultMsg && !errorMsg" class="query-success">{{ queryResultMsg }} <br><small>(密碼為此數字加上 {{ schoolPhone.slice(-4) }})</small></p>
  </div>
</template>

<style scoped>
.query-box { background: var(--tab-bg); padding: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-btn); width: 100%; max-width: 450px; margin-top: 20px; text-align: center; box-sizing: border-box; }
.retro-input { width: 100%; padding: 12px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background-color: var(--input-bg); color: var(--text-main); font-size: 1rem; font-family: inherit; font-weight: bold; box-sizing: border-box; transition: all 0.3s; }
.retro-input:focus { background-color: var(--input-focus); outline: none; }
.retro-btn { padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); font-size: 1.3rem; font-weight: 900; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.query-btn { width: auto; margin: 0; padding: 10px 20px; background: var(--info-bg); color: var(--text-main); }
.query-success { color: var(--success-color); font-weight: bold; font-size: 1.1rem; margin: 10px 0 0 0; background: var(--success-bg); padding: 10px; border-radius: 8px; border: 1px dashed var(--success-color); line-height: 1.5;}

.error-msg { color: var(--danger-color); font-weight: bold; font-size: 1.1rem; margin: 10px 0 0 0; background: var(--danger-bg); padding: 10px; border-radius: 8px; border: 2px dashed var(--danger-color); line-height: 1.5; animation: pulse 1s infinite;}
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
</style>