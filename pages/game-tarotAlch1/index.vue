<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
  ]
});

const supabase = useSupabaseClient();
const route = useRoute();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('setup'); // setup, playing, end
const playMode = ref(''); // 'classic' 或 'boss'
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
const score = ref(0);
let timer = null;

const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

// 🌟 接收獨立的單機版變數 (alch1)
const config = ref({ 
    card_set: '1', 
    card_set_kangxuan: '1k', 
    time_limit: 600, 
    penalty: 3, 
    blankCount: 3 
});

// 🌟 魔王討伐戰專屬屬性
const maxPlayerHp = 30;
const playerHp = ref(30);
const maxBossHp = 1000; // 魔王血量
const bossHp = ref(1000);

const myCards = ref([]); 
const cauldronPoints = ref(0); 
const myTarget = ref(null); 
const effects = ref([]);

// --- 音效與發音系統 ---
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
  draw: () => playTone(300, 'triangle', 0.2, 0.1),
  type: () => playTone(800, 'square', 0.05, 0.05),
  correct: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2), 
  bust: () => { playTone(150, 'sawtooth', 0.4, 0.3); setTimeout(() => playTone(100, 'sawtooth', 0.5, 0.3), 200); },
  stand: () => playTone(440, 'sine', 0.2, 0.1),
  perfect: () => { [523, 659, 783, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.15), i * 100)); },
  usePotion: () => { [880, 1046, 1318, 1760].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.1), i * 80)); },
  attack: () => { playTone(200, 'square', 0.1, 0.2); setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.2), 100); }
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

// ==========================================
// 🌟 核心修復：精準抓取卡牌圖片與版本切換
// ==========================================
const getCardImage = (word) => {
    if (!word) return ''; 
    let cleanWord = word.replace(/[^a-zA-Z\s-]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
    const encodedWord = encodeURIComponent(cleanWord);
    const version = route.query.version;
    let setNum = '';

    if (version === '康軒') {
        setNum = config.value.card_set_kangxuan || '1k';
        if (setNum === 'random') {
            const kSets = ['1k', '2k', '3k'];
            setNum = kSets[Math.floor(Math.random() * kSets.length)];
        }
        return `https://pyfbsdk59.github.io/tarot-cards-${setNum}/${encodedWord}.webp`;
    } else {
        setNum = config.value.card_set || '1';
        if (setNum === 'random') setNum = Math.floor(Math.random() * 3) + 1;
        return `https://pyfbsdk59.github.io/tarot-cards-${setNum}/${encodedWord}.webp`;
    }
};

const handleImageError = (e) => { e.target.style.display = 'none'; };

// 🌟 鍊金術：稀有字母計分系統
const getAlchemyScore = (word) => {
    const scores = { a:1, e:1, i:1, o:1, u:1, l:1, n:1, s:1, t:1, r:1, d:2, g:2, b:3, c:3, m:3, p:3, f:4, h:4, v:4, w:4, y:4, k:5, j:8, x:8, q:10, z:10 };
    let total = 0;
    for (let char of word.toLowerCase()) { if (scores[char]) total += scores[char]; }
    return total;
};

const drawRandomCard = () => {
    const availableWords = allWords.value;
    const idx = Math.floor(Math.random() * availableWords.length);
    const w = availableWords[idx];
    const pureWord = w.en_us.replace(/[^a-zA-Z\s-]/g, '').trim().toLowerCase(); 
    const alchScore = getAlchemyScore(pureWord);
    return { id: Date.now() + Math.random(), type: 'ingredient', word: pureWord, zh: w.zh_tw, points: alchScore, glow: false };
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.tarot_alch1_card_set) config.value.card_set = settings.tarot_alch1_card_set; 
        if (settings.tarot_alch1_card_set_kangxuan) config.value.card_set_kangxuan = settings.tarot_alch1_card_set_kangxuan; 
        if (settings.tarot_alch1_time_limit) config.value.time_limit = settings.tarot_alch1_time_limit;
        if (settings.tarot_alch1_penalty) config.value.penalty = settings.tarot_alch1_penalty;
        if (settings.tarot_alch1_blank_count !== undefined) config.value.blankCount = settings.tarot_alch1_blank_count;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 該單元單字數量不足！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }
  } catch (e) { console.error(e); }
});

