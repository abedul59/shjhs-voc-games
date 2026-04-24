<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const isAdminCookie = useCookie('isAdmin');
const authCookie = useCookie('teacher_auth');

onMounted(() => {
  const hasAuth = isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || (authCookie.value && authCookie.value.classes);
  if (!hasAuth) navigateTo('/admin/login');
});

const vocabMenu = ref([]);
const studentsMap = ref({});
const classesList = ref([]);

const selectedGameType = ref('單字方塊消消樂'); 
const selectedClass = ref('ALL');
const selectedVersion = ref('');
const selectedVolume = ref('');
const selectedUnit = ref('');
const isLoading = ref(false);

const wordStats = ref([]);
const isSpecialGame = ref(false); 

onMounted(async () => {
  const { data: sData } = await supabase.from('students').select('student_id, class_name').limit(10000);
  if (sData) {
    const cSet = new Set();
    sData.forEach(s => { 
      studentsMap.value[s.student_id] = s.class_name;
      if(s.class_name) cSet.add(s.class_name);
    });
    classesList.value = Array.from(cSet).sort();
  }

  const { data: vData } = await supabase.from('vocabularies').select('version, volume, unit').limit(10000);
  if (vData) {
    const uniqueMenu = [];
    vData.forEach(item => { if (!uniqueMenu.find(u => u.version === item.version && u.volume === item.volume && u.unit === item.unit)) uniqueMenu.push(item); });
    vocabMenu.value = uniqueMenu;
  }
});

const availableVersions = computed(() => [...new Set(vocabMenu.value.map(item => item.version))].filter(Boolean));
const availableVolumes = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selectedVersion.value).map(item => item.volume))].filter(Boolean));
const availableUnits = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selectedVersion.value && item.volume === selectedVolume.value).map(item => item.unit))].filter(Boolean));

const onVersionChange = () => { selectedVolume.value = ''; selectedUnit.value = ''; wordStats.value = []; };
const onVolumeChange = () => { selectedUnit.value = ''; wordStats.value = []; };

const fetchStats = async () => {
  if (!selectedUnit.value) return;

  // 🌟 對戰與俄羅斯方塊不分析單字，但塔羅牌系列與 6 款新遊戲「會」分析單字！
  if (selectedGameType.value === '單字方塊陣' || selectedGameType.value === '單字俄羅斯方塊' || selectedGameType.value === '單字吞食天地') {
      isSpecialGame.value = true;
      wordStats.value = [];
      return;
  }
  
  isSpecialGame.value = false;
  isLoading.value = true;

  let query = supabase.from('game_records').select('*')
    .eq('version', selectedVersion.value)
    .eq('volume', selectedVolume.value)
    .eq('unit_played', selectedUnit.value)
    .limit(10000);

  if (selectedGameType.value === '單字方塊消消樂') {
    query = query.or('game_type.eq.單字方塊消消樂,game_type.is.null');
  } else {
    query = query.eq('game_type', selectedGameType.value);
  }

  const { data } = await query;

  if (data) {
    const filteredData = data.filter(r => {
      if (r.student_id.startsWith('anon_')) return false; 
      if (selectedClass.value !== 'ALL' && studentsMap.value[r.student_id] !== selectedClass.value) return false;
      return true;
    });

    const statsMap = {};
    const ensureWord = (w) => {
      if (!statsMap[w]) statsMap[w] = { word: w, correct: 0, wrong: 0, total_time: 0, time_count: 0 };
    };

    filteredData.forEach(r => {
      const cw = r.correct_words ? r.correct_words.split(',').map(s => s.trim()).filter(Boolean) : [];
      const ww = r.wrong_words ? r.wrong_words.split(',').map(s => s.trim()).filter(Boolean) : [];

      cw.forEach(w => { 
          // 🌟 智慧過濾：忽略 PvP 對戰紀錄留下的中文狀態文字
          if (w.includes('結果:') || w.includes('剩餘血量:') || w.includes('【勝】') || w.includes('【敗】') || w.includes('【逃】')) return;
          ensureWord(w); 
          statsMap[w].correct++; 
      });
      ww.forEach(w => { 
          if (w.includes('結果:') || w.includes('剩餘血量:') || w.includes('【勝】') || w.includes('【敗】') || w.includes('【逃】')) return;
          ensureWord(w); 
          statsMap[w].wrong++; 
      });

      if (r.word_intervals) {
        let intervals = r.word_intervals;
        if (typeof intervals === 'string') {
          try { intervals = JSON.parse(intervals); } catch(e){}
        }
        if (typeof intervals === 'object') {
          Object.entries(intervals).forEach(([w, time]) => {
            if (w.includes('結果:') || w.includes('剩餘血量:')) return; // 防呆
            ensureWord(w);
            if (time && !isNaN(parseFloat(time))) {
              statsMap[w].total_time += parseFloat(time);
              statsMap[w].time_count++;
            }
          });
        }
      }
    });

    wordStats.value = Object.values(statsMap).map(s => {
      const total = s.correct + s.wrong;
      s.errorRate = total > 0 ? Math.round((s.wrong / total) * 100) : 0;
      s.avgTime = s.time_count > 0 ? (s.total_time / s.time_count).toFixed(1) : '-';
      s.totalAttempts = total;
      return s;
    }).sort((a, b) => b.errorRate - a.errorRate);
  }
  
  isLoading.value = false;
};
</script>

