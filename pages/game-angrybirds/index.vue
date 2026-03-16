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

// 後台設定
const blankCount = ref(3);
const penaltyPoints = ref(2);

// 單字資料
const words = ref([]);
const currentWordObj = ref(null);
const wordSlots = ref([]);
const missingLetters = ref([]); 

// 🐦 物理引擎與畫布
const canvasRef = ref(null);
let ctx = null;
let animationFrameId = null;

const CANVAS_W = 800; 
const CANVAS_H = 500;
const GROUND_Y = 450;
const SLING_X = 150;
const SLING_Y = 320;

// 🌟 彈弓與鳥的狀態 (鳥的半徑 r 放大到 32)
const bird = ref({ x: SLING_X, y: SLING_Y, vx: 0, vy: 0, r: 32, state: 'idle' });
const pigs = ref([]); 
const trail = ref([]); 

const isDragging = ref(false);
const MAX_DRAG = 120; // 稍微增加拉距上限配合大鳥

// 🔊 語音發音 API
const speakWord = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
  }
};

// 🔊 遊戲音效
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playTone = (freq, type, duration, vol = 0.1, slideFreq = null) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    }
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
};

const sfx = {
  stretch: () => playTone(100, 'sawtooth', 0.1, 0.05),
  launch: () => playTone(300, 'sine', 0.4, 0.1, 800), 
  hit: () => playTone(150, 'square', 0.2, 0.2, 50),   
  correct: () => { playTone(880, 'sine', 0.1); setTimeout(() => playTone(1100, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2),
  wordComplete: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3), i * 150)); }
};

onMounted(async () => {
  try {
    const { data: settings } = await supabase.from('system_settings').select('angrybirds_blank_count, angrybirds_penalty_points').eq('id', 1).single();
    if (settings) {
      if (settings.angrybirds_blank_count !== null) blankCount.value = Number(settings.angrybirds_blank_count);
      if (settings.angrybirds_penalty_points !== null) penaltyPoints.value = Number(settings.angrybirds_penalty_points);
    }
    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length > 0) words.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length >= 3);
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
  if (currentRound.value > totalRounds) { triggerGameOver(); return; }
  
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
      missingLetters.value.push({ char: alphabet[Math.floor(Math.random() * 26)], index: -1, id: `fake_${i}_${Date.now()}`, isFake: true });
  }

  spawnPigs();
  resetBird();

  if (currentWordObj.value && currentWordObj.value.en_us) {
      speakWord(currentWordObj.value.en_us);
  }
};

const spawnPigs = () => {
  pigs.value = [];
  // 🌟 重新配置更開闊的座標點，以容納放大的小豬
  let availableSpots = [
      {x: 450, y: 150}, {x: 600, y: 120}, {x: 750, y: 180},
      {x: 500, y: 280}, {x: 650, y: 260},
      {x: 420, y: 400}, {x: 580, y: 380}, {x: 720, y: 360}
  ].sort(() => Math.random() - 0.5); 

  missingLetters.value.forEach((m, i) => {
      let spot = availableSpots[i % availableSpots.length];
      pigs.value.push({
          id: m.id, char: m.char, isFake: m.isFake,
          x: spot.x, y: spot.y, r: 42, // 🌟 小豬半徑大幅提升至 42
          baseY: spot.y, phase: Math.random() * Math.PI * 2 
      });
  });
};

const resetBird = () => {
  bird.value = { x: SLING_X, y: SLING_Y, vx: 0, vy: 0, r: 32, state: 'idle' }; // 🌟 重置鳥的半徑也為 32
  trail.value = [];
};

const getMousePos = (e) => {
  const rect = canvasRef.value.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  let clientX = e.touches ? e.touches[0].clientX : e.clientX;
  let clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
};

const handleDragStart = (e) => {
  if (bird.value.state !== 'idle') return;
  const pos = getMousePos(e);
  const dist = Math.hypot(pos.x - bird.value.x, pos.y - bird.value.y);
  // 🌟 放寬點擊判定範圍至 70，讓手機更好點到
  if (dist < 70) {
      e.preventDefault();
      isDragging.value = true;
      bird.value.state = 'dragging';
      sfx.stretch();
  }
};

const handleDragMove = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();
  const pos = getMousePos(e);
  let dx = pos.x - SLING_X;
  let dy = pos.y - SLING_Y;
  let dist = Math.hypot(dx, dy);
  
  if (dist > MAX_DRAG) {
      dx = (dx / dist) * MAX_DRAG;
      dy = (dy / dist) * MAX_DRAG;
  }
  
  if (dx > 30) dx = 30; // 允許往前稍微拉一點，但主要還是往後拉

  bird.value.x = SLING_X + dx;
  bird.value.y = SLING_Y + dy;
};

const handleDragEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  
  let dx = SLING_X - bird.value.x;
  let dy = SLING_Y - bird.value.y;
  
  if (Math.hypot(dx, dy) > 20) {
      bird.value.state = 'flying';
      bird.value.vx = dx * 0.25;
      bird.value.vy = dy * 0.25;
      sfx.launch();
  } else {
      resetBird(); 
  }
};

const updatePhysics = () => {
  if (matchStatus.value !== 'playing') return;

  pigs.value.forEach(pig => {
      pig.phase += 0.05;
      pig.y = pig.baseY + Math.sin(pig.phase) * 15;
  });

  if (bird.value.state === 'flying') {
      bird.value.vy += 0.4; 
      bird.value.x += bird.value.vx;
      bird.value.y += bird.value.vy;

      if (Math.random() > 0.5) trail.value.push({ x: bird.value.x, y: bird.value.y });
      if (trail.value.length > 25) trail.value.shift();

      for (let i = 0; i < pigs.value.length; i++) {
          let p = pigs.value[i];
          let dist = Math.hypot(bird.value.x - p.x, bird.value.y - p.y);
          if (dist < bird.value.r + p.r) {
              handleCollision(p);
              break; 
          }
      }

      if (bird.value.y > GROUND_Y || bird.value.x > CANVAS_W + 50 || bird.value.x < -100) {
          setTimeout(resetBird, 300);
          bird.value.state = 'hit'; 
      }
  }

  drawCanvas();
  animationFrameId = requestAnimationFrame(updatePhysics);
};

const handleCollision = (hitPig) => {
    sfx.hit();
    bird.value.state = 'hit'; 
    pigs.value = pigs.value.filter(p => p.id !== hitPig.id);

    const targetSlot = wordSlots.value.find(s => s.isBlank && !s.filled && s.char === hitPig.char);

    if (targetSlot && !hitPig.isFake) {
        sfx.correct();
        targetSlot.filled = true;
        missingLetters.value = missingLetters.value.filter(m => m.id !== hitPig.id);
        
        if (missingLetters.value.filter(m => !m.isFake).length === 0) {
            sfx.wordComplete();
            if (currentWordObj.value && currentWordObj.value.en_us) speakWord(currentWordObj.value.en_us);
            score.value += 10; 
            currentRound.value++;
            setTimeout(startRound, 1500);
        } else {
            setTimeout(resetBird, 500);
        }
    } else {
        sfx.wrong();
        mistakesCount.value++;
        score.value = Math.max(0, score.value - penaltyPoints.value);
        
        if (hitPig.isFake) {
            missingLetters.value = missingLetters.value.filter(m => m.id !== hitPig.id);
            if (missingLetters.value.filter(m => !m.isFake).length === 0) {
                sfx.wordComplete();
                if (currentWordObj.value && currentWordObj.value.en_us) speakWord(currentWordObj.value.en_us);
                score.value += 10; 
                currentRound.value++;
                setTimeout(startRound, 1500);
                return;
            }
        }
        setTimeout(resetBird, 500);
    }
};

