<script setup>
import { ref, onMounted, computed, watch } from 'vue';

const supabase = useSupabaseClient();
const isLoading = ref(true);
const isSaving = ref(false);

// 權限判斷
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');
const allowedClasses = Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : [];
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.includes('ALL'));

const settings = ref({
  disabled_games: [], locked_units: [], restrict_play_time: false, allow_play_days: [1,2,3,4,5], allow_play_start: '08:00', allow_play_end: '17:00', 
  login_blocked_message: '⚠️ 目前為系統管制時間，暫不開放登入喔！',
  disable_anon_login: false // ✨ 新增：禁止匿名登入開關
});

const vocabMenu = ref([]);
const selVer = ref(''); const selVol = ref(''); const selUnit = ref('');

const gamesList = [
  { id: 'match', name: '🟦 方塊消消樂' }, { id: 'move', name: '🔠 單字神移動' }, { id: 'choice', name: '✅ 單字選選樂' }, { id: 'fill', name: '⌨️ 單字填一填' },
  { id: 'sentence', name: '📝 單字例句神絕配' }, { id: 'listen', name: '🎧 單字例句順風耳' }, { id: 'puzzle', name: '🧩 單字拼起來' }, { id: 'speakno1', name: '🗣️ 英語口說學霸-多元評量' },
  { id: 'speak', name: '🎙️ 單字口說測一測' }, { id: 'cross', name: '🔠 單字填字FUN' }, { id: 'review', name: '✍️ 單字複習趣' }, { id: 'tetris', name: '🧱 俄羅斯方塊' },
  { id: 'pinball', name: '🎰 單字彈珠台' }, { id: 'angrybirds', name: '🐦 單字憤怒鳥' }, { id: 'solitaire', name: '🃏 撲克牌接龍' }, { id: 'pikavolley', name: '⚡ 皮卡丘排球' },
  { id: 'pacman', name: '👻 單字小精靈' }, { id: 'minesweeper', name: '💣 單字踩地雷' }, { id: 'sudoku', name: '🔢 單字9x9數獨' }, { id: 'tarotUno1', name: '🃏 塔羅UNO(單)' },
  { id: 'tarot21solo', name: '🃏 塔羅21點(單)' }, { id: 'tarotAlch1', name: '🔮 塔羅鍊金術(單)' }, { id: 'ninja', name: '🥷 單字音節忍者' }, { id: 'picture2meaning', name: '🖼️ 單字看圖辨義' }, 
  { id: 'examListen1', name: '💯 仿會考-辨識句意' }, { id: 'examRead1', name: '📜 會考閱讀考古學(單題)' }, { id: 'shake2shuffle', name: '🧋 單字搖搖杯' }, { id: 'tilt2sort', name: '⚖️ 左右為難：單字天平' }, 
  { id: 'gravitymaze', name: '🔮 單字迷宮滾滾球' }, { id: 'swing2cast', name: '🪄 霍格華茲單字魔法杖' }, { id: 'ARsniper', name: '🔫 AR實境單字狙擊手' }, { id: 'GPSmap', name: '🌍 單字地圖 GO' }, 
  { id: 'speakno2', name: '📖 英語口說學霸-朗讀與說故事' }, { id: 'KKphonetics', name: '🔤 KK音標初學/複習' }, { id: 'Phonics', name: '🔤 自然發音初學/複習' }, { id: 'speakno3', name: '🎤 英語口說學霸-英語歌唱' }, 
  { id: 'examRead2', name: '📜 會考閱讀考古學(題組)' }, { id: 'gramAmuPark', name: '🎡 文法遊樂園' }, { id: 'noropejump', name: '🏃‍♂️ 單字無繩式跳繩' }, { id: 'vocshooting', name: '🥊 單字飛鼠射擊' },
];

