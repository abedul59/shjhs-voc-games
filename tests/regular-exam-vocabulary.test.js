import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewExamVocabulary } from '../lib/regular-exam-vocabulary.js';
import { cumulativeLessonKeys, lessonKey } from '../lib/regular-exam-scope.js';
import { canTeacherUseAdminPath } from '../lib/admin-feature-permissions.js';

test('reviewer uses the existing exam feature permission', () => {
  assert.equal(canTeacherUseAdminPath('/admin/vocabulary-scope-reviewer', ['regular-exam-generator']), true);
  assert.equal(canTeacherUseAdminPath('/admin/vocabulary-scope-reviewer', []), false);
});

test('reviewer checks article, stems and choices against cumulative lessons', () => {
  const vocabulary = [
    { version: '康軒', volume: 'B1', unit: 'U1', en_us: 'forest', zh_tw: '森林' },
    { version: '康軒', volume: 'B2', unit: 'U1', en_us: 'river', zh_tw: '河流' },
    { version: '康軒', volume: 'B3', unit: 'U1', en_us: 'mountain', zh_tw: '山' }
  ];
  const lessons = vocabulary.map(item => ({ ...item, key: lessonKey(item) }));
  const scope = cumulativeLessonKeys(lessons, lessonKey(vocabulary[1]));
  const results = reviewExamVocabulary([
    { label: '文章', text: 'The forest is near the mountain.' },
    { label: '題幹', text: 'Which mountain is higher?' },
    { label: '選項', text: '(A) river (B) mountain (C) forest (D) mountain' }
  ], vocabulary, scope, lessonKey);
  const mountain = results.find(item => item.normalized === 'mountain');
  assert.deepEqual(mountain.locations, ['文章', '題幹', '選項']);
  assert.equal(mountain.meaning, '山');
  assert.equal(results.some(item => item.normalized === 'forest' || item.normalized === 'river'), false);
  assert.equal(results.some(item => ['b', 'c', 'd'].includes(item.normalized)), false);
});
