// Care tasks are a short game abstraction, not instructions for keeping real animals.
export const FARM_ANIMALS = [
  { id: 'cow', name: '乳牛', icon: '🐄', price: 180, habitat: '牛舍', equipment: '飼槽、飲水槽、遮蔭棚', minutes: 8, yield: 2, product: '牛奶', productIcon: '🥛', sale: 48,
    care: [{ id: 'feed', label: '補牧草', icon: '🌿' }, { id: 'water', label: '清潔飲水槽', icon: '💧' }, { id: 'brush', label: '梳理毛皮', icon: '🪮' }] },
  { id: 'sheep', name: '羊', icon: '🐑', price: 165, habitat: '羊舍', equipment: '乾草架、飲水槽、避雨棚', minutes: 9, yield: 2, product: '羊毛', productIcon: '🧶', sale: 52,
    care: [{ id: 'feed', label: '補乾草', icon: '🌾' }, { id: 'water', label: '補飲水', icon: '💧' }, { id: 'shelter', label: '整理羊舍', icon: '🏠' }] },
  { id: 'chicken', name: '雞', icon: '🐓', price: 70, habitat: '雞舍', equipment: '棲架、產蛋箱、飲水器', minutes: 4, yield: 2, product: '雞蛋', productIcon: '🥚', sale: 22,
    care: [{ id: 'feed', label: '補穀物', icon: '🌾' }, { id: 'water', label: '補飲水', icon: '💧' }, { id: 'nest', label: '整理雞窩', icon: '🪺' }] },
  { id: 'duck', name: '鴨', icon: '🦆', price: 90, habitat: '鴨舍', equipment: '戲水池、巢箱、排水區', minutes: 5, yield: 2, product: '鴨蛋', productIcon: '🥚', sale: 28,
    care: [{ id: 'feed', label: '補飼料', icon: '🌽' }, { id: 'pond', label: '清理戲水池', icon: '💦' }, { id: 'nest', label: '整理鴨窩', icon: '🪺' }] },
  { id: 'goose', name: '鵝', icon: '🪿', price: 115, habitat: '鵝舍', equipment: '草地、戲水池、圍欄', minutes: 7, yield: 2, product: '鵝蛋', productIcon: '🥚', sale: 36,
    care: [{ id: 'feed', label: '補青草', icon: '🌱' }, { id: 'pond', label: '清理戲水池', icon: '💦' }, { id: 'shelter', label: '整理鵝舍', icon: '🏠' }] },
  { id: 'pig', name: '豬', icon: '🐖', price: 145, habitat: '豬舍', equipment: '飼槽、飲水器、泥浴區', minutes: 7, yield: 2, product: '有機堆肥', productIcon: '🧺', sale: 35,
    care: [{ id: 'feed', label: '補飼料', icon: '🥬' }, { id: 'water', label: '補飲水', icon: '💧' }, { id: 'wallow', label: '整理泥浴區', icon: '🛁' }] },
  { id: 'frog', name: '青蛙', icon: '🐸', price: 110, habitat: '濕地池', equipment: '淺水池、植栽、躲藏處', minutes: 6, yield: 1, product: '夜觀導覽券', productIcon: '🎫', sale: 58,
    care: [{ id: 'feed', label: '補昆蟲餌', icon: '🦗' }, { id: 'mist', label: '維持棲地濕潤', icon: '💧' }, { id: 'habitat', label: '整理躲藏處', icon: '🍃' }] },
  { id: 'goldfish', name: '金魚', icon: '🐟', price: 125, habitat: '觀賞水池', equipment: '過濾器、打氣機、水質計', minutes: 6, yield: 1, product: '金魚觀賞券', productIcon: '🎫', sale: 65,
    care: [{ id: 'feed', label: '少量餵食', icon: '🫧' }, { id: 'filter', label: '檢查過濾器', icon: '🔄' }, { id: 'water', label: '檢查水質', icon: '💧' }] },
  { id: 'crocodile', name: '鱷魚', icon: '🐊', price: 320, habitat: '安全圍欄池', equipment: '防護圍欄、水池、日照區', minutes: 12, yield: 1, product: '保育導覽券', productIcon: '🎫', sale: 145,
    care: [{ id: 'feed', label: '準備專用飼料', icon: '🍽️' }, { id: 'water', label: '檢查水池', icon: '💧' }, { id: 'bask', label: '檢查日照區', icon: '☀️' }] },
  { id: 'milkfish', name: '虱目魚', icon: '🐟', price: 190, habitat: '半鹹水魚塭', equipment: '進排水口、投餌桶、增氧機', pond: true, minutes: 9, yield: 2, product: '虱目魚', productIcon: '🐟', sale: 62,
    care: [{ id: 'feed', label: '檢查投餌桶', icon: '🌾' }, { id: 'salinity', label: '檢查鹽度與水質', icon: '🧪' }, { id: 'aerator', label: '巡檢增氧機', icon: '💨' }] },
  { id: 'tilapia', name: '臺灣鯛', icon: '🐟', price: 175, habitat: '淡水魚塭', equipment: '增氧水車、飼料桶、水質計', pond: true, minutes: 8, yield: 2, product: '臺灣鯛', productIcon: '🐟', sale: 55,
    care: [{ id: 'feed', label: '補飼料', icon: '🌾' }, { id: 'oxygen', label: '檢查溶氧與水車', icon: '💨' }, { id: 'water', label: '檢查水質', icon: '🧪' }] }
];

