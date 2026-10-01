import { FARM_CROPS, applyFarmAction, cropById, cropInSeason, farmActionError, villageById } from './happy-farm';
import { FARM_ANIMALS, animalActionError, applyAnimalAction } from './happy-farm-animals';
import { applyEconomyAction, economyActionError } from './happy-farm-economy';
import { businessActionError, applyBusinessAction } from './happy-farm-businesses';
import { availableDorm, commuteTier, dormName, housingAssignments, workerCommute } from './happy-farm-housing';
import { workerById } from './happy-farm-worker-roster';
export { WORKER_CANDIDATES, workerById, workerMarket, workerMarketSlot } from './happy-farm-worker-roster';
export { freshWorkerState, withWorkerState } from './happy-farm-state';

// Fictional game roster, languages, wages and limits; not real employment terms.
export const WORKER_GROUPS = [
  { id: 'crops', name: '🌱 田地班' }, { id: 'animals', name: '🐾 動物班' },
  { id: 'processing', name: '🏭 加工班' }, { id: 'service', name: '🏪 店鋪與觀光班' },
  { id: 'energy', name: '☀️ 光電班' }
];
export const WORKER_TASKS = [
  { id: 'harvest', name: '收成', group: 'crops' }, { id: 'plant', name: '播種', group: 'crops' },
  { id: 'water', name: '澆水', group: 'crops' }, { id: 'weed', name: '除草', group: 'crops' },
  { id: 'pest', name: '除蟲', group: 'crops' }, { id: 'fertilize', name: '施肥', group: 'crops' },
  { id: 'buySeeds', name: '補購種苗', group: 'crops', optional: true },
  { id: 'sell', name: '賣作物', group: 'crops', optional: true },
  { id: 'collectAnimal', name: '採集產品', group: 'animals' },
  { id: 'careAnimal', name: '逐項照護', group: 'animals' },
  { id: 'sellAnimalProduct', name: '賣動物產品', group: 'animals', optional: true },
  { id: 'processCrop', name: '加工／委外', group: 'processing', optional: true },
  { id: 'sellProcessed', name: '賣加工品', group: 'processing', optional: true },
  { id: 'collectBusiness', name: '店鋪結算', group: 'service' },
  { id: 'sellAtMarket', name: '超市販售', group: 'service', optional: true },
  { id: 'collectVisitors', name: '接待遊客', group: 'service' },
  { id: 'collectSolar', name: '光電賣電', group: 'energy' }
];
export const WORKER_SHIFT_MS = 60 * 1000;
export const WORKER_MIGRANT_LIMIT = 3;
export const WORKER_TOTAL_LIMIT = 6;
const PERIOD_MS = { day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000 };
export const workerWage = (person, period, protagonistId = '') => Math.max(1, Math.round(({ 台灣人: { day: 30, week: 180 }, 移工: { day: 24, week: 144 } })[person.group][period] * (protagonistId === 'programmer' ? .9 : 1)));
export const workerGroupName = id => WORKER_GROUPS.find(group => group.id === id)?.name || '';
export const requiredShopLanguages = businessId => ['bicycle', 'icecream'].includes(businessId) ? ['中文', '英語'] : ['中文'];
export function shopStaff(farm, businessId, now, plotIndex = -1) {
  const languages = requiredShopLanguages(businessId);
  return farm.workers?.find(hired => {
    const person = workerById(hired.id);
    return hired.focus === 'service' && hired.paidUntil > now && person?.roles.includes('service')
      && (plotIndex < 0 || workerCommute(farm, hired, farm.plotVillages[plotIndex]) <= 2)
      && (person.group !== '移工' || Number.isInteger(housingAssignments(farm).assignments[hired.id]))
      && languages.every(language => person.languages.includes(language));
  });
}
export const shopStaffError = (farm, businessId, now, plotIndex) => shopStaff(farm, businessId, now, plotIndex) ? ''
  : `此店需要可通勤的店鋪與觀光班人員，語言須有${requiredShopLanguages(businessId).join('、')}；移工另須有同性別宿舍。`;
