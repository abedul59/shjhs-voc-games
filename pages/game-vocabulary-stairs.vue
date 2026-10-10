<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const GAME_TYPE = '單字小朋友下樓梯';
const WIDTH = 420;
const HEIGHT = 620;
const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const lesson = {
  version: typeof route.query.version === 'string' ? route.query.version : '',
  volume: typeof route.query.volume === 'string' ? route.query.volume : '',
  unit: typeof route.query.unit === 'string' ? route.query.unit : ''
};
const canvas = ref(null);
const loading = ref(true);
const phase = ref('ready');
const notice = ref('讀取本課單字中…');
const sensorStatus = ref('可使用鍵盤或畫面上的左右鍵');
const sensorEnabled = ref(false);
const sensorWaiting = ref(false);
const sensorReverse = ref(false);
const sensorDirection = ref('置中');
const health = ref(3);
const floors = ref(0);
const correctWords = ref([]);
const wrongWords = ref([]);
const remaining = ref(0);
const quiz = ref(null);
const saveNotice = ref('');
const words = ref([]);
const settings = ref({ min: 30, max: 40, wrongPause: 3 });
const score = computed(() => floors.value * 5 + correctWords.value.length * 20);
const historyLink = computed(() => ({ path: '/history', query: { game: GAME_TYPE } }));
const leaderboardLink = computed(() => ({ path: '/leaderboard', query: { game: GAME_TYPE, ...lesson } }));

const world = {
  player: { x: 196, y: 287, vy: 0, w: 26, h: 30, invulnerable: 0 },
  platforms: [], scroll: 0, nextId: 0, lastLanded: 0, activeSeconds: 0,
  nextQuiz: 35, lastFrame: 0, freezeUntil: 0
};
const controls = { left: false, right: false, tilt: 0, neutral: null, source: '', lastOrientation: 0 };
let frameId = 0;
let sensorTimeout = 0;
let startedAt = 0;
let recordId = '';
let attemptNumber = 0;
let disposed = false;

