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

const matchStatus = ref('setup'); 
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
let timer = null;
let pollTimer = null; 
let syncTimer = null; 

// 🌟 鍊金術專屬：爆牌上限 50 點
const BUST_LIMIT = 50;

// 🌟 逃跑禁賽變數
const maxEscapes = ref(20);
const todayEscapesCount = ref(0);

// 🌟 紀錄對錯單字的變數
const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

const config = ref({ card_set: '1', hp: 50, time_limit: 20, penalty: 5, win_damage: 10, blankCount: 3 });

const myPlayerRole = ref(null); 
const currentRoomId = ref(null);

const players = ref({
    p1: { id: '', name: '', hp: 50, maxHp: 50, cards: [], score: 0, status: 'playing' }, 
    p2: { id: '', name: '', hp: 50, maxHp: 50, cards: [], score: 0, status: 'playing' } 
});

const myTarget = ref(null); 
const effects = ref([]);
let roomSubscription = null;
let gameChannel = null;

const isResolving = ref(false); 
const isRevealedAll = computed(() => isResolving.value || matchStatus.value === 'end');

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
  winRound: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3), i * 150)); }
};

const getCardImage = (word) => {
    let setNum = config.value.card_set;
    if (setNum === 'random') setNum = Math.floor(Math.random() * 3) + 1;
    if (!word) return ''; 
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return `https://pyfbsdk59.github.io/tarot-cards-${setNum}/${cleanWord}.webp`;
};

const handleImageError = (e) => { e.target.style.display = 'none'; };

// 🌟 塔羅鍊金術：稀有字母計分系統
const getAlchemyScore = (word) => {
    const scores = { a:1, e:1, i:1, o:1, u:1, l:1, n:1, s:1, t:1, r:1, d:2, g:2, b:3, c:3, m:3, p:3, f:4, h:4, v:4, w:4, y:4, k:5, j:8, x:8, q:10, z:10 };
    let total = 0;
    for (let char of word.toLowerCase()) { if (scores[char]) total += scores[char]; }
    return total;
};

// 防撞號隨機抽牌
const drawRandomCards = (count) => {
    const usedWords = [];
    if (myPlayerRole.value && players.value[myPlayerRole.value]) {
        players.value[myPlayerRole.value].cards.forEach(c => usedWords.push(c.word));
    }
    let availableWords = allWords.value.filter(w => {
        const pure = w.en_us.replace(/[^a-zA-Z]/g, '').toLowerCase();
        return !usedWords.includes(pure);
    });
    if (availableWords.length < count) availableWords = [...allWords.value]; 

    return Array.from({length: count}).map(() => {
        const idx = Math.floor(Math.random() * availableWords.length);
        const w = availableWords[idx];
        availableWords.splice(idx, 1);
        const pureWord = w.en_us.replace(/[^a-zA-Z]/g, '').toLowerCase();
        usedWords.push(pureWord);
        return { id: Date.now() + Math.random(), word: pureWord, zh: w.zh_tw };
    });
};

// 🌟 檢查今天逃跑次數
const checkEscapeBanStatus = async () => {
    if (!studentCookie.value || studentCookie.value.isAnon) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();
    today.setHours(23, 59, 59, 999);
    const endOfDay = today.toISOString();

    const { data } = await supabase.from('game_records')
        .select('id, correct_words')
        .eq('student_id', studentCookie.value.id)
        .eq('game_type', '單字塔羅鍊金術')
        .gte('played_at', startOfDay)
        .lte('played_at', endOfDay);

    if (data) {
        const escapesToday = data.filter(r => r.correct_words && r.correct_words.includes('【逃】')).length;
        todayEscapesCount.value = escapesToday;
        if (escapesToday >= maxEscapes.value) {
            matchStatus.value = 'banned'; 
        }
    }
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入才能進行連線對戰！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.tarot_alch_card_set) config.value.card_set = settings.tarot_alch_card_set;
        if (settings.tarot_alch_hp) config.value.hp = settings.tarot_alch_hp;
        if (settings.tarot_alch_time_limit) config.value.time_limit = settings.tarot_alch_time_limit;
        if (settings.tarot_alch_penalty) config.value.penalty = settings.tarot_alch_penalty;
        if (settings.tarot_alch_win_damage) config.value.win_damage = settings.tarot_alch_win_damage;
        if (settings.tarot_alch_blank_count !== undefined) config.value.blankCount = settings.tarot_alch_blank_count;
        // 🌟 讀取禁賽門檻
        if (settings.tarot_alch_max_escapes !== undefined && settings.tarot_alch_max_escapes !== null) maxEscapes.value = Number(settings.tarot_alch_max_escapes);
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length > 0);
      else errorMsg.value = '⚠️ 該單元單字數量不足，無法進行對戰！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }

    // 🌟 初始化檢查禁賽
    if (studentCookie.value && !studentCookie.value.isAnon) {
      await checkEscapeBanStatus();
    }

  } catch (e) { console.error(e); }
  
  window.addEventListener('beforeunload', handleUnloadLeave);
});

