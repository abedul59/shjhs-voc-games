export const ZOO_WIDTH = 20;
export const ZOO_HEIGHT = 13;

// These are game-sized habitat units, not legal enclosure measurements.
export const ZOO_FEEDS = [
  { id: 'browse', name: '樹葉與嫩枝', icon: '🌿', price: 9 },
  { id: 'grass', name: '牧草', icon: '🌾', price: 6 },
  { id: 'meat', name: '肉類', icon: '🥩', price: 16 },
  { id: 'bamboo', name: '竹葉', icon: '🎋', price: 11 },
  { id: 'fruit', name: '水果與蔬菜', icon: '🍎', price: 9 },
  { id: 'fish', name: '魚類', icon: '🐟', price: 13 },
  { id: 'insects', name: '昆蟲與小型餌料', icon: '🦗', price: 7 },
  { id: 'eucalyptus', name: '尤加利葉', icon: '🍃', price: 12 }
];
export const zooFeed = id => ZOO_FEEDS.find(feed => feed.id === id);
const SPECIES_NEEDS = {
  giraffe: ['browse', 2, 1, '高處取食與遮陰'], zebra: ['grass', 1, 2, '成群活動與奔跑'],
  lion: ['meat', 3, 2, '群體休息與遮蔽'], elephant: ['browse', 4, 2, '水池與社群空間'],
  tiger: ['meat', 3, 1, '藏身處與巡遊空間'], panda: ['bamboo', 2, 1, '竹林與陰涼'],
  redpanda: ['fruit', 1, 1, '攀爬架與樹枝'], orangutan: ['fruit', 3, 1, '高處攀爬與藏食'],
  hippo: ['grass', 3, 2, '深淺水域'], flamingo: ['insects', 1, 3, '淺水與群居空間'],
  capybara: ['grass', 1, 2, '可游泳的水池'], penguin: ['fish', 1, 2, '水池與陰涼'],
  seal: ['fish', 2, 2, '水池與乾燥休息處'], meerkat: ['insects', 1, 3, '挖掘地與躲藏處'],
  koala: ['eucalyptus', 2, 1, '尤加利樹與休息平台'], snowleopard: ['meat', 3, 1, '岩石高處與遮蔽']
};

export const ZOO_ANIMALS = [
  { id: 'giraffe', name: '長頸鹿', en: 'Giraffe', icon: '🦒', biome: 'savanna', cost: 360, appeal: 24, food: 15, wiki: 'Giraffe', fact: '長頸鹿以長頸取食高處樹葉，喜歡開闊的草原。' },
  { id: 'zebra', name: '斑馬', en: 'Zebra', icon: '🦓', biome: 'savanna', cost: 220, appeal: 17, food: 10, wiki: 'Zebra', fact: '斑馬身上的條紋各不相同，常群居於非洲草原。' },
  { id: 'lion', name: '獅子', en: 'Lion', icon: '🦁', biome: 'savanna', cost: 480, appeal: 33, food: 20, wiki: 'Lion', fact: '獅子是群居的貓科動物，需要充足的空間與妥善照護。' },
  { id: 'elephant', name: '非洲象', en: 'African elephant', icon: '🐘', biome: 'savanna', cost: 650, appeal: 37, food: 28, wiki: 'African_elephant', fact: '非洲象有複雜的社群關係，也需要水源與寬廣的活動空間。' },
  { id: 'tiger', name: '老虎', en: 'Tiger', icon: '🐅', biome: 'forest', cost: 510, appeal: 34, food: 21, wiki: 'Tiger', fact: '老虎通常獨自活動，林地棲地應提供躲藏處。' },
  { id: 'panda', name: '大貓熊', en: 'Giant panda', icon: '🐼', biome: 'forest', cost: 620, appeal: 38, food: 25, wiki: 'Giant_panda', fact: '大貓熊主要食用竹子，保育工作也關注其棲地。' },
  { id: 'redpanda', name: '小貓熊', en: 'Red panda', icon: '🐾', biome: 'forest', cost: 340, appeal: 23, food: 13, wiki: 'Red_panda', fact: '小貓熊善於攀爬，適合有樹木與高處的平台。' },
  { id: 'orangutan', name: '紅毛猩猩', en: 'Orangutan', icon: '🦧', biome: 'forest', cost: 450, appeal: 29, food: 18, wiki: 'Orangutan', fact: '紅毛猩猩大部分時間在樹上活動，需要攀爬設施。' },
  { id: 'hippo', name: '河馬', en: 'Hippopotamus', icon: '🦛', biome: 'wetland', cost: 480, appeal: 30, food: 23, wiki: 'Hippopotamus', fact: '河馬白天常在水裡休息，棲地需要足夠水域。' },
  { id: 'flamingo', name: '紅鶴', en: 'Flamingo', icon: '🦩', biome: 'wetland', cost: 190, appeal: 17, food: 8, wiki: 'Flamingo', fact: '紅鶴會在淺水中覓食，群體活動十分醒目。' },
  { id: 'capybara', name: '水豚', en: 'Capybara', icon: '🦫', biome: 'wetland', cost: 200, appeal: 19, food: 9, wiki: 'Capybara', fact: '水豚是擅長游泳的大型齧齒類，喜歡靠近水邊。' },
  { id: 'penguin', name: '洪堡企鵝', en: 'Humboldt penguin', icon: '🐧', biome: 'coast', cost: 300, appeal: 25, food: 12, wiki: 'Humboldt_penguin', fact: '洪堡企鵝生活於南美洲沿岸，棲地需要水池與陰涼區。' },
  { id: 'seal', name: '海豹', en: 'Seal', icon: '🦭', biome: 'coast', cost: 390, appeal: 27, food: 16, wiki: 'Pinniped', fact: '海豹在水中靈活，也需要能上岸休息的地方。' },
  { id: 'meerkat', name: '狐獴', en: 'Meerkat', icon: '🐾', biome: 'savanna', cost: 180, appeal: 20, food: 8, wiki: 'Meerkat', fact: '狐獴會合作警戒，牠們喜歡能挖掘與躲藏的環境。' },
  { id: 'koala', name: '無尾熊', en: 'Koala', icon: '🐨', biome: 'forest', cost: 350, appeal: 26, food: 13, wiki: 'Koala', fact: '無尾熊主要吃尤加利葉，長時間在樹上休息。' },
  { id: 'snowleopard', name: '雪豹', en: 'Snow leopard', icon: '🐆', biome: 'mountain', cost: 530, appeal: 35, food: 20, wiki: 'Snow_leopard', fact: '雪豹適應寒冷高山，能在岩石間跳躍。' }
].map(animal => {
  const [feedId, space, minGroup, enrichment] = SPECIES_NEEDS[animal.id];
  return { ...animal, feedId, space, minGroup, enrichment };
});

