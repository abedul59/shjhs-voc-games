import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { applyChoiceAnswerKey, csvRowsToSection, exportSectionData, extractChoiceAnswerKey, normalizeImportedItems, parseDocumentQuestions, pdfTextToPlain, sectionCsvRows } from '../lib/regular-exam-import.js';

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
