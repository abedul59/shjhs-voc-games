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

const gameDict = {
  'match': { name: '🟦 方塊消消樂', path: '/game', class: '' },
  'move': { name: '🔠 單字神移動', path: '/game-move', class: '' },
  'choice': { name: '✅ 單字選選樂', path: '/game-choice', class: '' },
  'fill': { name: '⌨️ 單字填一填', path: '/game-fill', class: '' },
  'sentence': { name: '📝 單字例句神絕配', path: '/game-sentence', class: 'full-width' },
  'listen': { name: '🎧 單字例句順風耳', path: '/game-listen', class: '' },
  'puzzle': { name: '🧩 單字拼起來', path: '/game-puzzle', class: '' },
  'speakno1': { name: '🗣️ 英語口說學霸-多元評量', path: '/game-speakno1', class: 'speak-btn' },
  'speak': { name: '🎙️ 單字口說測一測', path: '/game-speak', class: '' },
  'cross': { name: '🔠 單字填字FUN', path: '/game-cross', class: '' },
  'review': { name: '✍️ 單字複習趣', path: '/game-review', class: '' },
  'picture2meaning': { name: '🖼️ 單字看圖辨義', path: '/game-picture2meaning', class: 'picture2meaning-btn full-width' },
  'ninja': { name: '🥷 單字音節忍者', path: '/game-ninja', class: 'full-width' },
  'examListen1': { name: '💯 仿會考-辨識句意', path: '/game-examListen1', class: 'exam-btn full-width' },
  'examRead1': { name: '📜 會考閱讀考古學(單題)', path: '/game-examRead1', class: 'exam-btn full-width' },
  'GPSmap': { name: '🌍 單字地圖 GO', path: '/game-GPSmap', class: 'gps-btn full-width' },  
  'tetris': { name: '🧱 俄羅斯方塊', path: '/game-tetris', class: '' },
  'pinball': { name: '🎰 單字彈珠台', path: '/game-pinball', class: 'game-pinball' },
  'angrybirds': { name: '🐦 單字憤怒鳥', path: '/game-angrybirds', class: 'angrybirds-btn' },
  'solitaire': { name: '🃏 撲克牌接龍', path: '/game-solitaire', class: 'solitaire-btn' },
  'pikavolley': { name: '⚡ 皮卡丘排球', path: '/game-pikavolley', class: 'pika-btn' },
  'pacman': { name: '👻 單字小精靈', path: '/game-pacman', class: 'pacman-btn' },
  'minesweeper': { name: '💣 單字踩地雷', path: '/game-minesweeper', class: 'minesweeper-btn' },
  'sudoku': { name: '🔢 單字9x9數獨', path: '/game-9x9sudoku', class: 'sudoku-btn' },
  'tarotUno1': { name: '🃏 塔羅UNO(單人)', path: '/game-tarotUno1', class: 'tarot-btn' },
  'tarot21solo': { name: '🃏 塔羅21點(單人)', path: '/game-tarot21solo', class: 'tarot-btn' },
  'tarotAlch1': { name: '🔮 塔羅鍊金術(單人)', path: '/game-tarotAlch1', class: 'tarot-btn' },
  'shake2shuffle': { name: '🧋 單字搖搖杯', path: '/game-shake2shuffle', class: 'shake-btn full-width' },
  'tilt2sort': { name: '⚖️ 左右為難：單字天平', path: '/game-tilt2sort', class: 'tilt-btn full-width' },
  'gravitymaze': { name: '🔮 單字迷宮滾滾球', path: '/game-gravitymaze', class: 'maze-btn full-width' },
  'swing2cast': { name: '🪄 霍格華茲單字杖', path: '/game-swing2cast', class: 'magic-btn full-width' },
  'ARsniper': { name: '🔫 AR實境單字狙擊手', path: '/game-ARsniper', class: 'sniper-btn full-width' },
  'speakno2': { name: '📖 英語口說學霸-朗讀與說故事', path: '/game-speakno2', class: 'speak-btn full-width' },
  'KKphonetics': { name: '🔤 KK音標初學/複習', path: '/game-KKphonetics', class: 'speak-btn full-width' },
  'Phonics': { name: '🔤 自然發音初學/複習', path: '/game-Phonics', class: 'speak-btn full-width' },
  'speakno3': { name: '🎤 英語口說學霸-英語歌唱', path: '/game-speakno3', class: 'speak-btn full-width' },
  'examRead2': { name: '📜 會考閱讀考古學(題組)', path: '/game-examRead2', class: 'exam-btn full-width' },
  'gramAmuPark': { name: '🎡 文法遊樂園', path: '/game-gramAmuPark', class: 'exam-btn full-width' },
  'noropejump': { name: '🏃‍♂️ 單字無繩式跳繩', path: '/game-noropejump', class: 'exam-btn full-width' },
  'vocshooting': { name: '🥊 單字飛鼠射擊', path: '/game-vocshooting', class: 'shooting-btn full-width' },
  'battle': { name: '⚔️ 單字方塊陣', path: '/game-battle', class: 'battle-btn full-width', pvpKey: 'enable_battle' },
  'tenchi': { name: '🐎 吞食天地', path: '/game-tenchi', class: 'tenchi-btn', pvpKey: 'enable_tenchi' },
  'tarot21': { name: '🃏 塔羅 21 點', path: '/game-tarot21', class: 'tarot-btn', pvpKey: 'enable_tarot21' },
  'tarotAlch': { name: '🔮 塔羅鍊金術', path: '/game-tarotAlch', class: 'tarot-btn', pvpKey: 'enable_tarot_alch' },
  'tarotUno': { name: '🃏 塔羅 UNO', path: '/game-tarotUno', class: 'tarot-btn', pvpKey: 'enable_tarot_uno' }
};

