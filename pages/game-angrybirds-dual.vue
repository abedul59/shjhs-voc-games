<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';

useHead({ meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }] });

const db = useSupabaseClient();
const route = useRoute();
const student = useCookie('currentStudent');
const gameName = '單字憤怒鳥（雙人）';
const gameKey = 'angrybirdsDual';
const lesson = { version: String(route.query.version || ''), volume: String(route.query.volume || ''), unit: String(route.query.unit || '') };
const unitKey = `angrybirds-dual:${JSON.stringify([lesson.version, lesson.volume, lesson.unit])}`;

const status = ref('loading');
const notice = ref('');
const room = ref(null);
const isHost = ref(false);
const opponent = ref({ id: null, name: '對手' });
const opponentProgress = reactive({ completed: 0, score: 0, mistakes: 0 });
const settings = reactive({ blanks: 3, penalty: 2, target: 5, duration: 180, maxEscapes: 20 });
const words = ref([]);
const matchWords = ref([]);
const score = ref(0);
const mistakes = ref(0);
const completed = ref(0);
const correctWords = ref([]);
const wrongWords = ref([]);
const currentWord = ref(null);
const slots = ref([]);
const pigs = ref([]);
const bird = reactive({ x: 130, y: 320, vx: 0, vy: 0, state: 'idle' });
const trail = ref([]);
const canvas = ref(null);
const now = ref(Date.now());
const endsAt = ref(0);
const startedAt = ref(0);
const winnerId = ref(null);
const joining = ref(false);
const saved = ref(false);
const saveError = ref('');

const myName = computed(() => student.value?.name || '你');
const remaining = computed(() => Math.max(0, Math.ceil((endsAt.value - now.value) / 1000)));
const resultLabel = computed(() => winnerId.value == null ? '平手' : String(winnerId.value) === String(student.value?.id) ? '你贏了！' : '對手獲勝');
const roundLabel = computed(() => Math.min(completed.value + 1, settings.target));

const W = 800, H = 500, groundY = 450, slingX = 130, slingY = 320;
const pigSpots = [130, 260, 390].flatMap(y => [430, 530, 630, 730].map(x => ({ x, y })));
let channel = null;
let pollTimer = null;
let clockTimer = null;
let frame = null;
let roundTimer = null;
let context = null;
let lastProgress = 0;
let dragging = false;
let disposed = false;
let settling = false;
let savePromise = null;
let soundContext = null;

const clampSetting = (value, fallback, min, max) => {
  const number = value == null ? fallback : Number(value);
  return Math.floor(Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback)));
};
const send = (event, payload = {}) => channel?.send({ type: 'broadcast', event, payload });

function primeAudio() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio && !soundContext) soundContext = new Audio();
    if (soundContext?.state === 'suspended') void soundContext.resume();
  } catch { /* 裝置不支援音訊時仍可遊玩 */ }
}

function tone(frequency, duration = .12, type = 'sine', volume = .1, endFrequency = frequency, delay = 0) {
  try {
    primeAudio();
    if (!soundContext || soundContext.state === 'closed') return;
    const start = soundContext.currentTime + delay;
    const oscillator = soundContext.createOscillator();
    const gain = soundContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .015);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain); gain.connect(soundContext.destination);
    oscillator.start(start); oscillator.stop(start + duration);
  } catch { /* 裝置不支援音訊時仍可遊玩 */ }
}

function sound(kind) {
  if (kind === 'start') { tone(523, .13); tone(659, .13, 'sine', .1, 659, .14); tone(784, .25, 'sine', .12, 784, .28); }
  else if (kind === 'stretch') tone(100, .1, 'sawtooth', .05);
  else if (kind === 'launch') tone(300, .4, 'sine', .14, 800);
  else if (kind === 'hit') tone(150, .2, 'square', .13, 50);
  else if (kind === 'correct') { tone(880, .12); tone(1100, .18, 'sine', .12, 1100, .12); }
  else if (kind === 'wrong') tone(200, .3, 'sawtooth', .12, 100);
  else if (kind === 'word') [523, 659, 783, 1046].forEach((frequency, index) => tone(frequency, .17, 'sine', .12, frequency, index * .15));
  else if (kind === 'win') { tone(659, .15); tone(880, .15, 'sine', .1, 880, .16); tone(1175, .35, 'sine', .12, 1175, .32); }
  else if (kind === 'lose') { tone(392, .2); tone(294, .3, 'sine', .1, 294, .21); }
}

