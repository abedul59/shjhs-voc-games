import { watch } from 'vue';

const SCHEMA_MISSING_CODES = new Set(['42P01', 'PGRST205']);

export default defineNuxtPlugin((nuxtApp) => {
  const supabase = useSupabaseClient();
  const studentCookie = useCookie('currentStudent');
  const activeSessionsState = useState('activeFocusMonitorSessions', () => []);
  const activeSessions = new Map();
  const joinedSessions = new Set();
  let heartbeatTimer = null;
  let sessionTimer = null;
  let routeUnsubscribe = null;
  let refreshing = false;
  let schemaUnavailable = false;

  const currentStudent = () => {
    const student = studentCookie.value;
    if (!student || student.isAnon || !student.id || !student.class) return null;
    return student;
  };

  const currentPath = () => nuxtApp.$router.currentRoute.value.fullPath || '/';
  const visibilityState = () => document.visibilityState || 'visible';

  const markSchemaError = (error) => {
    if (error && SCHEMA_MISSING_CODES.has(error.code)) {
      schemaUnavailable = true;
      activeSessions.clear();
      activeSessionsState.value = [];
    }
  };

  const insertEvent = async (sessionId, eventType) => {
    const student = currentStudent();
    if (!student || schemaUnavailable) return;
    const { error } = await supabase.from('class_focus_monitor_events').insert([{
      session_id: sessionId,
      student_id: String(student.id),
      event_type: eventType,
      current_path: currentPath(),
      visibility_state: visibilityState()
    }]);
    markSchemaError(error);
  };

  const sendHeartbeat = async (eventType = 'heartbeat', shouldLogEvent = false) => {
    const student = currentStudent();
    if (!student || schemaUnavailable || activeSessions.size === 0) return;
    const now = new Date().toISOString();
    const browserId = localStorage.getItem('device_browser_id') || '';
    await Promise.all([...activeSessions.values()].map(async (session) => {
      const { error } = await supabase.from('class_focus_monitor_presence').upsert({
        session_id: session.id,
        student_id: String(student.id),
        student_name: student.name || '',
        class_name: student.class || '',
        browser_id: browserId,
        visibility_state: visibilityState(),
        current_path: currentPath(),
        last_event: eventType,
        last_heartbeat_at: now,
        updated_at: now
      }, { onConflict: 'session_id,student_id' });
      markSchemaError(error);
      if (!error && shouldLogEvent) await insertEvent(session.id, eventType);
    }));
  };

  const studentTargetKeys = async (student) => {
    const keys = [`class:${student.class}`];
    const { data: row } = await supabase.from('students').select('id').eq('student_id', String(student.id)).maybeSingle();
    if (!row?.id) return keys;
    const { data: memberships } = await supabase.from('special_class_members')
      .select('special_class_id').eq('student_id', row.id);
    for (const membership of memberships || []) keys.push(`special:${membership.special_class_id}`);
    return keys;
  };

  const refreshSessions = async () => {
    if (refreshing || schemaUnavailable) return;
    const student = currentStudent();
    if (!student) {
      activeSessions.clear();
      joinedSessions.clear();
      activeSessionsState.value = [];
      return;
    }
    refreshing = true;
    try {
      const keys = await studentTargetKeys(student);
      const { data, error } = await supabase.from('class_focus_monitor_sessions')
        .select('*').eq('status', 'active').in('target_key', keys).order('started_at', { ascending: false });
      if (error) {
        markSchemaError(error);
        return;
      }
      const latestIds = new Set((data || []).map(session => String(session.id)));
      for (const id of activeSessions.keys()) if (!latestIds.has(id)) activeSessions.delete(id);
      for (const session of data || []) activeSessions.set(String(session.id), session);
      activeSessionsState.value = [...activeSessions.values()];
      for (const session of data || []) {
        const id = String(session.id);
        if (!joinedSessions.has(id)) {
          joinedSessions.add(id);
          await sendHeartbeat('joined', false);
          await insertEvent(session.id, 'joined');
        }
      }
      for (const id of [...joinedSessions]) if (!latestIds.has(id)) joinedSessions.delete(id);
    } finally {
      refreshing = false;
    }
  };

  const onVisibilityChange = () => {
    const eventType = document.hidden ? 'hidden' : 'visible';
    void sendHeartbeat(eventType, true);
  };
  const onPageHide = () => { void sendHeartbeat('pagehide', true); };
  const onOnline = () => { void sendHeartbeat('online', true); };
  const onOffline = () => { void sendHeartbeat('offline', true); };

  nuxtApp.hook('app:mounted', async () => {
    await refreshSessions();
    heartbeatTimer = window.setInterval(() => { void sendHeartbeat(); }, 15000);
    sessionTimer = window.setInterval(() => { void refreshSessions(); }, 30000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    routeUnsubscribe = nuxtApp.$router.afterEach(() => {
      window.setTimeout(() => { void sendHeartbeat('route_change', true); }, 0);
    });
  });

  watch(studentCookie, () => {
    schemaUnavailable = false;
    joinedSessions.clear();
    void refreshSessions();
  }, { deep: true });

  nuxtApp.hook('app:beforeUnmount', () => {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    if (sessionTimer) window.clearInterval(sessionTimer);
    if (routeUnsubscribe) routeUnsubscribe();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  });
});