function randomQuizDelay() {
  return settings.value.min + Math.random() * (settings.value.max - settings.value.min);
}
function randomPlatform(y, x) {
  const id = ++world.nextId;
  const type = id < 5 ? 'normal' : ['normal', 'normal', 'normal', 'spike', 'spring', 'crumble'][Math.floor(Math.random() * 6)];
  return { id, x: Math.max(12, Math.min(WIDTH - 120, x)), y, w: 108, type, used: false };
}
function resetWorld() {
  world.player = { x: 196, y: 287, vy: 0, w: 26, h: 30, invulnerable: 0 };
  world.platforms = [];
  world.scroll = 0;
  world.nextId = 0;
  world.lastLanded = 0;
  world.activeSeconds = 0;
  world.nextQuiz = randomQuizDelay();
  world.lastFrame = 0;
  world.freezeUntil = 0;
  let x = 160;
  for (let y = 325; y <= 750; y += 82) {
    world.platforms.push(randomPlatform(y, x));
    x = Math.max(12, Math.min(WIDTH - 120, x + (Math.random() - .5) * 150));
  }
}
function startGame() {
  if (words.value.length < 4 || loading.value) return;
  resetWorld();
  phase.value = 'playing';
  health.value = 3;
  floors.value = 0;
  correctWords.value = [];
  wrongWords.value = [];
  quiz.value = null;
  remaining.value = Math.ceil(world.nextQuiz);
  saveNotice.value = '';
  notice.value = '左右移動，從一階落到下一階。不要被頂端夾住或掉出底部！';
  startedAt = Date.now();
  recordId = crypto.randomUUID();
  attemptNumber = 0;
  controls.left = false;
  controls.right = false;
}
function endGame(message = '本局結束。') {
  if (phase.value === 'ended') return;
  phase.value = 'ended';
  quiz.value = null;
  controls.left = false;
  controls.right = false;
  notice.value = message;
  if (recordId) saveRecord();
}
function loseHealth(message) {
  if (world.player.invulnerable > 0) return;
  health.value--;
  if (health.value <= 0) { endGame(`${message} 三顆愛心用完，抵達第 ${floors.value} 階。`); return; }
  world.player.x = WIDTH / 2 - 13;
  world.player.y = 210;
  world.player.vy = 0;
  world.player.invulnerable = 1.8;
  notice.value = `${message} 還剩 ${health.value} 顆愛心。`;
}
function askQuestion() {
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const others = words.value.filter(item => item.en_us.toLowerCase() !== word.en_us.toLowerCase());
  const choices = [word, ...others.sort(() => Math.random() - .5).slice(0, 3)]
    .sort(() => Math.random() - .5);
  quiz.value = { word, choices };
  phase.value = 'quiz';
  notice.value = '遊戲暫停，請選出中文提示對應的英文單字。';
  controls.left = false;
  controls.right = false;
}
function answerQuestion(choice) {
  if (phase.value !== 'quiz' || !quiz.value) return;
  const word = quiz.value.word;
  const correct = choice.en_us === word.en_us;
  if (correct) correctWords.value = [...correctWords.value, word.en_us];
  else wrongWords.value = [...wrongWords.value, word.en_us];
  quiz.value = null;
  world.nextQuiz = randomQuizDelay();
  world.activeSeconds = 0;
  remaining.value = Math.ceil(world.nextQuiz);
  if (correct) {
    phase.value = 'playing';
    notice.value = `答對！${word.zh_tw}＝${word.en_us}，繼續下樓梯。`;
  } else {
    phase.value = 'wrongPause';
    world.freezeUntil = performance.now() + settings.value.wrongPause * 1000;
    remaining.value = settings.value.wrongPause;
    notice.value = `答錯了。${word.zh_tw}＝${word.en_us}，暫停 ${settings.value.wrongPause} 秒。`;
    if (settings.value.wrongPause === 0) phase.value = 'playing';
  }
}
function tick(timestamp) {
  frameId = requestAnimationFrame(tick);
  const delta = world.lastFrame ? Math.min((timestamp - world.lastFrame) / 1000, .04) : 0;
  world.lastFrame = timestamp;
  if (phase.value === 'wrongPause') {
    remaining.value = Math.max(0, Math.ceil((world.freezeUntil - timestamp) / 1000));
    if (timestamp >= world.freezeUntil) {
      phase.value = 'playing';
      remaining.value = Math.ceil(world.nextQuiz);
      notice.value = '暫停結束，繼續下樓梯！';
    }
  }
  if (phase.value === 'playing' && !document.hidden && delta > 0) {
    updateWorld(delta);
    if (phase.value === 'playing') {
      world.activeSeconds += delta;
      remaining.value = Math.max(0, Math.ceil(world.nextQuiz - world.activeSeconds));
      if (world.activeSeconds >= world.nextQuiz) askQuestion();
    }
  }
  draw();
}
function updateWorld(dt) {
  const player = world.player;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  const keyboard = Number(controls.right) - Number(controls.left);
  const horizontal = keyboard || (sensorEnabled.value ? controls.tilt : 0);
  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x + horizontal * 220 * dt));

  const scroll = (28 + Math.min(floors.value * .6, 24)) * dt;
  world.scroll += scroll;
  for (const platform of world.platforms) platform.y -= scroll;
  world.platforms = world.platforms.filter(platform => platform.y > -30 && !platform.used);
  while (Math.max(...world.platforms.map(platform => platform.y)) < HEIGHT + 50) {
    const last = world.platforms[world.platforms.length - 1];
    const nextX = (last?.x || 155) + (Math.random() - .5) * 155;
    world.platforms.push(randomPlatform((last?.y || HEIGHT) + 82, nextX));
  }

  const oldBottom = player.y + player.h;
  player.vy = Math.min(390, player.vy + 790 * dt);
  player.y += player.vy * dt;
  if (player.vy >= 0) {
    const hit = world.platforms.find(platform =>
      oldBottom <= platform.y + 12 && player.y + player.h >= platform.y &&
      player.x + player.w > platform.x + 6 && player.x < platform.x + platform.w - 6);
    if (hit) {
      player.y = hit.y - player.h;
      player.vy = hit.type === 'spring' ? -330 : 0;
      if (hit.id !== world.lastLanded) {
        world.lastLanded = hit.id;
        floors.value++;
        if (hit.type === 'spike') loseHealth('踩到尖刺階梯！');
        else if (hit.type === 'crumble') notice.value = '碎裂階梯正在崩塌，快移動！';
        else if (hit.type === 'spring') notice.value = '彈簧階梯把你彈起來了！';
      }
      if (hit.type === 'crumble') hit.used = true;
    }
  }
  if (player.y < 0 || player.y > HEIGHT) loseHealth(player.y < 0 ? '被頂端夾到了！' : '從畫面底部掉下去了！');
}
function draw() {
  const ctx = canvas.value?.getContext('2d');
  if (!ctx) return;
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, '#122a4d');
  background.addColorStop(1, '#294d77');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#d1eaff16';
  for (let i = 0; i < 24; i++) {
    const y = ((i * 103 - world.scroll * .25) % (HEIGHT + 50) + HEIGHT + 50) % (HEIGHT + 50);
    ctx.fillRect((i * 173) % WIDTH, y, 3, 3);
  }
  ctx.fillStyle = '#ff715e';
  ctx.fillRect(0, 0, WIDTH, 8);
  ctx.fillStyle = '#e6f4ff';
  ctx.font = '700 18px system-ui';
  ctx.fillText(`FLOOR  ${String(floors.value).padStart(3, '0')}`, 18, 35);
  ctx.fillText('♥'.repeat(health.value), WIDTH - 85, 35);
  for (const platform of world.platforms) {
    ctx.fillStyle = '#102a43aa';
    ctx.fillRect(platform.x + 3, platform.y + 8, platform.w, 12);
    ctx.fillStyle = platform.type === 'spike' ? '#e47d78' : platform.type === 'spring' ? '#82dbda' : platform.type === 'crumble' ? '#d6b47e' : '#9ac77e';
    ctx.fillRect(platform.x, platform.y, platform.w, 12);
    ctx.fillStyle = '#ffffff77';
    ctx.fillRect(platform.x + 4, platform.y + 2, platform.w - 8, 2);
    if (platform.type === 'spike') {
      ctx.fillStyle = '#f9d2c6';
      for (let x = platform.x + 8; x < platform.x + platform.w - 3; x += 13) {
        ctx.beginPath(); ctx.moveTo(x, platform.y); ctx.lineTo(x + 5, platform.y - 9); ctx.lineTo(x + 10, platform.y); ctx.fill();
      }
    }
    if (platform.type === 'spring') {
      ctx.fillStyle = '#215a72'; ctx.font = '18px system-ui'; ctx.fillText('↟', platform.x + platform.w / 2 - 7, platform.y + 4);
    }
    if (platform.type === 'crumble') {
      ctx.strokeStyle = '#826449'; ctx.beginPath(); ctx.moveTo(platform.x + 40, platform.y); ctx.lineTo(platform.x + 45, platform.y + 12); ctx.stroke();
    }
  }
  const p = world.player;
  if (p.invulnerable <= 0 || Math.floor(performance.now() / 100) % 2 === 0) {
    ctx.fillStyle = '#f1c48d';
    ctx.beginPath(); ctx.roundRect(p.x + 5, p.y + 7, 17, 20, 6); ctx.fill();
    ctx.fillStyle = '#5ac0df'; ctx.fillRect(p.x + 3, p.y + 17, 22, 11);
    ctx.fillStyle = '#3c2846'; ctx.beginPath(); ctx.arc(p.x + 13, p.y + 9, 11, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#202b39'; ctx.fillRect(p.x + 2, p.y + 27, 9, 3); ctx.fillRect(p.x + 16, p.y + 27, 9, 3);
    ctx.fillRect(p.x + 9, p.y + 13, 2, 2); ctx.fillRect(p.x + 18, p.y + 13, 2, 2);
  }
}
function keyDown(event) {
  if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) event.preventDefault();
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') controls.left = true;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') controls.right = true;
}
function keyUp(event) {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') controls.left = false;
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') controls.right = false;
}
function screenAngle() {
  const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
  return ((Number(angle) % 360) + 360) % 360;
}
function sensorSample(raw, source) {
  if (!Number.isFinite(raw)) return;
  if (source === 'orientation') controls.lastOrientation = performance.now();
  const sourceChanged = controls.source !== source;
  if (sourceChanged) {
    controls.source = source;
    controls.neutral = null;
  }
  if (controls.neutral === null) controls.neutral = raw;
  const difference = (raw - controls.neutral) * (sensorReverse.value ? -1 : 1);
  controls.tilt = Math.abs(difference) < 2.5 ? 0 : Math.max(-1, Math.min(1, difference / 16));
  const nextDirection = controls.tilt < -.12 ? '向左' : controls.tilt > .12 ? '向右' : '置中';
  const directionChanged = sensorDirection.value !== nextDirection;
  sensorDirection.value = nextDirection;
  const firstSample = !sensorEnabled.value;
  sensorEnabled.value = true;
  sensorWaiting.value = false;
  if (sensorTimeout) window.clearTimeout(sensorTimeout);
  if (firstSample || directionChanged || sourceChanged) {
    sensorStatus.value = `${source === 'orientation' ? '方向感測' : '重力感測'}已連線 · ${nextDirection}。若方向相反，可按「反轉方向」。`;
  }
}
function orientation(event) {
  const angle = screenAngle();
  const raw = angle === 90 ? -event.beta : angle === 270 ? event.beta : angle === 180 ? -event.gamma : event.gamma;
  sensorSample(raw, 'orientation');
}
function motion(event) {
  if (controls.lastOrientation && performance.now() - controls.lastOrientation < 700) return;
  const gravity = event.accelerationIncludingGravity;
  if (!gravity) return;
  const angle = screenAngle();
  const raw = angle === 90 ? -gravity.y : angle === 270 ? gravity.y : angle === 180 ? -gravity.x : gravity.x;
  sensorSample(raw * 5, 'motion');
}
async function enableSensor() {
  if (!window.isSecureContext || (!window.DeviceOrientationEvent && !window.DeviceMotionEvent)) {
    sensorStatus.value = '此瀏覽器或非 HTTPS 網頁不支援傾斜感測；請用左右鍵。'; return;
  }
  try {
    // Both requests must start inside this button's user gesture on iOS.
    const requests = [];
    if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') requests.push(window.DeviceOrientationEvent.requestPermission());
    if (typeof window.DeviceMotionEvent?.requestPermission === 'function') requests.push(window.DeviceMotionEvent.requestPermission());
    if (requests.length) {
      const permissions = await Promise.allSettled(requests);
      if (!permissions.some(result => result.status === 'fulfilled' && result.value === 'granted')) {
        throw new Error('未允許動作與方向感測');
      }
    }
    controls.neutral = null;
    controls.source = '';
    controls.lastOrientation = 0;
    controls.tilt = 0;
    sensorEnabled.value = false;
    sensorWaiting.value = true;
    sensorStatus.value = '等待手機感測資料，請直握手機後左右傾斜…';
    window.removeEventListener('deviceorientation', orientation);
    window.removeEventListener('devicemotion', motion);
    window.addEventListener('deviceorientation', orientation);
    window.addEventListener('devicemotion', motion);
    sensorTimeout = window.setTimeout(() => {
      if (!sensorEnabled.value) {
        sensorWaiting.value = false;
        sensorStatus.value = '未收到感測資料；請檢查瀏覽器動作與方向權限，或使用左右鍵。';
      }
    }, 3000);
  } catch (error) {
    sensorWaiting.value = false;
    sensorStatus.value = `${error.message}，請用左右鍵。`;
  }
}
function recalibrate() {
  controls.neutral = null;
  controls.tilt = 0;
  sensorDirection.value = '置中';
  sensorStatus.value = '已重新校準，請直握手機。';
}
function reverseSensor() {
  sensorReverse.value = !sensorReverse.value;
  controls.tilt *= -1;
  sensorStatus.value = `傾斜方向已${sensorReverse.value ? '反轉' : '恢復'}；現在請左右傾斜確認。`;
}
async function saveRecord() {
  if (!student.value?.id || !recordId) return;
  const currentId = recordId;
  const currentStartedAt = startedAt;
  const currentScore = score.value;
  const currentCorrect = [...correctWords.value];
  const currentWrong = [...wrongWords.value];
  let currentAttempt = attemptNumber;
  if (!currentAttempt) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', String(student.value.id)).eq('game_type', GAME_TYPE)
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit_played', lesson.unit);
    currentAttempt = (count || 0) + 1;
    if (recordId === currentId) attemptNumber = currentAttempt;
  }
  const { error } = await db.from('game_records').upsert({
    id: currentId, student_id: String(student.value.id), game_type: GAME_TYPE,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    score: currentScore, mistakes: currentWrong.length,
    correct_words: currentCorrect.join(', '), wrong_words: currentWrong.join(', '),
    attempt_number: currentAttempt, played_at: new Date(currentStartedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - currentStartedAt) / 1000), device_info: navigator.userAgent
  }, { onConflict: 'id' });
  if (recordId === currentId) saveNotice.value = error ? `紀錄儲存失敗：${error.message}。可按「重試儲存」。` : '本局分數與單字答題已記錄。';
}
onMounted(async () => {
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  frameId = requestAnimationFrame(tick);
  if (!student.value?.id) { await navigateTo('/'); return; }
  if (!lesson.version || !lesson.volume || !lesson.unit) { loading.value = false; notice.value = '請先從首頁選擇課本、冊次和單元。'; return; }
  const [{ data, error }, { data: config }] = await Promise.all([
    db.from('vocabularies').select('en_us,zh_tw').eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit).limit(1000),
    db.from('system_settings').select('stairs_quiz_min_seconds,stairs_quiz_max_seconds,stairs_wrong_pause_seconds').eq('id', 1).maybeSingle()
  ]);
  if (disposed) return;
  const min = Math.max(5, Math.min(180, Number(config?.stairs_quiz_min_seconds) || 30));
  const max = Math.max(min, Math.min(180, Number(config?.stairs_quiz_max_seconds) || 40));
  settings.value = { min, max, wrongPause: Math.max(0, Math.min(30, Number(config?.stairs_wrong_pause_seconds ?? 3))) };
  loading.value = false;
  if (error) { notice.value = `單字載入失敗：${error.message}`; return; }
  const seen = new Set();
  words.value = (data || []).filter(word => {
    const key = word.en_us?.trim().toLowerCase();
    if (!key || !word.zh_tw?.trim() || seen.has(key)) return false;
    seen.add(key); return true;
  });
  notice.value = words.value.length >= 4 ? '按「開始下樓梯」，用左右鍵或傾斜手機移動。' : '本課至少需要四筆不同單字，請回首頁選其他單元。';
});
onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frameId);
  window.removeEventListener('keydown', keyDown);
  window.removeEventListener('keyup', keyUp);
  window.removeEventListener('deviceorientation', orientation);
  window.removeEventListener('devicemotion', motion);
  if (sensorTimeout) window.clearTimeout(sensorTimeout);
});
</script>

