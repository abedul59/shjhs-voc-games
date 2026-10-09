<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const GAME = '單字便利商店';
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const goods = [
  { id: 'tea', name: '瓶裝茶', icon: '🍵', cost: 18, base: 32, category: 'drink' },
  { id: 'water', name: '礦泉水', icon: '💧', cost: 10, base: 22, category: 'drink' },
  { id: 'milk', name: '鮮乳', icon: '🥛', cost: 22, base: 38, category: 'drink' },
  { id: 'rice', name: '飯糰', icon: '🍙', cost: 22, base: 39, category: 'food' },
  { id: 'bento', name: '便當', icon: '🍱', cost: 48, base: 79, category: 'food' },
  { id: 'bread', name: '麵包', icon: '🥐', cost: 20, base: 36, category: 'food' },
  { id: 'chips', name: '洋芋片', icon: '🥔', cost: 24, base: 42, category: 'snack' },
  { id: 'candy', name: '糖果', icon: '🍬', cost: 12, base: 25, category: 'snack' },
  { id: 'tissue', name: '面紙', icon: '🧻', cost: 15, base: 30, category: 'daily' },
  { id: 'battery', name: '電池', icon: '🔋', cost: 33, base: 55, category: 'daily' }
];
const fixtures = {
  shelf: { name: '商品架', icon: '🛒', cost: 280, accepts: ['snack', 'daily'], group: 'basic', hint: '陳列零食與日用品' },
  fridge: { name: '冷藏櫃', icon: '🥤', cost: 480, accepts: ['drink', 'food'], group: 'basic', hint: '陳列飲料與冷藏鮮食' },
  warmer: { name: '保溫櫃', icon: '🍱', cost: 430, accepts: ['food'], group: 'basic', hint: '陳列熱食與鮮食' },
  counter: { name: '收銀台', icon: '💳', cost: 650, accepts: [], group: 'basic', hint: '開店結帳必備' },
  coffee: { name: '現煮咖啡機', icon: '☕', cost: 540, accepts: [], group: 'food', hourlyIncome: 20, hint: '每小時服務收入 $20' },
  tea: { name: '現萃茶機', icon: '🫖', cost: 620, accepts: [], group: 'food', hourlyIncome: 15, hint: '每小時服務收入 $15' },
  microwave: { name: '微波爐', icon: '♨️', cost: 360, accepts: [], group: 'food', traffic: 1, hint: '每小時多吸引 1 位顧客' },
  hotfood: { name: '熱食台', icon: '🍢', cost: 510, accepts: ['food'], group: 'food', hint: '可陳列鮮食' },
  softserve: { name: '霜淇淋機', icon: '🍦', cost: 760, accepts: [], group: 'food', hourlyIncome: 18, hint: '每小時服務收入 $18' },
  hotwater: { name: '熱水機', icon: '🚰', cost: 240, accepts: [], group: 'food', traffic: 1, hint: '每小時多吸引 1 位顧客' },
  atm: { name: '提款機', icon: '🏧', cost: 820, accepts: [], group: 'service', hourlyIncome: 15, hint: '每小時服務收入 $15' },
  kiosk: { name: '多媒體機', icon: '🎟️', cost: 900, accepts: [], group: 'service', hourlyIncome: 18, hint: '票券與繳費，每小時 $18' },
  printer: { name: '影印列印機', icon: '🖨️', cost: 580, accepts: [], group: 'service', hourlyIncome: 10, hint: '每小時服務收入 $10' },
  parcel: { name: '寄取貨櫃', icon: '📦', cost: 490, accepts: [], group: 'service', hourlyIncome: 14, hint: '每小時服務收入 $14' },
  seats: { name: '座位區', icon: '🪑', cost: 420, accepts: [], group: 'comfort', traffic: 2, hint: '每小時多吸引 2 位顧客' },
  recycling: { name: '回收機', icon: '♻️', cost: 570, accepts: [], group: 'comfort', traffic: 1, hint: '每小時多吸引 1 位顧客' }
};
const fixturePalette = {
  coffee: ['#ead3b2', '#8b5047', '#623a39'], tea: ['#d9e8c4', '#6d9d75', '#47785f'],
  microwave: ['#f2f1e8', '#a5afb4', '#68767e'], hotwater: ['#e1eef0', '#7fa6b5', '#547d8e'],
  softserve: ['#fff4dc', '#db91a7', '#b96881'], atm: ['#d3e0e3', '#64889c', '#405e72'],
  kiosk: ['#dce6f3', '#5880a2', '#36587c'], printer: ['#f5f5ef', '#b1b6ba', '#818990'],
  parcel: ['#e6d3a8', '#a4744d', '#75513c'], seats: ['#d9edcc', '#70926c', '#52764e'],
  recycling: ['#ddf1dd', '#67a88b', '#3f796c']
};
const fixtureGroups = [
  { id: 'basic', name: '基本陳列' }, { id: 'food', name: '即食飲品' },
  { id: 'service', name: '便民服務' }, { id: 'comfort', name: '店面環境' }
];
const GRID_COLS = 7;
const GRID_ROWS = 5;
const TILE_COUNT = GRID_COLS * GRID_ROWS;
const ENTRANCE_TILE = 31;
const districts = [
  { id: 'residential', name: '住宅區', hint: '飲料、日用品需求較高', boost: ['drink', 'daily'] },
  { id: 'school', name: '學校旁', hint: '點心、飯糰需求較高', boost: ['snack', 'food'] },
  { id: 'station', name: '車站前', hint: '便當、飲料需求較高', boost: ['food', 'drink'] }
];
const initialTiles = () => Array.from({ length: TILE_COUNT }, () => ({ type: '', product: '', stock: 0 }));
const initialStore = () => ({
  name: '街角單字商店', district: '', cash: 2500, day: 1, hour: 9, reputation: 55,
  tiles: initialTiles(), warehouse: Object.fromEntries(goods.map(item => [item.id, 0])),
  prices: Object.fromEntries(goods.map(item => [item.id, item.base])),
  staff: 0, adHours: 0, decorLevel: 0, visitors: 0, sold: 0, revenue: 0, expenses: 0,
  lastVisitors: 0, lastSales: 0, notices: ['歡迎開店！先選商圈，再自己配置收銀台、貨架與商品。']
});
const store = ref(initialStore());
const words = ref([]);
const loading = ref(true);
const selected = ref(ENTRANCE_TILE - 1);
const fixtureGroup = ref('basic');
const pendingDemolition = ref(null);
const sceneNow = ref(0);
const sceneStartAt = ref(0);
let flowTimer;
const productId = ref('tea');
const orderQty = ref(10);
const priceInput = ref(32);
const quiz = ref(null);
const quizAnswer = ref('');
const quizGap = ref(30);
const nextQuizAt = ref(0);
const correctWords = ref([]);
const wrongWords = ref([]);
const sessionStart = ref(0);
const sessionRevenueStart = ref(0);
const sessionId = ref('');
const saveMessage = ref('');
const playing = ref(true);
const storageKey = computed(() => `vocab-store-v1:${student.value?.id || 'guest'}:${lesson.version}:${lesson.volume}:${lesson.unit}`);
const currentTile = computed(() => store.value.tiles[selected.value] || { type: '', product: '', stock: 0 });
const product = computed(() => goods.find(item => item.id === productId.value) || goods[0]);
const score = computed(() => Math.max(0, Math.round((store.value.revenue - sessionRevenueStart.value) / 20 + correctWords.value.length * 20 - wrongWords.value.length * 5)));
const historyLink = computed(() => ({ path: '/history', query: { game: GAME } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME, ...lesson } }));
const selectedDistrict = computed(() => districts.find(item => item.id === store.value.district));
const visibleFixtures = computed(() => Object.entries(fixtures).filter(([, fixture]) => fixture.group === fixtureGroup.value));
const sceneTiles = computed(() => store.value.tiles.map((tile, index) => ({ tile, index }))
  .sort((a, b) => (a.index % GRID_COLS + Math.floor(a.index / GRID_COLS)) - (b.index % GRID_COLS + Math.floor(b.index / GRID_COLS))));