const drawCanvas = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  let grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, '#81d4fa');
  grad.addColorStop(1, '#e1f5fe');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  ctx.fillStyle = '#8bc34a';
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  ctx.strokeStyle = '#558b2f'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke();

  // 畫彈弓後橡皮筋
  if (bird.value.state === 'dragging') {
      ctx.beginPath(); ctx.moveTo(SLING_X - 15, SLING_Y); ctx.lineTo(bird.value.x, bird.value.y);
      ctx.lineWidth = 8; ctx.strokeStyle = '#3e2723'; ctx.stroke();
  }

  // 畫飛行軌跡 (加粗)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  trail.value.forEach(t => {
      ctx.beginPath(); ctx.arc(t.x, t.y, 6, 0, Math.PI*2); ctx.fill();
  });

  // 🌟 畫超大號的憤怒鳥
  if (bird.value.state !== 'hit') {
      ctx.beginPath(); ctx.arc(bird.value.x, bird.value.y, bird.value.r, 0, Math.PI * 2);
      ctx.fillStyle = '#e53935'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
      
      // 眼睛
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(bird.value.x + 12, bird.value.y - 8, 9, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(bird.value.x + 16, bird.value.y - 8, 4, 0, Math.PI*2); ctx.fill();
      
      // 嘴巴
      ctx.fillStyle = '#ffb300';
      ctx.beginPath(); 
      ctx.moveTo(bird.value.x + 30, bird.value.y + 6); 
      ctx.lineTo(bird.value.x + 10, bird.value.y + 16); 
      ctx.lineTo(bird.value.x + 10, bird.value.y - 4); 
      ctx.fill(); ctx.stroke();
  }

  // 畫彈弓前橡皮筋
  if (bird.value.state === 'dragging' || bird.value.state === 'idle') {
      ctx.beginPath(); ctx.moveTo(SLING_X + 25, SLING_Y - 5); 
      ctx.lineTo(bird.value.state === 'idle' ? SLING_X : bird.value.x, bird.value.state === 'idle' ? SLING_Y : bird.value.y);
      ctx.lineWidth = 8; ctx.strokeStyle = '#4e342e'; ctx.stroke();
  }
  
  // 畫強化的彈弓木頭支架
  ctx.fillStyle = '#795548'; ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 4;
  ctx.fillRect(SLING_X - 12, SLING_Y, 24, GROUND_Y - SLING_Y); ctx.strokeRect(SLING_X - 12, SLING_Y, 24, GROUND_Y - SLING_Y);
  ctx.beginPath(); ctx.moveTo(SLING_X, SLING_Y + 40); ctx.lineTo(SLING_X - 25, SLING_Y - 15); ctx.lineTo(SLING_X - 10, SLING_Y - 15); ctx.lineTo(SLING_X + 10, SLING_Y + 30); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(SLING_X, SLING_Y + 40); ctx.lineTo(SLING_X + 25, SLING_Y - 15); ctx.lineTo(SLING_X + 40, SLING_Y - 15); ctx.lineTo(SLING_X + 15, SLING_Y + 30); ctx.fill(); ctx.stroke();

  // 🌟 畫超大號的目標小豬與巨大字體
  pigs.value.forEach(pig => {
      // 豬身體
      ctx.beginPath(); ctx.arc(pig.x, pig.y, pig.r, 0, Math.PI * 2);
      ctx.fillStyle = '#7cb342'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#33691e'; ctx.stroke();
      
      // 豬鼻子
      ctx.beginPath(); ctx.ellipse(pig.x, pig.y + 12, 16, 10, 0, 0, Math.PI*2);
      ctx.fillStyle = '#aed581'; ctx.fill(); ctx.stroke();
      
      // 🌟 巨大化字母，加上立體黑陰影防瞎眼
      ctx.fillStyle = '#fff'; 
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 5; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
      ctx.font = 'bold 46px monospace'; 
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pig.char, pig.x, pig.y - 10); // 將字體稍微往上推避開豬鼻子
      
      // 重置陰影避免影響其他繪圖
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; 
  });
};

