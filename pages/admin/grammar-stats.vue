<script setup>
import { ref, onMounted, computed } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();

const availableUnits = ref([]);
const selectedUnit = ref('');
const selectedClass = ref('all'); 

const allQuestions = ref([]);
const allAnswers = ref([]);
const studentDirectory = ref({});
const isLoading = ref(false);
const activeTab = ref('student'); // student 或 question
const studentSort = ref({ key: 'gradeRank', direction: 'asc' });
const questionSort = ref({ key: 'wrong', direction: 'desc' });

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

  const studentIds = [...new Set(allAnswers.value.map(answer => answer.student_id).filter(Boolean))];
  studentDirectory.value = {};
  if (studentIds.length) {
    let studentResult = await supabase.from('students')
      .select('student_id, school_student_id, class_name, seat_number, real_name')
      .in('student_id', studentIds);
    if (studentResult.error && /school_student_id/i.test(studentResult.error.message || '')) {
      studentResult = await supabase.from('students')
        .select('student_id, class_name, seat_number, real_name')
        .in('student_id', studentIds);
    }
    studentDirectory.value = Object.fromEntries((studentResult.data || []).map(student => [student.student_id, student]));
  }
  
  isLoading.value = false;
};

// 動態計算：目前作答紀錄中有哪些班級
const answerClass = (answer) => studentDirectory.value[answer.student_id]?.class_name || answer.class_name || '未分班';
const availableClasses = computed(() => {
  if (!allAnswers.value.length) return [];
  const classes = [...new Set(allAnswers.value.map(answerClass))];
  return classes.filter(Boolean).sort();
});

// 核心過濾器：只留下被選中班級的作答紀錄
const filteredAnswers = computed(() => {
  if (selectedClass.value === 'all') return allAnswers.value;
  return allAnswers.value.filter(ans => answerClass(ans) === selectedClass.value);
});

const gradeOf = (className) => {
  const match = String(className || '').match(/^([789])/);
  return match ? match[1] : null;
};

const buildStudentProgress = (answers) => {
  const map = {};
  answers.forEach(ans => {
    const key = ans.student_id || `${ans.class_name || ''}|${ans.real_name || ''}`;
    if (!map[key]) {
      const student = studentDirectory.value[ans.student_id] || {};
      const className = student.class_name || ans.class_name || '未分班';
      map[key] = {
        studentId: ans.student_id || key,
        schoolStudentId: student.school_student_id || '',
        seatNumber: student.seat_number ?? '',
        name: student.real_name || ans.real_name || '無名氏',
        className,
        grade: gradeOf(className),
        attemptedSet: new Set(),
        correctSet: new Set(),
        totalAttempts: 0,        // 總作答題數 (含重複)
        totalCorrectAttempts: 0, // 總答對次數 (用於計算正確率)
        totalTimeSpent: 0        // 總花費秒數
      };
    }
    
    const s = map[key];
    
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
      studentId: s.studentId,
      schoolStudentId: s.schoolStudentId,
      seatNumber: s.seatNumber,
      name: s.name,
      className: s.className,
      grade: s.grade,
      attemptedUnique: s.attemptedSet.size,
      correctUnique: s.correctSet.size,
      totalAttempts: s.totalAttempts,
      accuracy: accuracy,
      avgTime,
      masteryRate: allQuestions.value.length ? Math.round((s.correctSet.size / allQuestions.value.length) * 100) : 0
    };
  });
};

const allStudentProgress = computed(() => {
  const students = buildStudentProgress(allAnswers.value);
  const gradeGroups = new Map();
  students.forEach(student => {
    if (!student.grade) return;
    if (!gradeGroups.has(student.grade)) gradeGroups.set(student.grade, []);
    gradeGroups.get(student.grade).push(student);
  });
  gradeGroups.forEach(group => {
    group.sort((a, b) => b.correctUnique - a.correctUnique);
    let previousScore = null;
    let rank = 0;
    group.forEach((student, index) => {
      if (student.correctUnique !== previousScore) rank = index + 1;
      student.gradeRank = rank;
      previousScore = student.correctUnique;
    });
  });
  return students;
});

