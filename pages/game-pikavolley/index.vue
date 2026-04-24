<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
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

// 🌟 加入 unlock_time 的變數
const config = ref({ time_limit: 180, penalty: 5, blankCount: 3, unlock_time: 20 });
const matchScore = reactive({ player: 0, ai: 0 });

const ALL_KEYS = ['left', 'right', 'up', 'down', 'smash'];
const unlockedKeys = ref([...ALL_KEYS]); 
const activeInputs = reactive({ left: false, right: false, up: false, down: false, smash: false });
const myTarget = ref(null); 

const isDesktop = ref(false); 

// 🌟 行動時間控制
const actionTimeRemaining = ref(0); 
let actionTimerInterval = null;

// --- 🌟 原版音效系統 ---
const audioUrls = {
    pika: 'https://raw.githubusercontent.com/gorisanson/pikachu-volleyball/master/src/resources/assets/sounds/WAVE141_1.wav',
    chu: 'https://raw.githubusercontent.com/gorisanson/pikachu-volleyball/master/src/resources/assets/sounds/WAVE142_1.wav',
    hit: 'https://raw.githubusercontent.com/gorisanson/pikachu-volleyball/master/src/resources/assets/sounds/WAVE140_1.wav',
    point: 'https://raw.githubusercontent.com/gorisanson/pikachu-volleyball/master/src/resources/assets/sounds/WAVE143_1.wav',
    start: 'https://raw.githubusercontent.com/gorisanson/pikachu-volleyball/master/src/resources/assets/sounds/WAVE144_1.wav',
};
const sounds = {};

const playOriginalSound = (key) => {
    if (sounds[key]) {
        sounds[key].currentTime = 0;
        sounds[key].play().catch(() => {});
    }
};

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playTone = (freq, type, duration, vol = 0.1) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
};
const sfx = {
  type: () => playTone(800, 'square', 0.05, 0.05),
  correct: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2),
  losePoint: () => { playTone(200, 'sawtooth', 0.4, 0.2); setTimeout(() => playTone(150, 'sawtooth', 0.4, 0.2), 200); }
};

// --- 🌟 物理引擎參數 ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GROUND_Y = 360;
const NET_X = 400;
const NET_Y = 200;

const GRAVITY = 1;
const JUMP_POWER = -16;
const SPEED = 8;
const BALL_GRAVITY = 1;
const BALL_MAX_SPEED = 20;

const p1 = reactive({ x: 100, y: GROUND_Y - 64, vx: 0, vy: 0, width: 64, height: 64, isJumping: false, isDiving: false });
const p2 = reactive({ x: 636, y: GROUND_Y - 64, vx: 0, vy: 0, width: 64, height: 64, isJumping: false, isDiving: false });
const ball = reactive({ x: 200, y: 100, vx: 0, vy: 0, size: 40 });

const serveTurn = ref('p1');
const showRallyMessage = ref('');
const isBallInPlay = ref(false); 
let p2ServingTimer = null;

const resetRally = () => {
    p1.x = 100; p1.y = GROUND_Y - 64; p1.vx = 0; p1.vy = 0; p1.isJumping = false; p1.isDiving = false;
    p2.x = 636; p2.y = GROUND_Y - 64; p2.vx = 0; p2.vy = 0; p2.isJumping = false; p2.isDiving = false;
    
    isBallInPlay.value = false; 
    if (p2ServingTimer) { clearTimeout(p2ServingTimer); p2ServingTimer = null; }
    
    actionTimeRemaining.value = 0; // 每一回合重新開始時，行動時間歸零
    assignNewWord(); 
    resetJoystick(); 
};

const handlePointScored = (winnerSide) => {
    if (showRallyMessage.value) return; 
    isBallInPlay.value = false; 
    
    if (winnerSide === 'p1') {
        playOriginalSound('point');
        matchScore.player++;
        score.value += 20; 
        showRallyMessage.value = '我方得分！ +20';
        serveTurn.value = 'p1';
    } else {
        sfx.losePoint();
        matchScore.ai++;
        score.value = Math.max(0, score.value - 10); 
        showRallyMessage.value = '敵方得分... -10';
        serveTurn.value = 'p2';
    }
    
    setTimeout(() => {
        showRallyMessage.value = '';
        if (gameStatus.value === 'playing') resetRally();
    }, 2000);
};

