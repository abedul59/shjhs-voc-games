import { parseRegularExamQuestion } from './regular-exam-question-parser.js';

const categories = new Set(['grammar', 'cloze', 'reading']);
const choiceKeys = ['choice_a', 'choice_b', 'choice_c', 'choice_d'];
const answerIndex = value => {
  const text = String(value ?? '').trim().normalize('NFKC').toUpperCase();
  if (/^[A-D]$/.test(text)) return text.charCodeAt(0) - 65;
  return -1;
};
const clean = value => String(value ?? '').trim();

export const extractChoiceAnswerKey = text => {
  const normalized = String(text || '').normalize('NFKC').toUpperCase();
  const answers = {};
  const lines = normalized.split('\n').map(line => line.trim());
  for (let index = 0; index < lines.length - 1; index += 1) {
    const numbers = [...lines[index].matchAll(/(?:^|\s)(\d{1,3})\s*[.)、．]/g)].map(match => Number(match[1]));
    const remainder = lines[index].replace(/(?:^|\s)\d{1,3}\s*[.)、．]/g, '').trim();
    const letters = lines[index + 1].split(/\s+/).filter(Boolean);
    if (!remainder && numbers.length >= 2 && letters.length === numbers.length && letters.every(letter => /^[A-D]$/.test(letter))) {
      numbers.forEach((number, offset) => { answers[number] = letters[offset]; });
      index += 1;
    }
  }
  for (const line of normalized.split('\n')) {
    const ranges = [...line.matchAll(/(\d{1,3})\s*[-~～]\s*(\d{1,3})\s+([A-D\s]+?)(?=\d{1,3}\s*[-~～]\s*\d{1,3}|$)/g)];
    for (const match of ranges) {
      const start = Number(match[1]);
      const end = Number(match[2]);
      const letters = match[3].replace(/\s/g, '');
      if (end >= start && end - start < 100 && letters.length === end - start + 1) {
        [...letters].forEach((letter, index) => { answers[start + index] = letter; });
      }
    }
  }
  if (Object.keys(answers).length) return answers;
  const pairPattern = /(?:^|\s)(\d{1,3})\s*(?:[.):、-]\s*)?\(?([A-D])\)?(?=\s|$)/g;
  const pairs = normalized.split('\n').flatMap(line => {
    const found = [...line.matchAll(pairPattern)];
    return line.replace(pairPattern, '').trim() ? [] : found;
  });
  if (pairs.length >= 2) pairs.forEach(match => { answers[Number(match[1])] = match[2]; });
  return answers;
};

export const applyChoiceAnswerKey = (items, category, answers) => {
  const questions = category === 'grammar' ? items : items.flatMap(group => group.questions);
  let applied = 0;
  for (const question of questions) {
    const key = answers[question.sourceNumber];
    if (question.answer < 0 && key) { question.answer = answerIndex(key); applied += 1; }
  }
  return applied;
};

export const pdfTextToPlain = (items, pageWidth = 0) => {
  if (pageWidth > 0) {
    const split = pageWidth * 0.46;
    const left = items.filter(item => Number(item.transform?.[4] || 0) < split);
    const right = items.filter(item => Number(item.transform?.[4] || 0) >= split);
    const leftText = pdfTextToPlain(left);
    const rightText = pdfTextToPlain(right);
    const questionMarkers = text => [...text.matchAll(/(?:^|\n)\s*(?:\(\s*\)\s*)?\d{1,3}\s*[.)、．]/g)].length;
    const optionMarkers = text => [...text.matchAll(/\([A-D]\)/g)].length;
    if (leftText.split('\n').length >= 10 && rightText.split('\n').length >= 10 && questionMarkers(leftText) >= 2 && questionMarkers(rightText) >= 2 && optionMarkers(leftText) + optionMarkers(rightText) >= 6) return `${leftText}\n\n${rightText}`;
  }
  const lines = [];
  for (const item of items) {
    if (typeof item.str !== 'string' || !item.str.trim()) continue;
    const x = Number(item.transform?.[4] || 0);
    const y = Number(item.transform?.[5] || 0);
    const height = Number(item.height || 10);
    let line = lines.find(candidate => Math.abs(candidate.y - y) <= Math.max(2, height * 0.3));
    if (!line) { line = { y, height, items: [] }; lines.push(line); }
    line.items.push({ text: item.str, x, width: Number(item.width || 0), height });
  }
  lines.sort((a, b) => b.y - a.y);
  return lines.map(line => {
    let output = '';
    let previous = null;
    for (const item of line.items.sort((a, b) => a.x - b.x)) {
      if (previous && !/\s$/.test(output) && !/^\s/.test(item.text)) {
        const gap = item.x - previous.x - previous.width;
        if (gap > 20) output += '\t';
        else if (gap > Math.max(1, item.height * 0.18)) output += ' ';
      }
      output += item.text;
      previous = item;
    }
    return output.trim();
  }).join('\n').trim();
};

