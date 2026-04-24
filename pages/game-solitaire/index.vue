<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
  ]
});

const supabase = useSupabaseClient();
const route = useRoute();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('setup'); // setup, playing, end
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
const score = ref(0);
let timer = null;

// 🌟 對錯追蹤
const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

const config = ref({ time_limit: 300, penalty: 5, blankCount: 3 });

// 🃏 撲克牌接龍狀態
const deck = ref([]);
const stock = ref([]);
const waste = ref([]);
const foundations = ref([[], [], [], []]); // 4個收牌區 ♠, ♥, ♦, ♣
const tableau = ref([[], [], [], [], [], [], []]); // 7個牌列
const selectedCard = ref(null); // 目前選中的牌 { source, colIndex, cardIndex, card }

const myTarget = ref(null); // 打字挑戰目標
const pendingAction = ref(null); // 紀錄拼寫成功後要執行的動作: { type: 'draw' } 或 { type: 'flip', col: idx }

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
  cardMove: () => playTone(300, 'triangle', 0.1, 0.05),
  flip: () => playTone(400, 'sine', 0.1, 0.05),
  type: () => playTone(800, 'square', 0.05, 0.05),
  correct: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.2), 100); },
  wrong: () => playTone(200, 'sawtooth', 0.3, 0.2),
  score: () => playTone(880, 'sine', 0.1, 0.1),
  win: () => { [523, 659, 783, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.2), i * 100)); }
};

// --- 初始化撲克牌 ---
const buildDeck = () => {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let newDeck = [];
    let id = 0;
    suits.forEach(suit => {
        const color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
        ranks.forEach((rank, index) => {
            newDeck.push({ id: id++, suit, rank, value: index + 1, color, faceUp: false });
        });
    });
    // 洗牌
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};

const dealCards = () => {
    deck.value = buildDeck();
    tableau.value = [[], [], [], [], [], [], []];
    foundations.value = [[], [], [], []];
    waste.value = [];
    
    // 發 7 個牌列
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            const card = deck.value.pop();
            if (i === j) card.faceUp = true;
            tableau.value[j].push(card);
        }
    }
    stock.value = deck.value; // 剩下的放牌堆
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.solitaire_time_limit) config.value.time_limit = settings.solitaire_time_limit;
        if (settings.solitaire_penalty) config.value.penalty = settings.solitaire_penalty;
        if (settings.solitaire_blank_count !== undefined) config.value.blankCount = settings.solitaire_blank_count;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 10) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 單元單字不足！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }
  } catch (e) { console.error(e); }
});

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    dealCards();
    score.value = 0;
    correctWordsList.value = [];
    wrongWordsList.value = [];
    mistakesCount.value = 0;
    gameStartTime.value = Date.now();
    gameStatus.value = 'playing'; 
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('時間到');
    }, 1000);
};

// --- 單字解鎖邏輯 ---
const triggerSpellingChallenge = (action) => {
    if (myTarget.value) return; 
    
    sfx.flip();
    pendingAction.value = action;
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

    myTarget.value = { word: pureWord, zh: randomWord.zh_tw, typedCount: 0, slots, targetChars, options };
};

const handleOptionClick = (opt) => {
    if (opt.used || !myTarget.value) return;
    if (opt.char === myTarget.value.targetChars[myTarget.value.typedCount]) {
        sfx.type(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;
        
        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            sfx.correct();
            finalizeAction(true);
        }
    } else { sfx.wrong(); }
};

const finalizeAction = (isSuccess) => {
    const action = pendingAction.value;
    const word = myTarget.value.word;
    myTarget.value = null;
    pendingAction.value = null;

    if (isSuccess) {
        if (!correctWordsList.value.includes(word)) correctWordsList.value.push(word);
        score.value += 10;
        
        if (action.type === 'draw') {
            const card = stock.value.pop();
            card.faceUp = true;
            waste.value.push(card);
        } else if (action.type === 'flip') {
            const col = tableau.value[action.col];
            col[col.length - 1].faceUp = true;
        }
    } else {
        if (!wrongWordsList.value.includes(word)) wrongWordsList.value.push(word);
        mistakesCount.value++;
        score.value = Math.max(0, score.value - config.value.penalty);
    }
};

