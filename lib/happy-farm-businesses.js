import populationData from '~/data/farm-village-population.json';
import { CROP_PRODUCTS, cropById, villageById } from './happy-farm';
import { farmDay, farmRevenueSlot, processedSale, revenueWaitMs } from './happy-farm-economy';

// Prices and revenue are game values. Village populations are a fixed 114-year official snapshot.
export const FARM_BUSINESSES = [
  { id: 'market', name: '直銷超市', icon: '🏬', cost: 390, description: '販售自產作物與加工品；每里最多一間。', equipment: '貨架、冷藏櫃、收銀台' },
  { id: 'school', name: '農業小學校', icon: '🏫', cost: 350, description: '每輪學習農業知識並開課，取得教學收入。', equipment: '教室、教材、洗手台' },
  { id: 'fishing', name: '釣魚場', icon: '🎣', cost: 370, description: '設置魚池與釣台，招攬釣客。', equipment: '魚池、釣台、救生設備' },
  { id: 'shrimp', name: '釣蝦場', icon: '🦐', cost: 360, description: '設置蝦池與釣位，招攬釣客。', equipment: '蝦池、打氣機、釣位' },
  { id: 'karaoke', name: '卡拉OK中心', icon: '🎤', cost: 440, description: '開放包廂供遊客歡唱。', equipment: '隔音包廂、伴唱設備' },
  { id: 'restaurant', name: '熱炒餐廳', icon: '🍳', cost: 460, description: '使用農場食材開餐，週末客人較多。', equipment: '廚房、用餐區、冷藏設備' },
  { id: 'bicycle', name: '租借腳踏車店', icon: '🚲', cost: 280, description: '出租腳踏車給農場遊客；晴天、週末租借較多。', equipment: '腳踏車、車棚、安全帽與維修架', category: 'attractions' },
  { id: 'icecream', name: '冰淇淋店', icon: '🍨', cost: 250, description: '向遊客販售冰淇淋；晴天、週末較受歡迎。', equipment: '冷凍櫃、洗手台、遮陽座位', category: 'attractions' }
];
export const businessById = id => FARM_BUSINESSES.find(item => item.id === id);
export const villagePopulation = id => Number(populationData.population[id] || 0);
export const populationSource = populationData;

export const AGRI_LESSONS = [
  { question: '虱目魚魚塭常用哪種設備幫助水中維持溶氧？', choices: ['增氧機', '收銀台', '棲架'], answer: '增氧機', explanation: '魚塭的增氧設備可協助維持水中溶氧；本遊戲養殖虱目魚也要巡檢增氧機。' },
  { question: '胡麻收成後，在農場可以加工成什麼？', choices: ['胡麻醬', '草莓果醬', '地瓜片'], answer: '胡麻醬', explanation: '本遊戲可把兩份胡麻加工成一份胡麻醬，再販售。' },
  { question: '照顧作物時，澆水前應先留意什麼？', choices: ['土壤與作物的需水狀況', '伴唱機音量', '遊客的髮色'], answer: '土壤與作物的需水狀況', explanation: '作物需水量與環境不同，先觀察再澆水，能避免過量或不足。' },
  { question: '農產品加工能帶來哪一種用途？', choices: ['增加農產品利用方式', '讓作物不用種植', '省略所有衛生管理'], answer: '增加農產品利用方式', explanation: '加工能讓農產品變成不同品項，例如鳳梨做成鳳梨酥。' },
  { question: '農場的鳳梨可以加工成什麼？', choices: ['鳳梨酥', '胡麻醬', '米餅'], answer: '鳳梨酥', explanation: '本遊戲可將鳳梨製成鳳梨酥，再放到直銷超市販售。' },
  { question: '巡查魚塭時，哪一項與魚類健康最有關係？', choices: ['水質與溶氧', '卡拉OK曲目', '餐廳菜單'], answer: '水質與溶氧', explanation: '養殖虱目魚與臺灣鯛時，需要留意魚塭水質與溶氧。' },
  { question: '晴天時，農場的哪種設施通常能發出較多電？', choices: ['光電板', '冷藏櫃', '釣台'], answer: '光電板', explanation: '本遊戲依模擬天氣計算光電收入；晴天的發電收入最高。' },
  { question: '播種前，為何要查看農作物的適合月份？', choices: ['適季可改善收成', '能改變里界', '能縮短所有設施冷卻'], answer: '適季可改善收成', explanation: '本遊戲適季播種可多收一份；非適季生長較慢、收成較少。' }
];
export function agricultureLesson(now) {
  const slot = farmRevenueSlot(now);
  const index = [...slot].reduce((sum, character) => sum + (/\d/.test(character) ? Number(character) : 0), 0) % AGRI_LESSONS.length;
  return AGRI_LESSONS[index] || AGRI_LESSONS[0];
}