const spawnEffect = (text, type, yOffset = '50%') => {
    const id = Date.now() + Math.random();
    effects.value.push({ id, text, type, yOffset });
    setTimeout(() => { effects.value = effects.value.filter(e => e.id !== id); }, 1500); 
};

// 🌟 雙模式啟動
const startGame = (mode) => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    errorMsg.value = '';
    score.value = 0;
    correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    
    playMode.value = mode;
    playerHp.value = maxPlayerHp;
    bossHp.value = maxBossHp;
    myCards.value = [];
    cauldronPoints.value = 0;

    gameStatus.value = 'playing';
    gameStartTime.value = Date.now();
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('時間到');
    }, 1000);
};

const resetRound = () => {
    myCards.value = myCards.value.filter(c => c.type === 'potion');
    cauldronPoints.value = 0;
};

const startDrawFlow = () => {
    if (myTarget.value) return; 
    
    if (myCards.value.length >= 8) {
        spawnEffect('桌面已滿！請先煉成或喝掉魔藥', 'sys'); 
        return;
    }
    
    sfx.draw();
    const card = drawRandomCard();
    let pureWord = card.word;
    
    const letterOnlyLen = pureWord.replace(/[\s-]/g, '').length;
    let numBlanks = Math.max(1, Math.min(config.value.blankCount || 3, letterOnlyLen));
    
    let indices = [];
    while(indices.length < numBlanks) {
        let r = Math.floor(Math.random() * pureWord.length);
        if(!indices.includes(r) && pureWord[r] !== ' ' && pureWord[r] !== '-') indices.push(r);
    }
    indices.sort((a,b) => a - b); 

    const slots = pureWord.split('').map((char, idx) => ({ char: char, isBlank: indices.includes(idx), filled: !indices.includes(idx) }));
    const targetChars = indices.map(idx => pureWord[idx]);
    
    let opts = [...targetChars];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    while(opts.length < Math.max(targetChars.length + 4, 10)) opts.push(alphabet[Math.floor(Math.random() * 26)]); 
    const options = opts.sort(() => 0.5 - Math.random()).map((char, idx) => ({ id: idx, char, used: false }));

    myTarget.value = {
        word: pureWord, zh: card.zh, points: card.points, typedCount: 0,
        cardData: card, slots, targetChars, options
    };
};

const handleOptionClick = (opt) => {
    if (opt.used || !myTarget.value || gameStatus.value !== 'playing') return;
    
    if (opt.char.toLowerCase() === myTarget.value.targetChars[myTarget.value.typedCount].toLowerCase()) {
        sfx.type(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;
        
        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            sfx.correct();
            finalizeCard(true);
        }
    } else {
        sfx.wrong(); 
    }
};

const finalizeCard = (isSuccess) => {
    if (!myTarget.value) return; 
    const { word, points, cardData } = myTarget.value;
    myTarget.value = null; 

    if (isSuccess) {
        if (!correctWordsList.value.includes(word)) correctWordsList.value.push(word);
        speakWord(word); 
        
        score.value += 10;
        cauldronPoints.value += points;
        spawnEffect(`萃取 +10分`, 'heal');
        
        cardData.glow = true;
        myCards.value.push(cardData);
        
        setTimeout(() => {
            const c = myCards.value.find(x => x.id === cardData.id);
            if (c) c.glow = false;
        }, 1000);

        setTimeout(checkRoundResult, 500); 
    } else {
        if (!wrongWordsList.value.includes(word)) wrongWordsList.value.push(word);
        mistakesCount.value++;

        score.value = Math.max(0, score.value - config.value.penalty);
        
        // 💥 魔王模式：拼錯扣血
        if (playMode.value === 'boss') {
            playerHp.value -= config.value.penalty;
            spawnEffect(`反噬 -${config.value.penalty} HP`, 'dmg');
            if (playerHp.value <= 0) setTimeout(() => endGame('生命值歸零，討伐失敗'), 1000);
        } else {
            spawnEffect(`失敗 -${config.value.penalty}分`, 'dmg');
        }
    }
};

