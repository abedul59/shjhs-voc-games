<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const GAME = '單字地鐵跑酷';
const WIDTH = 960;
const HEIGHT = 540;
const VIEW_DISTANCE = 95;
const LANES = [-1, 0, 1];
const STATIONS = [
  { name: '彩虹中央站', sky: '#7cc9e8', wall: '#e9939a', train: '#ee665f' },
  { name: '星光商店街站', sky: '#8b9bd8', wall: '#deabdd', train: '#8b71d4' },
  { name: '海風公園站', sky: '#76cfce', wall: '#a9d8c0', train: '#47a4a7' },
  { name: '雲朵山丘站', sky: '#e0a4be', wall: '#eac29f', train: '#e67b75' }
];
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const canvas = ref(null);
const words = ref([]);
const phase = ref('loading');
const notice = ref('正在讀取本課單字…');
const lives = ref(3);
const shields = ref(0);
const tickets = ref(0);
const coins = ref(0);
const meters = ref(0);
const bonus = ref(0);
const quiz = ref(null);
const correctWords = ref([]);
const wrongWords = ref([]);
const saveNotice = ref('');
const tiltSupported = ref(false);
const tiltEnabled = ref(false);
const tiltStatus = ref('');
const score = computed(() => meters.value * 2 + bonus.value);
const stationName = computed(() => STATIONS[Math.floor(meters.value / 500) % STATIONS.length].name);
const nextStation = computed(() => (Math.floor(meters.value / 500) + 1) * 500);
const historyLink = computed(() => ({ path: '/history', query: { game: GAME } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME, ...lesson } }));
const world = { distance: 0, lane: 0, visualLane: 0, jumpHeight: 0, jumpVelocity: 0,
  slideTime: 0, slideVisual: 0, invincible: 0, dodgeTime: 0, dodgeText: '', activeTime: 0, slowUntil: 0, objects: [], nextWave: 42,
  wave: 0, lastSafeLane: 0, lastStation: 0, nextId: 0, lastFrame: 0 };
let frameId = 0;
let startedAt = 0;
let recordId = '';
let attemptNumber = 0;
let disposed = false;
let swipeStart = null;
let lastWordKey = '';
let tiltNeutral = null;
let tiltFiltered = 0;
let tiltAxis = '';
let manualLaneUntil = 0;
let tiltSignalTimer = 0;
let runnerSprite = null;
let runnerSpriteReady = false;
let slideSprite = null;
let slideSpriteReady = false;

const random = array => array[Math.floor(Math.random() * array.length)];
const clamp = (number, low, high) => Math.max(low, Math.min(high, number));
function resetWorld() {
  Object.assign(world, { distance: 0, lane: 0, visualLane: 0, jumpHeight: 0, jumpVelocity: 0,
    slideTime: 0, slideVisual: 0, invincible: 1.5, dodgeTime: 0, dodgeText: '', activeTime: 0, slowUntil: 0, objects: [], nextWave: 42,
    wave: 0, lastSafeLane: 0, lastStation: 0, nextId: 0, lastFrame: 0 });
  spawnAhead();
}
function startGame() {
  if (words.value.length < 4) return;
  resetWorld();
  lives.value = 3;
  shields.value = 0;
  tickets.value = 0;
  coins.value = 0;
  meters.value = 0;
  bonus.value = 0;
  correctWords.value = [];
  wrongWords.value = [];
  quiz.value = null;
  saveNotice.value = '';
  lastWordKey = '';
  startedAt = Date.now();
  recordId = crypto.randomUUID();
  attemptNumber = 0;
  phase.value = 'playing';
  notice.value = '跑起來！左右換道、向上跳過矮障礙、向下滑過高標誌。';
}
function endGame(message) {
  if (phase.value === 'ended') return;
  phase.value = 'ended';
  quiz.value = null;
  notice.value = message;
  if (recordId) { saveNotice.value = '正在儲存成績…'; void saveRecord(); }
}
function move(direction) {
  if (phase.value !== 'playing') return;
  world.lane = clamp(world.lane + direction, -1, 1);
  manualLaneUntil = performance.now() + 850;
}
function jump() {
  if (phase.value !== 'playing' || world.jumpHeight > .04 || world.slideTime > 0) return;
  world.jumpVelocity = 5.8;
}
function slide() {
  if (phase.value !== 'playing' || world.jumpHeight > .04) return;
  world.slideTime = 1.55;
}
function togglePause() {
  if (phase.value === 'playing') { phase.value = 'paused'; notice.value = '遊戲已暫停。'; }
  else if (phase.value === 'paused') { world.lastFrame = 0; phase.value = 'playing'; notice.value = '繼續跑酷！'; }
}
function keyDown(event) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'A', 'd', 'D', 'w', 'W', 's', 'S'].includes(event.key)) event.preventDefault();
  if (event.repeat) return;
  if (['ArrowLeft', 'a', 'A'].includes(event.key)) move(-1);
  else if (['ArrowRight', 'd', 'D'].includes(event.key)) move(1);
  else if (['ArrowUp', 'w', 'W', ' '].includes(event.key)) jump();
  else if (['ArrowDown', 's', 'S'].includes(event.key)) slide();
  else if (event.key === 'Escape') togglePause();
}
function pointerDown(event) {
  swipeStart = { x: event.clientX, y: event.clientY };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}