export const ZOO_STAFF_TASKS = [
  { id: 'manage', name: '統籌園區', role: 'manager' },
  { id: 'feed', name: '配餐餵食', role: 'keeper' }, { id: 'water', name: '補充飲水', role: 'keeper' },
  { id: 'clean', name: '清潔棲地', role: 'keeper' }, { id: 'enrich', name: '環境豐富化', role: 'keeper' },
  { id: 'health', name: '健康巡檢', role: 'vet' }, { id: 'buyFeed', name: '補購飼料', role: 'nutritionist' },
  { id: 'sweep', name: '清理步道與廁所', role: 'cleaner' }, { id: 'repair', name: '維護設施', role: 'mechanic' },
  { id: 'admit', name: '售票與接待', role: 'cashier' }, { id: 'guide', name: '導覽與教學', role: 'educator' },
  { id: 'patrol', name: '安全巡邏', role: 'security' }
];
const STAFF_ROLES = {
  manager: ['園區經理', '🧑‍💼', 80, ['manage']], keeper: ['動物保育員', '🧑‍🌾', 58, ['feed', 'water', 'clean', 'enrich']],
  vet: ['獸醫', '🩺', 85, ['health']], nutritionist: ['營養師', '🥗', 65, ['buyFeed']],
  cleaner: ['環境清潔員', '🧹', 42, ['sweep']], mechanic: ['設施維修員', '🛠️', 55, ['repair']],
  cashier: ['售票接待員', '🎟️', 48, ['admit']], educator: ['保育解說員', '📖', 54, ['guide']],
  security: ['安全巡邏員', '🛡️', 52, ['patrol']]
};
const STAFF_NAMES = ['林語晴', '陳柏宇', '黃佳寧', '張書豪', '吳怡君', '李承恩', '王心妤', '劉建宏', '蔡可欣', '許育銘', '鄭佩珊', '周文謙', '謝雨柔', '郭家豪', '楊思涵', '何俊廷', '邱婉庭', '曾冠廷'];
export const ZOO_STAFF_MARKET = Object.entries(STAFF_ROLES).flatMap(([role, [name, icon, wage, tasks]], index) => [0, 1].map(rank => ({
  id: `${role}-${rank}`, role, roleName: name, icon, name: STAFF_NAMES[index * 2 + rank],
  skill: rank ? 2 : 1, wage: wage + rank * 14, tasks, description: rank ? '資深，單輪可處理更多工作' : '具備此職務的基本能力'
})));
export const zooStaffCandidate = id => ZOO_STAFF_MARKET.find(person => person.id === id);
export const zooStaffWage = (person, period = 'day') => period === 'week' ? person.wage * 6 : person.wage;
export const zooStaffMarket = day => ZOO_STAFF_MARKET.filter((person, index) => index % 2 === (Math.floor((day - 1) / 3) % 2));
export const ZOO_SHIFT_MS = 30 * 60 * 1000;
export const ZOO_REST_MS = 30 * 60 * 1000;

export const ZOO_BIOMES = [
  { id: 'savanna', name: '草原', icon: '🌾', cost: 150, color: '#c7a866' },
  { id: 'forest', name: '森林', icon: '🌳', cost: 170, color: '#648b68' },
  { id: 'wetland', name: '濕地', icon: '💧', cost: 180, color: '#5b9ba1' },
  { id: 'coast', name: '海岸', icon: '🌊', cost: 190, color: '#6faabd' },
  { id: 'mountain', name: '高山', icon: '⛰️', cost: 210, color: '#869097' }
];

