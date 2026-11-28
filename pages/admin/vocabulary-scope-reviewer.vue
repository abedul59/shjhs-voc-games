<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { cumulativeLessonKeys, cumulativeLessonKeysForSelection, lessonKey, sortLessons } from '~/lib/regular-exam-scope';
import { formatVocabularyGlossary, listInScopeVocabulary, lookupVocabularyMeaning, reviewExamVocabulary } from '~/lib/regular-exam-vocabulary';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const allVocabulary = ref([]);
const loading = ref(true);
const processingImage = ref(false);
const status = ref('');
const scopeMode = ref('cumulative');
const selectedVersion = ref('');
const endLesson = ref('');
const selectedLessons = ref([]);
const passageText = ref('');
const questionText = ref('');
const choiceText = ref('');
const pasteTarget = ref('passage');
const findings = ref([]);
const dismissed = ref([]);
const scanned = ref(false);
const showReference = ref(false);
const referenceSearch = ref('');
const manualWord = ref('');
const addingWord = ref(false);
const manualEntries = ref([]);
const glossary = ref('');
const glossaryAuto = ref(true);

const fields = { passage: passageText, questions: questionText, choices: choiceText };
const fieldNames = { passage: '文章／對話', questions: '題幹', choices: '選項' };
const versions = computed(() => [...new Set(allVocabulary.value.map(item => item.version).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant')));
const lessons = computed(() => {
  const map = new Map();
  for (const item of allVocabulary.value) {
    if (!item.version || !item.unit) continue;
    const key = lessonKey(item);
    if (!map.has(key)) map.set(key, { key, version: item.version, volume: item.volume || '', unit: item.unit, count: 0 });
    map.get(key).count += 1;
  }
  return sortLessons([...map.values()]);
});
const versionLessons = computed(() => lessons.value.filter(item => item.version === selectedVersion.value));
const scopeKeys = computed(() => scopeMode.value === 'cumulative'
  ? cumulativeLessonKeys(lessons.value, endLesson.value)
  : cumulativeLessonKeysForSelection(lessons.value, selectedLessons.value));
const missingFirstBook = computed(() => selectedVersion.value && scopeKeys.value.length && !lessons.value.some(item => item.version === selectedVersion.value && item.volume === 'B1'));
const inScopeWords = computed(() => listInScopeVocabulary(allVocabulary.value, scopeKeys.value, lessonKey));
const visibleReference = computed(() => {
  const query = referenceSearch.value.trim().toLocaleLowerCase();
  return query ? inScopeWords.value.filter(item => `${item.word} ${item.meaning} ${item.version} ${item.volume} ${item.unit}`.toLocaleLowerCase().includes(query)) : inScopeWords.value;
});
const referenceGroups = computed(() => {
  const groups = new Map();
  for (const word of visibleReference.value) {
    if (!groups.has(word.lessonKey)) groups.set(word.lessonKey, { key: word.lessonKey, title: `${word.version} ${word.volume} ${word.unit}`, words: [] });
    groups.get(word.lessonKey).words.push(word);
  }
  return [...groups.values()];
});
const activeFindings = computed(() => findings.value.filter(item => !dismissed.value.includes(item.normalized)));
const outsideWords = computed(() => activeFindings.value.filter(item => item.meaning));
const unknownWords = computed(() => activeFindings.value.filter(item => !item.meaning));
const suggestedGlossary = computed(() => [formatVocabularyGlossary(outsideWords.value), ...manualEntries.value.map(item => `${item.word} ${item.meaning}`)].filter(Boolean).join('　'));

const scan = (restore = false) => {
  if (restore) { dismissed.value = []; glossaryAuto.value = true; }
  scanned.value = Boolean(scopeKeys.value.length && [passageText.value, questionText.value, choiceText.value].some(text => text.trim()));
  findings.value = scanned.value ? reviewExamVocabulary([
    { label: fieldNames.passage, text: passageText.value },
    { label: fieldNames.questions, text: questionText.value },
    { label: fieldNames.choices, text: choiceText.value }
  ], allVocabulary.value, scopeKeys.value, lessonKey) : [];
  if (glossaryAuto.value) glossary.value = suggestedGlossary.value;
};

let scanTimer;
watch([passageText, questionText, choiceText, scopeKeys], () => {
  dismissed.value = [];
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => scan(), 300);
}, { deep: true });
watch(suggestedGlossary, value => { if (glossaryAuto.value) glossary.value = value; });
watch(selectedVersion, () => { endLesson.value = ''; selectedLessons.value = []; });
onUnmounted(() => window.clearTimeout(scanTimer));

const appendText = (target, text) => {
  const field = fields[target];
  if (!field || !String(text || '').trim()) return;
  field.value = [field.value.trim(), String(text).trim()].filter(Boolean).join('\n\n');
};
const readScreenshots = async (files, target = pasteTarget.value) => {
  const images = Array.from(files || []).filter(file => file?.type?.startsWith('image/'));
  if (!images.length) { status.value = '剪貼簿或所選檔案沒有圖片。'; return; }
  if (images.length > 10 || images.some(file => file.size > 20 * 1024 * 1024)) { status.value = '一次最多辨識 10 張圖片，每張不得超過 20 MB。'; return; }
  processingImage.value = true;
  let worker;
  try {
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker(['eng', 'chi_tra'], 1, { langPath: '/ocr', corePath: '/ocr/core', workerPath: '/ocr/worker.min.js', gzip: false });
    for (const image of images) {
      const result = await worker.recognize(image);
      appendText(target, result.data.text);
    }
    status.value = `已將 ${images.length} 張截圖文字加入「${fieldNames[target]}」；請核對辨識文字。`;
  } catch (error) { status.value = `圖片辨識失敗：${error?.message || error}`; }
  finally { if (worker) await worker.terminate(); processingImage.value = false; }
};
const pasteScreenshotTo = async (event, target) => {
  const images = Array.from(event.clipboardData?.items || []).filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
  if (!images.length) return;
  event.preventDefault();
  await readScreenshots(images, target);
};
const pasteIntoZone = async event => {
  const images = Array.from(event.clipboardData?.items || []).filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
  if (images.length) { event.preventDefault(); await readScreenshots(images); return; }
  const text = event.clipboardData?.getData('text/plain');
  if (text) { event.preventDefault(); appendText(pasteTarget.value, text); status.value = `已貼入「${fieldNames[pasteTarget.value]}」。`; }
};
const pasteFromClipboard = async () => {
  try {
    const entries = await navigator.clipboard.read();
    const images = await Promise.all(entries.map(async entry => {
      const type = entry.types.find(value => value.startsWith('image/'));
      return type ? await entry.getType(type) : null;
    }));
    if (images.some(Boolean)) { await readScreenshots(images.filter(Boolean)); return; }
    const text = await navigator.clipboard.readText();
    if (!text) { status.value = '剪貼簿沒有文字或圖片。'; return; }
    appendText(pasteTarget.value, text);
    status.value = `已貼入「${fieldNames[pasteTarget.value]}」。`;
  } catch { status.value = '瀏覽器未允許讀取剪貼簿；請點選貼上區後按 Ctrl+V。'; }
};
const focusPasteZone = event => { if (!event.target.closest('button, select, input')) event.currentTarget.focus(); };
const selectImages = async event => { await readScreenshots(event.target.files); event.target.value = ''; };

const addManualWord = async () => {
  const word = manualWord.value.trim();
  if (!/^[A-Za-z][A-Za-z '\-’]*$/.test(word)) { status.value = '請輸入英文單字或片語。'; return; }
  if (manualEntries.value.some(item => item.word.toLocaleLowerCase() === word.toLocaleLowerCase())) { status.value = `「${word}」已在手動單字提示中。`; return; }
  addingWord.value = true;
  try {
    let meaning = lookupVocabularyMeaning(word, allVocabulary.value);
    let translated = false;
    if (!meaning) {
      const response = await $fetch('/api/translate', { method: 'POST', body: { text: word } });
      meaning = String(response.translation || '').trim();
      translated = true;
    }
    if (!meaning) throw new Error('找不到中文釋義');
    manualEntries.value.push({ word, meaning });
    manualWord.value = '';
    status.value = `已加入「${word} ${meaning}」${translated ? '（自動翻譯，請核對中文）' : '（來自單字題庫）'}。`;
  } catch (error) { status.value = `中文查詢失敗：${error.message}；可直接在單字提示欄填入中文。`; }
  finally { addingWord.value = false; }
};
const clearHints = () => {
  dismissed.value = findings.value.map(item => item.normalized);
  manualEntries.value = [];
  glossary.value = '';
  glossaryAuto.value = false;
  status.value = '已清除全部單字提醒；按「重新檢測」可恢復。';
};
const copyGlossary = async () => {
  try { await navigator.clipboard.writeText(glossary.value); status.value = '已複製單字提示。'; }
  catch { status.value = '複製失敗，請選取下方文字後複製。'; }
};

onMounted(async () => {
  try {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from('vocabularies').select('id,version,volume,unit,en_us,zh_tw').order('id').range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    allVocabulary.value = rows;
    if (versions.value.length === 1) selectedVersion.value = versions.value[0];
  } catch (error) { status.value = `單字題庫讀取失敗：${error.message}`; }
  finally { loading.value = false; }
});
</script>

<template>
  <main class="reviewer-page">
    <header class="page-header"><div><h1>🔎 英文單字超出範圍審題器</h1><p>貼入文章、題目、選項或截圖，依考試範圍檢查單字。</p></div><nav><NuxtLink to="/admin/regular-exam-generator">段考出題器</NuxtLink><NuxtLink to="/admin">返回後台</NuxtLink></nav></header>
    <p v-if="status" class="status" role="status">{{ status }}</p>
    <section class="card"><h2>一、選擇考試單字範圍</h2><p v-if="loading">正在載入單字題庫……</p><template v-else><div class="scope-controls"><label>版本<select v-model="selectedVersion"><option value="">請選擇版本</option><option v-for="version in versions" :key="version" :value="version">{{ version }}</option></select></label><label><input v-model="scopeMode" type="radio" value="cumulative"> 從 B1 累積至指定課</label><label><input v-model="scopeMode" type="radio" value="manual"> 逐課勾選終點</label><select v-if="scopeMode === 'cumulative'" v-model="endLesson" :disabled="!selectedVersion"><option value="">選擇本次考試最後一課</option><option v-for="lesson in versionLessons" :key="lesson.key" :value="lesson.key">{{ lesson.volume }} {{ lesson.unit }}（{{ lesson.count }}）</option></select></div><div v-if="scopeMode === 'manual' && selectedVersion" class="lesson-grid"><label v-for="lesson in versionLessons" :key="lesson.key"><input v-model="selectedLessons" type="checkbox" :value="lesson.key"> {{ lesson.volume }} {{ lesson.unit }}（{{ lesson.count }}）</label></div><p class="scope-summary">已納入 {{ scopeKeys.length }} 課、{{ inScopeWords.length }} 筆單字；同版本從 B1 起累積至所選課次。</p><p v-if="missingFirstBook" class="warning">此版本的 B1 單字題庫尚未載入，累積範圍可能不完整。</p></template></section>

    <section class="card"><h2>二、貼上待審文字或截圖</h2><div class="text-grid"><label>文章／對話<textarea v-model="passageText" rows="10" placeholder="貼上閱讀測驗或克漏字主文；可分段貼上" @paste="pasteScreenshotTo($event, 'passage')"></textarea></label><label>題幹<textarea v-model="questionText" rows="10" placeholder="貼上文法選擇、閱讀或克漏字的題目" @paste="pasteScreenshotTo($event, 'questions')"></textarea></label><label>選項<textarea v-model="choiceText" rows="10" placeholder="貼上 A～D 選項；選項代號不會列入檢測" @paste="pasteScreenshotTo($event, 'choices')"></textarea></label></div><div class="paste-zone" tabindex="0" @click="focusPasteZone" @paste="pasteIntoZone"><b>直接貼上截圖或文字</b><label>加入到<select v-model="pasteTarget"><option value="passage">文章／對話</option><option value="questions">題幹</option><option value="choices">選項</option></select></label><span>點這裡按 Ctrl+V</span><button type="button" :disabled="processingImage" @click="pasteFromClipboard">從剪貼簿貼上</button><label class="file-button">選擇圖片<input type="file" multiple accept="image/png,image/jpeg,image/webp" :disabled="processingImage" @change="selectImages"></label></div><p v-if="processingImage" class="scope-summary">正在辨識截圖，完成後文字會加入上方欄位，請核對後再使用。</p></section>

    <section class="card"><div class="section-heading"><h2>三、超出範圍檢測</h2><div><button type="button" @click="scan(true)">🔍 重新檢測</button><button type="button" :disabled="!findings.length && !glossary" @click="clearHints">清除全部單字提醒</button></div></div><p v-if="!scopeKeys.length" class="scope-summary">請先選擇考試範圍。</p><p v-else-if="!scanned" class="scope-summary">貼入文字後會自動檢測。</p><template v-else><p class="scope-summary">範圍外 {{ outsideWords.length }} 個；題庫外待確認 {{ unknownWords.length }} 個。</p><p v-if="!activeFindings.length" class="success">目前沒有需要提醒的單字。</p><div v-else class="findings"><article v-for="item in activeFindings" :key="item.normalized" :class="item.meaning ? 'outside' : 'unknown'"><div><b>{{ item.word }}</b><span>{{ item.meaning || '題庫外，請人工確認' }}</span></div><small>{{ item.locations.join('、') }}</small><button type="button" @click="dismissed.push(item.normalized)">已確認，忽略此詞</button></article></div></template></section>

    <section class="card"><div class="section-heading"><h2>四、範圍內單字參考</h2><button type="button" @click="showReference = !showReference">{{ showReference ? '收起' : '查看' }}範圍內全部單字（{{ inScopeWords.length }}）</button></div><div v-if="showReference" class="reference"><label>搜尋英文、中文或課次<input v-model="referenceSearch" placeholder="輸入關鍵字"></label><p>顯示 {{ visibleReference.length }}／{{ inScopeWords.length }} 筆，按版本、分冊、分課排列。</p><div class="reference-list"><section v-for="group in referenceGroups" :key="group.key"><h3>{{ group.title }}（{{ group.words.length }}）</h3><div class="reference-words"><div v-for="word in group.words" :key="word.word"><b>{{ word.word }}</b><span>{{ word.meaning || '（未填中文）' }}</span></div></div></section></div></div></section>

    <section class="card"><h2>五、單字提示</h2><div class="manual-row"><label>手動加入英文單字或片語<input v-model="manualWord" placeholder="輸入英文" @keyup.enter="addManualWord"></label><button type="button" :disabled="addingWord" @click="addManualWord">{{ addingWord ? '查詢中…' : '查中文並加入' }}</button></div><p class="scope-summary">先查單字題庫，查不到時自動翻譯；中文可在下方修改。</p><div v-if="manualEntries.length" class="manual-list"><div v-for="(entry,index) in manualEntries" :key="index"><input v-model="entry.word" aria-label="英文"><input v-model="entry.meaning" aria-label="中文"><button type="button" @click="manualEntries.splice(index,1)">移除</button></div></div><textarea v-model="glossary" rows="4" placeholder="可自行增刪或修改中文" @input="glossaryAuto = false"></textarea><div class="glossary-actions"><button type="button" @click="copyGlossary">複製單字提示</button><button type="button" @click="glossaryAuto = true; glossary = suggestedGlossary">依檢測結果重建提示</button></div></section>
  </main>
</template>

<style scoped>
.reviewer-page{min-height:100vh;padding:24px;background:#eef2f7;color:#1e293b;font-family:system-ui,'Noto Sans TC',sans-serif}.page-header,.card,.status{max-width:1350px;margin:0 auto 18px}.page-header{display:flex;justify-content:space-between;gap:20px}.page-header h1{margin:0;color:#0f766e}.page-header p{margin:5px 0;color:#475569}.page-header nav{display:flex;gap:8px;flex-wrap:wrap;align-items:start}.page-header a{padding:9px 13px;border-radius:7px;background:#115e59;color:#fff;text-decoration:none;font-weight:700}.card{box-sizing:border-box;padding:20px;border:1px solid #cbd5e1;border-radius:13px;background:#fff;box-shadow:0 3px 14px #0f172a12}.card h2{margin:0 0 12px;color:#115e59}.card button,.file-button{padding:8px 11px;border:1px solid #0f766e;border-radius:7px;background:#f0fdfa;color:#115e59;font:inherit;font-weight:700;cursor:pointer}.card button:disabled{opacity:.5;cursor:not-allowed}.status{box-sizing:border-box;padding:11px 14px;border-left:4px solid #0f766e;background:#d1fae5}.scope-controls,.section-heading,.manual-row,.glossary-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.scope-controls label,.manual-row label{display:flex;align-items:center;gap:6px;font-weight:700}.scope-controls select,.manual-row input,.reference input,.paste-zone select{padding:7px;border:1px solid #94a3b8;border-radius:6px;font:inherit}.scope-controls select{max-width:320px}.lesson-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:6px;max-height:210px;overflow:auto;margin-top:12px}.lesson-grid label{padding:8px;border:1px solid #cbd5e1;border-radius:6px}.scope-summary{color:#475569}.warning{color:#b91c1c;font-weight:700}.success{color:#166534;font-weight:700}.text-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.text-grid label{display:grid;gap:6px;font-weight:700}.text-grid textarea,.card>textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid #94a3b8;border-radius:7px;font:inherit;line-height:1.5;resize:vertical}.paste-zone{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;padding:13px;border:2px dashed #0f766e;border-radius:8px;background:#f0fdfa}.paste-zone:focus{outline:3px solid #14b8a6}.paste-zone label{display:flex;align-items:center;gap:6px}.file-button input{max-width:200px}.section-heading{justify-content:space-between}.section-heading h2{margin:0}.section-heading>div{display:flex;gap:7px;flex-wrap:wrap}.findings{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:8px}.findings article{display:grid;gap:7px;padding:10px;border-radius:8px}.findings .outside{background:#fef3c7}.findings .unknown{background:#fee2e2}.findings article>div{display:flex;justify-content:space-between;gap:8px}.findings b{font-size:1.1rem}.findings small{color:#475569}.reference{margin-top:10px;padding:10px;border:1px solid #99f6e4;border-radius:8px;background:#f0fdfa}.reference label{display:flex;align-items:center;gap:8px}.reference-list{max-height:360px;overflow:auto}.reference-list h3{position:sticky;top:0;margin:10px 0 4px;padding:5px;background:#ccfbf1}.reference-words{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px 10px}.reference-words>div{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #99f6e4;padding:3px}.manual-list{display:grid;gap:5px;margin:10px 0}.manual-list>div{display:flex;gap:6px}.manual-list input{min-width:0;padding:7px;border:1px solid #94a3b8;border-radius:6px}.glossary-actions{margin-top:8px}@media(max-width:850px){.text-grid{grid-template-columns:1fr}.page-header{flex-direction:column}}@media(max-width:550px){.reviewer-page{padding:10px}.card{padding:14px}.manual-list>div{flex-wrap:wrap}}
</style>