function pointerUp(event) {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (dy < 0) jump();
  else slide();
}
function pointerCancel() { swipeStart = null; }
function readTilt(event) {
  const angle = ((screen.orientation?.angle ?? window.orientation ?? 0) + 360) % 360;
  const sideways = angle === 90 || angle === 270;
  const raw = sideways ? event.beta : event.gamma;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return;
  const axis = `${sideways ? 'beta' : 'gamma'}:${angle}`;
  if (tiltNeutral === null || tiltAxis !== axis) {
    clearTimeout(tiltSignalTimer);
    tiltNeutral = raw;
    tiltFiltered = 0;
    tiltAxis = axis;
    tiltStatus.value = '已校正。向左或向右傾斜手機即可換道。';
    return;
  }
  // Landscape axes rotate with the screen; the sign keeps the controls aligned with its left/right edge.
  const sign = angle === 90 ? -1 : 1;
  const delta = clamp((raw - tiltNeutral) * sign, -45, 45);
  tiltFiltered += (delta - tiltFiltered) * .28;
  if (phase.value === 'playing' && performance.now() >= manualLaneUntil)
    world.lane = tiltFiltered > 13 ? 1 : tiltFiltered < -13 ? -1 : 0;
}
async function enableTilt() {
  if (!tiltSupported.value) return;
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== 'granted') { tiltStatus.value = '未允許動作感測；仍可滑動或使用按鍵。'; return; }
    }
    tiltNeutral = null;
    tiltFiltered = 0;
    window.addEventListener('deviceorientation', readTilt);
    tiltEnabled.value = true;
    tiltStatus.value = '請正握手機，等待感測器校正。';
    tiltSignalTimer = window.setTimeout(() => {
      if (tiltNeutral === null && tiltEnabled.value)
        tiltStatus.value = '尚未讀到手機感測器；請確認瀏覽器權限，或改用滑動與按鍵。';
    }, 2500);
  } catch {
    tiltStatus.value = '無法啟用手機傾斜；請確認瀏覽器感測器權限。';
  }
}
function disableTilt() {
  clearTimeout(tiltSignalTimer);
  window.removeEventListener('deviceorientation', readTilt);
  tiltEnabled.value = false;
  tiltNeutral = null;
  tiltStatus.value = '已關閉手機傾斜控制。';
}
function calibrateTilt() {
  tiltNeutral = null;
  tiltFiltered = 0;
  tiltStatus.value = '請正握手機，重新校正中。';
}
function spawnAhead() {
  while (world.nextWave < world.distance + VIEW_DISTANCE) {
    const at = world.nextWave;
    const choices = LANES.filter(lane => Math.abs(lane - world.lastSafeLane) <= 1);
    const safeLane = random(choices);
    const blocked = LANES.filter(lane => lane !== safeLane).sort(() => Math.random() - .5);
    const count = world.distance > 450 && world.wave % 4 === 0 ? 2 : 1;
    for (const lane of blocked.slice(0, count)) {
      world.objects.push({ id: ++world.nextId, at, lane,
        type: random(['train', 'barrier', 'barrier', 'sign']), passed: false });
    }
    const ticketWave = world.wave % 3 === 2;
    world.objects.push({ id: ++world.nextId, at: at - 11, lane: safeLane,
      type: ticketWave ? 'ticket' : 'coin', passed: false });
    if (!ticketWave) world.objects.push({ id: ++world.nextId, at: at - 7, lane: safeLane, type: 'coin', passed: false });
    if (world.wave > 0 && world.wave % 11 === 0) {
      world.objects.push({ id: ++world.nextId, at: at - 15, lane: safeLane, type: 'shield', passed: false });
    }
    world.lastSafeLane = safeLane;
    world.wave++;
    world.nextWave += 20;
  }
}
function askQuestion() {
  const fresh = words.value.filter(item => item.en_us.toLowerCase() !== lastWordKey);
  const word = random(fresh.length ? fresh : words.value);
  lastWordKey = word.en_us.toLowerCase();
  const others = words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase())
    .sort(() => Math.random() - .5).slice(0, 3);
  quiz.value = { word, choices: [word, ...others].sort(() => Math.random() - .5) };
  tickets.value = 0;
  phase.value = 'quiz';
  notice.value = '收齊三張單字票券！選出中文意思對應的英文單字。';
}
function answer(choice) {
  if (phase.value !== 'quiz' || !quiz.value) return;
  const word = quiz.value.word;
  quiz.value = null;
  if (choice.en_us === word.en_us) {
    correctWords.value.push(word.en_us);
    bonus.value += 250;
    shields.value = Math.min(2, shields.value + 1);
    notice.value = `答對！${word.zh_tw}＝${word.en_us}。獲得 250 分與 1 個護盾。`;
  } else {
    wrongWords.value.push(word.en_us);
    bonus.value = Math.max(0, bonus.value - 40);
    world.slowUntil = world.activeTime + 8;
    notice.value = `答錯了：${word.zh_tw}＝${word.en_us}。接下來 8 秒會減速。`;
  }
  world.lastFrame = 0;
  phase.value = 'playing';
}
function hit(type) {
  if (world.invincible > 0) return;
  world.invincible = 1.8;
  if (shields.value > 0) {
    shields.value--;
    notice.value = `護盾擋下${type === 'train' ? '列車' : type === 'barrier' ? '路障' : '標誌'}！`;
    return;
  }
  lives.value--;
  if (lives.value <= 0) endGame('碰到障礙，跑酷結束。');
  else notice.value = `撞上障礙，還有 ${lives.value} 顆愛心。`;
}
function collect(item) {
  if (item.type === 'coin') { coins.value++; bonus.value += 10; }
  else if (item.type === 'shield') { shields.value = Math.min(2, shields.value + 1); notice.value = '撿到一個護盾！'; }
  else if (item.type === 'ticket') {
    tickets.value++;
    bonus.value += 25;
    notice.value = `單字票券 ${tickets.value}/3；收滿就能答題。`;
    if (tickets.value >= 3) askQuestion();
  }
}
function advance(dt) {
  world.activeTime += dt;
  const slow = world.activeTime < world.slowUntil;
  const speed = Math.min(18, 11 + world.distance / 520) * (slow ? .67 : 1);
  world.distance += speed * dt;
  meters.value = Math.floor(world.distance);
  world.visualLane += (world.lane - world.visualLane) * Math.min(1, dt * 12);
  world.jumpHeight = Math.max(0, world.jumpHeight + world.jumpVelocity * dt);
  world.jumpVelocity -= 7 * dt;
  if (world.jumpHeight <= 0) { world.jumpHeight = 0; world.jumpVelocity = 0; }
  world.slideTime = Math.max(0, world.slideTime - dt);
  world.slideVisual += ((world.slideTime > 0 ? 1 : 0) - world.slideVisual) * Math.min(1, dt * 25);
  world.invincible = Math.max(0, world.invincible - dt);
  world.dodgeTime = Math.max(0, world.dodgeTime - dt);
  spawnAhead();
  for (const item of world.objects) {
    if (item.passed || item.at > world.distance) continue;
    item.passed = true;
    if (item.lane !== world.lane) continue;
    if (['coin', 'ticket', 'shield'].includes(item.type)) collect(item);
    else if (item.type === 'barrier' && world.jumpHeight >= 1.2) {
      world.dodgeText = '躍過路障！'; world.dodgeTime = .85; bonus.value += 15;
    } else if (item.type === 'sign' && world.slideTime > 0 && world.slideVisual >= .85) {
      world.dodgeText = '滑過標誌！'; world.dodgeTime = .85; bonus.value += 15;
    } else hit(item.type);
    if (phase.value !== 'playing') break;
  }
  world.objects = world.objects.filter(item => item.at > world.distance - 8);
  const reachedStation = Math.floor(world.distance / 500);
  if (reachedStation > world.lastStation) {
    world.lastStation = reachedStation;
    bonus.value += 120;
    if (reachedStation % 2 === 0) lives.value = Math.min(3, lives.value + 1);
    notice.value = `抵達${STATIONS[reachedStation % STATIONS.length].name}，獲得里程加分！`;
  }
}
function tick(timestamp) {
  frameId = requestAnimationFrame(tick);
  const dt = world.lastFrame ? Math.min((timestamp - world.lastFrame) / 1000, .04) : 0;
  world.lastFrame = timestamp;
  if (phase.value === 'playing' && !document.hidden && dt > 0) advance(dt);
  draw();
}
async function saveRecord() {
  if (!student.value?.id || !recordId) return;
  const currentId = recordId;
  const currentScore = score.value;
  const currentStarted = startedAt;
  const correct = [...correctWords.value];
  const wrong = [...wrongWords.value];
  let attempt = attemptNumber;
  if (!attempt) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', String(student.value.id)).eq('game_type', GAME)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    attempt = (count || 0) + 1;
    if (recordId === currentId) attemptNumber = attempt;
  }
  const { error } = await db.from('game_records').upsert({
    id: currentId, student_id: String(student.value.id), game_type: GAME,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: currentScore, mistakes: wrong.length,
    correct_words: correct.join(', '), wrong_words: wrong.join(', '), attempt_number: attempt,
    played_at: new Date(currentStarted).toISOString(), time_taken_seconds: Math.floor((Date.now() - currentStarted) / 1000),
    device_info: navigator.userAgent
  }, { onConflict: 'id' });
  if (recordId === currentId) saveNotice.value = error ? `儲存失敗：${error.message}` : '分數與單字對錯已記錄。';
}
onMounted(async () => {
  window.addEventListener('keydown', keyDown);
  runnerSprite = new Image();
  runnerSprite.onload = () => { runnerSpriteReady = true; };
  runnerSprite.src = '/images/subway/rear-runner-sprites.png';
  slideSprite = new Image();
  slideSprite.onload = () => { slideSpriteReady = true; };
  slideSprite.src = '/images/subway/rear-runner-slide.png';
  tiltSupported.value = typeof DeviceOrientationEvent !== 'undefined'
    && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  frameId = requestAnimationFrame(tick);
  if (!student.value?.id) { await navigateTo('/'); return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) {
    phase.value = 'ready'; notice.value = '請先從首頁選擇課本、冊次與單元。'; return;
  }
  const { data, error } = await db.from('vocabularies').select('en_us,zh_tw')
    .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
  if (disposed) return;
  if (error) { phase.value = 'ready'; notice.value = `單字載入失敗：${error.message}`; return; }
  const seen = new Set();
  words.value = (data || []).filter(word => {
    const key = word.en_us?.trim().toLowerCase();
    if (!key || !word.zh_tw?.trim() || seen.has(key)) return false;
    seen.add(key); return true;
  });
  phase.value = 'ready';
  notice.value = words.value.length >= 4 ? '按「開始跑酷」，左右換道並收集單字票券。' : '本課至少需要四筆不同單字。';
});
onBeforeUnmount(() => {
  disposed = true;
  if (runnerSprite) runnerSprite.onload = null;
  if (slideSprite) slideSprite.onload = null;
  clearTimeout(tiltSignalTimer);
  cancelAnimationFrame(frameId);
  window.removeEventListener('keydown', keyDown);
  window.removeEventListener('deviceorientation', readTilt);
});