const spawnEffect = (playerId, text, type) => {
    const id = Date.now() + Math.random();
    effects.value.push({ id, target: playerId, text, type });
    setTimeout(() => { effects.value = effects.value.filter(e => e.id !== id); }, 1500); 
};

// ==========================================
// 🚀 同步引擎
// ==========================================
const syncMyStateToDB = async () => {
    if (!myPlayerRole.value || !currentRoomId.value) return;
    const myData = players.value[myPlayerRole.value];
    const safeCards = myData.cards.map(c => { return { id: c.id, state: c.state, word: c.word, points: c.points }; });

    const updateField = {};
    updateField[`${myPlayerRole.value}_state`] = { hp: myData.hp, score: myData.score, status: myData.status, cards: safeCards };
    await supabase.from('tarot_alch_rooms').update(updateField).eq('id', currentRoomId.value);
};

const pollGameState = async () => {
    if (matchStatus.value !== 'playing' || isResolving.value) return;
    const { data } = await supabase.from('tarot_alch_rooms').select('*').eq('id', currentRoomId.value).single();
    if (data) {
        const oppRole = myPlayerRole.value === 'p1' ? 'p2' : 'p1';
        const oppState = data[`${oppRole}_state`];
        if (oppState) updateOpponentState(oppState, oppRole);
    }
};

const broadcast = (actionType, payloadData) => {
    if (gameChannel) gameChannel.send({ type: 'broadcast', event: 'action', payload: { player_id: myPlayerRole.value, action_type: actionType, payload: payloadData } });
};

// ==========================================
// 🚀 連線與房間管理
// ==========================================
const findMatch = async () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    matchStatus.value = 'waiting'; errorMsg.value = '';

    // 🌟 二次防護，避免直接點擊進入
    if (todayEscapesCount.value >= maxEscapes.value) { matchStatus.value = 'banned'; return; }

    const unitKey = `${route.query.version}_${route.query.volume}_${route.query.unit}`;
    const myId = String(studentCookie.value.id); const myName = studentCookie.value.name || '無名氏';
    
    // 尋找最新建立的空房間
    const { data: rooms } = await supabase.from('tarot_alch_rooms').select('*').eq('status', 'waiting').eq('unit_info', unitKey).neq('p1_id', myId).order('id', { ascending: false }).limit(1);

    if (rooms && rooms.length > 0) {
        const room = rooms[0]; currentRoomId.value = room.id; myPlayerRole.value = 'p2';
        
        const p2InitialState = { hp: config.value.hp, score: 0, status: 'playing', cards: [] }; 
        await supabase.from('tarot_alch_rooms').update({ p2_id: myId, p2_name: myName, status: 'playing', p2_state: p2InitialState }).eq('id', room.id);
        
        setupGameData(room.p1_id, room.p1_name, myId, myName, room.p1_state, p2InitialState);
        subscribeToRoom(room.id);
    } else {
        myPlayerRole.value = 'p1';
        const p1InitialState = { hp: config.value.hp, score: 0, status: 'playing', cards: [] };
        const p2InitialState = { hp: config.value.hp, score: 0, status: 'playing', cards: [] }; 
        
        const { data: newRoom } = await supabase.from('tarot_alch_rooms').insert([{ 
            p1_id: myId, p1_name: myName, unit_info: unitKey, status: 'waiting', p1_state: p1InitialState, p2_state: p2InitialState
        }]).select().single();
        
        if (newRoom) {
            currentRoomId.value = newRoom.id; 
            subscribeToRoom(newRoom.id);

            pollTimer = setInterval(async () => {
                if (matchStatus.value !== 'waiting') { clearInterval(pollTimer); return; }
                const { data: checkRoom } = await supabase.from('tarot_alch_rooms').select('*').eq('id', currentRoomId.value).single();
                if (checkRoom && checkRoom.status === 'playing') {
                    setupGameData(myId, myName, checkRoom.p2_id, checkRoom.p2_name, checkRoom.p1_state, checkRoom.p2_state);
                }
            }, 3000);
        } else { errorMsg.value = '連線建立失敗，請重試。'; matchStatus.value = 'setup'; }
    }
};