const checkRoundResult = () => {
    if (cauldronPoints.value === 50) {
        sfx.perfect();
        score.value += 100;
        spawnEffect('✨ 完美煉成! +100分 ✨', 'sys');
        
        const potion = { id: Date.now(), type: 'potion', tier: 3, icon: '💎', name: '賢者之石', desc: playMode.value==='boss'? '造成 300 傷害' : '+200分 / +15秒', scoreBonus: 200, attackBonus: 300, timeBonus: 15, glow: true };
        myCards.value.push(potion);

        setTimeout(resetRound, 1500);
    } else if (cauldronPoints.value > 50) {
        sfx.bust();
        score.value = Math.max(0, score.value - 15);
        
        // 💥 魔王模式：炸鍋大扣血
        if (playMode.value === 'boss') {
            playerHp.value -= 10;
            spawnEffect('💥 炸鍋反噬! -10 HP 💥', 'dmg');
            if (playerHp.value <= 0) setTimeout(() => endGame('生命值歸零，討伐失敗'), 1000);
        } else {
            spawnEffect('💥 炸鍋反噬! -15分 💥', 'dmg');
        }
        setTimeout(resetRound, 1500);
    }
};

const synthesizeRound = () => {
    if (myTarget.value || cauldronPoints.value === 0) return;
    sfx.stand();
    score.value += cauldronPoints.value;
    spawnEffect(`⚗️ 煉成成功 +${cauldronPoints.value}分`, 'heal');

    const pts = cauldronPoints.value;
    let potion = null;
    if (pts < 30) {
        potion = { id: Date.now(), type: 'potion', tier: 1, icon: '🧪', name: '生命藥水', desc: playMode.value==='boss'? '造成 50 傷害' : '+30 分', scoreBonus: 30, attackBonus: 50, timeBonus: 0, glow: true };
    } else if (pts < 50) {
        potion = { id: Date.now(), type: 'potion', tier: 2, icon: '🍷', name: '魔力靈藥', desc: playMode.value==='boss'? '造成 100 傷害' : '+50分 / +5秒', scoreBonus: 50, attackBonus: 100, timeBonus: 5, glow: true };
    }
    
    if (potion) {
        myCards.value.push(potion);
        setTimeout(() => { potion.glow = false; }, 1000);
    }

    setTimeout(resetRound, 800);
};

const usePotion = (card) => {
    if (gameStatus.value !== 'playing' || myTarget.value) return;
    
    // 🐉 魔王模式：攻擊！
    if (playMode.value === 'boss') {
        sfx.attack();
        bossHp.value = Math.max(0, bossHp.value - card.attackBonus);
        score.value += card.scoreBonus; // 依然給分
        spawnEffect(`💥 攻擊魔王 -${card.attackBonus}!`, 'sys', '20%');
        
        if (bossHp.value <= 0) {
            score.value += 500; // 討伐獎勵
            setTimeout(() => endGame('成功討伐暗黑魔龍！'), 1500);
        }
    } 
    // ⚗️ 經典模式：加分與加時間
    else {
        sfx.usePotion();
        score.value += card.scoreBonus;
        if (card.timeBonus > 0) gameStartTime.value += card.timeBonus * 1000; 
        spawnEffect(`發動 ${card.name}!`, 'heal');
    }
    
    myCards.value = myCards.value.filter(c => c.id !== card.id);
};

