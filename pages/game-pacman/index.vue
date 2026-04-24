<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' }
  ]
});

const supabase = useSupabaseClient();
const route = useRoute();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('setup'); 
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
const score = ref(0); 
let timer = null;
let animationFrameId = null;

const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

const config = ref({ time_limit: 180, penalty: 5, blankCount: 4, pacman_free_time: 5 });

const ALL_KEYS = ['up', 'down', 'left', 'right'];
const unlockedKeys = ref([]); 
const myTarget = ref(null); 
const isDesktop = ref(false); 

// 🌟 自由活動時間狀態
const freeTimeLeft = ref(0);
let freeTimerId = null;

// --- 音效 ---
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playTone = (freq, type, duration, vol = 0.05) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
};
const sfx = {
  type: () => playTone(800, 'square', 0.05),
  correct: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3),
  eatDot: () => playTone(400, 'triangle', 0.05, 0.02),
  eatPower: () => { playTone(300, 'square', 0.1); setTimeout(() => playTone(400, 'square', 0.1), 100); },
  eatGhost: () => { playTone(800, 'sawtooth', 0.1); setTimeout(() => playTone(1200, 'sawtooth', 0.2), 100); },
  die: () => { playTone(200, 'sawtooth', 0.5); setTimeout(() => playTone(150, 'sawtooth', 0.5), 250); }
};

// --- Canvas 與 小精靈引擎 ---
const canvasRef = ref(null);
let ctx = null;
const TILE_SIZE = 20; 
const MAP_ROWS = 19;
const MAP_COLS = 19;