const setupGameData = (p1Id, p1Name, p2Id, p2Name, p1State, p2State) => {
    if(pollTimer) clearInterval(pollTimer);

    // 🌟 初始化單字紀錄
    correctWordsList.value = [];
    wrongWordsList.value = [];
    mistakesCount.value = 0;

    players.value.p1 = { id: p1Id, name: p1Name, hp: p1State.hp, maxHp: config.value.hp, cards: p1State.cards, score: p1State.score, status: 'playing' };
    players.value.p2 = { id: p2Id, name: p2Name, hp: p2State.hp, maxHp: config.value.hp, cards: p2State.cards, score: p2State.score, status: 'playing' };
    
    matchStatus.value = 'playing'; gameStartTime.value = Date.now();
    timer = setInterval(() => { timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); }, 1000);
    syncTimer = setInterval(pollGameState, 1500); 
};

// ==========================================
// 🎮 遊戲核心邏輯 (瞬間展開)
// ==========================================

const canPlay = computed(() => {
    if (matchStatus.value !== 'playing' || isResolving.value) return false;
    const s = players.value[myPlayerRole.value].status;
    return s !== 'standing' && s !== 'busted'; 
});

const drawCard = async () => {
    if (!canPlay.value || myTarget.value) return;

    sfx.draw();
    const newCardData = drawRandomCards(1)[0];
    const pureWord = newCardData.word;
    const cardId = newCardData.id;
    
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

    // 🌟 獲得鍊金點數
    const alchemyPoints = getAlchemyScore(pureWord);

    players.value[myPlayerRole.value].cards.push({ id: cardId, state: 'typing', word: pureWord, points: alchemyPoints });

    myTarget.value = {
        word: pureWord, zh: newCardData.zh, typedCount: 0,
        timeRemaining: config.value.time_limit, cardId: cardId,
        points: alchemyPoints,
        timerId: setInterval(handleTypingTimeout, 1000),
        slots, targetChars, options 
    };

    broadcast('draw_reveal', { cardId, word: pureWord });
    await syncMyStateToDB(); 
};

const handleOptionClick = (opt) => {
    if (opt.used || !myTarget.value || matchStatus.value !== 'playing') return;
    
    if (opt.char === myTarget.value.targetChars[myTarget.value.typedCount]) {
        sfx.type(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;
        
        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            sfx.correct();
            clearInterval(myTarget.value.timerId); // 🌟 確保關閉計時器
            finalizeCard(true);
        }
    } else {
        sfx.wrong(); 
    }
};

const handleTypingTimeout = () => {
    if (!myTarget.value) return;
    myTarget.value.timeRemaining--;
    if (myTarget.value.timeRemaining <= 0) {
        clearInterval(myTarget.value.timerId); // 🌟 確保關閉計時器
        sfx.wrong();
        finalizeCard(false); 
    }
};

