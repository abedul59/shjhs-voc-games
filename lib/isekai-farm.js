export const ISEKAI_GAME_TYPE = '單字異世界悠閒農莊';

export const ISEKAI_REGIONS = [
  { id: 'west', name: '中央大陸西部', subtitle: '阿斯拉王國・肥沃平原', x: 260, y: 390, cost: 0, description: '河流與麥田交錯的開拓起點。' },
  { id: 'north', name: '中央大陸北部', subtitle: '拉諾亞・雪境林地', x: 430, y: 150, cost: 240, description: '寒冷且土地貧瘠，適合耐寒作物。' },
  { id: 'south', name: '中央大陸南部', subtitle: '王龍王國・暖風谷地', x: 565, y: 665, cost: 420, description: '沿著山脈延伸的溫暖農業帶。' }
];

export const ISEKAI_CROPS = [
  { id: 'wheat', name: '阿斯拉小麥', english: 'wheat', region: 'west', seed: 8, sale: 14, yield: 3, growthMs: 2 * 60000, symbol: '✦', color: '#d8b96e' },
  { id: 'flower', name: '巴提魯斯花', english: 'flower', region: 'west', seed: 15, sale: 26, yield: 2, growthMs: 3 * 60000, symbol: '✿', color: '#e8aab9' },
  { id: 'herb', name: '北境藥草', english: 'herb', region: 'north', seed: 24, sale: 42, yield: 2, growthMs: 4 * 60000, symbol: '❧', color: '#9dbdb0' },
  { id: 'berry', name: '雪原漿果', english: 'berry', region: 'north', seed: 28, sale: 36, yield: 3, growthMs: 5 * 60000, symbol: '✤', color: '#aa8bb8' },
  { id: 'rice', name: '薩納基亞稻米', english: 'rice', region: 'south', seed: 30, sale: 39, yield: 3, growthMs: 4 * 60000, symbol: '♧', color: '#aeca7b' },
  { id: 'oilseed', name: '基卡油籽', english: 'seed', region: 'south', seed: 38, sale: 55, yield: 2, growthMs: 6 * 60000, symbol: '✧', color: '#e5af70' }
];

export const regionById = id => ISEKAI_REGIONS.find(region => region.id === id);
export const cropById = id => ISEKAI_CROPS.find(crop => crop.id === id);

export function freshIsekaiFarm() {
  return {
    version: 1, coins: 100, renown: 0, harvested: 0,
    unlockedRegions: ['west'], selectedRegion: 'west',
    plots: Object.fromEntries(ISEKAI_REGIONS.map(region => [region.id, Array.from({ length: 6 }, () => null)])),
    seeds: { wheat: 2 }, produce: {},
    journal: [{ at: Date.now(), text: '抵達中央大陸西部，開始開墾第一片田地。' }]
  };
}

export function normalizeIsekaiFarm(raw) {
  const fresh = freshIsekaiFarm();
  if (!raw || typeof raw !== 'object') return fresh;
  const unlockedRegions = Array.isArray(raw.unlockedRegions)
    ? ISEKAI_REGIONS.map(region => region.id).filter(id => raw.unlockedRegions.includes(id)) : ['west'];
  if (!unlockedRegions.includes('west')) unlockedRegions.unshift('west');
  return {
    ...fresh,
    coins: Math.max(0, Number(raw.coins) || 0),
    renown: Math.max(0, Number(raw.renown) || 0),
    harvested: Math.max(0, Number(raw.harvested) || 0),
    unlockedRegions,
    selectedRegion: unlockedRegions.includes(raw.selectedRegion) ? raw.selectedRegion : 'west',
    plots: Object.fromEntries(ISEKAI_REGIONS.map(region => [region.id,
      Array.from({ length: 6 }, (_, index) => {
        const plot = raw.plots?.[region.id]?.[index];
        return plot && cropById(plot.cropId) ? { cropId: plot.cropId, plantedAt: Number(plot.plantedAt) || 0,
          readyAt: Number(plot.readyAt) || 0, watered: !!plot.watered } : null;
      })])),
    seeds: Object.fromEntries(ISEKAI_CROPS.map(crop => [crop.id, Math.max(0, Number(raw.seeds?.[crop.id]) || 0)])),
    produce: Object.fromEntries(ISEKAI_CROPS.map(crop => [crop.id, Math.max(0, Number(raw.produce?.[crop.id]) || 0)])),
    journal: Array.isArray(raw.journal) ? raw.journal.slice(0, 12) : fresh.journal
  };
}

