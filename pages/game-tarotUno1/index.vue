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
const playMode = ref(''); // 'classic' 或 'ai'
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
const score = ref(0);
let timer = null;

const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

// 🌟 接收獨立的單機版 UNO 變數
const config = ref({ 
    card_set: '1', 
    card_set_kangxuan: '1k', 
    time_limit: 600, 
    penalty: 3, 
    blankCount: 3 
});

// 裝飾用卡牌顏色
const unoColors = [
    { id: 'red', hex: '#f44336', bg: 'linear-gradient(to bottom, rgba(244,67,54,0.9), rgba(0,0,0,0.8))' },
    { id: 'blue', hex: '#2196f3', bg: 'linear-gradient(to bottom, rgba(33,150,243,0.9), rgba(0,0,0,0.8))' },
    { id: 'green', hex: '#4caf50', bg: 'linear-gradient(to bottom, rgba(76,175,80,0.9), rgba(0,0,0,0.8))' },
    { id: 'yellow', hex: '#ffeb3b', bg: 'linear-gradient(to bottom, rgba(255,235,59,0.9), rgba(0,0,0,0.8))' }
];

const myHand = ref([]);
const oppHand = ref([]); 
const topCard = ref(null);
const currentTurn = ref('player'); 

const myTarget = ref(null); 
const effects = ref([]);

// --- 音效系統 ---
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
  play: () => playTone(600, 'sine', 0.15, 0.1),
  win: () => { [523, 659, 783, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.15), i * 100)); }
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
// 🌟 圖片讀取邏輯
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

const drawRandomCard = () => {
    const w = allWords.value[Math.floor(Math.random() * allWords.value.length)];
    const pureWord = w.en_us.replace(/[^a-zA-Z\s-]/g, '').trim().toLowerCase(); 
    const randColor = unoColors[Math.floor(Math.random() * unoColors.length)];
    return { 
        id: Date.now() + Math.random(), 
        word: pureWord, 
        zh: w.zh_tw, 
        color: randColor,
        rotation: (Math.random() - 0.5) * 20 
    };
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.tarot_uno1_card_set) config.value.card_set = settings.tarot_uno1_card_set; 
        if (settings.tarot_uno1_card_set_kangxuan) config.value.card_set_kangxuan = settings.tarot_uno1_card_set_kangxuan; 
        if (settings.tarot_uno1_time_limit) config.value.time_limit = settings.tarot_uno1_time_limit;
        if (settings.tarot_uno1_penalty) config.value.penalty = settings.tarot_uno1_penalty;
        if (settings.tarot_uno1_blank_count !== undefined) config.value.blankCount = settings.tarot_uno1_blank_count;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 該單元單字數量不足！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }
  } catch (e) { console.error(e); }
});

const spawnEffect = (target, text, type, yOffset = '50%') => {
    const id = Date.now() + Math.random();
    effects.value.push({ id, target, text, type, yOffset });
    setTimeout(() => { effects.value = effects.value.filter(e => e.id !== id); }, 1500); 
};

// ==========================================
// 🌟 核心出牌邏輯 (全新寬鬆三大條件)
// ==========================================
const isPlayable = (card) => {
    if (!topCard.value) return true;
    
    // 過濾掉空白與連字號，確保長度與字首判斷精準
    const cWord = card.word.toLowerCase().replace(/[^a-z]/g, '');
    const tWord = topCard.value.word.toLowerCase().replace(/[^a-z]/g, '');

    if (!cWord || !tWord) return true;

    // 條件 1. 字首字母相同
    const sameFirst = cWord[0] === tWord[0];
    
    // 條件 2. 字母數量相同
    const sameLength = cWord.length === tWord.length;
    
    // 條件 3. 只要有共同包含「a, e, i, o, u」其中一個母音即可
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const shareVowel = vowels.some(v => cWord.includes(v) && tWord.includes(v));
    
    // 只要符合上述三大條件之一即可出牌
    return sameFirst || sameLength || shareVowel;
};

