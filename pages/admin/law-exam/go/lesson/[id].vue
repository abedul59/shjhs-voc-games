<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { createDefaultGoProgress, goLessons, goStages } from '~/lib/go-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const route = useRoute();
const lesson = computed(() => goLessons.find(item => item.id === route.params.id));
const lessonIndex = computed(() => goLessons.findIndex(item => item.id === lesson.value?.id));
const previous = computed(() => lessonIndex.value > 0 ? goLessons[lessonIndex.value - 1] : null);
const next = computed(() => lessonIndex.value >= 0 && lessonIndex.value < goLessons.length - 1 ? goLessons[lessonIndex.value + 1] : null);
const stage = computed(() => goStages.find(item => item.id === lesson.value?.stage));
const stageLessons = computed(() => goLessons.filter(item => item.stage === lesson.value?.stage));
const stagePosition = computed(() => stageLessons.value.findIndex(item => item.id === lesson.value?.id) + 1);
const stagePercent = computed(() => stageLessons.value.length ? stagePosition.value / stageLessons.value.length * 100 : 0);
const progress = ref(createDefaultGoProgress());
const notes = ref(''); const status = ref('learning'); const minutes = ref(0); const code = ref('');
const codeResult = ref(null); const selectedAnswer = ref(null); const quizChecked = ref(false); const showSolution = ref(false); const savedFlash = ref(false); const loaded = ref(false);
const { isSaving, syncError, loadProgress: loadCloudProgress, saveProgress: saveCloudProgress } = useGoProgress();

async function loadProgress() {
  loaded.value = false;
  progress.value = await loadCloudProgress();
  const current = progress.value.lessons[lesson.value?.id] || {};
  notes.value = current.notes || ''; status.value = current.status || 'learning'; minutes.value = Number(current.minutes || 0);
  code.value = current.code || lesson.value?.challenge?.starter || '';
  progress.value.lastLesson = lesson.value?.id || progress.value.lastLesson;
  loaded.value = true;
  if (!syncError.value) await saveProgress(false);
}

async function saveProgress(flash = true) {
  if (!lesson.value || !import.meta.client) return;
  progress.value.lessons[lesson.value.id] = { ...progress.value.lessons[lesson.value.id], notes: notes.value, status: status.value, minutes: Math.max(0, Number(minutes.value) || 0), code: code.value, updatedAt: new Date().toISOString() };
  progress.value.lastLesson = lesson.value.id;
  try {
    await saveCloudProgress(progress.value);
    if (flash) { savedFlash.value = true; window.setTimeout(() => { savedFlash.value = false; }, 1600); }
  } catch { /* composable 顯示同步錯誤 */ }
}

