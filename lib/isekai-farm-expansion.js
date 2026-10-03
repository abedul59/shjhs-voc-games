import { ISEKAI_ANIMALS, ISEKAI_BUILDINGS, ISEKAI_CROPS, adjustedSalePrice, animalById, buildingById, cropById, hasIsekaiBuilding, isekaiClimate } from './isekai-farm.js';

export const ISEKAI_WORLD_CYCLE_MS = 3 * 3600000;
export const ISEKAI_RECIPES = [
  ['flour', '阿斯拉麵粉', '🌾', 'wheat', 2, 42], ['jam', '蜜霞果醬', '🫙', 'mistberry', 2, 105],
  ['pie', '月光南瓜派', '🥧', 'moonpumpkin', 2, 90], ['potion', '北境藥草藥劑', '🧪', 'herb', 2, 115],
  ['wine', '水晶葡萄露', '🍷', 'crystalgrape', 2, 145], ['ricecake', '薩納基亞米餅', '🍘', 'rice', 2, 110],
  ['oil', '基卡油籽油', '🫒', 'oilseed', 2, 150], ['tea', '金羽香茶', '🍵', 'goldentea', 2, 165],
  ['mint', '星露薄荷糖', '🍬', 'starmint', 2, 95], ['honey', '晨露蜜糖', '🍯', 'dewbee', 2, 125]
].map(([id, name, mark, sourceId, sourceCount, sale]) => ({ id, name, mark, sourceId, sourceCount, sale, animal: !!animalById(sourceId) }));
export const ISEKAI_CIVIC = [
  { id: 'school', name: '邊境私立學府', mark: '🏫', role: 'teacher', roleName: '教師', leader: 'headmaster', leaderName: '校長', service: '開課', base: 40 },
  { id: 'library', name: '中央大陸圖書館', mark: '📚', role: 'librarian', roleName: '館員', leader: 'director', leaderName: '館長', service: '閱讀課程', base: 30 },
  { id: 'hospital', name: '旅人醫院', mark: '🏥', role: 'healer', roleName: '治療師', leader: 'director', leaderName: '院長', service: '診療', base: 48 },
  { id: 'artmuseum', name: '魔法美術館', mark: '🎨', role: 'curator', roleName: '策展員', leader: 'director', leaderName: '館長', service: '展覽', base: 34 },
  { id: 'museum', name: '大陸博物館', mark: '🏛️', role: 'curator', roleName: '研究員', leader: 'director', leaderName: '館長', service: '導覽', base: 36 }
];
export const ISEKAI_SCHOOL_SUBJECTS = ['英語單字', '魔法基礎', '大陸地理', '農業實作', '異獸照護', '歷史文學', '藝術工藝', '體育防身'];
export const ISEKAI_SCHOOL_DAYS = ['月', '火', '水', '木', '金'];
export function isekaiCivicMarket(now, civicId, role) {
  const names = ['艾蓮', '洛恩', '希菈', '柏倫', '露瑟', '米亞', '琪琳', '諾亞', '亞瑟', '芙蘿', '雷蒙', '梅菈'];
  const races = ['human','elf','dwarf','beast','demon'];
  const professions = role === 'leader' ? ['scholar','knight','merchant','mage']
    : civicId === 'hospital' ? ['veterinarian','herbalist','mage','scholar']
      : civicId === 'school' ? ['scholar','mage','gardener','artisan']
        : ['scholar','artisan','herbalist','cartographer'];
  const rotation = Math.floor(now / ISEKAI_WORLD_CYCLE_MS) % names.length;
  return Array.from({ length: 4 }, (_, index) => {
    const number = (rotation + index * 3 + (role === 'leader' ? 0 : 1)) % names.length;
    return { id: `${civicId}-${role}-${rotation}-${number}`, name: names[number], raceId: races[number % races.length],
      professionId: professions[index], role, skill: 1 + (number % 3) };
  });
}
export const ISEKAI_CIVIC_UPGRADES = {
  school: [['libraryWing', '校園圖書室', 140], ['laboratory', '魔法實驗室', 180], ['playground', '訓練操場', 120]],
  library: [['readingHall', '大型閱覽廳', 130], ['archive', '古籍庫房', 170]],
  hospital: [['ward', '診療病房', 180], ['herbalPharmacy', '藥草藥房', 150]],
  artmuseum: [['studio', '創作工坊', 140], ['exhibition', '特展室', 170]],
  museum: [['archive', '考古庫房', 160], ['educationHall', '教育展廳', 130]]
};
const defaultSchedule = () => Array.from({ length: 5 }, (_, day) => Array.from({ length: 6 }, (_, period) => ISEKAI_SCHOOL_SUBJECTS[(day * 3 + period) % ISEKAI_SCHOOL_SUBJECTS.length]));
export const ISEKAI_SPECIALISTS = [
  { id: 'accountant', name: '公會會計師', mark: '📒', cost: 160, wage: 8, effect: '整理財務並提高商店營收 10%' },
  { id: 'legal', name: '契約法律顧問', mark: '⚖️', cost: 160, wage: 8, effect: '借款到期寬限一小時' },
  { id: 'veterinarian', name: '異獸醫師', mark: '🩺', cost: 140, wage: 7, effect: '每次收取動物產物 +1' }
];
const venueIds = new Set(ISEKAI_BUILDINGS.filter(item => ['venue','trade'].includes(item.category)).map(item => item.id));
const civicById = id => ISEKAI_CIVIC.find(item => item.id === id);
const specialistById = id => ISEKAI_SPECIALISTS.find(item => item.id === id);
const key = (areaId, plotIndex) => `${areaId}:${plotIndex}`;
const slot = now => Math.floor(now / ISEKAI_WORLD_CYCLE_MS);
const count = value => Math.max(0, Math.floor(Number(value) || 0));
const history = (entries, entry) => [entry, ...entries].slice(0, 50);
const allPlots = farm => Object.entries(farm.plots || {}).flatMap(([areaId, plots]) => plots.map((plot, plotIndex) => ({ areaId, plotIndex, plot })));
export const isekaiFacilityCount = (farm, facilityId) => allPlots(farm).filter(item => item.plot?.facility === facilityId).length;
export const isekaiRoofSites = farm => allPlots(farm).filter(item => item.plot?.facility && item.plot.facility !== 'manaarray');

