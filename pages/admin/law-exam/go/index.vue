<script setup>
import { computed, onMounted, ref } from 'vue';
import { createDefaultGoProgress, goLessons, goStages } from '~/lib/go-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const progress = ref(createDefaultGoProgress());
const loaded = ref(false);
const { isLoading, syncError, migratedFromBrowser, loadProgress } = useGoProgress();

onMounted(async () => {
  progress.value = await loadProgress();
  loaded.value = true;
});

const completedCount = computed(() => goLessons.filter(item => progress.value.lessons[item.id]?.status === 'completed').length);
const reviewCount = computed(() => goLessons.filter(item => progress.value.lessons[item.id]?.status === 'review').length);
const percent = computed(() => Math.round(completedCount.value / goLessons.length * 100));
const totalMinutes = computed(() => Object.values(progress.value.lessons).reduce((sum, item) => sum + Number(item.minutes || 0), 0));
const continueLesson = computed(() => goLessons.find(item => item.id === progress.value.lastLesson) || goLessons.find(item => progress.value.lessons[item.id]?.status !== 'completed') || goLessons[0]);
const statusLabel = item => ({ completed: '已理解', review: '待複習', learning: '學習中' }[progress.value.lessons[item.id]?.status] || '未開始');
</script>

<template>
  <main class="go-page">
    <header class="hero">
      <div class="hero-copy">
        <NuxtLink to="/admin/law-exam" class="back">← 回司律與私人學習後台</NuxtLink>
        <p class="eyebrow">PRIVATE GO WORKBENCH</p>
        <h1><span>Go</span> 私人自學工作台</h1>
        <p class="lead">從清楚簡潔的語法，走到並行服務與可維護的工程設計。21 堂課、三個專案，一路建立真正能交付的 Go 能力。</p>
        <NuxtLink v-if="!isLoading" :to="`/admin/law-exam/go/lesson/${continueLesson.id}`" class="continue">繼續：{{ continueLesson.title }} <b>→</b></NuxtLink>
      </div>
      <div class="gopher" aria-hidden="true"><strong>ʕ◔ϖ◔ʔ</strong><small>簡潔、可靠、天生並行</small></div>
    </header>

    <section class="stats" aria-label="學習概況">
      <article><small>完整課程進度</small><strong>{{ percent }}%</strong><div class="bar"><i :style="{ width: `${percent}%` }"></i></div></article>
      <article><small>已理解</small><strong>{{ completedCount }}<em>/{{ goLessons.length }}</em></strong><p>全部課程皆已開放</p></article>
      <article><small>待複習</small><strong>{{ reviewCount }}</strong><p>集中回顧標記內容</p></article>
      <article><small>投入時間</small><strong>{{ totalMinutes }}<em> 分</em></strong><p>跨裝置同步累計</p></article>
    </section>

    <section class="roadmap">
      <div class="heading"><div><p>LEARNING ROADMAP</p><h2>從語法到雲端服務</h2></div><span>六大階段、21 堂課與三個實作專案皆已開放。</span></div>
      <div v-for="stage in goStages" :key="stage.id" class="stage" :style="{ '--stage': stage.color }">
        <div class="stage-title"><span>{{ stage.number }}</span><div><h3>{{ stage.icon }} {{ stage.title }}</h3><p>{{ stage.subtitle }}</p></div></div>
        <div class="lesson-grid">
          <NuxtLink v-for="item in goLessons.filter(lesson => lesson.stage === stage.id)" :key="item.id" :to="`/admin/law-exam/go/lesson/${item.id}`" class="lesson-card" :class="{ complete: progress.lessons[item.id]?.status === 'completed' }">
            <div class="number">{{ String(item.order).padStart(2, '0') }}</div>
            <div><span>{{ item.duration }} 分鐘 · {{ statusLabel(item) }}</span><h4>{{ item.title }}</h4><p>{{ item.subtitle }}</p></div><b>→</b>
          </NuxtLink>
        </div>
      </div>
    </section>
    <p v-if="syncError" class="cloud error">⚠️ {{ syncError }}</p>
    <p v-else-if="loaded" class="cloud">☁️ 進度、程式碼與筆記會同步至資料庫，可跨裝置繼續學習。<span v-if="migratedFromBrowser">已完成本機舊資料搬移。</span></p>
  </main>
