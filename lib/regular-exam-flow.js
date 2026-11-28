import { formatClozePassage, passageLayout } from './regular-exam-passage.js';

export const FLOW_PAGE_CAPACITY = 112;

const textLines = (value, width = 48) => String(value || '').split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / width)), 0);
const questionSize = question => 2 + textLines(question.stem, 50) + textLines((question.choices || []).join('　'), 58) + (question.choiceImages?.filter(Boolean).length || 0) * 12;
const blockSize = block => 1 + textLines(typeof block === 'string' ? block : `${block.speaker}: ${block.text}`, 44);

// Keep a long paragraph or dialogue turn small enough to continue on the next page.
const splitBlock = (block, mode) => {
  const source = typeof block === 'string' ? block : block.text;
  const maxLength = mode === 'table' ? 150 : 360;
  if (source.length <= maxLength) return [block];
  const pieces = mode === 'table' ? source.split(/(?<=\n)/) : source.match(/\S+\s*/g) || [];
  const chunks = [];
  let current = '';
  for (const piece of pieces) {
    if (current && current.length + piece.length > maxLength) { chunks.push(current.trimEnd()); current = ''; }
    current += piece;
  }
  if (current.trim()) chunks.push(current.trimEnd());
  return chunks.map((part, index) => typeof block === 'string' ? part : { speaker: index ? '' : block.speaker, text: part });
};

export const paginateExamGroups = (groups, blankWidth = 4, capacity = FLOW_PAGE_CAPACITY) => {
  const pages = [[]];
  let used = 0;
  const nextPage = () => { if (pages.at(-1).length) pages.push([]); used = 0; };

  groups.forEach((group, groupIndex) => {
    const source = group.passage || '（請在編輯區輸入閱讀、對話或克漏字文章）';
    const formatted = group.type === 'cloze' ? formatClozePassage(source, group.questions, blankWidth) : source;
    const layout = passageLayout(formatted);
    const blocks = layout.blocks.flatMap(block => splitBlock(block, layout.mode));
    let part = 0;
    let segment;
    const addSegment = continued => {
      segment = {
        ...group, originalId: group.id, groupIndex, id: `${group.id}-part-${part++}`,
        continued, layout: { ...layout, title: continued ? '' : layout.title, blocks: [] },
        images: [], glossary: '', questions: []
      };
      pages.at(-1).push(segment);
      used += continued ? 3 : 4;
      if (!continued && layout.title) used += 2;
    };
    const firstBlockSize = blocks.length ? blockSize(blocks[0]) : 0;
    const minimumStart = 4 + (layout.title ? 2 : 0) + firstBlockSize;
    if (pages.at(-1).length && (group.startNewPage || used + minimumStart > capacity)) nextPage();
    addSegment(false);
    const ensureRoom = size => {
      if (used + size <= capacity || pages.at(-1).length === 1 && used <= 6 && size > capacity - used) return;
      nextPage();
      addSegment(true);
    };
    for (const block of blocks) {
      const size = blockSize(block);
      ensureRoom(size);
      segment.layout.blocks.push(block);
      used += size;
    }
    for (const image of (group.images || []).filter(Boolean)) {
      ensureRoom(12);
      segment.images.push(image);
      used += 12;
    }
    if (group.glossary) {
      const size = textLines(group.glossary, 50) + 2;
      ensureRoom(size);
      segment.glossary = group.glossary;
      used += size;
    }
    for (const question of group.questions || []) {
      const size = questionSize(question);
      ensureRoom(size);
      segment.questions.push(question);
      used += size;
    }
  });
  return pages.filter(page => page.length).length ? pages.filter(page => page.length) : [[]];
};
