<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const students = ref([]);
const selectedStudent = ref(null);

// 🌟 卡包切換
const adminActiveSet = ref(1);

const manualUnlocks1 = ref([]);
const manualUnlocks2 = ref([]);
const manualUnlocks3 = ref([]); // 🌟 新增第三套
const newWordInput = ref('');
const isSaving = ref(false);

// 🌟 塔羅牌全域規則設定
const unlockCount = ref(10);
const unlockScore = ref(60);
const isSavingRules = ref(false);

// 讀取設定 (將這段放進 onMounted 裡面)
onMounted(async () => {
  const { data: sysData } = await supabase.from('system_settings').select('tarot_unlock_count, tarot_unlock_score').eq('id', 1).single();
  if (sysData) {
    unlockCount.value = sysData.tarot_unlock_count || 10;
    unlockScore.value = sysData.tarot_unlock_score || 0;
  }
  // 抓學生資料
  const { data } = await supabase.from('students').select('*').order('class_name').order('seat_number');
  if (data) students.value = data;
});

// 儲存設定功能
const saveRules = async () => {
  isSavingRules.value = true;
  await supabase.from('system_settings').update({ 
    tarot_unlock_count: unlockCount.value, 
    tarot_unlock_score: unlockScore.value 
  }).eq('id', 1);
  setTimeout(() => { isSavingRules.value = false; alert('✅ 解鎖規則已更新！'); }, 500);
};

const selectStudent = (student) => {
  selectedStudent.value = student;
  manualUnlocks1.value = student.unlocked_tarot || [];
  manualUnlocks2.value = student.unlocked_tarot_2 || [];
  manualUnlocks3.value = student.unlocked_tarot_3 || []; // 🌟 讀取第三套
  newWordInput.value = '';
};

const currentUnlocks = computed(() => {
  if (adminActiveSet.value === 1) return manualUnlocks1.value;
  if (adminActiveSet.value === 2) return manualUnlocks2.value;
  return manualUnlocks3.value; // 🌟 第三套
});

const addWord = async () => {
  const word = newWordInput.value.trim().toLowerCase();
  if (!word || currentUnlocks.value.includes(word)) return;
  
  if (adminActiveSet.value === 1) manualUnlocks1.value.push(word);
  else if (adminActiveSet.value === 2) manualUnlocks2.value.push(word);
  else manualUnlocks3.value.push(word); // 🌟 寫入第三套
  
  newWordInput.value = '';
  await saveToSupabase();
};

const removeWord = async (index) => {
  if (adminActiveSet.value === 1) manualUnlocks1.value.splice(index, 1);
  else if (adminActiveSet.value === 2) manualUnlocks2.value.splice(index, 1);
  else manualUnlocks3.value.splice(index, 1); // 🌟 刪除第三套
  await saveToSupabase();
};

const saveToSupabase = async () => {
  isSaving.value = true;
  const payload = { 
    unlocked_tarot: manualUnlocks1.value,
    unlocked_tarot_2: manualUnlocks2.value,
    unlocked_tarot_3: manualUnlocks3.value // 🌟 存檔第三套
  };
  
  await supabase.from('students').update(payload).eq('student_id', selectedStudent.value.student_id);
  
  const sIndex = students.value.findIndex(s => s.student_id === selectedStudent.value.student_id);
  if (sIndex !== -1) {
    students.value[sIndex].unlocked_tarot = [...manualUnlocks1.value];
    students.value[sIndex].unlocked_tarot_2 = [...manualUnlocks2.value];
    students.value[sIndex].unlocked_tarot_3 = [...manualUnlocks3.value]; // 🌟 更新本地資料
  }
  setTimeout(() => isSaving.value = false, 500);
};
</script>

