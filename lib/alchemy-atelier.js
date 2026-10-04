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
  { id: 'lia', name: '莉亞', gender: '女', race: '人類', job: '鍊金術士', skill: '元素投射', icon: '✦', portrait: '/alchemy/portraits/alchemist.png', damage: 13, bio: '在海邊小鎮長大的年輕鍊金術士，總把旅途中遇見的人與素材記進同一本筆記。' },
  { id: 'fiona', name: '菲歐娜', gender: '女', race: '人類', job: '晶石鍊金術士', skill: '晶簇射線', icon: '✧', portrait: '/alchemy/portraits/fiona.jpg', damage: 15, bio: '善於從礦物的細小紋路讀出能量，說話果斷，對未知晶石有近乎孩子般的好奇。' },
  { id: 'mirelle', name: '米蕾爾', gender: '女', race: '人類', job: '草藥鍊金術士', skill: '綠葉爆發', icon: '❀', portrait: '/alchemy/portraits/mirelle.jpg', damage: 12, bio: '熟悉四季草木的氣味，常以溫柔的方式提醒隊伍：每片森林都有自己的節奏。' },
  { id: 'selene', name: '瑟琳', gender: '女', race: '人類', job: '月象鍊金術士', skill: '月華輪轉', icon: '☾', portrait: '/alchemy/portraits/selene.jpg', damage: 16, bio: '夜間觀測星月的研究者，衣袖裡藏著能預測潮汐的星盤，目光沉靜而敏銳。' },
  { id: 'brina', name: '布莉娜', gender: '女', race: '人類', job: '熔玻鍊金術士', skill: '赤焰玻璃', icon: '✹', portrait: '/alchemy/portraits/brina.jpg', damage: 17, bio: '鍾愛火焰與玻璃的瞬間變化，性格爽朗，總能把失敗的實驗變成新的發現。' },
  { id: 'ayla', name: '艾菈', gender: '女', race: '人類', job: '潮汐鍊金術士', skill: '深藍漩流', icon: '≈', portrait: '/alchemy/portraits/ayla.jpg', damage: 14, bio: '曾搭船走訪群灣的蒸餾師，擅長提煉鹽與海露，對遠方地圖充滿嚮往。' },
  { id: 'corinne', name: '柯琳', gender: '女', race: '人類', job: '珠金鍊金術士', skill: '稜鏡連鎖', icon: '◇', portrait: '/alchemy/portraits/corinne.jpg', damage: 15, bio: '以精密的切工調整鍊金反應，談吐優雅，做每件事都像在打磨一顆寶石。' },
  { id: 'nina', name: '妮娜', gender: '女', race: '人類', job: '風香鍊金術士', skill: '香風擴散', icon: '❧', portrait: '/alchemy/portraits/nina.jpg', damage: 13, bio: '把香氣當成記憶的線索，能從一縷風分辨附近的植物，也最愛結交新朋友。' },
  { id: 'sola', name: '索菈', gender: '女', race: '人類', job: '日暈鍊金術士', skill: '日鏡折光', icon: '☀', portrait: '/alchemy/portraits/sola.jpg', damage: 16, bio: '用鏡面收集陽光，總想找出能讓陰雨天也明亮起來的配方。' },
  { id: 'luka', name: '露卡', gender: '女', race: '人類', job: '發酵鍊金術士', skill: '酵香爆發', icon: '♧', portrait: '/alchemy/portraits/luka.jpg', damage: 13, bio: '相信時間能把平凡果實釀成驚喜，經常帶著小木桶和爽朗笑聲旅行。' },
  { id: 'yuna', name: '優娜', gender: '女', race: '人類', job: '雲絲鍊金術士', skill: '雲線束縛', icon: '☁', portrait: '/alchemy/portraits/yuna.jpg', damage: 14, bio: '能把霧氣抽成細絲，在山谷裡追尋一種據說只會在晴天出現的雲。' },
  { id: 'celia', name: '賽莉亞', gender: '女', race: '人類', job: '茶香鍊金術士', skill: '茶霧迴旋', icon: '♨', portrait: '/alchemy/portraits/celia.jpg', damage: 12, bio: '細心研究葉片、溫度與水質，總在隊伍疲倦時泡出恰到好處的一杯茶。' },
  { id: 'kaede', name: '楓', gender: '女', race: '人類', job: '花火鍊金術士', skill: '彩焰散華', icon: '✺', portrait: '/alchemy/portraits/kaede.jpg', damage: 17, bio: '熱愛短暫卻耀眼的火花，會把每次實驗的意外畫成新的煙火設計圖。' },
  { id: 'orla', name: '歐拉', gender: '女', race: '人類', job: '色彩鍊金術士', skill: '虹彩飛濺', icon: '🎨', portrait: '/alchemy/portraits/orla.jpg', damage: 14, bio: '從植物與礦石提煉顏料，喜歡用畫筆替陌生城鎮留下明亮的記憶。' },
  { id: 'rhea', name: '蕾雅', gender: '女', race: '人類', job: '鹽晶鍊金術士', skill: '晶鹽風暴', icon: '◇', portrait: '/alchemy/portraits/rhea.jpg', damage: 15, bio: '懂得保存遠征食物，也能讓鹽晶排列成堅固的防禦圖案。' },
  { id: 'hilda', name: '希爾達', gender: '女', race: '人類', job: '紙藝鍊金術士', skill: '折翼紙群', icon: '✉', portrait: '/alchemy/portraits/hilda.jpg', damage: 13, bio: '把記錄公式的紙張折成能飛的信使，桌上總留著一張給遠方家人的明信片。' },
  { id: 'sasha', name: '莎夏', gender: '女', race: '人類', job: '冰露鍊金術士', skill: '霜露碎晶', icon: '❄', portrait: '/alchemy/portraits/sasha.jpg', damage: 16, bio: '擅長在炎熱地方保存冷露，最拿手的是為同伴製作一瓶清涼飲品。' },
  { id: 'elise', name: '艾莉絲', gender: '女', race: '人類', job: '蜜糖鍊金術士', skill: '琥蜜流星', icon: '🍯', portrait: '/alchemy/portraits/elise.jpg', damage: 13, bio: '以花蜜調出甜美又可靠的補給品，總能記住每位同伴喜歡的口味。' },
  { id: 'talia', name: '塔莉亞', gender: '女', race: '人類', job: '織紋鍊金術士', skill: '星線纏繞', icon: '✦', portrait: '/alchemy/portraits/talia.jpg', damage: 15, bio: '將元素紋路織進布料，做出的披風既輕盈又能承受旅途風雨。' },
  { id: 'noemi', name: '諾艾蜜', gender: '女', race: '人類', job: '化石鍊金術士', skill: '古紋回響', icon: '◉', portrait: '/alchemy/portraits/noemi.jpg', damage: 16, bio: '從化石裡尋找失落的生態線索，喜歡一邊走路一邊講古代故事。' },
  { id: 'maris', name: '瑪莉絲', gender: '女', race: '人類', job: '海霧鍊金術士', skill: '霧潮屏障', icon: '◌', portrait: '/alchemy/portraits/maris.jpg', damage: 14, bio: '在港都長大的蒸餾師，能從鹹濕空氣裡提取魔力，遇到迷航者總會先伸出援手。' },
  { id: 'ivette', name: '伊薇特', gender: '女', race: '人類', job: '野莓鍊金術士', skill: '莓晶連彈', icon: '❦', portrait: '/alchemy/portraits/ivette.jpg', damage: 15, bio: '熟知山間野果的性質，把甜酸果汁調成藥劑，也會帶著同伴尋找最好的野餐地點。' },
  { id: 'clara', name: '克菈拉', gender: '女', race: '人類', job: '風鈴鍊金術士', skill: '鈴音共振', icon: '♫', portrait: '/alchemy/portraits/clara.jpg', damage: 14, bio: '以金屬與微風調製共鳴鈴，能靠聲音辨認遠方的地形與危險。' },
  { id: 'devina', name: '黛薇娜', gender: '女', race: '人類', job: '露珠鍊金術士', skill: '晨露折射', icon: '◇', portrait: '/alchemy/portraits/devina.jpg', damage: 13, bio: '每天清晨記錄不同葉尖的露水，對細微變化的耐心常替隊伍找到意外線索。' },
  { id: 'fenna', name: '芬娜', gender: '女', race: '人類', job: '赤陶鍊金術士', skill: '陶片飛旋', icon: '◈', portrait: '/alchemy/portraits/fenna.jpg', damage: 17, bio: '出身陶工家族，能把普通泥土燒成堅韌器具，笑稱每一道裂紋都是新配方。' },
  { id: 'lyra', name: '莉菈', gender: '女', race: '人類', job: '螢星鍊金術士', skill: '星點迸散', icon: '✦', portrait: '/alchemy/portraits/lyra.jpg', damage: 16, bio: '追逐夜光昆蟲與流星的研究者，會在旅途日記裡替每位同伴畫下一顆星。' },
  { id: 'isabel', name: '伊莎貝爾', gender: '女', race: '人類', job: '珊瑚鍊金術士', skill: '珊瑚脈動', icon: '❀', portrait: '/alchemy/portraits/isabel.jpg', damage: 15, bio: '守護海灣珊瑚的學者，善於讓脆弱的結構重新生長，也珍惜每段遠征友誼。' },
  { id: 'anika', name: '安妮卡', gender: '女', race: '人類', job: '香料鍊金術士', skill: '暖香旋風', icon: '♨', portrait: '/alchemy/portraits/anika.jpg', damage: 14, bio: '在商隊中學會辨識各地香料，調出的香霧能安定同伴、擾亂怪物的嗅覺。' },
  { id: 'veina', name: '薇娜', gender: '女', race: '人類', job: '琥珀鍊金術士', skill: '琥光封存', icon: '✧', portrait: '/alchemy/portraits/veina.jpg', damage: 16, bio: '研究樹脂封存的遠古記憶，總隨身帶著一塊未解讀的琥珀。' },
  { id: 'rosia', name: '羅希亞', gender: '女', race: '人類', job: '花鹽鍊金術士', skill: '花鹽晶雨', icon: '✿', portrait: '/alchemy/portraits/rosia.jpg', damage: 15, bio: '把鹽田與花圃的素材結合，能在乾燥荒地調出讓植物重新生長的配方。' },
  { id: 'rowan', name: '羅恩', gender: '男', race: '人類', job: '調律鍊金術士', skill: '元素共鳴', icon: '◈', portrait: '/alchemy/portraits/rowan.jpg', damage: 14, bio: '習慣先觀察再動手的調律師，能讓不相容的素材找到短暫而美麗的平衡。' },
  { id: 'cassian', name: '卡西安', gender: '男', race: '人類', job: '星象鍊金術士', skill: '星軌衝擊', icon: '✺', portrait: '/alchemy/portraits/cassian.jpg', damage: 16, bio: '攜帶古老星盤旅行的學者，相信每個地區的夜空都藏著不同的鍊金公式。' },
  { id: 'toma', name: '托瑪', gender: '男', race: '人類', job: '工匠鍊金術士', skill: '熱能投擲', icon: '⚗', portrait: '/alchemy/portraits/toma.jpg', damage: 13, bio: '擅長把損壞的工具改裝成新道具，樂觀健談，總能讓工房恢復熱鬧。' },
  { id: 'evan', name: '伊凡', gender: '男', race: '人類', job: '機巧鍊金術士', skill: '齒輪齊射', icon: '⚙', portrait: '/alchemy/portraits/evan.jpg', damage: 15, bio: '口袋裡永遠裝著會走的小機械，對古代裝置的謎題有驚人的耐心。' },
  { id: 'soren', name: '索倫', gender: '男', race: '人類', job: '墨影鍊金術士', skill: '暗紋書寫', icon: '✒', portrait: '/alchemy/portraits/soren.jpg', damage: 16, bio: '研究會變色的鍊金墨水，以寡言著稱，卻會為同伴留下最詳盡的旅行紀錄。' }
];