const getCardTransform = (i, isGlow) => {
    const len = myCards.value.length;
    const offset = (i - (len - 1) / 2);
    const spacing = typeof window !== 'undefined' && window.innerWidth < 768 ? 45 : 85; 
    const rot = offset * 4; 
    const scale = isGlow ? 'scale(1.15)' : 'scale(1)';
    const dropY = Math.abs(offset) * 15; 
    return `translateX(calc(-50% + ${offset * spacing}px)) translateY(${dropY}px) rotate(${rot}deg) ${scale}`;
};

const endGame = async (reason) => {
    gameStatus.value = 'end';
    clearInterval(timer); 

    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reason} | 模式: ${playMode.value === 'boss' ? '魔王討伐' : '無盡經典'} | 分數: ${score.value}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');

        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字塔羅鍊金術(單人)', score: score.value, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: cw, wrong_words: wrongWordsList.value.join(', '), mistakes: mistakesCount.value 
        }]);
    }
};

const quitGame = () => {
    if (gameStatus.value === 'playing') endGame('主動放棄');
    else navigateTo('/');
};

onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="tarot-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🔮 塔羅鍊金術 (單人)</h2>
      <div v-if="gameStatus === 'playing'" class="t-timer">
         <span style="color:#ffeb3b; margin-right: 15px;">🏆 總分: {{ score }}</span>
         <span>⏳ {{ config.time_limit - timeSpent }}s</span>
      </div>
      <button class="retro-btn btn-small" style="background:#d32f2f; border-color:#e57373;" @click="quitGame">結束</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 600px;">
        <div class="icon-big">⚗️</div>
        <h2 style="color:#e1bee7; margin-bottom: 20px;">選擇鍊金模式</h2>
        
        <div class="mode-selection">
            <div class="mode-card retro-element" @click="startGame('classic')">
                <div style="font-size: 3rem; margin-bottom: 10px;">🧪</div>
                <h3 style="color:#e1bee7; margin:0 0 10px 0;">經典無盡煉成</h3>
                <p style="font-size: 0.9rem; color:#ccc; margin:0;">在限時內萃取單字、盡可能完美煉成，喝下魔藥獲取極限高分！</p>
            </div>
            
            <div class="mode-card retro-element" style="border-color: #f44336;" @click="startGame('boss')">
                <div style="font-size: 3rem; margin-bottom: 10px;">🐉</div>
                <h3 style="color:#f44336; margin:0 0 10px 0;">魔王討伐戰</h3>
                <p style="font-size: 0.9rem; color:#ccc; margin:0;">使用煉成的魔藥化為攻擊，對抗擁有 1000 HP 的暗黑魔龍！拼錯字或炸鍋將承受反噬扣血！</p>
            </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="table-container">

      <div v-if="playMode === 'boss'" class="boss-area retro-element">
          <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:900; color:#f44336; font-size: 1.1rem;">🐉 暗黑魔龍</span>
              <span style="color:#fff; font-weight:bold;">HP: {{ bossHp }} / {{ maxBossHp }}</span>
          </div>
          <div class="hp-bar-bg" style="margin-top:8px; height: 12px; border-color: #f44336;">
              <div class="hp-bar-fill" :style="{ width: `${Math.max(0, (bossHp/maxBossHp)*100)}%`, background: '#f44336' }"></div>
          </div>
      </div>

      <div class="cauldron-container" :class="{ 'perfect-glow': cauldronPoints === 50, 'bust-glow': cauldronPoints > 50 }" :style="{ top: playMode === 'boss' ? '18%' : '12%' }">
          <div class="cauldron-orb">
              <div class="c-water" :style="{ height: `${Math.min(100, (cauldronPoints / 50) * 100)}%`, background: cauldronPoints > 50 ? '#f44336' : (cauldronPoints === 50 ? '#ffeb3b' : '#9c27b0') }"></div>
              <div class="c-content">
                  <div class="c-label">大釜能量</div>
                  <div class="c-value">{{ cauldronPoints }} <span style="font-size:1.5rem;">/ 50</span></div>
                  <div v-if="cauldronPoints === 50" class="c-status" style="color: #000;">✨ 完美 ✨</div>
                  <div v-else-if="cauldronPoints > 50" class="c-status" style="color: #fff;">💥 炸鍋 💥</div>
              </div>
          </div>
      </div>

      <div class="player-area my-area">
          <div class="cards-row my-cards">
              <div v-for="(card, i) in myCards" :key="card.id" 
                   class="tarot-card resolved" 
                   :class="{ 'mystic-glow': card.glow, 'is-potion': card.type === 'potion' }"
                   :style="{ zIndex: card.glow ? 200 : i, left: '50%', transform: getCardTransform(i, card.glow) }"
                   @click="card.type === 'potion' ? usePotion(card) : null">
                  
                  <template v-if="card.type === 'ingredient'">
                      <div class="card-back-pattern"></div>
                      <img :src="getCardImage(card.word)" class="card-bg" @error="handleImageError" />
                      <div class="card-content">
                          <div class="c-word">{{ card.word }}</div>
                          <div class="c-zh">{{ card.zh }}</div>
                          <div class="c-point" style="color:#e1bee7;">+{{ card.points }} 點</div>
                      </div>
                  </template>

                  <template v-else-if="card.type === 'potion'">
                      <div class="potion-bg" :class="'tier-' + card.tier"></div>
                      <div class="potion-content">
                          <div class="p-icon">{{ card.icon }}</div>
                          <div class="p-name">{{ card.name }}</div>
                          <div class="p-desc">{{ card.desc }}</div>
                          <div class="p-hint">{{ playMode === 'boss' ? '(點擊攻擊!)' : '(點擊使用)' }}</div>
                      </div>
                  </template>
              </div>

              <div class="fx-layer" v-for="eff in effects" :key="eff.id" :style="{ top: eff.yOffset }">
                 <div class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
              </div>
          </div>

          <div class="player-info my-info" style="position:absolute; bottom: 20px; left:50%; transform:translateX(-50%); width: 95%; max-width: 500px; z-index: 500;">
              <div v-if="playMode === 'boss'" style="margin-bottom: 10px; background: rgba(0,0,0,0.7); padding: 8px; border-radius: 8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size: 0.9rem; margin-bottom: 4px;">
                      <span style="color:#4caf50; font-weight:bold;">🛡️ 我方生命值</span>
                      <span style="color:#fff;">{{ playerHp }} / {{ maxPlayerHp }}</span>
                  </div>
                  <div class="hp-bar-bg"><div class="hp-bar-fill" :style="{ width: `${Math.max(0, (playerHp/maxPlayerHp)*100)}%` }"></div></div>
              </div>

              <div style="display: flex; gap: 15px;">
                  <button class="retro-btn btn-primary" style="flex: 1.5; padding: 15px; font-size: 1.2rem; background:#8e24aa; border-color:#ce93d8; box-shadow: 0 4px 0 #4a148c;" @click="startDrawFlow" :disabled="myTarget !== null || cauldronPoints >= 50">🃏 抽牌萃取</button>
                  <button class="retro-btn" style="flex: 1; padding: 15px; font-size: 1.2rem; background: #00897b; border-color: #4db6ac; box-shadow: 0 4px 0 #004d40; color: #fff;" @click="synthesizeRound" :disabled="myTarget !== null || cauldronPoints === 0 || cauldronPoints >= 50">⚗️ 煉成</button>
              </div>
          </div>
      </div>

      <div class="action-panel retro-element" v-if="myTarget">
          <div class="typing-target" style="font-size: 1.4rem; color: #e1bee7; margin-bottom: 5px;">{{ myTarget.zh }} <span style="font-size:0.9rem; color:#4caf50;">(+{{ myTarget.points }} 點)</span></div>
          
          <div class="m-slots">
              <span v-for="(slot, i) in myTarget.slots" :key="i" class="m-slot" :class="{'is-blank': slot.isBlank, 'filled': slot.filled, 'is-space': slot.char === ' ' || slot.char === '-'}">
                  {{ slot.filled || !slot.isBlank ? slot.char.toUpperCase() : '_' }}
              </span>
          </div>
          <div class="m-keyboard">
              <button v-for="opt in myTarget.options" :key="opt.id" class="retro-btn m-key" :class="{'used': opt.used}" @click="handleOptionClick(opt)">
                  {{ opt.char.toUpperCase() }}
              </button>
          </div>
          <button class="retro-btn btn-danger" style="margin-top:10px; width:100%; font-size: 1rem; padding: 8px;" @click="() => { 
              sfx.wrong(); finalizeCard(false);
          }">放棄拼寫 (扣 {{ config.penalty }} {{ playMode === 'boss' ? 'HP' : '分' }})</button>
      </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>任務結束</h1>
          <p class="winner-text" style="color:#e1bee7; font-size: 2rem;">🏆 總分：{{ score }}</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px; margin-top:10px;">原因：{{ errorMsg || '結算完畢' }}</p>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
       </div>
    </div>
  </div>