const finalizeCard = async (isSuccess) => {
    if (!myTarget.value) return; // 🌟 雙重防護鎖，防止幽靈計時器

    const cardId = myTarget.value.cardId;
    const points = myTarget.value.points; 
    const word = myTarget.value.word; // 取得當前單字
    const myData = players.value[myPlayerRole.value];
    
    myTarget.value = null; // 釋放目標鎖定
    let isBusted = false;

    if (isSuccess) {
        // 🌟 紀錄拼寫成功
        if (!correctWordsList.value.includes(word)) correctWordsList.value.push(word);

        const card = myData.cards.find(c => c.id === cardId);
        if (card) { card.state = 'resolved'; card.points = points; }
        myData.score += points;
        spawnEffect(myPlayerRole.value, `+${points}點`, 'heal');

        if (myData.score > BUST_LIMIT) { // 爆牌上限 50
            sfx.bust();
            myData.status = 'busted';
            isBusted = true;
            spawnEffect(myPlayerRole.value, 'BUSTED!', 'dmg');
        }
    } else {
        // 🌟 紀錄拼寫失敗
        if (!wrongWordsList.value.includes(word)) wrongWordsList.value.push(word);
        mistakesCount.value++;

        const idx = myData.cards.findIndex(c => c.id === cardId);
        if (idx !== -1) myData.cards[idx].state = 'burned'; 
        
        myData.hp -= config.value.penalty;
        spawnEffect(myPlayerRole.value, `失敗 -${config.value.penalty}`, 'dmg');
    }

    broadcast('draw_resolve', { cardId, isSuccess, points, isBusted, newHp: myData.hp });
    await syncMyStateToDB(); 

    if (myData.hp <= 0) {
        const oppRole = myPlayerRole.value === 'p1' ? 'p2' : 'p1';
        endGame(players.value[oppRole].name, '卡牌反噬，生命值歸零');
        return;
    }

    checkRoundEnd();
};

const stand = async () => {
    if (!canPlay.value || myTarget.value) return;
    sfx.stand();
    players.value[myPlayerRole.value].status = 'standing';
    spawnEffect(myPlayerRole.value, '停牌', 'sys');
    
    broadcast('stand', {});
    await syncMyStateToDB(); 
    checkRoundEnd();
};

// ==========================================
// 🌟 真理資料接收器
// ==========================================
const updateOpponentState = (oppState, oppRole) => {
    if (isResolving.value) return; 

    if (oppState.status === 'standing' && players.value[oppRole].status !== 'standing') {
        sfx.stand(); spawnEffect(oppRole, '停牌', 'sys');
    }
    if (oppState.status === 'busted' && players.value[oppRole].status !== 'busted') {
        sfx.bust(); spawnEffect(oppRole, 'BUSTED!', 'dmg');
    }
    
    if (oppState.cards && oppState.cards.length > players.value[oppRole].cards.length) sfx.draw();
    
    if (oppState.cards) {
        oppState.cards.forEach(c => {
            const existing = players.value[oppRole].cards.find(old => old.id === c.id);
            if (existing && existing.state !== 'resolved' && c.state === 'resolved') {
                sfx.correct(); spawnEffect(oppRole, `解鎖成功`, 'heal'); 
            } else if (existing && existing.state !== 'burned' && c.state === 'burned') {
                spawnEffect(oppRole, `失敗`, 'dmg');
            }
        });
        players.value[oppRole].cards = oppState.cards;
    }

    players.value[oppRole].hp = oppState.hp;
    players.value[oppRole].score = oppState.score;
    players.value[oppRole].status = oppState.status;
    
    checkRoundEnd(); 
};

const checkRoundEnd = () => {
    const s1 = players.value.p1.status;
    const s2 = players.value.p2.status;
    
    if ((s1 === 'standing' || s1 === 'busted') && (s2 === 'standing' || s2 === 'busted')) {
        if (!isResolving.value) {
            isResolving.value = true;
            setTimeout(resolveRoundLocal, 1500); 
        }
    }
};

