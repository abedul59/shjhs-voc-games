<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');
const route = useRoute();

const vocabularies = ref([]);
const gameRecords = ref([]);
const manualUnlocked1 = ref([]);
const manualUnlocked2 = ref([]);
const manualUnlocked3 = ref([]);
const manualUnlocked1k = ref([]); // 康軒第一套
const manualUnlocked2k = ref([]); // 康軒第二套
const manualUnlocked3k = ref([]); // 康軒第三套
const manualUnlocked4k = ref([]); // 康軒第四套

const isLoading = ref(true);
const targetStudentId = ref(null);
const isPreviewMode = ref(false);
const activeSet = ref('1');

const unlockCount = ref(10);
const unlockScore = ref(60);

// 翻牌動畫控制
const showRevealModal = ref(false);
const revealWord = ref('');
const isFlipped = ref(false);

const GITHUB_PAGES_BASE_URL = computed(() => {
  return `https://pyfbsdk59.github.io/tarot-cards-${activeSet.value}`;
});

const selectedVersion = ref('翰林');
const selectedVolume = ref('B4');
const selectedUnit = ref('U1');

const versions = ['翰林', '康軒', '南一'];
const volumes = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
const unitOptions = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'];

// 🌟 當切換版本時，自動切換到該版本的預設卡牌套系
watch(selectedVersion, (newVer) => {
  if (newVer === '康軒') {
    if (!String(activeSet.value).includes('k')) activeSet.value = '1k';
  } else {
    if (String(activeSet.value).includes('k')) activeSet.value = '1';
  }
});

onMounted(async () => {
  if (route.query.student_id) {
    targetStudentId.value = route.query.student_id;
    isPreviewMode.value = true;
  } else if (studentCookie.value) {
    targetStudentId.value = studentCookie.value.id || studentCookie.value.student_id || studentCookie.value;
  } else { navigateTo('/'); return; }
  
  const { data: sysSettings } = await supabase.from('system_settings').select('tarot_unlock_count, tarot_unlock_score').eq('id', 1).single();
  if (sysSettings) {
    unlockCount.value = sysSettings.tarot_unlock_count || 10;
    unlockScore.value = sysSettings.tarot_unlock_score || 0;
  }

  const { data: vData } = await supabase.from('vocabularies').select('version, volume, unit, en_us').order('id', { ascending: true });
  if (vData) vocabularies.value = vData;
  
  const { data: records } = await supabase.from('game_records').select('version, volume, unit_played, score').eq('student_id', targetStudentId.value);
  if (records) gameRecords.value = records;

  // 讀取所有版本的抽獎解鎖紀錄
  const { data: studentData } = await supabase.from('students')
    .select('unlocked_tarot, unlocked_tarot_2, unlocked_tarot_3, unlocked_tarot_1k, unlocked_tarot_2k, unlocked_tarot_3k, unlocked_tarot_4k')
    .eq('student_id', targetStudentId.value).maybeSingle();
    
  if (studentData) {
    manualUnlocked1.value = studentData.unlocked_tarot || [];
    manualUnlocked2.value = studentData.unlocked_tarot_2 || [];
    manualUnlocked3.value = studentData.unlocked_tarot_3 || [];
    manualUnlocked1k.value = studentData.unlocked_tarot_1k || [];
    manualUnlocked2k.value = studentData.unlocked_tarot_2k || [];
    manualUnlocked3k.value = studentData.unlocked_tarot_3k || [];
    manualUnlocked4k.value = studentData.unlocked_tarot_4k || [];
  }

  if (route.query.reveal_word) {
    revealWord.value = route.query.reveal_word;
    activeSet.value = route.query.set || '1';
    
    // 如果來自康軒版抽卡，自動跳到康軒選項
    if (String(activeSet.value).includes('k')) {
      selectedVersion.value = '康軒';
    } else {
      selectedVersion.value = '翰林';
    }
    
    setTimeout(() => { showRevealModal.value = true; }, 800);
  }

  isLoading.value = false;
});

// 🌟 自動解鎖：只計算「當前選擇版本」的遊玩次數
const currentUnitPlayCount = computed(() => {
  return gameRecords.value.filter(r => 
    r.version === selectedVersion.value && 
    r.volume === selectedVolume.value && 
    r.unit_played === selectedUnit.value &&
    r.score >= unlockScore.value
  ).length;
});

const unlockedCardCount = computed(() => Math.floor(currentUnitPlayCount.value / unlockCount.value));

const currentUnitWords = computed(() => {
  return vocabularies.value
    .filter(v => v.version === selectedVersion.value && v.volume === selectedVolume.value && v.unit === selectedUnit.value)
    .map(v => v.en_us.replace(/[?()!]/g, '').trim()); 
});

