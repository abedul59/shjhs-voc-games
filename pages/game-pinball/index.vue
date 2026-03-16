<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

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

const isLoading = ref(true);
const matchStatus = ref('idle'); 

const score = ref(0);
const mistakesCount = ref(0);
const currentRound = ref(1);
const totalRounds = 10;
let gameStartTime = 0;

const blankCount = ref(2);
const penaltyPoints = ref(2);

const words = ref([]);
const currentWordObj = ref(null);
const wordSlots = ref([]);
const missingLetters = ref([]); 

// 🎰 物理引擎變數
const canvasRef = ref(null);
let ctx = null;
let animationFrameId = null;

const CANVAS_W = 600;
const CANVAS_H = 900;
const WALL_X = 500; 

const ball = ref({ x: 550, y: 850, vx: 0, vy: 0, r: 22, letter: '', state: 'waiting_selection', targetId: null });

// 🌟 底部可移動球道 (接球籃) 設定
const catcherWidth = ref(360); // 籃子總寬度
const catcherOffsetX = ref(70); // 籃子起始 X 偏移 (預設置中：(500-360)/2 = 70)

const pegs = ref([
  {x: 250, y: 350, r: 25, flash: 0},
  {x: 100, y: 480, r: 20, flash: 0}, {x: 400, y: 480, r: 20, flash: 0},
  {x: 250, y: 650, r: 30, flash: 0},
  {x: 150, y: 750, r: 15, flash: 0}, {x: 350, y: 750, r: 15, flash: 0}
]);

const gears = ref([
  { x: 250, y: 500, r: 45, angle: 0, speed: 0.04, direction: 1 },  
  { x: 120, y: 620, r: 35, angle: 0, speed: 0.05, direction: -1 }, 
  { x: 380, y: 620, r: 35, angle: 0, speed: 0.05, direction: -1 }  
]);

const bars = ref([
  { cx: 120, cy: 350, length: 90, thickness: 10, angle: 0, baseAngle: 0, swingRange: Math.PI / 3, speed: 0.05, phase: 0 }, 
  { cx: 380, cy: 350, length: 90, thickness: 10, angle: 0, baseAngle: Math.PI, swingRange: -Math.PI / 3, speed: 0.05, phase: 0 } 
]);

const isPulling = ref(false);
const pullDistance = ref(0);
const MAX_PULL = 200; 
let startTouchY = 0;

// 🔊 音效與發音
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playTone = (freq, type, duration, vol = 0.1) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
};

const sfx = {
  bumper: () => { playTone(600, 'square', 0.1, 0.08); setTimeout(() => playTone(1200, 'triangle', 0.1, 0.08), 50); },
  gear: () => playTone(300, 'sawtooth', 0.1, 0.05),
  barHit: () => playTone(400, 'square', 0.15, 0.1),
  launch: () => playTone(150, 'sawtooth', 0.2, 0.1),
  correct: () => { playTone(880, 'sine', 0.1); setTimeout(() => playTone(1100, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2), // 掉進深淵或接錯的音效
  wordComplete: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3), i * 150)); }
};

const speakWord = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
  }
};

onMounted(async () => {
  try {
    const { data: settings } = await supabase.from('system_settings').select('pinball_blank_count, pinball_penalty_points').eq('id', 1).single();
    if (settings) {
      if (settings.pinball_blank_count !== null) blankCount.value = Number(settings.pinball_blank_count);
      if (settings.pinball_penalty_points !== null) penaltyPoints.value = Number(settings.pinball_penalty_points);
    }
    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length > 0) words.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length >= 3 && v.en_us.replace(/[^a-zA-Z]/g, '').length <= 10);
    }
    if (words.value.length === 0) words.value = [{ en_us: 'apple', zh_tw: '蘋果' }, { en_us: 'banana', zh_tw: '香蕉' }];
  } catch (e) { console.error(e); }
  isLoading.value = false;
});

const startGame = () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  score.value = 0; mistakesCount.value = 0; currentRound.value = 1;
  gameStartTime = Date.now(); matchStatus.value = 'playing';
  
  nextTick(() => {
      ctx = canvasRef.value.getContext('2d');
      startRound();
      updatePhysics();
  });
};