// 1: 牆壁, 2: 豆子, 3: 大力丸, 0: 空地, 9: 鬼屋
let map = [];
const baseMapTemplate = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,9,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,9,1,1,0,1,2,1,1,1,1],
    [0,0,0,0,2,0,0,1,9,9,9,1,0,0,2,0,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const generateRandomMap = () => {
    map = JSON.parse(JSON.stringify(baseMapTemplate));
    for (let r = 2; r < MAP_ROWS - 2; r++) {
        for (let c = 2; c < MAP_COLS - 2; c++) {
            if (map[r][c] === 1 && Math.random() < 0.15) {
                if (!(r >= 7 && r <= 11 && c >= 6 && c <= 12)) {
                    map[r][c] = 2; 
                    map[r][MAP_COLS - 1 - c] = 2; 
                }
            }
        }
    }
};

const pacman = reactive({ x: 9 * TILE_SIZE, y: 15 * TILE_SIZE, vx: 0, vy: 0, speed: 2, radius: 8, angle: 0, mouthOpen: 0, nextDir: null });
const ghosts = reactive([]);
let powerModeTimer = 0;

const initEntities = () => {
    pacman.x = 9 * TILE_SIZE; pacman.y = 15 * TILE_SIZE;
    pacman.vx = 0; pacman.vy = 0; pacman.nextDir = null;
    
    ghosts.splice(0, ghosts.length);
    const colors = ['#f44336', '#ff9800', '#03a9f4', '#e91e63'];
    const startPositions = [{x: 8, y: 9}, {x: 9, y: 9}, {x: 10, y: 9}, {x: 9, y: 8}];
    for(let i=0; i<4; i++){
        ghosts.push({
            x: startPositions[i].x * TILE_SIZE, y: startPositions[i].y * TILE_SIZE,
            vx: 0, vy: 0, speed: 1.5, color: colors[i], isFrightened: false, state: 'normal'
        });
    }
};

const requestDirection = (dir) => {
    if (!unlockedKeys.value.includes(dir)) return; 
    if (dir === 'left') pacman.nextDir = { vx: -pacman.speed, vy: 0 };
    if (dir === 'right') pacman.nextDir = { vx: pacman.speed, vy: 0 };
    if (dir === 'up') pacman.nextDir = { vx: 0, vy: -pacman.speed };
    if (dir === 'down') pacman.nextDir = { vx: 0, vy: pacman.speed };
};

const isWall = (gx, gy) => {
    if (gy < 0 || gy >= MAP_ROWS || gx < 0 || gx >= MAP_COLS) return false; 
    return map[gy][gx] === 1;
};

const updatePhysics = () => {
    if (gameStatus.value !== 'playing') return;

    // 1. Pacman 移動
    if (pacman.nextDir) {
        if (pacman.x % TILE_SIZE === 0 && pacman.y % TILE_SIZE === 0) {
            const nextGx = (pacman.x + Math.sign(pacman.nextDir.vx)*TILE_SIZE) / TILE_SIZE;
            const nextGy = (pacman.y + Math.sign(pacman.nextDir.vy)*TILE_SIZE) / TILE_SIZE;
            if (!isWall(nextGx, nextGy)) {
                pacman.vx = pacman.nextDir.vx; pacman.vy = pacman.nextDir.vy;
                pacman.nextDir = null; 
            }
        }
    }

    let nextX = pacman.x + pacman.vx;
    let nextY = pacman.y + pacman.vy;
    
    if (nextX < -TILE_SIZE) nextX = MAP_COLS * TILE_SIZE;
    if (nextX > MAP_COLS * TILE_SIZE) nextX = -TILE_SIZE;

    if (pacman.vx !== 0 || pacman.vy !== 0) {
        let hitWall = false;
        const checkGx = Math.floor((nextX + (pacman.vx>0 ? TILE_SIZE-1 : 0)) / TILE_SIZE);
        const checkGy = Math.floor((nextY + (pacman.vy>0 ? TILE_SIZE-1 : 0)) / TILE_SIZE);
        
        if (isWall(checkGx, checkGy) || isWall(Math.floor((nextX + (pacman.vx>0?TILE_SIZE-1:0)) / TILE_SIZE), Math.floor((nextY + (pacman.vy>0?TILE_SIZE-1:0)) / TILE_SIZE))) {
            hitWall = true;
        }
        if (!hitWall) { pacman.x = nextX; pacman.y = nextY; }
    }

    pacman.mouthOpen = (pacman.mouthOpen + 0.15) % Math.PI;
    if (pacman.vx > 0) pacman.angle = 0;
    else if (pacman.vx < 0) pacman.angle = Math.PI;
    else if (pacman.vy > 0) pacman.angle = Math.PI / 2;
    else if (pacman.vy < 0) pacman.angle = -Math.PI / 2;

    const cx = Math.floor((pacman.x + TILE_SIZE/2) / TILE_SIZE);
    const cy = Math.floor((pacman.y + TILE_SIZE/2) / TILE_SIZE);
    if (cy >= 0 && cy < MAP_ROWS && cx >= 0 && cx < MAP_COLS) {
        if (map[cy][cx] === 2) {
            map[cy][cx] = 0; score.value += 1; sfx.eatDot();
        } else if (map[cy][cx] === 3) {
            map[cy][cx] = 0; score.value += 5; sfx.eatPower();
            powerModeTimer = 300; 
            ghosts.forEach(g => { if(g.state === 'normal') g.isFrightened = true; });
        }
    }

    if (powerModeTimer > 0) {
        powerModeTimer--;
        if (powerModeTimer === 0) ghosts.forEach(g => g.isFrightened = false);
    }

    // 2. 幽靈移動
    ghosts.forEach(ghost => {
        if (ghost.state === 'dead') {
            const homeX = 9 * TILE_SIZE; const homeY = 9 * TILE_SIZE;
            if (Math.abs(ghost.x - homeX) < 2 && Math.abs(ghost.y - homeY) < 2) {
                ghost.state = 'normal'; ghost.isFrightened = false;
            } else {
                ghost.x += Math.sign(homeX - ghost.x) * 4;
                ghost.y += Math.sign(homeY - ghost.y) * 4;
            }
            return;
        }

        const gSpeed = ghost.isFrightened ? 1 : ghost.speed;
        if (ghost.x % TILE_SIZE === 0 && ghost.y % TILE_SIZE === 0) {
            const possibleDirs = [];
            const gx = ghost.x / TILE_SIZE; const gy = ghost.y / TILE_SIZE;
            
            if (!isWall(gx, gy-1) && ghost.vy >= 0) possibleDirs.push({vx: 0, vy: -gSpeed});
            if (!isWall(gx, gy+1) && ghost.vy <= 0) possibleDirs.push({vx: 0, vy: gSpeed});
            if (!isWall(gx-1, gy) && ghost.vx >= 0) possibleDirs.push({vx: -gSpeed, vy: 0});
            if (!isWall(gx+1, gy) && ghost.vx <= 0) possibleDirs.push({vx: gSpeed, vy: 0});

            if (possibleDirs.length > 0) {
                let bestDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                if (!ghost.isFrightened && Math.random() < 0.5) {
                    let minDist = Infinity;
                    possibleDirs.forEach(d => {
                        let dist = Math.hypot((ghost.x+d.vx*10)-pacman.x, (ghost.y+d.vy*10)-pacman.y);
                        if (dist < minDist) { minDist = dist; bestDir = d; }
                    });
                }
                ghost.vx = bestDir.vx; ghost.vy = bestDir.vy;
            } else {
                ghost.vx *= -1; ghost.vy *= -1; 
            }
        }
        
        ghost.x += ghost.vx; ghost.y += ghost.vy;
        if (ghost.x < -TILE_SIZE) ghost.x = MAP_COLS * TILE_SIZE;
        if (ghost.x > MAP_COLS * TILE_SIZE) ghost.x = -TILE_SIZE;

        // 碰撞偵測
        if (Math.hypot(ghost.x - pacman.x, ghost.y - pacman.y) < TILE_SIZE - 2) {
            if (ghost.isFrightened) {
                sfx.eatGhost(); score.value += 20; ghost.state = 'dead';
            } else {
                sfx.die();
                score.value = Math.max(0, score.value - config.value.penalty * 2);
                mistakesCount.value++;
                initEntities(); 
                
                // 死亡重置：清除自由時間，立刻出新題
                if (freeTimerId) {
                    clearInterval(freeTimerId); freeTimerId = null; freeTimeLeft.value = 0;
                }
                assignNewWord();
            }
        }
    });

    drawCanvas();
    animationFrameId = requestAnimationFrame(updatePhysics);
};

const drawCanvas = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = '#1565c0'; 
                ctx.fillRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else if (map[r][c] === 2) {
                ctx.fillStyle = '#ffcc80'; 
                ctx.beginPath(); ctx.arc(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2, 3, 0, Math.PI*2); ctx.fill();
            } else if (map[r][c] === 3) {
                ctx.fillStyle = '#fff'; 
                if (Date.now() % 500 < 250) {
                    ctx.beginPath(); ctx.arc(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2, 6, 0, Math.PI*2); ctx.fill();
                }
            } else if (map[r][c] === 9) {
                ctx.fillStyle = 'rgba(255,255,255,0.1)'; 
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    ctx.save();
    ctx.translate(pacman.x + TILE_SIZE/2, pacman.y + TILE_SIZE/2);
    ctx.rotate(pacman.angle);
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(0, 0, pacman.radius, pacman.mouthOpen, Math.PI * 2 - pacman.mouthOpen);
    ctx.lineTo(0, 0); ctx.fill();
    ctx.restore();

    ghosts.forEach(g => {
        ctx.save();
        ctx.translate(g.x + TILE_SIZE/2, g.y + TILE_SIZE/2);
        
        if (g.state === 'dead') {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI*2); ctx.arc(3, -2, 2, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = g.isFrightened ? (powerModeTimer < 60 && powerModeTimer % 10 < 5 ? '#fff' : '#3f51b5') : g.color;
            ctx.beginPath();
            ctx.arc(0, -2, 7, Math.PI, 0); 
            ctx.lineTo(7, 8); 
            ctx.lineTo(3, 6); ctx.lineTo(0, 8); ctx.lineTo(-3, 6); 
            ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
            
            if (!g.isFrightened) {
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI*2); ctx.arc(3, -2, 2, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-3 + Math.sign(g.vx), -2 + Math.sign(g.vy), 1, 0, Math.PI*2); ctx.arc(3 + Math.sign(g.vx), -2 + Math.sign(g.vy), 1, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();
    });
};

const assignNewWord = () => {
    if (!allWords.value || allWords.value.length === 0) return;
    const randomWord = allWords.value[Math.floor(Math.random() * allWords.value.length)];
    const pureWord = randomWord.en_us.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    let numBlanks = Math.max(1, Math.min(config.value.blankCount || 4, pureWord.length));
    let indices = [];
    while(indices.length < numBlanks) {
        let r = Math.floor(Math.random() * pureWord.length);
        if(!indices.includes(r)) indices.push(r);
    }
    indices.sort((a,b) => a - b); 

    const slots = pureWord.split('').map((char, idx) => ({ char: char, isBlank: indices.includes(idx), filled: !indices.includes(idx) }));
    const targetChars = indices.map(idx => pureWord[idx]);
    
    let opts = [...targetChars];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    while(opts.length < Math.max(targetChars.length + 4, 10)) opts.push(alphabet[Math.floor(Math.random() * 26)]); 
    const options = opts.sort(() => 0.5 - Math.random()).map((char, idx) => ({ id: idx, char, used: false }));

    // 🌟 依照挖空數量鎖定按鍵 (最多鎖4個)
    const numLocked = Math.min(4, numBlanks); 
    const shuffledKeys = [...ALL_KEYS].sort(() => 0.5 - Math.random());
    const lockedKeysList = shuffledKeys.slice(0, numLocked);
    unlockedKeys.value = ALL_KEYS.filter(k => !lockedKeysList.includes(k));

    myTarget.value = { word: pureWord, zh: randomWord.zh_tw, typedCount: 0, slots, targetChars, options };
};

const handleOptionClick = (opt) => {
    if (opt.used || !myTarget.value || gameStatus.value !== 'playing') return;
    
    if (opt.char === myTarget.value.targetChars[myTarget.value.typedCount]) {
        sfx.type(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;
        
        // 🌟 每次打對一個字母，解鎖一個方向鍵
        const currentlyLocked = ALL_KEYS.filter(k => !unlockedKeys.value.includes(k));
        if (currentlyLocked.length > 0) {
            unlockedKeys.value.push(currentlyLocked[0]);
        }
        
        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            // 🌟 單字完成：得 10 分，啟動自由活動時間
            sfx.correct();
            score.value += 10;
            if (!correctWordsList.value.includes(myTarget.value.word)) correctWordsList.value.push(myTarget.value.word);
            
            unlockedKeys.value = [...ALL_KEYS]; 
            myTarget.value = null; // 隱藏單字面板
            
            freeTimeLeft.value = config.value.pacman_free_time;
            freeTimerId = setInterval(() => {
                freeTimeLeft.value--;
                if (freeTimeLeft.value <= 0) {
                    clearInterval(freeTimerId);
                    freeTimerId = null;
                    assignNewWord(); // 自由時間結束，出下一題
                }
            }, 1000);
        }
    } else { 
        sfx.wrong(); 
        score.value = Math.max(0, score.value - config.value.penalty);
        mistakesCount.value++;
        if (!wrongWordsList.value.includes(myTarget.value.word)) wrongWordsList.value.push(myTarget.value.word);
    }
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    isDesktop.value = window.innerWidth > 768;

    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.pacman_time_limit) config.value.time_limit = settings.pacman_time_limit;
        if (settings.pacman_penalty) config.value.penalty = settings.pacman_penalty;
        if (settings.pacman_blank_count !== undefined) config.value.blankCount = settings.pacman_blank_count;
        if (settings.pacman_free_time !== undefined) config.value.pacman_free_time = settings.pacman_free_time;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 單元單字不足！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }

    window.addEventListener('keydown', handleKeyDown);
  } catch (e) { console.error(e); }
});

