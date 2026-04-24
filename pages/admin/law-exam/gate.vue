<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 p-6">
    <div class="w-full max-w-sm bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-white tracking-tight">司律專區安全驗證</h2>
        <p class="text-gray-400 text-sm mt-2">請輸入您的二階動態授權碼</p>
      </div>

      <div class="space-y-4">
        <input
          v-model="otpInput"
          type="text"
          placeholder="請輸入 6 位數代碼"
          class="w-full bg-gray-950 border border-gray-600 rounded-xl py-3 px-4 text-center text-2xl font-mono text-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          maxlength="6"
          @keyup.enter="handleVerify"
        />
        
        <button
          @click="handleVerify"
          :disabled="isProcessing"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-900/20 disabled:opacity-50"
        >
          {{ isProcessing ? '驗證中...' : '確認進入' }}
        </button>

        <p v-if="error" class="text-red-400 text-xs text-center animate-bounce">
          驗證失敗，請重新確認代碼
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// 套用基礎管理員權限，確保至少要是登入狀態
definePageMeta({ middleware: ["auth"] })

const otpInput = ref('')
const error = ref(false)
const isProcessing = ref(false)

// 設定司律專屬 Session，有效期建議設短（例如 1 小時），關閉瀏覽器後失效
const lawSession = useCookie('law_exam_session_active', { maxAge: 3600 })

const handleVerify = async () => {
  if (otpInput.value.length < 4) return
  
  isProcessing.value = true
  error.value = false

  try {
    // 這裡調用你專案原有的驗證邏輯（例如 /api/auth/verify）
    // 假設驗證成功，寫入 Cookie 並導向司律管理首頁
    const { data } = await useFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: { code: otpInput.value }
    })

    if (data.value?.success) {
      lawSession.value = 'active'
      navigateTo('/admin/law-exam')
    } else {
      error.value = true
      otpInput.value = ''
    }
  } catch (err) {
    error.value = true
  } finally {
    isProcessing.value = false
  }
}
</script>