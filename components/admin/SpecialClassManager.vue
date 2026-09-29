<script setup>
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps({
  allowedClasses: { type: Array, default: () => [] },
  isSuperAdmin: { type: Boolean, default: false },
  teacherName: { type: String, default: '' }
});

const supabase = useSupabaseClient();
const gradeLabels = { 7: '七', 8: '八', 9: '九' };
const grade = ref(7);
const specialClasses = ref([]);
const selectedSpecialId = ref('');
const sourceClasses = ref([]);
const sourceClass = ref('');
const sourceStudents = ref([]);
const members = ref([]);
const memberIds = ref([]);
const checkedStudentIds = ref([]);
const search = ref('');
const newClassName = ref('七年級學習扶助');
const editingName = ref(false);
const editedName = ref('');
const loading = ref(true);
const working = ref(false);
const missingSchema = ref(false);
const errorMessage = ref('');

const selectedSpecial = computed(() => specialClasses.value.find(item => item.id === selectedSpecialId.value));
const canEditSelected = computed(() => props.isSuperAdmin || (
  !!selectedSpecial.value?.created_by && selectedSpecial.value.created_by === props.teacherName
));
const memberIdSet = computed(() => new Set(memberIds.value));
const availableStudents = computed(() => sourceStudents.value.filter(student => {
  if (memberIdSet.value.has(student.id)) return false;
  const term = search.value.trim().toLowerCase();
  return !term || [student.real_name, student.student_id, student.seat_number]
    .some(value => String(value ?? '').toLowerCase().includes(term));
}));

function showError(problem, fallback) {
  errorMessage.value = `${fallback}：${problem?.message || '請稍後再試'}`;
}

async function loadSpecialClasses() {
  const requestedGrade = grade.value;
  const { data, error } = await supabase.from('special_classes').select('id,grade,name,created_by,created_at')
    .eq('grade', requestedGrade).order('name');
  if (requestedGrade !== grade.value) return;
  if (error) {
    missingSchema.value = ['42P01', 'PGRST205'].includes(error.code);
    if (!missingSchema.value) showError(error, '特殊班級讀取失敗');
    specialClasses.value = [];
    selectedSpecialId.value = '';
    return;
  }
  missingSchema.value = false;
  specialClasses.value = data || [];
  if (!specialClasses.value.some(item => item.id === selectedSpecialId.value))
    selectedSpecialId.value = specialClasses.value[0]?.id || '';
}

async function loadSourceClasses() {
  const requestedGrade = grade.value;
  let classes = [];
  if (props.isSuperAdmin) {
    const { data, error } = await supabase.from('students').select('class_name')
      .like('class_name', `${requestedGrade}%`).limit(10000);
    if (requestedGrade !== grade.value) return;
    if (error) { showError(error, '原班名單讀取失敗'); return; }
    classes = (data || []).map(item => item.class_name);
  } else {
    classes = props.allowedClasses;
  }
  sourceClasses.value = [...new Set(classes.filter(name =>
    new RegExp(`^${requestedGrade}[0-9]{2}$`).test(String(name || ''))))].sort();
  if (!sourceClasses.value.includes(sourceClass.value))
    sourceClass.value = sourceClasses.value[0] || '';
}

async function loadSourceStudents() {
  checkedStudentIds.value = [];
  if (!sourceClasses.value.includes(sourceClass.value)) { sourceStudents.value = []; return; }
  const requestedClass = sourceClass.value;
  const { data, error } = await supabase.from('students')
    .select('id,student_id,real_name,class_name,seat_number')
    .eq('class_name', requestedClass).order('seat_number');
  if (requestedClass !== sourceClass.value) return;
  if (error) { showError(error, '原班學生讀取失敗'); return; }
  sourceStudents.value = data || [];
}

