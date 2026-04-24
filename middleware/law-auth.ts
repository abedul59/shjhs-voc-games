export default defineNuxtRouteMiddleware((to) => {
  // 取得專屬於司律區域的驗證 Cookie
  const lawVerified = useCookie('law_exam_session_active')

  // 如果目標路徑屬於司律區域，且不是驗證頁面本身
  if (to.path.startsWith('/admin/law-exam') && to.path !== '/admin/law-exam/gate') {
    // 如果標記不存在，跳轉至 OTP 驗證閘門
    if (!lawVerified.value) {
      return navigateTo('/admin/law-exam/gate')
    }
  }
})