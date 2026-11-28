import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClozePassage, passageLayout } from '../lib/regular-exam-passage.js';
import { groupTitle, orderExamGroups, writtenTitle } from '../lib/regular-exam-sections.js';
import { paginateExamGroups } from '../lib/regular-exam-flow.js';

test('cloze blanks show current consecutive question numbers inside the blank', () => {
  const passage = 'John: He is good at 41. tennis.\nMindy: Do you want 42. a bike?\nJohn: I can tell 43. stories.';
  const questions = [41, 42, 43].map((sourceNumber, index) => ({ sourceNumber, number: 30 + index }));
  assert.equal(formatClozePassage(passage, questions), 'John: He is good at ____30.____ tennis.\nMindy: Do you want ____31.____ a bike?\nJohn: I can tell ____32.____ stories.');
  assert.equal(formatClozePassage('I am\t21\tin class.', [{ sourceNumber: 21, number: 30 }], 2), 'I am\t__30.__\tin class.');
  assert.equal(formatClozePassage('Look at 41. now.', [questions[0]], 1), 'Look at _30._ now.');
});

test('dialogue and article passages receive distinct layout with article title and paragraphs', () => {
  const dialogue = passageLayout('John: Hello, Mindy.\nHow are you?\nMindy: Fine, thanks.\nJohn: Great.');
  assert.equal(dialogue.mode, 'dialogue');
  assert.deepEqual(dialogue.blocks.map(turn => turn.speaker), ['John', 'Mindy', 'John']);
  assert.equal(dialogue.blocks[0].text, 'Hello, Mindy. How are you?');
  const article = passageLayout('Carrie’s Report\nThe students collected cans yesterday. They sold the cans and made some money. They also learned how to recycle aluminum.\nTheir teacher asked them to explain how the project helps the Earth. Everyone shared a different idea with the class.\nThe class will collect more cans next week because the students enjoyed working together.');
  assert.equal(article.mode, 'article');
  assert.equal(article.title, 'Carrie’s Report');
  assert.ok(article.blocks.length >= 2);
  const table = passageLayout('Schedule\nTime\tActivity\n08:00\tBreakfast\n09:00\tHomework\n10:00\tReading');
  assert.equal(table.mode, 'table');
  assert.match(table.blocks[0], /08:00\tBreakfast\n09:00\tHomework/);
});

test('group headings remove import artifacts and number cloze before reading', () => {
  const groups = [
    { type: 'cloze', title: '克漏字選擇（匯入 1）（題組 5）' },
    { type: 'reading', title: '閱讀測驗（匯入 1）（題組 2）' },
    { type: 'reading', title: '閱讀測驗（題組 3）' }
  ];
  assert.equal(groupTitle(groups[0], 0, groups), '五、克漏字選擇（題組 1）');
  assert.equal(groupTitle(groups[1], 1, groups), '六、閱讀測驗（題組 1）');
  assert.equal(groupTitle(groups[2], 2, groups), '六、閱讀測驗（題組 2）');
  assert.equal(writtenTitle('單字與文意字彙', groups, 0), '七、單字與文意字彙');
  assert.equal(groupTitle({ type: 'cloze', title: '克漏字選擇' }, 1, [groups[0], { type: 'cloze', title: '克漏字選擇' }]), '五、克漏字選擇（題組 2）');
  assert.deepEqual(orderExamGroups([groups[1], groups[0], groups[2]]), groups);
});

test('reading groups use remaining page space and split long passages into continuations', () => {
  const groups = [
    { id: 'first', type: 'reading', title: '閱讀測驗', passage: 'Short passage.', images: [], glossary: '', questions: [{ number: 1, stem: 'What happened?', choices: ['A', 'B', 'C', 'D'] }] },
    { id: 'second', type: 'reading', title: '閱讀測驗', passage: 'Long report\n' + Array.from({ length: 55 }, () => 'The students collected cans and helped the Earth.').join(' '), images: [], glossary: '', questions: [{ number: 2, stem: 'What did the students collect?', choices: ['Cans', 'Paper', 'Books', 'Bottles'] }] }
  ];
  const pages = paginateExamGroups(groups, 3, 30);
  assert.deepEqual(pages[0].map(part => part.originalId), ['first', 'second']);
  assert.ok(pages.length > 1);
  assert.ok(pages.slice(1).some(page => page.some(part => part.originalId === 'second' && part.continued)));
  assert.equal(pages.flat().filter(part => part.originalId === 'second').flatMap(part => part.questions).length, 1);
  assert.match(pages.flat().filter(part => part.originalId === 'second').flatMap(part => part.layout.blocks).join(' '), /helped the Earth/);
  assert.ok(pages.flat().every(part => part.layout.blocks.length || part.images.length || part.glossary || part.questions.length));
});
