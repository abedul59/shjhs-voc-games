export const ISEKAI_GAME_TYPE = '單字異世界悠閒農莊';
export const ISEKAI_REINCARNATION_COST = 800;

export const ISEKAI_REGIONS = [
  { id: 'west', name: '中央大陸西部', subtitle: '阿斯拉王國・肥沃平原', x: 260, y: 390, cost: 0, viewBox: '35 245 490 365', description: '河流與麥田交錯的開拓起點。' },
  { id: 'north', name: '中央大陸北部', subtitle: '拉諾亞・北方大地', x: 430, y: 150, cost: 240, viewBox: '20 65 740 290', description: '寒冷且土地貧瘠，適合耐寒作物。' },
  { id: 'south', name: '中央大陸南部', subtitle: '王龍王國・暖風谷地', x: 565, y: 665, cost: 420, viewBox: '330 455 470 425', description: '沿著山脈延伸的溫暖農業帶。' }
];

// 大陸與地名參考原作地理；具體農莊領地、價格與位置是本遊戲設計。
export const ISEKAI_AREAS = [
  { id: 'fittoa', region: 'west', name: '菲托亞麥鄉', x: 178, y: 322, cost: 0, description: '阿斯拉小麥與巴提魯斯花的故鄉。' },
  { id: 'asura', region: 'west', name: '阿斯拉沃野', x: 215, y: 424, cost: 105, description: '肥沃而平坦的王國農地。' },
  { id: 'riverland', region: 'west', name: '西部河谷', x: 238, y: 513, cost: 145, description: '灌溉便利的河岸領地。' },
  { id: 'foothills', region: 'west', name: '赤龍山麓', x: 419, y: 456, cost: 180, description: '靠近山脈通道的丘陵。' },
  { id: 'ranoa', region: 'north', name: '拉諾亞雪原', x: 419, y: 170, cost: 0, description: '北方大地的寒冷耕區。' },
  { id: 'basherant', region: 'north', name: '巴謝蘭特林地', x: 288, y: 208, cost: 155, description: '林地邊緣的採集農莊。' },
  { id: 'northern-ridge', region: 'north', name: '北方山脊', x: 537, y: 204, cost: 195, description: '霜雪與石壁之間的小谷地。' },
  { id: 'east-wood', region: 'north', name: '北東森林', x: 655, y: 232, cost: 230, description: '東端森林裡的新開拓地。' },
  { id: 'kingdragon', region: 'south', name: '王龍河谷', x: 464, y: 632, cost: 0, description: '沿赤龍山脈向南的河谷。' },
  { id: 'shirone', region: 'south', name: '西隆邊境', x: 566, y: 697, cost: 190, description: '南方諸國交界的農地。' },
  { id: 'sanakia', region: 'south', name: '薩納基亞稻田', x: 645, y: 778, cost: 235, description: '溫暖潮濕的稻作領地。' },
  { id: 'kikka', region: 'south', name: '基卡油籽園', x: 724, y: 830, cost: 270, description: '南端適合油籽作物的開闊地。' }
];

