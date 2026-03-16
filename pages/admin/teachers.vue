<script setup>
import { ref, onMounted, computed } from 'vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');

const teachers = ref([]);
const isLoading = ref(true);

// 表單狀態
const showModal = ref(false);
const isEditing = ref(false);
const formData = ref({
  id: null,
  teacher_name: '',
  password: '',
  allowed_classes: []
});

// 🌟 1. 權限防護：只有總管理員 (權限包含 'ALL') 可以進入此頁
onMounted(() => {
  if (!authCookie.value || !authCookie.value.classes.includes('ALL')) {
    alert('⛔ 拒絕存取：您沒有最高管理員權限，無法進入此頁面！');
    navigateTo('/admin');
    return;
  }
  fetchTeachers();
});

// 🌟 2. 產生全校班級清單 (供勾選用：701~714, 801~814, 901~914)
const allClasses = computed(() => {
  const list = [];
  for (let grade of [7, 8, 9]) {
    for (let i = 1; i <= 14; i++) {
      list.push(`${grade}${String(i).padStart(2, '0')}`);
    }
  }
  return list;
});

// 載入教師名單
const fetchTeachers = async () => {
  isLoading.value = true;
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('id', { ascending: true });

  if (!error && data) {
    teachers.value = data;
  }
  isLoading.value = false;
};

// 打開新增視窗
const openAddModal = () => {
  isEditing.value = false;
  formData.value = {
    id: null,
    teacher_name: '',
    password: '',
    allowed_classes: []
  };
  showModal.value = true;
};

// 打開編輯視窗
const openEditModal = (teacher) => {
  isEditing.value = true;
  formData.value = { 
    ...teacher,
    // 確保 allowed_classes 是陣列
    allowed_classes: teacher.allowed_classes || [] 
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

// 儲存教師資料
const saveTeacher = async () => {
  if (!formData.value.teacher_name || !formData.value.password) {
    alert('老師姓名與登入密碼為必填！');
    return;
  }

  const payload = {
    teacher_name: formData.value.teacher_name.trim(),
    password: formData.value.password.trim(),
    allowed_classes: formData.value.allowed_classes.sort() // 幫班級排個序存進去
  };

  if (isEditing.value) {
    const { error } = await supabase.from('teachers').update(payload).eq('id', formData.value.id);
    if (error) {
      alert('更新失敗，請檢查密碼是否與他人重複！\n' + error.message);
    } else {
      showModal.value = false;
      fetchTeachers();
    }
  } else {
    const { error } = await supabase.from('teachers').insert([payload]);
    if (error) {
      alert('新增失敗，請檢查密碼是否與他人重複！\n' + error.message);
    } else {
      showModal.value = false;
      fetchTeachers();
    }
  }
};

// 刪除教師
const deleteTeacher = async (id, name) => {
  if (!confirm(`⚠️ 確定要刪除【${name}】的帳號嗎？\n刪除後該老師將無法登入系統！`)) return;
  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) alert('刪除失敗：' + error.message);
  else fetchTeachers();
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>👨‍🏫 教師權限管理中心</h1>
      <p class="role-badge">🔒 總管理員專屬頁面</p>
    </div>

    <div class="top-actions">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回控制中心</NuxtLink>
      <button class="retro-btn add-btn" @click="openAddModal">➕ 新增教師帳號</button>
    </div>

    <div class="table-container retro-element">
      <p v-if="isLoading" class="loading-msg">⏳ 讀取中...</p>
      <table v-else class="retro-table">
        <thead>
          <tr>
            <th>教師姓名</th>
            <th>登入密碼</th>
            <th>負責班級 (權限)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="teachers.length === 0">
            <td colspan="4" class="empty-msg">目前尚無其他教師帳號。</td>
          </tr>
          <tr v-for="teacher in teachers" :key="teacher.id">
            <td class="name-text"><strong>{{ teacher.teacher_name }}</strong></td>
            <td><code class="pwd-box">{{ teacher.password }}</code></td>
            <td>
              <div class="tags-container">
                <span v-for="cls in teacher.allowed_classes" :key="cls" class="unit-tag">{{ cls }}</span>
                <span v-if="!teacher.allowed_classes || teacher.allowed_classes.length === 0" class="empty-text">尚未分配班級</span>
              </div>
            </td>
            <td class="actions-col">
              <button class="action-btn edit-btn" @click="openEditModal(teacher)">✏️</button>
              <button class="action-btn delete-btn" @click="deleteTeacher(teacher.id, teacher.teacher_name)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-box retro-element">
        <h2>{{ isEditing ? '✏️ 編輯教師權限' : '➕ 新增教師帳號' }}</h2>
        
        <div class="form-group">
          <label>1. 教師姓名</label>
          <input type="text" v-model="formData.teacher_name" class="retro-input" placeholder="例如: B老師 或 王大明" />
        </div>
        
        <div class="form-group">
          <label>2. 專屬登入密碼 (不可與他人重複)</label>
          <input type="text" v-model="formData.password" class="retro-input" placeholder="請設定一組密碼" />
        </div>
        
        <div class="form-group">
          <label class="section-title">3. 勾選負責班級 (可複選)</label>
          <div class="classes-grid">
            <label v-for="cls in allClasses" :key="cls" class="checkbox-label" :class="{ 'is-checked': formData.allowed_classes.includes(cls) }">
              <input type="checkbox" :value="cls" v-model="formData.allowed_classes" />
              {{ cls }}
            </label>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="retro-btn cancel-btn" @click="closeModal">取消</button>
          <button class="retro-btn save-btn" @click="saveTeacher">💾 儲存設定</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 900px; margin: 0 auto; min-height: 100vh;}
.header h1 { font-size: 2rem; color: var(--text-main); font-weight: 900; margin-bottom: 5px; text-align: center; }
.role-badge { text-align: center; color: var(--danger-color); font-weight: bold; margin-bottom: 20px; background: var(--danger-bg); padding: 5px 15px; border-radius: 20px; display: inline-block; border: 2px solid var(--danger-color);}
.header { text-align: center; }

.top-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;}