// 手動發球
const handleServe = () => {
    if (isBallInPlay.value || serveTurn.value !== 'p1' || actionTimeRemaining.value <= 0) return;
    isBallInPlay.value = true;
    ball.vy = -14; 
    playOriginalSound('pika');
};

// 🌟 動態給予行動時間
const addActionTime = () => {
    actionTimeRemaining.value = config.value.unlock_time;
    if (!actionTimerInterval) {
        actionTimerInterval = setInterval(() => {
            if (gameStatus.value === 'playing' && actionTimeRemaining.value > 0) {
                actionTimeRemaining.value--;
            } else if (actionTimeRemaining.value <= 0) {
                clearInterval(actionTimerInterval);
                actionTimerInterval = null;
            }
        }, 1000);
    }
};

const updatePhysics = () => {
    if (gameStatus.value !== 'playing' || showRallyMessage.value !== '') {
        animationFrameId = requestAnimationFrame(updatePhysics);
        return;
    }

    // 🌟 1. 玩家移動控制 (必須在擁有 actionTime 才能行動)
    const canMove = actionTimeRemaining.value > 0;

    if (canMove && activeInputs.left) p1.vx = -SPEED;
    else if (canMove && activeInputs.right) p1.vx = SPEED;
    else p1.vx = 0;

    if (canMove && activeInputs.up && !p1.isJumping) {
        p1.vy = JUMP_POWER; p1.isJumping = true;
    }
    if (canMove && activeInputs.down && !p1.isJumping) {
        p1.isDiving = true;
    } else { p1.isDiving = false; }

    p1.vy += GRAVITY;
    p1.x += p1.vx;
    p1.y += p1.vy;

    if (p1.y >= GROUND_Y - p1.height) { p1.y = GROUND_Y - p1.height; p1.vy = 0; p1.isJumping = false; }
    if (p1.x < 0) p1.x = 0;
    if (p1.x > NET_X - p1.width) p1.x = NET_X - p1.width; 

    // 2. 判斷發球等待狀態
    if (!isBallInPlay.value) {
        if (serveTurn.value === 'p1') {
            ball.x = p1.x + 12; ball.y = p1.y - 40; ball.vx = 0; ball.vy = 0;
        } else {
            // 🌟 強化 AI：電腦固定跑到接發球的好位子發球，且發球絕不失誤
            p2.x = 636; p2.y = GROUND_Y - 64;
            ball.x = p2.x + 12; ball.y = p2.y - 40; ball.vx = 0; ball.vy = 0;
            
            // 只要玩家解鎖獲得時間，AI 也會跟著活過來發球
            if (canMove && !p2ServingTimer) {
                p2ServingTimer = setTimeout(() => {
                    isBallInPlay.value = true;
                    // AI 完美發球參數
                    ball.vy = -16; 
                    ball.vx = -6; 
                    playOriginalSound('pika');
                    p2ServingTimer = null;
                }, 800);
            }
        }
        animationFrameId = requestAnimationFrame(updatePhysics);
        return; 
    }

    // 🌟 3. AI 邏輯強化 (球在進行中才會作動，且必須在自由行動時間內)
    if (canMove) {
        let targetX = 636; // 預設防守位置
        
        // 預判落點
        if (ball.vx > 0 && ball.x > NET_X - 50) { 
            let timeToGround = (GROUND_Y - ball.y) / (ball.vy > 0 ? ball.vy : 5); 
            targetX = ball.x + (ball.vx * timeToGround * 0.9); // 0.9 倍預判修正
            if (targetX > GAME_WIDTH - 32) targetX = GAME_WIDTH - 32;
            if (targetX < NET_X + 32) targetX = NET_X + 32;
        } else if (ball.x > NET_X) {
            targetX = ball.x;
        }
        
        // AI 移動
        if (p2.x + 32 < targetX - 15) p2.vx = SPEED * 0.95; 
        else if (p2.x + 32 > targetX + 15) p2.vx = -SPEED * 0.95;
        else p2.vx = 0;

        // 🌟 強化 AI：殺球與防守跳躍
        if (ball.x > NET_X - 10) {
            let distToBall = Math.abs((p2.x+32) - (ball.x+20));
            
            // 如果球在網前高處，且 AI 離得夠近，AI 會跳起來殺球！
            if (ball.y < 150 && ball.vy > -5 && distToBall < 100 && !p2.isJumping) {
                p2.vy = JUMP_POWER; p2.isJumping = true;
            }
            // 一般防守跳躍
            else if (ball.y < 260 && ball.vy > 0 && distToBall < 60 && !p2.isJumping) {
                p2.vy = JUMP_POWER; p2.isJumping = true;
            }
            // 撲救
            else if (ball.y > 250 && distToBall > 80 && distToBall < 250 && !p2.isJumping) {
                p2.isDiving = true;
                p2.vx = (ball.x < p2.x) ? -SPEED : SPEED; 
            } else { 
                p2.isDiving = false; 
            }
        } else { 
            p2.isDiving = false; 
        }
    } else {
        // 如果沒有時間，AI 也要停格
        p2.vx = 0; 
        p2.isDiving = false;
    }

    p2.vy += GRAVITY;
    p2.x += p2.vx;
    p2.y += p2.vy;
    if (p2.y >= GROUND_Y - p2.height) { p2.y = GROUND_Y - p2.height; p2.vy = 0; p2.isJumping = false; }
    if (p2.x > GAME_WIDTH - p2.width) p2.x = GAME_WIDTH - p2.width;
    if (p2.x < NET_X) p2.x = NET_X;

    // 4. 球的物理邏輯
    ball.vy += BALL_GRAVITY; 
    if (ball.vx > BALL_MAX_SPEED) ball.vx = BALL_MAX_SPEED;
    if (ball.vx < -BALL_MAX_SPEED) ball.vx = -BALL_MAX_SPEED;
    if (ball.vy > BALL_MAX_SPEED) ball.vy = BALL_MAX_SPEED;
    if (ball.vy < -BALL_MAX_SPEED) ball.vy = -BALL_MAX_SPEED;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x <= 0) { ball.x = 0; ball.vx *= -0.8; }
    if (ball.x >= GAME_WIDTH - ball.size) { ball.x = GAME_WIDTH - ball.size; ball.vx *= -0.8; }
    if (ball.y <= 0) { ball.y = 0; ball.vy *= -0.8; } 

    let bxCenter = ball.x + ball.size / 2;
    if (bxCenter > NET_X - 15 && bxCenter < NET_X + 15 && ball.y + ball.size > NET_Y) {
        if (ball.vy > 0 && ball.y + ball.size < NET_Y + 15) {
            ball.vy *= -0.8; ball.y = NET_Y - ball.size;
        } else {
            ball.vx *= -0.8;
            ball.x = bxCenter < NET_X ? NET_X - 15 - ball.size : NET_X + 15;
        }
    }

    // 5. 擊球判定
    const checkHit = (player, side) => {
        let hitBox = { x: player.x, y: player.y, w: player.width, h: player.height };
        if (player.isDiving) {
            hitBox.y += 32; hitBox.h = 32; hitBox.w = 96;
            if (side === 'p2') hitBox.x -= 32;
        }

        if (ball.x + ball.size > hitBox.x && ball.x < hitBox.x + hitBox.w && 
            ball.y + ball.size > hitBox.y && ball.y < hitBox.y + hitBox.h) {
            
            let isSmash = false;
            if (side === 'p1' && activeInputs.smash) isSmash = true;
            // 🌟 強化 AI：如果在網前高處擊球，直接視為殺球
            if (side === 'p2' && player.isJumping && ball.y < hitBox.y + 20 && ball.x < NET_X + 100) isSmash = true; 

            let diffX = (ball.x + ball.size/2) - (hitBox.x + hitBox.w/2);

            if (isSmash) {
                ball.vy = 18; 
                ball.vx = (diffX / 2) * 1.5;
                playOriginalSound('chu');
                playOriginalSound('hit');
            } else {
                ball.vy = -18; 
                ball.vx = (diffX / 2);
                playOriginalSound('pika');
                playOriginalSound('hit');
            }

            if (ball.vy < 0) ball.y = hitBox.y - ball.size;
            else if (ball.vy > 0) ball.y = hitBox.y + hitBox.h;
        }
    };
    checkHit(p1, 'p1');
    checkHit(p2, 'p2');

    // 6. 落地得分
    if (ball.y >= GROUND_Y - ball.size) {
        ball.y = GROUND_Y - ball.size;
        ball.vy = 0; ball.vx = 0;
        handlePointScored(ball.x < NET_X ? 'p2' : 'p1');
    }

    animationFrameId = requestAnimationFrame(updatePhysics);
};

