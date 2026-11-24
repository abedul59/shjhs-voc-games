<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { regularClassPermissions, schoolClassNames, specialClassPermissionIds } from '~/lib/admin-class-permissions';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');
const isAdminCookie = useCookie('isAdmin');
const allowedClasses = Array.isArray(authCookie.value?.classes) ? authCookie.value.classes : [];
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || allowedClasses.includes('ALL'));
const allowedRegularClasses = computed(() => isSuperAdmin.value ? schoolClassNames() : regularClassPermissions(allowedClasses).sort());
const allowedSpecialIds = computed(() => specialClassPermissionIds(allowedClasses));

const specialClasses = ref([]);
const selectedTargetKey = ref('');
const sessions = ref([]);
const selectedSessionId = ref(null);
const students = ref([]);
const presenceRows = ref([]);
const events = ref([]);
const schemaAvailable = ref(true);
const loading = ref(false);
const saving = ref(false);
const message = ref('');
const nowTick = ref(Date.now());
const notificationEnabled = ref(false);
const alertMessage = ref('');
const monitorInitialized = ref(false);
const previousStates = new Map();
let refreshTimer = null;
let clockTimer = null;
let audioContext = null;

const form = ref({ title: '', heartbeat_interval_seconds: 15, warning_after_seconds: 45, offline_after_seconds: 90 });

const targetOptions = computed(() => [
  ...allowedRegularClasses.value.map(className => ({ key: `class:${className}`, type: 'regular', label: `${className} 班`, className, specialClassId: null })),
  ...specialClasses.value.map(group => ({ key: `special:${group.id}`, type: 'special', label: `📚 ${group.name}（特殊班級）`, className: null, specialClassId: group.id }))
]);
const selectedTarget = computed(() => targetOptions.value.find(option => option.key === selectedTargetKey.value) || null);
const selectedSession = computed(() => sessions.value.find(session => String(session.id) === String(selectedSessionId.value)) || null);
const isActive = computed(() => selectedSession.value?.status === 'active');

const isMissingSchema = error => ['42P01', 'PGRST205'].includes(error?.code);
const formatTime = value => value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '—';
const secondsAgo = value => value ? Math.max(0, Math.floor((nowTick.value - new Date(value).getTime()) / 1000)) : null;
const studentKey = student => String(student.student_id);

const statusFor = (student, session = selectedSession.value) => {
  const presence = presenceRows.value.find(row => String(row.student_id) === studentKey(student));
  if (!presence || !session) return { key: 'waiting', label: '尚未進入', age: null, presence };
  const age = secondsAgo(presence.last_heartbeat_at);
  if (age > session.offline_after_seconds) return { key: 'offline', label: '已離線／可能關閉', age, presence };
  if (presence.visibility_state === 'hidden') return { key: 'hidden', label: '已切換分頁', age, presence };
  if (age > session.warning_after_seconds) return { key: 'warning', label: '可能中斷', age, presence };
  return { key: 'online', label: '正常停留', age, presence };
};

const monitoredStudents = computed(() => students.value.map(student => ({ ...student, monitor: statusFor(student) })));
const summary = computed(() => monitoredStudents.value.reduce((result, student) => {
  result[student.monitor.key] = (result[student.monitor.key] || 0) + 1;
  return result;
}, { online: 0, hidden: 0, warning: 0, offline: 0, waiting: 0 }));

const loadSpecialClasses = async () => {
  const { data, error } = await supabase.from('special_classes').select('id, name, grade').order('grade').order('name');
  if (error) return;
  specialClasses.value = isSuperAdmin.value ? (data || []) : (data || []).filter(group => allowedSpecialIds.value.includes(String(group.id)));
};

