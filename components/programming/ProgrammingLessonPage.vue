<script setup>
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps({ course: { type: Object, required: true }, progressApi: { type: Object, required: true } });
const route = useRoute();
const lesson = computed(() => props.course.lessons.find(item => item.id === route.params.id));
const lessonIndex = computed(() => props.course.lessons.findIndex(item => item.id === lesson.value?.id));
const previous = computed(() => lessonIndex.value > 0 ? props.course.lessons[lessonIndex.value - 1] : null);
const next = computed(() => lessonIndex.value >= 0 && lessonIndex.value < props.course.lessons.length - 1 ? props.course.lessons[lessonIndex.value + 1] : null);
const stage = computed(() => props.course.stages.find(item => item.id === lesson.value?.stage));
const stageLessons = computed(() => props.course.lessons.filter(item => item.stage === lesson.value?.stage));
const stagePosition = computed(() => stageLessons.value.findIndex(item => item.id === lesson.value?.id) + 1);
const stagePercent = computed(() => stageLessons.value.length ? stagePosition.value / stageLessons.value.length * 100 : 0);
const progress = ref(props.course.createDefault());
const notes = ref(''); const status = ref('learning'); const minutes = ref(0); const code = ref('');
const codeResult = ref(null); const selectedAnswer = ref(null); const quizChecked = ref(false); const showSolution = ref(false); const savedFlash = ref(false); const loaded = ref(false);
const { isSaving, syncError, loadProgress: loadCloudProgress, saveProgress: saveCloudProgress } = props.progressApi;

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
onMounted(async () => { if (!lesson.value) return navigateTo(props.course.base); await loadProgress(); });
</script>

