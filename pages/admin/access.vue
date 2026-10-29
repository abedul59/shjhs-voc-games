<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { farmLessonKey } from '~/lib/happy-farm-access';
import { regularClassPermissions, schoolClassNames } from '~/lib/admin-class-permissions';
import { GAME_ACCESS_CATALOG, gamesGroupedByCategory, normalizeGameCategories } from '~/lib/game-access-catalog';
import { formatVocabScope, normalizeVocabScope, sameVocabScope, vocabScopeKey } from '~/lib/vocab-scope-access';

const supabase = useSupabaseClient();
const isLoading = ref(true);
const isSaving = ref(false);
const studentNumberSchemaAvailable = ref(false);

// 權限判斷
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');
const allowedClasses = Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : [];
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.includes('ALL'));
const allowedRegularClasses = computed(() => regularClassPermissions(allowedClasses));

const settings = ref({
  disabled_games: [], locked_units: [], restrict_play_time: false, allow_play_days: [1,2,3,4,5], allow_play_start: '08:00', allow_play_end: '17:00', 
  login_blocked_message: '⚠️ 目前為系統管制時間，暫不開放登入喔！',
  disable_anon_login: false,
  student_number_login_enabled: false
});

const vocabMenu = ref([]);
const selVer = ref(''); const selVol = ref(''); const selUnit = ref('');

const gamesList = GAME_ACCESS_CATALOG;
const gameCategories = ref(normalizeGameCategories([]));
const groupedGames = computed(() => gamesGroupedByCategory(gameCategories.value));

const daysList = [{ val: 1, label: '一' }, { val: 2, label: '二' }, { val: 3, label: '三' }, { val: 4, label: '四' }, { val: 5, label: '五' }, { val: 6, label: '六' }, { val: 0, label: '日' }];

// 學生個別權限管理狀態
const displayClasses = computed(() => {
  if (isSuperAdmin.value) {
    return schoolClassNames();
  }
  return [...allowedRegularClasses.value].sort();
});
const selStudentClass = ref('');
const classStudents = ref([]);
const isFetchingStudents = ref(false);
const classAllowedMode = ref('ALL');
const classAllowedGames = ref([]);
const classAccessSaving = ref(false);
const classAccessMessage = ref('');
const vocabScopeSchemaAvailable = ref(true);
const classScopeMode = ref('ALL');
const classScopeKeys = ref([]);
const classScopeVer = ref(''); const classScopeVol = ref(''); const classScopeUnit = ref('');
const farmPolicy = ref({ mode: 'all', units: [] });
const farmPolicyGame = ref('happy');
const farmPolicyTable = computed(() => farmPolicyGame.value === 'isekai' ? 'isekai_farm_lesson_access' : 'happy_farm_lesson_access');
const farmPolicyGameName = computed(() => farmPolicyGame.value === 'isekai' ? '異世界農莊' : '開心農場');
const farmPolicyMessage = ref('');
const farmPolicySaving = ref(false);
const farmVer = ref(''); const farmVol = ref(''); const farmUnit = ref('');
const farmVolumes = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === farmVer.value).map(item => item.volume))]);
const farmUnits = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === farmVer.value && item.volume === farmVol.value).map(item => item.unit))]);
const farmUnitOptions = computed(() => [...new Map(vocabMenu.value.map(item => [farmLessonKey(item), item])).values()]);
async function fetchFarmPolicy() {
  farmPolicyMessage.value = '';
  farmPolicy.value = { mode: 'all', units: [] };
  if (!selStudentClass.value) return;
  const { data, error } = await supabase.from(farmPolicyTable.value).select('mode,units').eq('class_name', selStudentClass.value).maybeSingle();
  if (error) farmPolicyMessage.value = '農場單元權限尚未啟用，請先執行新增的 SQL：' + error.message;
  else if (data) farmPolicy.value = { mode: data.mode, units: Array.isArray(data.units) ? data.units : [] };
}
function addFarmUnit() {
  if (!farmVer.value || !farmVol.value || !farmUnit.value) return;
  const key = farmLessonKey({ version: farmVer.value, volume: farmVol.value, unit: farmUnit.value });
  if (!farmPolicy.value.units.includes(key)) farmPolicy.value.units.push(key);
}
function addFarmVolume() {
  if (!farmVer.value || !farmVol.value) return;
  for (const unit of farmUnits.value) {
    const key = farmLessonKey({ version: farmVer.value, volume: farmVol.value, unit });
    if (!farmPolicy.value.units.includes(key)) farmPolicy.value.units.push(key);
  }
}
async function saveFarmPolicy() {
  if (!selStudentClass.value || (!isSuperAdmin.value && !allowedRegularClasses.value.includes(selStudentClass.value))) return;
  farmPolicySaving.value = true;
  const { error } = await supabase.from(farmPolicyTable.value).upsert({
    class_name: selStudentClass.value, mode: farmPolicy.value.mode, units: farmPolicy.value.units,
    updated_by: String(authCookie.value?.name || '導師'), updated_at: new Date().toISOString()
  }, { onConflict: 'class_name' });
  farmPolicyMessage.value = error ? '儲存失敗：' + error.message : '已儲存。學生重新進入或操作時會套用此班設定。';
  farmPolicySaving.value = false;
}

const showStudentModal = ref(false);
const editingStudent = ref(null);
const tempAllowedMode = ref('ALL'); 
const tempAllowedGames = ref([]);
const tempScopeMode = ref('ALL');
const tempScopeKeys = ref([]);
const tempScopeVer = ref(''); const tempScopeVol = ref(''); const tempScopeUnit = ref('');

