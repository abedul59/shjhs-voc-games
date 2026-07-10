<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const studentsMap = ref({});
const selectedGameType = ref('單字方塊消消樂'); 
const selectedVersion = ref('');
const selectedVolume = ref('');
const selectedUnit = ref('');
const isLoading = ref(false);
const rankedList = ref([]);
const pvpSortMode = ref('wins'); 

// 🌟 定義所有 PvP 對戰遊戲 (記得包含新遊戲)
const pvpGames = ['單字方塊陣', '單字吞食天地', '單字塔羅21點', '單字塔羅鍊金術', '單字塔羅UNO對決', '動詞對戰大師'];

onMounted(async () => {
  const { data: sData } = await supabase.from('students').select('student_id, class_name, hidden_name').limit(10000);
  if (sData) sData.forEach(s => { studentsMap.value[s.student_id] = `${s.class_name} - ${s.hidden_name}`; });
});

const fetchLeaderboard = async () => {
  // 🌟 修正：動詞變化系列跳過單元篩選
  const isVerbingGame = selectedGameType.value === '動詞變化大師' || selectedGameType.value === '動詞對戰大師';
  if (!isVerbingGame && !selectedUnit.value) return; 

  isLoading.value = true;
  let query = supabase.from('game_records').select('*').order('score', { ascending: false });

  if (isVerbingGame) {
      query = query.eq('game_type', selectedGameType.value);
  } else {
      query = query.eq('version', selectedVersion.value)
                   .eq('volume', selectedVolume.value)
                   .eq('unit_played', selectedUnit.value)
                   .eq('game_type', selectedGameType.value);
  }

  const { data } = await query.limit(10000);
  
  if (data) {
    if (pvpGames.includes(selectedGameType.value)) {
        const pvpRecords = {};
        data.forEach(r => {
            if (!pvpRecords[r.student_id]) pvpRecords[r.student_id] = { student_id: r.student_id, wins: 0, losses: 0, escapes: 0 };
            const cw = r.correct_words || '';
            if (cw.includes('【勝】')) pvpRecords[r.student_id].wins++;
            else if (cw.includes('【敗】')) pvpRecords[r.student_id].losses++;
            else if (cw.includes('【逃】')) pvpRecords[r.student_id].escapes++;
        });
        rankedList.value = Object.values(pvpRecords).sort((a, b) => b[pvpSortMode.value] - a[pvpSortMode.value]);
    } else {
        const bestRecords = {};
        data.forEach(r => {
          if (!bestRecords[r.student_id] || r.score > bestRecords[r.student_id].score) bestRecords[r.student_id] = r;
        });
        rankedList.value = Object.values(bestRecords).sort((a, b) => b.score - a.score);
    }
  }
  isLoading.value = false;
};
</script>

<template>
  <div class="admin-lb">
    <h1>⚔️ 管理員英雄榜總覽</h1>
    
    <div class="filter-box">
      <select v-model="selectedGameType" @change="fetchLeaderboard" class="retro-input">
        <option value="單字方塊消消樂">🟦 方塊消消樂</option>
        <option value="動詞變化大師">🌀 動詞變化大師</option>
        <option value="動詞對戰大師">⚔️ 動詞對戰大師</option>
        </select>

      <div v-if="!['動詞變化大師', '動詞對戰大師'].includes(selectedGameType)" class="unit-filters">
        <input v-model="selectedVersion" placeholder="版本" class="retro-input" />
        <input v-model="selectedVolume" placeholder="冊數" class="retro-input" />
        <input v-model="selectedUnit" placeholder="單元" class="retro-input" />
        <button @click="fetchLeaderboard" class="retro-btn">查詢</button>
      </div>
      <div v-else class="info-msg">✨ 顯示該遊戲所有玩家紀錄</div>
    </div>

    <div v-for="(r, i) in rankedList" :key="i" class="rank-item">
      <span>#{{ i + 1 }}</span>
      <span>{{ studentsMap[r.student_id] || r.student_id }}</span>
      <span v-if="pvpGames.includes(selectedGameType)">{{ r.wins }}勝 / {{ r.losses }}敗</span>
      <span v-else>{{ r.score }} 分</span>
    </div>
  </div>
</template>

<style scoped>
.admin-lb { padding: 20px; }
.filter-box { display: flex; gap: 10px; margin-bottom: 20px; }
.rank-item { display: flex; gap: 20px; padding: 10px; border-bottom: 1px solid #ccc; }
.info-msg { padding: 10px; background: #e3f2fd; border-radius: 8px; color: #0d47a1; font-weight: bold; }
</style>