const noUnitGames = ['speakno1', 'speakno2', 'speakno3', 'KKphonetics', 'Phonics', 'examRead1', 'examRead2'];
const isNoUnitGame = computed(() => noUnitGames.includes(selectedGameType.value));

const dynamicCategories = ref([]);
const pvpStatus = ref({});
const accessSettings = ref({
  disabled_games: [], locked_units: [], restrict_play_time: false, allow_play_days: [1,2,3,4,5,6,0], allow_play_start: '00:00', allow_play_end: '23:59'
});

// 🌟 儲存學生專屬白名單 (預設為 ALL 全開)
const studentAllowedGames = ref(['ALL']);

onMounted(async () => {
  const { data: vData } = await supabase.from('vocabularies').select('version, volume, unit').limit(10000);
  if (vData) {
    const uniqueMenu = [];
    vData.forEach(item => { if (!uniqueMenu.find(u => u.version === item.version && u.volume === item.volume && u.unit === item.unit)) uniqueMenu.push(item); });
    vocabMenu.value = uniqueMenu;
  }
  
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) {
    if (settings.game_categories) {
      dynamicCategories.value = settings.game_categories;
      const hasShooting = dynamicCategories.value.some(cat => cat.games.includes('vocshooting'));
      if (!hasShooting && dynamicCategories.value.length > 0) dynamicCategories.value[0].games.push('vocshooting');
    }
    
    pvpStatus.value = {
      enable_battle: settings.enable_battle === true, enable_tenchi: settings.enable_tenchi === true,
      enable_tarot21: settings.enable_tarot21 === true, enable_tarot_alch: settings.enable_tarot_alch === true,
      enable_tarot_uno: settings.enable_tarot_uno === true
    };
    accessSettings.value = {
      disabled_games: settings.disabled_games || [], locked_units: settings.locked_units || [],
      restrict_play_time: settings.restrict_play_time || false, allow_play_days: settings.allow_play_days || [1,2,3,4,5,6,0],
      allow_play_start: settings.allow_play_start ? settings.allow_play_start.substring(0,5) : '00:00',
      allow_play_end: settings.allow_play_end ? settings.allow_play_end.substring(0,5) : '23:59'
    };
  }

  // 🌟 讀取目前登入學生的白名單設定
  if (studentCookie.value && !studentCookie.value.isAnon) {
    const { data: stuData } = await supabase.from('students').select('allowed_games').eq('id', studentCookie.value.id).single();
    if (stuData && stuData.allowed_games) {
      studentAllowedGames.value = stuData.allowed_games;
    }
  }

  // 防呆：如果預設選擇的遊戲已經被鎖住了，自動往下找第一個可玩的遊戲
  setTimeout(() => {
    if (checkGameDisabled(selectedGameType.value)) {
       for (const cat of dynamicCategories.value) {
         for (const gId of cat.games) {
           if (!checkGameDisabled(gId)) {
             selectedGameType.value = gId;
             return;
           }
         }
       }
    }
  }, 200);

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

const isTimeAllowed = computed(() => {
  if (!accessSettings.value.restrict_play_time) return true;
  const now = new Date();
  if (!accessSettings.value.allow_play_days.includes(now.getDay())) return false;
  const currentStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  return currentStr >= accessSettings.value.allow_play_start && currentStr <= accessSettings.value.allow_play_end;
});

const isUnitLocked = computed(() => {
  if (!selectedVersion.value || !selectedVolume.value || !selectedUnit.value) return false;
  return accessSettings.value.locked_units.includes(`${selectedVersion.value}|${selectedVolume.value}|${selectedUnit.value}`);
});

// 🌟 核心：動態判定遊戲是否被鎖住
const checkGameDisabled = (gameId) => {
    // 1. 全校封鎖黑名單
    if (accessSettings.value.disabled_games?.includes(gameId)) return true;
    
    // 2. 雙人對戰模式的總開關
    const gData = gameDict[gameId];
    if (gData && gData.pvpKey && pvpStatus.value) {
        if (pvpStatus.value[gData.pvpKey] === false) return true;
    }

    // 3. 學生專屬白名單：如果陣列裡沒有 'ALL'，且這款遊戲不在他的白名單內，就鎖定！
    if (studentAllowedGames.value && !studentAllowedGames.value.includes('ALL')) {
        if (!studentAllowedGames.value.includes(gameId)) {
            return true; 
        }
    }

    return false;
};

const handleStartGame = async () => {
  if (!isTimeAllowed.value) { errorMsg.value = '⚠️ 目前非開放遊玩時段！'; return; }
  
  if (checkGameDisabled(selectedGameType.value)) { 
      if (!studentAllowedGames.value.includes('ALL') && !studentAllowedGames.value.includes(selectedGameType.value)) {
          errorMsg.value = '⚠️ 老師目前沒有開放這個遊戲給您玩喔！'; 
      } else {
          errorMsg.value = '⚠️ 此遊戲目前全校維護中，已被禁用！'; 
      }
      return; 
  }

  if (isNoUnitGame.value) {
    isLoading.value = true;
    await navigateTo({ path: gameDict[selectedGameType.value].path });
    return;
  }

  if (!selectedVersion.value || !selectedVolume.value || !selectedUnit.value) { errorMsg.value = '⚠️ 請完整選擇要挑戰的範圍！'; return; }
  if (isUnitLocked.value) { errorMsg.value = '⚠️ 此單元已被老師鎖定，目前無法遊玩！'; return; }

  isLoading.value = true;
  const targetPath = gameDict[selectedGameType.value]?.path || '/game';
  await navigateTo({ path: targetPath, query: { version: selectedVersion.value, volume: selectedVolume.value, unit: selectedUnit.value } });
};

const resetIdleTimer = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { alert(`⏳ 閒置過久，系統已自動為您登出。`); handleLogout(); }, props.autoLogoutMinutes * 60 * 1000);
};
const setupIdleTracking = () => { ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => window.addEventListener(evt, resetIdleTimer)); };
const removeIdleTracking = () => { ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => window.removeEventListener(evt, resetIdleTimer)); clearTimeout(idleTimer); };
onUnmounted(() => removeIdleTracking());
</script>