export const normalizeImportedQuestion = (row, allowEmptyStem = false) => {
  const choices = Array.isArray(row.choices) ? row.choices : choiceKeys.map(key => row[key]);
  const normalized = choices.map(clean);
  if ((!clean(row.stem) && !allowEmptyStem) || normalized.length !== 4 || normalized.some(value => !value)) throw new Error('題幹及 A～D 四個選項都必須填寫。');
  return { stem: clean(row.stem), choices: normalized, answer: answerIndex(row.answer), sourceNumber: Number(row.sourceNumber || row.number) || undefined };
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
        try { return normalizeImportedQuestion(question, category === 'cloze'); }
        catch (error) { throw new Error(`第 ${groupIndex + 1} 組第 ${index + 1} 題：${error.message}`); }
      })
    };
  });
};

export const exportSectionData = (category, grammarQuestions, groups) => ({
  format: 'regular-exam-questions-v1', category,
  items: category === 'grammar'
    ? grammarQuestions.map(({ stem, choices, answer, sourceNumber }) => ({ stem, choices, answer: answer >= 0 ? 'ABCD'[answer] : '', sourceNumber }))
    : groups.filter(group => group.type === category).map(group => ({
      title: group.title, passage: group.passage, glossary: group.glossary,
      questions: group.questions.map(({ stem, choices, answer, sourceNumber }) => ({ stem, choices, answer: answer >= 0 ? 'ABCD'[answer] : '', sourceNumber }))
    }))
});