const startRound = () => {
  if (currentRound.value > totalRounds) {
    triggerGameOver(); return;
  }
  
  const wordObj = words.value[Math.floor(Math.random() * words.value.length)];
  currentWordObj.value = wordObj;
  const pureText = wordObj.en_us.replace(/[^a-zA-Z]/g, '').toUpperCase();
  
  let numBlanks = Math.min(blankCount.value, pureText.length - 1);
  numBlanks = Math.max(1, numBlanks);

  let indices = [];
  while(indices.length < numBlanks) {
    let r = Math.floor(Math.random() * pureText.length);
    if(!indices.includes(r)) indices.push(r);
  }

  missingLetters.value = [];
  wordSlots.value = pureText.split('').map((char, i) => {
    const isBlank = indices.includes(i);
    const slotId = `slot_${i}_${Date.now()}`;
    if (isBlank) missingLetters.value.push({ char, index: i, id: slotId, isFake: false });
    return { char, isBlank, filled: !isBlank, index: i, id: slotId };
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let i=0; i<3; i++) {
      let fakeChar = alphabet[Math.floor(Math.random() * 26)];
      missingLetters.value.push({ char: fakeChar, index: -1, id: `fake_${i}_${Date.now()}`, isFake: true });
  }

  missingLetters.value.sort(() => Math.random() - 0.5);
  catcherOffsetX.value = (WALL_X - catcherWidth.value) / 2; // 重置籃子到中間
  resetBall();

  if (currentWordObj.value && currentWordObj.value.en_us) {
      speakWord(currentWordObj.value.en_us);
  }
};

const resetBall = () => {
  ball.value.state = 'waiting_selection';
  ball.value.letter = '';
  ball.value.targetId = null;
};

const selectBall = (m) => {
    if (ball.value.state !== 'waiting_selection') return;
    ball.value = {
        x: 550, y: 850, vx: 0, vy: 0, r: 22, 
        letter: m.char, state: 'idle', targetId: m.id
    };
};

const updatePhysics = () => {
  if (matchStatus.value !== 'playing') return;

  gears.value.forEach(g => g.angle += g.speed * g.direction);
  bars.value.forEach(b => {
      b.phase += b.speed;
      b.angle = b.baseAngle + Math.sin(b.phase) * b.swingRange;
  });

  if (ball.value.state === 'moving') {
    ball.value.vy += 0.4; 
    
    if(ball.value.vy > 25) ball.value.vy = 25;
    if(ball.value.vy < -35) ball.value.vy = -35; 
    if(ball.value.vx > 25) ball.value.vx = 25;
    if(ball.value.vx < -25) ball.value.vx = -25;

    if (ball.value.y < 250 && ball.value.vy < 0) {
        let force = (250 - ball.value.y) * 0.05;
        ball.value.vx -= force; 
    }

    ball.value.x += ball.value.vx;
    ball.value.y += ball.value.vy;

    if (ball.value.x - ball.value.r < 0) { ball.value.x = ball.value.r; ball.value.vx *= -0.7; }
    if (ball.value.y - ball.value.r < 0) { ball.value.y = ball.value.r; ball.value.vy *= -0.7; }
    if (ball.value.x + ball.value.r > CANVAS_W) { ball.value.x = CANVAS_W - ball.value.r; ball.value.vx *= -0.7; }

    if (ball.value.y > 250) {
      if (ball.value.x > WALL_X && ball.value.x - ball.value.r < WALL_X) {
          ball.value.x = WALL_X + ball.value.r; ball.value.vx *= -0.6; 
      } else if (ball.value.x < WALL_X && ball.value.x + ball.value.r > WALL_X) {
          ball.value.x = WALL_X - ball.value.r; ball.value.vx *= -0.6; 
      }
    }

    pegs.value.forEach(peg => {
        let dx = ball.value.x - peg.x;
        let dy = ball.value.y - peg.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < ball.value.r + peg.r) {
            let overlap = ball.value.r + peg.r - dist;
            let nx = dx / dist; let ny = dy / dist;
            ball.value.x += nx * overlap; ball.value.y += ny * overlap;
            let p = 2 * (ball.value.vx * nx + ball.value.vy * ny);
            ball.value.vx = ball.value.vx - p * nx * 0.8 + nx * 6;
            ball.value.vy = ball.value.vy - p * ny * 0.8 + ny * 6;
            peg.flash = 1.0;
            sfx.bumper();
        }
    });

    gears.value.forEach(gear => {
        let dx = ball.value.x - gear.x;
        let dy = ball.value.y - gear.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < ball.value.r + gear.r) {
            let overlap = ball.value.r + gear.r - dist;
            let nx = dx / dist; let ny = dy / dist;
            ball.value.x += nx * overlap; ball.value.y += ny * overlap;
            
            let tx = -ny; let ty = nx;
            let tangentialForce = gear.speed * gear.direction * 120; 

            let p = 2 * (ball.value.vx * nx + ball.value.vy * ny);
            ball.value.vx = ball.value.vx - p * nx * 0.7 + tx * tangentialForce;
            ball.value.vy = ball.value.vy - p * ny * 0.7 + ty * tangentialForce;
            sfx.gear();
        }
    });

    bars.value.forEach(bar => {
        let ex = bar.cx + Math.cos(bar.angle) * bar.length;
        let ey = bar.cy + Math.sin(bar.angle) * bar.length;

        let px = ball.value.x; let py = ball.value.y;
        let l2 = (ex - bar.cx)**2 + (ey - bar.cy)**2;
        let t = Math.max(0, Math.min(1, ((px - bar.cx) * (ex - bar.cx) + (py - bar.cy) * (ey - bar.cy)) / l2));
        let projX = bar.cx + t * (ex - bar.cx);
        let projY = bar.cy + t * (ey - bar.cy);

        let dx = px - projX; let dy = py - projY;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < ball.value.r + bar.thickness) {
            let overlap = ball.value.r + bar.thickness - dist;
            let nx = dist === 0 ? 1 : dx / dist;
            let ny = dist === 0 ? 0 : dy / dist;
            ball.value.x += nx * overlap;
            ball.value.y += ny * overlap;

            let angularVel = bar.speed * Math.cos(bar.phase) * bar.swingRange;
            let rToColl = Math.sqrt((projX - bar.cx)**2 + (projY - bar.cy)**2);
            let linVel = angularVel * rToColl; 
            
            let tx = -Math.sin(bar.angle);
            let ty = Math.cos(bar.angle);

            let p = 2 * ((ball.value.vx - tx*linVel) * nx + (ball.value.vy - ty*linVel) * ny);
            ball.value.vx = ball.value.vx - p * nx * 0.6 + (tx * linVel * 0.4);
            ball.value.vy = ball.value.vy - p * ny * 0.6 + (ty * linVel * 0.4);
            sfx.barHit();
        }
    });

    // 掉落判定 (包含右側發射道與左側深淵判斷)
    if (ball.value.y > CANVAS_H + ball.value.r) {
        if (ball.value.x > WALL_X) {
            resetBall(); 
        } else {
            handleLaneDrop(ball.value.x);
        }
    }
  }

  drawCanvas();
  animationFrameId = requestAnimationFrame(updatePhysics);
};