export const ZOO_TOOLS = [
  { id: 'inspect', name: '查看／照護', icon: '🔎', cost: 0, group: '基本' },
  { id: 'path', name: '步道', icon: '🟨', cost: 25, group: '基本', description: '步道連結園區入口、棲地與服務設施。' },
  { id: 'tree', name: '景觀樹', icon: '🌴', cost: 35, group: '基本', description: '景觀樹讓園區更有綠意。' },
  { id: 'remove', name: '拆除', icon: '🧹', cost: 20, group: '基本' },
  ...ZOO_BIOMES.map(biome => ({ id: `habitat:${biome.id}`, name: `${biome.name}棲地`, icon: biome.icon, cost: biome.cost, group: '動物棲地' })),
  { id: 'shop', name: '餐飲攤', icon: '🥤', cost: 230, dailyCost: 12, group: '遊客服務', description: '遊客可在這裡買飲料與點心，增加每位遊客的消費。' },
  { id: 'toilet', name: '洗手間', icon: '🚻', cost: 170, dailyCost: 12, group: '遊客服務', description: '洗手間能避免遊客因缺少基本服務而提早離園。' },
  { id: 'giftShop', name: '紀念品店', icon: '🎁', cost: 300, dailyCost: 18, group: '遊客服務', description: '販售動物園紀念品，提高每位遊客的消費。' },
  { id: 'visitorCenter', name: '遊客中心', icon: '🧭', cost: 280, dailyCost: 15, group: '遊客服務', description: '提供園區資訊與導覽服務，提升來客數。' },
  { id: 'firstAid', name: '急救站', icon: '⛑️', cost: 220, dailyCost: 13, group: '遊客服務', description: '處理遊客的小傷病，提升園區服務品質。' },
  { id: 'playground', name: '兒童遊戲區', icon: '🎠', cost: 260, dailyCost: 12, group: '遊客服務', description: '吸引親子遊客，讓家庭願意停留更久。' },
  { id: 'waterFountain', name: '飲水站', icon: '🚰', cost: 120, dailyCost: 5, group: '遊客服務', description: '提供飲水，改善遊客參觀體驗。' },
  { id: 'bench', name: '休息座椅', icon: '🪑', cost: 60, dailyCost: 2, group: '遊客服務', description: '讓遊客休息，改善漫長路線的體驗。' },
  { id: 'education', name: '解說牌', icon: '📖', cost: 100, dailyCost: 5, group: '教育與園務', description: '介紹動物與棲地，增加遊客教育及保育點數。' },
  { id: 'viewingDeck', name: '觀景台', icon: '🔭', cost: 200, dailyCost: 9, group: '教育與園務', description: '讓遊客觀察動物，增加棲地吸引力。' },
  { id: 'educationCenter', name: '保育教室', icon: '🏫', cost: 340, dailyCost: 16, group: '教育與園務', description: '辦理保育教育活動，提高吸引力及保育點數。' },
  { id: 'keeperStation', name: '保育員工作站', icon: '🧑‍🌾', cost: 320, dailyCost: 10, group: '教育與園務', description: '提供照護設備，增加保育員每天可照顧的棲地數。' },
  { id: 'vetClinic', name: '獸醫診療所', icon: '🩺', cost: 420, dailyCost: 20, group: '教育與園務', description: '提供檢查設備，增加獸醫每天可照顧的動物數。' }
];

export const zooAnimal = id => ZOO_ANIMALS.find(animal => animal.id === id);
export const zooBiome = id => ZOO_BIOMES.find(biome => biome.id === id);
export const zooTool = id => ZOO_TOOLS.find(tool => tool.id === id);
const indexOf = (x, y) => y * ZOO_WIDTH + x;
const neighbours = tile => [[tile.x - 1, tile.y], [tile.x + 1, tile.y], [tile.x, tile.y - 1], [tile.x, tile.y + 1]]
  .filter(([x, y]) => x >= 0 && x < ZOO_WIDTH && y >= 0 && y < ZOO_HEIGHT).map(([x, y]) => indexOf(x, y));

export function createZoo() {
  const tiles = Array.from({ length: ZOO_WIDTH * ZOO_HEIGHT }, (_, id) => ({ id, x: id % ZOO_WIDTH, y: Math.floor(id / ZOO_WIDTH), kind: null, biome: null, habitatId: null, animalId: null, animalCount: 0, hunger: 100, clean: 100, water: 100, enrichment: 100, health: 100 }));
  for (let x = 0; x <= 3; x++) tiles[indexOf(x, 4)].kind = 'path';
  for (let x = 3; x <= 5; x++) Object.assign(tiles[indexOf(x, 3)], { kind: 'habitat', biome: 'savanna', habitatId: indexOf(3, 3) });
  return { tiles, name: '晨光動物園', money: 3000, day: 1, tickets: 12, keepers: 0, vets: 0, staff: [], staffTasks: Object.fromEntries(ZOO_STAFF_TASKS.map(task => [task.id, true])), staffHistory: [], staffActiveMs: 0, staffRestUntil: 0, feedStock: Object.fromEntries(ZOO_FEEDS.map(feed => [feed.id, 4])), cleanliness: 100, condition: 100, visitors: 0, reputation: 50, totalVisitors: 0, conservation: 0, correct: [], wrong: [], events: ['園區開幕！草原棲地有 3 格，可先領養動物並在人力市場招募員工。'], paused: false, lastReport: null, recordId: null, startedAt: null, attemptNumber: 0 };
}

