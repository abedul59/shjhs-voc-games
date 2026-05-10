<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { allThemes } from '~/utils/themes'; 

const route = useRoute(); 
const supabase = useSupabaseClient();
const sysSettings = ref(null);
const studentCookie = useCookie('currentStudent');
const studentUnlockedThemes = useState('unlockedThemes', () => []);

const currentTime = ref(new Date());
let timeInterval = null;

const themeCookie = useCookie('app-theme', { default: () => 'theme-retro', maxAge: 60 * 60 * 24 * 365 });
const showThemeInfo = ref(false);

const isControlsMinimized = ref(true); 

// ==========================================
// 🚀 核心：隱藏入口跳轉邏輯
// ==========================================
const triggerSecretDoor = () => {
  if (process.client) {
    // 塞入免密碼通行證
    localStorage.setItem('secret_bypass', 'true');
    // 瞬間傳送
    window.location.href = '/admin/law-exam';
  }
};

// 🌟 彩蛋二：鍵盤盲打 "law"
let keyBuffer = '';
const handleKeydown = (e) => {
  // 只處理單個字符的輸入
  if (e.key.length !== 1) return;
  
  keyBuffer += e.key.toLowerCase();
  
  // 保持緩衝區長度為 3
  if (keyBuffer.length > 3) {
    keyBuffer = keyBuffer.slice(-3);
  }

  // 密碼吻合
  if (keyBuffer === 'law') {
    triggerSecretDoor();
    keyBuffer = '';
  }
};

// 🌟 控制項隱藏名單
const hideControlsEntirely = computed(() => {
  const hiddenRoutes = [
    '/game-battle', '/game-tenchi', '/game-tarot21', '/game-tarotAlch', '/game-tarotUno',
    '/game-tetris', '/game-pinball', '/game-angrybirds', '/game-solitaire', '/game-pikavolley', '/game-pacman', 'game-minesweeper', '/game-tarotUno1', '/game-9x9sudoku',
  ];
  return hiddenRoutes.includes(route.path);
});

const availableThemes = computed(() => {
  if (!sysSettings.value) return [allThemes[0]]; 
  const mode = sysSettings.value.theme_mode;
  if (mode === 'always_off') return [allThemes[0]]; 
  if (mode === 'always_on') return allThemes; 
  if (mode === 'custom_favorites') {
    const favs = sysSettings.value.theme_favorites || [];
    if (favs.length === 0) return [allThemes[0]]; 
    return allThemes.filter(t => favs.includes(t.id));
  }
  if (mode === 'achievement_unlock') {
    const unlockedIds = studentUnlockedThemes.value || [];
    return allThemes.filter(t => t.id === 'theme-retro' || unlockedIds.includes(t.id));
  }
  return [allThemes[0]];
});

watch(availableThemes, (newAvailable) => {
  if (newAvailable.length > 0) {
    const isCurrentThemeValid = newAvailable.some(t => t.id === themeCookie.value);
    if (!isCurrentThemeValid) themeCookie.value = newAvailable[0].id;
  }
}, { immediate: true });

const currentThemeObj = computed(() => allThemes.find(t => t.id === themeCookie.value) || allThemes[0]);

const toggleTheme = () => {
  if (availableThemes.value.length <= 1) { alert("⚠️ 目前僅開放單一預設風格"); return; }
  const currentIdx = availableThemes.value.findIndex(t => t.id === themeCookie.value);
  const nextIdx = (currentIdx === -1 ? 0 : currentIdx + 1) % availableThemes.value.length;
  themeCookie.value = availableThemes.value[nextIdx].id;
};

const isMusicPlaying = ref(false);
let bgmAudio = null;

onMounted(async () => {
  // 🌟 註冊鍵盤監聽
  window.addEventListener('keydown', handleKeydown);

  if (studentCookie.value && (typeof studentCookie.value === 'string' || !studentCookie.value.id)) {
    studentCookie.value = null; 
    alert('系統帳號安全機制已升級，請您「重新登入」以正確同步您的遊戲紀錄！');
    window.location.href = '/'; return;
  }

  if (!bgmAudio) { bgmAudio = new Audio(); bgmAudio.loop = true; bgmAudio.volume = 0.3; }
  setAudioSource(themeCookie.value);

  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) sysSettings.value = settings;

  if (studentCookie.value && !studentCookie.value.isAnon) {
    const { data: stu } = await supabase.from('students').select('unlocked_themes').eq('student_id', studentCookie.value.id).single();
    if (stu) studentUnlockedThemes.value = stu.unlocked_themes || [];
  }
  if (!timeInterval) timeInterval = setInterval(() => { currentTime.value = new Date(); }, 60000);
});

onUnmounted(() => { 
  // 🌟 移除鍵盤監聽
  window.removeEventListener('keydown', handleKeydown);
  if (timeInterval) clearInterval(timeInterval); 
});

