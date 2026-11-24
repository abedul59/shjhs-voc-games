import {
  AlignmentType, BorderStyle, Document, ImageRun, Packer, PageOrientation,
  Paragraph, SectionType, Table, TableCell, TableRow, TextRun, WidthType
} from 'docx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const FONT_ZH = '新細明體';
const FONT_EN = 'Times New Roman';
const B4_WIDTH = 14570;
const B4_HEIGHT = 20636;
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const labels = ['A', 'B', 'C', 'D'];

const run = (text, options = {}) => new TextRun({
  text: String(text ?? ''),
  font: options.english ? FONT_EN : FONT_ZH,
  size: options.size || 21,
  bold: Boolean(options.bold),
  break: options.break || 0
});

const paragraph = (children = '', options = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [run(children, options)],
  alignment: options.alignment || AlignmentType.LEFT,
  spacing: { before: options.before || 0, after: options.after ?? 70, line: options.line || 250 },
  keepNext: Boolean(options.keepNext),
  pageBreakBefore: Boolean(options.pageBreakBefore)
});

const heading = (text, options = {}) => paragraph([run(text, { bold: true, size: options.size || 22 })], { before: options.before || 80, after: 60, keepNext: true });

const dataUrlToBytes = dataUrl => {
  const base64 = String(dataUrl || '').split(',')[1];
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const imageType = dataUrl => String(dataUrl).startsWith('data:image/jpeg') ? 'jpg' : 'png';

const listeningImageTable = item => {
  const headerCells = [new TableCell({ children: [paragraph(String(item.number), { alignment: AlignmentType.CENTER })], borders })];
  const imageCells = [new TableCell({ children: [paragraph('')], borders })];
  item.choices.forEach((choice, index) => {
    headerCells.push(new TableCell({ children: [paragraph(`(${labels[index]}) ${choice.text || ''}`, { alignment: AlignmentType.CENTER })], borders }));
    const bytes = dataUrlToBytes(choice.image);
    imageCells.push(new TableCell({
      borders,
      children: [bytes
        ? paragraph([new ImageRun({ data: bytes, type: imageType(choice.image), transformation: { width: 95, height: 70 } })], { alignment: AlignmentType.CENTER })
        : paragraph('（圖片）', { alignment: AlignmentType.CENTER })]
    }));
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), new TableRow({ children: imageCells })]
  });
};

const mcqParagraph = question => {
  const children = [run(`${question.number}. ${question.stem || '　　　　　　　　　　　　　　　　　'}`, { english: true })];
  question.choices.forEach((choice, index) => children.push(run(`  (${labels[index]}) ${choice || '　　　　　　　　　'}`, { english: true, break: index === 0 ? 1 : 0 })));
  return paragraph(children, { after: 90 });
};

const groupChildren = group => [
  heading(group.title || '閱讀／克漏字題組'),
  paragraph(group.passage || '（請在此輸入文章、對話或克漏字內容）', { after: 80 }),
  ...(group.glossary ? [paragraph(group.glossary, { after: 80 })] : []),
  ...group.questions.map(mcqParagraph)
];

const nonChoiceChildren = data => {
  const children = [heading(`第二部分：非選擇題【請在答案卷作答】${data.preset.nonChoicePercent}%`, { before: 140 })];
  if (data.nonChoice.vocabulary.length) {
    children.push(heading('單字與文意字彙'));
    data.nonChoice.vocabulary.forEach((item, index) => children.push(paragraph(`${index + 1}. ${item.prompt || '　　　　　　　　　'}`, { after: 55 })));
  }
  data.nonChoice.sections.forEach(section => {
    children.push(heading(section.title));
    children.push(paragraph(section.instructions || ''));
    section.items.forEach((item, index) => children.push(paragraph(`${index + 1}. ${item.prompt || '　　　　　　　　　　　　　　　　　　　　　　　　　'}`, { after: 65 })));
  });
  return children;
};

const questionBody = data => [
  heading(`第一部分：選擇題【請在電腦答案卡上作答】${data.preset.choicePercent}%`),
  heading('聽力素養測驗 20%'),
  heading('一、辨識句意：根據聽到的內容，選出符合描述的圖片。5%（每題1分）'),
  ...data.listening.image.map(item => listeningImageTable(item)),
  heading('二、基本問答：根據聽到的內容，選出最適合的回應或問句。5%（每題1分）'),
  ...data.listening.basic.map(mcqParagraph),
  heading('三、言談理解：根據聽到的內容，選出最適合的答案。10%（每題2分）'),
  ...data.listening.comprehension.map(mcqParagraph),
  heading(`四、文法、字彙和對話選擇 ${data.preset.grammarCount}%`),
  ...data.grammarQuestions.map(mcqParagraph),
  ...data.groups.flatMap(groupChildren),
  ...nonChoiceChildren(data),
  paragraph('考題結束。答案請寫在答案卷上。', { alignment: AlignmentType.CENTER, before: 180 })
];

