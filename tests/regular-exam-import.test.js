import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { applyChoiceAnswerKey, csvRowsToSection, exportSectionData, extractChoiceAnswerKey, joinReadingScreenshotText, normalizeImportedItems, parseDocumentQuestions, parseReadingScreenshotText, pdfTextToPlain, sectionCsvRows } from '../lib/regular-exam-import.js';

test('reading groups survive CSV and JSON round trips with passages and answers', () => {
  const original = [{ type: 'reading', title: '閱讀測驗', passage: 'First paragraph.\n\nSecond, paragraph.', glossary: 'word 中文', questions: [
    { stem: 'Which one?', choices: ['A, one', 'B', 'C', 'D'], answer: 2 },
    { stem: 'Another?', choices: ['A', 'B', 'C', 'D'], answer: -1 }
  ] }];
  const exported = exportSectionData('reading', [], original);
  const csv = Papa.unparse(sectionCsvRows(exported));
  const fromCsv = csvRowsToSection(Papa.parse(csv, { header: true }).data, 'reading');
  const fromJson = normalizeImportedItems(JSON.parse(JSON.stringify(exported)), 'reading');
  for (const result of [fromCsv, fromJson]) {
    assert.equal(result[0].passage, original[0].passage);
    assert.equal(result[0].questions[0].choices[0], 'A, one');
    assert.equal(result[0].questions[0].answer, 2);
    assert.equal(result[0].questions[1].answer, -1);
  }
});

test('document text parses groups without inventing missing answers', () => {
  const text = '閱讀測驗\nA short passage.\n1. Who is here?\n(A) Sam\n(B) Sue\n(C) Max\n(D) May\n答案：B\n2. What is this?\n(A) A book\n(B) A pen\n(C) A bag\n(D) A desk';
  const [group] = parseDocumentQuestions(text, 'reading');
  assert.equal(group.passage, 'A short passage.');
  assert.equal(group.questions.length, 2);
  assert.deepEqual(group.questions.map(question => question.answer), [1, -1]);
});

test('full exam text keeps grammar, cloze and reading sections separate', () => {
  const choices = '(A) One\n(B) Two\n(C) Three\n(D) Four';
  const text = `文法選擇\n1. Grammar question?\n${choices}\n克漏字選擇\nA cloze passage.\n2. Cloze question?\n${choices}\n閱讀測驗\nA reading passage.\n3. Reading question?\n${choices}`;
  assert.equal(parseDocumentQuestions(text, 'grammar').length, 1);
  assert.equal(parseDocumentQuestions(text, 'cloze')[0].questions[0].stem, 'Cloze question?');
  assert.equal(parseDocumentQuestions(text, 'reading')[0].questions[0].stem, 'Reading question?');
});

test('incomplete multiple-choice rows are rejected', () => {
  assert.throws(() => csvRowsToSection([{ stem: 'Question', choice_a: 'A' }], 'grammar'), /A～D/);
});

test('PDF fragments preserve words and line boundaries', () => {
  const item = (str, x, y, width, hasEOL = false) => ({ str, transform: [1, 0, 0, 1, x, y], width, height: 10, hasEOL });
  assert.equal(pdfTextToPlain([item('(A)', 0, 8, 15), item('Who', 0, 20, 18), item('is', 24, 20, 8), item('here?', 35, 20, 24, true)]), 'Who is here?\n(A)');
});

test('answer bubbles and option-only cloze questions parse without guessing answers', () => {
  const text = '三、克漏字選擇\nA short passage.\n（ ）21. (A) red (B) blue (C) green (D) black\n（ ）22. (A) one (B) two (C) three (D) four';
  const [group] = parseDocumentQuestions(text, 'cloze');
  assert.deepEqual(group.questions.map(question => question.sourceNumber), [21, 22]);
  assert.deepEqual(group.questions.map(question => question.answer), [-1, -1]);
});

test('long passages between question runs create separate groups', () => {
  const secondPassage = 'This is a second passage about a school and its students.\nThe students are reading books and having a good time together.\nTheir teacher is kind and helpful every day.';
  const text = `四、閱讀測驗\nFirst passage.\n（ ）36. Who? (A) Ann (B) Ben (C) Cal (D) Dan\n（ ）37. Where? (A) Home (B) Park (C) School (D) Shop\n${secondPassage}\n（ ）38. Why? (A) One (B) Two (C) Three (D) Four`;
  const groups = parseDocumentQuestions(text, 'reading');
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(group => group.questions.length), [2, 1]);
  assert.match(groups[1].passage, /second passage/);
  assert.equal(groups[0].questions[1].choices[3], 'Shop');
});

test('compressed and separate answer sheets match source question numbers', () => {
  const answers = extractChoiceAnswerKey('段考答案\n1-5 ABCDA 6-10 BCDAB');
  assert.equal(answers[1], 'A');
  assert.equal(answers[10], 'B');
  const separate = extractChoiceAnswerKey('答案\n21. (C) 22. A 23 B');
  const [group] = parseDocumentQuestions('三、克漏字\nPassage.\n（ ）21. (A) red (B) blue (C) green (D) black\n（ ）22. (A) one (B) two (C) three (D) four', 'cloze');
  assert.equal(applyChoiceAnswerKey([group], 'cloze', separate), 2);
  assert.deepEqual(group.questions.map(question => question.answer), [2, 0]);
});

