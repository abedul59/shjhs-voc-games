<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const allVocabulary = ref([]);
const selectedLessonKeys = ref([]);
const filterVersion = ref('');
const filterVolume = ref('');
const isLoading = ref(true);
const isGenerating = ref(false);
const exporting = ref('');
const message = ref('');
const previewMode = ref('question');
const showEditor = ref(true);
const questionPreview = ref(null);
const answerPreview = ref(null);

const metadata = ref({
  schoolName: '台南市立新化國民中學', schoolYear: '115', semester: '1', grade: '7',
  examTitle: '英語單字會考', fileName: '115學年度第1學期7年級英語單字會考'
});
const writingQuestions = ref([]);
const matchingOptions = ref([]);
const matchingQuestions = ref([]);
const optionCodes = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬'];

const lessonKey = item => `${item.version}|${item.volume}|${item.unit}`;
const versions = computed(() => [...new Set(allVocabulary.value.map(item => item.version).filter(Boolean))].sort());
const volumes = computed(() => [...new Set(allVocabulary.value.filter(item => !filterVersion.value || item.version === filterVersion.value).map(item => item.volume).filter(Boolean))].sort());
const lessons = computed(() => {
  const map = new Map();
  for (const item of allVocabulary.value) {
    if (!item.version || !item.unit) continue;
    const key = lessonKey(item);
    if (!map.has(key)) map.set(key, { key, version: item.version, volume: item.volume || '', unit: item.unit, count: 0 });
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => `${a.version}|${a.volume}|${a.unit}`.localeCompare(`${b.version}|${b.volume}|${b.unit}`, 'zh-Hant'));
});
const filteredLessons = computed(() => lessons.value.filter(item =>
  (!filterVersion.value || item.version === filterVersion.value) && (!filterVolume.value || item.volume === filterVolume.value)
));
const selectedWordCount = computed(() => allVocabulary.value.filter(item => selectedLessonKeys.value.includes(lessonKey(item))).length);
const hasExam = computed(() => writingQuestions.value.length === 25 && matchingQuestions.value.length === 25 && matchingOptions.value.length === 35);
const outputData = () => ({
  metadata: { ...metadata.value },
  writingQuestions: writingQuestions.value.map(item => ({ ...item })),
  matchingOptions: matchingOptions.value.map(item => ({ ...item })),
  matchingQuestions: matchingQuestions.value.map(item => ({ ...item }))
});

const shuffle = list => {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
};

const setFilteredLessons = selected => {
  const filteredKeys = new Set(filteredLessons.value.map(item => item.key));
  selectedLessonKeys.value = selected
    ? [...new Set([...selectedLessonKeys.value, ...filteredKeys])]
    : selectedLessonKeys.value.filter(key => !filteredKeys.has(key));
};

const generateExam = async () => {
  message.value = '';
  const chosen = allVocabulary.value.filter(item => selectedLessonKeys.value.includes(lessonKey(item)) && item.en_us?.trim() && item.zh_tw?.trim());
  const unique = [];
  const englishSeen = new Set();
  const meaningSeen = new Set();
  for (const item of chosen) {
    const english = item.en_us.trim();
    const meaning = item.zh_tw.trim();
    const englishKey = english.toLowerCase();
    if (englishSeen.has(englishKey) || meaningSeen.has(meaning)) continue;
    englishSeen.add(englishKey); meaningSeen.add(meaning);
    unique.push({ id: item.id, en: english, zh: meaning });
  }
  if (unique.length < 50) {
    message.value = `所選範圍只有 ${unique.length} 組不重複的有效單字，至少需要 50 組。請再多選幾課。`;
    return;
  }
  isGenerating.value = true;
  const selected = shuffle(unique).slice(0, 50);
  const writing = selected.slice(0, 25).map((item, index) => ({ ...item, id: `w-${index}-${item.id}` }));
  const matching = selected.slice(25).map((item, index) => ({ ...item, id: `m-${index}-${item.id}`, answerCode: '' }));
  const targetMeanings = new Set(matching.map(item => item.zh));
  const distractors = shuffle(unique.filter(item => !targetMeanings.has(item.zh))).slice(0, 10);
  const options = shuffle([
    ...matching.map(item => ({ meaning: item.zh, source: 'answer' })),
    ...distractors.map(item => ({ meaning: item.zh, source: 'distractor' }))
  ]).map((item, index) => ({ ...item, code: optionCodes[index] }));
  const codeByMeaning = new Map(options.map(option => [option.meaning, option.code]));
  writingQuestions.value = writing;
  matchingOptions.value = options;
  matchingQuestions.value = matching.map(item => ({ ...item, answerCode: codeByMeaning.get(item.zh) || '' }));
  previewMode.value = 'question';
  isGenerating.value = false;
  await nextTick();
  message.value = '已依所選課次隨機產生 50 題。所有題目、答案與選項仍可在下方編輯。';
};

