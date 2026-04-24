<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div class="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-gray-800 tracking-tight">系統進階設定</h2>
        <p class="text-gray-500 text-sm mt-2">請輸入您的授權碼以繼續</p>
      </div>

      <div class="space-y-4">
        <input
          v-model="pwdInput"
          type="text"
          placeholder="請輸入 6 位數代碼"
          class="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 text-center text-2xl font-mono text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          maxlength="6"
          @keyup.enter="handleVerify"
        />
        
        <button
          @click="handleVerify"
          :disabled="isProcessing"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition duration-200 shadow-sm disabled:opacity-50"
        >
          {{ isProcessing ? '驗證中...' : '確認進入' }}
        </button>

        <p v-if="error" class="text-red-500 text-sm text-center font-medium mt-2">
          授權碼錯誤
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ["auth"] })

const pwdInput = ref('')
const error = ref(false)
const isProcessing = ref(false)

// 設定司律專屬 Session (1小時有效)
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

  // 稍微延遲一下，讓按鈕有「正在驗證」的真實感
  await new Promise(resolve => setTimeout(resolve, 300))

  const expectedCode = getTodayCode()

  if (pwdInput.value === expectedCode) {
    lawSession.value = 'active'
    navigateTo('/admin/law-exam') // 密碼正確，進入司律後台
  } else {
    error.value = true
    pwdInput.value = ''
  }
  
  isProcessing.value = false
}
</script>