const daysList = [{ val: 1, label: '一' }, { val: 2, label: '二' }, { val: 3, label: '三' }, { val: 4, label: '四' }, { val: 5, label: '五' }, { val: 6, label: '六' }, { val: 0, label: '日' }];

// 學生個別權限管理狀態
const displayClasses = computed(() => {
  if (isSuperAdmin.value) {
    const list = ['000']; for (let grade of [7, 8, 9]) { for (let i = 1; i <= 14; i++) { list.push(`${grade}${String(i).padStart(2, '0')}`); } } list.push('999'); return list;
  }
  return [...allowedClasses].sort();
});
const selStudentClass = ref('');
const classStudents = ref([]);
const isFetchingStudents = ref(false);

const showStudentModal = ref(false);
const editingStudent = ref(null);
const tempAllowedMode = ref('ALL'); 
const tempAllowedGames = ref([]);

onMounted(async () => {
  const { data: vData } = await supabase.from('vocabularies').select('version, volume, unit').limit(10000);
  if (vData) {
    const uniqueMenu = []; vData.forEach(item => { if (!uniqueMenu.find(u => u.version === item.version && u.volume === item.volume && u.unit === item.unit)) uniqueMenu.push(item); });
    vocabMenu.value = uniqueMenu;
  }

  // ✨ 修改點：要求資料庫抓出 disable_anon_login
  const { data: s } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (s) {
    settings.value.disabled_games = s.disabled_games || []; settings.value.locked_units = s.locked_units || [];
    settings.value.restrict_play_time = s.restrict_play_time || false; settings.value.allow_play_days = s.allow_play_days || [1,2,3,4,5];
    settings.value.allow_play_start = s.allow_play_start ? s.allow_play_start.substring(0,5) : '08:00'; settings.value.allow_play_end = s.allow_play_end ? s.allow_play_end.substring(0,5) : '17:00';
    settings.value.login_blocked_message = s.login_blocked_message || '⚠️ 目前為系統管制時間，暫不開放登入喔！'; 
    settings.value.disable_anon_login = s.disable_anon_login || false; // ✨ 讀取禁止匿名設定
  }
  
  if (displayClasses.value.length > 0) selStudentClass.value = displayClasses.value[0];
  isLoading.value = false;
});

const availableVersions = computed(() => [...new Set(vocabMenu.value.map(item => item.version))].filter(Boolean));
const availableVolumes = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selVer.value).map(item => item.volume))].filter(Boolean));
const availableUnits = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selVer.value && item.volume === selVol.value).map(item => item.unit))].filter(Boolean));
const onVersionChange = () => { selVol.value = ''; selUnit.value = ''; };
const onVolumeChange = () => { selUnit.value = ''; };

const addLockedUnit = () => {
  if (!selVer.value || !selVol.value || !selUnit.value) return;
  const key = `${selVer.value}|${selVol.value}|${selUnit.value}`;
  if (!settings.value.locked_units.includes(key)) settings.value.locked_units.push(key);
};
const removeLockedUnit = (index) => { settings.value.locked_units.splice(index, 1); };

const saveSettings = async () => {
  isSaving.value = true;
  await supabase.from('system_settings').update({
    disabled_games: settings.value.disabled_games, locked_units: settings.value.locked_units, restrict_play_time: settings.value.restrict_play_time,
    allow_play_days: settings.value.allow_play_days, allow_play_start: settings.value.allow_play_start, allow_play_end: settings.value.allow_play_end,
    login_blocked_message: settings.value.login_blocked_message,
    disable_anon_login: settings.value.disable_anon_login // ✨ 儲存禁止匿名設定
  }).eq('id', 1);
  setTimeout(() => { isSaving.value = false; alert('✅ 全域權限與時間設定已成功儲存！'); }, 500);
};

