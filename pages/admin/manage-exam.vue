<script setup>
import { ref, onMounted } from 'vue';

const supabase = useSupabaseClient();
const questions = ref([]);
const isLoading = ref(true);

// 計時器設定狀態
const timerSeconds = ref(20);
const isSavingTimer = ref(false);

// 編輯模式的狀態
const editingId = ref(null);
const editForm = ref({});

// 載入所有題目與設定
const fetchQuestions = async () => {
  isLoading.value = true;
  
  // 1. 取得計時器設定
  const { data: sysData } = await supabase.from('system_settings').select('exam_timer_seconds').eq('id', 1).single();
  if (sysData && sysData.exam_timer_seconds) {
    timerSeconds.value = sysData.exam_timer_seconds;
  }

  // 2. 取得所有會考題目
  const { data, error } = await supabase
    .from('exam_questions')
    .select('*')
    .order('year', { ascending: false })
    .order('question_id', { ascending: true });
    
  if (data) {
    questions.value = data;
  }
  isLoading.value = false;
};

onMounted(() => {
  fetchQuestions();
});

// 儲存計時器設定
const saveTimerSetting = async () => {
  isSavingTimer.value = true;
  await supabase.from('system_settings').update({ exam_timer_seconds: timerSeconds.value }).eq('id', 1);
  setTimeout(() => {
    isSavingTimer.value = false;
    alert('⏳ 計時器秒數已儲存！前台遊戲將套用新秒數。');
  }, 500);
};

// 刪除題目
const deleteQuestion = async (id) => {
  if (!confirm('確定要刪除這筆題目嗎？（此動作無法復原）')) return;
  
  const { error } = await supabase.from('exam_questions').delete().eq('id', id);
  if (error) {
    alert('刪除失敗：' + error.message);
  } else {
    // 成功後直接從列表中移除，不需重新發 API
    questions.value = questions.value.filter(q => q.id !== id);
  }
};

// 進入編輯模式
const startEdit = (q) => {
  editingId.value = q.id;
  // 複製一份資料到 editForm，避免直接修改原始資料
  editForm.value = { ...q };
};

// 取消編輯
const cancelEdit = () => {
  editingId.value = null;
  editForm.value = {};
};