// Expand existing 14 × 9 local saves in place; the player's animals and finances stay intact.
export function upgradeZooMap(saved) {
  if (!saved || !Array.isArray(saved.tiles)) return null;
  if (![ZOO_WIDTH * ZOO_HEIGHT, 14 * 9].includes(saved.tiles.length)) return null;
  const base = createZoo();
  const tiles = saved.tiles.length === ZOO_WIDTH * ZOO_HEIGHT ? saved.tiles : base.tiles.map(tile => {
    if (tile.x >= 14 || tile.y >= 9) return tile;
    const previous = saved.tiles[tile.y * 14 + tile.x];
    return previous ? { ...tile, ...previous, id: tile.id, x: tile.x, y: tile.y } : tile;
  });
  const zoo = { ...base, ...saved, tiles, staff: Array.isArray(saved.staff) ? saved.staff : [],
    staffTasks: { ...base.staffTasks, ...saved.staffTasks }, staffHistory: Array.isArray(saved.staffHistory) ? saved.staffHistory : [],
    feedStock: { ...base.feedStock, ...saved.feedStock } };
  for (const tile of zoo.tiles) if (tile.kind === 'habitat') {
    tile.habitatId ??= tile.id; // Existing saves keep each occupied habitat separate.
    tile.animalCount ??= tile.animalId ? 1 : 0;
    tile.water ??= 100; tile.enrichment ??= 100; tile.health ??= 100;
  }
  return zoo;
}

export const zooHabitatTiles = (zoo, tile) => tile?.kind === 'habitat'
  ? zoo.tiles.filter(item => item.kind === 'habitat' && (item.habitatId ?? item.id) === (tile.habitatId ?? tile.id)) : [];
export const zooHabitatHome = (zoo, tile) => tile?.kind === 'habitat'
  ? zoo.tiles[tile.habitatId ?? tile.id] || tile : tile;
export const zooHabitatCapacity = (zoo, tile, animalId) => {
  const animal = zooAnimal(animalId);
  return animal ? Math.floor(zooHabitatTiles(zoo, tile).length / animal.space) : 0;
};
const animalHabitats = zoo => zoo.tiles.filter(tile => tile.kind === 'habitat' && tile.animalId && (tile.habitatId ?? tile.id) === tile.id);

export function zooReachable(zoo) {
  const seen = new Set([indexOf(0, 4)]), queue = [indexOf(0, 4)];
  for (let p = 0; p < queue.length; p++) {
    for (const id of neighbours(zoo.tiles[queue[p]])) if (!seen.has(id) && zoo.tiles[id].kind === 'path') { seen.add(id); queue.push(id); }
  }
  return seen;
}

export function zooTourRoute(zoo) {
  const reachable = zooReachable(zoo);
  const start = indexOf(0, 4);
  const targets = [...new Set(zoo.tiles.filter(tile => (tile.kind === 'habitat' && zooHabitatHome(zoo, tile).animalId) || (tile.kind && !['path', 'tree', 'habitat', 'keeperStation', 'vetClinic'].includes(tile.kind)))
    .flatMap(tile => neighbours(tile).filter(id => reachable.has(id))))];
  if (!targets.length) return [start];
  const shortest = (from, to) => {
    const previous = new Map([[from, null]]), queue = [from];
    for (let i = 0; i < queue.length && !previous.has(to); i++) {
      for (const next of neighbours(zoo.tiles[queue[i]])) if (reachable.has(next) && !previous.has(next)) {
        previous.set(next, queue[i]); queue.push(next);
      }
    }
    if (!previous.has(to)) return [];
    const route = [];
    for (let id = to; id !== from; id = previous.get(id)) route.unshift(id);
    return route;
  };
  const route = [start];
  for (const target of targets.slice(0, 12)) {
    route.push(...shortest(route.at(-1), target));
    route.push(target); // Pause briefly at each animal or visitor facility.
  }
  route.push(...shortest(route.at(-1), start));
  return route;
}