export function workerActionError(farm, action, personId, period) {
  const person = workerById(personId);
  if (action === 'dismissWorker') return farm.workers?.some(item => item.id === personId) ? '' : '此人不在雇用名單中。';
  if (action === 'renewWorker') {
    const hired = farm.workers?.find(item => item.id === personId);
    if (!hired) return '此人不在雇用名單中。';
    if (person.group === '移工' && !Number.isInteger(housingAssignments(farm).assignments[personId])) return `請先建造可入住的${dormName(person.gender)}。`;
    if (hired.paidUntil > Date.now()) return '本期薪資仍有效。';
    return farm.coins >= workerWage(person, hired.period, farm.protagonistId) ? '' : '金幣不足，無法續付薪資。';
  }
  if (action !== 'hireWorker' || !person || !PERIOD_MS[period]) return '請選擇人員與計薪方式。';
  if (farm.workers?.some(item => item.id === personId)) return '已雇用此人。';
  if ((farm.workers?.length || 0) >= WORKER_TOTAL_LIMIT) return `最多雇用 ${WORKER_TOTAL_LIMIT} 人。`;
  if (person.group === '移工' && farm.workers.filter(item => workerById(item.id)?.group === '移工').length >= WORKER_MIGRANT_LIMIT) return `移工遊戲名額上限 ${WORKER_MIGRANT_LIMIT} 人。`;
  if (person.group === '移工' && !availableDorm(farm, person.gender)) return `請先在空地建造有空床位的${dormName(person.gender)}，每間可住 2 人。`;
  return farm.coins >= workerWage(person, period, farm.protagonistId) ? '' : '金幣不足，無法支付首期薪資。';
}
export function addWorkerHistory(farm, entry) {
  farm.workerHistory = [entry, ...(farm.workerHistory || [])].slice(0, 60);
}
export function applyWorkerAction(farm, action, personId, period, now) {
  const next = JSON.parse(JSON.stringify(farm));
  const person = workerById(personId);
  let detail;
  if (action === 'hireWorker') {
    const wage = workerWage(person, period, next.protagonistId);
    next.coins -= wage;
    const dormPlotIndex = person.group === '移工' ? availableDorm(next, person.gender)?.index : undefined;
    next.workers.push({ id: personId, period, paidUntil: now + PERIOD_MS[period], focus: person.roles[0], ...(Number.isInteger(dormPlotIndex) ? { dormPlotIndex } : {}) });
    detail = `${person.name} 已加入；預付${period === 'day' ? '日薪' : '周薪'} ${wage} 金幣${Number.isInteger(dormPlotIndex) ? `，入住第 ${dormPlotIndex + 1} 格${dormName(person.gender)}` : ''}`;
  } else if (action === 'renewWorker') {
    const hired = next.workers.find(item => item.id === personId);
    const wage = workerWage(person, hired.period, next.protagonistId);
    next.coins -= wage;
    hired.paidUntil = now + PERIOD_MS[hired.period];
    detail = `${person.name} 已續約，支付${hired.period === 'day' ? '日薪' : '周薪'} ${wage} 金幣`;
  } else {
    next.workers = next.workers.filter(item => item.id !== personId);
    detail = `${person.name} 已離開；已付薪資不退還`;
  }
  addWorkerHistory(next, { at: now, personId, group: 'agency', detail });
  return { farm: next, detail };
}