<template>
  <div class="admin-stats-container">
    <div class="header-box retro-element"><h1>📈 班級對錯分析</h1><p>ERROR ANALYSIS</p></div>
    <div class="top-nav">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回後台首頁</NuxtLink>
    </div>

    <div class="filter-box retro-element">
      <div class="game-type-tabs">
        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊消消樂' }" @click="selectedGameType = '單字方塊消消樂'; fetchStats()">🟦 方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字神移動' }" @click="selectedGameType = '單字神移動'; fetchStats()">🔠 移動</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字選選樂' }" @click="selectedGameType = '單字選選樂'; fetchStats()">✅ 選擇</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填一填' }" @click="selectedGameType = '單字填一填'; fetchStats()">⌨️ 填空</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句神絕配' }" @click="selectedGameType = '單字例句神絕配'; fetchStats()">📝 例句</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句順風耳' }" @click="selectedGameType = '單字例句順風耳'; fetchStats()">🎧 聽力</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字拼起來' }" @click="selectedGameType = '單字拼起來'; fetchStats()">🧩 拼圖</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字口說測一測' }" @click="selectedGameType = '單字口說測一測'; fetchStats()">🎙️ 口說</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填字FUN' }" @click="selectedGameType = '單字填字FUN'; fetchStats()">🔠 填字</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字複習趣' }" @click="selectedGameType = '單字複習趣'; fetchStats()">✍️ 複習</button>
        
        <button class="type-btn" :class="{ active: selectedGameType === '單字撲克牌接龍' }" @click="selectedGameType = '單字撲克牌接龍'; fetchStats()">🃏 接龍</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字踩地雷' }" @click="selectedGameType = '單字踩地雷'; fetchStats()">💣 踩地雷</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字9x9數獨' }" @click="selectedGameType = '單字9x9數獨'; fetchStats()">🔢 數獨</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點(單人)' }" @click="selectedGameType = '單字塔羅21點(單人)'; fetchStats()">🃏 塔羅21(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術(單人)' }" @click="selectedGameType = '單字塔羅鍊金術(單人)'; fetchStats()">🔮 鍊金術(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO(單人)' }" @click="selectedGameType = '單字塔羅UNO(單人)'; fetchStats()">🃏 塔羅UNO(單)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊陣' }" @click="selectedGameType = '單字方塊陣'; fetchStats()">⚔️ 對戰方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字吞食天地' }" @click="selectedGameType = '單字吞食天地'; fetchStats()">🐎 吞食天地</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點' }" @click="selectedGameType = '單字塔羅21點'; fetchStats()">🃏 塔羅21(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術' }" @click="selectedGameType = '單字塔羅鍊金術'; fetchStats()">🔮 鍊金術(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO對決' }" @click="selectedGameType = '單字塔羅UNO對決'; fetchStats()">⚔️ 塔羅UNO(雙)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字小精靈' }" @click="selectedGameType = '單字小精靈'; fetchStats()">👻 小精靈</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字俄羅斯方塊' }" @click="selectedGameType = '單字俄羅斯方塊'; fetchStats()">🧱 俄羅斯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字皮卡丘排球' }" @click="selectedGameType = '單字皮卡丘排球'; fetchStats()">🏐 皮卡排球</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字彈珠台' }" @click="selectedGameType = '單字彈珠台'; fetchStats()">🎰 彈珠台</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字憤怒鳥' }" @click="selectedGameType = '單字憤怒鳥'; fetchStats()">🐦 憤怒鳥</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字看圖辨義' }" @click="selectedGameType = '單字看圖辨義'; fetchStats()">🖼️ 看圖辨義</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字音節忍者' }" @click="selectedGameType = '單字音節忍者'; fetchStats()">🥷 音節忍者</button>
        <button class="type-btn" :class="{ active: selectedGameType === '英語口說學霸' }" @click="selectedGameType = '英語口說學霸'; fetchStats()">🗣️ 口說學霸</button>
        <button class="type-btn" :class="{ active: selectedGameType === '仿會考辨識句意' }" @click="selectedGameType = '仿會考辨識句意'; fetchStats()">💯 會考聽力</button>     
        
        <button class="type-btn" :class="{ active: selectedGameType === '單字搖搖杯' }" @click="selectedGameType = '單字搖搖杯'; fetchStats()">🧋 搖搖杯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字天平' }" @click="selectedGameType = '單字天平'; fetchStats()">⚖️ 天平</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字迷宮滾滾球' }" @click="selectedGameType = '單字迷宮滾滾球'; fetchStats()">🔮 迷宮</button>
        <button class="type-btn" :class="{ active: selectedGameType === '霍格華茲單字杖' }" @click="selectedGameType = '霍格華茲單字杖'; fetchStats()">🪄 單字杖</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'AR實境單字狙擊手' }" @click="selectedGameType = 'AR實境單字狙擊手'; fetchStats()">🔫 狙擊手</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字地圖 GO' }" @click="selectedGameType = '單字地圖 GO'; fetchStats()">🌍 地圖GO</button>