function project(lane, depth) {
  const near = 1 - clamp(depth / VIEW_DISTANCE, 0, 1);
  const ratio = Math.pow(near, 1.4);
  return { x: WIDTH / 2 + lane * (43 + ratio * 198), y: 155 + ratio * 370, scale: .26 + ratio * 1.35 };
}
function draw() {
  const ctx = canvas.value?.getContext('2d');
  if (!ctx) return;
  const theme = STATIONS[Math.floor(world.distance / 500) % STATIONS.length];
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, theme.sky); sky.addColorStop(.65, '#ffe2cc'); sky.addColorStop(1, '#c8c7d8');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#fff8d8'; ctx.beginPath(); ctx.arc(785, 82, 43, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 18; i++) {
    const x = i * 75 - 25, height = 65 + (i * 37) % 70;
    ctx.fillStyle = i % 3 ? theme.wall : '#a58fae'; ctx.fillRect(x, 155 - height, 66, height + 38);
    ctx.fillStyle = '#fff8c477';
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) ctx.fillRect(x + 8 + col * 19, 160 - height + row * 19, 8, 10);
  }
  ctx.fillStyle = '#62778c'; ctx.beginPath(); ctx.moveTo(355, 155); ctx.lineTo(605, 155);
  ctx.lineTo(947, HEIGHT); ctx.lineTo(13, HEIGHT); ctx.fill();
  for (const edge of [-1.5, -.5, .5, 1.5]) {
    const far = project(edge, VIEW_DISTANCE), near = project(edge, 0);
    ctx.strokeStyle = '#dcecf1'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke();
    ctx.strokeStyle = '#293b53'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(far.x, far.y); ctx.lineTo(near.x, near.y); ctx.stroke();
  }
  for (let depth = (8 - world.distance % 8); depth < VIEW_DISTANCE; depth += 8) {
    const left = project(-1.47, depth), right = project(1.47, depth);
    ctx.strokeStyle = '#9ea6ab'; ctx.lineWidth = 2 + left.scale * 3;
    ctx.beginPath(); ctx.moveTo(left.x, left.y); ctx.lineTo(right.x, right.y); ctx.stroke();
  }
  ctx.fillStyle = '#2e5066'; ctx.fillRect(332, 130, 296, 31);
  ctx.fillStyle = '#fff0ca'; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(theme.name, WIDTH / 2, 153); ctx.textAlign = 'start';
  const closeObstacles = [];
  for (const item of [...world.objects].sort((a, b) => b.at - a.at)) {
    const depth = item.at - world.distance;
    if (depth < -4 || depth > VIEW_DISTANCE) continue;
    if (depth < 6 && ['train', 'barrier', 'sign'].includes(item.type)) {
      closeObstacles.push(item);
      continue;
    }
    drawObject(ctx, item, project(item.lane, depth), theme);
  }
  drawRunner(ctx, project(world.visualLane, 0));
  for (const item of closeObstacles) drawObject(ctx, item, project(item.lane, item.at - world.distance), theme);
  if (world.dodgeTime > 0) {
    const p = project(world.visualLane, 0);
    ctx.save(); ctx.globalAlpha = Math.min(1, world.dodgeTime * 2);
    ctx.font = '900 22px system-ui'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = '#214f62'; ctx.fillStyle = '#fff6b9';
    ctx.strokeText(world.dodgeText, p.x, 285 - (1 - world.dodgeTime) * 18);
    ctx.fillText(world.dodgeText, p.x, 285 - (1 - world.dodgeTime) * 18);
    ctx.restore();
  }
  ctx.fillStyle = '#193950b8'; ctx.fillRect(14, 12, 308, 75);
  ctx.fillStyle = '#fff'; ctx.font = '900 21px system-ui';
  ctx.fillText(`🏃 ${Math.floor(world.distance)} m`, 28, 41);
  ctx.font = '800 16px system-ui'; ctx.fillText(`⭐ ${score.value}   🪙 ${coins.value}   📚 ${tickets.value}/3`, 28, 70);
  ctx.fillStyle = '#193950b8'; ctx.fillRect(WIDTH - 195, 12, 181, 54);
  ctx.fillStyle = '#fff'; ctx.font = '900 19px system-ui';
  ctx.fillText(`♥ ${lives.value}　🛡 ${shields.value}`, WIDTH - 177, 46);
  const warning = world.objects.find(item => !item.passed && item.lane === world.lane
    && ['train', 'barrier', 'sign'].includes(item.type) && item.at - world.distance < 14 && item.at > world.distance);
  if (warning) {
    ctx.fillStyle = '#fff0bf'; ctx.fillRect(WIDTH / 2 - 95, 96, 190, 34);
    ctx.fillStyle = '#743f43'; ctx.font = '900 17px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(warning.type === 'train' ? '🚆 換道！' : warning.type === 'barrier' ? '⬆ 跳過路障！' : '⬇ 滑過標誌！', WIDTH / 2, 119);
    ctx.textAlign = 'start';
  }
}
function drawObject(ctx, item, p, theme) {
  const { x, y, scale } = p;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (item.type === 'train') {
    ctx.fillStyle = '#29395255'; ctx.beginPath(); ctx.ellipse(0, 4, 65, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#364355'; ctx.fillRect(-58, -118, 116, 122);
    ctx.fillStyle = theme.train; ctx.fillRect(-54, -116, 108, 108);
    ctx.fillStyle = '#b5e6ef'; ctx.fillRect(-43, -102, 86, 55);
    ctx.fillStyle = '#5c8194'; ctx.fillRect(-3, -102, 6, 55);
    ctx.fillStyle = '#fff2b2'; ctx.fillRect(-40, -31, 19, 12); ctx.fillRect(21, -31, 19, 12);
    ctx.fillStyle = '#26384d'; ctx.fillRect(-57, -9, 114, 13);
  } else if (item.type === 'barrier') {
    ctx.fillStyle = '#d8544b'; ctx.fillRect(-43, -45, 86, 44);
    ctx.fillStyle = '#fff5dc'; for (let i = -33; i < 40; i += 26) {
      ctx.beginPath(); ctx.moveTo(i, -45); ctx.lineTo(i + 13, -45); ctx.lineTo(i - 12, -1); ctx.lineTo(i - 25, -1); ctx.fill();
    }
    ctx.fillStyle = '#75586a'; ctx.fillRect(-35, -2, 9, 14); ctx.fillRect(25, -2, 9, 14);
  } else if (item.type === 'sign') {
    ctx.fillStyle = '#6a567c'; ctx.fillRect(-40, -102, 10, 103); ctx.fillRect(30, -102, 10, 103);
    ctx.fillStyle = '#ffcf77'; ctx.fillRect(-58, -102, 116, 39);
    ctx.fillStyle = '#754b6b'; ctx.font = '900 24px system-ui'; ctx.textAlign = 'center'; ctx.fillText('低頭', 0, -74);
  } else if (item.type === 'coin') {
    ctx.fillStyle = '#ad6631'; ctx.beginPath(); ctx.ellipse(0, -40, 19, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffdc69'; ctx.beginPath(); ctx.ellipse(-2, -43, 18, 23, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b17d3a'; ctx.font = '900 25px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', -2, -34);
  } else if (item.type === 'ticket') {
    ctx.fillStyle = '#9c5bb1'; ctx.fillRect(-27, -68, 54, 53);
    ctx.fillStyle = '#fff5cb'; ctx.fillRect(-21, -61, 42, 39);
    ctx.fillStyle = '#7b4b90'; ctx.font = '900 25px system-ui'; ctx.textAlign = 'center'; ctx.fillText('A', 0, -30);
  } else if (item.type === 'shield') {
    ctx.fillStyle = '#68d2e4'; ctx.beginPath(); ctx.moveTo(0, -82); ctx.lineTo(29, -65); ctx.lineTo(23, -26);
    ctx.lineTo(0, -12); ctx.lineTo(-23, -26); ctx.lineTo(-29, -65); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 25px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✓', 0, -38);
  }
  ctx.restore();
}
function drawRunner(ctx, p) {
  const jumping = world.jumpHeight > .15;
  const sliding = world.slideVisual > .15 && !jumping;
  const switching = Math.abs(world.lane - world.visualLane) > .08;
  // The three generated running frames have slightly different silhouettes.
  // Keep one consistent rear view while running, with continuous motion instead of hard frame cuts.
  const frame = jumping ? 3 : sliding ? 4 : switching ? 5 : 0;
  const lift = world.jumpHeight * 65;
  const gait = jumping || sliding ? 0 : Math.sin(world.activeTime * 14);
  const bob = jumping || sliding ? 0 : (1 - Math.cos(world.activeTime * 14)) * 1.2;
  ctx.save();
  ctx.fillStyle = '#142b4377';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 3, Math.max(18, 35 - lift * .12), 10, 0, 0, Math.PI * 2);
  ctx.fill();
  if (world.invincible > 0) {
    ctx.strokeStyle = '#b9f6ff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, 41, 14, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (runnerSpriteReady && runnerSprite?.complete) {
    // Each 512px frame is a full-body rear view. The player always faces the track ahead.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(p.x + gait * 1.2, p.y - lift - bob);
    if (!jumping && !sliding && !switching) ctx.rotate(gait * .018);
    if (switching && world.lane < world.visualLane) ctx.scale(-1, 1);
    if (sliding && slideSpriteReady && slideSprite?.complete) {
      const slideHeight = 188 - 63 * world.slideVisual;
      ctx.drawImage(slideSprite, -94, -188 + 76 * world.slideVisual, 188, slideHeight);
    } else {
      ctx.scale(1, 1 - .42 * world.slideVisual);
      ctx.drawImage(runnerSprite, (frame % 3) * 512, Math.floor(frame / 3) * 512,
        512, 512, -94, -188, 188, 188);
    }
  } else {
    // Keep a rear-facing silhouette while the sprite asset is loading.
    ctx.translate(p.x + gait * 1.2, p.y - lift - bob);
    ctx.scale(1, 1 - .42 * world.slideVisual);
    ctx.fillStyle = '#213b5b';
    ctx.fillRect(-20, -43, 15, 40); ctx.fillRect(5, -43, 15, 40);
    ctx.fillStyle = '#f7ead1';
    ctx.fillRect(-24, -8, 21, 9); ctx.fillRect(4, -8, 21, 9);
    ctx.fillStyle = '#e96872';
    ctx.beginPath(); ctx.moveTo(-22, -108); ctx.lineTo(22, -108);
    ctx.lineTo(25, -43); ctx.lineTo(-25, -43); ctx.fill();
    ctx.fillStyle = '#287eaf'; ctx.fillRect(-16, -97, 32, 38);
    ctx.fillStyle = '#333f57'; ctx.beginPath(); ctx.arc(0, -126, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#138c98'; ctx.fillRect(-21, -145, 42, 10);
  }
  ctx.restore();
}

</script>

<template>
  <main class="runner-page">
    <header class="topbar"><div><span>VOCABULARY · METRO RUN</span><h1>🚇 單字地鐵跑酷</h1><p>換道・跳躍・滑行・收集單字票券</p></div><nav><NuxtLink to="/">← 回首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">全校英雄榜</NuxtLink></nav></header>
    <div class="layout">
      <section class="game-panel"><div class="stage-head"><strong>🚉 {{ stationName }}</strong><span>下一站 {{ Math.max(0, nextStation - meters) }} m</span></div>
        <div class="canvas-wrap"><canvas ref="canvas" :width="WIDTH" :height="HEIGHT" aria-label="三線道地鐵跑酷畫面" @pointerdown="pointerDown" @pointerup="pointerUp" @pointercancel="pointerCancel"></canvas>
          <div v-if="phase !== 'playing'" class="overlay"><div v-if="phase === 'loading'" class="overlay-card">正在準備單字與軌道…</div>
            <div v-else-if="phase === 'ready'" class="overlay-card"><h2>🚇 彩虹線開跑！</h2><p>三條軌道持續前進。左右換道避開列車、向上跳過路障、向下滑過高標誌。</p><p>收集三張單字票券才會出題；答對能拿分數與護盾。途中還有金幣與各站里程獎勵。</p><button :disabled="words.length < 4" @click="startGame">開始跑酷</button><small>{{ notice }}</small></div>
            <div v-else-if="phase === 'quiz' && quiz" class="overlay-card"><span class="quiz-label">📚 單字票券挑戰</span><h2>{{ quiz.word.zh_tw }}</h2><p>選出對應的英文單字</p><div class="choices"><button v-for="choice in quiz.choices" :key="choice.en_us" @click="answer(choice)">{{ choice.en_us }}</button></div></div>
            <div v-else-if="phase === 'paused'" class="overlay-card"><h2>⏸️ 暫停中</h2><p>距離 {{ meters }} m · {{ score }} 分</p><button @click="togglePause">繼續跑酷</button></div>
            <div v-else-if="phase === 'ended'" class="overlay-card"><h2>🏁 本局結束</h2><p>{{ notice }}</p><p><strong>{{ meters }} m · {{ score }} 分</strong><br>答對 {{ correctWords.length }} 題 · 答錯 {{ wrongWords.length }} 題</p><small>{{ saveNotice }}</small><div class="end-actions"><button @click="startGame">再跑一次</button><button v-if="saveNotice.includes('失敗')" @click="saveRecord">重試儲存</button></div></div>
          </div>
        </div>
        <div class="controls"><button aria-label="向左換道" @click="move(-1)">◀ 左</button><button aria-label="跳躍" @click="jump">▲ 跳</button><button aria-label="滑行" @click="slide">▼ 滑</button><button aria-label="向右換道" @click="move(1)">右 ▶</button><button v-if="tiltSupported" class="gyro-control" @click="tiltEnabled ? disableTilt() : enableTilt()">{{ tiltEnabled ? '📱 傾斜換道：已啟用（點此關閉）' : '📱 啟用手機傾斜換道' }}</button></div>
      </section>
      <aside class="side-panel"><div class="stat-grid"><div><small>❤️ 愛心</small><strong>{{ lives }}</strong></div><div><small>🛡 護盾</small><strong>{{ shields }}</strong></div><div><small>🎟 單字票券</small><strong>{{ tickets }}/3</strong></div><div><small>🪙 金幣</small><strong>{{ coins }}</strong></div></div><p class="notice" role="status">{{ notice }}</p><div v-if="tiltSupported" class="tilt-panel"><strong>📱 手機傾斜換道</strong><div class="tilt-buttons"><button v-if="!tiltEnabled" @click="enableTilt">啟用陀螺儀</button><template v-else><button @click="calibrateTilt">重新校正</button><button @click="disableTilt">關閉</button></template></div><small role="status">{{ tiltStatus || '正握手機後啟用；傾斜控制左右，向上／下滑控制跳躍與滑行。' }}</small></div><div class="mission"><h2>本局目標</h2><p>收集票券回答英文題，跑過每 500 m 的車站，挑戰更高分。每兩站補回一顆愛心。</p><div class="route"><span v-for="(station, index) in STATIONS" :key="station.name" :class="{ active: Math.floor(meters / 500) % STATIONS.length === index }">{{ station.name }}</span></div></div><details class="help"><summary>操作與障礙說明</summary><p>電腦：←→ 換道、↑／空白鍵跳躍、↓ 滑行、Esc 暫停。手機：可啟用傾斜換道，也可滑動畫面或按下方虛擬按鍵。</p><p>列車必須換道；矮路障可以跳過；高標誌需滑行。撞擊會先消耗護盾，沒有護盾才失去愛心。</p></details><div class="side-actions"><button v-if="phase === 'playing' || phase === 'paused'" @click="togglePause">{{ phase === 'playing' ? '⏸ 暫停' : '▶ 繼續' }}</button><button v-if="['playing', 'paused', 'quiz'].includes(phase)" class="stop" @click="endGame('你已結束本局。')">結束並記錄</button></div></aside>
    </div>
  </main>
</template>

<style scoped>
.runner-page{min-height:100dvh;padding:12px clamp(10px,1.7vw,25px);background:radial-gradient(circle at top left,#31858f,#183856 53%,#152440);font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;color:#edfaff}.topbar{max-width:1450px;margin:0 auto 12px;display:flex;align-items:end;justify-content:space-between;gap:14px}.topbar span{font-size:11px;letter-spacing:.17em;color:#bdebdc;font-weight:900}.topbar h1{font-size:clamp(27px,3vw,43px);margin:2px 0;color:#fff5d8}.topbar p{margin:0;color:#d5e9ed}.topbar nav{display:flex;gap:7px;flex-wrap:wrap}.topbar a{background:#f3e8c8;color:#24445b;text-decoration:none;border-radius:8px;padding:8px 11px;font-weight:900;font-size:13px}.layout{max-width:1450px;margin:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(275px,315px);gap:12px}.game-panel,.side-panel{border:2px solid #6fbbc5;background:#193952;border-radius:17px;box-shadow:0 12px 28px #06192b77;overflow:hidden}.stage-head{display:flex;justify-content:space-between;gap:8px;padding:8px 12px;background:#24556c;font-size:14px}.canvas-wrap{position:relative;background:#88bdd5}.canvas-wrap canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;margin-inline:auto;touch-action:none}.overlay{position:absolute;inset:0;display:grid;place-items:center;background:#102e4bbd;padding:9px}.overlay-card{width:min(100%,430px);max-height:100%;overflow:auto;background:#f6faf4;color:#24465b;border:4px solid #f2d895;border-radius:17px;padding:clamp(12px,2vw,22px);text-align:center;box-shadow:0 10px 22px #07172a88}.overlay-card h2{margin:4px 0 9px;color:#285e77}.overlay-card p{line-height:1.45}.overlay-card small{display:block;margin-top:9px;color:#74646c}.overlay-card button{border:0;border-radius:9px;background:#f5bb69;color:#344461;padding:9px 13px;font-weight:900;cursor:pointer}.overlay-card button:disabled{opacity:.55}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.choices button{min-width:0;overflow-wrap:anywhere;background:#d8eaf0}.quiz-label{font-weight:900;color:#4f8d93}.end-actions{display:flex;justify-content:center;gap:8px;margin-top:11px}.controls{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;padding:9px}.controls button{border:2px solid #c7e9e8;background:#4b99a1;color:white;border-radius:10px;min-height:50px;font-weight:900;font-size:16px;cursor:pointer;touch-action:manipulation}.controls button:nth-child(2){background:#cb7868}.controls button:nth-child(3){background:#7d81bc}.controls .gyro-control{grid-column:1/-1;min-height:35px;background:#28766c;font-size:13px}.side-panel{padding:12px}.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.stat-grid>div{display:flex;align-items:center;justify-content:space-between;background:#23506a;border-radius:9px;padding:8px}.stat-grid small{color:#b6e9e5;font-size:11px}.stat-grid strong{font-size:20px}.notice{min-height:57px;background:#27516a;border-radius:10px;padding:10px;font-weight:800;font-size:13px;line-height:1.45}.tilt-panel{background:#254f67;border:1px solid #72b8c3;border-radius:10px;padding:9px}.tilt-panel strong{font-size:13px}.tilt-panel small{display:block;margin-top:5px;color:#d0ecec;font-size:11px;line-height:1.4}.tilt-buttons{display:flex;gap:6px;margin-top:5px}.tilt-buttons button{border:0;border-radius:7px;padding:6px 9px;background:#e8da9d;color:#23425b;font-weight:900;cursor:pointer}.mission h2{font-size:17px;margin:12px 0 4px}.mission p,.help p{font-size:12px;line-height:1.5}.route{display:grid;gap:5px}.route span{padding:6px 8px;background:#24475e;border-left:3px solid #6f9da3;border-radius:4px;font-size:12px}.route span.active{background:#32677a;border-color:#ffd679;color:#fff7d1;font-weight:900}.help{margin-top:12px;border-top:1px solid #5c9ba6;padding-top:9px;font-size:12px}.help summary{cursor:pointer;font-weight:900}.side-actions{display:flex;gap:7px;margin-top:12px}.side-actions button{flex:1;border:0;border-radius:9px;background:#9dcbd0;color:#1b4356;padding:10px;font-weight:900;cursor:pointer}.side-actions .stop{background:#e89990;color:#472c39}@media(min-width:950px) and (min-height:680px){.runner-page{height:100dvh;min-height:0;overflow:hidden;display:flex;flex-direction:column}.topbar{width:100%;flex:0 0 auto}.layout{width:100%;flex:1;min-height:0;align-items:stretch}.game-panel{display:flex;flex-direction:column;min-height:0}.canvas-wrap{margin:auto 0}.canvas-wrap canvas{max-width:calc((100dvh - 205px)*16/9)}.side-panel{overflow-y:auto}.help{margin-top:auto}}@media(max-width:950px){.layout{grid-template-columns:1fr}.canvas-wrap canvas{max-width:none}.side-panel{display:grid;grid-template-columns:1fr 1fr;gap:9px}.stat-grid{grid-row:span 2}.mission{grid-column:1/-1}.route{grid-template-columns:repeat(2,1fr)}.help{grid-column:1/-1}.side-actions{grid-column:1/-1}}@media(max-width:620px){.runner-page{padding:7px}.topbar{display:block}.topbar h1{font-size:26px}.topbar p{font-size:11px}.topbar nav{margin-top:7px;gap:5px}.topbar a{font-size:11px;padding:6px}.stage-head{font-size:11px}.controls{padding:6px;gap:4px}.controls button{min-height:53px;font-size:14px}.controls .gyro-control{min-height:36px}.side-panel{display:block;padding:10px}.mission p{margin:5px 0}.route{display:none}.notice{min-height:0;padding:7px}.overlay-card{padding:9px}.overlay-card h2{font-size:19px}.overlay-card p{font-size:12px;margin:7px 0}.choices button{font-size:12px;padding:7px}}
</style>
