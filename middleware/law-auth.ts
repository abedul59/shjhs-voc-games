export default defineNuxtRouteMiddleware((to) => {
  // 取得專屬於司律區域的驗證 Cookie
  const lawVerified = useCookie('law_exam_session_active')

  // 🌟 新增：檢查是否有「隱形鑰匙」 (由彩蛋觸發產生)
  if (process.client && localStorage.getItem('secret_bypass') === 'true') {
    return 
  }

  // 如果目標路徑屬於司律區域，且不是驗證頁面本身
  if (to.path.startsWith('/admin/law-exam') && to.path !== '/admin/law-exam/gate') {
    if (!lawVerified.value) {
      return navigateTo('/admin/law-exam/gate')
    }
  }
})
