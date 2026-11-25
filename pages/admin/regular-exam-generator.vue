<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { parseRegularExamQuestion } from '~/lib/regular-exam-question-parser';
import { detectOutOfScopeVocabulary, formatVocabularyGlossary } from '~/lib/regular-exam-vocabulary';
import { sentenceTokens, buildTranslationFill } from '~/lib/regular-exam-translation';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const authCookie = useCookie('teacher_auth');
const accessVerified = ref(false);
const accessCode = ref('');
const unlockExam = code => { accessCode.value = code; accessVerified.value = true; refreshDrafts(); };
const labels = ['A', 'B', 'C', 'D'];
const presets = {
  7: { choicePercent: 50, nonChoicePercent: 50, grammarCount: 10, clozeCount: 0, readingCount: 10, directVocab: 7, contextVocab: 5, writtenSections: [{ title: '單字型態變化', count: 6 }, { title: '翻譯填充', count: 13 }] },
  8: { choicePercent: 66, nonChoicePercent: 34, grammarCount: 10, clozeCount: 14, readingCount: 11, directVocab: 7, contextVocab: 3, writtenSections: [{ title: '單字型態變化', count: 6 }, { title: '翻譯填充', count: 12 }, { title: '依提示作答', count: 2 }] },
  9: { choicePercent: 85, nonChoicePercent: 15, grammarCount: 15, clozeCount: 5, readingCount: 25, directVocab: 10, contextVocab: 5, writtenSections: [] }
};

const allVocabulary = ref([]);
const allGrammar = ref([]);
const selectedVocabLessons = ref([]);
const selectedGrammarLessons = ref([]);
const isLoading = ref(true);
const isGenerating = ref(false);
const exporting = ref('');
const generated = ref(false);
const message = ref('');
const previewMode = ref('question');
const editorTab = ref('listening');
const questionPreview = ref(null);
const answerPreview = ref(null);
const blankPreview = ref(null);
const variantNumber = ref(0);
const draftName = ref('');
const draftList = ref([]);
const selectedDraft = ref('');
const loadingDraft = ref(false);
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
  ...groups.value.map(group => ({ id: group.id, title: group.title, items: group.questions })),
  { id: 'vocabulary', title: '非選擇題：單字與文意字彙', items: nonChoice.value.vocabulary },
  ...nonChoice.value.sections.map(section => ({ id: section.id, title: `非選擇題：${section.title}`, items: section.items }))
]);
const scoreTotal = computed(() => Math.round(sections.value.reduce((sum, section) => sum + (Number(sectionPoints.value[section.id]) || 0), 0) * 100) / 100);
const scoreDifference = computed(() => Math.round((100 - scoreTotal.value) * 100) / 100);
const sectionSize = section => (section.id === translationSection.value?.id)
  ? section.items.reduce((sum, item) => sum + (item.blankIndices?.length || 0), 0)
  : section.items.length;
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
const refreshDrafts = async () => {
  if (!accessCode.value) return;
  const { data, error } = await supabase.rpc('list_regular_exam_drafts', { p_owner: draftOwner.value, p_code: accessCode.value });
  if (error) { message.value = `草稿資料庫讀取失敗：${error.message}。請先執行段考草稿 SQL。`; return; }
  draftList.value = data || [];
};
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
  const payload = { metadata: metadata.value, scoring: scoring.value, listening: listening.value, grammarQuestions: grammarQuestions.value, groups: groups.value, nonChoice: nonChoice.value, selectedVocabLessons: selectedVocabLessons.value, selectedGrammarLessons: selectedGrammarLessons.value, sectionPoints: sectionPoints.value, questionCounts: questionCounts.value };
  const { error } = await supabase.rpc('save_regular_exam_draft', { p_id: id, p_owner: draftOwner.value, p_name: name, p_payload: payload, p_code: accessCode.value });
  if (error) { message.value = `草稿儲存失敗：${error.message}`; return; }
  selectedDraft.value = id;
  await refreshDrafts();
  message.value = `草稿「${name}」已儲存到資料庫。`;
};
const loadDraft = async () => {
  const { data: row, error } = await supabase.rpc('get_regular_exam_draft', { p_id: selectedDraft.value, p_owner: draftOwner.value, p_code: accessCode.value });
  if (error || !row) { message.value = `草稿載入失敗：${error?.message || '找不到草稿'}`; return; }
  const draft = row.payload;
  loadingDraft.value = true;
  metadata.value = structuredClone(draft.metadata);
  await nextTick();
  scoring.value = structuredClone(draft.scoring);
  listening.value = structuredClone(draft.listening);
  grammarQuestions.value = structuredClone(draft.grammarQuestions);
  groups.value = structuredClone(draft.groups);
  nonChoice.value = structuredClone(draft.nonChoice);
  selectedVocabLessons.value = [...draft.selectedVocabLessons];
  selectedGrammarLessons.value = [...draft.selectedGrammarLessons];
  sectionPoints.value = structuredClone(draft.sectionPoints || {});
  questionCounts.value = { ...questionCounts.value, ...(draft.questionCounts || {}) };
  draftName.value = row.name; generated.value = true;
  if (!draft.sectionPoints) allocateScores();
  loadingDraft.value = false;
  message.value = `已載入「${row.name}」（${new Date(row.updated_at).toLocaleString('zh-TW')}）。`;
};