const getPikaStyle = (player, side) => {
    let w = 64, h = 64, x = player.x, y = player.y;
    if (player.isDiving) {
        w = 96; h = 32; y += 32;
        if (side === 'p2') x -= 32;
    }
    return {
        left: `${(x / GAME_WIDTH) * 100}%`,
        top: `${(y / GAME_HEIGHT) * 100}%`,
        width: `${(w / GAME_WIDTH) * 100}%`,
        height: `${(h / GAME_HEIGHT) * 100}%`
    };
};

const getBallStyle = () => {
    return {
        left: `${(ball.x / GAME_WIDTH) * 100}%`,
        top: `${(ball.y / GAME_HEIGHT) * 100}%`,
        width: `${(ball.size / GAME_WIDTH) * 100}%`,
        height: `${(ball.size / GAME_HEIGHT) * 100}%`
    };
};

// --- 🌟 虛擬搖桿 (Joystick) ---
const joystickOuter = ref(null);
const joystickInner = ref(null);
const joyState = reactive({ active: false, startX: 0, startY: 0, x: 0, y: 0, angle: 0 });

const handleJoyStart = (e) => {
    if (actionTimeRemaining.value <= 0) return; // 沒時間不能動搖桿
    joyState.active = true;
    let touch = e.touches ? e.touches[0] : e;
    joyState.startX = touch.clientX;
    joyState.startY = touch.clientY;
    joyState.x = 0; joyState.y = 0;
    updateJoyInputs();
};
const handleJoyMove = (e) => {
    if (!joyState.active || actionTimeRemaining.value <= 0) {
        joyState.active = false;
        return;
    }
    e.preventDefault(); 
    let touch = e.touches ? e.touches[0] : e;
    let dx = touch.clientX - joyState.startX;
    let dy = touch.clientY - joyState.startY;
    let dist = Math.hypot(dx, dy);
    let maxDist = 50; 
    
    if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
    }
    joyState.x = dx; joyState.y = dy;
    updateJoyInputs();
};
const handleJoyEnd = () => { resetJoystick(); };
const resetJoystick = () => {
    joyState.active = false;
    joyState.x = 0; joyState.y = 0;
    activeInputs.up = false; activeInputs.down = false; 
    activeInputs.left = false; activeInputs.right = false;
};