const startGame = (mode) => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    errorMsg.value = '';
    score.value = 0;
    correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;
    
    playMode.value = mode;
    myHand.value = [];
    oppHand.value = [];
    
    // 初始化抽牌
    topCard.value = drawRandomCard();
    for(let i=0; i<7; i++) myHand.value.push(drawRandomCard());
    if (mode === 'ai') {
        for(let i=0; i<7; i++) oppHand.value.push(drawRandomCard());
    }
    
    currentTurn.value = 'player';
    gameStatus.value = 'playing';
    gameStartTime.value = Date.now();
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('系統', '時間到');
    }, 1000);
};

const handleCardClick = (card, index) => {
    if (currentTurn.value !== 'player' || myTarget.value) return;
    
    if (!isPlayable(card)) {
        spawnEffect('player', '不符合三大條件！', 'dmg', '40%');
        sfx.wrong();
        return;
    }
    
    sfx.draw();
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
        card, index, word: pureWord, zh: card.zh, typedCount: 0,
        slots, targetChars, options
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
    } else { sfx.wrong(); }
};

const finalizeCard = (isSuccess) => {
    if (!myTarget.value) return; 
    const { card, index, word } = myTarget.value;
    myTarget.value = null; 

    if (isSuccess) {
        if (!correctWordsList.value.includes(word)) correctWordsList.value.push(word);
        speakWord(word); 
        sfx.play();
        
        score.value += 20;
        card.rotation = (Math.random() - 0.5) * 20;
        
        topCard.value = card;
        myHand.value.splice(index, 1);
        spawnEffect('player', `出牌 +20分`, 'heal', '40%');

        if (myHand.value.length === 0) {
            sfx.win();
            if (playMode.value === 'ai') {
                setTimeout(() => endGame(studentCookie.value.name, '成功出完所有手牌！'), 1000);
            } else {
                score.value += 100;
                spawnEffect('player', '手牌清空 +100分！', 'heal');
                setTimeout(() => {
                    for(let i=0; i<7; i++) myHand.value.push(drawRandomCard());
                }, 1500);
            }
            return;
        }

        if (playMode.value === 'ai') {
            currentTurn.value = 'dealer';
            setTimeout(aiTurn, 1000);
        }
    } else {
        if (!wrongWordsList.value.includes(word)) wrongWordsList.value.push(word);
        mistakesCount.value++;

        score.value = Math.max(0, score.value - config.value.penalty);
        spawnEffect('player', `失敗 -${config.value.penalty}分`, 'dmg', '40%');

        if (playMode.value === 'ai') {
            spawnEffect('player', `被中斷! 換莊家`, 'sys', '60%');
            currentTurn.value = 'dealer';
            setTimeout(aiTurn, 1500);
        }
    }
};

const drawFromDeck = () => {
    if (currentTurn.value !== 'player' || myTarget.value) return;
    sfx.draw();
    myHand.value.push(drawRandomCard());
    spawnEffect('player', '抽一張牌', 'sys', '40%');
    
    if (playMode.value === 'ai') {
        currentTurn.value = 'dealer';
        setTimeout(aiTurn, 1000);
    }
};

// ==========================================
// 🤖 AI 對戰邏輯
// ==========================================
const aiTurn = () => {
    if (gameStatus.value !== 'playing') return;
    
    let validIdx = oppHand.value.findIndex(c => isPlayable(c));
    
    if (validIdx !== -1) {
        sfx.play();
        const playedCard = oppHand.value.splice(validIdx, 1)[0];
        playedCard.rotation = (Math.random() - 0.5) * 20;
        topCard.value = playedCard;
        speakWord(playedCard.word);
        
        spawnEffect('dealer', `AI 打出 ${playedCard.word}`, 'dmg');
        
        if (oppHand.value.length === 0) {
            sfx.bust();
            setTimeout(() => endGame('命運莊家', 'AI 優先出完了手牌'), 1500);
            return;
        }
    } else {
        sfx.draw();
        oppHand.value.push(drawRandomCard());
        spawnEffect('dealer', 'AI 抽了一張牌', 'sys');
    }
    
    setTimeout(() => { currentTurn.value = 'player'; }, 1000);
};