export const animalById = id => FARM_ANIMALS.find(animal => animal.id === id);
export const freshAnimalState = () => ({ animals: {}, animalProducts: {}, animalCollected: 0 });

export function withAnimalState(farm) {
  const animals = { ...(farm.animals && typeof farm.animals === 'object' ? farm.animals : {}) };
  const animalProducts = { ...(farm.animalProducts && typeof farm.animalProducts === 'object' ? farm.animalProducts : {}) };
  for (const animal of FARM_ANIMALS) {
    if (!(animal.id in animalProducts)) animalProducts[animal.id] = 0;
  }
  return { ...farm, animals, animalProducts, animalCollected: Number(farm.animalCollected || 0) };
}

export function animalActionError(farm, action, animalId, careId, now, plotIndex = -1) {
  const animal = animalById(animalId);
  if (!animal) return '找不到這種動物。';
  const pen = farm.animals?.[animalId];
  if (action === 'buyAnimal' || action === 'placeAnimal') {
    if (action === 'buyAnimal' && pen) return '已經養了這種動物。';
    if (action === 'placeAnimal' && (!pen || Number.isInteger(pen.plotIndex))) return '這種動物不需要安置。';
    if (!Number.isInteger(plotIndex) || plotIndex < 0 || plotIndex >= farm.plots.length || farm.plots[plotIndex] !== null || !farm.ownedVillages?.includes(farm.plotVillages?.[plotIndex])) return '請先選擇自己擁有的一塊空地建造農舍或魚塭。';
    return action === 'buyAnimal' && farm.coins < animal.price ? '金幣不足。' : '';
  }
  if (action === 'sellAnimalProduct') return (farm.animalProducts?.[animalId] || 0) > 0 ? '' : '目前沒有可賣的產品。';
  if (!pen) return '請先購買這種動物。';
  if (!Number.isInteger(pen.plotIndex) || farm.plots[pen.plotIndex]?.animalId !== animalId) return '請先替這種動物安排一塊空地。';
  if (action === 'careAnimal') {
    if (!animal.care.some(item => item.id === careId)) return '找不到這項照護動作。';
    return pen.care?.[careId] ? '本輪已完成這項照護。' : '';
  }
  if (action === 'collectAnimal') {
    if (animal.care.some(item => !pen.care?.[item.id])) return '請先完成本輪所有照護。';
    return now < pen.readyAt ? '產品尚未準備好。' : '';
  }
  return '無法執行此操作。';
}

export function applyAnimalAction(farm, action, animalId, careId, now, plotIndex = -1) {
  const next = JSON.parse(JSON.stringify(farm));
  const animal = animalById(animalId);
  let detail = '';
  if (action === 'buyAnimal') {
    next.coins -= animal.price;
    next.plots[plotIndex] = { facility: 'animal', animalId, solar: false };
    next.animals[animalId] = { adoptedAt: now, readyAt: now + animal.minutes * 60000, care: {}, plotIndex };
    detail = `${animal.name}已入住${animal.habitat}，使用一塊農地`;
  } else if (action === 'placeAnimal') {
    next.plots[plotIndex] = { facility: 'animal', animalId, solar: false };
    next.animals[animalId].plotIndex = plotIndex;
    delete next.animals[animalId].awaitingPlacement;
    detail = `${animal.name}已安置於${animal.habitat}`;
  } else if (action === 'careAnimal') {
    next.animals[animalId].care[careId] = true;
    detail = `${animal.name}：${animal.care.find(item => item.id === careId).label}`;
  } else if (action === 'collectAnimal') {
    next.animalProducts[animalId] = (next.animalProducts[animalId] || 0) + animal.yield;
    next.animalCollected += animal.yield;
    next.animals[animalId].readyAt = now + animal.minutes * 60000;
    next.animals[animalId].care = {};
    detail = `取得${animal.product} × ${animal.yield}`;
  } else if (action === 'sellAnimalProduct') {
    const count = next.animalProducts[animalId];
    next.coins += count * animal.sale;
    next.animalProducts[animalId] = 0;
    detail = `賣出${animal.product} × ${count}，獲得 ${count * animal.sale} 金幣`;
  }
  return { farm: next, detail };
}
