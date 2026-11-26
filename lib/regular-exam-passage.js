export const passageParagraphs = value => String(value || '')
  .replace(/\r\n?/g, '\n')
  .split(/\n[ \t]*\n+/)
  .map(paragraph => paragraph.trim())
  .filter(Boolean);
