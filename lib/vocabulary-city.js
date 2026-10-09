export const CITY_WIDTH = 28;
export const CITY_HEIGHT = 22;
const OLD_CITY_WIDTH = 18;
const OLD_CITY_HEIGHT = 14;

export const CITY_TOOLS = [
  { id: 'road', name: '道路', icon: '═', cost: 25, group: '交通' },
  { id: 'rail', name: '鐵路', icon: '≡', cost: 45, group: '交通' },
  { id: 'station', name: '車站', icon: '▧', cost: 240, group: '交通', important: true },
  { id: 'residential', name: '住宅區', icon: '⌂', cost: 65, group: '分區' },
  { id: 'commercial', name: '商業區', icon: '▣', cost: 85, group: '分區' },
  { id: 'industrial', name: '工業區', icon: '▤', cost: 90, group: '分區' },
  { id: 'power', name: '發電廠', icon: '⚡', cost: 600, group: '設施', important: true },
  { id: 'water', name: '自來水廠', icon: '◈', cost: 480, group: '設施', important: true },
  { id: 'park', name: '公園', icon: '♣', cost: 120, group: '設施' },
  { id: 'school', name: '學校', icon: '▥', cost: 360, group: '設施', important: true },
  { id: 'hospital', name: '醫院', icon: '✚', cost: 420, group: '設施', important: true },
  { id: 'fire', name: '消防局', icon: '♨', cost: 350, group: '設施', important: true },
  { id: 'police', name: '警察局', icon: '★', cost: 350, group: '設施', important: true },
  { id: 'stadium', name: '體育場', icon: '◉', cost: 540, group: '設施', important: true },
  { id: 'bulldoze', name: '拆除', icon: '⌫', cost: 30, group: '管理', important: true }
];

const toolById = Object.fromEntries(CITY_TOOLS.map(tool => [tool.id, tool]));
const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const index = (x, y) => y * CITY_WIDTH + x;
const land = (x, y) => {
  const oldArea = x < OLD_CITY_WIDTH && y < OLD_CITY_HEIGHT;
  const water = oldArea
    ? (y === 0 && x > 9) || (x >= 15 && y >= 8) || (x === 16 && y >= 5)
    : (y === 0 && x > 20) || (x >= 26 && y >= 14);
  if (water) return 'water';
  return (x * 17 + y * 23 + x * y * 7) % (oldArea ? 17 : 19) < 3 ? 'forest' : 'grass';
};

export function createCity(name = '晨光市') {
  const tiles = Array.from({ length: CITY_WIDTH * CITY_HEIGHT }, (_, id) => {
    const x = id % CITY_WIDTH, y = Math.floor(id / CITY_WIDTH);
    return { x, y, terrain: land(x, y), kind: null, level: 0 };
  });
  for (let x = 4; x <= 10; x++) tiles[index(x, 6)].kind = 'road';
  tiles[index(7, 5)].kind = 'power';
  tiles[index(8, 5)].kind = 'water';
  return { version: 2, name, tiles, money: 1800, month: 1, year: 1, population: 0,
    happiness: 65, taxRate: 8, paused: false, reliefUsed: false, policy: 'none', debt: 0, turns: 0,
    events: ['歡迎就任！已有一條道路及基本水電，請規劃住宅、商業和工業區。'],
    correct: [], wrong: [], totalEarned: 0, totalSpent: 0, lastReport: null };
}

export function upgradeCityMap(saved) {
  if (!saved || typeof saved.money !== 'number' || !Array.isArray(saved.tiles)) return null;
  if (saved.version === 2 && saved.tiles.length === CITY_WIDTH * CITY_HEIGHT) return saved;
  if (saved.version !== 1 || saved.tiles.length !== OLD_CITY_WIDTH * OLD_CITY_HEIGHT) return null;
  const expanded = createCity(saved.name);
  for (const tile of expanded.tiles) {
    tile.kind = null;
    tile.level = 0;
  }
  for (let y = 0; y < OLD_CITY_HEIGHT; y++) for (let x = 0; x < OLD_CITY_WIDTH; x++) {
    expanded.tiles[index(x, y)] = { ...saved.tiles[y * OLD_CITY_WIDTH + x], x, y };
  }
  return { ...saved, version: 2, tiles: expanded.tiles };
}

