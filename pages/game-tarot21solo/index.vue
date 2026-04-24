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

const matchStatus = ref('setup'); // setup, playing, end
const playMode = ref(''); // 'classic' (無對手) 或 'ai' (對抗莊家)
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
let timer = null;

const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);
const gameScore = ref(0); // 記錄最終得分

// 🌟 接收資料庫的變數 (預設值)
const config = ref({ 
    card_set: '1', 
    card_set_kangxuan: '1k', 
    hp: 30, 
    time_limit: 15, 
    penalty: 3, 
    win_damage: 10, 
    blankCount: 3 
});

// 🌟 玩家與 AI 莊家的狀態
const player = ref({ name: '我方', hp: 30, maxHp: 30, cards: [], score: 0, status: 'playing' });
const dealer = ref({ name: '命運莊家', hp: 30, maxHp: 30, cards: [], score: 0, status: 'playing' });

const myTarget = ref(null); 
const effects = ref([]);
const isResolving = ref(false); 
const winner = ref('');
const endReason = ref('');

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
  bust: () => { playTone(150, 'sawtooth', 0.3, 0.3); setTimeout(() => playTone(100, 'sawtooth', 0.5, 0.3), 300); }, 
  stand: () => playTone(440, 'sine', 0.2, 0.1), 
  damage: () => { playTone(100, 'square', 0.2, 0.3); setTimeout(() => playTone(50, 'square', 0.3, 0.3), 100); },
  winRound: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3), i * 150)); },
  jackpot: () => { [1046, 1318, 1568, 2093].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.1), i * 100)); }
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

const drawRandomWords = (count, excludeWords = []) => {
    let availableWords = allWords.value.filter(w => {
        const pure = w.en_us.replace(/[^a-zA-Z\s-]/g, '').trim().toLowerCase();
        return !excludeWords.includes(pure);
    });
    if (availableWords.length < count) availableWords = [...allWords.value]; 

    return Array.from({length: count}).map(() => {
        const idx = Math.floor(Math.random() * availableWords.length);
        const w = availableWords[idx];
        availableWords.splice(idx, 1);
        const pureWord = w.en_us.replace(/[^a-zA-Z\s-]/g, '').trim().toLowerCase();
        excludeWords.push(pureWord);
        return { id: Date.now() + Math.random(), word: pureWord, zh: w.zh_tw };
    });
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.tarot21solo_card_set) config.value.card_set = settings.tarot21solo_card_set;
        if (settings.tarot21solo_card_set_kangxuan) config.value.card_set_kangxuan = settings.tarot21solo_card_set_kangxuan;
        if (settings.tarot21solo_hp) config.value.hp = settings.tarot21solo_hp;
        if (settings.tarot21solo_time_limit) config.value.time_limit = settings.tarot21solo_time_limit;
        if (settings.tarot21solo_penalty) config.value.penalty = settings.tarot21solo_penalty;
        if (settings.tarot21solo_win_damage) config.value.win_damage = settings.tarot21solo_win_damage;
        if (settings.tarot21solo_blank_count !== undefined) config.value.blankCount = settings.tarot21solo_blank_count;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 10) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 該單元單字數量不足！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }

  } catch (e) { console.error(e); }
});

const spawnEffect = (target, text, type) => {
    const id = Date.now() + Math.random();
    effects.value.push({ id, target, text, type });
    setTimeout(() => { effects.value = effects.value.filter(e => e.id !== id); }, 1500); 
};

// 🌟 啟動遊戲 (帶入選擇的模式)
const startGame = (mode) => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    
    playMode.value = mode;
    player.value = { name: studentCookie.value.name, hp: config.value.hp, maxHp: config.value.hp, cards: [], score: 0, status: 'playing' };
    dealer.value = { name: '命運莊家', hp: config.value.hp, maxHp: config.value.hp, cards: [], score: 0, status: 'playing' };
    
    correctWordsList.value = [];
    wrongWordsList.value = [];
    mistakesCount.value = 0;
    gameScore.value = 0;

    matchStatus.value = 'playing'; 
    gameStartTime.value = Date.now();
    timer = setInterval(() => { timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); }, 1000);
    startRound();
};

const startRound = () => {
    player.value.score = 0; player.value.cards = []; player.value.status = 'playing';
    dealer.value.score = 0; dealer.value.cards = []; dealer.value.status = 'playing';
    isResolving.value = false;
};

