import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClozePassage, passageLayout } from '../lib/regular-exam-passage.js';
import { groupTitle, orderExamGroups } from '../lib/regular-exam-sections.js';

test('cloze blanks show current consecutive question numbers inside the blank', () => {
  const passage = 'John: He is good at 41. tennis.\nMindy: Do you want 42. a bike?\nJohn: I can tell 43. stories.';
  const questions = [41, 42, 43].map((sourceNumber, index) => ({ sourceNumber, number: 30 + index }));
  assert.equal(formatClozePassage(passage, questions), 'John: He is good at _______30._______ tennis.\nMindy: Do you want _______31._______ a bike?\nJohn: I can tell _______32._______ stories.');
  assert.equal(formatClozePassage('I am\t21\tin class.', [{ sourceNumber: 21, number: 30 }]), 'I am\t_______30._______\tin class.');
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
});

test('group headings remove import artifacts and number cloze before reading', () => {
  const groups = [
    { type: 'cloze', title: '克漏字選擇（匯入 1）（題組 5）' },
    { type: 'reading', title: '閱讀測驗（匯入 1）（題組 2）' },
    { type: 'reading', title: '閱讀測驗（題組 3）' }
  ];
  assert.equal(groupTitle(groups[0], 0, groups), '五、克漏字選擇（題組 1）');
  assert.equal(groupTitle(groups[1], 1, groups), '六、閱讀測驗（題組 1）');
  assert.equal(groupTitle(groups[2], 2, groups), '七、閱讀測驗（題組 2）');
  assert.deepEqual(orderExamGroups([groups[1], groups[0], groups[2]]), groups);
});