const handleKeyDown = (e) => {
    if (e.code === 'ArrowLeft') requestDirection('left');
    if (e.code === 'ArrowRight') requestDirection('right');
    if (e.code === 'ArrowUp') requestDirection('up');
    if (e.code === 'ArrowDown') requestDirection('down');
};

const joystickOuter = ref(null);
const joystickInner = ref(null);
const joyState = reactive({ active: false, startX: 0, startY: 0, x: 0, y: 0 });

const handleJoyStart = (e) => {
    joyState.active = true;
    let touch = e.touches ? e.touches[0] : e;
    joyState.startX = touch.clientX; joyState.startY = touch.clientY;
    joyState.x = 0; joyState.y = 0;
};
const handleJoyMove = (e) => {
    if (!joyState.active) return;
    e.preventDefault(); 
    let touch = e.touches ? e.touches[0] : e;
    let dx = touch.clientX - joyState.startX; let dy = touch.clientY - joyState.startY;
    let dist = Math.hypot(dx, dy);
    if (dist > 40) { dx = (dx / dist) * 40; dy = (dy / dist) * 40; }
    joyState.x = dx; joyState.y = dy;
    
    if (dist > 15) {
        if (Math.abs(dx) > Math.abs(dy)) {
            requestDirection(dx > 0 ? 'right' : 'left');
        } else {
            requestDirection(dy > 0 ? 'down' : 'up');
        }
    }
};
const handleJoyEnd = () => { joyState.active = false; joyState.x = 0; joyState.y = 0; };

