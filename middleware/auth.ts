import { canTeacherUseAdminPath, defaultTeacherFeatureIds } from '~/lib/admin-feature-permissions';

export default defineNuxtRouteMiddleware((to, from) => {
  const isAdmin = useCookie('isAdmin');
  const authCookie = useCookie('teacher_auth');

  // 1. 如果完全沒登入，踢回登入頁
  if (!isAdmin.value) {
    return navigateTo('/login');
  }

  // 2. 如果是「一般英語教師 (teacher)」
  if (isAdmin.value === 'teacher') {
    const features = Array.isArray(authCookie.value?.features)
      ? authCookie.value.features
      : defaultTeacherFeatureIds;

    // 未列入教師功能清單的後台頁面一律拒絕，避免只藏按鈕卻仍可輸入網址進入。
    if (!canTeacherUseAdminPath(to.path, features)) {
      return navigateTo('/admin');
    }
  }
  
  // (如果是 'superadmin'，就不受限制，全部放行)
});