export function marketUnitPrice(cropId, kind, villageId) {
  const crop = cropById(cropId);
  if (!crop || !['fresh', 'processed'].includes(kind)) return 0;
  const base = kind === 'processed' ? processedSale(cropId) : crop.sale;
  const premium = 1.25 + Math.min(.15, villagePopulation(villageId) / 60000);
  return Math.max(base + 1, Math.round(base * premium));
}

export function businessIncome(farm, businessId, villageId, now) {
  const population = villagePopulation(villageId);
  const day = farmDay(now);
  const marketBase = 7 + Math.round(population / 350);
  const base = {
    market: marketBase,
    school: day.weekend ? 10 : 20,
    fishing: day.weekend ? 35 : 18,
    shrimp: day.weekend ? 33 : 17,
    karaoke: day.weekend ? 38 : 19,
    restaurant: day.weekend ? 44 : 22,
    bicycle: day.weekend ? 29 : 16,
    icecream: day.weekend ? 31 : 18
  }[businessId] || 0;
  const weather = day.weather === 'rainy' && ['fishing', 'shrimp', 'bicycle', 'icecream'].includes(businessId) ? .7
    : day.weather === 'sunny' && ['bicycle', 'icecream'].includes(businessId) ? 1.2 : 1;
  const localCustomers = businessId === 'market' ? (day.weekend ? 1.2 : 1) : 1;
  const ownIngredients = businessId === 'restaurant' && (Object.values(farm.produce || {}).some(value => value > 0) || Object.values(farm.animalProducts || {}).some(value => value > 0)) ? 5 : 0;
  return Math.round(base * weather * localCustomers) + ownIngredients;
}

export function businessActionError(farm, action, plotIndex, businessId, cropId, productKind, now) {
  const business = businessById(businessId);
  if (!business) return '找不到這種設施。';
  const villageId = farm.plotVillages?.[plotIndex];
  if (!Number.isInteger(plotIndex) || plotIndex < 0 || plotIndex >= farm.plots.length || !farm.ownedVillages?.includes(villageId)) return '請先選擇已購里別的農地。';
  const plot = farm.plots[plotIndex];
  if (action === 'buildBusiness') {
    if (plot !== null) return '建設需要一塊空地。';
    if (farm.plots.some((item, index) => item?.facility === businessId && farm.plotVillages[index] === villageId)) return `${villageById(villageId)?.name || '這個里'}已有${business.name}；每里最多一間。`;
    return farm.coins >= business.cost ? '' : `建設${business.name}需 ${business.cost} 金幣。`;
  }
  if (plot?.facility !== businessId) return `請先選擇${business.name}所在的地格。`;
  if (action === 'collectBusiness') return revenueWaitMs(plot, 'lastBusinessAt', 'lastBusinessDay', now) > 0 ? '這間設施每 3 小時可收款一次。' : '';
  if (action === 'sellAtMarket') {
    if (businessId !== 'market') return '只能在直銷超市販售。';
    if (!cropById(cropId) || !['fresh', 'processed'].includes(productKind)) return '請先選擇要賣的農產品。';
    const stock = productKind === 'fresh' ? farm.produce : farm.processedProduce;
    return Number(stock?.[cropId] || 0) > 0 ? '' : '倉庫沒有這種農產品。';
  }
  return '無法執行此操作。';
}

export function applyBusinessAction(farm, action, plotIndex, businessId, cropId, productKind, now) {
  const next = JSON.parse(JSON.stringify(farm));
  const villageId = next.plotVillages[plotIndex];
  const business = businessById(businessId);
  const village = villageById(villageId)?.name || '此里';
  let detail = '';
  if (action === 'buildBusiness') {
    next.coins -= business.cost;
    next.plots[plotIndex] = { facility: businessId };
    detail = `${village}的${business.name}已建成，佔用一塊農地`;
  } else if (action === 'collectBusiness') {
    const income = businessIncome(next, businessId, villageId, now);
    next.plots[plotIndex].lastBusinessAt = now;
    next.plots[plotIndex].lastBusinessDay = farmDay(now).date;
    next.coins += income;
    next.businessRevenue = Number(next.businessRevenue || 0) + income;
    detail = `${village}${business.name}本輪營收 ${income} 金幣`;
  } else if (action === 'sellAtMarket') {
    const stock = productKind === 'fresh' ? next.produce : next.processedProduce;
    const count = Number(stock[cropId] || 0);
    const income = count * marketUnitPrice(cropId, productKind, villageId);
    stock[cropId] = 0;
    next.coins += income;
    next.businessRevenue = Number(next.businessRevenue || 0) + income;
    detail = `${village}直銷超市賣出${productKind === 'processed' ? CROP_PRODUCTS[cropId] : cropById(cropId).name} × ${count}，收入 ${income} 金幣`;
  }
  return { farm: next, detail };
}
