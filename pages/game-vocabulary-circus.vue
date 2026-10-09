<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const GAME = '單字馬戲團';
const WIDTH = 800;
const HEIGHT = 440;
const HAZARD_START = 350;
const HAZARD_SPACING = 300;
const STAGE_LENGTH = HAZARD_START + 7 * HAZARD_SPACING + 300;
const JUMP_VELOCITY = 360;
const GRAVITY = 640;
const JUMP_CLEARANCE = { ring: 24, pot: 49, monkey: 36, gap: 38,
  hurdle: 54, swing: 40, void: 40 };
const acts = [
  { name: '騎獅穿火圈', tip: '火圈要從中央穿過，火盆則要跳過；獅子會陪你走完五幕。', mount: 'lion', floor: 333, hazards: ['ring', 'pot', 'ring', 'pot', 'ring', 'pot', 'ring', 'pot'] },
  { name: '走鋼索', tip: '跳過猴子；遇到高處的旗幟可按「向下」蹲低。', mount: 'rope', floor: 304, hazards: ['monkey', 'monkey', 'banner', 'monkey', 'banner', 'monkey', 'monkey', 'banner'] },
  { name: '踩球前進', tip: '跳過球與球之間的缺口；向下可放慢速度。', mount: 'ball', floor: 330, hazards: ['gap', 'gap', 'banner', 'gap', 'gap', 'banner', 'gap', 'gap'] },
  { name: '騎馬跨欄', tip: '跳過欄杆與火盆，別碰到障礙。', mount: 'horse', floor: 333, hazards: ['hurdle', 'pot', 'hurdle', 'hurdle', 'pot', 'hurdle', 'pot', 'hurdle'] },
  { name: '空中飛人', tip: '利用「向上」躍向下一架鞦韆；向下能稍微減速。', mount: 'trapeze', floor: 326, hazards: ['swing', 'void', 'swing', 'void', 'swing', 'void', 'swing', 'void'] }
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
const loading = ref(true);
const phase = ref('ready');
const notice = ref('正在讀取本課單字…');
const sensorStatus = ref('可使用鍵盤或畫面上的「向上／向下」按鍵。');
const sensorEnabled = ref(false);
const sensorInverted = ref(false);
const needsLandscape = ref(false);
const stage = ref(0);
const lives = ref(3);
const points = ref(0);
const quiz = ref(null);
const correctWords = ref([]);
const wrongWords = ref([]);
const secondsToQuiz = ref(35);
const saveNotice = ref('');
const score = computed(() => Math.max(0, points.value));
const historyLink = computed(() => ({ path: '/history', query: { game: GAME } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME, ...lesson } }));
const world = { progress: 0, height: 0, velocity: 0, hazards: [], activeSeconds: 0, nextQuiz: 35,
  lastFrame: 0, invincible: 0, freezeUntil: 0, time: 0 };
const controls = { down: false, sensorDown: false, sensorUp: false, neutral: null };
let frameId = 0;
let startedAt = 0;
let recordId = '';
let attemptNumber = 0;
let disposed = false;
let sensorReceived = false;
let sensorTimer = 0;