// ==========================================
// 🎮 玩家操作邏輯
// ==========================================
const canPlay = computed(() => {
    return matchStatus.value === 'playing' && !isResolving.value && player.value.status === 'playing';
});

const drawCard = () => {
    if (!canPlay.value || myTarget.value) return;

    sfx.draw();
    const usedWords = player.value.cards.map(c => c.word);
    const newCardData = drawRandomWords(1, usedWords)[0];
    const pureWord = newCardData.word;
    const cardId = newCardData.id;
    
    const letterOnlyLen = pureWord.replace(/[\s-]/g, '').length;
    let numBlanks = Math.max(1, Math.min(config.value.blankCount || 3, letterOnlyLen));
    
    let indices = [];
    while(indices.length < numBlanks) {
        let r = Math.floor(Math.random() * pureWord.length);
        if(!indices.includes(r) && pureWord[r] !== ' ' && pureWord[r] !== '-') indices.push(r);
    }
    indices.sort((a,b) => a - b); 

    const slots = pureWord.split('').map((char, idx) => ({ 
        char: char, 
        isBlank: indices.includes(idx), 
        filled: !indices.includes(idx) 
    }));
    const targetChars = indices.map(idx => pureWord[idx]);
    
    let opts = [...targetChars];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    while(opts.length < Math.max(targetChars.length + 4, 10)) opts.push(alphabet[Math.floor(Math.random() * 26)]); 
    const options = opts.sort(() => 0.5 - Math.random()).map((char, idx) => ({ id: idx, char, used: false }));

    const points = letterOnlyLen;

    player.value.cards.push({ id: cardId, state: 'typing', word: pureWord, points: points, zh: newCardData.zh });

    myTarget.value = {
        word: pureWord, zh: newCardData.zh, typedCount: 0,
        timeRemaining: config.value.time_limit, cardId: cardId, points: points,
        timerId: setInterval(handleTypingTimeout, 1000),
        slots, targetChars, options 
    };
};

const handleOptionClick = (opt) => {
    if (opt.used || !myTarget.value || matchStatus.value !== 'playing') return;
    
    if (opt.char.toLowerCase() === myTarget.value.targetChars[myTarget.value.typedCount].toLowerCase()) {
        sfx.type(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;
        
        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            sfx.correct();
            clearInterval(myTarget.value.timerId);
            finalizeCard(true);
        }
    } else { sfx.wrong(); }
};

const handleTypingTimeout = () => {
    if (!myTarget.value) return;
    myTarget.value.timeRemaining--;
    if (myTarget.value.timeRemaining <= 0) {
        clearInterval(myTarget.value.timerId);
        sfx.wrong();
        finalizeCard(false); 
    }
};

const finalizeCard = (isSuccess) => {
    if (!myTarget.value) return;

    const cardId = myTarget.value.cardId;
    const points = myTarget.value.points; 
    const word = myTarget.value.word; 
    
    myTarget.value = null; 

    if (isSuccess) {
        if (!correctWordsList.value.includes(word)) correctWordsList.value.push(word);

        const card = player.value.cards.find(c => c.id === cardId);
        if (card) { card.state = 'resolved'; card.points = points; }
        player.value.score += points;
        spawnEffect('player', `+${points}點`, 'heal');

        // 💥 玩家爆牌邏輯
        if (player.value.score > 21) {
            sfx.bust();
            player.value.status = 'busted';
            spawnEffect('player', 'BUSTED!', 'dmg');
            
            if (playMode.value === 'ai') {
                setTimeout(dealerTurn, 1000); 
            } else {
                // 經典模式爆牌：扣血，換下一副牌
                player.value.hp -= config.value.penalty;
                if (player.value.hp <= 0) setTimeout(() => endGame('系統', '生命值歸零'), 1500);
                else setTimeout(startRound, 1500);
            }
        }
    } else {
        if (!wrongWordsList.value.includes(word)) wrongWordsList.value.push(word);
        mistakesCount.value++;

        const idx = player.value.cards.findIndex(c => c.id === cardId);
        if (idx !== -1) player.value.cards[idx].state = 'burned'; 
        
        player.value.hp -= config.value.penalty;
        spawnEffect('player', `失敗 -${config.value.penalty}`, 'dmg');
        
        if (player.value.hp <= 0) {
            endGame('系統', '卡牌反噬，生命值歸零');
            return;
        }
    }
};

