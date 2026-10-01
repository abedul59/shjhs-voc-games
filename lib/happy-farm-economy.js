import { CROP_PRODUCTS, cropById, farmhouseKind, farmhouseReserved, taiwanDate, taiwanMonth } from './happy-farm';
import { governmentLoanBalance } from './happy-farm-finance';
import { DORM_COST, dormName, housingAssignments } from './happy-farm-housing';

export const FACILITY_COST = { solar: 280, factory: 280, tourism: 350, headquarters: 700, villa: 950 };
export const FARMHOUSE_PARCEL_PLOTS = 10;
export const FARMHOUSE_PLOT_HA = 0.025;
export const farmhouseName = kind => kind === 'headquarters' ? '農業公司總部（農舍外觀）' : '自家豪宅（農舍外觀）';

// Ten adjacent game cells in one village stand for ONE fictional 0.25 ha parcel.
// The cells are not cadastral lots; actual farmhouse eligibility needs authority review.
export function farmhouseParcel(farm, plotIndex) {
  const villageId = farm.plotVillages?.[plotIndex];
  const local = (farm.plotVillages || []).map((id, index) => id === villageId ? index : -1).filter(index => index >= 0);
  const position = local.indexOf(plotIndex);
  if (position < 0) return null;
  for (let start = Math.max(0, position - FARMHOUSE_PARCEL_PLOTS + 1); start <= Math.min(position, local.length - FARMHOUSE_PARCEL_PLOTS); start++) {
    const parcel = local.slice(start, start + FARMHOUSE_PARCEL_PLOTS);
    if (parcel.every(index => index === plotIndex || !farm.plots[index]?.facility)) return parcel;
  }
  return null;
}
export const SOLAR_SUBSIDY_LIMIT = 3;
export const SOLAR_UNSUBSIDIZED_COST = 430;
export const solarPanelCount = farm => farm.plots.filter(plot => plot?.solar || plot?.facility === 'solar').length;
export const solarBuildCost = farm => (farm.solarSubsidiesUsed ?? solarPanelCount(farm)) < SOLAR_SUBSIDY_LIMIT ? FACILITY_COST.solar : SOLAR_UNSUBSIDIZED_COST;
export const REVENUE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

// Older saves only kept the calendar day. Treat those receipts as midnight in Taiwan;
// new receipts use an exact timestamp and a rolling three-hour interval.
export function revenueWaitMs(plot, timestampKey, legacyDayKey, now) {
  if (!plot) return 0;
  const lastAt = Number(plot[timestampKey]);
  if (Number.isFinite(lastAt) && lastAt > 0) return Math.max(0, lastAt + REVENUE_COOLDOWN_MS - now);
  const lastDay = plot[legacyDayKey];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDay || '')) return 0;
  const legacyAt = Date.parse(`${lastDay}T00:00:00+08:00`);
  return Number.isFinite(legacyAt) ? Math.max(0, legacyAt + REVENUE_COOLDOWN_MS - now) : 0;
}

export function farmRevenueSlot(now) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)));
  return `${taiwanDate(now)}:${Math.floor(hour / 3)}`;
}
const ROOF_FACILITIES = new Set(['factory', 'tourism', 'market', 'school', 'fishing', 'shrimp', 'karaoke', 'restaurant', 'bicycle', 'icecream', 'migrant_dorm', 'farmhouse', 'cat_cafe', 'dog_school', 'rabbit_garden', 'hamster_class', 'guinea_garden', 'parrot_theater', 'budgie_aviary', 'tortoise_garden', 'koi_gallery', 'quail_egg_shop', 'bee_class', 'deer_garden', 'alpaca_walk', 'horse_riding', 'silk_workshop']);
export const solarSite = plot => !plot || plot.facility === 'solar' ? '空地'
  : plot.facility === 'animal' && ['milkfish', 'tilapia'].includes(plot.animalId) ? '魚塭上方'
    : plot.facility === 'animal' ? '養殖設施屋頂'
      : ROOF_FACILITIES.has(plot.facility) ? '建築屋頂' : '';