</template>

<style scoped>
.go-page{--ink:#14212b;min-height:100vh;background:#eff8fa;color:var(--ink);font-family:Inter,'Noto Sans TC',system-ui,sans-serif;padding:28px}.hero{max-width:1240px;min-height:360px;margin:auto;padding:52px clamp(28px,6vw,78px);box-sizing:border-box;border-radius:30px;display:flex;align-items:center;justify-content:space-between;gap:30px;background:linear-gradient(118deg,#10252e 0 62%,#087e8b 62%);color:white;box-shadow:0 24px 60px #08334425;overflow:hidden}.hero-copy{max-width:750px}.back{display:inline-block;margin-bottom:38px;color:#a5f3fc;text-decoration:none;font-weight:800}.eyebrow,.heading p{margin:0;color:#22d3ee;font-size:12px;font-weight:900;letter-spacing:.18em}.hero h1{font-size:clamp(38px,5vw,68px);line-height:1.05;margin:8px 0 18px}.hero h1 span{color:#67e8f9}.lead{max-width:670px;color:#d7eef2;font-size:clamp(16px,2vw,20px);line-height:1.8}.continue{display:inline-flex;gap:20px;margin-top:18px;padding:14px 20px;border-radius:10px;background:#0891b2;color:white;text-decoration:none;font-weight:900}.gopher{width:270px;text-align:center;transform:rotate(3deg)}.gopher strong{display:block;font-size:64px;white-space:nowrap;text-shadow:0 18px 20px #0005}.gopher small{display:block;margin-top:25px;color:#cffafe;font-weight:900}.stats{position:relative;max-width:1160px;margin:-28px auto 46px;display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:12px}.stats article{padding:20px;border:1px solid #cde3e7;border-radius:16px;background:#fff;box-shadow:0 8px 28px #08334410}.stats small{color:#52656b;font-weight:800}.stats strong{display:block;margin:5px 0;font-size:30px}.stats em{font-size:14px;color:#687d83;font-style:normal}.stats p{margin:0;color:#789096;font-size:12px}.bar{height:8px;border-radius:99px;background:#dcecef;overflow:hidden}.bar i{display:block;height:100%;background:#0891b2}.roadmap{max-width:1160px;margin:auto}.heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:30px}.heading h2{font-size:34px;margin:5px 0}.heading>span{color:#60757b}.stage{display:grid;grid-template-columns:240px 1fr;gap:24px;padding:27px 0;border-top:1px solid #c8dce0}.stage-title{display:flex;gap:13px}.stage-title>span{color:var(--stage);font-size:13px;font-weight:900}.stage-title h3{margin:0;font-size:21px}.stage-title p{margin:7px 0;color:#65777c;line-height:1.5}.lesson-grid{display:grid;gap:10px}.lesson-card{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:15px;padding:17px;border:1px solid #ccdde0;border-left:5px solid var(--stage);border-radius:14px;background:#fff;color:inherit;text-decoration:none;transition:.18s}.lesson-card:hover{transform:translateX(6px);box-shadow:0 8px 24px #08334415}.lesson-card.complete{background:#f0fdf4}.number{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:#e7f3f5;color:var(--stage);font-weight:900}.lesson-card span{font-size:11px;color:var(--stage);font-weight:900}.lesson-card h4{margin:3px 0;font-size:18px}.lesson-card p{margin:0;color:#64767b}.lesson-card>b{color:var(--stage)}.cloud{max-width:1160px;margin:32px auto 0;padding:15px;border-radius:12px;background:#ecfeff;color:#155e75;text-align:center;font-weight:700}.cloud.error{background:#fef2f2;color:#991b1b}@media(max-width:800px){.go-page{padding:10px}.hero{min-height:0;padding:30px 22px}.gopher{display:none}.stats{grid-template-columns:1fr 1fr;margin:12px auto 32px}.stage{grid-template-columns:1fr}.heading{display:block}.lesson-card{grid-template-columns:42px 1fr}.lesson-card>b{display:none}}@media(max-width:480px){.stats{grid-template-columns:1fr}.hero h1{font-size:36px}}
</style>