function speakWord(word) {
  if (!word || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(word);
  speech.lang = 'en-US'; speech.rate = .9;
  window.speechSynthesis.speak(speech);
}

function resetBird() {
  Object.assign(bird, { x: slingX, y: slingY, vx: 0, vy: 0, state: 'idle' });
  trail.value = [];
  dragging = false;
}

function nextRound() {
  if (status.value !== 'playing' || completed.value >= settings.target) return;
  const word = matchWords.value[completed.value] || words.value[Math.floor(Math.random() * words.value.length)];
  currentWord.value = word;
  const letters = word.en_us.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const count = Math.min(settings.blanks, letters.length - 1);
  const chosen = [...letters].map((_, index) => index).sort(() => Math.random() - .5).slice(0, count);
  slots.value = [...letters].map((char, index) => ({ char, blank: chosen.includes(index), filled: false }));
  const targets = chosen.map(index => ({ id: `target-${index}`, char: letters[index], fake: false }));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const decoys = Array.from({ length: 3 }, (_, index) => ({ id: `fake-${index}`, char: alphabet[Math.floor(Math.random() * alphabet.length)], fake: true }));
  pigs.value = [...targets, ...decoys].sort(() => Math.random() - .5).map((item, index) => ({ ...item, ...pigSpots[index], baseY: pigSpots[index].y, phase: Math.random() * 6.28 }));
  resetBird();
  speakWord(word.en_us);
}

function progress() {
  if (status.value !== 'playing') return;
  void send('progress', { id: String(student.value.id), completed: completed.value, score: score.value, mistakes: mistakes.value });
  lastProgress = Date.now();
}

async function completeWord() {
  if (status.value !== 'playing') return;
  correctWords.value.push(currentWord.value.en_us);
  completed.value++;
  score.value += 10;
  sound('word');
  progress();
  if (completed.value >= settings.target) await finishRoom(student.value.id);
  else roundTimer = setTimeout(nextRound, 900);
}

function hitPig(pig) {
  bird.state = 'hit';
  pigs.value = pigs.value.filter(item => item.id !== pig.id);
  sound('hit');
  const slot = slots.value.find(item => item.blank && !item.filled && item.char === pig.char);
  if (!pig.fake && slot) {
    slot.filled = true;
    sound('correct');
    if (slots.value.every(item => !item.blank || item.filled)) void completeWord();
    else roundTimer = setTimeout(resetBird, 450);
  } else {
    mistakes.value++;
    wrongWords.value.push(currentWord.value.en_us);
    score.value = Math.max(0, score.value - settings.penalty);
    sound('wrong');
    progress();
    roundTimer = setTimeout(resetBird, 450);
  }
}

function draw() {
  if (!context) return;
  const ctx = context;
  ctx.clearRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#82d8f9'); sky.addColorStop(1, '#e6f8ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
  ctx.fillStyle = '#8bc34a'; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = '#558b2f'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
  // 木製彈弓與拉動中的橡皮筋。
  ctx.fillStyle = '#795548'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 5;
  ctx.fillRect(slingX - 11, slingY - 8, 22, groundY - slingY + 8);
  ctx.strokeRect(slingX - 11, slingY - 8, 22, groundY - slingY + 8);
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(slingX, slingY + 40); ctx.lineTo(slingX + side * 26, slingY - 20); ctx.stroke();
  }
  if (dragging) {
    ctx.beginPath(); ctx.moveTo(slingX - 26, slingY - 20); ctx.lineTo(bird.x, bird.y);
    ctx.lineTo(slingX + 26, slingY - 20); ctx.strokeStyle = '#4e342e'; ctx.lineWidth = 6; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (const point of trail.value) { ctx.beginPath(); ctx.arc(point.x, point.y, 4, 0, Math.PI * 2); ctx.fill(); }
  if (bird.state !== 'hit') {
    ctx.beginPath(); ctx.arc(bird.x, bird.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#e53935'; ctx.fill(); ctx.strokeStyle = '#871b16'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(bird.x + 10, bird.y - 7, 9, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(bird.x + 13, bird.y - 7, 4, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(bird.x + 26, bird.y + 5); ctx.lineTo(bird.x + 9, bird.y + 15); ctx.lineTo(bird.x + 9, bird.y - 4);
    ctx.fillStyle = '#ffb300'; ctx.fill();
  }
  for (const pig of pigs.value) {
    ctx.beginPath(); ctx.arc(pig.x, pig.y, 35, 0, Math.PI * 2);
    ctx.fillStyle = '#7cb342'; ctx.fill(); ctx.strokeStyle = '#33691e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(pig.x, pig.y + 13, 15, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#aed581'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#25420d'; ctx.lineWidth = 3;
    ctx.font = 'bold 43px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText(pig.char, pig.x, pig.y - 9); ctx.fillText(pig.char, pig.x, pig.y - 9);
  }
}

function frameTick() {
  if (status.value !== 'playing' || disposed) return;
  for (const pig of pigs.value) { pig.phase += .05; pig.y = pig.baseY + Math.sin(pig.phase) * 8; }
  if (bird.state === 'flying') {
    bird.vy += .42; bird.x += bird.vx; bird.y += bird.vy;
    if (trail.value.length === 20) trail.value.shift();
    trail.value.push({ x: bird.x, y: bird.y });
    const hit = pigs.value.find(pig => Math.hypot(bird.x - pig.x, bird.y - pig.y) < 62);
    if (hit) hitPig(hit);
    else if (bird.y > groundY || bird.x > W + 40 || bird.x < -40) {
      bird.state = 'hit'; roundTimer = setTimeout(resetBird, 350);
    }
  }
  draw();
  frame = requestAnimationFrame(frameTick);
}

function pointOf(event) {
  const rect = canvas.value.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
}
function pointerDown(event) {
  if (status.value !== 'playing' || bird.state !== 'idle') return;
  const point = pointOf(event);
  if (Math.hypot(point.x - bird.x, point.y - bird.y) > 65) return;
  event.preventDefault(); canvas.value.setPointerCapture(event.pointerId);
  dragging = true; bird.state = 'dragging';
  primeAudio(); sound('stretch');
  pointerMove(event);
}
function pointerMove(event) {
  if (!dragging) return;
  event.preventDefault();
  const point = pointOf(event);
  let dx = point.x - slingX, dy = point.y - slingY;
  const length = Math.hypot(dx, dy);
  if (length > 120) { dx = dx / length * 120; dy = dy / length * 120; }
  bird.x = slingX + Math.min(30, dx); bird.y = slingY + dy;
}
function pointerUp() {
  if (!dragging) return;
  dragging = false;
  const dx = slingX - bird.x, dy = slingY - bird.y;
  if (Math.hypot(dx, dy) < 20) { resetBird(); return; }
  bird.vx = dx * .25; bird.vy = dy * .25; bird.state = 'flying';
  sound('launch');
}
function pointerCancel() { if (dragging) resetBird(); }

async function saveResult(outcome) {
  if (saved.value || savePromise || !student.value?.id) return savePromise;
  const payload = {
    student_id: student.value.id, game_type: gameName, score: score.value, mistakes: mistakes.value,
    time_taken_seconds: startedAt.value ? Math.round((Date.now() - startedAt.value) / 1000) : 0,
    version: lesson.version, volume: lesson.volume, unit_played: lesson.unit,
    correct_words: `【${outcome}】對手：${opponent.value.name}；完成：${completed.value}/${settings.target}${correctWords.value.length ? `, ${correctWords.value.join(', ')}` : ''}`,
    wrong_words: wrongWords.value.join(', ')
  };
  savePromise = db.from('game_records').insert([payload]).then(({ error }) => {
    if (error) { saveError.value = `紀錄儲存失敗：${error.message}`; return; }
    saved.value = true; saveError.value = '';
  }).finally(() => { savePromise = null; });
  return savePromise;
}

async function finishLocal(id) {
  if (status.value !== 'playing') return;
  winnerId.value = id;
  status.value = 'over';
  sound(id == null ? 'word' : String(id) === String(student.value.id) ? 'win' : 'lose');
  clearTimeout(roundTimer);
  if (frame) cancelAnimationFrame(frame);
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  await saveResult(id == null ? '平' : String(id) === String(student.value.id) ? '勝' : '敗');
}

async function finishRoom(id) {
  if (status.value !== 'playing' || !room.value || settling) return;
  settling = true;
  try {
    const { data, error } = await db.from('game_rooms').update({ status: 'finished', winner_id: id })
      .eq('id', room.value.id).eq('status', 'playing').select('winner_id').maybeSingle();
    if (error) { notice.value = `結算失敗：${error.message}`; return; }
    let finalWinner = data?.winner_id;
    if (!data) {
      const { data: latest } = await db.from('game_rooms').select('winner_id,status').eq('id', room.value.id).maybeSingle();
      if (latest?.status !== 'finished') return;
      finalWinner = latest.winner_id;
    }
    if (data) void send('finished', { winnerId: finalWinner, id: String(student.value.id), completed: completed.value, score: score.value, mistakes: mistakes.value });
    await finishLocal(finalWinner);
  } finally {
    settling = false;
  }
}

async function beginMatch(deadline, rules, rounds) {
  if (status.value === 'playing' || status.value === 'over') return;
  if (rules) Object.assign(settings, rules);
  if (Array.isArray(rounds) && rounds.length) matchWords.value = rounds;
  endsAt.value = deadline;
  startedAt.value = Date.now();
  score.value = 0; mistakes.value = 0; completed.value = 0;
  correctWords.value = []; wrongWords.value = [];
  Object.assign(opponentProgress, { completed: 0, score: 0, mistakes: 0 });
  status.value = 'playing';
  sound('start');
  await nextTick();
  context = canvas.value?.getContext('2d');
  nextRound();
  frame = requestAnimationFrame(frameTick);
  progress();
}

function startFromHost() {
  if (!isHost.value || status.value !== 'searching') return;
  const deadline = Date.now() + settings.duration * 1000;
  const shuffled = [...words.value].sort(() => Math.random() - .5);
  matchWords.value = Array.from({ length: settings.target }, (_, index) => shuffled[index % shuffled.length]);
  void beginMatch(deadline);
  void send('start', { endsAt: deadline, rounds: matchWords.value, rules: { blanks: settings.blanks, penalty: settings.penalty, target: settings.target, duration: settings.duration } });
}

async function connectRoom() {
  if (channel) await db.removeChannel(channel);
  channel = db.channel(`angrybirds_dual_${room.value.id}`);
  channel.on('broadcast', { event: 'ready' }, ({ payload }) => {
    if (isHost.value && String(payload.id) === String(room.value?.guest_id)) {
      if (status.value === 'searching') startFromHost();
      if (status.value === 'playing') void send('start', { endsAt: endsAt.value, rounds: matchWords.value, rules: { blanks: settings.blanks, penalty: settings.penalty, target: settings.target, duration: settings.duration } });
    }
  }).on('broadcast', { event: 'start' }, ({ payload }) => {
    if (!isHost.value && status.value === 'searching' && payload?.endsAt) void beginMatch(payload.endsAt, payload.rules, payload.rounds);
  }).on('broadcast', { event: 'progress' }, ({ payload }) => {
    if (String(payload.id) !== String(opponent.value.id)) return;
    opponentProgress.completed = Number(payload.completed) || 0;
    opponentProgress.score = Number(payload.score) || 0;
    opponentProgress.mistakes = Number(payload.mistakes) || 0;
  }).on('broadcast', { event: 'finished' }, ({ payload }) => {
    if (String(payload.id) === String(opponent.value.id)) {
      opponentProgress.completed = Number(payload.completed) || 0;
      opponentProgress.score = Number(payload.score) || 0;
      opponentProgress.mistakes = Number(payload.mistakes) || 0;
    }
    if (status.value === 'playing') void finishLocal(payload.winnerId);
  }).on('broadcast', { event: 'left' }, ({ payload }) => {
    if (String(payload.id) === String(opponent.value.id) && status.value === 'playing') void finishRoom(student.value.id);
  }).subscribe(state => {
    if (state === 'SUBSCRIBED' && !isHost.value) void send('ready', { id: String(student.value.id) });
  });
}

async function claimRoom(candidate) {
  const { data, error } = await db.from('game_rooms').update({ guest_id: student.value.id, guest_name: myName.value, status: 'playing' })
    .eq('id', candidate.id).eq('status', 'waiting').is('guest_id', null).select('*').maybeSingle();
  if (error) throw error;
  if (!data) return false;
  room.value = data; isHost.value = false;
  opponent.value = { id: data.host_id, name: data.host_name };
  status.value = 'searching';
  await connectRoom();
  return true;
}

async function findMatch() {
  if (joining.value || status.value !== 'ready') return;
  primeAudio();
  joining.value = true; notice.value = '';
  try {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const { data: recent, error: recordError } = await db.from('game_records').select('correct_words')
      .eq('student_id', student.value.id).eq('game_type', gameName).gte('played_at', midnight.toISOString());
    if (recordError) throw recordError;
    if ((recent || []).filter(record => record.correct_words?.startsWith('【逃】')).length >= settings.maxEscapes) {
      notice.value = `今日已離開對戰 ${settings.maxEscapes} 次，明天再玩。`;
      return;
    }
    const { data: available, error: searchError } = await db.from('game_rooms').select('*')
      .eq('unit_info', unitKey).eq('status', 'waiting').neq('host_id', student.value.id)
      .gte('created_at', new Date(Date.now() - 120000).toISOString()).order('created_at').limit(20);
    if (searchError) throw searchError;
    for (const candidate of available || []) if (await claimRoom(candidate)) return;
    const { data, error } = await db.from('game_rooms').insert([{
      host_id: student.value.id, host_name: myName.value, unit_info: unitKey, status: 'waiting'
    }]).select('*').single();
    if (error) throw error;
    room.value = data; isHost.value = true; status.value = 'searching';
    await connectRoom();
  } catch (error) { notice.value = `配對失敗：${error.message}`; status.value = 'ready'; }
  finally { joining.value = false; }
}

async function pollRoom() {
  if (!room.value || !['searching', 'playing'].includes(status.value)) return;
  const { data, error } = await db.from('game_rooms').select('*').eq('id', room.value.id).maybeSingle();
  if (error) { notice.value = error.message; return; }
  if (!data) {
    if (status.value === 'playing') void finishLocal(student.value.id);
    else { room.value = null; status.value = 'ready'; }
    return;
  }
  room.value = data;
  if (data.guest_id) opponent.value = isHost.value ? { id: data.guest_id, name: data.guest_name } : { id: data.host_id, name: data.host_name };
  if (data.status === 'finished') {
    if (status.value === 'playing') void finishLocal(data.winner_id);
    else { room.value = null; status.value = 'ready'; notice.value = '對手已取消配對，請重新尋找。'; }
  } else if (isHost.value && status.value === 'searching' && data.status === 'playing' && data.guest_id) {
    startFromHost();
  } else if (!isHost.value && status.value === 'searching' && data.status === 'playing') {
    void send('ready', { id: String(student.value.id) });
  } else if (isHost.value && status.value === 'searching' && data.status === 'waiting' && !joining.value) {
    joining.value = true;
    try {
      if (Date.now() - new Date(data.created_at).getTime() > 100000) {
        const { data: removed } = await db.from('game_rooms').delete().eq('id', data.id).eq('status', 'waiting').is('guest_id', null).select('id').maybeSingle();
        if (removed) { room.value = null; status.value = 'ready'; }
      } else {
        const { data: older } = await db.from('game_rooms').select('*').eq('unit_info', unitKey).eq('status', 'waiting')
          .neq('host_id', student.value.id).lt('created_at', data.created_at)
          .gte('created_at', new Date(Date.now() - 120000).toISOString()).order('created_at').limit(1);
        if (older?.length) {
          const { data: removed } = await db.from('game_rooms').delete().eq('id', data.id).eq('status', 'waiting').is('guest_id', null).select('id').maybeSingle();
          if (removed && !await claimRoom(older[0])) { room.value = null; status.value = 'ready'; }
        }
      }
    } catch (problem) { notice.value = `配對重試失敗：${problem.message}`; }
    finally { joining.value = false; }
    if (status.value === 'ready') await findMatch();
  }
}

async function leaveMatch() {
  const playing = status.value === 'playing';
  const current = room.value;
  const occupied = current && (current.status === 'playing' || current.guest_id);
  if (playing || occupied) void send('left', { id: String(student.value.id) });
  if (playing) {
    await saveResult('逃');
    if (saveError.value) notice.value = saveError.value;
  }
  if (current && occupied) await db.from('game_rooms').update({ status: 'finished', winner_id: opponent.value.id }).eq('id', current.id).eq('status', 'playing');
  else if (current && isHost.value) await db.from('game_rooms').delete().eq('id', current.id).eq('status', 'waiting').is('guest_id', null);
  status.value = 'ready'; room.value = null;
  clearTimeout(roundTimer);
  if (frame) cancelAnimationFrame(frame);
  if (channel) { await db.removeChannel(channel); channel = null; }
}

async function goHome() {
  if (['searching', 'playing'].includes(status.value)) await leaveMatch();
  await navigateTo('/');
}

onMounted(async () => {
  try {
    if (!student.value?.id || student.value.isAnon) throw new Error('請先登入學生帳號再玩雙人對戰。');
    if (Object.values(lesson).some(value => !value)) throw new Error('請從遊戲選單選擇完整課程。');
    const { data: config, error: configError } = await db.from('system_settings').select('*').eq('id', 1).single();
    if (configError) throw configError;
    if (config.disabled_games?.includes(gameKey)) throw new Error('老師目前未開放雙人憤怒鳥。');
    if (config.locked_units?.includes([lesson.version, lesson.volume, lesson.unit].join('|'))) throw new Error('老師已鎖定這個單元。');
    if (config.restrict_play_time) {
      const time = new Date(), hhmm = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
      if (!(config.allow_play_days || []).includes(time.getDay()) || hhmm < String(config.allow_play_start || '00:00').slice(0, 5) || hhmm > String(config.allow_play_end || '23:59').slice(0, 5)) throw new Error('目前不是開放遊玩時段。');
    }
    const { data: allowed, error: allowedError } = await db.from('students').select('allowed_games').eq('student_id', student.value.id).maybeSingle();
    if (allowedError) throw allowedError;
    if (allowed?.allowed_games && !allowed.allowed_games.includes('ALL') && !allowed.allowed_games.includes(gameKey)) throw new Error('老師未開放這個遊戲給你。');
    settings.blanks = clampSetting(config.angrybirds_blank_count, 3, 1, 9);
    settings.penalty = clampSetting(config.angrybirds_penalty_points, 2, 0, 50);
    settings.target = clampSetting(config.pvp_target_score, 5, 1, 10);
    settings.maxEscapes = clampSetting(config.pvp_max_escapes, 20, 0, 100);
    const { data: vocab, error: vocabError } = await db.from('vocabularies').select('en_us,zh_tw')
      .eq('version', lesson.version).eq('volume', lesson.volume).eq('unit', lesson.unit);
    if (vocabError) throw vocabError;
    words.value = (vocab || []).filter(item => item.en_us && item.zh_tw && item.en_us.replace(/[^a-zA-Z]/g, '').length >= 3);
    if (!words.value.length) throw new Error('本課沒有可射擊的單字，請選擇其他課程。');
    status.value = 'ready';
    pollTimer = setInterval(() => { void pollRoom(); }, 1500);
    clockTimer = setInterval(() => {
      now.value = Date.now();
      if (status.value !== 'playing') return;
      if (Date.now() - lastProgress > 1000) progress();
      if (isHost.value && remaining.value === 0) {
        const leading = completed.value !== opponentProgress.completed
          ? completed.value > opponentProgress.completed
          : score.value !== opponentProgress.score ? score.value > opponentProgress.score : null;
        void finishRoom(leading == null ? null : leading ? student.value.id : opponent.value.id);
      }
    }, 250);
  } catch (error) { notice.value = error.message; status.value = 'error'; }
});

onUnmounted(() => {
  disposed = true;
  clearInterval(pollTimer); clearInterval(clockTimer); clearTimeout(roundTimer);
  if (frame) cancelAnimationFrame(frame);
  if (status.value === 'playing') {
    void send('left', { id: String(student.value?.id) });
    void saveResult('逃');
    if (room.value) void db.from('game_rooms').update({ status: 'finished', winner_id: opponent.value.id }).eq('id', room.value.id).eq('status', 'playing').then();
  }
  if (status.value === 'searching' && room.value?.status === 'playing') {
    void send('left', { id: String(student.value?.id) });
    void db.from('game_rooms').update({ status: 'finished', winner_id: opponent.value.id }).eq('id', room.value.id).eq('status', 'playing').then();
  }
  if (isHost.value && status.value === 'searching' && room.value) void db.from('game_rooms').delete().eq('id', room.value.id).eq('status', 'waiting').is('guest_id', null).then();
  if (channel) void db.removeChannel(channel);
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (soundContext) void soundContext.close();
});
</script>

<template>
  <main class="duel-root">
    <header class="duel-header"><h1>🐦 單字憤怒鳥（雙人）</h1><button class="exit" @click="goHome">← 返回選單</button></header>
    <p v-if="notice" class="notice" role="alert">{{ notice }}</p>
    <section v-if="status === 'loading'" class="panel">載入課程與設定中…</section>
    <section v-else-if="status === 'error'" class="panel"><p>{{ notice }}</p><button @click="goHome">返回選單</button></section>
    <section v-else-if="status === 'ready'" class="panel"><h2>🐦 同課程雙人射擊</h2><p>拖曳紅鳥射中正確字母小豬，先完成 {{ settings.target }} 個單字獲勝；限時 {{ settings.duration }} 秒，時間到以完成字數及分數決勝。</p><p>打錯字母扣 {{ settings.penalty }} 分。每位玩家使用自己的球場。</p><button :disabled="joining" @click="findMatch">{{ joining ? '配對中…' : '🔍 尋找對手' }}</button></section>
    <section v-else-if="status === 'searching'" class="panel"><h2>正在等待同課程對手…</h2><p>{{ isHost ? '已建立房間' : '已加入房間，等待球場同步' }}</p><button @click="leaveMatch">取消配對</button></section>
    <template v-else-if="status === 'playing' || status === 'over'">
      <div class="scorebar"><div class="mine"><strong>{{ myName }}</strong><span>{{ completed }}/{{ settings.target }} 字 · {{ score }} 分</span></div><div class="clock">{{ remaining }} 秒</div><div class="theirs"><strong>{{ opponent.name }}</strong><span>{{ opponentProgress.completed }}/{{ settings.target }} 字 · {{ opponentProgress.score }} 分</span></div></div>
      <template v-if="status === 'playing'">
        <div class="word-panel"><span class="round">第 {{ roundLabel }} 字</span><strong>{{ currentWord?.zh_tw || '準備中…' }}</strong><button @click="speakWord(currentWord?.en_us)" title="聽發音">🔊</button><div class="letters"><span v-for="(slot, index) in slots" :key="index" :class="{ blank: slot.blank, filled: slot.filled }">{{ !slot.blank || slot.filled ? slot.char : '＿' }}</span></div></div>
        <div class="board"><canvas ref="canvas" :width="W" :height="H" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerCancel"></canvas></div>
        <div class="game-footer"><span>向後拖曳紅鳥並放開，射中正確字母的小豬。</span><span>失誤 {{ mistakes }} 次</span><button @click="leaveMatch">離開對戰</button></div>
      </template>
      <section v-else class="panel result"><h2>{{ resultLabel }}</h2><p>你完成 {{ completed }} 字、{{ score }} 分；{{ opponent.name }} 完成 {{ opponentProgress.completed }} 字、{{ opponentProgress.score }} 分。</p><p>答錯 {{ mistakes }} 次</p><p v-if="saveError" role="alert">{{ saveError }} <button @click="saveResult(winnerId == null ? '平' : String(winnerId) === String(student.id) ? '勝' : '敗')">重試儲存</button></p><p><NuxtLink :to="{ path: '/history', query: { game: gameName } }">我的對戰紀錄</NuxtLink> · <NuxtLink :to="{ path: '/leaderboard', query: { game: gameName, ...lesson } }">全校英雄榜</NuxtLink></p><button @click="goHome">返回首頁</button></section>
    </template>
  </main>
</template>

<style scoped>
.duel-root{position:fixed;inset:0;display:flex;flex-direction:column;gap:8px;box-sizing:border-box;padding:env(safe-area-inset-top) 10px env(safe-area-inset-bottom);overflow:auto;background:#bbdefb;color:#243346;font-family:system-ui,sans-serif}.duel-header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none;background:#c62828;color:#fff;padding:6px 12px;border-radius:6px}.duel-header h1{font-size:clamp(1rem,3vw,1.4rem);margin:0}.exit{background:#fff;border:0;border-radius:6px;padding:7px 10px;color:#a62424;font-weight:bold;white-space:nowrap}.notice{margin:0;padding:6px 10px;background:#ffe0b2;border-radius:7px}.panel{box-sizing:border-box;width:min(100%,600px);margin:auto;padding:20px;background:white;border:4px solid #c62828;border-radius:16px;text-align:center;box-shadow:0 7px 0 #9f1c1c}.panel h2{margin-top:0}.panel button,.game-footer button{background:#4caf50;border:0;border-radius:8px;padding:10px 15px;color:#fff;font-weight:bold;cursor:pointer}.panel button:disabled{opacity:.6}.panel a{color:#9f1c1c}.scorebar{width:min(100%,800px);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:3px solid #c62828;border-radius:9px;padding:7px 10px;box-sizing:border-box}.scorebar .mine,.scorebar .theirs{min-width:0;display:flex;flex-direction:column}.scorebar strong,.scorebar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scorebar .theirs{text-align:right}.clock{font-size:clamp(.85rem,2vw,1.15rem);font-weight:900;color:#c62828;white-space:nowrap}.word-panel{width:min(100%,800px);margin:0 auto;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:7px;background:#fff;border-radius:9px}.word-panel strong{color:#c62828;font-size:clamp(1rem,3vw,1.5rem)}.word-panel button{border:0;background:transparent;font-size:1.3rem}.round{background:#ef9a9a;border-radius:5px;padding:3px 5px;font-size:.85rem}.letters{display:flex;justify-content:center;gap:3px;flex-wrap:wrap;width:100%;font-family:monospace;font-weight:900;font-size:clamp(1rem,3vw,1.8rem)}.letters span.blank{color:#c62828}.letters span.filled{color:#2e7d32}.board{width:min(100%,800px);max-height:calc(100vh - 245px);min-height:160px;aspect-ratio:8/5;margin:0 auto;box-sizing:border-box;border:5px solid #4e342e;border-radius:14px;overflow:hidden;background:#81d4fa;box-shadow:0 7px 12px #0004}.board canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}.board canvas:active{cursor:grabbing}.game-footer{width:min(100%,800px);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.9rem}.game-footer button{background:#c62828;white-space:nowrap}.result{margin:auto}@media(max-width:520px){.duel-root{gap:5px;padding-left:5px;padding-right:5px}.scorebar{font-size:.75rem;padding:5px}.word-panel{padding:4px}.board{max-height:calc(100vh - 215px)}.game-footer span:first-child{display:none}.game-footer button{padding:7px}}@media(max-height:620px){.board{max-height:calc(100vh - 180px)}.game-footer span:first-child{display:none}}
</style>
