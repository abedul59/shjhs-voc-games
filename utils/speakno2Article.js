export const SPEAKNO2_CATEGORIES = [
  { grade: 7, label: '七年級' },
  { grade: 8, label: '八年級' },
  { grade: 9, label: '九年級' },
  { grade: 10, label: '台南市國中英語文競賽' }
];

export const speakno2CategoryLabel = (grade) =>
  SPEAKNO2_CATEGORIES.find((category) => category.grade === Number(grade))?.label || `${grade} 年級`;

// English contractions and hyphenated words count as one word.
export const countSpeakno2Words = (content) =>
  (String(content || '').match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) || []).length;

export const formatSpeakno2Duration = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const normalizeSpeakno2Links = (links) =>
  (Array.isArray(links) ? links : []).map((link) => ({
    name: String(link?.name || '').trim(),
    url: String(link?.url || '').trim()
  })).filter((link) => link.name && link.url);

export const isSafeSpeakno2Url = (value) => {
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
