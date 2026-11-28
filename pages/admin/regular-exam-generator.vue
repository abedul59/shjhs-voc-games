<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { parseRegularExamQuestion } from '~/lib/regular-exam-question-parser';
import Papa from 'papaparse';
import { applyChoiceAnswerKey, csvRowsToSection, exportSectionData, extractChoiceAnswerKey, joinReadingScreenshotText, normalizeImportedItems, parseDocumentQuestions, parseReadingScreenshotText, pdfTextToPlain, sectionCsvRows } from '~/lib/regular-exam-import';
import { detectOutOfScopeVocabulary, formatVocabularyGlossary, listInScopeVocabulary, lookupVocabularyMeaning } from '~/lib/regular-exam-vocabulary';
import { findRegularExamAnswerLeaks } from '~/lib/regular-exam-answer-leaks';
import { sentenceTokens, buildTranslationFill, chooseTranslationBlanks, splitTranslationText } from '~/lib/regular-exam-translation';
import { groupTitle, writtenTitle, scoreSlots, sectionOrdinal } from '~/lib/regular-exam-sections';
import { lessonKey, sortLessons, cumulativeLessonKeys, cumulativeLessonKeysForSelection } from '~/lib/regular-exam-scope';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');
const accessVerified = ref(false);
const accessCode = ref('');
const unlockExam = code => { accessCode.value = code; accessVerified.value = true; refreshDrafts(); refreshScorePresets(true); };
const labels = ['A', 'B', 'C', 'D'];
const presets = {
  7: { choicePercent: 50, nonChoicePercent: 50, grammarCount: 10, clozeCount: 0, readingCount: 10, directVocab: 7, contextVocab: 5, blanksPerSentence: 2, writtenSections: [{ title: '單字型態變化', count: 6 }, { title: '翻譯填充', count: 13 }] },
  8: { choicePercent: 66, nonChoicePercent: 34, grammarCount: 10, clozeCount: 14, readingCount: 11, directVocab: 7, contextVocab: 3, writtenSections: [{ title: '單字型態變化', count: 6 }, { title: '翻譯填充', count: 12 }, { title: '依提示作答', count: 2 }] },
  9: { choicePercent: 85, nonChoicePercent: 15, grammarCount: 15, clozeCount: 5, readingCount: 25, directVocab: 10, contextVocab: 5, writtenSections: [] }
};

const allVocabulary = ref([]);
const allGrammar = ref([]);
const selectedVocabLessons = ref([]);
const vocabScopeMode = ref('manual');
const cumulativeVocabEnd = ref('');
const selectedGrammarLessons = ref([]);
const isLoading = ref(true);
const isGenerating = ref(false);
const exporting = ref('');
const generated = ref(false);
const message = ref('');
const previewMode = ref('question');
const editorTab = ref('listening');
const vocabularyReferenceGroup = ref('');
const vocabularyReferenceSearch = ref('');
const manualGlossaryInput = ref({});
const addingGlossaryWord = ref('');
const interchangeCategory = ref('grammar');
const importMode = ref('replace');
const importPreview = ref(null);
const importedText = ref('');
const importingFile = ref(false);
const questionImportFiles = ref([]);
const passageImportFiles = ref([]);
const answerImportFiles = ref([]);
const screenshotPasteRole = ref('questions');
const questionPreview = ref(null);
const answerPreview = ref(null);
const blankPreview = ref(null);
const variantNumber = ref(0);
const draftName = ref('');
const draftList = ref([]);
const selectedDraft = ref('');
const loadingDraft = ref(false);
const scorePresetName = ref('');
const scorePresetList = ref([]);
const selectedScorePreset = ref('');
const scorePresetDefault = ref(false);
const translationMode = ref('bank');
const translationSourceText = ref('');
const draftStorageKey = 'regular-exam-drafts-v1';
const draftOwner = computed(() => {
  const auth = authCookie.value;
  return auth?.role === 'admin' ? 'superadmin' : `teacher:${auth?.name || 'unknown'}`;
});
const sectionPoints = ref({});
const sections = computed(() => [
  { id: 'image', title: '一、辨識句意', items: listening.value.image },
  { id: 'basic', title: '二、基本問答', items: listening.value.basic },
  { id: 'comprehension', title: '三、言談理解', items: listening.value.comprehension },
  { id: 'grammar', title: '四、文法選擇', items: grammarQuestions.value },
  ...groups.value.map((group, index) => ({ id: group.id, title: groupTitle(group, index), items: group.questions })),
  { id: 'vocabulary', title: writtenTitle('單字與文意字彙', groups.value.length, 0), items: nonChoice.value.vocabulary },
  ...nonChoice.value.sections.map((section, index) => ({ id: section.id, title: writtenTitle(section.title, groups.value.length, index + 1), items: section.items }))
]);
const scoreTotal = computed(() => Math.round(sections.value.reduce((sum, section) => sum + (Number(sectionPoints.value[section.id]) || 0), 0) * 100) / 100);
const scoreDifference = computed(() => Math.round((100 - scoreTotal.value) * 100) / 100);
const sectionSize = section => {
  if (section.id !== translationSection.value?.id) return section.items.length;
  const gaps = section.items.reduce((sum, item) => sum + (item.blankIndices?.length || 0), 0);
  return gaps || (!generated.value ? section.items.length * (Number(questionCounts.value.blanksPerSentence) || 1) : 0);
};
const perQuestion = section => sectionSize(section) ? Math.round((Number(sectionPoints.value[section.id]) || 0) / sectionSize(section) * 100) / 100 : 0;
const scoreWarnings = computed(() => sections.value.flatMap(section => {
  const total = Number(sectionPoints.value[section.id]);
  if (!Number.isFinite(total) || total < 0) return [`${section.title} 分數不可為負或空白`];
  if (!sectionSize(section) && total) return [`${section.title} 沒有題目，卻設定了 ${total} 分`];
  if (sectionSize(section) && !total) return [`${section.title} 每題 0 分`];
  if (sectionSize(section) && Math.round(total * 100) % sectionSize(section)) return [`${section.title} 每題約 ${perQuestion(section)} 分，無法平均分至小數點後兩位`];
  return [];
}));
const choiceScore = computed(() => Math.round(sections.value.slice(0, 4 + groups.value.length).reduce((sum, section) => sum + (Number(sectionPoints.value[section.id]) || 0), 0) * 100) / 100);
const writtenScore = computed(() => Math.round((scoreTotal.value - choiceScore.value) * 100) / 100);
const allocateScores = () => {
  const choice = sections.value.slice(0, 4 + groups.value.length);
  const written = sections.value.slice(4 + groups.value.length);
  const scores = {};
  const allocate = (parts, total) => {
    const count = parts.reduce((sum, section) => sum + sectionSize(section), 0);
    let assigned = 0;
    parts.forEach((section, index) => {
      scores[section.id] = count ? index === parts.length - 1 ? Math.round((total - assigned) * 100) / 100 : Math.round(total * sectionSize(section) / count * 100) / 100 : 0;
      assigned += scores[section.id];
    });
  };
  allocate(choice, Number(scoring.value.choicePercent) || 0);
  allocate(written, Number(scoring.value.nonChoicePercent) || 0);
  sectionPoints.value = scores;
};
const applyScoreMap = points => {
  const slots = scoreSlots(groups.value, nonChoice.value);
  sectionPoints.value = Object.fromEntries(sections.value.map((section, index) => [section.id, Number(points?.[slots[index]]) || 0]));
};
const defaultSevenPoints = { image: 5, basic: 5, comprehension: 10, grammar: 10, 'group:0': 10, 'group:1': 10, vocabulary: 12, 'written:0': 12, 'written:1': 26 };
const applyBuiltInScores = () => {
  if (metadata.value.grade === '7') applyScoreMap(defaultSevenPoints);
  else allocateScores();
};
const scoreSpec = () => ({
  scoring: { ...scoring.value }, questionCounts: { ...questionCounts.value },
  groups: groups.value.map(group => ({ type: group.type, title: group.title, count: group.questions.length })),
  writtenSections: nonChoice.value.sections.map(section => ({ title: section.title, type: section.type, count: section.items.length })),
  points: Object.fromEntries(scoreSlots(groups.value, nonChoice.value).map((slot, index) => [slot, Number(sectionPoints.value[sections.value[index].id]) || 0]))
});
const refreshScorePresets = async (loadDefault = false) => {
  if (!accessCode.value) return;
  const grade = metadata.value.grade;
  const { data, error } = await supabase.rpc('list_regular_exam_score_presets', { p_owner: draftOwner.value, p_grade: grade, p_code: accessCode.value });
  if (error) { message.value = `配分範本讀取失敗：${error.message}。請先執行配分範本 SQL。`; return; }
  if (metadata.value.grade !== grade) return;
  scorePresetList.value = data || [];
  if (loadDefault && !generated.value && data?.find(row => row.is_default)) applyScorePreset(data.find(row => row.is_default), false);
};
const applyScorePreset = (row, ask = true) => {
  if (!row?.spec) return;
  if (ask && generated.value && !window.confirm('套用配分範本會重新建立空白題目，先儲存目前草稿再繼續？')) return;
  selectedScorePreset.value = row.id;
  scorePresetName.value = row.name;
  scorePresetDefault.value = row.is_default;
  scoring.value = { ...row.spec.scoring };
  resetBlueprint(row.spec);
  applyScoreMap(row.spec.points);
  message.value = `已載入 ${metadata.value.grade} 年級配分範本「${row.name}」。`;
};
const saveScorePreset = async () => {
  const name = scorePresetName.value.trim();
  if (!name) { message.value = '請輸入配分範本名稱。'; return; }
  if (scoreDifference.value !== 0 || scoreWarnings.value.length) { message.value = '請先把配分調整至 100 分並排除無效項目。'; return; }
  const id = selectedScorePreset.value || crypto.randomUUID();
  const { error } = await supabase.rpc('save_regular_exam_score_preset', { p_id: id, p_owner: draftOwner.value, p_grade: metadata.value.grade, p_name: name, p_spec: scoreSpec(), p_default: scorePresetDefault.value, p_code: accessCode.value });
  if (error) { message.value = `配分範本儲存失敗：${error.message}`; return; }
  selectedScorePreset.value = id;
  await refreshScorePresets();
  message.value = `已儲存 ${metadata.value.grade} 年級配分範本「${name}」${scorePresetDefault.value ? '並設為預設' : ''}。`;
};
const deleteScorePreset = async () => {
  if (!selectedScorePreset.value || !window.confirm('確定刪除此年級配分範本？')) return;
  const { data, error } = await supabase.rpc('delete_regular_exam_score_preset', { p_id: selectedScorePreset.value, p_owner: draftOwner.value, p_grade: metadata.value.grade, p_code: accessCode.value });
  if (error || !data) { message.value = `刪除配分範本失敗：${error?.message || '找不到範本'}`; return; }
  selectedScorePreset.value = ''; scorePresetName.value = ''; scorePresetDefault.value = false;
  await refreshScorePresets();
  message.value = '配分範本已刪除。';
};
const refreshDrafts = async () => {
  if (!accessCode.value) return;
  const { data, error } = await supabase.rpc('list_regular_exam_drafts', { p_owner: draftOwner.value, p_code: accessCode.value });
  if (error) { message.value = `草稿資料庫讀取失敗：${error.message}。請先執行段考草稿 SQL。`; return; }
  draftList.value = data || [];
};
const draftPayload = () => ({ metadata: metadata.value, scoring: scoring.value, listening: listening.value, grammarQuestions: grammarQuestions.value, groups: groups.value, nonChoice: nonChoice.value, selectedVocabLessons: selectedVocabLessons.value, vocabScopeMode: vocabScopeMode.value, cumulativeVocabEnd: cumulativeVocabEnd.value, selectedGrammarLessons: selectedGrammarLessons.value, sectionPoints: sectionPoints.value, questionCounts: questionCounts.value, translationMode: translationMode.value, translationSourceText: translationSourceText.value });
const localDraftCount = ref(0);
const importLocalDrafts = async () => {
  let old = [];
  try { old = JSON.parse(localStorage.getItem(draftStorageKey) || '[]'); } catch { /* 舊資料格式無法解析 */ }
  if (!old.length) return;
  const rows = old.map(draft => ({ id: draft.id || crypto.randomUUID(), owner_key: draftOwner.value, name: draft.name || '舊版草稿', payload: { ...draft, questionCounts: draft.questionCounts || questionCounts.value }, updated_at: new Date().toISOString() }));
  for (const row of rows) {
    const { error } = await supabase.rpc('save_regular_exam_draft', { p_id: row.id, p_owner: row.owner_key, p_name: row.name, p_payload: row.payload, p_code: accessCode.value });
    if (error) { message.value = `舊草稿匯入失敗：${error.message}`; return; }
  }
  localStorage.removeItem(draftStorageKey);
  localDraftCount.value = 0;
  await refreshDrafts();
  message.value = `已將 ${rows.length} 份舊版瀏覽器草稿移至資料庫。`;
};
const saveDraft = async () => {
  const name = draftName.value.trim();
  if (!name) { message.value = '請先輸入草稿名稱。'; return; }
  const id = selectedDraft.value || crypto.randomUUID();
  const payload = draftPayload();
  const { error } = await supabase.rpc('save_regular_exam_draft', { p_id: id, p_owner: draftOwner.value, p_name: name, p_payload: payload, p_code: accessCode.value });
  if (error) { message.value = `草稿儲存失敗：${error.message}`; return; }
  selectedDraft.value = id;
  await refreshDrafts();
  message.value = `草稿「${name}」已儲存到資料庫。`;
};
const deleteDraft = async () => {
  if (!selectedDraft.value || !window.confirm('確定刪除此份資料庫草稿？刪除後無法復原。')) return;
  const { data, error } = await supabase.rpc('delete_regular_exam_draft', { p_id: selectedDraft.value, p_owner: draftOwner.value, p_code: accessCode.value });
  if (error || !data) { message.value = `刪除草稿失敗：${error?.message || '找不到草稿'}`; return; }
  selectedDraft.value = ''; draftName.value = '';
  await refreshDrafts();
  message.value = '資料庫草稿已刪除。';
};
const loadDraft = async () => {
  const { data: row, error } = await supabase.rpc('get_regular_exam_draft', { p_id: selectedDraft.value, p_owner: draftOwner.value, p_code: accessCode.value });
  if (error || !row) { message.value = `草稿載入失敗：${error?.message || '找不到草稿'}`; return; }
  applyDraftPayload(row.payload);
  draftName.value = row.name;
  message.value = `已載入「${row.name}」（${new Date(row.updated_at).toLocaleString('zh-TW')}）。`;
};
const applyDraftPayload = draft => {
  loadingDraft.value = true;
  metadata.value = structuredClone(draft.metadata);
  scoring.value = structuredClone(draft.scoring);
  listening.value = structuredClone(draft.listening);
  grammarQuestions.value = structuredClone(draft.grammarQuestions);
  groups.value = structuredClone(draft.groups);
  nonChoice.value = structuredClone(draft.nonChoice);
  selectedVocabLessons.value = [...(draft.selectedVocabLessons || [])];
  vocabScopeMode.value = draft.vocabScopeMode || 'manual';
  cumulativeVocabEnd.value = draft.cumulativeVocabEnd || '';
  selectedGrammarLessons.value = [...(draft.selectedGrammarLessons || [])];
  sectionPoints.value = structuredClone(draft.sectionPoints || {});
  questionCounts.value = { ...questionCounts.value, translationBlankWidth: 4, ...(draft.questionCounts || {}) };
  translationMode.value = draft.translationMode || 'bank';
  translationSourceText.value = draft.translationSourceText || '';
  generated.value = true;
  if (!draft.sectionPoints) allocateScores();
  loadingDraft.value = false;
};