// --- 遊戲操作與移動邏輯 ---
const selectCard = (source, colIndex, cardIndex, card) => {
    if (myTarget.value) return; 
    
    if (!card.faceUp) {
        if (source === 'tableau' && cardIndex === tableau.value[colIndex].length - 1) {
            triggerSpellingChallenge({ type: 'flip', col: colIndex });
        }
        return;
    }

    if (selectedCard.value) {
        if (selectedCard.value.card.id === card.id) {
            selectedCard.value = null; 
            return;
        }
        if (source === 'tableau' && cardIndex === tableau.value[colIndex].length - 1) {
            tryMoveToTableau(colIndex);
            return;
        }
    }

    selectedCard.value = { source, colIndex, cardIndex, card };
};

const handleStockClick = () => {
    if (myTarget.value) return;
    if (stock.value.length === 0) {
        if (waste.value.length > 0) {
            sfx.cardMove();
            stock.value = waste.value.reverse();
            stock.value.forEach(c => c.faceUp = false);
            waste.value = [];
            score.value = Math.max(0, score.value - 5); 
        }
    } else {
        triggerSpellingChallenge({ type: 'draw' });
    }
};

const tryMoveToTableau = (targetColIdx) => {
    if (!selectedCard.value) return;
    const targetCol = tableau.value[targetColIdx];
    const movingCard = selectedCard.value.card;
    
    let isValid = false;
    if (targetCol.length === 0) {
        if (movingCard.rank === 'K') isValid = true; 
    } else {
        const topCard = targetCol[targetCol.length - 1];
        if (movingCard.color !== topCard.color && movingCard.value === topCard.value - 1) isValid = true;
    }

    if (isValid) {
        executeMove(targetCol);
    } else {
        selectedCard.value = null; 
    }
};

const tryMoveToFoundation = (foundationIdx) => {
    if (!selectedCard.value) return;
    let isLastCard = false;
    if (selectedCard.value.source === 'waste' && selectedCard.value.cardIndex === waste.value.length - 1) isLastCard = true;
    if (selectedCard.value.source === 'tableau' && selectedCard.value.cardIndex === tableau.value[selectedCard.value.colIndex].length - 1) isLastCard = true;
    
    if (!isLastCard) { selectedCard.value = null; return; }

    const targetPile = foundations.value[foundationIdx];
    const movingCard = selectedCard.value.card;
    
    let isValid = false;
    if (targetPile.length === 0) {
        if (movingCard.rank === 'A') isValid = true; 
    } else {
        const topCard = targetPile[targetPile.length - 1];
        if (movingCard.suit === topCard.suit && movingCard.value === topCard.value + 1) isValid = true;
    }

    if (isValid) {
        executeMove(targetPile);
        sfx.score();
        score.value += 15; 
        checkWinCondition();
    } else {
        selectedCard.value = null;
    }
};

const executeMove = (targetArray) => {
    sfx.cardMove();
    const { source, colIndex, cardIndex } = selectedCard.value;
    
    if (source === 'waste') {
        targetArray.push(waste.value.pop());
    } else if (source === 'tableau') {
        const movingCards = tableau.value[colIndex].splice(cardIndex);
        targetArray.push(...movingCards);
    } else if (source === 'foundation') {
        targetArray.push(foundations.value[colIndex].pop());
    }
    selectedCard.value = null;
};

const checkWinCondition = () => {
    const totalInFoundation = foundations.value.reduce((sum, pile) => sum + pile.length, 0);
    if (totalInFoundation === 52) endGame('成功解出撲克接龍！');
};

