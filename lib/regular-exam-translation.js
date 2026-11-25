export const sentenceTokens = sentence => [...String(sentence || '').matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)].map(match => match[0]);

export function buildTranslationFill(items) {
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
      return `(${gap}) ______`;
    });
    return { ...item, prompt: `${masked}\n中文：${item.sourceZh || '（請補中文翻譯）'}`, answer: answers.join('　') };
  });
}
