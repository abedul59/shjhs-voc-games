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

// 🌟 新增能力值設定
const config = ref({ 
  hp: 100, sp: 40, minDmg: 5, maxDmg: 15, escapeRate: 50, winsPerFormation: 8, blankCount: 3,
  baseAtk: 10, baseDef: 10, baseInt: 10, baseEva: 10,
  playerAtk: 15, playerDef: 15, playerInt: 15, playerEva: 10
});

const myPlayerRole = ref(null); 
const currentRoomId = ref(null);
const myWins = ref(0);
const manualUnlocks = ref({ formations: [], strategies: [] });

const showManual = ref(false);
const manualTab = ref('formations'); 
const myFormationSelection = ref('散開之陣');

const formationOrder = ['散開之陣', '鶴翼之陣', '衝方之陣', '白馬之陣', '魚鱗之陣', '鋒矢之陣', '一文字之陣', '背水之陣', '靜寂之陣', '八卦之陣'];

const formations = ref({
    '散開之陣': { offsets: [0, 0, 0, 0, 0], mults: [1.0, 1.0, 1.0, 1.0, 1.0], desc: "無特殊效果，各武將處於正常位置。" },
    '鶴翼之陣': { offsets: [20, 5, -15, 5, 20], mults: [1.1, 1.2, 1.4, 1.2, 1.1], desc: "全員攻擊力上升，防禦下降。第三位增減最為明顯！" },
    '衝方之陣': { offsets: [30, -20, 30, -20, 30], mults: [1.3, 0.7, 1.3, 0.7, 1.3], desc: "一三五主攻，二與四防禦大幅受惠！" },
    '白馬之陣': { offsets: [15, 15, 15, 15, 15], mults: [1.1, 1.1, 1.1, 1.1, 1.1], desc: "全員速度上升！降低水計的成功率與威力。" },
    '魚鱗之陣': { offsets: [-35, 20, 30, 20, -35], mults: [0.0, 1.2, 1.4, 1.2, 0.0], desc: "二三四攻防提升；一五退守，攻擊力變零！提升迴避率。" },
    '鋒矢之陣': { offsets: [-35, -10, 45, -10, -35], mults: [0.0, 0.9, 1.5, 0.9, 0.0], desc: "第三位主攻；一五防禦大幅上升，攻擊力變零！" },
    '一文字之陣': { offsets: [20, 20, 20, 20, 20], mults: [1.3, 1.3, 1.3, 1.3, 1.3], desc: "全員向前突擊！攻擊力上升，防禦力下降！" },
    '背水之陣': { offsets: [45, 45, 45, 45, 45], mults: [1.5, 1.5, 1.5, 1.5, 1.5], desc: "破釜沉舟！攻擊力大幅上升，易發動奮戰一擊！" },
    '靜寂之陣': { offsets: [-45, -45, -45, -45, -45], mults: [0.6, 0.6, 0.6, 0.6, 0.6], desc: "全員隱身！防禦力與迴避率大幅地退守上升！" },
    '八卦之陣': { offsets: [15, -25, 25, -25, 15], mults: [1.2, 0.8, 1.3, 0.8, 1.2], desc: "設有生門與死門，部分武將呈現無敵狀態！" }
});

const strategies = ref({
    "火計": { type: "damage", unlockWins: 0, power: 15, cost: 5, desc: "火焰傷害" },
    "水計": { type: "damage", unlockWins: 5, power: 25, cost: 6, desc: "水淹傷害" },
    "石計": { type: "damage", unlockWins: 10, power: 40, cost: 7, desc: "砂石重擊" },
    "回復計": { type: "heal", unlockWins: 15, power: 40, cost: 5, desc: "恢復兵力" },
    "暗殺計": { type: "assassinate", unlockWins: 17, power: 0, cost: 15, desc: "50%機率一擊必殺" },
    "招魂計": { type: "revive", unlockWins: 20, power: 50, cost: 8, desc: "復活武將" },
    "煙遁計": { type: "escape", unlockWins: 23, power: 0, cost: 20, desc: "100%無損撤退" },
    "解陣計": { type: "dispel", unlockWins: 25, power: 0, cost: 6, desc: "破除敵方陣型" }
});

const unlockedFormations = computed(() => {
    let count = 1 + Math.floor(myWins.value / config.value.winsPerFormation);
    count = Math.min(count, formationOrder.length); 
    const winBased = formationOrder.slice(0, count);
    const combinedSet = new Set([...winBased, ...manualUnlocks.value.formations]);
    return formationOrder.filter(f => combinedSet.has(f));
});

const unlockedStrategies = computed(() => {
    const list = new Set(manualUnlocks.value.strategies); 
    for (const [sName, strat] of Object.entries(strategies.value)) {
        if (myWins.value >= strat.unlockWins) list.add(sName);
    }
    return Array.from(list);
});

const formationsGuide = computed(() => {
    return formationOrder.map((fName, index) => {
        const reqWins = index === 0 ? 0 : index * config.value.winsPerFormation;
        const isUnlocked = myWins.value >= reqWins || manualUnlocks.value.formations.includes(fName);
        return { name: fName, desc: formations.value[fName].desc, reqWins, isUnlocked };
    });
});

const strategiesGuide = computed(() => {
    return Object.keys(strategies.value).map(sName => {
        const strat = strategies.value[sName];
        const isUnlocked = myWins.value >= strat.unlockWins || manualUnlocks.value.strategies.includes(sName);
        
        let icon = '📜';
        if (sName.includes('火')) icon = '🔥'; if (sName.includes('水')) icon = '🌊';
        if (sName.includes('石') || sName.includes('砂')) icon = '🪨';
        if (sName.includes('回復')) icon = '💚'; if (sName.includes('招魂')) icon = '🌟';
        if (sName.includes('解陣')) icon = '🌪️';
        if (sName.includes('暗殺')) icon = '🥷'; if (sName.includes('煙遁')) icon = '💨';

        return { name: sName, icon, desc: strat.desc, cost: strat.cost, reqWins: strat.unlockWins, isUnlocked };
    }).sort((a, b) => a.reqWins - b.reqWins);
});

const roomData = ref(null);
const p1 = ref({ id: '', name: '', score: 0, sp: 40, maxSp: 40, formation: '散開之陣', generals: [] });
const p2 = ref({ id: '', name: '', score: 0, sp: 40, maxSp: 40, formation: '散開之陣', generals: [] });
const winner = ref(null);
const endReason = ref('');

const battleLog = ref([]); 
const effects = ref([]); 

const myTarget = ref({ status: 'typing', word: '', zh: '', targetChars: [], typedCount: 0, slots: [], options: [], attackerIndex: -1, attackerName: '' });