const visitorAppearance = [
  { shirt: '#df805c', shade: '#aa5945', hair: '#41302e', skin: '#efc49b' },
  { shirt: '#6b9cc1', shade: '#467492', hair: '#4b3430', skin: '#eab489' },
  { shirt: '#a987c2', shade: '#775e96', hair: '#2f282d', skin: '#d79e76' },
  { shirt: '#79aa7a', shade: '#527e59', hair: '#725044', skin: '#f3d0a8' },
  { shirt: '#d4a052', shade: '#a77b3f', hair: '#d5b78b', skin: '#edbf97' }
];
const tileCenter = index => ({ x: 520 + (index % GRID_COLS - Math.floor(index / GRID_COLS)) * 80,
  y: 150 + (index % GRID_COLS + Math.floor(index / GRID_COLS) + 1) * 42 });
const tilePolygon = index => {
  const { x, y } = tileCenter(index);
  return `${x},${y - 42} ${x + 80},${y} ${x},${y + 42} ${x - 80},${y}`;
};
const tileProduct = tile => goods.find(item => item.id === tile.product);
const tileName = tile => fixtures[tile.type]?.name || '空地';
const canPlaceProduct = computed(() => fixtures[currentTile.value.type]?.accepts.includes(product.value.category));
const demolitionCost = computed(() => currentTile.value.type ? Math.max(40, Math.round((fixtures[currentTile.value.type]?.cost || 0) * .12)) : 0);
const decorCost = computed(() => [180, 320, 500][store.value.decorLevel] || 0);
const neighbors = index => [index - GRID_COLS, index + GRID_COLS,
  ...(index % GRID_COLS ? [index - 1] : []), ...(index % GRID_COLS < GRID_COLS - 1 ? [index + 1] : [])]
  .filter(next => next >= 0 && next < TILE_COUNT);
const visitorRoutes = computed(() => {
  const tiles = store.value.tiles;
  const free = new Set(tiles.map((tile, index) => tile.type ? -1 : index).filter(index => index >= 0));
  if (!free.size || !store.value.district || !store.value.lastVisitors || !tiles.some(tile => tile.type === 'counter')) return [];
  const start = free.has(ENTRANCE_TILE) ? ENTRANCE_TILE : [...free].sort((a, b) => Math.abs(a % GRID_COLS - 3) + Math.abs(Math.floor(a / GRID_COLS) - 4)
    - Math.abs(b % GRID_COLS - 3) - Math.abs(Math.floor(b / GRID_COLS) - 4))[0];
  const findPath = (from, to) => {
    const parents = new Map([[from, null]]);
    const queue = [from];
    for (const index of queue) {
      if (index === to) break;
      for (const next of neighbors(index)) if (free.has(next) && !parents.has(next)) {
        parents.set(next, index);
        queue.push(next);
      }
    }
    if (!parents.has(to)) return [];
    const path = [];
    for (let index = to; index !== null; index = parents.get(index)) path.unshift(index);
    return path;
  };
  const reachable = [...free].filter(index => findPath(start, index).length);
  const checkoutStops = reachable.filter(index => neighbors(index).some(next => tiles[next].type === 'counter'));
  return Array.from({ length: Math.min(5, store.value.lastVisitors) }, (_, id) => {
    let seed = (store.value.day * 7919 + store.value.hour * 313 + id * 1013) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const stops = reachable.filter(index => index !== start);
    for (let index = stops.length - 1; index > 0; index--) {
      const next = Math.floor(random() * (index + 1));
      [stops[index], stops[next]] = [stops[next], stops[index]];
    }
    const route = [start];
    let current = start;
    for (const stop of stops) {
      route.push(...findPath(current, stop).slice(1));
      current = stop;
    }
    const checkout = checkoutStops[id % checkoutStops.length] ?? start;
    route.push(...findPath(current, checkout).slice(1));
    const points = [{ x: 390, y: 512 }, ...route.map(index => ({ x: tileCenter(index).x, y: tileCenter(index).y - 18 }))];
    const segments = [];
    for (let index = 1; index < points.length; index++) segments.push({ from: points[index - 1], to: points[index], duration: index === 1 ? 850 : 620 });
    const checkoutPoint = points[points.length - 1];
    segments.push({ from: checkoutPoint, to: checkoutPoint, duration: 3200 + id * 250, waiting: true });
    let returningFrom = checkoutPoint;
    for (const index of findPath(checkout, start).slice(1)) {
      const next = { x: tileCenter(index).x, y: tileCenter(index).y - 18 };
      segments.push({ from: returningFrom, to: next, duration: 620 });
      returningFrom = next;
    }
    segments.push({ from: returningFrom, to: points[0], duration: 850 });
    return { id, segments, total: segments.reduce((sum, segment) => sum + segment.duration, 0) };
  });
});
const visitorPositions = computed(() => visitorRoutes.value.map(route => {
  let elapsed = sceneNow.value - sceneStartAt.value - route.id * 1100;
  if (elapsed < 0) return null;
  elapsed %= route.total + 1300;
  if (elapsed >= route.total) return null;
  for (const segment of route.segments) {
    if (elapsed < segment.duration) {
      const progress = elapsed / segment.duration;
      return { id: route.id, x: segment.from.x + (segment.to.x - segment.from.x) * progress,
        y: segment.from.y + (segment.to.y - segment.from.y) * progress, waiting: Boolean(segment.waiting) };
    }
    elapsed -= segment.duration;
  }
  return null;
}).filter(Boolean));

