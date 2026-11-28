import { parseRegularExamQuestion } from './regular-exam-question-parser.js';

const categories = new Set(['grammar', 'cloze', 'reading']);
const choiceKeys = ['choice_a', 'choice_b', 'choice_c', 'choice_d'];
const answerIndex = value => {
  const text = String(value ?? '').trim().normalize('NFKC').toUpperCase();
  if (/^[A-D]$/.test(text)) return text.charCodeAt(0) - 65;
  return -1;
};
const clean = value => String(value ?? '').trim();

export const pdfTextToPlain = items => {
  let output = '';
  let previous = null;
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    const x = Number(item.transform?.[4] || 0);
    const y = Number(item.transform?.[5] || 0);
    const height = Number(item.height || 10);
    if (previous) {
      const newLine = Math.abs(y - previous.y) > Math.max(2, height * 0.45) || x < previous.x - 3;
      if (newLine) output += '\n';
      else if (x - previous.right > Math.max(1, height * 0.18) && !/\s$/.test(output) && !/^\s/.test(item.str)) output += ' ';
    }
    output += item.str;
    previous = item.hasEOL ? null : { x, y, right: x + Number(item.width || 0) };
    if (item.hasEOL) output += '\n';
  }
  return output.trim();
};

export const normalizeImportedQuestion = row => {
  const choices = Array.isArray(row.choices) ? row.choices : choiceKeys.map(key => row[key]);
  const normalized = choices.map(clean);
  if (!clean(row.stem) || normalized.length !== 4 || normalized.some(value => !value)) throw new Error('題幹及 A～D 四個選項都必須填寫。');
  return { stem: clean(row.stem), choices: normalized, answer: answerIndex(row.answer) };
};

export const normalizeImportedItems = (input, category) => {
  if (!categories.has(category)) throw new Error('匯入類型必須是文法、克漏字或閱讀。');
  const items = Array.isArray(input) ? input : input?.items;
  if (!Array.isArray(items) || !items.length) throw new Error('檔案沒有可匯入的題目。');
  if (category === 'grammar') return items.map((item, index) => {
    try { return normalizeImportedQuestion(item); }
    catch (error) { throw new Error(`第 ${index + 1} 題：${error.message}`); }
  });
  return items.map((group, groupIndex) => {
    if (!Array.isArray(group.questions) || !group.questions.length) throw new Error('題組至少需要一題。');
    return {
      title: clean(group.title) || (category === 'cloze' ? '克漏字選擇' : '閱讀測驗'),
      passage: clean(group.passage), glossary: clean(group.glossary),
      questions: group.questions.map((question, index) => {
        try { return normalizeImportedQuestion(question); }
        catch (error) { throw new Error(`第 ${groupIndex + 1} 組第 ${index + 1} 題：${error.message}`); }
      })
    };
  });
};

export const exportSectionData = (category, grammarQuestions, groups) => ({
  format: 'regular-exam-questions-v1', category,
  items: category === 'grammar'
    ? grammarQuestions.map(({ stem, choices, answer }) => ({ stem, choices, answer: answer >= 0 ? 'ABCD'[answer] : '' }))
    : groups.filter(group => group.type === category).map(group => ({
      title: group.title, passage: group.passage, glossary: group.glossary,
      questions: group.questions.map(({ stem, choices, answer }) => ({ stem, choices, answer: answer >= 0 ? 'ABCD'[answer] : '' }))
    }))
});

export const sectionCsvRows = data => data.category === 'grammar'
  ? data.items.map((question, index) => ({ category: 'grammar', group: '', title: '', passage: '', glossary: '', number: index + 1, stem: question.stem, ...Object.fromEntries(choiceKeys.map((key, choice) => [key, question.choices[choice]])), answer: question.answer }))
  : data.items.flatMap((group, groupIndex) => group.questions.map((question, index) => ({
    category: data.category, group: groupIndex + 1, title: group.title, passage: group.passage,
    glossary: group.glossary, number: index + 1, stem: question.stem,
    ...Object.fromEntries(choiceKeys.map((key, choice) => [key, question.choices[choice]])), answer: question.answer
  })));

