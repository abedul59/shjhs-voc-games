<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { regularClassPermissions, schoolClassNames } from '~/lib/admin-class-permissions';
import { GAME_ACCESS_CATALOG, gamesGroupedByCategory, normalizeGameCategories } from '~/lib/game-access-catalog';
import { formatVocabScope, normalizeVocabScope, vocabScopeKey } from '~/lib/vocab-scope-access';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');
const allowedClasses = Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : [];
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.includes('ALL'));
const displayClasses = computed(() => isSuperAdmin.value ? schoolClassNames() : [...regularClassPermissions(allowedClasses)].sort());

const selectedClass = ref('');
const rules = ref([]);
const students = ref([]);
const vocabMenu = ref([]);
const gameCategories = ref(normalizeGameCategories([]));
const groupedGames = computed(() => gamesGroupedByCategory(gameCategories.value));
const isLoading = ref(true);
const isSaving = ref(false);
const message = ref('');
const schemaAvailable = ref(true);
const editingId = ref(null);
const selectedRuleId = ref(null);
const overrideDrafts = ref({});
const scopeVersion = ref('');
const scopeVolume = ref('');
const scopeUnit = ref('');

const blankRule = () => ({
  name: '', enabled: true, source_game_ids: [], target_game_ids: [],
  requirement_scope: { mode: 'ALL', scopes: [] }, condition_mode: 'plays',
  required_plays: 3, required_score: 80
});
const form = ref(blankRule());
const selectedRule = computed(() => rules.value.find(rule => rule.id === selectedRuleId.value) || null);
const availableVersions = computed(() => [...new Set(vocabMenu.value.map(item => item.version))].filter(Boolean));
const availableVolumes = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === scopeVersion.value).map(item => item.volume))].filter(Boolean));
const availableUnits = computed(() => [...new Set(vocabMenu.value.filter(item => item.version === scopeVersion.value && item.volume === scopeVolume.value).map(item => item.unit))].filter(Boolean));
const conditionLabel = mode => ({ plays: '完成次數', score: '最高分', either: '次數或最高分（任一）', both: '次數及最高分（皆須）' }[mode] || mode);
const gameName = id => GAME_ACCESS_CATALOG.find(game => game.id === id)?.name || id;

const loadBaseData = async () => {
  const [{ data: settings }, { data: vocab }] = await Promise.all([
    supabase.from('system_settings').select('game_categories').eq('id', 1).single(),
    supabase.from('vocabularies').select('version,volume,unit').limit(10000)
  ]);
  gameCategories.value = normalizeGameCategories(settings?.game_categories);
  vocabMenu.value = [...new Map((vocab || []).map(item => [`${item.version}|${item.volume}|${item.unit}`, item])).values()];
};

const loadClassData = async () => {
  if (!selectedClass.value) return;
  isLoading.value = true;
  message.value = '';
  const [ruleResult, studentResult] = await Promise.all([
    supabase.from('class_game_unlock_rules').select('*').eq('class_name', selectedClass.value).order('id'),
    supabase.from('students').select('id,student_id,real_name,seat_number').eq('class_name', selectedClass.value).order('seat_number')
  ]);
  schemaAvailable.value = !ruleResult.error;
  if (ruleResult.error) {
    rules.value = [];
    message.value = `尚未啟用遊戲解鎖資料表：${ruleResult.error.message}。請先執行 class_game_unlock_rules_existing_project_setup.sql。`;
  } else {
    rules.value = ruleResult.data || [];
  }
  students.value = studentResult.data || [];
  if (selectedRuleId.value && !rules.value.some(rule => rule.id === selectedRuleId.value)) selectedRuleId.value = null;
  isLoading.value = false;
};

onMounted(async () => {
  await loadBaseData();
  selectedClass.value = displayClasses.value[0] || '';
  if (selectedClass.value) await loadClassData();
  else isLoading.value = false;
});
watch(selectedClass, async (value, oldValue) => {
  if (!value || value === oldValue) return;
  editingId.value = null; selectedRuleId.value = null; form.value = blankRule();
  await loadClassData();
});

