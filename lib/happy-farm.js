import xinhuaMap from '~/data/xinhua-villages.json';
import neighborMaps from '~/data/farm-neighbor-districts.json';
import villageAreas from '~/data/farm-village-areas.json';
import { freshAnimalState, withAnimalState } from '~/lib/happy-farm-animals';
import { freshWorkerState, withWorkerState } from '~/lib/happy-farm-workers';

export const FARM_CROPS = [
  { id: 'carrot', name: '胡蘿蔔', icon: '🥕', seed: 12, sale: 18, growMinutes: 2, yield: 2, seasonMonths: [11, 12, 1, 2, 3, 4] },
  { id: 'corn', name: '玉米', icon: '🌽', seed: 24, sale: 28, growMinutes: 5, yield: 3, seasonMonths: [3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'strawberry', name: '草莓', icon: '🍓', seed: 45, sale: 42, growMinutes: 10, yield: 3, seasonMonths: [11, 12, 1, 2, 3, 4] },
  { id: 'pumpkin', name: '南瓜', icon: '🎃', seed: 85, sale: 75, growMinutes: 20, yield: 4, seasonMonths: [3, 4, 5, 6, 7, 8, 9] },
  { id: 'pineapple', name: '鳳梨', icon: '🍍', seed: 42, sale: 37, growMinutes: 9, yield: 3, local: true, seasonMonths: [3, 4, 5, 6, 7, 8] },
  { id: 'bamboo', name: '麻竹筍', icon: '🎋', seed: 38, sale: 32, growMinutes: 8, yield: 3, local: true, seasonMonths: [5, 6, 7, 8, 9, 10] },
  { id: 'sweet_potato', name: '地瓜', icon: '🍠', seed: 18, sale: 21, growMinutes: 4, yield: 3, local: true, seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: 'olive', name: '橄欖', icon: '🫒', seed: 55, sale: 48, growMinutes: 12, yield: 3, local: true, seasonMonths: [9, 10, 11, 12] },
  { id: 'sesame', name: '胡麻', icon: '🌾', seed: 20, sale: 23, growMinutes: 5, yield: 3, local: true, seasonMonths: [5, 6, 7, 8, 9, 10] },
  { id: 'rice', name: '稻米', icon: '🌾', seed: 16, sale: 19, growMinutes: 4, yield: 3, local: true, seasonMonths: [1, 2, 3, 4, 7, 8, 9] },
  { id: 'mango', name: '芒果', icon: '🥭', seed: 65, sale: 60, growMinutes: 13, yield: 3, seasonMonths: [4, 5, 6, 7, 8, 9] },
  { id: 'dragon_fruit', name: '火龍果', icon: '🐉', seed: 58, sale: 53, growMinutes: 11, yield: 3, seasonMonths: [5, 6, 7, 8, 9, 10, 11] },
  { id: 'banana', name: '香蕉', icon: '🍌', seed: 52, sale: 47, growMinutes: 12, yield: 3, seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
];

export const CROP_PRODUCTS = {
  carrot: '胡蘿蔔汁', corn: '玉米脆片', strawberry: '草莓果醬', pumpkin: '南瓜派',
  pineapple: '鳳梨酥', bamboo: '麻竹筍乾', sweet_potato: '地瓜片', olive: '橄欖蜜餞',
  sesame: '胡麻醬', rice: '米餅', mango: '芒果乾', dragon_fruit: '火龍果果醬', banana: '香蕉乾'
};

export const taiwanDate = now => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
export const taiwanMonth = now => Number(taiwanDate(now).slice(5, 7));
export const cropInSeason = (crop, now) => !crop?.seasonMonths || crop.seasonMonths.includes(taiwanMonth(now));

export const FARM_GAME_TYPE = '單字開心農場';
export const FARM_DISTRICTS = [{ name: '新化區', ...xinhuaMap }, ...neighborMaps.districts];
export const XINHUA_VILLAGE_IDS = xinhuaMap.villages.map(item => item.id);
export const FARM_VILLAGES = FARM_DISTRICTS.flatMap(district => district.villages.map(village => ({ ...village, district: district.name })));
export const villageById = id => FARM_VILLAGES.find(village => village.id === id);
export const neighborAccess = farm => !!farm.neighborUnlocked || XINHUA_VILLAGE_IDS.every(id => farm.ownedVillages?.includes(id));
export const FARM_START_PLOTS = 6;
export const FARM_NEW_VILLAGE_PLOTS = 4;
// Four baseline plots plus one for roughly each 0.5 km²; bounded for the game layout.
export const villageAreaKm2 = id => Number(villageAreas.km2[id] || 0);
export const villagePlotCapacity = id => Math.max(4, Math.min(30, Math.round(4 + villageAreaKm2(id) * 2)));
// Grandfather existing saves that exceeded the new area-based limit.
export const villagePlotLimit = (farm, id) => Math.max(villagePlotCapacity(id), villagePlotCount(farm, id));
export const FARM_FERTILIZER_COST = 8;
export const villagePrice = farm => Math.min(900, 180 + Math.max(0, (farm.ownedVillages?.length || 1) - 1) * 70);
export const landSalePrice = (farm, villageId) => Math.floor((farm.landPrices?.[villageId] || 180) / 2);
export const villagePlotCount = (farm, villageId) => farm.plotVillages?.filter(id => id === villageId).length || 0;
export const cropById = id => FARM_CROPS.find(crop => crop.id === id);
export const freshFarm = (villageId = '') => ({
  coins: 120,
  plots: Array.from({ length: Math.min(FARM_START_PLOTS, villagePlotCapacity(villageId)) }, () => null),
  homeVillage: villageId,
  ownedVillages: villageId ? [villageId] : [],
  plotVillages: Array.from({ length: Math.min(FARM_START_PLOTS, villagePlotCapacity(villageId)) }, () => villageId),
  neighborUnlocked: false,
  landPrices: {},
  seeds: Object.fromEntries(FARM_CROPS.map(crop => [crop.id, crop.id === 'carrot' ? 2 : crop.id === 'corn' ? 1 : 0])),
  produce: Object.fromEntries(FARM_CROPS.map(crop => [crop.id, 0])),
  processedProduce: Object.fromEntries(FARM_CROPS.map(crop => [crop.id, 0])),
  visitors: 0,
  businessRevenue: 0,
  harvested: 0,
  ...freshAnimalState(),
  ...freshWorkerState()
});

// Existing players keep every plot and coin when villages are introduced.
export function withVillageLand(farm, fallbackVillageId) {
  const homeVillage = farm.homeVillage || fallbackVillageId;
  const ownedVillages = [...new Set([homeVillage, ...(farm.ownedVillages || [])])];
  const plotVillages = farm.plots.map((_, index) => farm.plotVillages?.[index] ?? homeVillage);
  const seeds = { ...farm.seeds }, produce = { ...farm.produce }, processedProduce = { ...farm.processedProduce };
  for (const crop of FARM_CROPS) {
    if (!(crop.id in seeds)) seeds[crop.id] = 0;
    if (!(crop.id in produce)) produce[crop.id] = 0;
    if (!(crop.id in processedProduce)) processedProduce[crop.id] = 0;
  }
  const landPrices = { ...(farm.landPrices || {}) };
  ownedVillages.forEach((id, index) => {
    if (index && !(id in landPrices)) landPrices[id] = 180 + (index - 1) * 70;
  });
  const next = withWorkerState(withAnimalState({ ...farm,
    plots: farm.plots.map(plot => plot ? { ...plot } : null),
    animals: Object.fromEntries(Object.entries(farm.animals || {}).map(([id, pen]) => [id, pen ? { ...pen } : pen])),
    homeVillage, ownedVillages, plotVillages,
    neighborUnlocked: neighborAccess({ ...farm, ownedVillages }), landPrices, seeds, produce, processedProduce,
    businessRevenue: Number(farm.businessRevenue || 0),
    visitors: Number(farm.visitors || 0) }));
  // Place existing animals from earlier saves without removing crops or charging for their old pens.
  for (const [animalId, pen] of Object.entries(next.animals)) {
    if (Number.isInteger(pen?.plotIndex) && next.plots[pen.plotIndex]?.animalId === animalId) continue;
    let index = next.plots.findIndex((plot, slot) => plot === null && ownedVillages.includes(next.plotVillages[slot]));
    if (index < 0) {
      const villageId = ownedVillages.find(id => next.plotVillages.filter(value => value === id).length < villagePlotCapacity(id));
      if (villageId) { index = next.plots.length; next.plots.push(null); next.plotVillages.push(villageId); }
    }
    if (index >= 0) { next.plots[index] = { facility: 'animal', animalId, solar: false }; pen.plotIndex = index; }
    else delete pen.plotIndex; // Keep the animal and products; the player can place it after freeing a plot.
  }
  return next;
}

export function farmActionError(farm, action, cropId, plotIndex, now, villageId = farm.homeVillage, quantity = 1) {
  const crop = cropById(cropId);
  const plot = farm.plots[plotIndex];
  if (action === 'buyLand') {
    const village = villageById(villageId);
    if (!village) return '找不到這個里。';
    if (village.district !== '新化區' && !neighborAccess(farm)) return '買齊新化區 16 里後，才能拓展到鄰區。';
    return !farm.ownedVillages?.includes(villageId) && farm.coins >= villagePrice(farm) ? '' : '金幣不足，或已擁有這個里的農地。';
  }
  if (action === 'sellLand') {
    if (!farm.ownedVillages?.includes(villageId) || villageId === farm.homeVillage) return '起始農地不能出售，或你尚未擁有這個里。';
    return farm.plots.some((plot, index) => farm.plotVillages[index] === villageId && plot) ? '請先收成這個里的所有作物，再出售農地。' : '';
  }
  if (action === 'buy') return crop && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99 && farm.coins >= crop.seed * quantity
    ? '' : '請輸入 1～99 份，並確認金幣足夠。';
  if (action === 'sell') return crop && (farm.produce[crop.id] || 0) > 0 ? '' : '倉庫沒有這種作物。';
  if (action === 'expand') {
    const count = villagePlotCount(farm, villageId);
    return farm.ownedVillages?.includes(villageId) && count < villagePlotCapacity(villageId) && farm.coins >= 100 + count * 30 ? '' : '金幣不足或此里的田地已達上限。';
  }
  if (plotIndex < 0 || plotIndex >= farm.plots.length) return '請先選一塊田地。';
  if (farm.plotVillages?.[plotIndex] !== villageId || !farm.ownedVillages?.includes(villageId)) return '請先選擇自己擁有的田地。';
  if (plot?.facility) return '這塊地已有設施，請選擇農地。';
  if (action === 'plant') return crop && !plot && (farm.seeds[crop.id] || 0) > 0 ? '' : '這塊田已有作物，或沒有種苗。';
  if (!plot) return '這塊田尚未播種。';
  if (action === 'harvest') return now >= plot.readyAt ? '' : '作物尚未成熟。';
  if (action === 'weed') return now >= plot.weedAt && !plot.weedRemoved ? '' : '目前沒有需要清除的雜草。';
  if (action === 'pest') return now >= plot.pestAt && !plot.pestRemoved ? '' : '目前沒有需要清除的害蟲。';
  if (now >= plot.readyAt) return '作物已成熟，請先收成。';
  if (action === 'water') return plot.watered ? '這株作物已澆水。' : '';
  if (action === 'fertilize') return plot.fertilized ? '這株作物已施肥。' : farm.coins < FARM_FERTILIZER_COST ? '施肥需要 8 枚金幣。' : '';
  return '無法執行此操作。';
}

export function applyFarmAction(farm, action, cropId, plotIndex, now, villageId = farm.homeVillage, quantity = 1) {
  const next = JSON.parse(JSON.stringify(farm));
  const crop = cropById(cropId);
  const plot = next.plots[plotIndex];
  if (action === 'buy') { next.coins -= crop.seed * quantity; next.seeds[crop.id] = (next.seeds[crop.id] || 0) + quantity; }
  if (action === 'sell') {
    const count = next.produce[crop.id];
    const income = count * crop.sale;
    next.coins += income;
    next.produce[crop.id] = 0;
    return { farm: next, detail: `賣出 ${crop.name} × ${count}，收入 ${income} 金幣` };
  }
  if (action === 'buyLand') {
    const price = villagePrice(next);
    next.coins -= price;
    next.ownedVillages.push(villageId);
    next.landPrices[villageId] = price;
    if (!next.plotVillages.includes(villageId)) {
      for (let i = 0; i < Math.min(FARM_NEW_VILLAGE_PLOTS, villagePlotCapacity(villageId)); i++) { next.plots.push(null); next.plotVillages.push(villageId); }
    }
    if (XINHUA_VILLAGE_IDS.every(id => next.ownedVillages.includes(id))) next.neighborUnlocked = true;
  }
  if (action === 'sellLand') { next.coins += landSalePrice(next, villageId); next.ownedVillages = next.ownedVillages.filter(id => id !== villageId); }
  if (action === 'expand') { next.coins -= 100 + villagePlotCount(next, villageId) * 30; next.plots.push(null); next.plotVillages.push(villageId); }
  if (action === 'plant') {
    const inSeason = cropInSeason(crop, now);
    const duration = crop.growMinutes * 60000 * (inSeason ? 1 : 1.25);
    next.seeds[crop.id]--;
    next.plots[plotIndex] = {
      crop: crop.id, plantedAt: now, readyAt: now + duration,
      weedAt: now + Math.round(duration * .35), pestAt: now + Math.round(duration * .6),
      watered: false, fertilized: false, weedRemoved: false, pestRemoved: false, seasonBonus: inSeason ? 1 : -1
    };
  }
  if (action === 'water') { plot.watered = true; plot.readyAt = Math.max(now + 15000, plot.readyAt - (plot.readyAt - plot.plantedAt) * .15); }
  if (action === 'fertilize') { next.coins -= FARM_FERTILIZER_COST; plot.fertilized = true; plot.readyAt = Math.max(now + 15000, plot.readyAt - (plot.readyAt - plot.plantedAt) * .2); }
  if (action === 'weed') plot.weedRemoved = true;
  if (action === 'pest') plot.pestRemoved = true;
  if (action === 'harvest') {
    const weed = now >= plot.weedAt && !plot.weedRemoved;
    const pest = now >= plot.pestAt && !plot.pestRemoved;
    const amount = Math.max(1, cropById(plot.crop).yield + Number(plot.seasonBonus || 0) + Number(plot.watered) + Number(plot.fertilized) - Number(weed) - Number(pest) - Number(plot.stolen || 0));
    next.produce[plot.crop] = (next.produce[plot.crop] || 0) + amount;
    next.harvested += amount;
    next.plots[plotIndex] = null;
    return { farm: next, detail: `收成 ${cropById(plot.crop).name} × ${amount}` };
  }
  const actionDetails = { buy: `已購買${crop?.name || ''}種苗 × ${quantity}`, water: '已澆水 💧', fertilize: '已施肥 ✨', weed: '已除草 🌾', pest: '已除蟲 🛡️', buyLand: '已取得新農地 🏡', sellLand: '已售出農地 🪙' };
  return { farm: next, detail: actionDetails[action] || action };
}
