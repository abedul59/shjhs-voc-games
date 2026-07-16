<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const masteryList = ref([]);
const isLoading = ref(true);

onMounted(async () => {
  if (!studentCookie.value || !studentCookie.value.id) {
    navigateTo('/');
    return;
  }

  // 1. 抓取精熟度統計
  const { data: masteryData } = await supabase
    .from('verb_mastery')
    .select('*')
    .eq('student_id', studentCookie.value.id);

  // 2. 抓取動詞庫以對照三態與中文
  const { data: verbData } = await supabase
    .from('irregular_verbs')
    .select('*');

  if (masteryData && verbData) {
    const verbMap = {};
    verbData.forEach(v => {
      verbMap[v.base_form] = v;
    });

    masteryList.value = masteryData.map(m => {
      const detail = verbMap[m.base_form] || {};
      const total = m.correct_count + m.wrong_count;
      const rate = total > 0 ? Math.round((m.correct_count / total) * 100) : 0;

      return {
        ...m,
        past_tense: detail.past_tense || '---',
        past_participle: detail.past_participle || '---',
        chinese: detail.chinese || '未知翻譯',
        total_attempts: total,
        success_rate: rate
      };
    }).sort((a, b) => a.success_rate - b.success_rate); // 正確率低的排在前面提醒
  }

  isLoading.value = false;
});

// 🌟 精細化學習燈號分類
const masteredVerbs = computed(() => masteryList.value.filter(v => v.success_rate >= 80));
const reviewVerbs = computed(() => masteryList.value.filter(v => v.success_rate >= 60 && v.success_rate < 80));
const struggledVerbs = computed(() => masteryList.value.filter(v => v.success_rate < 60));

const playPronunciation = (word) => {
  if (!word) return;
  const cleanWord = String(word).split('/')[0].toLowerCase().replace(/[^a-z]/g, '').trim();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};
</script>

<template>
  <div class="stats-container">
    <div class="header-box retro-element">
      <h1>📊 我的動詞變化診斷簿</h1>
      <p>透過歷史數據，精準抓出你的不規則動詞盲點！</p>
    </div>

    <div class="top-nav">
      <NuxtLink to="/" class="retro-btn back-btn">← 返回首頁</NuxtLink>
    </div>

    <div v-if="isLoading" class="loading-msg">⏳ 正在調閱你的學習檔案...</div>
    
    <div v-else-if="masteryList.length === 0" class="empty-box retro-element">
      <h3>🌵 目前還沒有任何診斷資料！</h3>
      <p>請先前往「動詞變化遊樂園」進行幾輪挑戰，系統就會自動幫你記錄盲點囉！</p>
    </div>

    <div v-else class="dashboard">
      
      <div v-if="struggledVerbs.length > 0" class="status-section danger-section retro-element">
        <h2>💀 需加強的盲點動詞（正確率 ＜ 60%）</h2>
        <div class="verb-grid">
          <div v-for="v in struggledVerbs" :key="v.id" class="verb-card card-danger">
            <div class="card-header">
              <span class="badge-rate">{{ v.success_rate }}%</span>
              <button class="sound-btn" @click="playPronunciation(v.base_form)">🔊 聽發音</button>
            </div>
            <div class="verb-details">
              <p class="v-base"><b>原形：</b>{{ v.base_form }}</p>
              <p class="v-past"><b>過去：</b>{{ v.past_tense }}</p>
              <p class="v-pp"><b>分詞：</b>{{ v.past_participle }}</p>
              <p class="v-zh"><b>中文：</b>{{ v.chinese }}</p>
            </div>
            <small class="counter-text">答對 {{ v.correct_count }} 次 / 答錯 {{ v.wrong_count }} 次</small>
          </div>
        </div>
      </div>

      <div v-if="reviewVerbs.length > 0" class="status-section warning-section retro-element">
        <h2>⚠️ 需注意的動詞（正確率 60% ~ 80%）</h2>
        <div class="verb-grid">
          <div v-for="v in reviewVerbs" :key="v.id" class="verb-card card-warning">
            <div class="card-header">
              <span class="badge-rate">{{ v.success_rate }}%</span>
              <button class="sound-btn" @click="playPronunciation(v.base_form)">🔊 聽發音</button>
            </div>
            <div class="verb-details">
              <p class="v-base"><b>原形：</b>{{ v.base_form }}</p>
              <p class="v-past"><b>過去：</b>{{ v.past_tense }}</p>
              <p class="v-pp"><b>分詞：</b>{{ v.past_participle }}</p>
              <p class="v-zh"><b>中文：</b>{{ v.chinese }}</p>
            </div>
            <small class="counter-text">答對 {{ v.correct_count }} 次 / 答錯 {{ v.wrong_count }} 次</small>
          </div>
        </div>
      </div>

      <div v-if="masteredVerbs.length > 0" class="status-section success-section retro-element">
        <h2>🔥 表現優異的動詞（正確率 ≧ 80%）</h2>
        <div class="verb-grid">
          <div v-for="v in masteredVerbs" :key="v.id" class="verb-card card-success">
            <div class="card-header">
              <span class="badge-rate">{{ v.success_rate }}%</span>
              <button class="sound-btn" @click="playPronunciation(v.base_form)">🔊 聽發音</button>
            </div>
            <div class="verb-details">
              <p class="v-base"><b>原形：</b>{{ v.base_form }}</p>
              <p class="v-past"><b>過去：</b>{{ v.past_tense }}</p>
              <p class="v-pp"><b>分詞：</b>{{ v.past_participle }}</p>
              <p class="v-zh"><b>中文：</b>{{ v.chinese }}</p>
            </div>
            <small class="counter-text">答對 {{ v.correct_count }} 次 / 答錯 {{ v.wrong_count }} 次</small>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.stats-container { padding: 20px; max-width: 900px; margin: 0 auto; font-family: 'PingFang TC', sans-serif; }