const startGame = async () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    score.value = 0; correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    
    generateRandomMap();
    initEntities();
    assignNewWord();

    gameStartTime.value = Date.now();
    gameStatus.value = 'playing'; 
    
    await nextTick();

    if (canvasRef.value) {
        canvasRef.value.width = MAP_COLS * TILE_SIZE;
        canvasRef.value.height = MAP_ROWS * TILE_SIZE;
        ctx = canvasRef.value.getContext('2d');
    }

    updatePhysics(); 

    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('時間到');
    }, 1000);
};

const endGame = async (reason) => {
    gameStatus.value = 'end';
    clearInterval(timer);
    if (freeTimerId) clearInterval(freeTimerId);
    cancelAnimationFrame(animationFrameId);

    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reason} | 分數: ${score.value}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字小精靈', score: score.value, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: cw, wrong_words: wrongWordsList.value.join(', '), mistakes: mistakesCount.value
        }]);
    }
};

const quitGame = () => {
    if (gameStatus.value === 'playing') endGame('主動放棄');
    else navigateTo('/');
};

onUnmounted(() => { 
    clearInterval(timer); 
    if (freeTimerId) clearInterval(freeTimerId);
    cancelAnimationFrame(animationFrameId); 
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="pacman-root">
    
    <div class="game-wrapper">
        <header v-if="gameStatus === 'setup' || gameStatus === 'end'" class="t-header retro-element">
            <h2 class="t-title">👻 單字小精靈</h2>
            <button class="retro-btn btn-small btn-danger" @click="quitGame">離開</button>
        </header>

        <div v-if="gameStatus === 'playing'" class="hud-layer">
            <div class="hud-box">🏆 {{ score }}</div>
            <div class="hud-box right">⏱️ {{ config.time_limit - timeSpent }}s</div>
            <button class="retro-btn btn-small btn-danger hud-quit" @click="quitGame">放棄</button>
        </div>

        <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

        <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
            <div class="rpg-dialog retro-element">
                <div class="icon-big">👻</div>
                <h2 style="color:#ffeb3b; margin: 5px 0;">單字小精靈</h2>
                <div class="rules-box">
                    <p>1️⃣ <b>方向被鎖</b>：畫面上會出現單字，並根據挖空字數<b>鎖定方向鍵！</b></p>
                    <p>2️⃣ <b>逐字解圍</b>：每拼對一個字母，就能解鎖一個方向！單字解開後，獲得 10 分與 <b>{{ config.pacman_free_time }} 秒</b>的自由活動時間！</p>
                    <p>3️⃣ <b>吃大力丸</b>：吃到白色大閃爍圓點，幽靈會變藍色，可以反吃牠們賺 20 分！</p>
                </div>
                <button class="retro-btn btn-primary" style="margin-top:15px; width:100%; padding:15px;" @click="startGame">進入迷宮</button>
            </div>
        </div>

        <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="game-content">
            
            <div class="maze-zone">
                <canvas ref="canvasRef" class="pacman-canvas"></canvas>
            </div>

            <div class="right-zone">
                <div class="type-section">
                    <div v-if="freeTimeLeft > 0" class="free-time-banner retro-element">
                        <h2 style="margin:0; color:#4caf50;">🏃‍♂️ 自由活動時間</h2>
                        <div class="huge-timer">{{ freeTimeLeft }}s</div>
                    </div>
                    
                    <div class="action-panel retro-element" v-else-if="myTarget">
                        <div class="typing-target">{{ myTarget.zh }}</div>
                        <div class="m-slots">
                            <span v-for="(slot, i) in myTarget.slots" :key="i" class="m-slot" :class="{'is-blank': slot.isBlank, 'filled': slot.filled}">
                                {{ slot.filled || !slot.isBlank ? slot.char.toUpperCase() : '_' }}
                            </span>
                        </div>
                        <div class="m-keyboard">
                            <button v-for="opt in myTarget.options" :key="opt.id" class="retro-btn m-key" :class="{'used': opt.used}" @click="handleOptionClick(opt)">
                                {{ opt.char.toUpperCase() }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="bottom-control-section">
                    <div class="joystick-outer" ref="joystickOuter" 
                         @touchstart="handleJoyStart" @touchmove="handleJoyMove" @touchend="handleJoyEnd" @touchcancel="handleJoyEnd"
                         @mousedown="handleJoyStart" @mousemove="handleJoyMove" @mouseup="handleJoyEnd" @mouseleave="handleJoyEnd">
                        <div class="joystick-inner" ref="joystickInner" :style="{ transform: `translate(${joyState.x}px, ${joyState.y}px)` }"></div>
                    </div>

                    <div class="d-pad-zone">
                        <div class="d-row">
                            <button class="d-btn" :class="{ 'locked': !unlockedKeys.includes('up') }" @pointerdown.prevent="requestDirection('up')">⬆️</button>
                        </div>
                        <div class="d-row">
                            <button class="d-btn" :class="{ 'locked': !unlockedKeys.includes('left') }" @pointerdown.prevent="requestDirection('left')">⬅️</button>
                            <div class="d-center"></div>
                            <button class="d-btn" :class="{ 'locked': !unlockedKeys.includes('right') }" @pointerdown.prevent="requestDirection('right')">➡️</button>
                        </div>
                        <div class="d-row">
                            <button class="d-btn" :class="{ 'locked': !unlockedKeys.includes('down') }" @pointerdown.prevent="requestDirection('down')">⬇️</button>
                        </div>
                        <div v-if="isDesktop" class="desktop-hint">💻 提示：可直接使用鍵盤方向鍵</div>
                    </div>
                </div>
            </div>

        </div>

        <div v-if="gameStatus === 'end'" class="end-overlay">
            <div class="rpg-dialog retro-element">
                <h1>遊戲結束</h1>
                <p class="winner-text" style="color:#ffeb3b;">最終得分：{{ score }}</p>
                <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ errorMsg || '時間到' }}</p>
                <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
            </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
.pacman-root { 
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
    background: #000; display: flex; flex-direction: column; overflow: hidden; 
    font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; 
    touch-action: none; user-select: none; color: #fff; 
}

.game-wrapper {
    flex: 1; display: flex; flex-direction: column; position: relative;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    height: 100dvh; box-sizing: border-box;
}

.retro-element { background: rgba(20, 20, 20, 0.9); border: 2px solid #1e88e5; border-radius: 8px; padding: 5px; box-sizing: border-box; }
.retro-btn { background: #111; color: #fff; border: 2px solid #555; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.1s; font-family: inherit;}
.retro-btn:active:not(:disabled) { transform: translateY(3px); }
.btn-primary { background: #1976d2; border-color: #42a5f5; }
.btn-danger { background: #d32f2f; border-color: #e57373; }
.btn-small { padding: 4px 8px; font-size: 0.9rem;}

.t-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; border-radius: 0; border: none; border-bottom: 2px solid #1e88e5; margin-bottom: 5px;}
.t-title { margin: 0; font-size: 1.1rem; color: #ffeb3b;}

.hud-layer { position: absolute; top: 0; left: 0; width: 100%; pointer-events: none; z-index: 100; display: flex; justify-content: space-between; padding: 5px; box-sizing: border-box;}
.hud-box { pointer-events: auto; font-size: 1rem; color: #ffeb3b; font-weight: 900; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 6px; border: 1px solid #1e88e5; }
.hud-box.right { color: #fff; }
.hud-quit { pointer-events: auto; margin: 0; position: absolute; right: 5px; top: 35px; } 

.setup-overlay, .end-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 450px; width: 90%; text-align: center; padding: 20px; line-height: 1.5;}
.icon-big { font-size: 4rem; margin-bottom: 5px; }
.rules-box { text-align: left; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; font-size: 0.95rem; border: 1px dashed #1e88e5;}

/* 🌟 彈性佈局核心 */
.game-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding-top: 30px;}

.maze-zone { flex: 0 0 auto; width: 100%; max-width: 450px; margin: 0 auto; display: flex; justify-content: center; align-items: center;}
.pacman-canvas { width: 100%; max-width: 100%; aspect-ratio: 1 / 1; background: #000; border: 2px solid #1e88e5; border-radius: 8px; image-rendering: pixelated;}

.right-zone { flex: 1; display: flex; flex-direction: column; }

/* 🔠 打字區與自由時間 */
.type-section { flex: 0 0 auto; width: 100%; display: flex; justify-content: center; padding: 5px; box-sizing: border-box;}
.action-panel { width: 100%; max-width: 800px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-color: #ffeb3b; padding: 5px; min-height: 85px;}
.free-time-banner { width: 100%; max-width: 800px; text-align: center; border-color: #4caf50; padding: 10px;}
.huge-timer { font-size: 3rem; font-weight: 900; color: #ffeb3b; }

.typing-target { font-size: 1.1rem; color: #ffeb3b; text-align: center; margin-bottom: 2px; }
.m-slots { display: flex; gap: 2px; flex-wrap: wrap; justify-content: center; margin-bottom: 5px;}
.m-slot { font-size: 1.3rem; font-weight: bold; border-bottom: 2px solid #777; min-width: 15px; text-align: center; padding: 0 2px;}
.m-slot.filled { color: #4caf50; border-color: #4caf50; }
.m-keyboard { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 450px;}
.m-key { width: 34px; height: 34px; font-size: 1.1rem; padding: 0; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 0 #555;}
.m-key:active:not(.used) { transform: translateY(2px); box-shadow: none; }
.m-key.used { opacity: 0.2; pointer-events: none;}

/* 🎮 控制區 */
.bottom-control-section { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; box-sizing: border-box; gap: 20px; padding-bottom: 10px;}

.joystick-outer { width: 120px; height: 120px; background: rgba(255,255,255,0.1); border: 3px solid rgba(30, 136, 229, 0.6); border-radius: 50%; position: relative; display: flex; justify-content: center; align-items: center; touch-action: none;}
.joystick-inner { width: 50px; height: 50px; background: #1e88e5; border-radius: 50%; position: absolute; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }

.d-pad-zone { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.d-row { display: flex; justify-content: center; gap: 4px; }
.d-center { width: 45px; height: 45px; }
.d-btn { width: 45px; height: 45px; font-size: 1.5rem; background: rgba(255,255,255,0.1); border: 2px solid #1e88e5; border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.1s; padding: 0; color: #fff; user-select: none; touch-action: manipulation;}
.d-btn:active:not(.locked) { background: #1e88e5; transform: scale(0.9); }
.d-btn.locked { opacity: 0.3; filter: grayscale(100%); border-color: #f44336; cursor: not-allowed; box-shadow: none;}

.desktop-hint { font-size: 0.85rem; color: #aaa; margin-top: 8px; font-weight: bold; text-align: center; }

/* 💻 電腦大螢幕雙欄佈局 (完美解決擠壓問題) */
@media (min-width: 768px) {
    .game-content { flex-direction: row; justify-content: center; align-items: center; gap: 20px; padding: 0 20px; }
    
    /* 迷宮在左側，自動適應螢幕高度 */
    .maze-zone { margin: 0; width: 65vh; max-width: 700px; }
    
    /* 操作區在右側 */
    .right-zone { flex: 0 0 380px; justify-content: space-evenly; height: 100%; }
    
    .joystick-outer { display: none !important; } 
    
    .m-key { width: 45px; height: 45px; font-size: 1.5rem; }
    .m-slot { font-size: 2rem; min-width: 30px; }
    
    .d-btn { width: 65px; height: 65px; font-size: 2rem; }
    .d-center { width: 65px; height: 65px; }
}
</style>