export const ISEKAI_GENDERS = [
  { id: 'female', name: '女', mark: '♀' }, { id: 'male', name: '男', mark: '♂' }, { id: 'other', name: '其他／不透露', mark: '◇' }
];
export const ISEKAI_RACES = [
  { id: 'human', name: '人族', mark: '✦', skill: '起步資金 +30', bonusCoins: 30 },
  { id: 'elf', name: '長耳族', mark: '❧', skill: '作物生長時間 -15%', growthMultiplier: .85 },
  { id: 'dwarf', name: '炭礦族', mark: '◆', skill: '種苗價格 -15%', seedMultiplier: .85 },
  { id: 'beast', name: '獸族', mark: '♧', skill: '每次收成 +1 份', extraYield: 1 },
  { id: 'demon', name: '魔族', mark: '◈', skill: '作物售價 +12%', saleMultiplier: 1.12 }
];
export const ISEKAI_PROFESSIONS = [
  { id: 'mage', name: '魔術師', mark: '🔮', skill: '澆水後額外縮短 30 秒', waterBonusMs: 30000, story: '以水魔術照顧田地，農莊是課餘生活。' },
  { id: 'merchant', name: '行商', mark: '🧳', skill: '作物售價 +15%', saleMultiplier: 1.15, story: '往返城鎮交易，順便經營自己的農地。' },
  { id: 'herbalist', name: '藥草師', mark: '🧪', skill: '藥草與花卉收成 +1 份', herbalYield: 1, story: '研究植物，農莊是自己的實驗園。' },
  { id: 'ranger', name: '冒險者', mark: '🏹', skill: '新領地開拓費 -15%', landMultiplier: .85, story: '接公會委託時，也尋找新的沃土。' },
  { id: 'artisan', name: '工匠', mark: '⚒️', skill: '種苗價格 -15%', seedMultiplier: .85, story: '製作農具維生，休息時開墾田地。' },
  { id: 'scholar', name: '魔法學者', mark: '📜', skill: '所有作物生長時間 -10%', growthMultiplier: .9, story: '記錄土地與魔力的變化，農莊是研究地。' },
  { id: 'gardener', name: '園藝師', mark: '🪴', skill: '所有作物收成 +1 份', extraCropYield: 1, story: '以園藝為本業，善於提高田地收成。' },
  { id: 'tamer', name: '馴獸師', mark: '🪢', skill: '購入生物費用 -20%', animalCostMultiplier: .8, story: '與溫馴生物建立信任，再經營畜舍。' },
  { id: 'veterinarian', name: '獸醫師', mark: '🩺', skill: '照顧生物費用 -25%', feedMultiplier: .75, story: '治療動物是本業，農場是第二個家。' },
  { id: 'builder', name: '建築師', mark: '🛠️', skill: '建築費用 -20%', buildingMultiplier: .8, story: '利用建築手藝，讓每塊土地更有用途。' },
  { id: 'cartographer', name: '繪圖師', mark: '🗺️', skill: '領地開拓費 -20%', landMultiplier: .8, story: '繪製山谷和道路，尋找可耕的角落。' },
  { id: 'stargazer', name: '占星師', mark: '🌟', skill: '當季作物收成再 +1 份', seasonExtraYield: 1, story: '觀星決定播種時刻，農莊是觀測所。' },
  { id: 'chef', name: '料理人', mark: '🍲', skill: '動物產物售價 +20%', animalSaleMultiplier: 1.2, story: '把農莊的產物帶去城鎮廚房。' },
  { id: 'beekeeper', name: '養蜂人', mark: '🐝', skill: '蜂與蝶產物每次 +2 份', insectYield: 2, story: '照護授粉生物，兼顧農田與花園。' },
  { id: 'fisher', name: '漁師', mark: '🎣', skill: '水生生物產物每次 +2 份', aquaticYield: 2, story: '沿河捕撈與養殖，順路打理田地。' },
  { id: 'knight', name: '騎士', mark: '🛡️', skill: '大區域開拓費 -20%', regionMultiplier: .8, story: '護送商隊越過山道，在各地建立農莊。' }
];

