// Farm save defaults live here so the farm model never imports action modules.
const DEFAULT_WORKER_FOCUS = {
  ahe: 'crops', xiaotang: 'crops', mumu: 'animals',
  mina: 'crops', rafi: 'animals', lina: 'processing'
};
const WORKER_ROLES = {
  ahe: ['crops', 'animals'], xiaotang: ['crops', 'service'],
  mumu: ['animals', 'processing', 'energy'], mina: ['crops', 'service'],
  rafi: ['animals', 'processing', 'service'], lina: ['processing', 'service', 'energy']
};
const DEFAULT_TASKS = [
  'harvest', 'plant', 'water', 'weed', 'pest', 'fertilize', 'collectAnimal',
  'careAnimal', 'collectBusiness', 'collectVisitors', 'collectSolar'
];
const OPTIONAL_TASKS = ['buySeeds', 'sell', 'sellAnimalProduct', 'processCrop', 'sellProcessed', 'sellAtMarket'];

export const freshWorkerState = () => ({
  workers: [], workerCropId: 'carrot',
  workerTasks: Object.fromEntries([...DEFAULT_TASKS.map(id => [id, true]), ...OPTIONAL_TASKS.map(id => [id, false])]),
  workerAuto: false, workerLastRunAt: 0, workerLastReport: '', workerHistory: []
});
export function withWorkerState(farm, validCropIds) {
  const defaults = freshWorkerState();
  return {
    ...farm,
    workers: Array.isArray(farm.workers) ? farm.workers.filter(hired => hired && WORKER_ROLES[hired.id] && ['day', 'week'].includes(hired.period))
      .map(hired => ({ ...hired, focus: WORKER_ROLES[hired.id].includes(hired.focus) ? hired.focus : DEFAULT_WORKER_FOCUS[hired.id] })) : [],
    workerCropId: validCropIds.includes(farm.workerCropId) ? farm.workerCropId : defaults.workerCropId,
    workerTasks: { ...defaults.workerTasks, ...(farm.workerTasks || {}) },
    workerAuto: !!farm.workerAuto,
    workerLastRunAt: Number(farm.workerLastRunAt) || 0,
    workerLastReport: String(farm.workerLastReport || ''),
    workerHistory: Array.isArray(farm.workerHistory) ? farm.workerHistory.slice(0, 60) : []
  };
}

export const UTILITY_CYCLE_MS = 3 * 60 * 60 * 1000;
const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000;
export const utilitySlot = now => Math.floor((now + TAIWAN_OFFSET_MS) / UTILITY_CYCLE_MS);
export const freshUtilityState = now => ({ utilityLastSlot: utilitySlot(now), utilityDebt: 0, utilityLastBill: null });
export const withUtilityState = (farm, now) => ({
  ...farm,
  utilityLastSlot: Number.isInteger(farm.utilityLastSlot) ? farm.utilityLastSlot : utilitySlot(now),
  utilityDebt: Math.max(0, Number(farm.utilityDebt) || 0),
  utilityLastBill: farm.utilityLastBill || null
});
