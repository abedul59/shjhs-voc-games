<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();

const vocabMenu = ref([]);
const studentsMap = ref({});

const selectedGameType = ref('單字方塊消消樂'); 
const identityMode = ref('student'); 
const selectedVersion = ref('');
const selectedVolume = ref('');
const selectedUnit = ref('');
const isLoading = ref(false);
const rankedList = ref([]);

const pvpSortMode = ref('wins'); 
const tetrisSortMode = ref('word'); 

// 🌟 統一定義所有 PvP 對戰遊戲
const pvpGames = ['單字方塊陣', '單字吞食天地', '單字塔羅21點', '單字塔羅鍊金術', '單字塔羅UNO對決'];

onMounted(async () => {
  const { data: sData } = await supabase.from('students').select('student_id, class_name, hidden_name').limit(10000);
  if (sData) sData.forEach(s => { studentsMap.value[s.student_id] = `${s.class_name} - ${s.hidden_name}`; });

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

const onVersionChange = () => { selectedVolume.value = ''; selectedUnit.value = ''; rankedList.value = []; };
const onVolumeChange = () => { selectedUnit.value = ''; rankedList.value = []; };

const fetchLeaderboard = async () => {
  if (!selectedUnit.value) return;
  isLoading.value = true;

  // 🌟 修正點：分開處理 query，避免帶有括號 () 的遊戲名稱破壞 Supabase 的 or 語法
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
      const isAnonRecord = r.student_id.startsWith('anon_');
      return identityMode.value === 'student' ? !isAnonRecord : isAnonRecord;
    });

    if (pvpGames.includes(selectedGameType.value)) {
        const pvpRecords = {};
        filteredData.forEach(r => {
            if (!pvpRecords[r.student_id]) {
                pvpRecords[r.student_id] = { student_id: r.student_id, wins: 0, losses: 0, escapes: 0 };
            }
            const cw = r.correct_words || '';
            if (cw.includes('【勝】') || cw.includes('結果: 勝')) pvpRecords[r.student_id].wins++;
            else if (cw.includes('【敗】') || cw.includes('結果: 敗')) pvpRecords[r.student_id].losses++;
            else if (cw.includes('【逃】') || cw.includes('逃跑') || cw.includes('逃走')) pvpRecords[r.student_id].escapes++;
        });
        
        let pvpArray = Object.values(pvpRecords);
        if (pvpSortMode.value === 'wins') {
            pvpArray = pvpArray.filter(r => r.wins > 0).sort((a, b) => b.wins - a.wins || a.escapes - b.escapes || a.losses - b.losses);
        } else if (pvpSortMode.value === 'losses') {
            pvpArray = pvpArray.filter(r => r.losses > 0).sort((a, b) => b.losses - a.losses || b.wins - a.wins);
        } else if (pvpSortMode.value === 'escapes') {
            pvpArray = pvpArray.filter(r => r.escapes > 0).sort((a, b) => b.escapes - a.escapes || b.wins - a.wins);
        }
        rankedList.value = pvpArray;

    } else if (selectedGameType.value === '單字俄羅斯方塊') {
        const tetrisRecords = {};
        filteredData.forEach(r => {
            const wordScore = r.score || 0;
            const time = r.time_taken_seconds || 0;
            let tetrisScore = 0;
            if (r.correct_words) {
                const match = r.correct_words.match(/方塊分:\s*(\d+)/);
                if (match) tetrisScore = parseInt(match[1]);
            }

            if (wordScore === 0 && tetrisScore === 0) return;

            if (!tetrisRecords[r.student_id]) {
                tetrisRecords[r.student_id] = { student_id: r.student_id, wordScore, tetrisScore, time, id: r.id };
            } else {
                const curr = tetrisRecords[r.student_id];
                if (tetrisSortMode.value === 'word') {
                    if (wordScore > curr.wordScore || (wordScore === curr.wordScore && tetrisScore > curr.tetrisScore)) {
                        tetrisRecords[r.student_id] = { student_id: r.student_id, wordScore, tetrisScore, time, id: r.id };
                    }
                } else if (tetrisSortMode.value === 'tetris') {
                    if (tetrisScore > curr.tetrisScore || (tetrisScore === curr.tetrisScore && wordScore > curr.wordScore)) {
                        tetrisRecords[r.student_id] = { student_id: r.student_id, wordScore, tetrisScore, time, id: r.id };
                    }
                } else if (tetrisSortMode.value === 'time') {
                    if (time > curr.time || (time === curr.time && wordScore > curr.wordScore)) {
                        tetrisRecords[r.student_id] = { student_id: r.student_id, wordScore, tetrisScore, time, id: r.id };
                    }
                }
            }
        });

        let tArray = Object.values(tetrisRecords);
        if (tetrisSortMode.value === 'word') {
            tArray.sort((a, b) => b.wordScore - a.wordScore || b.tetrisScore - a.tetrisScore || b.time - a.time);
        } else if (tetrisSortMode.value === 'tetris') {
            tArray.sort((a, b) => b.tetrisScore - a.tetrisScore || b.wordScore - a.wordScore || b.time - a.time);
        } else if (tetrisSortMode.value === 'time') {
            tArray.sort((a, b) => b.time - a.time || b.wordScore - a.wordScore || b.tetrisScore - a.tetrisScore);
        }
        rankedList.value = tArray;

    } else {
        const bestRecords = {};
        filteredData.forEach(r => {
          const rTime = r.time_taken_seconds ?? r.time_spent ?? 999;
          r.computedTime = rTime;

          if (!bestRecords[r.student_id]) { 
            bestRecords[r.student_id] = r; 
          } else {
            const curr = bestRecords[r.student_id];
            if (r.score > curr.score || (r.score === curr.score && rTime < curr.computedTime)) {
              bestRecords[r.student_id] = r;
            }
          }
        });
        rankedList.value = Object.values(bestRecords).sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.computedTime - b.computedTime;
        });
    }
  }
  isLoading.value = false;
};

