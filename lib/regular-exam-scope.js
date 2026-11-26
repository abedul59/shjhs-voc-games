const collator = new Intl.Collator('zh-Hant', { numeric: true, sensitivity: 'base' });

export const lessonKey = item => `${item.version || ''}|${item.volume || ''}|${item.unit || ''}`;

export const sortLessons = lessons => [...lessons].sort((a, b) =>
  collator.compare(a.version, b.version) || collator.compare(a.volume, b.volume) || collator.compare(a.unit, b.unit));

export const cumulativeLessonKeys = (lessons, targetKey) => {
  const ordered = sortLessons(lessons);
  const target = ordered.find(lesson => lesson.key === targetKey);
  if (!target) return [];
  return ordered.filter(lesson => lesson.version === target.version &&
    (collator.compare(lesson.volume, target.volume) < 0 ||
      (collator.compare(lesson.volume, target.volume) === 0 && collator.compare(lesson.unit, target.unit) <= 0)))
    .map(lesson => lesson.key);
};

export const cumulativeLessonKeysForSelection = (lessons, selectedKeys) => {
  const selected = new Set(selectedKeys || []);
  const ordered = sortLessons(lessons);
  const lastByVersion = new Map();
  ordered.forEach(lesson => { if (selected.has(lesson.key)) lastByVersion.set(lesson.version, lesson.key); });
  return [...lastByVersion.values()].flatMap(key => cumulativeLessonKeys(ordered, key));
};
