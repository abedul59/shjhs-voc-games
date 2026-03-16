<script setup>
import { ref, onMounted, computed } from 'vue';

const supabase = useSupabaseClient();
const isAdminCookie = useCookie('isAdmin');
const authCookie = useCookie('teacher_auth');

// 權限檢查
onMounted(() => {
  const hasAuth = isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || (authCookie.value && authCookie.value.classes);
  if (!hasAuth) navigateTo('/admin/login');
});

const allStudents = ref([]);
const classesList = ref([]);
const selectedClass = ref('ALL');
const selectedStudent = ref(null);

const formationsList = ref([]);
const strategiesList = ref([]);

const manualFormations = ref([]);
const manualStrategies = ref([]);
const isSaving = ref(false);

onMounted(async () => {
    // 1. 抓取學生資料
    const { data: sData } = await supabase.from('students')
        .select('student_id, real_name, hidden_name, class_name, tenchi_formations, tenchi_strategies')
        .order('student_id');
        
    if (sData) {
        const isSuperAdmin = isAdminCookie.value === true || isAdminCookie.value === 'superadmin';
        const allowedClasses = authCookie.value?.classes || [];
        
        allStudents.value = sData.filter(s => {
            if (!s.class_name) return false;
            if (!isSuperAdmin && allowedClasses.length > 0 && !allowedClasses.includes(s.class_name)) return false;
            return true;
        });
        classesList.value = [...new Set(allStudents.value.map(s => s.class_name))].sort();
    }

    // 2. 抓取系統中所有的陣型與策略清單
    const { data: settings } = await supabase.from('system_settings').select('tenchi_formations_config, tenchi_strategies_config').eq('id', 1).single();
    if (settings) {
        formationsList.value = Object.keys(settings.tenchi_formations_config || {});
        strategiesList.value = Object.keys(settings.tenchi_strategies_config || {});
    }
});

const displayStudents = computed(() => {
    if (selectedClass.value === 'ALL') return allStudents.value;
    return allStudents.value.filter(s => s.class_name === selectedClass.value);
});

const selectStudent = (stu) => {
    selectedStudent.value = stu;
    manualFormations.value = [...(stu.tenchi_formations || [])];
    manualStrategies.value = [...(stu.tenchi_strategies || [])];
};

const saveUnlocks = async () => {
    isSaving.value = true;
    const { error } = await supabase.from('students').update({
        tenchi_formations: manualFormations.value,
        tenchi_strategies: manualStrategies.value
    }).eq('student_id', selectedStudent.value.student_id);
    
    if (!error) {
        selectedStudent.value.tenchi_formations = [...manualFormations.value];
        selectedStudent.value.tenchi_strategies = [...manualStrategies.value];
        alert(`已成功更新 ${selectedStudent.value.real_name || selectedStudent.value.hidden_name} 的解鎖資料！`);
    } else {
        alert('儲存失敗：' + error.message);
    }
    isSaving.value = false;
};
</script>

<template>
  <div class="tenchi-manager-container">
    <div class="header-box retro-element">
      <h1>🐎 單字吞食天地 - 兵法管理所</h1>
      <p>手動賜予學生特定陣型與策略</p>
    </div>

    <div class="top-nav">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回後台首頁</NuxtLink>
    </div>

    <div class="filter-box retro-element">
      <label style="font-weight: bold; font-size: 1.1rem; color: #333;">選擇班級：</label>
      <select v-model="selectedClass" class="retro-input class-select" @change="selectedStudent = null">
         <option value="ALL">顯示全部</option>
         <option v-for="c in classesList" :key="c" :value="c">{{ c }} 班</option>
      </select>
    </div>

    <div class="main-layout">
        <div class="students-list retro-element">
            <button v-for="stu in displayStudents" :key="stu.student_id" 
                    class="student-btn" :class="{ active: selectedStudent?.student_id === stu.student_id }"
                    @click="selectStudent(stu)">
                <span class="id-badge">{{ String(stu.student_id).slice(-2) }}</span>
                {{ stu.real_name || stu.hidden_name || stu.student_id }}
                <span v-if="(stu.tenchi_formations?.length > 0) || (stu.tenchi_strategies?.length > 0)" class="has-gift-icon">🎁</span>
            </button>
        </div>

        <div class="unlock-panel retro-element" v-if="selectedStudent">
            <h2 class="panel-title">為 <span>{{ selectedStudent.real_name || selectedStudent.hidden_name }}</span> 賜予兵法</h2>
            <p class="hint-text">💡 勾選的項目會直接發送給學生，無視他的勝場數。若學生勝場數已達標，系統也會自動解鎖，不需手動勾選。</p>

            <div class="options-container">
                <div class="option-group">
                    <h3>🛡️ 兵法陣型</h3>
                    <label v-for="form in formationsList" :key="form" class="checkbox-label">
                        <input type="checkbox" :value="form" v-model="manualFormations" />
                        {{ form }}
                    </label>
                </div>

                <div class="option-group">
                    <h3>📜 軍師策略</h3>
                    <label v-for="strat in strategiesList" :key="strat" class="checkbox-label">
                        <input type="checkbox" :value="strat" v-model="manualStrategies" />
                        {{ strat }}
                    </label>
                </div>
            </div>

            <button class="retro-btn save-btn" @click="saveUnlocks" :disabled="isSaving">
                {{ isSaving ? '儲存中...' : '💾 儲存並發送兵法' }}
            </button>
        </div>
        
        <div v-else class="unlock-panel retro-element empty-state">
            <h2 style="color:#aaa;">👈 請先從左側選擇一名學生</h2>
        </div>
    </div>
  </div>