export const ISEKAI_CROPS = [
  { id: 'wheat', name: '阿斯拉小麥', english: 'wheat', region: 'west', seasons: ['spring', 'summer'], seed: 8, sale: 14, yield: 3, growthMs: 2 * 60000, symbol: '🌾', color: '#d8b96e' },
  { id: 'flower', name: '巴提魯斯花', english: 'flower', region: 'west', seasons: ['spring', 'autumn'], seed: 15, sale: 26, yield: 2, growthMs: 3 * 60000, symbol: '🌺', color: '#e8aab9' },
  { id: 'moonpumpkin', name: '月光南瓜', english: 'pumpkin', region: 'west', seasons: ['autumn'], seed: 18, sale: 29, yield: 3, growthMs: 3 * 60000, symbol: '🎃', color: '#d79a58' },
  { id: 'mistberry', name: '蜜霞草莓', english: 'strawberry', region: 'west', seasons: ['spring'], seed: 22, sale: 34, yield: 3, growthMs: 4 * 60000, symbol: '🍓', color: '#d47375' },
  { id: 'dragoncarrot', name: '紅龍胡蘿蔔', english: 'carrot', region: 'west', seasons: ['spring', 'winter'], seed: 23, sale: 36, yield: 3, growthMs: 4 * 60000, symbol: '🥕', color: '#d99758' },
  { id: 'crystalgrape', name: '水晶葡萄', english: 'grape', region: 'west', seasons: ['summer', 'autumn'], seed: 34, sale: 49, yield: 3, growthMs: 5 * 60000, symbol: '🍇', color: '#a68ac4' },
  { id: 'dewbuckwheat', name: '香露蕎麥', english: 'buckwheat', region: 'west', seasons: ['autumn'], seed: 17, sale: 27, yield: 4, growthMs: 4 * 60000, symbol: '🌿', color: '#a6b17b' },
  { id: 'herb', name: '北境藥草', english: 'herb', region: 'north', seasons: ['spring', 'summer'], seed: 24, sale: 42, yield: 2, growthMs: 4 * 60000, symbol: '🌿', color: '#9dbdb0' },
  { id: 'berry', name: '雪原漿果', english: 'berry', region: 'north', seasons: ['summer', 'autumn'], seed: 28, sale: 36, yield: 3, growthMs: 5 * 60000, symbol: '🫐', color: '#aa8bb8' },
  { id: 'frostpotato', name: '霜銀馬鈴薯', english: 'potato', region: 'north', seasons: ['winter', 'spring'], seed: 25, sale: 34, yield: 4, growthMs: 4 * 60000, symbol: '🥔', color: '#b8aa8b' },
  { id: 'bluemushroom', name: '藍焰蘑菇', english: 'mushroom', region: 'north', seasons: ['autumn', 'winter'], seed: 35, sale: 53, yield: 2, growthMs: 5 * 60000, symbol: '🍄', color: '#8aa4cb' },
  { id: 'starmint', name: '星露薄荷', english: 'mint', region: 'north', seasons: ['spring', 'summer'], seed: 21, sale: 33, yield: 3, growthMs: 3 * 60000, symbol: '🍃', color: '#a1c9aa' },
  { id: 'snowapple', name: '雪蜜蘋果', english: 'apple', region: 'north', seasons: ['autumn'], seed: 38, sale: 58, yield: 3, growthMs: 6 * 60000, symbol: '🍎', color: '#d6a5a3' },
  { id: 'wintercabbage', name: '凜冬卷心菜', english: 'cabbage', region: 'north', seasons: ['winter'], seed: 24, sale: 37, yield: 3, growthMs: 4 * 60000, symbol: '🥬', color: '#acd0aa' },
  { id: 'rice', name: '薩納基亞稻米', english: 'rice', region: 'south', seasons: ['summer', 'autumn'], seed: 30, sale: 39, yield: 3, growthMs: 4 * 60000, symbol: '🌾', color: '#aeca7b' },
  { id: 'oilseed', name: '基卡油籽', english: 'seed', region: 'south', seasons: ['spring', 'autumn'], seed: 38, sale: 55, yield: 2, growthMs: 6 * 60000, symbol: '🌻', color: '#e5af70' },
  { id: 'dragonpepper', name: '龍息辣椒', english: 'pepper', region: 'south', seasons: ['summer'], seed: 28, sale: 45, yield: 3, growthMs: 4 * 60000, symbol: '🌶️', color: '#cf8271' },
  { id: 'ambercorn', name: '琥珀玉米', english: 'corn', region: 'south', seasons: ['summer', 'autumn'], seed: 29, sale: 43, yield: 4, growthMs: 5 * 60000, symbol: '🌽', color: '#d6b778' },
  { id: 'glowcane', name: '碧光甘蔗', english: 'sugarcane', region: 'south', seasons: ['summer'], seed: 32, sale: 48, yield: 3, growthMs: 5 * 60000, symbol: '🎋', color: '#9abf8a' },
  { id: 'sandtomato', name: '赤砂番茄', english: 'tomato', region: 'south', seasons: ['spring', 'summer'], seed: 25, sale: 38, yield: 4, growthMs: 4 * 60000, symbol: '🍅', color: '#d38e70' },
  { id: 'goldentea', name: '金羽茶葉', english: 'tea', region: 'south', seasons: ['spring', 'autumn'], seed: 42, sale: 63, yield: 2, growthMs: 6 * 60000, symbol: '🍃', color: '#bcc986' }
];