let roomSubscription = null;
let eventSubscription = null;

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
  click: () => playTone(800, 'square', 0.05, 0.05),
  error: () => playTone(200, 'sawtooth', 0.1, 0.1),
  attack: () => { playTone(150, 'sawtooth', 0.1, 0.2); setTimeout(() => playTone(100, 'square', 0.2, 0.2), 50); },
  magic: () => { playTone(600, 'sine', 0.1, 0.1); setTimeout(() => playTone(900, 'sine', 0.2, 0.1), 100); },
  heal: () => { playTone(400, 'triangle', 0.2, 0.1); setTimeout(() => playTone(600, 'triangle', 0.3, 0.1), 150); },
  block: () => playTone(400, 'square', 0.1, 0.1), 
  defeat: () => { playTone(300, 'sine', 0.5, 0.2); setTimeout(() => playTone(200, 'sine', 0.5, 0.2), 200); },
  win: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3), i * 150)); },
  fire: () => { playTone(200, 'sawtooth', 0.2, 0.15); setTimeout(() => playTone(100, 'sawtooth', 0.3, 0.15), 100); },
  water: () => { playTone(300, 'sine', 0.1, 0.15); setTimeout(() => playTone(400, 'sine', 0.2, 0.15), 100); setTimeout(() => playTone(200, 'sine', 0.2, 0.15), 200); },
  stone: () => { playTone(80, 'square', 0.3, 0.25); },
  dispel: () => { playTone(800, 'triangle', 0.1, 0.1); setTimeout(() => playTone(400, 'triangle', 0.2, 0.1), 100); },
  revive: () => { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3, 0.1), i * 150)); },
  assassinate: () => { playTone(900, 'square', 0.1, 0.1); setTimeout(() => playTone(150, 'sawtooth', 0.3, 0.2), 100); },
  smoke: () => { playTone(200, 'sine', 0.3, 0.2); setTimeout(() => playTone(100, 'sine', 0.4, 0.1), 200); }
};

const speakWord = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.9; window.speechSynthesis.speak(utterance);
  }
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入才能進行連線對戰！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
      if (settings.tenchi_hp) config.value.hp = settings.tenchi_hp;
      if (settings.tenchi_sp !== undefined) config.value.sp = settings.tenchi_sp;
      if (settings.tenchi_min_dmg) config.value.minDmg = settings.tenchi_min_dmg;
      if (settings.tenchi_max_dmg) config.value.maxDmg = settings.tenchi_max_dmg;
      if (settings.tenchi_escape_rate !== null) config.value.escapeRate = settings.tenchi_escape_rate;
      if (settings.tenchi_wins_per_formation) config.value.winsPerFormation = settings.tenchi_wins_per_formation;
      if (settings.tenchi_blank_count) config.value.blankCount = settings.tenchi_blank_count;
      
      // 🌟 讀取屬性設定
      if (settings.tenchi_base_atk) config.value.baseAtk = settings.tenchi_base_atk;
      if (settings.tenchi_base_def) config.value.baseDef = settings.tenchi_base_def;
      if (settings.tenchi_base_int) config.value.baseInt = settings.tenchi_base_int;
      if (settings.tenchi_base_eva) config.value.baseEva = settings.tenchi_base_eva;
      
      if (settings.tenchi_player_atk) config.value.playerAtk = settings.tenchi_player_atk;
      if (settings.tenchi_player_def) config.value.playerDef = settings.tenchi_player_def;
      if (settings.tenchi_player_int) config.value.playerInt = settings.tenchi_player_int;
      if (settings.tenchi_player_eva) config.value.playerEva = settings.tenchi_player_eva;

      if (settings.tenchi_formations_config && Object.keys(settings.tenchi_formations_config).length > 0) {
          for (const [key, mults] of Object.entries(settings.tenchi_formations_config)) {
              if (formations.value[key]) formations.value[key].mults = mults;
          }
      }
      if (settings.tenchi_strategies_config && Object.keys(settings.tenchi_strategies_config).length > 0) {
          strategies.value = settings.tenchi_strategies_config;
      }
    }
    
    const { data: winData } = await supabase.from('game_records')
         .select('id, correct_words')
         .eq('student_id', String(studentCookie.value.id))
         .eq('game_type', '單字吞食天地');
    if (winData) myWins.value = winData.filter(r => r.correct_words && r.correct_words.includes('【勝】')).length;

    const { data: stuData } = await supabase.from('students')
        .select('tenchi_formations, tenchi_strategies')
        .eq('student_id', String(studentCookie.value.id)).single();
    if (stuData) {
        manualUnlocks.value.formations = stuData.tenchi_formations || [];
        manualUnlocks.value.strategies = stuData.tenchi_strategies || [];
    }
    
    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.length > 0);
      else errorMsg.value = '⚠️ 該單元單字不足，無法進行對戰！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }
  } catch (e) { console.error(e); }
});

const getGeneralsData = (isP2, playerName) => {
    const p1Names = ['劉備', '關羽', '張飛', '趙雲', '馬超', '黃忠', '諸葛亮', '魏延', '龐統', '姜維'].sort(() => 0.5 - Math.random());
    const p1Faces = ['👲', '🧔', '👳', '🥷', '💂', '🕵️', '👨‍🎤', '👨‍🎓', '👨‍🏫', '👨‍⚖️'].sort(() => 0.5 - Math.random());
    const p2Names = ['曹操', '夏侯惇', '許褚', '張遼', '曹仁', '徐晃', '司馬懿', '典韋', '龐德', '張郃'].sort(() => 0.5 - Math.random());
    const p2Faces = ['👺', '👹', '👿', '👽', '💀', '🤡', '🤖', '🎃', '🧟', '🧛'].sort(() => 0.5 - Math.random());

    const names = isP2 ? p2Names : p1Names;
    const faces = isP2 ? p2Faces : p1Faces;
    const playerIdx = Math.floor(Math.random() * 5);

    return Array.from({ length: 5 }).map((_, i) => {
        const isPlayer = (i === playerIdx && playerName);
        return {
            id: `${isP2 ? 'p2' : 'p1'}_g${i}`, 
            face: faces[i], 
            name: isPlayer ? playerName : names[i], 
            hp: config.value.hp, 
            maxHp: config.value.hp, 
            // 🌟 寫入基礎能力值
            atk: isPlayer ? config.value.playerAtk : config.value.baseAtk,
            def: isPlayer ? config.value.playerDef : config.value.baseDef,
            int: isPlayer ? config.value.playerInt : config.value.baseInt,
            eva: isPlayer ? config.value.playerEva : config.value.baseEva,
            isDead: false, 
            posIndex: i 
        };
    });
};

const getFormationOffsetPx = (index, formationName, isP2) => {
    const logicForward = formations.value[formationName]?.offsets[index] || 0;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const scale = isMobile ? 1.0 : 1.8; 
    return isP2 ? -(logicForward * scale) : (logicForward * scale); 
};

const getCurrentGeneralMultiplier = computed(() => {
    if (!myPlayerRole.value || myTarget.value.attackerIndex === -1) return 1.0;
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    return formations.value[myArmy.formation].mults[myTarget.value.attackerIndex];
});

