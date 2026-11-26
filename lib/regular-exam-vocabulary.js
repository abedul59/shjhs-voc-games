import { sortLessons } from './regular-exam-scope.js';

const cleanWord = value => String(value || '').toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, '');
const tokens = text => [...String(text || '').matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)]
  .map(match => ({ word: match[0], key: cleanWord(match[0]), start: match.index, end: match.index + match[0].length }));
const entryKey = entry => tokens(entry?.en_us).map(token => token.key).join(' ');
const commonWords = new Set(`a an the and or but so if because although as than that which who whom whose what when where why how
  is am are was were be been being do does did done have has had having can could may might must shall should will would
  i me my mine myself you your yours yourself he him his himself she her hers herself it its itself we us our ours ourselves
  they them their theirs themselves this these those there here all any some each every either neither both many much few little
  one ones two no not nor yes of to in on at by from for with without into onto over under above below between among
  through during before after about around across behind beside near off out up down again also very too just only even
  already yet still ever never always often sometimes usually then now today tomorrow yesterday ago more most less least
  mr mrs ms dr etc don't doesn't didn't isn't aren't wasn't weren't can't couldn't won't wouldn't shouldn't it's i'm you're we're they're
  he's she's i've you've we've they've i'll you'll we'll they'll that's there's here's let's`.split(/\s+/).filter(Boolean));
const irregular = {
  children: 'child', people: 'person', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose',
  went: 'go', gone: 'go', had: 'have', has: 'have', did: 'do', done: 'do', was: 'be', were: 'be',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad', bought: 'buy', brought: 'bring', caught: 'catch',
  thought: 'think', taught: 'teach', took: 'take', taken: 'take', gave: 'give', given: 'give', wrote: 'write',
  written: 'write', spoke: 'speak', spoken: 'speak', ate: 'eat', eaten: 'eat', saw: 'see', seen: 'see',
  ran: 'run', swam: 'swim', drank: 'drink', drunk: 'drink', drove: 'drive', driven: 'drive', made: 'make',
  said: 'say', told: 'tell', found: 'find', knew: 'know', known: 'know', got: 'get', gotten: 'get'
};

const wordForms = value => {
  const word = cleanWord(value);
  const forms = new Set([word]);
  if (irregular[word]) forms.add(irregular[word]);
  const contraction = word.match(/^(.+?)(?:n't|'s|'m|'re|'ve|'ll|'d)$/);
  if (contraction) forms.add(contraction[1]);
  if (word.endsWith('ies') && word.length > 3) forms.add(`${word.slice(0, -3)}y`);
  if (word.endsWith('ves') && word.length > 3) { forms.add(`${word.slice(0, -3)}f`); forms.add(`${word.slice(0, -3)}fe`); }
  if (word.endsWith('ing') && word.length > 4) {
    const stem = word.slice(0, -3);
    forms.add(stem); forms.add(`${stem}e`);
    if (stem.at(-1) === stem.at(-2)) forms.add(stem.slice(0, -1));
    if (stem.endsWith('y')) forms.add(`${stem.slice(0, -1)}ie`);
  }
  if (word.endsWith('ed') && word.length > 3) {
    const stem = word.slice(0, -2);
    forms.add(stem); forms.add(`${stem}e`);
    if (stem.at(-1) === stem.at(-2)) forms.add(stem.slice(0, -1));
    if (stem.endsWith('i')) forms.add(`${stem.slice(0, -1)}y`);
  }
  if (word.endsWith('es') && word.length > 3) { forms.add(word.slice(0, -2)); forms.add(word.slice(0, -1)); }
  if (word.endsWith('s') && word.length > 2) forms.add(word.slice(0, -1));
  if (word.endsWith('er') && word.length > 3) { forms.add(word.slice(0, -2)); forms.add(`${word.slice(0, -1)}e`); }
  if (word.endsWith('est') && word.length > 4) { forms.add(word.slice(0, -3)); forms.add(`${word.slice(0, -2)}e`); }
  return [...forms];
};

export function listInScopeVocabulary(vocabulary, selectedLessonKeys, lessonKey) {
  const selected = new Set(selectedLessonKeys || []);
  const seen = new Set();
  const rows = (vocabulary || []).filter(entry => selected.has(lessonKey(entry))).flatMap(entry => {
    const key = entryKey(entry);
    const uniqueKey = `${lessonKey(entry)}|${key}`;
    if (!key || seen.has(uniqueKey)) return [];
    seen.add(uniqueKey);
    return [{ word: String(entry.en_us || '').trim(), meaning: String(entry.zh_tw || '').trim(), version: entry.version || '', volume: entry.volume || '', unit: entry.unit || '', lessonKey: lessonKey(entry) }];
  });
  const lessons = sortLessons(rows.map(row => ({ key: row.lessonKey, version: row.version, volume: row.volume, unit: row.unit })));
  const order = new Map(lessons.map((lesson, index) => [lesson.key, index]));
  return rows.sort((a, b) => order.get(a.lessonKey) - order.get(b.lessonKey) || a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));
}

export function detectOutOfScopeVocabulary(passage, vocabulary, selectedLessonKeys, lessonKey) {
  const selected = new Set(selectedLessonKeys || []);
  const dictionary = new Map();
  const allowed = new Set();
  for (const entry of vocabulary || []) {
    const key = entryKey(entry);
    if (!key) continue;
    if (!dictionary.has(key) || (!dictionary.get(key) && entry.zh_tw?.trim())) dictionary.set(key, entry.zh_tw?.trim() || '');
    if (selected.has(lessonKey(entry))) allowed.add(key);
  }
  const source = String(passage || '');
  const sourceTokens = tokens(source);
  const covered = new Set();
  const seen = new Set();
  const results = [];
  const add = (word, key) => {
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ word, normalized: key, meaning: dictionary.get(key) || '', foundInDictionary: dictionary.has(key) });
  };
  const phrases = [...dictionary.keys()].filter(key => key.includes(' ')).sort((a, b) => b.split(' ').length - a.split(' ').length);
  for (const phrase of phrases) {
    const words = phrase.split(' ');
    for (let start = 0; start <= sourceTokens.length - words.length; start += 1) {
      const indexes = words.map((_, offset) => start + offset);
      if (indexes.some(index => covered.has(index))) continue;
      if (!words.every((word, offset) => wordForms(sourceTokens[start + offset].key).includes(word))) continue;
      if (!indexes.slice(1).every((index, offset) => /^[\s-]+$/.test(source.slice(sourceTokens[start + offset].end, sourceTokens[index].start)))) continue;
      indexes.forEach(index => covered.add(index));
      if (!allowed.has(phrase)) add(source.slice(sourceTokens[start].start, sourceTokens[start + words.length - 1].end), phrase);
    }
  }
  sourceTokens.forEach((token, index) => {
    if (covered.has(index) || !token.key) return;
    const forms = wordForms(token.key);
    if (forms.some(form => allowed.has(form))) return;
    const dictionaryForm = forms.find(form => dictionary.has(form));
    if (!dictionaryForm && forms.some(form => commonWords.has(form))) return;
    add(token.word, dictionaryForm || token.key);
  });
  return results;
}

export function formatVocabularyGlossary(items) {
  return (items || []).filter(item => item.meaning).map(item => `${item.word} ${item.meaning}`).join('　');
}
