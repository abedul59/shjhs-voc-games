export const ALCHEMY_GAME_TYPE = '單字鍊金工房';

export const REGIONS = [
  { id: 'verdant', name: '綠穗海岸', subtitle: '森林與草原', x: 12, y: 46, color: '#8dcaa2', enemy: '苔甲獸', hp: 46, attack: 7, drops: ['moss', 'ore'], spots: [
    { id: 'meadow', name: '風鈴草原', icon: '🌾', materials: ['herb', 'dew', 'wood'] },
    { id: 'forest', name: '古樹之森', icon: '🌲', materials: ['wood', 'moss', 'herb'] },
    { id: 'cliff', name: '潮音斷崖', icon: '🪨', materials: ['ore', 'dew', 'shell'] }
  ] },
  { id: 'tidal', name: '月潮群灣', subtitle: '破碎海灣與島嶼', x: 32, y: 43, color: '#7bcede', enemy: '潮鳴蟹', hp: 62, attack: 9, drops: ['shell', 'crystal'], spots: [
    { id: 'bay', name: '藍月海灣', icon: '🌊', materials: ['shell', 'dew', 'herb'] },
    { id: 'island', name: '微光離島', icon: '🏝️', materials: ['shell', 'crystal', 'wood'] },
    { id: 'cave', name: '鹽晶洞', icon: '💎', materials: ['ore', 'crystal', 'shell'] }
  ] },
  { id: 'spore', name: '蕈光深地', subtitle: '菌林與濕地', x: 48, y: 38, color: '#c5a8e1', enemy: '蕈傘怪', hp: 76, attack: 10, drops: ['spore', 'crystal'], spots: [
    { id: 'marsh', name: '靜水濕地', icon: '🪷', materials: ['dew', 'spore', 'herb'] },
    { id: 'grove', name: '螢蕈林', icon: '🍄', materials: ['spore', 'wood', 'moss'] },
    { id: 'roots', name: '巨根窟', icon: '🌿', materials: ['moss', 'crystal', 'ore'] }
  ] },
  { id: 'ruins', name: '白鐘古域', subtitle: '鍊金文明遺跡', x: 60, y: 63, color: '#e1c793', enemy: '遺跡守衛', hp: 92, attack: 12, drops: ['relic', 'ore'], spots: [
    { id: 'tower', name: '斷鐘塔', icon: '🏛️', materials: ['relic', 'ore', 'crystal'] },
    { id: 'archive', name: '封塵書庫', icon: '📚', materials: ['relic', 'wood', 'spore'] },
    { id: 'forge', name: '舊熔爐', icon: '🔥', materials: ['ore', 'relic', 'crystal'] }
  ] },
  { id: 'ember', name: '赤霞山脊', subtitle: '高地與火山', x: 74, y: 64, color: '#e9a384', enemy: '赤羽龍', hp: 112, attack: 15, drops: ['ember', 'crystal'], spots: [
    { id: 'ridge', name: '霞色高原', icon: '⛰️', materials: ['ore', 'herb', 'ember'] },
    { id: 'vent', name: '火脈噴口', icon: '🌋', materials: ['ember', 'ore', 'crystal'] },
    { id: 'peak', name: '曙光峰', icon: '☀️', materials: ['ember', 'dew', 'relic'] }
  ] },
  { id: 'aether', name: '星環岬角', subtitle: '圓環古遺跡', x: 88, y: 63, color: '#abc5f0', enemy: '星環魔像', hp: 134, attack: 17, drops: ['stardust', 'relic'], spots: [
    { id: 'cape', name: '極光岬', icon: '✨', materials: ['stardust', 'dew', 'shell'] },
    { id: 'observatory', name: '星象臺', icon: '🔭', materials: ['stardust', 'relic', 'crystal'] },
    { id: 'ice', name: '冰銀河床', icon: '❄️', materials: ['stardust', 'ore', 'dew'] }
  ] }
];