const scopeVolumes = (version) => [...new Set(vocabMenu.value.filter(item => item.version === version).map(item => item.volume))].filter(Boolean);
const scopeUnits = (version, volume) => [...new Set(vocabMenu.value.filter(item => item.version === version && item.volume === volume).map(item => item.unit))].filter(Boolean);
const addScope = (target, version, volume = '*', unit = '*') => {
  if (!version || (unit !== '*' && !volume)) return;
  const key = vocabScopeKey(version, volume, unit);
  if (!target.value.includes(key)) target.value = [...target.value, key].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
};
const removeScope = (target, key) => { target.value = target.value.filter(item => item !== key); };
const addClassScope = (level) => addScope(
  classScopeKeys,
  classScopeVer.value,
  level === 'version' ? '*' : classScopeVol.value,
  level === 'unit' ? classScopeUnit.value : '*'
);
const addStudentScope = (level) => addScope(
  tempScopeKeys,
  tempScopeVer.value,
  level === 'version' ? '*' : tempScopeVol.value,
  level === 'unit' ? tempScopeUnit.value : '*'
);
const removeClassScope = (key) => removeScope(classScopeKeys, key);
const removeStudentScope = (key) => removeScope(tempScopeKeys, key);
const scopeSummary = (policy) => {
  const normalized = normalizeVocabScope(policy);
  return normalized.mode === 'ALL' ? '全部教材' : `指定 ${normalized.scopes.length} 個範圍`;
};

const gameOrder = new Map(gamesList.map((game, index) => [game.id, index]));
const normalizeWhitelist = (games) => {
  if (!Array.isArray(games) || games.includes('ALL')) return ['ALL'];
  return [...new Set(games)]
    .filter((gameId) => gameOrder.has(gameId))
    .sort((a, b) => gameOrder.get(a) - gameOrder.get(b));
};
const sameWhitelist = (left, right) => {
  const a = normalizeWhitelist(left);
  const b = normalizeWhitelist(right);
  return a.length === b.length && a.every((gameId, index) => gameId === b[index]);
};
const categoryFullySelected = (selected, category) => category.games.every((game) => selected.includes(game.id));
const toggleCategory = (selected, category) => {
  const ids = category.games.map((game) => game.id);
  if (ids.every((gameId) => selected.includes(gameId))) return selected.filter((gameId) => !ids.includes(gameId));
  return normalizeWhitelist([...selected, ...ids]).filter((gameId) => gameId !== 'ALL');
};
const toggleClassCategory = (category) => { classAllowedGames.value = toggleCategory(classAllowedGames.value, category); };
const toggleStudentCategory = (category) => { tempAllowedGames.value = toggleCategory(tempAllowedGames.value, category); };
const syncClassAccessDraft = (students) => {
  classAccessMessage.value = '';
  if (!students.length) {
    classAllowedMode.value = 'ALL';
    classAllowedGames.value = [];
    classScopeMode.value = 'ALL';
    classScopeKeys.value = [];
    return;
  }
  const first = normalizeWhitelist(students[0].allowed_games);
  const consistent = students.every((student) => sameWhitelist(student.allowed_games, first));
  if (!consistent) {
    classAllowedMode.value = 'MIXED';
    classAllowedGames.value = [];
    classAccessMessage.value = '目前班內存在不同的個別白名單；選擇新模式並儲存後，將統一覆蓋全班。';
  } else {
    classAllowedMode.value = first.includes('ALL') ? 'ALL' : 'CUSTOM';
    classAllowedGames.value = first.includes('ALL') ? [] : first;
  }

  const firstScope = normalizeVocabScope(students[0].allowed_vocab_scope);
  const scopeConsistent = students.every((student) => sameVocabScope(student.allowed_vocab_scope, firstScope));
  classScopeMode.value = scopeConsistent ? firstScope.mode : 'MIXED';
  classScopeKeys.value = scopeConsistent ? [...firstScope.scopes] : [];

  if (consistent && scopeConsistent) {
    classAccessMessage.value = `目前全班設定一致：${first.includes('ALL') ? '全部遊戲' : `${first.length} 款遊戲`}，${scopeSummary(firstScope)}。`;
  } else {
    classAccessMessage.value = '目前班內存在不同的個別設定；選擇新模式並儲存後，將統一覆蓋全班。';
  }
};

onMounted(async () => {
  const { data: vData } = await supabase.from('vocabularies').select('version, volume, unit').limit(10000);
  if (vData) {
    const uniqueMenu = []; vData.forEach(item => { if (!uniqueMenu.find(u => u.version === item.version && u.volume === item.volume && u.unit === item.unit)) uniqueMenu.push(item); });
    vocabMenu.value = uniqueMenu;
  }

  // ✨ 修改點：要求資料庫抓出 disable_anon_login
  const { data: s } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (s) {
    gameCategories.value = normalizeGameCategories(s.game_categories);
    studentNumberSchemaAvailable.value = Object.prototype.hasOwnProperty.call(s, 'student_number_login_enabled');
    settings.value.disabled_games = s.disabled_games || []; settings.value.locked_units = s.locked_units || [];
    settings.value.restrict_play_time = s.restrict_play_time || false; settings.value.allow_play_days = s.allow_play_days || [1,2,3,4,5];
    settings.value.allow_play_start = s.allow_play_start ? s.allow_play_start.substring(0,5) : '08:00'; settings.value.allow_play_end = s.allow_play_end ? s.allow_play_end.substring(0,5) : '17:00';
    settings.value.login_blocked_message = s.login_blocked_message || '⚠️ 目前為系統管制時間，暫不開放登入喔！'; 
    settings.value.disable_anon_login = s.disable_anon_login || false;
    settings.value.student_number_login_enabled = s.student_number_login_enabled === true;
  }
  
  if (displayClasses.value.length > 0) selStudentClass.value = displayClasses.value[0];
  isLoading.value = false;
});