<template>
  <div class="selector-container">
    <div class="user-info">
      <span class="user-name">🧑‍🎓 {{ studentCookie?.class }} {{ studentCookie?.name }}</span>
      <button class="retro-btn logout-btn" @click="handleLogout">登出</button>
    </div>

    <div class="unit-selector retro-element">
      <div class="select-group">
        <label>📖 版本</label>
        <select v-model="selectedVersion" @change="onVersionChange" class="retro-input">
          <option value="" disabled>請選擇...</option>
          <option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>
      <div class="select-group">
        <label>📚 冊數</label>
        <select v-model="selectedVolume" @change="onVolumeChange" class="retro-input" :disabled="!selectedVersion">
          <option value="" disabled>請選擇...</option>
          <option v-for="v in availableVolumes" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>
      <div class="select-group">
        <label>🔖 單元</label>
        <select v-model="selectedUnit" class="retro-input" :disabled="!selectedVolume">
          <option value="" disabled>請選擇...</option>
          <option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>
    </div>

    <div class="categories-container">
      <div v-for="cat in dynamicCategories" :key="cat.category_name" class="category-section retro-element">
        <h3 class="cat-title">{{ cat.category_name }}</h3>
        <div class="games-grid">
          
          <button 
            v-for="gameId in cat.games" 
            :key="gameId"
            class="retro-btn game-btn"
            :class="[
              gameDict[gameId]?.class, 
              { 'active': selectedGameType === gameId, 'is-locked': checkGameDisabled(gameId) }
            ]"
            @click="if(!checkGameDisabled(gameId)) selectedGameType = gameId"
            :disabled="checkGameDisabled(gameId)"
          >
            {{ checkGameDisabled(gameId) ? '🔒 ' : '' }}{{ gameDict[gameId]?.name || gameId }}
          </button>
          
        </div>
      </div>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <button class="retro-btn start-btn" @click="handleStartGame" :disabled="isLoading">
      {{ isLoading ? '⏳ 載入中...' : '▶ 開始挑戰' }}
    </button>
  </div>
</template>