export const MATERIALS = [
  { id: 'herb', name: '青葉草', icon: '🌿', element: '木' },
  { id: 'dew', name: '晨露', icon: '💧', element: '水' },
  { id: 'wood', name: '古木枝', icon: '🪵', element: '木' },
  { id: 'moss', name: '月光苔', icon: '🍃', element: '風' },
  { id: 'ore', name: '赤鐵礦', icon: '🪨', element: '火' },
  { id: 'shell', name: '潮紋貝', icon: '🐚', element: '水' },
  { id: 'crystal', name: '輝晶石', icon: '💎', element: '光' },
  { id: 'spore', name: '螢光孢子', icon: '🍄', element: '風' },
  { id: 'relic', name: '古代零件', icon: '⚙️', element: '土' },
  { id: 'ember', name: '炎心石', icon: '🔥', element: '火' },
  { id: 'stardust', name: '星砂', icon: '✨', element: '光' }
];

export const RECIPES = [
  { id: 'healing', name: '青葉療傷藥', icon: '🧪', effect: '恢復全隊 24 HP', ingredients: { herb: 2, dew: 1 }, power: 24 },
  { id: 'spark', name: '燦火瓶', icon: '💥', effect: '對敵人造成 30 傷害', ingredients: { ore: 1, wood: 1 }, power: 30 },
  { id: 'ward', name: '月苔護符', icon: '🛡️', effect: '下次受到傷害減半', ingredients: { moss: 2, shell: 1 }, power: 1 },
  { id: 'lumen', name: '星晶炸彈', icon: '🌠', effect: '對敵人造成 52 傷害', ingredients: { crystal: 2, spore: 1 }, power: 52 },
  { id: 'elixir', name: '晨光靈藥', icon: '💖', effect: '恢復全隊 50 HP', ingredients: { dew: 2, crystal: 1, herb: 1 }, power: 50 },
  { id: 'flare', name: '赤霞導彈', icon: '🚀', effect: '對敵人造成 78 傷害', ingredients: { ember: 1, relic: 1, ore: 1 }, power: 78 },
  { id: 'nova', name: '星環萬象瓶', icon: '🌌', effect: '對敵人造成 100 傷害', ingredients: { stardust: 2, relic: 1 }, power: 100 }
];

export const PARTY = [
  { id: 'alchemist', name: '莉亞', race: '人類', job: '鍊金術士', skill: '元素投射', icon: '✦', portrait: '/alchemy/portraits/alchemist.png', damage: 13 },
  { id: 'guardian', name: '艾登', race: '人類', job: '守護劍士', skill: '鋼盾斬', icon: '⚔', portrait: '/alchemy/portraits/guardian.png', damage: 18 },
  { id: 'botanist', name: '瑟里安', race: '森靈', job: '採集師', skill: '藤蔓箭', icon: '❧', portrait: '/alchemy/portraits/botanist.png', damage: 11 },
  { id: 'artisan', name: '朵拉', race: '矮人', job: '工匠', skill: '鍊金重錘', icon: '⚒', portrait: '/alchemy/portraits/artisan.png', damage: 16 }
];

export const regionById = id => REGIONS.find(region => region.id === id) || REGIONS[0];
export const materialById = id => MATERIALS.find(material => material.id === id);
export const recipeById = id => RECIPES.find(recipe => recipe.id === id);

export function freshAtelier() {
  return { regionId: 'verdant', spotId: 'meadow', unlocked: ['verdant'], defeated: [], inventory: {}, items: {}, energy: 12, hp: 100, gatheringCount: 0, synthesisCount: 0, victories: 0, discoveries: [], weatherStep: 0, journal: ['鍊金工房開張！先到風鈴草原採集素材。'] };
}