function performWorkerTask(farm, task, now, hired) {
  const migrant = workerById(hired.id)?.group === '移工';
  const dormIndex = migrant ? housingAssignments(farm).assignments[hired.id] : -1;
  const canCommute = villageId => !migrant || Number.isInteger(dormIndex) && commuteTier(farm.plotVillages[dormIndex], villageId) <= 2;
  const reachable = index => canCommute(farm.plotVillages[index]);
  const nearHome = canCommute(farm.homeVillage);
  if (['harvest', 'plant', 'water', 'weed', 'pest', 'fertilize'].includes(task.id)) {
    for (let index = 0; index < farm.plots.length; index++) {
      if (!reachable(index)) continue;
      if (farm.noSowPlots?.includes(index)) continue;
      const selected = (farm.workerCropIds || [farm.workerCropId]).filter(id => cropById(id));
      const ranked = [...selected].sort((a, b) => Number(cropInSeason(cropById(b), now)) - Number(cropInSeason(cropById(a), now)));
      const rotated = ranked.length ? [...ranked.slice((index + Math.floor(now / WORKER_SHIFT_MS)) % ranked.length), ...ranked.slice(0, (index + Math.floor(now / WORKER_SHIFT_MS)) % ranked.length)] : [];
      const candidateIds = task.id === 'plant' ? rotated : [farm.plots[index]?.crop];
      for (const cropId of candidateIds) if (!farmActionError(farm, task.id, cropId, index, now, farm.plotVillages[index])) {
        const result = applyFarmAction(farm, task.id, cropId, index, now, farm.plotVillages[index]);
        const villageId = farm.plotVillages[index];
        const number = farm.plotVillages.slice(0, index + 1).filter(id => id === villageId).length;
        result.detail = `${villageById(villageId)?.name || '農場'}第 ${number} 格：${task.id === 'plant' ? `播種${cropById(cropId)?.name || ''}` : result.detail}`;
        return result;
      }
    }
  }
  if (task.id === 'sell') {
    if (!nearHome) return null;
    for (const crop of FARM_CROPS) if (!farmActionError(farm, 'sell', crop.id, 0, now)) return applyFarmAction(farm, 'sell', crop.id, 0, now);
  }
  if (task.id === 'buySeeds') {
    if (!nearHome) return null;
    for (const cropId of farm.workerCropIds || [farm.workerCropId]) {
      const crop = cropById(cropId);
      if (crop && (farm.seeds[crop.id] || 0) < 2 && farm.coins >= crop.seed * 2 + 60
        && !farmActionError(farm, 'buy', crop.id, 0, now, farm.homeVillage, 2)) return applyFarmAction(farm, 'buy', crop.id, 0, now, farm.homeVillage, 2);
    }
  }
  if (['careAnimal', 'collectAnimal', 'sellAnimalProduct'].includes(task.id)) {
    if (task.id === 'sellAnimalProduct' && !nearHome) return null;
    for (const animal of FARM_ANIMALS) {
      const penIndex = farm.animals?.[animal.id]?.plotIndex;
      if (task.id !== 'sellAnimalProduct' && (!Number.isInteger(penIndex) || !reachable(penIndex))) continue;
      const cares = task.id === 'careAnimal' ? animal.care.map(care => care.id) : [''];
      for (const careId of cares) if (!animalActionError(farm, task.id, animal.id, careId, now)) {
        return applyAnimalAction(farm, task.id, animal.id, careId, now);
      }
    }
  }
  if (['processCrop', 'sellProcessed'].includes(task.id)) {
    if (!nearHome) return null;
    for (const crop of FARM_CROPS) {
      const mode = farm.plots.some((plot, index) => plot?.facility === 'factory' && reachable(index)) ? 'factory' : 'outsource';
      if (!economyActionError(farm, task.id, 0, crop.id, mode, now)) return applyEconomyAction(farm, task.id, 0, crop.id, mode, now);
    }
  }
  if (task.id === 'collectVisitors') {
    const index = farm.plots.findIndex((plot, index) => plot?.facility === 'tourism' && reachable(index));
    if (index >= 0 && !economyActionError(farm, task.id, index, '', '', now)) return applyEconomyAction(farm, task.id, index, '', '', now);
  }
  if (task.id === 'collectSolar') {
    for (let index = 0; index < farm.plots.length; index++) if (reachable(index) && !economyActionError(farm, task.id, index, '', '', now)) {
      const result = applyEconomyAction(farm, task.id, index, '', '', now);
      result.detail = `${villageById(farm.plotVillages[index])?.name || '農場'}第 ${farm.plotVillages.slice(0, index + 1).filter(id => id === farm.plotVillages[index]).length} 格：${result.detail}`;
      return result;
    }
  }
  if (['collectBusiness', 'sellAtMarket'].includes(task.id)) {
    for (let index = 0; index < farm.plots.length; index++) {
      if (!reachable(index)) continue;
      const businessId = farm.plots[index]?.facility;
      if (task.id === 'sellAtMarket' && businessId !== 'market') continue;
      if (task.id === 'collectBusiness' && !businessById(businessId)) continue;
      const products = task.id === 'sellAtMarket' ? FARM_CROPS.flatMap(crop => ['fresh', 'processed'].map(kind => [crop.id, kind])) : [['', 'fresh']];
      for (const [cropId, kind] of products) if (!businessActionError(farm, task.id, index, businessId, cropId, kind, now)) {
        return applyBusinessAction(farm, task.id, index, businessId, cropId, kind, now);
      }
    }
  }
  return null;
}

export function runWorkerShift(farm, now) {
  if (!farm.workers?.length || now - (farm.workerLastRunAt || 0) < WORKER_SHIFT_MS) return null;
  let next = JSON.parse(JSON.stringify(farm));
  const reports = [];
  for (let index = 0; index < next.workers.length; index++) {
    const hired = next.workers[index];
    const person = workerById(hired.id);
    if (!person) continue;
    if (person.group === '移工' && !Number.isInteger(housingAssignments(next).assignments[hired.id])) {
      reports.push(`${person.name}等待${dormName(person.gender)}`);
      continue;
    }
    if (hired.paidUntil <= now) {
      const wage = workerWage(person, hired.period, next.protagonistId);
      if (next.coins < wage) {
        addWorkerHistory(next, { at: now, personId: person.id, group: 'agency', detail: '薪資不足，本輪暫停' });
        reports.push(`${person.name}薪資不足`);
        continue;
      }
      next.coins -= wage;
      hired.paidUntil = now + PERIOD_MS[hired.period];
      addWorkerHistory(next, { at: now, personId: person.id, group: 'agency', detail: `續付薪資 ${wage} 金幣` });
    }
    for (let turn = 0; turn < 2; turn++) {
      let task = null, result = null;
      for (const item of WORKER_TASKS) {
        if (item.group !== hired.focus || !next.workerTasks[item.id]) continue;
        const attempted = performWorkerTask(next, item, now, hired);
        if (attempted) { task = item; result = attempted; break; }
      }
      if (!result) break;
      next = result.farm;
      reports.push(`${person.name}：${result.detail}`);
      addWorkerHistory(next, { at: now, personId: person.id, group: task.group, detail: result.detail });
    }
  }
  next.workerLastRunAt = now;
  next.workerLastReport = reports.length ? reports.join('、') : '本輪沒有可執行的工作';
  return { farm: next, detail: next.workerLastReport };
}