const loadStudents = async () => {
  const target = selectedTarget.value;
  if (!target) return students.value = [];
  const buildStudentQuery = columns => {
    let query = supabase.from('students').select(columns);
    if (target.type === 'regular') query = query.eq('class_name', target.className);
    return query;
  };
  let studentIds = null;
  if (target.type === 'regular') {
    studentIds = null;
  } else {
    const { data: memberships, error } = await supabase.from('special_class_members').select('student_id').eq('special_class_id', target.specialClassId);
    if (error || !memberships?.length) return students.value = [];
    studentIds = memberships.map(item => item.student_id);
  }
  const applyStudentIds = query => studentIds ? query.in('id', studentIds) : query;
  let result = await applyStudentIds(buildStudentQuery('id,student_id,school_student_id,real_name,hidden_name,class_name,seat_number'))
    .order('class_name').order('seat_number');
  if (result.error?.code === '42703' || result.error?.code === 'PGRST204') {
    result = await applyStudentIds(buildStudentQuery('id,student_id,real_name,hidden_name,class_name,seat_number'))
      .order('class_name').order('seat_number');
  }
  const { data, error } = result;
  if (error) {
    message.value = `學生名單讀取失敗：${error.message}`;
    students.value = [];
  } else students.value = data || [];
};

const loadSessions = async (preferActive = false) => {
  if (!selectedTargetKey.value) return;
  const { data, error } = await supabase.from('class_focus_monitor_sessions').select('*')
    .eq('target_key', selectedTargetKey.value).order('started_at', { ascending: false }).limit(20);
  if (error) {
    if (isMissingSchema(error)) schemaAvailable.value = false;
    else message.value = `監控場次讀取失敗：${error.message}`;
    sessions.value = [];
    selectedSessionId.value = null;
    return;
  }
  schemaAvailable.value = true;
  sessions.value = data || [];
  const currentStillExists = sessions.value.some(session => String(session.id) === String(selectedSessionId.value));
  const preferred = preferActive ? sessions.value.find(session => session.status === 'active') : null;
  if (preferred) selectedSessionId.value = preferred.id;
  else if (!currentStillExists) selectedSessionId.value = sessions.value[0]?.id || null;
};

const eventLabel = eventType => ({
  joined: '進入監控', hidden: '切換至其他分頁／程式', visible: '返回網站',
  route_change: '切換網站頁面', pagehide: '頁面關閉／離開', online: '網路恢復', offline: '瀏覽器偵測離線'
}[eventType] || eventType);

