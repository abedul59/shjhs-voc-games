<script setup>
import { ref, onMounted, computed } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const availableUnits = ref([]);
const selectedUnit = ref('');
const selectedClass = ref('all'); 

const allQuestions = ref([]);
const allAnswers = ref([]);
const isLoading = ref(false);
const activeTab = ref('student'); // student 或 question

onMounted(async () => {
  // 取得目前題庫中有哪些「版本-冊數-單元」
  const { data } = await supabase.from('grammar_questions').select('version, volume, unit');
  if (data) {
    const unique = new Set(data.map(q => `${q.version}|${q.volume}|${q.unit}`));
    availableUnits.value = Array.from(unique);
    if (availableUnits.value.length > 0) {
      selectedUnit.value = availableUnits.value[0];
      fetchStats();
    }
  }
});

const fetchStats = async () => {
  if (!selectedUnit.value) return;
  isLoading.value = true;
  selectedClass.value = 'all'; 

  const [version, volume, unit] = selectedUnit.value.split('|');

  // 1. 抓取該單元所有題目
  const { data: qData } = await supabase.from('grammar_questions')
    .select('id, question_text')
    .eq('version', version).eq('volume', volume).eq('unit', unit);
  allQuestions.value = qData || [];

  // 2. 抓取該單元所有學生的作答紀錄
  const { data: aData } = await supabase.from('grammar_student_answers')
    .select('*')
    .eq('version', version).eq('volume', volume).eq('unit', unit);
  allAnswers.value = aData || [];
  
  isLoading.value = false;
};

// 動態計算：目前作答紀錄中有哪些班級
const availableClasses = computed(() => {
  if (!allAnswers.value.length) return [];
  const classes = [...new Set(allAnswers.value.map(ans => ans.class_name || '未分班'))];
  return classes.filter(Boolean).sort();
});

// 核心過濾器：只留下被選中班級的作答紀錄
const filteredAnswers = computed(() => {
  if (selectedClass.value === 'all') return allAnswers.value;
  return allAnswers.value.filter(ans => (ans.class_name || '未分班') === selectedClass.value);
});

// 🌟 分析表一：學生的完成度與精熟度 (升級：加入總題數、正確率、平均作答時間)
const studentProgress = computed(() => {
  const map = {};
  filteredAnswers.value.forEach(ans => {
    if (!map[ans.student_id]) {
      map[ans.student_id] = {
        name: ans.real_name || '無名氏',
        className: ans.class_name || '未分班',
        attemptedSet: new Set(),
        correctSet: new Set(),
        totalAttempts: 0,        // 總作答題數 (含重複)
        totalCorrectAttempts: 0, // 總答對次數 (用於計算正確率)
        totalTimeSpent: 0        // 總花費秒數
      };
    }
    
    const s = map[ans.student_id];
    
    // 計算不重複的題目涵蓋率
    s.attemptedSet.add(ans.question_id);
    if (ans.is_correct) s.correctSet.add(ans.question_id);
    
    // 計算總體的刷題量與正確率
    s.totalAttempts++;
    if (ans.is_correct) s.totalCorrectAttempts++;
    
    // 累加作答時間 (假設資料表時間欄位為 time_spent，若舊資料沒有則預設為 0)
    s.totalTimeSpent += (ans.time_spent || 0); 
  });

  return Object.values(map).map(s => {
    const accuracy = s.totalAttempts > 0 ? Math.round((s.totalCorrectAttempts / s.totalAttempts) * 100) : 0;
    const avgTime = s.totalAttempts > 0 ? Math.round(s.totalTimeSpent / s.totalAttempts) : 0;

    return {
      name: s.name,
      className: s.className,
      attemptedUnique: s.attemptedSet.size,
      correctUnique: s.correctSet.size,
      totalAttempts: s.totalAttempts,
      accuracy: accuracy,
      avgTime: avgTime
    };
  }).sort((a, b) => b.correctUnique - a.correctUnique); // 依已精熟題數排序
});