const getPlayerName = (id) => {
  if (id.startsWith('anon_')) return `🕵️ 匿名訪客 (${id.split('_')[1]?.substring(0,4)})`;
  return studentsMap.value[id] || '未知玩家';
};
</script>

<template>
  <div class="lb-container">
    <div class="header-box retro-element"><h1>🏆 挑戰英雄榜</h1><p>LEADERBOARD</p></div>
    <div class="top-nav">
      <NuxtLink to="/" class="retro-btn back-btn">← 返回首頁</NuxtLink>
    </div>

    <div class="filter-box retro-element">
<div class="game-type-tabs">
        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊消消樂' }" @click="selectedGameType = '單字方塊消消樂'; fetchLeaderboard()">🟦 方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字神移動' }" @click="selectedGameType = '單字神移動'; fetchLeaderboard()">🔠 移動</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字選選樂' }" @click="selectedGameType = '單字選選樂'; fetchLeaderboard()">✅ 選擇</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填一填' }" @click="selectedGameType = '單字填一填'; fetchLeaderboard()">⌨️ 填空</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句神絕配' }" @click="selectedGameType = '單字例句神絕配'; fetchLeaderboard()">📝 例句</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句順風耳' }" @click="selectedGameType = '單字例句順風耳'; fetchLeaderboard()">🎧 聽力</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字拼起來' }" @click="selectedGameType = '單字拼起來'; fetchLeaderboard()">🧩 拼圖</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字口說測一測' }" @click="selectedGameType = '單字口說測一測'; fetchLeaderboard()">🎙️ 口說</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填字FUN' }" @click="selectedGameType = '單字填字FUN'; fetchLeaderboard()">🔠 填字</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字複習趣' }" @click="selectedGameType = '單字複習趣'; fetchLeaderboard()">✍️ 複習</button>
        
        <button class="type-btn" :class="{ active: selectedGameType === '單字撲克牌接龍' }" @click="selectedGameType = '單字撲克牌接龍'; fetchLeaderboard()">🃏 接龍</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字踩地雷' }" @click="selectedGameType = '單字踩地雷'; fetchLeaderboard()">💣 踩地雷</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字9x9數獨' }" @click="selectedGameType = '單字9x9數獨'; fetchLeaderboard()">🔢 數獨</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點(單人)' }" @click="selectedGameType = '單字塔羅21點(單人)'; fetchLeaderboard()">🃏 塔羅21(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術(單人)' }" @click="selectedGameType = '單字塔羅鍊金術(單人)'; fetchLeaderboard()">🔮 鍊金術(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO(單人)' }" @click="selectedGameType = '單字塔羅UNO(單人)'; fetchLeaderboard()">🃏 塔羅UNO(單)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊陣' }" @click="selectedGameType = '單字方塊陣'; fetchLeaderboard()">⚔️ 對戰方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字吞食天地' }" @click="selectedGameType = '單字吞食天地'; fetchLeaderboard()">🐎 吞食天地</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點' }" @click="selectedGameType = '單字塔羅21點'; fetchLeaderboard()">🃏 塔羅21(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術' }" @click="selectedGameType = '單字塔羅鍊金術'; fetchLeaderboard()">🔮 鍊金術(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO對決' }" @click="selectedGameType = '單字塔羅UNO對決'; fetchLeaderboard()">⚔️ 塔羅UNO(雙)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字小精靈' }" @click="selectedGameType = '單字小精靈'; fetchLeaderboard()">👻 小精靈</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字俄羅斯方塊' }" @click="selectedGameType = '單字俄羅斯方塊'; fetchLeaderboard()">🧱 俄羅斯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字皮卡丘排球' }" @click="selectedGameType = '單字皮卡丘排球'; fetchLeaderboard()">🏐 皮卡排球</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字彈珠台' }" @click="selectedGameType = '單字彈珠台'; fetchLeaderboard()">🎰 彈珠台</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字憤怒鳥' }" @click="selectedGameType = '單字憤怒鳥'; fetchLeaderboard()">🐦 憤怒鳥</button>
 <button class="type-btn" :class="{ active: selectedGameType === '單字看圖辨義' }" @click="selectedGameType = '單字看圖辨義'; fetchLeaderboard()">🖼️ 看圖辨義</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字音節忍者' }" @click="selectedGameType = '單字音節忍者'; fetchLeaderboard()">🥷 音節忍者</button>
        <button class="type-btn" :class="{ active: selectedGameType === '英語口說學霸' }" @click="selectedGameType = '英語口說學霸'; fetchLeaderboard()">🗣️ 口說學霸</button>
        <button class="type-btn" :class="{ active: selectedGameType === '仿會考辨識句意' }" @click="selectedGameType = '仿會考辨識句意'; fetchLeaderboard()">💯 會考聽力</button>     

        
         <button class="type-btn" :class="{ active: selectedGameType === '單字搖搖杯' }" @click="selectedGameType = '單字搖搖杯'; fetchLeaderboard()"">🧋 搖搖杯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字天平' }" @click="selectedGameType = '單字天平'; fetchLeaderboard()"">⚖️ 天平</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字迷宮滾滾球' }" @click="selectedGameType = '單字迷宮滾滾球'; fetchLeaderboard()"">🔮 迷宮</button>
        <button class="type-btn" :class="{ active: selectedGameType === '霍格華茲單字杖' }" @click="selectedGameType = '霍格華茲單字杖'; fetchLeaderboard()"">🪄 單字杖</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'AR實境單字狙擊手' }" @click="selectedGameType = 'AR實境單字狙擊手'; fetchLeaderboard()"">🔫 狙擊手</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字地圖 GO' }" @click="selectedGameType = '單字地圖 GO'; fetchLeaderboard()"">🌍 地圖GO</button>
       
      </div>

      <div v-if="pvpGames.includes(selectedGameType)" class="sub-tabs">
        <button class="sub-btn wins" :class="{ 'active': pvpSortMode === 'wins' }" @click="pvpSortMode = 'wins'; fetchLeaderboard()">🏆 勝利榜</button>
        <button class="sub-btn losses" :class="{ 'active': pvpSortMode === 'losses' }" @click="pvpSortMode = 'losses'; fetchLeaderboard()">💀 敗戰榜</button>
        <button class="sub-btn escapes" :class="{ 'active': pvpSortMode === 'escapes' }" @click="pvpSortMode = 'escapes'; fetchLeaderboard()">🏃 逃跑榜</button>
      </div>

      <div v-if="selectedGameType === '單字俄羅斯方塊'" class="sub-tabs">
        <button class="sub-btn w-mode" :class="{ 'active': tetrisSortMode === 'word' }" @click="tetrisSortMode = 'word'; fetchLeaderboard()">🎯 單字神射手</button>
        <button class="sub-btn t-mode" :class="{ 'active': tetrisSortMode === 'tetris' }" @click="tetrisSortMode = 'tetris'; fetchLeaderboard()">🧱 方塊消除王</button>
        <button class="sub-btn s-mode" :class="{ 'active': tetrisSortMode === 'time' }" @click="tetrisSortMode = 'time'; fetchLeaderboard()">⏱️ 極限生存者</button>
      </div>

      <div class="identity-tabs">
        <button class="id-btn" :class="{active: identityMode === 'student'}" @click="identityMode = 'student'; fetchLeaderboard()">🧑‍🎓 實名榜</button>
        <button class="id-btn" :class="{active: identityMode === 'anon'}" @click="identityMode = 'anon'; fetchLeaderboard()">🕵️ 匿名榜</button>
      </div>
      <div class="form-group" style="margin-top: 15px;">
        <select v-model="selectedVersion" @change="onVersionChange" class="retro-input"><option value="" disabled>版本...</option><option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option></select>
        <select v-model="selectedVolume" @change="onVolumeChange" class="retro-input" :disabled="!selectedVersion"><option value="" disabled>冊數...</option><option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol }}</option></select>
        <select v-model="selectedUnit" @change="fetchLeaderboard" class="retro-input" :disabled="!selectedVolume"><option value="" disabled>單元...</option><option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option></select>
      </div>
    </div>

    <p v-if="isLoading" class="loading-msg">⏳ 統計中...</p>
    <div v-else-if="rankedList.length === 0 && selectedUnit" class="empty-msg retro-element">目前還沒有紀錄！</div>

    <div class="rank-list" v-if="rankedList.length > 0">
      <div class="rank-card retro-element" v-for="(record, index) in rankedList" :key="record.id" :class="{'top-1': index===0, 'top-2': index===1, 'top-3': index===2}">
        <div class="rank-number">#{{ index + 1 }}</div>
        <div class="rank-info">
          <div class="player-name">{{ getPlayerName(record.student_id) }}</div>
          <div class="attempt-badge" v-if="!pvpGames.includes(selectedGameType) && selectedGameType !== '單字俄羅斯方塊'">第 {{ record.attempt_number || 1 }} 次</div>
        </div>
        
        <div class="rank-score" v-if="pvpGames.includes(selectedGameType)">
          <template v-if="pvpSortMode === 'wins'">
             <strong style="color: #4caf50;">{{ record.wins }} 勝</strong><br>
             <small><span style="color: #f44336;">{{ record.losses }} 敗</span> / <span style="color: #ff9800;">{{ record.escapes }} 逃</span></small>
          </template>
          <template v-else-if="pvpSortMode === 'losses'">
             <strong style="color: #f44336;">{{ record.losses }} 敗</strong><br>
             <small><span style="color: #4caf50;">{{ record.wins }} 勝</span> / <span style="color: #ff9800;">{{ record.escapes }} 逃</span></small>
          </template>
          <template v-else-if="pvpSortMode === 'escapes'">
             <strong style="color: #ff9800;">{{ record.escapes }} 逃</strong><br>
             <small><span style="color: #4caf50;">{{ record.wins }} 勝</span> / <span style="color: #f44336;">{{ record.losses }} 敗</span></small>
          </template>
        </div>

        <div class="rank-score" v-else-if="selectedGameType === '單字俄羅斯方塊'">
          <template v-if="tetrisSortMode === 'word'">
             <strong style="color: #4caf50;">{{ record.wordScore }} 分</strong><br>
             <small><span style="color: #2196f3;">方塊 {{ record.tetrisScore }}</span> / <span style="color: #ff9800;">{{ record.time }}s</span></small>
          </template>
          <template v-else-if="tetrisSortMode === 'tetris'">
             <strong style="color: #2196f3;">{{ record.tetrisScore }} 分</strong><br>
             <small><span style="color: #4caf50;">單字 {{ record.wordScore }}</span> / <span style="color: #ff9800;">{{ record.time }}s</span></small>
          </template>
          <template v-else-if="tetrisSortMode === 'time'">
             <strong style="color: #ff9800;">{{ record.time }} 秒</strong><br>
             <small><span style="color: #4caf50;">單字 {{ record.wordScore }}</span> / <span style="color: #2196f3;">方塊 {{ record.tetrisScore }}</span></small>
          </template>
        </div>

        <div class="rank-score" v-else>
          <strong>{{ record.score }}</strong> 分<br>
          <small>
             ⏱️ {{ record.computedTime }}s
             <span v-if="record.mistakes !== undefined && record.mistakes !== null" style="color: #f44336; margin-left: 5px;">| ❌ {{ record.mistakes }}</span>
          </small>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.lb-container { padding: 20px; box-sizing: border-box; max-width: 800px; margin: 0 auto; }