const playAlert = () => {
  if (!notificationEnabled.value || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gain.gain.setValueAtTime(0.12, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + 0.45);
};

const notifyOffline = student => {
  const text = `${student.class_name} 班 ${student.seat_number} 號 ${student.real_name} 已超過離線門檻。`;
  alertMessage.value = text;
  playAlert();
  if (notificationEnabled.value && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('學生可能已關閉瀏覽器', { body: text, tag: `focus-${selectedSessionId.value}-${student.student_id}` });
  }
};

const refreshMonitor = async () => {
  const session = selectedSession.value;
  if (!session) {
    presenceRows.value = [];
    events.value = [];
    return;
  }
  const [presenceResult, eventResult] = await Promise.all([
    supabase.from('class_focus_monitor_presence').select('*').eq('session_id', session.id),
    supabase.from('class_focus_monitor_events').select('*').eq('session_id', session.id).order('occurred_at', { ascending: false }).limit(100)
  ]);
  if (presenceResult.error) {
    if (isMissingSchema(presenceResult.error)) schemaAvailable.value = false;
    return;
  }
  presenceRows.value = presenceResult.data || [];
  events.value = eventResult.data || [];
  const nextStates = new Map();
  for (const student of students.value) {
    const key = studentKey(student);
    const state = statusFor(student, session).key;
    nextStates.set(key, state);
    if (monitorInitialized.value && state === 'offline' && previousStates.get(key) !== 'offline') notifyOffline(student);
  }
  previousStates.clear();
  for (const [key, value] of nextStates) previousStates.set(key, value);
  monitorInitialized.value = true;
};

const loadTarget = async () => {
  loading.value = true;
  message.value = '';
  monitorInitialized.value = false;
  previousStates.clear();
  await Promise.all([loadStudents(), loadSessions(true)]);
  await refreshMonitor();
  loading.value = false;
};

const startSession = async () => {
  const target = selectedTarget.value;
  if (!target || !schemaAvailable.value) return;
  const warning = Number(form.value.warning_after_seconds);
  const offline = Number(form.value.offline_after_seconds);
  if (warning < 20 || offline <= warning) return alert('離線判定秒數必須大於警告秒數，警告至少為 20 秒。');
  saving.value = true;
  message.value = '';
  await supabase.from('class_focus_monitor_sessions').update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('target_key', target.key).eq('status', 'active');
  const { data, error } = await supabase.from('class_focus_monitor_sessions').insert([{
    target_key: target.key,
    target_type: target.type,
    target_label: target.label,
    class_name: target.className,
    special_class_id: target.specialClassId ? String(target.specialClassId) : null,
    title: form.value.title.trim() || `${target.label} 專注監控`,
    heartbeat_interval_seconds: 15,
    warning_after_seconds: warning,
    offline_after_seconds: offline
  }]).select('*').single();
  saving.value = false;
  if (error) return message.value = `啟動失敗：${error.message}`;
  message.value = `已啟動「${data.title}」，學生端最遲約 30 秒後開始回報。`;
  await loadSessions(true);
  await refreshMonitor();
};

const stopSession = async () => {
  if (!selectedSession.value || !confirm('確定停止這個班級的專注監控嗎？')) return;
  const { error } = await supabase.from('class_focus_monitor_sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', selectedSession.value.id);
  if (error) return message.value = `停止失敗：${error.message}`;
  message.value = '監控已停止，學生端將停止回報此場次。';
  await loadSessions();
  await refreshMonitor();
};

const selectSession = async session => {
  selectedSessionId.value = session.id;
  monitorInitialized.value = false;
  previousStates.clear();
  await refreshMonitor();
};

const enableNotifications = async () => {
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  await audioContext.resume();
  if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  notificationEnabled.value = true;
  playAlert();
  message.value = 'Notification' in window && Notification.permission === 'denied'
    ? '提示音已啟用；瀏覽器桌面通知被拒絕，可在網站權限中重新開啟。'
    : '提示音與可用的桌面通知已啟用。';
};

watch(selectedTargetKey, () => { void loadTarget(); });

onMounted(async () => {
  await loadSpecialClasses();
  selectedTargetKey.value = targetOptions.value[0]?.key || '';
  if (!selectedTargetKey.value) loading.value = false;
  clockTimer = window.setInterval(() => { nowTick.value = Date.now(); }, 1000);
  refreshTimer = window.setInterval(() => { void refreshMonitor(); }, 5000);
});

onUnmounted(() => {
  if (clockTimer) window.clearInterval(clockTimer);
  if (refreshTimer) window.clearInterval(refreshTimer);
  if (audioContext) audioContext.close();
});
</script>

<template>
  <main class="monitor-page">
    <header class="page-header">
      <div><h1>📡🛡️ 學生動態與專注監控</h1><p>教師啟動場次後，系統才會記錄該班學生的心跳與分頁狀態。</p></div>
      <div class="header-actions"><button class="notify-btn" @click="enableNotifications">{{ notificationEnabled ? '🔔 通知已啟用' : '🔕 啟用聲音與通知' }}</button><NuxtLink to="/admin">← 返回後台</NuxtLink></div>
    </header>

    <nav class="monitor-tabs" aria-label="學生監控功能">
      <NuxtLink to="/admin/live-activity">📡 學生即時動態</NuxtLink>
      <span class="active">🛡️ 班級專注監控</span>
    </nav>

    <p v-if="!schemaAvailable" class="schema-warning">⚠️ 尚未建立監控資料表，請先在 Supabase SQL Editor 執行 <code>class_focus_monitor_existing_project_setup.sql</code>。</p>
    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="alertMessage" class="offline-alert">🚨 {{ alertMessage }} <button @click="alertMessage = ''">關閉</button></p>

    <section class="control-card">
      <label>監控班級<select v-model="selectedTargetKey"><option v-for="option in targetOptions" :key="option.key" :value="option.key">{{ option.label }}</option></select></label>
      <label>場次名稱<input v-model="form.title" :placeholder="`${selectedTarget?.label || '班級'} 專注監控`"></label>
      <label>可能中斷<input v-model.number="form.warning_after_seconds" type="number" min="20" max="300"><span>秒</span></label>
      <label>判定離線<input v-model.number="form.offline_after_seconds" type="number" min="30" max="600"><span>秒</span></label>
      <button v-if="!isActive" class="start-btn" :disabled="saving || !schemaAvailable || !selectedTarget" @click="startSession">▶ 啟動監控</button>
      <button v-else class="stop-btn" :disabled="saving" @click="stopSession">■ 停止監控</button>
    </section>

    <section v-if="selectedSession" class="session-info">
      <div><strong>{{ selectedSession.title }}</strong><span :class="['session-badge', selectedSession.status]">{{ selectedSession.status === 'active' ? '監控中' : '已結束' }}</span></div>
      <small>開始：{{ formatTime(selectedSession.started_at) }}　警告 {{ selectedSession.warning_after_seconds }} 秒／離線 {{ selectedSession.offline_after_seconds }} 秒</small>
    </section>

    <section v-if="selectedSession" class="summary-grid">
      <div class="summary online"><b>{{ summary.online }}</b><span>正常停留</span></div>
      <div class="summary hidden"><b>{{ summary.hidden }}</b><span>切換分頁</span></div>
      <div class="summary warning"><b>{{ summary.warning }}</b><span>可能中斷</span></div>
      <div class="summary offline"><b>{{ summary.offline }}</b><span>已離線</span></div>
      <div class="summary waiting"><b>{{ summary.waiting }}</b><span>尚未進入</span></div>
    </section>

    <section v-if="selectedSession" class="student-grid" :aria-busy="loading">
      <article v-for="student in monitoredStudents" :key="student.student_id" :class="['student-card', student.monitor.key]">
        <div class="student-title"><span class="seat">{{ student.seat_number }}</span><div><b>{{ student.real_name }}</b><small>{{ student.class_name }} 班・{{ student.school_student_id || student.student_id }}</small></div><span class="status">{{ student.monitor.label }}</span></div>
        <template v-if="student.monitor.presence">
          <p>最後心跳：{{ student.monitor.age }} 秒前</p>
          <p class="path" :title="student.monitor.presence.current_path">目前頁面：{{ student.monitor.presence.current_path }}</p>
          <p>最後事件：{{ eventLabel(student.monitor.presence.last_event) }}</p>
        </template>
        <p v-else>等待學生登入網站或下一次場次檢查。</p>
      </article>
    </section>
    <p v-if="selectedSession && !students.length" class="empty">此班級目前沒有學生名單。</p>

    <section class="lower-grid">
      <div class="history-card"><h2>近期監控場次</h2><button v-for="session in sessions" :key="session.id" :class="{ selected: String(session.id) === String(selectedSessionId) }" @click="selectSession(session)"><span>{{ session.title }}</span><small>{{ session.status === 'active' ? '監控中' : formatTime(session.started_at) }}</small></button><p v-if="!sessions.length">尚無監控場次。</p></div>
      <div class="events-card"><h2>最近事件</h2><div class="event-list"><p v-for="event in events" :key="event.id"><time>{{ formatTime(event.occurred_at) }}</time><b>{{ students.find(student => String(student.student_id) === String(event.student_id))?.real_name || event.student_id }}</b><span>{{ eventLabel(event.event_type) }}</span><small>{{ event.current_path }}</small></p><p v-if="!events.length">尚無事件。</p></div></div>
    </section>
  </main>
</template>

<style scoped>
.monitor-page { min-height: 100vh; padding: 24px; box-sizing: border-box; background: #f4f7fb; color: #172033; font-family: system-ui, sans-serif; }
.page-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; max-width: 1450px; margin: 0 auto 18px; }
.page-header h1 { margin: 0 0 6px; font-size: 2rem; }.page-header p { margin: 0; color: #526075; }.header-actions { display: flex; gap: 10px; align-items: center; }.header-actions a,.notify-btn { border: 0; border-radius: 9px; background: #1e3a8a; color: white; padding: 11px 14px; text-decoration: none; font-weight: 800; cursor: pointer; }
.monitor-tabs { max-width: 1450px; margin: 0 auto 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 7px; border-radius: 11px; background: #e2e8f0; box-sizing: border-box; }
.monitor-tabs a,.monitor-tabs span { padding: 11px; border-radius: 8px; color: #334155; text-align: center; text-decoration: none; font-weight: 900; }
.monitor-tabs .active { background: #1e3a8a; color: white; box-shadow: 0 3px 0 #172554; }
.schema-warning,.message,.offline-alert { max-width: 1450px; margin: 10px auto; padding: 12px 15px; border-radius: 10px; font-weight: 700; }.schema-warning { background: #fff3cd; color: #704d00; }.message { background: #dbeafe; color: #1e3a8a; }.offline-alert { background: #fee2e2; color: #991b1b; font-size: 1.05rem; }.offline-alert button { float: right; }
.control-card { max-width: 1450px; margin: 0 auto 18px; display: grid; grid-template-columns: 1.2fr 1.8fr .8fr .8fr auto; gap: 12px; align-items: end; background: white; padding: 16px; border-radius: 14px; box-shadow: 0 3px 14px #d7deea; }.control-card label { display: grid; grid-template-columns: 1fr auto; gap: 5px; color: #475569; font-size: .85rem; font-weight: 800; }.control-card label select,.control-card label input { grid-column: 1 / -1; min-width: 0; border: 1px solid #b8c2d1; border-radius: 8px; padding: 10px; font: inherit; background: white; }.start-btn,.stop-btn { border: 0; border-radius: 9px; padding: 11px 16px; color: white; font-weight: 900; cursor: pointer; }.start-btn { background: #15803d; }.stop-btn { background: #b91c1c; }
.session-info { max-width: 1450px; box-sizing: border-box; margin: 0 auto 14px; background: #172033; color: white; padding: 14px 18px; border-radius: 12px; display: flex; justify-content: space-between; gap: 15px; align-items: center; }.session-info strong { margin-right: 12px; }.session-badge { border-radius: 999px; padding: 4px 9px; font-size: .75rem; font-weight: 900; }.session-badge.active { background: #22c55e; }.session-badge.ended { background: #64748b; }
.summary-grid { max-width: 1450px; margin: 0 auto 15px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }.summary { padding: 12px; border-radius: 11px; display: flex; align-items: baseline; gap: 8px; border: 2px solid; background: white; }.summary b { font-size: 1.7rem; }.summary.online { color: #166534; border-color: #4ade80; }.summary.hidden,.summary.warning { color: #92400e; border-color: #fbbf24; }.summary.offline { color: #991b1b; border-color: #f87171; }.summary.waiting { color: #475569; border-color: #cbd5e1; }
.student-grid { max-width: 1450px; margin: 0 auto 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; }.student-card { background: white; border: 3px solid #cbd5e1; border-radius: 13px; padding: 13px; box-shadow: 0 2px 9px #dce2eb; }.student-card.online { border-color: #22c55e; }.student-card.hidden,.student-card.warning { border-color: #f59e0b; }.student-card.offline { border-color: #ef4444; background: #fff5f5; }.student-title { display: flex; align-items: center; gap: 9px; }.seat { display: grid; place-items: center; min-width: 35px; height: 35px; border-radius: 50%; background: #172033; color: white; font-weight: 900; }.student-title div { display: flex; flex-direction: column; min-width: 0; }.student-title small { color: #64748b; }.status { margin-left: auto; font-size: .75rem; font-weight: 900; text-align: right; }.student-card p { margin: 8px 0 0; font-size: .86rem; color: #526075; }.path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lower-grid { max-width: 1450px; margin: 0 auto; display: grid; grid-template-columns: minmax(280px, .7fr) minmax(400px, 1.3fr); gap: 14px; }.history-card,.events-card { background: white; border-radius: 13px; padding: 16px; box-shadow: 0 3px 14px #d7deea; }.history-card h2,.events-card h2 { margin-top: 0; font-size: 1.15rem; }.history-card button { width: 100%; display: flex; justify-content: space-between; gap: 10px; border: 1px solid #cbd5e1; background: white; padding: 9px; margin: 6px 0; border-radius: 8px; text-align: left; cursor: pointer; }.history-card button.selected { border-color: #2563eb; background: #eff6ff; }.event-list { max-height: 330px; overflow: auto; }.event-list p { display: grid; grid-template-columns: 145px 100px 190px 1fr; gap: 8px; margin: 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: .82rem; }.event-list small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.empty { text-align: center; }
@media (max-width: 900px) { .page-header,.session-info { flex-direction: column; }.control-card { grid-template-columns: 1fr 1fr; }.summary-grid { grid-template-columns: repeat(2, 1fr); }.lower-grid { grid-template-columns: 1fr; }.event-list p { grid-template-columns: 1fr 1fr; }.monitor-page { padding: 14px; } }
</style>