const updateJoyInputs = () => {
    if (!joyState.active) return;
    const threshold = 15; 
    activeInputs.left = joyState.x < -threshold;
    activeInputs.right = joyState.x > threshold;
    activeInputs.up = joyState.y < -threshold;
    activeInputs.down = joyState.y > threshold;
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    isDesktop.value = window.innerWidth > 768 && !('ontouchstart' in window);

    if (typeof window !== 'undefined') {
        Object.keys(audioUrls).forEach(key => {
            sounds[key] = new Audio(audioUrls[key]);
            sounds[key].volume = 0.5;
        });
    }

    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.pikavolley_time_limit) config.value.time_limit = settings.pikavolley_time_limit;
        if (settings.pikavolley_penalty) config.value.penalty = settings.pikavolley_penalty;
        if (settings.pikavolley_blank_count !== undefined) config.value.blankCount = settings.pikavolley_blank_count;
        if (settings.pikavolley_unlock_time !== undefined) config.value.unlock_time = settings.pikavolley_unlock_time; // 🌟 讀取時間設定
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 單元單字不足！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  } catch (e) { console.error(e); }
});

const handleKeyDown = (e) => {
    if (actionTimeRemaining.value <= 0) return; // 沒時間不能動鍵盤
    
    if (e.code === 'ArrowLeft') activeInputs.left = true;
    if (e.code === 'ArrowRight') activeInputs.right = true;
    if (e.code === 'ArrowUp') activeInputs.up = true;
    if (e.code === 'ArrowDown') activeInputs.down = true;
    
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
        if (e.code === 'Space') e.preventDefault(); 
        if (!isBallInPlay.value && serveTurn.value === 'p1') {
            handleServe();
        } else {
            activeInputs.smash = true;
        }
    }
};
const handleKeyUp = (e) => {
    if (e.code === 'ArrowLeft') activeInputs.left = false;
    if (e.code === 'ArrowRight') activeInputs.right = false;
    if (e.code === 'ArrowUp') activeInputs.up = false;
    if (e.code === 'ArrowDown') activeInputs.down = false;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') activeInputs.smash = false;
};

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    playOriginalSound('start');
    score.value = 0;
    matchScore.player = 0; matchScore.ai = 0;
    correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    gameStartTime.value = Date.now();
    gameStatus.value = 'playing'; 
    
    resetRally();
    updatePhysics(); 

    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('時間到');
    }, 1000);
};