// 🌟 動態回傳當下選擇的卡牌套系的手動解鎖名單
const currentManualUnlocks = computed(() => {
  if (activeSet.value === '1') return manualUnlocked1.value;
  if (activeSet.value === '2') return manualUnlocked2.value;
  if (activeSet.value === '3') return manualUnlocked3.value;
  if (activeSet.value === '1k') return manualUnlocked1k.value;
  if (activeSet.value === '2k') return manualUnlocked2k.value;
  if (activeSet.value === '3k') return manualUnlocked3k.value;
  if (activeSet.value === '4k') return manualUnlocked4k.value;
  return [];
});

const isWordUnlocked = (word, index) => {
  if (!word) return false;
  return index < unlockedCardCount.value || currentManualUnlocks.value.some(w => w?.toLowerCase() === word.toLowerCase());
};

const triggerReveal = (word) => {
  revealWord.value = word;
  isFlipped.value = false;
  showRevealModal.value = true;
};

// 下載圖片功能
const downloadImage = async (word) => {
  try {
    const imageUrl = `${GITHUB_PAGES_BASE_URL.value}/${word}.webp`;
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${word}.webp`; 
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('下載圖片失敗:', error);
    alert('下載圖片失敗，可能是圖片尚未準備好。');
  }
};

const onImageError = (e) => {
  e.target.style.display = 'none';
  e.target.nextElementSibling.style.display = 'flex';
};
</script>

<template>
  <div class="gallery-container">
    <div v-if="isPreviewMode" class="preview-banner">👁️ 目前為後台預覽模式 (學生ID: {{ targetStudentId }})</div>

    <div v-if="showRevealModal" class="reveal-overlay" @click.self="showRevealModal = false">
      <div class="reveal-content" :class="{ 'is-revealed': isFlipped }" @click="isFlipped = true">
        <div class="sparkles"></div>
        <div class="card-flip-inner" :class="{ flipped: isFlipped }">
          <div class="card-side card-back-reveal">
            <div class="back-pattern">🔮</div>
            <p>點擊翻開命運之牌</p>
          </div>
          <div class="card-side card-front-reveal">
            <img :src="`${GITHUB_PAGES_BASE_URL}/${revealWord}.webp`" @error="onImageError" />
            <div class="card-fallback" style="display: none;">
              <span class="word-text">{{ revealWord }}</span>
              <span class="status-text">⏳ AI 生成中</span>
            </div>
            <div class="new-badge">NEW UNLOCK!</div>
          </div>
        </div>
        <button v-if="isFlipped" class="close-reveal-btn" @click="showRevealModal = false">收入圖鑑</button>
      </div>
    </div>

    <div class="header retro-element">
      <h1>🔮 領域牌組圖鑑</h1>
      <p>點擊已解鎖的卡片，可重複觀看翻牌動畫</p>
    </div>

    <div class="selectors retro-element">
      <select v-model="selectedVersion" class="retro-input"><option v-for="v in versions" :key="v" :value="v">{{ v }}</option></select>
      <select v-model="selectedVolume" class="retro-input"><option v-for="vol in volumes" :key="vol" :value="vol">{{ vol }}</option></select>
      <select v-model="selectedUnit" class="retro-input"><option v-for="u in unitOptions" :key="u" :value="u">{{ u }}</option></select>
    </div>

    <div class="deck-tabs" v-if="selectedVersion !== '康軒'">
      <button :class="['deck-btn', { active: activeSet === '1' }]" @click="activeSet = '1'">🌙 第一彈</button>
      <button :class="['deck-btn', { active: activeSet === '2' }]" @click="activeSet = '2'">✨ 第二彈</button>
      <button :class="['deck-btn', { active: activeSet === '3' }]" @click="activeSet = '3'">🔥 第三彈</button> 
    </div>
    
    <div class="deck-tabs" v-else>
      <button :class="['deck-btn', { active: activeSet === '1k' }]" @click="activeSet = '1k'">🌙 康軒第一彈</button>
      <button :class="['deck-btn', { active: activeSet === '2k' }]" @click="activeSet = '2k'">✨ 康軒第二彈</button>
      <button :class="['deck-btn', { active: activeSet === '3k' }]" @click="activeSet = '3k'">🔥 康軒第三彈</button> 
      <button :class="['deck-btn', { active: activeSet === '4k' }]" @click="activeSet = '4k'">⚡ 康軒第四彈</button> 
    </div>

    <div class="progress-box retro-element">
      <h2>🏆 {{ selectedVersion }} {{ selectedVolume }} {{ selectedUnit }} 解鎖進度</h2>
      <p style="color: #888; font-size: 0.95rem; margin-bottom: 10px;">
        💡 解鎖條件：該單元每玩滿 <strong>{{ unlockCount }}</strong> 次 (且分數達 <strong>{{ unlockScore }}</strong> 分) 可解鎖一組卡牌
      </p>
      <p>當前符合條件次數：<strong class="highlight">{{ currentUnitPlayCount }}</strong> 次 (全套牌同步解鎖：<strong>{{ unlockedCardCount }}</strong> 張)</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: Math.min((unlockedCardCount / (currentUnitWords.length || 1)) * 100, 100) + '%' }"></div>
      </div>
    </div>

    <p v-if="isLoading" class="loading">⏳ 正在翻開命運的卡牌...</p>

    <div v-else class="cards-grid">
      <div v-for="(word, index) in currentUnitWords" :key="index" class="card-slot">
        <div v-if="isWordUnlocked(word, index)" class="card unlocked" @click="triggerReveal(word)">
          <img :src="`${GITHUB_PAGES_BASE_URL}/${word}.webp`" class="card-img" @error="onImageError" />
          <div class="card-fallback" style="display: none;">
            <span class="word-text">{{ word }}</span>
            <span class="status-text">⏳ AI 生成中</span>
          </div>
          <button class="download-btn" @click.stop="downloadImage(word)">
            ⬇️ 下載圖片
          </button>
        </div>
        <div v-else class="card locked">
          <div class="card-back"><span class="lock-icon">🔒</span></div>
        </div>
      </div>
    </div>

    <NuxtLink v-if="!isPreviewMode" to="/" class="retro-btn home-btn">🚪 返回首頁</NuxtLink>
  </div>
</template>

<style scoped>
/* --- 🌟 翻牌與發光特效 CSS --- */
.reveal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(8px); }
.reveal-content { width: 320px; aspect-ratio: 1 / 1.7; position: relative; cursor: pointer; perspective: 1000px; }

.card-flip-inner { position: relative; width: 100%; height: 100%; transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; }
.card-flip-inner.flipped { transform: rotateY(180deg); }

.card-side { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 15px; border: 4px solid #d4af37; box-shadow: 0 0 30px rgba(212, 175, 55, 0.3); overflow: hidden; }
.card-front-reveal { transform: rotateY(180deg); background: #000; }
.card-back-reveal { background: radial-gradient(circle, #2a2a35, #111); display: flex; flex-direction: column; justify-content: center; align-items: center; color: #d4af37; }
.back-pattern { font-size: 5rem; margin-bottom: 20px; animation: pulse 2s infinite; }

.card-side img { width: 100%; height: 100%; object-fit: cover; }

/* 發光粒子特效 */
.is-revealed::before { content: ''; position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; background: radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, transparent 70%); transform: translate(-50%, -50%); z-index: -1; animation: gold-glow 2s infinite; }

.new-badge { 
  position: absolute; 
  top: 10px;
  left: -5px;
  background: #ff3366; 
  color: white; 
  padding: 3px 8px;
  transform: rotate(-5deg); 
  font-weight: 900; 
  box-shadow: 2px 2px 0 #000; 
  z-index: 10; 
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.close-reveal-btn { position: absolute; bottom: -80px; left: 50%; transform: translateX(-50%); background: #d4af37; color: #000; border: none; padding: 10px 30px; border-radius: 20px; font-weight: 900; font-size: 1.2rem; cursor: pointer; animation: fadeInUp 0.5s; }

@keyframes gold-glow { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); } }
@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
@keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* --- 其餘樣式 --- */
.gallery-container { min-height: 100vh; padding: 20px; display: flex; flex-direction: column; align-items: center; max-width: 1200px; margin: 0 auto; box-sizing: border-box; background: var(--bg-color); }
.preview-banner { background: #ff3366; color: white; width: 100%; text-align: center; padding: 10px; font-weight: bold; margin-bottom: 20px; border-radius: 8px; }
.header { text-align: center; width: 100%; margin-bottom: 20px; }
.deck-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-bottom: 20px; }
.deck-btn { padding: 10px 20px; border-radius: 20px; border: 2px solid var(--border-color); cursor: pointer; font-weight: bold; background: var(--box-bg); color: var(--text-main); }
.deck-btn.active { background: #d4af37; color: #000; border-color: #d4af37; }
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; width: 100%; }
.card { aspect-ratio: 1 / 1.7; border-radius: 10px; border: 2px solid var(--border-color); overflow: hidden; position: relative; cursor: pointer; transition: 0.3s; }
.card-img { width: 100%; height: 100%; object-fit: cover; }
.locked { filter: grayscale(1); opacity: 0.5; }
.card-back { width: 100%; height: 100%; background: #222; display: flex; justify-content: center; align-items: center; font-size: 2rem; }
.retro-element { background: var(--box-bg); padding: 15px; border: 2px solid var(--border-color); border-radius: 10px; width: 100%; margin-bottom: 20px; box-sizing: border-box;}
.selectors { display: flex; gap: 10px; }
.retro-input { flex: 1; padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); }
.home-btn { margin-top: 30px; text-decoration: none; padding: 10px 30px; background: var(--btn-primary-bg); color: #000; border-radius: 10px; font-weight: bold; }

.download-btn {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(212, 175, 55, 0.9);
  color: #111;
  border: none;
  padding: 8px 15px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.85rem;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 5; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  white-space: nowrap; 
}
.download-btn:hover {
  background: #d4af37; 
  transform: translateX(-50%) translateY(-2px); 
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}
</style>