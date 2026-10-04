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
  ] },
  { id: 'orchard', name: '琥珀果園', subtitle: '古果木與花海', x: 19, y: 32, color: '#bdd69b', enemy: '花粉蜂后', hp: 145, attack: 17, drops: ['pollen', 'amber'], spots: [
    { id: 'blossom', name: '蜜花坡', icon: '🌼', materials: ['pollen', 'herb', 'pear', 'dew'] },
    { id: 'fruit', name: '琥珀果林', icon: '🍐', materials: ['pear', 'sap', 'amber', 'wood'] },
    { id: 'resin', name: '樹脂泉', icon: '🌳', materials: ['sap', 'bark', 'moss', 'pollen'] }
  ] },
  { id: 'estuary', name: '白葦河口', subtitle: '潮間帶與鹽田', x: 25, y: 60, color: '#92ced1', enemy: '鹽甲螯獸', hp: 156, attack: 18, drops: ['coral', 'salt'], spots: [
    { id: 'reeds', name: '白葦灘', icon: '🌾', materials: ['seaweed', 'dew', 'herb', 'feather'] },
    { id: 'coral', name: '淺珊瑚礁', icon: '🪸', materials: ['coral', 'pearl', 'shell', 'seaweed'] },
    { id: 'saltpan', name: '日照鹽田', icon: '🧂', materials: ['salt', 'coral', 'shell', 'ore'] }
  ] },
  { id: 'mistpeak', name: '霧羽高地', subtitle: '飛鳥棲息的雲山', x: 38, y: 27, color: '#b8c1d8', enemy: '風翼獅鷲', hp: 168, attack: 19, drops: ['feather', 'amber'], spots: [
    { id: 'nest', name: '風羽巢', icon: '🪶', materials: ['feather', 'bark', 'amber', 'moss'] },
    { id: 'cloud', name: '雲上石徑', icon: '☁️', materials: ['quartz', 'dew', 'ore', 'feather'] },
    { id: 'pine', name: '老松崖', icon: '🌲', materials: ['bark', 'sap', 'wood', 'amber'] }
  ] },
  { id: 'fungal', name: '幽蕈地窟', subtitle: '地下菌脈', x: 51, y: 45, color: '#b89bcc', enemy: '幽影蕈王', hp: 182, attack: 20, drops: ['mushroom', 'shadowleaf'], spots: [
    { id: 'luminous', name: '發光蕈徑', icon: '🍄', materials: ['mushroom', 'spore', 'shadowleaf', 'moss'] },
    { id: 'inkpool', name: '墨水潭', icon: '🖋️', materials: ['ink', 'dew', 'shadowleaf', 'crystal'] },
    { id: 'underroot', name: '幽根巷', icon: '🌑', materials: ['shadowleaf', 'bark', 'mushroom', 'relic'] }
  ] },
  { id: 'silver', name: '銀層峽谷', subtitle: '礦脈與泥土層', x: 56, y: 44, color: '#c5c6b4', enemy: '岩層巨人', hp: 196, attack: 21, drops: ['silver', 'quartz'], spots: [
    { id: 'quarry', name: '銀層礦道', icon: '⛏️', materials: ['silver', 'ore', 'quartz', 'clay'] },
    { id: 'gully', name: '黏土地谷', icon: '🏞️', materials: ['clay', 'dew', 'quartz', 'moss'] },
    { id: 'sunstone', name: '日光晶脈', icon: '💠', materials: ['quartz', 'crystal', 'silver', 'amber'] }
  ] },
  { id: 'foundry', name: '熔痕工業區', subtitle: '火口與鍊成遺構', x: 65, y: 47, color: '#d9a787', enemy: '熔核機兵', hp: 210, attack: 22, drops: ['sulfur', 'gear'], spots: [
    { id: 'smelter', name: '硫煙熔爐', icon: '🔥', materials: ['sulfur', 'ash', 'ore', 'gear'] },
    { id: 'machine', name: '斷軸工廠', icon: '⚙️', materials: ['gear', 'relic', 'silver', 'ink'] },
    { id: 'cinder', name: '燼花田', icon: '🌺', materials: ['flameflower', 'ash', 'ember', 'sulfur'] }
  ] },
  { id: 'icelake', name: '月銀冰湖', subtitle: '冰原與月石', x: 70, y: 70, color: '#b6d9e9', enemy: '雪霧魔鹿', hp: 226, attack: 23, drops: ['moonstone', 'ice'], spots: [
    { id: 'frozen', name: '薄冰岸', icon: '🧊', materials: ['ice', 'dew', 'pearl', 'moonstone'] },
    { id: 'moon', name: '月石洞', icon: '🌙', materials: ['moonstone', 'quartz', 'crystal', 'silver'] },
    { id: 'underice', name: '冰下水道', icon: '❄️', materials: ['ice', 'pearl', 'seaweed', 'shadowleaf'] }
  ] },
  { id: 'storm', name: '雷雨離島', subtitle: '風暴與日種', x: 79, y: 65, color: '#a6bdd5', enemy: '雷鳴翼龍', hp: 242, attack: 24, drops: ['stormglass', 'sunseed'], spots: [
    { id: 'lightning', name: '雷晶海角', icon: '⚡', materials: ['stormglass', 'quartz', 'crystal', 'feather'] },
    { id: 'sunfield', name: '日種丘', icon: '🌻', materials: ['sunseed', 'pollen', 'flameflower', 'herb'] },
    { id: 'stormshore', name: '風暴岸', icon: '🌪️', materials: ['stormglass', 'salt', 'shell', 'seaweed'] }
  ] },
  { id: 'academy', name: '星圖學院', subtitle: '遺失的研究中樞', x: 94, y: 64, color: '#d6c8a2', enemy: '星圖機關獸', hp: 260, attack: 25, drops: ['gear', 'pearl'], spots: [
    { id: 'lecture', name: '鍊成講堂', icon: '📖', materials: ['ink', 'gear', 'relic', 'moonstone'] },
    { id: 'garden', name: '星露庭園', icon: '🌠', materials: ['pearl', 'stardust', 'sunseed', 'dew'] },
    { id: 'vault', name: '封印藏庫', icon: '🔐', materials: ['gear', 'silver', 'crystal', 'amber'] }
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
  { id: 'stardust', name: '星砂', icon: '✨', element: '光' },
  { id: 'pollen', name: '蜜花粉', icon: '🌼', element: '木' },
  { id: 'mushroom', name: '月傘菇', icon: '🍄', element: '風' },
  { id: 'seaweed', name: '藍潮藻', icon: '🌱', element: '水' },
  { id: 'coral', name: '珊瑚枝', icon: '🪸', element: '水' },
  { id: 'salt', name: '晶鹽', icon: '🧂', element: '土' },
  { id: 'pear', name: '琥珀梨', icon: '🍐', element: '木' },
  { id: 'feather', name: '風羽', icon: '🪶', element: '風' },
  { id: 'bark', name: '老樹皮', icon: '🌳', element: '木' },
  { id: 'sap', name: '金樹脂', icon: '🍯', element: '木' },
  { id: 'amber', name: '琥珀塊', icon: '🟠', element: '土' },
  { id: 'clay', name: '銀黏土', icon: '🏺', element: '土' },
  { id: 'quartz', name: '透光石英', icon: '🔹', element: '光' },
  { id: 'silver', name: '銀礦', icon: '🥈', element: '土' },
  { id: 'sulfur', name: '硫磺晶', icon: '🟡', element: '火' },
  { id: 'ash', name: '燼灰', icon: '🌫️', element: '火' },
  { id: 'ice', name: '冰結晶', icon: '🧊', element: '水' },
  { id: 'moonstone', name: '月影石', icon: '🌙', element: '光' },
  { id: 'ink', name: '幽藍墨液', icon: '🖋️', element: '暗' },
  { id: 'gear', name: '鍊成齒輪', icon: '⚙️', element: '土' },
  { id: 'pearl', name: '明珠', icon: '⚪', element: '水' },
  { id: 'flameflower', name: '焰心花', icon: '🌺', element: '火' },
  { id: 'shadowleaf', name: '影葉', icon: '🍂', element: '暗' },
  { id: 'stormglass', name: '雷璃片', icon: '⚡', element: '風' },
  { id: 'sunseed', name: '日輪種', icon: '🌻', element: '光' }
];

export const RECIPES = [
  { id: 'healing', name: '青葉療傷藥', icon: '🧪', kind: 'heal', effect: '恢復 24 HP', ingredients: { herb: 2, dew: 1 }, power: 24 },
  { id: 'spark', name: '燦火瓶', icon: '💥', kind: 'damage', effect: '造成 30 傷害', ingredients: { ore: 1, wood: 1 }, power: 30 },
  { id: 'ward', name: '月苔護符', icon: '🛡️', kind: 'shield', effect: '形成 18 點護盾', ingredients: { moss: 2, shell: 1 }, power: 18 },
  { id: 'lumen', name: '星晶炸彈', icon: '🌠', kind: 'damage', effect: '造成 52 傷害', ingredients: { crystal: 2, spore: 1 }, power: 52 },
  { id: 'elixir', name: '晨光靈藥', icon: '💖', kind: 'heal', effect: '恢復 50 HP', ingredients: { dew: 2, crystal: 1, herb: 1 }, power: 50 },
  { id: 'flare', name: '赤霞導彈', icon: '🚀', kind: 'damage', effect: '造成 78 傷害', ingredients: { ember: 1, relic: 1, ore: 1 }, power: 78 },
  { id: 'nova', name: '星環萬象瓶', icon: '🌌', kind: 'damage', effect: '造成 100 傷害', ingredients: { stardust: 2, relic: 1 }, power: 100 },
  { id: 'budPotion', name: '花芽靈液', icon: '🌱', kind: 'heal', effect: '恢復 18 HP', ingredients: { herb: 1, pollen: 1 }, power: 18 },
  { id: 'oceanTonic', name: '潮韻藥水', icon: '🌊', kind: 'heal', effect: '恢復 38 HP', ingredients: { seaweed: 1, coral: 1, dew: 1 }, power: 38 },
  { id: 'silverSalve', name: '銀樹藥膏', icon: '🌿', kind: 'heal', effect: '恢復 64 HP', ingredients: { silver: 1, sap: 1, moss: 1 }, power: 64 },
  { id: 'phoenixElixir', name: '火鳥靈藥', icon: '🔥', kind: 'heal', effect: '恢復 90 HP', ingredients: { flameflower: 1, ash: 1, stardust: 1 }, power: 90 },
  { id: 'earthShell', name: '陶土屏障', icon: '🏺', kind: 'shield', effect: '形成 24 點護盾', ingredients: { clay: 2, wood: 1 }, power: 24 },
  { id: 'ironGuard', name: '銀鐵守護器', icon: '⚙️', kind: 'shield', effect: '形成 42 點護盾', ingredients: { ore: 1, silver: 1, gear: 1 }, power: 42 },
  { id: 'starlightWard', name: '月星結界', icon: '🌙', kind: 'shield', effect: '形成 62 點護盾', ingredients: { moonstone: 1, stardust: 1 }, power: 62 },
  { id: 'rallyTonic', name: '果香鼓舞劑', icon: '🍐', kind: 'boost', effect: '下次攻擊增加 12 傷害', ingredients: { pollen: 1, pear: 1 }, power: 12 },
  { id: 'focusLens', name: '聚光鏡', icon: '🔍', kind: 'boost', effect: '下次攻擊增加 22 傷害', ingredients: { quartz: 1, crystal: 1 }, power: 22 },
  { id: 'stormCatalyst', name: '雷光觸媒', icon: '⚡', kind: 'boost', effect: '下次攻擊增加 34 傷害', ingredients: { stormglass: 1, sunseed: 1 }, power: 34 },
  { id: 'stickyInk', name: '束縛墨瓶', icon: '🖋️', kind: 'weaken', effect: '接下來兩次反擊減少 9 傷害', ingredients: { ink: 1, spore: 1 }, power: 9 },
  { id: 'twilightDust', name: '暮葉散', icon: '🍂', kind: 'weaken', effect: '接下來兩次反擊減少 15 傷害', ingredients: { shadowleaf: 1, moonstone: 1 }, power: 15 },
  { id: 'sleepBell', name: '安眠風鈴', icon: '🔔', kind: 'stun', effect: '敵人本回合無法反擊', ingredients: { feather: 1, gear: 1 }, power: 1 },
  { id: 'sapSiphon', name: '樹脂虹吸瓶', icon: '🍯', kind: 'drain', effect: '造成 28 傷害並回復 14 HP', ingredients: { sap: 1, bark: 1 }, power: 28 },
  { id: 'lunarSiphon', name: '月影虹吸瓶', icon: '🌘', kind: 'drain', effect: '造成 50 傷害並回復 25 HP', ingredients: { moonstone: 1, shadowleaf: 1 }, power: 50 },
  { id: 'saltBomb', name: '鹽珊爆彈', icon: '🧂', kind: 'damage', effect: '造成 26 傷害', ingredients: { salt: 1, coral: 1 }, power: 26 },
  { id: 'thornGrenade', name: '荊木爆彈', icon: '🌳', kind: 'damage', effect: '造成 34 傷害', ingredients: { bark: 1, herb: 1 }, power: 34 },
  { id: 'sporeBomb', name: '蕈霧瓶', icon: '🍄', kind: 'damage', effect: '造成 42 傷害', ingredients: { mushroom: 1, spore: 1 }, power: 42 },
  { id: 'amberBolt', name: '琥珀雷矢', icon: '🟠', kind: 'damage', effect: '造成 48 傷害', ingredients: { amber: 1, quartz: 1 }, power: 48 },
  { id: 'sulfurFlare', name: '硫炎火球', icon: '☄️', kind: 'damage', effect: '造成 58 傷害', ingredients: { sulfur: 1, ash: 1 }, power: 58 },
  { id: 'iceShard', name: '冰晶飛刃', icon: '❄️', kind: 'damage', effect: '造成 63 傷害', ingredients: { ice: 1, crystal: 1 }, power: 63 },
  { id: 'solarOrb', name: '日輪光球', icon: '☀️', kind: 'damage', effect: '造成 82 傷害', ingredients: { sunseed: 1, flameflower: 1 }, power: 82 },
  { id: 'aetherBurst', name: '星海震盪瓶', icon: '💫', kind: 'damage', effect: '造成 115 傷害', ingredients: { stardust: 1, moonstone: 1, pearl: 1 }, power: 115 }
];

export const ALCHEMISTS = [
  { id: 'lia', name: '莉亞', gender: '女', race: '人類', job: '鍊金術士', skill: '元素投射', icon: '✦', portrait: '/alchemy/portraits/alchemist.png', damage: 13 },
  { id: 'fiona', name: '菲歐娜', gender: '女', race: '人類', job: '晶石鍊金術士', skill: '晶簇射線', icon: '✧', portrait: '/alchemy/portraits/fiona.jpg', damage: 15 },
  { id: 'mirelle', name: '米蕾爾', gender: '女', race: '人類', job: '草藥鍊金術士', skill: '綠葉爆發', icon: '❀', portrait: '/alchemy/portraits/mirelle.jpg', damage: 12 },
  { id: 'rowan', name: '羅恩', gender: '男', race: '人類', job: '調律鍊金術士', skill: '元素共鳴', icon: '◇', portrait: '/alchemy/portraits/rowan.jpg', damage: 14 },
  { id: 'cassian', name: '卡西安', gender: '男', race: '人類', job: '星象鍊金術士', skill: '星軌衝擊', icon: '✺', portrait: '/alchemy/portraits/cassian.jpg', damage: 16 },
  { id: 'toma', name: '托瑪', gender: '男', race: '人類', job: '工匠鍊金術士', skill: '熱能投擲', icon: '⚗', portrait: '/alchemy/portraits/toma.jpg', damage: 13 }
];

export const PARTY = [
  { id: 'guardian', name: '艾登', race: '人類', job: '守護劍士', skill: '鋼盾斬', icon: '⚔', portrait: '/alchemy/portraits/guardian.png', damage: 18 },
  { id: 'botanist', name: '瑟里安', race: '森靈', job: '採集師', skill: '藤蔓箭', icon: '❧', portrait: '/alchemy/portraits/botanist.png', damage: 11 },
  { id: 'artisan', name: '朵拉', race: '矮人', job: '工匠', skill: '鍊金重錘', icon: '⚒', portrait: '/alchemy/portraits/artisan.png', damage: 16 },
  { id: 'ranger', name: '薇拉', race: '森靈', job: '遊俠', skill: '疾風箭', icon: '🏹', portrait: '/alchemy/portraits/ranger.jpg', damage: 17 },
  { id: 'mage', name: '雷恩', race: '人類', job: '雷術師', skill: '閃電鏈', icon: '⚡', portrait: '/alchemy/portraits/mage.jpg', damage: 19 },
  { id: 'healer', name: '諾雅', race: '人類', job: '治療師', skill: '光羽術', icon: '✚', portrait: '/alchemy/portraits/healer.jpg', damage: 10 },
  { id: 'rogue', name: '凱洛', race: '人類', job: '斥候', skill: '雙刃連擊', icon: '◆', portrait: '/alchemy/portraits/rogue.jpg', damage: 20 },
  { id: 'lancer', name: '伊莎', race: '人類', job: '槍術士', skill: '流星突刺', icon: '♜', portrait: '/alchemy/portraits/lancer.jpg', damage: 18 },
  { id: 'scholar', name: '奧里', race: '人類', job: '學者', skill: '符文解放', icon: '📖', portrait: '/alchemy/portraits/scholar.jpg', damage: 14 },
  { id: 'beastkeeper', name: '芙蕾', race: '人類', job: '馴獸師', skill: '靈狐協擊', icon: '🐾', portrait: '/alchemy/portraits/beastkeeper.jpg', damage: 16 }
];

export const regionById = id => REGIONS.find(region => region.id === id) || REGIONS[0];
export const materialById = id => MATERIALS.find(material => material.id === id);
export const recipeById = id => RECIPES.find(recipe => recipe.id === id);

export function freshAtelier() {
  return { heroId: null, partyIds: [], loadouts: {}, regionId: 'verdant', spotId: 'meadow', unlocked: ['verdant'], defeated: [], inventory: {}, items: {}, energy: 12, hp: 100, gatheringCount: 0, synthesisCount: 0, victories: 0, discoveries: [], weatherStep: 0, journal: ['鍊金工房開張！先到風鈴草原採集素材。'] };
}

export function normalizeAtelier(raw) {
  const base = freshAtelier();
  if (!raw || typeof raw !== 'object') return base;
  const next = { ...base, ...raw };
  next.inventory = raw.inventory && typeof raw.inventory === 'object' ? raw.inventory : {};
  next.items = raw.items && typeof raw.items === 'object' ? raw.items : {};
  next.heroId = ALCHEMISTS.some(person => person.id === raw.heroId) ? raw.heroId : null;
  next.partyIds = Array.isArray(raw.partyIds) ? [...new Set(raw.partyIds.filter(id => PARTY.some(person => person.id === id)))].slice(0, 3) : [];
  next.loadouts = raw.loadouts && typeof raw.loadouts === 'object' && !Array.isArray(raw.loadouts) ? raw.loadouts : {};
  next.unlocked = Array.isArray(raw.unlocked) ? raw.unlocked.filter(id => REGIONS.some(region => region.id === id)) : base.unlocked;
  next.defeated = Array.isArray(raw.defeated) ? raw.defeated : [];
  next.defeated.forEach(id => {
    const following = REGIONS[REGIONS.findIndex(region => region.id === id) + 1];
    if (following && !next.unlocked.includes(following.id)) next.unlocked.push(following.id);
  });
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