export const ISEKAI_BUILDINGS = [
  { id: 'well', name: '魔力水井', mark: '⛲', cost: 75, description: '同領地作物生長時間 -10%。' },
  { id: 'stable', name: '百獸飼育舍', mark: '🏡', cost: 90, description: '附水槽與飼養欄，可養一種生物。' },
  { id: 'market', name: '旅行商棚', mark: '🏪', cost: 115, description: '全農莊作物與生物產物售價 +10%。' },
  { id: 'granary', name: '石砌穀倉', mark: '🏚️', cost: 125, description: '全農莊每次收成 +1。' },
  { id: 'greenhouse', name: '魔晶溫室', mark: '🏕️', cost: 165, description: '全農莊作物生長加快 15%。' },
  { id: 'aqueduct', name: '古代水渠', mark: '🌊', cost: 140, description: '澆水催生再加快 20 秒。' },
  { id: 'apiary', name: '授粉花園', mark: '🌼', cost: 120, description: '昆蟲產物每次 +1。' },
  { id: 'smithy', name: '魔鐵工坊', mark: '⚒️', cost: 210, description: '攻城戰力 +6。' },
  { id: 'watchtower', name: '木造瞭望塔', mark: '🗼', cost: 195, description: '守城戰力 +8。' },
  { id: 'barracks', name: '邊境營舍', mark: '🏰', cost: 255, description: '攻城戰力 +10。' },
  { id: 'infirmary', name: '治療所', mark: '🏥', cost: 175, description: '戰鬥道具恢復量 +10。' },
  { id: 'academy', name: '魔術講堂', mark: '🏫', cost: 225, description: '魔法戰力 +8。' },
  { id: 'guildhall', name: '冒險者公會', mark: '🏛️', cost: 235, description: '交易售價再 +5%。' }
];
export const ISEKAI_ANIMALS = [
  { id: 'hen', name: '農莊母雞', mark: '🐔', group: 'land', cost: 42, feed: 6, product: '雞蛋', sale: 18, yield: 2, careMs: 2 * 60000 },
  { id: 'goat', name: '山地乳羊', mark: '🐐', group: 'land', cost: 75, feed: 9, product: '羊乳', sale: 27, yield: 2, careMs: 3 * 60000 },
  { id: 'sheep', name: '北境綿羊', mark: '🐑', group: 'land', cost: 96, feed: 12, product: '羊毛', sale: 39, yield: 2, careMs: 4 * 60000 },
  { id: 'mistduck', name: '霧羽鴨', mark: '🦆', group: 'land', cost: 54, feed: 7, product: '霧羽蛋', sale: 23, yield: 2, careMs: 3 * 60000 },
  { id: 'dawngoose', name: '晨鳴鵝', mark: '🪿', group: 'land', cost: 68, feed: 8, product: '晨鳴鵝蛋', sale: 29, yield: 2, careMs: 3 * 60000 },
  { id: 'moonrabbit', name: '月耳兔', mark: '🐇', group: 'land', cost: 72, feed: 8, product: '月絨', sale: 32, yield: 2, careMs: 3 * 60000 },
  { id: 'staralpaca', name: '星紋羊駝', mark: '🦙', group: 'land', cost: 112, feed: 14, product: '星紋絨', sale: 46, yield: 2, careMs: 5 * 60000 },
  { id: 'frostyak', name: '霜角犛牛', mark: '🐂', group: 'land', cost: 145, feed: 17, product: '霜角乳', sale: 55, yield: 2, careMs: 6 * 60000 },
  { id: 'bellstag', name: '風鈴鹿', mark: '🦌', group: 'land', cost: 132, feed: 15, product: '風鈴鹿毛', sale: 52, yield: 2, careMs: 5 * 60000 },
  { id: 'snowfox', name: '雪原狐', mark: '🦊', group: 'land', cost: 118, feed: 13, product: '自然脫落狐絨', sale: 48, yield: 2, careMs: 5 * 60000 },
  { id: 'starquail', name: '星點鵪鶉', mark: '🐦', group: 'land', cost: 59, feed: 7, product: '星點鵪鶉蛋', sale: 24, yield: 3, careMs: 3 * 60000 },
  { id: 'packhorse', name: '高原馱馬', mark: '🐎', group: 'land', cost: 150, feed: 18, product: '梳落馬鬃', sale: 57, yield: 2, careMs: 6 * 60000 },
  { id: 'glowsilkworm', name: '螢光蠶', mark: '🐛', group: 'insect', cost: 82, feed: 8, product: '螢絲', sale: 35, yield: 2, careMs: 4 * 60000 },
  { id: 'dewbee', name: '晨露蜂', mark: '🐝', group: 'insect', cost: 88, feed: 9, product: '晨露蜜', sale: 37, yield: 2, careMs: 4 * 60000 },
  { id: 'rainbowmoth', name: '虹翼蝶', mark: '🦋', group: 'insect', cost: 96, feed: 10, product: '自然落下彩粉', sale: 42, yield: 2, careMs: 4 * 60000 },
  { id: 'dusklight', name: '暮光螢', mark: '🪲', group: 'insect', cost: 70, feed: 7, product: '暮光螢粉', sale: 31, yield: 2, careMs: 4 * 60000 },
  { id: 'springfish', name: '林泉魚', mark: '🐟', group: 'aquatic', cost: 92, feed: 10, product: '林泉魚', sale: 43, yield: 2, careMs: 4 * 60000 },
  { id: 'crystalfish', name: '晶鱗魚', mark: '🐠', group: 'aquatic', cost: 132, feed: 14, product: '自然脫落晶鱗', sale: 54, yield: 2, careMs: 5 * 60000 },
  { id: 'marshfrog', name: '月沼蛙', mark: '🐸', group: 'aquatic', cost: 76, feed: 8, product: '月沼蛙卵', sale: 33, yield: 2, careMs: 4 * 60000 },
  { id: 'stonetortoise', name: '石背龜', mark: '🐢', group: 'aquatic', cost: 108, feed: 12, product: '自然脫落甲片', sale: 46, yield: 2, careMs: 5 * 60000 },
  { id: 'dragongecko', name: '龍紋壁虎', mark: '🦎', group: 'land', cost: 84, feed: 8, product: '自然脫落鱗片', sale: 38, yield: 2, careMs: 4 * 60000 }
];
export const buildingById = id => ISEKAI_BUILDINGS.find(building => building.id === id);
export const animalById = id => ISEKAI_ANIMALS.find(animal => animal.id === id);
export const hasIsekaiBuilding = (farm, id) => Object.values(farm.plots || {}).some(plots => plots.some(plot => plot?.facility === id));