const endGame = async (reason) => {
    gameStatus.value = 'end';
    clearInterval(timer);
    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reason} | 分數: ${score.value}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字撲克牌接龍', score: score.value, time_taken_seconds: timeSpent.value,
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
  <div class="solitaire-root">
    <header class="t-header retro-element">
      <h2 class="t-title">🃏 單字撲克牌接龍</h2>
      <div v-if="gameStatus === 'playing'" class="t-stats">
         <span style="color:#ffeb3b; margin-right:10px;">🏆 {{ score }}</span>
         <span>⏱️ {{ config.time_limit - timeSpent }}s</span>
      </div>
      <button class="retro-btn btn-small btn-danger" @click="quitGame">放棄</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 550px;">
        <div class="icon-big">♠️</div>
        <h2 style="color:#ffeb3b; margin-bottom: 10px;">撲克牌接龍</h2>
        
        <div class="rules-box" style="font-size: 0.95rem; line-height: 1.5; text-align: left; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; border: 1px dashed #4caf50;">
            <h3 style="color: #4caf50; text-align: center; margin-top: 0; margin-bottom: 10px;">📜 遊戲玩法說明 📜</h3>
            <p>1️⃣ <b>基本接龍規則</b>：<br>
               🔸 <b>排牌區 (下方)</b>：必須「<span style="color:#ff5252;">紅</span>黑相間」且「數字遞減」(如黑桃8接紅心7)。空位只能放 K。<br>
               🔸 <b>收牌區 (右上)</b>：必須「同花色」且「數字遞增」(從 A 收到 K)。全部收完即獲勝！
            </p>
            <p>2️⃣ <b>平板點擊操作 (免拖曳)</b>：<br>
               🔸 點擊要移動的牌 (會發出黃光) 👉 再點擊目標位置，符合規則即自動飛過去！再點一次可取消選取。
            </p>
            <p>3️⃣ <b>魔法翻牌 (單字挑戰)</b>：<br>
               🔸 點擊「左上牌堆抽牌」或「翻開下方蓋住的牌」時，需進行單字拼寫！<br>
               🔸 ✅ <b>拼對</b>：得 10 分並成功翻牌。<br>
               🔸 ❌ <b>拼錯/放棄</b>：扣 {{ config.penalty }} 分，動作取消，需重新點擊挑戰新單字！
            </p>
        </div>

        <button class="retro-btn btn-primary" style="margin-top:20px; width:100%; padding:15px; font-size: 1.3rem;" @click="startGame">發牌開始</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="game-board">
        
        <div class="top-row">
            <div class="deck-area">
                <div class="card-slot stock-slot" @click="handleStockClick">
                    <div v-if="stock.length > 0" class="playing-card facedown"></div>
                    <div v-else class="empty-icon">🔄</div>
                </div>
                <div class="card-slot">
                    <div v-if="waste.length > 0" class="playing-card faceup" :class="waste[waste.length-1].color" 
                         @click="selectCard('waste', 0, waste.length-1, waste[waste.length-1])"
                         :style="selectedCard?.card?.id === waste[waste.length-1].id ? 'box-shadow: 0 0 15px #ffeb3b; transform: translateY(-5px);' : ''">
                        <div class="c-corner">{{ waste[waste.length-1].rank }}<br>{{ waste[waste.length-1].suit }}</div>
                        <div class="c-center">{{ waste[waste.length-1].suit }}</div>
                    </div>
                </div>
            </div>

            <div class="foundations-area">
                <div v-for="(pile, idx) in foundations" :key="idx" class="card-slot foundation-slot" @click="tryMoveToFoundation(idx)">
                    <div v-if="pile.length === 0" class="suit-placeholder">{{ ['♠', '♥', '♦', '♣'][idx] }}</div>
                    <div v-else class="playing-card faceup" :class="pile[pile.length-1].color"
                         @click.stop="selectCard('foundation', idx, pile.length-1, pile[pile.length-1])"
                         :style="selectedCard?.card?.id === pile[pile.length-1].id ? 'box-shadow: 0 0 15px #ffeb3b; transform: translateY(-5px);' : ''">
                        <div class="c-corner">{{ pile[pile.length-1].rank }}<br>{{ pile[pile.length-1].suit }}</div>
                        <div class="c-center">{{ pile[pile.length-1].suit }}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="tableau-area">
            <div v-for="(col, colIdx) in tableau" :key="colIdx" class="tableau-col" @click="tryMoveToTableau(colIdx)">
                <div v-if="col.length === 0" class="empty-col-target"></div>
                <div v-for="(card, cardIdx) in col" :key="card.id" 
                     class="playing-card stack-card" 
                     :class="[card.faceUp ? 'faceup ' + card.color : 'facedown']"
                     :style="{ top: `${cardIdx * 25}px`, 
                               zIndex: cardIdx,
                               boxShadow: selectedCard?.card?.id === card.id ? '0 0 15px #ffeb3b, 0 0 0 2px #ffeb3b' : '' }"
                     @click.stop="selectCard('tableau', colIdx, cardIdx, card)">
                    
                    <template v-if="card.faceUp">
                        <div class="c-corner">{{ card.rank }}<br>{{ card.suit }}</div>
                        <div class="c-center">{{ card.suit }}</div>
                    </template>
                </div>
            </div>
        </div>

        <div class="action-panel retro-element" v-if="myTarget">
          <div class="typing-target" style="font-size: 1.5rem; color: #ffeb3b; text-align: center; margin-bottom:10px;">{{ myTarget.zh }}</div>
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
          <button class="retro-btn btn-danger" style="margin-top:10px; width:100%; padding: 8px;" @click="() => { 
              sfx.wrong(); finalizeAction(false); 
          }">放棄 (扣分)</button>
      </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>牌局結束</h1>
          <p class="winner-text" style="color:#4caf50;">得分：{{ score }}</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ errorMsg || '時間到或通關' }}</p>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
       </div>
    </div>

  </div>