export function zooMetrics(zoo) {
  const paths = zooReachable(zoo);
  const reachable = tile => (tile.kind === 'habitat' ? zooHabitatTiles(zoo, tile) : [tile]).some(part => neighbours(part).some(id => paths.has(id)));
  const exhibits = animalHabitats(zoo);
  const active = exhibits.filter(reachable);
  const shops = zoo.tiles.filter(tile => tile.kind === 'shop' && reachable(tile)).length;
  const toilets = zoo.tiles.filter(tile => tile.kind === 'toilet' && reachable(tile)).length;
  const education = zoo.tiles.filter(tile => tile.kind === 'education' && reachable(tile)).length;
  const facilityCounts = Object.fromEntries(ZOO_TOOLS.filter(tool => tool.dailyCost).map(tool => [tool.id, zoo.tiles.filter(tile => tile.kind === tool.id && reachable(tile)).length]));
  const welfare = exhibits.length ? Math.round(exhibits.reduce((sum, tile) => {
    const animal = zooAnimal(tile.animalId);
    const spaceRatio = Math.min(1, zooHabitatCapacity(zoo, tile, tile.animalId) / Math.max(1, tile.animalCount || 1));
    const social = (tile.animalCount || 1) >= animal.minGroup ? 1 : .7;
    return sum + (tile.hunger + tile.clean + tile.water + tile.enrichment + tile.health) / 5 * spaceRatio * social;
  }, 0) / exhibits.length) : 0;
  const diversity = new Set(active.map(tile => tile.animalId)).size;
  const appeal = active.reduce((sum, tile) => sum + (zooAnimal(tile.animalId)?.appeal || 0) * Math.min(2, 1 + ((tile.animalCount || 1) - 1) * .3) * (tile.hunger + tile.clean + tile.health) / 300, 0);
  const guestSatisfaction = Math.max(0, Math.min(100, Math.round(45 + welfare * .25 + (toilets ? 8 : -12)
    + Math.min(12, (facilityCounts.visitorCenter || 0) * 4 + (facilityCounts.firstAid || 0) * 3)
    + Math.min(10, (facilityCounts.playground || 0) * 4 + (facilityCounts.bench || 0) * 2 + (facilityCounts.waterFountain || 0) * 2)
    - Math.max(0, zoo.tickets - 15) * .8 - (exhibits.length - active.length) * 5)));
  return { paths, exhibits, active, shops, toilets, education, facilityCounts, welfare, guestSatisfaction, diversity, appeal, disconnected: exhibits.length - active.length };
}

export function zooBuild(zoo, id, toolId) {
  const tile = zoo.tiles[id], tool = zooTool(toolId);
  if (!tile || !tool) return { error: '無效的地塊或工具。' };
  if (toolId === 'inspect') return { error: '請先選擇一項建設工具。' };
  if (toolId === 'remove') {
    if (!tile.kind || (tile.x === 0 && tile.y === 4)) return { error: '這塊地不能拆除。' };
    if (zoo.money < tool.cost) return { error: '資金不足。' };
    if (tile.kind === 'habitat') {
      const home = zooHabitatHome(zoo, tile);
      if (home.animalId) return { error: '有動物的棲地不能拆除；請先安置動物。' };
      if (home.id === tile.id && zooHabitatTiles(zoo, tile).length > 1) return { error: '請先拆除這塊棲地的其他擴建格。' };
    }
    zoo.money -= tool.cost;
    Object.assign(tile, { kind: null, biome: null, habitatId: null, animalId: null, animalCount: 0, hunger: 100, clean: 100, water: 100, enrichment: 100, health: 100 });
    return { message: '已拆除地塊，動物送交保育中心。' };
  }
  if (tile.kind) return { error: '這塊地已有設施，請選擇空地。' };
  if (zoo.money < tool.cost) return { error: `需要 $${tool.cost}，目前資金不足。` };
  zoo.money -= tool.cost;
  tile.kind = toolId.startsWith('habitat:') ? 'habitat' : toolId;
  tile.biome = toolId.startsWith('habitat:') ? toolId.split(':')[1] : null;
  if (tile.kind === 'habitat') {
    const neighbour = neighbours(tile).map(index => zoo.tiles[index]).find(other => other.kind === 'habitat' && other.biome === tile.biome);
    tile.habitatId = neighbour ? neighbour.habitatId ?? neighbour.id : tile.id;
  }
  return { message: `完成${tool.name}，支出 $${tool.cost}。${tile.kind === 'habitat' ? `目前共 ${zooHabitatTiles(zoo, tile).length} 格棲地。` : tile.kind !== 'path' ? '請用步道連接入口。' : ''}` };
}

export function zooAdopt(zoo, id, animalId) {
  const tile = zooHabitatHome(zoo, zoo.tiles[id]), animal = zooAnimal(animalId);
  if (!animal || tile?.kind !== 'habitat' || (tile.animalId && tile.animalId !== animalId)) return { error: '請選擇空棲地或已有同種動物的棲地。' };
  if (tile.biome !== animal.biome) return { error: `${animal.name}需要${zooBiome(animal.biome).name}棲地。` };
  const count = tile.animalId ? 1 : animal.minGroup;
  const capacity = zooHabitatCapacity(zoo, tile, animalId);
  if ((tile.animalCount || 0) + count > capacity) return { error: `${animal.name}每隻需要 ${animal.space} 格，這座棲地最多 ${capacity} 隻；請先擴建相鄰的${zooBiome(animal.biome).name}棲地。` };
  const cost = animal.cost * count;
  if (zoo.money < cost) return { error: `領養 ${count} 隻${animal.name}需要 $${cost}。` };
  const firstAdoption = !tile.animalId;
  zoo.money -= cost; tile.animalId = animal.id; tile.animalCount = (tile.animalCount || 0) + count;
  if (firstAdoption) Object.assign(tile, { hunger: 90, clean: 90, water: 90, enrichment: 90, health: 90 });
  return { message: `迎來 ${count} 隻${animal.name}！目前 ${tile.animalCount}／${capacity} 隻，需準備${zooFeed(animal.feedId).name}。` };
}

