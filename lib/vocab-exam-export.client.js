import {
  AlignmentType, BorderStyle, Document, HeightRule, Packer, PageOrientation,
  Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow,
  TextRun, VerticalAlign, WidthType
} from 'docx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const CONTENT_WIDTH = 10640;
const FONT_ZH = '新細明體';
const FONT_EN = 'Times New Roman';
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

const run = (text, options = {}) => new TextRun({
  text: String(text ?? ''),
  font: options.english ? FONT_EN : FONT_ZH,
  size: options.size || 24,
  bold: Boolean(options.bold)
});

const paragraph = (children, options = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [run(children, options)],
  alignment: options.alignment || AlignmentType.LEFT,
  spacing: { before: options.before || 0, after: options.after || 0, line: options.line || 240 },
  keepNext: Boolean(options.keepNext)
});

const cell = (children, options = {}) => new TableCell({
  children: Array.isArray(children) ? children : [paragraph(children, options)],
  width: options.width ? { size: options.width, type: options.widthType || WidthType.DXA } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  borders,
  shading: options.shaded ? { fill: 'D0D0D0', type: ShadingType.CLEAR, color: 'auto' } : undefined,
  margins: { top: 35, bottom: 35, left: 90, right: 70 }
});

const questionTable = (items, answerMode, startNumber, useEnglishPrompt = false) => {
  const rows = [];
  for (let row = 0; row < 5; row += 1) {
    const group = items.slice(row * 5, row * 5 + 5);
    rows.push(new TableRow({
      height: { value: 350, rule: HeightRule.EXACT },
      children: group.map((item, index) => cell([
        paragraph([
          run(`${startNumber + row * 5 + index}　`, { english: true, size: 22 }),
          run(useEnglishPrompt ? item.en : item.zh, { english: useEnglishPrompt, size: 22 })
        ], { alignment: useEnglishPrompt ? AlignmentType.CENTER : AlignmentType.LEFT })
      ], { width: 2128, shaded: true }))
    }));
    rows.push(new TableRow({
      height: { value: useEnglishPrompt ? 520 : 610, rule: HeightRule.EXACT },
      children: group.map(item => cell([
        paragraph(answerMode ? (useEnglishPrompt ? item.answerCode : item.en) : '', {
          alignment: AlignmentType.CENTER,
          english: !useEnglishPrompt,
          size: answerMode ? 24 : 22
        })
      ], { width: 2128 }))
    }));
  }
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [2128, 2128, 2128, 2128, 2128],
    layout: TableLayoutType.FIXED,
    rows
  });
};

const optionTable = options => {
  const rows = [];
  const codeWidths = [729, 693, 655, 616, 577];
  const meaningWidths = [1402, 1448, 1480, 1525, 1557];
  for (let row = 0; row < 7; row += 1) {
    const children = [];
    for (let col = 0; col < 5; col += 1) {
      const option = options[row * 5 + col] || { code: '', meaning: '' };
      children.push(cell([paragraph(option.code, { english: /^[A-Z]$/.test(option.code), size: 21 })], { width: codeWidths[col], shaded: true }));
      children.push(cell([paragraph(option.meaning, { size: 21 })], { width: meaningWidths[col] }));
    }
    rows.push(new TableRow({ height: { value: 330, rule: HeightRule.EXACT }, children }));
  }
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [729, 1402, 693, 1448, 655, 1480, 616, 1525, 577, 1557],
    layout: TableLayoutType.FIXED,
    rows
  });
};

const buildDocument = ({ metadata, writingQuestions, matchingOptions, matchingQuestions }, answerMode) => new Document({
  styles: {
    default: {
      document: { run: { font: FONT_ZH, size: 24 }, paragraph: { spacing: { line: 240 } } }
    }
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT, orientation: PageOrientation.PORTRAIT },
        margin: { top: 567, right: 567, bottom: 567, left: 567, header: 0, footer: 0 }
      }
    },
    children: [
      paragraph([run(`${metadata.schoolName}${metadata.schoolYear}學年度第${metadata.semester}學期 ${metadata.grade}年級 ${metadata.examTitle}`, { size: 26 })], { alignment: AlignmentType.CENTER, after: 540 }),
      paragraph([run(`${metadata.grade}年　　班　　號　姓名　　　　　　　　　`, { size: 24 })], { alignment: AlignmentType.RIGHT, after: 90 }),
      paragraph([run('看中文寫出英文　手寫題 50%（每題兩分）', { size: 24 })], { after: 50, keepNext: true }),
      questionTable(writingQuestions, answerMode, 1, false),
      paragraph('', { after: 130 }),
      paragraph([run('看英文標出中文　配合題50%　（每題兩分，請寫以下的「代號」，若無法辨識，則不予給分）', { size: 23 })], { after: 50, keepNext: true }),
      optionTable(matchingOptions),
      paragraph('', { after: 120 }),
      questionTable(matchingQuestions, answerMode, 26, true)
    ]
  }]
});

const safeFileName = value => String(value || '英語單字會考').replace(/[\\/:*?"<>|]/g, '_');

export async function downloadVocabExamWord(data, answerMode = false) {
  const blob = await Packer.toBlob(buildDocument(data, answerMode));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${safeFileName(data.metadata.fileName || data.metadata.examTitle)}_${answerMode ? '正確答案' : '題目卷'}.docx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export async function downloadVocabExamPdf(element, data, answerMode = false) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  pdf.save(`${safeFileName(data.metadata.fileName || data.metadata.examTitle)}_${answerMode ? '正確答案' : '題目卷'}.pdf`);
}