async function loadMembers() {
  members.value = [];
  memberIds.value = [];
  if (!selectedSpecialId.value) return;
  const groupId = selectedSpecialId.value;
  const { data, error } = await supabase.from('special_class_members')
    .select('student_id').eq('special_class_id', groupId);
  if (error) { showError(error, '編組名單讀取失敗'); return; }
  if (groupId !== selectedSpecialId.value) return;
  const ids = (data || []).map(item => item.student_id);
  memberIds.value = ids;
  if (!ids.length || (!props.isSuperAdmin && !props.allowedClasses.length)) return;
  const visible = [];
  for (let index = 0; index < ids.length; index += 100) {
    let query = supabase.from('students')
      .select('id,student_id,real_name,class_name,seat_number')
      .in('id', ids.slice(index, index + 100));
    if (!props.isSuperAdmin) query = query.in('class_name', props.allowedClasses);
    const { data: students, error: studentsError } = await query;
    if (studentsError) { showError(studentsError, '編組學生讀取失敗'); return; }
    visible.push(...(students || []));
  }
  if (groupId !== selectedSpecialId.value) return;
  members.value = visible.sort((a, b) => a.class_name.localeCompare(b.class_name, 'zh-TW')
    || Number(a.seat_number || 0) - Number(b.seat_number || 0));
}

async function refresh() {
  errorMessage.value = '';
  loading.value = true;
  await Promise.all([loadSpecialClasses(), loadSourceClasses()]);
  loading.value = false;
}

async function createSpecialClass() {
  if (working.value) return;
  const name = newClassName.value.trim();
  if (!name) { errorMessage.value = '請輸入特殊班級名稱。'; return; }
  working.value = true; errorMessage.value = '';
  const requestedGrade = grade.value;
  const { data, error } = await supabase.from('special_classes')
    .insert({ grade: requestedGrade, name, created_by: props.teacherName }).select('id').single();
  working.value = false;
  if (error) { showError(error, '新增特殊班級失敗'); return; }
  if (requestedGrade !== grade.value) return;
  await loadSpecialClasses();
  selectedSpecialId.value = data.id;
  newClassName.value = '';
}

function startRename() {
  editedName.value = selectedSpecial.value?.name || '';
  editingName.value = true;
}

async function renameSpecialClass() {
  if (!canEditSelected.value || !selectedSpecial.value || working.value) return;
  const name = editedName.value.trim();
  if (!name) { errorMessage.value = '班級名稱不可空白。'; return; }
  working.value = true; errorMessage.value = '';
  const { error } = await supabase.from('special_classes').update({ name })
    .eq('id', selectedSpecialId.value);
  working.value = false;
  if (error) { showError(error, '重新命名失敗'); return; }
  editingName.value = false;
  await loadSpecialClasses();
}

async function deleteSpecialClass() {
  if (!canEditSelected.value || !selectedSpecial.value || working.value) return;
  if (!confirm(`確定刪除「${selectedSpecial.value.name}」及其編組名單？學生原班與帳號不會被刪除。`)) return;
  const groupId = selectedSpecialId.value;
  working.value = true; errorMessage.value = '';
  const { error } = await supabase.from('special_classes').delete().eq('id', groupId);
  working.value = false;
  if (error) { showError(error, '刪除特殊班級失敗'); return; }
  selectedSpecialId.value = '';
  await loadSpecialClasses();
}

function selectVisible() {
  checkedStudentIds.value = availableStudents.value.map(student => student.id);
}

async function addStudents() {
  if (!selectedSpecial.value || working.value || !checkedStudentIds.value.length) return;
  const validIds = new Set(availableStudents.value.map(student => student.id));
  const rows = checkedStudentIds.value.filter(id => validIds.has(id))
    .map(studentId => ({ special_class_id: selectedSpecialId.value, student_id: studentId }));
  if (!rows.length) return;
  working.value = true; errorMessage.value = '';
  const { error } = await supabase.from('special_class_members').upsert(rows, {
    onConflict: 'special_class_id,student_id', ignoreDuplicates: true
  });
  working.value = false;
  if (error) { showError(error, '編入學生失敗'); return; }
  checkedStudentIds.value = [];
  await loadMembers();
}