export function normalizeIsekaiExpansion(farm, now = Date.now()) {
  const raw = farm.expansion || {};
  return { ...farm, expansion: {
    processed: Object.fromEntries(ISEKAI_RECIPES.map(item => [item.id, count(raw.processed?.[item.id])])),
    research: Object.fromEntries(ISEKAI_CROPS.map(item => [item.id, Math.min(3, count(raw.research?.[item.id]))])),
    venues: raw.venues && typeof raw.venues === 'object' ? raw.venues : {},
    roofs: Array.isArray(raw.roofs) ? raw.roofs.filter(item => typeof item === 'string').slice(0, 72) : [],
    civic: raw.civic && typeof raw.civic === 'object' ? raw.civic : {},
    specialists: Array.isArray(raw.specialists) ? raw.specialists.filter(id => specialistById(id)) : [],
    loan: raw.loan && Number(raw.loan.amount) > 0 ? raw.loan : null,
    loanCollateral: typeof raw.loanCollateral === 'string' ? raw.loanCollateral : '',
    lastWorldSlot: Number.isInteger(raw.lastWorldSlot) ? raw.lastWorldSlot : slot(now),
    worldHistory: Array.isArray(raw.worldHistory) ? raw.worldHistory.slice(0, 20) : [],
    accounts: Array.isArray(raw.accounts) ? raw.accounts.slice(0, 50) : [],
    utilityDebt: count(raw.utilityDebt),
    disasterShield: !!raw.disasterShield
  } };
}

