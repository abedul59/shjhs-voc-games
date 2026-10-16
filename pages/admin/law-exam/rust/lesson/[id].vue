<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { createDefaultRustProgress, rustLessons, rustStages } from '~/lib/rust-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const lesson = computed(() => rustLessons.find(item => item.id === route.params.id && item.available));
const activeLessons = rustLessons.filter(item => item.available);
const lessonIndex = computed(() => activeLessons.findIndex(item => item.id === lesson.value?.id));
const previous = computed(() => lessonIndex.value > 0 ? activeLessons[lessonIndex.value - 1] : null);
const next = computed(() => lessonIndex.value >= 0 && lessonIndex.value < activeLessons.length - 1 ? activeLessons[lessonIndex.value + 1] : null);
const stage = computed(() => rustStages.find(item => item.id === lesson.value?.stage));
const progress = ref(createDefaultRustProgress());
const notes = ref('');
const status = ref('learning');
const minutes = ref(0);
const code = ref('');
const codeResult = ref(null);
const selectedAnswer = ref(null);
const quizChecked = ref(false);
const showSolution = ref(false);
const savedFlash = ref(false);
const loaded = ref(false);
const { isSaving, syncError, loadProgress: loadCloudProgress, saveProgress: saveCloudProgress } = useRustProgress();

async function loadProgress() {
  loaded.value = false;
  progress.value = await loadCloudProgress();
  const current = progress.value.lessons[lesson.value?.id] || {};
  notes.value = current.notes || '';
  status.value = current.status || 'learning';
  minutes.value = Number(current.minutes || 0);
  code.value = current.code || lesson.value?.challenge?.starter || '';
  progress.value.lastLesson = lesson.value?.id || progress.value.lastLesson;
  loaded.value = true;
  if (!syncError.value) await saveProgress(false);
}

async function saveProgress(flash = true) {
  if (!lesson.value || !import.meta.client) return;
  progress.value.lessons[lesson.value.id] = {
    ...progress.value.lessons[lesson.value.id], notes: notes.value, status: status.value,
    minutes: Math.max(0, Number(minutes.value) || 0), code: code.value, updatedAt: new Date().toISOString()
  };
  progress.value.lastLesson = lesson.value.id;
  try {
    await saveCloudProgress(progress.value);
    if (flash) { savedFlash.value = true; window.setTimeout(() => { savedFlash.value = false; }, 1600); }
  } catch { /* composable 會顯示同步錯誤。 */ }
}

async function checkCode() {
  const normalized = code.value.replace(/\s+/g, ' ').trim();
  const missing = lesson.value.challenge.required.filter(token => !normalized.includes(token.replace(/\s+/g, ' ').trim()));
  codeResult.value = missing.length
    ? { ok: false, text: `還差 ${missing.length} 個關鍵部分。先查看提示，再檢查：${missing[0]}` }
    : { ok: true, text: lesson.value.challenge.expectedOutput };
  await saveProgress(false);
}

function checkQuiz() {
  if (selectedAnswer.value === null) return;
  quizChecked.value = true;
}

async function completeLesson() {
  status.value = 'completed';
  await saveProgress();
}

watch(() => route.params.id, async () => {
  codeResult.value = null; selectedAnswer.value = null; quizChecked.value = false; showSolution.value = false;
  await loadProgress(); window.scrollTo({ top: 0, behavior: 'smooth' });
});

onMounted(async () => {
  if (!lesson.value) return navigateTo('/admin/law-exam/rust');
  await loadProgress();
});
</script>