const stand = () => {
    if (!canPlay.value || myTarget.value) return;
    sfx.stand();
    player.value.status = 'standing';
    spawnEffect('player', '停牌', 'sys');
    
    if (playMode.value === 'ai') {
        setTimeout(dealerTurn, 1000);
    } else {
        // 🌟 經典模式停牌計分邏輯
        let earned = player.value.score * 10;
        if (player.value.score === 21) {
            earned += 100; // Blackjack 大獎！
            sfx.jackpot();
            spawnEffect('player', 'BLACKJACK!', 'heal');
        } else {
            sfx.winRound();
        }
        gameScore.value += earned;
        spawnEffect('player', `+${earned}分`, 'heal');
        setTimeout(startRound, 1500);
    }
};

// ==========================================
// 🤖 AI 莊家邏輯 (僅對戰模式使用)
// ==========================================
const dealerTurn = () => {
    if (player.value.hp <= 0) return;

    const drawDealerCard = () => {
        if (dealer.value.score < 17 && dealer.value.score <= player.value.score && player.value.status !== 'busted') {
            sfx.draw();
            const usedWords = dealer.value.cards.map(c => c.word);
            const newCardData = drawRandomWords(1, usedWords)[0];
            const pureWord = newCardData.word;
            const points = pureWord.replace(/[\s-]/g, '').length;
            
            dealer.value.cards.push({ id: Date.now(), state: 'hidden', word: pureWord, points: points, zh: newCardData.zh });
            setTimeout(() => {
                sfx.correct();
                dealer.value.cards[dealer.value.cards.length - 1].state = 'resolved';
                dealer.value.score += points;
                spawnEffect('dealer', `+${points}點`, 'heal');
                
                if (dealer.value.score > 21) {
                    sfx.bust();
                    dealer.value.status = 'busted';
                    spawnEffect('dealer', 'BUSTED!', 'dmg');
                    setTimeout(resolveRound, 1500);
                } else {
                    setTimeout(drawDealerCard, 1200);
                }
            }, 800);
        } else {
            sfx.stand();
            dealer.value.status = 'standing';
            spawnEffect('dealer', '停牌', 'sys');
            setTimeout(resolveRound, 1500);
        }
    };

    drawDealerCard();
};

const resolveRound = () => {
    isResolving.value = true;
    let pScore = player.value.status === 'busted' ? 0 : player.value.score;
    let dScore = dealer.value.status === 'busted' ? 0 : dealer.value.score;
    
    let roundWinner = null;
    let damage = 0;
    const winDmg = Number(config.value.win_damage);

    if (pScore > dScore) {
        roundWinner = 'player';
        damage = winDmg + (pScore - dScore);
        dealer.value.hp = Math.max(0, dealer.value.hp - damage);
        gameScore.value += damage * 10; // 莊家扣血，玩家加分
    } else if (dScore > pScore) {
        roundWinner = 'dealer';
        damage = winDmg + (dScore - pScore);
        player.value.hp = Math.max(0, player.value.hp - damage);
    } else {
        roundWinner = 'tie';
    }

    sfx.damage();
    if (roundWinner === 'player') spawnEffect('dealer', `-${damage}`, 'dmg');
    else if (roundWinner === 'dealer') spawnEffect('player', `-${damage}`, 'dmg');
    else { spawnEffect('player', '平局', 'sys'); spawnEffect('dealer', '平局', 'sys'); }

    if (player.value.hp <= 0 || dealer.value.hp <= 0) {
        const finalWinner = player.value.hp <= 0 ? '命運莊家' : player.value.name;
        setTimeout(() => endGame(finalWinner, '生命值歸零'), 1500);
    } else {
        setTimeout(startRound, 3500);
    }
};

const getCardTransform = (i, cardId, isPlayer) => {
    if (isPlayer && myTarget.value && myTarget.value.cardId === cardId) {
        return 'translateX(-50%) translateY(-200px) scale(1.15)';
    }
    const len = isPlayer ? player.value.cards.length : dealer.value.cards.length;
    const offset = (i - (len - 1) / 2);
    const spacing = typeof window !== 'undefined' && window.innerWidth < 600 ? 35 : 55; 
    return `translateX(calc(-50% + ${offset * spacing}px)) rotate(${offset * 5}deg)`;
};