export function expansionActionError(farm, action, now = Date.now()) {
  if (!farm.profile) return '請先建立角色。';
  const exp = normalizeIsekaiExpansion(farm, now).expansion;
  const plot = farm.plots?.[action.areaId || farm.selectedArea]?.[action.plotIndex];
  const recipe = ISEKAI_RECIPES.find(item => item.id === action.recipeId);
  const product = recipe && exp.processed[recipe.id];
  const site = key(action.areaId || farm.selectedArea, action.plotIndex);
  const civic = civicById(action.civicId);
  const institution = exp.civic?.[action.civicId];
  if (action.type === 'process') {
    if (!hasIsekaiBuilding(farm, 'alchemy')) return '先在一格農莊田位建造魔藥加工坊。';
    if (!recipe) return '請選擇加工品。';
    const source = recipe.animal ? farm.animalGoods : farm.produce;
    return (source?.[recipe.sourceId] || 0) >= recipe.sourceCount ? '' : `需要 ${recipe.sourceCount} 份${(animalById(recipe.sourceId)?.product || cropById(recipe.sourceId)?.name)}。`;
  }
  if (action.type === 'sellProcessed') return product > 0 ? '' : '沒有可出售的加工品。';
  if (action.type === 'operateVenue') {
    const venue = buildingById(plot?.facility);
    if (!venue || !venueIds.has(venue.id)) return '請先選擇商店或觀光設施。';
    if (venue.requiredAnimalId && !allPlots(farm).some(item => item.plot?.animalId === venue.requiredAnimalId))
      return `此設施需先飼育${animalById(venue.requiredAnimalId)?.name}。`;
    return Number(exp.venues[site]) + ISEKAI_WORLD_CYCLE_MS > now ? '這個設施每三小時可營業一次。' : '';
  }
  if (action.type === 'solarRoof') return !plot?.facility || plot.facility === 'manaarray' ? '選擇已有建築的屋頂。'
    : exp.roofs.includes(site) ? '此屋頂已有魔晶板。' : farm.coins < (exp.roofs.length < 3 ? 90 : 160) ? '魔晶板費用不足。' : '';
  if (action.type === 'researchCrop') {
    const crop = cropById(action.cropId);
    if (!crop) return '請選擇作物。';
    if (!hasIsekaiBuilding(farm, 'research')) return '請先建造魔法農業研發塔。';
    const level = exp.research[crop.id] || 0;
    return level >= 3 ? '已達最高等級。' : farm.coins < 180 + level * 200 ? `研發需 ${180 + level * 200} 金幣。` : '';
  }
  if (action.type === 'hireSpecialist') {
    const person = specialistById(action.specialistId);
    return !person ? '找不到專家。' : exp.specialists.includes(person.id) ? '已經聘用。'
      : farm.coins < person.cost ? `聘用需要 ${person.cost} 金幣。` : '';
  }
  if (action.type === 'dismissSpecialist') return exp.specialists.includes(action.specialistId) ? '' : '尚未聘用。';
  if (action.type === 'borrowGuild') return exp.loan ? '請先還清目前的借款。' : farm.coins >= 50 ? '資金低於 50 金幣才可申請公會零息急難借款。' : '';
  if (action.type === 'repayGuild') return !exp.loan ? '目前沒有借款。' : farm.coins < exp.loan.amount ? `需要 ${exp.loan.amount} 金幣才能還款。` : '';
  if (action.type === 'insure') return exp.disasterShield ? '已有防災結界。' : farm.coins < 90 ? '防災結界需要 90 金幣。' : '';
  if (action.type === 'payUtility') return exp.utilityDebt <= 0 ? '目前沒有未繳水電費。' : farm.coins < exp.utilityDebt ? '金幣不足以繳清。' : '';
  if (action.type === 'foundCivic') {
    if (!civic) return '請選擇機構。';
    if (!hasIsekaiBuilding(farm, civic.id)) return `請先在自己的田位建造${civic.name}。`;
    if (institution) return '此機構已成立。';
    if (String(action.name || '').trim().length < 2 || String(action.name || '').trim().length > 24) return '名稱需 2–24 字。';
    return farm.coins < 300 ? '創辦基金至少 300 金幣。' : '';
  }
  if (action.type === 'donateCivic') {
    const amount = Number(action.amount);
    return !institution ? '先成立機構。' : !Number.isInteger(amount) || amount < 50 || amount > 10000 ? '每次可捐贈 50–10000 金幣。'
      : farm.coins < amount ? '金幣不足。' : '';
  }
  if (action.type === 'hireCivic') {
    if (!institution || !civic) return '先成立機構。';
    if (!['leader','worker'].includes(action.role)) return '請選擇職位。';
    if ((institution.staff?.[action.role] || 0) >= (action.role === 'leader' ? 1 : 12)) return '此職位已達上限。';
    if (!isekaiCivicMarket(now, civic.id, action.role).some(item => item.id === action.candidateId)) return '候選人已輪換，請重新選擇。';
    if (institution.personnel?.some(item => item.id === action.candidateId)) return '此人已受聘。';
    return institution.fund < 60 ? '機構基金不足以聘用人員。' : '';
  }
  if (action.type === 'configureCivic') {
    const classes = Number(action.classes), admissions = Number(action.admissions);
    return !institution ? '先成立機構。' : !Number.isInteger(classes) || classes < 1 || classes > 12
      || !Number.isInteger(admissions) || admissions < 10 || admissions > classes * 40 ? '班級 1–12 班；招生 10 人起且每班最多 40 人。' : '';
  }
  if (action.type === 'setSchedule') return !institution || civic?.id !== 'school' ? '先成立學府。'
    : !Number.isInteger(action.classIndex) || action.classIndex < 0 || action.classIndex >= institution.classes
      || !Number.isInteger(action.day) || action.day < 0 || action.day > 4 || !Number.isInteger(action.period) || action.period < 0 || action.period > 5
      || !ISEKAI_SCHOOL_SUBJECTS.includes(action.subject) ? '課表設定無效。' : '';
  if (action.type === 'civicUpgrade') {
    const upgrade = ISEKAI_CIVIC_UPGRADES[civic?.id]?.find(item => item[0] === action.upgradeId);
    return !institution || !upgrade ? '先成立機構並選擇設施。' : institution.upgrades?.includes(upgrade[0]) ? '此設施已建成。'
      : institution.fund < upgrade[2] ? `基金至少需要 ${upgrade[2]} 金幣。` : '';
  }
  if (action.type === 'operateCivic') return !institution || !civic ? '先成立機構。'
    : !hasIsekaiBuilding(farm, civic.id) ? '機構建築已不存在。'
    : !institution.staff?.leader || !institution.staff?.worker ? '需聘用主管及至少一名專業人員。'
      : institution.lastAt + ISEKAI_WORLD_CYCLE_MS > now ? '每三小時才能營運一次。'
        : institution.fund < 15 + institution.staff.worker * 8 ? '機構基金不足以支付營運費。' : '';
  if (action.type === 'closeCivic') return institution ? '' : '此機構尚未成立。';
  return '未知的城鎮操作。';
}