const isBgmAllowed = computed(() => {
  if (!sysSettings.value) return false;
  const mode = sysSettings.value.bgm_mode;
  if (mode === 'always_on') return true;
  if (mode === 'always_off') return false;
  if (mode === 'school_hours_off') {
    const day = currentTime.value.getDay();
    const daysArray = sysSettings.value.school_days || [1,2,3,4,5];
    if (!daysArray.includes(day)) return true;
    const currentStr = currentTime.value.getHours().toString().padStart(2, '0') + ':' + currentTime.value.getMinutes().toString().padStart(2, '0');
    const start = sysSettings.value.school_start_time || '07:30';
    const end = sysSettings.value.school_end_time || '16:00';
    return !(currentStr >= start && currentStr <= end);
  }
  if (mode === 'achievement_unlock') {
    if (!studentCookie.value || studentCookie.value.isAnon) return false; 
    return studentUnlockedThemes.value.includes(themeCookie.value);
  }
  return false;
});

watch([themeCookie, isBgmAllowed, () => sysSettings.value?.bgm_source], ([newTheme, allowed, bgmSource]) => {
  if (allowed) {
    setAudioSource(newTheme, bgmSource);
    if (isMusicPlaying.value && bgmAudio) bgmAudio.play().catch(e => console.log(e));
  } else {
    if (bgmAudio) bgmAudio.pause();
    isMusicPlaying.value = false;
  }
});

const setAudioSource = (themeId, bgmSource = 'github') => {
  if (!bgmAudio) return;
  const baseUrl = bgmSource === 'supabase' 
      ? 'https://arpwmnoykukawkickmiv.supabase.co/storage/v1/object/public/bgm-audio'
      : 'https://pyfbsdk59.github.io/theme_bgm';
  const newSrc = `${baseUrl}/${themeId}.mp3`;
  if (!bgmAudio.src.includes(baseUrl) || !bgmAudio.src.includes(`${themeId}.mp3`)) {
      bgmAudio.src = newSrc;
  }
};

const toggleMusic = () => {
  if (!isBgmAllowed.value || !bgmAudio) return;
  isMusicPlaying.value = !isMusicPlaying.value;
  if (isMusicPlaying.value) bgmAudio.play().catch(() => isMusicPlaying.value = false);
  else bgmAudio.pause();
};
</script>

<template>
  <div :class="themeCookie" class="app-wrapper">
    
    <template v-if="!hideControlsEntirely">
        <button v-if="isControlsMinimized" class="floating-restore-btn retro-element" @click="isControlsMinimized = false" title="展開設定選單">⚙️</button>

        <div v-else class="theme-controls immersive-expanded">
          <button class="theme-info-btn collapse-btn" @click="isControlsMinimized = true" title="隱藏選單">➡️</button>
          <button v-if="isBgmAllowed" class="theme-info-btn music-btn" @click="toggleMusic" :title="isMusicPlaying ? '關閉背景音樂' : '開啟背景音樂'">
            {{ isMusicPlaying ? '🎵' : '🔇' }}
          </button>
          <button class="theme-info-btn" @click="showThemeInfo = true" title="觀看風格說明">ℹ️</button>
          <button class="global-theme-toggle" @click="toggleTheme">{{ currentThemeObj.name }}</button>
        </div>
    </template>

    <div v-if="showThemeInfo" class="theme-info-overlay" @click.self="showThemeInfo = false">
      <div class="theme-info-box retro-element">
        <h2 class="theme-title">{{ currentThemeObj.name }}</h2>
        <div class="theme-desc"><p>{{ currentThemeObj.desc }}</p></div>
        <button class="close-info-btn" @click="showThemeInfo = false">我知道了</button>
      </div>
    </div>

    <NuxtPage />
  </div>
</template>

<style>
/* 此處保留您原本檔案中龐大的所有 CSS 主題定義 ... */
/* 僅列出結構示意，請將您原本 .theme-retro 等樣式保留於此 */
.app-wrapper { min-height: 100vh; background-color: var(--bg-color); color: var(--text-main); transition: background-color 0.5s ease; }

.floating-restore-btn {
  position: fixed; bottom: 20px; right: 20px; z-index: 9999;
  background: var(--box-bg); color: var(--text-main);
  border: var(--border-width) solid var(--border-color);
  border-radius: 50%; width: 50px; height: 50px; display: flex;
  justify-content: center; align-items: center; font-size: 1.8rem;
  cursor: pointer; box-shadow: var(--shadow-btn); opacity: 0.6; transition: all 0.3s ease;
}
.floating-restore-btn:hover { opacity: 1; transform: translateY(-2px) rotate(30deg); }

.theme-controls { position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; gap: 10px; align-items: center; }
.theme-controls.immersive-expanded {
  background: rgba(255, 255, 255, 0.75); padding: 8px 12px;
  border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); backdrop-filter: blur(4px);
}

.theme-info-btn, .global-theme-toggle {
  background: var(--box-bg); color: var(--text-main);
  border: var(--border-width) solid var(--border-color);
  border-radius: 30px; font-weight: 900; cursor: pointer;
  box-shadow: var(--shadow-btn); transition: all 0.3s ease;
  font-family: inherit; opacity: 0.85; 
}
.theme-info-btn { padding: 10px 14px; font-size: 1.2rem; border-radius: 50%; }
.global-theme-toggle { padding: 10px 18px; font-size: 1rem; }
.close-info-btn { 
  margin-top: 20px; padding: 10px 25px; background: var(--btn-primary-bg); 
  color: var(--btn-primary-text); border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-element); font-weight: 900; cursor: pointer;
}

/* --- 原有 50+ 個主題的 CSS 請繼續保留在此下方 --- */
</style>