export const ISEKAI_SEASONS = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
export function isekaiClimate(now = Date.now(), regionId = 'west') {
  const date = new Date(now);
  const month = date.getUTCMonth();
  const season = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer'
    : month >= 8 && month <= 10 ? 'autumn' : 'winter';
  const weather = ['晴朗', '多雲', '小雨', '微風'][(Math.floor(now / 86400000) + ISEKAI_REGIONS.findIndex(region => region.id === regionId) * 3 + 8) % 4];
  return { season, seasonName: ISEKAI_SEASONS[season], weather: regionId === 'north' && season === 'winter' ? '飄雪' : weather };
}

export const regionById = id => ISEKAI_REGIONS.find(region => region.id === id);
export const areaById = id => ISEKAI_AREAS.find(area => area.id === id);
export const cropById = id => ISEKAI_CROPS.find(crop => crop.id === id);
export const raceById = id => ISEKAI_RACES.find(race => race.id === id);
export const professionById = id => ISEKAI_PROFESSIONS.find(profession => profession.id === id);
export function adjustedSeedPrice(farm, crop) {
  return Math.max(1, Math.ceil(crop.seed * (raceById(farm.profile?.raceId)?.seedMultiplier || 1)
    * (professionById(farm.profile?.professionId)?.seedMultiplier || 1)));
}
export function adjustedAreaCost(farm, area) {
  return Math.max(1, Math.ceil(area.cost * (professionById(farm.profile?.professionId)?.landMultiplier || 1)));
}
export function adjustedRegionCost(farm, region) {
  return Math.max(1, Math.ceil(region.cost * (professionById(farm.profile?.professionId)?.regionMultiplier || 1)));
}
export function adjustedBuildingCost(farm, building) {
  return Math.max(1, Math.ceil(building.cost * (professionById(farm.profile?.professionId)?.buildingMultiplier || 1)));
}
export function adjustedAnimalCost(farm, animal) {
  return Math.max(1, Math.ceil(animal.cost * (professionById(farm.profile?.professionId)?.animalCostMultiplier || 1)));
}
export function adjustedFeedCost(farm, animal) {
  return Math.max(1, Math.ceil(animal.feed * (professionById(farm.profile?.professionId)?.feedMultiplier || 1)));
}
export function adjustedSalePrice(farm, crop) {
  const marketBonus = (hasIsekaiBuilding(farm, 'market') ? 1.1 : 1) * (hasIsekaiBuilding(farm, 'guildhall') ? 1.05 : 1);
  return Math.max(1, Math.round(crop.sale * marketBonus * (raceById(farm.profile?.raceId)?.saleMultiplier || 1)
    * (professionById(farm.profile?.professionId)?.saleMultiplier || 1)
    * (animalById(crop.id) ? professionById(farm.profile?.professionId)?.animalSaleMultiplier || 1 : 1)));
}
export function chooseIsekaiIdentity(source, profile) {
  const farm = normalizeIsekaiFarm(source);
  if (farm.profile || !ISEKAI_GENDERS.some(item => item.id === profile?.gender)
    || !raceById(profile?.raceId) || !professionById(profile?.professionId)) throw new Error('請完整選擇性別、種族與職業。');
  farm.profile = { gender: profile.gender, raceId: profile.raceId, professionId: profile.professionId,
    faith: profile.faith === 'milis' ? 'milis' : 'free', chosenAt: Date.now() };
  farm.coins += raceById(profile.raceId).bonusCoins || 0;
  farm.journal.unshift({ at: Date.now(), text: `以${raceById(profile.raceId).name}・${professionById(profile.professionId).name}身分開始開拓。` });
  farm.journal = farm.journal.slice(0, 12);
  return farm;
}

export function freshIsekaiFarm() {
  return {
    version: 2, coins: 100, renown: 0, harvested: 0, profile: null,
    unlockedRegions: ['west'], selectedRegion: 'west', selectedArea: 'fittoa', unlockedAreas: ['fittoa'],
    plots: Object.fromEntries(ISEKAI_AREAS.map(area => [area.id, Array.from({ length: 6 }, () => null)])),
    seeds: { wheat: 2 }, produce: {}, animalGoods: {},
    journal: [{ at: Date.now(), text: '抵達中央大陸西部，開始開墾第一片田地。' }]
  };
}