const getAvailableActions = computed(() => {
    if (!myPlayerRole.value) return [];
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    const deadFriends = myArmy.generals.filter(g => g.isDead);
    
    const mult = getCurrentGeneralMultiplier.value;
    const actions = [{ name: 'attack', label: `🗡️ 攻擊 (x${mult})`, cost: 0, disabled: false }];
    
    unlockedStrategies.value.forEach(sName => {
        const strat = strategies.value[sName];
        let disabled = myArmy.sp < strat.cost;
        if (strat.type === 'revive' && deadFriends.length === 0) disabled = true;
        
        let icon = '📜';
        if (sName.includes('火')) icon = '🔥'; if (sName.includes('水')) icon = '🌊';
        if (sName.includes('石') || sName.includes('砂')) icon = '🪨';
        if (sName.includes('回復')) icon = '💚'; if (sName.includes('招魂')) icon = '🌟';
        if (sName.includes('解陣')) icon = '🌪️';
        if (sName.includes('暗殺')) icon = '🥷'; if (sName.includes('煙遁')) icon = '💨';

        actions.push({ name: sName, label: `${icon} ${sName} (${strat.cost})`, cost: strat.cost, disabled: disabled });
    });

    actions.push({ name: 'escape', label: '🏃‍♂️ 撤退 (拚機率)', cost: 0, disabled: false });

    return actions;
});

// =====================================
// 🚀 連線大廳
// =====================================
const findMatch = async () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    matchStatus.value = 'waiting'; errorMsg.value = '';

    const unitKey = `${route.query.version}_${route.query.volume}_${route.query.unit}`;
    const myId = String(studentCookie.value.id); const myName = studentCookie.value.name;
    const { data: rooms } = await supabase.from('tenchi_rooms').select('*').eq('status', 'waiting').eq('unit_info', unitKey).neq('p1_id', myId).limit(1);

    if (rooms && rooms.length > 0) {
        const room = rooms[0]; currentRoomId.value = room.id; myPlayerRole.value = 'p2';
        await supabase.from('tenchi_rooms').update({ p2_id: myId, p2_name: myName, status: 'playing' }).eq('id', room.id);
        setupGameData(room.p1_id, room.p1_name, myId, myName);
        subscribeToRoom(room.id);
    } else {
        const { data: newRoom } = await supabase.from('tenchi_rooms').insert([{ p1_id: myId, p1_name: myName, unit_info: unitKey, status: 'waiting' }]).select().single();
        if (newRoom) {
            currentRoomId.value = newRoom.id; myPlayerRole.value = 'p1';
            subscribeToRoom(newRoom.id);
        } else { errorMsg.value = '連線建立失敗，請重試。'; matchStatus.value = 'setup'; }
    }
};

const subscribeToRoom = (roomId) => {
    roomSubscription = supabase.channel(`room_${roomId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenchi_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new.status === 'playing' && matchStatus.value === 'waiting') setupGameData(payload.new.p1_id, payload.new.p1_name, payload.new.p2_id, payload.new.p2_name);
    }).subscribe();

    eventSubscription = supabase.channel(`events_${roomId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tenchi_events', filter: `room_id=eq.${roomId}` }, (payload) => {
        handleNetworkEvent(payload.new);
    }).subscribe();
};

const setupGameData = (p1Id, p1Name, p2Id, p2Name) => {
    p1.value = { id: p1Id, name: p1Name, score: 0, sp: config.value.sp, maxSp: config.value.sp, formation: '散開之陣', generals: getGeneralsData(false, p1Name) };
    p2.value = { id: p2Id, name: p2Name, score: 0, sp: config.value.sp, maxSp: config.value.sp, formation: '散開之陣', generals: getGeneralsData(true, p2Name) };
    myTarget.value.attackerIndex = -1; 
    myFormationSelection.value = '散開之陣';

    matchStatus.value = 'playing'; gameStartTime.value = Date.now();
    addLog(`📜 戰鬥開始！${p1Name}軍 VS ${p2Name}軍`, 'sys');
    timer = setInterval(() => { timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); }, 1000);
    assignNewTarget(); 
};

// =====================================
// 📱 戰鬥輸入與指令選擇
// =====================================
const assignNewTarget = () => {
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    const aliveMyGenerals = myArmy.generals.filter(g => !g.isDead);
    if (aliveMyGenerals.length === 0) return; 

    let nextIdx = (myTarget.value.attackerIndex + 1) % 5;
    if (myTarget.value.word === '') nextIdx = 0; 
    while (myArmy.generals[nextIdx] && myArmy.generals[nextIdx].isDead) {
        nextIdx = (nextIdx + 1) % 5;
    }

    const currentMyGeneral = myArmy.generals[nextIdx];
    myTarget.value.attackerIndex = nextIdx;
    myTarget.value.attackerName = currentMyGeneral.name;

    const randomWordObj = allWords.value[Math.floor(Math.random() * allWords.value.length)];
    const wordStr = randomWordObj.en_us.toLowerCase();
    
    myTarget.value.status = 'typing'; 
    myTarget.value.word = wordStr;
    myTarget.value.zh = randomWordObj.zh_tw;
    myTarget.value.typedCount = 0;
    
    let numBlanks = Math.max(1, Math.min(config.value.blankCount || 3, wordStr.length));
    let indices = [];
    while(indices.length < numBlanks) {
        let r = Math.floor(Math.random() * wordStr.length);
        if(!indices.includes(r)) indices.push(r);
    }
    indices.sort((a,b) => a - b); 

    myTarget.value.slots = wordStr.split('').map((char, idx) => ({
        char: char, isBlank: indices.includes(idx), filled: !indices.includes(idx)
    }));

    myTarget.value.targetChars = indices.map(idx => wordStr[idx]);
    let opts = [...myTarget.value.targetChars];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    while(opts.length < Math.max(myTarget.value.targetChars.length + 4, 10)) opts.push(alphabet[Math.floor(Math.random() * 26)]); 
    myTarget.value.options = opts.sort(() => 0.5 - Math.random()).map((char, idx) => ({ id: idx, char, used: false }));
};

const handleOptionClick = (opt) => {
    if (opt.used || matchStatus.value !== 'playing' || myTarget.value.status !== 'typing') return;
    if (opt.char === myTarget.value.targetChars[myTarget.value.typedCount]) {
        sfx.click(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;

        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            speakWord(myTarget.value.word);
            myTarget.value.status = 'selecting_action'; 
        }
    } else { sfx.error(); }
};

const executeAction = (actionName) => {
    if (actionName === 'escape') {
        attemptEscape();
        myTarget.value.status = 'typing'; 
        setTimeout(assignNewTarget, 500); 
        return;
    }

    if (myPlayerRole.value === 'p1') p1.value.score += 10; else p2.value.score += 10;
    sendAttackEvent(actionName);
    myTarget.value.status = 'typing'; 
    setTimeout(assignNewTarget, 500); 
};

const changeFormationSelected = async () => {
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    myArmy.formation = myFormationSelection.value;
    await supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -1, damage: 0, word_typed: myFormationSelection.value }]);
};

const handleLeaveClick = () => {
    if (matchStatus.value === 'playing') {
        attemptEscape(); 
    } else {
        leaveLobby(); 
    }
};