async function removeStudent(student) {
  if (working.value || (!props.isSuperAdmin && !props.allowedClasses.includes(student.class_name))) return;
  const groupId = selectedSpecialId.value;
  working.value = true; errorMessage.value = '';
  const { error } = await supabase.from('special_class_members').delete()
    .eq('special_class_id', groupId).eq('student_id', student.id);
  working.value = false;
  if (error) { showError(error, '移出學生失敗'); return; }
  await loadMembers();
}

watch(grade, async value => {
  selectedSpecialId.value = '';
  sourceClass.value = '';
  members.value = []; memberIds.value = []; sourceStudents.value = [];
  checkedStudentIds.value = [];
  newClassName.value = `${gradeLabels[value]}年級學習扶助`;
  editingName.value = false;
  await refresh();
});
watch(selectedSpecialId, () => { editingName.value = false; void loadMembers(); });
watch(sourceClass, () => { void loadSourceStudents(); });
watch(search, () => { checkedStudentIds.value = []; });
onMounted(() => { void refresh(); });
</script>

<template>
  <section id="special-classes" class="special-panel retro-element">
    <h2>📚 學習扶助／特殊班級</h2>
    <p class="description">從原班選入學生；原班、座號、遊戲帳號及學習紀錄都會保留。特殊班級分七、八、九年級。</p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-if="missingSchema" class="error" role="alert">尚未建立特殊班級資料表。請先在新專案 Supabase SQL Editor 執行 <code>supabase/migrations/20260928_special_classes.sql</code>。</p>

    <template v-else>
      <div class="toolbar">
        <label>年級
          <select v-model.number="grade" :disabled="working"><option :value="7">七年級</option><option :value="8">八年級</option><option :value="9">九年級</option></select>
        </label>
        <label>特殊班級
          <select v-model="selectedSpecialId" :disabled="loading || working || !specialClasses.length">
            <option v-if="!specialClasses.length" value="">尚無特殊班級</option>
            <option v-for="item in specialClasses" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
      </div>

      <div class="group-editor">
        <template v-if="editingName">
          <input v-model="editedName" maxlength="60" aria-label="修改特殊班級名稱" @keyup.enter="renameSpecialClass">
          <button type="button" :disabled="working" @click="renameSpecialClass">儲存名稱</button>
          <button type="button" @click="editingName = false">取消</button>
        </template>
        <template v-else>
          <input v-model="newClassName" maxlength="60" placeholder="例如：七年級學習扶助 A 班" aria-label="新特殊班級名稱" @keyup.enter="createSpecialClass">
          <button type="button" :disabled="working || !newClassName.trim()" @click="createSpecialClass">➕ 新增特殊班級</button>
          <button v-if="selectedSpecial && canEditSelected" type="button" :disabled="working" @click="startRename">✏️ 改名</button>
          <button v-if="selectedSpecial && canEditSelected" type="button" class="danger" :disabled="working" @click="deleteSpecialClass">🗑️ 刪除班級</button>
        </template>
      </div>

      <template v-if="selectedSpecial">
        <div class="subsection">
          <h3>已編入：{{ selectedSpecial.name }}（{{ memberIds.length }} 人）</h3>
          <p v-if="!isSuperAdmin" class="hint">只顯示及管理你有權限的原班學生。</p>
          <div class="list-wrap">
            <table>
              <thead><tr><th>原班</th><th>座號</th><th>姓名</th><th>遊戲帳號</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-if="!members.length"><td colspan="5" class="empty">目前沒有可顯示的學生。</td></tr>
                <tr v-for="student in members" :key="student.id">
                  <td>{{ student.class_name }}</td><td>{{ student.seat_number }}</td><td>{{ student.real_name }}</td><td>{{ student.student_id }}</td>
                  <td><button type="button" class="danger" :disabled="working" @click="removeStudent(student)">移出編組</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="subsection">
          <h3>從原班選擇學生編入</h3>
          <div class="toolbar">
            <label>原班
              <select v-model="sourceClass" :disabled="working || !sourceClasses.length">
                <option v-if="!sourceClasses.length" value="">此年級沒有可選原班</option>
                <option v-for="name in sourceClasses" :key="name" :value="name">{{ name }} 班</option>
              </select>
            </label>
            <label>搜尋
              <input v-model="search" placeholder="姓名、帳號或座號">
            </label>
          </div>
          <div class="pick-actions">
            <button type="button" :disabled="!availableStudents.length" @click="selectVisible">勾選目前名單</button>
            <button type="button" @click="checkedStudentIds = []">清除勾選</button>
            <button type="button" class="primary" :disabled="working || !checkedStudentIds.length" @click="addStudents">編入 {{ checkedStudentIds.length }} 位學生</button>
          </div>
          <div class="candidate-list">
            <p v-if="!availableStudents.length" class="empty">沒有可編入的學生，或本班學生已全部編入。</p>
            <label v-for="student in availableStudents" :key="student.id" class="candidate">
              <input v-model="checkedStudentIds" type="checkbox" :value="student.id">
              <span>{{ student.class_name }} 班 {{ student.seat_number }} 號　{{ student.real_name }}（{{ student.student_id }}）</span>
            </label>
          </div>
        </div>
      </template>
      <p v-else-if="!loading" class="empty">請先新增或選擇特殊班級。</p>
    </template>
  </section>
