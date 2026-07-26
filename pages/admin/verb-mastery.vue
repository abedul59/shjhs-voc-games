<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const isAdminCookie = useCookie('isAdmin');
const authCookie = useCookie('teacher_auth');

// 權限核心防護
onMounted(() => {
  const hasAuth = isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || (authCookie.value && authCookie.value.classes);
  if (!hasAuth) navigateTo('/admin/login');
});

const studentsMap = ref({});
const classesList = ref([]);
const rawMasteryData = ref([]);
const rawVerbData = ref([]);

const selectedClass = ref('ALL');
const selectedStudentId = ref('ALL');
const searchKeyword = ref('');
const isLoading = ref(true);

onMounted(async () => {
  // 1. 抓取學生資料
  const { data: sData } = await supabase.from('students').select('student_id, class_name, real_name, hidden_name').limit(10000);
  if (sData) {
    const cSet = new Set();
    sData.forEach(s => {
      studentsMap.value[s.student_id] = s;
      if (s.class_name) cSet.add(s.class_name);
    });
    classesList.value = Array.from(cSet).sort();
  }

  // 2. 抓取不規則動詞
  const { data: vData } = await supabase.from('irregular_verbs').select('*');
  if (vData) rawVerbData.value = vData;

  // 3. 抓取精熟度總表
  const { data: mData } = await supabase.from('verb_mastery').select('*').limit(10000);
  if (mData) rawMasteryData.value = mData;

  isLoading.value = false;
});

// 當班級切換時，重置學生選擇
const onClassChange = () => {
  selectedStudentId.value = 'ALL';
};

// 篩選出目前選取班級的學生清單
const filteredStudentsList = computed(() => {
  const students = Object.values(studentsMap.value);
  if (selectedClass.value === 'ALL') return students;
  return students.filter(s => s.class_name === selectedClass.value);
});

// 🌟 1. 宏觀分析計算：篩選出特定班級後，重新統整各動詞的精熟度
const processedAnalytics = computed(() => {
  if (rawVerbData.value.length === 0) return [];

  const verbStats = {};
  rawVerbData.value.forEach(v => {
    verbStats[v.base_form] = {
      base_form: v.base_form,
      past_tense: v.past_tense,
      past_participle: v.past_participle,
      chinese: v.chinese,
      total_correct: 0,
      total_wrong: 0,
      student_count: 0
    };
  });

  rawMasteryData.value.forEach(m => {
    const student = studentsMap.value[m.student_id];
    if (selectedClass.value !== 'ALL' && (!student || student.class_name !== selectedClass.value)) {
      return;
    }

    if (verbStats[m.base_form]) {
      verbStats[m.base_form].total_correct += m.correct_count;
      verbStats[m.base_form].total_wrong += m.wrong_count;
      verbStats[m.base_form].student_count += 1;
    }
  });

  return Object.values(verbStats).map(v => {
    const total = v.total_correct + v.total_wrong;
    const rate = total > 0 ? Math.round((v.total_correct / total) * 100) : 100;
    return {
      ...v,
      total_attempts: total,
      success_rate: rate
    };
  }).filter(v => v.total_attempts > 0);
});

// 排行榜 1：答錯次數最多（盲點排行榜 Top 10）
const topStruggledVerbs = computed(() => {
  return [...processedAnalytics.value]
    .sort((a, b) => b.total_wrong - a.total_wrong)
    .slice(0, 10);
});

// 排行榜 2：整體正確率低（容易混淆動詞榜）
const lowestRateVerbs = computed(() => {
  return [...processedAnalytics.value]
    .sort((a, b) => a.success_rate - b.success_rate)
    .slice(0, 10);
});