export function applyExpansionAction(source, action, now = Date.now()) {
  const farm = normalizeIsekaiExpansion(source, now);
  const error = expansionActionError(farm, action, now);
  if (error) throw new Error(error);
  const exp = farm.expansion;
  const areaId = action.areaId || farm.selectedArea;
  const plot = farm.plots?.[areaId]?.[action.plotIndex];
  const site = key(areaId, action.plotIndex);
  const civic = civicById(action.civicId);
  let detail = '';
  const before = farm.coins;
  if (action.type === 'process') {
    const recipe = ISEKAI_RECIPES.find(item => item.id === action.recipeId);
    (recipe.animal ? farm.animalGoods : farm.produce)[recipe.sourceId] -= recipe.sourceCount;
    exp.processed[recipe.id] += 1;
    detail = `製成 ${recipe.name} 1 份`;
  } else if (action.type === 'sellProcessed') {
    const recipe = ISEKAI_RECIPES.find(item => item.id === action.recipeId);
    const quantity = exp.processed[recipe.id];
    const rate = hasIsekaiBuilding(farm, 'bazaar') ? 1.3 : 1;
    const income = Math.round(quantity * recipe.sale * rate);
    farm.coins += income; exp.processed[recipe.id] = 0;
    detail = `在${hasIsekaiBuilding(farm, 'bazaar') ? '多族市集' : '旅行商棚'}販賣 ${recipe.name} ${quantity} 份，收入 ${income}`;
  } else if (action.type === 'operateVenue') {
    const building = buildingById(plot.facility);
    const climate = isekaiClimate(now, farm.selectedRegion);
    const weekend = [0,6].includes(new Date(now).getDay());
    const weatherRate = climate.weather === '晴朗' ? 1.25 : climate.weather === '小雨' ? .75 : 1;
    const localRace = { west: 'human', north: 'elf', south: 'demon' }[farm.selectedRegion] || 'human';
    const tradeStaff = (farm.staff || []).filter(item => item.focus === 'trade');
    const staffRate = tradeStaff.length ? 1.1 : 1;
    const languageRate = farm.profile.raceId === localRace || tradeStaff.some(item => item.raceId === localRace) ? 1.1 : .92;
    const accountRate = exp.specialists.includes('accountant') ? 1.1 : 1;
    const income = Math.round((18 + building.cost / 12) * (weekend ? 1.35 : 1) * weatherRate * staffRate * languageRate * accountRate);
    const utility = 5;
    farm.coins += Math.max(0, income - utility);
    exp.venues[site] = now;
    detail = `${building.name}營業，收入 ${income}、水電 ${utility}，實收 ${income - utility}`;
  } else if (action.type === 'solarRoof') {
    const cost = exp.roofs.length < 3 ? 90 : 160;
    farm.coins -= cost; exp.roofs.push(site);
    detail = `在${buildingById(plot.facility).name}屋頂設置魔晶板，花費 ${cost}`;
  } else if (action.type === 'researchCrop') {
    const level = exp.research[action.cropId] || 0;
    farm.coins -= 180 + level * 200; exp.research[action.cropId] = level + 1;
    detail = `${cropById(action.cropId).name}研發至 ${level + 1} 級：生長更快、收成更多`;
  } else if (action.type === 'hireSpecialist') {
    const person = specialistById(action.specialistId);
    farm.coins -= person.cost; exp.specialists.push(person.id);
    detail = `聘用${person.name}`;
  } else if (action.type === 'dismissSpecialist') {
    exp.specialists = exp.specialists.filter(id => id !== action.specialistId);
    detail = `結束${specialistById(action.specialistId).name}合約`;
  } else if (action.type === 'borrowGuild') {
    farm.coins += 200; exp.loan = { amount: 200, borrowedAt: now, dueAt: now + 6 * 3600000 };
    detail = '取得公會零息急難借款 200 金幣；六小時後應還清';
  } else if (action.type === 'repayGuild') {
    farm.coins -= exp.loan.amount; exp.loan = null;
    detail = '公會借款已還清';
  } else if (action.type === 'insure') {
    farm.coins -= 90; exp.disasterShield = true;
    detail = '設置一次性防災結界';
  } else if (action.type === 'payUtility') {
    farm.coins -= exp.utilityDebt; detail = `繳清水電費 ${exp.utilityDebt} 金幣`; exp.utilityDebt = 0;
  } else if (action.type === 'foundCivic') {
    farm.coins -= 300;
    exp.civic[civic.id] = { name: String(action.name).trim(), fund: 300, classes: 1, admissions: 20,
      staff: { leader: 0, worker: 0 }, personnel: [], students: 0, schedules: [defaultSchedule()], upgrades: [], lastAt: now - ISEKAI_WORLD_CYCLE_MS, history: [] };
    detail = `在自有土地成立${exp.civic[civic.id].name}；創辦捐款 300 金幣進入專用基金`;
  } else if (action.type === 'donateCivic') {
    farm.coins -= Number(action.amount); exp.civic[civic.id].fund += Number(action.amount);
    detail = `捐贈 ${action.amount} 金幣至${exp.civic[civic.id].name}`;
  } else if (action.type === 'hireCivic') {
    const institution = exp.civic[civic.id];
    const candidate = isekaiCivicMarket(now, civic.id, action.role).find(item => item.id === action.candidateId);
    institution.fund -= 60; institution.staff[action.role] += 1;
    institution.personnel = [...(institution.personnel || []), { ...candidate, hiredAt: now,
      classIndex: action.role === 'worker' && civic.id === 'school' ? (institution.staff.worker - 1) % institution.classes : null }];
    detail = `${institution.name}聘用${candidate.name}擔任${action.role === 'leader' ? civic.leaderName : civic.roleName}，基金支出 60`;
  } else if (action.type === 'configureCivic') {
    const institution = exp.civic[civic.id];
    institution.classes = Number(action.classes); institution.admissions = Number(action.admissions);
    if (civic.id === 'school') institution.schedules = Array.from({ length: institution.classes }, (_, index) => institution.schedules?.[index] || defaultSchedule());
    detail = `${institution.name}設定 ${institution.classes} 班／目標 ${institution.admissions} 人`;
  } else if (action.type === 'setSchedule') {
    const institution = exp.civic.school;
    institution.schedules = Array.from({ length: institution.classes }, (_, index) => institution.schedules?.[index] || defaultSchedule());
    institution.schedules[action.classIndex][action.day][action.period] = action.subject;
    detail = `${institution.name}第 ${action.classIndex + 1} 班更新星期${ISEKAI_SCHOOL_DAYS[action.day]}第 ${action.period + 1} 節：${action.subject}`;
  } else if (action.type === 'civicUpgrade') {
    const institution = exp.civic[civic.id];
    const upgrade = ISEKAI_CIVIC_UPGRADES[civic.id].find(item => item[0] === action.upgradeId);
    institution.fund -= upgrade[2]; institution.upgrades = [...(institution.upgrades || []), upgrade[0]];
    detail = `${institution.name}建成${upgrade[1]}，基金支出 ${upgrade[2]}`;
  } else if (action.type === 'operateCivic') {
    const institution = exp.civic[civic.id];
    const expense = 15 + institution.staff.worker * 8;
    const capacity = civic.id === 'school' ? Math.min(institution.admissions, institution.classes * 40, institution.staff.worker * 30) : institution.staff.worker * 25;
    const curriculum = civic.id === 'school' ? (institution.schedules || [defaultSchedule()]).slice(0, institution.classes)
      .reduce((total, schedule) => total + new Set(schedule.flat()).size * 2, 0) : 0;
    const income = civic.base + Math.round(capacity * (civic.id === 'hospital' ? 2 : 1.5)) + (institution.upgrades?.length || 0) * 12 + curriculum;
    institution.fund += income - expense;
    institution.students = capacity;
    institution.lastAt = now;
    institution.history = history(institution.history || [], { at: now, detail: `${civic.service} ${capacity} 人；收入 ${income}、支出 ${expense}、結餘 ${income - expense}` }).slice(0, 15);
    detail = `${institution.name}${civic.service} ${capacity} 人；結餘 ${income - expense} 留在專用基金`;
  } else if (action.type === 'closeCivic') {
    const institution = exp.civic[civic.id];
    detail = `${institution.name}停止營運；剩餘專用基金 ${institution.fund} 金幣移交公共用途，未返還農莊`;
    delete exp.civic[civic.id];
  }
  exp.accounts = history(exp.accounts, { at: now, category: action.type, income: Math.max(0, farm.coins - before), expense: Math.max(0, before - farm.coins), detail });
  farm.journal.unshift({ at: now, text: detail }); farm.journal = farm.journal.slice(0, 12);
  return { farm, detail };
}