const metadata = ref({
  schoolName: '台南市立新化國民中學', schoolYear: '115', semester: '1', grade: '8', examNumber: '1',
  fileName: '115學年度第1學期8年級第1次定期評量英語科', answerFontSize: 10
});
const scoring = ref({ choicePercent: 66, nonChoicePercent: 34 });
const questionCounts = ref({ grammar: 10, directVocab: 7, contextVocab: 3, translation: 12, blanksPerSentence: 1, translationBlankWidth: 4 });
const listening = ref({ image: [], basic: [], comprehension: [] });
const grammarQuestions = ref([]);
const groups = ref([]);
const nonChoice = ref({ vocabulary: [], sections: [] });

const preset = computed(() => presets[metadata.value.grade]);
const scoringTotal = computed(() => Number(scoring.value.choicePercent || 0) + Number(scoring.value.nonChoicePercent || 0));
const buildLessonCatalog = records => {
  const map = new Map();
  records.forEach(item => {
    if (!item.version || !item.unit) return;
    const key = lessonKey(item);
    if (!map.has(key)) map.set(key, { key, version: item.version, volume: item.volume || '', unit: item.unit, count: 0 });
    map.get(key).count += 1;
  });
  return sortLessons([...map.values()]);
};
const vocabLessons = computed(() => buildLessonCatalog(allVocabulary.value));
const grammarLessons = computed(() => buildLessonCatalog(allGrammar.value));
const effectiveVocabLessons = computed(() => vocabScopeMode.value === 'cumulative'
  ? cumulativeLessonKeys(vocabLessons.value, cumulativeVocabEnd.value)
  : selectedVocabLessons.value);
const referenceVocabLessons = computed(() => cumulativeLessonKeysForSelection(vocabLessons.value,
  vocabScopeMode.value === 'cumulative' ? [cumulativeVocabEnd.value] : selectedVocabLessons.value));
const missingFirstBook = computed(() => [...new Set(referenceVocabLessons.value.map(key => key.split('|')[0]))]
  .filter(version => !vocabLessons.value.some(lesson => lesson.version === version && lesson.volume === 'B1')));
const selectedVocabCount = computed(() => allVocabulary.value.filter(item => effectiveVocabLessons.value.includes(lessonKey(item))).length);
const selectedGrammarCount = computed(() => allGrammar.value.filter(item => selectedGrammarLessons.value.includes(lessonKey(item))).length);
const examData = computed(() => ({
  metadata: metadata.value, preset: { ...preset.value, ...scoring.value }, listening: listening.value,
  grammarQuestions: grammarQuestions.value, groups: groups.value, nonChoice: nonChoice.value, sectionPoints: sectionPoints.value
}));
const answerLeaks = computed(() => generated.value ? findRegularExamAnswerLeaks(examData.value) : []);
const inScopeVocabulary = computed(() => listInScopeVocabulary(allVocabulary.value, referenceVocabLessons.value, lessonKey));
const visibleReferenceVocabulary = computed(() => {
  const query = vocabularyReferenceSearch.value.trim().toLocaleLowerCase();
  return query ? inScopeVocabulary.value.filter(item => `${item.word} ${item.meaning} ${item.version} ${item.volume} ${item.unit}`.toLocaleLowerCase().includes(query)) : inScopeVocabulary.value;
});
const referenceVocabularyGroups = computed(() => {
  const groups = new Map();
  visibleReferenceVocabulary.value.forEach(item => {
    if (!groups.has(item.lessonKey)) groups.set(item.lessonKey, { key: item.lessonKey, version: item.version, volume: item.volume, unit: item.unit, items: [] });
    groups.get(item.lessonKey).items.push(item);
  });
  return [...groups.values()];
});

const makeChoices = count => Array.from({ length: count }, () => '');
const makeQuestion = (number = 0, choiceCount = 4) => ({ id: crypto.randomUUID(), number, stem: '', choices: makeChoices(choiceCount), choiceImages: Array(choiceCount).fill(''), answer: 0 });
const makeListeningImageQuestion = number => ({ id: crypto.randomUUID(), number, stem: '', choices: Array.from({ length: 3 }, () => ({ text: '', image: '' })), answer: 0 });
const makeWrittenItems = count => Array.from({ length: count }, () => ({ id: crypto.randomUUID(), prompt: '', answer: '' }));

const resetBlueprint = (spec = null) => {
  const current = preset.value;
  questionCounts.value = { grammar: current.grammarCount, directVocab: current.directVocab, contextVocab: current.contextVocab, translation: current.writtenSections.find(section => section.title === '翻譯填充')?.count || 0, blanksPerSentence: current.blanksPerSentence || 1, translationBlankWidth: 4, ...(spec?.questionCounts || {}) };
  listening.value = {
    image: Array.from({ length: 5 }, (_, index) => makeListeningImageQuestion(index + 1)),
    basic: Array.from({ length: 5 }, (_, index) => makeQuestion(index + 6, 3)),
    comprehension: Array.from({ length: 5 }, (_, index) => makeQuestion(index + 11, 3))
  };
  grammarQuestions.value = Array.from({ length: questionCounts.value.grammar }, (_, index) => makeQuestion(index + 16));
  let nextNumber = 16 + questionCounts.value.grammar;
  const nextGroups = [];
  if (current.clozeCount) {
    nextGroups.push({ id: crypto.randomUUID(), type: 'cloze', title: '五、克漏字測驗', passage: '', images: ['', ''], glossary: '', autoGlossary: true, outOfScopeCount: 0, unknownWordCount: 0, startNewPage: false, questions: Array.from({ length: current.clozeCount }, (_, index) => makeQuestion(nextNumber + index)) });
    nextNumber += current.clozeCount;
  }
  const readingGroupCount = current.readingCount > 15 ? 3 : 2;
  const base = Math.floor(current.readingCount / readingGroupCount);
  const remainder = current.readingCount % readingGroupCount;
  for (let groupIndex = 0; groupIndex < readingGroupCount; groupIndex += 1) {
    const count = base + (groupIndex < remainder ? 1 : 0);
    nextGroups.push({ id: crypto.randomUUID(), type: 'reading', title: `${sectionOrdinal(4 + nextGroups.length)}、閱讀測驗（題組 ${groupIndex + 1}）`, passage: '', images: ['', ''], glossary: '', autoGlossary: true, outOfScopeCount: 0, unknownWordCount: 0, startNewPage: false, questions: Array.from({ length: count }, (_, index) => makeQuestion(nextNumber + index)) });
    nextNumber += count;
  }
  if (Array.isArray(spec?.groups)) {
    nextNumber = 16 + questionCounts.value.grammar;
    nextGroups.splice(0, nextGroups.length, ...spec.groups.map((item, groupIndex) => {
      const questions = Array.from({ length: Math.max(0, Number(item.count) || 0) }, (_, index) => makeQuestion(nextNumber + index));
      nextNumber += questions.length;
      return { id: crypto.randomUUID(), type: item.type || 'reading', title: item.title || `${sectionOrdinal(4 + groupIndex)}、閱讀測驗`, passage: '', images: ['', ''], glossary: '', autoGlossary: true, outOfScopeCount: 0, unknownWordCount: 0, startNewPage: false, questions };
    }));
  }
  groups.value = nextGroups;
  nonChoice.value = {
    vocabulary: makeWrittenItems(questionCounts.value.directVocab + questionCounts.value.contextVocab),
    sections: (spec?.writtenSections || current.writtenSections).map(section => ({ id: crypto.randomUUID(), type: section.type || (section.title === '翻譯填充' ? 'translation' : 'written'), title: section.title, instructions: '', items: makeWrittenItems(section.count) }))
  };
  applyBuiltInScores();
  generated.value = false;
  variantNumber.value = 0;
};

watch(() => metadata.value.grade, grade => {
  if (loadingDraft.value) return;
  metadata.value.fileName = `${metadata.value.schoolYear}學年度第${metadata.value.semester}學期${grade}年級第${metadata.value.examNumber}次定期評量英語科`;
  scoring.value = { choicePercent: presets[grade].choicePercent, nonChoicePercent: presets[grade].nonChoicePercent };
  selectedScorePreset.value = ''; scorePresetName.value = ''; scorePresetDefault.value = false;
  resetBlueprint();
  refreshScorePresets(true);
});

const shuffle = list => {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
};

const handleQuestionPaste = (event, question) => {
  if (!question || question.choices?.some(choice => typeof choice === 'object')) return;
  const parsed = parseRegularExamQuestion(event.clipboardData?.getData('text/plain'), question.choices.length, question.choices.length === 3);
  if (!parsed) return;
  event.preventDefault();
  question.stem = parsed.stem;
  question.choices = parsed.choices;
  message.value = `第 ${question.number} 題已自動拆分題幹與 ${parsed.choices.length} 個選項；請再確認正確答案。`;
};