</template>

<style scoped>
.solitaire-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #006633; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: rgba(0, 0, 0, 0.85); border: 2px solid #ccc; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); padding: 10px; box-sizing: border-box; }
.retro-btn { background: #333; color: #fff; border: 2px solid #777; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.1s; }
.retro-btn:active:not(:disabled) { transform: translateY(3px); }
.btn-primary { background: #1976d2; border-color: #42a5f5; }
.btn-danger { background: #d32f2f; border-color: #e57373; }
.btn-small { padding: 5px 10px; }

.t-header { display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 10px;}
.t-title { margin: 0; font-size: 1.1rem; }
.t-stats { font-weight: bold; font-size: 1.1rem; }

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 450px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.rules-box { text-align: left; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; font-size: 0.95rem; }

/* 🌟 遊戲桌面佈局 */
.game-board { flex: 1; display: flex; flex-direction: column; padding: 5px; gap: 15px; position: relative; }
.top-row { display: flex; justify-content: space-between; width: 100%; max-width: 800px; margin: 0 auto; }
.deck-area { display: flex; gap: 10px; }
.foundations-area { display: flex; gap: 10px; }

/* 🌟 純 CSS 撲克牌設計 */
.card-slot { width: 45px; height: 65px; border: 2px dashed rgba(255,255,255,0.3); border-radius: 5px; position: relative; display: flex; justify-content: center; align-items: center; }
.suit-placeholder { font-size: 2rem; color: rgba(255,255,255,0.2); }
.empty-icon { font-size: 2rem; opacity: 0.5; }

.playing-card { 
    position: absolute; top: 0; left: 0; width: 45px; height: 65px; 
    border-radius: 4px; box-shadow: 1px 2px 5px rgba(0,0,0,0.5); 
    display: flex; justify-content: center; align-items: center; 
    cursor: pointer; user-select: none; transition: transform 0.1s;
}
.playing-card.faceup { background: #fff; border: 1px solid #ccc; }
.playing-card.facedown { background: repeating-linear-gradient(45deg, #1565c0, #1565c0 5px, #0d47a1 5px, #0d47a1 10px); border: 2px solid #fff; }
.playing-card.red { color: #d32f2f; }
.playing-card.black { color: #212121; }

.c-corner { position: absolute; top: 2px; left: 3px; font-size: 0.8rem; font-weight: bold; line-height: 0.9; text-align: center; }
.c-center { font-size: 1.8rem; }

/* 7 列排隊區 */
.tableau-area { display: flex; justify-content: space-between; width: 100%; max-width: 800px; margin: 0 auto; flex: 1; position: relative; }
.tableau-col { width: 45px; position: relative; min-height: 200px; }
.empty-col-target { width: 100%; height: 65px; border: 2px dashed rgba(255,255,255,0.2); border-radius: 5px; }
.stack-card { position: absolute; left: 0; width: 100%; }

/* 🎮 打字面板 */
.action-panel { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 95%; max-width: 500px; z-index: 200; border-color: #ffeb3b; }
.m-slots { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; margin-bottom: 15px;}
.m-slot { font-size: 1.5rem; font-weight: bold; border-bottom: 2px solid #777; min-width: 20px; text-align: center; padding: 0 2px;}
.m-slot.filled { color: #4caf50; border-color: #4caf50; }
.m-keyboard { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;}
.m-key { width: 40px; height: 40px; font-size: 1.2rem; padding: 0; display: flex; justify-content: center; align-items: center;}
.m-key.used { opacity: 0.2; pointer-events: none;}

@media (min-width: 768px) {
    .card-slot, .playing-card, .empty-col-target { width: 70px; height: 100px; border-radius: 6px; }
    .c-corner { font-size: 1rem; top: 5px; left: 5px; }
    .c-center { font-size: 3rem; }
    .tableau-col { width: 70px; }
    .stack-card { top: 0; }
    /* PC端展開距離加大 */
    .tableau-col .stack-card { transition: top 0.3s; }
}
</style>