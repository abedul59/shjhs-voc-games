export function extendedLesson(config) {
  const {
    id, stage, order, duration, title, subtitle,
    concept, practice, guardrail, code,
    starter, solution, required, expectedOutput,
    quiz
  } = config;

  return {
    id,
    stage,
    order,
    duration,
    title,
    subtitle,
    available: true,
    objectives: [
      `理解「${title}」的核心模型`,
      `完成一段可執行的${title}練習`,
      '辨識正式專案常見的設計風險'
    ],
    sections: [
      { title: '核心模型', body: concept, code },
      { title: '實作策略', body: practice, code: starter },
      { title: '工程檢查', body: guardrail, code: solution }
    ],
    challenge: {
      title: `實作：${title}`,
      description: `依照本課原則完成程式，並得到「${expectedOutput}」。`,
      starter,
      solution,
      required,
      expectedOutput,
      hints: [practice, guardrail]
    },
    quiz
  };
}