const resolveRoundLocal = async () => {
    let p1Score = Number(players.value.p1.score);
    let p2Score = Number(players.value.p2.score);
    
    if (players.value.p1.status === 'busted') p1Score = 0;
    if (players.value.p2.status === 'busted') p2Score = 0;

    let roundWinner = null;
    let damage = 0;
    const winDmg = Number(config.value.win_damage);

    if (p1Score > p2Score) {
        roundWinner = 'p1';
        damage = winDmg + (p1Score - p2Score);
        players.value.p2.hp = Math.max(0, players.value.p2.hp - damage);
    } else if (p2Score > p1Score) {
        roundWinner = 'p2';
        damage = winDmg + (p2Score - p1Score);
        players.value.p1.hp = Math.max(0, players.value.p1.hp - damage);
    } else {
        roundWinner = 'tie';
    }

    sfx.damage();
    if (roundWinner === 'p1') spawnEffect('p2', `-${damage}`, 'dmg');
    else if (roundWinner === 'p2') spawnEffect('p1', `-${damage}`, 'dmg');
    else { spawnEffect('p1', '平局', 'sys'); spawnEffect('p2', '平局', 'sys'); }

    if (players.value.p1.hp <= 0 || players.value.p2.hp <= 0) {
        const finalWinner = players.value.p1.hp <= 0 ? players.value.p2.name : players.value.p1.name;
        endGame(finalWinner, '生命值歸零');
    } else {
        setTimeout(async () => {
            players.value.p1.score = 0; players.value.p1.status = 'playing'; players.value.p1.cards = [];
            players.value.p2.score = 0; players.value.p2.status = 'playing'; players.value.p2.cards = [];
            isResolving.value = false; 
            await syncMyStateToDB(); 
        }, 3500);
    }
};

const getCardTransform = (i, cardId) => {
    if (myTarget.value && myTarget.value.cardId === cardId) {
        return 'translateX(-50%) translateY(-200px) scale(1.15)';
    }
    const len = players.value[myPlayerRole.value].cards.length;
    const offset = (i - (len - 1) / 2);
    const spacing = typeof window !== 'undefined' && window.innerWidth < 600 ? 35 : 55; 
    return `translateX(calc(-50% + ${offset * spacing}px)) rotate(${offset * 5}deg)`;
};

const subscribeToRoom = (roomId) => {
    roomSubscription = supabase.channel(`db_alch_room_${roomId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tarot_alch_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const d = payload.new;
        if (d.status === 'playing') {
            if (matchStatus.value === 'waiting') {
                setupGameData(d.p1_id, d.p1_name, d.p2_id, d.p2_name, d.p1_state, d.p2_state);
            }
        }
    }).subscribe();

    gameChannel = supabase.channel(`tarot_alch_cast_${roomId}`);
    gameChannel.on('broadcast', { event: 'action' }, (payload) => {
        handleNetworkEvent(payload.payload);
    }).subscribe();
};

const handleNetworkEvent = async (event) => {
    const pId = event.player_id; 
    const action = event.action_type;
    const pl = event.payload;

    if (action === 'leave' && pId !== myPlayerRole.value) {
        endGame(players.value[myPlayerRole.value].name, '對手已中離逃走');
    }
    else if (action === 'draw_reveal' && pId !== myPlayerRole.value) {
        sfx.draw();
        players.value[pId].cards.push({ id: pl.cardId, state: 'hidden', word: pl.word });
    }
    else if (action === 'draw_resolve' && pId !== myPlayerRole.value) {
        const card = players.value[pId].cards.find(c => c.id === pl.cardId);
        if (card) {
            if (pl.isSuccess) {
                card.state = 'resolved'; 
                card.points = pl.points;
                spawnEffect(pId, `解鎖成功`, 'heal');
                players.value[pId].score += pl.points;
            } else {
                card.state = 'burned';
                spawnEffect(pId, `失敗`, 'dmg');
            }
        }
        players.value[pId].hp = pl.newHp;
        
        if (pl.isBusted) {
            sfx.bust();
            players.value[pId].status = 'busted';
            spawnEffect(pId, 'BUSTED!', 'dmg');
        }
        
        if (pl.newHp <= 0) {
            endGame(players.value[myPlayerRole.value].name, '對手卡牌反噬，生命值歸零');
        } else {
            checkRoundEnd(); 
        }
    }
    else if (action === 'stand' && pId !== myPlayerRole.value) {
        sfx.stand();
        players.value[pId].status = 'standing';
        spawnEffect(pId, '停牌', 'sys');
        checkRoundEnd(); 
    }
};

const endGame = async (winId, reasonText) => {
    if (matchStatus.value === 'end') return; 
    matchStatus.value = 'end'; 
    
    let winName = '無';
    // 🌟 修正：加入 String() 確保讀取到正確的贏家名字
    if (String(winId) === String(players.value.p1.id)) winName = players.value.p1.name;
    else if (String(winId) === String(players.value.p2.id)) winName = players.value.p2.name;
    else if (winId === 'tie') winName = '雙方';

    winner.value = winName; 
    endReason.value = reasonText; 
    
    sfx.winRound();
    clearInterval(timer); 
    if (myTarget.value && myTarget.value.timerId) clearInterval(myTarget.value.timerId);
    cleanupSubscriptions();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        const myData = players.value[myPlayerRole.value];
        let resultMark = '【平】';
        
        // 🌟 修正：加入 String() 確保勝負判定不受型別干擾
        if (String(winId) === String(studentCookie.value.id)) resultMark = '【勝】';
        else if (winId && winId !== 'tie') resultMark = '【敗】';

        // 🌟 修正：確保最後結算寫入資料庫的血量不會是負數
        const finalHp = Math.max(0, myData.hp);
        let cw = `結果: ${resultMark} (${reasonText}) | 剩餘血量: ${finalHp}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');

        // ⚠️ 提醒：下面 game_type 的名稱請依照當下修改的遊戲維持原樣 (單字塔羅21點 / 單字塔羅鍊金術 / 單字塔羅UNO對決)
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, 
            game_type: '單字塔羅鍊金術', // <-- 請記得確認這個名稱！
            score: finalHp, 
            time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: cw, wrong_words: wrongWordsList.value.join(', '), mistakes: mistakesCount.value 
        }]);
    }
};