export function zooCare(zoo, id, kind) {
  const tile = zooHabitatHome(zoo, zoo.tiles[id]), animal = zooAnimal(tile?.animalId);
  if (!animal) return { error: '請選擇有動物的棲地。' };
  const count = tile.animalCount || 1;
  if (kind === 'feed' && (zoo.feedStock?.[animal.feedId] || 0) < count) return { error: `${zooFeed(animal.feedId).name}不足，需要 ${count} 份。` };
  const cost = kind === 'feed' ? 0 : kind === 'clean' ? 12 : kind === 'water' ? 8 : kind === 'enrich' ? 18 : 35;
  if (zoo.money < cost) return { error: `照護需要 $${cost}。` };
  zoo.money -= cost;
  if (kind === 'feed') { zoo.feedStock[animal.feedId] -= count; tile.hunger = Math.min(100, tile.hunger + 45); }
  else if (kind === 'clean') tile.clean = Math.min(100, tile.clean + 50);
  else if (kind === 'water') tile.water = Math.min(100, tile.water + 50);
  else if (kind === 'enrich') tile.enrichment = Math.min(100, tile.enrichment + 40);
  else if (kind === 'vet') tile.health = Math.min(100, tile.health + 45);
  else return { error: '不支援的照護項目。' };
  return { message: `${animal.name}已完成${kind === 'enrich' ? animal.enrichment : ({ feed: '配餐餵食', clean: '清潔', water: '補水', vet: '健康檢查' })[kind]}，支出 $${cost}。` };
}

const staffLog = (zoo, person, detail) => {
  zoo.staffHistory.unshift({ day: zoo.day, person, detail });
  zoo.staffHistory = zoo.staffHistory.slice(0, 60);
};

export function zooHireStaff(zoo, personId, period = 'day') {
  const person = zooStaffCandidate(personId);
  if (!person || !['day', 'week'].includes(period)) return { error: '請選擇人員與日薪或周薪。' };
  if (zoo.staff.some(item => item.id === personId)) return { error: '這位人員已在園區工作。' };
  if (zoo.staff.length >= 15) return { error: '園區最多雇用 15 人。' };
  const cost = zooStaffWage(person, period);
  if (zoo.money < cost) return { error: `預付${period === 'day' ? '日薪' : '周薪'}需要 $${cost}。` };
  zoo.money -= cost;
  zoo.staff.push({ id: personId, period, focus: person.tasks[0], paidThroughDay: zoo.day + (period === 'week' ? 7 : 1) - 1 });
  staffLog(zoo, person.name, `雇用${person.roleName}，預付${period === 'day' ? '日薪' : '周薪'} $${cost}`);
  return { message: `${person.name}已加入園區並自動開始值班；有工作與飼料時會自動處理任務。` };
}

export function zooDismissStaff(zoo, personId) {
  const person = zooStaffCandidate(personId);
  if (!zoo.staff.some(item => item.id === personId)) return { error: '這位人員未受雇。' };
  zoo.staff = zoo.staff.filter(item => item.id !== personId);
  staffLog(zoo, person?.name || '員工', '離職；已付薪資不退還');
  return { message: `${person?.name || '員工'}已離職。` };
}

export function zooAssignStaff(zoo, personId, focus) {
  const contract = zoo.staff.find(item => item.id === personId), person = zooStaffCandidate(personId);
  if (!contract || !person?.tasks.includes(focus)) return { error: '此人員無法執行這項工作。' };
  contract.focus = focus;
  staffLog(zoo, person.name, `排班改為${ZOO_STAFF_TASKS.find(item => item.id === focus)?.name}`);
  return { message: `${person.name}已改為負責${ZOO_STAFF_TASKS.find(item => item.id === focus)?.name}。` };
}

export function zooSetStaffTask(zoo, taskId, enabled) {
  if (!ZOO_STAFF_TASKS.some(task => task.id === taskId)) return { error: '無效的工作項目。' };
  zoo.staffTasks[taskId] = Boolean(enabled);
  return { message: `${ZOO_STAFF_TASKS.find(task => task.id === taskId).name}已${enabled ? '啟用' : '暫停'}。` };
}

export function zooBuyFeed(zoo, feedId, quantity) {
  const feed = zooFeed(feedId), count = Math.floor(Number(quantity));
  if (!feed || !Number.isInteger(count) || count < 1 || count > 50) return { error: '每次可購買 1–50 份飼料。' };
  const cost = feed.price * count;
  if (zoo.money < cost) return { error: `購買${feed.name}需要 $${cost}。` };
  zoo.money -= cost; zoo.feedStock[feedId] = (zoo.feedStock[feedId] || 0) + count;
  return { message: `已購買${feed.name} ${count} 份，支出 $${cost}。` };
}

