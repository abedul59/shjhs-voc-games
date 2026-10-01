import { villageById } from './happy-farm';
import { workerById } from './happy-farm-worker-roster';

// Commute tiers are a game abstraction. The district maps have separate scales,
// so their SVG coordinates cannot be used as real-world kilometre distances.
export const DORM_COST = 210;
export const DORM_CAPACITY = 2;
export const dormName = gender => gender === 'female' ? '女移工宿舍' : '男移工宿舍';
export const dorms = farm => (farm.plots || []).map((plot, index) => ({ plot, index }))
  .filter(({ plot }) => plot?.facility === 'migrant_dorm' && ['female', 'male'].includes(plot.gender));

export function commuteTier(fromVillageId, toVillageId) {
  if (!fromVillageId || !toVillageId) return 3;
  if (fromVillageId === toVillageId) return 0;
  const from = villageById(fromVillageId)?.district;
  const to = villageById(toVillageId)?.district;
  if (!from || !to) return 3;
  if (from === to) return 1;
  return from === '新化區' || to === '新化區' ? 2 : 3;
}
export const commuteLabel = tier => ['同里', '同區跨里', '新化與鄰區', '超出通勤範圍'][tier] || '超出通勤範圍';

// Assign existing workers first; this also accommodates pre-dorm save data
// without deleting hired workers or silently granting them lodging.
export function housingAssignments(farm) {
  const assignments = {};
  const occupancy = {};
  for (const hired of farm.workers || []) {
    const person = workerById(hired.id);
    const gender = person?.group === '移工' ? person.gender : null;
    if (!gender) continue;
    const possible = dorms(farm).filter(({ plot, index }) => plot.gender === gender && (occupancy[index] || 0) < DORM_CAPACITY);
    const preferred = possible.find(({ index }) => index === hired.dormPlotIndex);
    const selected = preferred || possible.sort((a, b) => commuteTier(farm.plotVillages[a.index], farm.homeVillage) - commuteTier(farm.plotVillages[b.index], farm.homeVillage))[0];
    if (selected) { assignments[hired.id] = selected.index; occupancy[selected.index] = (occupancy[selected.index] || 0) + 1; }
  }
  return { assignments, occupancy };
}
export function availableDorm(farm, gender) {
  const { occupancy } = housingAssignments(farm);
  return dorms(farm).filter(({ plot, index }) => plot.gender === gender && (occupancy[index] || 0) < DORM_CAPACITY)
    .sort((a, b) => commuteTier(farm.plotVillages[a.index], farm.homeVillage) - commuteTier(farm.plotVillages[b.index], farm.homeVillage))[0] || null;
}
export function workerCommute(farm, hired, targetVillageId) {
  if (!hired) return 3;
  if (workerById(hired.id)?.group !== '移工') return 0;
  const index = housingAssignments(farm).assignments[hired.id];
  return Number.isInteger(index) ? commuteTier(farm.plotVillages[index], targetVillageId) : 3;
}