</template>

<style scoped>
.special-panel{margin:24px 0;padding:20px;background:var(--box-bg);border:var(--box-border-width) solid var(--border-color);border-radius:var(--radius-box);color:var(--text-main);box-shadow:var(--shadow-box)}
.special-panel h2{margin:0 0 8px}.special-panel h3{margin:0 0 12px}.description,.hint{color:var(--text-muted);margin:0 0 14px}.hint{font-size:.9rem}.error{padding:10px;background:var(--danger-bg);color:var(--danger-color);border:1px solid var(--danger-color);border-radius:8px}.toolbar,.group-editor,.pick-actions{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:12px 0}.toolbar label{display:flex;flex-direction:column;gap:5px;font-weight:bold}.special-panel input:not([type=checkbox]),.special-panel select{min-width:160px;max-width:100%;box-sizing:border-box;padding:9px;border:2px solid var(--border-color);border-radius:8px;background:var(--input-bg);color:var(--text-main);font:inherit}.group-editor input{flex:1}.special-panel button{padding:8px 12px;border:2px solid var(--border-color);border-radius:8px;background:var(--tab-bg);color:var(--text-main);font:inherit;font-weight:bold;cursor:pointer}.special-panel button:disabled{opacity:.5;cursor:not-allowed}.special-panel button.primary{background:var(--btn-primary-bg);color:var(--btn-primary-text)}.special-panel button.danger{color:var(--danger-color);background:var(--danger-bg);border-color:var(--danger-color)}.subsection{margin-top:20px;padding-top:16px;border-top:2px dashed var(--border-color)}.list-wrap{overflow-x:auto}.list-wrap table{width:100%;border-collapse:collapse}.list-wrap th,.list-wrap td{padding:9px;border-bottom:1px solid var(--border-color);text-align:left;white-space:nowrap}.list-wrap th{background:var(--tab-bg)}.candidate-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:6px;max-height:310px;overflow-y:auto;padding:6px}.candidate{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid var(--border-color);border-radius:8px;background:var(--input-bg);cursor:pointer}.candidate input{flex:none}.empty{padding:15px;color:var(--text-muted);text-align:center}@media(max-width:600px){.special-panel{padding:12px}.toolbar label,.group-editor input{width:100%}.toolbar select,.toolbar input{width:100%}.pick-actions button{flex:1}}
</style>