export function normalizeIsekaiFarm(raw) {
  const fresh = freshIsekaiFarm();
  if (!raw || typeof raw !== 'object') return fresh;
  const unlockedRegions = Array.isArray(raw.unlockedRegions)
    ? ISEKAI_REGIONS.map(region => region.id).filter(id => raw.unlockedRegions.includes(id)) : ['west'];
  if (!unlockedRegions.includes('west')) unlockedRegions.unshift('west');
  const unlockedAreas = Array.isArray(raw.unlockedAreas)
    ? ISEKAI_AREAS.map(area => area.id).filter(id => raw.unlockedAreas.includes(id))
    : ISEKAI_REGIONS.filter(region => unlockedRegions.includes(region.id)).map(region => ISEKAI_AREAS.find(area => area.region === region.id).id);
  if (!unlockedAreas.includes('fittoa')) unlockedAreas.unshift('fittoa');
  const profile = raw.profile && ISEKAI_GENDERS.some(item => item.id === raw.profile.gender)
    && raceById(raw.profile.raceId) && professionById(raw.profile.professionId)
    ? { gender: raw.profile.gender, raceId: raw.profile.raceId, professionId: raw.profile.professionId,
      faith: raw.profile.faith === 'milis' ? 'milis' : 'free', chosenAt: Number(raw.profile.chosenAt) || 0 } : null;
  return {
    ...fresh,
    staff: raw.staff, staffTasks: raw.staffTasks, staffActiveMs: raw.staffActiveMs,
    staffRestUntil: raw.staffRestUntil, staffLastWorkMs: raw.staffLastWorkMs, staffHistory: raw.staffHistory,
    familyHobbies: raw.familyHobbies, courtship: raw.courtship, spouses: raw.spouses,
    children: raw.children, familyHistory: raw.familyHistory,
    coins: Math.max(0, Number(raw.coins) || 0),
    renown: Math.max(0, Number(raw.renown) || 0),
    harvested: Math.max(0, Number(raw.harvested) || 0),
    profile,
    unlockedRegions,
    selectedRegion: unlockedRegions.includes(raw.selectedRegion) ? raw.selectedRegion : 'west',
    unlockedAreas,
    selectedArea: unlockedAreas.includes(raw.selectedArea) ? raw.selectedArea
      : ISEKAI_AREAS.find(area => area.region === (unlockedRegions.includes(raw.selectedRegion) ? raw.selectedRegion : 'west'))?.id || 'fittoa',
    plots: Object.fromEntries(ISEKAI_AREAS.map(area => [area.id,
      Array.from({ length: 6 }, (_, index) => {
        // Version 1 saved six plots per region. Preserve each set in that region’s first territory.
        const legacyKey = ISEKAI_AREAS.find(item => item.region === area.region)?.id === area.id ? area.region : null;
        const plot = raw.plots?.[area.id]?.[index] || (legacyKey ? raw.plots?.[legacyKey]?.[index] : null);
        if (plot?.facility && buildingById(plot.facility)) return {
          facility: plot.facility, animalId: animalById(plot.animalId)?.id || null,
          readyAt: Number(plot.readyAt) || 0, fedAt: Number(plot.fedAt) || 0
        };
        return plot && cropById(plot.cropId) ? { cropId: plot.cropId, plantedAt: Number(plot.plantedAt) || 0,
          readyAt: Number(plot.readyAt) || 0, watered: !!plot.watered, seasonBonus: Number(plot.seasonBonus) || 0 } : null;
      })])),
    seeds: Object.fromEntries(ISEKAI_CROPS.map(crop => [crop.id, Math.max(0, Number(raw.seeds?.[crop.id]) || 0)])),
    produce: Object.fromEntries(ISEKAI_CROPS.map(crop => [crop.id, Math.max(0, Number(raw.produce?.[crop.id]) || 0)])),
    animalGoods: Object.fromEntries(ISEKAI_ANIMALS.map(animal => [animal.id, Math.max(0, Number(raw.animalGoods?.[animal.id]) || 0)])),
    journal: Array.isArray(raw.journal) ? raw.journal.slice(0, 12) : fresh.journal
  };
}