const exportWord = async answerMode => {
  if (!hasExam.value) return;
  exporting.value = answerMode ? 'answer-word' : 'question-word';
  try {
    const { downloadVocabExamWord } = await import('~/lib/vocab-exam-export.client');
    await downloadVocabExamWord(outputData(), answerMode);
  } catch (error) {
    message.value = `Word 產生失敗：${error.message}`;
  } finally { exporting.value = ''; }
};

const exportPdf = async answerMode => {
  if (!hasExam.value) return;
  exporting.value = answerMode ? 'answer-pdf' : 'question-pdf';
  const previousPreviewMode = previewMode.value;
  try {
    previewMode.value = answerMode ? 'answer' : 'question';
    await nextTick();
    const component = answerMode ? answerPreview.value : questionPreview.value;
    const { downloadVocabExamPdf } = await import('~/lib/vocab-exam-export.client');
    await downloadVocabExamPdf(component.getElement(), outputData(), answerMode);
  } catch (error) {
    message.value = `PDF 產生失敗：${error.message}`;
  } finally {
    previewMode.value = previousPreviewMode;
    exporting.value = '';
  }
};

onMounted(async () => {
  const { data, error } = await supabase.from('vocabularies').select('id,version,volume,unit,en_us,zh_tw').order('id').limit(10000);
  if (error) message.value = `單字資料讀取失敗：${error.message}`;
  else allVocabulary.value = data || [];
  filterVersion.value = versions.value[0] || '';
  isLoading.value = false;
});
</script>