// 🌟 分析表二：每一題的答對/答錯次數 (升級：加入平均作答秒數)
const questionStats = computed(() => {
  const map = {};
  allQuestions.value.forEach(q => {
    map[q.id] = { text: q.question_text, correct: 0, wrong: 0, totalTime: 0 };
  });

  filteredAnswers.value.forEach(ans => {
    if (map[ans.question_id]) {
      if (ans.is_correct) map[ans.question_id].correct++;
      else map[ans.question_id].wrong++;
      
      // 累加該題的作答時間
      map[ans.question_id].totalTime += (ans.time_spent || 0);
    }
  });

  return Object.values(map).map(q => {
    const totalAnswers = q.correct + q.wrong;
    const correctRate = totalAnswers > 0 ? Math.round((q.correct / totalAnswers) * 100) : 0;
    const avgTime = totalAnswers > 0 ? Math.round(q.totalTime / totalAnswers) : 0;

    return { ...q, totalAnswers, correctRate, avgTime };
  }).sort((a, b) => b.wrong - a.wrong); // 錯最多的排前面
});

const formatQ = (text) => text.replace(/　+/g, ' _____ ').replace(/\s{3,}/g, ' _____ ');
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <NuxtLink to="/admin/manage-grammar" class="back-btn">⬅ 返回題庫管理</NuxtLink>
      <h1>📊 文法遊樂園 - 學習診斷分析</h1>
    </div>

    <div class="filter-box retro-element">
      <div class="filter-item">
        <label>選擇分析單元：</label>
        <select v-model="selectedUnit" @change="fetchStats" class="retro-input">
          <option v-for="u in availableUnits" :key="u" :value="u">
            {{ u.split('|').join(' - ') }}
          </option>
        </select>
      </div>

      <div v-if="availableClasses.length > 0" class="filter-item">
        <label style="color: #e65100;">篩選班級：</label>
        <select v-model="selectedClass" class="retro-input class-select">
          <option value="all">顯示所有班級 (全校)</option>
          <option v-for="c in availableClasses" :key="c" :value="c">
            {{ c }} 班
          </option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="loading">正在計算數據中... ⏳</div>
    <div v-else>
      <div class="tabs">
        <button :class="{ active: activeTab === 'student' }" @click="activeTab = 'student'">👨‍🎓 學生學習進度</button>
        <button :class="{ active: activeTab === 'question' }" @click="activeTab = 'question'">📝 題目錯誤率分析</button>
      </div>

      <div v-if="activeTab === 'student'" class="table-container retro-element">
        <p class="summary">
          此單元總題數：<strong>{{ allQuestions.length }} 題</strong> 
          <span v-if="selectedClass !== 'all'" style="color: #3f51b5; margin-left: 15px;">
            (目前顯示：{{ selectedClass }} 班)
          </span>
        </p>
        <div class="table-wrapper">
          <table class="retro-table">
            <thead>
              <tr>
                <th>班級</th>
                <th>姓名</th>
                <th title="不重複計算，代表看過幾種題型">已練習題數<br><small>(不重複)</small></th>
                <th title="不重複計算，代表答對過幾種題型">已精熟題數<br><small>(不重複)</small></th>
                <th title="所有回合累積的總答題數">總作答題數<br><small>(含重複)</small></th>
                <th title="總答對題數 ÷ 總作答題數">整體正確率</th>
                <th>平均作答時間</th>
                <th width="200">題庫精熟率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in studentProgress" :key="s.name">
                <td>{{ s.className }}</td>
                <td><strong>{{ s.name }}</strong></td>
                <td>{{ s.attemptedUnique }} 題</td>
                <td style="color: #2e7d32; font-weight: bold;">{{ s.correctUnique }} 題</td>
                <td style="color: #1976d2; font-weight: bold;">{{ s.totalAttempts }} 題</td>
                <td>
                  <span class="rate-badge" :class="s.accuracy >= 60 ? 'good' : 'danger'">
                    {{ s.accuracy }}%
                  </span>
                </td>
                <td>{{ s.avgTime }} 秒</td>
                <td>
                  <div class="progress-bar">
                    <div class="fill" :style="{ width: (s.correctUnique / allQuestions.length * 100) + '%' }"></div>
                  </div>
                </td>
              </tr>
              <tr v-if="studentProgress.length === 0">
                <td colspan="8" style="color: #777; text-align: center;">此班級目前尚無作答紀錄</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'question'" class="table-container retro-element">
        <p class="summary">
          排序方式：錯誤次數最多的題目排在最上方
          <span v-if="selectedClass !== 'all'" style="color: #3f51b5; margin-left: 15px;">
            (目前分析對象：{{ selectedClass }} 班)
          </span>
        </p>
        <div class="table-wrapper">
          <table class="retro-table">
            <thead>
              <tr>
                <th>題目內容</th>
                <th width="80">作答總數</th>
                <th width="80">答對次數</th>
                <th width="80">答錯次數</th>
                <th width="100">答對率</th>
                <th width="120">平均作答秒數</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(q, idx) in questionStats" :key="idx">
                <td style="max-width: 400px; text-align: left;">{{ formatQ(q.text) }}</td>
                <td>{{ q.totalAnswers }}</td>
                <td style="color: #2e7d32; font-weight: bold;">✅ {{ q.correct }}</td>
                <td style="color: #c62828; font-weight: bold;">❌ {{ q.wrong }}</td>
                <td>
                  <span v-if="q.totalAnswers > 0" class="rate-badge" :class="q.correctRate >= 50 ? 'good' : 'danger'">
                    {{ q.correctRate }}%
                  </span>
                  <span v-else style="color: #aaa">無人作答</span>
                </td>
                <td>{{ q.avgTime }} 秒</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px;}
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}