.header-box { text-align: center; padding: 20px; margin-bottom: 25px; background: #fff; border: 3px solid #333; border-radius: 12px; }
.header-box h1 { margin: 0 0 10px 0; color: #2c3e50; font-weight: 900; }
.header-box p { color: #7f8c8d; font-weight: bold; margin:0; }
.top-nav { margin-bottom: 20px; }
.retro-btn { display: inline-block; padding: 10px 20px; text-decoration: none; font-weight: bold; border: 2px solid #333; border-radius: 8px; background: #eee; color: #333; box-shadow: 3px 3px 0 #333; }
.retro-btn:active { transform: translate(2px, 2px); box-shadow: none; }

.loading-msg, .empty-box { text-align: center; font-weight: bold; padding: 30px; font-size: 1.2rem; }

.status-section { margin-bottom: 30px; border: 3px solid #333; border-radius: 12px; padding: 20px; background: #fff; }
.status-section h2 { margin-top: 0; font-size: 1.3rem; font-weight: 900; padding-bottom: 10px; border-bottom: 2px dashed #333; }

.danger-section h2 { color: #c0392b; }
.warning-section h2 { color: #d35400; }
.success-section h2 { color: #27ae60; }

.verb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-top: 15px; }
.verb-card { border: 2px solid #333; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 2px 2px 0 #333; }

.card-danger { background: #fdf2e9; border-color: #e74c3c; }
.card-warning { background: #fefde8; border-color: #f39c12; }
.card-success { background: #f0fdf4; border-color: #2ecc71; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.badge-rate { font-weight: 900; font-size: 1.2rem; }
.sound-btn { background: #fff; border: 1px solid #333; border-radius: 15px; padding: 2px 8px; font-size: 0.8rem; cursor: pointer; font-weight: bold; }

.verb-details p { margin: 4px 0; font-size: 1rem; color: #333; }
.counter-text { margin-top: 8px; font-size: 0.8rem; color: #666; font-weight: bold; display: block; text-align: right; }
</style>