<template>
  <main class="generator-page">
    <header class="page-header"><div><h1>📝 單字會考出題器</h1><p>依課次多選單字範圍，產生與參考檔相同的 50 題 A4 題目卷及答案卷。</p></div><NuxtLink to="/admin">← 返回後台</NuxtLink></header>
    <p v-if="message" class="message">{{ message }}</p>

    <section class="panel metadata-panel">
      <h2>一、標題與檔名</h2>
      <div class="form-grid"><label>學校名稱<input v-model="metadata.schoolName"></label><label>學年度<input v-model="metadata.schoolYear"></label><label>學期<input v-model="metadata.semester"></label><label>年級<input v-model="metadata.grade"></label><label>考卷名稱<input v-model="metadata.examTitle"></label><label>下載檔名<input v-model="metadata.fileName"></label></div>
    </section>

    <section class="panel lesson-panel">
      <div class="section-heading"><div><h2>二、選擇單字範圍</h2><p>可跨版本、冊別多選數課。目前選取約 {{ selectedWordCount }} 筆原始單字。</p></div><div class="filter-actions"><button @click="setFilteredLessons(true)">☑ 全選目前篩選</button><button @click="setFilteredLessons(false)">☐ 取消目前篩選</button></div></div>
      <div class="filters"><label>版本<select v-model="filterVersion" @change="filterVolume = ''"><option value="">全部版本</option><option v-for="version in versions" :key="version">{{ version }}</option></select></label><label>冊別<select v-model="filterVolume"><option value="">全部冊別</option><option v-for="volume in volumes" :key="volume">{{ volume }}</option></select></label></div>
      <p v-if="isLoading">讀取單字資料中…</p>
      <div v-else class="lesson-grid"><label v-for="lesson in filteredLessons" :key="lesson.key" :class="{ selected: selectedLessonKeys.includes(lesson.key) }"><input v-model="selectedLessonKeys" type="checkbox" :value="lesson.key"><span><b>{{ lesson.version }} {{ lesson.volume }} {{ lesson.unit }}</b><small>{{ lesson.count }} 個單字</small></span></label></div>
      <button class="generate-btn" :disabled="isGenerating || selectedLessonKeys.length === 0" @click="generateExam">{{ isGenerating ? '產生中…' : hasExam ? '🎲 重新隨機出題' : '🎲 產生 50 題考卷' }}</button>
    </section>

    <template v-if="hasExam">
      <section class="panel export-panel"><div><h2>三、預覽與下載</h2><div class="preview-tabs"><button :class="{ active: previewMode === 'question' }" @click="previewMode = 'question'">題目卷預覽</button><button :class="{ active: previewMode === 'answer' }" @click="previewMode = 'answer'">答案卷預覽</button></div></div><div class="download-grid"><button :disabled="Boolean(exporting)" @click="exportWord(false)">📘 {{ exporting === 'question-word' ? '產生中…' : '題目卷 Word' }}</button><button :disabled="Boolean(exporting)" @click="exportPdf(false)">📕 {{ exporting === 'question-pdf' ? '產生中…' : '題目卷 PDF' }}</button><button :disabled="Boolean(exporting)" @click="exportWord(true)">✅ {{ exporting === 'answer-word' ? '產生中…' : '答案卷 Word' }}</button><button :disabled="Boolean(exporting)" @click="exportPdf(true)">📄 {{ exporting === 'answer-pdf' ? '產生中…' : '答案卷 PDF' }}</button></div></section>

      <section class="preview-panel"><div class="preview-scroll"><AdminVocabExamSheet v-show="previewMode === 'question'" ref="questionPreview" :metadata="metadata" :writing-questions="writingQuestions" :matching-options="matchingOptions" :matching-questions="matchingQuestions" /><AdminVocabExamSheet v-show="previewMode === 'answer'" ref="answerPreview" :metadata="metadata" :writing-questions="writingQuestions" :matching-options="matchingOptions" :matching-questions="matchingQuestions" answer-mode /></div></section>

      <section class="panel editor-panel">
        <div class="section-heading"><div><h2>四、編輯考卷內容</h2><p>修改後預覽與四種下載檔會同步更新。</p></div><button @click="showEditor = !showEditor">{{ showEditor ? '收合編輯區' : '展開編輯區' }}</button></div>
        <div v-if="showEditor" class="edit-content">
          <h3>1～25 題：看中文寫英文</h3><div class="edit-table"><div class="edit-row edit-header"><b>題號</b><b>中文題目</b><b>正確英文</b></div><div v-for="(item,index) in writingQuestions" :key="item.id" class="edit-row"><b>{{ index + 1 }}</b><input v-model="item.zh"><input v-model="item.en"></div></div>
          <h3>配合題選項</h3><div class="option-editor"><label v-for="option in matchingOptions" :key="option.code"><b>{{ option.code }}</b><input v-model="option.meaning"></label></div>
          <h3>26～50 題：看英文選中文</h3><div class="edit-table"><div class="edit-row matching-edit edit-header"><b>題號</b><b>英文題目</b><b>答案代號</b></div><div v-for="(item,index) in matchingQuestions" :key="item.id" class="edit-row matching-edit"><b>{{ index + 26 }}</b><input v-model="item.en"><select v-model="item.answerCode"><option v-for="option in matchingOptions" :key="option.code" :value="option.code">{{ option.code }}｜{{ option.meaning }}</option></select></div></div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.generator-page{min-height:100vh;padding:24px;background:#f1f5f9;color:#1e293b;font-family:system-ui,'Noto Sans TC',sans-serif}.page-header,.panel,.preview-panel{max-width:1450px;margin:0 auto 18px}.page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.page-header h1{margin:0;color:#1d4ed8}.page-header p{margin:6px 0;color:#64748b}.page-header a{padding:10px 14px;border-radius:8px;background:#1e3a8a;color:white;text-decoration:none;font-weight:800}.message{max-width:1420px;margin:0 auto 15px;padding:12px 15px;border-left:5px solid #2563eb;background:#dbeafe}.panel{box-sizing:border-box;padding:18px;border:1px solid #cbd5e1;border-radius:14px;background:white;box-shadow:0 3px 14px #0f172a12}.panel h2{margin:0 0 12px;color:#1e3a8a}.form-grid{display:grid;grid-template-columns:2fr repeat(3,1fr) 1.5fr 2fr;gap:10px}.form-grid label,.filters label{display:grid;gap:5px;font-size:.85rem;font-weight:800}.form-grid input,.filters select,.edit-content input,.edit-content select{min-width:0;padding:9px;border:1px solid #94a3b8;border-radius:7px;font:inherit}.section-heading,.export-panel{display:flex;justify-content:space-between;align-items:center;gap:15px}.section-heading h2,.section-heading p{margin:0}.section-heading p{color:#64748b}.filter-actions,.preview-tabs,.download-grid{display:flex;gap:8px;flex-wrap:wrap}.filter-actions button,.section-heading>button,.preview-tabs button,.download-grid button{padding:9px 12px;border:1px solid #64748b;border-radius:8px;background:white;font-weight:800;cursor:pointer}.filters{display:flex;gap:10px;margin:14px 0}.filters label{min-width:180px}.lesson-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;max-height:320px;overflow:auto;padding:4px}.lesson-grid label{display:flex;gap:9px;align-items:center;padding:10px;border:2px solid #cbd5e1;border-radius:9px;cursor:pointer}.lesson-grid label.selected{border-color:#2563eb;background:#eff6ff}.lesson-grid span{display:grid}.lesson-grid small{color:#64748b}.generate-btn{width:100%;margin-top:15px;padding:13px;border:0;border-radius:9px;background:#2563eb;color:white;font-size:1.05rem;font-weight:900;cursor:pointer}.generate-btn:disabled,.download-grid button:disabled{opacity:.5;cursor:default}.preview-tabs button.active{background:#1e3a8a;color:white}.download-grid{display:grid;grid-template-columns:repeat(2,minmax(150px,1fr))}.download-grid button{background:#f8fafc}.preview-panel{overflow:hidden;border-radius:14px;background:#64748b;padding:18px}.preview-scroll{overflow:auto}.preview-scroll :deep(.exam-sheet){margin:auto;box-shadow:0 5px 24px #0f172a80}.edit-content h3{margin:22px 0 8px;color:#1d4ed8}.edit-table{border:1px solid #cbd5e1;border-radius:9px;overflow:hidden}.edit-row{display:grid;grid-template-columns:70px 1fr 1fr;gap:8px;align-items:center;padding:7px;border-bottom:1px solid #e2e8f0}.edit-row:last-child{border-bottom:0}.edit-header{background:#e2e8f0}.matching-edit{grid-template-columns:70px 1fr 1.4fr}.option-editor{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.option-editor label{display:grid;grid-template-columns:32px 1fr;align-items:center;gap:5px}.option-editor b{text-align:center;padding:8px;background:#e2e8f0;border-radius:6px}@media(max-width:1000px){.form-grid{grid-template-columns:repeat(2,1fr)}.section-heading,.export-panel,.page-header{align-items:stretch;flex-direction:column}.option-editor{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.generator-page{padding:12px}.form-grid,.option-editor{grid-template-columns:1fr}.edit-row,.matching-edit{grid-template-columns:45px 1fr}.edit-row input:last-child,.matching-edit select{grid-column:2}.download-grid{grid-template-columns:1fr}}
</style>
