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
    </div>

    <hr class="section-divider" />

    <h3 class="section-title">🎓 學分班筆記專區</h3>
    <div class="cards-grid course-grid">
      <NuxtLink to="/admin/law-exam/civil-course" class="dash-card course-card civil-theme">
        <div class="icon">📘</div>
        <div class="course-info">
          <span class="course-tag tag-civil">學分班</span>
          <h2>民法 55 堂課</h2>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/criminal-course" class="dash-card course-card criminal-theme">
        <div class="icon">📕</div>
        <div class="course-info">
          <span class="course-tag tag-criminal">學分班</span>
          <h2>刑法 55 堂課</h2>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/administrative-course" class="dash-card course-card admin-theme">
        <div class="icon">📓</div>
        <div class="course-info">
          <span class="course-tag tag-admin">學分班</span>
          <h2>行政法 55 堂課</h2>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/civil-procedure-course" class="dash-card course-card cp-theme">
        <div class="icon">📙</div>
        <div class="course-info">
          <span class="course-tag tag-cp">學分班</span>
          <h2>民訴法 55 堂課</h2>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/criminal-procedure-course" class="dash-card course-card crp-theme">
        <div class="icon">📗</div>
        <div class="course-info">
          <span class="course-tag tag-crp">學分班</span>
          <h2>刑訴法 55 堂課</h2>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/commercial-course" class="dash-card course-card comm-theme">
        <div class="icon">💼</div>
        <div class="course-info">
          <span class="course-tag tag-comm">學分班</span>
          <h2>商事法 55 堂課</h2>
        </div>
      </NuxtLink>

      <NuxtLink to="/admin/law-exam/ip-course" class="dash-card course-card ip-theme">
        <div class="icon">💡</div>
        <div class="course-info">
          <span class="course-tag tag-ip">學分班</span>
          <h2>智財法 55 堂課</h2>
        </div>
      </NuxtLink>
    </div>

    <hr class="section-divider" />

    <h3 class="section-title">🏛️ 基礎法學專區</h3>
    <div class="cards-grid">
      <NuxtLink to="/admin/law-exam/constitutional-law" class="dash-card law-violet"><div class="icon">👑</div><h2>憲法典籍</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/civil-law" class="dash-card law-indigo"><div class="icon">🏛️</div><h2>民法典籍</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/criminal-law" class="dash-card law-rose"><div class="icon">⚖️</div><h2>刑法典籍</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/civil-procedure-law" class="dash-card law-amber"><div class="icon">📜</div><h2>民事訴訟法</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/criminal-procedure-law" class="dash-card law-emerald"><div class="icon">🚔</div><h2>刑事訴訟法</h2></NuxtLink>
    </div>

    <hr class="section-divider" />

    <h3 class="section-title">🏛️ 行政法與公務員法專區</h3>
    <div class="cards-grid">
      <NuxtLink to="/admin/law-exam/administrative-procedure-act" class="dash-card law-gray"><div class="icon">⚙️</div><h2>行政程序法</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/administrative-litigation-act" class="dash-card law-deep-purple"><div class="icon">🏛️</div><h2>行政訴訟法</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/state-compensation-law" class="dash-card law-rust"><div class="icon">💰</div><h2>國家賠償法</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/public-servants-service-act" class="dash-card law-marine"><div class="icon">👔</div><h2>公務員服務法</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/public-servants-protection-act" class="dash-card law-forest"><div class="icon">🛡️</div><h2>公務人員保障法</h2></NuxtLink>
    </div>

    <hr class="section-divider" />

    <h3 class="section-title">🎓 教育法規專區</h3>
    <div class="cards-grid">
      <NuxtLink to="/admin/law-exam/educational-fundamental-act" class="dash-card law-teal"><div class="icon">📖</div><h2>教育基本法</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/teachers-act" class="dash-card law-cyan"><div class="icon">🧑‍🏫</div><h2>教師法</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/teachers-act-enforcement-rules" class="dash-card law-sky"><div class="icon">📋</div><h2>教師法施行細則</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/campus-bullying-prevention-guidelines" class="dash-card law-orange"><div class="icon">🛑</div><h2>校園霸凌防制準則</h2></NuxtLink>
      <NuxtLink to="/admin/law-exam/teachers-dismissal-regulations" class="dash-card law-pink"><div class="icon">🚫</div><h2>解聘不續聘辦法</h2></NuxtLink>
    </div>

  </div>
