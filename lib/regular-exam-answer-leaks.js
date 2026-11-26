const answerParts = (answer, translation) => translation
  ? String(answer || '').split(/\s*[　\n]+\s*/).map(part => part.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  : String(answer || '').split(/\s*[/／;；、]\s*/).map(part => part.trim()).filter(Boolean);

const containsAnswer = (text, answer) => {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const latinStart = /^[A-Za-z]/.test(answer) ? '(?<![A-Za-z])' : '';
  const latinEnd = /[A-Za-z]$/.test(answer) ? '(?![A-Za-z])' : '';
  return new RegExp(`${latinStart}${escaped}${latinEnd}`, 'iu').test(String(text || ''));
};

export function findRegularExamAnswerLeaks(data) {
  const sources = [];
  const add = (location, text) => { if (String(text || '').trim()) sources.push({ location, text }); };
  for (const item of data.listening?.image || []) item.choices?.forEach((choice, index) => add(`聽力第 ${item.number} 題選項 ${'ABC'[index]}`, choice.text));
  for (const item of [...(data.listening?.basic || []), ...(data.listening?.comprehension || []), ...(data.grammarQuestions || [])]) {
    add(`第 ${item.number} 題題幹`, item.stem);
    item.choices?.forEach((choice, index) => add(`第 ${item.number} 題選項 ${'ABCD'[index]}`, choice));
  }
  for (const group of data.groups || []) {
    add(`${group.title}文章`, group.passage);
    add(`${group.title}單字提示`, group.glossary);
    for (const item of group.questions || []) {
      add(`第 ${item.number} 題題幹`, item.stem);
      item.choices?.forEach((choice, index) => add(`第 ${item.number} 題選項 ${'ABCD'[index]}`, choice));
    }
  }
  const answers = [];
  (data.nonChoice?.vocabulary || []).forEach((item, index) => {
    add(`單字與文意字彙第 ${index + 1} 題`, item.prompt);
    answers.push({ item: `單字與文意字彙第 ${index + 1} 題`, parts: answerParts(item.answer, false) });
  });
  (data.nonChoice?.sections || []).forEach(section => {
    add(`${section.title}作答說明`, section.instructions);
    section.items?.forEach((item, index) => {
      add(`${section.title}第 ${index + 1} 題`, item.prompt);
      answers.push({ item: `${section.title}第 ${index + 1} 題`, parts: answerParts(item.answer, section.type === 'translation' || section.title === '翻譯填充') });
    });
  });
  return answers.flatMap(({ item, parts }) => parts.flatMap(answer => sources
    .filter(source => containsAnswer(source.text, answer))
    .map(source => ({ item, answer, location: source.location }))));
}
