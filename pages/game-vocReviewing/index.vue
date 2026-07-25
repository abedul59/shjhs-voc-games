<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const vocabList = ref([]);
const isLoading = ref(true);
const isPlayingAll = ref(false);
const currentPlayIndex = ref(-1);

onMounted(async () => {
  if (!studentCookie.value) { 
    router.push('/'); 
    return; 
  }

  const version = route.query.version;
  const volume = route.query.volume;
  const unit = route.query.unit;

  if (!version || !volume || !unit) {
    alert('⚠️ 請先在首頁選擇完整的版本、冊數、單元！');
    router.push('/');
    return;
  }

  // 抓取該單元所有單字
  const { data } = await supabase
    .from('vocabularies')
    .select('*')
    .eq('version', version)
    .eq('volume', volume)
    .eq('unit', unit)
    .order('id', { ascending: true });

  if (data && data.length > 0) {
    vocabList.value = data;
  } else {
    alert('此單元目前沒有單字資料喔！');
    router.push('/');
  }
  
  isLoading.value = false;
});

// 離開頁面時強制停止語音，避免背景繼續唸
onUnmounted(() => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
});

// 核心發音函數 (附帶防卡死機制的 Promise)
const speakText = (text, lang) => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis || !text) return resolve();
    
    window.speechSynthesis.cancel(); // 清除排隊中的語音
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === 'en-US' ? 0.85 : 1.0; // 英文稍微放慢，適合學習
    
    // 防卡死計時器 (若瀏覽器發音API當機，強制 resolve 讓程式繼續)
    const timeout = setTimeout(() => {
         resolve();
    }, text.length * 150 + 3000);
    
    utterance.onend = () => {
         clearTimeout(timeout);
         resolve();
    };
    utterance.onerror = () => {
         clearTimeout(timeout);
         resolve();
    };
    
    window.speechSynthesis.speak(utterance);
  });
};

// 單顆按鈕發音
const playSingle = async (text, lang) => {
    if (isPlayingAll.value) return; // 若正在總複習連播，禁用單獨按鈕
    await speakText(text, lang);
};