const availableVersions = computed(() => [...new Set(vocabMenu.value.map(item => item.version))].filter(Boolean));
const availableVolumes = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selVer.value).map(item => item.volume))].filter(Boolean));
const availableUnits = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === selVer.value && item.volume === selVol.value).map(item => item.unit))].filter(Boolean));
const onVersionChange = () => { selVol.value = ''; selUnit.value = ''; };
const onVolumeChange = () => { selUnit.value = ''; };

const addLockedUnit = () => {
  if (!selVer.value || !selVol.value || !selUnit.value) return;
  const key = `${selVer.value}|${selVol.value}|${selUnit.value}`;
  if (!settings.value.locked_units.includes(key)) settings.value.locked_units.push(key);
};
const removeLockedUnit = (index) => { settings.value.locked_units.splice(index, 1); };

const saveSettings = async () => {
  isSaving.value = true;
  const payload = {
    disabled_games: settings.value.disabled_games, locked_units: settings.value.locked_units, restrict_play_time: settings.value.restrict_play_time,
    allow_play_days: settings.value.allow_play_days, allow_play_start: settings.value.allow_play_start, allow_play_end: settings.value.allow_play_end,
    login_blocked_message: settings.value.login_blocked_message,
    disable_anon_login: settings.value.disable_anon_login
  };
  if (studentNumberSchemaAvailable.value) payload.student_number_login_enabled = settings.value.student_number_login_enabled;
  const { error } = await supabase.from('system_settings').update(payload).eq('id', 1);
  isSaving.value = false;
  if (error) alert('❌ 儲存失敗：' + error.message);
  else alert('✅ 全域權限與時間設定已成功儲存！');
};

const restoreLegacyLogin = async () => {
  if (!settings.value.student_number_login_enabled) return;
  if (!confirm('確定立即關閉正式學號登入，回復為原本的「班級＋座號＋密碼」單軌制嗎？\n\n正式學號資料會保留，之後仍可重新啟用。')) return;
  isSaving.value = true;
  const { error } = await supabase.from('system_settings')
    .update({ student_number_login_enabled: false })
    .eq('id', 1);
  isSaving.value = false;
  if (error) {
    alert('❌ 回復失敗：' + error.message);
    return;
  }
  settings.value.student_number_login_enabled = false;
  alert('✅ 已回復原有單軌制。學生重新整理登入頁後，只會看到班級與座號登入。');
};

// 學生個別權限管理邏輯
const fetchStudents = async () => {
  if (!selStudentClass.value) return;
  isFetchingStudents.value = true;
  classStudents.value = [];
  classAllowedMode.value = 'ALL';
  classAllowedGames.value = [];
  classAccessMessage.value = '';
  let { data, error } = await supabase.from('students').select('id, real_name, seat_number, allowed_games, allowed_vocab_scope').eq('class_name', selStudentClass.value).order('seat_number', { ascending: true });
  if (error && /allowed_vocab_scope/i.test(error.message || '')) {
    vocabScopeSchemaAvailable.value = false;
    const fallback = await supabase.from('students').select('id, real_name, seat_number, allowed_games').eq('class_name', selStudentClass.value).order('seat_number', { ascending: true });
    data = (fallback.data || []).map(student => ({ ...student, allowed_vocab_scope: { mode: 'ALL', scopes: [] } }));
    error = fallback.error;
  } else if (!error) {
    vocabScopeSchemaAvailable.value = true;
  }
  if (error) {
    classStudents.value = [];
    classAccessMessage.value = `讀取學生失敗：${error.message}`;
  } else {
    classStudents.value = data || [];
    syncClassAccessDraft(classStudents.value);
  }
  isFetchingStudents.value = false;
};
watch(selStudentClass, fetchStudents);
watch(selStudentClass, fetchFarmPolicy);
watch(farmPolicyGame, fetchFarmPolicy);

const openStudentModal = (student) => {
  editingStudent.value = student;
  const currentAllowed = student.allowed_games || ['ALL'];
  if (currentAllowed.includes('ALL')) { tempAllowedMode.value = 'ALL'; tempAllowedGames.value = []; } 
  else { tempAllowedMode.value = 'CUSTOM'; tempAllowedGames.value = [...currentAllowed]; }
  const currentScope = normalizeVocabScope(student.allowed_vocab_scope);
  tempScopeMode.value = currentScope.mode;
  tempScopeKeys.value = [...currentScope.scopes];
  tempScopeVer.value = ''; tempScopeVol.value = ''; tempScopeUnit.value = '';
  showStudentModal.value = true;
};

const saveClassAccess = async () => {
  if (!selStudentClass.value || !displayClasses.value.includes(selStudentClass.value)) return;
  if (!classStudents.value.length) {
    classAccessMessage.value = '此班目前沒有學生，沒有可套用的帳號。';
    return;
  }
  if (classAllowedMode.value === 'MIXED' || classScopeMode.value === 'MIXED') {
    classAccessMessage.value = '請先為遊戲及教材範圍各選擇一種設定模式。';
    return;
  }
  const finalAllowed = classAllowedMode.value === 'ALL' ? ['ALL'] : normalizeWhitelist(classAllowedGames.value).filter((gameId) => gameId !== 'ALL');
  const finalScope = normalizeVocabScope({ mode: classScopeMode.value, scopes: classScopeKeys.value });
  if (classAllowedMode.value === 'CUSTOM' && finalAllowed.length === 0 && !confirm('目前沒有勾選任何遊戲，套用後全班都無法進行遊戲。確定繼續嗎？')) return;
  if (classScopeMode.value === 'CUSTOM' && finalScope.scopes.length === 0 && !confirm('目前沒有加入任何教材範圍，套用後全班都無法選擇單元。確定繼續嗎？')) return;
  if (!confirm(`確定將遊戲與教材範圍套用到 ${selStudentClass.value} 班全部 ${classStudents.value.length} 位學生嗎？\n\n這會覆蓋目前的個別學生設定；之後仍可再為單一學生設定例外。`)) return;

  classAccessSaving.value = true;
  classAccessMessage.value = '';
  const payload = { allowed_games: finalAllowed };
  if (vocabScopeSchemaAvailable.value) payload.allowed_vocab_scope = finalScope;
  const { error } = await supabase.from('students').update(payload).eq('class_name', selStudentClass.value);
  classAccessSaving.value = false;
  if (error) {
    classAccessMessage.value = `全班套用失敗：${error.message}`;
    return;
  }
  classStudents.value = classStudents.value.map((student) => ({ ...student, allowed_games: [...finalAllowed], allowed_vocab_scope: finalScope }));
  syncClassAccessDraft(classStudents.value);
  classAccessMessage.value = vocabScopeSchemaAvailable.value
    ? `已將遊戲與教材範圍套用到 ${selStudentClass.value} 班 ${classStudents.value.length} 位學生；學生重新整理前台後生效。`
    : '遊戲白名單已儲存；教材範圍尚未儲存，請先執行本次 Supabase SQL。';
};