export const sectionCsvRows = data => data.category === 'grammar'
  ? data.items.map((question, index) => ({ category: 'grammar', group: '', title: '', passage: '', glossary: '', number: question.sourceNumber || index + 1, stem: question.stem, ...Object.fromEntries(choiceKeys.map((key, choice) => [key, question.choices[choice]])), answer: question.answer }))
  : data.items.flatMap((group, groupIndex) => group.questions.map((question, index) => ({
    category: data.category, group: groupIndex + 1, title: group.title, passage: group.passage,
    glossary: group.glossary, number: question.sourceNumber || index + 1, stem: question.stem,
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

const stripPageFurniture = text => String(text || '').split('\n').filter(line => !/^(?:\s*共\s*\d+\s*頁|\s*第\s*\d+\s*頁|\s*題目共|\s*題目未完|\s*命題教師|\s*注意\s*[:：]|\s*\d+\.\s*.*(?:手寫|答案卷)|\s*\(?用鉛筆不計分\)?|.*學年度.*(?:考試卷|試題卷))/.test(line.trim())).join('\n').trim();

const restoreColumnPassage = text => {
  const lines = String(text || '').split('\n');
  const restored = [];
  for (let index = 0; index < lines.length;) {
    if (!lines[index].includes('\t')) { restored.push(lines[index]); index += 1; continue; }
    const block = [];
    while (index < lines.length && lines[index].includes('\t')) block.push(lines[index++]);
    if (block.length < 3) { restored.push(...block); continue; }
    const columns = block.map(line => line.split('\t'));
    const left = columns.map(parts => parts[0]);
    if (index < lines.length && /^[a-z]/.test(lines[index].trim())) left.push(lines[index++]);
    restored.push(left.join('\n'), '', columns.map(parts => parts.slice(1).join(' ')).join('\n'));
  }
  return restored.join('\n').trim();
};

const separateFollowingPassage = content => {
  const lastOption = [...content.matchAll(/\(D\)/g)].at(-1);
  if (!lastOption) return { questionText: content, followingPassage: '' };
  const afterOption = content.slice(lastOption.index + lastOption[0].length);
  const firstBreak = afterOption.indexOf('\n');
  if (firstBreak < 0) return { questionText: content, followingPassage: '' };
  const followingPassage = stripPageFurniture(afterOption.slice(firstBreak + 1));
  if (followingPassage.length < 140 || followingPassage.split('\n').filter(Boolean).length < 3) return { questionText: content, followingPassage: '' };
  return { questionText: content.slice(0, lastOption.index + lastOption[0].length + firstBreak), followingPassage };
};

const numberedBlocks = (text, category) => {
  const normalized = clean(text).normalize('NFKC').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
  const candidates = [...normalized.matchAll(/(?:^|\n)\s*(?:\(\s*\)\s*)?(\d{1,3})\s*[.)、．]\s*/g)].map(match => ({ index: match.index + (match[0].startsWith('\n') ? 1 : 0), end: match.index + match[0].length, number: Number(match[1]) }));
  let markers = [];
  candidates.forEach((start, startIndex) => {
    const chain = [start];
    for (let index = startIndex + 1; index < candidates.length; index += 1) {
      if (candidates[index].number === chain.at(-1).number + 1) chain.push(candidates[index]);
    }
    if (chain.length > markers.length) markers = chain;
  });
  const questions = [];
  markers.forEach((marker, index) => {
    const content = normalized.slice(marker.end, markers[index + 1]?.index ?? normalized.length).trim();
    const answerPattern = /(?:【\s*答案\s*】|答案\s*[:：]|Answer\s*[:：])\s*[(（]?\s*([A-D])\s*[)）]?/i;
    const answerMatch = content.match(answerPattern);
    const withoutAnswer = content.replace(answerPattern, '').trim();
    const { questionText, followingPassage } = separateFollowingPassage(withoutAnswer);
    const parsed = parseRegularExamQuestion(questionText, 4, category === 'cloze');
    const imageOptions = /\(A\)\s*\(B\)\s*\(C\)\s*\(D\)/.test(questionText);
    const fallback = imageOptions ? { stem: questionText.slice(0, questionText.indexOf('(A)')).trim(), choices: ['（圖片 A）', '（圖片 B）', '（圖片 C）', '（圖片 D）'] } : null;
    if (parsed || fallback) {
      const question = parsed || fallback;
      questions.push({ start: marker.index, sourceNumber: marker.number, ...question, choices: question.choices.map(stripPageFurniture), answer: answerMatch?.[1] || '', followingPassage });
    }
  });
  return { normalized, questions };
};

export const parseDocumentQuestions = (text, category) => {
  if (!categories.has(category)) throw new Error('請先選擇匯入類型。');
  const normalized = clean(text).replace(/\r\n?/g, '\n');
  const headingTypes = [
    ['grammar', /(?:^|\n)\s*(?:[一二三四五六七八九十]+[、.．]\s*)?(?:文法(?:選擇|測驗)?|單字文法選擇|單題\s*[:：]|Grammar(?: Test)?)[^\n]*/gim],
    ['cloze', /(?:^|\n)\s*(?:[一二三四五六七八九十]+[、.．]\s*)?(?:克漏字(?:選擇|測驗)?|Cloze(?: Test)?)[^\n]*/gim],
    ['reading', /(?:^|\n)\s*(?:[一二三四五六七八九十]+[、.．]\s*)?(?:閱讀(?:測驗|理解)|Reading (?:Comprehension|Test))[^\n]*/gim],
    ['groups', /(?:^|\n)\s*[一二三四五六七八九十]+[、.．]\s*題組\s*[:：][^\n]*/gim],
    ['other', /(?:^|\n)\s*(?:[一二三四五六七八九十]+[、.．]\s*)?(?:對話選擇|文意字彙|依提示作答|翻譯|請寫出單字|單字[:：]|答案卷|答案[:：]?$|解答[:：]?$|.*學年度.*答案|聽力稿|【第三部分】[^\n]*非選擇題)[^\n]*/gim]
  ];
  const headings = headingTypes.flatMap(([type, pattern]) => [...normalized.matchAll(pattern)].map(match => ({
    type, index: match.index + (match[0].startsWith('\n') ? 1 : 0)
  }))).sort((a, b) => a.index - b.index);
  const selected = headings.filter(heading => heading.type === category || (category !== 'grammar' && heading.type === 'groups'));
  const chunks = selected.length
    ? selected.map(heading => normalized.slice(heading.index, headings.find(next => next.index > heading.index)?.index ?? normalized.length))
    : category === 'grammar' && headings.length ? [normalized.slice(0, headings[0].index)] : [normalized];
  const items = [];
  chunks.forEach((chunk, index) => {
    const found = numberedBlocks(chunk, category);
    if (!found.questions.length) return;
    if (category === 'grammar') { items.push(...found.questions); return; }
    const first = found.questions[0].start;
    const headerAndPassage = found.normalized.slice(0, first).trim();
    const lines = headerAndPassage.split('\n');
    const hasHeading = /(?:克漏字|閱讀測驗|閱讀理解|Cloze|Reading)/i.test(lines[0] || '');
    const title = hasHeading ? lines.shift().trim() : `${category === 'cloze' ? '克漏字選擇' : '閱讀測驗'}（匯入 ${index + 1}）`;
    let passage = restoreColumnPassage(stripPageFurniture(lines.join('\n').trim() || (!hasHeading ? headerAndPassage : '')));
    let groupQuestions = [];
    found.questions.forEach((question, questionIndex) => {
      const { followingPassage, ...cleanQuestion } = question;
      groupQuestions.push(cleanQuestion);
      if (followingPassage && questionIndex < found.questions.length - 1) {
        items.push({ title: items.length ? `${title}（題組 ${items.length + 1}）` : title, passage, questions: groupQuestions });
        passage = restoreColumnPassage(followingPassage);
        groupQuestions = [];
      }
    });
    if (groupQuestions.length) items.push({ title: items.length ? `${title}（題組 ${items.length + 1}）` : title, passage, questions: groupQuestions });
  });
  const filtered = selected.some(heading => heading.type === 'groups') ? items.filter(item => {
    if (category === 'grammar') return true;
    const numbers = item.questions.map(question => question.sourceNumber).filter(Boolean);
    const hasNumberedBlanks = numbers.filter(number => new RegExp(`(?:^|\\s)${number}\\s*[.、．]\\s*(?:[_＿]{2,}|[a-z])`, 'i').test(item.passage)).length >= 2;
    const looksLikeCloze = hasNumberedBlanks || (item.questions.length >= 2 && item.questions.every(question => !question.stem));
    return category === 'cloze' ? looksLikeCloze : !looksLikeCloze;
  }) : items;
  return normalizeImportedItems(filtered, category);
};