const allMultipleChoice = data => [
  ...data.listening.image,
  ...data.listening.basic,
  ...data.listening.comprehension,
  ...data.grammarQuestions,
  ...data.groups.flatMap(group => group.questions)
];

const answerBody = data => {
  const questions = allMultipleChoice(data).sort((a, b) => a.number - b.number);
  const children = [heading(`第一部分：選擇題 ${data.preset.choicePercent}%`, { before: 120 })];
  for (let index = 0; index < questions.length; index += 10) {
    const line = questions.slice(index, index + 10).map(question => `${question.number}.${labels[question.answer] || '＿'}`).join('　');
    children.push(paragraph(line, { english: true, after: 80 }));
  }
  children.push(heading(`第二部分：非選擇題 ${data.preset.nonChoicePercent}%`, { before: 160 }));
  if (data.nonChoice.vocabulary.length) {
    children.push(heading('單字與文意字彙'));
    data.nonChoice.vocabulary.forEach((item, index) => children.push(paragraph(`${index + 1}. ${item.answer || '　　　　　　　　　'}`, { english: true })));
  }
  data.nonChoice.sections.forEach(section => {
    children.push(heading(section.title));
    section.items.forEach((item, index) => children.push(paragraph(`${index + 1}. ${item.answer || '　　　　　　　　　　　　　　　　　'}`, { english: true })));
  });
  return children;
};

const documentTitle = (data, answerMode) => [
  paragraph([run(`${data.metadata.schoolName}${data.metadata.schoolYear}學年度第${data.metadata.semester}學期${data.metadata.grade}年級第${data.metadata.examNumber}次定期評量 英語科 ${answerMode ? '正確答案' : '題目卷'}`, { bold: true, size: 28 })], { alignment: AlignmentType.CENTER, after: 70 }),
  paragraph(`${data.metadata.grade}年　　班　座號　　　姓名　　　　　　　　　`, { alignment: AlignmentType.RIGHT, after: 80 })
];

const buildQuestionDocument = data => new Document({
  styles: { default: { document: { run: { font: FONT_ZH, size: 21 }, paragraph: { spacing: { line: 250 } } } } },
  sections: [
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: { size: { width: B4_WIDTH, height: B4_HEIGHT, orientation: PageOrientation.PORTRAIT }, margin: { top: 500, right: 500, bottom: 500, left: 500 } }
      },
      children: documentTitle(data, false)
    },
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: { size: { width: B4_WIDTH, height: B4_HEIGHT, orientation: PageOrientation.PORTRAIT }, margin: { top: 500, right: 500, bottom: 500, left: 500 } },
        column: { count: 2, space: 360, separate: true, equalWidth: true }
      },
      children: questionBody(data)
    }
  ]
});

const buildAnswerDocument = data => new Document({
  styles: { default: { document: { run: { font: FONT_ZH, size: 22 }, paragraph: { spacing: { line: 260 } } } } },
  sections: [{
    properties: { page: { size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.PORTRAIT }, margin: { top: 567, right: 567, bottom: 567, left: 567 } } },
    children: [...documentTitle(data, true), ...answerBody(data)]
  }]
});

const safeFileName = value => String(value || '英語科定期評量').replace(/[\\/:*?"<>|]/g, '_');
const saveBlob = (blob, fileName) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

export async function downloadRegularExamWord(data, answerMode = false) {
  const blob = await Packer.toBlob(answerMode ? buildAnswerDocument(data) : buildQuestionDocument(data));
  saveBlob(blob, `${safeFileName(data.metadata.fileName)}_${answerMode ? '正確答案' : '題目卷'}.docx`);
}

export async function downloadRegularExamPdf(elements, data, answerMode = false) {
  const format = answerMode ? 'a4' : [257, 364];
  const width = answerMode ? 210 : 257;
  const height = answerMode ? 297 : 364;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format, compress: true });
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    const canvas = await html2canvas(element, { scale: 1.7, backgroundColor: '#ffffff', useCORS: true, logging: false });
    if (index > 0) pdf.addPage(format, 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, width, height, undefined, 'FAST');
  }
  pdf.save(`${safeFileName(data.metadata.fileName)}_${answerMode ? '正確答案' : '題目卷'}.pdf`);
}