const delayToQuiz = () => 30 + Math.random() * 10;
function resetAct() {
  world.progress = 0;
  world.height = 0;
  world.velocity = 0;
  world.invincible = 1;
  world.hazards = acts[stage.value].hazards.map((type, index) => ({
    type, x: HAZARD_START + index * HAZARD_SPACING, passed: false, cleared: false
  }));
  notice.value = `第 ${stage.value + 1} 幕：${acts[stage.value].name}。${acts[stage.value].tip}`;
}
function startGame() {
  if (loading.value || words.value.length < 4 || needsLandscape.value) return;
  stage.value = 0;
  lives.value = 3;
  points.value = 0;
  correctWords.value = [];
  wrongWords.value = [];
  quiz.value = null;
  saveNotice.value = '';
  world.activeSeconds = 0;
  world.nextQuiz = delayToQuiz();
  world.lastFrame = 0;
  world.time = 0;
  secondsToQuiz.value = Math.ceil(world.nextQuiz);
  controls.down = false;
  controls.sensorDown = false;
  startedAt = Date.now();
  recordId = crypto.randomUUID();
  attemptNumber = 0;
  resetAct();
  phase.value = 'playing';
}
function endGame(message) {
  if (!['playing', 'quiz', 'wrongPause'].includes(phase.value)) return;
  phase.value = 'ended';
  quiz.value = null;
  controls.down = false;
  notice.value = message;
  if (recordId) saveRecord();
}
function jump() {
  if (phase.value !== 'playing' || world.height > 1 || world.velocity > 0) return;
  world.velocity = JUMP_VELOCITY;
  notice.value = `${acts[stage.value].name}：跳！`;
}
function hitObstacle(type) {
  if (world.invincible > 0 || phase.value !== 'playing') return;
  lives.value--;
  world.invincible = 1.6;
  world.height = 0;
  world.velocity = 0;
  if (lives.value <= 0) endGame(`撞上${hazardName(type)}，演出結束。`);
  else notice.value = `撞上${hazardName(type)}！還有 ${lives.value} 次機會。`;
}
function hazardName(type) {
  return ({ ring: '火圈', pot: '火盆', monkey: '猴子', banner: '高旗', gap: '缺口',
    hurdle: '欄杆', swing: '鞦韆', void: '空隙' })[type] || '障礙';
}
function askQuestion() {
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const others = words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase())
    .sort(() => Math.random() - .5).slice(0, 3);
  quiz.value = { word, choices: [word, ...others].sort(() => Math.random() - .5) };
  phase.value = 'quiz';
  controls.down = false;
  controls.sensorDown = false;
  notice.value = '演出暫停，請選出中文提示對應的英文單字。';
}
function answerQuestion(choice) {
  if (phase.value !== 'quiz' || !quiz.value) return;
  const word = quiz.value.word;
  const correct = choice.en_us === word.en_us;
  if (correct) { correctWords.value.push(word.en_us); points.value += 50; }
  else { wrongWords.value.push(word.en_us); points.value = Math.max(0, points.value - 15); }
  quiz.value = null;
  world.activeSeconds = 0;
  world.nextQuiz = delayToQuiz();
  secondsToQuiz.value = Math.ceil(world.nextQuiz);
  if (correct) { phase.value = 'playing'; notice.value = `答對！${word.zh_tw}＝${word.en_us}，演出繼續。`; }
  else { phase.value = 'wrongPause'; world.freezeUntil = performance.now() + 2500;
    notice.value = `答錯了：${word.zh_tw}＝${word.en_us}。暫停 2.5 秒。`; }
}
function advance(dt) {
  const ducking = controls.down || controls.sensorDown;
  const speed = ducking ? 87 : 139 + stage.value * 7;
  world.progress += speed * dt;
  world.invincible = Math.max(0, world.invincible - dt);
  world.height = Math.max(0, world.height + world.velocity * dt);
  world.velocity -= GRAVITY * dt;
  if (world.height <= 0) { world.height = 0; world.velocity = 0; }
  for (const hazard of world.hazards) {
    if (hazard.passed) continue;
    // Keep a successful jump during the approach, so touching down at the far edge
    // cannot turn an obstacle already cleared into a collision.
    if (world.progress >= hazard.x - 70 && world.progress <= hazard.x) {
      if (hazard.type === 'banner') hazard.cleared ||= ducking || world.height >= 75;
      else hazard.cleared ||= world.height >= JUMP_CLEARANCE[hazard.type];
    }
    // The visible hazard centre must reach the artist before contact is judged.
    if (world.progress < hazard.x) continue;
    hazard.passed = true;
    const avoided = hazard.cleared || (hazard.type === 'banner'
      ? ducking || world.height >= 75 : world.height >= JUMP_CLEARANCE[hazard.type]);
    if (avoided) points.value += 35 + stage.value * 5;
    else hitObstacle(hazard.type);
    if (phase.value !== 'playing') return;
  }
  if (world.progress >= STAGE_LENGTH) {
    points.value += 200 + stage.value * 40;
    if (stage.value === acts.length - 1) endGame('五幕演出全部完成！觀眾熱烈鼓掌！');
    else { stage.value++; resetAct(); }
  }
}
function tick(timestamp) {
  frameId = requestAnimationFrame(tick);
  const dt = world.lastFrame ? Math.min((timestamp - world.lastFrame) / 1000, .04) : 0;
  world.lastFrame = timestamp;
  if (phase.value === 'wrongPause' && timestamp >= world.freezeUntil) {
    phase.value = 'playing';
    notice.value = '暫停結束，演出繼續！';
  }
  if (phase.value === 'playing' && !document.hidden && !needsLandscape.value && dt > 0) {
    world.time += dt;
    advance(dt);
    if (phase.value === 'playing') {
      world.activeSeconds += dt;
      secondsToQuiz.value = Math.max(0, Math.ceil(world.nextQuiz - world.activeSeconds));
      if (world.activeSeconds >= world.nextQuiz) askQuestion();
    }
  }
  draw();
}
function updateLandscapeHint() {
  needsLandscape.value = window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
  world.lastFrame = 0;
}
function keyDown(event) {
  if (['ArrowUp', 'ArrowDown', ' ', 'w', 'W', 's', 'S'].includes(event.key)) event.preventDefault();
  if (event.repeat) return;
  if (['ArrowUp', ' ', 'w', 'W'].includes(event.key)) jump();
  if (['ArrowDown', 's', 'S'].includes(event.key)) controls.down = true;
}
function keyUp(event) { if (['ArrowDown', 's', 'S'].includes(event.key)) controls.down = false; }
function orientation(event) {
  const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
  const value = Math.abs(angle) % 180 === 90 ? event.gamma : event.beta;
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  if (!sensorReceived) { sensorReceived = true; window.clearTimeout(sensorTimer);
    sensorStatus.value = '感測器已連線：手機向上傾斜跳躍、向下傾斜蹲低。'; }
  if (controls.neutral === null) controls.neutral = value;
  const difference = (value - controls.neutral) * (sensorInverted.value ? -1 : 1);
  const up = difference < -12;
  if (up && !controls.sensorUp) jump();
  controls.sensorUp = up;
  controls.sensorDown = difference > 12;
}
async function enableSensor() {
  if (!window.isSecureContext || !window.DeviceOrientationEvent) {
    sensorStatus.value = '裝置或瀏覽器不支援方向感測，請使用虛擬按鍵。'; return;
  }
  try {
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await window.DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') throw new Error('未允許方向感測');
    }
    window.removeEventListener('deviceorientation', orientation);
    controls.neutral = null;
    controls.sensorUp = false;
    sensorReceived = false;
    window.addEventListener('deviceorientation', orientation);
    sensorEnabled.value = true;
    sensorStatus.value = '等待感測資料；請直握手機並稍微上下傾斜。';
    window.clearTimeout(sensorTimer);
    sensorTimer = window.setTimeout(() => {
      if (!sensorReceived) sensorStatus.value = '未收到陀螺儀資料；請確認瀏覽器權限，或改用畫面按鍵。';
    }, 2500);
  } catch (error) { sensorStatus.value = `${error.message}；請使用虛擬按鍵。`; }
}
function recalibrate() {
  controls.neutral = null;
  controls.sensorUp = false;
  controls.sensorDown = false;
  sensorStatus.value = '已重新校準，請直握手機。';
}
async function saveRecord() {
  if (!student.value?.id || !recordId) return;
  const currentId = recordId;
  const currentStarted = startedAt;
  const currentScore = score.value;
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
    score: currentScore, mistakes: wrong.length, correct_words: correct.join(', '), wrong_words: wrong.join(', '),
    attempt_number: attempt, played_at: new Date(currentStarted).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - currentStarted) / 1000), device_info: navigator.userAgent
  }, { onConflict: 'id' });
  if (recordId === currentId) saveNotice.value = error ? `紀錄儲存失敗：${error.message}。請按「重試儲存」。` : '分數與單字答題已記錄。';
}
onMounted(async () => {
  updateLandscapeHint();
  window.addEventListener('resize', updateLandscapeHint);
  window.addEventListener('orientationchange', updateLandscapeHint);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  frameId = requestAnimationFrame(tick);
  if (!student.value?.id) { await navigateTo('/'); return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) {
    loading.value = false; notice.value = '請先從首頁選擇課本、冊次和單元。'; return;
  }
  const { data, error } = await db.from('vocabularies').select('en_us,zh_tw')
    .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000);
  if (disposed) return;
  loading.value = false;
  if (error) { notice.value = `單字載入失敗：${error.message}`; return; }
  const seen = new Set();
  words.value = (data || []).filter(word => {
    const key = word.en_us?.trim().toLowerCase();
    if (!key || !word.zh_tw?.trim() || seen.has(key)) return false;
    seen.add(key); return true;
  });
  notice.value = words.value.length >= 4 ? '選擇開始演出，用向上跳躍、向下蹲低或減速。' : '本課至少需要四筆不同單字。';
});
onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frameId);
  window.removeEventListener('keydown', keyDown);
  window.removeEventListener('keyup', keyUp);
  window.removeEventListener('deviceorientation', orientation);
  window.removeEventListener('resize', updateLandscapeHint);
  window.removeEventListener('orientationchange', updateLandscapeHint);
  window.clearTimeout(sensorTimer);
});

