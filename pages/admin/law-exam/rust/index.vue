<script setup>
import { computed, onMounted, ref } from 'vue';
import { createDefaultRustProgress, rustLessons, rustStages } from '~/lib/rust-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const progress = ref(createDefaultRustProgress());
const loaded = ref(false);
const { isLoading, syncError, migratedFromBrowser, loadProgress } = useRustProgress();

onMounted(async () => {
  progress.value = await loadProgress();
  loaded.value = true;
});

const availableLessons = computed(() => rustLessons.filter(lesson => lesson.available));
const completedCount = computed(() => availableLessons.value.filter(lesson => progress.value.lessons[lesson.id]?.status === 'completed').length);
const reviewCount = computed(() => availableLessons.value.filter(lesson => progress.value.lessons[lesson.id]?.status === 'review').length);
const percent = computed(() => availableLessons.value.length ? Math.round(completedCount.value / availableLessons.value.length * 100) : 0);
const continueLesson = computed(() => {
  const requested = rustLessons.find(lesson => lesson.id === progress.value.lastLesson && lesson.available);
  if (requested) return requested;
  return availableLessons.value.find(lesson => progress.value.lessons[lesson.id]?.status !== 'completed') || availableLessons.value[0];
});
const totalMinutes = computed(() => Object.values(progress.value.lessons).reduce((sum, item) => sum + Number(item.minutes || 0), 0));
const statusLabel = lesson => ({ completed: '已理解', review: '待複習', learning: '學習中' }[progress.value.lessons[lesson.id]?.status] || '未開始');
</script>

<template>
  <main class="rust-page">
    <header class="hero">
      <div>
        <NuxtLink to="/admin/law-exam" class="back-link">← 回司律與私人學習後台</NuxtLink>
        <p class="eyebrow">PRIVATE RUST WORKBENCH</p>
        <h1><span>R</span>ust 私人自學工作台</h1>
        <p class="lead">從第一行程式到能獨立打造可靠工具。課程、練習、筆記與掌握度都收在這個私人空間。</p>
        <NuxtLink v-if="continueLesson && !isLoading" :to="`/admin/law-exam/rust/lesson/${continueLesson.id}`" class="continue-btn">繼續：{{ continueLesson.title }} <b>→</b></NuxtLink>
      </div>
      <div class="ferris" aria-hidden="true"><span>🦀</span><small>安全、快速、無畏並行</small></div>
    </header>

    <section class="stats" aria-label="學習概況">
      <article><small>完整課程進度</small><strong>{{ percent }}%</strong><div class="bar"><i :style="{ width: `${percent}%` }"></i></div></article>
      <article><small>已理解</small><strong>{{ completedCount }}<em>/{{ availableLessons.length }}</em></strong><p>目前開放課程</p></article>
      <article><small>待複習</small><strong>{{ reviewCount }}</strong><p>依標記集中回顧</p></article>
      <article><small>投入時間</small><strong>{{ totalMinutes }}<em> 分</em></strong><p>在課程頁自行累計</p></article>
    </section>

    <ProgrammingEnvironmentGuide environment-key="rust" />

    <section class="roadmap">
      <div class="section-heading"><div><p>LEARNING ROADMAP</p><h2>從基礎到進階</h2></div><span>六大階段、50 堂課程與完整實作專案皆已開放。</span></div>

      <div v-for="stage in rustStages" :key="stage.id" class="stage" :style="{ '--stage': stage.color }">
        <div class="stage-title"><span>{{ stage.number }}</span><div><h3>{{ stage.icon }} {{ stage.title }}</h3><p>{{ stage.subtitle }}</p></div></div>
        <div class="lesson-grid">
          <component :is="lesson.available ? 'NuxtLink' : 'article'" v-for="lesson in rustLessons.filter(item => item.stage === stage.id)" :key="lesson.id" :to="lesson.available ? `/admin/law-exam/rust/lesson/${lesson.id}` : undefined" class="lesson-card" :class="{ locked: !lesson.available, complete: progress.lessons[lesson.id]?.status === 'completed' }">
            <div class="lesson-number">{{ String(lesson.order).padStart(2, '0') }}</div>
            <div class="lesson-copy"><span>{{ lesson.duration }} 分鐘 · {{ statusLabel(lesson) }}</span><h4>{{ lesson.title }}</h4><p>{{ lesson.subtitle }}</p></div>
            <b>{{ lesson.available ? '→' : '規劃中' }}</b>
          </component>
        </div>
      </div>
    </section>

    <p v-if="syncError" class="privacy-note error">⚠️ {{ syncError }}</p>
    <p v-else-if="loaded" class="privacy-note">☁️ 此工作台位於司律雙層驗證後台，進度、程式碼與筆記會同步至資料庫，可跨裝置繼續學習。<span v-if="migratedFromBrowser"> 已完成本機舊資料搬移。</span></p>
  </main>