</template>

<style scoped>
.tenchi-manager-container { padding: 20px; box-sizing: border-box; max-width: 1200px; margin: 0 auto; }
.header-box { background: #fff; border: 4px solid #333; border-radius: 15px; box-shadow: 0 6px 0 #333; text-align: center; padding: 20px; margin-bottom: 20px; }
.header-box h1 { margin: 0 0 5px 0; font-weight: 900; color: #b30000; font-size: 2.2rem;}
.header-box p { color: #666; font-weight: bold; margin: 0; }

.top-nav { margin-bottom: 20px; }
.retro-btn { display: inline-block; padding: 10px 20px; font-weight: 900; border: 3px solid #333; border-radius: 8px; box-shadow: 0 4px 0 #333; background-color: #e0e0e0; color: #333; cursor: pointer; transition: 0.1s;}
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.filter-box { background: #e3f2fd; border: 3px solid #1976d2; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 4px 0 #1976d2; display: flex; align-items: center; gap: 15px;}
.class-select { flex: 1; padding: 10px; border: 2px solid #1976d2; border-radius: 8px; font-size: 1.1rem; font-weight: bold; }

.main-layout { display: flex; gap: 20px; align-items: flex-start; }
@media (max-width: 768px) { .main-layout { flex-direction: column; } }

.students-list { flex: 1; max-width: 350px; background: #f5f5f5; border: 3px solid #777; border-radius: 12px; padding: 10px; box-shadow: 0 4px 0 #777; display: flex; flex-direction: column; gap: 5px; max-height: 600px; overflow-y: auto;}
@media (max-width: 768px) { .students-list { max-width: 100%; flex-direction: row; flex-wrap: wrap; } }

.student-btn { padding: 10px; font-size: 1rem; font-weight: bold; border: 2px solid #999; border-radius: 8px; background: #fff; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 10px;}
.student-btn:hover { background: #e0e0e0; }
.student-btn.active { background: #b30000; color: #fff; border-color: #7a0000; box-shadow: 0 3px 0 #7a0000; }
.id-badge { background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 5px; font-family: monospace; }
.has-gift-icon { margin-left: auto; }

.unlock-panel { flex: 2; background: #fff8e1; border: 4px solid #fbc02d; border-radius: 15px; padding: 25px; box-shadow: 0 6px 0 #fbc02d; }
.empty-state { display: flex; justify-content: center; align-items: center; min-height: 300px; background: #fff; border-color: #ccc; box-shadow: 0 6px 0 #ccc;}

.panel-title { color: #f57f17; border-bottom: 2px dashed #fbc02d; padding-bottom: 10px; margin-top: 0;}
.panel-title span { color: #b30000; }
.hint-text { color: #555; font-size: 0.95rem; font-weight: bold; margin-bottom: 20px;}

.options-container { display: flex; gap: 20px; margin-bottom: 25px; }
@media (max-width: 600px) { .options-container { flex-direction: column; } }
.option-group { flex: 1; background: #fff; border: 2px solid #f9a825; border-radius: 10px; padding: 15px; }
.option-group h3 { margin-top: 0; color: #f57f17; border-bottom: 2px solid #ffe082; padding-bottom: 5px;}
.checkbox-label { display: block; margin-bottom: 10px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;}
.checkbox-label input { width: 20px; height: 20px; cursor: pointer; }

.save-btn { background: #4caf50; color: #fff; border-color: #2e7d32; box-shadow: 0 4px 0 #2e7d32; font-size: 1.2rem; width: 100%; padding: 15px; }
</style>