<style scoped>
.selector-container { width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 15px; }
.user-info { display: flex; justify-content: space-between; align-items: center; background: var(--box-bg); padding: 10px 15px; border-radius: var(--radius-element); border: var(--border-width) solid var(--border-color); font-weight: 900; }
.user-name { font-size: 1.1rem; color: var(--primary-color); }
.logout-btn { padding: 5px 15px; background: #e0e0e0; color: #333; font-size: 0.9rem; }

.unit-selector { display: flex; gap: 10px; background: var(--box-bg); padding: 15px; border-radius: var(--radius-box); border: var(--box-border-width) solid var(--border-color); box-shadow: var(--shadow-box); flex-wrap: wrap; }
.select-group { flex: 1; display: flex; flex-direction: column; min-width: 100px;}
.select-group label { font-size: 0.9rem; font-weight: 900; color: var(--text-main); margin-bottom: 5px; }
.retro-input { width: 100%; padding: 8px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background: var(--input-bg); color: var(--text-main); font-weight: bold; font-family: inherit; font-size: 1rem; transition: all 0.2s;}
.retro-input:focus { outline: none; background: var(--input-focus); }
.retro-input:disabled { opacity: 0.5; cursor: not-allowed; }

.categories-container { display: flex; flex-direction: column; gap: 15px; }
.category-section { background: var(--box-bg); padding: 15px; border-radius: var(--radius-box); border: var(--box-border-width) solid var(--border-color); box-shadow: var(--shadow-box); }
.cat-title { margin-top: 0; margin-bottom: 15px; font-size: 1.2rem; font-weight: 900; color: var(--text-main); border-bottom: 2px dashed var(--border-color); padding-bottom: 5px; }

.games-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.game-btn { background: var(--tab-bg); color: var(--text-muted); font-size: 1rem; padding: 12px 10px; font-family: inherit;}
.game-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); border-color: var(--primary-color); transform: scale(1.02); box-shadow: 0 0 10px rgba(0,0,0,0.2);}
.game-btn.full-width { grid-column: 1 / -1; }

/* 🌟 鎖定狀態樣式 */
.game-btn.is-locked { 
  opacity: 0.5; 
  filter: grayscale(100%); 
  cursor: not-allowed; 
  background-color: #e0e0e0 !important; 
  color: #757575 !important; 
  border-color: #9e9e9e !important;
  box-shadow: none !important;
  transform: none !important;
}

.start-btn { width: 100%; padding: 15px; background: var(--btn-primary-bg); color: var(--btn-primary-text); font-size: 1.3rem; font-family: inherit;}
.error-msg { background: var(--danger-bg); border: 2px dashed var(--danger-color); color: var(--danger-color); margin-top: 15px; font-weight: 900; padding: 10px; text-align: center; border-radius: var(--radius-element); }

.retro-btn { font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); cursor: pointer; transition: 0.1s; text-align: center; }
.retro-btn:active:not(:disabled) { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

/* 個別遊戲特殊顏色 (延續您的原始設計) */
.speak-btn { background: #e3f2fd; color: #1565c0; border-color: #1976d2;}
.exam-btn { background: #fff3e0; color: #e65100; border-color: #ff9800;}
.game-pinball { background: #fce4ec; color: #c2185b; border-color: #e91e63;}
.angrybirds-btn { background: #e8f5e9; color: #2e7d32; border-color: #4caf50;}
.solitaire-btn { background: #f3e5f5; color: #4527a0; border-color: #673ab7;}
.pika-btn { background: #fffde7; color: #f57f17; border-color: #fbc02d;}
.pacman-btn { background: #212121; color: #ffeb3b; border-color: #ffb300;}
.minesweeper-btn { background: #e0e0e0; color: #333; border-color: #9e9e9e;}
.sudoku-btn { background: #e1f5fe; color: #0277bd; border-color: #03a9f4;}
.tarot-btn { background: #ede7f6; color: #4527a0; border-color: #673ab7;}
.shooting-btn { background: #e8eaf6; color: #4527a0; border-color: #7e57c2;}
.picture2meaning-btn { background: #e0f7fa; color: #006064; border-color: #00acc1;}
.battle-btn { background: #ffebee; color: #b71c1c; border-color: #e53935;}
.tenchi-btn { background: #e8f5e9; color: #1b5e20; border-color: #43a047;}
.shake-btn { background: #fffde7; color: #f57f17; border-color: #fbc02d;}
.tilt-btn { background: #e0f2f1; color: #004d40; border-color: #00897b;}
.maze-btn { background: #f1f8e9; color: #33691e; border-color: #689f38;}
.magic-btn { background: #311b92; color: #b39ddb; border-color: #5e35b1;}
.sniper-btn { background: #000; color: #69f0ae; border-color: #00c853;}
.gps-btn { background: #1b5e20; color: #b9f6ca; border-color: #4caf50;}

@media (max-width: 600px) { .games-grid { grid-template-columns: 1fr; } }
</style>
