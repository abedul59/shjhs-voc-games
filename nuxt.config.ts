// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase'],
  supabase: {
    redirect: false // 關閉預設跳轉，我們自己寫邏輯
  }
})