const endGame = async (winName, reasonText) => {
    if (matchStatus.value === 'end') return; 
    matchStatus.value = 'end'; 
    winner.value = winName || '無'; 
    endReason.value = reasonText; 
    
    sfx.winRound();
    clearInterval(timer); 
    if (myTarget.value && myTarget.value.timerId) clearInterval(myTarget.value.timerId);

    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reasonText} | 模式: ${playMode.value === 'ai' ? '對戰AI' : '經典單人'}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');

        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單人塔羅21點', score: gameScore.value, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: cw, wrong_words: wrongWordsList.value.join(', '), mistakes: mistakesCount.value 
        }]);
    }
};

const leaveLobby = () => { navigateTo('/'); };

onUnmounted(() => { 
    clearInterval(timer); 
    if (myTarget.value && myTarget.value.timerId) clearInterval(myTarget.value.timerId);
});
</script>

<template>
  <div class="tarot-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🃏 單字塔羅21點</h2>
      <div v-if="matchStatus === 'playing'" class="t-timer" style="color:#4caf50;">總分: {{ gameScore }}</div>
      <button class="retro-btn btn-small" @click="leaveLobby">離開牌桌</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="matchStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 600px;">
        <div class="icon-big">🔮</div>
        <h2 style="color:#ffeb3b; margin-bottom: 20px;">選擇挑戰模式</h2>
        
        <div class="mode-selection">
            <div class="mode-card retro-element" @click="startGame('classic')">
                <div style="font-size: 3rem; margin-bottom: 10px;">🃏</div>
                <h3 style="color:#4caf50; margin:0 0 10px 0;">經典極限抽牌</h3>
                <p style="font-size: 0.9rem; color:#ccc; margin:0;">無對手模式。不斷抽牌逼近21點，點擊停牌賺取大量積分！如果爆牌將扣除血量。</p>
            </div>
            
            <div class="mode-card retro-element" @click="startGame('ai')">
                <div style="font-size: 3rem; margin-bottom: 10px;">🤖</div>
                <h3 style="color:#f44336; margin:0 0 10px 0;">命運莊家對決</h3>
                <p style="font-size: 0.9rem; color:#ccc; margin:0;">與 AI 莊家較量點數！停牌後莊家將自動補牌，點數大者勝出並扣除對方血量！</p>
            </div>
        </div>
      </div>
    </div>

    <div v-else-if="matchStatus === 'playing' || matchStatus === 'end'" class="table-container">

      <div class="player-area opp-area" v-if="playMode === 'ai'">
          <div class="player-info retro-element my-info" style="margin-bottom: 10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div class="p-name">{{ dealer.name }}</div>
                    <div class="hp-bar-bg" style="width: 150px;"><div class="hp-bar-fill" :style="{ width: `${(dealer.hp / config.hp) * 100}%` }"></div></div>
                    <div class="p-hp">HP: {{ dealer.hp }}</div>
                  </div>
                  <div class="p-score" :class="{'busted-text': dealer.status === 'busted'}">
                      點數: <span style="color:#ffeb3b; font-size:1.4rem;">{{ dealer.score }}</span>
                      <span v-if="dealer.status === 'standing'" style="color:#ffeb3b; font-size: 0.8rem; margin-left: 5px;">(停牌)</span>
                      <span v-if="dealer.status === 'busted'" style="color:#f44336; font-size: 0.8rem; margin-left: 5px;">(爆牌)</span>
                  </div>
              </div>
          </div>
          
          <div class="cards-row opp-cards">
              <div v-for="(card, i) in dealer.cards" :key="card.id" class="tarot-card" :class="card.state" :style="{ zIndex: i, left: '50%', transform: getCardTransform(i, card.id, false) }">
                  <div class="card-back-pattern"></div>
                  <img v-if="card.state === 'resolved' && card.word" :src="getCardImage(card.word)" class="card-bg" @error="handleImageError" />
                  
                  <div v-if="card.state === 'resolved'" class="card-content">
                      <div class="c-word">{{ card.word }}</div>
                      <div class="c-point">{{ card.points }}</div>
                  </div>
              </div>
              
              <div class="fx-layer" v-for="eff in effects.filter(e => e.target === 'dealer')" :key="eff.id">
                 <div class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
              </div>
          </div>
      </div>

      <div class="deck-area" style="top: 45%; left: 50%; transform: translate(-50%, -50%);">
          <div class="deck-stack">
              <div class="deck-card card-back-pattern" style="transform: rotate(-5deg) translate(-5px, 5px);"></div>
              <div class="deck-card card-back-pattern" style="transform: rotate(2deg) translate(2px, -2px);"></div>
              <div class="deck-card card-back-pattern"></div>
          </div>
      </div>

      <div class="player-area my-area">
          <div class="cards-row my-cards">
              <div v-for="(card, i) in player.cards" :key="card.id" 
                   class="tarot-card" 
                   :class="[card.state, {'typing': myTarget && myTarget.cardId === card.id}]" 
                   :style="{ 
                       zIndex: myTarget && myTarget.cardId === card.id ? 100 : i, 
                       left: '50%',
                       transform: getCardTransform(i, card.id, true)
                   }">
                  <div class="card-back-pattern"></div>
                  <img v-if="(card.state === 'resolved' || card.state === 'burned' || card.state === 'typing') && card.word" :src="getCardImage(card.word)" class="card-bg" @error="handleImageError" />
                  
                  <div v-if="card.state === 'resolved' || card.state === 'typing'" class="card-content">
                      <div class="c-word">{{ card.word }}</div>
                      <div class="c-zh">{{ card.zh }}</div>
                      <div v-if="card.state === 'resolved'" class="c-point">{{ card.points }}</div>
                  </div>
                  <div v-if="card.state === 'burned'" class="burned-mark">🔥</div>
              </div>

              <div class="fx-layer" v-for="eff in effects.filter(e => e.target === 'player')" :key="eff.id">
                 <div class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
              </div>
          </div>

          <div class="player-info retro-element my-info" style="position:absolute; bottom: 10px; left:50%; transform:translateX(-50%); width: 95%; max-width: 500px; padding: 10px;">
              <div style="display:flex; justify-content:space-between; align-items:stretch; gap: 10px;">
                  <div style="flex: 1; display:flex; flex-direction:column; justify-content:space-between;">
                      <div class="p-score huge-score" :class="{'busted-text': player.status === 'busted'}" style="line-height: 1;">
                          {{ player.score }} <span style="font-size:1rem; color:#fff;">點</span>
                      </div>
                      <div>
                          <div class="p-name">我方血量</div>
                          <div class="hp-bar-bg" style="width: 100%; max-width: 120px;"><div class="hp-bar-fill" :style="{ width: `${(player.hp / config.hp) * 100}%` }"></div></div>
                      </div>
                  </div>
                  
                  <div style="flex: 1.2; display: flex; flex-direction: column; gap: 8px;">
                      <template v-if="canPlay && !myTarget">
                          <button class="retro-btn btn-primary" @click="drawCard" style="flex: 1; padding: 0; font-size: 1.1rem; box-shadow: 0 3px 0 #1b5e20;">🃏 抽牌</button>
                          <button class="retro-btn btn-danger" @click="stand" :disabled="player.score === 0" style="flex: 1; padding: 0; font-size: 1.1rem; box-shadow: 0 3px 0 #b71c1c;">🛑 停牌結算</button>
                      </template>
                      <template v-else-if="!canPlay && !myTarget">
                          <div style="flex:1; display:flex; align-items:center; justify-content:center; text-align:center; color:#ffeb3b; font-weight:bold; font-size: 1rem; background: rgba(0,0,0,0.5); border-radius: 6px;">
                              <span v-if="isResolving">命運結算中 ⏳</span>
                              <span v-else-if="player.status === 'standing' && playMode === 'ai'">莊家回合<br>等待中...</span>
                              <span v-else-if="player.status === 'busted' && playMode === 'ai'" style="color:#f44336;">您已爆牌<br>莊家回合...</span>
                              <span v-else-if="player.status === 'busted' && playMode === 'classic'" style="color:#f44336;">爆牌懲罰！<br>下回合準備</span>
                          </div>
                      </template>
                  </div>
              </div>
          </div>
      </div>

      <div class="action-panel retro-element" v-if="myTarget">
          <div class="typing-header">
              <span style="color:#ffeb3b;">解鎖倒數: {{ myTarget.timeRemaining }}s</span>
              <span style="color:#4caf50;">卡牌點數: {{ myTarget.points }} 點</span>
          </div>
          <div class="typing-target" style="font-size: 1.2rem; color: #ccc;">{{ myTarget.zh }}</div>
          
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
          <button class="retro-btn btn-danger" style="margin-top:10px; width:100%; font-size: 1.1rem; padding: 8px;" @click="() => { 
              if (myTarget && myTarget.timerId) clearInterval(myTarget.timerId);
              sfx.wrong();
              finalizeCard(false);
          }">放棄拼寫 (承受反噬)</button>
      </div>

    </div>

    <div v-if="matchStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>對局結束</h1>
          <p class="winner-text" style="color:#ffeb3b; font-size: 2rem;">總得分：{{ gameScore }}</p>
          <p class="winner-text" style="font-size: 1.2rem;" v-if="playMode === 'ai'">戰鬥結果：{{ winner === player.name ? '勝利 🏆' : '戰敗 💀' }}</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px; margin-top: 10px;">原因：{{ endReason }}</p>
          <button @click="leaveLobby" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">離開牌桌</button>
       </div>
    </div>
  </div>