const newRule = () => { editingId.value = null; form.value = blankRule(); message.value = ''; };
const editRule = rule => {
  editingId.value = rule.id;
  form.value = {
    ...rule,
    source_game_ids: [...(rule.source_game_ids || [])], target_game_ids: [...(rule.target_game_ids || [])],
    requirement_scope: normalizeVocabScope(rule.requirement_scope)
  };
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
const toggleCategoryGames = (field, category) => {
  const ids = category.games.map(game => game.id);
  const current = form.value[field];
  form.value[field] = ids.every(id => current.includes(id))
    ? current.filter(id => !ids.includes(id)) : [...new Set([...current, ...ids])];
};
const addScope = level => {
  if (!scopeVersion.value) return;
  const key = vocabScopeKey(scopeVersion.value, level === 'version' ? '*' : scopeVolume.value, level === 'unit' ? scopeUnit.value : '*');
  form.value.requirement_scope = { mode: 'CUSTOM', scopes: [...new Set([...form.value.requirement_scope.scopes, key])].sort() };
};
const removeScope = key => { form.value.requirement_scope.scopes = form.value.requirement_scope.scopes.filter(item => item !== key); };

const saveRule = async () => {
  if (!selectedClass.value || !schemaAvailable.value) return;
  if (!form.value.name.trim()) return alert('請輸入規則名稱。');
  if (!form.value.source_game_ids.length) return alert('請至少選擇一個累積條件的來源遊戲。');
  if (!form.value.target_game_ids.length) return alert('請至少選擇一個達標後解鎖的遊戲。');
  if (form.value.requirement_scope.mode === 'CUSTOM' && !form.value.requirement_scope.scopes.length) return alert('指定教材範圍時，請至少加入一個範圍。');
  const usesPlays = ['plays', 'either', 'both'].includes(form.value.condition_mode);
  const usesScore = ['score', 'either', 'both'].includes(form.value.condition_mode);
  if (usesPlays && Number(form.value.required_plays) <= 0) return alert('完成次數必須大於 0。');
  if (usesScore && Number(form.value.required_score) <= 0) return alert('最高分門檻必須大於 0。');
  const payload = {
    class_name: selectedClass.value, name: form.value.name.trim(), enabled: form.value.enabled,
    source_game_ids: form.value.source_game_ids, target_game_ids: form.value.target_game_ids,
    requirement_scope: normalizeVocabScope(form.value.requirement_scope), condition_mode: form.value.condition_mode,
    required_plays: Math.max(0, Number(form.value.required_plays) || 0),
    required_score: Math.max(0, Number(form.value.required_score) || 0), updated_at: new Date().toISOString()
  };
  isSaving.value = true;
  const result = editingId.value
    ? await supabase.from('class_game_unlock_rules').update(payload).eq('id', editingId.value)
    : await supabase.from('class_game_unlock_rules').insert([payload]);
  isSaving.value = false;
  if (result.error) return message.value = `儲存失敗：${result.error.message}`;
  newRule();
  message.value = `已儲存 ${selectedClass.value} 班解鎖規則。`;
  await loadClassData();
};
const deleteRule = async rule => {
  if (!confirm(`確定刪除「${rule.name}」嗎？相關學生個別覆寫也會一併刪除。`)) return;
  const { error } = await supabase.from('class_game_unlock_rules').delete().eq('id', rule.id);
  message.value = error ? `刪除失敗：${error.message}` : '規則已刪除。';
  await loadClassData();
};

const openOverrides = async rule => {
  selectedRuleId.value = rule.id;
  message.value = '';
  overrideDrafts.value = Object.fromEntries(students.value.map(student => [String(student.student_id), {
    override_mode: 'inherit', required_plays: rule.required_plays, required_score: rule.required_score
  }]));
  const { data, error } = await supabase.from('student_game_unlock_overrides').select('*').eq('rule_id', rule.id);
  if (error) return message.value = `無法讀取個別設定：${error.message}`;
  const existing = new Map((data || []).map(item => [String(item.student_id), item]));
  overrideDrafts.value = Object.fromEntries(students.value.map(student => {
    const saved = existing.get(String(student.student_id));
    return [String(student.student_id), {
      override_mode: saved?.override_mode || 'inherit',
      required_plays: saved?.required_plays ?? rule.required_plays,
      required_score: saved?.required_score ?? rule.required_score
    }];
  }));
};
const saveOverride = async student => {
  const key = String(student.student_id);
  const draft = overrideDrafts.value[key];
  if (!draft || !selectedRule.value) return;
  if (draft.override_mode === 'custom') {
    const usesPlays = ['plays', 'either', 'both'].includes(selectedRule.value.condition_mode);
    const usesScore = ['score', 'either', 'both'].includes(selectedRule.value.condition_mode);
    if (usesPlays && Number(draft.required_plays) <= 0) return alert('個別完成次數必須大於 0。');
    if (usesScore && Number(draft.required_score) <= 0) return alert('個別最高分門檻必須大於 0。');
  }
  let error;
  if (draft.override_mode === 'inherit') {
    ({ error } = await supabase.from('student_game_unlock_overrides').delete().eq('rule_id', selectedRule.value.id).eq('student_id', key));
  } else {
    ({ error } = await supabase.from('student_game_unlock_overrides').upsert({
      rule_id: selectedRule.value.id, student_id: key, override_mode: draft.override_mode,
      required_plays: draft.override_mode === 'custom' ? Math.max(0, Number(draft.required_plays) || 0) : null,
      required_score: draft.override_mode === 'custom' ? Math.max(0, Number(draft.required_score) || 0) : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'rule_id,student_id' }));
  }
  message.value = error ? `個別設定儲存失敗：${error.message}` : `已更新 ${student.real_name} 的解鎖設定。`;
};
</script>

<template>
  <main class="unlock-admin">
    <header><div><h1>🔓 班級遊戲達標解鎖</h1><p>先建立全班共同條件，再為個別學生覆寫。</p></div><NuxtLink to="/admin/access">← 返回遊戲權限管理</NuxtLink></header>
    <p v-if="message" class="message">{{ message }}</p>
    <section class="class-bar"><label>班級 <select v-model="selectedClass"><option v-for="cls in displayClasses" :key="cls" :value="cls">{{ cls }} 班</option></select></label><span>{{ students.length }} 位學生</span></section>

    <section class="editor">
      <div class="section-title"><h2>{{ editingId ? '編輯規則' : '新增規則' }}</h2><button type="button" @click="newRule">清空／新增</button></div>
      <div class="form-grid"><label>規則名稱<input v-model="form.name" placeholder="例如：完成基礎練習後開放趣味遊戲"></label><label class="check"><input v-model="form.enabled" type="checkbox"> 啟用規則</label></div>
      <h3>一、累積哪些遊戲的表現？</h3>
      <div class="category-list"><fieldset v-for="category in groupedGames" :key="`source-${category.id}`"><legend><button type="button" @click="toggleCategoryGames('source_game_ids', category)">{{ category.name }}</button></legend><label v-for="game in category.games" :key="game.id"><input v-model="form.source_game_ids" type="checkbox" :value="game.id">{{ game.name }}</label></fieldset></div>
      <h3>二、限定教材範圍</h3>
      <div class="scope-mode"><label><input v-model="form.requirement_scope.mode" type="radio" value="ALL">全部範圍</label><label><input v-model="form.requirement_scope.mode" type="radio" value="CUSTOM">指定範圍</label></div>
      <template v-if="form.requirement_scope.mode === 'CUSTOM'">
        <div class="scope-builder"><select v-model="scopeVersion" @change="scopeVolume='';scopeUnit='' "><option value="">版本</option><option v-for="item in availableVersions" :key="item">{{ item }}</option></select><select v-model="scopeVolume" :disabled="!scopeVersion" @change="scopeUnit='' "><option value="">冊別</option><option v-for="item in availableVolumes" :key="item">{{ item }}</option></select><select v-model="scopeUnit" :disabled="!scopeVolume"><option value="">單元</option><option v-for="item in availableUnits" :key="item">{{ item }}</option></select></div>
        <div class="scope-buttons"><button :disabled="!scopeVersion" @click="addScope('version')">＋整個版本</button><button :disabled="!scopeVolume" @click="addScope('volume')">＋整冊</button><button :disabled="!scopeUnit" @click="addScope('unit')">＋單元</button></div>
        <div class="tags"><span v-for="key in form.requirement_scope.scopes" :key="key">{{ formatVocabScope(key) }} <button @click="removeScope(key)">×</button></span></div>
      </template>
      <h3>三、達標條件</h3>
      <div class="form-grid"><label>判斷方式<select v-model="form.condition_mode"><option value="plays">完成次數</option><option value="score">最高分</option><option value="either">次數或最高分（任一）</option><option value="both">次數及最高分（皆須）</option></select></label><label v-if="form.condition_mode !== 'score'">至少完成次數<input v-model.number="form.required_plays" type="number" min="0"></label><label v-if="form.condition_mode !== 'plays'">至少最高分<input v-model.number="form.required_score" type="number" min="0"></label></div>
      <h3>四、達標後解鎖哪些遊戲？</h3>
      <div class="category-list"><fieldset v-for="category in groupedGames" :key="`target-${category.id}`"><legend><button type="button" @click="toggleCategoryGames('target_game_ids', category)">{{ category.name }}</button></legend><label v-for="game in category.games" :key="game.id"><input v-model="form.target_game_ids" type="checkbox" :value="game.id">{{ game.name }}</label></fieldset></div>
      <button class="primary" :disabled="isSaving || !schemaAvailable" @click="saveRule">{{ isSaving ? '儲存中…' : '💾 儲存班級解鎖規則' }}</button>
    </section>

    <section class="rules"><h2>{{ selectedClass }} 班現有規則</h2><p v-if="isLoading">讀取中…</p><article v-for="rule in rules" :key="rule.id"><div><h3>{{ rule.enabled ? '🟢' : '⚪' }} {{ rule.name }}</h3><p>{{ conditionLabel(rule.condition_mode) }}：{{ rule.required_plays }} 次／{{ rule.required_score }} 分；解鎖 {{ rule.target_game_ids?.map(gameName).join('、') }}</p></div><div><button @click="editRule(rule)">編輯</button><button @click="openOverrides(rule)">個別調整</button><button class="danger" @click="deleteRule(rule)">刪除</button></div></article><p v-if="!isLoading && !rules.length">尚未建立規則。</p></section>

    <section v-if="selectedRule" class="overrides"><h2>👤 個別調整：{{ selectedRule.name }}</h2><p>「沿用班級」不另存資料；可強制解鎖、強制鎖定或改用個別門檻。</p><div class="student-row header-row"><b>學生</b><b>模式</b><b>個別門檻</b><b>操作</b></div><div v-for="student in students" :key="student.id" class="student-row"><span>{{ student.seat_number }}　{{ student.real_name }}</span><select v-model="overrideDrafts[String(student.student_id)].override_mode"><option value="inherit">沿用班級</option><option value="force_unlock">強制解鎖</option><option value="force_lock">強制鎖定</option><option value="custom">自訂門檻</option></select><div v-if="overrideDrafts[String(student.student_id)].override_mode === 'custom'" class="custom-threshold"><label>次數 <input v-model.number="overrideDrafts[String(student.student_id)].required_plays" type="number" min="0"></label><label>分數 <input v-model.number="overrideDrafts[String(student.student_id)].required_score" type="number" min="0"></label></div><span v-else>—</span><button @click="saveOverride(student)">儲存</button></div></section>
  </main>
</template>

<style scoped>
.unlock-admin{max-width:1200px;margin:auto;padding:24px;color:#263238;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif}.unlock-admin header{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:2px solid #cbd5e1}.unlock-admin header h1{margin-bottom:4px;color:#0f766e}.unlock-admin header p{margin-top:0}.unlock-admin header a,.section-title button,.rules button,.overrides button,.scope-buttons button{padding:7px 11px;border:1px solid #64748b;border-radius:6px;background:white;color:#334155;text-decoration:none;font-weight:700;cursor:pointer}.message{padding:12px;border-left:4px solid #0f766e;background:#ccfbf1}.class-bar{display:flex;justify-content:space-between;align-items:center;margin:20px 0;padding:14px;background:#f0fdfa;border-radius:9px;font-weight:800}.class-bar select,.form-grid input,.form-grid select,.scope-builder select,.student-row select,.student-row input{padding:8px;border:1px solid #94a3b8;border-radius:6px;font:inherit}.editor,.rules,.overrides{margin-top:18px;padding:20px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;box-shadow:0 3px 12px #0f172a0d}.section-title{display:flex;justify-content:space-between;align-items:center}.editor h2,.rules h2,.overrides h2{color:#0f766e}.editor h3{margin-top:24px;padding-bottom:6px;border-bottom:1px dashed #94a3b8}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.form-grid label{display:grid;gap:6px;font-weight:800}.form-grid .check{display:flex;align-items:center}.category-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.category-list fieldset{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow:auto;border:1px solid #cbd5e1;border-radius:8px}.category-list legend button{border:0;background:#e0f2fe;color:#075985;font-weight:900;cursor:pointer;padding:5px}.category-list label{display:flex;gap:7px;align-items:flex-start}.scope-mode,.scope-buttons,.tags{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}.scope-builder{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tags span{padding:6px 10px;border-radius:999px;background:#e0f2fe;color:#075985}.tags button{border:0;background:transparent;color:#be123c;cursor:pointer}.primary{width:100%;margin-top:22px;padding:12px;border:0;border-radius:8px;background:#0f766e;color:white;font-size:1.05rem;font-weight:900;cursor:pointer}.primary:disabled{opacity:.45}.rules article{display:flex;justify-content:space-between;gap:15px;padding:12px 0;border-bottom:1px solid #e2e8f0}.rules article h3,.rules article p{margin:3px 0}.rules article>div:last-child{display:flex;align-items:center;gap:6px}.rules .danger{color:#be123c}.student-row{display:grid;grid-template-columns:1.1fr 1fr 1.5fr auto;gap:10px;align-items:center;padding:9px;border-bottom:1px solid #e2e8f0}.header-row{background:#f1f5f9}.custom-threshold{display:flex;gap:8px}.custom-threshold label{display:flex;align-items:center;gap:4px}.custom-threshold input{width:65px}@media(max-width:760px){.category-list,.scope-builder{grid-template-columns:1fr}.student-row{grid-template-columns:1fr}.header-row{display:none}.rules article,.unlock-admin header{flex-direction:column;align-items:stretch}.custom-threshold{flex-wrap:wrap}}
</style>