const attemptEscape = async () => {
    if (matchStatus.value !== 'playing') return;
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    if (Math.random() * 100 < config.value.escapeRate) {
        sfx.defeat(); addLog(`🏃‍♂️ ${myArmy.name}軍 撤退成功！`, myPlayerRole.value);
        await supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -2, damage: 0, word_typed: 'escape_success' }]);
        endGame(null, '主動撤退逃走', true);
    } else {
        sfx.error(); addLog(`❌ ${myArmy.name}軍 撤退失敗！全軍受創！`, myPlayerRole.value);
        myArmy.generals.forEach(g => {
            if(!g.isDead) { g.hp -= 10; spawnEffect(g.id, '-10', 'dmg', 'fire-fx'); if(g.hp <= 0) { g.hp = 0; g.isDead = true; sfx.defeat(); addLog(`💀 敵將 ${g.name} 敗退了！`, 'sys'); } }
        });
        await supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -3, damage: 10, word_typed: 'escape_failed' }]);
        if (myArmy.generals.every(g => g.isDead)) endGame(myPlayerRole.value === 'p1' ? p2.value.name : p1.value.name, '撤退失敗導致全軍覆沒');
    }
};

// 🌟 發送攻擊事件 (包含新版傷害運算與迴避判定)
const sendAttackEvent = async (actionName) => {
    const attackerArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    const defenderArmy = myPlayerRole.value === 'p1' ? p2.value : p1.value;
    const attackerGen = attackerArmy.generals[myTarget.value.attackerIndex];
    
    let targetIndex = -1; 
    let finalDamage = 0; 
    let isFriendly = false;
    let isEvaded = false; // 記錄是否閃避

    if (actionName !== 'attack') {
        const stratConfig = strategies.value[actionName];
        if (stratConfig.type === 'heal') {
            const aliveFriends = attackerArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
            if (aliveFriends.length > 0) { targetIndex = aliveFriends[Math.floor(Math.random()*aliveFriends.length)]; isFriendly = true; finalDamage = stratConfig.power + attackerGen.int; }
        } else if (stratConfig.type === 'revive') {
            const deadFriends = attackerArmy.generals.map((g,i)=>g.isDead?i:-1).filter(i=>i!==-1);
            if (deadFriends.length > 0) { targetIndex = deadFriends[Math.floor(Math.random()*deadFriends.length)]; isFriendly = true; finalDamage = stratConfig.power + attackerGen.int; }
        } else if (stratConfig.type === 'dispel') { targetIndex = -4; }
        else if (stratConfig.type === 'escape') { targetIndex = -5; }
        else if (stratConfig.type === 'assassinate') {
            const aliveEnemies = defenderArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
            if (aliveEnemies.length > 0) { targetIndex = aliveEnemies[Math.floor(Math.random()*aliveEnemies.length)]; }
        } else if (stratConfig.type === 'damage') {
            const aliveEnemies = defenderArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
            if (aliveEnemies.length > 0) { targetIndex = aliveEnemies[Math.floor(Math.random()*aliveEnemies.length)]; }
        }
    } else {
        const aliveEnemies = defenderArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
        if (aliveEnemies.length > 0) {
            targetIndex = aliveEnemies[Math.floor(Math.random()*aliveEnemies.length)];
        }
    }

    // 🌟 敵軍迴避判定 (只有攻擊敵軍時才算)
    if (!isFriendly && targetIndex >= 0 && targetIndex < 5 && actionName !== 'dispel' && actionName !== 'escape') {
        const targetGen = defenderArmy.generals[targetIndex];
        let evadeChance = targetGen.eva;
        // 陣型額外迴避加成
        if (defenderArmy.formation === '靜寂之陣') evadeChance += 30;
        if (defenderArmy.formation === '魚鱗之陣') evadeChance += 10;
        
        if (Math.random() * 100 < evadeChance) {
            isEvaded = true;
            finalDamage = 0;
        }
    }

    // 🌟 如果沒被閃避，計算實際傷害
    if (!isEvaded && targetIndex >= 0 && targetIndex < 5 && !isFriendly) {
        const targetGen = defenderArmy.generals[targetIndex];
        
        if (actionName === 'attack') {
            // 普通攻擊 = (隨機基礎 + 攻防差) * 陣型倍率
            const baseDmg = Math.floor(Math.random() * (config.value.maxDmg - config.value.minDmg + 1)) + config.value.minDmg;
            const statDiff = attackerGen.atk - targetGen.def;
            const mult = formations.value[attackerArmy.formation].mults[myTarget.value.attackerIndex];
            finalDamage = Math.max(1, Math.round((baseDmg + statDiff) * mult));
            
        } else if (actionName === '暗殺計') {
            // 暗殺獨立 50% 成功率 (就算沒被閃避也可能失敗)
            if (Math.random() < 0.5) finalDamage = 9999;
            else isEvaded = true; 
            
        } else {
            // 策略攻擊 = 策略基礎 + 智力差 (若白馬陣對水計有減傷)
            const stratConfig = strategies.value[actionName];
            const intDiff = attackerGen.int - targetGen.int;
            finalDamage = Math.max(1, stratConfig.power + intDiff);
            if (defenderArmy.formation === '白馬之陣' && actionName.includes('水')) {
                finalDamage = Math.max(1, finalDamage - 10);
            }
        }
    }

    // 將是否閃避的旗標也包裝傳送出去
    const payloadWord = `${myTarget.value.word}|${actionName}|${isFriendly}|${myTarget.value.attackerIndex}|${isEvaded}`;
    await supabase.from('tenchi_events').insert([{
        room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id),
        target_index: targetIndex, damage: finalDamage, word_typed: payloadWord
    }]);
};

