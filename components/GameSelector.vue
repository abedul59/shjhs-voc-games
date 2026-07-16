<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';

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

// 🌟 監聽範圍選擇變更，並即時記憶到瀏覽器的 LocalStorage 中
watch(selectedVersion, (val) => { if (typeof window !== 'undefined') localStorage.setItem('shjhs_selectedVersion', val || ''); });
watch(selectedVolume, (val) => { if (typeof window !== 'undefined') localStorage.setItem('shjhs_selectedVolume', val || ''); });
watch(selectedUnit, (val) => { if (typeof window !== 'undefined') localStorage.setItem('shjhs_selectedUnit', val || ''); });

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
  'vocshooting': { name: '🔫 單字飛鼠射擊', path: '/game-vocshooting', class: 'shooting-btn full-width' },
  'battle': { name: '⚔️ 單字方塊陣', path: '/game-battle', class: 'battle-btn full-width', pvpKey: 'enable_battle' },
  'tenchi': { name: '🐎 吞食天地', path: '/game-tenchi', class: 'tenchi-btn', pvpKey: 'enable_tenchi' },
  'tarot21': { name: '🃏 塔羅 21 點', path: '/game-tarot21', class: 'tarot-btn', pvpKey: 'enable_tarot21' },
  'tarotAlch': { name: '🔮 塔羅鍊金術', path: '/game-tarotAlch', class: 'tarot-btn', pvpKey: 'enable_tarot_alch' },
  'tarotUno': { name: '🃏 塔羅 UNO', path: '/game-tarotUno', class: 'tarot-btn', pvpKey: 'enable_tarot_uno' },
  'verbing': { name: '🌀 動詞變化大師', path: '/game-verbing', class: 'exam-btn full-width' },
  'verbingDual': { name: '⚔️ 動詞變化大師(對戰)', path: '/game-verbingDual', class: 'battle-btn full-width', pvpKey: 'enable_verbingDual' },
  // 🌟 加入全新的動詞變化遊樂園
  'verbAmuPark': { name: '🎢 動詞變化遊樂園', path: '/game-verbAmuPark', class: 'exam-btn full-width' },
};

// 🌟 將 verbAmuPark 加入不需選單元的名單
const noUnitGames = ['speakno1', 'speakno2', 'speakno3', 'KKphonetics', 'Phonics', 'examRead1', 'examRead2', 'verbing', 'verbingDual', 'verbAmuPark'];
const isNoUnitGame = computed(() => noUnitGames.includes(selectedGameType.value));

// 🌟 預設分類 (加入動詞變化遊樂園)
const defaultCategories = [
  { id: 'c1', name: '🕹️ 經典單字遊戲', games: ['match', 'move', 'choice', 'fill', 'sentence', 'listen', 'puzzle', 'cross', 'review', 'picture2meaning', 'ninja'] },
  { id: 'c2', name: '🏆 體感與趣味挑戰', games: ['shake2shuffle', 'tilt2sort', 'gravitymaze', 'swing2cast', 'ARsniper', 'GPSmap', 'vocshooting', 'noropejump'] },
  { id: 'c3', name: '👾 懷舊街機遊樂場', games: ['tetris', 'pinball', 'angrybirds', 'solitaire', 'pikavolley', 'pacman', 'minesweeper', 'sudoku'] },
  { id: 'c4', name: '⚔️ 雙人對戰與領域牌組', games: ['battle', 'tenchi', 'tarot21', 'tarotAlch', 'tarotUno', 'tarotUno1', 'tarot21solo', 'tarotAlch1'] },
  { id: 'c5', name: '🎓 考試與口說訓練', games: ['speak', 'speakno1', 'speakno2', 'speakno3', 'KKphonetics', 'Phonics', 'examListen1', 'examRead1', 'examRead2', 'gramAmuPark', 'verbing', 'verbAmuPark'] }
];

const dynamicCategories = ref([...defaultCategories]);
const pvpStatus = ref({});
const accessSettings = ref({
  disabled_games: [], locked_units: [], restrict_play_time: false, allow_play_days: [1,2,3,4,5,6,0], allow_play_start: '00:00', allow_play_end: '23:59'
});

const studentAllowedGames = ref(['ALL']);