<button class="type-btn" :class="{ active: selectedGameType === '英語口說學霸2' }" @click="selectedGameType = '英語口說學霸2'; fetchStats()">📖 口說學霸2</button>
      </div>

      <div class="form-group" style="margin-top: 15px;">
        <select v-model="selectedClass" @change="fetchStats" class="retro-input class-select">
            <option value="ALL">🌟 全校資料 (實名)</option>
            <option v-for="c in classesList" :key="c" :value="c">班級：{{ c }}</option>
        </select>
        <select v-model="selectedVersion" @change="onVersionChange" class="retro-input"><option value="" disabled>版本...</option><option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option></select>
        <select v-model="selectedVolume" @change="onVolumeChange" class="retro-input" :disabled="!selectedVersion"><option value="" disabled>冊數...</option><option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol }}</option></select>
        <select v-model="selectedUnit" @change="fetchStats" class="retro-input" :disabled="!selectedVolume"><option value="" disabled>單元...</option><option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option></select>
      </div>
    </div>

    <div v-if="isSpecialGame" class="special-msg-box retro-element">
      <div class="icon-big">ℹ️</div>
      <h3>此模式不支援單字對錯分析</h3>
      <p>「對戰」與「俄羅斯方塊」為競技生存類遊戲，系統主要紀錄總勝負與總得分，並未紀錄單一單字的對錯。<br>請至 <strong>「紀錄報表」</strong> 或 <strong>「英雄榜」</strong> 查看學生戰績！</p>
    </div>

    <div v-else>
      <p v-if="isLoading" class="loading-msg">⏳ 數據運算中...</p>
      <div v-else-if="wordStats.length === 0 && selectedUnit" class="empty-msg retro-element">目前還沒有足以分析的紀錄！</div>
      
      <div class="stats-table-wrapper retro-element" v-else-if="wordStats.length > 0">
        <table class="stats-table">
          <thead>
            <tr>
              <th>單字</th>
              <th>錯誤率</th>
              <th>對/錯次數</th>
              <th>平均耗時</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stat in wordStats" :key="stat.word">
              <td class="word-col"><strong>{{ stat.word }}</strong></td>
              <td>
                <span class="error-badge" :class="{'high-error': stat.errorRate >= 50, 'low-error': stat.errorRate === 0, 'mid-error': stat.errorRate > 0 && stat.errorRate < 50}">
                  {{ stat.errorRate }}%
                </span>
              </td>
              <td class="count-col">✅{{ stat.correct }} / <span style="color:#f44336">❌{{ stat.wrong }}</span></td>
              <td class="time-col">{{ stat.avgTime }} 秒</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.admin-stats-container { padding: 20px; box-sizing: border-box; max-width: 900px; margin: 0 auto; }