const compareValues = (left, right, direction) => {
  const multiplier = direction === 'asc' ? 1 : -1;
  const leftEmpty = left === null || left === undefined || left === '';
  const rightEmpty = right === null || right === undefined || right === '';
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0;
    return leftEmpty ? 1 : -1;
  }
  if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier;
  return String(left).localeCompare(String(right), 'zh-Hant', { numeric: true, sensitivity: 'base' }) * multiplier;
};

const sortedRows = (rows, sort) => [...rows].sort((a, b) => {
  const primary = compareValues(a[sort.key], b[sort.key], sort.direction);
  if (primary !== 0) return primary;
  return compareValues(`${a.className || ''}${String(a.seatNumber || '').padStart(3, '0')}${a.name || a.text || ''}`, `${b.className || ''}${String(b.seatNumber || '').padStart(3, '0')}${b.name || b.text || ''}`, 'asc');
});

const studentProgress = computed(() => {
  const rows = selectedClass.value === 'all'
    ? allStudentProgress.value
    : allStudentProgress.value.filter(student => student.className === selectedClass.value);
  return sortedRows(rows, studentSort.value);
});

const setSort = (target, key) => {
  if (target.key === key) target.direction = target.direction === 'asc' ? 'desc' : 'asc';
  else { target.key = key; target.direction = 'asc'; }
};
const sortMark = (target, key) => target.key === key ? (target.direction === 'asc' ? '▲' : '▼') : '↕';

// 🌟 分析表二：每一題的答對/答錯次數 (升級：加入平均作答秒數)
const questionStatsBase = computed(() => {
  const map = {};
  allQuestions.value.forEach(q => {
    map[q.id] = { id: q.id, text: q.question_text, correct: 0, wrong: 0, totalTime: 0 };
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
  });
});

const questionStats = computed(() => sortedRows(questionStatsBase.value, questionSort.value));

