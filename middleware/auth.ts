export default defineNuxtRouteMiddleware((to, from) => {
  const isAdmin = useCookie('isAdmin');

  // 1. 如果完全沒登入，踢回登入頁
  if (!isAdmin.value) {
    return navigateTo('/login');
  }

  // 2. 如果是「一般英語教師 (teacher)」
  if (isAdmin.value === 'teacher') {
    // 🚫 定義一般老師「絕對不能去」的頁面 (包含剛剛新增的權限管理)
    const forbiddenPaths = [
      '/admin/teachers', 
      '/admin/vocabularies', 
      '/admin/tarot-manager'
    ];

    // 如果老師企圖進入這些敏感頁面，踢回後台首頁
    if (forbiddenPaths.includes(to.path)) {
      return navigateTo('/admin');
    }
  }
  
  // (如果是 'superadmin'，就不受限制，全部放行)
});