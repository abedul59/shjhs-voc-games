export const sentenceTokens = sentence => [...String(sentence || '').matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)].map(match => match[0]);

const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'it', 'he', 'she', 'they', 'we', 'you', 'i']);

export const chooseTranslationBlanks = (sentence, count, forbidden = new Set()) => {
  const tokens = sentenceTokens(sentence);
  const candidates = tokens.map((word, index) => ({ word, index, key: word.toLowerCase() }))
    .filter(item => !forbidden.has(item.key));
  const priority = candidates.filter(item => item.word.length >= 4 && !commonWords.has(item.key));
  return [...priority, ...candidates.filter(item => !priority.includes(item))]
    .slice(0, Math.max(0, count)).map(item => item.index).sort((a, b) => a - b);
};

export const splitTranslationText = text => String(text || '').split(/\r?\n/).flatMap(line => {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\s*\|\s*/);
  const sourceZh = parts.length > 1 && /[\u3400-\u9fff]/.test(parts[0]) ? parts.shift() : '';
  const english = parts.join(' | ') || trimmed;
  return english.split(/(?<=[.!?])\s+(?=[A-Z"“])/).map(sourceEn => ({ sourceEn: sourceEn.trim(), sourceZh })).filter(item => sentenceTokens(item.sourceEn).length);
});

export function buildTranslationFill(items, blankWidth = 4) {
  const width = Math.max(1, Math.min(8, Math.trunc(Number(blankWidth) || 4)));
  const underline = '_'.repeat(width);
  let gap = 0;
  return items.map(item => {
    let index = 0;
    const selected = new Set(item.blankIndices || []);
    const answers = [];
    const masked = String(item.sourceEn || '').replace(/[A-Za-z]+(?:['’][A-Za-z]+)*/g, word => {
      const current = index++;
      if (!selected.has(current)) return word;
      gap += 1;
      answers.push(`${gap}. ${word}`);
      return `${underline}(${gap})${underline}`;
    });
    return { ...item, prompt: `${item.sourceZh || '（請補中文翻譯）'}\n${masked}`, answer: answers.join('　') };
  });
}