// 儲存編輯結果
const saveEdit = async () => {
  const { error } = await supabase
    .from('exam_questions')
    .update({
      year: editForm.value.year,
      question_id: editForm.value.question_id,
      image_url: editForm.value.image_url,
      question: editForm.value.question,
      option_a: editForm.value.option_a,
      option_b: editForm.value.option_b,
      option_c: editForm.value.option_c,
      option_d: editForm.value.option_d,
      answer: editForm.value.answer
    })
    .eq('id', editingId.value);

  if (error) {
    alert('儲存失敗：' + error.message);
  } else {
    alert('✅ 儲存成功！');
    // 更新本地列表
    const index = questions.value.findIndex(q => q.id === editingId.value);
    if (index !== -1) {
      questions.value[index] = { ...editForm.value };
    }
    cancelEdit();
  }
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>✏️ 會考題庫管理與編輯</h1>
      <NuxtLink to="/admin" class="retro-btn btn-secondary" style="text-decoration: none;">返回後台</NuxtLink>
    </div>

    <div class="settings-card">
      <span style="font-size: 1.2rem; font-weight: bold; color: #1565c0;">⏳ 會考閱讀單題 - 每題作答時間：</span>
      <input type="number" v-model="timerSeconds" class="timer-input" min="5" max="120" /> 秒
      <button @click="saveTimerSetting" class="retro-btn btn-primary" style="margin-left: 15px; padding: 8px 15px; width: auto; display: inline-block;">
        {{ isSavingTimer ? '儲存中...' : '💾 儲存設定' }}
      </button>
    </div>

    <div v-if="isLoading" class="loading-msg">⏳ 正在載入題庫資料...</div>
    
    <div v-else-if="questions.length === 0" class="loading-msg">
      目前資料庫中沒有任何題目。
    </div>

    <div v-else class="table-wrapper">
      <p style="margin-bottom: 10px; font-weight: bold;">總題數：{{ questions.length }} 題</p>
      <table>
        <thead>
          <tr>
            <th width="60">年份</th>
            <th width="60">題號</th>
            <th width="80">圖片</th>
            <th>題目內容 / 選項</th>
            <th width="60">答案</th>
            <th width="140">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in questions" :key="q.id">
            
            <template v-if="editingId === q.id">
              <td><input type="number" v-model="editForm.year" class="edit-input num-input" /></td>
              <td><input type="number" v-model="editForm.question_id" class="edit-input num-input" /></td>
              <td>
                <input type="text" v-model="editForm.image_url" placeholder="圖片網址" class="edit-input" />
              </td>
              <td class="text-left">
                <textarea v-model="editForm.question" class="edit-textarea" rows="2"></textarea>
                <div class="edit-options">
                  <div>(A) <input type="text" v-model="editForm.option_a" class="edit-input opt-input" /></div>
                  <div>(B) <input type="text" v-model="editForm.option_b" class="edit-input opt-input" /></div>
                  <div>(C) <input type="text" v-model="editForm.option_c" class="edit-input opt-input" /></div>
                  <div>(D) <input type="text" v-model="editForm.option_d" class="edit-input opt-input" /></div>
                </div>
              </td>
              <td>
                <select v-model="editForm.answer" class="edit-input">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="?">?</option>
                </select>
              </td>
              <td>
                <button @click="saveEdit" class="mini-btn btn-save">💾 儲存</button>
                <button @click="cancelEdit" class="mini-btn btn-cancel">✖ 取消</button>
              </td>
            </template>

            <template v-else>
              <td>{{ q.year }}</td>
              <td>{{ q.question_id }}</td>
              <td>
                <span v-if="q.image_url" title="有圖片" style="cursor:help;">🖼️</span>
                <span v-else style="color:#ccc;">無</span>
              </td>
              <td class="text-left">
                <div class="q-title">{{ q.question }}</div>
                <div class="q-options">
                  <span>(A) {{ q.option_a }}</span>
                  <span>(B) {{ q.option_b }}</span>
                  <span>(C) {{ q.option_c }}</span>
                  <span>(D) {{ q.option_d }}</span>
                </div>
              </td>
              <td style="font-weight: bold; color: #d32f2f;">{{ q.answer }}</td>
              <td>
                <button @click="startEdit(q)" class="mini-btn btn-edit">✏️ 編輯</button>
                <button @click="deleteQuestion(q.id)" class="mini-btn btn-danger">🗑️ 刪除</button>
              </td>
            </template>
            
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1200px; margin: 0 auto; color: #333; font-family: sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }

/* 計時器設定區塊 */
.settings-card { background: #e3f2fd; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #90caf9; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.timer-input { width: 80px; padding: 8px; font-size: 1.1rem; text-align: center; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; }

.loading-msg { font-size: 1.2rem; margin-top: 50px; text-align: center; }

.table-wrapper { overflow-x: auto; background: white; border: 1px solid #ccc; border-radius: 8px; padding: 15px; }
table { width: 100%; border-collapse: collapse; text-align: center; }
th, td { padding: 12px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
th { background: #e8eaf6; color: #283593; font-weight: bold; }
.text-left { text-align: left; }

.q-title { font-weight: bold; margin-bottom: 5px; }
.q-options { font-size: 0.9rem; color: #555; display: flex; gap: 15px; flex-wrap: wrap; }

.retro-btn { padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 2px solid; transition: 0.1s; font-family: inherit; }
.btn-primary { background: #007bff; color: white; border-color: #0056b3; }
.btn-secondary { background: #e0e0e0; color: #333; border-color: #ccc; }

.mini-btn { padding: 5px 10px; margin: 2px; border-radius: 4px; border: 1px solid transparent; font-weight: bold; cursor: pointer; font-size: 0.9rem; }
.btn-edit { background: #fff3e0; color: #e65100; border-color: #ffb74d; }
.btn-danger { background: #ffebee; color: #c62828; border-color: #ef5350; }
.btn-save { background: #e8f5e9; color: #2e7d32; border-color: #81c784; }
.btn-cancel { background: #f5f5f5; color: #616161; border-color: #bdbdbd; }

/* 編輯模式表單樣式 */
.edit-input { width: 100%; padding: 5px; border: 1px solid #90caf9; border-radius: 4px; box-sizing: border-box; font-family: inherit; }
.num-input { width: 50px; text-align: center; }
.edit-textarea { width: 100%; padding: 5px; border: 1px solid #90caf9; border-radius: 4px; box-sizing: border-box; font-family: inherit; margin-bottom: 5px; resize: vertical; }
.edit-options { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 0.9rem; }
.opt-input { width: calc(100% - 30px); display: inline-block; }
</style>