// 🌟 2. 個別學生明細計算：查詢特定學生 / 班級之各動詞詳細練習數據
const studentVerbDetails = computed(() => {
  if (rawVerbData.value.length === 0) return [];

  const verbMap = {};
  rawVerbData.value.forEach(v => {
    verbMap[v.base_form] = {
      base_form: v.base_form,
      past_tense: v.past_tense,
      past_participle: v.past_participle,
      chinese: v.chinese
    };
  });

  let records = rawMasteryData.value;

  // 班級過濾
  if (selectedClass.value !== 'ALL') {
    records = records.filter(m => {
      const student = studentsMap.value[m.student_id];
      return student && student.class_name === selectedClass.value;
    });
  }

  // 個人過濾
  if (selectedStudentId.value !== 'ALL') {
    records = records.filter(m => m.student_id === selectedStudentId.value);
  }

  // 關鍵字過濾
  if (searchKeyword.value.trim() !== '') {
    const kw = searchKeyword.value.trim().toLowerCase();
    records = records.filter(m => {
      const verb = verbMap[m.base_form] || {};
      return m.base_form.toLowerCase().includes(kw) ||
             (verb.chinese && verb.chinese.includes(kw)) ||
             m.student_id.toLowerCase().includes(kw);
    });
  }

  return records.map(m => {
    const student = studentsMap.value[m.student_id] || { real_name: '未知', class_name: '--' };
    const verb = verbMap[m.base_form] || { past_tense: '--', past_participle: '--', chinese: '--' };
    const total = (m.correct_count || 0) + (m.wrong_count || 0);
    const rate = total > 0 ? Math.round((m.correct_count / total) * 100) : 0;

    return {
      student_id: m.student_id,
      real_name: student.real_name,
      class_name: student.class_name,
      base_form: m.base_form,
      past_tense: verb.past_tense,
      past_participle: verb.past_participle,
      chinese: verb.chinese,
      correct_count: m.correct_count || 0,
      wrong_count: m.wrong_count || 0,
      total_attempts: total,
      success_rate: rate
    };
  }).sort((a, b) => b.total_attempts - a.total_attempts);
});
</script>

<template>
  <div class="admin-container">
    <div class="header-box retro-element">
      <h1>📊 不規則動詞精熟度大數據分析（教師後台）</h1>
      <p>監控全校、各班與個別學生之動詞練習次數，實施精準的高效輔導！</p>
    </div>

    <div class="top-nav">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回後台首頁</NuxtLink>
    </div>

    <div class="filter-box retro-element">
      <div class="filter-item">
        <label><b>🔍 選擇分析班級：</b></label>
        <select v-model="selectedClass" @change="onClassChange" class="retro-input class-select">
          <option value="ALL">🌟 全校總體數據分析</option>
          <option v-for="c in classesList" :key="c" :value="c">班級：{{ c }}</option>
        </select>
      </div>

      <div class="filter-item">
        <label><b>🧑 選擇特定學生：</b></label>
        <select v-model="selectedStudentId" class="retro-input class-select">
          <option value="ALL">全部學生</option>
          <option v-for="s in filteredStudentsList" :key="s.student_id" :value="s.student_id">
            [{{ s.class_name || '未分班' }}] {{ s.real_name }} ({{ s.student_id }})
          </option>
        </select>
      </div>

      <div class="filter-item">
        <label><b>🔎 搜尋動詞/中文：</b></label>
        <input type="text" v-model="searchKeyword" placeholder="輸入如 eat 或 吃..." class="retro-input search-input" />
      </div>
    </div>

    <p v-if="isLoading" class="loading-msg">⏳ 大數據精密統計中...</p>

    <div v-else class="content-layout">
      
      <!-- 🌟 新增：個別學生動詞練習明細表 -->
      <div class="panel-section retro-element highlight-section">
        <h2>👤 個別學生動詞練習次數與精熟度明細 (共 {{ studentVerbDetails.length }} 筆資料)</h2>
        <div class="table-scroll-wrapper">
          <table class="analytics-table">
            <thead>
              <tr>
                <th>班級</th>
                <th>學生姓名</th>
                <th>學號/帳號</th>
                <th>動詞原形</th>
                <th>三態 (Past / P.P.)</th>
                <th>中文</th>
                <th>答對次數</th>
                <th>答錯次數</th>
                <th>總練習次數</th>
                <th>正確率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="studentVerbDetails.length === 0">
                <td colspan="10" style="text-align: center; color: #999; padding: 20px;">
                  尚無符合條件的學生練習紀錄。
                </td>
              </tr>
              <tr v-for="row in studentVerbDetails" :key="row.student_id + '_' + row.base_form">
                <td>{{ row.class_name }}</td>
                <td><b>{{ row.real_name }}</b></td>
                <td><code>{{ row.student_id }}</code></td>
                <td><span class="verb-highlight">{{ row.base_form }}</span></td>
                <td>{{ row.past_tense }} / {{ row.past_participle }}</td>
                <td>{{ row.chinese }}</td>
                <td style="color: #27ae60; font-weight: bold;">{{ row.correct_count }} 次</td>
                <td style="color: #c0392b; font-weight: bold;">{{ row.wrong_count }} 次</td>
                <td><b style="font-size: 1.05rem;">{{ row.total_attempts }} 次</b></td>
                <td>
                  <span class="rate-indicator" :class="{
                    'text-danger': row.success_rate < 60,
                    'text-warning': row.success_rate >= 60 && row.success_rate < 80,
                    'text-success': row.success_rate >= 80
                  }">{{ row.success_rate }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 宏觀統計 1：答錯排行榜 -->
      <div class="panel-section retro-element" style="margin-top: 30px;">
        <h2>🔥 班級/全校 答錯次數最高 Top 10（急需加強盲點）</h2>
        <table class="analytics-table">
          <thead>
            <tr>
              <th>名次</th>
              <th>動詞原形</th>
              <th>三態變化 (Past / P.P.)</th>
              <th>中文</th>
              <th>累計答錯</th>
              <th>累計答對</th>
              <th>平均正確率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, index) in topStruggledVerbs" :key="v.base_form" :class="{'row-danger': v.success_rate < 60}">
              <td><b>#{{ index + 1 }}</b></td>
              <td><span class="verb-highlight">{{ v.base_form }}</span></td>
              <td>{{ v.past_tense }} / {{ v.past_participle }}</td>
              <td>{{ v.chinese }}</td>
              <td style="color:#c0392b; font-weight:bold;">{{ v.total_wrong }} 次</td>
              <td>{{ v.total_correct }} 次</td>
              <td>
                <span class="rate-indicator" :class="{
                  'text-danger': v.success_rate < 60,
                  'text-warning': v.success_rate >= 60 && v.success_rate < 80,
                  'text-success': v.success_rate >= 80
                }">{{ v.success_rate }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 宏觀統計 2：正確率最低 -->
      <div class="panel-section retro-element" style="margin-top: 30px;">
        <h2>💡 班級/全校 平均正確率最低 Top 10（最容易混淆動詞）</h2>
        <table class="analytics-table">
          <thead>
            <tr>
              <th>名次</th>
              <th>動詞原形</th>
              <th>三態變化</th>
              <th>中文</th>
              <th>正確率</th>
              <th>總作答次數</th>
              <th>已參與學生數</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, index) in lowestRateVerbs" :key="v.base_form">
              <td><b>#{{ index + 1 }}</b></td>
              <td><span class="verb-highlight" style="color:#e67e22;">{{ v.base_form }}</span></td>
              <td>{{ v.past_tense }} / {{ v.past_participle }}</td>
              <td>{{ v.chinese }}</td>
              <td><strong style="font-size: 1.1rem; color: #c0392b;">{{ v.success_rate }}%</strong></td>
              <td>{{ v.total_attempts }} 次</td>
              <td>{{ v.student_count }} 人</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1100px; margin: 0 auto; font-family: 'PingFang TC', sans-serif; }