const glossaryTimers = new Map();
const detectGroupVocabulary = group => {
  const results = detectOutOfScopeVocabulary(group.passage, allVocabulary.value, referenceVocabLessons.value, lessonKey);
  const manual = group.manualGlossaryEntries || [];
  const manualKeys = new Set(manual.map(item => item.word.trim().toLocaleLowerCase()));
  group.glossary = [formatVocabularyGlossary(results.filter(item => !manualKeys.has(item.word.trim().toLocaleLowerCase()))), ...manual.map(item => `${item.word} ${item.meaning}`)].filter(Boolean).join('　');
  group.outOfScopeCount = results.filter(item => item.meaning).length;
  group.unknownWordCount = results.filter(item => !item.meaning).length;
  group.detectedVocabulary = results;
  group.autoGlossary = true;
  message.value = results.length
    ? `「${group.title}」找到 ${group.outOfScopeCount} 個範圍外單字，已填入單字提示${group.unknownWordCount ? `；另有 ${group.unknownWordCount} 個題庫外單字待人工確認，未自動放入考卷` : ''}。`
    : `「${group.title}」未找到範圍外單字。`;
};
const scheduleGroupVocabularyDetection = group => {
  if (!group.autoGlossary) return;
  window.clearTimeout(glossaryTimers.get(group.id));
  glossaryTimers.set(group.id, window.setTimeout(() => detectGroupVocabulary(group), 350));
};
const editGlossaryManually = group => { group.autoGlossary = false; };
const addManualGlossaryWord = async group => {
  const word = String(manualGlossaryInput.value[group.id] || '').trim();
  if (!/^[A-Za-z][A-Za-z '\-’]*$/.test(word)) { message.value = '請輸入英文單字或片語。'; return; }
  const existing = (group.manualGlossaryEntries || []).some(item => item.word.toLocaleLowerCase() === word.toLocaleLowerCase());
  if (existing) { message.value = `「${word}」已在手動單字提示中。`; return; }
  addingGlossaryWord.value = group.id;
  try {
    let meaning = lookupVocabularyMeaning(word, allVocabulary.value);
    let translated = false;
    if (!meaning) {
      const response = await $fetch('/api/translate', { method: 'POST', body: { text: word } });
      meaning = String(response.translation || '').trim();
      translated = true;
    }
    if (!meaning) throw new Error('找不到中文釋義');
    group.manualGlossaryEntries ||= [];
    group.manualGlossaryEntries.push({ word, meaning });
    if (group.autoGlossary) detectGroupVocabulary(group);
    else group.glossary = [group.glossary.trim(), `${word} ${meaning}`].filter(Boolean).join('　');
    manualGlossaryInput.value[group.id] = '';
    message.value = `已加入「${word} ${meaning}」${translated ? '（自動翻譯，請核對中文）' : '（來自單字題庫）'}。`;
  } catch (error) { message.value = `「${word}」中文查詢失敗：${error.message}；請在下方單字提示欄自行填寫。`; }
  finally { addingGlossaryWord.value = ''; }
};

watch(referenceVocabLessons, () => {
  groups.value.filter(group => group.autoGlossary && group.passage).forEach(detectGroupVocabulary);
}, { deep: true });

const uniqueVocabulary = items => {
  const seen = new Set();
  return items.filter(item => {
    const en = item.en_us?.trim();
    const zh = item.zh_tw?.trim();
    if (!en || !zh || seen.has(en.toLowerCase())) return false;
    seen.add(en.toLowerCase());
    return true;
  });
};

const maskedExample = item => {
  const sentence = item.example_en?.trim() || '';
  if (!sentence) return '';
  const escaped = item.en_us.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blank = `${item.en_us.charAt(0)}${'_'.repeat(Math.max(4, item.en_us.length - 2))}${item.en_us.slice(-1)}`;
  const masked = sentence.replace(new RegExp(`\\b${escaped}[a-zA-Z]*\\b`, 'i'), blank);
  return masked === sentence ? `${sentence}（提示：${blank}）` : masked;
};

const translationSection = computed(() => nonChoice.value.sections.find(section => section.type === 'translation' || section.title === '翻譯填充'));
const refreshTranslation = () => {
  if (translationSection.value) translationSection.value.items = buildTranslationFill(translationSection.value.items, questionCounts.value.translationBlankWidth);
};
watch(() => questionCounts.value.translationBlankWidth, refreshTranslation);
const chooseBlank = (item, index) => {
  const selected = new Set(item.blankIndices || []);
  if (selected.has(index)) selected.delete(index);
  else selected.add(index);
  item.blankIndices = [...selected].sort((a, b) => a - b);
  refreshTranslation();
};
const makePastedTranslationItems = (forbidden = new Set()) => {
  const sentences = splitTranslationText(translationSourceText.value);
  if (!sentences.length) { message.value = '請先貼上英文課文或對話；可用「中文｜英文」逐行附上中文。'; return null; }
  const seen = new Set();
  const items = sentences.filter(item => {
    const key = item.sourceEn.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(item => ({ id: crypto.randomUUID(), ...item, blankIndices: translationMode.value === 'manual' ? [] : chooseTranslationBlanks(item.sourceEn, questionCounts.value.blanksPerSentence, forbidden) }));
  return buildTranslationFill(items, questionCounts.value.translationBlankWidth);
};
const updatePastedTranslation = () => {
  if (!translationSection.value) nonChoice.value.sections.push({ id: crypto.randomUUID(), type: 'translation', title: '翻譯填充', instructions: '', items: [] });
  const forbidden = new Set(nonChoice.value.vocabulary.map(item => String(item.answer || '').toLowerCase()));
  const items = makePastedTranslationItems(forbidden);
  if (!items) return;
  translationSection.value.items = items;
  questionCounts.value.translation = items.length;
  message.value = `已從貼上文字建立 ${items.length} 句；可逐字點選或取消空格。`;
};
const makeTranslationItems = (pool, count, blanksPerSentence, forbiddenWords) => {
  const items = Array.from({ length: count }, (_, index) => {
    const word = pool[index];
    const tokens = sentenceTokens(word.example_en);
    const available = tokens.map((token, tokenIndex) => ({ tokenIndex, key: token.toLowerCase().replace(/[^a-z]/g, '') })).filter(token => !forbiddenWords.has(token.key));
    const target = available.find(token => token.key === word.en_us.toLowerCase().replace(/[^a-z]/g, ''));
    const indexes = [target, ...available.filter(token => token !== target)].filter(Boolean).slice(0, blanksPerSentence).map(token => token.tokenIndex);
    return { id: crypto.randomUUID(), sourceEn: word.example_en, sourceZh: word.example_zh || '', blankIndices: indexes.sort((a, b) => a - b) };
  });
  return buildTranslationFill(items, questionCounts.value.translationBlankWidth);
};

const generateExam = async () => {
  message.value = '';
  const counts = questionCounts.value;
  if ([counts.grammar, counts.directVocab, counts.contextVocab, counts.translation, counts.blanksPerSentence, counts.translationBlankWidth].some(value => !Number.isInteger(Number(value)) || Number(value) < 0) || counts.blanksPerSentence < 1 || counts.translationBlankWidth < 1 || counts.translationBlankWidth > 8) {
    message.value = '題數必須是非負整數；每句空格數至少為 1，翻譯填空每側底線數需為 1～8。'; return;
  }
  const vocabPool = uniqueVocabulary(allVocabulary.value.filter(item => effectiveVocabLessons.value.includes(lessonKey(item))));
  const contextPool = shuffle(vocabPool.filter(item => item.example_en?.trim()));
  if (contextPool.length < counts.contextVocab || (translationMode.value === 'bank' && counts.translation > 0 && !contextPool.length)) {
    message.value = `所選範圍只有 ${contextPool.length} 個含英文例句的單字，不足以產生文意字彙或翻譯填充。`;
    return;
  }
  const contextItems = contextPool.slice(0, counts.contextVocab);
  const contextIds = new Set(contextItems.map(item => item.id));
  const directPool = shuffle(vocabPool.filter(item => !contextIds.has(item.id)));
  if (directPool.length < counts.directVocab) {
    message.value = `所選單字範圍不足，至少還需要 ${counts.directVocab} 個不重複單字。`;
    return;
  }
  const grammarPool = shuffle(allGrammar.value.filter(item => selectedGrammarLessons.value.includes(lessonKey(item)) && item.question_text));
  if (grammarPool.length < counts.grammar) {
    message.value = `所選文法範圍只有 ${grammarPool.length} 題，需要 ${counts.grammar} 題。`;
    return;
  }
  const directItems = directPool.slice(0, counts.directVocab);
  const usedWords = new Set([...directItems, ...contextItems].map(item => item.en_us.toLowerCase().replace(/[^a-z]/g, '')));
  const usedSentences = new Set(contextItems.map(item => item.example_en?.trim().toLowerCase()));
  const seenSentences = new Set();
  const translationPool = contextPool.filter(item => {
    const sentence = item.example_en?.trim().toLowerCase();
    if (!sentence || usedWords.has(item.en_us.toLowerCase().replace(/[^a-z]/g, '')) || usedSentences.has(sentence) || seenSentences.has(sentence)) return false;
    if (sentenceTokens(item.example_en).filter(token => !usedWords.has(token.toLowerCase().replace(/[^a-z]/g, ''))).length < counts.blanksPerSentence) return false;
    seenSentences.add(sentence);
    return true;
  });
  if (translationMode.value === 'bank' && translationPool.length < counts.translation) {
    message.value = `可用且不與單字題重複的例句只有 ${translationPool.length} 句，翻譯填充要求 ${counts.translation} 句；請增加單字課次或減少題數／每句空格數。`;
    return;
  }
  if (translationMode.value !== 'bank' && !splitTranslationText(translationSourceText.value).length) {
    message.value = '請先貼上英文課文或對話，再產生翻譯填充題。';
    return;
  }

  isGenerating.value = true;
  grammarQuestions.value = grammarPool.slice(0, counts.grammar).map((item, index) => ({
    id: `grammar-${item.id}`, number: index + 16, stem: item.question_text,
    choices: [item.option_1, item.option_2, item.option_3, item.option_4].map(value => value || ''),
    answer: Math.max(0, Math.min(3, Number(item.answer || 1) - 1))
  }));
  nonChoice.value.vocabulary = [
    ...directItems.map(item => ({ id: `direct-${item.id}`, prompt: item.zh_tw, answer: item.en_us })),
    ...contextItems.map(item => ({ id: `context-${item.id}`, prompt: maskedExample(item), answer: item.en_us }))
  ];
  let nextNumber = 16 + counts.grammar;
  groups.value.forEach(group => group.questions.forEach(question => { question.number = nextNumber++; }));
  if (!translationSection.value && (counts.translation > 0 || translationMode.value !== 'bank')) nonChoice.value.sections.push({ id: crypto.randomUUID(), type: 'translation', title: '翻譯填充', instructions: '', items: [] });
  if (translationSection.value) {
    const pasted = translationMode.value === 'bank' ? null : makePastedTranslationItems(usedWords);
    if (translationMode.value !== 'bank' && !pasted) { isGenerating.value = false; return; }
    translationSection.value.items = translationMode.value === 'bank'
      ? (counts.translation ? makeTranslationItems(translationPool, counts.translation, counts.blanksPerSentence, usedWords) : [])
      : pasted;
    if (pasted) questionCounts.value.translation = pasted.length;
  }
  generated.value = true;
  isGenerating.value = false;
  previewMode.value = 'question';
  await nextTick();
  message.value = `已產生 ${metadata.value.grade} 年級段考草稿；聽力圖片、閱讀、克漏字與非選擇題仍可繼續編輯。`;
};

const shuffleQuestionChoices = question => {
  const hasAnswer = Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.choices.length;
  const pairs = question.choices.map((choice, index) => ({ choice, image: question.choiceImages?.[index] || '', index, correct: index === question.answer }));
  let shuffled = shuffle(pairs);
  if (pairs.length > 1 && shuffled.every((item, index) => item.index === index)) shuffled = [...pairs.slice(1), pairs[0]];
  question.choices = shuffled.map(item => item.choice);
  if (question.choiceImages) question.choiceImages = shuffled.map(item => item.image);
  question.answer = hasAnswer ? shuffled.findIndex(item => item.correct) : -1;
};

const exchangeEveryChoice = () => {
  const questions = [...listening.value.image, ...listening.value.basic, ...listening.value.comprehension, ...grammarQuestions.value, ...groups.value.flatMap(group => group.questions)];
  questions.filter(question => question.choices?.length > 1).forEach(shuffleQuestionChoices);
  message.value = `已統一交換 ${questions.length} 題的選項，已設定的正確答案代號同步更新；未設定答案的匯入題仍維持未設定。`;
};

const shuffleAllChoices = () => {
  exchangeEveryChoice();
  variantNumber.value += 1;
  metadata.value.fileName = metadata.value.fileName.replace(/_補考版\d+$/, '') + `_補考版${variantNumber.value}`;
  message.value = `已產生補考版 ${variantNumber.value}：所有題幹保持不變，選項順序與正確答案代號已同步更新。`;
};
const clearGroupGlossary = group => {
  group.glossary = '';
  group.manualGlossaryEntries = [];
  group.detectedVocabulary = [];
  group.outOfScopeCount = 0;
  group.unknownWordCount = 0;
  group.autoGlossary = false;
  message.value = `已清除「${group.title}」的單字提示；需要時可按「重新檢測」。`;
};

const downloadSection = format => {
  const data = exportSectionData(interchangeCategory.value, grammarQuestions.value, groups.value);
  if (!data.items.length) { message.value = '這個類別目前沒有題目可匯出。'; return; }
  const content = format === 'csv' ? `\uFEFF${Papa.unparse(sectionCsvRows(data))}` : JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `段考${{ grammar: '文法選擇', cloze: '克漏字選擇', reading: '閱讀測驗' }[data.category]}.${format}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const extractPdfText = async file => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
  const pdf = await task.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(pdfTextToPlain(content.items, page.view[2] - page.view[0]));
  }
  await task.destroy();
  return pages.join('\n\n');
};

const selectImportFiles = (event, role) => {
  const files = Array.from(event.target.files || []);
  if (role === 'questions') questionImportFiles.value = files;
  else if (role === 'passage') passageImportFiles.value = [...passageImportFiles.value, ...files];
  else answerImportFiles.value = files;
  event.target.value = '';
};

const movePassageImportFile = (index, direction) => {
  const target = index + direction;
  if (target < 0 || target >= passageImportFiles.value.length) return;
  const files = [...passageImportFiles.value];
  [files[index], files[target]] = [files[target], files[index]];
  passageImportFiles.value = files;
};

const addImportScreenshots = async images => {
  if (!images.length) return;
  const named = images.map((file, index) => new File([file], `${screenshotPasteRole.value === 'passage' ? '主文' : '題目'}截圖-${Date.now()}-${index + 1}.${file.type === 'image/jpeg' ? 'jpg' : 'png'}`, { type: file.type }));
  if (screenshotPasteRole.value === 'passage' && interchangeCategory.value === 'reading') passageImportFiles.value = [...passageImportFiles.value, ...named];
  else questionImportFiles.value = [...questionImportFiles.value, ...named];
  if (!questionImportFiles.value.length) { message.value = `已加入 ${passageImportFiles.value.length} 張主文截圖；接著貼上題目與選項。`; return; }
  if (importingFile.value) { message.value = `已加入 ${images.length} 張截圖；目前解析完成後請再按「解析所選檔案」。`; return; }
  await importQuestionFiles();
};
const pasteImportScreenshot = async event => {
  const images = Array.from(event.clipboardData?.items || []).filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
  if (!images.length) images.push(...Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith('image/')));
  if (images.length) { event.preventDefault(); await addImportScreenshots(images); }
};
const pasteImportScreenshotButton = async () => {
  try {
    const entries = await navigator.clipboard.read();
    const images = await Promise.all(entries.map(async entry => {
      const type = entry.types.find(value => value.startsWith('image/'));
      return type ? await entry.getType(type) : null;
    }));
    if (!images.some(Boolean)) { message.value = '剪貼簿沒有圖片；可先截圖，再按「貼上並解析」。'; return; }
    await addImportScreenshots(images.filter(Boolean));
  } catch { message.value = '瀏覽器未允許讀取剪貼簿；請點選貼上區後按 Ctrl+V。'; }
};

let ocrWorker;
const extractImageText = async file => {
  if (!ocrWorker) {
    const { createWorker } = await import('tesseract.js');
    ocrWorker = await createWorker(['eng', 'chi_tra'], 1, { langPath: '/ocr', corePath: '/ocr/core', workerPath: '/ocr/worker.min.js', gzip: false });
  }
  const result = await ocrWorker.recognize(file);
  return result.data.text;
};

const readImportDocument = async file => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return extractPdfText(file);
  if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return extractImageText(file);
  if (extension === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const result = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  if (extension === 'csv' || extension === 'json') return file.text();
  throw new Error(`「${file.name}」格式不支援；請使用 CSV、JSON、PDF、DOCX 或圖片。`);
};

const importQuestionFiles = async () => {
  if (!questionImportFiles.value.length) { message.value = '請先選擇至少一份題目檔。'; return; }
  const allFiles = [...passageImportFiles.value, ...questionImportFiles.value, ...answerImportFiles.value];
  if (allFiles.length > 15 || allFiles.some(file => file.size > 20 * 1024 * 1024)) { message.value = '一次最多 15 個檔案，且每個檔案不得超過 20 MB。'; return; }
  importPreview.value = null;
  importedText.value = '';
  importingFile.value = true;
  try {
    const category = interchangeCategory.value;
    if (passageImportFiles.value.length && category !== 'reading') throw new Error('主文截圖僅用於閱讀測驗；請切換題型或移除主文截圖。');
    const items = [];
    const structuredItems = [];
    const answers = {};
    const conflicts = [];
    const unparsed = [];
    const passageTexts = [];
    const questionTexts = [];
    const addAnswers = found => Object.entries(found).forEach(([number, answer]) => {
      const letter = String(answer ?? '').normalize('NFKC').replace(/[()]/g, '').trim().toUpperCase();
      if (!/^[A-D]$/.test(letter) || !/^\d+$/.test(String(number))) return;
      if (answers[number] && answers[number] !== letter) conflicts.push(number);
      answers[number] = letter;
    });
    for (const file of allFiles) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const content = await readImportDocument(file);
      const isAnswerFile = answerImportFiles.value.includes(file);
      const isPassageFile = passageImportFiles.value.includes(file);
      if (isPassageFile) {
        if (!content.trim()) throw new Error(`「${file.name}」沒有辨識出主文文字；請檢查截圖清晰度。`);
        passageTexts.push(content);
        continue;
      }
      if (extension === 'json') {
        const data = JSON.parse(content);
        if (isAnswerFile || data.answers) {
          const answerItems = Array.isArray(data.items) ? data.items.flatMap(item => item.questions || [item]) : [];
          addAnswers(answerItems.length ? Object.fromEntries(answerItems.map(item => [item.sourceNumber || item.number, item.answer])) : data.answers || data);
        }
        else {
          if (data.category && data.category !== category) throw new Error(`「${file.name}」題型是 ${data.category}，請先切換匯入題型。`);
          const parsedItems = normalizeImportedItems(data, category);
          items.push(...parsedItems);
          structuredItems.push(...parsedItems);
        }
      } else if (extension === 'csv') {
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
        if (parsed.errors.length) throw new Error(`「${file.name}」：${parsed.errors[0].message}`);
        if (isAnswerFile) addAnswers(Object.fromEntries(parsed.data.map(row => [row.number, row.answer])));
        else {
          const parsedItems = csvRowsToSection(parsed.data, category);
          items.push(...parsedItems);
          structuredItems.push(...parsedItems);
        }
      } else {
        if (!content.trim()) throw new Error(`「${file.name}」沒有可選取的文字；掃描版 PDF 請先做 OCR。`);
        addAnswers(extractChoiceAnswerKey(content));
        if (!isAnswerFile) {
          questionTexts.push(content);
          if (category === 'reading' && passageImportFiles.value.length) continue;
          try { items.push(...parseDocumentQuestions(content, category)); }
          catch { unparsed.push(file.name); }
        }
      }
    }
    importedText.value = category === 'reading' && passageTexts.length ? joinReadingScreenshotText(passageTexts, questionTexts) : questionTexts.join('\n\n');
    if (category === 'reading' && passageTexts.length && questionTexts.length) {
      try { items.push(...parseReadingScreenshotText(importedText.value)); }
      catch { unparsed.push('主文與題目／選項截圖'); }
    }
    const appliedAnswers = applyChoiceAnswerKey(items, category, answers);
    importPreview.value = { category, items, structuredItems, fileName: allFiles.map(file => file.name).join('、'), answers, appliedAnswers, answerCount: Object.keys(answers).length, conflicts, unparsed };
    message.value = items.length
      ? `已解析 ${items.length} ${category === 'grammar' ? '題' : '組'}，並從解答取得 ${appliedAnswers} 題答案；請核對預覽再套用。`
      : '已讀取檔案，但未辨識出完整題目；請在下方整理題號與 A～D 選項後重新解析。';
  } catch (error) { message.value = `匯入失敗：${error.message}`; }
  finally {
    if (ocrWorker) { await ocrWorker.terminate(); ocrWorker = null; }
    importingFile.value = false;
  }
};

const reparseImportedText = () => {
  if (!importPreview.value || !importedText.value) return;
  try {
    importPreview.value.items = [...(importPreview.value.structuredItems || []), ...(importPreview.value.category === 'reading' && importedText.value.includes('【題目與選項截圖】') ? parseReadingScreenshotText(importedText.value) : parseDocumentQuestions(importedText.value, importPreview.value.category))];
    importPreview.value.appliedAnswers = applyChoiceAnswerKey(importPreview.value.items, importPreview.value.category, importPreview.value.answers);
    message.value = '已重新解析文字，請核對題目與答案。';
  } catch (error) { message.value = `重新解析失敗：${error.message}`; }
};

const importedQuestionCount = computed(() => importPreview.value?.category === 'grammar'
  ? importPreview.value.items.length
  : importPreview.value?.items.reduce((sum, group) => sum + group.questions.length, 0) || 0);
const missingImportedAnswers = computed(() => importPreview.value?.category === 'grammar'
  ? importPreview.value.items.filter(question => question.answer < 0).length
  : importPreview.value?.items.flatMap(group => group.questions).filter(question => question.answer < 0).length || 0);

const applyImportedQuestions = () => {
  const preview = importPreview.value;
  if (!preview?.items.length) return;
  const questionCount = importedQuestionCount.value;
  const unanswered = missingImportedAnswers.value;
  const questions = data => data.map(question => ({ ...question, id: crypto.randomUUID(), number: 0, choices: [...question.choices], choiceImages: [...(question.choiceImages || Array(question.choices.length).fill(''))] }));
  if (preview.category === 'grammar') {
    const additions = questions(preview.items);
    grammarQuestions.value = importMode.value === 'replace' ? additions : [...grammarQuestions.value, ...additions];
    grammarQuestions.value.forEach((question, index) => { question.number = index + 16; });
    questionCounts.value.grammar = grammarQuestions.value.length;
  } else {
    const oldGroups = groups.value.filter(group => group.type === preview.category);
    const oldPoints = oldGroups.map(group => Number(sectionPoints.value[group.id]) || 0);
    const additions = preview.items.map((item, index) => {
      const id = importMode.value === 'replace' ? oldGroups[index]?.id || crypto.randomUUID() : crypto.randomUUID();
      if (!(id in sectionPoints.value)) sectionPoints.value[id] = 0;
      return { id, type: preview.category, title: item.title, passage: item.passage, glossary: item.glossary,
        images: ['', ''], autoGlossary: !item.glossary, manualGlossaryEntries: [], outOfScopeCount: 0,
        unknownWordCount: 0, startNewPage: false, questions: questions(item.questions) };
    });
    if (importMode.value === 'replace') {
      const firstIndex = groups.value.findIndex(group => group.type === preview.category);
      groups.value = groups.value.filter(group => group.type !== preview.category);
      groups.value.splice(firstIndex < 0 ? groups.value.length : firstIndex, 0, ...additions);
      oldGroups.forEach(group => { if (!additions.some(item => item.id === group.id)) delete sectionPoints.value[group.id]; });
      if (additions.length) sectionPoints.value[additions[0].id] += oldPoints.slice(additions.length).reduce((sum, points) => sum + points, 0);
    } else groups.value.push(...additions);
    additions.filter(group => group.passage && group.autoGlossary).forEach(detectGroupVocabulary);
  }
  renumberGroups();
  generated.value = true;
  editorTab.value = preview.category === 'grammar' ? 'grammar' : 'groups';
  importPreview.value = null;
  importedText.value = '';
  passageImportFiles.value = [];
  questionImportFiles.value = [];
  answerImportFiles.value = [];
  message.value = `已${importMode.value === 'replace' ? '覆蓋' : '追加'} ${questionCount} 題；請核對 ${unanswered} 題未設定答案的題目及配分。`;
};
const renumberGroups = () => {
  let number = 16 + grammarQuestions.value.length;
  groups.value.forEach(group => group.questions.forEach(question => { question.number = number++; }));
};
const removeScoreSection = section => {
  if (!window.confirm(`確定刪除「${section.title}」及其題目？請先儲存草稿備份。`)) return;
  const groupIndex = groups.value.findIndex(group => group.id === section.id);
  if (groupIndex >= 0) groups.value.splice(groupIndex, 1);
  else {
    const writtenIndex = nonChoice.value.sections.findIndex(item => item.id === section.id);
    if (writtenIndex >= 0) nonChoice.value.sections.splice(writtenIndex, 1);
  }
  delete sectionPoints.value[section.id];
  renumberGroups();
};
const addWrittenSection = () => {
  const title = window.prompt('新增非選擇大題名稱');
  if (!title?.trim()) return;
  const id = crypto.randomUUID();
  nonChoice.value.sections.push({ id, type: 'written', title: title.trim(), instructions: '', items: [] });
  sectionPoints.value[id] = 0;
};
const addReadingGroup = () => {
  const id = crypto.randomUUID();
  groups.value.push({ id, type: 'reading', title: '閱讀測驗（新增題組）', passage: '', images: ['', ''], glossary: '', autoGlossary: true, outOfScopeCount: 0, unknownWordCount: 0, startNewPage: false, questions: [] });
  sectionPoints.value[id] = 0;
  renumberGroups();
};
const resizeScoreSection = (section, event) => {
  const wanted = Number(event.target.value);
  if (!Number.isInteger(wanted) || wanted < 0 || wanted > 100) return;
  const group = groups.value.find(item => item.id === section.id);
  const written = nonChoice.value.sections.find(item => item.id === section.id);
  const items = group?.questions || written?.items;
  if (!items) return;
  if (wanted < items.length && !window.confirm(`將刪除最後 ${items.length - wanted} 題，確定繼續？`)) { event.target.value = items.length; return; }
  while (items.length > wanted) items.pop();
  while (items.length < wanted) items.push(group ? makeQuestion(0) : written.type === 'translation'
    ? { id: crypto.randomUUID(), sourceEn: '', sourceZh: '', blankIndices: [], prompt: '', answer: '' }
    : { id: crypto.randomUUID(), prompt: '', answer: '' });
  if (written?.type === 'translation') questionCounts.value.translation = wanted;
  if (group) renumberGroups();
};

const readImage = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (file.type === 'image/png' || file.type === 'image/jpeg') { resolve(reader.result); return; }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const setChoiceImage = async (choice, file) => { if (file?.type.startsWith('image/')) choice.image = await readImage(file); };
const handleImageInput = async (event, choice) => { await setChoiceImage(choice, event.target.files?.[0]); event.target.value = ''; };
const clipboardImage = event => [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'))?.getAsFile()
  || [...(event.clipboardData?.files || [])].find(file => file.type.startsWith('image/'));
const focusImageSlot = event => {
  if (!event.target.closest('input, button, select, textarea')) event.currentTarget.focus();
};
const handleImagePaste = async (event, choice) => {
  const file = clipboardImage(event);
  if (file) { event.preventDefault(); await setChoiceImage(choice, file); }
};
const setQuestionChoiceImage = async (question, index, file) => {
  if (!file?.type.startsWith('image/')) return;
  if (!question.choiceImages) question.choiceImages = Array(question.choices.length).fill('');
  question.choiceImages[index] = await readImage(file);
};
const handleQuestionChoiceImageInput = async (event, question, index) => {
  await setQuestionChoiceImage(question, index, event.target.files?.[0]);
  event.target.value = '';
};
const handleQuestionChoiceImagePaste = async (event, question, index) => {
  const file = clipboardImage(event);
  if (file) { event.preventDefault(); await setQuestionChoiceImage(question, index, file); }
};
const setGroupImage = async (group, index, file) => {
  if (!file?.type.startsWith('image/')) return;
  if (!group.images) group.images = ['', ''];
  group.images[index] = await readImage(file);
};
const handleGroupImageInput = async (event, group, index) => {
  await setGroupImage(group, index, event.target.files?.[0]);
  event.target.value = '';
};
const handleGroupImagePaste = async (event, group, index) => {
  const file = clipboardImage(event);
  if (file) { event.preventDefault(); await setGroupImage(group, index, file); }
};

const exportWord = async mode => {
  if (answerLeaks.value.length && !window.confirm(`發現 ${answerLeaks.value.length} 處非選擇題答案出現在題目卷中。請先檢查下方「答案洩漏檢查」。仍要輸出嗎？`)) return;
  exporting.value = `${mode}-word`;
  try {
    const { downloadRegularExamWord } = await import('~/lib/regular-exam-export.client');
    await downloadRegularExamWord(examData.value, mode);
  } catch (error) { message.value = `Word 產生失敗：${error.message}`; }
  finally { exporting.value = ''; }
};
const exportPdf = async mode => {
  if (answerLeaks.value.length && !window.confirm(`發現 ${answerLeaks.value.length} 處非選擇題答案出現在題目卷中。請先檢查下方「答案洩漏檢查」。仍要輸出嗎？`)) return;
  exporting.value = `${mode}-pdf`;
  const previous = previewMode.value;
  try {
    previewMode.value = mode;
    await nextTick();
    const component = mode === 'answer' ? answerPreview.value : mode === 'blank' ? blankPreview.value : questionPreview.value;
    const { downloadRegularExamPdf } = await import('~/lib/regular-exam-export.client');
    await downloadRegularExamPdf(component.getPages(), examData.value, mode);
  } catch (error) { message.value = `PDF 產生失敗：${error.message}`; }
  finally { previewMode.value = previous; exporting.value = ''; }
};

const loadAllQuestionBankRows = async (table, columns) => {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from(table).select(columns).order('id').range(offset, offset + pageSize - 1);
    if (error) return { data: rows, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
};

onMounted(async () => {
  try { localDraftCount.value = JSON.parse(localStorage.getItem(draftStorageKey) || '[]').length; } catch { localDraftCount.value = 0; }
  resetBlueprint();
  const [vocabResult, grammarResult] = await Promise.all([
    loadAllQuestionBankRows('vocabularies', 'id,version,volume,unit,en_us,zh_tw,example_en,example_zh'),
    loadAllQuestionBankRows('grammar_questions', 'id,version,volume,unit,question_text,option_1,option_2,option_3,option_4,answer')
  ]);
  if (vocabResult.error || grammarResult.error) message.value = `題庫讀取失敗：${vocabResult.error?.message || grammarResult.error?.message}`;
  allVocabulary.value = vocabResult.data || [];
  allGrammar.value = grammarResult.data || [];
  isLoading.value = false;
});
</script>

<template>
  <AdminExamAccessGate v-if="!accessVerified" @verified="unlockExam" />
  <main v-else class="builder-page">
    <header class="page-header"><div><h1>📚 段考出題器</h1><p>依 B4 雙欄格式建立七、八、九年級題目卷及 A4 正確答案。</p></div><NuxtLink to="/admin">← 返回後台</NuxtLink></header>
    <p v-if="message" class="message">{{ message }}</p>

    <section class="panel draft-panel">
      <h2>資料庫草稿</h2><p>草稿保存在資料庫，可在其他裝置載入。</p>
      <input v-model="draftName" placeholder="草稿名稱，例如 115學年度八年級第一次段考"><button :disabled="!generated" @click="saveDraft">儲存目前草稿</button>
      <select v-model="selectedDraft"><option value="">建立新草稿／選擇已存草稿</option><option v-for="draft in draftList" :key="draft.id" :value="draft.id">{{ new Date(draft.updated_at).toLocaleDateString('zh-TW') }}｜{{ draft.name }}</option></select>
      <button :disabled="!selectedDraft" @click="loadDraft">載入草稿</button><button :disabled="!selectedDraft" class="danger-button" @click="deleteDraft">刪除草稿</button>
      <button v-if="localDraftCount" @click="importLocalDrafts">匯入本機舊草稿（{{ localDraftCount }}）</button>
    </section>

    <section class="panel">
      <h2>一、考卷資料與年級格式</h2>
      <div class="grade-picker"><button v-for="grade in ['7','8','9']" :key="grade" :class="{ active: metadata.grade === grade }" @click="metadata.grade = grade">{{ grade }} 年級<span>參考非選 {{ presets[grade].nonChoicePercent }}%</span></button></div>
      <div class="form-grid"><label>學校名稱<input v-model="metadata.schoolName"></label><label>學年度<input v-model="metadata.schoolYear"></label><label>學期<input v-model="metadata.semester"></label><label>第幾次定期評量<input v-model="metadata.examNumber"></label><label>下載檔名<input v-model="metadata.fileName"></label><label>正確答案字體（8～16 pt）<input v-model.number="metadata.answerFontSize" type="number" min="8" max="16" step="1"></label></div>
      <div class="score-settings">
        <label>選擇題比例<input v-model.number="scoring.choicePercent" type="number" min="0" max="100">%</label>
        <label>非選擇題比例<input v-model.number="scoring.nonChoicePercent" type="number" min="0" max="100">%</label>
        <span :class="{ invalid: scoringTotal !== 100 }">合計 {{ scoringTotal }}%{{ scoringTotal === 100 ? '' : '（請調整為 100%）' }}</span>
      </div>
      <p class="preset-note">年級題數僅為預設值，可在下方修改；閱讀／克漏字目前 {{ preset.readingCount + preset.clozeCount }} 題。B4 預覽會依內容流動排版。</p>
    </section>

    <section class="panel">
      <h2>二、選擇題庫範圍（皆可跨課多選）</h2>
      <div v-if="isLoading">讀取單字與文法題庫中…</div>
      <div v-else class="scope-columns">
        <div><div class="scope-heading"><h3>單字與例句</h3><span>已選 {{ selectedVocabCount }} 筆</span></div>
          <div class="vocab-scope-controls"><label><input v-model="vocabScopeMode" type="radio" value="manual">逐課勾選</label><label><input v-model="vocabScopeMode" type="radio" value="cumulative">累積範圍</label>
            <select v-if="vocabScopeMode === 'cumulative'" v-model="cumulativeVocabEnd"><option value="">選擇終點課次</option><option v-for="lesson in vocabLessons" :key="lesson.key" :value="lesson.key">{{ lesson.version }} {{ lesson.volume }} {{ lesson.unit }}</option></select>
          </div><p class="scope-note">{{ vocabScopeMode === 'cumulative' ? '出題與閱讀檢測皆從同版本 B1 起累積至指定課。' : '出題依勾選課次；閱讀檢測與參考單字從同版本 B1 起累積至最後選定課。' }}</p>
          <div class="lesson-grid"><label v-for="lesson in vocabLessons" :key="lesson.key" :class="{ selected: effectiveVocabLessons.includes(lesson.key) }"><input v-if="vocabScopeMode === 'manual'" v-model="selectedVocabLessons" type="checkbox" :value="lesson.key"><span><b>{{ lesson.version }} {{ lesson.volume }} {{ lesson.unit }}</b><small>{{ lesson.count }} 個單字</small></span></label></div></div>
        <div><div class="scope-heading"><h3>文法遊樂園題庫</h3><span>已選 {{ selectedGrammarCount }} 題</span></div><div class="lesson-grid"><label v-for="lesson in grammarLessons" :key="lesson.key" :class="{ selected: selectedGrammarLessons.includes(lesson.key) }"><input v-model="selectedGrammarLessons" type="checkbox" :value="lesson.key"><span><b>{{ lesson.version }} {{ lesson.volume }} {{ lesson.unit }}</b><small>{{ lesson.count }} 題</small></span></label></div></div>
      </div>
      <div class="count-controls"><label>文法選擇題 <input v-model.number="questionCounts.grammar" type="number" min="0"></label><label>中翻英單字題 <input v-model.number="questionCounts.directVocab" type="number" min="0"></label><label>文意字彙題 <input v-model.number="questionCounts.contextVocab" type="number" min="0"></label><label>翻譯填充句數 <input v-model.number="questionCounts.translation" type="number" min="0"></label><label>每句預設空格數 <input v-model.number="questionCounts.blanksPerSentence" type="number" min="1"></label><label>翻譯填空每側底線數 <input v-model.number="questionCounts.translationBlankWidth" type="number" min="1" max="8"></label></div>
      <div class="translation-source"><b>翻譯填充來源</b><label><input v-model="translationMode" type="radio" value="bank">單字例句題庫</label><label><input v-model="translationMode" type="radio" value="auto">貼上文字並自動挖空</label><label><input v-model="translationMode" type="radio" value="manual">貼上文字後親自點字挖空</label><textarea v-if="translationMode !== 'bank'" v-model="translationSourceText" rows="5" placeholder="貼上英文課文或對話；可用 中文｜English 逐行對照"></textarea></div>
      <button class="generate-btn" :disabled="isGenerating || ((questionCounts.directVocab || questionCounts.contextVocab || (translationMode === 'bank' && questionCounts.translation)) && !effectiveVocabLessons.length) || (questionCounts.grammar && !selectedGrammarLessons.length)" @click="generateExam">{{ isGenerating ? '產生中…' : generated ? '🎲 重新抽題' : '🎲 產生段考草稿' }}</button>
    </section>

    <section class="panel score-panel">
        <h2>大題配分</h2><p>只需輸入各大題總分，每小題平均分數自動計算。七年級內建配分依附圖：5、5、10、10、10、10、12、12、26。</p>
        <div class="preset-controls"><input v-model="scorePresetName" placeholder="配分範本名稱"><select v-model="selectedScorePreset" @change="scorePresetName = scorePresetList.find(row => row.id === selectedScorePreset)?.name || ''"><option value="">新範本</option><option v-for="row in scorePresetList" :key="row.id" :value="row.id">{{ row.is_default ? '★ 預設｜' : '' }}{{ row.name }}</option></select><button :disabled="!selectedScorePreset" @click="applyScorePreset(scorePresetList.find(row => row.id === selectedScorePreset))">載入範本</button><label><input v-model="scorePresetDefault" type="checkbox">設為本年級預設</label><button @click="saveScorePreset">儲存／更新範本</button><button :disabled="!selectedScorePreset" class="danger-button" @click="deleteScorePreset">刪除範本</button></div>
        <div v-for="section in sections" :key="section.id" class="score-section"><label><strong>{{ section.title }}</strong> <input v-model.number="sectionPoints[section.id]" type="number" min="0" step="0.01"> 分</label><span>{{ sectionSize(section) }} {{ section.id === translationSection?.id ? '格' : '題' }}；每{{ section.id === translationSection?.id ? '格' : '題' }}約 {{ perQuestion(section) }} 分</span><label v-if="groups.some(item => item.id === section.id) || nonChoice.sections.some(item => item.id === section.id)">題數 <input :value="section.items.length" type="number" min="0" max="100" @change="resizeScoreSection(section, $event)"></label><button v-if="groups.some(item => item.id === section.id) || nonChoice.sections.some(item => item.id === section.id)" class="danger-button" @click="removeScoreSection(section)">移除大題</button></div>
        <button @click="addReadingGroup">＋ 新增閱讀題組</button><button @click="addWrittenSection">＋ 新增非選擇大題</button>
        <p class="score-summary" :class="{ invalid: scoreDifference !== 0 || scoreWarnings.length }">大題總分 {{ scoreTotal }}／100 分；{{ scoreDifference > 0 ? `尚缺 ${scoreDifference} 分` : scoreDifference < 0 ? `超出 ${-scoreDifference} 分` : '總分 100 分' }}</p><p v-if="choiceScore !== Number(scoring.choicePercent) || writtenScore !== Number(scoring.nonChoicePercent)" class="score-warning">⚠ 目前選擇題 {{ choiceScore }} 分／非選擇題 {{ writtenScore }} 分，與上方設定的 {{ scoring.choicePercent }}／{{ scoring.nonChoicePercent }} 不一致。</p><p v-for="warning in scoreWarnings" :key="warning" class="score-warning">⚠ {{ warning }}</p><button @click="allocateScores">依選擇題／非選擇題比例重新分配</button>
    </section>
    <section class="panel interchange-panel">
      <h2>題目匯入／匯出</h2>
      <p>文法以單題、克漏字和閱讀以題組處理。CSV／JSON 可往返編輯；PDF／Word（.docx）會擷取文字；截圖會先辨識英文與中文，再嘗試拆分題目。題目中的圖片可在匯入後貼上。</p>
      <div class="interchange-controls"><label>題型<select v-model="interchangeCategory"><option value="grammar">文法選擇（單題）</option><option value="cloze">克漏字選擇（題組）</option><option value="reading">閱讀測驗（題組）</option></select></label><button type="button" @click="downloadSection('csv')">匯出 CSV</button><button type="button" @click="downloadSection('json')">匯出 JSON</button><label>匯入方式<select v-model="importMode"><option value="replace">覆蓋此題型</option><option value="append">追加到此題型</option></select></label><label v-if="interchangeCategory === 'reading'" class="file-import">主文截圖（可多選，{{ passageImportFiles.length }} 份）<input type="file" multiple accept="image/png,image/jpeg,image/webp" :disabled="importingFile" @change="selectImportFiles($event,'passage')"></label><label class="file-import">題目／選項檔或截圖（可多選，{{ questionImportFiles.length }} 份）<input type="file" multiple accept=".csv,.json,.pdf,.docx,image/png,image/jpeg,image/webp" :disabled="importingFile" @change="selectImportFiles($event,'questions')"></label><label class="file-import">解答檔或截圖（可多選，{{ answerImportFiles.length }} 份）<input type="file" multiple accept=".csv,.json,.pdf,.docx,image/png,image/jpeg,image/webp" :disabled="importingFile" @change="selectImportFiles($event,'answers')"></label><button type="button" :disabled="importingFile || !questionImportFiles.length" @click="importQuestionFiles">{{ importingFile ? '辨識與解析中…' : '解析所選檔案' }}</button></div>
      <div class="screenshot-paste-zone" tabindex="0" @click="focusImageSlot" @paste="pasteImportScreenshot"><b>貼上截圖</b><label v-if="interchangeCategory === 'reading'">這張是<select v-model="screenshotPasteRole"><option value="passage">主文（可依序貼 2–3 張）</option><option value="questions">題目與選項</option></select></label><span>點此後按 Ctrl+V；貼上題目後自動解析</span><button type="button" :disabled="importingFile" @click="pasteImportScreenshotButton">從剪貼簿貼上</button></div>
      <div v-if="interchangeCategory === 'reading' && passageImportFiles.length" class="passage-import-order"><b>主文拼接順序</b><div v-for="(file,index) in passageImportFiles" :key="index"><span>{{ index + 1 }}. {{ file.name }}</span><button type="button" :disabled="index === 0 || importingFile" @click="movePassageImportFile(index,-1)">上移</button><button type="button" :disabled="index === passageImportFiles.length - 1 || importingFile" @click="movePassageImportFile(index,1)">下移</button><button type="button" :disabled="importingFile" @click="passageImportFiles.splice(index,1)">移除</button></div></div>
      <p class="scope-note">閱讀主文可分 2–3 張依序貼上，再貼題目與選項截圖；系統依上方順序合併為同一題組。圖片選項可在套用後逐一貼上。重新解析文字時請保留「【題目與選項截圖】」分隔標記。</p><div v-if="questionImportFiles.length || answerImportFiles.length" class="interchange-controls"><button v-if="questionImportFiles.length" type="button" :disabled="importingFile" @click="questionImportFiles = []">清空題目截圖／檔案</button><button v-if="answerImportFiles.length" type="button" :disabled="importingFile" @click="answerImportFiles = []">清空解答檔案</button></div>
      <div v-if="importPreview" class="import-preview"><h3>匯入預覽：{{ importPreview.fileName }}</h3><p>辨識 {{ importPreview.items.length }} {{ importPreview.category === 'grammar' ? '題' : '組' }}、共 {{ importedQuestionCount }} 題；解答表辨識 {{ importPreview.answerCount }} 筆、套用 {{ importPreview.appliedAnswers }} 題，{{ missingImportedAnswers }} 題答案未設定。</p><p v-if="importPreview.unparsed.length" class="scope-warning">未辨識題目：{{ importPreview.unparsed.join('、') }}。請檢查下方擷取文字。</p><p v-if="importPreview.conflicts.length" class="scope-warning">解答檔有互相矛盾的題號：{{ importPreview.conflicts.join('、') }}；請人工核對。</p>
        <template v-if="importedText"><label>擷取文字（可修改題號、文章及 A～D 選項後重新解析）<textarea v-model="importedText" rows="10"></textarea></label><button type="button" @click="reparseImportedText">重新解析文字</button></template>
        <div class="import-preview-list"><template v-if="importPreview.category === 'grammar'"><p v-for="(question,index) in importPreview.items" :key="index"><b>{{ question.sourceNumber || index + 1 }}. {{ question.stem }}</b>　A {{ question.choices[0] }}／B {{ question.choices[1] }}／C {{ question.choices[2] }}／D {{ question.choices[3] }}　答案：{{ labels[question.answer] || '未設定' }}</p></template><article v-else v-for="(group,index) in importPreview.items" :key="index"><h4>{{ group.title }}（{{ group.questions.length }} 題）</h4><p>{{ group.passage || '（未辨識出文章，套用後可手動貼上）' }}</p><p v-for="(question,qIndex) in group.questions" :key="qIndex"><b>{{ question.sourceNumber || qIndex + 1 }}. {{ question.stem }}</b><span v-for="(choice,choiceIndex) in question.choices" :key="choiceIndex" class="import-choice">（{{ labels[choiceIndex] }}）{{ choice }}<img v-if="question.choiceImages?.[choiceIndex]" :src="question.choiceImages[choiceIndex]" :alt="`選項 ${labels[choiceIndex]} 圖片`"></span>　答案：{{ labels[question.answer] || '未設定' }}</p></article></div>
        <button type="button" :disabled="!importedQuestionCount" @click="applyImportedQuestions">確認{{ importMode === 'replace' ? '覆蓋' : '追加' }} {{ importedQuestionCount }} 題</button><button type="button" @click="importPreview = null; importedText = ''; passageImportFiles = []; questionImportFiles = []; answerImportFiles = []">取消</button>
      </div>
    </section>
    <template v-if="generated">
      <section class="panel action-panel"><div><h2>三、預覽與輸出</h2><div class="preview-tabs"><button v-for="mode in [{id:'question',name:'B4 題目卷'},{id:'answer',name:'A4 正確答案'},{id:'blank',name:'A4 空白答案卷'}]" :key="mode.id" :class="{ active: previewMode === mode.id }" @click="previewMode = mode.id">{{ mode.name }}</button></div></div><div class="action-buttons"><button @click="exchangeEveryChoice">🔀 全部選擇題交換選項</button><button class="makeup" @click="shuffleAllChoices">產生補考版</button><button v-for="mode in [{id:'question',name:'題目卷'},{id:'answer',name:'正確答案'},{id:'blank',name:'空白答案卷'}]" :key="mode.id" :disabled="Boolean(exporting)" @click="exportWord(mode.id)">{{ mode.name }} Word</button><button v-for="mode in [{id:'question',name:'題目卷'},{id:'answer',name:'正確答案'},{id:'blank',name:'空白答案卷'}]" :key="mode.id+'pdf'" :disabled="Boolean(exporting)" @click="exportPdf(mode.id)">{{ mode.name }} PDF</button></div></section>

      <section class="preview-panel"><div class="preview-scroll"><AdminRegularExamSheet v-show="previewMode === 'question'" ref="questionPreview" :data="examData" /><AdminRegularExamSheet v-show="previewMode === 'answer'" ref="answerPreview" :data="examData" answer-mode /><AdminRegularExamSheet v-show="previewMode === 'blank'" ref="blankPreview" :data="examData" blank-mode /></div></section>

      <section class="panel leak-panel" :class="{ 'has-leaks': answerLeaks.length }"><h2>非選擇題答案洩漏檢查</h2><p v-if="!answerLeaks.length">目前未發現非選擇題的正確答案直接出現在題目卷文字中。</p><template v-else><p>發現 {{ answerLeaks.length }} 處可能洩漏，請逐項核對文章、題幹、選項與單字提示。此檢查只比對文字，圖片及同義改寫仍需人工確認。</p><ul><li v-for="(leak,index) in answerLeaks.slice(0, 50)" :key="`${leak.item}-${leak.location}-${index}`"><b>{{ leak.item }}</b> 的答案「{{ leak.answer }}」出現在 {{ leak.location }}</li></ul><p v-if="answerLeaks.length > 50">另有 {{ answerLeaks.length - 50 }} 處；請先修正以上內容再檢查。</p></template></section>

      <section class="panel editor-panel">
        <h2>四、編輯全部考卷內容</h2>
        <div class="editor-tabs"><button v-for="tab in [{id:'listening',name:'🎧 聽力'},{id:'grammar',name:'🎡 文法'},{id:'groups',name:'📖 閱讀／克漏字'},{id:'written',name:'✍️ 非選擇題'}]" :key="tab.id" :class="{ active: editorTab === tab.id }" @click="editorTab = tab.id">{{ tab.name }}</button></div>

        <div v-if="editorTab === 'listening'" class="editor-content">
          <h3>辨識句意圖片題（可貼上剪貼簿圖片或選擇檔案）</h3>
          <div v-for="question in listening.image" :key="question.id" class="question-editor image-editor"><b>第 {{ question.number }} 題</b><label>正確答案<select v-model.number="question.answer"><option v-for="(label,index) in labels.slice(0,3)" :key="label" :value="index">{{ label }}</option></select></label><button @click="shuffleQuestionChoices(question)">交換本題選項</button><div class="image-options"><div v-for="(choice,index) in question.choices" :key="index" class="image-upload" tabindex="0" @click="focusImageSlot" @paste="handleImagePaste($event,choice)"><b>({{ labels[index] }})</b><input v-model="choice.text" placeholder="選項文字"><img v-if="choice.image" :src="choice.image" alt="選項圖片"><span v-else>點此後按 Ctrl+V 貼上圖片</span><input type="file" accept="image/*" @change="handleImageInput($event,choice)"><button v-if="choice.image" @click="choice.image = ''">移除圖片</button></div></div></div>
          <h3>基本問答</h3><div v-for="question in listening.basic" :key="question.id" class="question-editor"><div class="question-top"><b>{{ question.number }}.</b><input v-model="question.stem" placeholder="可貼上題目及 A～C 選項，自動拆分" @paste="handleQuestionPaste($event, question)"><select v-model.number="question.answer"><option v-for="(label,index) in labels.slice(0,3)" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]"></label></div></div>
          <h3>言談理解</h3><div v-for="question in listening.comprehension" :key="question.id" class="question-editor"><div class="question-top"><b>{{ question.number }}.</b><input v-model="question.stem" placeholder="可貼上題目及 A～C 選項，自動拆分" @paste="handleQuestionPaste($event, question)"><select v-model.number="question.answer"><option v-for="(label,index) in labels.slice(0,3)" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]"></label></div></div>
        </div>

        <div v-else-if="editorTab === 'grammar'" class="editor-content"><p>以下題目來自文法遊樂園，可逐題修改或交換選項。將「題幹＋A、B、C、D 四個選項」整段貼入題幹欄，系統會自動拆分。</p><div v-for="question in grammarQuestions" :key="question.id" class="question-editor"><div class="question-top"><b>{{ question.number }}.</b><textarea v-model="question.stem" placeholder="貼上完整題目與四個選項，可自動拆分" @paste="handleQuestionPaste($event, question)"></textarea><select v-model.number="question.answer"><option :value="-1">答案未設定</option><option v-for="(label,index) in labels" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]"></label></div></div></div>

        <div v-else-if="editorTab === 'groups'" class="editor-content">
          <p>題組會依內容長度自動流入下一欄或下一頁；每一小題不會被拆開。文章／對話會以虛線框區隔。貼上文章後，系統會依上方所選課次自動找出範圍外單字，並從完整單字庫帶入中文。</p>
          <article v-for="group in groups" :key="group.id" class="group-editor">
            <div class="group-layout-row"><input v-model="group.title" class="group-title"><label><input v-model="group.startNewPage" type="checkbox"> 此題組前強制換頁</label></div>
            <label>文章／對話<textarea v-model="group.passage" class="passage-editor" rows="10" placeholder="貼上閱讀文章或對話；段落之間空一行，預覽與匯出會在每段首行縮排" @input="scheduleGroupVocabularyDetection(group)"></textarea></label><small>段落間空一行；同一段內換行會保留。每段第一行在題目卷預覽、Word 與 PDF 中縮排。</small>
            <div class="reading-image-editor">
              <b>閱讀圖片（最多兩張）</b>
              <div class="reading-image-slots"><div v-for="index in 2" :key="index" class="image-upload" tabindex="0" @click="focusImageSlot" @paste="handleGroupImagePaste($event, group, index - 1)">
                <b>圖片 {{ index }}</b><img v-if="group.images?.[index - 1]" :src="group.images[index - 1]" alt="閱讀圖片預覽"><span v-else>點此後按 Ctrl+V 貼上圖片</span>
                <input type="file" accept="image/*" @change="handleGroupImageInput($event, group, index - 1)">
                <button v-if="group.images?.[index - 1]" type="button" @click="group.images[index - 1] = ''">移除圖片</button>
              </div></div>
            </div>
            <div class="glossary-heading"><b>單字提示</b><span v-if="group.outOfScopeCount || group.unknownWordCount">範圍外 {{ group.outOfScopeCount }} 個<span v-if="group.unknownWordCount">／題庫外待確認 {{ group.unknownWordCount }} 個</span></span><button type="button" @click="vocabularyReferenceGroup = vocabularyReferenceGroup === group.id ? '' : group.id">{{ vocabularyReferenceGroup === group.id ? '收起' : '查看' }} B1 起累積單字（{{ inScopeVocabulary.length }}）</button><button type="button" @click="detectGroupVocabulary(group)">🔍 重新檢測單字範圍</button><button v-if="group.glossary || group.detectedVocabulary?.length" type="button" @click="clearGroupGlossary(group)">清除全部單字提示</button></div>
            <div v-if="vocabularyReferenceGroup === group.id" class="vocabulary-reference"><label>搜尋範圍內單字<input v-model="vocabularyReferenceSearch" placeholder="英文、中文、版本、冊或課"></label><p>顯示 {{ visibleReferenceVocabulary.length }}／{{ inScopeVocabulary.length }} 筆；從同版本 B1 起依冊、課排列，直到本次所選的最後一課。</p><p v-if="missingFirstBook.length" class="scope-warning">{{ missingFirstBook.join('、') }} 的 B1 題庫尚未載入，無法列出完整的累積範圍。</p><div class="vocabulary-reference-list"><section v-for="lesson in referenceVocabularyGroups" :key="lesson.key"><h4>{{ lesson.version }} {{ lesson.volume }} {{ lesson.unit }}（{{ lesson.items.length }}）</h4><div class="vocabulary-reference-words"><div v-for="item in lesson.items" :key="item.word"><b>{{ item.word }}</b><span>{{ item.meaning || '（未填中文）' }}</span></div></div></section></div></div>
            <div v-if="group.detectedVocabulary?.length" class="detected-vocabulary"><b>範圍外及題庫外待確認單字／片語：</b><span v-for="item in group.detectedVocabulary" :key="item.normalized">{{ item.word }}{{ item.meaning ? `（${item.meaning}）` : '（題庫外，請人工確認）' }}</span></div>
            <div class="manual-glossary-control"><label>手動加入單字提示<input v-model="manualGlossaryInput[group.id]" placeholder="輸入英文單字或片語" @keyup.enter="addManualGlossaryWord(group)"></label><button type="button" :disabled="addingGlossaryWord === group.id" @click="addManualGlossaryWord(group)">{{ addingGlossaryWord === group.id ? '查詢中文中…' : '查中文並加入' }}</button><small>先查單字題庫；查不到時自動翻譯，加入後可在下方修改中文。</small></div>
            <textarea v-model="group.glossary" rows="3" placeholder="自動產生後仍可人工增刪或修改中文" @input="editGlossaryManually(group)"></textarea><small v-if="!group.autoGlossary" class="manual-note">目前為人工編輯模式；按「重新檢測」可恢復自動結果。</small>
            <div v-for="question in group.questions" :key="question.id" class="question-editor"><div class="question-top"><b class="editor-question-number">{{ question.number }}.</b><textarea v-model="question.stem" placeholder="貼上完整題目與四個選項，可自動拆分" @paste="handleQuestionPaste($event, question)"></textarea><select v-model.number="question.answer"><option :value="-1">答案未設定</option><option v-for="(label,index) in labels" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]" placeholder="選項文字（可留空，改用圖片）"></label></div><div v-if="group.type === 'reading'" class="choice-image-slots"><div v-for="(_,index) in question.choices" :key="index" class="image-upload" tabindex="0" @click="focusImageSlot" @paste="handleQuestionChoiceImagePaste($event, question, index)"><b>選項 {{ labels[index] }} 圖片</b><img v-if="question.choiceImages?.[index]" :src="question.choiceImages[index]" :alt="`選項 ${labels[index]} 圖片`"><span v-else>點此按 Ctrl+V 貼上圖片</span><input type="file" accept="image/*" @change="handleQuestionChoiceImageInput($event, question, index)"><button v-if="question.choiceImages?.[index]" type="button" @click="question.choiceImages[index] = ''">移除圖片</button></div></div></div>
          </article>
        </div>

        <div v-else class="editor-content"><h3>單字與文意字彙</h3><div class="written-grid"><div v-for="(item,index) in nonChoice.vocabulary" :key="item.id"><b>{{ index + 1 }}</b><textarea v-model="item.prompt" placeholder="題目"></textarea><input v-model="item.answer" placeholder="答案"></div></div>
          <article v-for="section in nonChoice.sections" :key="section.id" class="written-editor"><input v-model="section.title" class="group-title"><textarea v-model="section.instructions" placeholder="作答說明或共同題幹"></textarea>
            <template v-if="section.type === 'translation' || section.title === '翻譯填充'">
              <div class="translation-source"><b>翻譯填充來源</b><label><input v-model="translationMode" type="radio" value="bank">單字例句題庫</label><label><input v-model="translationMode" type="radio" value="auto">貼上課文／對話，自動挖空</label><label><input v-model="translationMode" type="radio" value="manual">貼上課文／對話，親自點字挖空</label>
                <template v-if="translationMode !== 'bank'"><textarea v-model="translationSourceText" rows="7" placeholder="每行一句或一段英文；可用 中文｜English 逐行貼上中文與英文"></textarea><button type="button" @click="updatePastedTranslation">從貼上文字建立／重建翻譯題</button></template>
              </div>
              <p>例句與中文可編輯；點擊英文單字可切換空格，系統會重新編排格號與答案。</p><label class="translation-blank-control">全卷翻譯填空每側底線數（1～8）<input v-model.number="questionCounts.translationBlankWidth" type="number" min="1" max="8"></label>
              <div v-for="(item,index) in section.items" :key="item.id" class="translation-editor"><b>第 {{ index + 1 }} 句</b><label>英文例句<textarea v-model="item.sourceEn" @change="refreshTranslation"></textarea></label><label>中文翻譯<input v-model="item.sourceZh" @change="refreshTranslation"></label><div class="token-list"><button v-for="(token,tokenIndex) in sentenceTokens(item.sourceEn)" :key="tokenIndex" type="button" :class="{ selected: item.blankIndices?.includes(tokenIndex) }" @click="chooseBlank(item,tokenIndex)">{{ token }}</button></div><small>目前 {{ item.blankIndices?.length || 0 }} 格；格號：{{ item.answer }}</small></div>
            </template><div v-else class="written-grid"><div v-for="(item,index) in section.items" :key="item.id"><b>{{ index + 1 }}</b><textarea v-model="item.prompt" placeholder="題目"></textarea><input v-model="item.answer" placeholder="正確答案"></div></div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.count-controls{display:flex;flex-wrap:wrap;gap:12px;margin-top:15px}.count-controls label{display:flex;align-items:center;gap:5px;font-weight:700}.count-controls input{width:65px;padding:6px}.score-warning{color:#b91c1c;font-weight:700}.translation-editor{padding:12px;border:1px solid #cbd5e1;border-radius:8px}.translation-editor label{display:grid;gap:4px;margin:8px 0}.translation-editor textarea,.translation-editor input{width:100%;box-sizing:border-box;padding:8px}.token-list{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}.token-list button{padding:5px 9px;border:1px solid #94a3b8;border-radius:5px;background:#fff;cursor:pointer}.token-list button.selected{border-color:#1d4ed8;background:#dbeafe;color:#1d4ed8;font-weight:800}
.draft-panel{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.draft-panel h2,.draft-panel p{width:100%;margin:0}.draft-panel input,.draft-panel select{min-width:220px;flex:1;padding:9px}.draft-panel button,.score-panel button{padding:9px;cursor:pointer}.score-section{padding:10px;border-bottom:1px solid #cbd5e1}.score-section>label{display:inline-flex;align-items:center;gap:8px}.score-section input{width:65px;padding:5px}.score-section>span{margin-left:12px}.score-items{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.score-items label{padding:5px;background:#eff6ff}.score-summary{font-weight:800;color:#15803d}.score-panel .invalid{color:#b91c1c}
.builder-page{min-height:100vh;padding:24px;background:#eef2f7;color:#1e293b;font-family:system-ui,'Noto Sans TC',sans-serif}.page-header,.panel,.preview-panel{max-width:1500px;margin:0 auto 18px}.page-header{display:flex;justify-content:space-between;gap:20px}.page-header h1{margin:0;color:#1d4ed8}.page-header p{margin:5px 0;color:#64748b}.page-header a{height:max-content;padding:10px 15px;border-radius:8px;background:#1e3a8a;color:white;text-decoration:none;font-weight:800}.message{max-width:1470px;margin:0 auto 15px;padding:12px 15px;border-left:5px solid #2563eb;background:#dbeafe}.panel{box-sizing:border-box;padding:18px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;box-shadow:0 3px 14px #0f172a12}.panel h2{margin:0 0 12px;color:#1e3a8a}.grade-picker{display:flex;gap:10px;margin-bottom:14px}.grade-picker button{display:flex;flex-direction:column;min-width:150px;padding:12px;border:2px solid #cbd5e1;border-radius:9px;background:white;font-size:1.1rem;font-weight:900;cursor:pointer}.grade-picker button span{font-size:.8rem;color:#64748b}.grade-picker button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.form-grid{display:grid;grid-template-columns:2fr repeat(3,1fr) 2.5fr;gap:10px}.form-grid label{display:grid;gap:4px;font-size:.85rem;font-weight:800}.form-grid input,.score-settings input,.question-editor input,.question-editor select,.question-editor textarea,.group-editor textarea,.group-title,.written-editor textarea,.written-grid textarea,.written-grid input,.image-upload input{box-sizing:border-box;width:100%;padding:8px;border:1px solid #94a3b8;border-radius:7px;font:inherit}.score-settings{display:flex;align-items:end;gap:12px;margin-top:13px}.score-settings label{display:grid;grid-template-columns:auto 80px auto;align-items:center;gap:6px;font-weight:800}.score-settings span{padding:8px 10px;border-radius:7px;background:#dcfce7;color:#166534;font-weight:900}.score-settings span.invalid{background:#fee2e2;color:#b91c1c}.preset-note{margin-bottom:0;padding:9px;background:#f1f5f9}.scope-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.scope-heading{display:flex;justify-content:space-between;align-items:center}.scope-heading h3{margin:0}.scope-heading span{color:#1d4ed8;font-weight:800}.lesson-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:6px;max-height:270px;overflow:auto;margin-top:8px;padding:3px}.lesson-grid label{display:flex;gap:7px;align-items:center;padding:8px;border:2px solid #cbd5e1;border-radius:8px;cursor:pointer}.lesson-grid label.selected{border-color:#2563eb;background:#eff6ff}.lesson-grid span{display:grid}.lesson-grid small{color:#64748b}.generate-btn{width:100%;margin-top:15px;padding:13px;border:0;border-radius:9px;background:#2563eb;color:white;font-size:1.05rem;font-weight:900;cursor:pointer}.generate-btn:disabled{opacity:.5}.action-panel{display:flex;justify-content:space-between;gap:15px}.preview-tabs,.action-buttons,.editor-tabs{display:flex;gap:8px;flex-wrap:wrap}.preview-tabs button,.action-buttons button,.editor-tabs button,.question-editor button{padding:9px 11px;border:1px solid #64748b;border-radius:7px;background:#fff;font-weight:800;cursor:pointer}.preview-tabs button.active,.editor-tabs button.active{background:#1e3a8a;color:#fff}.action-buttons{justify-content:flex-end}.action-buttons .makeup{background:#f97316;color:white;border-color:#c2410c}.preview-panel{padding:18px;border-radius:14px;background:#475569;overflow:hidden}.preview-scroll{overflow:auto;max-height:850px}.preview-scroll :deep(.regular-exam-page){box-shadow:0 6px 25px #0f172a99}.editor-tabs{margin-bottom:14px}.editor-content{display:grid;gap:10px}.question-editor{padding:12px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc}.question-top{display:grid;grid-template-columns:45px 1fr 120px 110px;gap:8px;align-items:start}.question-top textarea{min-height:50px}.choice-inputs{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:8px}.choice-inputs label{display:grid;grid-template-columns:22px 1fr;align-items:center;font-weight:800}.image-editor>label{display:inline-flex;gap:6px;margin:0 8px}.image-options{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:9px}.image-upload{display:grid;gap:6px;padding:9px;border:2px dashed #94a3b8;border-radius:8px;background:white}.image-upload:focus{border-color:#2563eb}.image-upload img{width:100%;height:145px;object-fit:contain;background:#f1f5f9}.image-upload>span{display:grid;place-items:center;height:145px;color:#64748b;background:#f1f5f9}.group-editor,.written-editor{display:grid;gap:9px;padding:14px;border:2px solid #cbd5e1;border-radius:10px}.group-layout-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px}.group-layout-row>label{display:flex;align-items:center;gap:6px;white-space:nowrap;font-weight:800}.group-layout-row input[type=checkbox]{width:auto}.group-title{font-size:1.15rem;font-weight:900;color:#1d4ed8}.written-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.written-grid>div{display:grid;grid-template-columns:35px 1.5fr 1fr;gap:6px;align-items:start;padding:8px;border:1px solid #e2e8f0;border-radius:7px}.written-grid textarea{min-height:58px}@media(max-width:1000px){.form-grid,.scope-columns{grid-template-columns:1fr 1fr}.action-panel,.page-header{flex-direction:column}.question-top{grid-template-columns:40px 1fr}.choice-inputs,.written-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.builder-page{padding:10px}.form-grid,.scope-columns,.choice-inputs,.written-grid,.image-options{grid-template-columns:1fr}.grade-picker{display:grid;grid-template-columns:repeat(3,1fr)}.grade-picker button{min-width:0}.score-settings{align-items:stretch;flex-direction:column}.group-layout-row{grid-template-columns:1fr}.written-grid>div{grid-template-columns:30px 1fr}.written-grid input{grid-column:2}}
.passage-editor{border:2px dashed #64748b!important;background:#fff}.glossary-heading{display:flex;align-items:center;gap:10px}.glossary-heading>span{margin-left:auto;color:#b45309;font-weight:800}.glossary-heading button{padding:7px 10px;border:1px solid #2563eb;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-weight:800;cursor:pointer}.manual-note{color:#b45309}.editor-question-number{display:grid;place-items:center;min-height:42px;border-radius:7px;background:#1e3a8a;color:#fff;font-size:1.08rem}@media(max-width:650px){.glossary-heading{align-items:stretch;flex-direction:column}.glossary-heading>span{margin-left:0}}
.reading-image-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:8px}.reading-image-editor> b{color:#1e3a8a}@media(max-width:650px){.reading-image-slots{grid-template-columns:1fr}}
.choice-image-slots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:9px}.choice-image-slots .image-upload img,.choice-image-slots .image-upload>span{height:100px}.screenshot-paste-zone{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0;padding:14px;border:2px dashed #3b82f6;border-radius:9px;background:#eff6ff}.screenshot-paste-zone:focus{outline:3px solid #1d4ed8}.screenshot-paste-zone span{color:#475569}.screenshot-paste-zone button{margin-left:auto}@media(max-width:650px){.choice-image-slots{grid-template-columns:repeat(2,minmax(0,1fr))}}
.import-choice{display:inline-flex;align-items:center;gap:4px;margin:3px 8px 3px 0}.import-choice img{max-width:100px;max-height:70px;object-fit:contain}
.passage-import-order{display:grid;gap:6px;margin:8px 0;padding:10px;border:1px solid #bfdbfe;border-radius:8px}.passage-import-order>div{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.passage-import-order span{flex:1;min-width:160px}
.vocab-scope-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px}.vocab-scope-controls label{display:flex;align-items:center;gap:4px;font-weight:700}.vocab-scope-controls select{max-width:100%;padding:7px;border:1px solid #94a3b8;border-radius:6px}.scope-note{margin:6px 0;color:#475569;font-size:.85rem}
.leak-panel{border-color:#86efac;background:#f0fdf4}.leak-panel.has-leaks{border-color:#fca5a5;background:#fff1f2}.leak-panel h2{color:#166534}.leak-panel.has-leaks h2{color:#b91c1c}.leak-panel p{margin:5px 0}.leak-panel ul{max-height:220px;overflow:auto;margin:8px 0;padding-left:22px}.leak-panel li{margin:5px 0}.vocabulary-reference{padding:10px;border:1px solid #93c5fd;border-radius:8px;background:#eff6ff}.vocabulary-reference label{display:flex;align-items:center;gap:8px;font-weight:700}.vocabulary-reference input{width:min(360px,100%);padding:7px;border:1px solid #94a3b8;border-radius:6px}.vocabulary-reference p{margin:6px 0;font-size:.85rem}.vocabulary-reference .scope-warning{color:#b91c1c;font-weight:800}.vocabulary-reference-list{max-height:300px;overflow:auto}.vocabulary-reference-list section{margin:8px 0}.vocabulary-reference-list h4{position:sticky;top:0;margin:0;padding:5px 8px;background:#dbeafe;color:#1e3a8a}.vocabulary-reference-words{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:3px 12px}.vocabulary-reference-words>div{display:grid;grid-template-columns:1fr 1fr;gap:4px;border-bottom:1px solid #bfdbfe;padding:4px}.translation-blank-control{display:flex;align-items:center;gap:8px;font-weight:800}.translation-blank-control input{width:70px;padding:6px}.detected-vocabulary{display:flex;gap:6px;flex-wrap:wrap}.detected-vocabulary>b{width:100%}.detected-vocabulary span{padding:3px 6px;border-radius:4px;background:#fef3c7;color:#92400e}
.manual-glossary-control{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.manual-glossary-control label{display:flex;align-items:center;gap:8px;font-weight:800}.manual-glossary-control input{min-width:200px;padding:7px;border:1px solid #94a3b8;border-radius:6px}.manual-glossary-control button{padding:8px 11px;border:1px solid #2563eb;border-radius:6px;background:#eff6ff;color:#1d4ed8;font-weight:800;cursor:pointer}.manual-glossary-control button:disabled{opacity:.55}.manual-glossary-control small{width:100%;color:#64748b}
.interchange-controls{display:flex;align-items:end;gap:8px;flex-wrap:wrap}.interchange-controls label{display:grid;gap:4px;font-weight:800}.interchange-controls select,.interchange-controls button,.interchange-controls .file-import,.import-preview button{padding:8px 11px;border:1px solid #64748b;border-radius:7px;background:#fff;font:inherit;font-weight:800;cursor:pointer}.interchange-controls .file-import{background:#eff6ff;color:#1d4ed8}.file-import input{display:none}.import-preview{margin-top:12px;padding:12px;border:1px solid #93c5fd;border-radius:8px;background:#eff6ff}.import-preview textarea{box-sizing:border-box;width:100%;padding:8px;font:inherit}.import-preview-list{max-height:250px;overflow:auto;margin:10px 0;padding:8px;background:#fff}.import-preview-list article{padding:7px;border-bottom:1px solid #cbd5e1}.import-preview-list article>p:first-of-type{white-space:pre-wrap}.import-preview button{margin-right:7px}
.preset-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%}.preset-controls label{display:flex;align-items:center;gap:6px}.danger-button{color:#b91c1c!important;border:1px solid #b91c1c!important;background:#fff!important}.score-section{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.score-section>label+span{margin-left:0}.translation-source{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px;background:#eff6ff}.translation-source textarea{width:100%;padding:8px}.translation-source label{display:flex;align-items:center;gap:4px}
</style>