function draw() {
  const ctx = canvas.value?.getContext('2d');
  if (!ctx) return;
  const act = acts[stage.value];
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#1a173e'); sky.addColorStop(.66, '#433061'); sky.addColorStop(1, '#a34c5c');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#ad3650' : '#d24b5a';
    ctx.beginPath(); ctx.moveTo(i * 100 - 35, 0); ctx.lineTo(i * 100 + 45, 0);
    ctx.lineTo(i * 100 + 90, 110); ctx.lineTo(i * 100 + 12, 110); ctx.fill();
  }
  ctx.fillStyle = '#ffd983'; ctx.fillRect(0, 107, WIDTH, 7);
  ctx.fillStyle = '#ffdf9b33';
  for (let i = 0; i < 7; i++) { const x = 55 + i * 116; ctx.beginPath(); ctx.moveTo(x, 106); ctx.lineTo(x - 75, 288); ctx.lineTo(x + 75, 288); ctx.fill(); }
  ctx.fillStyle = '#192037'; ctx.fillRect(0, 350, WIDTH, 90);
  for (let i = 0; i < 25; i++) {
    const x = i * 35 + 10, y = 385 + (i % 3) * 9;
    ctx.fillStyle = ['#6e4160', '#91627b', '#5f597a'][i % 3];
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  }
  const floorY = act.floor;
  if (act.mount === 'rope') {
    ctx.strokeStyle = '#f8dfaa'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, floorY + 12); ctx.lineTo(WIDTH, floorY + 12); ctx.stroke();
  } else if (act.mount === 'trapeze') {
    ctx.fillStyle = '#60436b'; ctx.fillRect(0, floorY + 20, WIDTH, 14);
    for (let i = 0; i < 7; i++) {
      const x = ((i * 180 - world.progress + WIDTH * 20) % (WIDTH + 180)) - 60;
      ctx.strokeStyle = '#e3c899'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 65); ctx.lineTo(x - 14, 240); ctx.moveTo(x + 28, 65); ctx.lineTo(x + 42, 240); ctx.stroke();
      ctx.strokeStyle = '#fff0bb'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x - 14, 240); ctx.lineTo(x + 42, 240); ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#dbaa61'; ctx.fillRect(0, floorY + 13, WIDTH, 28);
    ctx.fillStyle = '#8d554b'; ctx.fillRect(0, floorY + 39, WIDTH, 11);
    for (let i = 0; i < 9; i++) {
      const x = ((i * 130 - world.progress * .7) % 1000 + 1000) % 1000;
      ctx.fillStyle = '#f1c779'; ctx.fillRect(x, floorY + 15, 48, 3);
    }
  }
  for (const hazard of world.hazards) {
    const x = 178 + hazard.x - world.progress;
    if (x < -60 || x > WIDTH + 60) continue;
    drawHazard(ctx, hazard.type, x, floorY);
    const cueX = x - 85;
    if (!hazard.passed && cueX > 0 && cueX < WIDTH) {
      ctx.fillStyle = hazard.type === 'banner' ? '#78dff4' : '#ffe078';
      ctx.beginPath(); ctx.arc(cueX, floorY + 2, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#392541'; ctx.font = '900 16px system-ui';
      ctx.textAlign = 'center'; ctx.fillText(hazard.type === 'banner' ? '▼' : '▲', cueX, floorY + 8);
      ctx.textAlign = 'start';
    }
  }
  if (act.mount !== 'lion') drawLion(ctx, 90, floorY + 3 - world.height * .65, .68);
  drawArtist(ctx, 178, floorY - world.height, act.mount);
  // The lower flaming rim sits in front of the performer, so the lion travels through the opening.
  for (const hazard of world.hazards) {
    if (hazard.type !== 'ring') continue;
    const x = 178 + hazard.x - world.progress;
    if (x > 70 && x < WIDTH + 60) drawFireRing(ctx, x, floorY, true);
  }
  ctx.fillStyle = '#fff0b9'; ctx.font = '900 17px system-ui';
  ctx.fillText(`第 ${stage.value + 1}/5 幕　${act.name}`, 18, 37);
  ctx.fillStyle = '#fff'; ctx.font = '800 15px system-ui';
  ctx.fillText(`SCORE ${String(score.value).padStart(5, '0')}`, 18, 62);
  ctx.fillText(`♥ ${lives.value}`, WIDTH - 79, 37);
  ctx.fillStyle = '#fff3c9'; ctx.fillRect(18, 77, WIDTH - 36, 8);
  ctx.fillStyle = '#f09b62'; ctx.fillRect(18, 77, (WIDTH - 36) * Math.min(1, world.progress / STAGE_LENGTH), 8);
}
function drawHazard(ctx, type, x, floorY) {
  if (type === 'ring') {
    drawFireRing(ctx, x, floorY, false);
  } else if (type === 'pot') {
    ctx.fillStyle = '#9b5a3e'; ctx.fillRect(x - 22, floorY - 23, 44, 25);
    ctx.fillStyle = '#f47e41'; ctx.beginPath(); ctx.moveTo(x - 18, floorY - 22); ctx.lineTo(x - 7, floorY - 55);
    ctx.lineTo(x + 3, floorY - 28); ctx.lineTo(x + 14, floorY - 60); ctx.lineTo(x + 21, floorY - 22); ctx.fill();
  } else if (type === 'monkey') {
    ctx.fillStyle = '#9b693f'; ctx.beginPath(); ctx.arc(x, floorY - 18, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e5b982'; ctx.beginPath(); ctx.arc(x + 4, floorY - 22, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9b693f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x - 22, floorY - 20, 16, .4, 5.5); ctx.stroke();
    ctx.fillStyle = '#2f263b'; ctx.fillRect(x + 5, floorY - 25, 3, 3);
  } else if (type === 'banner') {
    ctx.strokeStyle = '#e9d9af'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, floorY - 165); ctx.lineTo(x, floorY - 68); ctx.stroke();
    ctx.fillStyle = '#ef6072'; ctx.fillRect(x - 29, floorY - 85, 58, 24);
    ctx.fillStyle = '#fff5d0'; ctx.font = '900 12px system-ui'; ctx.fillText('低頭', x - 24, floorY - 68);
  } else if (type === 'hurdle') {
    ctx.fillStyle = '#f5d9a2'; ctx.fillRect(x - 24, floorY - 54, 48, 9);
    ctx.fillRect(x - 20, floorY - 46, 5, 48); ctx.fillRect(x + 15, floorY - 46, 5, 48);
    ctx.fillStyle = '#d55a56'; ctx.fillRect(x - 24, floorY - 54, 48, 5);
  } else if (type === 'gap' || type === 'void') {
    ctx.fillStyle = '#151535'; ctx.fillRect(x - 31, floorY + 11, 62, 45);
    ctx.strokeStyle = '#fbdf9b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 34, floorY + 8); ctx.lineTo(x - 34, floorY + 42);
    ctx.moveTo(x + 34, floorY + 8); ctx.lineTo(x + 34, floorY + 42); ctx.stroke();
  } else if (type === 'swing') {
    ctx.strokeStyle = '#ffdf9b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 19, 112); ctx.lineTo(x - 19, floorY - 84);
    ctx.moveTo(x + 19, 112); ctx.lineTo(x + 19, floorY - 84); ctx.moveTo(x - 22, floorY - 84); ctx.lineTo(x + 22, floorY - 84); ctx.stroke();
    ctx.fillStyle = '#fff7d0'; ctx.font = '900 12px system-ui'; ctx.fillText('跳！', x - 14, floorY - 95);
  }
}
function drawFireRing(ctx, x, floorY, foreground) {
  const centreY = floorY - 82;
  // This opening contains the whole jumping lion and rider, including at the jump apex.
  ctx.save();
  ctx.lineWidth = foreground ? 10 : 13;
  ctx.strokeStyle = foreground ? '#ffd56b' : '#a94438';
  ctx.beginPath();
  ctx.ellipse(x, centreY, 60, 119, 0, foreground ? .12 : 0,
    foreground ? Math.PI - .12 : Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI * 2 / 14;
    if ((Math.sin(a) > 0) !== foreground) continue;
    const fx = x + Math.cos(a) * 60;
    const fy = centreY + Math.sin(a) * 119;
    const flicker = 2 * Math.sin(world.time * 12 + i);
    ctx.fillStyle = i % 2 ? '#ffe481' : '#fa7346';
    ctx.beginPath();
    ctx.moveTo(fx - 7, fy + 5);
    ctx.quadraticCurveTo(fx - 4, fy - 5, fx + flicker, fy - 15 - flicker);
    ctx.quadraticCurveTo(fx + 8, fy - 2, fx + 7, fy + 5);
    ctx.fill();
  }
  ctx.restore();
}
function drawLion(ctx, x, floorY, scale = 1) {
  ctx.save();
  ctx.translate(x, floorY);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  // Tail, four rounded paws and a lively body remain recognizable at mobile size.
  ctx.strokeStyle = '#b66a31'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-37, -23); ctx.bezierCurveTo(-66, -56, -70, -10, -55, -4); ctx.stroke();
  ctx.fillStyle = '#8e4a2c'; ctx.beginPath(); ctx.ellipse(-55, -3, 8, 5, -.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eaa844';
  ctx.beginPath(); ctx.ellipse(0, -26, 45, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cf842f';
  for (const px of [-30, -13, 21, 35]) {
    ctx.beginPath(); ctx.ellipse(px, -3, 8, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7c36b'; ctx.beginPath(); ctx.ellipse(px + 1, 10, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cf842f';
  }
  ctx.fillStyle = '#f6c572'; ctx.beginPath(); ctx.ellipse(5, -27, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#bd6b32';
  for (let i = 0; i < 11; i++) {
    const a = i * Math.PI * 2 / 11;
    ctx.beginPath(); ctx.arc(34 + Math.cos(a) * 19, -37 + Math.sin(a) * 19, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#d8843e'; ctx.beginPath(); ctx.arc(34, -37, 23, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd487';
  for (const earX of [19, 48]) { ctx.beginPath(); ctx.arc(earX, -58, 8, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#ffdda0'; ctx.beginPath(); ctx.ellipse(38, -36, 19, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff8e9';
  for (const eyeX of [32, 45]) { ctx.beginPath(); ctx.arc(eyeX, -41, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3e2b35';
  for (const eyeX of [33, 46]) { ctx.beginPath(); ctx.arc(eyeX, -41, 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff0c9'; ctx.beginPath(); ctx.ellipse(40, -28, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#654052'; ctx.beginPath(); ctx.moveTo(38, -33); ctx.lineTo(47, -33); ctx.lineTo(42, -27); ctx.fill();
  ctx.strokeStyle = '#654052'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(42, -27, 7, .12, Math.PI - .12); ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(42 + side * 8, -27); ctx.lineTo(42 + side * 20, -31); ctx.stroke();
  }
  ctx.restore();
}
function drawArtist(ctx, x, floorY, mount) {
  if (world.invincible > 0 && Math.floor(world.time * 10) % 2) return;
  if (mount === 'lion') drawLion(ctx, x, floorY);
  else if (mount === 'horse') {
    ctx.fillStyle = '#a36a4b';
    ctx.beginPath(); ctx.ellipse(x, floorY - 22, 39, 21, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 27, floorY - 7, 8, 20); ctx.fillRect(x + 20, floorY - 7, 8, 20);
    ctx.beginPath(); ctx.arc(x + 34, floorY - 28, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#372a30'; ctx.fillRect(x + 39, floorY - 32, 3, 3);
  } else if (mount === 'ball') {
    ctx.fillStyle = '#e3b350'; ctx.beginPath(); ctx.arc(x, floorY - 9, 26, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b64a58'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, floorY - 9, 20, -.8, 1.8); ctx.stroke();
    ctx.strokeStyle = '#5a9eaf'; ctx.beginPath(); ctx.arc(x, floorY - 9, 14, 2.2, 5.5); ctx.stroke();
  }
  const duckOffset = (controls.down || controls.sensorDown) && world.height === 0 ? 13 : 0;
  const y = floorY - (mount === 'lion' || mount === 'horse' ? 66 : mount === 'ball' ? 53 : 30) + duckOffset;
  ctx.fillStyle = '#f4c49d'; ctx.fillRect(x - 5, y + 17, 10, 22);
  ctx.fillStyle = '#5bd2d0'; ctx.beginPath(); ctx.moveTo(x - 18, y + 13); ctx.lineTo(x + 18, y + 13);
  ctx.lineTo(x + 12, y + 35); ctx.lineTo(x - 12, y + 35); ctx.fill();
  ctx.fillStyle = '#f5c194'; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e45770'; ctx.beginPath(); ctx.arc(x, y - 12, 15, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff8e7'; ctx.beginPath(); ctx.arc(x + 6, y + 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#aa4260'; ctx.beginPath(); ctx.arc(x + 7, y + 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f4c49d'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 14, y + 20); ctx.lineTo(x - 25, y + (controls.down || controls.sensorDown ? 30 : 11));
  ctx.moveTo(x + 14, y + 20); ctx.lineTo(x + 25, y + 10); ctx.stroke();
}
</script>

<template>
  <main class="circus-page">
    <div v-if="needsLandscape" class="landscape-prompt" role="status"><span aria-hidden="true">📱 ↻</span><strong>請將手機轉為橫向</strong><p>橫向時才會開始或繼續演出，轉向期間遊戲會暫停。</p></div>
    <header class="page-header">
      <div><span class="eyebrow">VOCABULARY · CIRCUS STAGE</span><h1>🎪 單字馬戲團</h1><p>五幕懷舊馬戲挑戰，跳躍、蹲低並完成單字題</p></div>
      <nav><NuxtLink to="/">← 回首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">全校英雄榜</NuxtLink></nav>
    </header>
    <div class="layout">
      <section class="stage-panel">
        <div class="stage-status"><strong>第 {{ stage + 1 }}/5 幕 · {{ acts[stage].name }}</strong><span>♥ {{ lives }}　{{ score }} 分</span><span v-if="phase === 'playing'">距單字題約 {{ secondsToQuiz }} 秒</span></div>
        <div class="canvas-wrap">
          <canvas ref="canvas" :width="WIDTH" :height="HEIGHT" aria-label="馬戲團橫向動作遊戲畫面"></canvas>
          <div v-if="phase !== 'playing'" class="stage-shade">
            <div v-if="phase === 'ready'" class="shade-card"><h2>準備登台？</h2><p>向上跳躍；向下蹲低或放慢速度。依序完成五幕，單字題會在遊玩約 30–40 秒後出現。</p><button :disabled="loading || words.length < 4" @click="startGame">{{ loading ? '載入中…' : '開始演出' }}</button></div>
            <div v-else-if="phase === 'quiz' && quiz" class="shade-card"><small>單字挑戰 · 演出已暫停</small><h2>{{ quiz.word.zh_tw }}</h2><p>選出對應的英文單字</p><div class="choices"><button v-for="choice in quiz.choices" :key="choice.en_us" @click="answerQuestion(choice)">{{ choice.en_us }}</button></div></div>
            <div v-else-if="phase === 'wrongPause'" class="shade-card"><h2>稍候再登台</h2><p>{{ notice }}</p></div>
            <div v-else class="shade-card"><h2>本局結束</h2><p>{{ notice }} · {{ score }} 分</p><button @click="startGame">再演一次</button></div>
          </div>
        </div>
        <div class="touch-controls"><button aria-label="向上跳躍" @pointerdown.prevent="jump">▲ 向上跳躍</button><button aria-label="向下蹲低" @pointerdown.prevent="controls.down = true" @pointerup="controls.down = false" @pointercancel="controls.down = false" @pointerleave="controls.down = false">▼ 向下蹲低／減速</button></div>
      </section>
      <aside class="side-panel">
        <h2>操作與演出</h2>
        <p>電腦用 ↑／空白鍵跳躍、↓ 蹲低；手機可按畫面上的按鍵。啟用感測器後，手機上下傾斜也能操作。</p>
        <div class="actions"><button @click="enableSensor">啟用陀螺儀</button><button v-if="sensorEnabled" @click="recalibrate">重新校準</button><button v-if="sensorEnabled" @click="sensorInverted = !sensorInverted; recalibrate()">方向相反？切換</button></div>
        <small role="status">{{ sensorStatus }}</small>
        <hr>
        <p>{{ acts[stage].tip }}</p>
        <p>每累積 30–40 秒有效遊玩時間出一題。問答、暫停或切換分頁時不計時；答錯扣 15 分並暫停 2.5 秒。</p>
        <p class="notice" role="status">{{ notice }}</p>
        <div class="actions"><button v-if="['playing','quiz','wrongPause'].includes(phase)" class="end" @click="endGame('你已結束本局。')">結束並記錄</button><button v-if="phase === 'ended' && saveNotice.includes('失敗')" @click="saveRecord">重試儲存</button></div>
        <small>{{ saveNotice }}</small>
        <div class="word-counts"><span>答對 {{ correctWords.length }}</span><span>答錯 {{ wrongWords.length }}</span></div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.circus-page{min-height:100dvh;padding:12px clamp(10px,2vw,30px);background:radial-gradient(circle at 50% -15%,#70435f,#261936 55%,#120e26);color:#fff5da;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif}.page-header{max-width:1500px;margin:0 auto 12px;display:flex;justify-content:space-between;align-items:center;gap:15px}.eyebrow{font-size:11px;letter-spacing:.18em;color:#ffd587;font-weight:900}.page-header h1{font-size:clamp(26px,3vw,42px);margin:2px 0}.page-header p{margin:0;color:#efd5c5}.page-header nav{display:flex;gap:8px;flex-wrap:wrap}.page-header a{color:#3f2346;background:#ffe4ab;border-radius:9px;padding:8px 11px;text-decoration:none;font-weight:800}.layout{max-width:1500px;margin:auto;display:grid;grid-template-columns:minmax(0,1.75fr) minmax(285px,.65fr);gap:14px}.stage-panel,.side-panel{background:#382440;border:2px solid #e2ac6e;border-radius:18px;box-shadow:0 12px 30px #0006;overflow:hidden}.stage-status{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:9px 14px;color:#ffedbd;font-size:14px}.canvas-wrap{position:relative;background:#130d27}.canvas-wrap canvas{display:block;width:100%;aspect-ratio:800/440;max-height:69dvh}.stage-shade{position:absolute;inset:0;display:grid;place-items:center;background:#160f2aaa;padding:12px}.shade-card{width:min(100%,450px);max-height:100%;overflow:auto;background:#fff4d8;color:#42283b;border:4px solid #e6a75f;border-radius:18px;padding:18px;text-align:center;box-shadow:0 16px 34px #0007}.shade-card h2{margin:5px 0 9px;font-size:clamp(20px,3vw,31px)}.shade-card p{line-height:1.45}.shade-card small{font-weight:900;color:#a95361}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.choices button,.shade-card>button{padding:10px;border:2px solid #c18c62;border-radius:9px;background:#f9dda5;color:#44273d;font-weight:900;cursor:pointer}.choices button:hover,.shade-card>button:hover{background:#f5b975}.shade-card>button:disabled{opacity:.5;cursor:not-allowed}.touch-controls{display:flex;gap:8px;padding:10px;background:#2e2037}.touch-controls button{flex:1;min-height:53px;border:2px solid #f2c280;border-radius:12px;background:#af485f;color:white;font-size:16px;font-weight:900;touch-action:none;user-select:none;cursor:pointer}.touch-controls button:last-child{background:#4c8095}.side-panel{padding:16px}.side-panel h2{margin:0 0 10px;color:#ffe1a0}.side-panel p{font-size:14px;line-height:1.5}.side-panel small{font-size:12px;color:#f2d0b4}.side-panel hr{border:0;border-top:1px solid #b88070;margin:14px 0}.actions{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}.actions button{background:#ffd890;color:#432741;border:0;border-radius:9px;padding:8px 10px;font-weight:900;cursor:pointer}.actions .end{background:#e66c71;color:#fff}.notice{background:#4a3653;border-radius:10px;padding:10px}.word-counts{display:flex;gap:8px}.word-counts span{background:#5b3f60;border-radius:8px;padding:7px 10px;font-weight:800}@media(max-width:930px){.layout{grid-template-columns:1fr}.side-panel{padding:12px}.canvas-wrap canvas{max-height:55dvh}}@media(max-width:600px){.circus-page{padding:8px}.page-header{align-items:flex-start;flex-direction:column}.page-header p{font-size:12px}.page-header nav a{font-size:12px}.stage-status{font-size:12px}.touch-controls button{font-size:14px;min-height:58px}.side-panel p{font-size:12px}.shade-card{padding:9px}.choices button{padding:7px;font-size:13px}}
</style>

<style scoped>
.landscape-prompt{position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;background:#24162ff2;color:#fff5d6;text-align:center}
.landscape-prompt span{font-size:52px}.landscape-prompt strong{font-size:25px}.landscape-prompt p{max-width:25em;margin:0;line-height:1.5}
@media (max-height:600px) and (orientation:landscape) and (pointer:coarse){
  .circus-page{height:100dvh;min-height:0;overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box;padding:4px max(6px,env(safe-area-inset-right)) 4px max(6px,env(safe-area-inset-left))}
  .page-header{width:100%;flex:0 0 auto;margin:0 0 4px;align-items:center}.eyebrow,.page-header p{display:none}.page-header h1{font-size:18px;margin:0}
  .page-header nav{gap:4px}.page-header a{padding:4px 6px;font-size:11px}
  .layout{width:100%;flex:1;min-height:0;grid-template-columns:minmax(0,1fr) clamp(150px,23vw,210px);gap:6px}
  .stage-panel{display:flex;flex-direction:column;min-height:0}.stage-status{flex:0 0 auto;padding:4px 7px;font-size:11px}
  .canvas-wrap{flex:1;min-height:0;display:grid;place-items:center}.canvas-wrap canvas{width:100%;height:100%;max-height:100%;object-fit:contain}
  .touch-controls{flex:0 0 auto;padding:4px}.touch-controls button{min-height:38px;font-size:12px}
  .side-panel{min-height:0;overflow-y:auto;padding:6px}.side-panel h2{font-size:14px;margin:0 0 4px}.side-panel p{font-size:11px;margin:4px 0}.side-panel hr{margin:5px 0}
  .actions{margin:4px 0;gap:4px}.actions button{padding:5px 6px;font-size:11px}.notice{padding:5px}.word-counts span{padding:4px;font-size:11px}
  .shade-card{max-height:100%;padding:7px}.shade-card h2{font-size:18px;margin:2px 0}.shade-card p{font-size:11px;margin:5px 0}.choices{gap:4px;margin:5px 0}.choices button{padding:5px;font-size:11px}
}
</style>
