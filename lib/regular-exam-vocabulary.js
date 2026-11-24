const cleanWord = value => String(value || '')
  .toLowerCase()
  .replace(/[’]/g, "'")
  .replace(/^[^a-z]+|[^a-z]+$/g, '');

const wordForms = value => {
  const word = cleanWord(value);
  if (!word) return [];
  const forms = new Set([word]);
  const irregular = {
    children: 'child', people: 'person', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose',
    went: 'go', gone: 'go', had: 'have', has: 'have', did: 'do', done: 'do', was: 'be', were: 'be', been: 'be', better: 'good', best: 'good'
  };
  if (irregular[word]) forms.add(irregular[word]);
  const contraction = word.match(/^(.+?)(?:n't|'s|'m|'re|'ve|'ll|'d)$/);
  if (contraction?.[1]) forms.add(contraction[1]);
  if (word.endsWith('ies') && word.length > 3) forms.add(`${word.slice(0, -3)}y`);
  if (word.endsWith('ves') && word.length > 3) {
    forms.add(`${word.slice(0, -3)}f`);
    forms.add(`${word.slice(0, -3)}fe`);
  }
  if (word.endsWith('ing') && word.length > 4) {
    const stem = word.slice(0, -3);
    forms.add(stem);
    forms.add(`${stem}e`);
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) forms.add(stem.slice(0, -1));
  }
  if (word.endsWith('ed') && word.length > 3) {
    const stem = word.slice(0, -2);
    forms.add(stem);
    forms.add(`${stem}e`);
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) forms.add(stem.slice(0, -1));
  }
  if (word.endsWith('es') && word.length > 3) {
    forms.add(word.slice(0, -2));
    forms.add(word.slice(0, -1));
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) forms.add(word.slice(0, -1));
  if (word.endsWith('er') && word.length > 3) {
    forms.add(word.slice(0, -2));
    forms.add(`${word.slice(0, -1)}e`);
  }
  if (word.endsWith('est') && word.length > 4) {
    forms.add(word.slice(0, -3));
    forms.add(`${word.slice(0, -2)}e`);
  }
  return [...forms];
};

const entryWords = entry => String(entry?.en_us || '').match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)?.map(cleanWord).filter(Boolean) || [];

export function detectOutOfScopeVocabulary(passage, vocabulary, selectedLessonKeys, lessonKey) {
  const selected = new Set(selectedLessonKeys || []);
  const allowedWords = new Set();
  const dictionary = new Map();

  const entries = vocabulary || [];
  entries.filter(entry => entryWords(entry).length === 1).forEach(entry => {
    const words = entryWords(entry);
    words.forEach(word => {
      if (!dictionary.has(word) && entry.zh_tw?.trim()) dictionary.set(word, entry.zh_tw.trim());
      if (selected.has(lessonKey(entry))) allowedWords.add(word);
    });
  });
  entries.filter(entry => entryWords(entry).length > 1).forEach(entry => {
    entryWords(entry).forEach(word => {
      if (!dictionary.has(word) && entry.zh_tw?.trim()) dictionary.set(word, entry.zh_tw.trim());
      if (selected.has(lessonKey(entry))) allowedWords.add(word);
    });
  });

  const sourceWords = String(passage || '').match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) || [];
  const seen = new Set();
  const results = [];
  sourceWords.forEach(sourceWord => {
    const normalized = cleanWord(sourceWord);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    const forms = wordForms(normalized);
    if (forms.some(form => allowedWords.has(form))) return;
    const dictionaryForm = forms.find(form => dictionary.has(form));
    results.push({
      word: sourceWord,
      normalized,
      meaning: dictionaryForm ? dictionary.get(dictionaryForm) : '',
      foundInDictionary: Boolean(dictionaryForm)
    });
  });
  return results;
}

export function formatVocabularyGlossary(items) {
  return (items || []).map(item => `${item.word} ${item.meaning || '（待補中文）'}`).join('　');
}