const triggerGameOver = async () => {
  matchStatus.value = 'gameover';
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);

  if (studentCookie.value && !studentCookie.value.isAnon) {
    await supabase.from('game_records').insert([{
      student_id: studentCookie.value.id,
      game_type: '單字憤怒鳥',
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
  <div class="ab-root">
    
    <header class="p-header retro-element">
      <h2 class="p-title">🐦 單字憤怒鳥</h2>
      <div class="p-scores">
         <span style="color:#ffeb3b">進度: {{ currentRound>10 ? 10 : currentRound }}/{{ totalRounds }}</span> | 
         <span style="color:#4caf50">得分: {{ score }}</span>
      </div>
      <button class="p-btn-exit" @pointerdown.prevent="quitGame">離開</button>
    </header>

    <div v-if="matchStatus !== 'playing'" class="p-overlay">
      <div class="p-dialog retro-element">
        <div class="icon-big">{{ matchStatus === 'gameover' ? '🏆' : '🐦' }}</div>
        <h2>{{ matchStatus === 'gameover' ? '遊戲結束！' : 'Word Angry Birds' }}</h2>
        <template v-if="matchStatus === 'gameover'">
          <p style="color:#4caf50; font-size:1.5rem; font-weight:bold;">總得分： {{ score }} 分</p>
          <p style="color:#f44336; font-weight:bold;">(打錯失誤： {{ mistakesCount }} 次)</p>
        </template>
        <template v-else>
          <p style="color:#555; line-height: 1.6;">
            向後拖曳紅鳥並放開，利用拋物線射擊右方帶有正確字母的綠豬！<br>
            小心不要打中干擾的假字母喔！
          </p>
        </template>
        <button class="p-btn-play" @pointerdown.prevent="startGame">{{ matchStatus === 'gameover' ? '再玩一次' : '開始射擊' }}</button>
      </div>
    </div>

    <div v-else class="p-machine">
      
      <div class="p-scoreboard retro-element">
        <div class="meaning-group">
            <div class="zh-meaning">{{ currentWordObj?.zh_tw }}</div>
            <button class="speak-btn" @pointerdown.prevent="speakWord(currentWordObj?.en_us)" title="聽發音">🔊</button>
        </div>
        <div class="word-slots">
            <span v-for="(slot, i) in wordSlots" :key="i" class="w-char" :class="{'is-blank': slot.isBlank, 'filled': slot.filled}">
               {{ slot.filled || !slot.isBlank ? slot.char : '_' }}
            </span>
        </div>
      </div>

      <div class="p-board-container">
        <div class="p-playfield">
          <canvas ref="canvasRef" :width="CANVAS_W" :height="CANVAS_H" class="physics-canvas"></canvas>
          
          <div class="touch-layer"
               @mousedown="handleDragStart" @mousemove="handleDragMove" @mouseup="handleDragEnd" @mouseleave="handleDragEnd"
               @touchstart.prevent="handleDragStart" @touchmove.prevent="handleDragMove" @touchend.prevent="handleDragEnd" @touchcancel.prevent="handleDragEnd">
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.ab-root {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: #bbdefb; 
  display: flex; flex-direction: column; overflow: hidden;
  touch-action: none; -webkit-user-select: none; user-select: none;
}

.p-header {
  flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center;
  background: #c62828; color: white; padding: 8px 15px; border-bottom: 3px solid #ef5350;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10;
}
.p-title { margin: 0; font-size: 1.2rem; font-weight: 900; letter-spacing: 1px;}
.p-scores { font-weight: bold; font-size: 1.1rem; display: flex; gap: 10px;}
.p-btn-exit { background: #e0e0e0; color: #333; border: 2px solid #999; border-radius: 5px; padding: 4px 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 0 #999;}
.p-btn-exit:active { transform: translateY(2px); box-shadow: none;}

.p-overlay { flex: 1; display: flex; justify-content: center; align-items: center; padding: 20px; }
.p-dialog { background: #fff; padding: 30px 20px; border-radius: 15px; text-align: center; border: 5px solid #c62828; box-shadow: 0 10px 0 #c62828; max-width: 400px; width: 100%;}
.icon-big { font-size: 5rem; margin-bottom: 10px; }
.p-btn-play { margin-top: 20px; background: #4caf50; color: white; border: 3px solid #2e7d32; padding: 12px 30px; font-size: 1.4rem; font-weight: bold; border-radius: 10px; box-shadow: 0 6px 0 #2e7d32; cursor: pointer; }
.p-btn-play:active { transform: translateY(6px); box-shadow: none; }

.p-machine {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 10px; gap: 10px; min-height: 0;
}

.p-scoreboard {
  width: 100%; max-width: 800px; background: rgba(255,255,255,0.9); border: 4px solid #c62828; border-radius: 10px;
  text-align: center; padding: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; align-items: center;
}
.meaning-group { display: flex; align-items: center; justify-content: center; gap: 10px; }
.zh-meaning { color: #d32f2f; font-size: 1.5rem; font-weight: 900; margin-bottom: 5px; }
.speak-btn { background: transparent; border: none; font-size: 1.8rem; cursor: pointer; padding: 0; transition: 0.1s; margin-bottom: 5px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));}
.speak-btn:active { transform: scale(0.9); }

.word-slots { font-size: 2.2rem; font-family: monospace; font-weight: 900; letter-spacing: 5px; color: #333;}
.w-char.is-blank { color: #ccc; border-bottom: 4px solid #c62828; }
.w-char.filled { color: #2e7d32; border-bottom: none; text-shadow: 0 0 5px #4caf50;}

.p-board-container {
  flex: 1; width: 100%; max-width: 800px; min-height: 0;
  display: flex; justify-content: center; align-items: center;
}
.p-playfield {
  width: 100%; max-height: 100%; aspect-ratio: 8 / 5; 
  background: #fff;
  border: 6px solid #4e342e; 
  border-radius: 15px; 
  position: relative; overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
}

.physics-canvas { width: 100%; height: 100%; display: block; position: absolute; top: 0; left: 0; z-index: 1; }
.touch-layer { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 10; cursor: crosshair; }
.touch-layer:active { cursor: grabbing; }

@media (min-width: 768px) {
  .p-machine { gap: 20px; }
  .p-scoreboard { padding: 15px; flex-direction: row; justify-content: space-around;}
  .zh-meaning { font-size: 2rem; margin-bottom: 0;}
  .word-slots { font-size: 3rem; }
}
</style>