const endGame = async (winName, reason) => {
    gameStatus.value = 'end';
    clearInterval(timer); 

    if (studentCookie.value && !studentCookie.value.isAnon) {
        let resultMark = winName === studentCookie.value.name ? '【勝】' : (playMode.value === 'ai' ? '【敗】' : ''); 
        let cw = `結果: ${resultMark} ${reason} | 模式: ${playMode.value === 'ai' ? 'AI對決' : '無盡清牌'} | 分數: ${score.value}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');

        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字塔羅UNO(單人)', score: score.value, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: cw, wrong_words: wrongWordsList.value.join(', '), mistakes: mistakesCount.value 
        }]);
    }
};

const quitGame = () => {
    if (gameStatus.value === 'playing') endGame('系統', '主動放棄');
    else navigateTo('/');
};

onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="tarot-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🎴 塔羅 UNO (單人)</h2>
      <div v-if="gameStatus === 'playing'" class="t-timer">
         <span style="color:#ffeb3b; margin-right: 15px;">🏆 總分: {{ score }}</span>
         <span>⏳ {{ config.time_limit - timeSpent }}s</span>
      </div>
      <button class="retro-btn btn-small" style="background:#d32f2f; border-color:#e57373;" @click="quitGame">結束</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 600px;">
        <div class="icon-big">🎴</div>
        <h2 style="color:#81c784; margin-bottom: 20px;">選擇 UNO 模式</h2>
        
        <div class="rules-box" style="margin-bottom: 15px;">
            <h3 style="color:#a5d6a7; margin-top:0; text-align:center;">📜 出牌規則 📜</h3>
            <p>您只能打出符合中央公牌<b>「任一條件」</b>的卡片：<br>
               🔸 <b>1. 字首字母相同</b> (例: Apple ↔ Ant)<br>
               🔸 <b>2. 字母數量相同</b> (例: Cat ↔ Dog)<br>
               🔸 <b>3. 含有共同母音</b> (只要 a, e, i, o, u 其中一個相同即可，例: Cat ↔ Bad 皆有 a)
            </p>
            <p style="color:#ff9800; font-weight:bold; margin-bottom: 0;">💡 請自行判斷手牌是否符合條件，若點錯將會被扣分！若無牌可出，請點擊上方牌庫抽牌。</p>
        </div>

        <div class="mode-selection">
            <div class="mode-card retro-element" @click="startGame('classic')">
                <div style="font-size: 3rem; margin-bottom: 10px;">♾️</div>
                <h3 style="color:#e1bee7; margin:0 0 10px 0;">經典無盡清牌</h3>
                <p style="font-size: 0.9rem; color:#ccc; margin:0;">盡快清空手牌獲取 +100 大獎，清空後會自動補滿，挑戰極限高分！</p>
            </div>
            
            <div class="mode-card retro-element" style="border-color: #ff9800;" @click="startGame('ai')">
                <div style="font-size: 3rem; margin-bottom: 10px;">🤖</div>
                <h3 style="color:#ff9800; margin:0 0 10px 0;">命運莊家對決</h3>
                <p style="font-size: 0.9rem; color:#ccc; margin:0;">與 AI 進行 1v1 對決！雙方起始 7 張牌，誰先清空手牌就獲得最終勝利！</p>
            </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="table-container">

      <div class="opp-area" v-if="playMode === 'ai'">
          <div class="player-info retro-element my-info" style="margin-bottom: 5px; max-width: 250px; margin: 0 auto; text-align: center; padding: 5px;">
              <div class="p-name" style="color:#ff9800; font-size: 0.9rem;">🤖 命運莊家</div>
              <div style="color:#fff; font-weight:bold; font-size: 0.8rem;">剩餘手牌: {{ oppHand.length }}</div>
          </div>
          
          <div class="opp-cards-container">
              <div v-for="(c, i) in oppHand" :key="c.id" class="opp-card"></div>
          </div>
          <div class="fx-layer" v-for="eff in effects.filter(e => e.target === 'dealer')" :key="eff.id" :style="{ top: eff.yOffset }">
              <div class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
          </div>
      </div>

      <div class="center-area">
          <div class="deck-stack" @click="drawFromDeck" :class="{'disabled-deck': currentTurn !== 'player' || myTarget}">
              <div class="deck-card card-back-pattern" style="transform: rotate(-5deg) translate(-5px, 5px);"></div>
              <div class="deck-card card-back-pattern" style="transform: rotate(2deg) translate(2px, -2px);"></div>
              <div class="deck-card card-back-pattern"></div>
              <div class="deck-label">點擊抽牌</div>
          </div>
          
          <div class="top-card-spot" v-if="topCard">
              <div class="tarot-card resolved top-card-fixed" :style="{ borderColor: topCard.color.hex, boxShadow: `0 0 20px ${topCard.color.hex}`, transform: `rotate(${topCard.rotation}deg)` }">
                  <img :src="getCardImage(topCard.word)" class="card-bg" @error="handleImageError" />
                  <div class="card-content" :style="{ background: topCard.color.bg }">
                      <div class="c-word">{{ topCard.word }}</div>
                      <div class="c-zh">{{ topCard.zh }}</div>
                  </div>
              </div>
          </div>
      </div>

      <div class="my-info">
          <div v-if="currentTurn === 'dealer' && playMode === 'ai'" class="turn-badge ai-turn">
              🤖 AI 莊家思考中...
          </div>
          <div v-else-if="currentTurn === 'player' && !myTarget" class="turn-badge player-turn">
              👆 您的回合：請點擊符合條件的卡牌出牌
          </div>
      </div>

      <div class="my-cards-container">
          <div v-for="(card, i) in myHand" :key="card.id" 
               class="tarot-card resolved hand-card" 
               :class="{ 'typing': myTarget && myTarget.index === i }"
               :style="{ borderColor: card.color.hex }"
               @click="handleCardClick(card, i)">
              
              <div class="card-back-pattern"></div>
              <img :src="getCardImage(card.word)" class="card-bg" @error="handleImageError" />
              <div class="card-content" :style="{ background: card.color.bg }">
                  <div class="c-word">{{ card.word }}</div>
                  <div class="c-zh">{{ card.zh }}</div>
              </div>
          </div>
          <div class="fx-layer" v-for="eff in effects.filter(e => e.target === 'player')" :key="eff.id" :style="{ top: eff.yOffset }">
              <div class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
          </div>
      </div>

      <div class="action-panel retro-element" v-if="myTarget">
          <div class="typing-target" style="font-size: 1.4rem; color: #fff; margin-bottom: 5px;">{{ myTarget.zh }}</div>
          
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
          }">放棄拼寫 (扣 {{ config.penalty }} 分)</button>
      </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>對局結束</h1>
          <p class="winner-text" style="color:#4caf50; font-size: 2rem;">🏆 總分：{{ score }}</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ errorMsg || '結算完畢' }}</p>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
       </div>
    </div>
  </div>
</template>

<style scoped>
.tarot-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0a0a1a; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: rgba(10, 30, 15, 0.85); border: 2px solid #4caf50; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); color: #fff; padding: 10px; box-sizing: border-box; backdrop-filter: blur(5px); }
.retro-btn { background: #1b5e20; color: #fff; border: 2px solid #81c784; border-radius: 6px; font-weight: bold; cursor: pointer; padding: 10px 15px; box-shadow: 0 4px 0 #000; transition: 0.1s; }
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; }
.btn-primary { background: #2e7d32; border-color: #a5d6a7; box-shadow: 0 4px 0 #1b5e20; }
.btn-danger { background: #d32f2f; border-color: #e57373; box-shadow: 0 4px 0 #b71c1c; }
.btn-small { padding: 5px 10px; font-size: 1rem; box-shadow: 0 2px 0 #000; }

.t-header { display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 0;}
.t-title { margin: 0; font-size: 1.1rem; }
.t-timer { font-weight: bold; font-size: 1.1rem; }

.mode-selection { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
.mode-card { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; cursor: pointer; transition: 0.2s; border-width: 3px; }
.mode-card:hover { transform: scale(1.02); background: rgba(20, 50, 20, 0.95); border-color: #ffeb3b; }
.mode-card:active { transform: scale(0.98); }

@media (min-width: 768px) {
    .mode-selection { flex-direction: row; }
    .mode-card { flex: 1; }
}

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 500px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; text-shadow: 0 0 20px rgba(255,255,255,0.5); }
.rules-box { text-align: left; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; border: 1px dashed #81c784; font-size: 0.95rem; }

.table-container { flex: 1; position: relative; background: radial-gradient(circle at center, #1b5e20 0%, #051005 100%); overflow: hidden; width: 100%; }

.opp-area { position: absolute; top: 10px; left: 0; width: 100%; z-index: 10; }
.opp-cards-container { display: flex; justify-content: center; overflow: hidden; padding: 5px; }
.opp-card { width: 40px; height: 60px; flex: 0 0 auto; margin-left: -20px; border-radius: 4px; background: repeating-linear-gradient(45deg, #1b5e20, #1b5e20 5px, #2e7d32 5px, #2e7d32 10px); border: 2px solid #fff; box-shadow: -2px 2px 5px rgba(0,0,0,0.5); }
.opp-card:first-child { margin-left: 0; }

.center-area { position: absolute; top: 38%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: 20px; align-items: center; z-index: 15; }
.deck-stack { position: relative; width: 90px; height: 135px; cursor: pointer; transition: 0.2s; border-radius: 8px; }
.deck-stack:hover { transform: scale(1.05) translateY(-5px); }
.deck-stack:active { transform: scale(0.95); }
.disabled-deck { opacity: 0.5; cursor: not-allowed; pointer-events: none; filter: grayscale(100%); }
.deck-card { position: absolute; width: 100%; height: 100%; border-radius: 8px; border: 3px solid #fff; box-shadow: -2px 2px 5px rgba(0,0,0,0.6); }
.deck-label { position: absolute; bottom: -25px; width: 100%; text-align: center; font-weight: bold; color: #fff; text-shadow: 1px 1px 2px #000; font-size: 0.85rem;}
.top-card-spot { position: relative; width: 90px; height: 135px; }

.my-info { position: absolute; bottom: 185px; left: 50%; transform: translateX(-50%); width: 100%; text-align: center; z-index: 25; }
.turn-badge { font-weight: bold; font-size: 1rem; background: rgba(0,0,0,0.7); display: inline-block; padding: 6px 18px; border-radius: 20px; border: 1px solid; }
.ai-turn { color: #ffeb3b; border-color: #ffeb3b; }
.player-turn { color: #4caf50; border-color: #4caf50; }

.my-cards-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 180px; 
    background: rgba(0, 0, 0, 0.2); 
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    align-items: center;
    padding: 15px 15px;
    gap: 10px;
    box-sizing: border-box;
    z-index: 20;
}

.my-cards-container::-webkit-scrollbar { height: 6px; }
.my-cards-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 3px; margin: 0 15px; }
.my-cards-container::-webkit-scrollbar-thumb { background: #4caf50; border-radius: 3px; }

.tarot-card { 
    width: 90px; height: 135px; border-radius: 8px;
    background: #000; border: 3px solid #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.8);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    overflow: hidden; cursor: pointer;
}
.top-card-fixed { position: absolute; top: 0; left: 0; }

.hand-card {
    position: relative !important; 
    flex: 0 0 auto;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
}

.hand-card:hover {
    transform: translateY(-25px) scale(1.15);
    box-shadow: 0 10px 20px rgba(0,0,0,0.9);
    z-index: 50;
}
.hand-card.typing {
    transform: translateY(-25px) scale(1.2) !important;
    box-shadow: 0 0 30px #ff9800 !important;
    z-index: 100;
}

.hidden-card .card-back-pattern { opacity: 1; z-index: 10; }
.card-back-pattern { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(45deg, #1b5e20, #1b5e20 10px, #2e7d32 10px, #2e7d32 20px); border-radius: 6px; z-index: 0; box-shadow: inset 0 0 15px rgba(0,0,0,0.8); }
.card-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 6px; z-index: 1; opacity: 1; }

.card-content { position: absolute; top: 0; z-index: 2; text-align: center; width: 100%; padding: 6px 4px 15px 4px; border-radius: 6px 6px 0 0; }
.c-word { font-size: 1rem; font-weight: 900; color: #fff; word-break: break-all; line-height: 1.1; text-shadow: 1px 1px 0 #000; }
.c-zh { font-size: 0.7rem; color: #fff; margin-top: 2px; text-shadow: 1px 1px 0 #000; opacity: 0.9;}

.action-panel { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 95%; max-width: 550px; padding: 15px; z-index: 200; background: rgba(5, 20, 5, 0.98); box-shadow: 0 0 40px #000; border-color: #81c784; border-width: 3px; }

.m-slots { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-bottom: 12px;}
.m-slot { font-size: 1.5rem; font-weight: 900; color: #fff; border-bottom: 2px solid transparent; min-width: 20px; text-align: center;}
.m-slot.is-blank { color: #777; border-bottom-color: #777; }
.m-slot.is-blank.filled { color: #ffeb3b; border-bottom-color: #ffeb3b; text-shadow: 1px 1px 0 #000;}
.m-slot.is-space { min-width: 10px; border-bottom: none; }
.m-keyboard { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 500px; margin: 0 auto;}
.m-key { width: 42px; height: 42px; font-size: 1.3rem; display: flex; justify-content: center; align-items: center; border-radius: 6px; padding: 0; box-shadow: 0 4px 0 #1b5e20; }
.m-key:active:not(.used) { transform: translateY(4px); box-shadow: none; }
.m-key.used { opacity: 0.2; pointer-events: none; }

.fx-layer { position: absolute; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 260; }
.dmg-pop { font-size: 2.2rem; font-weight: 900; animation: floatTxt 1.2s ease-out forwards; white-space: nowrap; }
.dmg-pop.dmg { color: #ff3333; text-shadow: 2px 2px 0 #fff; }
.dmg-pop.heal { color: #4caf50; text-shadow: 2px 2px 0 #fff; }
.dmg-pop.sys { color: #ffeb3b; text-shadow: 2px 2px 0 #000; }
@keyframes floatTxt { 0% { opacity: 1; transform: translateY(0) scale(0.8); } 40% { transform: translateY(-30px) scale(1.3); } 100% { opacity: 0; transform: translateY(-60px) scale(1); } }

@media (min-width: 768px) {
    .opp-card { width: 60px; height: 90px; margin-left: -30px; }
    .center-area { gap: 40px; top: 40%; }
    .deck-stack, .top-card-spot { width: 120px; height: 180px; }
    .deck-label { bottom: -30px; font-size: 1.1rem; }
    
    .my-info { bottom: 230px; }
    .my-cards-container { height: 220px; gap: 15px; padding: 25px 20px; }
    .hand-card, .tarot-card { width: 120px; height: 180px; border-width: 4px; border-radius: 12px; }
    .c-word { font-size: 1.3rem; margin-bottom: 3px; }
    .c-zh { font-size: 0.9rem; margin-top: 5px; }
}
</style>