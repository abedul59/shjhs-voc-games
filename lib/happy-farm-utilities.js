import { farmDay } from './happy-farm-economy';

export const UTILITY_CYCLE_MS = 3 * 60 * 60 * 1000;
export const POWER_UNIT_COST = 2;
export const WATER_UNIT_COST = 2;
const USE = {
  animal: [2, 3], factory: [3, 2], tourism: [2, 2], market: [4, 2],
  school: [2, 2], fishing: [3, 4], shrimp: [4, 4], karaoke: [4, 2],
  restaurant: [4, 4], bicycle: [2, 1], icecream: [4, 2]
};
const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000;
export const utilitySlot = now => Math.floor((now + TAIWAN_OFFSET_MS) / UTILITY_CYCLE_MS);
export const freshUtilityState = now => ({ utilityLastSlot: utilitySlot(now), utilityDebt: 0, utilityLastBill: null });
export const withUtilityState = (farm, now) => ({
  ...farm,
  utilityLastSlot: Number.isInteger(farm.utilityLastSlot) ? farm.utilityLastSlot : utilitySlot(now),
  utilityDebt: Math.max(0, Number(farm.utilityDebt) || 0),
  utilityLastBill: farm.utilityLastBill || null
});

export function utilityPreview(farm, now) {
  const details = [];
  let grossPower = 0, water = 0, panels = 0;
  farm.plots.forEach((plot, index) => {
    if (plot?.solar || plot?.facility === 'solar') panels++;
    const [powerUnits, waterUnits] = plot?.crop ? [0, 1]
      : plot?.facility === 'animal' && ['milkfish', 'tilapia'].includes(plot.animalId) ? [4, 5]
        : USE[plot?.facility] || [0, 0];
    if (!powerUnits && !waterUnits) return;
    grossPower += powerUnits;
    water += waterUnits;
    details.push({ plotIndex: index, power: powerUnits, water: waterUnits });
  });
  const weather = farmDay(now).weather;
  const solarUnit = { sunny: 4, cloudy: 3, rainy: 1 }[weather];
  const solarCredit = Math.min(grossPower, panels * solarUnit);
  const chargedPower = grossPower - solarCredit;
  return {
    details, grossPower, water, panels, solarCredit, chargedPower,
    powerCost: chargedPower * POWER_UNIT_COST, waterCost: water * WATER_UNIT_COST,
    total: chargedPower * POWER_UNIT_COST + water * WATER_UNIT_COST
  };
}

export function settleUtilityBill(farm, now) {
  const slot = utilitySlot(now);
  if (slot <= farm.utilityLastSlot) return null;
  const next = JSON.parse(JSON.stringify(farm));
  const bill = utilityPreview(next, now);
  const charge = bill.total;
  const paid = Math.min(Math.max(0, next.coins), charge);
  next.coins -= paid;
  next.utilityDebt = (next.utilityDebt || 0) + charge - paid;
  next.utilityLastSlot = slot;
  next.utilityLastBill = { ...bill, at: now, paid, newDebt: charge - paid };
  return { farm: next, detail: `本輪水電 ${charge} 金幣（光電抵用 ${bill.solarCredit} 度）；已付 ${paid}，未付 ${charge - paid}` };
}

export function utilityPaymentError(farm) {
  return (farm.utilityDebt || 0) <= 0 ? '目前沒有未付水電費。' : farm.coins <= 0 ? '金幣不足，請先收成或營業。' : '';
}
export function payUtilityDebt(farm) {
  const next = JSON.parse(JSON.stringify(farm));
  const paid = Math.min(next.coins, next.utilityDebt);
  next.coins -= paid;
  next.utilityDebt -= paid;
  return { farm: next, detail: `繳交水電費 ${paid} 金幣，尚欠 ${next.utilityDebt} 金幣` };
}
