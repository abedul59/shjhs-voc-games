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

// 🌟 更新：在這裡把雙人對戰與經典遊戲都加入隱藏名單
const hideControlsEntirely = computed(() => {
  const hiddenRoutes = [
    '/game-battle', '/game-tenchi', '/game-tarot21', '/game-tarotAlch', '/game-tarotUno', // 對戰遊戲
    '/game-tetris', '/game-pinball', '/game-angrybirds', '/game-solitaire', '/game-pikavolley', '/game-pacman', 'game-minesweeper', '/game-tarotUno1', '/game-9x9sudoku', // 經典遊戲
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

onUnmounted(() => { if (timeInterval) clearInterval(timeInterval); });

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

// 🌟 監聽主題、音樂開關，以及「資料庫中的音樂來源設定」
watch([themeCookie, isBgmAllowed, () => sysSettings.value?.bgm_source], ([newTheme, allowed, bgmSource]) => {
  if (allowed) {
    setAudioSource(newTheme, bgmSource);
    if (isMusicPlaying.value && bgmAudio) bgmAudio.play().catch(e => console.log(e));
  } else {
    if (bgmAudio) bgmAudio.pause();
    isMusicPlaying.value = false;
  }
});

// 🌟 根據後台設定，動態切換 Supabase 或 GitHub 網址
const setAudioSource = (themeId, bgmSource = 'github') => {
  if (!bgmAudio) return;
  
  const baseUrl = bgmSource === 'supabase' 
      ? 'https://arpwmnoykukawkickmiv.supabase.co/storage/v1/object/public/bgm-audio'
      : 'https://pyfbsdk59.github.io/theme_bgm'; // 新的 GitHub 網址
  
  const newSrc = `${baseUrl}/${themeId}.mp3`;
  
  // 防止重複載入同一首歌導致音樂中斷
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
/* =========================================
   🎨 全域 CSS 動態變數定義 (53種史詩級風格大滿貫)
========================================= */

/* --- 1~10 --- */
.theme-retro { --bg-color: #f4f0e6; --box-bg: #fff; --text-main: #222; --text-muted: #555; --border-color: #222; --border-width: 3px; --box-border-width: 4px; --radius-box: 12px; --radius-element: 8px; --shadow-color: #222; --shadow-box: 6px 6px 0px var(--shadow-color); --shadow-btn: 3px 3px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(3px, 3px); --btn-primary-bg: #a8e6cf; --btn-primary-text: #222; --btn-secondary-bg: #ffd3b6; --btn-secondary-text: #222; --btn-danger-bg: #ffb6b9; --tab-bg: #fafafa; --tab-active-bg: #ffe082; --tab-active-text: #222; --input-bg: #fafafa; --input-focus: #e3f6f5; --danger-bg: #ffeaea; --danger-color: #d32f2f; --success-bg: #e8f5e9; --success-color: #388e3c; --info-bg: #e3f6f5; }
.theme-gray { --bg-color: #f5f5f7; --box-bg: #ffffff; --text-main: #1d1d1f; --text-muted: #86868b; --border-color: #d2d2d7; --border-width: 1px; --box-border-width: 1px; --radius-box: 24px; --radius-element: 12px; --shadow-color: rgba(0,0,0,0.05); --shadow-box: 0 10px 40px var(--shadow-color); --shadow-btn: 0 2px 6px var(--shadow-color); --shadow-btn-active: 0 1px 2px var(--shadow-color); --transform-active: scale(0.97) translateY(2px); --btn-primary-bg: #1d1d1f; --btn-primary-text: #ffffff; --btn-secondary-bg: #f2f2f7; --btn-secondary-text: #1d1d1f; --btn-danger-bg: #f5f5f7; --tab-bg: #f2f2f7; --tab-active-bg: #1d1d1f; --tab-active-text: #ffffff; --input-bg: #f5f5f7; --input-focus: #ffffff; --danger-bg: #fff0f0; --danger-color: #ff3b30; --success-bg: #f0fdf4; --success-color: #34c759; --info-bg: #f5f5f7; }
.theme-disney { --bg-color: #fff9fc; --box-bg: #ffffff; --text-main: #5c415d; --text-muted: #a69cac; --border-color: #ffc2e0; --border-width: 2px; --box-border-width: 2px; --radius-box: 30px; --radius-element: 15px; --shadow-color: rgba(255, 182, 193, 0.3); --shadow-box: 0 15px 30px var(--shadow-color); --shadow-btn: 0 5px 10px var(--shadow-color); --shadow-btn-active: 0 2px 5px var(--shadow-color); --transform-active: translateY(2px) scale(0.98); --btn-primary-bg: #a0e7e5; --btn-primary-text: #222; --btn-secondary-bg: #ffe4e1; --btn-secondary-text: #5c415d; --btn-danger-bg: #f5f5f7; --tab-bg: #f5f5f7; --tab-active-bg: #ffc2e0; --tab-active-text: #5c415d; --input-bg: #fff0f5; --input-focus: #ffffff; --danger-bg: #fff0f0; --danger-color: #ff6b6b; --success-bg: #e0f9f1; --success-color: #2ec4b6; --info-bg: #e6f7ff; }
.theme-african { --bg-color: #e6dcc8; --box-bg: #3e2723; --text-main: #f5f5f7; --text-muted: #bcaaa4; --border-color: #212121; --border-width: 2px; --box-border-width: 3px; --radius-box: 4px; --radius-element: 2px; --shadow-color: rgba(0,0,0,0.5); --shadow-box: 10px 10px 0px var(--shadow-color); --shadow-btn: 4px 4px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(4px, 4px); --btn-primary-bg: #bf360c; --btn-primary-text: #fff; --btn-secondary-bg: #a1887f; --btn-secondary-text: #3e2723; --btn-danger-bg: #ddd; --tab-bg: #5d4037; --tab-active-bg: #e65100; --tab-active-text: #fff; --input-bg: #fff; --input-focus: #ffe0b2; --danger-bg: #ffcdd2; --danger-color: #b71c1c; --success-bg: #c8e6c9; --success-color: #1b5e20; --info-bg: #e0f7fa; }
.theme-mediterranean { --bg-color: #ffffff; --box-bg: #f0f8ff; --text-main: #004d99; --text-muted: #66a3ff; --border-color: #0077ee; --border-width: 1px; --box-border-width: 2px; --radius-box: 15px; --radius-element: 8px; --shadow-color: rgba(0, 77, 153, 0.1); --shadow-box: 0 10px 25px var(--shadow-color); --shadow-btn: 0 4px 6px var(--shadow-color); --shadow-btn-active: 0 1px 3px var(--shadow-color); --transform-active: scale(0.98); --btn-primary-bg: #0077ee; --btn-primary-text: #fff; --btn-secondary-bg: #fff; --btn-secondary-text: #004d99; --btn-danger-bg: #ddd; --tab-bg: #e6f3ff; --tab-active-bg: #0077ee; --tab-active-text: #fff; --input-bg: #fff; --input-focus: #f0f8ff; --danger-bg: #fff0f0; --danger-color: #ff3b30; --success-bg: #e0f9f1; --success-color: #2ec4b6; --info-bg: #e0f7fa; }
.theme-fallout { --bg-color: #0c0d0c; --box-bg: #141614; --text-main: #1aff1a; --text-muted: #008000; --border-color: #1aff1a; --border-width: 1px; --box-border-width: 1px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(26, 255, 26, 0.4); --shadow-box: 0 0 15px var(--shadow-color), inset 0 0 10px rgba(0,0,0,0.5); --shadow-btn: 0 0 5px var(--shadow-color); --shadow-btn-active: 0 0 15px var(--text-main); --transform-active: translateY(1px); --btn-primary-bg: #141614; --btn-primary-text: #1aff1a; --btn-secondary-bg: #000; --btn-secondary-text: #1aff1a; --btn-danger-bg: #141614; --tab-bg: #000; --tab-active-bg: #1aff1a; --tab-active-text: #000; --input-bg: #000; --input-focus: #0c0d0c; --danger-bg: #000; --danger-color: #ff1a1a; --success-bg: #000; --success-color: #1aff1a; --info-bg: #000; }
.theme-cyberpunk { --bg-color: #07070a; --box-bg: #12121a; --text-main: #00ffff; --text-muted: #8c8cba; --border-color: #ff00ff; --border-width: 2px; --box-border-width: 2px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(255, 0, 255, 0.5); --shadow-box: 0 0 20px var(--shadow-color), inset 0 0 10px rgba(0, 255, 255, 0.1); --shadow-btn: 4px 4px 0px rgba(0, 255, 255, 0.7); --shadow-btn-active: 0px 0px 10px #00ffff; --transform-active: translate(2px, 2px); --btn-primary-bg: #fcee0a; --btn-primary-text: #07070a; --btn-secondary-bg: #00ffff; --btn-secondary-text: #07070a; --btn-danger-bg: #12121a; --tab-bg: #07070a; --tab-active-bg: #ff00ff; --tab-active-text: #fff; --input-bg: #000; --input-focus: #1a1a24; --danger-bg: #2a0000; --danger-color: #ff003c; --success-bg: #002a11; --success-color: #00ff66; --info-bg: #001a2a; }
.theme-detective { --bg-color: #1e1e1e; --box-bg: #2c2c2c; --text-main: #d4c4b7; --text-muted: #877f76; --border-color: #5e503f; --border-width: 2px; --box-border-width: 3px; --radius-box: 4px; --radius-element: 2px; --shadow-color: rgba(0, 0, 0, 0.8); --shadow-box: 8px 8px 0px var(--shadow-color); --shadow-btn: 3px 3px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(3px, 3px); --btn-primary-bg: #5e503f; --btn-primary-text: #d4c4b7; --btn-secondary-bg: #3a3a3a; --btn-secondary-text: #d4c4b7; --btn-danger-bg: #1e1e1e; --tab-bg: #1e1e1e; --tab-active-bg: #8c765d; --tab-active-text: #1e1e1e; --input-bg: #222; --input-focus: #333; --danger-bg: #3a1a1a; --danger-color: #c96464; --success-bg: #1a2a1a; --success-color: #64c975; --info-bg: #2a2a2a; }
.theme-provence { --bg-color: #f6f3fa; --box-bg: #ffffff; --text-main: #4a3b52; --text-muted: #9b8a9c; --border-color: #d1b3e8; --border-width: 2px; --box-border-width: 2px; --radius-box: 20px; --radius-element: 10px; --shadow-color: rgba(155, 110, 200, 0.15); --shadow-box: 0 10px 30px var(--shadow-color); --shadow-btn: 0 4px 10px var(--shadow-color); --shadow-btn-active: 0 2px 4px var(--shadow-color); --transform-active: scale(0.97); --btn-primary-bg: #b388eb; --btn-primary-text: #ffffff; --btn-secondary-bg: #e8dff5; --btn-secondary-text: #4a3b52; --btn-danger-bg: #fff; --tab-bg: #fcfaff; --tab-active-bg: #d1b3e8; --tab-active-text: #ffffff; --input-bg: #fcfaff; --input-focus: #ffffff; --danger-bg: #fff0f5; --danger-color: #d9668d; --success-bg: #f0f9f5; --success-color: #57b894; --info-bg: #f4f0fa; }
.theme-twilight { --bg-color: #1a2226; --box-bg: #252f34; --text-main: #e1e8eb; --text-muted: #7c8e96; --border-color: #3b4e57; --border-width: 1px; --box-border-width: 1px; --radius-box: 8px; --radius-element: 4px; --shadow-color: rgba(0, 0, 0, 0.6); --shadow-box: 0 8px 24px var(--shadow-color); --shadow-btn: 0 2px 5px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(1px); --btn-primary-bg: #5a1917; --btn-primary-text: #e1e8eb; --btn-secondary-bg: #324147; --btn-secondary-text: #e1e8eb; --btn-danger-bg: #1a2226; --tab-bg: #1a2226; --tab-active-bg: #5a1917; --tab-active-text: #e1e8eb; --input-bg: #1f282c; --input-focus: #252f34; --danger-bg: #301313; --danger-color: #d65c5a; --success-bg: #162920; --success-color: #6eb58f; --info-bg: #212c30; }

/* --- 11~20 --- */
.theme-jjk { --bg-color: #0d0d0d; --box-bg: #16161b; --text-main: #ffffff; --text-muted: #888899; --border-color: #990000; --border-width: 2px; --box-border-width: 3px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(153, 0, 0, 0.4); --shadow-box: -8px 8px 0px rgba(75, 0, 130, 0.5), 8px -8px 0px rgba(153, 0, 0, 0.5); --shadow-btn: 4px 4px 0px var(--border-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(4px, 4px); --btn-primary-bg: #4b0082; --btn-primary-text: #ffffff; --btn-secondary-bg: #990000; --btn-secondary-text: #ffffff; --btn-danger-bg: #0d0d0d; --tab-bg: #000; --tab-active-bg: #ffffff; --tab-active-text: #000; --input-bg: #0a0a0d; --input-focus: #16161b; --danger-bg: #220000; --danger-color: #ff3333; --success-bg: #002211; --success-color: #33ff77; --info-bg: #110022; }
.theme-demonslayer { --bg-color: #151a16; --box-bg: #222924; --text-main: #e8e8e3; --text-muted: #8c9e92; --border-color: #2d8659; --border-width: 3px; --box-border-width: 4px; --radius-box: 6px; --radius-element: 4px; --shadow-color: #000; --shadow-box: 6px 6px 0px var(--border-color); --shadow-btn: 3px 3px 0px var(--border-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(3px, 3px); --btn-primary-bg: #2d8659; --btn-primary-text: #fff; --btn-secondary-bg: #111; --btn-secondary-text: #2d8659; --btn-danger-bg: #222924; --tab-bg: #111; --tab-active-bg: #9b2226; --tab-active-text: #fff; --input-bg: #111; --input-focus: #1c241e; --danger-bg: #3a1516; --danger-color: #ff5c60; --success-bg: #153a22; --success-color: #5cff9a; --info-bg: #1a1a24; }
.theme-chanel { --bg-color: #f8f8f8; --box-bg: #ffffff; --text-main: #000000; --text-muted: #888888; --border-color: #000000; --border-width: 2px; --box-border-width: 2px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(0, 0, 0, 0.1); --shadow-box: 0 10px 30px var(--shadow-color); --shadow-btn: 2px 2px 0px #d4af37; --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(2px, 2px); --btn-primary-bg: #000000; --btn-primary-text: #ffffff; --btn-secondary-bg: #ffffff; --btn-secondary-text: #000000; --btn-danger-bg: #f8f8f8; --tab-bg: #ffffff; --tab-active-bg: #000000; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #fafafa; --danger-bg: #fff0f0; --danger-color: #990000; --success-bg: #f9fff9; --success-color: #006600; --info-bg: #fcfcfc; }
.theme-aurora { --bg-color: #050a1f; --box-bg: #0b1638; --text-main: #39ff14; --text-muted: #00b3ff; --border-color: #b200ff; --border-width: 1px; --box-border-width: 1px; --radius-box: 16px; --radius-element: 8px; --shadow-color: rgba(57, 255, 20, 0.3); --shadow-box: 0 0 25px rgba(178, 0, 255, 0.2); --shadow-btn: 0 0 10px var(--shadow-color); --shadow-btn-active: 0 0 20px var(--text-main); --transform-active: scale(0.96); --btn-primary-bg: #b200ff; --btn-primary-text: #ffffff; --btn-secondary-bg: #050a1f; --btn-secondary-text: #39ff14; --btn-danger-bg: #0b1638; --tab-bg: #050a1f; --tab-active-bg: #39ff14; --tab-active-text: #050a1f; --input-bg: #0b1638; --input-focus: #050a1f; --danger-bg: #1a001a; --danger-color: #ff0055; --success-bg: #001a0d; --success-color: #39ff14; --info-bg: #0a0a2a; }
.theme-instagram { --bg-color: #fafafa; --box-bg: #ffffff; --text-main: #262626; --text-muted: #8e8e8e; --border-color: #dbdbdb; --border-width: 1px; --box-border-width: 1px; --radius-box: 20px; --radius-element: 10px; --shadow-color: rgba(0, 0, 0, 0.05); --shadow-box: 0 4px 12px var(--shadow-color); --shadow-btn: 0 2px 4px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.98); --btn-primary-bg: #e1306c; --btn-primary-text: #ffffff; --btn-secondary-bg: #ffffff; --btn-secondary-text: #0095f6; --btn-danger-bg: #fafafa; --tab-bg: #fafafa; --tab-active-bg: #262626; --tab-active-text: #ffffff; --input-bg: #fafafa; --input-focus: #ffffff; --danger-bg: #fff0f0; --danger-color: #ed4956; --success-bg: #f0fdf4; --success-color: #34a853; --info-bg: #fafafa; }
.theme-egypt { --bg-color: #e1c699; --box-bg: #c9a66b; --text-main: #3e2723; --text-muted: #5d4037; --border-color: #8d6e63; --border-width: 2px; --box-border-width: 4px; --radius-box: 2px; --radius-element: 0px; --shadow-color: rgba(62, 39, 35, 0.4); --shadow-box: 8px 8px 0px var(--shadow-color); --shadow-btn: 4px 4px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(4px, 4px); --btn-primary-bg: #1565c0; --btn-primary-text: #ffffff; --btn-secondary-bg: #e1c699; --btn-secondary-text: #3e2723; --btn-danger-bg: #c9a66b; --tab-bg: #bcaaa4; --tab-active-bg: #3e2723; --tab-active-text: #e1c699; --input-bg: #e1c699; --input-focus: #fff8e1; --danger-bg: #d7ccc8; --danger-color: #b71c1c; --success-bg: #c8e6c9; --success-color: #1b5e20; --info-bg: #d7ccc8; }
.theme-istanbul { --bg-color: #e0f2f1; --box-bg: #ffffff; --text-main: #006064; --text-muted: #00838f; --border-color: #c62828; --border-width: 2px; --box-border-width: 3px; --radius-box: 16px; --radius-element: 8px; --shadow-color: rgba(0, 96, 100, 0.2); --shadow-box: 0 8px 20px var(--shadow-color); --shadow-btn: 0 4px 8px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.97); --btn-primary-bg: #c62828; --btn-primary-text: #ffffff; --btn-secondary-bg: #00838f; --btn-secondary-text: #ffffff; --btn-danger-bg: #e0f2f1; --tab-bg: #b2ebf2; --tab-active-bg: #006064; --tab-active-text: #ffffff; --input-bg: #f9fbe7; --input-focus: #ffffff; --danger-bg: #ffcdd2; --danger-color: #b71c1c; --success-bg: #e8f5e9; --success-color: #2e7d32; --info-bg: #e0f2f1; }
.theme-hepburn { --bg-color: #81D8D0; --box-bg: #ffffff; --text-main: #222222; --text-muted: #777777; --border-color: #222222; --border-width: 2px; --box-border-width: 2px; --radius-box: 20px; --radius-element: 10px; --shadow-color: rgba(0, 0, 0, 0.15); --shadow-box: 0 10px 25px var(--shadow-color); --shadow-btn: 4px 4px 0px var(--border-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(4px, 4px); --btn-primary-bg: #222222; --btn-primary-text: #ffffff; --btn-secondary-bg: #ffffff; --btn-secondary-text: #222222; --btn-danger-bg: #81D8D0; --tab-bg: #f4f4f4; --tab-active-bg: #81D8D0; --tab-active-text: #222222; --input-bg: #fafafa; --input-focus: #ffffff; --danger-bg: #ffeaea; --danger-color: #d32f2f; --success-bg: #e8f5e9; --success-color: #388e3c; --info-bg: #e3f6f5; }
.theme-gatsby { --bg-color: #111111; --box-bg: #222222; --text-main: #f9d77e; --text-muted: #a68c53; --border-color: #f9d77e; --border-width: 2px; --box-border-width: 3px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(249, 215, 126, 0.2); --shadow-box: 0 0 30px var(--shadow-color); --shadow-btn: 4px 4px 0px var(--border-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(4px, 4px); --btn-primary-bg: #f9d77e; --btn-primary-text: #111111; --btn-secondary-bg: #111111; --btn-secondary-text: #f9d77e; --btn-danger-bg: #222222; --tab-bg: #111111; --tab-active-bg: #f9d77e; --tab-active-text: #111111; --input-bg: #111111; --input-focus: #222222; --danger-bg: #331111; --danger-color: #ff4444; --success-bg: #113311; --success-color: #44ff44; --info-bg: #222222; }
.theme-south { --bg-color: #d8e4e8; --box-bg: #fdfaf6; --text-main: #4a3b32; --text-muted: #8b7d73; --border-color: #6d4c41; --border-width: 1px; --box-border-width: 2px; --radius-box: 8px; --radius-element: 4px; --shadow-color: rgba(74, 59, 50, 0.15); --shadow-box: 0 8px 20px var(--shadow-color); --shadow-btn: 0 4px 6px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.97); --btn-primary-bg: #6d4c41; --btn-primary-text: #ffffff; --btn-secondary-bg: #fdfaf6; --btn-secondary-text: #4a3b32; --btn-danger-bg: #d8e4e8; --tab-bg: #f4eee8; --tab-active-bg: #8b5a2b; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #fdfaf6; --danger-bg: #fbe9e7; --danger-color: #d84315; --success-bg: #e8f5e9; --success-color: #2e7d32; --info-bg: #efebe9; }

/* --- 21~30 --- */
.theme-harrypotter { --bg-color: #f4ecd8; --box-bg: #2d191c; --text-main: #eebb4d; --text-muted: #b5a485; --border-color: #eebb4d; --border-width: 2px; --box-border-width: 3px; --radius-box: 8px; --radius-element: 4px; --shadow-color: rgba(0,0,0,0.5); --shadow-box: 5px 5px 15px var(--shadow-color); --shadow-btn: 2px 2px 5px var(--shadow-color); --shadow-btn-active: inset 1px 1px 3px var(--shadow-color); --transform-active: translate(2px, 2px); --btn-primary-bg: #eebb4d; --btn-primary-text: #2d191c; --btn-secondary-bg: #42292c; --btn-secondary-text: #eebb4d; --btn-danger-bg: #f4ecd8; --tab-bg: #1c0e10; --tab-active-bg: #eebb4d; --tab-active-text: #2d191c; --input-bg: #f4ecd8; --input-focus: #ffffff; --danger-bg: #3a1515; --danger-color: #ff5555; --success-bg: #153a1e; --success-color: #55ff77; --info-bg: #2d191c; }
.theme-xmen { --bg-color: #1a2233; --box-bg: #111522; --text-main: #ffcc00; --text-muted: #7faaff; --border-color: #ffcc00; --border-width: 2px; --box-border-width: 3px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(255, 204, 0, 0.3); --shadow-box: 0 0 20px var(--shadow-color); --shadow-btn: 3px 3px 0px var(--border-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(3px, 3px); --btn-primary-bg: #ffcc00; --btn-primary-text: #111522; --btn-secondary-bg: #21304d; --btn-secondary-text: #ffcc00; --btn-danger-bg: #1a2233; --tab-bg: #111522; --tab-active-bg: #ffcc00; --tab-active-text: #111522; --input-bg: #0d111a; --input-focus: #1a2233; --danger-bg: #331111; --danger-color: #ff4444; --success-bg: #113311; --success-color: #44ff44; --info-bg: #21304d; }
.theme-minecraft { --bg-color: #5b8731; --box-bg: #8b8b8b; --text-main: #ffffff; --text-muted: #dcdcdc; --border-color: #383838; --border-width: 4px; --box-border-width: 6px; --radius-box: 0px; --radius-element: 0px; --shadow-color: #1c1c1c; --shadow-box: inset -4px -4px 0px var(--shadow-color), inset 4px 4px 0px #bdbdbd; --shadow-btn: inset -3px -3px 0px var(--shadow-color), inset 3px 3px 0px #bdbdbd; --shadow-btn-active: inset 3px 3px 0px var(--shadow-color); --transform-active: translate(2px, 2px); --btn-primary-bg: #74a12e; --btn-primary-text: #ffffff; --btn-secondary-bg: #8b8b8b; --btn-secondary-text: #ffffff; --btn-danger-bg: #5b8731; --tab-bg: #5c5c5c; --tab-active-bg: #74a12e; --tab-active-text: #ffffff; --input-bg: #383838; --input-focus: #1c1c1c; --danger-bg: #b33939; --danger-color: #ffcccc; --success-bg: #39b339; --success-color: #ccffcc; --info-bg: #5c5c5c; }
.theme-matrix { --bg-color: #000000; --box-bg: #001100; --text-main: #00ff00; --text-muted: #008800; --border-color: #00ff00; --border-width: 1px; --box-border-width: 2px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(0, 255, 0, 0.4); --shadow-box: 0 0 15px var(--shadow-color); --shadow-btn: 0 0 5px var(--shadow-color); --shadow-btn-active: 0 0 10px #00ff00; --transform-active: scale(0.98); --btn-primary-bg: #003300; --btn-primary-text: #00ff00; --btn-secondary-bg: #001100; --btn-secondary-text: #00ff00; --btn-danger-bg: #000000; --tab-bg: #000000; --tab-active-bg: #00ff00; --tab-active-text: #000000; --input-bg: #000000; --input-focus: #001100; --danger-bg: #220000; --danger-color: #ff0000; --success-bg: #002200; --success-color: #00ff00; --info-bg: #001100; }
.theme-dracula { --bg-color: #282a36; --box-bg: #44475a; --text-main: #f8f8f2; --text-muted: #6272a4; --border-color: #bd93f9; --border-width: 2px; --box-border-width: 2px; --radius-box: 10px; --radius-element: 6px; --shadow-color: rgba(0, 0, 0, 0.5); --shadow-box: 0 8px 16px var(--shadow-color); --shadow-btn: 0 4px 6px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(2px); --btn-primary-bg: #ff79c6; --btn-primary-text: #282a36; --btn-secondary-bg: #6272a4; --btn-secondary-text: #f8f8f2; --btn-danger-bg: #282a36; --tab-bg: #282a36; --tab-active-bg: #ff79c6; --tab-active-text: #282a36; --input-bg: #282a36; --input-focus: #44475a; --danger-bg: #ff5555; --danger-color: #f8f8f2; --success-bg: #50fa7b; --success-color: #282a36; --info-bg: #8be9fd; }
.theme-synthwave { --bg-color: #2b213a; --box-bg: #241b2f; --text-main: #f92aad; --text-muted: #8d8b92; --border-color: #36f9f6; --border-width: 2px; --box-border-width: 3px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(54, 249, 246, 0.5); --shadow-box: 0 0 20px var(--shadow-color), inset 0 0 10px rgba(249, 42, 173, 0.2); --shadow-btn: 0 0 10px rgba(249, 42, 173, 0.6); --shadow-btn-active: 0 0 15px #f92aad; --transform-active: translate(2px, 2px); --btn-primary-bg: #36f9f6; --btn-primary-text: #241b2f; --btn-secondary-bg: #f92aad; --btn-secondary-text: #241b2f; --btn-danger-bg: #2b213a; --tab-bg: #241b2f; --tab-active-bg: #f92aad; --tab-active-text: #241b2f; --input-bg: #2b213a; --input-focus: #241b2f; --danger-bg: #3a1520; --danger-color: #ff3366; --success-bg: #153a2a; --success-color: #33ff99; --info-bg: #241b2f; }
.theme-tokyonight { --bg-color: #1a1b26; --box-bg: #24283b; --text-main: #c0caf5; --text-muted: #565f89; --border-color: #7aa2f7; --border-width: 2px; --box-border-width: 2px; --radius-box: 12px; --radius-element: 8px; --shadow-color: rgba(0, 0, 0, 0.4); --shadow-box: 0 10px 20px var(--shadow-color); --shadow-btn: 0 4px 8px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.98); --btn-primary-bg: #7aa2f7; --btn-primary-text: #1a1b26; --btn-secondary-bg: #414868; --btn-secondary-text: #c0caf5; --btn-danger-bg: #1a1b26; --tab-bg: #1a1b26; --tab-active-bg: #7aa2f7; --tab-active-text: #1a1b26; --input-bg: #1a1b26; --input-focus: #24283b; --danger-bg: #f7768e; --danger-color: #1a1b26; --success-bg: #9ece6a; --success-color: #1a1b26; --info-bg: #7dcfff; }
.theme-catppuccin { --bg-color: #1e1e2e; --box-bg: #313244; --text-main: #cdd6f4; --text-muted: #a6adc8; --border-color: #cba6f7; --border-width: 2px; --box-border-width: 2px; --radius-box: 16px; --radius-element: 10px; --shadow-color: rgba(0, 0, 0, 0.3); --shadow-box: 0 8px 24px var(--shadow-color); --shadow-btn: 0 4px 6px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(2px); --btn-primary-bg: #cba6f7; --btn-primary-text: #1e1e2e; --btn-secondary-bg: #45475a; --btn-secondary-text: #cdd6f4; --btn-danger-bg: #1e1e2e; --tab-bg: #1e1e2e; --tab-active-bg: #cba6f7; --tab-active-text: #1e1e2e; --input-bg: #1e1e2e; --input-focus: #313244; --danger-bg: #f38ba8; --danger-color: #1e1e2e; --success-bg: #a6e3a1; --success-color: #1e1e2e; --info-bg: #89b4fa; }
.theme-nord { --bg-color: #2e3440; --box-bg: #3b4252; --text-main: #eceff4; --text-muted: #d8dee9; --border-color: #88c0d0; --border-width: 2px; --box-border-width: 2px; --radius-box: 8px; --radius-element: 4px; --shadow-color: rgba(0, 0, 0, 0.2); --shadow-box: 0 6px 12px var(--shadow-color); --shadow-btn: 0 2px 4px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(1px); --btn-primary-bg: #81a1c1; --btn-primary-text: #2e3440; --btn-secondary-bg: #434c5e; --btn-secondary-text: #eceff4; --btn-danger-bg: #2e3440; --tab-bg: #2e3440; --tab-active-bg: #88c0d0; --tab-active-text: #2e3440; --input-bg: #2e3440; --input-focus: #3b4252; --danger-bg: #bf616a; --danger-color: #eceff4; --success-bg: #a3be8c; --success-color: #2e3440; --info-bg: #ebcb8b; }
.theme-solarized { --bg-color: #002b36; --box-bg: #073642; --text-main: #839496; --text-muted: #586e75; --border-color: #2aa198; --border-width: 2px; --box-border-width: 2px; --radius-box: 12px; --radius-element: 6px; --shadow-color: rgba(0, 0, 0, 0.4); --shadow-box: 0 8px 16px var(--shadow-color); --shadow-btn: 0 3px 6px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.98); --btn-primary-bg: #b58900; --btn-primary-text: #002b36; --btn-secondary-bg: #002b36; --btn-secondary-text: #2aa198; --btn-danger-bg: #073642; --tab-bg: #002b36; --tab-active-bg: #2aa198; --tab-active-text: #002b36; --input-bg: #002b36; --input-focus: #073642; --danger-bg: #dc322f; --danger-color: #fdf6e3; --success-bg: #859900; --success-color: #002b36; --info-bg: #268bd2; }

/* --- 31~40 --- */
.theme-gruvbox { --bg-color: #282828; --box-bg: #3c3836; --text-main: #ebdbb2; --text-muted: #a89984; --border-color: #d79921; --border-width: 2px; --box-border-width: 2px; --radius-box: 8px; --radius-element: 4px; --shadow-color: rgba(0, 0, 0, 0.3); --shadow-box: 0 6px 12px var(--shadow-color); --shadow-btn: 0 2px 4px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(2px); --btn-primary-bg: #d79921; --btn-primary-text: #282828; --btn-secondary-bg: #504945; --btn-secondary-text: #ebdbb2; --btn-danger-bg: #282828; --tab-bg: #282828; --tab-active-bg: #d79921; --tab-active-text: #282828; --input-bg: #282828; --input-focus: #3c3836; --danger-bg: #cc241d; --danger-color: #ebdbb2; --success-bg: #98971a; --success-color: #282828; --info-bg: #458588; }
.theme-monokai { --bg-color: #fdf6e3; --box-bg: #eee8d5; --text-main: #657b83; --text-muted: #93a1a1; --border-color: #268bd2; --border-width: 2px; --box-border-width: 2px; --radius-box: 10px; --radius-element: 5px; --shadow-color: rgba(0, 0, 0, 0.1); --shadow-box: 0 4px 8px var(--shadow-color); --shadow-btn: 0 2px 4px var(--shadow-color); --shadow-btn-active: inset 0 1px 2px var(--shadow-color); --transform-active: scale(0.98); --btn-primary-bg: #2aa198; --btn-primary-text: #fdf6e3; --btn-secondary-bg: #fdf6e3; --btn-secondary-text: #268bd2; --btn-danger-bg: #eee8d5; --tab-bg: #fdf6e3; --tab-active-bg: #268bd2; --tab-active-text: #fdf6e3; --input-bg: #fdf6e3; --input-focus: #eee8d5; --danger-bg: #dc322f; --danger-color: #fdf6e3; --success-bg: #859900; --success-color: #fdf6e3; --info-bg: #b58900; }
.theme-github { --bg-color: #0d1117; --box-bg: #161b22; --text-main: #c9d1d9; --text-muted: #8b949e; --border-color: #30363d; --border-width: 1px; --box-border-width: 1px; --radius-box: 6px; --radius-element: 6px; --shadow-color: rgba(0, 0, 0, 0.4); --shadow-box: 0 8px 24px var(--shadow-color); --shadow-btn: 0 1px 3px var(--shadow-color); --shadow-btn-active: inset 0 1px 2px var(--shadow-color); --transform-active: translateY(1px); --btn-primary-bg: #238636; --btn-primary-text: #ffffff; --btn-secondary-bg: #21262d; --btn-secondary-text: #c9d1d9; --btn-danger-bg: #0d1117; --tab-bg: #0d1117; --tab-active-bg: #1f6feb; --tab-active-text: #ffffff; --input-bg: #0d1117; --input-focus: #161b22; --danger-bg: #da3633; --danger-color: #ffffff; --success-bg: #238636; --success-color: #ffffff; --info-bg: #1f6feb; }
.theme-mario { --bg-color: #5c94fc; --box-bg: #e84a2b; --text-main: #ffffff; --text-muted: #ffcccc; --border-color: #000000; --border-width: 4px; --box-border-width: 4px; --radius-box: 8px; --radius-element: 4px; --shadow-color: rgba(0, 0, 0, 0.5); --shadow-box: 6px 6px 0px var(--shadow-color); --shadow-btn: 3px 3px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(3px, 3px); --btn-primary-bg: #fbd000; --btn-primary-text: #000000; --btn-secondary-bg: #ffffff; --btn-secondary-text: #000000; --btn-danger-bg: #5c94fc; --tab-bg: #000000; --tab-active-bg: #e84a2b; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #fbd000; --danger-bg: #8b0000; --danger-color: #ffffff; --success-bg: #00aa00; --success-color: #ffffff; --info-bg: #0000aa; }
.theme-zelda { --bg-color: #1a361f; --box-bg: #2a5230; --text-main: #e8d08b; --text-muted: #a69865; --border-color: #e8d08b; --border-width: 2px; --box-border-width: 3px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(0, 0, 0, 0.6); --shadow-box: 0 4px 15px var(--shadow-color); --shadow-btn: 0 2px 5px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.95); --btn-primary-bg: #e8d08b; --btn-primary-text: #1a361f; --btn-secondary-bg: #1a361f; --btn-secondary-text: #e8d08b; --btn-danger-bg: #2a5230; --tab-bg: #1a361f; --tab-active-bg: #e8d08b; --tab-active-text: #1a361f; --input-bg: #1a361f; --input-focus: #2a5230; --danger-bg: #801a1a; --danger-color: #e8d08b; --success-bg: #1a8036; --success-color: #e8d08b; --info-bg: #1a3680; }
.theme-pokemon { --bg-color: #ffde00; --box-bg: #3b4cca; --text-main: #ffffff; --text-muted: #ccccff; --border-color: #cc0000; --border-width: 4px; --box-border-width: 4px; --radius-box: 20px; --radius-element: 10px; --shadow-color: rgba(0, 0, 0, 0.3); --shadow-box: 4px 4px 10px var(--shadow-color); --shadow-btn: 2px 2px 5px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(2px, 2px); --btn-primary-bg: #cc0000; --btn-primary-text: #ffffff; --btn-secondary-bg: #ffffff; --btn-secondary-text: #3b4cca; --btn-danger-bg: #ffde00; --tab-bg: #ffde00; --tab-active-bg: #cc0000; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #ffde00; --danger-bg: #cc0000; --danger-color: #ffffff; --success-bg: #4caf50; --success-color: #ffffff; --info-bg: #ffde00; }
.theme-kirby { --bg-color: #ffb3d9; --box-bg: #ffffff; --text-main: #d81b60; --text-muted: #ff66a3; --border-color: #d81b60; --border-width: 3px; --box-border-width: 3px; --radius-box: 30px; --radius-element: 15px; --shadow-color: rgba(216, 27, 96, 0.2); --shadow-box: 0 8px 20px var(--shadow-color); --shadow-btn: 0 4px 10px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.97); --btn-primary-bg: #d81b60; --btn-primary-text: #ffffff; --btn-secondary-bg: #ffe6f0; --btn-secondary-text: #d81b60; --btn-danger-bg: #ffb3d9; --tab-bg: #ffe6f0; --tab-active-bg: #d81b60; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #ffe6f0; --danger-bg: #ff3333; --danger-color: #ffffff; --success-bg: #33cc33; --success-color: #ffffff; --info-bg: #3399ff; }
.theme-animalcrossing { --bg-color: #e0f7fa; --box-bg: #ffffff; --text-main: #5d4037; --text-muted: #8d6e63; --border-color: #8bc34a; --border-width: 2px; --box-border-width: 3px; --radius-box: 24px; --radius-element: 12px; --shadow-color: rgba(139, 195, 74, 0.3); --shadow-box: 0 10px 25px var(--shadow-color); --shadow-btn: 0 4px 8px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(2px); --btn-primary-bg: #8bc34a; --btn-primary-text: #ffffff; --btn-secondary-bg: #f1f8e9; --btn-secondary-text: #5d4037; --btn-danger-bg: #e0f7fa; --tab-bg: #f1f8e9; --tab-active-bg: #8bc34a; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #f1f8e9; --danger-bg: #ffcdd2; --danger-color: #b71c1c; --success-bg: #c8e6c9; --success-color: #1b5e20; --info-bg: #b3e5fc; }
.theme-splatoon { --bg-color: #111111; --box-bg: #222222; --text-main: #ff00ff; --text-muted: #880088; --border-color: #00ffff; --border-width: 3px; --box-border-width: 4px; --radius-box: 10px; --radius-element: 5px; --shadow-color: #ff00ff; --shadow-box: -4px 4px 0px var(--shadow-color), 4px -4px 0px #00ffff; --shadow-btn: 2px 2px 0px #00ffff; --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(2px, 2px); --btn-primary-bg: #00ffff; --btn-primary-text: #111111; --btn-secondary-bg: #ff00ff; --btn-secondary-text: #111111; --btn-danger-bg: #111111; --tab-bg: #111111; --tab-active-bg: #ff00ff; --tab-active-text: #111111; --input-bg: #111111; --input-focus: #222222; --danger-bg: #550000; --danger-color: #ff3333; --success-bg: #005500; --success-color: #33ff33; --info-bg: #000055; }
.theme-smashbros { --bg-color: #ff1a1a; --box-bg: #111111; --text-main: #ffffff; --text-muted: #cccccc; --border-color: #ffffff; --border-width: 2px; --box-border-width: 3px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(0, 0, 0, 0.6); --shadow-box: 8px 8px 0px var(--shadow-color); --shadow-btn: 4px 4px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(4px, 4px); --btn-primary-bg: #ffffff; --btn-primary-text: #111111; --btn-secondary-bg: #ff1a1a; --btn-secondary-text: #ffffff; --btn-danger-bg: #111111; --tab-bg: #111111; --tab-active-bg: #ffffff; --tab-active-text: #111111; --input-bg: #111111; --input-focus: #ff1a1a; --danger-bg: #550000; --danger-color: #ffcccc; --success-bg: #005500; --success-color: #ccffcc; --info-bg: #000055; }

/* --- 41~53 --- */
.theme-genshin { --bg-color: #e5e5dc; --box-bg: #f5f5ee; --text-main: #3a3f4a; --text-muted: #8d939e; --border-color: #c0a16b; --border-width: 1px; --box-border-width: 2px; --radius-box: 16px; --radius-element: 8px; --shadow-color: rgba(192, 161, 107, 0.2); --shadow-box: 0 10px 25px var(--shadow-color); --shadow-btn: 0 4px 8px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.97); --btn-primary-bg: #c0a16b; --btn-primary-text: #ffffff; --btn-secondary-bg: #e5e5dc; --btn-secondary-text: #3a3f4a; --btn-danger-bg: #f5f5ee; --tab-bg: #e5e5dc; --tab-active-bg: #c0a16b; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #e5e5dc; --danger-bg: #fce4e4; --danger-color: #d9534f; --success-bg: #e4fce4; --success-color: #5cb85c; --info-bg: #e4e4fc; }
.theme-honkai { --bg-color: #12151e; --box-bg: #1f2333; --text-main: #e0e5f5; --text-muted: #7882a4; --border-color: #ff6699; --border-width: 2px; --box-border-width: 2px; --radius-box: 12px; --radius-element: 6px; --shadow-color: rgba(255, 102, 153, 0.3); --shadow-box: 0 8px 20px var(--shadow-color); --shadow-btn: 0 4px 10px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(2px); --btn-primary-bg: #ff6699; --btn-primary-text: #12151e; --btn-secondary-bg: #2d334a; --btn-secondary-text: #e0e5f5; --btn-danger-bg: #12151e; --tab-bg: #12151e; --tab-active-bg: #ff6699; --tab-active-text: #12151e; --input-bg: #12151e; --input-focus: #1f2333; --danger-bg: #4a1522; --danger-color: #ff99bb; --success-bg: #154a22; --success-color: #99ffbb; --info-bg: #15224a; }
.theme-witcher { --bg-color: #1c1c1c; --box-bg: #2b2b2b; --text-main: #dcdcdc; --text-muted: #888888; --border-color: #c1272d; --border-width: 2px; --box-border-width: 3px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(0, 0, 0, 0.8); --shadow-box: 6px 6px 0px var(--shadow-color); --shadow-btn: 3px 3px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(3px, 3px); --btn-primary-bg: #c1272d; --btn-primary-text: #ffffff; --btn-secondary-bg: #404040; --btn-secondary-text: #dcdcdc; --btn-danger-bg: #1c1c1c; --tab-bg: #1c1c1c; --tab-active-bg: #c1272d; --tab-active-text: #ffffff; --input-bg: #1c1c1c; --input-focus: #2b2b2b; --danger-bg: #4a0000; --danger-color: #ffcccc; --success-bg: #004a00; --success-color: #ccffcc; --info-bg: #00004a; }
.theme-skyrim { --bg-color: #182015; --box-bg: #2a3825; --text-main: #e6e0d4; --text-muted: #969389; --border-color: #8c7355; --border-width: 2px; --box-border-width: 3px; --radius-box: 4px; --radius-element: 2px; --shadow-color: rgba(0, 0, 0, 0.6); --shadow-box: 0 4px 12px var(--shadow-color); --shadow-btn: 0 2px 4px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.98); --btn-primary-bg: #8c7355; --btn-primary-text: #182015; --btn-secondary-bg: #3c4c36; --btn-secondary-text: #e6e0d4; --btn-danger-bg: #182015; --tab-bg: #182015; --tab-active-bg: #8c7355; --tab-active-text: #182015; --input-bg: #182015; --input-focus: #2a3825; --danger-bg: #3a1515; --danger-color: #ff9999; --success-bg: #153a15; --success-color: #99ff99; --info-bg: #15153a; }
.theme-fallout-nv { --bg-color: #1c1106; --box-bg: #2b1d10; --text-main: #ffb84d; --text-muted: #b38036; --border-color: #ffb84d; --border-width: 1px; --box-border-width: 1px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(255, 184, 77, 0.3); --shadow-box: 0 0 15px var(--shadow-color), inset 0 0 10px rgba(0,0,0,0.5); --shadow-btn: 0 0 5px var(--shadow-color); --shadow-btn-active: 0 0 15px var(--text-main); --transform-active: translateY(1px); --btn-primary-bg: #2b1d10; --btn-primary-text: #ffb84d; --btn-secondary-bg: #1c1106; --btn-secondary-text: #ffb84d; --btn-danger-bg: #1c1106; --tab-bg: #1c1106; --tab-active-bg: #ffb84d; --tab-active-text: #1c1106; --input-bg: #1c1106; --input-focus: #2b1d10; --danger-bg: #3a0b0b; --danger-color: #ff6666; --success-bg: #0b3a0b; --success-color: #66ff66; --info-bg: #0b0b3a; }
.theme-reddead { --bg-color: #2b1212; --box-bg: #1a0a0a; --text-main: #e6b800; --text-muted: #997a00; --border-color: #cc0000; --border-width: 3px; --box-border-width: 4px; --radius-box: 2px; --radius-element: 2px; --shadow-color: rgba(0, 0, 0, 0.8); --shadow-box: 6px 6px 0px var(--shadow-color); --shadow-btn: 3px 3px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(3px, 3px); --btn-primary-bg: #cc0000; --btn-primary-text: #ffffff; --btn-secondary-bg: #401b1b; --btn-secondary-text: #e6b800; --btn-danger-bg: #1a0a0a; --tab-bg: #1a0a0a; --tab-active-bg: #cc0000; --tab-active-text: #ffffff; --input-bg: #1a0a0a; --input-focus: #401b1b; --danger-bg: #4a0000; --danger-color: #ff9999; --success-bg: #004a00; --success-color: #99ff99; --info-bg: #00004a; }
.theme-gta { --bg-color: #f2f2f2; --box-bg: #ffffff; --text-main: #111111; --text-muted: #666666; --border-color: #ff00ff; --border-width: 3px; --box-border-width: 4px; --radius-box: 0px; --radius-element: 0px; --shadow-color: rgba(0, 0, 0, 0.2); --shadow-box: 8px 8px 0px var(--shadow-color); --shadow-btn: 4px 4px 0px var(--shadow-color); --shadow-btn-active: 0px 0px 0px transparent; --transform-active: translate(4px, 4px); --btn-primary-bg: #ff00ff; --btn-primary-text: #ffffff; --btn-secondary-bg: #111111; --btn-secondary-text: #ffffff; --btn-danger-bg: #f2f2f2; --tab-bg: #111111; --tab-active-bg: #ff00ff; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #f2f2f2; --danger-bg: #ffe6e6; --danger-color: #cc0000; --success-bg: #e6ffe6; --success-color: #00cc00; --info-bg: #e6e6ff; }
.theme-lastofus { --bg-color: #1a221f; --box-bg: #2a332f; --text-main: #d9d9d9; --text-muted: #8c8c8c; --border-color: #799a82; --border-width: 1px; --box-border-width: 2px; --radius-box: 4px; --radius-element: 2px; --shadow-color: rgba(0, 0, 0, 0.5); --shadow-box: 0 4px 10px var(--shadow-color); --shadow-btn: 0 2px 4px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.98); --btn-primary-bg: #799a82; --btn-primary-text: #1a221f; --btn-secondary-bg: #3a4540; --btn-secondary-text: #d9d9d9; --btn-danger-bg: #1a221f; --tab-bg: #1a221f; --tab-active-bg: #799a82; --tab-active-text: #1a221f; --input-bg: #1a221f; --input-focus: #2a332f; --danger-bg: #3a1a1a; --danger-color: #ff8080; --success-bg: #1a3a1a; --success-color: #80ff80; --info-bg: #1a1a3a; }
.theme-godofwar { --bg-color: #1a1a1c; --box-bg: #2a2a2d; --text-main: #e6e6e6; --text-muted: #999999; --border-color: #b30000; --border-width: 2px; --box-border-width: 3px; --radius-box: 2px; --radius-element: 0px; --shadow-color: rgba(179, 0, 0, 0.4); --shadow-box: 0 0 15px var(--shadow-color); --shadow-btn: 0 0 5px var(--shadow-color); --shadow-btn-active: inset 0 0 10px var(--shadow-color); --transform-active: translateY(2px); --btn-primary-bg: #b30000; --btn-primary-text: #ffffff; --btn-secondary-bg: #404045; --btn-secondary-text: #e6e6e6; --btn-danger-bg: #1a1a1c; --tab-bg: #1a1a1c; --tab-active-bg: #b30000; --tab-active-text: #ffffff; --input-bg: #1a1a1c; --input-focus: #2a2a2d; --danger-bg: #4a0000; --danger-color: #ff9999; --success-bg: #004a00; --success-color: #99ff99; --info-bg: #00004a; }
.theme-uncharted { --bg-color: #2b2620; --box-bg: #3d362e; --text-main: #e0d6c8; --text-muted: #a39887; --border-color: #d4a373; --border-width: 1px; --box-border-width: 2px; --radius-box: 6px; --radius-element: 4px; --shadow-color: rgba(0, 0, 0, 0.4); --shadow-box: 0 6px 12px var(--shadow-color); --shadow-btn: 0 2px 4px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: scale(0.97); --btn-primary-bg: #d4a373; --btn-primary-text: #2b2620; --btn-secondary-bg: #52483d; --btn-secondary-text: #e0d6c8; --btn-danger-bg: #2b2620; --tab-bg: #2b2620; --tab-active-bg: #d4a373; --tab-active-text: #2b2620; --input-bg: #2b2620; --input-focus: #3d362e; --danger-bg: #4a1a1a; --danger-color: #ff9999; --success-bg: #1a4a1a; --success-color: #99ff99; --info-bg: #1a1a4a; }
.theme-hollowknight { --bg-color: #1c1a24; --box-bg: #2a2836; --text-main: #d0d2e0; --text-muted: #7a7c8f; --border-color: #8fa1cc; --border-width: 1px; --box-border-width: 2px; --radius-box: 12px; --radius-element: 6px; --shadow-color: rgba(143, 161, 204, 0.2); --shadow-box: 0 0 20px var(--shadow-color); --shadow-btn: 0 0 8px var(--shadow-color); --shadow-btn-active: inset 0 0 10px var(--shadow-color); --transform-active: translateY(1px); --btn-primary-bg: #8fa1cc; --btn-primary-text: #1c1a24; --btn-secondary-bg: #3d3a4d; --btn-secondary-text: #d0d2e0; --btn-danger-bg: #1c1a24; --tab-bg: #1c1a24; --tab-active-bg: #8fa1cc; --tab-active-text: #1c1a24; --input-bg: #1c1a24; --input-focus: #2a2836; --danger-bg: #3a1c24; --danger-color: #ff99bb; --success-bg: #1c3a24; --success-color: #99ffbb; --info-bg: #1c243a; }
.theme-celeste { --bg-color: #2b1a26; --box-bg: #3d2536; --text-main: #f0e6eb; --text-muted: #a38c9c; --border-color: #ff4d88; --border-width: 2px; --box-border-width: 3px; --radius-box: 16px; --radius-element: 8px; --shadow-color: rgba(255, 77, 136, 0.3); --shadow-box: 0 8px 25px var(--shadow-color); --shadow-btn: 0 4px 10px var(--shadow-color); --shadow-btn-active: inset 0 2px 5px var(--shadow-color); --transform-active: scale(0.96); --btn-primary-bg: #ff4d88; --btn-primary-text: #ffffff; --btn-secondary-bg: #523249; --btn-secondary-text: #f0e6eb; --btn-danger-bg: #2b1a26; --tab-bg: #2b1a26; --tab-active-bg: #ff4d88; --tab-active-text: #ffffff; --input-bg: #2b1a26; --input-focus: #3d2536; --danger-bg: #4a1a26; --danger-color: #ff99bb; --success-bg: #1a4a26; --success-color: #99ffbb; --info-bg: #1a264a; }
.theme-stardew { --bg-color: #e0f2cb; --box-bg: #ffffff; --text-main: #4a3820; --text-muted: #8b7a62; --border-color: #8bc34a; --border-width: 2px; --box-border-width: 3px; --radius-box: 20px; --radius-element: 10px; --shadow-color: rgba(139, 195, 74, 0.2); --shadow-box: 0 6px 15px var(--shadow-color); --shadow-btn: 0 3px 8px var(--shadow-color); --shadow-btn-active: inset 0 2px 4px var(--shadow-color); --transform-active: translateY(2px); --btn-primary-bg: #8bc34a; --btn-primary-text: #ffffff; --btn-secondary-bg: #f1f8e9; --btn-secondary-text: #4a3820; --btn-danger-bg: #e0f2cb; --tab-bg: #f1f8e9; --tab-active-bg: #8bc34a; --tab-active-text: #ffffff; --input-bg: #ffffff; --input-focus: #f1f8e9; --danger-bg: #ffcdd2; --danger-color: #b71c1c; --success-bg: #c8e6c9; --success-color: #1b5e20; --info-bg: #b3e5fc; }

.floating-restore-btn {
  position: fixed; bottom: 20px; right: 20px; z-index: 9999;
  background: var(--box-bg); color: var(--text-main);
  border: var(--border-width) solid var(--border-color);
  border-radius: 50%; width: 50px; height: 50px; display: flex;
  justify-content: center; align-items: center; font-size: 1.8rem;
  cursor: pointer; box-shadow: var(--shadow-btn); opacity: 0.6; transition: all 0.3s ease;
}
.floating-restore-btn:hover { opacity: 1; transform: translateY(-2px) rotate(30deg); }
.floating-restore-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.theme-controls.immersive-expanded {
  background: rgba(255, 255, 255, 0.75); padding: 8px 12px;
  border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); backdrop-filter: blur(4px);
}
.theme-controls { position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; gap: 10px; align-items: center; }

.theme-info-btn, .global-theme-toggle {
  background: var(--box-bg); color: var(--text-main);
  border: var(--border-width) solid var(--border-color);
  border-radius: 30px; font-weight: 900; cursor: pointer;
  box-shadow: var(--shadow-btn); transition: all 0.3s ease;
  font-family: inherit; opacity: 0.85; 
}
.theme-info-btn { padding: 10px 14px; font-size: 1.2rem; border-radius: 50%; }
.global-theme-toggle { padding: 10px 18px; font-size: 1rem; }
.music-btn { font-size: 1.1rem; }
.music-btn:hover { transform: scale(1.1); }
.theme-info-btn:hover, .global-theme-toggle:hover, .theme-info-btn:active, .global-theme-toggle:active { opacity: 1; }
.theme-info-btn:active, .global-theme-toggle:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.theme-info-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); z-index: 10000;
  display: flex; justify-content: center; align-items: center; backdrop-filter: blur(3px);
}
.theme-info-box {
  background: var(--bg-color); color: var(--text-main); border: var(--box-border-width) solid var(--border-color);
  border-radius: var(--radius-box); padding: 30px; max-width: 400px; text-align: center; box-shadow: var(--shadow-box);
}
.theme-title { margin: 0 0 15px 0; font-size: 1.8rem; font-weight: 900; border-bottom: var(--border-width) dashed var(--border-color); padding-bottom: 10px;}
.theme-desc { font-size: 1.1rem; line-height: 1.6; font-weight: bold; margin-bottom: 20px;}
.close-info-btn {
  background: var(--btn-primary-bg); color: var(--btn-primary-text); border: var(--border-width) solid var(--border-color);
  border-radius: var(--radius-element); padding: 10px 25px; font-size: 1.2rem; font-weight: 900; cursor: pointer;
  box-shadow: var(--shadow-btn); transition: 0.1s; font-family: inherit;
}
.close-info-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.app-wrapper { min-height: 100vh; background-color: var(--bg-color); color: var(--text-main); transition: background-color 0.5s, color 0.5s; }
</style>