<template>
  <main v-if="lesson" class="lesson-page" :style="{ '--stage': stage?.color || '#c2410c' }">
    <aside class="sidebar">
      <NuxtLink to="/admin/law-exam/rust" class="brand">🦀 <span>Rust<br><small>私人工作台</small></span></NuxtLink>
      <div class="side-progress"><span>基礎階段</span><b>{{ lesson.order }}/5</b><i><em :style="{ width: `${lesson.order / 5 * 100}%` }"></em></i></div>
      <nav><NuxtLink v-for="item in activeLessons" :key="item.id" :to="`/admin/law-exam/rust/lesson/${item.id}`" :class="{ active: item.id === lesson.id, done: progress.lessons[item.id]?.status === 'completed' }"><span>{{ String(item.order).padStart(2, '0') }}</span>{{ item.title }}</NuxtLink></nav>
      <NuxtLink to="/admin/law-exam" class="law-link">← 回司律專區</NuxtLink>
    </aside>

    <div class="content">
      <header class="lesson-hero">
        <div><p>{{ stage?.icon }} {{ stage?.title }} · 第 {{ lesson.order }} 課</p><h1>{{ lesson.title }}</h1><span>{{ lesson.subtitle }}</span></div>
        <div class="duration">約<strong>{{ lesson.duration }}</strong>分鐘</div>
      </header>

      <section class="objectives"><h2>這一課會學到</h2><ul><li v-for="item in lesson.objectives" :key="item">{{ item }}</li></ul></section>

      <article v-for="(section, index) in lesson.sections" :key="section.title" class="chapter">
        <div class="chapter-index">{{ String(index + 1).padStart(2, '0') }}</div>
        <div><h2>{{ section.title }}</h2><p>{{ section.body }}</p><pre><code>{{ section.code }}</code></pre></div>
      </article>

      <section class="practice-block">
        <div class="block-title"><div><span>實作練習</span><h2>{{ lesson.challenge.title }}</h2><p>{{ lesson.challenge.description }}</p></div><button @click="code = lesson.challenge.starter; codeResult = null">重設程式碼</button></div>
        <div class="editor"><div class="editor-bar"><i></i><i></i><i></i><span>src/main.rs</span></div><textarea v-model="code" spellcheck="false" aria-label="Rust 程式碼編輯器"></textarea></div>
        <div class="editor-actions"><button class="run" @click="checkCode">▶ 檢查程式</button><button @click="showSolution = !showSolution">{{ showSolution ? '隱藏參考答案' : '查看提示與答案' }}</button></div>
        <div v-if="codeResult" class="console" :class="{ success: codeResult.ok }"><b>{{ codeResult.ok ? '✓ 練習通過' : '編譯前檢查' }}</b><pre>{{ codeResult.text }}</pre></div>
        <details open><summary>提示</summary><ol><li v-for="hint in lesson.challenge.hints" :key="hint">{{ hint }}</li></ol></details>
        <pre v-if="showSolution" class="solution"><code>{{ lesson.challenge.solution }}</code></pre>
      </section>

      <section class="quiz-block"><span>觀念確認</span><h2>{{ lesson.quiz.question }}</h2><div class="choices"><button v-for="(choice, index) in lesson.quiz.choices" :key="choice" :class="{ selected: selectedAnswer === index, correct: quizChecked && index === lesson.quiz.answer, wrong: quizChecked && selectedAnswer === index && index !== lesson.quiz.answer }" @click="selectedAnswer = index; quizChecked = false"><i>{{ String.fromCharCode(65 + index) }}</i>{{ choice }}</button></div><button class="check-quiz" :disabled="selectedAnswer === null" @click="checkQuiz">確認答案</button><p v-if="quizChecked" class="explanation"><b>{{ selectedAnswer === lesson.quiz.answer ? '答對了。' : '再想一次。' }}</b>{{ lesson.quiz.explanation }}</p></section>

      <section class="notes-block"><div><span>私人筆記與掌握度</span><h2>留下自己的理解</h2><p class="sync-note">☁️ 內容會同步至資料庫，可在新舊網站與不同裝置繼續使用。</p></div><textarea v-model="notes" :disabled="!loaded || isSaving || !!syncError" placeholder="例如：今天終於理解運算式不加分號會成為回傳值……"></textarea><div class="notes-actions"><label>狀態<select v-model="status" :disabled="!loaded || isSaving || !!syncError"><option value="learning">學習中</option><option value="review">待複習</option><option value="completed">已理解</option></select></label><label>投入分鐘<input v-model.number="minutes" :disabled="!loaded || isSaving || !!syncError" type="number" min="0" step="5"></label><button :disabled="!loaded || isSaving || !!syncError" @click="saveProgress()">{{ isSaving ? '同步中…' : savedFlash ? '✓ 已保存' : '保存筆記' }}</button></div><p v-if="syncError" class="sync-error">⚠️ {{ syncError }}</p></section>

      <footer class="lesson-footer"><NuxtLink v-if="previous" :to="`/admin/law-exam/rust/lesson/${previous.id}`">← {{ previous.title }}</NuxtLink><span v-else></span><button v-if="status !== 'completed'" @click="completeLesson">標記為已理解</button><NuxtLink v-if="next" :to="`/admin/law-exam/rust/lesson/${next.id}`">{{ next.title }} →</NuxtLink><NuxtLink v-else to="/admin/law-exam/rust">完成基礎階段 →</NuxtLink></footer>
    </div>
  </main>
