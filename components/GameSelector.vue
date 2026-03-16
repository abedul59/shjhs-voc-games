<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

const props = defineProps({ autoLogoutMinutes: { type: Number, default: 10 } });
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const vocabMenu = ref([]);
const selectedGameType = ref('match'); 
const selectedVersion = ref('');
const selectedVolume = ref('');
const selectedUnit = ref('');
const errorMsg = ref('');
const isLoading = ref(false);
let idleTimer = null;

onMounted(async () => {
  const { data: vData } = await supabase.from('vocabularies').select('version, volume, unit').limit(10000);
  if (vData) {
    const uniqueMenu = [];
    vData.forEach(item => { if (!uniqueMenu.find(u => u.version === item.version && u.volume === item.volume && u.unit === item.unit)) uniqueMenu.push(item); });
    vocabMenu.value = uniqueMenu;
  }
  setupIdleTracking(); resetIdleTimer();
});

const availableVersions = computed(() => [...new Set(vocabMenu.value.map(item => item.version))].filter(Boolean));
const availableVolumes = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selectedVersion.value).map(item => item.volume))].filter(Boolean));
const availableUnits = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selectedVersion.value && item.volume === selectedVolume.value).map(item => item.unit))].filter(Boolean));

const onVersionChange = () => { selectedVolume.value = ''; selectedUnit.value = ''; };
const onVolumeChange = () => { selectedUnit.value = ''; };

const handleLogout = async () => { 
  removeIdleTracking();
  const logId = localStorage.getItem('current_login_log_id');
  if (logId && studentCookie.value && !studentCookie.value.isAnon) {
    await supabase.from('login_logs').update({ logout_time: new Date().toISOString() }).eq('id', logId);
    localStorage.removeItem('current_login_log_id');
  }
  studentCookie.value = null; 
  window.location.reload();
};

const handleStartGame = async () => {
  if (!selectedVersion.value || !selectedVolume.value || !selectedUnit.value) { errorMsg.value = '⚠️ 請完整選擇要挑戰的 範圍與單元！'; return; }
  isLoading.value = true;
  let targetPath = '/game';
  if (selectedGameType.value === 'move') targetPath = '/game-move';
  if (selectedGameType.value === 'choice') targetPath = '/game-choice';
  if (selectedGameType.value === 'fill') targetPath = '/game-fill';
  if (selectedGameType.value === 'sentence') targetPath = '/game-sentence'; 
  if (selectedGameType.value === 'listen') targetPath = '/game-listen';
  if (selectedGameType.value === 'puzzle') targetPath = '/game-puzzle'; 
  if (selectedGameType.value === 'speak') targetPath = '/game-speak'; 
  if (selectedGameType.value === 'cross') targetPath = '/game-cross'; 
  if (selectedGameType.value === 'review') targetPath = '/game-review';
  if (selectedGameType.value === 'battle') targetPath = '/game-battle'; // 🌟 新增對戰模式的導向路徑
  if (selectedGameType.value === 'tetris') targetPath = '/game-tetris';
  if (selectedGameType.value === 'pinball') targetPath = '/game-pinball';
  if (selectedGameType.value === 'angrybirds') targetPath = '/game-angrybirds';
  if (selectedGameType.value === 'tenchi') targetPath = '/game-tenchi';
  await navigateTo({ path: targetPath, query: { version: selectedVersion.value, volume: selectedVolume.value, unit: selectedUnit.value } });
};

const resetIdleTimer = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    alert(`⏳ 閒置超過 ${props.autoLogoutMinutes} 分鐘，系統已自動為您登出。`);
    handleLogout();
  }, props.autoLogoutMinutes * 60 * 1000);
};

const setupIdleTracking = () => { ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => window.addEventListener(evt, resetIdleTimer)); };
const removeIdleTracking = () => { ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => window.removeEventListener(evt, resetIdleTimer)); clearTimeout(idleTimer); };

onUnmounted(() => removeIdleTracking());
</script>

