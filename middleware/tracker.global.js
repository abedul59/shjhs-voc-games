import { defineNuxtRouteMiddleware } from '#app';

export default defineNuxtRouteMiddleware((to, from) => {
  // 確保這段程式碼只在瀏覽器端執行
  if (process.server) return;

  const teacherAuth = useCookie('teacher_auth');
  const isAdmin = useCookie('isAdmin');
  const studentAuth = useCookie('currentStudent'); 

  const supabase = useSupabaseClient();
  const nowStr = Date.now().toString();
  const isoNow = new Date().toISOString();

  // ==========================================
  // 1. 🕵️ 教師足跡追蹤 (完全還原原本運作正常的邏輯)
  // ==========================================
  if (teacherAuth.value && isAdmin.value !== 'superadmin' && teacherAuth.value.name) {
    const teacherName = teacherAuth.value.name;

    // 結算上一個頁面的停留時間
    const currentLogId = localStorage.getItem('teacher_current_log_id');
    const startTimeStr = localStorage.getItem('teacher_log_start_time');
    
    if (currentLogId && startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      const durationSec = Math.round((Date.now() - startTime) / 1000); 
      
      supabase.from('teacher_logs').update({
        end_time: isoNow,
        duration_seconds: durationSec
      }).eq('id', currentLogId).then();
    }

    if (to.path !== '/login') {
      localStorage.setItem('teacher_log_start_time', nowStr); 

      supabase.from('teacher_logs').insert([{
        teacher_name: teacherName,
        page_path: to.path,
        start_time: isoNow
      }]).select('id').single().then(({ data }) => {
        if (data) localStorage.setItem('teacher_current_log_id', data.id);
      });
    }
  }

  // ==========================================
  // 2. 🧑‍🎓 學生足跡追蹤 (模仿教師邏輯，完全獨立寫入 student_logs)
  // ==========================================
  if (studentAuth.value && studentAuth.value.id && !studentAuth.value.isAnon) {
    const studentId = String(studentAuth.value.id); // 確保是字串

    // 結算上一個頁面的停留時間
    const currentStudentLogId = localStorage.getItem('student_current_log_id');
    const studentStartTimeStr = localStorage.getItem('student_log_start_time');
    
    if (currentStudentLogId && studentStartTimeStr) {
      const startTime = parseInt(studentStartTimeStr, 10);
      const durationSec = Math.round((Date.now() - startTime) / 1000); 
      
      supabase.from('student_logs').update({
        end_time: isoNow,
        duration_seconds: durationSec
      }).eq('id', currentStudentLogId).then();
    }

    localStorage.setItem('student_log_start_time', nowStr);
    
    // 寫入新的學生足跡 (使用 fullPath 可以記錄到是在玩哪個單元)
    supabase.from('student_logs').insert([{
      student_id: studentId,
      page_path: to.fullPath, 
      start_time: isoNow
    }]).select('id').single().then(({ data, error }) => {
      if (error) console.error("寫入學生足跡失敗", error);
      if (data) localStorage.setItem('student_current_log_id', data.id);
    });
  }
});