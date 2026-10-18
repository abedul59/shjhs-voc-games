<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { primePrivateLanguageSpeech, speakPrivateLanguage } from '~/utils/privateLanguageSpeech';

const props = defineProps({ course: { type: Object, required: true }, progressApi: { type: Object, required: true } });
const route = useRoute();
const lesson = computed(() => props.course.lessons.find(item => item.id === route.params.id));
const index = computed(() => props.course.lessons.findIndex(item => item.id === lesson.value?.id));
const previous = computed(() => index.value > 0 ? props.course.lessons[index.value - 1] : null);
const next = computed(() => index.value >= 0 && index.value < props.course.lessons.length - 1 ? props.course.lessons[index.value + 1] : null);
const stage = computed(() => props.course.stages.find(item => item.id === lesson.value?.stage));
const progress = ref(props.course.createDefault());
const notes = ref(''); const answer = ref(''); const status = ref('learning'); const minutes = ref(0);
const selected = ref(null); const checked = ref(false); const showModel = ref(false); const saved = ref(false); const loaded = ref(false); const speechError = ref('');
const { isSaving, syncError, loadProgress: loadCloudProgress, saveProgress: saveCloudProgress } = props.progressApi;

async function speak(text, rate = 0.85) {
  speechError.value = '';
  const result = await speakPrivateLanguage(text, props.course.speech, rate);
  if (!result.ok && result.reason !== 'empty') speechError.value = result.reason === 'missing-language-voice'
    ? `這台裝置尚未安裝${props.course.name}語音，請先在 macOS「系統設定 → 輔助使用 → 朗讀內容」新增語音。`
    : `${props.course.name}語音引擎載入失敗，請重新整理後再試。`;
}
async function loadProgress() {
  loaded.value = false; progress.value = await loadCloudProgress();
  const current = progress.value.lessons[lesson.value?.id] || {};
  notes.value = current.notes || ''; answer.value = current.answer || ''; status.value = current.status || 'learning'; minutes.value = Number(current.minutes || 0);
  progress.value.lastLesson = lesson.value?.id || progress.value.lastLesson; loaded.value = true;
}
async function saveProgress(flash = true) {
  if (!lesson.value || !import.meta.client) return;
  progress.value.lessons[lesson.value.id] = { ...progress.value.lessons[lesson.value.id], notes: notes.value, answer: answer.value, status: status.value, minutes: Math.max(0, Number(minutes.value) || 0), updatedAt: new Date().toISOString() };
  progress.value.lastLesson = lesson.value.id;
  try { await saveCloudProgress(progress.value); if (flash) { saved.value = true; window.setTimeout(() => { saved.value = false; }, 1600); } } catch { /* composable 顯示錯誤 */ }
}
async function complete() { status.value = 'completed'; await saveProgress(); }
watch(() => route.params.id, async () => { selected.value = null; checked.value = false; showModel.value = false; await loadProgress(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
onMounted(async () => { primePrivateLanguageSpeech(props.course.speech); if (!lesson.value) return navigateTo(props.course.base); await loadProgress(); });
</script>

<template>
  <main v-if="lesson" class="language-page" :style="{ '--accent': stage?.color || course.accent, '--secondary': course.secondary }">
    <aside><NuxtLink :to="course.base" class="brand"><b>{{ course.logo }}</b><span>{{ course.name }}<br><small>私人學習專區</small></span></NuxtLink><NuxtLink :to="`${course.base}/games`" class="games-link">🎮 {{ course.name }}單字遊戲</NuxtLink><nav><NuxtLink v-for="item in course.lessons" :key="item.id" :to="`${course.base}/lesson/${item.id}`" :class="{ active: item.id === lesson.id, done: progress.lessons[item.id]?.status === 'completed' }"><span>{{ String(item.order).padStart(3, '0') }}</span>{{ item.title }}</NuxtLink></nav><NuxtLink to="/admin/law-exam" class="back">← 回司律專區</NuxtLink></aside>
    <div class="content">
      <p v-if="speechError" class="speech-error">⚠️ {{ speechError }}</p>
      <header><div><p>{{ stage?.icon }} {{ lesson.level }} · 第 {{ lesson.order }} 課</p><h1>{{ lesson.title }}</h1><span>{{ lesson.subtitle }}</span></div><button @click="speak(lesson.sections[0].body)">🔊 聆聽核心語料</button></header>
      <section class="objectives"><h2>本課目標</h2><ul><li v-for="item in lesson.objectives" :key="item">{{ item }}</li></ul></section>
      <section class="vocabulary"><div class="section-title"><div><span>VOCABULARY</span><h2>本課核心詞彙</h2></div><NuxtLink :to="`${course.base}/games?level=${lesson.level}`">用遊戲複習 →</NuxtLink></div><div class="word-grid"><button v-for="word in lesson.vocabulary" :key="word.id" @click="speak(word.term)"><strong>{{ word.term }}</strong><span>{{ word.zh }}</span><i>🔊</i></button></div></section>
      <article v-for="(section, sectionIndex) in lesson.sections" :key="section.title" class="chapter"><div>{{ String(sectionIndex + 1).padStart(2, '0') }}</div><section><h2>{{ section.title }}</h2><p class="target" :class="{ dialogue: sectionIndex === 2 }">{{ section.body }}</p><p>{{ section.note }}</p><button v-if="sectionIndex === 0 || sectionIndex === 2" @click="speak(section.body)">🔊 朗讀</button></section></article>
      <section class="panel practice"><span>PRODUCTION</span><h2>本課輸出練習</h2><p>{{ lesson.practice.prompt }}</p><div class="required"><b>挑戰詞彙：</b><em v-for="word in lesson.practice.required" :key="word">{{ word }}</em></div><textarea v-model="answer" :placeholder="`在這裡用${course.name}作答……`"></textarea><div class="actions"><button @click="showModel = !showModel">{{ showModel ? '隱藏參考句' : '查看參考句' }}</button><button @click="speak(answer)">🔊 朗讀我的答案</button></div><p v-if="showModel" class="model">參考句：{{ lesson.practice.model }}</p></section>
      <section class="panel quiz"><span>COMPREHENSION</span><h2>{{ lesson.quiz.question }}</h2><div class="choices"><button v-for="(choice, choiceIndex) in lesson.quiz.choices" :key="choice" :class="{ selected: selected === choiceIndex, correct: checked && choiceIndex === lesson.quiz.answer, wrong: checked && selected === choiceIndex && choiceIndex !== lesson.quiz.answer }" @click="selected = choiceIndex; checked = false">{{ String.fromCharCode(65 + choiceIndex) }}. {{ choice }}</button></div><button class="primary" :disabled="selected === null" @click="checked = true">確認答案</button><p v-if="checked"><b>{{ selected === lesson.quiz.answer ? '答對了。' : '請重新判斷。' }}</b> {{ lesson.quiz.explanation }}</p></section>
      <section class="panel notes"><span>MY NOTEBOOK</span><h2>私人筆記與學習紀錄</h2><textarea v-model="notes" :disabled="!loaded || isSaving || !!syncError" placeholder="記下文法、發音、句型或文化觀察……"></textarea><div class="note-actions"><label>狀態<select v-model="status"><option value="learning">學習中</option><option value="review">待複習</option><option value="completed">已掌握</option></select></label><label>分鐘<input v-model.number="minutes" type="number" min="0" step="5"></label><button class="primary" :disabled="!loaded || isSaving || !!syncError" @click="saveProgress()">{{ isSaving ? '同步中…' : saved ? '✓ 已保存' : '保存至資料庫' }}</button></div><p v-if="syncError" class="error">⚠️ {{ syncError }}</p></section>
      <footer><NuxtLink v-if="previous" :to="`${course.base}/lesson/${previous.id}`">← {{ previous.title }}</NuxtLink><span v-else></span><button v-if="status !== 'completed'" class="primary" @click="complete">標記為已掌握</button><NuxtLink v-if="next" :to="`${course.base}/lesson/${next.id}`">{{ next.title }} →</NuxtLink><NuxtLink v-else :to="course.base">完成課程 →</NuxtLink></footer>
    </div>
  </main>
</template>

<style scoped>
.language-page{min-height:100vh;background:#fffaf2;color:#27231d;font-family:Inter,'Noto Sans TC',system-ui,sans-serif}.language-page>aside{position:fixed;inset:0 auto 0 0;width:280px;display:flex;flex-direction:column;box-sizing:border-box;padding:22px 16px;background:#201a17;color:#fff}.brand{display:flex;align-items:center;gap:12px;color:#fff;text-decoration:none}.brand b{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--accent);color:#fff;font-size:20px}.brand span{font-weight:900}.brand small{color:#d6d3d1}.games-link{margin:20px 0 12px;padding:12px;border-radius:10px;background:var(--secondary);color:#fff;text-align:center;text-decoration:none;font-weight:900}nav{flex:1;display:grid;gap:3px;overflow:auto}nav a{display:flex;gap:9px;padding:8px;border-radius:7px;color:#d6d3d1;text-decoration:none;font-size:12px}nav a span{color:#78716c;font-weight:900}nav a.active{background:var(--accent);color:#fff;font-weight:900}nav a.done:not(.active){color:#86efac}.back{margin-top:12px;color:#a8a29e;text-decoration:none}.content{max-width:980px;margin-left:280px;padding:38px clamp(24px,5vw,70px) 70px}.speech-error{padding:12px;border:1px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#92400e;font-weight:800}.content>header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:34px;border-radius:22px;background:linear-gradient(135deg,var(--secondary),var(--accent));color:#fff}.content>header p,.panel>span,.section-title span{color:#fde68a;font-weight:900;letter-spacing:.1em}.content>header h1{margin:7px 0;font-size:clamp(34px,5vw,54px)}button{padding:10px 13px;border:1px solid #d6d3d1;border-radius:9px;background:#fff;cursor:pointer;font-weight:800}.objectives,.vocabulary,.panel{margin-top:24px;padding:25px;border:1px solid #eadfce;border-radius:18px;background:#fff}.objectives ul{line-height:1.9}.section-title{display:flex;justify-content:space-between;align-items:end}.section-title h2{margin:4px 0}.section-title a{color:var(--secondary);font-weight:900;text-decoration:none}.word-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:17px}.word-grid button{display:grid;grid-template-columns:1fr auto;text-align:left}.word-grid strong{font-size:17px;color:var(--secondary)}.word-grid span{grid-row:2;color:#78716c}.word-grid i{grid-row:1/3;grid-column:2;align-self:center;font-style:normal}.chapter{display:grid;grid-template-columns:44px 1fr;gap:18px;padding:34px 0;border-bottom:1px solid #e7ded2}.chapter>div{color:var(--accent);font-weight:900}.chapter h2{margin-top:0}.chapter p{line-height:1.85;color:#57534e}.chapter .target{padding:18px;border-left:5px solid var(--accent);border-radius:8px;background:#fff;color:#292524;font-size:20px;white-space:pre-line}.required{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.required em{padding:4px 9px;border-radius:99px;background:#fef3c7;color:#713f12;font-style:normal}.panel textarea{width:100%;min-height:130px;box-sizing:border-box;padding:14px;border:1px solid #d6d3d1;border-radius:10px;font-size:16px}.actions,.note-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.model{padding:12px;border-radius:9px;background:#fef3c7}.choices{display:grid;gap:8px;margin:14px 0}.choices button{text-align:left}.choices .selected{border-color:var(--accent)}.choices .correct{background:#dcfce7;border-color:#16a34a}.choices .wrong{background:#fee2e2;border-color:#dc2626}.primary{border-color:var(--accent)!important;background:var(--accent)!important;color:#fff!important}.note-actions label{display:flex;align-items:center;gap:6px}.note-actions select,.note-actions input{padding:8px;border:1px solid #d6d3d1;border-radius:7px}.error{color:#991b1b}footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-top:30px}footer a{color:var(--secondary);text-decoration:none;font-weight:900}footer a:last-child{text-align:right}@media(max-width:900px){.language-page>aside{position:static;width:auto;max-height:340px}.content{margin-left:0;padding:18px}.word-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.content>header,.section-title{display:block}.word-grid{grid-template-columns:1fr}.chapter{grid-template-columns:1fr}.chapter>div{display:none}footer{grid-template-columns:1fr}}
</style>