<template>
  <div class="admin-tarot-container">
    <div class="header">
      <h1>🔮 塔羅牌後台管理中心</h1>
      <NuxtLink to="/admin" class="back-btn">返回後台首頁</NuxtLink>
    </div>

    <div class="rules-panel">
      <h3>⚙️ 遊戲解鎖規則設定 (全站通用)</h3>
      <div class="rules-inputs">
        <label>需玩滿 <input type="number" v-model="unlockCount" class="rule-input" min="1"/> 次</label>
        <label>且每次分數需 ≥ <input type="number" v-model="unlockScore" class="rule-input" min="0"/> 分</label>
        <button @click="saveRules" class="save-rule-btn">{{ isSavingRules ? '儲存中...' : '儲存規則' }}</button>
      </div>
    </div>

    <div class="layout">
      <div class="student-list">
        <h3>選擇學生</h3>
        <div 
          v-for="student in students" :key="student.id" class="student-item"
          :class="{ active: selectedStudent?.id === student.id }" @click="selectStudent(student)"
        >
          {{ student.class_name }}班 {{ student.seat_number }}號 - {{ student.name }}
        </div>
      </div>

      <div class="editor-panel" v-if="selectedStudent">
        <div class="panel-header">
          <h2>編輯 {{ selectedStudent.name }} 的解鎖紀錄</h2>
          <a :href="`/tarot?student_id=${selectedStudent.student_id}`" target="_blank" class="preview-btn">
            👁️ 預覽該學生的圖鑑
          </a>
        </div>

        <div class="admin-tabs">
          <button :class="['admin-tab-btn', { active: adminActiveSet === 1 }]" @click="adminActiveSet = 1">🌙 經典</button>
          <button :class="['admin-tab-btn', { active: adminActiveSet === 2 }]" @click="adminActiveSet = 2">✨ 幻境</button>
          <button :class="['admin-tab-btn', { active: adminActiveSet === 3 }]" @click="adminActiveSet = 3">🔥 第三彈</button> </div>

        <div class="add-box">
          <input v-model="newWordInput" @keyup.enter="addWord" :placeholder="`輸入單字贈送至【第 ${adminActiveSet} 彈】`" class="word-input" />
          <button @click="addWord" class="add-btn">➕ 贈送卡片</button>
          <span v-if="isSaving" class="saving-text">儲存中...</span>
        </div>

        <div class="unlocked-list">
          <div v-for="(word, index) in currentUnlocks" :key="index" class="word-tag">
            {{ word }}
            <a 
              :href="`/tarot?student_id=${selectedStudent.student_id}&reveal_word=${word}&set=${adminActiveSet}`" 
              target="_blank" 
              class="mini-preview-btn"
              title="預覽此卡解鎖動畫"
            >
              👁️
            </a>
            <button @click="removeWord(index)" class="del-btn">✖</button>
          </div>
          <div v-if="currentUnlocks.length === 0" class="empty-text">目前此卡包沒有手動贈送的卡片</div>
        </div>
      </div>
      
      <div v-else class="editor-panel empty-state">👈 請先從左側選擇一位學生</div>
    </div>
  </div>
</template>

<style scoped>
.rules-panel { background: #e3f2fd; border: 2px solid #90caf9; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; }
.rules-panel h3 { margin: 0 0 10px 0; color: #0277bd; }
.rules-inputs { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; font-weight: bold; }
.rule-input { width: 60px; padding: 5px; font-size: 1.1rem; text-align: center; border-radius: 4px; border: 1px solid #ccc; font-weight: bold;}
.save-rule-btn { background: #0288d1; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.save-rule-btn:hover { background: #01579b; }
.mini-preview-btn { text-decoration: none; font-size: 1rem; margin: 0 5px; cursor: pointer; filter: grayscale(1); }
.mini-preview-btn:hover { filter: grayscale(0); transform: scale(1.2); }

.admin-tarot-container { padding: 20px; max-width: 1200px; margin: 0 auto; color: #333;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #ccc; }
.back-btn { background: #eee; padding: 8px 15px; text-decoration: none; color: #333; border-radius: 6px; font-weight: bold; border: 1px solid #ccc;}
.layout { display: flex; gap: 20px; height: 75vh; }
.student-list { flex: 1; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; overflow-y: auto; padding: 10px; }
.student-item { padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
.student-item:hover { background: #eef; }
.student-item.active { background: #4a90e2; color: white; font-weight: bold; }
.editor-panel { flex: 2; background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; }
.empty-state { justify-content: center; align-items: center; font-size: 1.5rem; color: #999; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.panel-header h2 { margin: 0; }
.preview-btn { background: #28a745; color: white; padding: 8px 15px; text-decoration: none; border-radius: 6px; font-weight: bold; display: flex; align-items: center; gap: 5px;}
.admin-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;}
.admin-tab-btn { padding: 8px 16px; border: none; background: #f0f0f0; color: #555; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.admin-tab-btn.active { background: #007bff; color: white; }
.add-box { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
.word-input { flex: 1; padding: 10px; font-size: 1.1rem; border: 1px solid #ccc; border-radius: 6px; }
.add-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.saving-text { color: #28a745; font-weight: bold; font-size: 0.9rem; }
.unlocked-list { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
.word-tag { background: #e2e3e5; padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: bold; border: 1px solid #ccc;}
.del-btn { background: none; border: none; color: #dc3545; font-size: 1.2rem; cursor: pointer; font-weight: bold; padding: 0;}
.empty-text { color: #999; font-style: italic; width: 100%; text-align: center; margin-top: 20px;}
</style>