</template>

<style scoped>
.dashboard-container { font-family: sans-serif; max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
.header { text-align: center; margin-bottom: 40px; }
.back-btn { color: #64748b; text-decoration: none; font-weight: bold; background: white; padding: 6px 16px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: inline-block; margin-bottom: 20px; transition: 0.2s;}
.back-btn:hover { background: #f1f5f9; color: #1e293b;}
.header h1 { font-size: 32px; color: #1e293b; margin: 0 0 10px 0;}
.header p { color: #64748b; font-size: 16px; margin: 0;}

.section-title { font-size: 20px; color: #334155; margin: 0 0 15px 5px; font-weight: 900;}
.section-divider { border: none; border-top: 1px dashed #cbd5e1; margin: 30px 0; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
.dash-card { display: block; text-decoration: none; background: white; padding: 25px 15px; border-radius: 16px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 2px solid transparent; transition: 0.2s; }
.dash-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.icon { font-size: 36px; margin-bottom: 12px; }
.dash-card h2 { color: #1e293b; font-size: 16px; margin: 0; font-weight: bold;}

/* 🌟 學分班卡片特殊樣式 */
.course-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.course-card { display: flex; align-items: center; text-align: left; gap: 15px; padding: 20px; background: #f8fafc; border: 2px solid #e2e8f0;}
.course-card .icon { margin: 0; font-size: 42px;}
.course-info { display: flex; flex-direction: column; gap: 5px;}
.course-tag { color: white; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; width: fit-content;}

/* 7 大考科學分班主題色 */
.tag-civil { background: #3b82f6; }
.civil-theme:hover { border-color: #3b82f6; background: white;}

.tag-criminal { background: #e11d48; }
.criminal-theme:hover { border-color: #e11d48; background: white;}

.tag-admin { background: #475569; }
.admin-theme:hover { border-color: #475569; background: white;}

.tag-cp { background: #d97706; }
.cp-theme:hover { border-color: #d97706; background: white;}

.tag-crp { background: #059669; }
.crp-theme:hover { border-color: #059669; background: white;}

.tag-comm { background: #0f766e; }
.comm-theme:hover { border-color: #0f766e; background: white;}

.tag-ip { background: #7c3aed; }
.ip-theme:hover { border-color: #7c3aed; background: white;}

/* 其他法典主題色 */
.practice-card:hover { border-color: #3b82f6; }
.manage-card:hover { border-color: #10b981; }

.law-indigo:hover { border-color: #4f46e5; background: #eef2ff; }
.law-rose:hover { border-color: #e11d48; background: #fff1f2; }
.law-amber:hover { border-color: #d97706; background: #fffbeb; }
.law-emerald:hover { border-color: #059669; background: #ecfdf5; }
.law-violet:hover { border-color: #7c3aed; background: #f5f3ff; }

.law-gray:hover { border-color: #374151; background: #f3f4f6; }
.law-deep-purple:hover { border-color: #6d28d9; background: #ede9fe; }
.law-rust:hover { border-color: #92400e; background: #fef3c7; }
.law-marine:hover { border-color: #1e40af; background: #dbeafe; }
.law-forest:hover { border-color: #065f46; background: #d1fae5; }

.law-cyan:hover { border-color: #0891b2; background: #ecfeff; }
.law-sky:hover { border-color: #0284c7; background: #f0f9ff; }
.law-pink:hover { border-color: #ec4899; background: #fdf2f8; }
.law-teal:hover { border-color: #14b8a6; background: #f0fdfa; }
.law-orange:hover { border-color: #ea580c; background: #fff7ed; }

@media (max-width: 768px) { 
  .cards-grid { grid-template-columns: 1fr 1fr; } 
  .course-grid { grid-template-columns: 1fr; }
}
</style>