// 🌟 解析網路廣播與播放特效
const handleNetworkEvent = (event) => {
    const isP1Attacking = event.attacker_id === p1.value.id;
    const attacker = isP1Attacking ? p1.value : p2.value;
    const defender = isP1Attacking ? p2.value : p1.value;
    const attackerSide = isP1Attacking ? 'p1' : 'p2';

    const parts = (event.word_typed || '').split('|');
    const actionName = parts[1] || 'attack';
    const isFriendlyTarget = parts[2] === 'true';
    const attackerPosIndex = parseInt(parts[3] || '0', 10);
    const isEvaded = parts[4] === 'true'; // 解析是否閃避
    
    const attackingGeneral = attacker.generals[attackerPosIndex];
    const attackerGeneralName = attackingGeneral ? attackingGeneral.name : attacker.name;

    if (actionName !== 'attack' && actionName !== 'escape' && strategies.value[actionName]) {
        attacker.sp = Math.max(0, attacker.sp - strategies.value[actionName].cost);
    }

    if (event.target_index === -1) { 
        attacker.formation = parts[0]; 
        if (event.attacker_id === String(studentCookie.value.id)) myFormationSelection.value = parts[0];
        addLog(`🚩 ${attacker.name}軍 佈下【${attacker.formation}】！`, attackerSide); 
        addLog(`💬 ${formations.value[attacker.formation].desc}`, 'sys'); 
        return; 
    }
    
    if (event.target_index === -5) {
        sfx.smoke();
        if (event.attacker_id === String(studentCookie.value.id)) {
            addLog(`💨 【${attackerGeneralName}】施展【煙遁計】！化作煙霧成功撤退！`, attackerSide);
            endGame(null, '使用煙遁計成功撤退', true);
        } else {
            addLog(`💨 敵軍施展【煙遁計】，化作一陣煙霧消失了！`, 'sys');
            endGame(defender.name, '對方使用煙遁計逃脫');
        }
        return;
    }

    if (event.target_index === -2) { sfx.win(); addLog(`🏃‍♂️ 敵軍夾著尾巴逃跑了！`, 'sys'); endGame(defender.name, '對方敗戰逃走'); return; }
    if (event.target_index === -3) { sfx.attack(); addLog(`⚔️ 敵軍撤退失敗！全軍受罰！`, 'sys'); attacker.generals.forEach(g => { if(!g.isDead) { g.hp -= event.damage; spawnEffect(g.id, `-${event.damage}`, 'dmg', 'fire-fx'); if(g.hp <= 0) { g.hp = 0; g.isDead = true; } } }); return; }

    if (event.attacker_id !== String(studentCookie.value.id)) attacker.score += 10;

    if (event.target_index === -4) {
        sfx.dispel(); defender.formation = '散開之陣';
        if (event.attacker_id !== String(studentCookie.value.id)) myFormationSelection.value = '散開之陣';
        addLog(`🌪️ 【${attackerGeneralName}】施展【解陣計】！敵軍陣型瓦解！`, attackerSide);
        defender.generals.forEach(g => { if (!g.isDead) spawnEffect(g.id, '', 'sys', 'dispel-fx'); });
        return;
    }

    if (isFriendlyTarget) {
        const targetGeneral = attacker.generals[event.target_index];
        if (!targetGeneral) return;
        if (actionName === '招魂計') {
            sfx.revive(); targetGeneral.isDead = false; targetGeneral.hp = event.damage;
            addLog(`✨ 【${attackerGeneralName}】施展【招魂計】！${targetGeneral.name} 復活了！`, attackerSide);
            spawnEffect(targetGeneral.id, `+${targetGeneral.hp}`, 'heal', 'revive-fx');
        } else { 
            sfx.heal(); targetGeneral.hp += event.damage;
            if (targetGeneral.hp > targetGeneral.maxHp) targetGeneral.hp = targetGeneral.maxHp;
            addLog(`💚 【${attackerGeneralName}】施展【回復計】！${targetGeneral.name} 恢復兵力！`, attackerSide);
            spawnEffect(targetGeneral.id, `+${event.damage}`, 'heal', 'heal-fx');
        }
        return;
    }

    const targetGeneral = defender.generals[event.target_index];
    if (!targetGeneral || targetGeneral.isDead) return;

    // 🌟 閃避無敵處理
    if (isEvaded) {
        sfx.block();
        if (actionName === 'attack') {
            addLog(`💨 【${attackerGeneralName}】的攻擊被 ${targetGeneral.name} 靈巧地閃避了！`, attackerSide);
        } else if (actionName === '暗殺計') {
            addLog(`🥷 【${attackerGeneralName}】的暗殺行動被 ${targetGeneral.name} 識破了！`, attackerSide);
        } else {
            addLog(`💨 【${attackerGeneralName}】的【${actionName}】被 ${targetGeneral.name} 閃避了！`, attackerSide);
        }
        spawnEffect(targetGeneral.id, '閃避', 'sys', 'smoke-fx');
        return;
    }

    // 🌟 命中處理
    if (actionName === 'attack') {
        sfx.attack(); targetGeneral.hp -= event.damage;
        addLog(`🗡️ 【${attackerGeneralName}】出擊，重創了 ${targetGeneral.name} (-${event.damage})！`, attackerSide);
        spawnEffect(targetGeneral.id, `-${event.damage}`, 'dmg', 'attack-fx');
    } else if (actionName === '暗殺計') {
        sfx.assassinate(); targetGeneral.hp = 0;
        addLog(`🥷 【${attackerGeneralName}】施展【暗殺計】！一擊必殺了 ${targetGeneral.name}！`, attackerSide);
        spawnEffect(targetGeneral.id, `必殺`, 'strat-dmg', 'assassinate-fx');
    } else {
        let fx = 'fire-fx';
        if (actionName.includes('水')) { sfx.water(); fx = 'water-fx'; }
        else if (actionName.includes('石') || actionName.includes('砂')) { sfx.stone(); fx = 'stone-fx'; }
        else { sfx.fire(); fx = 'fire-fx'; }

        targetGeneral.hp -= event.damage;
        addLog(`📜 【${attackerGeneralName}】施展【${actionName}】！重創了 ${targetGeneral.name} (-${event.damage})！`, attackerSide);
        spawnEffect(targetGeneral.id, `-${event.damage}`, 'strat-dmg', fx);
    }

    if (targetGeneral.hp <= 0) {
        targetGeneral.hp = 0; targetGeneral.isDead = true;
        sfx.defeat(); addLog(`💀 敵將 ${targetGeneral.name} 陣亡了！`, 'sys');
        if (defender.generals.every(g => g.isDead)) endGame(attacker.name, '敵軍全滅');
    }
};

const spawnEffect = (targetId, text, type, fxClass) => {
    const id = Date.now() + Math.random();
    effects.value.push({ id, targetId, text, type, fxClass });
    setTimeout(() => { effects.value = effects.value.filter(e => e.id !== id); }, 1200);
};

const addLog = (text, type) => { battleLog.value.unshift({ id: Date.now() + Math.random(), text, type }); if (battleLog.value.length > 5) battleLog.value.pop(); };

const endGame = async (winName, reasonText, isEscape = false) => {
    matchStatus.value = 'end'; winner.value = winName || '無'; endReason.value = reasonText; 
    if (winName) sfx.win();
    clearInterval(timer); cleanupSubscriptions();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        const myScore = myPlayerRole.value === 'p1' ? p1.value.score : p2.value.score;
        const myName = myPlayerRole.value === 'p1' ? p1.value.name : p2.value.name;
        let resultMark = winName === myName ? '【勝】' : '【敗】'; if (isEscape) resultMark = '【逃】';

        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字吞食天地', score: myScore, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: `結果: ${resultMark} (${reasonText}) | 總戰功: ${myScore}`
        }]);
    }
};

const leaveLobby = () => { cleanupSubscriptions(); navigateTo('/'); };
const cleanupSubscriptions = () => {
    if (roomSubscription) supabase.removeChannel(roomSubscription);
    if (eventSubscription) supabase.removeChannel(eventSubscription);
};
onUnmounted(() => { clearInterval(timer); cleanupSubscriptions(); });
</script>

