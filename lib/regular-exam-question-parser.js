const optionLabels = ['A', 'B', 'C', 'D'];

export const parseRegularExamQuestion = (rawText, choiceCount = 4, allowEmptyStem = false) => {
  const normalized = String(rawText || '')
    .replace(/[Ⓐⓐ]/g, '(A)').replace(/[Ⓑⓑ]/g, '(B)')
    .replace(/[Ⓒⓒ]/g, '(C)').replace(/[Ⓓⓓ]/g, '(D)')
    .normalize('NFKC');
  const markerPattern = /\(([A-D])\)|(^|[\s\n])([A-D])[.)．、:：]\s*/gim;
  const markers = [...normalized.matchAll(markerPattern)].map(match => ({
    label: (match[1] || match[3]).toUpperCase(),
    index: match.index,
    contentStart: match.index + match[0].length
  }));
  const expected = optionLabels.slice(0, choiceCount);
  let sequence = null;
  for (let index = 0; index <= markers.length - choiceCount; index += 1) {
    const candidate = markers.slice(index, index + choiceCount);
    if (candidate.every((marker, markerIndex) => marker.label === expected[markerIndex])) {
      sequence = candidate;
      break;
    }
  }
  if (!sequence) return null;
  const stem = normalized.slice(0, sequence[0].index).trim().replace(/^\s*\d+\s*[.)、．]\s*/, '');
  const choices = sequence.map((marker, index) => normalized
    .slice(marker.contentStart, sequence[index + 1]?.index ?? normalized.length)
    .trim());
  if ((!stem && !allowEmptyStem) || choices.some(choice => !choice)) return null;
  return { stem, choices };
};