function say(message) {
  store.value.notices = [message, ...store.value.notices].slice(0, 6);
}
function persist() {
  if (import.meta.client) localStorage.setItem(storageKey.value, JSON.stringify(store.value));
}
function selectTile(index) { selected.value = index; pendingDemolition.value = null; }
function selectProduct(id) { productId.value = id; priceInput.value = store.value.prices[id]; }
function askBefore(action) {
  if (quiz.value || !playing.value || loading.value) return;
  if (!store.value.district) { say('請先選擇商圈。'); return; }
  if (words.value.length < 4) { say('本課至少需要四個不同的單字才能經營。'); return; }
  if (Date.now() >= nextQuizAt.value) {
    const word = words.value[Math.floor(Math.random() * words.value.length)];
    const others = words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase())
      .sort(() => Math.random() - .5).slice(0, 3);
    quiz.value = { word, options: [word, ...others].sort(() => Math.random() - .5), action };
    quizAnswer.value = '';
    return;
  }
  action();
}
function answerQuiz() {
  if (!quiz.value || !quizAnswer.value) return;
  const { word, action } = quiz.value;
  const correct = quizAnswer.value === word.en_us;
  if (correct) correctWords.value.push(word.en_us);
  else wrongWords.value.push(word.en_us);
  quiz.value = null;
  quizGap.value = 30 + Math.floor(Math.random() * 11);
  nextQuizAt.value = Date.now() + quizGap.value * 1000;
  if (correct) { say(`答對！${word.zh_tw}＝${word.en_us}，操作完成。`); action(); }
  else say(`答錯了：${word.zh_tw}＝${word.en_us}。本次操作未執行，可再按一次。`);
}
function chooseDistrict(id) {
  if (store.value.district) return;
  store.value.district = id;
  say(`已在${districts.find(item => item.id === id).name}開店。`);
  persist();
}
function build(type) {
  if (selected.value === ENTRANCE_TILE) { say('第 32 格是入口通道，請選其他空格配置設備。'); return; }
  askBefore(() => {
    const fixture = fixtures[type];
    if (currentTile.value.type) { say('這格已有設施，請先點選空地。'); return; }
    if (store.value.cash < fixture.cost) { say('資金不足，無法建造。'); return; }
    store.value.cash -= fixture.cost;
    store.value.expenses += fixture.cost;
    store.value.tiles[selected.value] = { type, product: '', stock: 0 };
    say(`已建造${fixture.name}，花費 $${fixture.cost}。`);
    persist();
  });
}
function demolish() {
  const index = selected.value;
  if (pendingDemolition.value !== index || !store.value.tiles[index]?.type) return;
  askBefore(() => {
    const tile = store.value.tiles[index];
    if (!tile?.type) return;
    const cost = Math.max(40, Math.round((fixtures[tile.type]?.cost || 0) * .12));
    if (store.value.cash < cost) { say(`拆除需要 $${cost}，現金不足。`); return; }
    if (tile.product && tile.stock > 0) store.value.warehouse[tile.product] = (store.value.warehouse[tile.product] || 0) + tile.stock;
    store.value.cash -= cost;
    store.value.expenses += cost;
    store.value.tiles[index] = { type: '', product: '', stock: 0 };
    pendingDemolition.value = null;
    say(`已拆除${tileName(tile)}，費用 $${cost}；架上剩餘商品退回倉庫。`);
    persist();
  });
}
function upgradeDecor() {
  askBefore(() => {
    if (store.value.decorLevel >= 3) { say('店面裝潢已達最高級。'); return; }
    const cost = [180, 320, 500][store.value.decorLevel];
    if (store.value.cash < cost) { say(`裝潢需要 $${cost}，現金不足。`); return; }
    store.value.cash -= cost;
    store.value.expenses += cost;
    store.value.decorLevel++;
    say(`店面裝潢升到 ${store.value.decorLevel} 級，每小時可吸引更多客人。`);
    persist();
  });
}
function order() {
  askBefore(() => {
    const qty = Math.max(1, Math.min(100, Math.trunc(Number(orderQty.value) || 1)));
    const cost = qty * product.value.cost;
    if (store.value.cash < cost) { say(`進貨需要 $${cost}，現金不足。`); return; }
    store.value.cash -= cost;
    store.value.expenses += cost;
    store.value.warehouse[productId.value] += qty;
    say(`${product.value.name}進貨 ${qty} 件，花費 $${cost}。`);
    persist();
  });
}
function stockShelf() {
  askBefore(() => {
    if (!canPlaceProduct.value) { say('請選相符的商品架、冷藏櫃、保溫櫃或熱食台。'); return; }
    const tile = currentTile.value;
    if (tile.stock > 0 && tile.product !== productId.value) { say('請先賣完原有商品，才能換品項。'); return; }
    const count = Math.min(12 - tile.stock, store.value.warehouse[productId.value]);
    if (count <= 0) { say('倉庫沒有商品，或架上已滿 12 件。'); return; }
    tile.product = productId.value;
    tile.stock += count;
    store.value.warehouse[productId.value] -= count;
    say(`已將 ${count} 件${product.value.name}擺到${tileName(tile)}。`);
    persist();
  });
}
function setPrice() {
  askBefore(() => {
    const price = Math.max(product.value.cost + 1, Math.min(200, Math.trunc(Number(priceInput.value) || 0)));
    store.value.prices[productId.value] = price;
    priceInput.value = price;
    say(`${product.value.name}售價調為 $${price}。價格越高，顧客越可能放棄購買。`);
    persist();
  });
}
function hire() {
  askBefore(() => {
    if (store.value.staff >= 3) { say('最多可聘三位店員。'); return; }
    if (store.value.cash < 180) { say('聘用需要 $180。'); return; }
    store.value.cash -= 180;
    store.value.expenses += 180;
    store.value.staff++;
    say(`已聘用第 ${store.value.staff} 位店員；每日每位薪資 $90。`);
    persist();
  });
}
function advertise() {
  askBefore(() => {
    if (store.value.cash < 120) { say('發傳單需要 $120。'); return; }
    store.value.cash -= 120;
    store.value.expenses += 120;
    store.value.adHours = 4;
    say('傳單發出去了！接下來四小時客流增加。');
    persist();
  });
}
function runHour() {
  if (!store.value.tiles.some(tile => tile.type === 'counter')) { say('請先在空格建造收銀台，再開始營業。'); return; }
  askBefore(() => {
    if (!store.value.tiles.some(tile => tile.type === 'counter')) { say('請先建造收銀台。'); return; }
    const district = selectedDistrict.value;
    const serviceTraffic = store.value.tiles.reduce((sum, tile) => sum + (fixtures[tile.type]?.traffic || 0), 0);
    const traffic = Math.max(2, 5 + store.value.staff * 2 + (store.value.adHours > 0 ? 4 : 0)
      + (store.value.decorLevel || 0) * 2 + serviceTraffic + Math.floor(store.value.reputation / 30));
    let sales = 0; let visitors = 0; let missed = 0; let earned = 0;
    const stocked = store.value.tiles.filter(tile => tile.stock > 0 && tile.product);
    for (let i = 0; i < traffic; i++) {
      visitors++;
      if (!stocked.length) { missed++; continue; }
      const options = stocked.filter(tile => tile.stock > 0);
      if (!options.length) { missed++; continue; }
      const tile = options[Math.floor(Math.random() * options.length)];
      const item = goods.find(good => good.id === tile.product);
      const highPrice = store.value.prices[item.id] / item.base;
      const demand = district.boost.includes(item.category) ? .18 : 0;
      if (Math.random() < Math.max(.15, Math.min(.95, .75 + demand - Math.max(0, highPrice - 1) * .65))) {
        tile.stock--;
        sales++;
        earned += store.value.prices[item.id];
      } else missed++;
    }
    const serviceIncome = store.value.tiles.reduce((sum, tile) => sum + (fixtures[tile.type]?.hourlyIncome || 0), 0);
    const hourly = earned + serviceIncome;
    store.value.cash += hourly;
    store.value.revenue += hourly;
    store.value.visitors += visitors;
    store.value.sold += sales;
    store.value.lastVisitors = visitors;
    store.value.lastSales = sales;
    sceneStartAt.value = Date.now();
    sceneNow.value = sceneStartAt.value;
    store.value.reputation = Math.max(0, Math.min(100, store.value.reputation + (sales > missed ? 1 : -2)));
    store.value.hour++;
    if (store.value.adHours > 0) store.value.adHours--;
    if (store.value.hour >= 21) {
      const bills = 120 + store.value.staff * 90;
      store.value.hour = 9;
      store.value.day++;
      store.value.cash -= bills;
      store.value.expenses += bills;
      say(`第 ${store.value.day} 天開店；支付租金和薪資 $${bills}。`);
    }
    say(`本小時 ${visitors} 人來店，賣出 ${sales} 件，商品 $${earned}、服務 $${serviceIncome}，合計 $${hourly}。${missed ? `${missed} 人沒有買到。` : ''}`);
    persist();
  });
}
async function saveSession() {
  if (!student.value?.id || !sessionId.value) return;
  saveMessage.value = '儲存中…';
  const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
    .eq('student_id', String(student.value.id)).eq('game_type', GAME)
    .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
  const { error } = await db.from('game_records').upsert({
    id: sessionId.value, student_id: String(student.value.id), game_type: GAME,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: score.value, mistakes: wrongWords.value.length,
    correct_words: correctWords.value.join(', '), wrong_words: wrongWords.value.join(', '),
    attempt_number: (count || 0) + 1, played_at: new Date(sessionStart.value).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - sessionStart.value) / 1000), device_info: navigator.userAgent
  }, { onConflict: 'id' });
  saveMessage.value = error ? `紀錄儲存失敗：${error.message}` : '本次分數與對錯單字已記錄。';
}
async function finish() { if (!playing.value) return; playing.value = false; quiz.value = null; await saveSession(); }
function resume() {
  playing.value = true;
  correctWords.value = [];
  wrongWords.value = [];
  sessionStart.value = Date.now();
  sessionRevenueStart.value = store.value.revenue;
  sessionId.value = crypto.randomUUID();
  saveMessage.value = '';
  nextQuizAt.value = 0;
  say('開始新的學習回合；商店經營進度保留。');
}
onMounted(async () => {
  if (!student.value?.id) { await navigateTo('/'); return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) { loading.value = false; say('請從首頁選擇課本、冊次和單元。'); return; }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey.value) || 'null');
    if (saved && Array.isArray(saved.tiles) && [20, TILE_COUNT].includes(saved.tiles.length)) {
      const oldLayout = saved.tiles.length === 20;
      const legacyStarter = oldLayout && saved.day === 1 && saved.hour === 9 && saved.cash === 2500
        && saved.revenue === 0 && saved.expenses === 0 && saved.staff === 0
        && saved.tiles.every((tile, index) => {
          if (index === 6) return tile.type === 'fridge' && tile.product === 'tea' && tile.stock === 4;
          if (index === 11) return tile.type === 'shelf' && tile.product === 'chips' && tile.stock === 4;
          if (index === 17) return tile.type === 'counter' && !tile.product && !tile.stock;
          return !tile.type && !tile.product && !tile.stock;
        });
      const expandedTiles = initialTiles();
      if (oldLayout && !legacyStarter) saved.tiles.forEach((tile, index) => {
        expandedTiles[Math.floor(index / 5) * GRID_COLS + index % 5 + 1] = tile;
      });
      store.value = { ...initialStore(), ...saved, tiles: oldLayout ? expandedTiles : saved.tiles };
      if (legacyStarter) {
        say('開局示範設備已移除，請自行選格建設。');
      } else if (oldLayout) {
        say('店面已擴為 35 格；原有設備與商品已保留在中央區域。');
      }
    }
  } catch { /* 保留初始狀態 */ }
  sceneStartAt.value = Date.now();
  sceneNow.value = sceneStartAt.value;
  flowTimer = window.setInterval(() => { if (document.visibilityState === 'visible') sceneNow.value = Date.now(); }, 80);
  sessionStart.value = Date.now();
  sessionRevenueStart.value = store.value.revenue;
  sessionId.value = crypto.randomUUID();
  const { data, error } = await db.from('vocabularies').select('en_us,zh_tw')
    .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
  loading.value = false;
  if (error) { say(`單字載入失敗：${error.message}`); return; }
  const unique = new Set();
  words.value = (data || []).filter(word => {
    const key = word.en_us?.trim().toLowerCase();
    if (!key || !word.zh_tw?.trim() || unique.has(key)) return false;
    unique.add(key); return true;
  });
  if (words.value.length < 4) say('本課單字不足四個，請從首頁選其他單元。');
});
onUnmounted(() => { if (flowTimer) window.clearInterval(flowTimer); });
watch(store, persist, { deep: true });
</script>