const handleUnloadLeave = () => {
    if (matchStatus.value === 'playing') broadcast('leave', {});
};

const leaveLobby = async () => { 
    if (matchStatus.value === 'playing') {
        todayEscapesCount.value++; // 🌟 紀錄逃跑
        if (studentCookie.value && !studentCookie.value.isAnon) {
            const myData = players.value[myPlayerRole.value];
            
            // 🌟 逃亡也要記錄剛才解鎖過的單字
            let cw = `結果: 【逃】 (主動逃走) | 剩餘血量: ${myData.hp}`;
            if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');

            await supabase.from('game_records').insert([{
                student_id: studentCookie.value.id, game_type: '單字塔羅鍊金術', score: myData.hp, time_taken_seconds: timeSpent.value,
                version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
                correct_words: cw,
                wrong_words: wrongWordsList.value.join(', '),
                mistakes: mistakesCount.value
            }]);
        }
        handleUnloadLeave(); 
    }
    cleanupSubscriptions(); 
    
    // 🌟 離開時檢查禁賽
    if (todayEscapesCount.value >= maxEscapes.value) matchStatus.value = 'banned';
    else navigateTo('/'); 
};

const cleanupSubscriptions = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (timer) clearInterval(timer);
    if (syncTimer) clearInterval(syncTimer);
    if (myTarget.value && myTarget.value.timerId) clearInterval(myTarget.value.timerId);
    if (roomSubscription) supabase.removeChannel(roomSubscription);
    if (gameChannel) supabase.removeChannel(gameChannel);
    window.removeEventListener('beforeunload', handleUnloadLeave);
};

onUnmounted(() => { cleanupSubscriptions(); });
</script>