export const demolitionCost = (plot, mode = 'facility') => mode === 'solar' ? 35
  : (plot?.facility === 'animal' ? 45 : plot?.facility === 'solar' ? 35 : plot?.facility === 'factory' || plot?.facility === 'tourism' ? 65 : ['migrant_dorm', 'farmhouse'].includes(plot?.facility) ? 90 : 55)
    + (plot?.solar && plot?.facility !== 'solar' ? 20 : 0);
export function demolitionError(farm, plotIndex, mode) {
  const plot = farm.plots[plotIndex];
  if (!Number.isInteger(plotIndex) || !farm.ownedVillages?.includes(farm.plotVillages?.[plotIndex])) return '請先選自己的設施地格。';
  if (mode === 'solar' ? !plot?.solar && plot?.facility !== 'solar' : !plot?.facility || plot.facility === 'loan_hold') return '此地沒有可拆的設施。';
  if (mode !== 'solar' && plot.facility === 'migrant_dorm' && Object.values(housingAssignments(farm).assignments).includes(plotIndex)) return '此宿舍仍有移工入住；請先安排另一間同別宿舍或解雇住戶。';
  return farm.coins >= demolitionCost(plot, mode) ? '' : '金幣不足，無法支付拆除費。';
}
export function applyDemolition(farm, plotIndex, mode) {
  const next = JSON.parse(JSON.stringify(farm));
  const plot = next.plots[plotIndex];
  const cost = demolitionCost(plot, mode);
  next.coins -= cost;
  if (mode === 'solar' && plot.facility !== 'solar') {
    plot.solar = false;
    delete plot.lastSolarAt;
    delete plot.lastSolarDay;
    return { farm: next, detail: `拆除屋頂／魚塭光電板，支付 ${cost} 金幣` };
  }
  if (plot.facility === 'animal' && next.animals?.[plot.animalId]) {
    delete next.animals[plot.animalId].plotIndex;
    next.animals[plot.animalId].awaitingPlacement = true;
    next.animals[plot.animalId].care = {};
  }
  next.plots[plotIndex] = null;
  return { farm: next, detail: `拆除設施並空出農地，支付 ${cost} 金幣${plot.facility === 'animal' ? '；動物保留，待重新安置' : ''}` };
}

// A stable daily game forecast. It never purports to be the real weather forecast.
export function farmDay(now) {
  const date = taiwanDate(now);
  const month = taiwanMonth(now);
  const seed = [...date].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) % 997, 17);
  const wetSeason = month >= 5 && month <= 9;
  const weather = seed % 10 < (wetSeason ? 4 : 6) ? 'sunny' : seed % 10 < 8 ? 'cloudy' : 'rainy';
  const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
  return {
    date, month, weather,
    weatherName: { sunny: '晴天', cloudy: '多雲', rainy: '雨天' }[weather],
    weatherIcon: { sunny: '☀️', cloudy: '☁️', rainy: '🌧️' }[weather],
    season: month <= 2 || month === 12 ? '冬季' : month <= 5 ? '春季' : month <= 8 ? '夏季' : '秋季',
    weekend: weekday === 0 || weekday === 6
  };
}

export function solarIncome(plot, now) {
  const base = !plot?.facility ? 0 : plot.facility === 'solar' ? 12 : solarSite(plot) === '魚塭上方' ? 8 : 10;
  const multiplier = { sunny: 1.5, cloudy: 1, rainy: 0.4 }[farmDay(now).weather];
  return Math.round(base * multiplier);
}