export const PARTY = [
  { id: 'guardian', name: '艾登', race: '人類', job: '守護劍士', skill: '鋼盾斬', icon: '⚔', portrait: '/alchemy/portraits/guardian.png', damage: 18, bio: '總是先站到隊友前方的劍士，盾上的刻痕記著他守護過的每一段旅程。' },
  { id: 'botanist', name: '瑟里安', race: '森靈', job: '採集師', skill: '藤蔓箭', icon: '❧', portrait: '/alchemy/portraits/botanist.png', damage: 11, bio: '能辨認森林裡最細微的聲音，採集前會先確認環境能否自然恢復。' },
  { id: 'artisan', name: '朵拉', race: '矮人', job: '工匠', skill: '鍊金重錘', icon: '⚒', portrait: '/alchemy/portraits/artisan.png', damage: 16, bio: '一手好鍛造技術的工匠，對器具很嚴格，對同伴卻出奇地體貼。' },
  { id: 'ranger', name: '薇拉', race: '森靈', job: '遊俠', skill: '疾風箭', icon: '🏹', portrait: '/alchemy/portraits/ranger.jpg', damage: 17, bio: '在樹冠間行走如同平地，總能第一個找出安全的路線。' },
  { id: 'mage', name: '雷恩', race: '人類', job: '雷術師', skill: '閃電鏈', icon: '⚡', portrait: '/alchemy/portraits/mage.jpg', damage: 19, bio: '專注於瞬間爆發的雷術，平時卻喜歡安靜地聽雨聲。' },
  { id: 'healer', name: '諾雅', race: '人類', job: '治療師', skill: '光羽術', icon: '✚', portrait: '/alchemy/portraits/healer.jpg', damage: 10, bio: '攜帶一盞不會熄滅的燈，細心照看每個疲憊的冒險者。' },
  { id: 'rogue', name: '凱洛', race: '人類', job: '斥候', skill: '雙刃連擊', icon: '◆', portrait: '/alchemy/portraits/rogue.jpg', damage: 20, bio: '身手敏捷的偵察者，能從遺跡的地面痕跡判斷機關所在。' },
  { id: 'lancer', name: '伊莎', race: '人類', job: '槍術士', skill: '流星突刺', icon: '♜', portrait: '/alchemy/portraits/lancer.jpg', damage: 18, bio: '長槍與步伐都經過嚴格訓練，對自己與同伴有相同的高標準。' },
  { id: 'scholar', name: '奧里', race: '人類', job: '學者', skill: '符文解放', icon: '📖', portrait: '/alchemy/portraits/scholar.jpg', damage: 14, bio: '隨身帶著厚重的筆記，看到未解讀的文字便忍不住停下腳步。' },
  { id: 'beastkeeper', name: '芙蕾', race: '人類', job: '馴獸師', skill: '靈狐協擊', icon: '🐾', portrait: '/alchemy/portraits/beastkeeper.jpg', damage: 16, bio: '能與野獸建立信任，肩上的小狐狸也是隊伍裡最警覺的哨兵。' },
  { id: 'dancer', name: '緋娜', race: '人類', job: '刃舞者', skill: '緋帶旋斬', icon: '✿', portrait: '/alchemy/portraits/dancer.jpg', damage: 18, bio: '以舞步化解敵人的節奏，流動的緋紅刀帶總讓戰場像一場演出。' },
  { id: 'mechanic', name: '赫奇', race: '人類', job: '機巧師', skill: '機蜂轟擊', icon: '⚙', portrait: '/alchemy/portraits/mechanic.jpg', damage: 15, bio: '帶著自製的機械蜂巡查道路，遇到故障裝置總忍不住拆開研究。' },
  { id: 'bard', name: '露娜', race: '人類', job: '吟遊詩人', skill: '共鳴音波', icon: '♫', portrait: '/alchemy/portraits/bard.jpg', damage: 13, bio: '把沿途見聞寫成歌，擅長用旋律穩定隊伍的情緒。' },
  { id: 'monk', name: '薩姆', race: '人類', job: '武僧', skill: '震地掌', icon: '☯', portrait: '/alchemy/portraits/monk.jpg', damage: 19, bio: '以規律的呼吸與訓練磨練力量，危急時仍能保持沉著。' },
  { id: 'oracle', name: '伊蓮', race: '人類', job: '占星祭司', skill: '預兆光環', icon: '☼', portrait: '/alchemy/portraits/oracle.jpg', damage: 12, bio: '從水晶盤裡讀取可能的未來，總提醒大家命運仍能靠自己改寫。' },
  { id: 'captain', name: '馬克斯', race: '人類', job: '航海船長', skill: '潮刃破浪', icon: '⚓', portrait: '/alchemy/portraits/captain.jpg', damage: 17, bio: '熟悉群島風向與暗流的船長，能讓隊伍穿過最難走的海岸。' },
  { id: 'cook', name: '梅莎', race: '人類', job: '野營主廚', skill: '香料火焰', icon: '♨', portrait: '/alchemy/portraits/cook.jpg', damage: 14, bio: '善用稀奇素材做出溫暖的一餐，是遠征途中最受歡迎的夥伴。' },
  { id: 'geomancer', name: '伯洛', race: '矮人', job: '地脈術士', skill: '岩脈隆起', icon: '◈', portrait: '/alchemy/portraits/geomancer.jpg', damage: 18, bio: '聽得懂礦層的震動，能在地下找到穩定的通道與珍稀原石。' },
  { id: 'tidecaller', name: '席薇', race: '人類', job: '水律師', skill: '渦流迴旋', icon: '≈', portrait: '/alchemy/portraits/tidecaller.jpg', damage: 16, bio: '能以水流變換攻守，說話柔和，遇上危險時卻從不退縮。' },
  { id: 'duelist', name: '維克', race: '人類', job: '細劍決鬥家', skill: '銀線連刺', icon: '♠', portrait: '/alchemy/portraits/duelist.jpg', damage: 21, bio: '講究速度與精準的決鬥家，每次出手前都會先向對手致意。' },
  { id: 'cartographer', name: '黛芙', gender: '女', race: '人類', job: '地圖測繪師', skill: '方位標記', icon: '🗺', portrait: '/alchemy/portraits/cartographer.jpg', damage: 14, bio: '只要走過一次便能畫出精確路線，最喜歡替隊伍找一條看見夕陽的新道路。' },
  { id: 'lighthousekeeper', name: '奧薇', gender: '女', race: '人類', job: '燈塔守望者', skill: '遠燈照射', icon: '⌁', portrait: '/alchemy/portraits/lighthousekeeper.jpg', damage: 15, bio: '能從光色判斷天候，曾守住一整個暴風夜的港口航線。' },
  { id: 'beekeeper', name: '蜜兒', gender: '女', race: '人類', job: '蜂語使', skill: '蜜蜂合擊', icon: '✿', portrait: '/alchemy/portraits/beekeeper.jpg', damage: 13, bio: '懂得蜂群留下的訊號，也會提醒大家採蜜時要替花園留一份。' },
  { id: 'sandrunner', name: '黎沙', gender: '女', race: '人類', job: '沙原跑者', skill: '流沙突進', icon: '➶', portrait: '/alchemy/portraits/sandrunner.jpg', damage: 18, bio: '靠腳步與風向穿越沙地，越是難走的路，她越能笑著跑在最前面。' },
  { id: 'sailmaker', name: '斐兒', gender: '女', race: '人類', job: '製帆師', skill: '風帆展擊', icon: '⛵', portrait: '/alchemy/portraits/sailmaker.jpg', damage: 14, bio: '能把輕布縫成抗風的船帆，也樂於替同伴修補磨破的背包。' },
  { id: 'diver', name: '芽衣', gender: '女', race: '人類', job: '潛水採珠人', skill: '珍珠水彈', icon: '◌', portrait: '/alchemy/portraits/diver.jpg', damage: 16, bio: '熟悉潮間帶的呼吸節奏，水面下的細小光點幾乎逃不過她的眼睛。' },
  { id: 'seamstress', name: '紗耶', gender: '女', race: '人類', job: '戰地裁縫師', skill: '絲線牽制', icon: '🪡', portrait: '/alchemy/portraits/seamstress.jpg', damage: 14, bio: '能在行進間修好護具，還會把隊伍的標誌巧妙縫進每件披風。' },
  { id: 'appraiser', name: '琴恩', gender: '女', race: '人類', job: '寶物鑑定師', skill: '破綻識別', icon: '🔍', portrait: '/alchemy/portraits/appraiser.jpg', damage: 15, bio: '一眼看出器物的來歷，遇到來路不明的寶石時總會先查清故事。' },
  { id: 'falconer', name: '璐璐', gender: '女', race: '人類', job: '空郵信使', skill: '鷹隼俯衝', icon: '🪶', portrait: '/alchemy/portraits/falconer.jpg', damage: 17, bio: '和夥伴鷹隼送信穿越山谷，從不讓重要的消息迷失在風裡。' },
  { id: 'diplomat', name: '艾芙', gender: '女', race: '人類', job: '商隊談判官', skill: '言語震盪', icon: '✧', portrait: '/alchemy/portraits/diplomat.jpg', damage: 12, bio: '善於化解陌生人之間的緊張，總能用一封信替冒險隊打開新的門。' },
  { id: 'kiteguide', name: '晴音', gender: '女', race: '人類', job: '飛鳶嚮導', skill: '高空標記', icon: '🪁', portrait: '/alchemy/portraits/kiteguide.jpg', damage: 14, bio: '用飛鳶測量風向，帶旅人找到山口的安全道路。' },
  { id: 'rainkeeper', name: '沐蘭', gender: '女', race: '森靈', job: '雨林守望者', skill: '雨幕護陣', icon: '☂', portrait: '/alchemy/portraits/rainkeeper.jpg', damage: 13, bio: '熟悉雨林每種水聲，能在暴雨前替隊伍找好營地。' },
  { id: 'orchardist', name: '柚梨', gender: '女', race: '人類', job: '果園管理師', skill: '枝葉連擊', icon: '🍐', portrait: '/alchemy/portraits/orchardist.jpg', damage: 14, bio: '能分辨果實成熟的時刻，也會用修枝刀保護身旁夥伴。' },
  { id: 'dunehealer', name: '薩菲', gender: '女', race: '人類', job: '沙漠醫師', skill: '涼泉治癒', icon: '✚', portrait: '/alchemy/portraits/dunehealer.jpg', damage: 11, bio: '在沙地行醫多年，背包裡永遠有足夠的水和繃帶。' },
  { id: 'pearlguard', name: '奈麗', gender: '女', race: '人類', job: '珍珠衛士', skill: '白珠衝刺', icon: '⚔', portrait: '/alchemy/portraits/pearlguard.jpg', damage: 18, bio: '守衛海港的槍手，習慣先確認船員安全才收起武器。' },
  { id: 'flowerknight', name: '芮娜', gender: '女', race: '人類', job: '花庭騎士', skill: '薔薇突刺', icon: '🌹', portrait: '/alchemy/portraits/flowerknight.jpg', damage: 19, bio: '效忠開放的公共花園，相信美景應該讓每位旅人都能享有。' },
  { id: 'waterdancer', name: '漣娜', gender: '女', race: '人類', job: '水舞師', skill: '旋水雙刃', icon: '≈', portrait: '/alchemy/portraits/waterdancer.jpg', damage: 17, bio: '以舞步控制水刃，擅長在狹窄橋面保護隊形。' },
  { id: 'archivist', name: '璃書', gender: '女', race: '人類', job: '古卷典藏師', skill: '書頁封印', icon: '📜', portrait: '/alchemy/portraits/archivist.jpg', damage: 12, bio: '修復過無數破損古卷，能從塗改的筆跡猜出失傳公式。' },
  { id: 'courier', name: '雲霏', gender: '女', race: '人類', job: '山道快遞員', skill: '疾步連擊', icon: '➶', portrait: '/alchemy/portraits/courier.jpg', damage: 16, bio: '跑遍山間郵路，答應送出的信從不讓它遲到。' },
  { id: 'glassblower', name: '艾格妮', gender: '女', race: '矮人', job: '玻璃吹製師', skill: '熱玻衝波', icon: '◉', portrait: '/alchemy/portraits/glassblower.jpg', damage: 16, bio: '能吹出耐高溫的鍊金瓶，也愛分享工坊火爐旁的故事。' },
  { id: 'herbalist', name: '蓓蕾', gender: '女', race: '森靈', job: '山野藥師', skill: '草葉飛針', icon: '🌿', portrait: '/alchemy/portraits/herbalist.jpg', damage: 13, bio: '尊重每一株草藥的生長，採集後總會重新播下一粒種子。' },
  { id: 'starguard', name: '朵星', gender: '女', race: '人類', job: '星塔哨兵', skill: '星光箭雨', icon: '✦', portrait: '/alchemy/portraits/starguard.jpg', damage: 18, bio: '從塔頂守望夜空，也能在地面迅速找到敵人的破綻。' },
  { id: 'tideengineer', name: '琴汐', gender: '女', race: '人類', job: '潮汐工程師', skill: '水輪震擊', icon: '⚙', portrait: '/alchemy/portraits/tideengineer.jpg', damage: 15, bio: '會修水閘和潮力機械，常把回收零件變成可靠的新工具。' },
  { id: 'windweaver', name: '蕾菲', gender: '女', race: '森靈', job: '風紋織師', skill: '風布束縛', icon: '❧', portrait: '/alchemy/portraits/windweaver.jpg', damage: 14, bio: '織出能借風滑行的布，喜歡替新朋友縫上一枚旅途徽章。' },
  { id: 'festivalist', name: '蜜雅', gender: '女', race: '人類', job: '節慶策畫師', skill: '彩光禮炮', icon: '🎉', portrait: '/alchemy/portraits/festivalist.jpg', damage: 15, bio: '把慶典搬到偏遠村莊，讓旅途辛勞的人也有開懷的一天。' }
];

