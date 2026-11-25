const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];

export const sectionOrdinal = index => numerals[index] || String(index + 1);
export const stripSectionOrdinal = title => String(title || '').replace(/^(?:[一二三四五六七八九十]+|\d+)[、.．]\s*/, '').replace(/^非選擇題[：:]\s*/, '');
export const groupTitle = (group, index) => `${sectionOrdinal(4 + index)}、${stripSectionOrdinal(group.title)}`;
export const writtenTitle = (title, groupCount, index) => `${sectionOrdinal(4 + groupCount + index)}、${stripSectionOrdinal(title)}`;

export const scoreSlots = (groups, nonChoice) => [
  'image', 'basic', 'comprehension', 'grammar',
  ...groups.map((_, index) => `group:${index}`),
  'vocabulary', ...nonChoice.sections.map((_, index) => `written:${index}`)
];