<template>
  <div class="tenchi-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">⚔️ 吞食天地</h2>
      <div v-if="matchStatus === 'playing'" class="t-timer">兵時: {{ timeSpent }}</div>
      <button class="retro-btn btn-danger btn-small" @click="handleLeaveClick">離開</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="showManual" class="setup-overlay" style="z-index: 110;">
       <div class="rpg-dialog manual-dialog retro-element">
          <div class="manual-tabs">
             <button class="retro-btn" :class="{ 'btn-primary': manualTab === 'formations' }" @click="manualTab = 'formations'">🛡️ 陣形</button>
             <button class="retro-btn" :class="{ 'btn-primary': manualTab === 'strategies' }" @click="manualTab = 'strategies'">📜 策略</button>
          </div>
          
          <div class="manual-content">
             <template v-if="manualTab === 'formations'">
                <div v-for="f in formationsGuide" :key="f.name" class="guide-item" :class="{ 'locked': !f.isUnlocked }">
                   <h4>
                      {{ f.name }}
                      <span class="unlock-req" v-if="!f.isUnlocked">需 {{ f.reqWins }} 勝解鎖</span>
                      <span class="unlock-req ok" v-else>已解鎖</span>
                   </h4>
                   <p>{{ f.desc }}</p>
                </div>
             </template>
             <template v-if="manualTab === 'strategies'">
                <div v-for="s in strategiesGuide" :key="s.name" class="guide-item" :class="{ 'locked': !s.isUnlocked }">
                   <h4>
                      {{ s.icon }} {{ s.name }} (耗SP:{{ s.cost }})
                      <span class="unlock-req" v-if="!s.isUnlocked">需 {{ s.reqWins }} 勝解鎖</span>
                      <span class="unlock-req ok" v-else>已解鎖</span>
                   </h4>
                   <p>{{ s.desc }}</p>
                </div>
             </template>
          </div>
          <button class="retro-btn btn-danger" @click="showManual = false" style="margin-top: 15px; width: 100%;">關閉兵法書</button>
       </div>
    </div>

    <div v-else-if="matchStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element">
        <div class="icon-big">🐎</div>
        <h2>討伐大廳</h2>
        <p style="margin-bottom:10px;">募集義勇軍！點擊下方尋找同單元的對手，若無人則會為您建立營帳等待。</p>
        
        <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; border: 1px dashed #ffeb3b; margin-bottom: 15px;">
           <span style="color:#ffeb3b; font-weight:bold; font-size:1.1rem;">🏆 你的戰功：{{ myWins }} 勝</span>
        </div>
        
        <button class="retro-btn" style="margin-bottom:15px; width:100%; border-color:#81c784; color:#81c784;" @click="showManual = true">📖 觀看兵法書 (陣形/策略)</button>

        <button class="retro-btn btn-primary" style="width: 100%;" @click="findMatch">出陣 (尋找對手)</button>
      </div>
    </div>

    <div v-else-if="matchStatus === 'waiting'" class="setup-overlay">
      <div class="rpg-dialog retro-element">
        <div class="spinner">⏳</div>
        <h2>營帳紮營中...</h2>
        <p style="color:#ffeb3b;">請通知您的對手點擊出陣以加入您的部隊！</p>
        <button class="retro-btn btn-danger" style="margin-top:20px;" @click="leaveLobby">拔營取消</button>
      </div>
    </div>

    <div v-else-if="matchStatus === 'playing' || matchStatus === 'end'" class="battlefield">
      
      <div class="rpg-log-box retro-element">
         <div v-for="log in battleLog" :key="log.id" class="log-entry" :class="log.type">{{ log.text }}</div>
      </div>

      <div class="armies-container">
        <div class="army-panel p1-side">
           <div class="army-header retro-element">
               <span>{{ p1.name }}軍</span>
               <span class="score-text">戰功 {{ p1.score }} | SP {{ p1.sp }}/{{ p1.maxSp }}</span>
           </div>
           
           <div class="generals-list align-left">
              <div v-for="(g, i) in p1.generals" :key="g.id" 
                   class="rpg-general-card" 
                   :class="{'is-dead': g.isDead, 'active-turn': myPlayerRole === 'p1' && matchStatus === 'playing' && i === myTarget.attackerIndex}" 
                   :style="{ transform: `translateX(${getFormationOffsetPx(i, p1.formation, false)}px)` }">
                 <div class="fx-layer" v-for="eff in effects.filter(e => e.targetId === g.id)" :key="eff.id">
                     <div v-if="eff.fxClass" class="element-fx" :class="eff.fxClass"></div>
                     <div v-if="eff.text" class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
                 </div>
                 <div class="avatar-box">{{ g.face }}</div>
                 <div class="info-box">
                    <div class="g-word">{{ g.name }}</div>
                    <div class="hp-row">
                        <span class="g-hp-text">兵:{{ g.hp }}</span>
                        <div class="hp-bar-bg"><div class="hp-bar-fill" :style="{ width: `${(g.hp/g.maxHp)*100}%`, background: g.hp > g.maxHp*0.3 ? '#4caf50' : '#f44336' }"></div></div>
                    </div>
                    <div class="stat-row">攻{{g.atk}} 防{{g.def}} 智{{g.int}} 避{{g.eva}}%</div>
                 </div>
              </div>
           </div>

           <div v-if="myPlayerRole === 'p1'" class="formation-control">
               <span style="font-weight:bold; font-size:0.8rem; color:#aaa;">陣形：</span>
               <select v-model="myFormationSelection" @change="changeFormationSelected" class="retro-select" :disabled="unlockedFormations.length <= 1">
                   <option v-for="f in unlockedFormations" :key="f" :value="f">{{ f }}</option>
               </select>
           </div>
           <div v-else class="formation-tag">陣形：{{ p1.formation }}</div>
        </div>

        <div class="army-panel p2-side">
           <div class="army-header retro-element">
               <span>{{ p2.name }}軍</span>
               <span class="score-text">戰功 {{ p2.score }} | SP {{ p2.sp }}/{{ p2.maxSp }}</span>
           </div>
           
           <div class="generals-list align-right">
              <div v-for="(g, i) in p2.generals" :key="g.id" 
                   class="rpg-general-card reverse" 
                   :class="{'is-dead': g.isDead, 'active-turn': myPlayerRole === 'p2' && matchStatus === 'playing' && i === myTarget.attackerIndex}" 
                   :style="{ transform: `translateX(${getFormationOffsetPx(i, p2.formation, true)}px)` }">
                 <div class="fx-layer" v-for="eff in effects.filter(e => e.targetId === g.id)" :key="eff.id">
                     <div v-if="eff.fxClass" class="element-fx" :class="eff.fxClass"></div>
                     <div v-if="eff.text" class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
                 </div>
                 <div class="info-box right-align">
                    <div class="g-word">{{ g.name }}</div>
                    <div class="hp-row reverse-row">
                        <span class="g-hp-text">兵:{{ g.hp }}</span>
                        <div class="hp-bar-bg"><div class="hp-bar-fill" :style="{ width: `${(g.hp/g.maxHp)*100}%`, background: g.hp > g.maxHp*0.3 ? '#2196f3' : '#f44336' }"></div></div>
                    </div>
                    <div class="stat-row">攻{{g.atk}} 防{{g.def}} 智{{g.int}} 避{{g.eva}}%</div>
                 </div>
                 <div class="avatar-box">{{ g.face }}</div>
              </div>
           </div>

           <div v-if="myPlayerRole === 'p2'" class="formation-control right-align">
               <span style="font-weight:bold; font-size:0.8rem; color:#aaa;">陣形：</span>
               <select v-model="myFormationSelection" @change="changeFormationSelected" class="retro-select" :disabled="unlockedFormations.length <= 1">
                   <option v-for="f in unlockedFormations" :key="f" :value="f">{{ f }}</option>
               </select>
           </div>
           <div v-else class="formation-tag right-align">陣形：{{ p2.formation }}</div>
        </div>
      </div>

      <div v-if="matchStatus === 'playing'" class="rpg-input-console retro-element">
          <div class="m-target-zh">【{{ myTarget.attackerName }}】的回合：拼出「{{ myTarget.zh }}」</div>
          
          <div class="m-slots">
              <span v-for="(slot, i) in myTarget.slots" :key="i" class="m-slot" :class="{'is-blank': slot.isBlank, 'filled': slot.filled}">{{ slot.filled ? slot.char : '_' }}</span>
          </div>

          <div v-if="myTarget.status === 'typing'" class="m-keyboard">
              <button v-for="opt in myTarget.options" :key="opt.id" class="retro-btn m-key" :class="{'used': opt.used}" @click="handleOptionClick(opt)">{{ opt.char.toUpperCase() }}</button>
          </div>

          <div v-else-if="myTarget.status === 'selecting_action'" class="m-actions">
              <button v-for="act in getAvailableActions" :key="act.name" 
                      class="retro-btn action-btn" :class="{ 'disabled-act': act.disabled, 'escape-btn': act.name==='escape' }"
                      :disabled="act.disabled" @click="executeAction(act.name)">
                  {{ act.label }}
              </button>
          </div>
      </div>

    </div>

    <div v-if="matchStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>天下底定</h1>
          <p class="winner-text" v-if="winner !== '無'">恭喜 {{ winner }} 取得勝利！</p>
          <p class="winner-text" v-else>戰役中止</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ endReason }}</p>
          <div class="final-scores">
             <p>{{ p1.name }}軍: {{ p1.score }} 戰功</p>
             <p>{{ p2.name }}軍: {{ p2.score }} 戰功</p>
          </div>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">班師回朝</NuxtLink>
       </div>
    </div>
  </div>