const assignNewWord = () => {
    if (!allWords.value || allWords.value.length === 0) return;
    const randomWord = allWords.value[Math.floor(Math.random() * allWords.value.length)];
    const pureWord = randomWord.en_us.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    let numBlanks = Math.max(1, Math.min(config.value.blankCount || 3, pureWord.length));
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

    myTarget.value = { word: pureWord, zh: randomWord.zh_tw, typedCount: 0, slots, targetChars, options, isCompleted: false };
};

const handleOptionClick = (opt) => {
    if (opt.used || !myTarget.value || gameStatus.value !== 'playing') return;
    
    if (opt.char === myTarget.value.targetChars[myTarget.value.typedCount]) {
        sfx.type(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;
        
        // 🌟 核心：每打對一個字，直接獲得自由時間！
        addActionTime();

        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            sfx.correct();
            score.value += 10;
            if (!correctWordsList.value.includes(myTarget.value.word)) correctWordsList.value.push(myTarget.value.word);
            myTarget.value.isCompleted = true; 
            
            // 拼完後如果這局還在打，等 1.5 秒換下一個字
            setTimeout(() => {
                if (gameStatus.value === 'playing') assignNewWord();
            }, 1500);
        }
    } else { 
        sfx.wrong(); 
        score.value = Math.max(0, score.value - config.value.penalty);
        mistakesCount.value++;
        if (!wrongWordsList.value.includes(myTarget.value.word)) wrongWordsList.value.push(myTarget.value.word);
    }
};

const endGame = async (reason) => {
    gameStatus.value = 'end';
    clearInterval(timer);
    if (actionTimerInterval) clearInterval(actionTimerInterval);
    if (p2ServingTimer) clearTimeout(p2ServingTimer);
    cancelAnimationFrame(animationFrameId);
    resetJoystick();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reason} | 單字分: ${score.value} | 排球分: ${matchScore.player}-${matchScore.ai}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字皮卡丘排球', score: score.value, time_taken_seconds: timeSpent.value,
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
    if (actionTimerInterval) clearInterval(actionTimerInterval);
    if (p2ServingTimer) clearTimeout(p2ServingTimer);
    cancelAnimationFrame(animationFrameId); 
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
});
</script>