export function normalizeAtelier(raw) {
  const base = freshAtelier();
  if (!raw || typeof raw !== 'object') return base;
  const next = { ...base, ...raw };
  next.inventory = raw.inventory && typeof raw.inventory === 'object' ? raw.inventory : {};
  next.items = raw.items && typeof raw.items === 'object' ? raw.items : {};
  next.unlocked = Array.isArray(raw.unlocked) ? raw.unlocked.filter(id => REGIONS.some(region => region.id === id)) : base.unlocked;
  next.defeated = Array.isArray(raw.defeated) ? raw.defeated : [];
  next.discoveries = Array.isArray(raw.discoveries) ? raw.discoveries : [];
  next.journal = Array.isArray(raw.journal) ? raw.journal.slice(0, 16) : base.journal;
  if (!next.unlocked.length) next.unlocked = base.unlocked;
  if (!next.unlocked.includes(next.regionId)) next.regionId = 'verdant';
  if (!regionById(next.regionId).spots.some(spot => spot.id === next.spotId)) next.spotId = regionById(next.regionId).spots[0].id;
  return next;
}

export function weatherFor(regionId, step) {
  const names = ['晴朗', '細雨', '薄霧', '晴朗', '微風'];
  const offset = REGIONS.findIndex(region => region.id === regionId);
  return names[((Number(step) || 0) + Math.max(offset, 0)) % names.length];
}

export function canSynthesize(state, recipe) {
  return Object.entries(recipe.ingredients).every(([id, amount]) => (state.inventory[id]?.count || 0) >= amount);
}

export function appendJournal(state, message) {
  state.journal = [`${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}　${message}`, ...(state.journal || [])].slice(0, 16);
}

export function gather(state, regionId, spotId) {
  const region = regionById(regionId);
  if (!state.unlocked.includes(region.id)) throw new Error('請先擊敗前一區域的守衛。');
  const spot = region.spots.find(item => item.id === spotId);
  if (!spot) throw new Error('請先選擇採集地。');
  if (state.energy < 1) throw new Error('體力不足，先在工房休息。');
  const weather = weatherFor(regionId, state.weatherStep);
  const pool = weather === '細雨' ? [...spot.materials, 'dew'] : weather === '薄霧' ? [...spot.materials, 'spore'] : spot.materials;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const quality = Math.min(100, 45 + Math.floor(Math.random() * 31) + (weather === '晴朗' ? 8 : 0) + (region.id === 'aether' ? 9 : 0));
  const previous = state.inventory[id] || { count: 0, totalQuality: 0 };
  state.inventory[id] = { count: previous.count + 1, totalQuality: previous.totalQuality + quality };
  state.energy -= 1;
  state.gatheringCount += 1;
  state.weatherStep += 1;
  if (!state.discoveries.includes(id)) state.discoveries.push(id);
  const material = materialById(id);
  const message = `在${spot.name}採得${material.name}（品質 ${quality}／${material.element}屬性）。`;
  appendJournal(state, message);
  return message;
}

export function synthesize(state, recipeId) {
  const recipe = recipeById(recipeId);
  if (!recipe) throw new Error('找不到這份配方。');
  if (!canSynthesize(state, recipe)) throw new Error('素材數量不足。');
  const qualities = Object.entries(recipe.ingredients).map(([id]) => Math.round(state.inventory[id].totalQuality / state.inventory[id].count));
  const quality = Math.min(100, Math.round(qualities.reduce((sum, value) => sum + value, 0) / qualities.length) + 8);
  Object.entries(recipe.ingredients).forEach(([id, amount]) => {
    const entry = state.inventory[id];
    const average = entry.totalQuality / entry.count;
    entry.count -= amount;
    entry.totalQuality = Math.max(0, Math.round(entry.totalQuality - average * amount));
  });
  const item = state.items[recipe.id] || { count: 0, totalQuality: 0 };
  state.items[recipe.id] = { count: item.count + 1, totalQuality: item.totalQuality + quality };
  state.synthesisCount += 1;
  const message = `調合出${recipe.name}（品質 ${quality}）。`;
  appendJournal(state, message);
  return message;
}
