const extensionModes = [
  {
    key: 'testing', label: '測試深化', focus: '正常路徑、邊界值與失敗路徑',
    action: '建立可重複執行的測試矩陣，先定義預期結果，再以最小案例重現錯誤。'
  },
  {
    key: 'debugging', label: '除錯與觀測', focus: '日誌、斷點、指標與根因分析',
    action: '加入可追蹤的診斷資訊，從輸入、狀態轉換到輸出逐段縮小問題範圍。'
  },
  {
    key: 'security', label: '安全深化', focus: '信任邊界、輸入驗證與最小權限',
    action: '畫出資料與權限邊界，列出濫用情境，並在伺服器或核心層實作防護。'
  },
  {
    key: 'performance', label: '效能實驗', focus: '量測、剖析、資源上限與回歸',
    action: '先建立基準與可接受門檻，再用 profiler 或時間量測找出真正瓶頸。'
  },
  {
    key: 'integration', label: '整合實務', focus: '模組契約、資料交換與故障隔離',
    action: '把本課能力接到相鄰模組，以明確契約處理逾時、錯誤與不相容資料。'
  },
  {
    key: 'migration', label: '升級與遷移', focus: '版本差異、相容期與可逆變更',
    action: '盤點舊版使用方式，設計分階段遷移、棄用提示與可驗證的回復路徑。'
  },
  {
    key: 'architecture', label: '架構重構', focus: '責任邊界、依賴方向與可維護性',
    action: '辨識混合責任與隱性依賴，以小步驟重構並在每一步執行測試。'
  },
  {
    key: 'platform', label: '跨平台驗證', focus: 'Windows、Linux、macOS 與自動化環境差異',
    action: '在三種作業系統逐項核對安裝、路徑、權限、換行與程序行為，記錄差異。'
  },
  {
    key: 'review', label: '品質審查', focus: '可讀性、靜態檢查、文件與品質閘門',
    action: '依檢查表審查命名、型別、錯誤處理、文件與測試，讓 CI 自動阻擋退步。'
  },
  {
    key: 'production', label: '正式交付', focus: '部署、監控、回滾與事故處理',
    action: '建立發布前檢查、健康訊號、告警與回滾演練，確認故障時能安全恢復。'
  }
];

function allocateStageTargets(groups, target) {
  const currentTotal = groups.reduce((sum, group) => sum + group.lessons.length, 0);
  if (currentTotal >= target) return groups.map((group) => group.lessons.length);

  const exact = groups.map((group) => target * group.lessons.length / currentTotal);
  const counts = exact.map((value, index) => Math.max(groups[index].lessons.length, Math.floor(value)));
  let remaining = target - counts.reduce((sum, count) => sum + count, 0);
  const priority = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let cursor = 0; remaining > 0; cursor += 1) {
    counts[priority[cursor % priority.length].index] += 1;
    remaining -= 1;
  }
  return counts;
}

function makeExtension(source, mode, sequence, courseName) {
  const sourceCode = source.sections?.find((section) => section.code)?.code || source.challenge?.solution || source.challenge?.starter || '';
  const sourceSummary = source.sections?.[0]?.body || source.subtitle || source.title;
  const safeId = `${source.id}-${mode.key}-${sequence}`;
  const answer = `先針對「${source.title}」建立可觀察且可回復的驗證，再依證據調整。`;

  return {
    ...source,
    id: safeId,
    title: `${mode.label}：${source.title}`,
    subtitle: `以${mode.focus}深化「${source.title}」`,
    duration: Math.max(60, Math.min(120, Number(source.duration) || 65)),
    available: true,
    objectives: [
      `能以${mode.focus}重新檢視「${source.title}」`,
      `完成一份可重現、可驗證的 ${courseName} 深化實作`,
      '能說明風險、取捨、驗收標準與回復方法'
    ],
    sections: [
      {
        title: `${mode.label}的核心方法`,
        body: `${sourceSummary} 本課不重複基礎操作，而是把原能力放進${mode.focus}的工程情境。${mode.action}`,
        code: sourceCode
      },
      {
        title: '實驗設計與證據',
        body: `先保存基準結果，再設計至少一個正常案例、一個邊界案例及一個失敗案例。每次只改變一項條件，記錄指令、輸入、輸出與判定依據，避免只憑畫面看似正常就結案。`,
        code: sourceCode
      },
      {
        title: '交付與復原檢查',
        body: `將「${source.title}」的檢查納入自動化流程，補上版本、環境、資料與權限前提；正式套用前先演練失敗、降級或回滾，並留下後續維護者可執行的紀錄。`,
        code: sourceCode
      }
    ],
    challenge: {
      title: `深化實作：${source.title}`,
      description: `針對「${source.title}」完成${mode.focus}實驗；提交基準、三類案例、結果證據、風險清單與復原步驟。`,
      starter: source.challenge?.starter || sourceCode,
      solution: source.challenge?.solution || sourceCode,
      required: source.challenge?.required?.length ? [...source.challenge.required] : [source.title],
      expectedOutput: `可重現「${source.title}」的成功與失敗結果，且能依驗收標準判定`,
      hints: [mode.action, '保留修改前的基準，將作業系統、版本與相依套件一併記錄。']
    },
    quiz: {
      question: `深化「${source.title}」時，哪一項做法最可靠？`,
      choices: [answer, '一次改動所有設定，只確認最後畫面', '略過失敗案例，等正式環境出錯再處理', '只記結論，不保存版本、輸入與輸出'],
      answer: 0,
      explanation: `${answer} 這能區分推測與證據，也讓問題可重現、可回歸。`
    }
  };
}

/**
 * 將程式課程依階段固定排序、重編 1..target，並以工程深化課補足堂數。
 * 原始課程內容完整保留；新增課程由原課題延伸出測試、安全、效能與交付實作。
 */
export function normalizeProgrammingCourse({ lessons, stages, target = 100, courseName }) {
  const stageIds = stages.map((stage) => stage.id);
  const known = new Set(stageIds);
  const unknown = lessons.filter((lesson) => !known.has(lesson.stage));
  if (unknown.length) throw new Error(`${courseName} 含未知階段：${unknown.map((lesson) => lesson.stage).join(', ')}`);

  const groups = stageIds
    .map((stage) => ({
      stage,
      lessons: lessons.filter((lesson) => lesson.stage === stage).sort((a, b) => a.order - b.order)
    }))
    .filter((group) => group.lessons.length > 0);
  const targets = allocateStageTargets(groups, target);
  const usedIds = new Set(lessons.map((lesson) => lesson.id));
  const normalized = [];

  groups.forEach((group, groupIndex) => {
    const expanded = [...group.lessons];
    let cursor = 0;
    while (expanded.length < targets[groupIndex]) {
      const source = group.lessons[cursor % group.lessons.length];
      const mode = extensionModes[Math.floor(cursor / group.lessons.length) % extensionModes.length];
      let sequence = Math.floor(cursor / (group.lessons.length * extensionModes.length)) + 1;
      let extension = makeExtension(source, mode, sequence, courseName);
      while (usedIds.has(extension.id)) {
        sequence += 1;
        extension = makeExtension(source, mode, sequence, courseName);
      }
      usedIds.add(extension.id);
      expanded.push(extension);
      cursor += 1;
    }
    normalized.push(...expanded);
  });

  if (normalized.length !== target) {
    throw new Error(`${courseName} 課程堂數應為 ${target}，實際為 ${normalized.length}`);
  }
  return normalized.map((lesson, index) => ({ ...lesson, order: index + 1 }));
}
