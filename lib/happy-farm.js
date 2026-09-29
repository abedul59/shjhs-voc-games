export const FARM_CROPS = [
  { id: 'carrot', name: '胡蘿蔔', icon: '🥕', seed: 12, sale: 18, growMinutes: 2, yield: 2 },
  { id: 'corn', name: '玉米', icon: '🌽', seed: 24, sale: 28, growMinutes: 5, yield: 3 },
  { id: 'strawberry', name: '草莓', icon: '🍓', seed: 45, sale: 42, growMinutes: 10, yield: 3 },
  { id: 'pumpkin', name: '南瓜', icon: '🎃', seed: 85, sale: 75, growMinutes: 20, yield: 4 }
];

export const FARM_GAME_TYPE = '單字開心農場';
export const FARM_MAX_PLOTS = 12;
export const FARM_FERTILIZER_COST = 8;
export const cropById = id => FARM_CROPS.find(crop => crop.id === id);
export const freshFarm = () => ({
  coins: 120,
  plots: Array.from({ length: 6 }, () => null),
  seeds: { carrot: 2, corn: 1, strawberry: 0, pumpkin: 0 },
  produce: { carrot: 0, corn: 0, strawberry: 0, pumpkin: 0 },
  harvested: 0
});

export function farmActionError(farm, action, cropId, plotIndex, now) {
  const crop = cropById(cropId);
  const plot = farm.plots[plotIndex];
  if (action === 'buy') return crop && farm.coins >= crop.seed ? '' : '金幣不足，或作物不存在。';
  if (action === 'sell') return crop && (farm.produce[crop.id] || 0) > 0 ? '' : '倉庫沒有這種作物。';
  if (action === 'expand') return farm.plots.length < FARM_MAX_PLOTS && farm.coins >= 100 + farm.plots.length * 30 ? '' : '金幣不足或田地已達上限。';
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return '請先選一塊田地。';
  if (action === 'plant') return crop && !plot && (farm.seeds[crop.id] || 0) > 0 ? '' : '這塊田已有作物，或沒有種子。';
  if (!plot) return '這塊田尚未播種。';
  if (action === 'harvest') return now >= plot.readyAt ? '' : '作物尚未成熟。';
  if (action === 'weed') return now >= plot.weedAt && !plot.weedRemoved ? '' : '目前沒有需要清除的雜草。';
  if (action === 'pest') return now >= plot.pestAt && !plot.pestRemoved ? '' : '目前沒有需要清除的害蟲。';
  if (now >= plot.readyAt) return '作物已成熟，請先收成。';
  if (action === 'water') return plot.watered ? '這株作物已澆水。' : '';
  if (action === 'fertilize') return plot.fertilized ? '這株作物已施肥。' : farm.coins < FARM_FERTILIZER_COST ? '施肥需要 8 枚金幣。' : '';
  return '無法執行此操作。';
}

export function applyFarmAction(farm, action, cropId, plotIndex, now) {
  const next = JSON.parse(JSON.stringify(farm));
  const crop = cropById(cropId);
  const plot = next.plots[plotIndex];
  if (action === 'buy') { next.coins -= crop.seed; next.seeds[crop.id]++; }
  if (action === 'sell') { next.coins += next.produce[crop.id] * crop.sale; next.produce[crop.id] = 0; }
  if (action === 'expand') { next.coins -= 100 + next.plots.length * 30; next.plots.push(null); }
  if (action === 'plant') {
    const duration = crop.growMinutes * 60000;
    next.seeds[crop.id]--;
    next.plots[plotIndex] = {
      crop: crop.id, plantedAt: now, readyAt: now + duration,
      weedAt: now + Math.round(duration * .35), pestAt: now + Math.round(duration * .6),
      watered: false, fertilized: false, weedRemoved: false, pestRemoved: false
    };
  }
  if (action === 'water') { plot.watered = true; plot.readyAt = Math.max(now + 15000, plot.readyAt - (plot.readyAt - plot.plantedAt) * .15); }
  if (action === 'fertilize') { next.coins -= FARM_FERTILIZER_COST; plot.fertilized = true; plot.readyAt = Math.max(now + 15000, plot.readyAt - (plot.readyAt - plot.plantedAt) * .2); }
  if (action === 'weed') plot.weedRemoved = true;
  if (action === 'pest') plot.pestRemoved = true;
  if (action === 'harvest') {
    const weed = now >= plot.weedAt && !plot.weedRemoved;
    const pest = now >= plot.pestAt && !plot.pestRemoved;
    const amount = Math.max(1, cropById(plot.crop).yield + Number(plot.watered) + Number(plot.fertilized) - Number(weed) - Number(pest) - Number(plot.stolen || 0));
    next.produce[plot.crop] += amount;
    next.harvested += amount;
    next.plots[plotIndex] = null;
    return { farm: next, detail: `收成 ${cropById(plot.crop).name} × ${amount}` };
  }
  return { farm: next, detail: action };
}