const metadata = ref({
  schoolName: '台南市立新化國民中學', schoolYear: '115', semester: '1', grade: '8', examNumber: '1',
  fileName: '115學年度第1學期8年級第1次定期評量英語科', answerFontSize: 10
});
const scoring = ref({ choicePercent: 66, nonChoicePercent: 34 });
const questionCounts = ref({ grammar: 10, directVocab: 7, contextVocab: 3, translation: 12, blanksPerSentence: 1 });
const listening = ref({ image: [], basic: [], comprehension: [] });
const grammarQuestions = ref([]);
const groups = ref([]);
const nonChoice = ref({ vocabulary: [], sections: [] });

const preset = computed(() => presets[metadata.value.grade]);
const scoringTotal = computed(() => Number(scoring.value.choicePercent || 0) + Number(scoring.value.nonChoicePercent || 0));
const lessonKey = item => `${item.version || ''}|${item.volume || ''}|${item.unit || ''}`;
const buildLessonCatalog = records => {
  const map = new Map();
  records.forEach(item => {
    if (!item.version || !item.unit) return;
    const key = lessonKey(item);
    if (!map.has(key)) map.set(key, { key, version: item.version, volume: item.volume || '', unit: item.unit, count: 0 });
    map.get(key).count += 1;
  });
  return [...map.values()].sort((a, b) => `${a.version}|${a.volume}|${a.unit}`.localeCompare(`${b.version}|${b.volume}|${b.unit}`, 'zh-Hant'));
};
const vocabLessons = computed(() => buildLessonCatalog(allVocabulary.value));
const grammarLessons = computed(() => buildLessonCatalog(allGrammar.value));
const selectedVocabCount = computed(() => allVocabulary.value.filter(item => selectedVocabLessons.value.includes(lessonKey(item))).length);
const selectedGrammarCount = computed(() => allGrammar.value.filter(item => selectedGrammarLessons.value.includes(lessonKey(item))).length);
const examData = computed(() => ({
  metadata: metadata.value, preset: { ...preset.value, ...scoring.value }, listening: listening.value,
  grammarQuestions: grammarQuestions.value, groups: groups.value, nonChoice: nonChoice.value, sectionPoints: sectionPoints.value
}));

const makeChoices = count => Array.from({ length: count }, () => '');
const makeQuestion = (number = 0, choiceCount = 4) => ({ id: crypto.randomUUID(), number, stem: '', choices: makeChoices(choiceCount), answer: 0 });
const makeListeningImageQuestion = number => ({ id: crypto.randomUUID(), number, stem: '', choices: Array.from({ length: 3 }, () => ({ text: '', image: '' })), answer: 0 });
const makeWrittenItems = count => Array.from({ length: count }, () => ({ id: crypto.randomUUID(), prompt: '', answer: '' }));

