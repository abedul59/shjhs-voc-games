<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');
const historyRecords = ref([]);
const isLoading = ref(true);

const selectedGameType = ref('單字方塊消消樂');

// 🌟 統一定義所有 PvP 對戰遊戲
const pvpGames = ['單字方塊陣', '單字吞食天地', '單字塔羅21點', '單字塔羅鍊金術', '單字塔羅UNO對決'];

const fetchHistory = async () => {
  if (!studentCookie.value) return;
  isLoading.value = true;
  historyRecords.value = []; 
  
  let query = supabase.from('game_records')
    .select('*')
    .eq('student_id', studentCookie.value.id)
    .order('played_at', { ascending: false });

  if (selectedGameType.value === '單字方塊消消樂') {
    query = query.or('game_type.eq.單字方塊消消樂,game_type.is.null');
  } else {
    query = query.eq('game_type', selectedGameType.value);
  }

  const { data, error } = await query;
  if (data) historyRecords.value = data;
  isLoading.value = false;
};

onMounted(() => {
  if (!studentCookie.value) navigateTo('/');
  else fetchHistory();
});

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const formatIntervals = (jsonObj) => {
  if (!jsonObj) return [];
  let parsedObj = jsonObj;
  if (typeof jsonObj === 'string') { try { parsedObj = JSON.parse(jsonObj); } catch (e) { return []; } }
  return Object.entries(parsedObj)
    .filter(([word, time]) => time !== null && time !== undefined && time !== '' && !isNaN(parseFloat(time)))
    .map(([word, time]) => ({ word, time: parseFloat(time) })).sort((a, b) => b.time - a.time);
};

// 🌟 解析對戰結果
const getBattleResult = (record) => {
  const cw = record.correct_words || '';
  if (cw.includes('【勝】') || cw.includes('結果: 勝')) return '勝';
  if (cw.includes('【敗】') || cw.includes('結果: 敗')) return '敗';
  if (cw.includes('【逃】') || cw.includes('逃跑') || cw.includes('逃走')) return '逃';
  return '';
};

// 🌟 計算對戰總計
const pvpTotalWins = computed(() => historyRecords.value.filter(r => getBattleResult(r) === '勝').length);
const pvpTotalLosses = computed(() => historyRecords.value.filter(r => getBattleResult(r) === '敗').length);
const pvpTotalEscapes = computed(() => historyRecords.value.filter(r => getBattleResult(r) === '逃').length);
</script>

<template>
  <div class="history-container">
    <div class="header-box retro-element">
      <h1>📊 我的學習紀錄</h1>
      <p v-if="studentCookie">👤 {{ studentCookie.name }} ({{ studentCookie.isAnon ? '匿名訪客' : studentCookie.class }})</p>
    </div>
    <div class="top-nav"><NuxtLink to="/" class="retro-btn back-btn">← 回首頁</NuxtLink></div>

    <div class="filter-box retro-element">