export function zooReleaseAnimal(zoo, id) {
  const tile = zooHabitatHome(zoo, zoo.tiles[id]);
  if (!tile?.animalId) return { error: '這塊棲地沒有動物。' };
  const name = zooAnimal(tile.animalId)?.name || '動物';
  tile.animalCount = Math.max(0, (tile.animalCount || 1) - 1);
  if (!tile.animalCount) tile.animalId = null;
  return { message: `已將 1 隻${name}送往保育中心，棲地剩餘 ${tile.animalCount} 隻。` };
}

export function zooStaffShiftTick(zoo, elapsedMs, now) {
  if (!zoo.staff.length && !zoo.keepers && !zoo.vets) return '';
  if (zoo.staffRestUntil) {
    if (now < zoo.staffRestUntil) return '';
    zoo.staffRestUntil = 0; zoo.staffActiveMs = 0;
    staffLog(zoo, '系統', '休息結束，自動恢復值班');
    return '人員休息結束，已自動恢復值班。';
  }
  zoo.staffActiveMs = (zoo.staffActiveMs || 0) + elapsedMs;
  if (zoo.staffActiveMs < ZOO_SHIFT_MS) return '';
  zoo.staffActiveMs = 0; zoo.staffRestUntil = now + ZOO_REST_MS;
  staffLog(zoo, '系統', '值班滿 30 分鐘有效遊玩時間；休息 30 分鐘實際時間');
  return '人員值班滿 30 分鐘，開始休息 30 分鐘。';
}

function runZooStaff(zoo, working) {
  const logs = [];
  if (!working) return { logs, roles: new Set() };
  const available = zoo.staff.filter(contract => {
    const person = zooStaffCandidate(contract.id);
    if (!person) return false;
    if (contract.paidThroughDay >= zoo.day) return true;
    const wage = zooStaffWage(person, contract.period);
    if (zoo.money < wage) { staffLog(zoo, person.name, '薪資不足，暫停工作'); return false; }
    zoo.money -= wage; contract.paidThroughDay = zoo.day + (contract.period === 'week' ? 7 : 1) - 1;
    staffLog(zoo, person.name, `續付${contract.period === 'week' ? '周薪' : '日薪'} $${wage}`);
    return true;
  });
  const roles = new Set(available.filter(contract => zooStaffCandidate(contract.id).tasks.some(task => zoo.staffTasks[task]))
    .map(contract => zooStaffCandidate(contract.id).role));
  if (zoo.keepers) roles.add('keeper');
  if (zoo.vets) roles.add('vet');
  const allWorkers = [...available.map(contract => ({ person: zooStaffCandidate(contract.id), contract }))
    .sort((a, b) => Number(b.person.role === 'nutritionist') - Number(a.person.role === 'nutritionist')),
    ...Array.from({ length: zoo.keepers || 0 }, (_, id) => ({ person: { name: `原有保育員 ${id + 1}`, role: 'keeper', skill: 1, tasks: ['feed', 'water', 'clean', 'enrich'] }, contract: { focus: 'feed' } })),
    ...Array.from({ length: zoo.vets || 0 }, (_, id) => ({ person: { name: `原有獸醫 ${id + 1}`, role: 'vet', skill: 1, tasks: ['health'] }, contract: { focus: 'health' } }))];
  const habitats = animalHabitats(zoo);
  for (const { person, contract } of allWorkers) {
    const tasks = [contract.focus, ...person.tasks.filter(task => task !== contract.focus)].filter(task => zoo.staffTasks[task]);
    for (let turn = 0; turn < 1 + person.skill; turn++) {
      let detail = '';
      for (const task of tasks) {
        const field = { feed: 'hunger', water: 'water', clean: 'clean', enrich: 'enrichment', health: 'health' }[task];
        const target = field ? [...habitats]
          .filter(tile => task !== 'feed' || (zoo.feedStock[zooAnimal(tile.animalId)?.feedId] || 0) >= (tile.animalCount || 1))
          .sort((a, b) => a[field] - b[field])[0] : null;
        if (task === 'buyFeed') {
          const need = ZOO_FEEDS.find(feed => habitats.some(tile => zooAnimal(tile.animalId)?.feedId === feed.id && (zoo.feedStock[feed.id] || 0) < (tile.animalCount || 1) * 2));
          if (need && zoo.money >= need.price * 5) { zoo.money -= need.price * 5; zoo.feedStock[need.id] = (zoo.feedStock[need.id] || 0) + 5; detail = `補購${need.name} 5 份，支出 $${need.price * 5}`; }
        } else if (['feed', 'water', 'clean', 'enrich', 'health'].includes(task) && target) {
          if (target[field] >= 80) continue;
          const result = zooCare(zoo, target.id, task === 'health' ? 'vet' : task);
          if (!result.error) detail = `${zooAnimal(target.animalId).name} × ${target.animalCount || 1}：${result.message}`;
        } else if (task === 'sweep' && zoo.cleanliness < 85) { zoo.cleanliness = Math.min(100, zoo.cleanliness + 25); detail = '清理步道與洗手間'; }
        else if (task === 'repair' && zoo.condition < 85) { zoo.condition = Math.min(100, zoo.condition + 25); detail = '檢修園區設施'; }
        else if (task === 'manage') detail = '巡查園區排班與營運';
        else if (task === 'admit') detail = '售票並接待遊客';
        else if (task === 'guide') detail = '進行動物保育導覽';
        else if (task === 'patrol') detail = '巡查遊客與動物安全';
        if (detail) break;
      }
      if (!detail) break;
      logs.push(`${person.name}：${detail}`); staffLog(zoo, person.name, detail);
      if (['manage', 'admit', 'guide', 'patrol'].some(task => detail.includes(({ manage: '巡查園區', admit: '售票', guide: '導覽', patrol: '安全' })[task]))) break;
    }
  }
  return { logs, roles };
}