// 學生個別權限管理邏輯
const fetchStudents = async () => {
  if (!selStudentClass.value) return;
  isFetchingStudents.value = true;
  const { data } = await supabase.from('students').select('id, real_name, seat_number, allowed_games').eq('class_name', selStudentClass.value).order('seat_number', { ascending: true });
  if (data) classStudents.value = data;
  isFetchingStudents.value = false;
};
watch(selStudentClass, fetchStudents);

const openStudentModal = (student) => {
  editingStudent.value = student;
  const currentAllowed = student.allowed_games || ['ALL'];
  if (currentAllowed.includes('ALL')) { tempAllowedMode.value = 'ALL'; tempAllowedGames.value = []; } 
  else { tempAllowedMode.value = 'CUSTOM'; tempAllowedGames.value = [...currentAllowed]; }
  showStudentModal.value = true;
};

const saveStudentAccess = async () => {
  const finalAllowed = tempAllowedMode.value === 'ALL' ? ['ALL'] : [...tempAllowedGames.value];
  if (tempAllowedMode.value === 'CUSTOM' && finalAllowed.length === 0) {
    if (!confirm('您沒有勾選任何遊戲，這位學生將無法進行任何挑戰！確定要這樣設定嗎？')) return;
  }
  await supabase.from('students').update({ allowed_games: finalAllowed }).eq('id', editingStudent.value.id);
  alert(`✅ 已更新 ${editingStudent.value.real_name} 的專屬遊戲白名單！`);
  showStudentModal.value = false; fetchStudents();
};
</script>

