<script setup>
const studentCookie = useCookie('currentStudent');
const sessions = useState('activeFocusMonitorSessions', () => []);
const visible = computed(() => studentCookie.value && !studentCookie.value.isAnon && sessions.value.length > 0);
</script>

<template>
  <div v-if="visible" class="focus-monitor-banner" role="status" aria-live="polite">
    <span class="pulse-dot"></span>
    班級專注監控進行中
  </div>
</template>

<style scoped>
.focus-monitor-banner { position: fixed; left: 12px; bottom: 12px; z-index: 9998; display: flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 999px; background: rgba(15, 23, 42, .9); color: #fff; font-size: .78rem; font-weight: 800; box-shadow: 0 3px 12px rgba(0, 0, 0, .25); pointer-events: none; }
.pulse-dot { width: 9px; height: 9px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 0 0 rgba(74, 222, 128, .6); animation: pulse 1.6s infinite; }
@keyframes pulse { 70% { box-shadow: 0 0 0 7px rgba(74, 222, 128, 0); } 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); } }
</style>
