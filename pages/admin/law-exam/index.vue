<script setup>
definePageMeta({ middleware: ['auth', 'law-auth'] });
</script>

<template>
  <div class="dashboard-container">
    <div class="header">
      <NuxtLink to="/admin" class="back-btn">← 回網站主後台</NuxtLink>
      <h1>⚖️ 司律考試專區</h1>
      <p>歡迎進入個人專屬題庫與法典系統</p>
    </div>

    <div class="cards-grid">
      <NuxtLink to="/admin/law-exam/practice" class="dash-card practice-card">
        <div class="icon">🎯</div>
        <h2>開始刷題練習</h2>
        <p>依據年份、科目進行模擬測驗，並可隨時查看詳細解析與法條實務見解。</p>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/manage" class="dash-card manage-card">
        <div class="icon">📚</div>
        <h2>題庫與解析管理</h2>
        <p>匯入/匯出 CSV 題庫檔案，手動編輯題目內容、正確答案以及各選項解析。</p>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/civil-law" class="dash-card law-card">
        <div class="icon">🏛️</div>
        <h2>民法典籍與筆記</h2>
        <p>逐條查閱民法條文，支援法條跳轉浮動視窗，並可自訂專屬筆記與相關網址。</p>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/criminal-law" class="dash-card criminal-law-card">
        <div class="icon">⚖️</div>
        <h2>刑法典籍與筆記</h2>
        <p>逐條查閱刑法條文，支援法條跳轉浮動視窗，並可手動儲存實務見解與網址。</p>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px 20px; min-height: 100vh; color: #333; }
.header { text-align: center; margin-bottom: 40px; }
.back-btn { display: inline-block; margin-bottom: 20px; color: #64748b; text-decoration: none; font-weight: bold; background: white; padding: 6px 16px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.header h1 { font-size: 32px; color: #1e293b; margin-bottom: 10px; }
.header p { color: #64748b; font-size: 16px; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }

.dash-card { display: block; text-decoration: none; background: white; padding: 40px 30px; border-radius: 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 2px solid transparent; transition: 0.3s; }
.dash-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.icon { font-size: 48px; margin-bottom: 20px; }
.dash-card h2 { color: #1e293b; margin-bottom: 15px; font-size: 22px; }
.dash-card p { color: #64748b; line-height: 1.6; font-size: 15px; }

.practice-card:hover { border-color: #3b82f6; background: #f8fafc; }
.manage-card:hover { border-color: #10b981; background: #f0fdf4; }
.law-card:hover { border-color: #8b5cf6; background: #f5f3ff; }
.criminal-law-card:hover { border-color: #f43f5e; background: #fff1f2; }

@media (max-width: 768px) {
  .dashboard-container { padding: 20px 15px; }
  .dash-card { padding: 30px 20px; }
}
</style>