<template>
  <div class="access-container">
    <div class="header">
      <h1>🛑 遊戲權限與開放時間管理</h1>
      <div style="display: flex; gap: 10px;">
        <NuxtLink to="/admin" class="retro-btn btn-secondary" style="text-decoration:none;">返回後台首頁</NuxtLink>
        <button v-if="isSuperAdmin" class="retro-btn btn-primary" @click="saveSettings">{{ isSaving ? '儲存中...' : '💾 儲存全域設定' }}</button>
      </div>
    </div>

    <div v-if="isLoading">載入中...</div>
    
    <div v-else class="content-grid">
      
      <template v-if="isSuperAdmin">
        
        <div class="admin-card" style="border-color: #f44336;">
          <h3 style="color: #c62828;">🚫 訪客登入限制</h3>
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.disable_anon_login" />
            <b style="color: #d32f2f;">禁止匿名訪客登入</b>
          </label>
          <p style="font-size: 0.95rem; color: #555; margin-top: 5px;">
            勾選後，前台登入畫面的「匿名挑戰」選項將會被隱藏，強制所有人必須使用正確的班級與座號登入，以防止學生鑽漏洞規避追蹤。
          </p>
        </div>

        <div class="admin-card">
          <h3>⏳ 全站開放時間限制</h3>
          <label class="toggle-label"><input type="checkbox" v-model="settings.restrict_play_time" /><b>啟用全站時間限制</b></label>
          <div v-if="settings.restrict_play_time" class="time-settings-box">
            <div style="margin-bottom: 10px;"><b>開放星期：</b><div class="days-grid"><label v-for="day in daysList" :key="day.val" class="day-cb"><input type="checkbox" :value="day.val" v-model="settings.allow_play_days" />週{{ day.label }}</label></div></div>
            <div><b>開放時段：</b><input type="time" v-model="settings.allow_play_start" class="retro-input time-input" />～<input type="time" v-model="settings.allow_play_end" class="retro-input time-input" /></div>
            <div style="margin-top: 15px; border-top: 1px dashed #ced4da; padding-top: 15px;">
              <label style="color: #d32f2f; font-weight: bold; display: block; margin-bottom: 5px;">🛑 阻擋登入提示訊息：</label>
              <textarea v-model="settings.login_blocked_message" class="retro-input" rows="3" style="width: 100%; border-color: #f44336; background: #ffebee;"></textarea>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <h3>🔒 鎖定特定單元</h3>
          <p style="font-size: 0.9rem; color: #555;">被鎖定的單元，學生在前台選中時將無法按「開始挑戰」。</p>
          <div class="unit-selector">
            <select v-model="selVer" @change="onVersionChange" class="retro-input"><option value="" disabled>版本...</option><option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option></select>
            <select v-model="selVol" @change="onVolumeChange" class="retro-input" :disabled="!selVer"><option value="" disabled>冊數...</option><option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol }}</option></select>
            <select v-model="selUnit" class="retro-input" :disabled="!selVol"><option value="" disabled>單元...</option><option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option></select>
            <button class="retro-btn btn-danger" @click="addLockedUnit" :disabled="!selUnit">加入黑名單</button>
          </div>
          <div class="locked-list">
            <div v-for="(locked, i) in settings.locked_units" :key="i" class="locked-tag">{{ locked.replace(/\|/g, ' - ') }}<button @click="removeLockedUnit(i)" class="del-btn">✖</button></div>
            <div v-if="settings.locked_units.length === 0" style="color:#aaa;">目前無鎖定單元</div>
          </div>
        </div>

        <div class="admin-card">
          <h3>🎮 遊戲模組停用設定 (全校)</h3>
          <p style="font-size: 0.9rem; color: #555; margin-bottom: 15px;">打勾的遊戲代表「全校維護中」，所有人皆無法遊玩。</p>
          <div class="games-grid">
            <label v-for="game in gamesList" :key="game.id" class="game-cb" :class="{ 'is-disabled': settings.disabled_games.includes(game.id) }">
              <input type="checkbox" :value="game.id" v-model="settings.disabled_games" />{{ game.name }}
            </label>
          </div>
        </div>
      </template>

      <div class="admin-card full-width" style="border-color: #4caf50;">
        <h3 style="color: #2e7d32; border-bottom-color: #a5d6a7;">🧑‍🎓 學生個別遊戲開放設定 (白名單)</h3>
        <p style="font-size: 0.95rem; color: #555; margin-bottom: 15px;">您可以針對程度不同的學生，設定他們今天只能玩哪些特定的遊戲（例如補救教學限定）。</p>
        
        <div style="margin-bottom: 15px;">
          <label style="font-weight: bold; margin-right: 10px;">選擇班級：</label>
          <select v-model="selStudentClass" class="retro-input" style="width: 200px;">
            <option v-if="displayClasses.length === 0" value="">(無授權班級)</option>
            <option v-for="cls in displayClasses" :key="cls" :value="cls">{{ cls }} 班</option>
          </select>
        </div>

        <div v-if="isFetchingStudents">讀取學生名單中...</div>
        <table v-else class="students-table">
          <thead><tr><th width="60">座號</th><th>姓名</th><th>目前權限狀態</th><th width="120">操作</th></tr></thead>
          <tbody>
            <tr v-for="stu in classStudents" :key="stu.id">
              <td>{{ stu.seat_number }}</td>
              <td style="font-weight: bold;">{{ stu.real_name }}</td>
              <td>
                <span v-if="!stu.allowed_games || stu.allowed_games.includes('ALL')" class="badge bg-green">🟢 全部開放</span>
                <span v-else class="badge bg-orange">🟠 自訂白名單 (開放 {{ stu.allowed_games.length }} 款)</span>
              </td>
              <td><button class="retro-btn btn-small" @click="openStudentModal(stu)">⚙️ 設定</button></td>
            </tr>
            <tr v-if="classStudents.length === 0"><td colspan="4" style="text-align: center; color: #777;">此班級目前無學生資料</td></tr>
          </tbody>
        </table>
      </div>

    </div>

    <div v-if="showStudentModal" class="modal-overlay">
      <div class="modal-box retro-element">
        <h2 style="margin-top:0; border-bottom: 2px dashed #ccc; padding-bottom: 10px; color: #1565c0;">
          ⚙️ 設定 {{ editingStudent?.real_name }} 的可用遊戲
        </h2>
        
        <div class="radio-group">
          <label><input type="radio" v-model="tempAllowedMode" value="ALL"> 🟢 全部開放 (跟隨全校設定)</label>
          <label><input type="radio" v-model="tempAllowedMode" value="CUSTOM"> 🟠 自訂白名單 (只能玩勾選的遊戲)</label>
        </div>

        <div v-if="tempAllowedMode === 'CUSTOM'" class="custom-games-list">
          <label v-for="game in gamesList" :key="game.id" class="custom-game-cb">
            <input type="checkbox" :value="game.id" v-model="tempAllowedGames" />
            {{ game.name }}
          </label>
        </div>

        <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button class="retro-btn btn-primary" @click="saveStudentAccess">💾 儲存學生設定</button>
          <button class="retro-btn btn-secondary" @click="showStudentModal = false">❌ 取消</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.access-container { padding: 20px; max-width: 1100px; margin: 0 auto; color: #333; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
.retro-btn { padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 2px solid; transition: 0.1s; }
.retro-btn.btn-small { padding: 4px 8px; font-size: 0.9rem;}
.retro-btn:active:not(:disabled) { transform: translateY(3px); }
.btn-primary { background: #007bff; color: white; border-color: #0056b3; }
.btn-secondary { background: #e0e0e0; color: #333; border-color: #ccc; }
.btn-danger { background: #dc3545; color: white; border-color: #a71d2a; }
.retro-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.admin-card { background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; }
.full-width { grid-column: 1 / -1; }
.admin-card h3 { margin-top: 0; color: #495057; border-bottom: 2px dashed #ced4da; padding-bottom: 10px; }

.toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 1.1rem; margin-bottom: 15px; }
.time-settings-box { background: #e9ecef; padding: 15px; border-radius: 8px; border: 1px solid #ced4da; }
.days-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px; }
.day-cb { background: #fff; padding: 5px 10px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; }
.retro-input { padding: 8px; border-radius: 4px; border: 1px solid #aaa; font-size: 1rem; }
.time-input { width: 130px; font-weight: bold; text-align: center; }

.unit-selector { display: flex; gap: 5px; margin-bottom: 15px; flex-wrap: wrap; }
.unit-selector select { flex: 1; min-width: 100px; }

.locked-list { display: flex; flex-wrap: wrap; gap: 8px; }
.locked-tag { background: #ffebee; color: #c62828; border: 1px solid #ef5350; padding: 5px 12px; border-radius: 20px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
.del-btn { background: none; border: none; color: #c62828; font-weight: bold; cursor: pointer; padding: 0; font-size: 1.1rem; }

.games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.game-cb { background: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: bold; transition: 0.2s;}
.game-cb.is-disabled { background: #ffebee; border-color: #ef5350; color: #c62828; text-decoration: line-through; }

/* 學生管理表格樣式 */
.students-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;}
.students-table th, .students-table td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
.students-table th { background: #e8f5e9; color: #1b5e20; }
.badge { padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; color: white; display: inline-block;}
.bg-green { background: #4caf50; }
.bg-orange { background: #ff9800; }

/* Modal 樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box;}
.modal-box { background: white; padding: 25px; border-radius: 12px; border: 3px solid #1565c0; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto;}
.radio-group { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 8px; border: 1px dashed #ccc;}
.radio-group label { font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;}
.radio-group input[type="radio"] { width: 18px; height: 18px; cursor: pointer; }
.custom-games-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #fff3e0; padding: 15px; border-radius: 8px; border: 2px solid #ffb74d;}
.custom-game-cb { display: flex; align-items: center; gap: 8px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #ccc; cursor: pointer; font-size: 0.95rem; font-weight: bold;}
.custom-game-cb:hover { border-color: #ff9800; }

@media (max-width: 768px) { .content-grid, .custom-games-list { grid-template-columns: 1fr; } }
</style>