<template>
  <main v-if="lesson" class="lesson-page" :style="{ '--stage': stage?.color || course.accent, '--accent': course.accent }">
    <aside class="sidebar"><NuxtLink :to="course.base" class="brand"><b>{{ course.logo }}</b><span>{{ course.shortTitle }}<br><small>私人工作台</small></span></NuxtLink><div class="side-progress"><span>{{ stage?.title }}</span><b>{{ stagePosition }}/{{ stageLessons.length }}</b><i><em :style="{ width: `${stagePercent}%` }"></em></i></div><nav><NuxtLink v-for="item in course.lessons" :key="item.id" :to="`${course.base}/lesson/${item.id}`" :class="{ active: item.id === lesson.id, done: progress.lessons[item.id]?.status === 'completed' }"><span>{{ String(item.order).padStart(2, '0') }}</span>{{ item.title }}</NuxtLink></nav><NuxtLink to="/admin/law-exam" class="back">← 回司律專區</NuxtLink></aside>
    <div class="content"><header class="lesson-hero"><div><p>{{ stage?.icon }} {{ stage?.title }} · 第 {{ lesson.order }} 課</p><h1>{{ lesson.title }}</h1><span>{{ lesson.subtitle }}</span></div><div class="duration">約<strong>{{ lesson.duration }}</strong>分鐘</div></header>
      <section class="objectives"><h2>這一課會學到</h2><ul><li v-for="item in lesson.objectives" :key="item">{{ item }}</li></ul></section>
      <article v-for="(section, index) in lesson.sections" :key="section.title" class="chapter"><div class="chapter-index">{{ String(index + 1).padStart(2, '0') }}</div><div><h2>{{ section.title }}</h2><p>{{ section.body }}</p><pre><code>{{ section.code }}</code></pre></div></article>
      <section class="panel"><div class="panel-title"><div><span>實作練習</span><h2>{{ lesson.challenge.title }}</h2><p>{{ lesson.challenge.description }}</p></div><button @click="code = lesson.challenge.starter; codeResult = null">重設程式碼</button></div><div class="editor"><div class="editor-bar"><i></i><i></i><i></i><span>{{ course.editorLabel }}</span></div><textarea v-model="code" spellcheck="false"></textarea></div><div class="actions"><button class="primary" @click="checkCode">▶ 檢查程式</button><button @click="showSolution = !showSolution">{{ showSolution ? '隱藏參考答案' : '查看提示與答案' }}</button></div><div v-if="codeResult" class="console" :class="{ success: codeResult.ok }"><b>{{ codeResult.ok ? '✓ 練習通過' : '編譯前檢查' }}</b><pre>{{ codeResult.text }}</pre></div><details open><summary>提示</summary><ol><li v-for="hint in lesson.challenge.hints" :key="hint">{{ hint }}</li></ol></details><pre v-if="showSolution" class="solution"><code>{{ lesson.challenge.solution }}</code></pre></section>
      <section class="panel quiz"><span>觀念確認</span><h2>{{ lesson.quiz.question }}</h2><div class="choices"><button v-for="(choice, index) in lesson.quiz.choices" :key="choice" :class="{ selected: selectedAnswer === index, correct: quizChecked && index === lesson.quiz.answer, wrong: quizChecked && selectedAnswer === index && index !== lesson.quiz.answer }" @click="selectedAnswer = index; quizChecked = false"><i>{{ String.fromCharCode(65 + index) }}</i>{{ choice }}</button></div><button class="primary check" :disabled="selectedAnswer === null" @click="checkQuiz">確認答案</button><p v-if="quizChecked" class="explanation"><b>{{ selectedAnswer === lesson.quiz.answer ? '答對了。' : '再想一次。' }}</b>{{ lesson.quiz.explanation }}</p></section>
      <section class="panel notes"><div><span>私人筆記與掌握度</span><h2>留下自己的理解</h2><p>☁️ 內容會同步至資料庫，可跨裝置繼續使用。</p></div><textarea v-model="notes" :disabled="!loaded || isSaving || !!syncError" :placeholder="course.notePlaceholder"></textarea><div class="note-actions"><label>狀態<select v-model="status" :disabled="!loaded || isSaving || !!syncError"><option value="learning">學習中</option><option value="review">待複習</option><option value="completed">已理解</option></select></label><label>投入分鐘<input v-model.number="minutes" :disabled="!loaded || isSaving || !!syncError" type="number" min="0" step="5"></label><button class="primary" :disabled="!loaded || isSaving || !!syncError" @click="saveProgress()">{{ isSaving ? '同步中…' : savedFlash ? '✓ 已保存' : '保存筆記' }}</button></div><p v-if="syncError" class="sync-error">⚠️ {{ syncError }}</p></section>
      <footer><NuxtLink v-if="previous" :to="`${course.base}/lesson/${previous.id}`">← {{ previous.title }}</NuxtLink><span v-else></span><button v-if="status !== 'completed'" class="primary" @click="completeLesson">標記為已理解</button><NuxtLink v-if="next" :to="`${course.base}/lesson/${next.id}`">{{ next.title }} →</NuxtLink><NuxtLink v-else :to="course.base">完成完整學習路線 →</NuxtLink></footer>
    </div>
  </main>
</template>

