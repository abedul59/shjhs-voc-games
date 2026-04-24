<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const activeTab = ref('history'); // 切換分頁：'history' 或 'items'

const historyData = ref([]);
const questionsData = ref([]);
const logsData = ref([]);
const isLoading = ref(true);

onMounted(async () => {
  isLoading.value = true;
  
  // 取得學生測驗紀錄
  const { data: hData } = await supabase.from('exam_history').select('*').order('created_at', { ascending: false });
  if (hData) historyData.value = hData;

  // 取得所有題目與作答日誌 (供單題分析使用)
  const { data: qData } = await supabase.from('exam_questions').select('id, year, question_id, question');
  const { data: lData } = await supabase.from('exam_question_logs').select('q_id, is_correct, time_spent');
  
  if (qData) questionsData.value = qData;
  if (lData) logsData.value = lData;

  isLoading.value = false;
});

// 計算單題弱點分析數據
const itemStats = computed(() => {
  return questionsData.value.map(q => {
    const logs = logsData.value.filter(l => l.q_id === q.id);
    const total = logs.length;
    const correct = logs.filter(l => l.is_correct).length;
    const wrong = total - correct;
    const correctRate = total === 0 ? 0 : Math.round((correct / total) * 100);
    const avgTime = total === 0 ? 0 : Math.round(logs.reduce((sum, l) => sum + l.time_spent, 0) / total);
    
    return { ...q, total, correct, wrong, correctRate, avgTime };
  })
  .filter(q => q.total > 0) // 只顯示有被作答過的題目
  .sort((a, b) => a.correctRate - b.correctRate); // 預設由「答對率最低 (最難)」排到最高
});

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>📈 會考閱讀考古學 - 數據分析</h1>
      <NuxtLink to="/admin" class="retro-btn btn-secondary">返回後台</NuxtLink>
    </div>

    <div class="tabs">
      <button :class="['tab-btn', { active: activeTab === 'history' }]" @click="activeTab = 'history'">
        👨‍🎓 學生測驗紀錄
      </button>
      <button :class="['tab-btn', { active: activeTab === 'items' }]" @click="activeTab = 'items'">
        🎯 單題弱點分析 (找魔王題)
      </button>
    </div>

    <div v-if="isLoading" class="loading">⏳ 正在讀取大數據...</div>

    <div v-else-if="activeTab === 'history'" class="card">
      <p style="color:#555; margin-bottom: 15px;">※ 這裡紀錄學生選擇特定「年份」考卷的完整成績。(不包含隨機模式)</p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>測驗時間</th>
              <th>班級</th>
              <th>姓名</th>
              <th>挑戰年份</th>
              <th style="color: #2e7d32;">答對</th>
              <th style="color: #c62828;">答錯</th>
              <th>準確率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in historyData" :key="h.id">
              <td>{{ formatDate(h.created_at) }}</td>
              <td>{{ h.student_class }}</td>
              <td>{{ h.student_name }}</td>
              <td style="font-weight: bold;">{{ h.exam_mode }} 年</td>
              <td style="color: #2e7d32; font-weight: bold;">{{ h.correct_count }}</td>
              <td style="color: #c62828; font-weight: bold;">{{ h.wrong_count }}</td>
              <td>
                <span class="rate-badge" :class="h.correct_count / (h.correct_count + h.wrong_count) >= 0.8 ? 'good' : 'bad'">
                  {{ Math.round((h.correct_count / (h.correct_count + h.wrong_count)) * 100) }}%
                </span>
              </td>
            </tr>
            <tr v-if="historyData.length === 0"><td colspan="7">尚無測驗紀錄</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="activeTab === 'items'" class="card">
      <p style="color:#555; margin-bottom: 15px;">※ 這裡統整了每一題在所有模式下被作答的狀況。列表已依據<strong>「答對率 (由低到高)」</strong>排序，幫您快速抓出學生最常錯的題目！</p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th width="80">年份題號</th>
              <th>題目預覽</th>
              <th width="80">作答總數</th>
              <th width="80" style="color: #2e7d32;">答對次數</th>
              <th width="80" style="color: #c62828;">答錯次數</th>
              <th width="100">平均花費</th>
              <th width="100">答對率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in itemStats" :key="q.id">
              <td style="font-weight: bold;">{{ q.year }} - {{ q.question_id }}</td>
              <td class="text-left" style="font-size: 0.9rem; color: #444;">{{ q.question.substring(0, 50) }}...</td>
              <td>{{ q.total }}</td>
              <td style="color: #2e7d32; font-weight: bold;">{{ q.correct }}</td>
              <td style="color: #c62828; font-weight: bold;">{{ q.wrong }}</td>
              <td>{{ q.avgTime }} 秒</td>
              <td>
                <span class="rate-badge" :class="q.correctRate >= 50 ? 'good' : 'danger'">
                  {{ q.correctRate }}%
                </span>
              </td>
            </tr>
            <tr v-if="itemStats.length === 0"><td colspan="7">尚無任何作答數據</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1200px; margin: 0 auto; color: #333; font-family: sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
.retro-btn { padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 2px solid; text-decoration: none; display: inline-block; }
.btn-secondary { background: #e0e0e0; color: #333; border-color: #ccc; }

.tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.tab-btn { padding: 12px 20px; font-size: 1.1rem; font-weight: bold; background: #e3f2fd; color: #1565c0; border: 2px solid #90caf9; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.tab-btn.active { background: #1565c0; color: white; box-shadow: 0 4px 0 #0d47a1; border-color: #0d47a1; transform: translateY(-2px); }

.card { background: white; border: 1px solid #ccc; border-radius: 8px; padding: 20px; box-shadow: 2px 2px 10px rgba(0,0,0,0.05); }
.loading { font-size: 1.2rem; text-align: center; margin-top: 50px; font-weight: bold; color: #666; }

.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: center; }
th, td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
th { background: #f5f5f5; color: #333; font-weight: bold; }
.text-left { text-align: left; }

.rate-badge { padding: 4px 8px; border-radius: 12px; font-weight: bold; font-size: 0.9rem; }
.rate-badge.good { background: #e8f5e9; color: #2e7d32; }
.rate-badge.bad { background: #fff3e0; color: #e65100; }
.rate-badge.danger { background: #ffebee; color: #c62828; border: 1px solid #c62828; }
</style>