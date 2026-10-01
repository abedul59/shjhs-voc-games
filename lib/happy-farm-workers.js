import { applyFarmAction, cropById, farmActionError } from './happy-farm';

// These are fictional game wages and roster limits, not real employment terms.
export const WORKER_CANDIDATES = [
  { id: 'ahe', name: '阿禾', group: '台灣人', skills: ['plant', 'harvest', 'water'] },
  { id: 'xiaotang', name: '小棠', group: '台灣人', skills: ['water', 'weed', 'pest'] },
  { id: 'mumu', name: '沐沐', group: '台灣人', skills: ['plant', 'harvest', 'fertilize'] },
  { id: 'mina', name: 'Mina', group: '移工', skills: ['plant', 'harvest', 'water'] },
  { id: 'rafi', name: 'Rafi', group: '移工', skills: ['water', 'weed', 'pest'] },
  { id: 'lina', name: 'Lina', group: '移工', skills: ['plant', 'harvest', 'fertilize'] }
];
export const WORKER_TASKS = [
  { id: 'harvest', name: '收成' }, { id: 'plant', name: '播種' },
  { id: 'water', name: '澆水' }, { id: 'weed', name: '除草' },
  { id: 'pest', name: '除蟲' }, { id: 'fertilize', name: '施肥' }
];
export const WORKER_SHIFT_MS = 60 * 1000;
export const WORKER_MIGRANT_LIMIT = 2;
export const WORKER_TOTAL_LIMIT = 4;
const PERIOD_MS = { day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000 };
export const workerWage = (candidate, period) => ({ 台灣人: { day: 30, week: 180 }, 移工: { day: 24, week: 144 } })[candidate.group][period];
export const workerById = id => WORKER_CANDIDATES.find(person => person.id === id);

export const freshWorkerState = () => ({
  workers: [], workerCropId: 'carrot', workerTasks: Object.fromEntries(WORKER_TASKS.map(task => [task.id, true])),
  workerAuto: false, workerLastRunAt: 0, workerLastReport: ''
});

export function withWorkerState(farm) {
  const defaults = freshWorkerState();
  return {
    ...farm,
    workers: Array.isArray(farm.workers) ? farm.workers.filter(person => workerById(person.id) && PERIOD_MS[person.period]) : [],
    workerCropId: cropById(farm.workerCropId) ? farm.workerCropId : defaults.workerCropId,
    workerTasks: { ...defaults.workerTasks, ...(farm.workerTasks || {}) },
    workerAuto: !!farm.workerAuto,
    workerLastRunAt: Number(farm.workerLastRunAt) || 0,
    workerLastReport: String(farm.workerLastReport || '')
  };
}

export function workerActionError(farm, action, personId, period) {
  const person = workerById(personId);
  if (action === 'dismissWorker') return farm.workers?.some(item => item.id === personId) ? '' : '此人不在雇用名單中。';
  if (action !== 'hireWorker' || !person || !PERIOD_MS[period]) return '請選擇人員與計薪方式。';
  if (farm.workers?.some(item => item.id === personId)) return '已雇用此人。';
  if ((farm.workers?.length || 0) >= WORKER_TOTAL_LIMIT) return `最多雇用 ${WORKER_TOTAL_LIMIT} 人。`;
  if (person.group === '移工' && farm.workers.filter(item => workerById(item.id)?.group === '移工').length >= WORKER_MIGRANT_LIMIT) return `移工遊戲名額上限 ${WORKER_MIGRANT_LIMIT} 人。`;
  return farm.coins >= workerWage(person, period) ? '' : '金幣不足，無法支付首期薪資。';
}

export function applyWorkerAction(farm, action, personId, period, now) {
  const next = JSON.parse(JSON.stringify(farm));
  const person = workerById(personId);
  if (action === 'hireWorker') {
    const wage = workerWage(person, period);
    next.coins -= wage;
    next.workers.push({ id: personId, period, paidUntil: now + PERIOD_MS[period] });
    return { farm: next, detail: `${person.name} 已加入；預付${period === 'day' ? '日薪' : '周薪'} ${wage} 金幣` };
  }
  next.workers = next.workers.filter(item => item.id !== personId);
  return { farm: next, detail: `${person.name} 已離開；已付薪資不退還` };
}

export function runWorkerShift(farm, now) {
  if (!farm.workers?.length || now - (farm.workerLastRunAt || 0) < WORKER_SHIFT_MS) return null;
  let next = JSON.parse(JSON.stringify(farm));
  let salary = 0;
  const reports = [];
  for (let workerIndex = 0; workerIndex < next.workers.length; workerIndex++) {
    const hired = next.workers[workerIndex];
    const person = workerById(hired.id);
    if (!person) continue;
    if (hired.paidUntil <= now) {
      const wage = workerWage(person, hired.period);
      if (next.coins < wage) { reports.push(`${person.name}：薪資不足，暫停`); continue; }
      next.coins -= wage;
      salary += wage;
      hired.paidUntil = now + PERIOD_MS[hired.period];
    }
    let performed = 0;
    for (const task of WORKER_TASKS) {
      if (performed >= 2 || !person.skills.includes(task.id) || !next.workerTasks[task.id]) continue;
      const index = next.plots.findIndex((plot, plotIndex) => {
        const cropId = task.id === 'plant' ? next.workerCropId : plot?.crop;
        return !farmActionError(next, task.id, cropId, plotIndex, now, next.plotVillages[plotIndex]);
      });
      if (index < 0) continue;
      const cropId = task.id === 'plant' ? next.workerCropId : next.plots[index]?.crop;
      const result = applyFarmAction(next, task.id, cropId, index, now, next.plotVillages[index]);
      next = result.farm;
      reports.push(`${person.name}：${task.name}（${cropById(cropId)?.name || ''}）`);
      performed++;
    }
  }
  next.workerLastRunAt = now;
  next.workerLastReport = (reports.length ? reports.join('、') : '本輪沒有需要處理的農地') + (salary ? `；續付薪資 ${salary} 金幣` : '');
  return { farm: next, detail: next.workerLastReport };
}
