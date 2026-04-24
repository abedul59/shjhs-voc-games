<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');
const router = useRouter();

const availableUnits = ref([]);
const selectedUnit = ref('');
const allQuestions = ref([]);
const allUnitAnswers = ref([]); // 🌟 存放全校在該單元的所有作答
const isLoading = ref(false);

// 🌟 排行榜控制狀態
const activeTab = ref('me'); // 'me' (我的診斷) 或 'leaderboard' (英雄榜)
const leaderboardScope = ref('class'); // 'class' (班級) 或 'school' (全校)

onMounted(async () => {
  if (!studentCookie.value || !studentCookie.value.id) {
    alert('請先登入才能查看診斷紀錄！');
    router.push('/');
    return;
  }

  // 抓取目前題庫中有哪些單元
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
  const [version, volume, unit] = selectedUnit.value.split('|');

  // 1. 抓取該單元所有題目
  const { data: qData } = await supabase.from('grammar_questions')
    .select('id, question_text')
    .eq('version', version).eq('volume', volume).eq('unit', unit);
  allQuestions.value = qData || [];

  // 🌟 2. 抓取「全校學生」在該單元的所有作答紀錄 (用於排行榜與個人分析)
  const { data: aData } = await supabase.from('grammar_student_answers')
    .select('student_id, real_name, class_name, question_id, is_correct, time_spent')
    .eq('version', version).eq('volume', volume).eq('unit', unit)
    .limit(20000); // 放寬限制，確保能抓到全校資料
  allUnitAnswers.value = aData || [];

  isLoading.value = false;
};

// ==========================================
// 👤「我的診斷」專用數據計算
// ==========================================
const studentAnswers = computed(() => {
  return allUnitAnswers.value.filter(a => a.student_id === studentCookie.value.id);
});

const totalQCount = computed(() => allQuestions.value.length);
const totalAttempts = computed(() => studentAnswers.value.length);
const correctAttempts = computed(() => studentAnswers.value.filter(a => a.is_correct).length);

const overallAccuracy = computed(() => {
  if (totalAttempts.value === 0) return 0;
  return Math.round((correctAttempts.value / totalAttempts.value) * 100);
});

const overallAvgTime = computed(() => {
  if (totalAttempts.value === 0) return 0;
  const totalSecs = studentAnswers.value.reduce((sum, ans) => sum + (ans.time_spent || 0), 0);
  return Math.round(totalSecs / totalAttempts.value);
});

const questionStats = computed(() => {
  const map = {};
  allQuestions.value.forEach(q => {
    map[q.id] = { id: q.id, text: q.question_text, correct: 0, wrong: 0, totalTime: 0, attempted: false, mastered: false };
  });

  studentAnswers.value.forEach(ans => {
    if (map[ans.question_id]) {
      map[ans.question_id].attempted = true;
      if (ans.is_correct) {
        map[ans.question_id].correct++;
        map[ans.question_id].mastered = true;
      } else {
        map[ans.question_id].wrong++;
      }
      map[ans.question_id].totalTime += (ans.time_spent || 0);
    }
  });

  return Object.values(map).map(q => {
    const totalAnsForQ = q.correct + q.wrong;
    q.avgTime = totalAnsForQ > 0 ? Math.round(q.totalTime / totalAnsForQ) : 0;
    q.accuracy = totalAnsForQ > 0 ? Math.round((q.correct / totalAnsForQ) * 100) : 0;
    return q;
  }).sort((a, b) => b.wrong - a.wrong);
});

const masteredCount = computed(() => questionStats.value.filter(q => q.mastered).length);
const uniqueAttemptedCount = computed(() => questionStats.value.filter(q => q.attempted).length);

// ==========================================
// 🏆「風雲排行榜」專用數據計算
// ==========================================
const leaderboardData = computed(() => {
  const map = {};
  
  // 依照選擇的範圍過濾數據 (全校 vs 班級)
  const filteredAnswers = leaderboardScope.value === 'class'
    ? allUnitAnswers.value.filter(a => a.class_name === studentCookie.value.class)
    : allUnitAnswers.value;

  filteredAnswers.forEach(ans => {
    if (!map[ans.student_id]) {
      map[ans.student_id] = {
        student_id: ans.student_id,
        name: ans.real_name || '無名氏',
        className: ans.class_name || '未分班',
        attemptedSet: new Set(),
        correctSet: new Set(),
        totalAttempts: 0,
        totalCorrectAttempts: 0,
        totalTimeSpent: 0
      };
    }
    const s = map[ans.student_id];
    s.attemptedSet.add(ans.question_id);
    if (ans.is_correct) s.correctSet.add(ans.question_id);
    s.totalAttempts++;
    if (ans.is_correct) s.totalCorrectAttempts++;
    s.totalTimeSpent += (ans.time_spent || 0);
  });

  return Object.values(map).map(s => {
    return {
      student_id: s.student_id,
      name: s.name,
      className: s.className,
      correctUnique: s.correctSet.size, // 精熟度
      totalAttempts: s.totalAttempts,   // 刷題量
      accuracy: s.totalAttempts > 0 ? Math.round((s.totalCorrectAttempts / s.totalAttempts) * 100) : 0,
      avgTime: s.totalAttempts > 0 ? Math.round(s.totalTimeSpent / s.totalAttempts) : 0
    };
  }).sort((a, b) => {
    // 排序邏輯：1. 精熟度最高 ➔ 2. 正確率最高 ➔ 3. 刷題量最多
    if (b.correctUnique !== a.correctUnique) return b.correctUnique - a.correctUnique; 
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy; 
    return b.totalAttempts - a.totalAttempts; 
  });
});

const formatQ = (text) => text.replace(/　+/g, ' _____ ').replace(/\s{3,}/g, ' _____ ');
</script>

<template>
  <div class="stats-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <h1>📊 我的文法診斷簿</h1>
    </div>

    <div class="filter-box retro-element">
      <label>選擇單元：</label>
      <select v-model="selectedUnit" @change="fetchStats" class="retro-input">
        <option v-for="u in availableUnits" :key="u" :value="u">
          {{ u.split('|').join(' - ') }}
        </option>
      </select>
    </div>

    <div v-if="isLoading" class="loading">正在讀取大數據與排行... ⏳</div>
    <div v-else>
      
      <div class="tabs">
        <button :class="{ active: activeTab === 'me' }" @click="activeTab = 'me'">👤 我的診斷</button>
        <button :class="{ active: activeTab === 'leaderboard' }" @click="activeTab = 'leaderboard'">🏆 風雲排行榜</button>
      </div>

      <div v-if="activeTab === 'me'" class="tab-content">
        <div class="dashboard">
          <div class="dash-card attempt-card">
            <div class="title" title="您實際點擊送出答案的總次數">📝 練習總題數 (含重複)</div>
            <div class="value">{{ totalAttempts }} <span class="unit">題</span></div>
            <div class="sub-stat">無重複：{{ uniqueAttemptedCount }} / {{ totalQCount }} 題</div>
            <div class="progress-bar">
              <div class="fill" :style="{ width: (uniqueAttemptedCount / totalQCount * 100) + '%' }"></div>
            </div>
          </div>
          
          <div class="dash-card accuracy-card">
            <div class="title" title="總答對次數 ÷ 總作答次數">🎯 整體正確率</div>
            <div class="value">{{ overallAccuracy }} <span class="unit">%</span></div>
            <div class="progress-bar"><div class="fill" :style="{ width: overallAccuracy + '%' }"></div></div>
          </div>

          <div class="dash-card time-card">
            <div class="title" title="您在這個單元中，每一題平均思考的時間">⏱️ 平均作答速度</div>
            <div class="value">{{ overallAvgTime }} <span class="unit">秒/題</span></div>
          </div>

          <div class="dash-card master-card">
            <div class="title" title="您曾經答對過的題型數量">🏆 題型精熟度</div>
            <div class="value">{{ masteredCount }} <span class="unit">/ {{ totalQCount }} 種</span></div>
            <div class="progress-bar"><div class="fill" :style="{ width: (masteredCount / totalQCount * 100) + '%' }"></div></div>
          </div>
        </div>

        <div class="table-container retro-element">
          <h3 class="table-title">📝 我的弱點分析 (錯最多的排最上面)</h3>
          <div class="table-wrapper">
            <table class="retro-table">
              <thead>
                <tr>
                  <th>狀態</th>
                  <th>題目內容</th>
                  <th width="80">答對次數</th>
                  <th width="80">答錯次數</th>
                  <th width="80">正確率</th>
                  <th width="100">平均秒數</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(q, idx) in questionStats" :key="idx" :class="{ 'not-attempted': !q.attempted }">
                  <td class="status-cell">
                    <span v-if="q.mastered" class="badge master">✅ 已精熟</span>
                    <span v-else-if="q.attempted" class="badge warning">⚠️ 待加強</span>
                    <span v-else class="badge neutral">➖ 未作答</span>
                  </td>
                  <td class="q-text">{{ formatQ(q.text) }}</td>
                  <td class="count-cell correct-text">{{ q.correct }}</td>
                  <td class="count-cell wrong-text">{{ q.wrong }}</td>
                  <td class="count-cell">
                    <span v-if="q.attempted" :class="q.accuracy >= 60 ? 'correct-text' : 'wrong-text'">{{ q.accuracy }}%</span>
                    <span v-else style="color: #aaa;">--</span>
                  </td>
                  <td class="count-cell" style="color: #5c6bc0;">
                    <span v-if="q.attempted">{{ q.avgTime }}s</span>
                    <span v-else style="color: #aaa;">--</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'leaderboard'" class="tab-content">
        
        <div class="scope-toggles">
          <button class="scope-btn" :class="{ active: leaderboardScope === 'class' }" @click="leaderboardScope = 'class'">🏫 我的班級</button>
          <button class="scope-btn" :class="{ active: leaderboardScope === 'school' }" @click="leaderboardScope = 'school'">🌍 全校排行</button>
        </div>

        <div class="table-container retro-element">
          <h3 class="table-title" style="color: #ff9800;">
            🏆 {{ leaderboardScope === 'class' ? '班級風雲榜' : '全校風雲榜' }}
          </h3>
          <p style="color: #666; margin-top: -10px; margin-bottom: 15px;">
            排序規則：優先比較「精熟度」，同分時比較「正確率」，再同分時比較「刷題量」。
          </p>

          <div class="table-wrapper">
            <table class="retro-table leaderboard-table">
              <thead>
                <tr>
                  <th width="80">排名</th>
                  <th width="100">班級</th>
                  <th>姓名</th>
                  <th width="150" title="答對過幾種不重複的題型">🏆 精熟度 <br><small>(滿分 {{ totalQCount }} 種)</small></th>
                  <th width="120" title="總答對次數 ÷ 總作答次數">🎯 正確率</th>
                  <th width="120" title="實際點擊送出答案的總次數">📝 刷題量 <br><small>(含重複)</small></th>
                  <th width="120">⏱️ 平均作答</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="leaderboardData.length === 0"><td colspan="7" style="color:#777;">目前還沒有人挑戰這個單元喔！</td></tr>
                <tr v-for="(student, idx) in leaderboardData" :key="student.student_id" 
                    :class="{ 'highlight-me': student.student_id === studentCookie.id }">
                  
                  <td class="rank-cell">
                    <span v-if="idx === 0" class="medal">🥇</span>
                    <span v-else-if="idx === 1" class="medal">🥈</span>
                    <span v-else-if="idx === 2" class="medal">🥉</span>
                    <span v-else class="rank-num">{{ idx + 1 }}</span>
                  </td>
                  
                  <td>{{ student.className }}</td>
                  <td style="font-weight: bold; font-size: 1.1rem;">
                    {{ student.name }}
                    <span v-if="student.student_id === studentCookie.id" class="me-tag">(我)</span>
                  </td>
                  
                  <td class="count-cell correct-text">{{ student.correctUnique }} <small>種</small></td>
                  <td class="count-cell">
                    <span :class="student.accuracy >= 60 ? 'correct-text' : 'wrong-text'">{{ student.accuracy }}%</span>
                  </td>
                  <td class="count-cell" style="color: #0288d1;">{{ student.totalAttempts }} <small>題</small></td>
                  <td class="count-cell" style="color: #5c6bc0;">{{ student.avgTime }} <small>s</small></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.stats-container { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px;}
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.filter-box { background: white; padding: 15px; border-radius: 12px; border: 2px solid #ccc; margin-bottom: 20px; display: flex; gap: 15px; align-items: center;}
.retro-input { padding: 8px 15px; border-radius: 8px; border: 2px solid #9fa8da; font-size: 1.1rem; font-weight: bold;}

/* 🌟 頁籤樣式 */
.tabs { display: flex; gap: 10px; margin-bottom: 20px;}
.tabs button { flex: 1; padding: 15px; font-size: 1.3rem; font-weight: 900; border: 2px solid #ccc; background: #f5f5f5; border-radius: 12px 12px 0 0; border-bottom: none; cursor: pointer; transition: 0.2s; color: #777;}
.tabs button.active { background: #3f51b5; color: white; border-color: #3f51b5; padding-top: 18px; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2);}
.tab-content { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* 🌟 排行榜範圍切換按鈕 */
.scope-toggles { display: flex; justify-content: center; gap: 15px; margin-bottom: 20px; }
.scope-btn { padding: 10px 25px; font-size: 1.1rem; font-weight: bold; background: white; border: 2px solid #ff9800; color: #ff9800; border-radius: 25px; cursor: pointer; transition: 0.2s;}
.scope-btn.active { background: #ff9800; color: white; box-shadow: 0 4px 0 #e65100; transform: translateY(-2px);}

.dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 30px;}
.dash-card { background: white; padding: 20px; border-radius: 16px; border: 3px solid; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: center;}
.dash-card .title { font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;}
.dash-card .value { font-size: 2.5rem; font-weight: 900;}
.dash-card .unit { font-size: 1.1rem; color: #666;}
.dash-card .sub-stat { font-size: 0.95rem; font-weight: bold; margin-top: 10px; opacity: 0.85; }

.attempt-card { border-color: #29b6f6; background: #e1f5fe; color: #0288d1;}
.accuracy-card { border-color: #ffb300; background: #fff8e1; color: #f57f17;}
.time-card { border-color: #ab47bc; background: #ede7f6; color: #512da8;}
.master-card { border-color: #66bb6a; background: #e8f5e9; color: #2e7d32;}

.progress-bar { width: 100%; background: rgba(0,0,0,0.1); height: 10px; border-radius: 5px; margin-top: 8px; overflow: hidden;}
.progress-bar .fill { height: 100%; background: currentColor; transition: width 0.5s ease;}

.table-container { background: white; padding: 20px; border-radius: 12px; border: 2px solid #ccc;}
.table-title { margin-top: 0; color: #d32f2f;}
.table-wrapper { overflow-x: auto; }
.retro-table { width: 100%; border-collapse: collapse; margin-top: 15px; min-width: 700px;}
.retro-table th, .retro-table td { border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle;}
.retro-table th { background: #f5f5f5; color: #333;}
.q-text { text-align: left !important; font-size: 1.1rem; max-width: 400px; line-height: 1.4;}
.not-attempted { opacity: 0.6; background: #fafafa;}
.count-cell { font-size: 1.2rem; font-weight: bold;}
.correct-text { color: #2e7d32;}
.wrong-text { color: #c62828;}

.badge { padding: 5px 10px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; white-space: nowrap; display: inline-block;}
.badge.master { background: #e8f5e9; color: #2e7d32; border: 1px solid #4caf50;}
.badge.warning { background: #ffebee; color: #c62828; border: 1px solid #f44336;}
.badge.neutral { background: #eeeeee; color: #757575; border: 1px solid #bdbdbd;}

/* 🌟 排行榜專屬樣式 */
.leaderboard-table th { background: #fff3e0; color: #e65100; border-color: #ffcc80; font-size: 1.05rem;}
.rank-cell { font-size: 1.5rem; font-weight: 900; }
.medal { font-size: 2rem; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.2)); }
.rank-num { color: #757575; }
.highlight-me { background-color: #e8f5e9; border: 2px solid #4caf50; }
.highlight-me td { border-top: 2px solid #4caf50; border-bottom: 2px solid #4caf50; }
.me-tag { background: #4caf50; color: white; font-size: 0.8rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px; vertical-align: middle;}
</style>