<template>
  <main class="store-page">
    <div class="mobile-landscape-hint" role="status"><span aria-hidden="true">📱 ↻</span><strong>請將手機轉為橫向</strong><p>店面有 35 格；橫向可看清設備與客人，並在右側操作選取的設施。</p></div>
    <header class="topbar">
      <div><span class="eyebrow">1999 · STREET CORNER STORE</span><h1>🏪 單字便利商店</h1></div>
      <nav><NuxtLink to="/">← 回首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">全校英雄榜</NuxtLink></nav>
    </header>
    <div class="hud"><span>💵 現金 <b>${{ store.cash }}</b></span><span>📅 第 {{ store.day }} 天 · {{ store.hour }}:00</span><span>⭐ 口碑 {{ store.reputation }}</span><span>🧾 營收 ${{ store.revenue }} ／支出 ${{ store.expenses }}</span><span>📚 本回合 {{ score }} 分</span></div>
    <div class="layout">
      <section class="scene-panel">
        <div class="scene-title"><strong>{{ store.name }}</strong><span>{{ selectedDistrict?.name || '尚未選址' }} · 35 格店面 · 點選方格查看設施</span></div>
        <div class="scene-scroll">
          <svg class="store-scene" viewBox="0 0 1200 780" role="img" aria-label="35 格立體便利商店，點選格子查看設施">
            <defs>
              <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#ffefca"/><stop offset="1" stop-color="#ddbc85"/></linearGradient>
              <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#fff5dc"/><stop offset="1" stop-color="#e9b96d"/></linearGradient>
              <linearGradient id="front" x2="0" y2="1"><stop stop-color="#ef6462"/><stop offset="1" stop-color="#ad2f3c"/></linearGradient>
              <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-opacity=".25"/></filter>
            </defs>
            <rect width="1200" height="780" fill="#a9c1a8"/>
            <!-- 道路與人行道沿著店面左前緣，入口不再被道路斜切。 -->
            <path d="M75 446 635 740 590 825 30 531Z" fill="#718078"/>
            <path d="M45 505 605 799" fill="none" stroke="#e9ddb8" stroke-width="5" stroke-dasharray="30 24"/>
            <path d="M120 360 680 654 635 740 75 446Z" fill="#d6cab0" stroke="#9e9178" stroke-width="3"/>
            <path d="M120 360 520 150 1080 444 680 654Z" fill="url(#floor)" stroke="#72533f" stroke-width="12" filter="url(#shadow)"/>
            <path d="M120 255 520 45 520 150 120 360Z" fill="url(#wall)" stroke="#8f6b49" stroke-width="6"/>
            <path d="M520 45 1080 339 1080 444 520 150Z" fill="url(#wall)" stroke="#8f6b49" stroke-width="6"/>
            <path d="M120 283 520 73" stroke="#bd3d42" stroke-width="13"/><path d="M520 73 1080 367" stroke="#bd3d42" stroke-width="13"/>
            <path d="M185 220 285 168 285 218 185 270Z" fill="#99c9ca" stroke="#8d694c" stroke-width="5"/><path d="M235 194 235 244" stroke="#f8e4c5" stroke-width="4"/>
            <path d="M650 122 750 175 750 225 650 172Z" fill="#9fc9c9" stroke="#886e54" stroke-width="5"/><path d="M700 148 700 198" stroke="#f8e4c5" stroke-width="4"/>
            <path d="M880 243 980 296 980 346 880 293Z" fill="#9fc9c9" stroke="#886e54" stroke-width="5"/><path d="M930 269 930 319" stroke="#f8e4c5" stroke-width="4"/>
            <path d="M385 116 465 74 465 116 385 158Z" fill="#a84f53" stroke="#f3d69e" stroke-width="4"/><text x="425" y="115" transform="rotate(-28 425 115)" text-anchor="middle" font-size="14" font-weight="900" fill="#fff8e6">OPEN</text>
            <g v-if="store.decorLevel > 0" aria-label="店面裝潢">
              <path d="M320 150 358 130 358 165 320 185Z" fill="#f6d472" stroke="#ad7241" stroke-width="3"/>
              <text x="339" y="160" transform="rotate(-28 339 160)" text-anchor="middle" font-size="17" fill="#a64c48">★</text>
              <path d="M1000 306 1040 327 1040 361 1000 340Z" fill="#f6d472" stroke="#ad7241" stroke-width="3"/>
              <text x="1020" y="338" transform="rotate(28 1020 338)" text-anchor="middle" font-size="17" fill="#a64c48">★</text>
              <path v-if="store.decorLevel > 1" d="M125 277 510 75 M530 78 1070 365" fill="none" stroke="#ffe8a3" stroke-width="5" stroke-dasharray="16 12"/>
              <path v-if="store.decorLevel > 2" d="M170 230 210 210 M970 293 1010 315" fill="none" stroke="#6f9c6d" stroke-width="9" stroke-linecap="round"/>
            </g>
            <g v-for="{ tile, index } in sceneTiles" :key="index" class="scene-tile" role="button" tabindex="0" :aria-label="`第 ${index + 1} 格，${tileName(tile)}${tile.product ? '，'+tileProduct(tile)?.name : ''}`" @click="selectTile(index)" @keydown.enter.prevent="selectTile(index)" @keydown.space.prevent="selectTile(index)">
              <polygon :points="tilePolygon(index)" :fill="selected === index ? '#fbd36a' : (index % 2 ? '#edcf9a' : '#e7c58d')" stroke="#b9915c" stroke-width="2"/>
              <g v-if="tile.type" :transform="`translate(${tileCenter(index).x}, ${tileCenter(index).y - 10})`">
                <ellipse cy="31" rx="42" ry="15" fill="#493622" opacity=".25"/>
                <template v-if="tile.type === 'fridge'">
                  <path d="M-32 -42 0 -59 32 -42 0 -25Z" fill="#f2ffff" stroke="#668f90" stroke-width="3"/>
                  <path d="M-32 -42 0 -25 0 25 -32 8Z" fill="#8fc6c9" stroke="#668f90" stroke-width="3"/>
                  <path d="M0 -25 32 -42 32 8 0 25Z" fill="#5c9fa7" stroke="#668f90" stroke-width="3"/>
                  <path d="M-26 -31 -6 -21 -6 10 -26 0Z" fill="#d9faf9" opacity=".85"/><path d="M6 -20 26 -31 26 0 6 10Z" fill="#b5e7e7" opacity=".8"/>
                  <path d="M-26 -11 -6 -1 M6 0 26 -11" stroke="#4c8590" stroke-width="3"/><text y="-14" text-anchor="middle" font-size="21">{{ tileProduct(tile)?.icon || '🥤' }}</text>
                </template>
                <template v-else-if="tile.type === 'shelf' || tile.type === 'warmer' || tile.type === 'hotfood'">
                  <path d="M-38 -21 0 -41 38 -21 0 -1Z" fill="#f4dbb0" stroke="#865b40" stroke-width="3"/>
                  <path d="M-38 -21 0 -1 0 28 -38 8Z" fill="#bd8150" stroke="#865b40" stroke-width="3"/>
                  <path d="M0 -1 38 -21 38 8 0 28Z" fill="#925a3c" stroke="#865b40" stroke-width="3"/>
                  <path d="M-36 -6 0 14 36 -6" fill="none" stroke="#f4daa6" stroke-width="5"/><text y="-17" text-anchor="middle" font-size="23">{{ tileProduct(tile)?.icon || fixtures[tile.type]?.icon }}</text>
                </template>
                <template v-else>
                  <path d="M-38 -13 0 -33 38 -13 0 7Z" :fill="fixturePalette[tile.type]?.[0] || '#e6ad83'" stroke="#6e4b3b" stroke-width="3"/>
                  <path d="M-38 -13 0 7 0 29 -38 9Z" :fill="fixturePalette[tile.type]?.[1] || '#b57355'" stroke="#6e4b3b" stroke-width="3"/>
                  <path d="M0 7 38 -13 38 9 0 29Z" :fill="fixturePalette[tile.type]?.[2] || '#8b513d'" stroke="#6e4b3b" stroke-width="3"/>
                  <rect v-if="tile.type === 'counter'" x="-10" y="-48" width="20" height="17" rx="2" fill="#374e54" stroke="#d7e5db" stroke-width="2"/><text v-else y="-17" text-anchor="middle" font-size="23">{{ fixtures[tile.type]?.icon }}</text>
                </template>
                <text y="26" text-anchor="middle" font-size="11" font-weight="900" fill="#fff8e7" paint-order="stroke" stroke="#694832" stroke-width="3">{{ tileProduct(tile)?.name || tileName(tile) }}{{ tile.product ? ` ×${tile.stock}` : '' }}</text>
              </g>
              <text v-else-if="selected === index" :x="tileCenter(index).x" :y="tileCenter(index).y + 5" text-anchor="middle" font-size="15" fill="#816747">＋</text>
            </g>
            <path d="M360 486 440 528 413 580 333 538Z" fill="#678a76" stroke="#f7ecd3" stroke-width="4"/>
            <text x="385" y="535" transform="rotate(28 385 535)" text-anchor="middle" font-size="13" font-weight="900" fill="#fffdf2">入口</text>
            <g v-for="visitor in visitorPositions" :key="visitor.id" class="customer" :class="{ waiting: visitor.waiting }" :transform="`translate(${visitor.x}, ${visitor.y})`" aria-hidden="true">
              <ellipse cy="20" rx="18" ry="7" fill="#3c4b42" opacity=".23"/>
              <path class="walking-leg-left" d="M-6 2 -9 18" stroke="#364354" stroke-width="6" stroke-linecap="round"/>
              <path class="walking-leg-right" d="M6 2 9 18" stroke="#364354" stroke-width="6" stroke-linecap="round"/>
              <ellipse cx="-10" cy="18" rx="6" ry="3" fill="#26323b"/><ellipse cx="9" cy="18" rx="6" ry="3" fill="#26323b"/>
              <path d="M-13 -18 -18 -1 M13 -18 18 -1" :stroke="visitorAppearance[visitor.id].skin" stroke-width="6" stroke-linecap="round"/>
              <path d="M-11 -19 Q0 -24 11 -19 L10 5 -10 5Z" :fill="visitorAppearance[visitor.id].shirt" stroke="#5f5148" stroke-width="1.5"/>
              <path d="M0 -22 Q11 -20 10 5 L0 5Z" :fill="visitorAppearance[visitor.id].shade" opacity=".78"/>
              <path d="M-4 -24 4 -24 4 -20 -4 -20Z" :fill="visitorAppearance[visitor.id].skin"/>
              <circle cy="-33" r="10" :fill="visitorAppearance[visitor.id].skin" stroke="#9d795b" stroke-width="1"/>
              <path d="M-10 -34 Q-9 -46 1 -45 Q11 -43 10 -32 Q4 -39 -1 -38 Q-6 -36 -10 -34Z" :fill="visitorAppearance[visitor.id].hair"/>
              <circle cx="-3" cy="-32" r="1" fill="#3c3433"/><circle cx="4" cy="-32" r="1" fill="#3c3433"/>
              <path d="M-2 -27 Q1 -25 4 -27" fill="none" stroke="#9b675a" stroke-width="1"/>
              <text v-if="visitor.waiting" y="-51" text-anchor="middle" font-size="11" font-weight="800" fill="#7e3b42" paint-order="stroke" stroke="#fff5dd" stroke-width="3">結帳中…</text>
            </g>
            <path d="M120 360 680 654" fill="none" stroke="#efe0bf" stroke-width="4"/>
          </svg>
        </div>
        <div class="scene-foot"><span>👥 最近一小時來客 {{ store.lastVisitors }} 人 · 成交 {{ store.lastSales }} 件</span><span>選取第 {{ selected + 1 }} 格：{{ tileName(currentTile) }}<template v-if="currentTile.product"> · {{ tileProduct(currentTile)?.name }} × {{ currentTile.stock }}</template></span></div>
      </section>
      <aside class="controls">
        <div v-if="!store.district" class="card"><h2>📍 先選開店商圈</h2><button v-for="district in districts" :key="district.id" class="district" @click="chooseDistrict(district.id)"><b>{{ district.name }}</b><small>{{ district.hint }}</small></button></div>
        <template v-else>
          <div class="card">
            <h2>🏗️ 第 {{ selected + 1 }} 格 · {{ tileName(currentTile) }}</h2>
            <p v-if="currentTile.product">架上 {{ tileProduct(currentTile)?.name }} {{ currentTile.stock }}/12 件</p>
            <p v-else-if="selected === ENTRANCE_TILE">入口通道須保持暢通，請選其他空格配置設備。</p>
            <p v-else-if="!currentTile.type">點選空格，自行配置店內設備；開局不附贈設備。</p>
            <p v-else>{{ fixtures[currentTile.type]?.hint || '點選其他方格可調整設施。' }}</p>
            <template v-if="!currentTile.type && selected !== ENTRANCE_TILE">
              <div class="fixture-tabs"><button v-for="group in fixtureGroups" :key="group.id" :class="{ active: fixtureGroup === group.id }" @click="fixtureGroup = group.id">{{ group.name }}</button></div>
              <div class="button-grid"><button v-for="entry in visibleFixtures" :key="entry[0]" @click="build(entry[0])"><b>{{ entry[1].icon }} {{ entry[1].name }} ${{ entry[1].cost }}</b><small>{{ entry[1].hint }}</small></button></div>
            </template>
            <div v-else class="demolition">
              <p>拆除費 ${{ demolitionCost }}；架上剩餘商品會退回倉庫。</p>
              <button v-if="pendingDemolition !== selected" class="secondary" @click="pendingDemolition = selected">拆除這格設施</button>
              <div v-else class="inline"><button @click="demolish">確認拆除 · ${{ demolitionCost }}</button><button class="secondary" @click="pendingDemolition = null">取消</button></div>
            </div>
          </div>
          <div class="card"><h2>📦 進貨、補架與定價</h2><label>商品 <select :value="productId" @change="selectProduct($event.target.value)"><option v-for="item in goods" :key="item.id" :value="item.id">{{ item.icon }} {{ item.name }}</option></select></label><p class="small">成本 ${{ product.cost }} · 建議售價 ${{ product.base }} · 倉庫 {{ store.warehouse[productId] }} 件</p><div class="inline"><label>數量 <input v-model.number="orderQty" type="number" min="1" max="100"></label><button @click="order">進貨</button></div><div class="inline"><button :disabled="!canPlaceProduct" @click="stockShelf">補到選取貨架</button><label>售價 <input v-model.number="priceInput" type="number" :min="product.cost + 1" max="200"></label><button @click="setPrice">設定</button></div></div>
          <div class="card"><h2>👥 人員與宣傳</h2><p>店員 {{ store.staff }}/3 · 每人每日 $90；傳單剩 {{ store.adHours }} 小時</p><div class="inline"><button @click="hire">聘店員 $180</button><button @click="advertise">發傳單 $120</button></div></div>
          <div class="card"><h2>✨ 店面裝潢</h2><p>目前 {{ store.decorLevel || 0 }}/3 級；每級每小時多吸引 2 位客人，外觀也會逐步更新。</p><button :disabled="store.decorLevel >= 3" @click="upgradeDecor">{{ store.decorLevel >= 3 ? '裝潢已滿級' : `升級裝潢 $${decorCost}` }}</button></div>
          <div class="card action-card"><h2>🕒 開始營業</h2><p>每按一次經營一小時；顧客會走遍從入口可到達的空格，到收銀台等待約 3 秒後離店。設備若隔斷通道，後方空格便無法抵達。</p><button class="run" @click="runHour">▶ 營業 1 小時</button></div>
        </template>
        <div class="card mobile-session"><h2>📚 本回合與紀錄</h2><p>答對 {{ correctWords.length }} · 答錯 {{ wrongWords.length }} · {{ score }} 分</p><div class="inline"><button v-if="playing" @click="finish">結束並記錄</button><button v-else @click="resume">開始新回合</button><button v-if="!playing && saveMessage.includes('失敗')" @click="saveSession">重試儲存</button></div><p>{{ saveMessage || store.notices[0] }}</p></div>
      </aside>
    </div>
    <div class="lower"><section class="card"><h2>營運消息</h2><p v-for="(line, index) in store.notices" :key="index">{{ line }}</p></section><section class="card"><h2>單字與紀錄</h2><p>按操作才可能出題；每次出題後隨機間隔 30–40 秒，期間操作不再出題。閒置時不會自動出題。</p><p>答對 {{ correctWords.length }} · 答錯 {{ wrongWords.length }} · 本回合 {{ score }} 分</p><button v-if="playing" @click="finish">結束並記錄</button><button v-else @click="resume">開始新回合</button><button v-if="!playing && saveMessage.includes('失敗')" @click="saveSession">重試儲存</button><p>{{ saveMessage }}</p></section></div>
    <div v-if="quiz" class="quiz-overlay" role="dialog" aria-modal="true" aria-label="單字題"><div class="quiz-card"><small>操作前的單字挑戰</small><h2>{{ quiz.word.zh_tw }}</h2><p>選出對應的英文單字。答錯時本次操作不執行。</p><div class="choices"><button v-for="choice in quiz.options" :key="choice.en_us" :class="{ chosen: quizAnswer === choice.en_us }" @click="quizAnswer = choice.en_us">{{ choice.en_us }}</button></div><button class="submit" :disabled="!quizAnswer" @click="answerQuiz">送出答案</button></div></div>
  </main>