</template>

<style scoped>
.rust-page{--ink:#1d2226;--rust:#c2410c;min-height:100vh;background:#f5f1ea;color:var(--ink);font-family:Inter,'Noto Sans TC',system-ui,sans-serif;padding:28px}.hero{max-width:1240px;margin:auto;min-height:370px;border-radius:28px;padding:54px clamp(28px,6vw,78px);display:flex;align-items:center;justify-content:space-between;gap:30px;background:linear-gradient(115deg,#191d20 0 62%,#9a3412 62% 100%);color:#fff;box-shadow:0 24px 60px #3b281b2c;overflow:hidden}.hero>div:first-child{max-width:720px}.back-link{display:inline-block;margin-bottom:42px;color:#fed7aa;text-decoration:none;font-weight:800}.eyebrow,.section-heading>div>p{margin:0;color:#fb923c;font-size:12px;font-weight:900;letter-spacing:.18em}.hero h1{font-size:clamp(35px,5vw,68px);line-height:1.05;margin:8px 0 18px}.hero h1 span{display:inline-grid;place-items:center;width:1.05em;height:1.05em;border-radius:50%;background:#ea580c;color:#fff}.lead{max-width:650px;color:#d7d9da;font-size:clamp(16px,2vw,20px);line-height:1.8}.continue-btn{display:inline-flex;align-items:center;gap:20px;margin-top:18px;border-radius:10px;background:#ea580c;color:white;padding:14px 20px;text-decoration:none;font-weight:900}.continue-btn b{font-size:22px}.ferris{width:250px;text-align:center;transform:rotate(3deg)}.ferris span{display:block;font-size:130px;filter:drop-shadow(0 18px 12px #0005)}.ferris small{font-weight:800;color:#ffedd5}.stats{max-width:1160px;margin:-28px auto 46px;position:relative;display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:12px}.stats article{border:1px solid #e3dbd0;border-radius:16px;background:#fff;padding:20px;box-shadow:0 8px 28px #38261512}.stats small{font-weight:800;color:#6b625b}.stats strong{display:block;margin:5px 0;font-size:30px}.stats em{font-size:14px;color:#756a61;font-style:normal}.stats p{margin:0;color:#8b8178;font-size:12px}.bar{height:8px;background:#e8e0d8;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:#ea580c}.roadmap{max-width:1160px;margin:auto}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:30px}.section-heading h2{font-size:34px;margin:5px 0}.section-heading>span{color:#786e66}.stage{display:grid;grid-template-columns:240px 1fr;gap:24px;padding:27px 0;border-top:1px solid #d9d0c6}.stage-title{display:flex;gap:13px}.stage-title>span{color:var(--stage);font-size:13px;font-weight:900}.stage-title h3{margin:0;font-size:21px}.stage-title p{margin:7px 0;color:#766c64;line-height:1.5}.lesson-grid{display:grid;gap:10px}.lesson-card{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:15px;border:1px solid #ddd4c9;border-left:5px solid var(--stage);border-radius:14px;background:#fff;padding:17px;text-decoration:none;color:inherit;transition:.18s}.lesson-card[href]:hover{transform:translateX(6px);box-shadow:0 8px 24px #3f302217}.lesson-card.complete{background:#f0fdf4;border-right-color:#86efac}.lesson-card.locked{opacity:.55;background:#ece8e3}.lesson-number{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:#f0eae3;font-weight:900;color:var(--stage)}.lesson-copy span{font-size:11px;font-weight:900;color:var(--stage)}.lesson-copy h4{margin:3px 0;font-size:18px}.lesson-copy p{margin:0;color:#776d65}.lesson-card>b{font-size:13px;color:var(--stage)}.privacy-note{max-width:1160px;margin:32px auto 0;border-radius:12px;background:#fff7ed;padding:15px;color:#7c2d12;text-align:center;font-weight:700}.privacy-note.error{background:#fef2f2;color:#991b1b}@media(max-width:800px){.rust-page{padding:10px}.hero{padding:30px 22px;min-height:0}.back-link{margin-bottom:25px}.ferris{display:none}.stats{grid-template-columns:1fr 1fr;margin:12px auto 32px}.stage{grid-template-columns:1fr}.section-heading{display:block}.lesson-card{grid-template-columns:42px 1fr}.lesson-card>b{display:none}}@media(max-width:480px){.stats{grid-template-columns:1fr}.hero h1{font-size:36px}.lesson-copy p{font-size:13px}}
</style>
