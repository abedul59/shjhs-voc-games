<script setup>
definePageMeta({ middleware: ['auth', 'law-auth'] });
</script>

<template>
  <div class="dashboard-container">
    <div class="header">
      <NuxtLink to="/admin" class="back-btn">← 回網站主後台</NuxtLink>
      <h1>⚖️ 司律考試專區</h1>
      <p>個人專屬題庫與法典學習系統</p>
    </div>

    <div class="cards-grid">
      <NuxtLink to="/admin/law-exam/practice" class="dash-card practice-card">
        <div class="icon">🎯</div><h2>開始刷題練習</h2>
      </NuxtLink>
      <NuxtLink to="/admin/law-exam/manage" class="dash-card manage-card">
        <div class="icon">📚</div><h2>題庫與解析管理</h2>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/civil-law" class="dash-card law-indigo">
        <div class="icon">🏛️</div><h2>民法典籍</h2>
      </NuxtLink>
      <NuxtLink to="/admin/law-exam/criminal-law" class="dash-card law-rose">
        <div class="icon">⚖️</div><h2>刑法典籍</h2>
      </NuxtLink>
      <NuxtLink to="/admin/law-exam/civil-procedure-law" class="dash-card law-amber">
        <div class="icon">📜</div><h2>民事訴訟法</h2>
      </NuxtLink>
      <NuxtLink to="/admin/law-exam/criminal-procedure-law" class="dash-card law-emerald">
        <div class="icon">🚔</div><h2>刑事訴訟法</h2>
      </NuxtLink>
      <NuxtLink to="/admin/law-exam/constitutional-law" class="dash-card law-violet">
        <div class="icon">👑</div><h2>憲法典籍</h2>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/teachers-act" class="dash-card law-cyan">
        <div class="icon">🧑‍🏫</div><h2>教師法</h2>
      </NuxtLink>
      <NuxtLink to="/admin/law-exam/teachers-act-enforcement-rules" class="dash-card law-sky">
        <div class="icon">📋</div><h2>教師法施行細則</h2>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container { font-family: sans-serif; max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
.header { text-align: center; margin-bottom: 40px; }
.back-btn { color: #64748b; text-decoration: none; font-weight: bold; background: white; padding: 6px 16px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: inline-block; margin-bottom: 20px;}
.header h1 { font-size: 32px; color: #1e293b; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.dash-card { display: block; text-decoration: none; background: white; padding: 30px 20px; border-radius: 20px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 2px solid transparent; transition: 0.3s; }
.dash-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.icon { font-size: 40px; margin-bottom: 15px; }
.dash-card h2 { color: #1e293b; font-size: 18px; margin: 0; }

.practice-card:hover { border-color: #3b82f6; }
.manage-card:hover { border-color: #10b981; }

.law-indigo:hover { border-color: #4f46e5; background: #eef2ff; }
.law-rose:hover { border-color: #e11d48; background: #fff1f2; }
.law-amber:hover { border-color: #d97706; background: #fffbeb; }
.law-emerald:hover { border-color: #059669; background: #ecfdf5; }
.law-violet:hover { border-color: #7c3aed; background: #f5f3ff; }

/* 新增的教育法規顏色 */
.law-cyan:hover { border-color: #0891b2; background: #ecfeff; }
.law-sky:hover { border-color: #0284c7; background: #f0f9ff; }

@media (max-width: 768px) { .cards-grid { grid-template-columns: 1fr 1fr; } }
</style>