<template>
  <div class="pika-root">
    
    <div class="game-wrapper">
        
        <header v-if="gameStatus === 'setup' || gameStatus === 'end'" class="t-header retro-element">
            <h2 class="t-title">⚡ 皮卡排球</h2>
            <button class="retro-btn btn-small btn-danger" @click="quitGame">離開</button>
        </header>

        <div v-if="gameStatus === 'playing'" class="hud-layer">
            <div class="hud-box">🏆 {{ score }}</div>
            
            <div class="time-banner" :class="{'locked': actionTimeRemaining <= 0}">
                <template v-if="actionTimeRemaining > 0">
                    ⚡ 自由行動: <span style="font-size:1.5rem;">{{ actionTimeRemaining }}</span>s ⚡
                </template>
                <template v-else>
                    🔒 時間凍結！請繼續打字 🔒
                </template>
            </div>

            <div class="hud-box right">⏱️ {{ config.time_limit - timeSpent }}s</div>
            <button class="retro-btn btn-small btn-danger hud-quit" @click="quitGame">放棄</button>
        </div>

        <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

        <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
            <div class="rpg-dialog retro-element">
                <div class="icon-big">🏐</div>
                <h2 style="color:#ffeb3b; margin: 5px 0;">半回合制 皮卡排球</h2>
                <div class="rules-box">
                    <p>1️⃣ <b>時間即生命</b>：您必須拼寫單字，**每拼對一個字母，就能解鎖 {{ config.unlock_time }} 秒的自由行動時間！**</p>
                    <p>2️⃣ <b>時間凍結</b>：時間歸零時，雙方都會被定身鎖死！快打字賺取時間來防守！</p>
                    <p>3️⃣ <b>發球設定</b>：若輪到您發球，解鎖時間後按下綠色按鈕即可發球！</p>
                </div>
                <button class="retro-btn btn-primary" style="margin-top:15px; width:100%; padding:15px;" @click="startGame">進入球場</button>
            </div>
        </div>

        <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="game-container">
            
            <div class="court-zone">
                <div class="scoreboard">
                    <span class="p1-score">我方: {{ matchScore.player }}</span>
                    <span class="p2-score">電腦: {{ matchScore.ai }}</span>
                </div>
                <div class="game-board-wrapper">
                    <div class="game-board" :class="{'board-locked': actionTimeRemaining <= 0}">
                        <div class="ground-line"></div>
                        <div class="net"></div>
                        
                        <div class="pika p1-pika" :class="{'diving': p1.isDiving}" :style="getPikaStyle(p1, 'p1')">
                            <div class="cheek left"></div><div class="cheek right"></div>
                        </div>
                        <div class="pika p2-pika" :class="{'diving': p2.isDiving}" :style="getPikaStyle(p2, 'p2')">
                            <div class="cheek left"></div><div class="cheek right"></div>
                        </div>
                        <div class="pokeball" :style="getBallStyle()"></div>
                        
                        <div v-if="showRallyMessage" class="rally-msg">{{ showRallyMessage }}</div>
                    </div>
                </div>
            </div>

            <div class="type-section">
                <div class="action-panel retro-element" v-if="myTarget">
                    <template v-if="!myTarget.isCompleted">
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
                    </template>
                    <template v-else>
                        <div class="unlocked-msg">✅ 單字完成！準備下一題...</div>
                    </template>
                </div>
            </div>

            <div class="bottom-control-section">
                
                <div class="joystick-zone">
                    <div class="joystick-outer" ref="joystickOuter" :class="{'locked-control': actionTimeRemaining <= 0}"
                         @touchstart="handleJoyStart" @touchmove="handleJoyMove" @touchend="handleJoyEnd" @touchcancel="handleJoyEnd"
                         @mousedown="handleJoyStart" @mousemove="handleJoyMove" @mouseup="handleJoyEnd" @mouseleave="handleJoyEnd">
                        <div class="joystick-inner" ref="joystickInner" :style="{ transform: `translate(${joyState.x}px, ${joyState.y}px)` }"></div>
                    </div>
                </div>

                <div class="smash-zone">
                    
                    <template v-if="!isBallInPlay && serveTurn === 'p1'">
                        <button class="m-btn serve" 
                                :class="{'locked': actionTimeRemaining <= 0}" 
                                @click="handleServe">發球</button>
                    </template>

                    <template v-else>
                        <button class="m-btn smash" :class="{'locked': actionTimeRemaining <= 0}" 
                                @touchstart.prevent="activeInputs.smash=true" @touchend.prevent="activeInputs.smash=false" 
                                @mousedown.prevent="activeInputs.smash=true" @mouseup.prevent="activeInputs.smash=false">💥</button>
                    </template>
                </div>

            </div>

        </div>

        <div v-if="gameStatus === 'end'" class="end-overlay">
            <div class="rpg-dialog retro-element">
                <h1>比賽結束</h1>
                <p class="winner-text" style="color:#4caf50;">單字得分：{{ score }}</p>
                <p class="winner-text" style="color:#2196f3; font-size: 1.2rem;">排球比分：我方 {{ matchScore.player }} - {{ matchScore.ai }} 電腦</p>
                <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ errorMsg || '時間到' }}</p>
                <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
            </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