// 🌟 全新精準接球判定邏輯
const handleLaneDrop = (dropX) => {
    ball.value.state = 'evaluating';

    const targetObj = missingLetters.value.find(m => m.id === ball.value.targetId);
    const isFake = targetObj ? targetObj.isFake : false;

    // 判斷是否成功落入籃子範圍內
    if (dropX >= catcherOffsetX.value && dropX <= catcherOffsetX.value + catcherWidth.value) {
        
        const numLanes = wordSlots.value.length;
        const laneWidth = catcherWidth.value / numLanes;
        // 計算掉進哪一個字母洞
        let laneIndex = Math.floor((dropX - catcherOffsetX.value) / laneWidth);
        laneIndex = Math.min(numLanes - 1, Math.max(0, laneIndex)); // 防呆範圍
        const slot = wordSlots.value[laneIndex];

        if (slot && slot.isBlank && !slot.filled && slot.char === ball.value.letter && !isFake) {
            // ✅ 真彈珠掉入正確洞
            sfx.correct();
            slot.filled = true;
            missingLetters.value = missingLetters.value.filter(m => m.id !== ball.value.targetId);
            
            if (missingLetters.value.filter(m => !m.isFake).length === 0) {
                sfx.wordComplete();
                if (currentWordObj.value && currentWordObj.value.en_us) speakWord(currentWordObj.value.en_us);
                score.value += 10; 
                currentRound.value++;
                setTimeout(startRound, 1500);
            } else {
                setTimeout(resetBall, 500);
            }
        } else {
            // ❌ 接到了，但進錯洞或是假彈珠
            sfx.wrong();
            mistakesCount.value++;
            score.value = Math.max(0, score.value - penaltyPoints.value);
            
            if (isFake) {
                missingLetters.value = missingLetters.value.filter(m => m.id !== ball.value.targetId);
                if (missingLetters.value.filter(m => !m.isFake).length === 0) {
                    sfx.wordComplete();
                    if (currentWordObj.value && currentWordObj.value.en_us) speakWord(currentWordObj.value.en_us);
                    score.value += 10; 
                    currentRound.value++;
                    setTimeout(startRound, 1500);
                    return;
                }
            }
            setTimeout(resetBall, 500);
        }
    } else {
        // ❌ 完蛋！完全沒接住，掉進深淵
        sfx.wrong();
        mistakesCount.value++;
        score.value = Math.max(0, score.value - penaltyPoints.value);
        
        if (isFake) {
            missingLetters.value = missingLetters.value.filter(m => m.id !== ball.value.targetId);
            if (missingLetters.value.filter(m => !m.isFake).length === 0) {
                sfx.wordComplete();
                if (currentWordObj.value && currentWordObj.value.en_us) speakWord(currentWordObj.value.en_us);
                score.value += 10; 
                currentRound.value++;
                setTimeout(startRound, 1500);
                return;
            }
        }
        setTimeout(resetBall, 500);
    }
};