export function isekaiActionError(farm, action, now = Date.now()) {
  const regionId = action.regionId || farm.selectedRegion;
  const plot = farm.plots?.[regionId]?.[action.plotIndex];
  const crop = cropById(action.cropId);
  if (action.type === 'unlock') {
    const region = regionById(regionId);
    if (!region || region.id === 'west' || farm.unlockedRegions.includes(regionId)) return '這片土地已經開放。';
    if (farm.coins < region.cost) return `需要 ${region.cost} 枚金幣。`;
    if (farm.harvested < 3) return '先在西部完成至少三次收成。';
    return '';
  }
  if (!farm.unlockedRegions.includes(regionId)) return '先解鎖此區域。';
  if (action.type === 'buy') {
    if (!crop || crop.region !== regionId) return '請選擇本區的種苗。';
    return farm.coins < crop.seed ? '金幣不足。' : '';
  }
  if (action.type === 'sell') return crop && (farm.produce[crop.id] || 0) > 0 ? '' : '倉庫沒有這種收成。';
  if (!Number.isInteger(action.plotIndex) || action.plotIndex < 0 || action.plotIndex >= 6) return '請先選擇田地。';
  if (action.type === 'plant') {
    if (plot) return '這塊田已經種有作物。';
    if (!crop || crop.region !== regionId) return '請選擇本區的種苗。';
    return (farm.seeds[crop.id] || 0) < 1 ? '沒有這種種苗，請先購買。' : '';
  }
  if (!plot) return '這塊田尚未播種。';
  if (action.type === 'water') return plot.watered ? '已經澆過水。' : now >= plot.readyAt ? '作物已成熟，可以收成。' : '';
  if (action.type === 'harvest') return now < plot.readyAt ? '作物尚未成熟。' : '';
  return '未知操作。';
}

export function applyIsekaiAction(source, action, now = Date.now()) {
  const farm = normalizeIsekaiFarm(source);
  const error = isekaiActionError(farm, action, now);
  if (error) throw new Error(error);
  const regionId = action.regionId || farm.selectedRegion;
  const crop = cropById(action.cropId);
  let detail = '';
  if (action.type === 'unlock') {
    const region = regionById(regionId);
    farm.coins -= region.cost;
    farm.unlockedRegions.push(regionId);
    farm.selectedRegion = regionId;
    detail = `解鎖${region.name}，花費 ${region.cost} 金幣`;
  } else if (action.type === 'buy') {
    farm.coins -= crop.seed;
    farm.seeds[crop.id] += 1;
    detail = `取得一份${crop.name}種苗`;
  } else if (action.type === 'plant') {
    farm.seeds[crop.id] -= 1;
    farm.plots[regionId][action.plotIndex] = { cropId: crop.id, plantedAt: now, readyAt: now + crop.growthMs, watered: false };
    detail = `在${regionById(regionId).name}播下${crop.name}`;
  } else if (action.type === 'water') {
    const plot = farm.plots[regionId][action.plotIndex];
    plot.watered = true;
    plot.readyAt = Math.max(now + 15000, plot.readyAt - 45000);
    detail = '澆水後，作物生長加快';
  } else if (action.type === 'harvest') {
    const plot = farm.plots[regionId][action.plotIndex];
    const grown = cropById(plot.cropId);
    const quantity = grown.yield + Number(plot.watered);
    farm.produce[grown.id] += quantity;
    farm.harvested += 1;
    farm.renown += quantity;
    farm.plots[regionId][action.plotIndex] = null;
    detail = `收成${grown.name} ${quantity} 份，聲望 +${quantity}`;
  } else if (action.type === 'sell') {
    const quantity = farm.produce[crop.id];
    farm.coins += quantity * crop.sale;
    farm.produce[crop.id] = 0;
    detail = `賣出${crop.name} ${quantity} 份，得到 ${quantity * crop.sale} 金幣`;
  }
  farm.journal.unshift({ at: now, text: detail });
  farm.journal = farm.journal.slice(0, 12);
  return { farm, detail };
}