</template>

<style scoped>
.tarot-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0a0a1a; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: rgba(10, 10, 40, 0.85); border: 2px solid #5c6bc0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); color: #fff; padding: 10px; box-sizing: border-box; backdrop-filter: blur(5px); }
.retro-btn { background: #283593; color: #fff; border: 2px solid #7986cb; border-radius: 6px; font-family: inherit; font-weight: bold; cursor: pointer; padding: 10px 15px; box-shadow: 0 4px 0 #1a237e; transition: 0.1s; }
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; }
.btn-primary { background: #388e3c; border-color: #81c784; box-shadow: 0 4px 0 #1b5e20; }
.btn-danger { background: #d32f2f; border-color: #e57373; box-shadow: 0 4px 0 #b71c1c; }
.btn-small { padding: 5px 10px; font-size: 1rem; box-shadow: 0 2px 0 #1a237e; }

/* 🌟 模式選擇設計 */
.mode-selection { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
.mode-card { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; cursor: pointer; transition: 0.2s; border-width: 3px; }
.mode-card:hover { transform: scale(1.02); background: rgba(30, 30, 80, 0.95); border-color: #ffeb3b; }
.mode-card:active { transform: scale(0.98); }

@media (min-width: 768px) {
    .mode-selection { flex-direction: row; }
    .mode-card { flex: 1; }
}

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 450px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; text-shadow: 0 0 20px rgba(255,255,255,0.5); }
.rules-box { text-align: left; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; border: 1px dashed #7986cb; font-size: 0.95rem; }

.table-container { flex: 1; display: flex; flex-direction: column; position: relative; background: radial-gradient(circle at center, #1a237e 0%, #050510 100%); overflow: hidden; }

.player-area { flex: 1; display: flex; flex-direction: column; padding: 15px; position: relative; transition: 0.3s; }
.opp-area { justify-content: flex-start; }
.my-area { justify-content: flex-end; }

.player-info { display: flex; flex-direction: column; width: 160px; padding: 8px 12px; background: rgba(0,0,0,0.7); z-index: 20;}
.my-info { width: 100%; flex-direction: row; justify-content: space-between; max-width: 500px; margin: 0 auto; position: relative;}
.p-name { font-weight: bold; color: #c5cae9; font-size: 0.95rem; margin-bottom: 4px; }
.hp-bar-bg { width: 100%; height: 8px; background: #333; border: 1px solid #555; border-radius: 4px; overflow: hidden; margin-bottom: 2px;}
.hp-bar-fill { height: 100%; background: #4caf50; transition: width 0.3s; }
.p-hp { font-size: 0.75rem; color: #aaa; margin-bottom: 4px; }
.p-score { font-size: 1.2rem; font-weight: 900; color: #fff; text-shadow: 1px 1px 0 #000; }
.huge-score { font-size: 2.2rem; color: #ffeb3b; }
.busted-text { color: #f44336; text-decoration: line-through; text-shadow: none; }

.cards-row { position: absolute; height: 140px; width: 100%; }
.opp-cards { top: 20px; left: 0; width: 100%; }
.my-cards { bottom: 120px; left: 0; width: 100%; }

.tarot-card { 
    position: absolute; width: 90px; height: 135px; border-radius: 8px;
    background: #000; border: 2px solid #5c6bc0; box-shadow: 2px 4px 12px rgba(0,0,0,0.8);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); overflow: hidden; cursor: pointer;
}

.card-back-pattern { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(45deg, #1a237e, #1a237e 10px, #283593 10px, #283593 20px); border-radius: 6px; z-index: 0; box-shadow: inset 0 0 15px rgba(0,0,0,0.8); }
.card-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 6px; z-index: 1; opacity: 1; filter: none; }

.typing { border-color: #ff9800 !important; box-shadow: 0 0 40px rgba(255,152,0,1) !important; z-index: 150 !important; }
.hidden .card-back-pattern { opacity: 1; }
.burned { border-color: #f44336; background: #3e2723; filter: grayscale(80%) sepia(50%); }

.card-content { position: absolute; top: 0; z-index: 2; text-align: center; width: 100%; padding: 6px 4px 15px 4px; background: linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, transparent 100%); border-radius: 6px 6px 0 0; }
.c-word { font-size: 0.95rem; font-weight: 900; color: #fff; word-break: break-all; line-height: 1.1; text-shadow: 1px 1px 0 #000; }
.c-zh { font-size: 0.65rem; color: #ffcc80; margin-top: 4px; text-shadow: 1px 1px 0 #000; }
.c-point { font-size: 1.1rem; font-weight: bold; color: #ffeb3b; text-shadow: 1px 1px 0 #000; margin-top: 2px;}

.burned-mark { position: absolute; font-size: 3.5rem; z-index: 3; animation: shake 0.5s infinite; }

.deck-area { position: absolute; z-index: 10; }
.deck-stack { position: relative; width: 90px; height: 135px; }
.deck-card { position: absolute; width: 100%; height: 100%; border-radius: 8px; border: 2px solid #5c6bc0; box-shadow: -2px 2px 5px rgba(0,0,0,0.6); }

.action-panel { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); width: 95%; max-width: 550px; padding: 10px 15px; z-index: 200; background: rgba(5, 5, 20, 0.98); box-shadow: 0 0 30px #000; border-color: #ff9800; border-width: 3px; }

.typing-header { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; }
.typing-target { font-size: 1.6rem; font-weight: 900; text-align: center; color: #fff; margin-bottom: 8px; letter-spacing: 2px; }

.m-slots { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-bottom: 8px;}
.m-slot { font-size: 1.5rem; font-weight: 900; color: #fff; border-bottom: 2px solid transparent; min-width: 20px; text-align: center;}
.m-slot.is-blank { color: #777; border-bottom-color: #777; }
.m-slot.is-blank.filled { color: #ffeb3b; border-bottom-color: #ffeb3b; text-shadow: 1px 1px 0 #000;}
.m-slot.is-space { min-width: 10px; border-bottom: none; }

.m-keyboard { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 500px; margin: 0 auto;}
.m-key { width: 42px; height: 42px; font-size: 1.3rem; display: flex; justify-content: center; align-items: center; border-radius: 6px; padding: 0; box-shadow: 0 4px 0 #1a237e; }
.m-key:active:not(.used) { transform: translateY(4px); box-shadow: none; }
.m-key.used { opacity: 0.2; pointer-events: none; }

.fx-layer { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 60; }
.dmg-pop { font-size: 2.2rem; font-weight: 900; animation: floatTxt 1.2s ease-out forwards; white-space: nowrap; }
.dmg-pop.dmg { color: #ff3333; text-shadow: 2px 2px 0 #fff; }
.dmg-pop.heal { color: #4caf50; text-shadow: 2px 2px 0 #fff; }
.dmg-pop.sys { color: #ffeb3b; text-shadow: 2px 2px 0 #000; }
@keyframes floatTxt { 0% { opacity: 1; transform: translateY(0) scale(0.8); } 40% { transform: translateY(-30px) scale(1.3); } 100% { opacity: 0; transform: translateY(-60px) scale(1); } }

@media (min-width: 768px) {
    .tarot-card { width: 110px; height: 165px; }
    .c-word { font-size: 1.2rem; }
    .deck-stack { width: 110px; height: 165px; }
    .my-cards { bottom: 150px; }
}
</style>