.header-box { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); text-align: center; padding: 20px; margin-bottom: 20px; }
.header-box h1 { margin: 0 0 5px 0; font-weight: 900; color: var(--text-main); }
.header-box p { color: var(--text-muted); font-weight: bold; margin: 0;}
.top-nav { margin-bottom: 20px; }
.retro-btn { display: inline-block; padding: 10px 20px; color: var(--btn-secondary-text); text-decoration: none; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); background-color: var(--btn-secondary-bg); }
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.filter-box { background: var(--tab-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 25px; box-shadow: var(--shadow-btn); }
.game-type-tabs { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.type-btn { flex: 1; min-width: 12%; padding: 8px 5px; font-size: 0.85rem; font-weight: 900; background: var(--box-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); transition: all 0.2s; }
.type-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.form-group { display: flex; gap: 10px; flex-wrap: wrap; }
.retro-input { flex: 1; min-width: 100px; padding: 10px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background: var(--input-bg); color: var(--text-main); font-weight: bold; font-family: inherit; }
.class-select { background-color: #e3f2fd; border-color: #2196f3; color: #0d47a1; }

.loading-msg, .empty-msg { text-align: center; font-weight: bold; font-size: 1.2rem; padding: 30px; }
.empty-msg { background: var(--box-bg); border: 2px dashed var(--border-color); border-radius: var(--radius-element);}

.special-msg-box { background: #e3f2fd; border-color: #2196f3; text-align: center; padding: 40px 20px; }
.special-msg-box .icon-big { font-size: 4rem; margin-bottom: 10px; }
.special-msg-box h3 { color: #0d47a1; font-size: 1.5rem; margin-bottom: 10px; }
.special-msg-box p { color: #1565c0; font-size: 1.1rem; line-height: 1.6; font-weight: bold;}

.stats-table-wrapper { overflow-x: auto; background: var(--box-bg); padding: 10px; border-radius: var(--radius-element); border: var(--border-width) solid var(--border-color); }
.stats-table { width: 100%; border-collapse: collapse; min-width: 500px; }
.stats-table th { background: var(--tab-bg); padding: 12px; text-align: center; border-bottom: 3px solid var(--border-color); font-weight: 900; }
.stats-table td { padding: 15px 10px; text-align: center; border-bottom: 1px dashed #ccc; font-size: 1.1rem; }
.word-col { font-size: 1.3rem; color: var(--primary-color); }
.count-col { font-weight: bold; }
.time-col { color: var(--text-muted); font-family: monospace; font-size: 1.2rem; }

.error-badge { display: inline-block; padding: 4px 10px; border-radius: 15px; font-weight: 900; border: 2px solid #000; }
.high-error { background: #ffebee; color: #d32f2f; border-color: #d32f2f; }
.mid-error { background: #fff3e0; color: #f57c00; border-color: #f57c00; }
.low-error { background: #e8f5e9; color: #388e3c; border-color: #388e3c; }
</style>