const drawCanvas = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 1. 牆壁繪製
  ctx.beginPath();
  ctx.moveTo(WALL_X, 250);
  ctx.lineTo(WALL_X, CANVAS_H);
  ctx.lineWidth = 6; ctx.strokeStyle = '#ff9800'; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(WALL_X, 250);
  ctx.quadraticCurveTo(250, -50, 0, 250); 
  ctx.lineWidth = 6; ctx.strokeStyle = '#ff9800'; ctx.stroke();

  // 🌟 2. 底部深淵岩漿特效 (提示沒接住會扣分)
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_H - 5);
  ctx.lineTo(WALL_X, CANVAS_H - 5);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#d32f2f'; 
  ctx.stroke();

  // 3. 齒輪
  gears.value.forEach(gear => {
      ctx.save();
      ctx.translate(gear.x, gear.y);
      ctx.rotate(gear.angle);
      ctx.beginPath();
      let teeth = 8;
      let innerR = gear.r * 0.7;
      for (let i = 0; i < teeth * 2; i++) {
          let a = (i * Math.PI) / teeth;
          let r = i % 2 === 0 ? gear.r : innerR;
          if (i === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
          else ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath();
      ctx.fillStyle = '#607d8b'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#b0bec5'; ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, gear.r * 0.25, 0, Math.PI*2);
      ctx.fillStyle = '#263238'; ctx.fill();
      ctx.restore();
  });

  // 4. 擋桿
  bars.value.forEach(bar => {
      let ex = bar.cx + Math.cos(bar.angle) * bar.length;
      let ey = bar.cy + Math.sin(bar.angle) * bar.length;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bar.cx, bar.cy);
      ctx.lineTo(ex, ey);
      ctx.lineWidth = bar.thickness * 2;
      ctx.strokeStyle = '#fbc02d'; 
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bar.cx, bar.cy, bar.thickness, 0, Math.PI*2);
      ctx.fillStyle = '#e65100'; ctx.fill();
  });

  // 5. 障礙柱
  pegs.value.forEach(peg => {
    if (peg.flash > 0) peg.flash -= 0.04; 
    if (peg.flash < 0) peg.flash = 0;

    let currentR = peg.r + (peg.flash * 8); 
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, currentR, 0, Math.PI * 2);
    
    let r = Math.floor(0 + peg.flash * 255);
    let g = Math.floor(229 + peg.flash * 26);
    let b = 255;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`; ctx.fill();
    ctx.lineWidth = 3 + (peg.flash * 3); ctx.strokeStyle = '#fff'; ctx.stroke();
    
    ctx.shadowBlur = 15 + (peg.flash * 40); 
    ctx.shadowColor = `rgb(${r}, ${g}, ${b})`; ctx.fill(); ctx.shadowBlur = 0;
  });

  // 6. 發射預備框
  if (ball.value.state === 'waiting_selection') {
      ctx.beginPath();
      ctx.arc(550, 850, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
  }

  // 7. 彈珠本體
  if (ball.value.state !== 'evaluating' && ball.value.state !== 'waiting_selection') {
    const renderY = ball.value.state === 'idle' ? ball.value.y + pullDistance.value : ball.value.y;
    ctx.beginPath();
    ctx.arc(ball.value.x, renderY, ball.value.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff1744'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ball.value.letter, ball.value.x, renderY + 2);
  }
};

const handlePullStart = (e) => {
  if (ball.value.state !== 'idle') return;
  e.preventDefault();
  isPulling.value = true;
  startTouchY = e.touches ? e.touches[0].clientY : e.clientY;
};

const handlePullMove = (e) => {
  if (!isPulling.value) return;
  e.preventDefault();
  const currentY = e.touches ? e.touches[0].clientY : e.clientY;
  pullDistance.value = Math.max(0, Math.min(MAX_PULL, (currentY - startTouchY) * 1.5)); 
};

const handlePullEnd = () => {
  if (!isPulling.value) return;
  isPulling.value = false;
  if (pullDistance.value > 20) {
    sfx.launch();
    ball.value.state = 'moving';
    ball.value.vy = -(pullDistance.value * 0.32); 
  }
  pullDistance.value = 0;
};

const triggerGameOver = async () => {
  matchStatus.value = 'gameover';
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);

  if (studentCookie.value && !studentCookie.value.isAnon) {
    await supabase.from('game_records').insert([{
      student_id: studentCookie.value.id,
      game_type: '單字彈珠台',
      score: score.value,
      mistakes: mistakesCount.value,
      time_taken_seconds: timeSpent,
      version: route.query.version,
      volume: route.query.volume,
      unit_played: route.query.unit,
      correct_words: `完成單字數: ${totalRounds}`
    }]);
  }
};

const quitGame = () => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  navigateTo('/');
};

onUnmounted(() => { 
  if (animationFrameId) cancelAnimationFrame(animationFrameId); 
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});
</script>

<template>
  <div class="pinball-root">
    
    <header class="p-header retro-element">
      <h2 class="p-title">🎰 單字彈珠台</h2>
      <div class="p-scores">
         <span style="color:#ffeb3b">進度: {{ currentRound>10 ? 10 : currentRound }}/{{ totalRounds }}</span> | 
         <span style="color:#4caf50">得分: {{ score }}</span>
      </div>
      <button class="p-btn-exit" @pointerdown.prevent="quitGame">離開</button>
    </header>

    <div v-if="matchStatus !== 'playing'" class="p-overlay">
      <div class="p-dialog retro-element">
        <div class="icon-big">{{ matchStatus === 'gameover' ? '🏆' : '🎰' }}</div>
        <h2>{{ matchStatus === 'gameover' ? '遊戲結束！' : 'Retro Word Pinball' }}</h2>
        <template v-if="matchStatus === 'gameover'">
          <p style="color:#4caf50; font-size:1.5rem; font-weight:bold;">總得分： {{ score }} 分</p>
          <p style="color:#f44336; font-weight:bold;">(失誤扣分： {{ mistakesCount }} 次)</p>
        </template>
        <template v-else>
          <p style="color:#555; line-height: 1.6;">
            1️⃣ 從托盤選擇正確字母<br>
            2️⃣ 發射將字母彈出<br>
            3️⃣ <strong>利用底部滑桿移動接球籃，接住彈珠！</strong>
          </p>
        </template>
        <button class="p-btn-play" @pointerdown.prevent="startGame">{{ matchStatus === 'gameover' ? '再玩一次' : '投幣開始' }}</button>
      </div>
    </div>

    <div v-else class="p-machine">
      
      <div class="p-scoreboard retro-element">
        <div class="meaning-group">
            <div class="zh-meaning">{{ currentWordObj?.zh_tw }}</div>
            <button class="speak-btn" @pointerdown.prevent="speakWord(currentWordObj?.en_us)" title="聽發音">🔊</button>
        </div>
        <div class="en-length">需填入 {{ missingLetters.filter(m => !m.isFake).length }} 個正確字母</div>
      </div>

      <div class="p-board-container">
        <div class="p-playfield">
          
          <canvas ref="canvasRef" :width="CANVAS_W" :height="CANVAS_H" class="physics-canvas"></canvas>

          <div class="lanes-overlay" :style="{ left: `${(catcherOffsetX / CANVAS_W) * 100}%`, width: `${(catcherWidth / CANVAS_W) * 100}%` }">
            <div v-for="(slot, i) in wordSlots" :key="i" class="lane" :class="{'is-blank': slot.isBlank, 'filled': slot.filled}">
              <div class="lane-divider"></div>
              <div class="lane-letter">{{ slot.filled ? slot.char : '_' }}</div>
            </div>
          </div>

          <div class="plunger-visual" :style="{ transform: `translateY(${pullDistance}px)` }">
            <div class="plunger-head"></div>
            <div class="plunger-rod"></div>
          </div>

          <div class="plunger-touch-area" 
               @mousedown="handlePullStart" @mousemove="handlePullMove" @mouseup="handlePullEnd" @mouseleave="handlePullEnd"
               @touchstart.prevent="handlePullStart" @touchmove.prevent="handlePullMove" @touchend.prevent="handlePullEnd" @touchcancel.prevent="handlePullEnd">
          </div>
        </div>
      </div>

      <div class="catcher-controls retro-element">
         <span class="icon">👈</span>
         <input type="range" min="0" :max="WALL_X - catcherWidth" v-model.number="catcherOffsetX" class="c-slider" />
         <span class="icon">👉</span>
      </div>

      <div class="p-controls">
         <div class="control-panel retro-element">
             <div class="ball-tray" v-if="missingLetters.length > 0">
               <div class="tray-title">🎯 選擇發射彈珠：</div>
               <div class="tray-balls">
                 <button
                   v-for="m in missingLetters"
                   :key="m.id"
                   class="tray-ball"
                   :class="{ 'in-play': ball.state !== 'waiting_selection' && ball.targetId === m.id }"
                   @pointerdown.prevent="selectBall(m)"
                   :disabled="ball.state !== 'waiting_selection'"
                 >
                   {{ m.char }}
                 </button>
               </div>
             </div>
         </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.pinball-root {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: #1a1a2e; display: flex; flex-direction: column; overflow: hidden;
  touch-action: none; -webkit-user-select: none; user-select: none;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.p-header {
  flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center;
  background: #311b92; color: white; padding: 8px 15px; border-bottom: 3px solid #64b5f6;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 10;
}
.p-title { margin: 0; font-size: 1.2rem; font-weight: 900; font-style: italic; letter-spacing: 1px;}
.p-scores { font-weight: bold; font-size: 1.1rem; display: flex; gap: 10px;}
.p-btn-exit { background: #e57373; color: white; border: 2px solid #b71c1c; border-radius: 5px; padding: 4px 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 0 #b71c1c;}
.p-btn-exit:active { transform: translateY(2px); box-shadow: none;}

.p-overlay { flex: 1; display: flex; justify-content: center; align-items: center; padding: 20px; }
.p-dialog { background: #fff; padding: 30px 20px; border-radius: 15px; text-align: center; border: 5px solid #311b92; box-shadow: 0 10px 0 #311b92; max-width: 400px; width: 100%;}
.icon-big { font-size: 5rem; margin-bottom: 10px; }
.p-btn-play { margin-top: 20px; background: #ff9800; color: white; border: 3px solid #e65100; padding: 12px 30px; font-size: 1.4rem; font-weight: bold; border-radius: 10px; box-shadow: 0 6px 0 #e65100; cursor: pointer; }
.p-btn-play:active { transform: translateY(6px); box-shadow: none; }

.p-machine {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 10px; gap: 10px; min-height: 0;
}

.p-scoreboard {
  width: 100%; max-width: 500px; background: #000; border: 4px solid #ff9800; border-radius: 10px;
  text-align: center; padding: 10px; box-shadow: inset 0 0 15px rgba(255,152,0,0.5);
  display: flex; flex-direction: column; align-items: center;
}
.meaning-group { display: flex; align-items: center; justify-content: center; gap: 10px;}
.zh-meaning { color: #00e5ff; font-size: 1.5rem; font-weight: 900; text-shadow: 0 0 8px #00e5ff; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
.speak-btn { background: transparent; border: none; font-size: 1.8rem; cursor: pointer; padding: 0; filter: drop-shadow(0 0 5px #00e5ff); transition: 0.1s; margin-bottom: 5px;}
.speak-btn:active { transform: scale(0.9); }
.en-length { color: #ffeb3b; font-size: 0.9rem; font-weight: bold; font-family: monospace;}

.p-board-container {
  flex: 1; width: 100%; max-width: 500px; min-height: 0;
  display: flex; justify-content: center; align-items: stretch;
}
.p-playfield {
  height: 100%; aspect-ratio: 6 / 9; 
  background: linear-gradient(135deg, #1e1e1e 0%, #2c3e50 100%);
  border: 8px solid #5d4037; border-radius: 20px; 
  position: relative; overflow: hidden;
  box-shadow: inset 0 0 30px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.5);
}

.physics-canvas { width: 100%; height: 100%; display: block; position: absolute; top: 0; left: 0; z-index: 1; }

/* 🌟 進化版：動態籃子 */
.lanes-overlay {
  position: absolute; bottom: 0; height: 12%; display: flex; z-index: 2;
  background: rgba(21, 101, 192, 0.95); /* 更扎實的藍色籃子感 */
  border: 4px solid #64b5f6; border-bottom: none;
  border-radius: 10px 10px 0 0;
  box-shadow: 0 -5px 15px rgba(0,0,0,0.5), inset 0 5px 10px rgba(255,255,255,0.2);
  box-sizing: border-box;
}
.lane {
  flex: 1; position: relative; display: flex; justify-content: center; align-items: center;
  border-right: 2px dashed rgba(255,255,255,0.3);
}
.lane:last-child { border-right: none; }
.lane-letter { font-size: 1.5rem; font-weight: 900; font-family: monospace; color: #fff; text-shadow: 0 0 5px #fff; }
.lane.is-blank .lane-letter { color: #f44336; text-shadow: none; }
.lane.is-blank.filled .lane-letter { color: #4caf50; text-shadow: 0 0 10px #4caf50; }

.plunger-visual {
  position: absolute; bottom: 10%; right: 4%; width: 8.6%; height: 15%;
  display: flex; flex-direction: column; align-items: center; z-index: 0;
}
.plunger-head { width: 100%; height: 30%; background: #ff1744; border-radius: 5px 5px 0 0; border: 2px solid #b71c1c; }
.plunger-rod { width: 30%; height: 100%; background: #9e9e9e; background-image: repeating-linear-gradient(0deg, transparent, transparent 5px, #757575 5px, #757575 10px); }
.plunger-touch-area { position: absolute; bottom: 0; right: 0; width: 25%; height: 45%; z-index: 10; cursor: grab;}
.plunger-touch-area:active { cursor: grabbing; }

/* 🌟 接球籃控制滑桿 */
.catcher-controls {
  width: 100%; max-width: 500px;
  background: #1a1a2e; border: 3px solid #64b5f6; border-radius: 10px;
  padding: 8px 15px; display: flex; align-items: center; gap: 10px;
  box-shadow: inset 0 0 10px rgba(100,181,246,0.3);
  margin-top: 5px;
}
.c-slider {
  flex: 1; -webkit-appearance: none; height: 12px; background: #333;
  border-radius: 6px; outline: none; border: 1px solid #555;
}
.c-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 30px; height: 30px; border-radius: 50%;
  background: #ffeb3b; cursor: pointer; border: 3px solid #f57f17;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
}
.icon { font-size: 1.5rem; }

.p-controls { width: 100%; max-width: 500px; display: flex; justify-content: center;}
.control-panel {
  width: 100%; background: rgba(0,0,0,0.4); border: 2px solid #555; border-radius: 10px;
  padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px;
}
.ball-tray { flex: 1; text-align: left; }
.tray-title { color: #ffeb3b; font-size: 0.9rem; margin-bottom: 5px; font-weight: bold;}
.tray-balls { display: flex; gap: 8px; flex-wrap: wrap; }
.tray-ball {
  width: 40px; height: 40px; border-radius: 50%;
  background: #ff1744; color: #fff; font-size: 1.4rem; font-weight: 900; font-family: monospace;
  border: 2px solid #fff; box-shadow: 0 4px 0 #b71c1c; cursor: pointer; transition: 0.1s;
  display: flex; justify-content: center; align-items: center; padding: 0;
}
.tray-ball:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.tray-ball.in-play { opacity: 0.3; pointer-events: none; filter: grayscale(100%); box-shadow: none; transform: translateY(4px); }
.tray-ball:disabled { opacity: 0.3; cursor: not-allowed; }

@media (min-width: 768px) {
  .p-machine { gap: 15px; }
  .p-scoreboard { padding: 20px; }
  .zh-meaning { font-size: 2.5rem; }
  .speak-btn { font-size: 2.2rem; }
  .en-length { font-size: 1.2rem; }
  .lane-letter { font-size: 2.5rem; }
  .tray-ball { width: 50px; height: 50px; font-size: 1.8rem; }
  .c-slider::-webkit-slider-thumb { width: 40px; height: 40px; }
}
</style>