<style scoped>
.lesson-page{min-height:100vh;background:#f8f8fb;color:#20222c;font-family:Inter,'Noto Sans TC',system-ui,sans-serif}.sidebar{position:fixed;inset:0 auto 0 0;width:275px;display:flex;flex-direction:column;box-sizing:border-box;padding:24px 17px;background:#111827;color:#fff}.brand{display:flex;align-items:center;gap:11px;color:#fff;text-decoration:none}.brand>b{display:grid;place-items:center;width:46px;height:46px;border:2px solid var(--accent);border-radius:13px;color:var(--accent);font-size:27px}.brand span{font-size:18px;font-weight:900}.brand small{color:#9ca3af}.side-progress{margin:25px 0 15px;padding:14px;border-radius:12px;background:#ffffff0d}.side-progress span{color:#cbd5e1;font-size:12px}.side-progress>b{float:right}.side-progress i{display:block;clear:both;height:5px;margin-top:10px;border-radius:99px;background:#ffffff17;overflow:hidden}.side-progress em{display:block;height:100%;background:var(--stage)}nav{flex:1;overflow:auto;display:grid;gap:3px}nav a{display:flex;gap:9px;padding:9px;border-radius:8px;color:#cbd5e1;text-decoration:none;font-size:12px}nav a span{color:#6b7280;font-weight:900}nav a.active{background:var(--stage);color:#fff;font-weight:900}nav a.done:not(.active){color:#86efac}.back{margin-top:15px;color:#9ca3af;text-decoration:none;font-weight:700}.content{max-width:970px;margin-left:275px;padding:40px clamp(25px,5vw,72px) 70px}.lesson-hero{display:flex;justify-content:space-between;gap:30px;padding:35px;border-radius:22px;background:#fff;border-top:7px solid var(--stage);box-shadow:0 10px 36px #11182710}.lesson-hero p,.panel span{margin:0;color:var(--stage);font-weight:900}.lesson-hero h1{margin:7px 0;font-size:clamp(34px,5vw,55px)}.lesson-hero>div>span{color:#6b7280;font-size:18px}.duration{text-align:center;color:#6b7280}.duration strong{display:block;color:var(--stage);font-size:34px}.objectives,.panel{margin-top:25px;padding:27px;border:1px solid #e1e3e9;border-radius:18px;background:#fff}.objectives h2,.panel h2{margin-top:0}.objectives ul{display:grid;gap:10px;padding-left:24px}.chapter{display:grid;grid-template-columns:45px 1fr;gap:18px;padding:36px 0;border-bottom:1px solid #e2e4ea}.chapter-index{color:var(--stage);font-weight:900}.chapter h2{margin-top:0}.chapter p{color:#555b69;line-height:1.8}.chapter pre,.solution{padding:20px;border-radius:13px;background:#111827;color:#e5e7eb;overflow:auto;line-height:1.65}.panel-title{display:flex;justify-content:space-between;gap:20px}.panel button{padding:10px 14px;border:1px solid #d1d5db;border-radius:9px;background:#fff;cursor:pointer;font-weight:800}.editor{margin-top:18px;border-radius:13px;background:#0d1117;overflow:hidden}.editor-bar{padding:10px 14px;background:#1f2937;color:#9ca3af;font-size:12px}.editor-bar i{display:inline-block;width:10px;height:10px;margin-right:6px;border-radius:50%;background:#ef4444}.editor-bar i:nth-child(2){background:#eab308}.editor-bar i:nth-child(3){background:#22c55e}.editor-bar span{margin-left:10px;color:#9ca3af}.editor textarea{width:100%;min-height:260px;box-sizing:border-box;padding:18px;border:0;resize:vertical;background:#0d1117;color:#d1fae5;font:14px/1.65 ui-monospace,monospace}.actions,.note-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.primary{border-color:var(--stage)!important;background:var(--stage)!important;color:#fff!important}.console{margin-top:14px;padding:15px;border-radius:10px;background:#fff7ed;color:#9a3412}.console.success{background:#ecfdf5;color:#047857}.console pre{white-space:pre-wrap}.panel details{margin-top:16px}.solution{margin-top:14px}.choices{display:grid;gap:9px}.choices button{text-align:left}.choices button.selected{border-color:var(--stage)}.choices button.correct{background:#dcfce7;border-color:#22c55e}.choices button.wrong{background:#fee2e2;border-color:#ef4444}.choices i{display:inline-grid;place-items:center;width:25px;height:25px;margin-right:9px;border-radius:50%;background:#eef0f4;font-style:normal}.check{margin-top:14px}.explanation{line-height:1.7}.notes>textarea{width:100%;min-height:130px;box-sizing:border-box;padding:14px;border:1px solid #d1d5db;border-radius:10px}.note-actions label{display:flex;align-items:center;gap:7px}.note-actions select,.note-actions input{padding:8px;border:1px solid #d1d5db;border-radius:7px}.sync-error{color:#991b1b}footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-top:30px}footer a{color:var(--stage);text-decoration:none;font-weight:800}footer a:last-child{text-align:right}@media(max-width:900px){.sidebar{position:static;width:auto;max-height:330px}.content{margin-left:0;padding:20px}.lesson-page{display:block}.lesson-hero{padding:25px}.panel{padding:20px}}@media(max-width:520px){.lesson-hero{display:block}.duration{text-align:left;margin-top:15px}.panel-title{display:block}footer{grid-template-columns:1fr}.chapter{grid-template-columns:1fr}.chapter-index{display:none}}
</style>