</template>

<style scoped>
.lesson-page{min-height:100vh;background:#f7f5f2;color:#202327;font-family:Inter,'Noto Sans TC',system-ui,sans-serif}.sidebar{position:fixed;inset:0 auto 0 0;width:260px;display:flex;flex-direction:column;background:#191d20;color:white;padding:26px 18px;box-sizing:border-box}.brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-size:30px;font-weight:900}.brand span{font-size:21px;line-height:.8}.brand small{font-size:10px;color:#fdba74;letter-spacing:.1em}.side-progress{margin:34px 5px 20px}.side-progress>span{font-size:12px;color:#a8adb1}.side-progress>b{float:right}.side-progress>i{display:block;clear:both;height:5px;margin-top:9px;border-radius:9px;background:#3e4448;overflow:hidden}.side-progress em{display:block;height:100%;background:var(--stage)}.sidebar nav{display:grid;gap:5px}.sidebar nav a{display:flex;align-items:center;gap:11px;padding:11px;border-radius:8px;color:#bbc0c3;text-decoration:none;font-size:13px;font-weight:700}.sidebar nav a span{font-size:10px;color:#f97316}.sidebar nav a.active{background:#343a3e;color:#fff}.sidebar nav a.done::after{content:'✓';margin-left:auto;color:#86efac}.law-link{margin-top:auto;color:#fdba74;text-decoration:none;font-size:13px}.content{max-width:900px;margin-left:260px;padding:48px clamp(28px,6vw,80px) 80px}.lesson-hero{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:1px solid #d9d4ce;padding-bottom:35px}.lesson-hero p{color:var(--stage);font-weight:900}.lesson-hero h1{font-size:clamp(34px,5vw,56px);margin:7px 0}.lesson-hero>div>span{color:#716b66;font-size:18px}.duration{width:86px;height:86px;border:2px solid var(--stage);border-radius:50%;display:grid;place-content:center;text-align:center;color:#6f665f;font-size:11px;flex:none}.duration strong{display:block;color:var(--stage);font-size:24px}.objectives{margin:35px 0;padding:23px 28px;border-left:5px solid var(--stage);background:#fff}.objectives h2{margin-top:0}.objectives ul{display:grid;gap:8px;padding-left:20px}.chapter{display:grid;grid-template-columns:48px 1fr;gap:18px;margin:55px 0}.chapter-index{font-size:12px;font-weight:900;color:var(--stage);padding-top:8px}.chapter h2{font-size:28px;margin:0 0 13px}.chapter p{font-size:17px;line-height:1.85;color:#4d4c4a}.chapter pre,.solution{white-space:pre-wrap;overflow:auto;border-radius:12px;background:#202428;color:#f6e8d5;padding:20px;font-size:14px;line-height:1.65}.practice-block,.quiz-block,.notes-block{margin:55px 0;border-radius:20px;background:#fff;padding:clamp(20px,4vw,36px);box-shadow:0 12px 34px #382d2310}.block-title{display:flex;justify-content:space-between;gap:20px}.block-title span,.quiz-block>span,.notes-block span{color:var(--stage);font-size:11px;font-weight:900;letter-spacing:.12em}.block-title h2,.quiz-block h2,.notes-block h2{margin:5px 0 8px}.block-title p{color:#716b66}.block-title button,.editor-actions button,.check-quiz,.notes-actions button,.lesson-footer button{border:0;border-radius:8px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer}.editor{border-radius:12px;overflow:hidden;background:#171a1d}.editor-bar{display:flex;align-items:center;gap:6px;padding:10px 14px;background:#2c3135;color:#aeb5ba;font-size:12px}.editor-bar i{width:10px;height:10px;border-radius:50%;background:#ef4444}.editor-bar i:nth-child(2){background:#f59e0b}.editor-bar i:nth-child(3){background:#22c55e}.editor-bar span{margin-left:8px}.editor textarea{display:block;width:100%;min-height:310px;resize:vertical;border:0;outline:0;background:#171a1d;color:#f8ead9;padding:20px;box-sizing:border-box;font:14px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;tab-size:4}.editor-actions{display:flex;gap:9px;margin:12px 0}.editor-actions .run,.check-quiz,.notes-actions button,.lesson-footer button{background:var(--stage);color:#fff}.console{border-radius:10px;background:#fff7ed;color:#9a3412;padding:14px}.console.success{background:#ecfdf5;color:#166534}.console pre{margin:8px 0 0;white-space:pre-wrap}.practice-block details{margin-top:15px;color:#5b554f}.choices{display:grid;gap:9px}.choices button{display:flex;align-items:center;gap:12px;border:2px solid #e3ded8;border-radius:10px;background:#fff;padding:13px;text-align:left;font:inherit;cursor:pointer}.choices button i{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#eee9e3;font-style:normal;font-weight:900}.choices button.selected{border-color:var(--stage)}.choices button.correct{border-color:#16a34a;background:#f0fdf4}.choices button.wrong{border-color:#dc2626;background:#fef2f2}.check-quiz{margin-top:13px}.check-quiz:disabled{opacity:.4}.explanation{padding:14px;border-radius:8px;background:#f4f1ed;line-height:1.6}.explanation b{margin-right:5px}.notes-block textarea{width:100%;min-height:150px;box-sizing:border-box;border:1px solid #d9d2cb;border-radius:10px;padding:14px;font:inherit;line-height:1.6}.notes-actions{display:flex;align-items:end;gap:12px;margin-top:12px;flex-wrap:wrap}.notes-actions label{display:grid;gap:4px;font-size:12px;font-weight:800}.notes-actions select,.notes-actions input{min-height:40px;border:1px solid #cfc7c0;border-radius:7px;padding:7px;background:white;font:inherit}.notes-actions button{margin-left:auto}.lesson-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid #d9d4ce;padding-top:28px}.lesson-footer a{color:var(--stage);font-weight:900;text-decoration:none}@media(max-width:800px){.sidebar{position:static;width:auto;padding:14px}.brand{font-size:24px}.side-progress,.sidebar nav{display:none}.law-link{position:absolute;right:15px;top:24px}.content{margin-left:0;padding:25px 15px 60px}.lesson-hero{align-items:start}.chapter{grid-template-columns:30px 1fr}.block-title{display:block}.lesson-footer{align-items:stretch;flex-direction:column;text-align:center}.lesson-footer span{display:none}.lesson-footer a,.lesson-footer button{padding:12px}}
.sync-note{margin:6px 0 18px;color:#6b625b;font-size:13px}.sync-error{margin:13px 0 0;border-radius:8px;background:#fef2f2;color:#991b1b;padding:11px;font-weight:800}.notes-block textarea:disabled,.notes-actions button:disabled{opacity:.55;cursor:not-allowed}
</style>