<div class="game-type-tabs">
        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊消消樂' }" @click="selectedGameType = '單字方塊消消樂'; fetchHistory()">🟦 方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字神移動' }" @click="selectedGameType = '單字神移動'; fetchHistory()">🔠 移動</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字選選樂' }" @click="selectedGameType = '單字選選樂'; fetchHistory()">✅ 選擇</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填一填' }" @click="selectedGameType = '單字填一填'; fetchHistory()">⌨️ 填空</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句神絕配' }" @click="selectedGameType = '單字例句神絕配'; fetchHistory()">📝 例句</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句順風耳' }" @click="selectedGameType = '單字例句順風耳'; fetchHistory()">🎧 聽力</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字拼起來' }" @click="selectedGameType = '單字拼起來'; fetchHistory()">🧩 拼圖</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字口說測一測' }" @click="selectedGameType = '單字口說測一測'; fetchHistory()">🎙️ 口說</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填字FUN' }" @click="selectedGameType = '單字填字FUN'; fetchHistory()">🔠 填字</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字複習趣' }" @click="selectedGameType = '單字複習趣'; fetchHistory()">✍️ 複習</button>
        
        <button class="type-btn" :class="{ active: selectedGameType === '單字撲克牌接龍' }" @click="selectedGameType = '單字撲克牌接龍'; fetchHistory()">🃏 接龍</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字踩地雷' }" @click="selectedGameType = '單字踩地雷'; fetchHistory()">💣 踩地雷</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字9x9數獨' }" @click="selectedGameType = '單字9x9數獨'; fetchHistory()">🔢 數獨</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點(單人)' }" @click="selectedGameType = '單字塔羅21點(單人)'; fetchHistory()">🃏 塔羅21(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術(單人)' }" @click="selectedGameType = '單字塔羅鍊金術(單人)'; fetchHistory()">🔮 鍊金術(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO(單人)' }" @click="selectedGameType = '單字塔羅UNO(單人)'; fetchHistory()">🃏 塔羅UNO(單)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊陣' }" @click="selectedGameType = '單字方塊陣'; fetchHistory()">⚔️ 對戰方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字吞食天地' }" @click="selectedGameType = '單字吞食天地'; fetchHistory()">🐎 吞食天地</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點' }" @click="selectedGameType = '單字塔羅21點'; fetchHistory()">🃏 塔羅21(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術' }" @click="selectedGameType = '單字塔羅鍊金術'; fetchHistory()">🔮 鍊金術(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO對決' }" @click="selectedGameType = '單字塔羅UNO對決'; fetchHistory()">⚔️ 塔羅UNO(雙)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字小精靈' }" @click="selectedGameType = '單字小精靈'; fetchHistory()">👻 小精靈</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字俄羅斯方塊' }" @click="selectedGameType = '單字俄羅斯方塊'; fetchHistory()">🧱 俄羅斯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字皮卡丘排球' }" @click="selectedGameType = '單字皮卡丘排球'; fetchHistory()">🏐 皮卡排球</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字彈珠台' }" @click="selectedGameType = '單字彈珠台'; fetchHistory()">🎰 彈珠台</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字憤怒鳥' }" @click="selectedGameType = '單字憤怒鳥'; fetchHistory()">🐦 憤怒鳥</button>
 <button class="type-btn" :class="{ active: selectedGameType === '單字看圖辨義' }" @click="selectedGameType = '單字看圖辨義'; fetchHistory()">🖼️ 看圖辨義</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字音節忍者' }" @click="selectedGameType = '單字音節忍者'; fetchHistory()">🥷 音節忍者</button>
        <button class="type-btn" :class="{ active: selectedGameType === '英語口說學霸' }" @click="selectedGameType = '英語口說學霸'; fetchHistory()">🗣️ 口說學霸</button>
        <button class="type-btn" :class="{ active: selectedGameType === '仿會考辨識句意' }" @click="selectedGameType = '仿會考辨識句意'; fetchHistory()">💯 會考聽力</button>     

        
        
        <button class="type-btn" :class="{ active: selectedGameType === '單字搖搖杯' }" @click="selectedGameType = '單字搖搖杯'; fetchHistory()">🧋 搖搖杯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字天平' }" @click="selectedGameType = '單字天平'; fetchHistory()">⚖️ 天平</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字迷宮滾滾球' }" @click="selectedGameType = '單字迷宮滾滾球'; fetchHistory()">🔮 迷宮</button>
        <button class="type-btn" :class="{ active: selectedGameType === '霍格華茲單字杖' }" @click="selectedGameType = '霍格華茲單字杖'; fetchHistory()">🪄 單字杖</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'AR實境單字狙擊手' }" @click="selectedGameType = 'AR實境單字狙擊手'; fetchHistory()">🔫 狙擊手</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字地圖 GO' }" @click="selectedGameType = '單字地圖 GO'; fetchHistory()">🌍 地圖GO</button>        
      </div>
    </div>

    <div v-if="pvpGames.includes(selectedGameType) && historyRecords.length > 0" class="pvp-summary-box retro-element">
      <h3>⚔️ 個人對戰總成績</h3>
      <div class="pvp-stats">
        <div class="p-stat win">🏆 {{ pvpTotalWins }} 勝</div>
        <div class="p-stat lose">💀 {{ pvpTotalLosses }} 敗</div>
        <div class="p-stat escape">🏃 {{ pvpTotalEscapes }} 逃</div>
      </div>
    </div>

    <p v-if="isLoading" class="loading-msg">⏳ 紀錄讀取中...</p>
    <div v-else-if="historyRecords.length === 0" class="empty-msg retro-element">目前還沒有「{{ selectedGameType }}」的紀錄喔！趕快去挑戰吧！</div>

    <div class="history-list" v-else>
      <div class="history-card retro-element" v-for="item in historyRecords" :key="item.id">
        <div class="card-header">
          <span class="unit-badge">{{ item.version }} {{ item.volume }} - {{ item.unit_played }}</span>
          <span class="time-text">{{ formatDateTime(item.played_at) }}</span>
        </div>
        <div class="card-body">
          <div class="score-section">
            
            <div class="score-circle" v-if="pvpGames.includes(item.game_type)">
              <strong v-if="getBattleResult(item) === '勝'" style="color:#4caf50; font-size:2.5rem;">勝</strong>
              <strong v-else-if="getBattleResult(item) === '敗'" style="color:#f44336; font-size:2.5rem;">敗</strong>
              <strong v-else-if="getBattleResult(item) === '逃'" style="color:#ff9800; font-size:2.5rem;">逃</strong>
              <strong v-else>-</strong>
              <small v-if="getBattleResult(item) !== ''">戰果</small>
            </div>
            <div class="score-circle" v-else>
              <strong>{{ item.score }}</strong><small>分</small>
            </div>

            <div class="stats-text">
              <p>⏱️ 花費時間：{{ item.time_taken_seconds ?? item.time_spent ?? 0 }} 秒</p>
              <p v-if="item.mistakes !== null && !pvpGames.includes(item.game_type)">❌ 錯誤次數：{{ item.mistakes }} 次</p>
            </div>
          </div>
          
          <div class="words-section">
            <div v-if="item.game_type === '單字方塊陣' || item.game_type === '單字吞食天地'" class="word-box correct" style="font-size: 1.1rem;">
              <strong>📝 戰況紀錄：</strong>{{ item.correct_words }}
            </div>
            
            <template v-else>
              <div v-if="item.wrong_words" class="word-box wrong"><strong>⚠️ 待加強單字：</strong>{{ item.wrong_words }}</div>
              <div v-if="item.correct_words" class="word-box correct"><strong>🌟 戰況與熟練單字：</strong>{{ item.correct_words }}</div>
              <div v-if="item.word_intervals && Object.keys(item.word_intervals).length > 0" class="word-box intervals"><strong>⏱️ 各單字耗時：</strong>
                <span v-for="i in formatIntervals(item.word_intervals)" :key="i.word" class="time-tag">{{ i.word }}({{ i.time }}s)</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-container { padding: 20px; max-width: 800px; margin: 0 auto; box-sizing: border-box; }