const formatQ = (text) => String(text || '').replace(/　+/g, ' _____ ').replace(/\s{3,}/g, ' _____ ');
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
          <span class="sort-hint">點擊欄位名稱可切換排序；全年級排名以同年級已作答學生的「已精熟題數」計算，同分同名次。</span>
          <span v-if="selectedClass !== 'all'" style="color: #3f51b5; margin-left: 15px;">
            (目前顯示：{{ selectedClass }} 班)
          </span>
        </p>
        <div class="table-wrapper">
          <table class="retro-table">
            <thead>
              <tr>
                <th><button class="sort-btn" @click="setSort(studentSort, 'className')">班級 {{ sortMark(studentSort, 'className') }}</button></th>
                <th><button class="sort-btn" @click="setSort(studentSort, 'seatNumber')">座號 {{ sortMark(studentSort, 'seatNumber') }}</button></th>
                <th><button class="sort-btn" @click="setSort(studentSort, 'schoolStudentId')">學號 {{ sortMark(studentSort, 'schoolStudentId') }}</button></th>
                <th><button class="sort-btn" @click="setSort(studentSort, 'name')">姓名 {{ sortMark(studentSort, 'name') }}</button></th>
                <th><button class="sort-btn" @click="setSort(studentSort, 'gradeRank')">全年級排名 {{ sortMark(studentSort, 'gradeRank') }}</button></th>
                <th title="不重複計算，代表看過幾種題型"><button class="sort-btn" @click="setSort(studentSort, 'attemptedUnique')">已練習題數 {{ sortMark(studentSort, 'attemptedUnique') }}<br><small>(不重複)</small></button></th>
                <th title="不重複計算，代表答對過幾種題型"><button class="sort-btn" @click="setSort(studentSort, 'correctUnique')">已精熟題數 {{ sortMark(studentSort, 'correctUnique') }}<br><small>(不重複)</small></button></th>
                <th title="所有回合累積的總答題數"><button class="sort-btn" @click="setSort(studentSort, 'totalAttempts')">總作答題數 {{ sortMark(studentSort, 'totalAttempts') }}<br><small>(含重複)</small></button></th>
                <th title="總答對題數 ÷ 總作答題數"><button class="sort-btn" @click="setSort(studentSort, 'accuracy')">整體正確率 {{ sortMark(studentSort, 'accuracy') }}</button></th>
                <th><button class="sort-btn" @click="setSort(studentSort, 'avgTime')">平均作答時間 {{ sortMark(studentSort, 'avgTime') }}</button></th>
                <th width="200"><button class="sort-btn" @click="setSort(studentSort, 'masteryRate')">題庫精熟率 {{ sortMark(studentSort, 'masteryRate') }}</button></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in studentProgress" :key="s.studentId">
                <td>{{ s.className }}</td>
                <td>{{ s.seatNumber || '—' }}</td>
                <td><strong>{{ s.schoolStudentId || '—' }}</strong></td>
                <td><strong>{{ s.name }}</strong></td>
                <td><strong v-if="s.gradeRank" class="rank-badge">{{ s.grade }} 年級第 {{ s.gradeRank }} 名</strong><span v-else>—</span></td>
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
                    <div class="fill" :style="{ width: s.masteryRate + '%' }"></div>
                  </div>
                  <small>{{ s.masteryRate }}%</small>
                </td>
              </tr>
              <tr v-if="studentProgress.length === 0">
                <td colspan="11" style="color: #777; text-align: center;">此班級目前尚無作答紀錄</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeTab === 'question'" class="table-container retro-element">
        <p class="summary">
          點擊欄位名稱可切換遞增或遞減排序
          <span v-if="selectedClass !== 'all'" style="color: #3f51b5; margin-left: 15px;">
            (目前分析對象：{{ selectedClass }} 班)
          </span>
        </p>
        <div class="table-wrapper">
          <table class="retro-table">
            <thead>
              <tr>
                <th><button class="sort-btn" @click="setSort(questionSort, 'text')">題目內容 {{ sortMark(questionSort, 'text') }}</button></th>
                <th width="80"><button class="sort-btn" @click="setSort(questionSort, 'totalAnswers')">作答總數 {{ sortMark(questionSort, 'totalAnswers') }}</button></th>
                <th width="80"><button class="sort-btn" @click="setSort(questionSort, 'correct')">答對次數 {{ sortMark(questionSort, 'correct') }}</button></th>
                <th width="80"><button class="sort-btn" @click="setSort(questionSort, 'wrong')">答錯次數 {{ sortMark(questionSort, 'wrong') }}</button></th>
                <th width="100"><button class="sort-btn" @click="setSort(questionSort, 'correctRate')">答對率 {{ sortMark(questionSort, 'correctRate') }}</button></th>
                <th width="120"><button class="sort-btn" @click="setSort(questionSort, 'avgTime')">平均作答秒數 {{ sortMark(questionSort, 'avgTime') }}</button></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in questionStats" :key="q.id">
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
.sort-hint { display: block; margin-top: 7px; color: #455a64; font-size: 0.9rem; font-weight: normal; }

.table-wrapper { overflow-x: auto; }
.retro-table { width: 100%; border-collapse: collapse; min-width: 1250px; }
.retro-table th, .retro-table td { border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle;}
.retro-table th { background: #e8eaf6; color: #1a237e; line-height: 1.3;}
.sort-btn { width: 100%; padding: 3px; border: 0; background: transparent; color: inherit; font: inherit; font-weight: bold; cursor: pointer; }
.sort-btn:hover, .sort-btn:focus-visible { color: #e65100; text-decoration: underline; outline: none; }
.rank-badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #fff3e0; color: #e65100; white-space: nowrap; }

.progress-bar { width: 100%; background: #eee; height: 15px; border-radius: 10px; overflow: hidden;}
.progress-bar .fill { background: #4caf50; height: 100%; transition: width 0.5s ease;}

.rate-badge { padding: 4px 8px; border-radius: 12px; font-weight: bold; font-size: 0.95rem; display: inline-block;}
.rate-badge.good { background: #e8f5e9; color: #2e7d32; }
.rate-badge.danger { background: #ffebee; color: #c62828; border: 1px solid #c62828; }
</style>