</template>

<style scoped>
.store-page{min-height:100dvh;background:radial-gradient(circle at 15% 0%,#fff3d8,#d2e1d1 55%,#a4beb1);color:#352e29;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;padding:15px clamp(12px,2vw,36px)}.topbar,.hud,.layout,.lower{max-width:1600px;margin:0 auto}.topbar{display:flex;justify-content:space-between;align-items:center;gap:15px}.eyebrow{letter-spacing:.18em;font-weight:900;font-size:11px;color:#ad4146}.topbar h1{margin:2px 0 11px;font-size:clamp(26px,3vw,42px)}.topbar nav{display:flex;gap:8px;flex-wrap:wrap}.topbar a{background:#fff8e9;color:#733b3f;padding:9px 13px;border-radius:11px;text-decoration:none;font-weight:800;box-shadow:0 3px 0 #c39d78}.hud{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:13px}.hud span{background:#fff8e9;border:1px solid #d0aa80;padding:8px 13px;border-radius:12px;box-shadow:0 3px 0 #d2b796;font-size:14px;font-weight:700}.hud b{color:#a3393e}.layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(330px,.8fr);gap:16px}.scene-panel,.card{background:#fffaf0;border:2px solid #cda983;border-radius:18px;box-shadow:0 9px 25px #78664c26}.scene-panel{overflow:hidden;display:flex;flex-direction:column}.scene-title,.scene-foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 15px;background:#7d3d43;color:#fff7e6;font-weight:700}.scene-title strong{font-size:19px}.scene-title span,.scene-foot{font-size:13px}.scene-scroll{overflow:auto;background:#adc6b0;flex:1}.store-scene{display:block;width:100%;min-width:820px;max-height:min(70dvh,760px);min-height:460px}.scene-tile{cursor:pointer}.scene-tile:focus-visible{outline:none;filter:drop-shadow(0 0 9px #fff)}.scene-tile:hover{filter:brightness(1.1)}.customer{pointer-events:none}.walking-leg-left,.walking-leg-right{transform-box:fill-box;transform-origin:center top;animation:walk .55s ease-in-out infinite alternate}.walking-leg-right{animation-direction:alternate-reverse}.customer.waiting .walking-leg-left,.customer.waiting .walking-leg-right{animation-play-state:paused}@keyframes walk{to{transform:rotate(17deg)}}.scene-foot{background:#f5e7cf;color:#624441}.controls{display:flex;flex-direction:column;gap:11px;min-width:0}.card{padding:12px 15px}.card h2{font-size:17px;margin:0 0 8px;color:#773d3e}.card p{font-size:13px;margin:5px 0;line-height:1.45}.card label{display:flex;gap:8px;align-items:center;font-weight:800;font-size:13px}.card select,.card input{border:1px solid #b59879;background:#fff;border-radius:8px;padding:7px;min-width:0}.card select{flex:1}.card input{width:72px}.small{color:#745b4b}.button-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.inline{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px}.card button{border:1px solid #a34d4f;border-radius:9px;background:#a8464b;color:white;padding:8px 11px;cursor:pointer;font-weight:800}.card button:disabled{opacity:.5;cursor:not-allowed}.card button:hover:not(:disabled){background:#842d34}.card .secondary{background:#fff6e9;color:#844047}.card .secondary:hover:not(:disabled){background:#f5dcc8}.demolition{border-top:1px solid #dfc4a8;margin-top:8px;padding-top:5px}.fixture-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin:9px 0}.card .fixture-tabs button{background:#f4e1cb;color:#6b4641;border-color:#caab8a;padding:6px}.card .fixture-tabs button.active{background:#7d3d43;color:#fff8e7}.button-grid button{text-align:left;display:flex;flex-direction:column;gap:3px;min-height:51px}.button-grid button small{font-size:11px;opacity:.9}.card .district{display:flex;width:100%;justify-content:space-between;align-items:center;margin:7px 0;text-align:left}.district small{font-size:11px}.action-card{background:#fff2dc}.card .run{width:100%;font-size:17px;padding:11px;background:#2e8064;border-color:#266e58}.lower{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:15px}.lower .card p:first-of-type{font-weight:700}.quiz-overlay{position:fixed;inset:0;z-index:100;background:#201b21b8;display:grid;place-items:center;padding:16px}.quiz-card{width:min(100%,510px);background:#fffaf0;border:5px solid #e1bc84;border-radius:23px;padding:26px;text-align:center;box-shadow:0 25px 60px #150c12aa}.quiz-card small{color:#ab4449;font-weight:900;letter-spacing:.12em}.quiz-card h2{font-size:clamp(28px,5vw,43px);margin:12px 0}.choices{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:20px 0}.choices button,.submit{border:2px solid #c29f7b;background:#fff1d7;border-radius:10px;padding:13px;cursor:pointer;font-size:16px;font-weight:800}.choices .chosen{background:#458c72;color:white;border-color:#267155}.submit{background:#a8464b;color:white;width:100%}.submit:disabled{opacity:.5}@media(max-width:1000px){.layout{grid-template-columns:1fr}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.scene-scroll{max-height:60dvh}}@media(max-width:680px){.store-page{padding:10px}.topbar{align-items:flex-start;flex-direction:column}.topbar h1{margin-bottom:2px}.hud span{font-size:12px;padding:6px 9px}.controls,.lower{grid-template-columns:1fr}.store-scene{min-width:820px}.scene-scroll{max-height:52dvh}.card{padding:11px}.choices{grid-template-columns:1fr 1fr}}
</style>

<style scoped>
.mobile-landscape-hint{display:none}
.mobile-session{display:none}
@media (max-width:700px) and (orientation:portrait){
  .mobile-landscape-hint{position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;background:#633a3ff2;color:#fff6e4;text-align:center}
  .mobile-landscape-hint span{font-size:52px}.mobile-landscape-hint strong{font-size:25px}.mobile-landscape-hint p{max-width:25em;margin:0;line-height:1.5}
}
@media (max-height:600px) and (orientation:landscape) and (pointer:coarse){
  .store-page{height:100dvh;min-height:0;overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box;padding:4px max(6px,env(safe-area-inset-right)) 4px max(6px,env(safe-area-inset-left))}
  .topbar{width:100%;flex:0 0 auto;gap:6px}.eyebrow{display:none}.topbar h1{font-size:18px;margin:0}.topbar nav{gap:4px}.topbar a{font-size:11px;padding:4px 6px}
  .hud{width:100%;flex:0 0 auto;gap:4px;margin:4px auto}.hud span{padding:3px 5px;font-size:10px;border-radius:5px}
  .layout{width:100%;flex:1;min-height:0;grid-template-columns:minmax(0,1fr) clamp(190px,31vw,280px);gap:6px}
  .scene-panel{min-height:0}.scene-title,.scene-foot{padding:4px 6px;font-size:10px}.scene-title strong{font-size:13px}.scene-title span{font-size:10px}.scene-scroll{min-height:0;display:grid;place-items:center;overflow:hidden}
  .store-scene{width:100%;height:100%;min-width:0;min-height:0;max-height:none;object-fit:contain}
  .controls{display:block;min-height:0;overflow-y:auto}.card{padding:7px;margin-bottom:5px}.card h2{font-size:13px;margin-bottom:4px}.card p,.card label{font-size:11px}.card button{padding:5px 7px;font-size:11px}.button-grid{gap:4px}.button-grid button{min-height:42px}.button-grid button small{font-size:10px}.mobile-session{display:block}
  .lower{display:none}.quiz-card{max-height:calc(100dvh - 16px);overflow-y:auto;padding:10px}.quiz-card h2{font-size:21px;margin:5px 0}.quiz-card p{font-size:11px}.choices{margin:7px 0;gap:5px}.choices button,.submit{font-size:12px;padding:7px}
}
</style>