async function checkCode() {
  const normalized = code.value.replace(/\s+/g, ' ').trim();
  const missing = lesson.value.challenge.required.filter(token => !normalized.includes(token.replace(/\s+/g, ' ').trim()));
  codeResult.value = missing.length ? { ok: false, text: `還差 ${missing.length} 個關鍵部分。先查看提示，再檢查：${missing[0]}` } : { ok: true, text: lesson.value.challenge.expectedOutput };
  await saveProgress(false);
}
function checkQuiz() { if (selectedAnswer.value !== null) quizChecked.value = true; }
async function completeLesson() { status.value = 'completed'; await saveProgress(); }
watch(() => route.params.id, async () => { codeResult.value = null; selectedAnswer.value = null; quizChecked.value = false; showSolution.value = false; await loadProgress(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
onMounted(async () => { if (!lesson.value) return navigateTo('/admin/law-exam/go'); await loadProgress(); });
</script>

<template>
  <main v-if="lesson" class="lesson-page" :style="{ '--stage': stage?.color || '#0891b2' }">
    <aside class="sidebar">
      <NuxtLink to="/admin/law-exam/go" class="brand"><b>Go</b><span>私人工作台</span></NuxtLink>
      <div class="side-progress"><span>{{ stage?.title }}</span><b>{{ stagePosition }}/{{ stageLessons.length }}</b><i><em :style="{ width: `${stagePercent}%` }"></em></i></div>
      <nav><NuxtLink v-for="item in goLessons" :key="item.id" :to="`/admin/law-exam/go/lesson/${item.id}`" :class="{ active: item.id === lesson.id, done: progress.lessons[item.id]?.status === 'completed' }"><span>{{ String(item.order).padStart(2, '0') }}</span>{{ item.title }}</NuxtLink></nav>
      <NuxtLink to="/admin/law-exam" class="back">← 回司律專區</NuxtLink>
    </aside>
    <div class="content">
      <header class="lesson-hero"><div><p>{{ stage?.icon }} {{ stage?.title }} · 第 {{ lesson.order }} 課</p><h1>{{ lesson.title }}</h1><span>{{ lesson.subtitle }}</span></div><div class="duration">約<strong>{{ lesson.duration }}</strong>分鐘</div></header>
      <section class="objectives"><h2>這一課會學到</h2><ul><li v-for="item in lesson.objectives" :key="item">{{ item }}</li></ul></section>
      <article v-for="(section, index) in lesson.sections" :key="section.title" class="chapter"><div class="chapter-index">{{ String(index + 1).padStart(2, '0') }}</div><div><h2>{{ section.title }}</h2><p>{{ section.body }}</p><pre><code>{{ section.code }}</code></pre></div></article>
      <section class="panel practice"><div class="panel-title"><div><span>實作練習</span><h2>{{ lesson.challenge.title }}</h2><p>{{ lesson.challenge.description }}</p></div><button @click="code = lesson.challenge.starter; codeResult = null">重設程式碼</button></div><div class="editor"><div class="editor-bar"><i></i><i></i><i></i><span>main.go</span></div><textarea v-model="code" spellcheck="false" aria-label="Go 程式碼編輯器"></textarea></div><div class="actions"><button class="primary" @click="checkCode">▶ 檢查程式</button><button @click="showSolution = !showSolution">{{ showSolution ? '隱藏參考答案' : '查看提示與答案' }}</button></div><div v-if="codeResult" class="console" :class="{ success: codeResult.ok }"><b>{{ codeResult.ok ? '✓ 練習通過' : '編譯前檢查' }}</b><pre>{{ codeResult.text }}</pre></div><details open><summary>提示</summary><ol><li v-for="hint in lesson.challenge.hints" :key="hint">{{ hint }}</li></ol></details><pre v-if="showSolution" class="solution"><code>{{ lesson.challenge.solution }}</code></pre></section>
      <section class="panel quiz"><span>觀念確認</span><h2>{{ lesson.quiz.question }}</h2><div class="choices"><button v-for="(choice, index) in lesson.quiz.choices" :key="choice" :class="{ selected: selectedAnswer === index, correct: quizChecked && index === lesson.quiz.answer, wrong: quizChecked && selectedAnswer === index && index !== lesson.quiz.answer }" @click="selectedAnswer = index; quizChecked = false"><i>{{ String.fromCharCode(65 + index) }}</i>{{ choice }}</button></div><button class="primary quiz-check" :disabled="selectedAnswer === null" @click="checkQuiz">確認答案</button><p v-if="quizChecked" class="explanation"><b>{{ selectedAnswer === lesson.quiz.answer ? '答對了。' : '再想一次。' }}</b>{{ lesson.quiz.explanation }}</p></section>
      <section class="panel notes"><div><span>私人筆記與掌握度</span><h2>留下自己的理解</h2><p class="sync-note">☁️ 內容會同步至資料庫，可在新舊網站與不同裝置繼續使用。</p></div><textarea v-model="notes" :disabled="!loaded || isSaving || !!syncError" placeholder="記下今天理解的 Go 觀念……"></textarea><div class="note-actions"><label>狀態<select v-model="status" :disabled="!loaded || isSaving || !!syncError"><option value="learning">學習中</option><option value="review">待複習</option><option value="completed">已理解</option></select></label><label>投入分鐘<input v-model.number="minutes" :disabled="!loaded || isSaving || !!syncError" type="number" min="0" step="5"></label><button class="primary" :disabled="!loaded || isSaving || !!syncError" @click="saveProgress()">{{ isSaving ? '同步中…' : savedFlash ? '✓ 已保存' : '保存筆記' }}</button></div><p v-if="syncError" class="sync-error">⚠️ {{ syncError }}</p></section>
      <footer><NuxtLink v-if="previous" :to="`/admin/law-exam/go/lesson/${previous.id}`">← {{ previous.title }}</NuxtLink><span v-else></span><button v-if="status !== 'completed'" class="primary" @click="completeLesson">標記為已理解</button><NuxtLink v-if="next" :to="`/admin/law-exam/go/lesson/${next.id}`">{{ next.title }} →</NuxtLink><NuxtLink v-else to="/admin/law-exam/go">完成完整學習路線 →</NuxtLink></footer>
    </div>
  </main>
</template>

<style scoped>
.lesson-page{min-height:100vh;background:#f4f9fa;color:#17252d;font-family:Inter,'Noto Sans TC',system-ui,sans-serif}.sidebar{position:fixed;inset:0 auto 0 0;width:270px;display:flex;flex-direction:column;box-sizing:border-box;padding:25px 17px;background:#10252e;color:white}.brand{display:flex;align-items:center;gap:10px;color:white;text-decoration:none}.brand b{font-size:32px;color:#67e8f9}.brand span{font-size:18px;font-weight:900}.side-progress{margin:28px 5px 16px}.side-progress>span{font-size:12px;color:#a8c6cc}.side-progress>b{float:right}.side-progress>i{display:block;clear:both;height:5px;margin-top:8px;border-radius:9px;background:#38505a;overflow:hidden}.side-progress em{display:block;height:100%;background:var(--stage)}.sidebar nav{display:grid;gap:3px;overflow:auto;padding-right:3px}.sidebar nav a{display:flex;align-items:center;gap:9px;padding:8px;border-radius:7px;color:#b9cdd2;text-decoration:none;font-size:12px;font-weight:700}.sidebar nav a span{font-size:9px;color:#67e8f9}.sidebar nav a.active{background:#29444e;color:white}.sidebar nav a.done::after{content:'✓';margin-left:auto;color:#86efac}.back{margin-top:15px;color:#67e8f9;text-decoration:none;font-size:13px}.content{max-width:900px;margin-left:270px;padding:46px clamp(28px,6vw,78px) 80px}.lesson-hero{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:34px;border-bottom:1px solid #cbdcdf}.lesson-hero p{color:var(--stage);font-weight:900}.lesson-hero h1{margin:7px 0;font-size:clamp(34px,5vw,56px)}.lesson-hero>div>span{color:#62757b;font-size:18px}.duration{display:grid;place-content:center;width:86px;height:86px;border:2px solid var(--stage);border-radius:50%;text-align:center;color:#65787d;font-size:11px;flex:none}.duration strong{display:block;color:var(--stage);font-size:24px}.objectives{margin:35px 0;padding:22px 27px;border-left:5px solid var(--stage);background:white}.objectives h2{margin-top:0}.objectives ul{display:grid;gap:8px;padding-left:20px}.chapter{display:grid;grid-template-columns:48px 1fr;gap:18px;margin:55px 0}.chapter-index{padding-top:8px;color:var(--stage);font-size:12px;font-weight:900}.chapter h2{margin:0 0 13px;font-size:28px}.chapter p{color:#465b61;font-size:17px;line-height:1.85}.chapter pre,.solution{overflow:auto;padding:20px;border-radius:12px;background:#15272f;color:#e0f7fa;white-space:pre-wrap;font:14px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}.panel{margin:55px 0;padding:clamp(20px,4vw,36px);border-radius:20px;background:white;box-shadow:0 12px 34px #0833440d}.panel-title{display:flex;justify-content:space-between;gap:20px}.panel span{color:var(--stage);font-size:11px;font-weight:900;letter-spacing:.12em}.panel h2{margin:5px 0 8px}.panel-title p,.sync-note{color:#62757b}.panel button,.primary{padding:10px 14px;border:0;border-radius:8px;font:inherit;font-weight:800;cursor:pointer}.editor{overflow:hidden;border-radius:12px;background:#102027}.editor-bar{display:flex;align-items:center;gap:6px;padding:10px 14px;background:#29404a;color:#adc4ca;font-size:12px}.editor-bar i{width:10px;height:10px;border-radius:50%;background:#ef4444}.editor-bar i:nth-child(2){background:#f59e0b}.editor-bar i:nth-child(3){background:#22c55e}.editor-bar span{margin-left:8px}.editor textarea{display:block;width:100%;min-height:310px;resize:vertical;box-sizing:border-box;padding:20px;border:0;outline:0;background:#102027;color:#e6fafc;font:14px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace}.actions{display:flex;gap:9px;margin:12px 0}.primary{background:var(--stage)!important;color:white}.console{padding:14px;border-radius:10px;background:#fff7ed;color:#9a3412}.console.success{background:#ecfdf5;color:#166534}.console pre{margin:8px 0 0;white-space:pre-wrap}.choices{display:grid;gap:9px}.choices button{display:flex;align-items:center;gap:12px;border:2px solid #dae5e7;background:white;text-align:left}.choices button i{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#e7f1f3;font-style:normal;font-weight:900}.choices button.selected{border-color:var(--stage)}.choices button.correct{border-color:#16a34a;background:#f0fdf4}.choices button.wrong{border-color:#dc2626;background:#fef2f2}.quiz-check{margin-top:13px}.explanation{padding:14px;border-radius:8px;background:#eef5f6;line-height:1.6}.notes>textarea{width:100%;min-height:150px;box-sizing:border-box;padding:14px;border:1px solid #cedcdf;border-radius:10px;font:inherit;line-height:1.6}.note-actions{display:flex;align-items:end;gap:12px;margin-top:12px;flex-wrap:wrap}.note-actions label{display:grid;gap:4px;font-size:12px;font-weight:800}.note-actions select,.note-actions input{min-height:40px;padding:7px;border:1px solid #c5d5d8;border-radius:7px;background:white;font:inherit}.note-actions button{margin-left:auto}.sync-error{padding:11px;border-radius:8px;background:#fef2f2;color:#991b1b;font-weight:800}button:disabled,textarea:disabled{opacity:.5;cursor:not-allowed}footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:28px;border-top:1px solid #cadadd}footer a{color:var(--stage);font-weight:900;text-decoration:none}@media(max-width:800px){.sidebar{position:static;width:auto;padding:14px}.brand b{font-size:25px}.side-progress,.sidebar nav{display:none}.back{position:absolute;right:15px;top:24px}.content{margin-left:0;padding:25px 15px 60px}.lesson-hero{align-items:start}.chapter{grid-template-columns:30px 1fr}.panel-title{display:block}footer{align-items:stretch;flex-direction:column;text-align:center}footer span{display:none}footer a,footer button{padding:12px}}
</style>