<template>
  <div>
    <div class="logged-in-section retro-element">
      <h3>👋 歡迎回來！</h3>
      <p><span v-if="studentCookie.isAnon">🕵️ {{ studentCookie.name }}</span><span v-else>👤 {{ studentCookie.class }} - {{ studentCookie.name }}</span></p>
      <button class="retro-btn logout-btn" @click="handleLogout">🚪 登出帳號</button>
    </div>

    <hr class="divider" />
    <div class="game-selection">
      <h3>🎮 選擇遊戲模式</h3>
      <div class="game-type-tabs">
        <button class="type-btn" :class="{ active: selectedGameType === 'match' }" @click="selectedGameType = 'match'">🟦 方塊消消樂</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'move' }" @click="selectedGameType = 'move'">🔠 單字神移動</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'choice' }" @click="selectedGameType = 'choice'">✅ 單字選選樂</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'fill' }" @click="selectedGameType = 'fill'">⌨️ 單字填一填</button>
        <button class="type-btn sentence-btn" :class="{ active: selectedGameType === 'sentence' }" @click="selectedGameType = 'sentence'">📝 單字例句神絕配</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'listen' }" @click="selectedGameType = 'listen'">🎧 單字例句順風耳</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'puzzle' }" @click="selectedGameType = 'puzzle'">🧩 單字拼起來</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'speak' }" @click="selectedGameType = 'speak'">🎙️ 單字口說測一測</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'cross' }" @click="selectedGameType = 'cross'">🔠 單字填字FUN</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'review' }" @click="selectedGameType = 'review'">✍️ 單字複習趣</button>
        
        <button class="type-btn" :class="{ active: selectedGameType === 'battle' }" @click="selectedGameType = 'battle'">⚔️ 單字方塊陣 (雙人對戰)</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'tetris' }" @click="selectedGameType = 'tetris'">🧱  單字俄羅斯方塊</button>

        <button class="type-btn" :class="{ active: selectedGameType === 'pinball' }" @click="selectedGameType = 'pinball'">🎰單字彈珠台</button>
        <button class="type-btn angrybirds-btn" :class="{ active: selectedGameType === 'angrybirds' }" @click="selectedGameType = 'angrybirds'">🐦 單字憤怒鳥</button>
        <button class="type-btn tenchi-btn" :class="{ active: selectedGameType === 'tenchi' }" @click="selectedGameType = 'tenchi'">🐎 單字吞食天地(雙人對戰)</button>
      </div>

      <h3 style="margin-top: 20px;">📚 選擇挑戰單元</h3>
      <div class="form-group"><select v-model="selectedVersion" @change="onVersionChange" class="retro-input"><option value="" disabled>1. 版本...</option><option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option></select></div>
      <div class="form-group"><select v-model="selectedVolume" @change="onVolumeChange" class="retro-input" :disabled="!selectedVersion"><option value="" disabled>2. 冊數...</option><option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol }}</option></select></div>
      <div class="form-group"><select v-model="selectedUnit" class="retro-input" :disabled="!selectedVolume"><option value="" disabled>3. 單元...</option><option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option></select></div>
    </div>

    <button class="retro-btn start-btn" @click="handleStartGame" :disabled="isLoading">{{ isLoading ? '載入中...' : '▶ 開始挑戰' }}</button>
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
/* 加在 <style> 裡面的按鈕顏色設定區 */
.tenchi-btn { background: #e8f5e9; color: #1b5e20; border-color: #4caf50; } .tenchi-btn.active { background: #4caf50; color: #fff; box-shadow: 0 4px 0 #1b5e20; }
.angrybirds-btn { background: #ffebee; color: #c62828; border-color: #ef5350; } .angrybirds-btn.active { background: #f44336; color: #fff; box-shadow: 0 4px 0 #c62828; }
.game-pinball { background-color: #6a1b9a; color: white; border-color: #4527a0; }
.logged-in-section { background: var(--success-bg); border: var(--border-width) solid var(--success-color); border-radius: var(--radius-element); padding: 20px; text-align: center; margin-bottom: 20px; color: var(--text-main); }
.logged-in-section h3 { margin-top: 0; color: var(--success-color); font-weight: 900; }
.logout-btn { background-color: var(--btn-danger-bg) !important; color: var(--text-main) !important; padding: 10px !important; font-size: 1rem !important; margin-top: 10px; width: auto !important; display: inline-block; }

.divider { border: 0; border-bottom: 2px dashed var(--border-color); opacity: 0.3; margin: 20px 0; }

.game-selection h3 { margin: 0 0 10px 0; font-weight: 900; color: var(--text-main); }
.game-type-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.type-btn { flex: 1; min-width: 45%; padding: 10px 5px; font-size: 0.95rem; font-weight: 900; background: var(--tab-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); transition: all 0.2s; }
.type-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.sentence-btn { min-width: 100%; margin-top: 5px; }

/* 🌟 新增：對戰按鈕的專屬戰鬥風格 */
.battle-btn { min-width: 100%; margin-top: 10px; background: #fff3e0; color: #e65100; border-color: #ffb74d; }
.battle-btn.active { background: #ff9800; color: #fff; border-color: #e65100; box-shadow: 0 4px 0 #e65100; }

.form-group { margin-bottom: 15px; text-align: left; }
.retro-input { width: 100%; padding: 12px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background-color: var(--input-bg); color: var(--text-main); font-size: 1rem; font-family: inherit; font-weight: bold; box-sizing: border-box; transition: all 0.3s; }
.retro-input:focus { background-color: var(--input-focus); outline: none; }
.retro-input:disabled { opacity: 0.5; cursor: not-allowed; }

.retro-btn { width: 100%; padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); font-size: 1.3rem; font-weight: 900; cursor: pointer; text-align: center; margin-top: 10px; transition: all 0.15s; font-family: inherit;}
.start-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.error-msg { background: var(--danger-bg); border: 2px dashed var(--danger-color); color: var(--danger-color); margin-top: 15px; font-weight: 900; padding: 10px; text-align: center; border-radius: var(--radius-element); }
@media (max-width: 600px) { .game-type-tabs { flex-direction: column; } }
</style>