</template>

<style scoped>
.tarot-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0a0a1a; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: rgba(20, 10, 40, 0.85); border: 2px solid #9c27b0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); color: #fff; padding: 10px; box-sizing: border-box; backdrop-filter: blur(5px); }
.retro-btn { background: #4a148c; color: #fff; border: 2px solid #ce93d8; border-radius: 6px; font-weight: bold; cursor: pointer; padding: 10px 15px; box-shadow: 0 4px 0 #311b92; transition: 0.1s; }
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; }
.btn-primary { background: #8e24aa; border-color: #e1bee7; box-shadow: 0 4px 0 #4a148c; }
.btn-danger { background: #d32f2f; border-color: #e57373; box-shadow: 0 4px 0 #b71c1c; }
.btn-small { padding: 5px 10px; font-size: 1rem; box-shadow: 0 2px 0 #311b92; }

.t-header { display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 0;}
.t-title { margin: 0; font-size: 1.1rem; }
.t-timer { font-weight: bold; font-size: 1.1rem; }

/* 🌟 模式選擇設計 */
.mode-selection { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
.mode-card { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; cursor: pointer; transition: 0.2s; border-width: 3px; }
.mode-card:hover { transform: scale(1.02); background: rgba(50, 20, 80, 0.95); border-color: #ffeb3b; }
.mode-card:active { transform: scale(0.98); }

@media (min-width: 768px) {
    .mode-selection { flex-direction: row; }
    .mode-card { flex: 1; }
}

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 500px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; text-shadow: 0 0 20px rgba(255,255,255,0.5); }
.rules-box { text-align: left; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; border: 1px dashed #ce93d8; font-size: 0.95rem; }

.table-container { flex: 1; display: flex; flex-direction: column; position: relative; background: radial-gradient(circle at center, #311b92 0%, #0a0a1a 100%); overflow: hidden; }

/* 🌟 血條設計 */
.boss-area { position:absolute; top:10px; left:50%; transform:translateX(-50%); width: 90%; max-width: 500px; z-index: 50; padding: 8px 15px; background: rgba(20,0,0,0.8); border-color: #f44336; }
.hp-bar-bg { width: 100%; height: 8px; background: #333; border: 1px solid #555; border-radius: 4px; overflow: hidden; }
.hp-bar-fill { height: 100%; background: #4caf50; transition: width 0.3s ease-out; }

/* 🌟 鍊金大釜 (Cauldron) 特效設計 */
.cauldron-container { position: absolute; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; justify-content: center; align-items: center; transition: all 0.3s;}
.cauldron-orb { width: 130px; height: 130px; border-radius: 50%; border: 4px solid #ce93d8; background: rgba(0,0,0,0.6); position: relative; overflow: hidden; box-shadow: 0 0 30px rgba(156, 39, 176, 0.5), inset 0 0 20px rgba(0,0,0,0.8); }
.c-water { position: absolute; bottom: 0; left: 0; width: 100%; transition: height 0.5s ease-in-out, background 0.5s; opacity: 0.8; }
.c-content { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 2; text-shadow: 1px 1px 5px #000; }
.c-label { font-size: 0.75rem; color: #e1bee7; font-weight: bold; margin-bottom: 2px;}
.c-value { font-size: 2.2rem; font-weight: 900; color: #fff; line-height: 1; }
.c-status { font-size: 0.9rem; font-weight: 900; margin-top: 5px; animation: pop 0.5s ease-out forwards; background: rgba(255,255,255,0.8); padding: 2px 8px; border-radius: 12px; box-shadow: 0 0 10px #fff;}

@keyframes pop { 0% { transform: scale(0.5); opacity: 0;} 80% { transform: scale(1.2); opacity: 1;} 100% { transform: scale(1); } }

.perfect-glow .cauldron-orb { border-color: #ffeb3b; box-shadow: 0 0 60px #ffeb3b; }
.bust-glow .cauldron-orb { border-color: #f44336; box-shadow: 0 0 60px #f44336; }

.player-area { flex: 1; display: flex; flex-direction: column; padding: 15px; position: relative; transition: 0.3s; }
.my-area { justify-content: flex-end; }

/* 🌟 卡牌區 (素材與魔藥) */
.cards-row { position: absolute; height: 140px; width: 100%; }
.my-cards { bottom: 180px; left: 0; width: 100%; }

.tarot-card { 
    position: absolute; width: 130px; height: 195px; border-radius: 10px;
    background: #000; border: 2px solid #9c27b0; box-shadow: 2px 4px 12px rgba(0,0,0,0.8);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden; cursor: pointer;
}

.is-potion { animation: floatPotion 3s ease-in-out infinite; }
@keyframes floatPotion { 0%, 100% { top: 0px; } 50% { top: -10px; } }
.is-potion:hover { filter: brightness(1.2); }

.card-back-pattern { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(45deg, #311b92, #311b92 10px, #4a148c 10px, #4a148c 20px); border-radius: 6px; z-index: 0; box-shadow: inset 0 0 15px rgba(0,0,0,0.8); }
.card-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 6px; z-index: 1; opacity: 1; filter: none; }

.card-content { position: absolute; top: 0; z-index: 2; text-align: center; width: 100%; padding: 6px 4px 15px 4px; background: linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, transparent 100%); border-radius: 6px 6px 0 0; }
.c-word { font-size: 1.3rem; font-weight: 900; color: #fff; word-break: break-all; line-height: 1.1; text-shadow: 1px 1px 0 #000; }
.c-zh { font-size: 0.9rem; color: #e1bee7; margin-top: 4px; text-shadow: 1px 1px 0 #000; }
.c-point { font-size: 1.6rem; font-weight: bold; color: #ffeb3b; text-shadow: 1px 1px 0 #000; margin-top: 2px;}

/* 🧪 魔藥卡專屬樣式 */
.potion-bg { position: absolute; top:0; left:0; width:100%; height:100%; border-radius: 6px; z-index: 1; }
.tier-1 { background: radial-gradient(circle at top, #4caf50, #1b5e20); border: 3px solid #81c784; }
.tier-2 { background: radial-gradient(circle at top, #ab47bc, #4a148c); border: 3px solid #e1bee7; }
.tier-3 { background: radial-gradient(circle at top, #fff59d, #f57f17); border: 4px solid #fff; box-shadow: inset 0 0 20px #ffeb3b; }

.potion-content { position: absolute; top:0; left:0; width:100%; height:100%; z-index: 2; display: flex; flex-direction: column; justify-content: center; align-items: center; text-shadow: 1px 1px 3px #000; padding: 5px; text-align: center;}
.p-icon { font-size: 3.5rem; margin-bottom: 5px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
.p-name { font-size: 1.3rem; font-weight: 900; color: #fff; margin-bottom: 5px; line-height: 1.1;}
.p-desc { font-size: 0.9rem; font-weight: bold; color: #fff; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 10px; margin-bottom: 5px; line-height: 1.2; }
.tier-3 .p-desc { color: #ffeb3b; }
.p-hint { font-size: 0.8rem; color: #ddd; font-weight: bold; animation: pulse 1s infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

/* 🌟 神秘發光特效 (Mystic Glow) */
@keyframes mysticGlowAnim {
    0% { box-shadow: 0 0 20px #e1bee7; filter: brightness(1); }
    50% { box-shadow: 0 0 80px #fff, 0 0 120px #e1bee7; filter: brightness(1.3); }
    100% { box-shadow: 2px 4px 12px rgba(0,0,0,0.8); filter: brightness(1); }
}
.mystic-glow { animation: mysticGlowAnim 1s ease-out forwards; }

/* 🌟 打字面板置中彈出 */
.action-panel { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 95%; max-width: 550px; padding: 15px; z-index: 200; background: rgba(20, 5, 20, 0.98); box-shadow: 0 0 40px #000; border-color: #ce93d8; border-width: 3px; }

.m-slots { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-bottom: 12px;}
.m-slot { font-size: 1.5rem; font-weight: 900; color: #fff; border-bottom: 2px solid transparent; min-width: 20px; text-align: center;}
.m-slot.is-blank { color: #777; border-bottom-color: #777; }
.m-slot.is-blank.filled { color: #ffeb3b; border-bottom-color: #ffeb3b; text-shadow: 1px 1px 0 #000;}
.m-slot.is-space { min-width: 10px; border-bottom: none; }
.m-keyboard { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 500px; margin: 0 auto;}
.m-key { width: 42px; height: 42px; font-size: 1.3rem; display: flex; justify-content: center; align-items: center; border-radius: 6px; padding: 0; box-shadow: 0 4px 0 #311b92; }
.m-key:active:not(.used) { transform: translateY(4px); box-shadow: none; }
.m-key.used { opacity: 0.2; pointer-events: none; }

.fx-layer { position: absolute; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 260; }
.dmg-pop { font-size: 2.2rem; font-weight: 900; animation: floatTxt 1.2s ease-out forwards; white-space: nowrap; }
.dmg-pop.dmg { color: #ff3333; text-shadow: 2px 2px 0 #fff; }
.dmg-pop.heal { color: #4caf50; text-shadow: 2px 2px 0 #fff; }
.dmg-pop.sys { color: #ffeb3b; text-shadow: 2px 2px 0 #000; }
@keyframes floatTxt { 0% { opacity: 1; transform: translateY(0) scale(0.8); } 40% { transform: translateY(-30px) scale(1.3); } 100% { opacity: 0; transform: translateY(-60px) scale(1); } }

/* 🌟 電腦版 (Desktop) 巨大化排版 */
@media (min-width: 768px) {
    .tarot-card { width: 180px; height: 270px; border-width: 4px; border-radius: 12px;}
    .c-word { font-size: 1.6rem; margin-bottom: 5px; }
    .c-zh { font-size: 1.1rem; margin-top: 8px; }
    .c-point { font-size: 2.2rem; margin-top: 10px; }
    
    .p-icon { font-size: 4rem; margin-bottom: 10px; }
    .p-name { font-size: 1.6rem; margin-bottom: 8px; }
    .p-desc { font-size: 1.1rem; padding: 6px 12px; margin-bottom: 8px;}
    .p-hint { font-size: 1rem; }

    .cauldron-orb { width: 180px; height: 180px; border-width: 6px;}
    .c-value { font-size: 3.2rem; }

    .my-cards { bottom: 230px; } 
}
</style>