<script setup>
// 套用基礎管理員權限，確保至少要是登入狀態
definePageMeta({ middleware: ["auth"] })

const pwdInput = ref('')
const error = ref(false)
const isProcessing = ref(false)

// 設定司律專屬 Session (有效期 1 小時)
const lawSession = useCookie('law_exam_session_active', { maxAge: 3600 })

// 取得當天日期的 YYMMDD 格式 (例如 2026/04/24 -> 260424)
const getTodayCode = () => {
  const today = new Date()
  const yy = String(today.getFullYear()).slice(-2)
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

const handleVerify = async () => {
  if (pwdInput.value.length !== 6) return
  
  isProcessing.value = true
  error.value = false

  // 稍微延遲，製造真實的驗證感
  await new Promise(resolve => setTimeout(resolve, 400))

  const expectedCode = getTodayCode()

  if (pwdInput.value === expectedCode) {
    lawSession.value = 'active'
    navigateTo('/admin/law-exam') // 密碼正確，進入司律專區首頁
  } else {
    error.value = true
    pwdInput.value = ''
  }
  
  isProcessing.value = false
}
</script>

<template>
  <div class="gate-wrapper">
    <div class="gate-card">
      <div class="icon-box">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      
      <h2 class="title">系統進階設定</h2>
      <p class="subtitle">請輸入您的授權碼以繼續</p>

      <div class="input-group">
        <input
          v-model="pwdInput"
          type="text"
          placeholder="000000"
          class="pwd-input"
          maxlength="6"
          @keyup.enter="handleVerify"
          autocomplete="off"
        />
        
        <button
          @click="handleVerify"
          :disabled="isProcessing || pwdInput.length !== 6"
          class="submit-btn"
        >
          {{ isProcessing ? '驗證中...' : '確認進入' }}
        </button>

        <p v-if="error" class="error-msg">
          ❌ 授權碼錯誤或已過期
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 頁面外觀與置中 */
.gate-wrapper {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f4f8; /* 與後台一致的淺灰藍背景 */
  font-family: 'Helvetica Neue', Arial, sans-serif;
  padding: 20px;
  box-sizing: border-box;
}

/* 驗證卡片主體 */
.gate-card {
  background: white;
  width: 100%;
  max-width: 420px;
  padding: 40px 30px;
  border-radius: 20px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
  text-align: center;
  border: 1px solid #e2e8f0;
  animation: slideUp 0.4s ease-out forwards;
}

/* 頂部圖示 */
.icon-box {
  width: 64px;
  height: 64px;
  background: #e0e7ff;
  color: #4f46e5;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px auto;
}
.icon-box svg {
  width: 32px;
  height: 32px;
}

/* 標題文字 */
.title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: bold;
  color: #1e293b;
  letter-spacing: 1px;
}
.subtitle {
  margin: 0 0 30px 0;
  font-size: 14px;
  color: #64748b;
}

/* 輸入框設計 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.pwd-input {
  width: 100%;
  padding: 16px;
  font-size: 32px;
  font-family: monospace;
  letter-spacing: 12px;
  text-align: center;
  color: #334155;
  background: #f8fafc;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}
.pwd-input::placeholder {
  color: #cbd5e1;
}
.pwd-input:focus {
  border-color: #4f46e5;
  background: white;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

/* 送出按鈕 */
.submit-btn {
  width: 100%;
  padding: 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
}
.submit-btn:hover:not(:disabled) {
  background: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(79, 70, 229, 0.3);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  background: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
}

/* 錯誤提示 */
.error-msg {
  margin: 10px 0 0 0;
  color: #dc2626;
  font-size: 14px;
  font-weight: bold;
  animation: shake 0.4s ease-in-out;
}

/* 🌟 動畫效果 */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
}

/* 🌟 手機版 (Mobile) 專屬優化 */
@media (max-width: 480px) {
  .gate-card {
    padding: 30px 20px;
    border-radius: 16px;
  }
  .icon-box {
    width: 56px;
    height: 56px;
  }
  .icon-box svg {
    width: 28px;
    height: 28px;
  }
  .title {
    font-size: 22px;
  }
  .pwd-input {
    font-size: 28px;
    letter-spacing: 8px; /* 手機螢幕較窄，縮小字距防止跑版 */
    padding: 12px;
  }
  .submit-btn {
    padding: 14px;
  }
}
</style>
