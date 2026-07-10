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
const pvpGames = ['單字方塊陣', '單字吞食天地', '單字塔羅21點', '單字塔羅鍊金術', '單字塔羅UNO對決', '動詞對戰大師'];

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
  // 🌟 修正：如果是動詞系列遊戲，跳過單元篩選
  const isVerbingGame = selectedGameType.value === '動詞變化大師' || selectedGameType.value === '動詞對戰大師';
  if (!isVerbingGame && !selectedUnit.value) return; 
  
  isLoading.value = true;

  let query = supabase.from('game_records').select('*').order('score', { ascending: false });

  // 🌟 關鍵邏輯：動詞系列只篩選遊戲類型，一般遊戲才篩選單元
  if (isVerbingGame) {
      query = query.eq('game_type', selectedGameType.value);
  } else {
      query = query.eq('version', selectedVersion.value)
                   .eq('volume', selectedVolume.value)
                   .eq('unit_played', selectedUnit.value);
      
      if (selectedGameType.value === '單字方塊消消樂') {
        query = query.or('game_type.eq.單字方塊消消樂,game_type.is.null');
      } else {
        query = query.eq('game_type', selectedGameType.value);
      }
  }

  const { data } = await query.limit(10000);

  if (data) {
    const filteredData = data.filter(r => {
      const isAnonRecord = r.student_id && r.student_id.startsWith('anon_');
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
        if (pvpSortMode.value === 'wins') pvpArray.sort((a, b) => b.wins - a.wins || a.escapes - b.escapes);
        else if (pvpSortMode.value === 'losses') pvpArray.sort((a, b) => b.losses - a.losses);
        else if (pvpSortMode.value === 'escapes') pvpArray.sort((a, b) => b.escapes - a.escapes);
        rankedList.value = pvpArray;
    } else {
        const bestRecords = {};
        filteredData.forEach(r => {
          const rTime = r.time_taken_seconds ?? r.time_spent ?? 999;
          r.computedTime = rTime;
          if (!bestRecords[r.student_id] || r.score > bestRecords[r.student_id].score || (r.score === bestRecords[r.student_id].score && rTime < bestRecords[r.student_id].computedTime)) {
            bestRecords[r.student_id] = r;
          }
        });
        rankedList.value = Object.values(bestRecords).sort((a, b) => b.score - a.score || a.computedTime - b.computedTime);
    }
  }
  isLoading.value = false;
};

const getPlayerName = (id) => {
  if (id && id.startsWith('anon_')) return `🕵️ 匿名訪客 (${id.split('_')[1]?.substring(0,4)})`;
  return studentsMap.value[id] || '未知玩家';
};
</script>

<template>
  <div class="lb-container">
    <div class="header-box retro-element"><h1>🏆 挑戰英雄榜</h1></div>
    
    <div class="filter-box retro-element">
      <div class="game-type-tabs">
        <button class="type-btn" :class="{ active: selectedGameType === '動詞變化大師' }" @click="selectedGameType = '動詞變化大師'; fetchLeaderboard()">🌀 動詞變化大師</button>
        <button class="type-btn" :class="{ active: selectedGameType === '動詞對戰大師' }" @click="selectedGameType = '動詞對戰大師'; fetchLeaderboard()">⚔️ 動詞對戰大師</button>
      </div>

      <div v-if="!['動詞變化大師', '動詞對戰大師'].includes(selectedGameType)" class="form-group" style="margin-top: 15px;">
        <select v-model="selectedVersion" @change="onVersionChange" class="retro-input"><option value="" disabled>版本...</option><option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option></select>
        <select v-model="selectedVolume" @change="onVolumeChange" class="retro-input" :disabled="!selectedVersion"><option value="" disabled>冊數...</option><option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol }}</option></select>
        <select v-model="selectedUnit" @change="fetchLeaderboard" class="retro-input" :disabled="!selectedVolume"><option value="" disabled>單元...</option><option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option></select>
      </div>
      <div v-else class="empty-msg retro-element" style="margin-top: 10px; padding: 10px;">✨ 總表模式：無需選擇單元，直接顯示最強排行。</div>
    </div>
    
    </div>
</template>