// 總複習發音 (連播)
const togglePlayAll = async () => {
  // 如果正在播放，則中斷
  if (isPlayingAll.value) {
    isPlayingAll.value = false;
    window.speechSynthesis.cancel();
    currentPlayIndex.value = -1;
    return;
  }
  
  isPlayingAll.value = true;
  for (let i = 0; i < vocabList.value.length; i++) {
    if (!isPlayingAll.value) break;
    currentPlayIndex.value = i;
    const v = vocabList.value[i];
    
    // 1. 唸單字
    await speakText(v.word, 'en-US');
    if (!isPlayingAll.value) break;
    await new Promise(r => setTimeout(r, 400));
    
    // 2. 唸中文
    await speakText(v.chinese, 'zh-TW');
    if (!isPlayingAll.value) break;
    await new Promise(r => setTimeout(r, 400));
    
    // 3. 唸例句 (如果有)
    if (v.sentence) {
        await speakText(v.sentence, 'en-US');
        if (!isPlayingAll.value) break;
        await new Promise(r => setTimeout(r, 800)); // 例句唸完稍微停頓久一點換下一個單字
    } else {
        await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // 播完後重置狀態
  isPlayingAll.value = false;
  currentPlayIndex.value = -1;
};
</script>

<template>
  <div class="review-container">
    <div class="header-box retro-element">
      <h1>📖 單字例句總複習</h1>
      <div v-if="!isLoading" class="unit-info">
        {{ route.query.version }} - {{ route.query.volume }} - {{ route.query.unit }}
      </div>
    </div>

    <div v-if="isLoading" class="loading-screen retro-element">
       <h2>載入中...</h2>
    </div>

    <div v-else>
      <div class="control-panel">
        <NuxtLink to="/" class="retro-btn home-btn">🏠 返回首頁</NuxtLink>
        <button class="retro-btn play-all-btn" :class="{'playing': isPlayingAll}" @click="togglePlayAll">
          {{ isPlayingAll ? '⏹️ 停止總複習' : '▶️ 總複習自動連播' }}
        </button>
      </div>

      <div class="vocab-list">
        <!-- 跑迴圈列出所有單字 -->
        <div v-for="(v, index) in vocabList" :key="v.id" class="vocab-row" :class="{'highlight': currentPlayIndex === index}">
          
          <!-- 單字與中文區塊 -->
          <div class="word-section">
            <div class="word-header">
              <h2 class="word-text">{{ v.word }}</h2>
              <button class="sound-btn" @click="playSingle(v.word, 'en-US')" :disabled="isPlayingAll" title="發音">🔊</button>
            </div>
            <p class="chinese-text">{{ v.chinese }}</p>
          </div>
          
          <!-- 例句區塊 -->
          <div class="sentence-section">
            <div v-if="v.sentence" class="sentence-header">
              <p class="sentence-text">{{ v.sentence }}</p>
              <button class="sound-btn" @click="playSingle(v.sentence, 'en-US')" :disabled="isPlayingAll" title="唸例句">🔊</button>
            </div>
            <div v-else class="sentence-header">
              <p class="sentence-text" style="color: #999; font-style: italic;">(本單字無提供例句)</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-container { max-width: 900px; margin: 20px auto; padding: 15px; font-family: 'PingFang TC', sans-serif;}
.header-box { text-align: center; padding: 20px; background: #fff; border: 3px solid #333; border-radius: 12px; margin-bottom: 20px;}
.header-box h1 { margin: 0 0 10px 0; color: #2c3e50; font-weight: 900; }
.unit-info { font-size: 1.2rem; font-weight: bold; color: #ff9800; background: #fff3e0; display: inline-block; padding: 5px 15px; border-radius: 20px; border: 2px solid #ffe0b2;}

.control-panel { display: flex; justify-content: space-between; margin-bottom: 20px; }
.retro-btn { padding: 12px 20px; font-size: 1.1rem; font-weight: bold; border-radius: 12px; border: 2px solid #333; cursor: pointer; text-decoration: none; box-shadow: 3px 3px 0 #333; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.15s;}
.retro-btn:active { transform: translate(2px, 2px); box-shadow: none; }
.home-btn { background: #eee; color: #333; }
.play-all-btn { background: #4caf50; color: white; border-color: #2e7d32;}
.play-all-btn.playing { background: #e74c3c; border-color: #c0392b; animation: pulse 1.5s infinite;}

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.85; } 100% { opacity: 1; } }

.vocab-list { display: flex; flex-direction: column; gap: 15px; }
.vocab-row { background: #fff; border: 3px solid #ccc; border-radius: 12px; padding: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; transition: 0.3s;}
.vocab-row.highlight { border-color: #4caf50; background: #e8f5e9; box-shadow: 0 0 15px rgba(76, 175, 80, 0.4); transform: scale(1.01);}

.word-section { display: flex; flex-direction: column; justify-content: center;}
.word-header { display: flex; align-items: center; gap: 12px; }
.word-text { font-size: 2rem; font-weight: 900; color: #1976d2; margin: 0; word-break: break-word;}
.chinese-text { font-size: 1.2rem; color: #555; font-weight: bold; margin: 5px 0 0 0;}

.sentence-section { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 2px dashed #bbb; display: flex; flex-direction: column; justify-content: center;}
.sentence-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;}
.sentence-text { font-size: 1.15rem; color: #333; margin: 0; line-height: 1.5; font-weight: 500;}

.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 42px; height: 42px; font-size: 1.2rem; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.2s; flex-shrink: 0;}
.sound-btn:active:not(:disabled) { transform: scale(0.9); background: #e3f2fd;}
.sound-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; }

.loading-screen { text-align: center; padding: 50px; background: white; border: 3px solid #ccc; border-radius: 12px; }

@media (max-width: 768px) {
   .vocab-row { grid-template-columns: 1fr; }
   .control-panel { flex-direction: column-reverse; gap: 15px; }
   .retro-btn { width: 100%; }
}
</style>