.header-box { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); text-align: center; padding: 20px; margin-bottom: 20px; }
.header-box h1 { margin: 0 0 5px 0; font-weight: 900; color: var(--text-main); }
.header-box p { color: var(--text-muted); font-weight: bold; margin: 0;}
.top-nav { margin-bottom: 20px; }
.retro-btn { display: inline-block; padding: 10px 20px; color: var(--btn-secondary-text); text-decoration: none; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); background-color: var(--btn-secondary-bg); }
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.filter-box { background: var(--tab-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 25px; box-shadow: var(--shadow-btn); }
.game-type-tabs, .identity-tabs { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.type-btn, .id-btn { flex: 1; min-width: 15%; padding: 8px 5px; font-size: 0.85rem; font-weight: 900; background: var(--box-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); transition: all 0.2s; }
.type-btn.active, .id-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.sub-tabs { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 15px 0; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 10px; border: 1px dashed #aaa;}
.sub-btn { padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 0.95rem; border: 2px solid var(--border-color); cursor: pointer; background: var(--box-bg); color: var(--text-main); transition: 0.2s; box-shadow: 0 3px 0 var(--border-color);}
.sub-btn:active { transform: translateY(3px); box-shadow: none; }

.sub-btn.active.wins { background: #e8f5e9; color: #2e7d32; border-color: #4caf50; box-shadow: 0 3px 0 #4caf50;}
.sub-btn.active.losses { background: #ffebee; color: #c62828; border-color: #f44336; box-shadow: 0 3px 0 #f44336;}
.sub-btn.active.escapes { background: #fff3e0; color: #ef6c00; border-color: #ff9800; box-shadow: 0 3px 0 #ff9800;}
.sub-btn.active.w-mode { background: #e8f5e9; color: #2e7d32; border-color: #4caf50; box-shadow: 0 3px 0 #4caf50;}
.sub-btn.active.t-mode { background: #e3f2fd; color: #1565c0; border-color: #2196f3; box-shadow: 0 3px 0 #2196f3;}
.sub-btn.active.s-mode { background: #fff3e0; color: #e65100; border-color: #ff9800; box-shadow: 0 3px 0 #ff9800;}

.form-group { display: flex; gap: 10px; flex-wrap: wrap; }
.retro-input { flex: 1; min-width: 100px; padding: 10px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background: var(--input-bg); color: var(--text-main); font-weight: bold; font-family: inherit; }

.loading-msg, .empty-msg { text-align: center; font-weight: bold; font-size: 1.2rem; padding: 30px; }
.empty-msg { background: var(--box-bg); border: 2px dashed var(--border-color); border-radius: var(--radius-element);}
.rank-list { display: flex; flex-direction: column; gap: 15px; }
.rank-card { display: flex; align-items: center; background: var(--box-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; box-shadow: var(--shadow-btn); }

.rank-number { font-size: 1.8rem; font-weight: 900; color: var(--text-main); width: 50px; text-align: center; }
.rank-info { flex: 1; padding: 0 10px; }
.player-name { font-size: 1.1rem; font-weight: 900; color: var(--text-main); }
.attempt-badge { background: var(--text-main); color: var(--box-bg); display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin: 5px 0 0 0; }
.rank-score { text-align: right; min-width: 80px; }
.rank-score strong { font-size: 1.5rem; }
.rank-score small { font-weight: bold; display: block; margin-top: 5px;}
</style>