test('numbered side notes do not interrupt reading questions', () => {
  const text = '四、閱讀測驗\nA passage.\n38. Who? (A) Ann (B) Ben\n注意:\n(C) Cal (D) Dan\n1.手寫答案請用原子筆\n39. Where? (A) Home\n2.手寫答案請寫在答案卷\n(B) Park (C) School (D) Shop';
  const [group] = parseDocumentQuestions(text, 'reading');
  assert.deepEqual(group.questions.map(question => question.sourceNumber), [38, 39]);
  assert.equal(group.questions[0].choices[3], 'Dan');
  assert.equal(group.questions[1].choices[0], 'Home');
});

test('two-column exam pages and generic sections keep question types separate', () => {
  const item = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y], width: 180, height: 10 });
  const left = Array.from({ length: 3 }, (_, index) => [item(`${16 + index}. Grammar?`, 20, 700 - index * 60), item('(A) One (B) Two (C) Three (D) Four', 20, 680 - index * 60)]).flat();
  const right = Array.from({ length: 3 }, (_, index) => [item(`${19 + index}. Grammar?`, 350, 700 - index * 60), item('(A) One (B) Two (C) Three (D) Four', 350, 680 - index * 60)]).flat();
  const plain = pdfTextToPlain([...left, ...right, ...Array.from({ length: 5 }, (_, index) => item('Passage text', 20, 460 - index * 15)), ...Array.from({ length: 5 }, (_, index) => item('Passage text', 350, 460 - index * 15))], 650);
  assert.deepEqual([...plain.matchAll(/(?:^|\n)(\d+)\./g)].map(match => Number(match[1])), [16, 17, 18, 19, 20, 21]);
  const choices = '(A) One (B) Two (C) Three (D) Four';
  const text = `一、單題：每題 2 分\n16. Grammar? ${choices}\n二、題組：每題 2 分\nA story about Sam.\n30. Who is Sam? ${choices}\n31. Where is Sam? ${choices}\nJohn is good at 32. ______ and 33. ______.\nHe practices every day because he wants to be a professional player in the future.\nHis friends watch him play and cheer for him after school.\n32. ${choices}\n33. ${choices}\n【第三部分】非選擇題\n1. Written answer`;
  assert.deepEqual(parseDocumentQuestions(text, 'grammar').map(question => question.sourceNumber), [16]);
  const reading = parseDocumentQuestions(text, 'reading');
  const cloze = parseDocumentQuestions(text, 'cloze');
  assert.deepEqual(reading.flatMap(group => group.questions.map(question => question.sourceNumber)), [30, 31]);
  assert.deepEqual(cloze.flatMap(group => group.questions.map(question => question.sourceNumber)), [32, 33]);
  assert.equal(reading[0].title, '閱讀測驗（題組 1）');
  assert.equal(cloze[0].title, '克漏字選擇（題組 1）');
});

test('answer sheet rows align numbers with letters', () => {
  const answers = extractChoiceAnswerKey('16.\t17.\t18.\t19.\t20.\nD\tD\tC\tB\tB\n21. 22. 23.\nA B C');
  assert.deepEqual([16, 17, 18, 19, 20, 21, 22, 23].map(number => answers[number]), ['D', 'D', 'C', 'B', 'B', 'A', 'B', 'C']);
});

test('reading image choices survive CSV and JSON round trips', () => {
  const image = 'data:image/png;base64,aGVsbG8=';
  const original = [{ type: 'reading', title: '閱讀測驗', passage: 'Choose a picture.', questions: [
    { stem: 'Which picture?', choices: ['', 'A train', '', 'A boat'], choiceImages: [image, '', image, ''], answer: 2 }
  ] }];
  const exported = exportSectionData('reading', [], original);
  const csv = Papa.unparse(sectionCsvRows(exported));
  for (const imported of [normalizeImportedItems(exported, 'reading'), csvRowsToSection(Papa.parse(csv, { header: true }).data, 'reading')]) {
    assert.deepEqual(imported[0].questions[0].choiceImages, [image, '', image, '']);
    assert.deepEqual(imported[0].questions[0].choices, ['', 'A train', '', 'A boat']);
    assert.equal(imported[0].questions[0].answer, 2);
  }
});

test('separate reading screenshots join passage parts before question options', () => {
  const text = joinReadingScreenshotText(
    ['1. The first paragraph introduces Amy.', '2. The second paragraph describes her trip.', '3. The final paragraph explains what she learned.'],
    ['36. Where did Amy go?\n(A) Home (B) School (C) Park (D) Library', '37. What did she learn?\n(A) One (B) Two (C) Three (D) Four']
  );
  const [group] = parseReadingScreenshotText(text);
  assert.match(group.passage, /first paragraph[\s\S]*second paragraph[\s\S]*final paragraph/);
  assert.deepEqual(group.questions.map(question => question.sourceNumber), [36, 37]);
});