export function cityMetrics(city) {
  const built = city.tiles.filter(tile => tile.kind);
  const count = kind => built.filter(tile => tile.kind === kind).length;
  const roads = city.tiles.filter(tile => tile.kind === 'road' || tile.kind === 'rail' || tile.kind === 'station');
  const reachable = new Set();
  const queue = [];
  for (const tile of roads) {
    if (tile.x === 0 || tile.x === CITY_WIDTH - 1 || tile.y === 0 || tile.y === CITY_HEIGHT - 1) {
      const id = index(tile.x, tile.y); reachable.add(id); queue.push(tile);
    }
  }
  // The initial central road is a city entrance until the player connects it to a map edge.
  if (!queue.length) {
    const starter = roads.find(tile => tile.x === 4 && tile.y === 6);
    if (starter) { reachable.add(index(starter.x, starter.y)); queue.push(starter); }
  }
  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i];
    for (const next of roads) if (adjacent(tile, next) === 1) {
      const id = index(next.x, next.y);
      if (!reachable.has(id)) { reachable.add(id); queue.push(next); }
    }
  }
  const served = tile => roads.some(road => reachable.has(index(road.x, road.y)) && adjacent(tile, road) <= (city.policy === 'transit' && ['rail', 'station'].includes(road.kind) ? 4 : 2));
  const zones = built.filter(tile => ['residential', 'commercial', 'industrial'].includes(tile.kind));
  const activeZones = zones.filter(served);
  const electricity = count('power') * 18;
  const water = count('water') * 18;
  const demand = zones.reduce((sum, tile) => sum + Math.max(1, tile.level), 0);
  const powered = electricity >= demand, watered = water >= demand;
  const pollution = Math.max(0, Math.min(100, count('industrial') * 11 + count('power') * 6 - count('park') * 4 - (city.policy === 'green' ? 9 : 0)));
  const services = count('school') * 3 + count('hospital') * 4 + count('fire') * 2 + count('police') * 2 + count('park') * 2 + count('stadium') * 5;
  const happiness = Math.max(10, Math.min(95, Math.round(60 + services - pollution * .4 - Math.max(0, city.taxRate - 8) * 3 - (!powered ? 18 : 0) - (!watered ? 18 : 0))));
  const jobs = activeZones.filter(tile => tile.kind === 'commercial').reduce((sum, tile) => sum + tile.level * 14, 0)
    + activeZones.filter(tile => tile.kind === 'industrial').reduce((sum, tile) => sum + tile.level * 22, 0);
  const housing = activeZones.filter(tile => tile.kind === 'residential').reduce((sum, tile) => sum + tile.level * 25, 0);
  const potentialPopulation = powered && watered ? Math.min(housing, jobs + 20) : Math.min(10, housing);
  const monthlyIncome = Math.floor(city.population * city.taxRate * .22 + count('commercial') * 12 + count('industrial') * 15);
  const monthlyExpense = count('road') * 2 + count('rail') * 3 + count('station') * 22 + count('power') * 50 + count('water') * 35 + count('school') * 35
    + count('hospital') * 45 + count('fire') * 28 + count('police') * 28 + count('park') * 8 + count('stadium') * 38
    + (city.policy === 'green' ? 22 : city.policy === 'transit' ? 18 : 0) + (city.debt > 0 ? Math.min(110, city.debt) : 0);
  return { powered, watered, electricity, water, demand, pollution, happiness, jobs, housing, potentialPopulation,
    monthlyIncome, monthlyExpense, activeZones: activeZones.length, zones: zones.length, reachable, served };
}

export function placeCityTile(city, tileId, kind) {
  const tool = toolById[kind];
  const tile = city.tiles[tileId];
  if (!tool || !tile) return { error: '請先選擇有效地塊和工具。' };
  if (tile.terrain === 'water') return { error: '水域不能建設。' };
  if (kind === 'bulldoze' && !tile.kind) return { error: '這塊地沒有可拆除的設施。' };
  if (kind !== 'bulldoze' && tile.kind) return { error: '請先拆除原有建設。' };
  if (city.money < tool.cost) return { error: `資金不足，${tool.name}需要 $${tool.cost}。` };
  city.money -= tool.cost;
  city.totalSpent += tool.cost;
  tile.kind = kind === 'bulldoze' ? null : kind;
  tile.level = 0;
  return { message: `${kind === 'bulldoze' ? '已拆除' : '已建設'} ${tool.name}，支出 $${tool.cost}。` };
}