.header-box { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); padding: 20px; text-align: center; margin-bottom: 20px; box-shadow: var(--shadow-box); }
.header-box h1 { margin: 0 0 5px 0; color: var(--text-main); font-weight: 900; }
.header-box p { margin: 0; font-weight: bold; color: var(--text-muted); }

.top-nav { margin-bottom: 20px; }
.retro-btn { display: inline-block; padding: 10px 20px; background: var(--btn-secondary-bg); color: var(--btn-secondary-text); text-decoration: none; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); transition: all 0.15s; }
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.filter-box { background: var(--tab-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 25px; box-shadow: var(--shadow-btn); }
.game-type-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.type-btn { flex: 1; min-width: 18%; padding: 10px 5px; font-size: 0.9rem; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); background: var(--box-bg); color: var(--text-main); transition: all 0.2s; }
.type-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

/* 🌟 對戰專屬總計看板 CSS */
.pvp-summary-box { background: #333; color: white; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: center; border: 4px solid var(--border-color);}
.pvp-summary-box h3 { margin: 0 0 10px 0; color: #ffeb3b; }
.pvp-stats { display: flex; justify-content: center; gap: 15px; font-size: 1.2rem; font-weight: bold; flex-wrap: wrap;}
.p-stat { padding: 5px 15px; border-radius: 8px; background: #222; border: 2px solid #555;}
.p-stat.win { color: #4caf50; border-color: #4caf50;}
.p-stat.lose { color: #f44336; border-color: #f44336;}
.p-stat.escape { color: #ff9800; border-color: #ff9800;}

.loading-msg, .empty-msg { text-align: center; font-weight: bold; font-size: 1.2rem; padding: 30px; }
.empty-msg { background: var(--box-bg); border: 2px dashed var(--border-color); border-radius: var(--radius-element); color: var(--text-muted); }

.history-list { display: flex; flex-direction: column; gap: 20px; }
.history-card { background: var(--box-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); padding: 20px; box-shadow: var(--shadow-box); }
.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed var(--border-color); padding-bottom: 10px; margin-bottom: 15px; }
.unit-badge { background: var(--text-main); color: var(--box-bg); padding: 4px 10px; border-radius: 12px; font-weight: 900; font-size: 0.9rem; }
.time-text { color: var(--text-muted); font-weight: bold; font-size: 0.9rem; }

.card-body { display: flex; flex-direction: column; gap: 15px; }
@media (min-width: 600px) { .card-body { flex-direction: row; } }

.score-section { display: flex; align-items: center; gap: 20px; min-width: 250px; }
.score-circle { width: 80px; height: 80px; border-radius: 50%; border: 4px solid var(--danger-color); display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--danger-color); }
.score-circle strong { font-size: 2rem; font-weight: 900; line-height: 1; }
.stats-text p { margin: 5px 0; font-weight: bold; color: var(--text-main); font-size: 0.95rem; }

.words-section { flex: 1; display: flex; flex-direction: column; gap: 8px; background: var(--tab-bg); padding: 15px; border-radius: var(--radius-element); border: 1px dashed var(--border-color); justify-content: center;}
.word-box { font-size: 0.95rem; line-height: 1.5; }
.word-box.wrong { color: var(--danger-color); }
.word-box.correct { color: var(--success-color); }
.word-box.intervals { color: var(--text-muted); font-size: 0.85rem; border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 5px; }
.time-tag { display: inline-block; background: var(--info-bg); padding: 2px 6px; border-radius: 4px; margin: 2px; color: var(--text-main); font-weight: bold; border: 1px solid var(--border-color); }
</style>