.filter-box { background: white; padding: 15px 20px; border-radius: 12px; border: 2px solid #ccc; margin-bottom: 20px; display: flex; gap: 30px; align-items: center; flex-wrap: wrap;}
.filter-item { display: flex; align-items: center; gap: 10px; }
.retro-input { padding: 8px 15px; border-radius: 8px; border: 2px solid #9fa8da; font-size: 1.1rem; font-weight: bold;}
.class-select { border-color: #ffb74d; color: #e65100; min-width: 180px; } 

.tabs { display: flex; gap: 10px; margin-bottom: 15px;}
.tabs button { flex: 1; padding: 12px; font-size: 1.2rem; font-weight: bold; border: 2px solid #ccc; background: #f5f5f5; border-radius: 12px 12px 0 0; border-bottom: none; cursor: pointer; transition: 0.2s;}
.tabs button.active { background: #3f51b5; color: white; border-color: #3f51b5; padding-top: 15px;}

.table-container { background: white; padding: 20px; border-radius: 0 12px 12px 12px; border: 2px solid #3f51b5;}
.summary { font-size: 1.1rem; color: #e65100; font-weight: bold; margin-top: 0; margin-bottom: 15px;}

.table-wrapper { overflow-x: auto; }
.retro-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.retro-table th, .retro-table td { border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle;}
.retro-table th { background: #e8eaf6; color: #1a237e; line-height: 1.3;}

.progress-bar { width: 100%; background: #eee; height: 15px; border-radius: 10px; overflow: hidden;}
.progress-bar .fill { background: #4caf50; height: 100%; transition: width 0.5s ease;}

.rate-badge { padding: 4px 8px; border-radius: 12px; font-weight: bold; font-size: 0.95rem; display: inline-block;}
.rate-badge.good { background: #e8f5e9; color: #2e7d32; }
.rate-badge.danger { background: #ffebee; color: #c62828; border: 1px solid #c62828; }
</style>