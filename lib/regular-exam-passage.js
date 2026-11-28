const speakerPattern = /^([A-Z][A-Za-z .’'\-]{0,24})\s*[:：]\s*(.*)$/;

export const formatClozePassage = (value, questions = [], blankWidth = 4) => {
  let passage = String(value || '');
  const side = '_'.repeat(Math.max(1, Math.min(8, Number(blankWidth) || 4)));
  for (const question of questions) {
    const source = Number(question.sourceNumber || question.number);
    const current = Number(question.number || source);
    if (!source || !current) continue;
    const marker = new RegExp(`(?<![A-Za-z0-9])(?:[_＿]{2,}\\s*)?${source}\\s*[.．、](?:\\s*[_＿]{2,})?`, 'g');
    passage = passage.replace(marker, `${side}${current}.${side}`);
    passage = passage.replace(new RegExp(`[_＿]{2,}\\s*${source}\\s*[_＿]{2,}`, 'g'), `${side}${current}.${side}`);
    passage = passage.replace(new RegExp(`(?<=\\t)\\s*${source}\\s*(?=\\t)`, 'g'), `${side}${current}.${side}`);
  }
  return passage;
};

const joinWrappedLines = lines => lines.map(line => line.trim()).filter(Boolean).join(' ').replace(/\s+([,.;!?])/g, '$1');
const splitLongParagraph = text => {
  if (text.length < 260) return [text];
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  if (sentences.length < 3) return [text];
  const paragraphs = [];
  let current = '';
  for (const sentence of sentences) {
    current = current ? `${current} ${sentence}` : sentence;
    if (current.length >= 170) { paragraphs.push(current); current = ''; }
  }
  if (current) paragraphs.push(current);
  return paragraphs;
};

export const passageLayout = value => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return { title: '', mode: 'article', blocks: [] };
  const lines = normalized.split('\n');
  let title = '';
  const first = lines[0].trim();
  const second = lines.slice(1).find(line => line.trim())?.trim() || '';
  if (second && first.length <= 45 && !/[.!?。！？:：]$/.test(first) && !speakerPattern.test(first) && !/^\d+[.)]/.test(first)) {
    title = first;
    lines.shift();
  }
  const speakerCount = lines.filter(line => speakerPattern.test(line.trim())).length;
  if (speakerCount >= 2) {
    const blocks = [];
    for (const line of lines) {
      const cleanLine = line.trim().replace(/[\t ]+/g, ' ');
      if (!cleanLine) continue;
      const speaker = cleanLine.match(speakerPattern);
      if (speaker) blocks.push({ speaker: speaker[1], text: speaker[2] });
      else if (blocks.length) blocks.at(-1).text += `${blocks.at(-1).text ? ' ' : ''}${cleanLine}`;
      else blocks.push({ speaker: '', text: cleanLine });
    }
    return { title, mode: 'dialogue', blocks };
  }
  if (lines.filter(line => line.includes('\t') || /^\s*\d{1,2}:\d{2}/.test(line)).length >= 3) {
    return { title, mode: 'table', blocks: [lines.join('\n').trim()] };
  }
  const blocks = lines.join('\n').split(/\n[ \t]*\n+/).flatMap(part => splitLongParagraph(joinWrappedLines(part.split('\n')))).filter(Boolean);
  return { title, mode: 'article', blocks };
};

export const passageParagraphs = value => passageLayout(value).blocks.map(block => typeof block === 'string' ? block : `${block.speaker}: ${block.text}`);