.table-container { background: var(--box-bg); padding: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); overflow-x: auto;}
.retro-table { width: 100%; border-collapse: collapse; text-align: left; }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 2px dashed #ccc; color: var(--text-main); font-weight: bold;}
.retro-table th { background: var(--tab-bg); font-size: 1.1rem; border-bottom: 2px solid var(--border-color);}
.name-text { font-size: 1.2rem; color: #0277bd; }
.pwd-box { background: #eee; padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-family: monospace; font-size: 1.1rem; color: #d32f2f;}
.empty-msg { text-align: center; padding: 30px; color: var(--text-muted); font-weight: bold;}
.actions-col { white-space: nowrap; width: 100px; text-align: center;}

.tags-container { display: flex; flex-wrap: wrap; gap: 6px; }
.unit-tag { background: var(--success-bg); color: var(--success-color); padding: 4px 8px; border: 1px solid var(--success-color); border-radius: 4px; font-size: 0.9rem; font-weight: bold; }
.empty-text { color: #999; font-style: italic; }

.retro-btn { padding: 10px 15px; font-weight: bold; font-size: 1rem; cursor: pointer; border: 2px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 0 var(--border-color); transition: 0.1s; text-decoration: none; display: inline-block;}
.retro-btn:active:not(.disabled) { transform: translateY(4px); box-shadow: none; }

.back-btn { background: var(--tab-bg); color: var(--text-main); }
.add-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
.action-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; margin: 0 5px; transition: 0.2s;}
.action-btn:hover { transform: scale(1.2); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; box-sizing: border-box;}
.modal-box { background: var(--bg-color); padding: 30px; width: 100%; max-width: 500px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
.modal-box h2 { margin-top: 0; border-bottom: 2px solid var(--text-main); padding-bottom: 10px; }
.form-group { margin-bottom: 20px; text-align: left; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; color: var(--text-main); }
.retro-input { width: 100%; padding: 10px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 1.1rem; font-family: inherit; font-weight: bold; box-sizing: border-box; }

.section-title { font-size: 1.1rem; color: #0277bd !important; border-bottom: 2px dashed #0277bd; padding-bottom: 5px; }
.classes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 250px; overflow-y: auto; background: var(--box-bg); padding: 15px; border: 2px solid var(--border-color); border-radius: 8px; }
.checkbox-label { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 8px; background: #fff; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s;}
.checkbox-label:hover { border-color: var(--text-main); }
.checkbox-label.is-checked { background: var(--success-bg); color: var(--success-color); border-color: var(--success-color); box-shadow: inset 0 0 0 1px var(--success-color);}
.checkbox-label input { display: none; /* 隱藏原生核取方塊，靠外框變色 */ }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
.cancel-btn { background: #e0e0e0; color: #333; }
.save-btn { background: var(--success-bg); color: #fff; border-color: #2e7d32; box-shadow: 0 4px 0 #2e7d32; }

@media (max-width: 600px) {
  .top-actions { flex-direction: column; align-items: stretch; }
  .retro-table th, .retro-table td { padding: 8px; font-size: 0.9rem;}
}
</style>