.header-box { text-align: center; padding: 20px; margin-bottom: 25px; background: #fff; border: 3px solid #333; border-radius: 12px; }
.header-box h1 { margin: 0 0 10px 0; color: #0d47a1; font-weight: 900; }
.header-box p { color: #555; font-weight: bold; margin:0; }
.top-nav { margin-bottom: 20px; }
.retro-btn { display: inline-block; padding: 10px 20px; text-decoration: none; font-weight: bold; border: 2px solid #333; border-radius: 8px; background: #fff3e0; color: #e65100; box-shadow: 3px 3px 0 #e65100; }
.retro-btn:active { transform: translate(2px, 2px); box-shadow: none; }

.filter-box { background: #e3f2fd; border: 2px solid #2196f3; padding: 15px; border-radius: 8px; font-weight: bold; margin-bottom: 25px; display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.class-select, .search-input { padding: 8px 12px; font-size: 0.95rem; border: 2px solid #333; border-radius: 6px; font-weight: bold; background: #fff; }
.search-input { width: 160px; }

.loading-msg { text-align: center; font-weight: bold; padding: 30px; font-size: 1.2rem; color: #666; }
.panel-section { background: #fff; border: 3px solid #333; border-radius: 12px; padding: 20px; box-shadow: 4px 4px 0 #333; }
.panel-section h2 { margin-top: 0; font-size: 1.3rem; font-weight: 900; color: #2c3e50; padding-bottom: 10px; border-bottom: 2px dashed #aaa; }

.highlight-section { border-color: #1976d2; background: #fafafa; }
.highlight-section h2 { color: #0d47a1; border-bottom-color: #1976d2; }

.table-scroll-wrapper { max-height: 450px; overflow-y: auto; border: 1px solid #ccc; border-radius: 6px; }

/* 數據表格排版 */
.analytics-table { width: 100%; border-collapse: collapse; text-align: left; }
.analytics-table th, .analytics-table td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 0.95rem; font-weight: bold; }
.analytics-table th { background: #f5f5f5; color: #333; font-weight: 900; border-bottom: 2px solid #333; position: sticky; top: 0; z-index: 10; }

.verb-highlight { font-size: 1.1rem; font-weight: 900; color: #1976d2; }
.row-danger { background: #fff5f5; }

.rate-indicator { font-size: 1.1rem; font-weight: 900; }
.text-danger { color: #c0392b; }
.text-warning { color: #d35400; }
.text-success { color: #27ae60; }
</style>