export function tourismIncome(farm, now) {
  const day = farmDay(now);
  const cropKinds = new Set(farm.plots.filter(plot => plot?.crop).map(plot => plot.crop)).size;
  const animalKinds = Object.values(farm.animals || {}).filter(pen => Number.isInteger(pen?.plotIndex)).length;
  const visitors = (day.weekend ? 4 : 2) + cropKinds + Math.ceil(animalKinds / 2);
  return { visitors, coins: governmentLoanBalance(farm) ? 0 : Math.round(visitors * (day.weekend ? 4 : 3) * (farm.protagonistId === 'guide' ? 1.2 : 1)) };
}

export function processedSale(cropId) {
  const crop = cropById(cropId);
  return crop ? crop.sale * 3 + 8 : 0;
}

export function economyActionError(farm, action, plotIndex, cropId, mode, now) {
  const plot = farm.plots[plotIndex];
  const owned = Number.isInteger(plotIndex) && plotIndex >= 0 && plotIndex < farm.plots.length && farm.ownedVillages?.includes(farm.plotVillages?.[plotIndex]);
  if (action === 'processCrop') {
    if (!cropById(cropId) || !CROP_PRODUCTS[cropId]) return '找不到加工品。';
    if ((farm.produce?.[cropId] || 0) < 2) return '需要兩份原料作物。';
    if (mode === 'factory' && !farm.plots.some(item => item?.facility === 'factory')) return '請先在空地建立加工坊。';
    if (mode !== 'factory' && mode !== 'outsource') return '請選擇加工方式。';
    if (mode === 'outsource' && farm.coins < 12) return '委外加工需 12 金幣。';
    return '';
  }
  if (action === 'sellProcessed') return cropById(cropId) && (farm.processedProduce?.[cropId] || 0) > 0 ? '' : '沒有可賣的加工品。';
  if (action === 'collectVisitors') {
    const center = farm.plots.find(item => item?.facility === 'tourism');
    return !center ? '請先建立觀光接待站。' : revenueWaitMs(center, 'lastVisitAt', 'lastVisitDay', now) > 0 ? '觀光接待站每 3 小時可收款一次。' : '';
  }
  if (!owned) return '請先選擇自己擁有的一塊地。';
  if (action === 'buildSolar') {
    if (farmhouseReserved(farm, plotIndex)) return '農舍所屬的其他 9 格須維持農用，不能設置光電板。';
    if (plot && !solarSite(plot)) return '光電板只能設於空地、魚塭、農舍或建築屋頂。';
    if (plot?.solar || plot?.facility === 'solar') return '這塊地已有光電板。';
    return farm.coins >= solarBuildCost(farm) ? '' : '金幣不足。';
  }
  if (action === 'buildDorm') {
    if (!['female', 'male'].includes(mode)) return '請選擇男宿舍或女宿舍。';
    if (plot !== null) return '宿舍要建在一塊空地。';
    if (farmhouseReserved(farm, plotIndex)) return '這格已保留給農舍農用地。';
    return farm.coins >= DORM_COST ? '' : `建造${dormName(mode)}需 ${DORM_COST} 金幣。`;
  }
  if (action === 'buildFarmhouse') {
    if (!['headquarters', 'villa'].includes(mode)) return '請選擇農舍外觀。';
    if (plot !== null) return '請先選一塊空地。';
    if (farmhouseKind(farm)) return '每位玩家只能建一棟遊戲農舍。';
    if (!farmhouseParcel(farm, plotIndex)) return '同一里需有連續 10 格虛擬農地，其中 9 格保留農用；不能跨里合併或計入其他設施。';
    return farm.coins >= FACILITY_COST[mode] ? '' : `建造需 ${FACILITY_COST[mode]} 金幣。`;
  }
  if (action === 'buildFactory' || action === 'buildTourism') {
    if (plot !== null) return '此設施需要一塊空地。';
    if (farmhouseReserved(farm, plotIndex)) return '這格已保留給農舍農用地。';
    const kind = action === 'buildFactory' ? 'factory' : 'tourism';
    if (farm.plots.some(item => item?.facility === kind)) return '農場已有這種設施。';
    return farm.coins >= FACILITY_COST[kind] ? '' : '金幣不足。';
  }
  if (action === 'collectSolar') {
    if (!(plot?.solar || plot?.facility === 'solar')) return '這塊地沒有光電板。';
    return revenueWaitMs(plot, 'lastSolarAt', 'lastSolarDay', now) > 0 ? '光電板每 3 小時可收款一次。' : '';
  }
  return '無法執行此操作。';
}