export function isekaiActionError(farm, action, now = Date.now()) {
  if (!farm.profile) return '請先建立角色。';
  if (action.type === 'reincarnate') return farm.coins < ISEKAI_REINCARNATION_COST ? `轉生需要 ${ISEKAI_REINCARNATION_COST} 枚金幣。` : '';
  const areaId = action.areaId || farm.selectedArea;
  const area = areaById(areaId);
  const regionId = action.regionId || area?.region || farm.selectedRegion;
  const plot = farm.plots?.[areaId]?.[action.plotIndex];
  const crop = cropById(action.cropId);
  const building = buildingById(action.buildingId);
  const animal = animalById(action.animalId || plot?.animalId);
  if (action.type === 'unlock') {
    const region = regionById(regionId);
    if (!region || region.id === 'west' || farm.unlockedRegions.includes(regionId)) return '這片土地已經開放。';
    if (farm.coins < adjustedRegionCost(farm, region)) return `需要 ${adjustedRegionCost(farm, region)} 枚金幣。`;
    if (farm.harvested < 3) return '先在西部完成至少三次收成。';
    return '';
  }
  if (action.type === 'unlockArea') {
    if (!area || farm.unlockedAreas.includes(areaId)) return '這塊領地已經開放。';
    if (!farm.unlockedRegions.includes(area.region)) return '先開拓所屬的大區域。';
    return farm.coins < adjustedAreaCost(farm, area) ? `需要 ${adjustedAreaCost(farm, area)} 枚金幣。` : '';
  }
  if (!farm.unlockedRegions.includes(regionId)) return '先解鎖此區域。';
  if (!farm.unlockedAreas.includes(areaId)) return '先開拓此領地。';
  if (action.type === 'buy') {
    if (!crop || crop.region !== regionId) return '請選擇本區的種苗。';
    return farm.coins < adjustedSeedPrice(farm, crop) ? '金幣不足。' : '';
  }
  if (action.type === 'sell') return crop && (farm.produce[crop.id] || 0) > 0 ? '' : '倉庫沒有這種收成。';
  if (action.type === 'sellAnimal') return animal && (farm.animalGoods[animal.id] || 0) > 0 ? '' : '倉庫沒有這種動物產物。';
  if (!Number.isInteger(action.plotIndex) || action.plotIndex < 0 || action.plotIndex >= 6) return '請先選擇田地。';
  if (action.type === 'build') {
    if (!building) return '請選擇建築。';
    if (plot) return '這塊田已有作物或建築。';
    return farm.coins < adjustedBuildingCost(farm, building) ? `建築需要 ${adjustedBuildingCost(farm, building)} 金幣。` : '';
  }
  if (action.type === 'demolish') {
    if (!plot?.facility) return '這裡沒有建築。';
    if (plot.animalId) return '先讓畜舍動物離開才能拆除。';
    return farm.coins < 18 ? '拆除需要 18 金幣。' : '';
  }
  if (action.type === 'adopt') {
    if (plot?.facility !== 'stable' || plot.animalId) return '請選擇空的畜舍。';
    if (!animal) return '請選擇動物。';
    return farm.coins < adjustedAnimalCost(farm, animal) ? `飼養需要 ${adjustedAnimalCost(farm, animal)} 金幣。` : '';
  }
  if (action.type === 'release') return plot?.facility === 'stable' && plot.animalId ? '' : '這間畜舍沒有動物。';
  if (action.type === 'feed') {
    if (plot?.facility !== 'stable' || !animal) return '請選擇有動物的畜舍。';
    if (plot.readyAt) return '動物已照顧，請等待或收取產物。';
    return farm.coins < adjustedFeedCost(farm, animal) ? `照顧需要 ${adjustedFeedCost(farm, animal)} 金幣。` : '';
  }
  if (action.type === 'collect') {
    if (plot?.facility !== 'stable' || !animal || !plot.readyAt) return '動物尚未開始生產。';
    return now < plot.readyAt ? '產物還未準備好。' : '';
  }
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
  if (action.type === 'reincarnate') {
    const next = freshIsekaiFarm();
    next.journal = [{ at: now, text: `付出 ${ISEKAI_REINCARNATION_COST} 金幣，轉生後重新開拓中央大陸。` }];
    return { farm: next, detail: '轉生完成，請重新選擇角色，農莊與資源已重置' };
  }
  const areaId = action.areaId || farm.selectedArea;
  const regionId = action.regionId || areaById(areaId)?.region || farm.selectedRegion;
  const crop = cropById(action.cropId);
  const building = buildingById(action.buildingId);
  const animal = animalById(action.animalId || farm.plots?.[areaId]?.[action.plotIndex]?.animalId);
  let detail = '';
  if (action.type === 'unlock') {
    const region = regionById(regionId);
    const cost = adjustedRegionCost(farm, region);
    farm.coins -= cost;
    farm.unlockedRegions.push(regionId);
    farm.selectedRegion = regionId;
    const firstArea = ISEKAI_AREAS.find(area => area.region === regionId);
    farm.unlockedAreas.push(firstArea.id);
    farm.selectedArea = firstArea.id;
    detail = `解鎖${region.name}，花費 ${cost} 金幣`;
  } else if (action.type === 'unlockArea') {
    const area = areaById(areaId);
    const cost = adjustedAreaCost(farm, area);
    farm.coins -= cost;
    farm.unlockedAreas.push(areaId);
    farm.selectedRegion = area.region;
    farm.selectedArea = areaId;
    detail = `開拓${area.name}，花費 ${cost} 金幣`;
  } else if (action.type === 'buy') {
    farm.coins -= adjustedSeedPrice(farm, crop);
    farm.seeds[crop.id] += 1;
    detail = `取得一份${crop.name}種苗`;
  } else if (action.type === 'build') {
    farm.coins -= adjustedBuildingCost(farm, building);
    farm.plots[areaId][action.plotIndex] = { facility: building.id, animalId: null, fedAt: 0, readyAt: 0 };
    detail = `在${areaById(areaId).name}建成${building.name}`;
  } else if (action.type === 'demolish') {
    const name = buildingById(farm.plots[areaId][action.plotIndex].facility).name;
    farm.coins -= 18;
    farm.plots[areaId][action.plotIndex] = null;
    detail = `花費 18 金幣拆除${name}`;
  } else if (action.type === 'adopt') {
    farm.coins -= adjustedAnimalCost(farm, animal);
    farm.plots[areaId][action.plotIndex].animalId = animal.id;
    detail = `畜舍迎來${animal.name}`;
  } else if (action.type === 'release') {
    const name = animal.name;
    farm.plots[areaId][action.plotIndex].animalId = null;
    farm.plots[areaId][action.plotIndex].readyAt = 0;
    detail = `${name}已離開畜舍`;
  } else if (action.type === 'feed') {
    farm.coins -= adjustedFeedCost(farm, animal);
    farm.plots[areaId][action.plotIndex].fedAt = now;
    farm.plots[areaId][action.plotIndex].readyAt = now + animal.careMs;
    detail = `照顧${animal.name}，等待${animal.product}`;
  } else if (action.type === 'collect') {
    const profession = professionById(farm.profile.professionId);
    const quantity = animal.yield + (animal.group === 'insect' ? profession.insectYield || 0 : 0)
      + (animal.group === 'insect' && hasIsekaiBuilding(farm, 'apiary') ? 1 : 0)
      + (animal.group === 'aquatic' ? profession.aquaticYield || 0 : 0);
    farm.animalGoods[animal.id] += quantity;
    farm.plots[areaId][action.plotIndex].readyAt = 0;
    farm.renown += quantity;
    detail = `取得${animal.product} ${quantity} 份`;
  } else if (action.type === 'plant') {
    farm.seeds[crop.id] -= 1;
    const race = raceById(farm.profile.raceId);
    const profession = professionById(farm.profile.professionId);
    const climate = isekaiClimate(now, regionId);
    const inSeason = crop.seasons.includes(climate.season);
    const hasWell = farm.plots[areaId].some(plot => plot?.facility === 'well');
    const growthMs = Math.round(crop.growthMs * (hasWell ? .9 : 1) * (hasIsekaiBuilding(farm, 'greenhouse') ? .85 : 1) * (race.growthMultiplier || 1) * (profession.growthMultiplier || 1)
      * (inSeason ? .9 : 1.15) * (climate.weather === '小雨' ? .92 : 1));
    farm.plots[areaId][action.plotIndex] = { cropId: crop.id, plantedAt: now, readyAt: now + growthMs, watered: false, seasonBonus: Number(inSeason) };
    detail = `在${areaById(areaId).name}播下${crop.name}`;
  } else if (action.type === 'water') {
    const plot = farm.plots[areaId][action.plotIndex];
    plot.watered = true;
    plot.readyAt = Math.max(now + 15000, plot.readyAt - 45000 - (professionById(farm.profile.professionId).waterBonusMs || 0)
      - (hasIsekaiBuilding(farm, 'aqueduct') ? 20000 : 0));
    detail = '澆水後，作物生長加快';
  } else if (action.type === 'harvest') {
    const plot = farm.plots[areaId][action.plotIndex];
    const grown = cropById(plot.cropId);
    const quantity = grown.yield + Number(plot.watered) + Number(plot.seasonBonus || 0) + (raceById(farm.profile.raceId).extraYield || 0)
      + (['herb', 'flower'].includes(grown.id) ? professionById(farm.profile.professionId).herbalYield || 0 : 0)
      + (professionById(farm.profile.professionId).extraCropYield || 0)
      + (hasIsekaiBuilding(farm, 'granary') ? 1 : 0)
      + (action.frontierBonus ? 1 : 0)
      + (plot.seasonBonus ? professionById(farm.profile.professionId).seasonExtraYield || 0 : 0);
    farm.produce[grown.id] += quantity;
    farm.harvested += 1;
    farm.renown += quantity;
    farm.plots[areaId][action.plotIndex] = null;
    detail = `收成${grown.name} ${quantity} 份，聲望 +${quantity}`;
  } else if (action.type === 'sell') {
    const quantity = farm.produce[crop.id];
    farm.coins += quantity * adjustedSalePrice(farm, crop);
    farm.produce[crop.id] = 0;
    detail = `賣出${crop.name} ${quantity} 份，得到 ${quantity * adjustedSalePrice(farm, crop)} 金幣`;
  } else if (action.type === 'sellAnimal') {
    const quantity = farm.animalGoods[animal.id];
    const unitPrice = adjustedSalePrice(farm, animal);
    farm.coins += quantity * unitPrice;
    farm.animalGoods[animal.id] = 0;
    detail = `賣出${animal.product} ${quantity} 份，得到 ${quantity * unitPrice} 金幣`;
  }
  farm.journal.unshift({ at: now, text: detail });
  farm.journal = farm.journal.slice(0, 12);
  return { farm, detail };
}