.pika-root { 
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
    background: #111; display: flex; flex-direction: column; overflow: hidden; 
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

.retro-element { background: rgba(0, 0, 0, 0.8); border: 2px solid #555; border-radius: 8px; padding: 5px; box-sizing: border-box; }
.retro-btn { background: #333; color: #fff; border: 2px solid #777; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.1s; font-family: inherit;}
.retro-btn:active:not(:disabled) { transform: translateY(3px); }
.btn-primary { background: #1976d2; border-color: #42a5f5; }
.btn-danger { background: #d32f2f; border-color: #e57373; }
.btn-small { padding: 4px 8px; font-size: 0.9rem;}

.t-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; border-radius: 0; border: none; border-bottom: 2px solid #555; margin-bottom: 5px;}
.t-title { margin: 0; font-size: 1.1rem; color: #fbc02d;}

/* 🌟 HUD 定位 與 時間倒數橫幅 */
.hud-layer { position: absolute; top: 0; left: 0; width: 100%; pointer-events: none; z-index: 100; display: flex; justify-content: space-between; align-items: center; padding: 5px; box-sizing: border-box;}
.hud-box { pointer-events: auto; font-size: 1rem; color: #ffeb3b; font-weight: 900; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 6px; border: 1px solid #555; }
.hud-box.right { color: #fff; }
.hud-quit { pointer-events: auto; margin: 0; position: absolute; right: 5px; top: 35px; } 

.time-banner { background: rgba(76, 175, 80, 0.8); color: #fff; font-weight: bold; padding: 5px 15px; border-radius: 20px; font-size: 1.1rem; border: 2px solid #388e3c; pointer-events: auto; transition: 0.3s;}
.time-banner.locked { background: rgba(244, 67, 54, 0.8); border-color: #b71c1c; animation: shake 0.5s infinite alternate;}

@keyframes shake { 0% { transform: scale(0.98); } 100% { transform: scale(1.02); box-shadow: 0 0 15px #f44336;} }

.setup-overlay, .end-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 450px; width: 90%; text-align: center; padding: 20px; line-height: 1.5;}
.icon-big { font-size: 3.5rem; margin-bottom: 5px; }
.rules-box { text-align: left; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; font-size: 0.9rem; }

.game-container { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 5px; padding: 5px; overflow: hidden;}

/* 🏐 球場區 */
.court-zone { flex: 0 0 auto; width: 100%; max-width: 800px; margin: 15px auto 5px auto; }
.scoreboard { display: flex; justify-content: space-between; background: #000; padding: 2px 20px; font-size: 1rem; font-weight: 900; color: #fff; border-bottom: 2px solid #333; border-radius: 5px 5px 0 0;}
.p1-score { color: #4caf50; } .p2-score { color: #f44336; }

.game-board-wrapper { width: 100%; position: relative; display: flex; aspect-ratio: 2 / 1; }
.game-board { flex: 1; position: relative; background: #64b5f6; overflow: hidden; border: 2px solid #fff; border-radius: 0 0 8px 8px; box-sizing: border-box; transition: filter 0.3s;}
.game-board.board-locked { filter: grayscale(80%) brightness(0.6); }

.ground-line { position: absolute; bottom: 0; left: 0; width: 100%; height: 10%; background: #d7ccc8; border-top: 3px solid #8d6e63; }
.net { position: absolute; bottom: 10%; left: 49.375%; width: 1.25%; height: 40%; background: repeating-linear-gradient(0deg, #fff, #fff 5px, #aaa 5px, #aaa 10px); border-radius: 5px 5px 0 0; }

.pika { position: absolute; background: #ffeb3b; border-radius: 40% 40% 10% 10%; border: 2px solid #f57f17; box-sizing: border-box; }
.pika::before { content: ''; position: absolute; top: -15px; left: 0; width: 25%; height: 30px; background: #ffeb3b; border: 2px solid #f57f17; border-radius: 50% 50% 0 0; transform: rotate(-30deg); box-shadow: inset 0 10px 0 #212121; }
.pika::after { content: ''; position: absolute; top: -15px; right: 0; width: 25%; height: 30px; background: #ffeb3b; border: 2px solid #f57f17; border-radius: 50% 50% 0 0; transform: rotate(30deg); box-shadow: inset 0 10px 0 #212121;}
.cheek { position: absolute; top: 40%; width: 20%; height: 20%; background: #f44336; border-radius: 50%; }
.cheek.left { left: 8%; } .cheek.right { right: 8%; }

.pokeball { position: absolute; border-radius: 50%; border: 2px solid #212121; background: linear-gradient(to bottom, #f44336 45%, #212121 45%, #212121 55%, #fff 55%); box-sizing: border-box; animation: spinBall 0.5s linear infinite; }
@keyframes spinBall { 100% { transform: rotate(360deg); } }

.rally-msg { position: absolute; top: 20%; left: 50%; transform: translate(-50%, -50%); font-size: 1.8rem; font-weight: 900; color: #fff; text-shadow: 2px 2px 0 #000, -2px -2px 0 #000; animation: popMsg 0.5s ease-out forwards; z-index: 50; text-align: center; width: 100%;}
@keyframes popMsg { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 80% { transform: translate(-50%, -50%) scale(1.2); } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }

/* 🔠 打字面板 */
.type-section { flex: 0 0 auto; width: 100%; display: flex; justify-content: center; padding: 0 5px 5px 5px; box-sizing: border-box;}
.action-panel { width: 100%; max-width: 800px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-color: #fbc02d; padding: 5px; min-height: 80px;}
.typing-target { font-size: 1rem; color: #ffeb3b; text-align: center; margin-bottom: 2px; }
.m-slots { display: flex; gap: 2px; flex-wrap: wrap; justify-content: center; margin-bottom: 5px;}
.m-slot { font-size: 1.2rem; font-weight: bold; border-bottom: 2px solid #777; min-width: 15px; text-align: center; padding: 0 2px;}
.m-slot.filled { color: #4caf50; border-color: #4caf50; }
.m-keyboard { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 450px;}
.m-key { width: 32px; height: 32px; font-size: 1.1rem; padding: 0; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 0 #555;}
.m-key:active:not(.used) { transform: translateY(2px); box-shadow: none; }
.m-key.used { opacity: 0.2; pointer-events: none;}
.unlocked-msg { text-align: center; color: #4caf50; font-size: 1.2rem; font-weight: bold; line-height: 1.3;}

/* 🌟 下方控制區 */
.bottom-control-section { flex: 1; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px 20px 20px; width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box; }

.joystick-zone { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.joystick-outer { width: 140px; height: 140px; background: rgba(255,255,255,0.15); border: 3px solid rgba(255,255,255,0.4); border-radius: 50%; position: relative; display: flex; justify-content: center; align-items: center; touch-action: none; transition: 0.3s;}
.joystick-outer.locked-control { opacity: 0.3; filter: grayscale(1); pointer-events: none;}
.joystick-inner { width: 60px; height: 60px; background: rgba(255,255,255,0.8); border-radius: 50%; position: absolute; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }

.smash-zone { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }

/* 🌟 發球與殺球按鈕 */
.m-btn.serve { width: 100px; height: 100px; border-radius: 50%; font-size: 1.8rem; background: rgba(76, 175, 80, 0.9); color: #fff; border: 4px solid #388e3c; box-shadow: 0 6px 0 #388e3c; touch-action: none; outline: none; -webkit-tap-highlight-color: transparent;}
.m-btn.serve:active:not(.locked) { background: #4caf50; transform: translateY(6px); box-shadow: none;}

.m-btn.smash { width: 100px; height: 100px; border-radius: 50%; font-size: 3rem; background: rgba(244, 67, 54, 0.9); color: #fff; border: 4px solid #b71c1c; box-shadow: 0 6px 0 #b71c1c; touch-action: none; outline: none; -webkit-tap-highlight-color: transparent;}
.m-btn.smash:active:not(.locked) { background: #f44336; transform: translateY(6px); box-shadow: none;}

.m-btn.locked { opacity: 0.3; filter: grayscale(100%); pointer-events: none; }

@media (min-width: 768px) {
    .joystick-zone { display: none !important; } 
    .smash-zone { display: none !important; } 
    .court-zone { margin-top: 5px; }
    .m-key { width: 45px; height: 45px; font-size: 1.5rem; }
    .m-slot { font-size: 2rem; min-width: 30px; }
}
</style>