const originalAlchemistIds = ['lia', 'fiona', 'mirelle', 'selene', 'brina', 'ayla', 'corinne', 'nina', 'rowan', 'cassian', 'toma', 'evan', 'soren'];
const originalCompanionIds = ['guardian', 'botanist', 'artisan', 'ranger', 'mage', 'healer', 'rogue', 'lancer', 'scholar', 'beastkeeper', 'dancer', 'mechanic', 'bard', 'monk', 'oracle', 'captain', 'cook', 'geomancer', 'tidecaller', 'duelist'];
const latestAlchemistIds = new Set(['maris', 'ivette', 'clara', 'devina', 'fenna', 'lyra', 'isabel', 'anika', 'veina', 'rosia']);
const latestCompanionIds = new Set(['kiteguide', 'rainkeeper', 'orchardist', 'dunehealer', 'pearlguard', 'flowerknight', 'waterdancer', 'archivist', 'courier', 'glassblower', 'herbalist', 'starguard', 'tideengineer', 'windweaver', 'festivalist']);
export const PREVIOUS_ALCHEMIST_IDS = [originalAlchemistIds, ALCHEMISTS.filter(person => !latestAlchemistIds.has(person.id)).map(person => person.id)];
export const PREVIOUS_COMPANION_IDS = [originalCompanionIds, PARTY.filter(person => !latestCompanionIds.has(person.id)).map(person => person.id)];

export function visibleCharacterIds(saved, roster, previousIdSets) {
  const allIds = roster.map(person => person.id);
  if (!Array.isArray(saved)) return allIds;
  const selected = new Set(saved);
  // Expand only exact historical full-roster selections; preserve deliberate custom subsets.
  if (previousIdSets.some(ids => ids.length === selected.size && ids.every(id => selected.has(id)))) return allIds;
  return allIds.filter(id => selected.has(id));
}

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
