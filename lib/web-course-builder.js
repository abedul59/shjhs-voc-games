import { extendedLesson } from './programming-course-extension.js';

export function webLesson(id, stage, order, duration, title, subtitle, concept, code, starter, solution, required, expectedOutput, answer) {
  return extendedLesson({
    id, stage, order, duration, title, subtitle,
    concept,
    practice: `先執行「${title}」範例，再把資料、畫面與副作用拆成可獨立驗證的步驟。`,
    guardrail: `${answer} 完成後應測試正常、空資料、錯誤與邊界狀態。`,
    code, starter, solution, required, expectedOutput,
    quiz: {
      question: `關於「${title}」，何者正確？`,
      choices: [answer, '所有資料都應存成全域可變狀態', '錯誤發生時不需要顯示或記錄', '只要瀏覽器能顯示就不需要測試'],
      answer: 0,
      explanation: answer
    }
  });
}