</template>

<style scoped>
.tenchi-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #000; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: #0000aa; border: 3px solid #fff; border-radius: 2px; box-shadow: inset 0 0 0 2px #000, 0 0 0 2px #000; color: #fff; padding: 6px; box-sizing: border-box; }
.retro-btn { background: #000; color: #fff; border: 2px solid #fff; border-radius: 2px; font-family: inherit; font-weight: bold; cursor: pointer; padding: 6px; }
.retro-btn:active:not(.used):not(:disabled) { background: #fff; color: #000; }
.retro-btn:disabled { opacity: 0.5; border-color: #555; color: #aaa; cursor: not-allowed; }
.btn-primary { padding: 10px 20px; font-size: 1.2rem; background: #b30000; border-color: #ffcccc;}
.btn-danger { background: #d32f2f; border-color:#ffcdd2;}
.btn-small { padding: 5px 10px; font-size: 1rem; }

/* 🌟 下拉選單設計 */
.formation-control { display: flex; align-items: center; margin-top: 5px; gap: 5px; }
.formation-control.right-align { justify-content: flex-end; }
.retro-select { background: #222; color: #fff; border: 2px solid #777; padding: 4px; font-family: inherit; font-weight: bold; outline: none; border-radius: 4px; font-size: 0.9rem;}
.retro-select:disabled { opacity: 0.5; cursor: not-allowed; }

.t-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; border-bottom: none; border-left: none; border-right: none; margin-bottom: 2px; padding: 4px 8px;}
.t-title { margin: 0; font-size: 1.1rem; font-weight: 900; text-shadow: 2px 2px 0 #000; }
.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 400px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.rpg-dialog h2 { color: #ffeb3b; margin-top: 0;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.spinner { font-size: 3rem; animation: spin 2s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.manual-dialog { max-width: 500px; width: 95%; padding: 15px; display: flex; flex-direction: column; max-height: 90vh;}
.manual-tabs { display: flex; gap: 10px; margin-bottom: 10px;}
.manual-tabs .retro-btn { flex: 1; padding: 10px; font-size: 1.1rem; }
.manual-content { flex: 1; overflow-y: auto; background: rgba(0,0,0,0.5); border: 2px solid #555; padding: 10px; text-align: left;}
.guide-item { border-bottom: 1px dashed #555; padding-bottom: 10px; margin-bottom: 10px;}
.guide-item:last-child { border-bottom: none; margin-bottom: 0;}
.guide-item h4 { margin: 0 0 5px 0; color: #ffeb3b; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;}
.guide-item p { margin: 0; font-size: 0.9rem; color: #ddd; }
.guide-item.locked { opacity: 0.4; filter: grayscale(100%); }
.unlock-req { font-size: 0.8rem; background: #d32f2f; color: #fff; padding: 2px 6px; border-radius: 4px;}
.unlock-req.ok { background: #4caf50; }

.battlefield { flex: 1; display: flex; flex-direction: column; padding: 2px; gap: 2px; min-height: 0;}
.rpg-log-box { height: 65px; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; padding: 4px 8px; margin-bottom: 2px; }
.log-entry { font-size: 0.8rem; font-weight: bold; margin-bottom: 2px; text-shadow: 1px 1px 0 #000; animation: fadeIn 0.3s ease-out;}
.log-entry.sys { color: #ffeb3b; text-align: center;}
.log-entry.p1 { color: #81c784; }
.log-entry.p2 { color: #64b5f6; text-align: right;}
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.armies-container { flex: 1; display: flex; flex-direction: row; justify-content: space-between; gap: 4px; min-height: 0; overflow: hidden;}
.army-panel { flex: 1; display: flex; flex-direction: column; min-height: 0; width: 50%; padding: 0;}
.army-header { display: flex; justify-content: space-between; align-items: center; padding: 4px; font-size: 0.75rem; font-weight: bold; margin-bottom: 2px; }
.p1-side .army-header { background: #004d00; border-color: #81c784;}
.p2-side .army-header { background: #000066; border-color: #64b5f6;}
.score-text { color: #ffeb3b; }

.generals-list { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; overflow-x: visible; padding: 5px 30px;}
.align-left { align-items: flex-start; }
.align-right { align-items: flex-end; }

.rpg-general-card { display: inline-flex; align-items: center; background: #000; border: 2px solid #fff; padding: 2px 4px; border-radius: 4px; position: relative; transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: inset 0 0 0 1px #000, 2px 2px 0 rgba(255,255,255,0.2); min-width: 100px; }
.rpg-general-card.reverse { flex-direction: row-reverse; }
.rpg-general-card.is-dead { opacity: 0.3; filter: grayscale(100%); border-color: #555;}
.rpg-general-card.active-turn { border-color: #ffeb3b; box-shadow: inset 0 0 5px #ffeb3b, 0 0 8px #ffeb3b; z-index: 10;}
.rpg-general-card.active-turn .avatar-box { animation: bounceAvatar 0.5s infinite alternate; border-color: #ffeb3b;}
@keyframes bounceAvatar { from { transform: translateY(0); } to { transform: translateY(-4px); } }

.avatar-box { font-size: 1.2rem; background: #222; border: 1px solid #777; padding: 2px; margin-right: 4px;}
.reverse .avatar-box { margin-right: 0; margin-left: 4px; }
.info-box { display: flex; flex-direction: column; justify-content: center;}
.right-align { text-align: right; align-items: flex-end;}
.g-word { font-size: 0.85rem; font-weight: 900; color: #ffeb3b; text-shadow: 1px 1px 0 #000; letter-spacing: 1px; margin-bottom: 2px;}

.hp-row { display: flex; align-items: center; gap: 4px; }
.reverse-row { flex-direction: row-reverse; }
.g-hp-text { font-size: 0.65rem; color: #fff; font-weight: bold;}
.hp-bar-bg { width: 35px; height: 5px; background: #333; border: 1px solid #aaa;}
.hp-bar-fill { height: 100%; transition: width 0.3s ease-out;}

/* 🌟 能力值小列樣式 */
.stat-row { font-size: 0.55rem; color: #aaa; margin-top: 2px; white-space: nowrap; font-family: monospace; letter-spacing: -0.5px;}

.formation-tag { font-size: 0.75rem; color: #ffeb3b; margin-top: 5px; text-shadow: 1px 1px 0 #000; font-weight: bold;}

.fx-layer { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center; pointer-events: none; z-index: 20; width: 100%; height: 100%; }
.element-fx { position: absolute; font-size: 3rem; display: flex; justify-content: center; align-items: center; }
.attack-fx::after { content: '💢'; animation: burst 0.4s ease-out forwards; }
.fire-fx::after { content: '🔥'; animation: burst 0.6s ease-out forwards; filter: drop-shadow(0 0 10px red); }
.water-fx::after { content: '🌊'; animation: waveSplash 0.6s ease-out forwards; filter: drop-shadow(0 0 10px blue); }
.stone-fx::after { content: '🪨'; animation: rockDrop 0.5s ease-in forwards; filter: drop-shadow(0 0 5px black); }
.heal-fx::after { content: '💚'; animation: floatUpFx 0.8s ease-out forwards; filter: drop-shadow(0 0 10px green); }
.revive-fx::after { content: '🌟'; animation: spinBurst 0.8s ease-out forwards; filter: drop-shadow(0 0 15px gold); }
.dispel-fx::after { content: '🌪️'; animation: spinBurst 0.6s ease-out forwards; filter: drop-shadow(0 0 10px cyan); }
.assassinate-fx::after { content: '🥷'; animation: dropSlash 0.6s ease-in forwards; filter: drop-shadow(0 0 10px purple); }
.smoke-fx::after { content: '💨'; animation: spinBurst 0.8s ease-out forwards; filter: drop-shadow(0 0 10px gray); }

@keyframes burst { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
@keyframes waveSplash { 0% { transform: translateY(20px) scale(0.8); opacity: 1; } 100% { transform: translateY(-40px) scale(2); opacity: 0; } }
@keyframes rockDrop { 0% { transform: translateY(-50px) scale(2); opacity: 1; } 100% { transform: translateY(0) scale(1.5); opacity: 0; } }
@keyframes floatUpFx { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-50px) scale(1.8); opacity: 0; } }
@keyframes spinBurst { 0% { transform: scale(0) rotate(0deg); opacity: 1; } 100% { transform: scale(2.5) rotate(180deg); opacity: 0; } }
@keyframes dropSlash { 0% { transform: translateY(-50px) scale(2); opacity: 0; } 50% { transform: translateY(0) scale(1.5); opacity: 1; } 100% { transform: translate(30px, 30px) scale(1) rotate(45deg); opacity: 0; } }

.dmg-pop { position: absolute; top: -10px; font-size: 1.2rem; font-weight: 900; color: #ff3333; text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff; animation: floatTxt 0.8s ease-out forwards; }
.dmg-pop.heal { color: #4caf50; text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff; animation: floatTxt 1s ease-out forwards; font-size: 1.5rem;}
.dmg-pop.strat-dmg { color: #ffeb3b; text-shadow: 2px 2px 0 #d32f2f, -1px -1px 0 #d32f2f; font-size: 1.8rem; animation: floatTxt 1.2s ease-out forwards;}
@keyframes floatTxt { 0% { opacity: 1; transform: translateY(0) scale(0.8); } 50% { transform: translateY(-20px) scale(1.2); } 100% { opacity: 0; transform: translateY(-40px) scale(1); } }

.rpg-input-console { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; min-height: 130px; justify-content: center;}
.m-target-zh { font-size: 0.9rem; color: #ffeb3b; text-shadow: 1px 1px 0 #000; font-weight: bold;}
.m-slots { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; margin-bottom: 2px;}
.m-slot { font-size: 1.2rem; font-weight: 900; color: #fff; border-bottom: 2px solid transparent; min-width: 15px; text-align: center;}
.m-slot.is-blank { color: #777; border-bottom-color: #777; }
.m-slot.is-blank.filled { color: #ffeb3b; border-bottom-color: #ffeb3b; text-shadow: 1px 1px 0 #000;}

.m-keyboard { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 500px;}
.m-key { width: 32px; height: 32px; font-size: 1.2rem; display: flex; justify-content: center; align-items: center; border-radius: 4px; box-shadow: 1px 1px 0 #fff; transition: 0.1s; padding:0;}
.m-key:active:not(.used) { transform: translate(1px, 1px); box-shadow: none;}
.m-key.used { opacity: 0.2; pointer-events: none;}

.m-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; width: 100%; max-width: 500px;}
.action-btn { padding: 6px 10px; font-size: 1rem; border-color: #ffeb3b; color: #ffeb3b;}
.action-btn.disabled-act { border-color: #555; color: #888; opacity: 0.5;}
.escape-btn { border-color: #e57373; color: #e57373; } 

.winner-text { font-size: 1.5rem; color: #ffeb3b; font-weight: bold;}
.final-scores { background: #000; padding: 15px; border: 2px solid #777; margin-top: 15px;}

@media (min-width: 768px) {
  .g-word { font-size: 1.3rem; } .hp-bar-bg { width: 60px; height: 6px;} .m-key { width: 50px; height: 50px; font-size: 1.8rem; }
  .rpg-general-card { min-width: 160px; padding: 6px 10px;} .avatar-box { font-size: 1.8rem; }
  .generals-list { padding: 10px 40px; gap: 10px;} .rpg-log-box { height: 80px; } .log-entry { font-size: 1rem; }
  .m-slot { font-size: 1.8rem; min-width: 25px;} .m-target-zh { font-size: 1.2rem; }
  .action-btn { font-size: 1.2rem; padding: 8px 12px; }
  .retro-select { font-size: 1rem; padding: 6px;}
  .stat-row { font-size: 0.7rem; }
}
</style>