<template>
  <div class="tarot-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🔮 單字塔羅鍊金術對決</h2>
      <div v-if="matchStatus === 'playing'" class="t-timer">戰鬥耗時: {{ timeSpent }}s</div>
      <button v-if="matchStatus !== 'banned'" class="retro-btn btn-small" @click="leaveLobby">離開牌桌</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="matchStatus === 'banned'" class="setup-overlay">
      <div class="rpg-dialog retro-element">
        <div class="icon-big" style="color: #f44336; text-shadow: 0 0 20px rgba(244,67,54,0.8);">🚫</div>
        <h2 style="color:#f44336;">帳號已被禁賽</h2>
        <p style="font-size: 1.1rem; font-weight: bold; line-height: 1.5; color: #fff;">
          您今天已經臨陣脫逃了 <span style="color:#f44336; font-size:1.5rem;">{{ todayEscapesCount }}</span> 次！<br>
          已達到單日逃跑上限 ({{ maxEscapes }}次)。
        </p>
        <p style="color:#ffeb3b; margin-top: 10px; font-weight: bold;">
          為了維持塔羅對決的公平性，您今天將無法再進行此遊戲。<br>
          請明日再來挑戰！
        </p>
        <NuxtLink to="/" class="retro-btn btn-danger" style="margin-top:20px; width:100%; max-width: 250px;">返回首頁</NuxtLink>
      </div>
    </div>

    <div v-else-if="matchStatus === 'setup' || matchStatus === 'waiting'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 500px;">
        <div class="icon-big">{{ matchStatus === 'setup' ? '🔮' : '⏳' }}</div>
        <h2 style="color:#ffeb3b;">{{ matchStatus === 'setup' ? '鍊金交鋒' : '等待對手入座...' }}</h2>
        
        <template v-if="matchStatus === 'setup'">
            <div class="rules-box">
                <p>1️⃣ <b>瘋狂狂飆制</b>：雙方無須輪流，隨時可以瘋狂抽牌累積「鍊金點數」！</p>
                <p>2️⃣ <b>稀有字母高分</b>：Z、Q (10點)，J、X (8點)；一般母音只有 1 點。仔細辨識單字價值！</p>
                <p>3️⃣ <b>爆牌門檻</b>：鍊金過度會導致爆炸，加總請勿超過 <b>{{ BUST_LIMIT }} 點</b>！</p>
                <p>4️⃣ <b>底牌隱密</b>：對方抽的牌皆為覆蓋狀態，雙方皆停牌結算時才會全部亮出！</p>
            </div>
            <span style="font-size:0.8rem; color:#aaa; margin-top:5px; display:inline-block;">今日逃跑次數: {{ todayEscapesCount }} / {{ maxEscapes }} (滿額將禁玩一天)</span>
            <button class="retro-btn btn-primary" style="margin-top:15px; font-size:1.3rem; padding: 15px 40px;" @click="findMatch">坐下牌桌</button>
        </template>
        <template v-else>
            <button class="retro-btn btn-danger" style="margin-top:20px;" @click="leaveLobby">離開牌桌</button>
        </template>
      </div>
    </div>

    <div v-else-if="matchStatus === 'playing' || matchStatus === 'end'" class="table-container">

      <div class="player-area opp-area">
          <div class="player-info retro-element my-info" style="margin-bottom: 10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div class="p-name">{{ players[myPlayerRole === 'p1' ? 'p2' : 'p1'].name }}</div>
                    <div class="hp-bar-bg" style="width: 150px;"><div class="hp-bar-fill" :style="{ width: `${(players[myPlayerRole === 'p1' ? 'p2' : 'p1'].hp / config.hp) * 100}%` }"></div></div>
                    <div class="p-hp">HP: {{ players[myPlayerRole === 'p1' ? 'p2' : 'p1'].hp }}</div>
                  </div>
                  <div class="p-score" :class="{'busted-text': players[myPlayerRole === 'p1' ? 'p2' : 'p1'].status === 'busted'}">
                      鍊金點數: <span style="color:#ffeb3b; font-size:1.4rem;">{{ isRevealedAll ? players[myPlayerRole === 'p1' ? 'p2' : 'p1'].score : '??' }}</span>
                      <span v-if="players[myPlayerRole === 'p1' ? 'p2' : 'p1'].status === 'standing'" style="color:#ffeb3b; font-size: 0.8rem; margin-left: 5px;">(停牌)</span>
                      <span v-if="players[myPlayerRole === 'p1' ? 'p2' : 'p1'].status === 'busted'" style="color:#f44336; font-size: 0.8rem; margin-left: 5px;">(爆牌)</span>
                  </div>
              </div>
          </div>
          
          <div class="cards-row opp-cards">
              <div v-for="(card, i) in players[myPlayerRole === 'p1' ? 'p2' : 'p1'].cards" :key="card.id" class="tarot-card" :class="[isRevealedAll ? card.state : (card.state === 'burned' ? 'burned' : 'hidden')]" :style="{ zIndex: i, left: `${i * 35}px` }">
                  <div class="card-back-pattern"></div>
                  <img v-if="(isRevealedAll || card.state === 'burned') && card.word" :src="getCardImage(card.word)" class="card-bg" @error="handleImageError" />
                  
                  <div v-if="isRevealedAll && card.state === 'resolved'" class="card-content">
                      <div class="c-word">{{ card.word }}</div>
                      <div class="c-point">{{ card.points }}</div>
                  </div>
                  <div v-if="card.state === 'burned'" class="burned-mark">🔥</div>
              </div>
              
              <div class="fx-layer" v-for="eff in effects.filter(e => e.target !== myPlayerRole)" :key="eff.id">
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
              <div v-for="(card, i) in players[myPlayerRole].cards" :key="card.id" 
                   class="tarot-card" 
                   :class="[card.state, {'typing': myTarget && myTarget.cardId === card.id}]" 
                   :style="{ 
                       zIndex: myTarget && myTarget.cardId === card.id ? 100 : i, 
                       left: '50%',
                       transform: getCardTransform(i, card.id)
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

              <div class="fx-layer" v-for="eff in effects.filter(e => e.target === myPlayerRole)" :key="eff.id">
                 <div class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
              </div>
          </div>

          <div class="player-info retro-element my-info" style="position:absolute; bottom: 10px; left:50%; transform:translateX(-50%); width: 95%; max-width: 500px; padding: 10px;">
              <div style="display:flex; justify-content:space-between; align-items:stretch; gap: 10px;">
                  <div style="flex: 1; display:flex; flex-direction:column; justify-content:space-between;">
                      <div class="p-score huge-score" :class="{'busted-text': players[myPlayerRole].status === 'busted'}" style="line-height: 1;">
                          {{ players[myPlayerRole].score }} <span style="font-size:1rem; color:#fff;">點</span>
                      </div>
                      <div>
                          <div class="p-name" style="margin-bottom:2px;">我方血量</div>
                          <div class="hp-bar-bg" style="width: 100%; max-width: 120px;"><div class="hp-bar-fill" :style="{ width: `${(players[myPlayerRole].hp / config.hp) * 100}%` }"></div></div>
                      </div>
                  </div>
                  
                  <div style="flex: 1.2; display: flex; flex-direction: column; gap: 8px;">
                      <template v-if="canPlay && !myTarget">
                          <button class="retro-btn btn-primary" @click="drawCard" style="flex: 1; padding: 0; font-size: 1.1rem; box-shadow: 0 3px 0 #1b5e20;">🃏 抽牌</button>
                          <button class="retro-btn btn-danger" @click="stand" :disabled="players[myPlayerRole].score === 0" style="flex: 1; padding: 0; font-size: 1.1rem; box-shadow: 0 3px 0 #b71c1c;">🛑 停牌</button>
                      </template>
                      <template v-else-if="!canPlay && !myTarget">
                          <div style="flex:1; display:flex; align-items:center; justify-content:center; text-align:center; color:#ffeb3b; font-weight:bold; font-size: 1rem; background: rgba(0,0,0,0.5); border-radius: 6px;">
                              <span v-if="isResolving">命運結算中 ⏳</span>
                              <span v-else-if="players[myPlayerRole].status === 'standing'">您已停牌<br>等待對手</span>
                              <span v-else-if="players[myPlayerRole].status === 'busted'" style="color:#f44336;">您已爆牌<br>等待對手</span>
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
              <span v-for="(slot, i) in myTarget.slots" :key="i" class="m-slot" :class="{'is-blank': slot.isBlank, 'filled': slot.filled}">
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
          <h1>對決結束</h1>
          <p class="winner-text" v-if="winner !== '無'">🏆 恭喜 {{ winner }} 贏得整場牌局！</p>
          <p class="winner-text" v-else>戰役中止</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ endReason }}</p>
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
.opp-cards { top: 20px; left: 190px; }
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