const saveStudentAccess = async () => {
  const finalAllowed = tempAllowedMode.value === 'ALL' ? ['ALL'] : normalizeWhitelist(tempAllowedGames.value).filter((gameId) => gameId !== 'ALL');
  const finalScope = normalizeVocabScope({ mode: tempScopeMode.value, scopes: tempScopeKeys.value });
  if (tempAllowedMode.value === 'CUSTOM' && finalAllowed.length === 0) {
    if (!confirm('您沒有勾選任何遊戲，這位學生將無法進行任何挑戰！確定要這樣設定嗎？')) return;
  }
  if (tempScopeMode.value === 'CUSTOM' && finalScope.scopes.length === 0 && !confirm('沒有加入教材範圍，這位學生將無法選擇任何單元。確定繼續嗎？')) return;
  const payload = { allowed_games: finalAllowed };
  if (vocabScopeSchemaAvailable.value) payload.allowed_vocab_scope = finalScope;
  const { error } = await supabase.from('students').update(payload).eq('id', editingStudent.value.id);
  if (error) {
    alert(`❌ 儲存失敗：${error.message}`);
    return;
  }
  alert(vocabScopeSchemaAvailable.value
    ? `✅ 已更新 ${editingStudent.value.real_name} 的遊戲與教材範圍！`
    : `⚠️ 已更新遊戲白名單；教材範圍需先執行 Supabase SQL 才能儲存。`);
  showStudentModal.value = false;
  fetchStudents();
};
</script>