const resetBlueprint = () => {
  const current = preset.value;
  questionCounts.value = { grammar: current.grammarCount, directVocab: current.directVocab, contextVocab: current.contextVocab, translation: current.writtenSections.find(section => section.title === '翻譯填充')?.count || 0, blanksPerSentence: 1 };
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
    nextGroups.push({ id: crypto.randomUUID(), type: 'reading', title: `${current.clozeCount ? '六' : '五'}、閱讀測驗（題組 ${groupIndex + 1}）`, passage: '', images: ['', ''], glossary: '', autoGlossary: true, outOfScopeCount: 0, unknownWordCount: 0, startNewPage: false, questions: Array.from({ length: count }, (_, index) => makeQuestion(nextNumber + index)) });
    nextNumber += count;
  }
  groups.value = nextGroups;
  nonChoice.value = {
    vocabulary: makeWrittenItems(questionCounts.value.directVocab + questionCounts.value.contextVocab),
    sections: current.writtenSections.map(section => ({ id: crypto.randomUUID(), type: section.title === '翻譯填充' ? 'translation' : 'written', title: section.title, instructions: '', items: makeWrittenItems(section.count) }))
  };
  allocateScores();
  generated.value = false;
  variantNumber.value = 0;
};

watch(() => metadata.value.grade, grade => {
  if (loadingDraft.value) return;
  metadata.value.fileName = `${metadata.value.schoolYear}學年度第${metadata.value.semester}學期${grade}年級第${metadata.value.examNumber}次定期評量英語科`;
  scoring.value = { choicePercent: presets[grade].choicePercent, nonChoicePercent: presets[grade].nonChoicePercent };
  resetBlueprint();
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
  const parsed = parseRegularExamQuestion(event.clipboardData?.getData('text/plain'), question.choices.length);
  if (!parsed) return;
  event.preventDefault();
  question.stem = parsed.stem;
  question.choices = parsed.choices;
  message.value = `第 ${question.number} 題已自動拆分題幹與 ${parsed.choices.length} 個選項；請再確認正確答案。`;
};

const glossaryTimers = new Map();
const detectGroupVocabulary = group => {
  const results = detectOutOfScopeVocabulary(group.passage, allVocabulary.value, selectedVocabLessons.value, lessonKey);
  group.glossary = formatVocabularyGlossary(results);
  group.outOfScopeCount = results.length;
  group.unknownWordCount = results.filter(item => !item.foundInDictionary).length;
  group.autoGlossary = true;
  message.value = results.length
    ? `「${group.title}」偵測到 ${results.length} 個範圍外單字，已填入單字提示${group.unknownWordCount ? `；其中 ${group.unknownWordCount} 個不在單字庫，請補上中文` : ''}。`
    : `「${group.title}」未偵測到範圍外單字。`;
};
const scheduleGroupVocabularyDetection = group => {
  if (!group.autoGlossary) return;
  window.clearTimeout(glossaryTimers.get(group.id));
  glossaryTimers.set(group.id, window.setTimeout(() => detectGroupVocabulary(group), 350));
};
const editGlossaryManually = group => { group.autoGlossary = false; };

watch(selectedVocabLessons, () => {
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
  if (translationSection.value) translationSection.value.items = buildTranslationFill(translationSection.value.items);
};
const chooseBlank = (item, index) => {
  const selected = new Set(item.blankIndices || []);
  if (selected.has(index)) selected.delete(index);
  else selected.add(index);
  item.blankIndices = [...selected].sort((a, b) => a - b);
  refreshTranslation();
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
  return buildTranslationFill(items);
};

const generateExam = async () => {
  message.value = '';
  const counts = questionCounts.value;
  if ([counts.grammar, counts.directVocab, counts.contextVocab, counts.translation, counts.blanksPerSentence].some(value => !Number.isInteger(Number(value)) || Number(value) < 0) || counts.blanksPerSentence < 1) {
    message.value = '題數必須是非負整數，每句空格數至少為 1。'; return;
  }
  const vocabPool = uniqueVocabulary(allVocabulary.value.filter(item => selectedVocabLessons.value.includes(lessonKey(item))));
  const contextPool = shuffle(vocabPool.filter(item => item.example_en?.trim()));
  if (contextPool.length < counts.contextVocab || (counts.translation > 0 && !contextPool.length)) {
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
  if (translationPool.length < counts.translation) {
    message.value = `可用且不與單字題重複的例句只有 ${translationPool.length} 句，翻譯填充要求 ${counts.translation} 句；請增加單字課次或減少題數／每句空格數。`;
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
  if (!translationSection.value && counts.translation > 0) nonChoice.value.sections.push({ id: crypto.randomUUID(), type: 'translation', title: '翻譯填充', instructions: '', items: [] });
  if (translationSection.value) translationSection.value.items = counts.translation
    ? makeTranslationItems(translationPool, counts.translation, counts.blanksPerSentence, usedWords) : [];
  allocateScores();
  generated.value = true;
  isGenerating.value = false;
  previewMode.value = 'question';
  await nextTick();
  message.value = `已產生 ${metadata.value.grade} 年級段考草稿；聽力圖片、閱讀、克漏字與非選擇題仍可繼續編輯。`;
};

const shuffleQuestionChoices = question => {
  const pairs = question.choices.map((choice, index) => ({ choice, correct: index === question.answer }));
  const shuffled = shuffle(pairs);
  question.choices = shuffled.map(item => item.choice);
  question.answer = Math.max(0, shuffled.findIndex(item => item.correct));
};

const shuffleAllChoices = () => {
  [...listening.value.image, ...listening.value.basic, ...listening.value.comprehension, ...grammarQuestions.value, ...groups.value.flatMap(group => group.questions)].forEach(shuffleQuestionChoices);
  variantNumber.value += 1;
  metadata.value.fileName = metadata.value.fileName.replace(/_補考版\d+$/, '') + `_補考版${variantNumber.value}`;
  message.value = `已產生補考版 ${variantNumber.value}：所有題幹保持不變，選項順序與正確答案代號已同步更新。`;
};

const readImage = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const setChoiceImage = async (choice, file) => { if (file?.type.startsWith('image/')) choice.image = await readImage(file); };
const handleImageInput = async (event, choice) => { await setChoiceImage(choice, event.target.files?.[0]); event.target.value = ''; };
const handleImagePaste = async (event, choice) => {
  const file = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'))?.getAsFile();
  if (file) { event.preventDefault(); await setChoiceImage(choice, file); }
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
  const file = [...(event.clipboardData?.items || [])].find(item => item.type.startsWith('image/'))?.getAsFile();
  if (file) { event.preventDefault(); await setGroupImage(group, index, file); }
};

const exportWord = async mode => {
  exporting.value = `${mode}-word`;
  try {
    const { downloadRegularExamWord } = await import('~/lib/regular-exam-export.client');
    await downloadRegularExamWord(examData.value, mode);
  } catch (error) { message.value = `Word 產生失敗：${error.message}`; }
  finally { exporting.value = ''; }
};
const exportPdf = async mode => {
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

onMounted(async () => {
  try { localDraftCount.value = JSON.parse(localStorage.getItem(draftStorageKey) || '[]').length; } catch { localDraftCount.value = 0; }
  resetBlueprint();
  const [vocabResult, grammarResult] = await Promise.all([
    supabase.from('vocabularies').select('id,version,volume,unit,en_us,zh_tw,example_en,example_zh').order('id').limit(10000),
    supabase.from('grammar_questions').select('id,version,volume,unit,question_text,option_1,option_2,option_3,option_4,answer').order('id').limit(10000)
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

    <section class="panel draft-panel"><h2>資料庫草稿</h2><p>草稿保存在資料庫，可在其他裝置載入。需先執行草稿資料表 SQL。</p><input v-model="draftName" placeholder="草稿名稱，例如 115學年度八年級第一次段考"><button :disabled="!generated" @click="saveDraft">儲存目前草稿</button><select v-model="selectedDraft"><option value="">建立新草稿／選擇已存草稿</option><option v-for="draft in draftList" :key="draft.id" :value="draft.id">{{ new Date(draft.updated_at).toLocaleDateString('zh-TW') }}｜{{ draft.name }}</option></select><button :disabled="!selectedDraft" @click="loadDraft">載入草稿</button><button v-if="localDraftCount" @click="importLocalDrafts">匯入本機舊草稿（{{ localDraftCount }}）</button></section>

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
        <div><div class="scope-heading"><h3>單字與例句</h3><span>已選 {{ selectedVocabCount }} 筆</span></div><div class="lesson-grid"><label v-for="lesson in vocabLessons" :key="lesson.key" :class="{ selected: selectedVocabLessons.includes(lesson.key) }"><input v-model="selectedVocabLessons" type="checkbox" :value="lesson.key"><span><b>{{ lesson.version }} {{ lesson.volume }} {{ lesson.unit }}</b><small>{{ lesson.count }} 個單字</small></span></label></div></div>
        <div><div class="scope-heading"><h3>文法遊樂園題庫</h3><span>已選 {{ selectedGrammarCount }} 題</span></div><div class="lesson-grid"><label v-for="lesson in grammarLessons" :key="lesson.key" :class="{ selected: selectedGrammarLessons.includes(lesson.key) }"><input v-model="selectedGrammarLessons" type="checkbox" :value="lesson.key"><span><b>{{ lesson.version }} {{ lesson.volume }} {{ lesson.unit }}</b><small>{{ lesson.count }} 題</small></span></label></div></div>
      </div>
      <div class="count-controls"><label>文法選擇題 <input v-model.number="questionCounts.grammar" type="number" min="0"></label><label>中翻英單字題 <input v-model.number="questionCounts.directVocab" type="number" min="0"></label><label>文意字彙題 <input v-model.number="questionCounts.contextVocab" type="number" min="0"></label><label>翻譯填充句數 <input v-model.number="questionCounts.translation" type="number" min="0"></label><label>每句預設空格數 <input v-model.number="questionCounts.blanksPerSentence" type="number" min="1"></label></div>
      <button class="generate-btn" :disabled="isGenerating || ((questionCounts.directVocab || questionCounts.contextVocab || questionCounts.translation) && !selectedVocabLessons.length) || (questionCounts.grammar && !selectedGrammarLessons.length)" @click="generateExam">{{ isGenerating ? '產生中…' : generated ? '🎲 重新抽題' : '🎲 產生段考草稿' }}</button>
    </section>

    <template v-if="generated">
      <section class="panel score-panel"><h2>大題配分</h2><p>只需輸入各大題總分，每小題平均分數自動計算。</p><div v-for="section in sections" :key="section.id" class="score-section"><label><strong>{{ section.title }}</strong> <input v-model.number="sectionPoints[section.id]" type="number" min="0" step="0.01"> 分</label><span>{{ sectionSize(section) }} {{ section.id === translationSection?.id ? '格' : '題' }}；每{{ section.id === translationSection?.id ? '格' : '題' }}約 {{ perQuestion(section) }} 分</span></div><p class="score-summary" :class="{ invalid: scoreDifference !== 0 || scoreWarnings.length }">大題總分 {{ scoreTotal }}／100 分；{{ scoreDifference > 0 ? `尚缺 ${scoreDifference} 分` : scoreDifference < 0 ? `超出 ${-scoreDifference} 分` : '總分 100 分' }}</p><p v-if="choiceScore !== Number(scoring.choicePercent) || writtenScore !== Number(scoring.nonChoicePercent)" class="score-warning">⚠ 目前選擇題 {{ choiceScore }} 分／非選擇題 {{ writtenScore }} 分，與上方設定的 {{ scoring.choicePercent }}／{{ scoring.nonChoicePercent }} 不一致。</p><p v-for="warning in scoreWarnings" :key="warning" class="score-warning">⚠ {{ warning }}</p><button @click="allocateScores">依選擇題／非選擇題比例重新分配</button></section>
      <section class="panel action-panel"><div><h2>三、預覽與輸出</h2><div class="preview-tabs"><button v-for="mode in [{id:'question',name:'B4 題目卷'},{id:'answer',name:'A4 正確答案'},{id:'blank',name:'A4 空白答案卷'}]" :key="mode.id" :class="{ active: previewMode === mode.id }" @click="previewMode = mode.id">{{ mode.name }}</button></div></div><div class="action-buttons"><button class="makeup" @click="shuffleAllChoices">🔀 產生補考版（交換選項）</button><button v-for="mode in [{id:'question',name:'題目卷'},{id:'answer',name:'正確答案'},{id:'blank',name:'空白答案卷'}]" :key="mode.id" :disabled="Boolean(exporting)" @click="exportWord(mode.id)">{{ mode.name }} Word</button><button v-for="mode in [{id:'question',name:'題目卷'},{id:'answer',name:'正確答案'},{id:'blank',name:'空白答案卷'}]" :key="mode.id+'pdf'" :disabled="Boolean(exporting)" @click="exportPdf(mode.id)">{{ mode.name }} PDF</button></div></section>

      <section class="preview-panel"><div class="preview-scroll"><AdminRegularExamSheet v-show="previewMode === 'question'" ref="questionPreview" :data="examData" /><AdminRegularExamSheet v-show="previewMode === 'answer'" ref="answerPreview" :data="examData" answer-mode /><AdminRegularExamSheet v-show="previewMode === 'blank'" ref="blankPreview" :data="examData" blank-mode /></div></section>

      <section class="panel editor-panel">
        <h2>四、編輯全部考卷內容</h2>
        <div class="editor-tabs"><button v-for="tab in [{id:'listening',name:'🎧 聽力'},{id:'grammar',name:'🎡 文法'},{id:'groups',name:'📖 閱讀／克漏字'},{id:'written',name:'✍️ 非選擇題'}]" :key="tab.id" :class="{ active: editorTab === tab.id }" @click="editorTab = tab.id">{{ tab.name }}</button></div>

        <div v-if="editorTab === 'listening'" class="editor-content">
          <h3>辨識句意圖片題（可貼上剪貼簿圖片或選擇檔案）</h3>
          <div v-for="question in listening.image" :key="question.id" class="question-editor image-editor"><b>第 {{ question.number }} 題</b><label>正確答案<select v-model.number="question.answer"><option v-for="(label,index) in labels.slice(0,3)" :key="label" :value="index">{{ label }}</option></select></label><button @click="shuffleQuestionChoices(question)">交換本題選項</button><div class="image-options"><div v-for="(choice,index) in question.choices" :key="index" class="image-upload" tabindex="0" @paste="handleImagePaste($event,choice)"><b>({{ labels[index] }})</b><input v-model="choice.text" placeholder="選項文字"><img v-if="choice.image" :src="choice.image" alt="選項圖片"><span v-else>點此後貼上圖片</span><input type="file" accept="image/*" @change="handleImageInput($event,choice)"><button v-if="choice.image" @click="choice.image = ''">移除圖片</button></div></div></div>
          <h3>基本問答</h3><div v-for="question in listening.basic" :key="question.id" class="question-editor"><div class="question-top"><b>{{ question.number }}.</b><input v-model="question.stem" placeholder="可貼上題目及 A～C 選項，自動拆分" @paste="handleQuestionPaste($event, question)"><select v-model.number="question.answer"><option v-for="(label,index) in labels.slice(0,3)" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]"></label></div></div>
          <h3>言談理解</h3><div v-for="question in listening.comprehension" :key="question.id" class="question-editor"><div class="question-top"><b>{{ question.number }}.</b><input v-model="question.stem" placeholder="可貼上題目及 A～C 選項，自動拆分" @paste="handleQuestionPaste($event, question)"><select v-model.number="question.answer"><option v-for="(label,index) in labels.slice(0,3)" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]"></label></div></div>
        </div>

        <div v-else-if="editorTab === 'grammar'" class="editor-content"><p>以下題目來自文法遊樂園，可逐題修改或交換選項。將「題幹＋A、B、C、D 四個選項」整段貼入題幹欄，系統會自動拆分。</p><div v-for="question in grammarQuestions" :key="question.id" class="question-editor"><div class="question-top"><b>{{ question.number }}.</b><textarea v-model="question.stem" placeholder="貼上完整題目與四個選項，可自動拆分" @paste="handleQuestionPaste($event, question)"></textarea><select v-model.number="question.answer"><option v-for="(label,index) in labels" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]"></label></div></div></div>

        <div v-else-if="editorTab === 'groups'" class="editor-content">
          <p>題組會依內容長度自動流入下一欄或下一頁；每一小題不會被拆開。文章／對話會以虛線框區隔。貼上文章後，系統會依上方所選課次自動找出範圍外單字，並從完整單字庫帶入中文。</p>
          <article v-for="group in groups" :key="group.id" class="group-editor">
            <div class="group-layout-row"><input v-model="group.title" class="group-title"><label><input v-model="group.startNewPage" type="checkbox"> 此題組前強制換頁</label></div>
            <label>文章／對話<textarea v-model="group.passage" class="passage-editor" rows="10" placeholder="貼上閱讀文章或對話後，將自動檢測範圍外單字" @input="scheduleGroupVocabularyDetection(group)"></textarea></label>
            <div class="reading-image-editor">
              <b>閱讀圖片（最多兩張）</b>
              <div class="reading-image-slots"><div v-for="index in 2" :key="index" class="image-upload" tabindex="0" @paste="handleGroupImagePaste($event, group, index - 1)">
                <b>圖片 {{ index }}</b><img v-if="group.images?.[index - 1]" :src="group.images[index - 1]" alt="閱讀圖片預覽"><span v-else>點此後直接貼上圖片</span>
                <input type="file" accept="image/*" @change="handleGroupImageInput($event, group, index - 1)">
                <button v-if="group.images?.[index - 1]" type="button" @click="group.images[index - 1] = ''">移除圖片</button>
              </div></div>
            </div>
            <div class="glossary-heading"><b>單字提示</b><span v-if="group.outOfScopeCount">範圍外 {{ group.outOfScopeCount }} 個<span v-if="group.unknownWordCount">／待補中文 {{ group.unknownWordCount }} 個</span></span><button type="button" @click="detectGroupVocabulary(group)">🔍 重新檢測單字範圍</button></div>
            <textarea v-model="group.glossary" rows="3" placeholder="自動產生後仍可人工增刪或修改中文" @input="editGlossaryManually(group)"></textarea><small v-if="!group.autoGlossary" class="manual-note">目前為人工編輯模式；按「重新檢測」可恢復自動結果。</small>
            <div v-for="question in group.questions" :key="question.id" class="question-editor"><div class="question-top"><b class="editor-question-number">{{ question.number }}.</b><textarea v-model="question.stem" placeholder="貼上完整題目與四個選項，可自動拆分" @paste="handleQuestionPaste($event, question)"></textarea><select v-model.number="question.answer"><option v-for="(label,index) in labels" :key="label" :value="index">答案 {{ label }}</option></select><button @click="shuffleQuestionChoices(question)">交換選項</button></div><div class="choice-inputs"><label v-for="(_,index) in question.choices" :key="index">{{ labels[index] }}<input v-model="question.choices[index]"></label></div></div>
          </article>
        </div>

        <div v-else class="editor-content"><h3>單字與文意字彙</h3><div class="written-grid"><div v-for="(item,index) in nonChoice.vocabulary" :key="item.id"><b>{{ index + 1 }}</b><textarea v-model="item.prompt" placeholder="題目"></textarea><input v-model="item.answer" placeholder="答案"></div></div><article v-for="section in nonChoice.sections" :key="section.id" class="written-editor"><input v-model="section.title" class="group-title"><textarea v-model="section.instructions" placeholder="作答說明或共同題幹"></textarea><template v-if="section.type === 'translation' || section.title === '翻譯填充'"><p>例句與中文可編輯；點擊下方英文單字可切換是否挖空，系統會自動更新格號與答案。</p><div v-for="(item,index) in section.items" :key="item.id" class="translation-editor"><b>第 {{ index + 1 }} 句</b><label>英文例句<textarea v-model="item.sourceEn" @change="refreshTranslation"></textarea></label><label>中文翻譯<input v-model="item.sourceZh" @change="refreshTranslation"></label><div class="token-list"><button v-for="(token,tokenIndex) in sentenceTokens(item.sourceEn)" :key="tokenIndex" type="button" :class="{ selected: item.blankIndices?.includes(tokenIndex) }" @click="chooseBlank(item,tokenIndex)">{{ token }}</button></div><small>目前 {{ item.blankIndices?.length || 0 }} 格；格號：{{ item.answer }}</small></div></template><div v-else class="written-grid"><div v-for="(item,index) in section.items" :key="item.id"><b>{{ index + 1 }}</b><textarea v-model="item.prompt" placeholder="題目"></textarea><input v-model="item.answer" placeholder="正確答案"></div></div></article></div>
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
</style>