export function citySelectionIds(startId, endId, kind) {
  const start = { x: startId % CITY_WIDTH, y: Math.floor(startId / CITY_WIDTH) };
  const end = { x: endId % CITY_WIDTH, y: Math.floor(endId / CITY_WIDTH) };
  if (!['residential', 'commercial', 'industrial', 'road', 'rail', 'bulldoze'].includes(kind)) return [endId];
  if (kind === 'road' || kind === 'rail') {
    const ids = [];
    const xFirst = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
    if (xFirst) {
      for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) ids.push(index(x, start.y));
      for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++) ids.push(index(end.x, y));
    } else {
      for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++) ids.push(index(start.x, y));
      for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) ids.push(index(x, end.y));
    }
    return [...new Set(ids)];
  }
  const ids = [];
  for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y++)
    for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) ids.push(index(x, y));
  return ids;
}

export function cityPlacementQuote(city, ids, kind) {
  const tool = toolById[kind];
  if (!tool) return { error: '無效的建設工具。' };
  const valid = ids.filter(id => {
    const tile = city.tiles[id];
    return tile && tile.terrain !== 'water' && (kind === 'bulldoze' ? !!tile.kind : !tile.kind);
  });
  if (!valid.length) return { error: '選取範圍沒有可施工的地塊。' };
  const cost = valid.length * tool.cost;
  if (city.money < cost) return { error: `資金不足：${valid.length} 格${tool.name}需要 $${cost}。` };
  return { ids: valid, cost, count: valid.length, tool };
}

export function placeCityArea(city, ids, kind) {
  const quote = cityPlacementQuote(city, ids, kind);
  if (quote.error) return quote;
  for (const id of quote.ids) {
    city.tiles[id].kind = kind === 'bulldoze' ? null : kind;
    city.tiles[id].level = 0;
  }
  city.money -= quote.cost;
  city.totalSpent += quote.cost;
  return { message: `${kind === 'bulldoze' ? '已拆除' : '已建設'} ${quote.count} 格${quote.tool.name}，支出 $${quote.cost}。` };
}

export function advanceCityMonth(city) {
  const before = cityMetrics(city);
  for (const tile of city.tiles) if (['residential', 'commercial', 'industrial'].includes(tile.kind)) {
    const eligible = before.served(tile) && before.powered && before.watered && before.happiness >= 38;
    if (eligible && tile.level < 3) tile.level++;
    else if (!eligible && tile.level > 0 && city.month % 2 === 0) tile.level--;
  }
  const after = cityMetrics(city);
  city.population = Math.max(0, Math.round(city.population + (after.potentialPopulation - city.population) * .55));
  city.happiness = after.happiness;
  const income = Math.floor(city.population * city.taxRate * .22 + city.tiles.filter(tile => tile.kind === 'commercial').length * 12 + city.tiles.filter(tile => tile.kind === 'industrial').length * 15);
  const expense = after.monthlyExpense;
  if (city.debt > 0) city.debt = Math.max(0, city.debt - Math.min(110, city.debt));
  city.money += income - expense;
  city.totalEarned += income;
  city.totalSpent += expense;
  city.lastReport = { income, expense, balance: income - expense, population: city.population };
  city.turns = (city.turns || 0) + 1;
  city.month++;
  if (city.month > 12) { city.month = 1; city.year++; }
  const news = !after.powered ? '供電不足：請增建發電廠。' : !after.watered ? '供水不足：請增建自來水廠。' :
    after.activeZones < after.zones ? '部分分區離道路太遠，還不能發展。' :
    city.money < 0 ? '市府赤字！調整稅率或暫緩建設。' :
    city.population > 100 ? '城市蓬勃發展，居民期待更多公共服務。' : '城市正在穩定成長。';
  let event = news;
  if (city.turns > 5 && city.turns % 8 === 0) {
    const exposed = city.tiles.filter(tile => tile.level > 0 && ['residential', 'commercial', 'industrial'].includes(tile.kind));
    if (exposed.length) {
      const affected = exposed[(city.turns * 13 + exposed.length) % exposed.length];
      const fireProtected = city.tiles.some(tile => tile.kind === 'fire' && adjacent(tile, affected) <= 4);
      const storm = city.month >= 6 && city.month <= 10;
      if (!fireProtected || storm) {
        affected.level = Math.max(0, affected.level - 1);
        const damage = fireProtected ? 25 : 90;
        city.money -= damage;
        city.totalSpent += damage;
        event = `${storm ? '暴雨' : '火災'}損及 ${affected.x + 1} 列 ${affected.y + 1} 行，修復支出 $${damage}。`;
      } else event = '消防局迅速處理火警，市民平安。';
    }
  }
  city.events = [`第 ${city.year} 年 ${city.month} 月｜${event}`, ...city.events].slice(0, 5);
  return city.lastReport;
}
