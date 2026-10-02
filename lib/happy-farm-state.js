import { workerById } from './happy-farm-worker-roster';
const DEFAULT_TASKS = [
  'harvest', 'sell', 'plant', 'water', 'weed', 'pest', 'fertilize', 'collectAnimal',
  'careAnimal', 'collectBusiness', 'collectVisitors', 'collectSolar'
];
const OPTIONAL_TASKS = ['buySeeds', 'sellAnimalProduct', 'processCrop', 'sellProcessed', 'sellAtMarket'];

export const freshWorkerState = () => ({
  workers: [], workerCropId: 'carrot', workerCropIds: ['carrot'],
  workerTasks: Object.fromEntries([...DEFAULT_TASKS.map(id => [id, true]), ...OPTIONAL_TASKS.map(id => [id, false])]),
  workerAuto: false, workerLastRunAt: 0, workerLastReport: '', workerHistory: [],
  workerCycleVersion: 2, workerActiveMs: 0, workerRestUntil: 0, workerTaskPhase: 0, workerCycleStartedAt: 0, workerSalesVersion: 2
});
export function withWorkerState(farm, validCropIds) {
  const defaults = freshWorkerState();
  return {
    ...farm,
    workers: Array.isArray(farm.workers) ? farm.workers.filter(hired => hired && workerById(hired.id) && ['day', 'week'].includes(hired.period))
      .map(hired => ({ ...hired, focus: workerById(hired.id).roles.includes(hired.focus) ? hired.focus : workerById(hired.id).roles[0] })) : [],
    workerCropId: validCropIds.includes(farm.workerCropId) ? farm.workerCropId : defaults.workerCropId,
    workerCropIds: [...new Set((Array.isArray(farm.workerCropIds) ? farm.workerCropIds : [farm.workerCropId || 'carrot']).filter(id => validCropIds.includes(id)))],
    workerTasks: { ...defaults.workerTasks, ...(farm.workerTasks || {}), ...(!farm.workerSalesVersion ? { sell: true } : {}) },
    workerAuto: farm.workerCycleVersion === 2 && !!farm.workerAuto,
    workerLastRunAt: Number(farm.workerLastRunAt) || 0,
    workerLastReport: String(farm.workerLastReport || ''),
    workerHistory: Array.isArray(farm.workerHistory) ? farm.workerHistory.slice(0, 60) : [],
    workerCycleVersion: 2,
    workerActiveMs: farm.workerCycleVersion === 2 ? Math.max(0, Number(farm.workerActiveMs) || 0) : 0,
    workerRestUntil: farm.workerCycleVersion === 2 ? Math.max(0, Number(farm.workerRestUntil) || 0) : 0,
    workerTaskPhase: [0, 1, 2].includes(farm.workerTaskPhase) ? farm.workerTaskPhase : 0,
    workerCycleStartedAt: Math.max(0, Number(farm.workerCycleStartedAt) || 0),
    workerSalesVersion: 2
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