export function advanceIsekaiWorld(source, now = Date.now()) {
  const farm = normalizeIsekaiExpansion(source, now);
  const exp = farm.expansion;
  const elapsed = Math.min(8, Math.max(0, slot(now) - exp.lastWorldSlot));
  if (!elapsed) return { farm, changed: false, details: [] };
  const details = [];
  for (let index = 0; index < elapsed; index++) {
    const beforeCoins = farm.coins;
    const currentSlot = exp.lastWorldSlot + index + 1;
    const climate = isekaiClimate(currentSlot * ISEKAI_WORLD_CYCLE_MS, farm.selectedRegion);
    const sites = allPlots(farm);
    const buildingCount = sites.filter(item => item.plot?.facility).length;
    const cropCount = sites.filter(item => item.plot?.cropId).length;
    const animalCount = sites.filter(item => item.plot?.animalId).length;
    const solar = isekaiFacilityCount(farm, 'manaarray') + exp.roofs.filter(site => {
      const [areaId, plotIndex] = site.split(':'); return !!farm.plots?.[areaId]?.[Number(plotIndex)]?.facility;
    }).length;
    const generation = solar * (climate.weather === '晴朗' ? 22 : climate.weather === '小雨' ? 7 : 13);
    const waterSaving = isekaiFacilityCount(farm, 'reservoir') * 5;
    const utility = Math.max(0, buildingCount * 3 + cropCount + animalCount * 2 - waterSaving);
    const net = generation - utility;
    if (net >= 0) farm.coins += net;
    else { const paid = Math.min(farm.coins, -net); farm.coins -= paid; exp.utilityDebt += -net - paid; }
    if (solar || utility) details.push(`魔晶與水費淨額 ${net >= 0 ? '+' : ''}${net}`);
    const wages = exp.specialists.reduce((total, id) => total + (specialistById(id)?.wage || 0), 0);
    if (wages) { const paid = Math.min(farm.coins, wages); farm.coins -= paid; exp.utilityDebt += wages - paid; details.push(`高階人員薪資 ${wages}`); }
    if (currentSlot % 3 === 0) {
      const seasonEvent = {
        spring: ['春霖', '河水上漲，修繕排水', -24], summer: ['魔力風暴', '魔晶設施需要檢修', -32],
        autumn: ['豐收市集', '旅人增加，獲得額外收益', 35], winter: ['霜獸足跡', '保護畜舍與作物', -28]
      }[climate.season];
      const [name, story, amount] = seasonEvent;
      if (amount < 0 && exp.disasterShield) { exp.disasterShield = false; details.push(`${name}：防災結界擋下損失`); }
      else { farm.coins = Math.max(0, farm.coins + amount); details.push(`${name}：${story}（${amount > 0 ? '+' : ''}${amount}）`); }
    }
    for (const [id, institution] of Object.entries(exp.civic)) {
      const civic = civicById(id);
      if (!civic || !hasIsekaiBuilding(farm, id) || !institution.staff?.leader || !institution.staff?.worker) continue;
      if (Number(institution.lastAt || 0) + ISEKAI_WORLD_CYCLE_MS > currentSlot * ISEKAI_WORLD_CYCLE_MS) continue;
      const expense = 15 + institution.staff.worker * 8;
      if (institution.fund < expense) continue;
      const capacity = id === 'school' ? Math.min(institution.admissions, institution.classes * 40, institution.staff.worker * 30) : institution.staff.worker * 25;
      const curriculum = id === 'school' ? (institution.schedules || [defaultSchedule()]).slice(0, institution.classes)
        .reduce((total, schedule) => total + new Set(schedule.flat()).size * 2, 0) : 0;
      const income = civic.base + Math.round(capacity * (id === 'hospital' ? 2 : 1.5)) + (institution.upgrades?.length || 0) * 12 + curriculum;
      institution.fund += income - expense;
      institution.students = capacity;
      institution.lastAt = currentSlot * ISEKAI_WORLD_CYCLE_MS;
      const detail = `${institution.name}自動${civic.service} ${capacity} 人，基金結餘 +${income - expense}`;
      institution.history = history(institution.history || [], { at: institution.lastAt, detail }).slice(0, 15);
      details.push(detail);
    }
    if (farm.coins !== beforeCoins) exp.accounts = history(exp.accounts, { at: currentSlot * ISEKAI_WORLD_CYCLE_MS,
      category: 'world', income: Math.max(0, farm.coins - beforeCoins), expense: Math.max(0, beforeCoins - farm.coins),
      detail: `三小時結算：${details.slice(-3).join('；')}` });
  }
  exp.lastWorldSlot = slot(now);
  if (exp.loan && now >= exp.loan.dueAt + (exp.specialists.includes('legal') ? 3600000 : 0)) {
    const paid = Math.min(farm.coins, exp.loan.amount);
    farm.coins -= paid; exp.loan.amount -= paid;
    if (!exp.loan.amount) { exp.loan = null; details.push('公會借款自動還清'); }
    else details.push(`借款到期，已先償還 ${paid}，尚欠 ${exp.loan.amount}`);
  }
  exp.worldHistory = history(exp.worldHistory, { at: now, details });
  if (details.length) { farm.journal.unshift({ at: now, text: details.join('；') }); farm.journal = farm.journal.slice(0, 12); }
  return { farm, changed: true, details };
}