export const csvRowsToSection = (rows, category) => {
  const matching = rows.filter(row => !row.category || clean(row.category).toLowerCase() === category);
  if (category === 'grammar') return normalizeImportedItems(matching, category);
  const groups = new Map();
  matching.forEach((row, index) => {
    const key = clean(row.group) || '1';
    if (!groups.has(key)) groups.set(key, { title: row.title, passage: row.passage, glossary: row.glossary, questions: [] });
    const group = groups.get(key);
    if (!group.passage && row.passage) group.passage = row.passage;
    if (!group.title && row.title) group.title = row.title;
    group.questions.push(row);
  });
  return normalizeImportedItems([...groups.values()], category);
};

const numberedBlocks = text => {
  const normalized = clean(text).normalize('NFKC').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  const markers = [...normalized.matchAll(/(?:^|\n)\s*(\d{1,3})\s*[.)、．]\s*/g)].map(match => ({ index: match.index + (match[0].startsWith('\n') ? 1 : 0), end: match.index + match[0].length }));
  const questions = [];
  markers.forEach((marker, index) => {
    const content = normalized.slice(marker.end, markers[index + 1]?.index ?? normalized.length).trim();
    const answerPattern = /(?:【\s*答案\s*】|答案\s*[:：]|Answer\s*[:：])\s*[(（]?\s*([A-D])\s*[)）]?/i;
    const answerMatch = content.match(answerPattern);
    const withoutAnswer = content.replace(answerPattern, '').trim();
    const parsed = parseRegularExamQuestion(withoutAnswer, 4);
    if (parsed) questions.push({ start: marker.index, stem: parsed.stem, choices: parsed.choices, answer: answerMatch?.[1] || '' });
  });
  return { normalized, questions };
};

export const parseDocumentQuestions = (text, category) => {
  if (!categories.has(category)) throw new Error('請先選擇匯入類型。');
  const normalized = clean(text).replace(/\r\n?/g, '\n');
  const headingTypes = [
    ['grammar', /(?:^|\n)\s*(?:[一二三四五六七八九十]+[、.．]\s*)?(?:文法(?:選擇|測驗)?|單字文法選擇|Grammar(?: Test)?)[^\n]*/gim],
    ['cloze', /(?:^|\n)\s*(?:[一二三四五六七八九十]+[、.．]\s*)?(?:克漏字(?:選擇|測驗)?|Cloze(?: Test)?)[^\n]*/gim],
    ['reading', /(?:^|\n)\s*(?:[一二三四五六七八九十]+[、.．]\s*)?(?:閱讀(?:測驗|理解)|Reading (?:Comprehension|Test))[^\n]*/gim]
  ];
  const headings = headingTypes.flatMap(([type, pattern]) => [...normalized.matchAll(pattern)].map(match => ({
    type, index: match.index + (match[0].startsWith('\n') ? 1 : 0)
  }))).sort((a, b) => a.index - b.index);
  const selected = headings.filter(heading => heading.type === category);
  const chunks = selected.length
    ? selected.map(heading => normalized.slice(heading.index, headings.find(next => next.index > heading.index)?.index ?? normalized.length))
    : category === 'grammar' && headings.length ? [normalized.slice(0, headings[0].index)] : [normalized];
  const items = [];
  chunks.forEach((chunk, index) => {
    const found = numberedBlocks(chunk);
    if (!found.questions.length) return;
    if (category === 'grammar') { items.push(...found.questions); return; }
    const first = found.questions[0].start;
    const headerAndPassage = found.normalized.slice(0, first).trim();
    const lines = headerAndPassage.split('\n');
    const hasHeading = /(?:克漏字|閱讀測驗|閱讀理解|Cloze|Reading)/i.test(lines[0] || '');
    items.push({ title: hasHeading ? lines.shift().trim() : `${category === 'cloze' ? '克漏字選擇' : '閱讀測驗'}（匯入 ${index + 1}）`, passage: lines.join('\n').trim() || (!hasHeading ? headerAndPassage : ''), questions: found.questions });
  });
  return normalizeImportedItems(items, category);
};