<template>
  <main class="stairs-page">
    <LandscapeGameMode />
    <header class="page-header">
      <div><span class="eyebrow">VOCABULARY · DOWNSTAIRS</span><h1>🪜 單字小朋友下樓梯</h1><p>踩下一階、避開危險，邊玩邊複習英文單字</p></div>
      <nav><NuxtLink to="/">← 回首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">全校英雄榜</NuxtLink></nav>
    </header>
    <div class="layout">
      <section class="game-panel" aria-label="下樓梯遊戲">
        <div class="status"><strong>第 {{ floors }} 階</strong><span>♥ {{ health }}　分數 {{ score }}</span><span v-if="phase === 'playing'">距離出題約 {{ remaining }} 秒</span></div>
        <div class="mobile-sensor"><button @click="enableSensor">{{ sensorWaiting ? '等待感測資料…' : sensorEnabled ? '重新連接傾斜' : '啟用手機傾斜' }}</button><small>{{ sensorStatus }}</small></div>
        <div class="stage-row">
          <button class="move-control" aria-label="向左移動" @pointerdown.prevent="controls.left = true" @pointerup="controls.left = false" @pointercancel="controls.left = false" @pointerleave="controls.left = false">◀<span>向左</span></button>
          <div class="stage-wrap">
            <canvas ref="canvas" :width="WIDTH" :height="HEIGHT" aria-label="小朋友下樓梯遊戲畫面"></canvas>
            <div v-if="phase !== 'playing'" class="stage-shade">
              <div v-if="phase === 'ready'" class="shade-card"><h2>準備下樓梯？</h2><p>左右移動站到下一階。綠色安全，紅色尖刺會扣血，藍色彈簧會彈起。</p><button :disabled="loading || words.length < 4" @click="startGame">{{ loading ? '載入中…' : '開始下樓梯' }}</button></div>
              <div v-else-if="phase === 'quiz' && quiz" class="shade-card"><small>單字挑戰 · 遊戲已暫停</small><h2>{{ quiz.word.zh_tw }}</h2><p>選出正確的英文單字</p><div class="answers"><button v-for="choice in quiz.choices" :key="choice.en_us" @click="answerQuestion(choice)">{{ choice.en_us }}</button></div></div>
              <div v-else-if="phase === 'wrongPause'" class="shade-card"><h2>再等 {{ remaining }} 秒</h2><p>{{ notice }}</p></div>
              <div v-else class="shade-card"><h2>本局結束</h2><p>抵達第 {{ floors }} 階 · {{ score }} 分</p><button @click="startGame">再玩一次</button></div>
            </div>
          </div>
          <button class="move-control" aria-label="向右移動" @pointerdown.prevent="controls.right = true" @pointerup="controls.right = false" @pointercancel="controls.right = false" @pointerleave="controls.right = false">▶<span>向右</span></button>
        </div>
      </section>
      <aside class="side-panel">
        <h2>遊戲操作</h2>
        <p>電腦用 ← → 或 A、D。手機可以按住畫面左右鍵；直握手機時，也能啟用傾斜控制。</p>
        <div class="action-row side-sensor-controls"><button @click="enableSensor">{{ sensorWaiting ? '等待感測資料…' : sensorEnabled ? '重新連接傾斜' : '啟用手機傾斜' }}</button><button v-if="sensorEnabled" @click="recalibrate">重新校準</button><button v-if="sensorEnabled" @click="reverseSensor">反轉方向</button></div>
        <div v-if="sensorEnabled" class="action-row mobile-sensor-tools"><button @click="recalibrate">重新校準</button><button @click="reverseSensor">反轉方向</button></div>
        <small>{{ sensorStatus }}</small>
        <hr>
        <p>實際遊玩滿 {{ settings.min }}–{{ settings.max }} 秒才出一題；答對立刻繼續，答錯暫停 {{ settings.wrongPause }} 秒。問答與分頁切換期間不計入遊玩時間。</p>
        <p class="notice" role="status">{{ notice }}</p>
        <div class="action-row"><button v-if="phase === 'playing' || phase === 'quiz' || phase === 'wrongPause'" class="end" @click="endGame('你已結束本局。')">結束並記錄</button><button v-if="phase === 'ended' && saveNotice.includes('失敗')" @click="saveRecord">重試儲存</button></div>
        <small v-if="saveNotice">{{ saveNotice }}</small>
        <div class="word-counts"><span>答對 {{ correctWords.length }}</span><span>答錯 {{ wrongWords.length }}</span></div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.stairs-page {
  box-sizing: border-box;
  height: 100dvh;
  overflow: hidden;
  padding: 10px clamp(10px, 2vw, 28px);
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 12% 0%, #425f83, #15294d 52%, #0c1934);
  color: #f4f8ff;
  font-family: system-ui, -apple-system, "Noto Sans TC", sans-serif;
}
.page-header {
  width: min(100%, 1100px);
  margin: 0 auto 8px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.eyebrow { color: #8bdeea; font-size: 11px; letter-spacing: .16em; font-weight: 900; }
.page-header h1 { font-size: clamp(24px, 2.7vw, 36px); margin: 1px 0; }
.page-header p { margin: 0; color: #c9dcf4; font-size: 13px; }
.page-header nav { display: flex; gap: 7px; flex-wrap: wrap; }
.page-header a, .action-row button, .mobile-sensor button, .move-control {
  border: 1px solid #a6c8dc;
  background: #244c70;
  color: #f6fbff;
  border-radius: 10px;
  padding: 8px 10px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}
.layout {
  width: min(100%, 1100px);
  margin: 0 auto;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 650px) minmax(260px, 1fr);
  gap: 12px;
}
.game-panel, .side-panel {
  box-sizing: border-box;
  min-height: 0;
  background: #102b50cc;
  border: 1px solid #6c9ab488;
  border-radius: 18px;
  padding: 10px;
  box-shadow: 0 18px 40px #07132966;
}
.game-panel { display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.status {
  width: 100%;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-around;
  flex-wrap: wrap;
  margin-bottom: 6px;
  font-size: 13px;
}
.status strong { font-size: 18px; color: #91e6ee; }
.stage-row {
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.stage-wrap {
  position: relative;
  box-sizing: border-box;
  flex: 0 1 auto;
  width: min(420px, calc(67.742dvh - 108.39px), calc(100% - 132px));
  aspect-ratio: 420 / 620;
  overflow: hidden;
  border: 5px solid #8dbbd0;
  border-radius: 13px;
  box-shadow: inset 0 0 0 3px #fff6, 0 12px 24px #06122d;
}
.stage-wrap canvas { display: block; width: 100%; height: 100%; }
.move-control {
  flex: 0 0 55px;
  min-height: 90px;
  font-size: 25px;
  touch-action: none;
  user-select: none;
  background: #32648b;
}
.move-control span { display: block; margin-top: 5px; font-size: 12px; }
.move-control:active { background: #4687ac; }
.stage-shade {
  position: absolute;
  inset: 0;
  background: #081a34b9;
  display: grid;
  place-items: center;
  padding: 12px;
}
.shade-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 350px;
  border: 2px solid #a2cee3;
  border-radius: 17px;
  background: #f7fbff;
  color: #163457;
  text-align: center;
  padding: clamp(10px, 2vh, 18px);
  box-shadow: 0 14px 38px #08193288;
}
.shade-card h2 { margin: 4px 0 9px; font-size: clamp(21px, 4vw, 31px); }
.shade-card p { line-height: 1.5; margin: 5px 0 12px; }
.shade-card small { font-weight: 900; color: #20628d; }
.shade-card button {
  background: #2b6e9f;
  color: white;
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}
.shade-card button:disabled { opacity: .5; }
.answers { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.answers button { overflow-wrap: anywhere; }
.side-panel { overflow-y: auto; }
.side-panel h2 { margin: 2px 0 8px; }
.side-panel p { line-height: 1.5; margin: 8px 0; }
.side-panel small, .mobile-sensor small { color: #c7e3f4; line-height: 1.4; }
.action-row { display: flex; gap: 6px; flex-wrap: wrap; }
.side-panel hr { border: 0; border-top: 1px solid #ffffff33; margin: 12px 0; }
.notice { background: #254a6b; border-left: 4px solid #8be2e0; padding: 9px; border-radius: 5px; min-height: 40px; }
.action-row .end { background: #805263; }
.word-counts { display: flex; gap: 7px; margin-top: 12px; }
.word-counts span { background: #265275; padding: 7px 10px; border-radius: 8px; }
.mobile-sensor, .mobile-sensor-tools { display: none; }
@media (max-width: 760px) {
  .stairs-page { height: auto; min-height: 100dvh; overflow: auto; padding: 8px; }
  .page-header { align-items: flex-start; flex-direction: column; gap: 6px; }
  .page-header h1 { font-size: 25px; }
  .page-header nav a { font-size: 12px; padding: 5px 7px; }
  .layout { grid-template-columns: 1fr; gap: 9px; }
  .game-panel, .side-panel { padding: 8px; }
  .mobile-sensor { width: 100%; display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
  .mobile-sensor button { flex: 0 0 auto; font-size: 12px; padding: 6px 8px; }
  .mobile-sensor small { font-size: 11px; }
  .side-sensor-controls { display: none; }
  .mobile-sensor-tools { display: flex; }
  .stage-row { position: relative; }
  .stage-wrap { width: min(100%, calc(67.742dvh - 128.71px)); }
  .move-control {
    position: absolute;
    z-index: 2;
    bottom: 7px;
    width: 58px;
    min-height: 52px;
    font-size: 20px;
    background: #32648be0;
  }
  .move-control:first-child { left: 6px; }
  .move-control:last-child { right: 6px; }
  .move-control span { font-size: 11px; margin-top: 1px; }
}
@media (max-height: 650px) and (min-width: 761px) {
  .page-header p { display: none; }
  .page-header h1 { font-size: 25px; }
  .side-panel p { font-size: 13px; }
}
@media (orientation: landscape) and (pointer: coarse) {
  .stairs-page { height: 100dvh; min-height: 0; overflow: hidden; padding: 4px max(6px, env(safe-area-inset-right)) 4px max(6px, env(safe-area-inset-left)); }
  .page-header { flex-direction: row; align-items: center; margin-bottom: 3px; }
  .page-header h1 { font-size: 17px; }
  .page-header p, .eyebrow { display: none; }
  .page-header nav a { font-size: 11px; padding: 4px 6px; }
  .layout { grid-template-columns: minmax(0, 1fr) minmax(150px, 25vw); gap: 5px; }
  .game-panel, .side-panel { min-height: 0; padding: 4px; }
  .side-panel { overflow: auto; margin: 0; }
  .status { font-size: 11px; margin-bottom: 3px; }
  .status strong { font-size: 13px; }
  .stage-wrap { width: min(100%, calc((100dvh - 75px) * 420 / 620)); }
  .stage-row { flex: 1; min-height: 0; }
  .move-control { position: static; min-height: 48px; flex: 0 0 48px; font-size: 18px; }
  .move-control span { font-size: 10px; margin-top: 0; }
  .mobile-sensor { margin-bottom: 2px; }
  .mobile-sensor small { display: none; }
}
</style>