export function advanceZooDay(zoo, now = Date.now()) {
  zoo.cleanliness ??= 100; zoo.condition ??= 100;
  const working = !zoo.staffRestUntil || now >= zoo.staffRestUntil;
  if (zoo.staffRestUntil && working) { zoo.staffRestUntil = 0; zoo.staffActiveMs = 0; staffLog(zoo, '系統', '休息結束，自動恢復值班'); }
  const beforeMoney = zoo.money;
  const staff = runZooStaff(zoo, working);
  for (const tile of animalHabitats(zoo)) {
    tile.hunger = Math.max(0, tile.hunger - 14); tile.clean = Math.max(0, tile.clean - 10);
    tile.water = Math.max(0, tile.water - 13); tile.enrichment = Math.max(0, tile.enrichment - 9);
    if ([tile.hunger, tile.clean, tile.water, tile.enrichment].some(value => value < 35)) tile.health = Math.max(0, tile.health - 12);
    else tile.health = Math.min(100, tile.health + 2);
  }
  zoo.cleanliness = Math.max(0, zoo.cleanliness - 6);
  zoo.condition = Math.max(0, zoo.condition - 4);
  const current = zooMetrics(zoo), facilities = current.facilityCounts, roles = staff.roles;
  const educationBonus = current.education + (facilities.educationCenter || 0) * (roles.has('educator') ? 3 : 1);
  const guestBonus = Math.min(.6, (facilities.visitorCenter || 0) * .12 + (facilities.playground || 0) * .1 + (facilities.firstAid || 0) * .05 + (facilities.waterFountain || 0) * .04 + (facilities.bench || 0) * .025);
  const appeal = current.appeal * (1 + Math.min(.3, (facilities.viewingDeck || 0) * .1));
  const staffFactor = (roles.has('manager') ? 1 : .65) * (roles.has('cashier') ? 1 : .55) * (roles.has('security') ? 1 : .9);
  const visitors = current.active.length ? Math.max(0, Math.round((appeal * .9 + current.diversity * 6 + educationBonus * 3 + zoo.reputation / 8) * (zoo.tickets > 20 ? .7 : zoo.tickets < 8 ? 1.15 : 1) * (current.toilets ? 1 : .78) * (1 + guestBonus) * staffFactor * Math.max(.4, zoo.cleanliness / 100) * Math.max(.5, zoo.condition / 100))) : 0;
  const income = visitors * zoo.tickets + Math.round(visitors * (roles.has('cashier') ? 1 : .4) * (Math.min(3, current.shops) * 2.5 + Math.min(3, facilities.giftShop || 0) * 2));
  const upkeep = zoo.tiles.reduce((sum, tile) => sum + (zooTool(tile.kind)?.dailyCost || 0), 0) + (zoo.keepers || 0) * 65 + (zoo.vets || 0) * 90;
  zoo.money += income - upkeep; zoo.visitors = visitors; zoo.totalVisitors += visitors;
  zoo.reputation = Math.max(0, Math.min(100, Math.round(zoo.reputation + (current.welfare - 65) / 16 + (current.guestSatisfaction - 55) / 22 + (roles.has('educator') ? 1 : 0) - (current.disconnected ? 2 : 0))));
  zoo.conservation += Math.max(0, Math.floor(current.welfare / 25) + educationBonus);
  zoo.day += 1;
  const expense = upkeep + Math.max(0, beforeMoney - (zoo.money - income + upkeep));
  zoo.lastReport = { income, expense, visitors, welfare: current.welfare };
  const event = `第 ${zoo.day - 1} 天：遊客 ${visitors} 人、收入 $${income}、園務支出 $${expense}，動物福祉 ${current.welfare}%。${staff.logs.length ? ` 人力完成 ${staff.logs.length} 項工作。` : ' 人力未執行工作，請檢查排班、飼料或休息狀態。'}`;
  if (!staff.logs.length && (zoo.staff.length || zoo.keepers || zoo.vets)) staffLog(zoo, '系統', working ? '本日沒有可執行工作；請檢查任務開關、棲地需求、飼料或薪資。' : '人力休息中，本日未執行工作。');
  zoo.events.unshift(event); zoo.events = zoo.events.slice(0, 12);
  return zoo.lastReport;
}
