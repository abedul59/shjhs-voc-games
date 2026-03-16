<script setup>
import { ref } from 'vue';

const supabase = useSupabaseClient();
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

// 保留原有的 isAdmin Cookie，並加入新的 teacher_auth 負責紀錄班級權限
const isAdmin = useCookie('isAdmin', { maxAge: 60 * 60 * 24 }); 
const authCookie = useCookie('teacher_auth', { maxAge: 60 * 60 * 24 });

const handleLogin = async () => {
  if (!password.value) {
    errorMsg.value = '請輸入密碼！';
    return;
  }

  isLoading.value = true;
  errorMsg.value = '';

  try {
    // 🌟 1. 動態密碼產生器 (YYMMDD) - 給「網站管理員」使用
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2); 
    const mm = String(today.getMonth() + 1).padStart(2, '0'); 
    const dd = String(today.getDate()).padStart(2, '0'); 
    const adminPassword = yy + mm + dd;

    if (password.value === adminPassword) {
      isAdmin.value = 'superadmin'; 
      authCookie.value = {
        name: '總管理員',
        classes: ['ALL'], // 'ALL' 代表無限制，可看全校
        role: 'admin'
      };
      alert('身分驗證：網站管理員！\n正在進入系統...');
      await navigateTo('/admin'); 
      return;
    } 

    // 🌟 2. 舊版固定密碼防呆機制
    if (password.value === 'shjhs') {
      errorMsg.value = '「shjhs」通用密碼已停用，請改用您的專屬教師密碼登入！';
      password.value = ''; 
      return;
    }

    // 🌟 3. 新版專屬教師密碼驗證 (查資料庫)
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('password', password.value)
      .single();

    if (teacher) {
      isAdmin.value = 'teacher'; 
      authCookie.value = {
        name: teacher.teacher_name,
        classes: teacher.allowed_classes, // 將陣列寫入 Cookie (例如 ['704', '901', '907'])
        role: 'teacher'
      };
      alert(`身分驗證：${teacher.teacher_name}！\n正在進入報表系統...`);
      await navigateTo('/admin'); 
      return;
    }

    // 若皆不符合
    errorMsg.value = '密碼錯誤，請重新輸入！';
    password.value = ''; 

  } catch (err) {
    console.error(err);
    errorMsg.value = '系統發生錯誤，或密碼不存在，請稍後再試。';
    password.value = '';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-box retro-element">
      <h2>SYSTEM LOGIN</h2>
      <p>管理員 / 教師 權限驗證</p>
      
      <div class="input-group">
        <input 
          type="password" 
          v-model="password" 
          placeholder="ENTER PASSWORD..." 
          @keyup.enter="handleLogin" 
          class="retro-input"
          :disabled="isLoading"
        />
      </div>
      
      <button class="retro-btn login-btn" @click="handleLogin" :disabled="isLoading">
        {{ isLoading ? 'VERIFYING...' : '登入後台' }}
      </button>
      <p v-if="errorMsg" class="error-msg">ACCESS DENIED: {{ errorMsg }}</p>
      
      <div class="back-link"><NuxtLink to="/">← 返回首頁</NuxtLink></div>
    </div>
  </div>
</template>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
.login-box { background: var(--box-bg); padding: 40px 30px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); text-align: center; width: 100%; max-width: 400px; transition: all 0.4s ease; }
h2 { margin-top: 0; color: var(--text-main); font-weight: 900; letter-spacing: 2px; }
p { color: var(--text-muted); font-weight: bold; margin-bottom: 25px; }

.retro-input { width: 100%; padding: 15px; margin-bottom: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); font-size: 1.1rem; font-family: inherit; font-weight: bold; box-sizing: border-box; background-color: var(--input-bg); color: var(--text-main); outline: none; transition: all 0.3s; }
.retro-input:focus { background-color: var(--input-focus); border-color: var(--text-main); }
.retro-input:disabled { opacity: 0.6; cursor: not-allowed; }

.retro-btn { width: 100%; padding: 15px; background-color: var(--btn-danger-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); font-size: 1.2rem; font-weight: 900; cursor: pointer; box-shadow: var(--shadow-btn); transition: all 0.15s; }
.retro-btn:active:not(:disabled) { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.retro-btn:disabled { opacity: 0.7; filter: grayscale(50%); cursor: not-allowed; }

.error-msg { color: var(--danger-color); margin-top: 15px; font-weight: 900; background: var(--danger-bg); padding: 10px; border: 2px dashed var(--danger-color); border-radius: var(--radius-element); }
.back-link { margin-top: 25px; }
.back-link a { color: var(--text-main); text-decoration: none; font-weight: bold; border-bottom: 2px solid var(--text-main); padding-bottom: 2px; transition: all 0.2s;}
.back-link a:hover { color: var(--box-bg); background: var(--text-main); }
</style>