<template>
  <div class="access-container">
    <div class="header">
      <h1>🛑 遊戲權限與開放時間管理</h1>
      <div style="display: flex; gap: 10px;">
        <NuxtLink to="/admin" class="retro-btn btn-secondary" style="text-decoration:none;">返回後台首頁</NuxtLink>
        <button v-if="isSuperAdmin" class="retro-btn btn-primary" @click="saveSettings">{{ isSaving ? '儲存中...' : '💾 儲存全域設定' }}</button>
      </div>
    </div>

    <div v-if="isLoading">載入中...</div>
    
    <div v-else class="content-grid">
      
      <template v-if="isSuperAdmin">

        <div v-if="studentNumberSchemaAvailable" class="admin-card" style="border-color: #1565c0;">
          <h3 style="color: #0d47a1;">🪪 學生雙重登入與回復機制</h3>
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.student_number_login_enabled" />
            <b>啟用七年級「正式學號＋原有密碼」登入</b>
          </label>
          <p style="font-size: 0.95rem; color: #555; line-height: 1.6;">
            啟用後，七年級學生可選擇正式學號或原本的班級＋座號登入；兩種方式會連到同一個既有帳號與學習進度。變更一般開關後，請按右上角「儲存全域設定」。
          </p>
          <div class="rollback-box">
            <b>回復現狀：</b>只關閉正式學號入口，不刪除學號、不改動密碼，也不移動任何進度。
            <button type="button" class="retro-btn btn-danger" :disabled="!settings.student_number_login_enabled || isSaving" @click="restoreLegacyLogin">
              ↩ 一鍵回復原有單軌制
            </button>
          </div>
        </div>
        <div v-else class="admin-card" style="border-color: #ff9800;">
          <h3 style="color: #e65100;">🪪 正式學號登入尚未啟用</h3>
          <p style="line-height: 1.6; color: #555;">目前安全維持原有班級＋座號單軌制。請先在 Supabase 執行本次資料庫設定，重新整理後才會顯示雙重登入開關。</p>
        </div>
        
        <div class="admin-card" style="border-color: #f44336;">
          <h3 style="color: #c62828;">🚫 訪客登入限制</h3>
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.disable_anon_login" />
            <b style="color: #d32f2f;">禁止匿名訪客登入</b>
          </label>
          <p style="font-size: 0.95rem; color: #555; margin-top: 5px;">
            勾選後，前台登入畫面的「匿名挑戰」選項將會被隱藏，強制所有人必須使用正確的班級與座號登入，以防止學生鑽漏洞規避追蹤。
          </p>
        </div>

        <div class="admin-card">
          <h3>⏳ 全站開放時間限制</h3>
          <label class="toggle-label"><input type="checkbox" v-model="settings.restrict_play_time" /><b>啟用全站時間限制</b></label>
          <div v-if="settings.restrict_play_time" class="time-settings-box">
            <div style="margin-bottom: 10px;"><b>開放星期：</b><div class="days-grid"><label v-for="day in daysList" :key="day.val" class="day-cb"><input type="checkbox" :value="day.val" v-model="settings.allow_play_days" />週{{ day.label }}</label></div></div>
            <div><b>開放時段：</b><input type="time" v-model="settings.allow_play_start" class="retro-input time-input" />～<input type="time" v-model="settings.allow_play_end" class="retro-input time-input" /></div>
            <div style="margin-top: 15px; border-top: 1px dashed #ced4da; padding-top: 15px;">
              <label style="color: #d32f2f; font-weight: bold; display: block; margin-bottom: 5px;">🛑 阻擋登入提示訊息：</label>
              <textarea v-model="settings.login_blocked_message" class="retro-input" rows="3" style="width: 100%; border-color: #f44336; background: #ffebee;"></textarea>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <h3>🔒 鎖定特定單元</h3>
          <p style="font-size: 0.9rem; color: #555;">被鎖定的單元，學生在前台選中時將無法按「開始挑戰」。</p>
          <div class="unit-selector">
            <select v-model="selVer" @change="onVersionChange" class="retro-input"><option value="" disabled>版本...</option><option v-for="v in availableVersions" :key="v" :value="v">{{ v }}</option></select>
            <select v-model="selVol" @change="onVolumeChange" class="retro-input" :disabled="!selVer"><option value="" disabled>冊數...</option><option v-for="vol in availableVolumes" :key="vol" :value="vol">{{ vol }}</option></select>
            <select v-model="selUnit" class="retro-input" :disabled="!selVol"><option value="" disabled>單元...</option><option v-for="u in availableUnits" :key="u" :value="u">{{ u }}</option></select>
            <button class="retro-btn btn-danger" @click="addLockedUnit" :disabled="!selUnit">加入黑名單</button>
          </div>
          <div class="locked-list">
            <div v-for="(locked, i) in settings.locked_units" :key="i" class="locked-tag">{{ locked.replace(/\|/g, ' - ') }}<button @click="removeLockedUnit(i)" class="del-btn">✖</button></div>
            <div v-if="settings.locked_units.length === 0" style="color:#aaa;">目前無鎖定單元</div>
          </div>
        </div>

        <div class="admin-card">
          <h3>🎮 遊戲模組停用設定 (全校)</h3>
          <p style="font-size: 0.9rem; color: #555; margin-bottom: 15px;">打勾的遊戲代表「全校維護中」，所有人皆無法遊玩。</p>
          <div class="games-grid">
            <label v-for="game in gamesList" :key="game.id" class="game-cb" :class="{ 'is-disabled': settings.disabled_games.includes(game.id) }">
              <input type="checkbox" :value="game.id" v-model="settings.disabled_games" />{{ game.name }}
            </label>
          </div>
        </div>
      </template>

      <div class="admin-card full-width" style="border-color: #4caf50;">
        <h3>🌻 農場遊戲可玩範圍</h3>
        <p>以學生原班為單位，分別設定兩款農場遊戲。白名單只允許列出的單元；黑名單禁止列出的單元。</p>
        <div class="unit-selector"><label><input v-model="farmPolicyGame" type="radio" value="happy"> 單字開心農場</label><label><input v-model="farmPolicyGame" type="radio" value="isekai"> 單字異世界悠閒農莊</label></div>
        <p><strong>目前班級：{{ selStudentClass || '請先選班級' }}</strong></p>
        <div class="unit-selector"><label><input v-model="farmPolicy.mode" type="radio" value="all"> 全部開放</label><label><input v-model="farmPolicy.mode" type="radio" value="allow"> 只准清單</label><label><input v-model="farmPolicy.mode" type="radio" value="deny"> 禁止清單</label></div>
        <template v-if="farmPolicy.mode !== 'all'">
          <div class="unit-selector"><select v-model="farmVer" class="retro-input" @change="farmVol = ''; farmUnit = ''"><option value="">版本</option><option v-for="version in availableVersions" :key="version">{{ version }}</option></select><select v-model="farmVol" class="retro-input" @change="farmUnit = ''"><option value="">冊數</option><option v-for="volume in farmVolumes" :key="volume">{{ volume }}</option></select><select v-model="farmUnit" class="retro-input"><option value="">單元</option><option v-for="unit in farmUnits" :key="unit">{{ unit }}</option></select><button class="retro-btn btn-primary" type="button" :disabled="!farmUnit" @click="addFarmUnit">加入單元</button><button class="retro-btn btn-secondary" type="button" :disabled="!farmVol" @click="addFarmVolume">加入整冊</button></div>
          <div class="locked-list"><span v-for="key in farmPolicy.units" :key="key" class="locked-tag">{{ key.replace(/\|/g, ' · ') }} <button type="button" class="del-btn" @click="farmPolicy.units = farmPolicy.units.filter(item => item !== key)">✖</button></span><span v-if="!farmPolicy.units.length">目前尚未選單元</span></div>
          <small>共 {{ farmUnitOptions.length }} 個單元可選；白名單若為空，這個班暫時不能玩{{ farmPolicyGameName }}。</small>
        </template>
        <p v-if="farmPolicyMessage" role="status">{{ farmPolicyMessage }}</p>
        <button class="retro-btn btn-primary" type="button" :disabled="!selStudentClass || farmPolicySaving" @click="saveFarmPolicy">{{ farmPolicySaving ? '儲存中…' : `儲存${farmPolicyGameName}範圍` }}</button>
      </div>

      <div class="admin-card full-width" style="border-color: #4caf50;">
        <h3 style="color: #2e7d32; border-bottom-color: #a5d6a7;">🧑‍🎓 班級與學生遊戲開放設定（白名單）</h3>
        <p style="font-size: 0.95rem; color: #555; margin-bottom: 15px;">先以班級統一設定可用遊戲與教材版本／範圍，再針對需要不同安排的學生個別覆寫。</p>
        
        <div style="margin-bottom: 15px;">
          <label style="font-weight: bold; margin-right: 10px;">選擇班級：</label>
          <select v-model="selStudentClass" class="retro-input" style="width: 200px;">
            <option v-if="displayClasses.length === 0" value="">(無授權班級)</option>
            <option v-for="cls in displayClasses" :key="cls" :value="cls">{{ cls }} 班</option>
          </select>
        </div>

        <section class="class-access-panel" aria-labelledby="class-access-title">
          <div class="class-access-heading">
            <div>
              <h4 id="class-access-title">👥 {{ selStudentClass || '目前' }} 班統一白名單</h4>
              <p>分類及順序與「前台排版管理」完全相同。儲存後會一次套用全班，之後仍可在下方設定個別例外。</p>
            </div>
            <span class="student-count">{{ classStudents.length }} 位學生</span>
          </div>

          <div class="radio-group compact-radio-group">
            <label><input v-model="classAllowedMode" type="radio" value="ALL"> 🟢 全部開放</label>
            <label><input v-model="classAllowedMode" type="radio" value="CUSTOM"> 🟠 依分類自訂白名單</label>
            <span v-if="classAllowedMode === 'MIXED'" class="mixed-badge">目前班內設定不一致</span>
          </div>

          <template v-if="classAllowedMode === 'CUSTOM'">
            <div class="selection-toolbar">
              <button type="button" class="mini-action" @click="classAllowedGames = gamesList.map(game => game.id)">全選所有遊戲</button>
              <button type="button" class="mini-action" @click="classAllowedGames = []">全部取消</button>
              <strong>已選 {{ classAllowedGames.length }}／{{ gamesList.length }} 款</strong>
            </div>
            <div class="permission-categories">
              <fieldset v-for="category in groupedGames" :key="category.id" class="permission-category">
                <legend>
                  <label>
                    <input type="checkbox" :checked="categoryFullySelected(classAllowedGames, category)" @change="toggleClassCategory(category)">
                    {{ category.name }}（{{ category.games.length }}）
                  </label>
                </legend>
                <div class="category-games-grid">
                  <label v-for="game in category.games" :key="game.id" class="custom-game-cb" :class="{ selected: classAllowedGames.includes(game.id) }">
                    <input v-model="classAllowedGames" type="checkbox" :value="game.id">
                    {{ game.name }}
                  </label>
                </div>
              </fieldset>
            </div>
          </template>

          <div class="scope-section">
            <h4>📚 全班可用教材版本與範圍</h4>
            <p>可開放整個版本、指定冊別或單一單元。設定會套用到所有需要選擇教材單元的遊戲。</p>
            <div v-if="!vocabScopeSchemaAvailable" class="schema-warning">
              尚未啟用教材範圍資料欄位。請先在 Supabase 執行
              <code>supabase/sql-editor/student_vocab_scope_existing_project_setup.sql</code>；目前仍維持全部教材可用。
            </div>
            <div class="radio-group compact-radio-group">
              <label><input v-model="classScopeMode" type="radio" value="ALL" :disabled="!vocabScopeSchemaAvailable"> 🟢 全部版本與單元</label>
              <label><input v-model="classScopeMode" type="radio" value="CUSTOM" :disabled="!vocabScopeSchemaAvailable"> 🟠 指定教材範圍</label>
              <span v-if="classScopeMode === 'MIXED'" class="mixed-badge">目前班內範圍不一致</span>
            </div>
            <template v-if="classScopeMode === 'CUSTOM'">
              <div class="scope-builder">
                <select v-model="classScopeVer" class="retro-input" @change="classScopeVol = ''; classScopeUnit = ''">
                  <option value="">選擇版本</option><option v-for="version in availableVersions" :key="version" :value="version">{{ version }}</option>
                </select>
                <select v-model="classScopeVol" class="retro-input" :disabled="!classScopeVer" @change="classScopeUnit = ''">
                  <option value="">選擇冊別</option><option v-for="volume in scopeVolumes(classScopeVer)" :key="volume" :value="volume">{{ volume }}</option>
                </select>
                <select v-model="classScopeUnit" class="retro-input" :disabled="!classScopeVol">
                  <option value="">選擇單元</option><option v-for="unit in scopeUnits(classScopeVer, classScopeVol)" :key="unit" :value="unit">{{ unit }}</option>
                </select>
              </div>
              <div class="scope-actions">
                <button type="button" class="mini-action" :disabled="!classScopeVer" @click="addClassScope('version')">＋ 整個版本</button>
                <button type="button" class="mini-action" :disabled="!classScopeVol" @click="addClassScope('volume')">＋ 整冊</button>
                <button type="button" class="mini-action" :disabled="!classScopeUnit" @click="addClassScope('unit')">＋ 單元</button>
                <button type="button" class="mini-action" @click="classScopeKeys = []">清空範圍</button>
              </div>
              <div class="scope-tags">
                <span v-for="key in classScopeKeys" :key="key" class="scope-tag">{{ formatVocabScope(key) }} <button type="button" @click="removeClassScope(key)">✖</button></span>
                <span v-if="!classScopeKeys.length" class="empty-scope">尚未加入範圍；儲存後全班將無法選擇教材單元。</span>
              </div>
            </template>
          </div>

          <p v-if="classAccessMessage" class="access-message" role="status">{{ classAccessMessage }}</p>
          <button type="button" class="retro-btn btn-primary" :disabled="!selStudentClass || !classStudents.length || classAccessSaving" @click="saveClassAccess">
            {{ classAccessSaving ? '套用中…' : `💾 套用到 ${selStudentClass || '目前'} 班全班` }}
          </button>
        </section>

        <div v-if="isFetchingStudents">讀取學生名單中...</div>
        <table v-else class="students-table">
          <thead><tr><th width="60">座號</th><th>姓名</th><th>遊戲權限</th><th>教材範圍</th><th width="120">操作</th></tr></thead>
          <tbody>
            <tr v-for="stu in classStudents" :key="stu.id">
              <td>{{ stu.seat_number }}</td>
              <td style="font-weight: bold;">{{ stu.real_name }}</td>
              <td>
                <span v-if="!stu.allowed_games || stu.allowed_games.includes('ALL')" class="badge bg-green">🟢 全部開放</span>
                <span v-else class="badge bg-orange">🟠 自訂白名單 (開放 {{ stu.allowed_games.length }} 款)</span>
              </td>
              <td><span class="badge" :class="normalizeVocabScope(stu.allowed_vocab_scope).mode === 'ALL' ? 'bg-green' : 'bg-blue'">{{ scopeSummary(stu.allowed_vocab_scope) }}</span></td>
              <td><button class="retro-btn btn-small" @click="openStudentModal(stu)">⚙️ 設定</button></td>
            </tr>
            <tr v-if="classStudents.length === 0"><td colspan="5" style="text-align: center; color: #777;">此班級目前無學生資料</td></tr>
          </tbody>
        </table>
      </div>

    </div>

    <div v-if="showStudentModal" class="modal-overlay">
      <div class="modal-box retro-element">
        <h2 style="margin-top:0; border-bottom: 2px dashed #ccc; padding-bottom: 10px; color: #1565c0;">
          ⚙️ 設定 {{ editingStudent?.real_name }} 的可用遊戲
        </h2>
        
        <div class="radio-group">
          <label><input type="radio" v-model="tempAllowedMode" value="ALL"> 🟢 全部開放 (跟隨全校設定)</label>
          <label><input type="radio" v-model="tempAllowedMode" value="CUSTOM"> 🟠 自訂白名單 (只能玩勾選的遊戲)</label>
        </div>

        <div v-if="tempAllowedMode === 'CUSTOM'">
          <div class="selection-toolbar">
            <button type="button" class="mini-action" @click="tempAllowedGames = gamesList.map(game => game.id)">全選所有遊戲</button>
            <button type="button" class="mini-action" @click="tempAllowedGames = []">全部取消</button>
            <strong>已選 {{ tempAllowedGames.length }}／{{ gamesList.length }} 款</strong>
          </div>
          <div class="permission-categories">
            <fieldset v-for="category in groupedGames" :key="category.id" class="permission-category">
              <legend>
                <label>
                  <input type="checkbox" :checked="categoryFullySelected(tempAllowedGames, category)" @change="toggleStudentCategory(category)">
                  {{ category.name }}（{{ category.games.length }}）
                </label>
              </legend>
              <div class="category-games-grid">
                <label v-for="game in category.games" :key="game.id" class="custom-game-cb" :class="{ selected: tempAllowedGames.includes(game.id) }">
                  <input v-model="tempAllowedGames" type="checkbox" :value="game.id">
                  {{ game.name }}
                </label>
              </div>
            </fieldset>
          </div>
        </div>

        <div class="scope-section modal-scope-section">
          <h3>📚 個別教材版本與範圍</h3>
          <p>這裡可覆寫剛才套用的全班設定，只影響這位學生。</p>
          <div class="radio-group compact-radio-group">
            <label><input v-model="tempScopeMode" type="radio" value="ALL" :disabled="!vocabScopeSchemaAvailable"> 🟢 全部版本與單元</label>
            <label><input v-model="tempScopeMode" type="radio" value="CUSTOM" :disabled="!vocabScopeSchemaAvailable"> 🟠 指定教材範圍</label>
          </div>
          <template v-if="tempScopeMode === 'CUSTOM'">
            <div class="scope-builder">
              <select v-model="tempScopeVer" class="retro-input" @change="tempScopeVol = ''; tempScopeUnit = ''">
                <option value="">選擇版本</option><option v-for="version in availableVersions" :key="version" :value="version">{{ version }}</option>
              </select>
              <select v-model="tempScopeVol" class="retro-input" :disabled="!tempScopeVer" @change="tempScopeUnit = ''">
                <option value="">選擇冊別</option><option v-for="volume in scopeVolumes(tempScopeVer)" :key="volume" :value="volume">{{ volume }}</option>
              </select>
              <select v-model="tempScopeUnit" class="retro-input" :disabled="!tempScopeVol">
                <option value="">選擇單元</option><option v-for="unit in scopeUnits(tempScopeVer, tempScopeVol)" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
            <div class="scope-actions">
              <button type="button" class="mini-action" :disabled="!tempScopeVer" @click="addStudentScope('version')">＋ 整個版本</button>
              <button type="button" class="mini-action" :disabled="!tempScopeVol" @click="addStudentScope('volume')">＋ 整冊</button>
              <button type="button" class="mini-action" :disabled="!tempScopeUnit" @click="addStudentScope('unit')">＋ 單元</button>
              <button type="button" class="mini-action" @click="tempScopeKeys = []">清空範圍</button>
            </div>
            <div class="scope-tags">
              <span v-for="key in tempScopeKeys" :key="key" class="scope-tag">{{ formatVocabScope(key) }} <button type="button" @click="removeStudentScope(key)">✖</button></span>
              <span v-if="!tempScopeKeys.length" class="empty-scope">尚未加入範圍；儲存後這位學生將無法選擇教材單元。</span>
            </div>
          </template>
        </div>

        <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button class="retro-btn btn-primary" @click="saveStudentAccess">💾 儲存學生設定</button>
          <button class="retro-btn btn-secondary" @click="showStudentModal = false">❌ 取消</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.access-container { padding: 20px; max-width: 1100px; margin: 0 auto; color: #333; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
.retro-btn { padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 2px solid; transition: 0.1s; }
.retro-btn.btn-small { padding: 4px 8px; font-size: 0.9rem;}
.retro-btn:active:not(:disabled) { transform: translateY(3px); }
.btn-primary { background: #007bff; color: white; border-color: #0056b3; }
.btn-secondary { background: #e0e0e0; color: #333; border-color: #ccc; }
.btn-danger { background: #dc3545; color: white; border-color: #a71d2a; }
.retro-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.admin-card { background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; }
.full-width { grid-column: 1 / -1; }
.admin-card h3 { margin-top: 0; color: #495057; border-bottom: 2px dashed #ced4da; padding-bottom: 10px; }
.rollback-box { display: grid; gap: 10px; margin-top: 14px; padding: 12px; border: 1px dashed #1565c0; border-radius: 6px; background: #e3f2fd; line-height: 1.5; }
.rollback-box .retro-btn { justify-self: start; }

.toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 1.1rem; margin-bottom: 15px; }
.time-settings-box { background: #e9ecef; padding: 15px; border-radius: 8px; border: 1px solid #ced4da; }
.days-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px; }
.day-cb { background: #fff; padding: 5px 10px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; }
.retro-input { padding: 8px; border-radius: 4px; border: 1px solid #aaa; font-size: 1rem; }
.time-input { width: 130px; font-weight: bold; text-align: center; }

.unit-selector { display: flex; gap: 5px; margin-bottom: 15px; flex-wrap: wrap; }
.unit-selector select { flex: 1; min-width: 100px; }

.locked-list { display: flex; flex-wrap: wrap; gap: 8px; }
.locked-tag { background: #ffebee; color: #c62828; border: 1px solid #ef5350; padding: 5px 12px; border-radius: 20px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
.del-btn { background: none; border: none; color: #c62828; font-weight: bold; cursor: pointer; padding: 0; font-size: 1.1rem; }

.games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.game-cb { background: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: bold; transition: 0.2s;}
.game-cb.is-disabled { background: #ffebee; border-color: #ef5350; color: #c62828; text-decoration: line-through; }

/* 學生管理表格樣式 */
.class-access-panel { margin: 18px 0 22px; padding: 18px; border: 2px solid #81c784; border-radius: 10px; background: #f1f8e9; }
.class-access-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.class-access-heading h4 { margin: 0 0 6px; color: #1b5e20; font-size: 1.15rem; }
.class-access-heading p { margin: 0 0 14px; color: #455a64; line-height: 1.55; }
.student-count { flex: 0 0 auto; padding: 5px 10px; border-radius: 999px; background: #2e7d32; color: white; font-weight: bold; }
.compact-radio-group { flex-direction: row; flex-wrap: wrap; margin-bottom: 14px; background: white; }
.compact-radio-group label { font-size: 1rem; }
.mixed-badge { padding: 5px 10px; border-radius: 999px; background: #fff3e0; color: #e65100; font-weight: bold; }
.selection-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.selection-toolbar strong { margin-left: auto; color: #455a64; }
.mini-action { padding: 6px 10px; border: 1px solid #78909c; border-radius: 5px; background: white; color: #37474f; font-weight: bold; cursor: pointer; }
.permission-categories { display: grid; gap: 14px; margin-bottom: 14px; }
.permission-category { min-width: 0; margin: 0; padding: 12px; border: 1px solid #b0bec5; border-radius: 8px; background: white; }
.permission-category legend { padding: 0 7px; color: #263238; font-weight: bold; }
.permission-category legend label { display: flex; align-items: center; gap: 7px; cursor: pointer; }
.category-games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; }
.access-message { padding: 10px 12px; border-left: 4px solid #2e7d32; background: white; color: #263238; line-height: 1.5; }
.students-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;}
.students-table th, .students-table td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
.students-table th { background: #e8f5e9; color: #1b5e20; }
.badge { padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; color: white; display: inline-block;}
.bg-green { background: #4caf50; }
.bg-orange { background: #ff9800; }
.bg-blue { background: #1976d2; }
.scope-section { margin-top: 20px; padding-top: 18px; border-top: 2px dashed #a5d6a7; }
.scope-section h4, .scope-section h3 { margin: 0 0 6px; color: #1565c0; }
.scope-section > p { margin: 0 0 12px; color: #455a64; line-height: 1.5; }
.scope-builder { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.scope-actions, .scope-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.scope-tag { display: inline-flex; align-items: center; gap: 7px; padding: 6px 10px; border: 1px solid #64b5f6; border-radius: 999px; background: #e3f2fd; color: #0d47a1; font-weight: bold; }
.scope-tag button { border: 0; background: transparent; color: #c62828; cursor: pointer; font-weight: bold; }
.empty-scope { color: #c62828; font-weight: bold; }
.schema-warning { margin: 10px 0; padding: 10px; border: 1px solid #ffb74d; border-radius: 6px; background: #fff3e0; color: #bf360c; line-height: 1.5; }
.schema-warning code { overflow-wrap: anywhere; }
.modal-scope-section { border-top-color: #90caf9; }

/* Modal 樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box;}
.modal-box { background: white; padding: 25px; border-radius: 12px; border: 3px solid #1565c0; width: 100%; max-width: 900px; max-height: 90vh; overflow-y: auto;}
.radio-group { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; background: #f5f5f5; padding: 15px; border-radius: 8px; border: 1px dashed #ccc;}
.radio-group label { font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px;}
.radio-group input[type="radio"] { width: 18px; height: 18px; cursor: pointer; }
.custom-game-cb { display: flex; align-items: center; gap: 8px; background: white; padding: 8px; border-radius: 6px; border: 1px solid #ccc; cursor: pointer; font-size: 0.95rem; font-weight: bold;}
.custom-game-cb:hover { border-color: #ff9800; }
.custom-game-cb.selected { background: #e8f5e9; border-color: #4caf50; color: #1b5e20; }

@media (max-width: 768px) {
  .content-grid, .category-games-grid, .scope-builder { grid-template-columns: 1fr; }
  .header, .class-access-heading { align-items: stretch; flex-direction: column; }
  .student-count { align-self: flex-start; }
  .selection-toolbar strong { width: 100%; margin-left: 0; }
}
</style>