onMounted(async () => {
  const { data: vData } = await supabase.from('vocabularies').select('version, volume, unit').limit(10000);
  if (vData) {
    const uniqueMenu = [];
    vData.forEach(item => { if (!uniqueMenu.find(u => u.version === item.version && u.volume === item.volume && u.unit === item.unit)) uniqueMenu.push(item); });
    vocabMenu.value = uniqueMenu;

    // 讀取上次記憶的範圍
    if (typeof window !== 'undefined') {
      const savedVersion = localStorage.getItem('shjhs_selectedVersion');
      const savedVolume = localStorage.getItem('shjhs_selectedVolume');
      const savedUnit = localStorage.getItem('shjhs_selectedUnit');

      if (savedVersion && uniqueMenu.some(item => item.version === savedVersion)) {
        selectedVersion.value = savedVersion;
      }
      if (savedVolume && uniqueMenu.some(item => item.version === savedVersion && item.volume === savedVolume)) {
        selectedVolume.value = savedVolume;
      }
      if (savedUnit && uniqueMenu.some(item => item.version === savedVersion && item.volume === savedVolume && item.unit === savedUnit)) {
        selectedUnit.value = savedUnit;
      }
    }
  }
  
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) {
    if (settings.disable_anon_login === true && studentCookie.value && studentCookie.value.isAnon) {
      alert('⚠️ 老師已關閉匿名登入功能！系統將強制為您登出，請使用正確的班級座號登入。');
      handleLogout();
      return; 
    }

    if (settings.game_categories && settings.game_categories.length > 0) {
      dynamicCategories.value = settings.game_categories.map((c, i) => ({
        id: c.id || `cat_${i}`,
        name: c.name || c.category_name || `分類 ${i+1}`,
        games: c.games || []
      }));
      const hasShooting = dynamicCategories.value.some(cat => cat.games.includes('vocshooting'));
      if (!hasShooting && dynamicCategories.value.length > 0) {
        dynamicCategories.value[0].games.push('vocshooting');
      }
      // 防呆：如果資料庫的分類裡沒有這兩個遊戲，自動塞進最後一個分類
      const hasVerbing = dynamicCategories.value.some(cat => cat.games.includes('verbing'));
      const hasVerbAmuPark = dynamicCategories.value.some(cat => cat.games.includes('verbAmuPark'));
      if (dynamicCategories.value.length > 0) {
        if (!hasVerbing) dynamicCategories.value[dynamicCategories.value.length - 1].games.push('verbing');
        if (!hasVerbAmuPark) dynamicCategories.value[dynamicCategories.value.length - 1].games.push('verbAmuPark');
      }
    }
    
    pvpStatus.value = {
      enable_battle: settings.enable_battle === true,
      enable_tenchi: settings.enable_tenchi === true,
      enable_tarot21: settings.enable_tarot21 === true,
      enable_tarot_alch: settings.enable_tarot_alch === true,
      enable_tarot_uno: settings.enable_tarot_uno === true,
      enable_verbingDual: settings.enable_verbingDual !== false, 
    };
    accessSettings.value = {
      disabled_games: settings.disabled_games || [],
      locked_units: settings.locked_units || [],
      restrict_play_time: settings.restrict_play_time || false,
      allow_play_days: settings.allow_play_days || [1,2,3,4,5,6,0],
      allow_play_start: settings.allow_play_start ? settings.allow_play_start.substring(0,5) : '00:00',
      allow_play_end: settings.allow_play_end ? settings.allow_play_end.substring(0,5) : '23:59'
    };
  }

  if (studentCookie.value && !studentCookie.value.isAnon) {
    const { data: stuData } = await supabase.from('students')
      .select('allowed_games')
      .eq('student_id', studentCookie.value.id) 
      .single();
      
    if (stuData && stuData.allowed_games) {
      studentAllowedGames.value = stuData.allowed_games;
    }
  }

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

const checkGameDisabled = (gameId) => {
    if (accessSettings.value.disabled_games?.includes(gameId)) return true;
    const gData = gameDict[gameId];
    if (gData && gData.pvpKey && pvpStatus.value) { if (pvpStatus.value[gData.pvpKey] === false) return true; }
    if (studentAllowedGames.value && !studentAllowedGames.value.includes('ALL')) {
        if (!studentAllowedGames.value.includes(gameId)) return true; 
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
  <div>
    <div class="logged-in-section retro-element">
      <h3>👋 歡迎回來！</h3>
      <p>
        <span v-if="studentCookie.isAnon">🕵️ {{ studentCookie.name }}</span>
        <span v-else>👤 {{ studentCookie.class }} - {{ studentCookie.name }}</span>
      </p>
      
      <div class="user-actions" style="display: flex; justify-content: center; gap: 15px; margin-top: 15px; flex-wrap: wrap;">
        <NuxtLink v-if="!studentCookie.isAnon" to="/student-grammar-stats" class="retro-btn stats-btn" style="background: #3f51b5; color: white; border-color: #1a237e; text-decoration: none;">
          📊 我的文法診斷簿
        </NuxtLink>
        <NuxtLink v-if="!studentCookie.isAnon" to="/student-verb-stats" class="retro-btn stats-btn" style="background: #e3f2fd; color: #0d47a1; border-color: #1976d2; text-decoration: none;">
          📊 動詞變化診斷簿
        </NuxtLink>
        <button class="retro-btn logout-btn" @click="handleLogout">🚪 登出帳號</button>
      </div>
    </div>

    <hr class="divider" />
    <div class="game-selection">
      <h3>🎮 選擇遊戲模式</h3>
      
      <div v-if="!isTimeAllowed" class="lock-banner">
         ⏳ 系統目前為非開放時段，無法進行遊戲喔！<br>
         <span style="font-size: 0.9rem;">(開放時間：{{ accessSettings.allow_play_start }} ~ {{ accessSettings.allow_play_end }})</span>
      </div>

      <div v-for="cat in dynamicCategories" :key="cat.id" style="margin-bottom: 25px;">
        <h4 class="cat-title">{{ cat.name }}</h4>
        <div class="game-type-tabs">
          <template v-for="gameId in cat.games" :key="gameId">
             <button v-if="gameDict[gameId]" 
                     class="type-btn" 
                     :class="[{ active: selectedGameType === gameId }, gameDict[gameId].class]" 
                     @click="selectedGameType = gameId" 
                     :disabled="checkGameDisabled(gameId)">
                {{ gameDict[gameId].name }} <span v-if="checkGameDisabled(gameId)">🔒</span>
             </button>
          </template>
        </div>
      </div>

      <div v-if="!isNoUnitGame">
        <h3 style="margin-top: 30px;">📚 選擇挑戰單元</h3>
        <div class="form-group"><select v-model="selectedVersion" @change="onVersionChange" class="retro-input"><option value="" disabled>1. 版本...</option><option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option></select></div>
        <div class="form-group"><select v-model="selectedVolume" @change="onVolumeChange" class="retro-input" :disabled="!selectedVersion"><option value="" disabled>2. 冊數...</option><option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol }}</option></select></div>
        <div class="form-group"><select v-model="selectedUnit" class="retro-input" :disabled="!selectedVolume"><option value="" disabled>3. 單元...</option><option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option></select></div>
      
        <div v-if="isUnitLocked" class="lock-banner mini">🔒 老師已鎖定此單元，請選擇其他單元進行挑戰！</div>
      </div>
    </div>

    <button class="retro-btn start-btn" @click="handleStartGame" :disabled="isLoading || !isTimeAllowed || checkGameDisabled(selectedGameType) || (!isNoUnitGame && isUnitLocked)">
      {{ isLoading ? '載入中...' : '▶ 開始挑戰' }}
    </button>
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.cat-title { width: 100%; margin: 10px 0; color: #ff9800; text-align: left; font-size: 1.1rem; border-bottom: 1px dashed #555; padding-bottom: 5px;}
.lock-banner { background: #ffebee; border: 2px dashed #f44336; color: #c62828; padding: 12px; border-radius: 8px; text-align: center; font-weight: bold; margin-bottom: 15px; font-size: 1.1rem; }
.lock-banner.mini { padding: 8px; font-size: 0.95rem; margin-top: -5px; }

.picture2meaning-btn { background: #e1f5fe; color: #0288d1; border-color: #03a9f4;}
.picture2meaning-btn.active { background: #0288d1; color: #fff; box-shadow: 0 4px 0 #01579b; border-color: #01579b; }
.exam-btn { background: #e8eaf6; color: #303f9f; border-color: #3f51b5; }
.exam-btn.active { background: #303f9f; color: #fff; box-shadow: 0 4px 0 #1a237e; border-color: #1a237e; }
.speak-btn { background: #ffebee; color: #d32f2f; border-color: #ef5350; } 
.speak-btn.active { background: #d32f2f; color: #fff; box-shadow: 0 4px 0 #b71c1c; border-color: #b71c1c; }
.minesweeper-btn { background: #e0f7fa; color: #006064; border-color: #00838f; } .minesweeper-btn.active { background: #00838f; color: #fff; box-shadow: 0 4px 0 #006064; }
.pacman-btn { background: #000; color: #ffeb3b; border-color: #1e88e5;} .pacman-btn.active { background: #1e88e5; color: #fff; box-shadow: 0 4px 0 #1565c0; border-color: #1565c0;}
.tenchi-btn { background: #e8f5e9; color: #1b5e20; border-color: #4caf50; } .tenchi-btn.active { background: #4caf50; color: #fff; box-shadow: 0 4px 0 #1b5e20; }
.angrybirds-btn { background: #ffebee; color: #c62828; border-color: #ef5350; } .angrybirds-btn.active { background: #f44336; color: #fff; box-shadow: 0 4px 0 #c62828; }
.game-pinball { background-color: #6a1b9a; color: white; border-color: #4527a0; }
.battle-btn { background: #fff3e0; color: #e65100; border-color: #ffb74d; } .battle-btn.active { background: #ff9800; color: #fff; border-color: #e65100; box-shadow: 0 4px 0 #e65100; }
.tarot-btn { background: #e8eaf6; color: #3f51b5; border-color: #7986cb; } .tarot-btn.active { background: #3f51b5; color: #fff; box-shadow: 0 4px 0 #1a237e; border-color: #1a237e; }

.logged-in-section { background: var(--success-bg); border: var(--border-width) solid var(--success-color); border-radius: var(--radius-element); padding: 20px; text-align: center; margin-bottom: 20px; color: var(--text-main); }
.logged-in-section h3 { margin-top: 0; color: var(--success-color); font-weight: 900; }
.logout-btn { background-color: var(--btn-danger-bg) !important; color: var(--text-main) !important; padding: 10px !important; font-size: 1rem !important; margin-top: 10px; width: auto !important; display: inline-block; }

.divider { border: 0; border-bottom: 2px dashed var(--border-color); opacity: 0.3; margin: 20px 0; }
.game-selection h3 { margin: 0 0 10px 0; font-weight: 900; color: var(--text-main); }
.game-type-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.type-btn { flex: 1; min-width: 45%; padding: 10px 5px; font-size: 0.95rem; font-weight: 900; background: var(--tab-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); transition: all 0.2s; }
.type-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.type-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; box-shadow: none; transform: none; border-color: #aaa !important; color: #777 !important; } 

.full-width { min-width: 100%; margin-top: 5px; }

.form-group { margin-bottom: 15px; text-align: left; }
.retro-input { width: 100%; padding: 12px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background-color: var(--input-bg); color: var(--text-main); font-size: 1rem; font-family: inherit; font-weight: bold; box-sizing: border-box; transition: all 0.3s; }
.retro-input:focus { background-color: var(--input-focus); outline: none; }
.retro-input:disabled { opacity: 0.5; cursor: not-allowed; }

.retro-btn { width: 100%; padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); font-size: 1.3rem; font-weight: 900; cursor: pointer; text-align: center; margin-top: 10px; transition: all 0.15s; font-family: inherit;}
.start-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
.retro-btn:active:not(:disabled) { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.error-msg { background: var(--danger-bg); border: 2px dashed var(--danger-color); color: var(--danger-color); margin-top: 15px; font-weight: 900; padding: 10px; text-align: center; border-radius: var(--radius-element); }

.shake-btn { background: #fffde7; color: #e65100; border-color: #ffb300; }
.shake-btn.active { background: #e65100; color: #fff; box-shadow: 0 4px 0 #bf360c; border-color: #bf360c; }
.tilt-btn { background: #e0f2f1; color: #00796b; border-color: #4db6ac; }
.tilt-btn.active { background: #00796b; color: #fff; box-shadow: 0 4px 0 #004d40; border-color: #004d40; }
.maze-btn { background: #d7ccc8; color: #4e342e; border-color: #8d6e63; }
.maze-btn.active { background: #5d4037; color: #fff; box-shadow: 0 4px 0 #3e2723; border-color: #3e2723; }
.magic-btn { background: #ede7f6; color: #4527a0; border-color: #7e57c2; }
.magic-btn.active { background: #4527a0; color: #fff; box-shadow: 0 4px 0 #311b92; border-color: #311b92; }
.sniper-btn { background: #e8f5e9; color: #1b5e20; border-color: #4caf50; }
.sniper-btn.active { background: #2e7d32; color: #fff; box-shadow: 0 4px 0 #1b5e20; border-color: #1b5e20; }
.gps-btn { background: #e8f5e9; color: #2e7d32; border-color: #4caf50; }
.gps-btn.active { background: #2e7d32; color: #fff; box-shadow: 0 4px 0 #1b5e20; border-color: #1b5e20; }
.shooting-btn { background: #e3f2fd; color: #1565c0; border-color: #1e88e5; }
.shooting-btn.active { background: #1565c0; color: #fff; box-shadow: 0 4px 0 #0d47a1; border-color: #0d47a1; }

@media (max-width: 600px) { .game-type-tabs { flex-direction: column; } .type-btn { min-width: 100%; } }
</style>