export function applyEconomyAction(farm, action, plotIndex, cropId, mode, now) {
  const next = JSON.parse(JSON.stringify(farm));
  const plot = next.plots[plotIndex];
  const day = farmDay(now);
  let detail = '';
  if (action === 'buildSolar') {
    const cost = solarBuildCost(next);
    next.coins -= cost;
    if (cost === FACILITY_COST.solar) next.solarSubsidiesUsed = Math.min(SOLAR_SUBSIDY_LIMIT, (next.solarSubsidiesUsed ?? solarPanelCount(next)) + 1);
    if (plot) plot.solar = true;
    else next.plots[plotIndex] = { facility: 'solar', solar: true };
    detail = `已在${solarSite(next.plots[plotIndex])}設置光電板，花費 ${cost} 金幣`;
  } else if (action === 'buildDorm') {
    next.coins -= DORM_COST;
    next.plots[plotIndex] = { facility: 'migrant_dorm', gender: mode };
    detail = `已在農地建造${dormName(mode)}，可供同別移工 2 人共住；跨里通勤依遊戲級距限制`;
  } else if (action === 'buildFarmhouse') {
    next.coins -= FACILITY_COST[mode];
    next.plots[plotIndex] = { facility: 'farmhouse', kind: mode, parcel: farmhouseParcel(farm, plotIndex).filter(index => index !== plotIndex) };
    detail = `已建造${farmhouseName(mode)}；同里 10 格虛擬地中 1 格用於建築、9 格保留農用`;
  } else if (action === 'buildFactory' || action === 'buildTourism') {
    const kind = action === 'buildFactory' ? 'factory' : 'tourism';
    next.coins -= FACILITY_COST[kind];
    next.plots[plotIndex] = { facility: kind };
    detail = kind === 'factory' ? '加工坊已佔用一塊農地' : '觀光接待站已佔用一塊農地';
  } else if (action === 'collectSolar') {
    const income = Math.round(solarIncome(plot, now) * (next.protagonistId === 'engineer' ? 1.25 : 1));
    next.coins += income;
    plot.lastSolarAt = now;
    plot.lastSolarDay = day.date;
    detail = `${farmDay(now).weatherName}賣電獲得 ${income} 金幣`;
  } else if (action === 'collectVisitors') {
    const center = next.plots.find(item => item?.facility === 'tourism');
    const income = tourismIncome(next, now);
    center.lastVisitAt = now;
    center.lastVisitDay = day.date;
    next.visitors = (next.visitors || 0) + income.visitors;
    next.coins += income.coins;
    detail = `接待 ${income.visitors} 位遊客，門票收入 ${income.coins} 金幣`;
  } else if (action === 'processCrop') {
    next.produce[cropId] -= 2;
    if (mode === 'outsource') next.coins -= 12;
    next.processedProduce[cropId] = (next.processedProduce[cropId] || 0) + 1;
    detail = `用兩份${cropById(cropId).name}製成一份${CROP_PRODUCTS[cropId]}${mode === 'outsource' ? '（委外費 12 金幣）' : ''}`;
  } else if (action === 'sellProcessed') {
    const count = next.processedProduce[cropId];
    const income = Math.round(count * processedSale(cropId) * (farmhouseKind(next) === 'headquarters' ? 1.1 : 1));
    next.coins += income;
    next.processedProduce[cropId] = 0;
    detail = `賣出${CROP_PRODUCTS[cropId]} × ${count}，獲得 ${income} 金幣`;
  }
  return { farm: next, detail };
}
