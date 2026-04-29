<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

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

// 🌟 新增逃跑防堵變數
const maxEscapes = ref(20); 
const todayEscapesCount = ref(0); 

const config = ref({ 
  hp: 100, sp: 40, minDmg: 5, maxDmg: 15, escapeRate: 50, winsPerFormation: 8, blankCount: 3,
  tenchi_base_atk: 10, tenchi_base_def: 10, tenchi_base_int: 10, tenchi_base_eva: 10,
  tenchi_player_atk: 15, tenchi_player_def: 15, tenchi_player_int: 15, tenchi_player_eva: 10
});

const myPlayerRole = ref(null); 
const currentRoomId = ref(null);

const myWins = ref(0);
const totalTurns = ref(0); 

const dbUnlockedFormations = ref([]);
const dbUnlockedStrategies = ref([]);

const showGuide = ref(false);
const guideTab = ref('formation'); 

const myCurrentTurnIdx = ref(0); 
const isSelectingAction = ref(false); 
const showFormationMenu = ref(false); 

const formationOrder = ['散開之陣', '鶴翼之陣', '衝方之陣', '白馬之陣', '魚鱗之陣', '鋒矢之陣', '一文字之陣', '背水之陣', '靜寂之陣', '八卦之陣'];

const formations = ref({
    '散開之陣': { offsets: [0, 0, 0, 0, 0], desc: "無特殊效果，各武將處於正常位置。" },
    '鶴翼之陣': { offsets: [0, 0, 30, 0, 0], desc: "全員攻擊力上升，防禦下降。第三位增減最為明顯！" },
    '衝方之陣': { offsets: [20, -15, 20, -15, 20], desc: "一三五主攻，二與四防禦大幅受惠！" },
    '白馬之陣': { offsets: [20, 0, 0, -15, -15], desc: "全員速度上升！降低水計的成功率與威力。" },
    '魚鱗之陣': { offsets: [0, 20, 30, 20, 0], desc: "二三四攻防提升；一五退守，攻擊力變零！" },
    '鋒矢之陣': { offsets: [0, 10, 35, 10, 0], desc: "第三位主攻；一五防禦大幅上升，攻擊力變零！" },
    '一文字之陣': { offsets: [15, 15, 15, 15, 15], desc: "全員向前突擊！攻擊力上升，防禦力下降！" },
    '背水之陣': { offsets: [-25, -25, -25, -25, -25], desc: "破釜沉舟！攻擊力大幅上升，易發動奮戰一擊！" },
    '靜寂之陣': { offsets: [0, 0, 0, 0, 0], desc: "全員隱身！防禦力與迴避率大幅地退守上升！(三回合後散開)" },
    '八卦之陣': { offsets: [0, 20, -20, 20, 0], desc: "設有生門與死門，部分武將呈現無敵狀態！" }
});

const defaultFormationMults = {
  "散開之陣": { "atk": [1.0, 1.0, 1.0, 1.0, 1.0], "def": [1.0, 1.0, 1.0, 1.0, 1.0] },
  "鶴翼之陣": { "atk": [1.2, 1.3, 1.5, 1.3, 1.2], "def": [0.8, 0.7, 0.5, 0.7, 0.8] },
  "衝方之陣": { "atk": [1.3, 1.0, 1.3, 1.0, 1.3], "def": [1.0, 1.5, 1.0, 1.5, 1.0] },
  "白馬之陣": { "atk": [1.1, 1.1, 1.1, 1.1, 1.1], "def": [1.1, 1.1, 1.1, 1.1, 1.1] },
  "魚鱗之陣": { "atk": [0.0, 1.2, 1.3, 1.2, 0.0], "def": [1.5, 1.2, 1.3, 1.2, 1.5] },
  "鋒矢之陣": { "atk": [0.0, 0.8, 1.5, 0.8, 0.0], "def": [1.5, 1.2, 0.5, 1.2, 1.5] },
  "一文字之陣": { "atk": [1.3, 1.3, 1.3, 1.3, 1.3], "def": [0.7, 0.7, 0.7, 0.7, 0.7] },
  "背水之陣": { "atk": [1.6, 1.6, 1.6, 1.6, 1.6], "def": [0.5, 0.5, 0.5, 0.5, 0.5] },
  "靜寂之陣": { "atk": [1.0, 1.0, 1.0, 1.0, 1.0], "def": [2.0, 2.0, 2.0, 2.0, 2.0] },
  "八卦之陣": { "atk": [1.2, 0.8, 1.3, 0.8, 1.2], "def": [1.0, 1.0, 1.0, 1.0, 1.0] }
};

const strategies = ref({
  "火計": { type: "damage", unlockWins: 0, power: 15, cost: 8, desc: "對敵人造成火焰傷害，智力越高威力越大。" }
});

const unlockedFormations = computed(() => {
    let winCount = 1 + Math.floor(myWins.value / config.value.winsPerFormation);
    winCount = Math.min(winCount, formationOrder.length); 
    const winUnlocked = formationOrder.slice(0, winCount);
    const combined = new Set([...winUnlocked, ...dbUnlockedFormations.value]);
    return formationOrder.filter(f => combined.has(f));
});

const unlockedStrategies = computed(() => {
    const list = [];
    for (const [sName, strat] of Object.entries(strategies.value)) {
        if (myWins.value >= strat.unlockWins) list.push(sName);
    }
    const combined = new Set([...list, ...dbUnlockedStrategies.value]);
    return Object.keys(strategies.value).filter(s => combined.has(s));
});

const currentAttackerName = computed(() => {
    if (matchStatus.value !== 'playing' || !myPlayerRole.value) return '';
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    if (myArmy.generals[myCurrentTurnIdx.value]) return myArmy.generals[myCurrentTurnIdx.value].name;
    return '';
});

const roomData = ref(null);
const p1 = ref({ id: '', name: '', score: 0, formation: '散開之陣', generals: [], stealthStartTurn: -1, smokeTurn: -1, sp: 200, maxSp: 200 });
const p2 = ref({ id: '', name: '', score: 0, formation: '散開之陣', generals: [], stealthStartTurn: -1, smokeTurn: -1, sp: 200, maxSp: 200 });
const winner = ref(null);
const endReason = ref('');

const battleLog = ref([]); 
const effects = ref([]); 
const myTarget = ref({ word: '', zh: '', targetChars: [], typedCount: 0, slots: [], options: [], attackerIndex: 0 });

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
  miss: () => { playTone(900, 'sine', 0.1, 0.05); setTimeout(() => playTone(1200, 'sine', 0.1, 0.05), 100); },
  crit: () => { playTone(100, 'sawtooth', 0.1, 0.3); setTimeout(() => playTone(50, 'sawtooth', 0.2, 0.3), 50); },
  defeat: () => { playTone(300, 'sine', 0.5, 0.2); setTimeout(() => playTone(200, 'sine', 0.5, 0.2), 200); },
  win: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3), i * 150)); },
  fire: () => { playTone(200, 'sawtooth', 0.2, 0.15); setTimeout(() => playTone(100, 'sawtooth', 0.3, 0.15), 100); },
  water: () => { playTone(300, 'sine', 0.1, 0.15); setTimeout(() => playTone(400, 'sine', 0.2, 0.15), 100); setTimeout(() => playTone(200, 'sine', 0.2, 0.15), 200); },
  stone: () => { playTone(80, 'square', 0.3, 0.25); },
  dispel: () => { playTone(800, 'triangle', 0.1, 0.1); setTimeout(() => playTone(400, 'triangle', 0.2, 0.1), 100); },
  revive: () => { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3, 0.1), i * 150)); },
  assassinate: () => { playTone(100, 'square', 0.1, 0.3); setTimeout(() => playTone(50, 'sawtooth', 0.5, 0.4), 100); }, 
  smoke: () => { playTone(800, 'sine', 0.4, 0.1); setTimeout(() => playTone(600, 'sine', 0.4, 0.1), 200); } 
};

const speakWord = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; utterance.rate = 0.9; window.speechSynthesis.speak(utterance);
  }
};

// 🌟 檢查今天是否逃跑太多次
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
        .eq('game_type', '單字吞食天地')
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

// 🌟 修復：正確定義離開分頁時的處理邏輯
const handleUnloadLeave = () => {
    if (matchStatus.value === 'playing') {
        supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -2, damage: 0, word_typed: 'escape_success' }]).then();
        if (studentCookie.value && !studentCookie.value.isAnon) {
            const myScore = myPlayerRole.value === 'p1' ? p1.value.score : p2.value.score;
            supabase.from('game_records').insert([{
                student_id: studentCookie.value.id, game_type: '單字吞食天地', score: myScore, time_taken_seconds: timeSpent.value,
                version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
                correct_words: `結果: 【逃】 (中斷連線逃走) | 總戰功: ${myScore}`
            }]).then();
        }
    }
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入才能進行連線對戰！'; return; }
    
    for (const [key, val] of Object.entries(defaultFormationMults)) {
        if (formations.value[key]) formations.value[key].mults = val;
    }

    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
      if (settings.tenchi_hp) config.value.hp = settings.tenchi_hp;
      if (settings.tenchi_min_dmg) config.value.minDmg = settings.tenchi_min_dmg;
      if (settings.tenchi_max_dmg) config.value.maxDmg = settings.tenchi_max_dmg;
      if (settings.tenchi_escape_rate !== null) config.value.escapeRate = settings.tenchi_escape_rate;
      if (settings.tenchi_wins_per_formation) config.value.winsPerFormation = settings.tenchi_wins_per_formation;
      if (settings.tenchi_blank_count) config.value.blankCount = settings.tenchi_blank_count;
      
      if (settings.tenchi_sp) config.value.sp = settings.tenchi_sp;
      if (settings.tenchi_base_atk) config.value.tenchi_base_atk = settings.tenchi_base_atk;
      if (settings.tenchi_base_def) config.value.tenchi_base_def = settings.tenchi_base_def;
      if (settings.tenchi_base_int) config.value.tenchi_base_int = settings.tenchi_base_int;
      if (settings.tenchi_base_eva) config.value.tenchi_base_eva = settings.tenchi_base_eva;
      if (settings.tenchi_player_atk) config.value.tenchi_player_atk = settings.tenchi_player_atk;
      if (settings.tenchi_player_def) config.value.tenchi_player_def = settings.tenchi_player_def;
      if (settings.tenchi_player_int) config.value.tenchi_player_int = settings.tenchi_player_int;
      if (settings.tenchi_player_eva) config.value.tenchi_player_eva = settings.tenchi_player_eva;

      // 🌟 讀取吞食天地逃跑門檻
      maxEscapes.value = settings.tenchi_max_escapes !== undefined && settings.tenchi_max_escapes !== null ? Number(settings.tenchi_max_escapes) : 20;

      if (settings.tenchi_formations_config && Object.keys(settings.tenchi_formations_config).length > 0) {
          for (const [key, cfg] of Object.entries(settings.tenchi_formations_config)) {
              if (formations.value[key]) formations.value[key].mults = cfg;
          }
      }
      if (settings.tenchi_strategies_config && Object.keys(settings.tenchi_strategies_config).length > 0) {
          strategies.value = settings.tenchi_strategies_config;
      }
    }
    
    const { data: studentData } = await supabase.from('students').select('tenchi_formations, tenchi_strategies').eq('student_id', String(studentCookie.value.id)).single();
    if (studentData) {
        if (studentData.tenchi_formations) dbUnlockedFormations.value = studentData.tenchi_formations;
        if (studentData.tenchi_strategies) dbUnlockedStrategies.value = studentData.tenchi_strategies;
    }

    const { data: winData } = await supabase.from('game_records').select('id, correct_words').eq('student_id', String(studentCookie.value.id)).eq('game_type', '單字吞食天地');
    if (winData) myWins.value = winData.filter(r => r.correct_words && r.correct_words.includes('【勝】')).length;
    
    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (data && data.length >= 5) allWords.value = data.filter(v => v.en_us && v.en_us.length > 0);
      else errorMsg.value = '⚠️ 該單元單字不足，無法進行對戰！';
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }

    // 🌟 綁定事件並檢查禁賽
    window.addEventListener('beforeunload', handleUnloadLeave);
    if (studentCookie.value && !studentCookie.value.isAnon) {
      await supabase.from('tenchi_rooms').delete().eq('p1_id', studentCookie.value.id).eq('status', 'waiting');
      await checkEscapeBanStatus(); 
    }

  } catch (e) { console.error(e); }
});

const getGeneralsData = (isP2, playerName) => {
    const p1Names = ['關羽', '張飛', '趙雲', '馬超', '黃忠', '諸葛亮', '魏延', '龐統', '姜維'].sort(() => 0.5 - Math.random());
    const p1Faces = ['👲', '🧔', '👳', '🥷', '💂', '🕵️', '👨‍🎤', '👨‍🎓', '👨‍🏫', '👨‍⚖️'].sort(() => 0.5 - Math.random());
    const p2Names = ['夏侯惇', '許褚', '張遼', '曹仁', '徐晃', '司馬懿', '典韋', '龐德', '張郃'].sort(() => 0.5 - Math.random());
    const p2Faces = ['👺', '👹', '👿', '👽', '💀', '🤡', '🤖', '🎃', '🧟', '🧛'].sort(() => 0.5 - Math.random());

    const names = isP2 ? p2Names : p1Names;
    const faces = isP2 ? p2Faces : p1Faces;
    
    const getStat = (base) => {
        const b = Number(base);
        const min = Math.floor(b * 0.8);
        const max = Math.ceil(b * 1.2);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const getEva = (base) => {
        const b = Number(base);
        const min = Math.max(0, b - 3); 
        const max = Math.min(100, b + 5); 
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    return Array.from({ length: 5 }).map((_, i) => {
        const isPlayer = (i === 0);
        const finalName = isPlayer ? playerName : names[i];
        
        return {
            id: `${isP2 ? 'p2' : 'p1'}_g${i}`, face: faces[i], name: finalName, 
            hp: config.value.hp, maxHp: config.value.hp, 
            atk: getStat(isPlayer ? config.value.tenchi_player_atk : config.value.tenchi_base_atk),
            def: getStat(isPlayer ? config.value.tenchi_player_def : config.value.tenchi_base_def),
            int: getStat(isPlayer ? config.value.tenchi_player_int : config.value.tenchi_base_int),
            eva: getEva(isPlayer ? config.value.tenchi_player_eva : config.value.tenchi_base_eva),
            isDead: false, posIndex: i 
        };
    });
};

const getFormationOffsetPx = (index, formationName, isP2) => {
    const logicForward = formations.value[formationName]?.offsets[index] || 0;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const scale = isMobile ? 0.7 : 1.8; 
    return isP2 ? -(logicForward * scale) : (logicForward * scale); 
};

watch(totalTurns, (newTurns) => {
    const checkStealth = async (army, role) => {
        if (army.formation === '靜寂之陣' && army.stealthStartTurn !== -1) {
            const passedTurns = Math.floor((newTurns - army.stealthStartTurn) / 10);
            if (passedTurns >= 3) {
                army.formation = '散開之陣'; army.stealthStartTurn = -1; sfx.dispel();
                addLog(`💨 ${army.name} 的隱身時效已過，自動恢復【散開之陣】！`, role);
            }
        }
        if (army.smokeTurn !== -1) {
            if (newTurns - army.smokeTurn >= 10) {
                army.smokeTurn = -1;
                addLog(`💨 ${army.name}軍 的煙遁迷霧散去了！`, role);
            }
        }
    };
    checkStealth(p1.value, 'p1'); checkStealth(p2.value, 'p2');
});

const findMatch = async () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    matchStatus.value = 'waiting'; errorMsg.value = '';

    const unitKey = `${route.query.version}_${route.query.volume}_${route.query.unit}`;
    const myId = String(studentCookie.value.id); const myName = studentCookie.value.name || '無名氏';
    
    // 🌟 二次防護，避免禁賽被繞過
    if (todayEscapesCount.value >= maxEscapes.value) { matchStatus.value = 'banned'; return; }

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

            pollTimer = setInterval(async () => {
                if (matchStatus.value !== 'waiting') { clearInterval(pollTimer); return; }
                const { data: checkRoom } = await supabase.from('tenchi_rooms').select('status, p2_id, p2_name').eq('id', currentRoomId.value).single();
                if (checkRoom && checkRoom.status === 'playing') {
                    setupGameData(myId, myName, checkRoom.p2_id, checkRoom.p2_name);
                }
            }, 3000);

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
    if(pollTimer) clearInterval(pollTimer);

    const genP1 = getGeneralsData(false, p1Name);
    const genP2 = getGeneralsData(true, p2Name);
    
    const p1Sp = Number(config.value.sp) + Math.floor(genP1.reduce((sum, g) => sum + g.int, 0) * 0.1);
    const p2Sp = Number(config.value.sp) + Math.floor(genP2.reduce((sum, g) => sum + g.int, 0) * 0.1);

    p1.value = { id: p1Id, name: p1Name, score: 0, formation: '散開之陣', generals: genP1, stealthStartTurn: -1, smokeTurn: -1, sp: p1Sp, maxSp: p1Sp };
    p2.value = { id: p2Id, name: p2Name, score: 0, formation: '散開之陣', generals: genP2, stealthStartTurn: -1, smokeTurn: -1, sp: p2Sp, maxSp: p2Sp };
    
    totalTurns.value = 0; myCurrentTurnIdx.value = 0; isSelectingAction.value = false;
    matchStatus.value = 'playing'; gameStartTime.value = Date.now();
    addLog(`📜 戰鬥開始！${p1Name}軍 VS ${p2Name}軍`, 'sys');
    timer = setInterval(() => { timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); }, 1000);
    assignNewTarget(); 
};

const advanceTurn = () => {
    if (matchStatus.value !== 'playing') return;
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    
    if (myArmy.generals.every(g => g.isDead)) return;

    let nextIdx = (myCurrentTurnIdx.value + 1) % 5;
    let loopCount = 0;
    while (myArmy.generals[nextIdx].isDead && loopCount < 5) {
        nextIdx = (nextIdx + 1) % 5;
        loopCount++;
    }
    myCurrentTurnIdx.value = nextIdx;
};

const assignNewTarget = () => {
    if (matchStatus.value !== 'playing') return;

    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    if (myArmy.generals.every(g => g.isDead)) return; 
    
    if (myArmy.generals[myCurrentTurnIdx.value].isDead) advanceTurn();

    isSelectingAction.value = false;

    const randomWordObj = allWords.value[Math.floor(Math.random() * allWords.value.length)];
    const wordStr = randomWordObj.en_us.toLowerCase();
    
    myTarget.value.word = wordStr;
    myTarget.value.zh = randomWordObj.zh_tw;
    myTarget.value.typedCount = 0;
    myTarget.value.attackerIndex = myCurrentTurnIdx.value; 
    
    let numBlanks = Math.max(1, Math.min(config.value.blankCount || 3, wordStr.length));
    let indices = [];
    while(indices.length < numBlanks) {
        let r = Math.floor(Math.random() * wordStr.length);
        if(!indices.includes(r)) indices.push(r);
    }
    indices.sort((a,b) => a - b); 

    myTarget.value.slots = wordStr.split('').map((char, idx) => ({ char: char, isBlank: indices.includes(idx), filled: !indices.includes(idx) }));
    myTarget.value.targetChars = indices.map(idx => wordStr[idx]);
    
    let opts = [...myTarget.value.targetChars];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    while(opts.length < Math.max(myTarget.value.targetChars.length + 4, 10)) opts.push(alphabet[Math.floor(Math.random() * 26)]); 
    myTarget.value.options = opts.sort(() => 0.5 - Math.random()).map((char, idx) => ({ id: idx, char, used: false }));
};

const handleOptionClick = (opt) => {
    if (opt.used || matchStatus.value !== 'playing' || isSelectingAction.value) return;
    if (opt.char === myTarget.value.targetChars[myTarget.value.typedCount]) {
        sfx.click(); opt.used = true;
        const blankSlot = myTarget.value.slots.find(s => s.isBlank && !s.filled);
        if(blankSlot) blankSlot.filled = true;
        myTarget.value.typedCount++;

        if (myTarget.value.typedCount === myTarget.value.targetChars.length) {
            speakWord(myTarget.value.word);
            if (myPlayerRole.value === 'p1') p1.value.score += 10; else p2.value.score += 10;
            isSelectingAction.value = true;
        }
    } else { sfx.error(); }
};

const executeAction = async (action) => {
    if (matchStatus.value !== 'playing') return;
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    
    if (action !== 'attack') {
        const cost = strategies.value[action].cost;
        if (myArmy.sp < cost) { sfx.error(); return; }
        myArmy.sp -= cost;
    }

    isSelectingAction.value = false;
    await sendAttackEvent(action);
    advanceTurn(); 
    setTimeout(assignNewTarget, 200); 
};

const selectFormation = async (fName) => {
    showFormationMenu.value = false;
    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    if (myArmy.formation === fName) return;
    myArmy.formation = fName;
    await supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -1, damage: 0, word_typed: fName }]);
};

const attemptEscape = async () => {
    if (matchStatus.value !== 'playing') return;
    
    isSelectingAction.value = true; 
    myTarget.value = { word: '', zh: '等待撤退結果...', targetChars: [], typedCount: 0, slots: [], options: [], attackerIndex: 0 };

    const myArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    if (Math.random() * 100 < config.value.escapeRate) {
        await supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -2, damage: 0, word_typed: 'escape_success' }]);
        sfx.defeat(); addLog(`🏃‍♂️ ${myArmy.name}軍 撤退成功！`, myPlayerRole.value);
        
        todayEscapesCount.value++; // 🌟 撤退成功，計數+1
        endGame(null, '主動撤退逃走', true);
    } else {
        await supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -3, damage: 10, word_typed: 'escape_failed' }]);
        sfx.error(); addLog(`❌ ${myArmy.name}軍 撤退失敗！全軍受創！`, myPlayerRole.value);
        
        myArmy.generals.forEach(g => {
            if(!g.isDead) { 
                g.hp -= 10; spawnEffect(g.id, '-10', 'dmg', 'fire-fx'); 
                if(g.hp <= 0) { g.hp = 0; g.isDead = true; sfx.defeat(); addLog(`💀 敵將 ${g.name} 敗退了！`, 'sys'); } 
            }
        });
        
        if (myArmy.generals.every(g => g.isDead)) {
            endGame(myPlayerRole.value === 'p1' ? p2.value.name : p1.value.name, '撤退失敗導致全軍覆沒');
        } else {
            advanceTurn();
            setTimeout(assignNewTarget, 800);
        }
    }
};

const sendAttackEvent = async (action) => {
    const attackerArmy = myPlayerRole.value === 'p1' ? p1.value : p2.value;
    const defenderArmy = myPlayerRole.value === 'p1' ? p2.value : p1.value;
    
    const attackerGeneral = attackerArmy.generals[myTarget.value.attackerIndex];
    if (!attackerGeneral) return;

    let targetIndex = -1;
    let finalDamage = 0;
    let isFriendly = false;
    let validTargetFound = false;

    if (action !== 'attack') {
        const stratConfig = strategies.value[action];
        if (stratConfig) {
            if (stratConfig.type === 'heal') {
                const aliveFriends = attackerArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
                if (aliveFriends.length > 0) { targetIndex = aliveFriends[Math.floor(Math.random()*aliveFriends.length)]; isFriendly = true; finalDamage = stratConfig.power; validTargetFound = true; }
            } else if (stratConfig.type === 'revive') {
                const deadFriends = attackerArmy.generals.map((g,i)=>g.isDead?i:-1).filter(i=>i!==-1);
                if (deadFriends.length > 0) { targetIndex = deadFriends[Math.floor(Math.random()*deadFriends.length)]; isFriendly = true; finalDamage = stratConfig.power; validTargetFound = true; }
            } else if (stratConfig.type === 'dispel') {
                targetIndex = -4; validTargetFound = true;
            } else if (stratConfig.type === 'smoke') {
                targetIndex = -5; isFriendly = true; validTargetFound = true;
            } else if (stratConfig.type === 'assassinate') {
                const aliveEnemies = defenderArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
                if (aliveEnemies.length > 0) { targetIndex = aliveEnemies[Math.floor(Math.random()*aliveEnemies.length)]; validTargetFound = true; }
            } else if (stratConfig.type === 'damage') {
                const aliveEnemies = defenderArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
                if (aliveEnemies.length > 0) { targetIndex = aliveEnemies[Math.floor(Math.random()*aliveEnemies.length)]; validTargetFound = true; }
            }
        }
    }

    if (!validTargetFound && action !== 'attack') {
        addLog(`⚠️ 策略無目標對象，自動轉為一般攻擊。`, myPlayerRole.value);
        action = 'attack'; 
    }
    let payloadAction = action;

    if (action === 'attack') {
        const aliveEnemies = defenderArmy.generals.map((g,i)=>g.isDead?-1:i).filter(i=>i!==-1);
        if (aliveEnemies.length === 0) return;
        targetIndex = aliveEnemies[Math.floor(Math.random()*aliveEnemies.length)];
        const targetGeneral = defenderArmy.generals[targetIndex];
        
        let evaRate = targetGeneral.eva;
        if (defenderArmy.formation === '靜寂之陣') evaRate += 30;
        if (defenderArmy.formation === '魚鱗之陣' || defenderArmy.formation === '八卦之陣') evaRate += 10;
        if (defenderArmy.smokeTurn !== -1) evaRate += 40; 

        if (Math.random() * 100 < evaRate) {
            payloadAction = 'miss';
            finalDamage = 0;
        } else {
            const baseDmg = Math.floor(Math.random() * (config.value.maxDmg - config.value.minDmg + 1)) + config.value.minDmg;
            const atkMult = formations.value[attackerArmy.formation].mults.atk[myTarget.value.attackerIndex] || 1.0;
            const defMult = formations.value[defenderArmy.formation].mults.def[targetIndex] || 1.0;
            
            let totalAtk = (attackerGeneral.atk * atkMult) + baseDmg;
            let totalDef = targetGeneral.def * defMult * 0.5;

            let isCrit = false;
            if (attackerArmy.formation === '背水之陣' && Math.random() < 0.3) isCrit = true;

            let calcDmg = totalAtk - totalDef;
            if (isCrit) calcDmg *= 1.5;

            finalDamage = Math.max(1, Math.round(calcDmg));
            if (atkMult <= 0) finalDamage = 0; 
            if (isCrit && finalDamage > 0) payloadAction = 'crit';
        }
    } else if (action === '暗殺計') {
        const targetGeneral = defenderArmy.generals[targetIndex];
        const successRate = 30 + (attackerGeneral.int - targetGeneral.int) * 0.5;
        if (Math.random() * 100 < successRate) {
            finalDamage = 9999; 
        } else {
            payloadAction = 'miss';
            finalDamage = 0;
        }
    } else if (action !== 'heal' && action !== 'revive' && action !== 'dispel' && action !== 'smoke') {
        let stratDmg = (attackerGeneral.int * 0.8) + strategies.value[action].power + Math.random() * 10;
        if (action === '水計' && defenderArmy.formation === '白馬之陣') stratDmg *= 0.5;
        finalDamage = Math.max(1, Math.round(stratDmg));
    }

    const payloadWord = `${myTarget.value.word}|${payloadAction}|${isFriendly}`;
    await supabase.from('tenchi_events').insert([{
        room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id),
        target_index: targetIndex, damage: finalDamage, word_typed: payloadWord
    }]);
};

const handleNetworkEvent = (event) => {
    if (matchStatus.value !== 'playing') return;

    totalTurns.value++; 

    const isP1Attacking = String(event.attacker_id) === String(p1.value.id);
    const attacker = isP1Attacking ? p1.value : p2.value;
    const defender = isP1Attacking ? p2.value : p1.value;
    const attackerSide = isP1Attacking ? 'p1' : 'p2';

    const parts = (event.word_typed || '').split('|');
    const wordTyped = parts[0] || event.word_typed;
    const actionName = parts[1] || 'attack';
    const isFriendlyTarget = parts[2] === 'true';

    if (!isP1Attacking && actionName !== 'attack' && actionName !== 'miss' && actionName !== 'crit' && strategies.value[actionName]) {
        attacker.sp -= strategies.value[actionName].cost;
    }

    if (event.target_index === -1) { 
        attacker.formation = wordTyped; 
        if (wordTyped === '靜寂之陣') attacker.stealthStartTurn = totalTurns.value; 
        else attacker.stealthStartTurn = -1;
        addLog(`🚩 ${attacker.name}軍 佈下【${attacker.formation}】！`, attackerSide); 
        return; 
    }
    
    if (event.target_index === -2) { 
        sfx.win(); addLog(`🏃‍♂️ 敵軍夾著尾巴逃跑了！`, 'sys'); 
        endGame(defender.name, '對方敗戰逃走'); 
        return; 
    }
    
    if (event.target_index === -3) { 
        sfx.attack(); addLog(`⚔️ 敵軍撤退失敗！全軍受罰！`, 'sys'); 
        attacker.generals.forEach(g => { 
            if(!g.isDead) { 
                g.hp -= event.damage; spawnEffect(g.id, `-${event.damage}`, 'dmg', 'fire-fx'); 
                if(g.hp <= 0) { g.hp = 0; g.isDead = true; } 
            } 
        }); 
        if (attacker.generals.every(g => g.isDead)) endGame(defender.name, '敵軍撤退失敗全滅');
        return; 
    }

    if (String(event.attacker_id) !== String(studentCookie.value.id)) attacker.score += 10;

    if (event.target_index === -4) {
        sfx.dispel(); defender.formation = '散開之陣'; defender.stealthStartTurn = -1;
        addLog(`🌪️ ${attacker.name}軍 施展【解陣計】！敵軍陣型瓦解！`, attackerSide);
        defender.generals.forEach(g => { if (!g.isDead) spawnEffect(g.id, '', 'sys', 'dispel-fx'); });
        return;
    }

    if (event.target_index === -5) {
        sfx.smoke(); attacker.smokeTurn = totalTurns.value;
        addLog(`💨 ${attacker.name}軍 施展【煙遁計】！部隊籠罩在迷霧中，閃避率大增！`, attackerSide);
        attacker.generals.forEach(g => { if (!g.isDead) spawnEffect(g.id, '煙遁', 'sys', 'smoke-fx'); });
        return;
    }

    if (isFriendlyTarget) {
        const targetGeneral = attacker.generals[event.target_index];
        if (!targetGeneral) return;
        
        if (actionName === '招魂計') {
            sfx.revive(); targetGeneral.isDead = false; targetGeneral.hp = event.damage;
            addLog(`✨ ${attacker.name}軍 施展【招魂計】！${targetGeneral.name} 復活了！`, attackerSide);
            spawnEffect(targetGeneral.id, `+${targetGeneral.hp}`, 'heal', 'revive-fx');
        } else { 
            sfx.heal(); targetGeneral.hp += event.damage;
            if (targetGeneral.hp > targetGeneral.maxHp) targetGeneral.hp = targetGeneral.maxHp;
            addLog(`💚 ${attacker.name}軍 施展【回復計】！${targetGeneral.name} 恢復兵力！`, attackerSide);
            spawnEffect(targetGeneral.id, `+${event.damage}`, 'heal', 'heal-fx');
        }
        return;
    }

    const targetGeneral = defender.generals[event.target_index];
    if (!targetGeneral || targetGeneral.isDead) return;

    if (actionName === 'miss') {
        sfx.miss(); addLog(`💨 攻擊落空！${targetGeneral.name} 閃開了！`, attackerSide);
        spawnEffect(targetGeneral.id, 'MISS', 'sys');
        return; 
    }

    if (actionName === 'attack') {
        if (event.damage === 0) {
            sfx.block(); addLog(`🛡️ 敵軍攻擊，被 ${targetGeneral.name} 堅固防禦擋下！`, attackerSide);
            spawnEffect(targetGeneral.id, '格擋', 'sys');
        } else {
            sfx.attack(); targetGeneral.hp -= event.damage;
            addLog(`🗡️ 敵軍攻擊，重創了 ${targetGeneral.name} (-${event.damage})！`, attackerSide);
            spawnEffect(targetGeneral.id, `-${event.damage}`, 'dmg', 'attack-fx');
        }
    } else if (actionName === 'crit') {
        sfx.crit(); targetGeneral.hp -= event.damage;
        addLog(`💥 敵軍發動奮戰一擊！重創了 ${targetGeneral.name} (-${event.damage})！`, attackerSide);
        spawnEffect(targetGeneral.id, `-${event.damage}`, 'strat-dmg', 'attack-fx');
    } else if (actionName === '暗殺計') {
        sfx.assassinate(); targetGeneral.hp -= event.damage;
        addLog(`☠️ 敵軍施展【暗殺計】！${targetGeneral.name} 遭一擊必殺！`, attackerSide);
        spawnEffect(targetGeneral.id, '瞬殺', 'strat-dmg', 'assassinate-fx');
    } else {
        let fx = 'fire-fx';
        if (actionName.includes('水')) { sfx.water(); fx = 'water-fx'; }
        else if (actionName.includes('石') || actionName.includes('砂')) { sfx.stone(); fx = 'stone-fx'; }
        else { sfx.fire(); fx = 'fire-fx'; }

        targetGeneral.hp -= event.damage;
        addLog(`📜 ${attacker.name}軍 施展【${actionName}】！重創了 ${targetGeneral.name}！`, attackerSide);
        spawnEffect(targetGeneral.id, `-${event.damage}`, 'strat-dmg', fx);
    }

    if (targetGeneral.hp <= 0) {
        targetGeneral.hp = 0; targetGeneral.isDead = true;
        sfx.defeat(); addLog(`💀 敵將 ${targetGeneral.name} 陣亡了！`, 'sys');
        
        if (defender.generals.every(g => g.isDead)) {
            endGame(attacker.name, '敵軍全滅');
        }
    }
};

const spawnEffect = (targetId, text, type, fxClass) => {
    const id = Date.now() + Math.random();
    effects.value.push({ id, targetId, text, type, fxClass });
    setTimeout(() => { effects.value = effects.value.filter(e => e.id !== id); }, 1500); 
};

const addLog = (text, type) => { battleLog.value.unshift({ id: Date.now() + Math.random(), text, type }); if (battleLog.value.length > 5) battleLog.value.pop(); };

const endGame = async (winId, reasonText, isEscape = false) => {
    if (matchStatus.value === 'end') return; 
    matchStatus.value = 'end'; 
    isSelectingAction.value = true; 
    
    let winName = '無';
    // 🌟 修正：加入 String() 確保判定正確
    if (String(winId) === String(p1.value.id)) winName = p1.value.name;
    else if (String(winId) === String(p2.value.id)) winName = p2.value.name;
    
    winner.value = winName; 
    endReason.value = reasonText; 
    
    if (winId) sfx.win();
    clearInterval(timer); 
    cleanupSubscriptions();

    if (studentCookie.value && !studentCookie.value.isAnon) {
        // 🌟 修正：確保分數最低為 0
        const myScore = Math.max(0, myPlayerRole.value === 'p1' ? p1.value.score : p2.value.score);
        
        // 🌟 修正：加入 String() 確保自己贏的時候不會因為型別被判輸
        let resultMark = String(winId) === String(studentCookie.value.id) ? '【勝】' : '【敗】'; 
        if (isEscape) resultMark = '【逃】';

        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字吞食天地', score: myScore, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: `結果: ${resultMark} (${reasonText}) | 總戰功: ${myScore}`
        }]);
    }
};

const leaveLobby = async () => { 
    if (matchStatus.value === 'playing') {
        todayEscapesCount.value++; // 🌟 拔營也算一次逃跑
        await supabase.from('tenchi_events').insert([{ room_id: currentRoomId.value, attacker_id: String(studentCookie.value.id), target_index: -2, damage: 0, word_typed: 'escape_success' }]);
        if (studentCookie.value && !studentCookie.value.isAnon) {
            const myScore = myPlayerRole.value === 'p1' ? p1.value.score : p2.value.score;
            await supabase.from('game_records').insert([{
                student_id: studentCookie.value.id, game_type: '單字吞食天地', score: myScore, time_taken_seconds: timeSpent.value,
                version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
                correct_words: `結果: 【逃】 (拔營逃走) | 總戰功: ${myScore}`
            }]);
        }
    }
    cleanupSubscriptions(); 
    if (todayEscapesCount.value >= maxEscapes.value) matchStatus.value = 'banned';
    else navigateTo('/'); 
};

const cleanupSubscriptions = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (roomSubscription) supabase.removeChannel(roomSubscription);
    if (eventSubscription) supabase.removeChannel(eventSubscription);
};

onUnmounted(() => { clearInterval(timer); cleanupSubscriptions(); window.removeEventListener('beforeunload', handleUnloadLeave); });
</script>

<template>
  <div class="tenchi-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">⚔️ 吞食天地</h2>
      <div v-if="matchStatus === 'playing'" class="t-timer">兵時: {{ timeSpent }}</div>
      <button v-if="matchStatus === 'playing'" class="retro-btn btn-danger btn-small" @click="attemptEscape">撤退</button>
      <button v-else-if="matchStatus !== 'banned'" class="retro-btn btn-small" @click="leaveLobby">離開</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="matchStatus === 'banned'" class="setup-overlay">
      <div class="rpg-dialog retro-element">
        <div class="icon-big" style="color: #f44336; text-shadow: 0 0 20px rgba(244,67,54,0.8);">🚫</div>
        <h2 style="color:#f44336;">帳號已被禁賽</h2>
        <p style="font-size: 1.1rem; font-weight: bold; line-height: 1.5; color: #fff;">
          您今天已經臨陣脫逃了 <span style="color:#f44336; font-size:1.5rem;">{{ todayEscapesCount }}</span> 次！<br>
          已達到單日撤退上限 ({{ maxEscapes }}次)。
        </p>
        <p style="color:#ffeb3b; margin-top: 10px; font-weight: bold;">
          將軍，軍法如山！您今天將無法再帶兵出征。<br>
          請明日再來，並發揮武士精神戰鬥到最後！
        </p>
        <NuxtLink to="/" class="retro-btn btn-danger" style="margin-top:20px; width:100%; max-width: 250px;">返回首頁</NuxtLink>
      </div>
    </div>

    <div v-else-if="matchStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element">
        <div class="icon-big">🐎</div>
        <h2>討伐大廳</h2>
        <p style="margin-bottom:10px;">募集義勇軍！點擊下方尋找同單元的對手，若無人則會為您建立營帳等待。</p>
        <span style="font-size:0.8rem; color:#aaa; margin-top:5px; display:inline-block;">今日撤退次數: {{ todayEscapesCount }} / {{ maxEscapes }} (滿額將禁玩一天)</span>
        
        <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; border: 1px dashed #ffeb3b; margin-bottom: 15px; margin-top: 10px;">
           <span style="color:#ffeb3b; font-weight:bold; font-size:1.1rem;">🏆 你的戰功：{{ myWins }} 勝</span><br>
           <small style="color:#ccc;">陣型解鎖 {{ unlockedFormations.length }}/10</small>
        </div>

        <div style="display:flex; justify-content:center; gap: 10px;">
           <button class="retro-btn btn-small" style="background:#555; padding: 10px 20px; font-size: 1.2rem;" @click="showGuide = true">📖 兵法書</button>
           <button class="retro-btn btn-primary" @click="findMatch">出陣 (對戰)</button>
        </div>
      </div>
    </div>

    <div v-if="showGuide" class="setup-overlay" style="z-index: 300;">
       <div class="rpg-dialog retro-element guide-dialog">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
             <h2 style="margin:0; color:#ffeb3b;">📖 兵法書</h2>
             <button class="retro-btn btn-danger btn-small" @click="showGuide = false">關閉</button>
          </div>
          <div class="guide-tabs">
             <button class="retro-btn" :class="{active: guideTab==='formation'}" @click="guideTab='formation'">陣形篇</button>
             <button class="retro-btn" :class="{active: guideTab==='strategy'}" @click="guideTab='strategy'">策略篇</button>
          </div>
          <div class="guide-content">
             <template v-if="guideTab==='formation'">
                <div v-for="(f, fName) in formations" :key="fName" class="guide-item" :class="{'locked': !unlockedFormations.includes(fName)}">
                   <h4>{{ fName }} <span v-if="!unlockedFormations.includes(fName)">🔒</span></h4>
                   <p>{{ f.desc }}</p>
                   <div class="stats-preview">
                      攻倍率: {{ defaultFormationMults[fName]?.atk?.join(', ') || '依後台設定' }}<br>
                      防倍率: {{ defaultFormationMults[fName]?.def?.join(', ') || '依後台設定' }}
                   </div>
                </div>
             </template>
             <template v-else>
                <div v-for="(s, sName) in strategies" :key="sName" class="guide-item" :class="{'locked': !unlockedStrategies.includes(sName)}">
                   <h4>{{ sName }} <span v-if="!unlockedStrategies.includes(sName)">🔒 (需 {{ s.unlockWins }} 勝)</span></h4>
                   <p>{{ s.desc }}</p>
                   <p><span class="sp-cost-badge">消耗 SP: {{ s.cost || 10 }}</span> <small v-if="s.type !== 'dispel' && s.type !== 'smoke' && s.type !== 'assassinate'">基值: {{ s.power }} (受智力加成)</small></p>
                </div>
             </template>
          </div>
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
      
      <div v-if="showFormationMenu" class="setup-overlay" style="z-index: 200;">
         <div class="rpg-dialog retro-element" style="padding: 15px;">
             <h3 style="color:#ffeb3b; margin-top:0;">選擇部隊陣型</h3>
             <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:15px;">
                 <button v-for="f in unlockedFormations" :key="f" class="retro-btn" style="padding:8px 12px; font-size:1rem;" @click="selectFormation(f)">{{ f }}</button>
             </div>
             <button class="retro-btn btn-danger" @click="showFormationMenu = false">取消變更</button>
         </div>
      </div>

      <div class="rpg-log-box retro-element">
         <div v-for="log in battleLog" :key="log.id" class="log-entry" :class="log.type">{{ log.text }}</div>
      </div>

      <div class="armies-container">
        <div class="army-panel p1-side">
           <div class="army-header retro-element">
               <span>{{ p1.name }}軍</span>
               <div style="display:flex; gap: 8px;">
                  <span class="score-text" style="color: #64b5f6;">SP: {{ p1.sp }}/{{ p1.maxSp }}</span>
               </div>
           </div>
           
           <div class="generals-list align-left" :class="{'stealth-mode': p1.formation === '靜寂之陣' || p1.smokeTurn !== -1}">
              <div v-for="(g, i) in p1.generals" :key="g.id" class="rpg-general-card" :class="{'is-dead': g.isDead, 'active-turn': myPlayerRole === 'p1' && myCurrentTurnIdx === i && matchStatus === 'playing'}" :style="{ transform: `translateX(${getFormationOffsetPx(i, p1.formation, false)}px)` }">
                 
                 <div class="fx-layer" v-for="eff in effects.filter(e => e.targetId === g.id)" :key="eff.id">
                     <div v-if="eff.fxClass" class="element-fx" :class="eff.fxClass"></div>
                     <div v-if="eff.text" class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
                 </div>

                 <div v-if="myPlayerRole === 'p1' && myCurrentTurnIdx === i && matchStatus === 'playing'" class="turn-indicator">▶</div>

                 <div class="avatar-box">{{ g.face }}</div>
                 <div class="info-box">
                    <div class="g-word">{{ g.name }}</div>
                    <div class="g-stats">攻{{g.atk}} 防{{g.def}} 智{{g.int}} 避{{g.eva}}%</div>
                    <div class="hp-row">
                        <span class="g-hp-text">兵:{{ g.hp }}</span>
                        <div class="hp-bar-bg"><div class="hp-bar-fill" :style="{ width: `${(g.hp/g.maxHp)*100}%`, background: g.hp > g.maxHp*0.3 ? '#4caf50' : '#f44336' }"></div></div>
                    </div>
                 </div>
              </div>
           </div>
           <template v-if="myPlayerRole === 'p1'">
               <button class="retro-btn formation-btn" @click="showFormationMenu = true" :disabled="unlockedFormations.length <= 1">陣型：{{ p1.formation }} {{ unlockedFormations.length > 1 ? '🔄' : '🔒' }}</button>
           </template>
           <div v-else class="formation-tag">陣型：{{ p1.formation }}</div>
        </div>

        <div class="army-panel p2-side">
           <div class="army-header retro-element">
               <span>{{ p2.name }}軍</span>
               <div style="display:flex; gap: 8px;">
                  <span class="score-text" style="color: #64b5f6;">SP: {{ p2.sp }}/{{ p2.maxSp }}</span>
               </div>
           </div>
           
           <div class="generals-list align-right" :class="{'stealth-mode': p2.formation === '靜寂之陣' || p2.smokeTurn !== -1}">
              <div v-for="(g, i) in p2.generals" :key="g.id" class="rpg-general-card reverse" :class="{'is-dead': g.isDead, 'active-turn': myPlayerRole === 'p2' && myCurrentTurnIdx === i && matchStatus === 'playing'}" :style="{ transform: `translateX(${getFormationOffsetPx(i, p2.formation, true)}px)` }">
                 
                 <div class="fx-layer" v-for="eff in effects.filter(e => e.targetId === g.id)" :key="eff.id">
                     <div v-if="eff.fxClass" class="element-fx" :class="eff.fxClass"></div>
                     <div v-if="eff.text" class="dmg-pop" :class="eff.type">{{ eff.text }}</div>
                 </div>

                 <div v-if="myPlayerRole === 'p2' && myCurrentTurnIdx === i && matchStatus === 'playing'" class="turn-indicator reverse-indicator">◀</div>

                 <div class="info-box right-align">
                    <div class="g-word">{{ g.name }}</div>
                    <div class="g-stats">攻{{g.atk}} 防{{g.def}} 智{{g.int}} 避{{g.eva}}%</div>
                    <div class="hp-row reverse-row">
                        <span class="g-hp-text">兵:{{ g.hp }}</span>
                        <div class="hp-bar-bg"><div class="hp-bar-fill" :style="{ width: `${(g.hp/g.maxHp)*100}%`, background: g.hp > g.maxHp*0.3 ? '#2196f3' : '#f44336' }"></div></div>
                    </div>
                 </div>
                 <div class="avatar-box">{{ g.face }}</div>
              </div>
           </div>
           <template v-if="myPlayerRole === 'p2'">
               <button class="retro-btn formation-btn" @click="showFormationMenu = true" :disabled="unlockedFormations.length <= 1">陣型：{{ p2.formation }} {{ unlockedFormations.length > 1 ? '🔄' : '🔒' }}</button>
           </template>
           <div v-else class="formation-tag right-align">陣型：{{ p2.formation }}</div>
        </div>
      </div>

      <div v-if="matchStatus === 'playing'" class="rpg-input-console retro-element">
          
          <template v-if="!isSelectingAction">
              <div class="m-target-zh">【{{ currentAttackerName }}】軍令：出擊「{{ myTarget.zh }}」</div>
              <div class="m-slots">
                  <span v-for="(slot, i) in myTarget.slots" :key="i" class="m-slot" :class="{'is-blank': slot.isBlank, 'filled': slot.filled}">{{ slot.filled ? slot.char : '_' }}</span>
              </div>
              <div class="m-keyboard">
                  <button v-for="opt in myTarget.options" :key="opt.id" class="retro-btn m-key" :class="{'used': opt.used}" @click="handleOptionClick(opt)">{{ opt.char.toUpperCase() }}</button>
              </div>
          </template>

          <template v-else>
              <div class="m-target-zh" style="margin-bottom: 10px;">請下達【{{ currentAttackerName }}】的戰術指令：</div>
              <div class="action-btn-grid">
                  <button class="retro-btn btn-primary" style="font-size: 1.1rem; padding: 10px;" @click="executeAction('attack')">🗡️ 一般攻擊</button>
                  <button v-for="strat in unlockedStrategies" :key="strat" class="retro-btn" style="font-size: 1rem; padding: 10px; background: #311b92;" 
                          :disabled="(myPlayerRole === 'p1' ? p1.sp : p2.sp) < (strategies[strat]?.cost || 10)"
                          @click="executeAction(strat)">
                     📜 {{ strat }} <br><small style="color:#ffcc80;">SP: -{{ strategies[strat]?.cost || 10 }}</small>
                  </button>
              </div>
          </template>

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
          <button @click="leaveLobby" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">班師回朝</button>
       </div>
    </div>
  </div>
</template>

<style scoped>
/* 基礎設定 */
.tenchi-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #000; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: #0000aa; border: 3px solid #fff; border-radius: 2px; box-shadow: inset 0 0 0 2px #000, 0 0 0 2px #000; color: #fff; padding: 6px; box-sizing: border-box; }
.retro-btn { background: #000; color: #fff; border: 2px solid #fff; border-radius: 2px; font-family: inherit; font-weight: bold; cursor: pointer; }
.retro-btn:active:not(.used):not(:disabled) { background: #fff; color: #000; }
.retro-btn:disabled { opacity: 0.5; border-color: #555; color: #aaa; cursor: not-allowed; }
.btn-primary { padding: 10px 20px; font-size: 1.2rem; background: #b30000; border-color: #ffcccc;}
.btn-danger { background: #d32f2f; border-color:#ffcdd2;}
.btn-small { padding: 5px 10px; font-size: 1rem; }

.t-header { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; border-bottom: none; border-left: none; border-right: none; margin-bottom: 2px; padding: 4px 8px;}
.t-title { margin: 0; font-size: 1.1rem; font-weight: 900; text-shadow: 2px 2px 0 #000; }
.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 400px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.rpg-dialog h2 { color: #ffeb3b; margin-top: 0;}
.icon-big { font-size: 4rem; margin-bottom: 10px; }
.spinner { font-size: 3rem; animation: spin 2s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* 兵法書專屬樣式 */
.guide-dialog { max-width: 500px; width: 95%; max-height: 85vh; display: flex; flex-direction: column; text-align: left; padding: 15px;}
.guide-tabs { display: flex; gap: 10px; margin-bottom: 15px; justify-content: center;}
.guide-tabs button { padding: 8px 15px; font-size: 1rem; }
.guide-tabs button.active { background: #ffeb3b; color: #000; border-color: #ffeb3b;}
.guide-content { flex: 1; overflow-y: auto; padding-right: 5px; }
.guide-item { background: rgba(0,0,0,0.6); border: 1px solid #777; padding: 12px; margin-bottom: 10px; border-radius: 4px; }
.guide-item.locked { opacity: 0.4; filter: grayscale(100%); border-color: #444;}
.guide-item h4 { margin: 0 0 5px 0; color: #4caf50; font-size: 1.1rem;}
.guide-item.locked h4 { color: #f44336; }
.guide-item p { margin: 0 0 8px 0; font-size: 0.9rem; color: #ddd; line-height: 1.4;}
.stats-preview { background: #222; padding: 6px; border-radius: 4px; font-family: monospace; color: #ffeb3b; font-size: 0.85rem; line-height: 1.5;}
.sp-cost-badge { background: #1976d2; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-right: 10px;}

.battlefield { flex: 1; display: flex; flex-direction: column; padding: 2px; gap: 4px; min-height: 0;}
.rpg-log-box { height: 60px; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; padding: 4px 8px; flex-shrink: 0;}
.log-entry { font-size: 0.8rem; font-weight: bold; margin-bottom: 2px; text-shadow: 1px 1px 0 #000; animation: fadeIn 0.3s ease-out;}
.log-entry.sys { color: #ffeb3b; text-align: center;}
.log-entry.p1 { color: #81c784; }
.log-entry.p2 { color: #64b5f6; text-align: right;}
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

.armies-container { flex: 1; display: flex; flex-direction: row; justify-content: space-between; gap: 4px; min-height: 0; overflow: hidden;}
.army-panel { flex: 1; display: flex; flex-direction: column; min-height: 0; width: 50%; padding: 0;}
.army-header { display: flex; justify-content: space-between; align-items: center; padding: 4px; font-size: 0.75rem; font-weight: bold; margin-bottom: 2px; flex-shrink: 0; }
.p1-side .army-header { background: #004d00; border-color: #81c784;}
.p2-side .army-header { background: #000066; border-color: #64b5f6;}
.score-text { color: #ffeb3b; font-weight: 900;}

.generals-list { flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; overflow-y: visible; overflow-x: visible; padding: 2px 25px; transition: 0.5s filter; min-height: 0;}
.align-left { align-items: flex-start; }
.align-right { align-items: flex-end; }

.stealth-mode .rpg-general-card { opacity: 0.15; filter: blur(2px) contrast(1.2); pointer-events: none; transition: opacity 0.5s, filter 0.5s; }

.rpg-general-card { display: inline-flex; align-items: center; background: #000; border: 2px solid #fff; padding: 2px 4px; border-radius: 4px; position: relative; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: inset 0 0 0 1px #000, 2px 2px 0 rgba(255,255,255,0.2); min-width: 100px; }
.rpg-general-card.reverse { flex-direction: row-reverse; }
.rpg-general-card.is-dead { opacity: 0.3; filter: grayscale(100%); border-color: #555;}

.active-turn { border-color: #ffeb3b; box-shadow: 0 0 15px rgba(255, 235, 59, 0.8), inset 0 0 5px rgba(255, 235, 59, 0.5); z-index: 10; }
.turn-indicator { position: absolute; left: -20px; color: #ffeb3b; font-size: 1.5rem; animation: bounceRight 0.5s infinite alternate; text-shadow: 1px 1px 0 #000; }
.reverse-indicator { left: auto; right: -20px; animation: bounceLeft 0.5s infinite alternate; }
@keyframes bounceRight { 0% { transform: translateX(0); } 100% { transform: translateX(5px); } }
@keyframes bounceLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-5px); } }

.avatar-box { font-size: 1.2rem; background: #222; border: 1px solid #777; padding: 2px; margin-right: 4px;}
.reverse .avatar-box { margin-right: 0; margin-left: 4px; }
.info-box { display: flex; flex-direction: column; justify-content: center;}
.right-align { text-align: right; align-items: flex-end;}
.g-word { font-size: 0.85rem; font-weight: 900; color: #ffeb3b; text-shadow: 1px 1px 0 #000; letter-spacing: 1px; margin-bottom: 2px;}

.g-stats { font-size: 0.6rem; color: #aaa; margin-bottom: 2px; letter-spacing: -0.5px; white-space: nowrap; transform: scale(0.9); transform-origin: left; }
.reverse .g-stats { transform-origin: right; }

.hp-row { display: flex; align-items: center; gap: 4px; }
.reverse-row { flex-direction: row-reverse; }
.g-hp-text { font-size: 0.65rem; color: #fff; font-weight: bold;}
.hp-bar-bg { width: 35px; height: 5px; background: #333; border: 1px solid #aaa;}
.hp-bar-fill { height: 100%; transition: width 0.3s ease-out;}
.formation-btn { width: 100%; margin-top: 4px; padding: 4px; font-size: 0.75rem; background: #222; border-color: #777; flex-shrink: 0;}
.formation-tag { font-size: 0.75rem; color: #ffeb3b; margin-top: 4px; text-shadow: 1px 1px 0 #000; font-weight: bold; flex-shrink: 0;}

/* 🌟 特效動畫 (大幅放大) */
.fx-layer { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center; pointer-events: none; z-index: 50; width: 100%; height: 100%; }
.element-fx { position: absolute; font-size: 5rem; display: flex; justify-content: center; align-items: center; }

.attack-fx::after { content: '💢'; animation: burst 0.5s ease-out forwards; }
.fire-fx::after { content: '🔥'; animation: burst 0.8s ease-out forwards; filter: drop-shadow(0 0 15px red); }
.water-fx::after { content: '🌊'; animation: waveSplash 0.8s ease-out forwards; filter: drop-shadow(0 0 15px blue); }
.stone-fx::after { content: '🪨'; animation: rockDrop 0.6s ease-in forwards; filter: drop-shadow(0 0 10px black); }
.heal-fx::after { content: '💚'; animation: floatUpFx 1s ease-out forwards; filter: drop-shadow(0 0 15px green); }
.revive-fx::after { content: '🌟'; animation: spinBurst 1s ease-out forwards; filter: drop-shadow(0 0 20px gold); }
.dispel-fx::after { content: '🌪️'; animation: spinBurst 0.8s ease-out forwards; filter: drop-shadow(0 0 15px cyan); }
.smoke-fx::after { content: '💨'; animation: spinBurst 1s ease-out forwards; filter: drop-shadow(0 0 15px gray); }
.assassinate-fx::after { content: '☠️'; animation: rockDrop 0.8s ease-in forwards; filter: drop-shadow(0 0 20px purple); }

@keyframes burst { 0% { transform: scale(0.5); opacity: 1; } 10% { opacity: 1; } 100% { transform: scale(3.5); opacity: 0; } }
@keyframes waveSplash { 0% { transform: translateY(30px) scale(0.8); opacity: 1; } 100% { transform: translateY(-50px) scale(3); opacity: 0; } }
@keyframes rockDrop { 0% { transform: translateY(-80px) scale(2.5); opacity: 1; } 100% { transform: translateY(10px) scale(1.5); opacity: 0; } }
@keyframes floatUpFx { 0% { transform: translateY(0) scale(1.5); opacity: 1; } 100% { transform: translateY(-60px) scale(2.5); opacity: 0; } }
@keyframes spinBurst { 0% { transform: scale(0) rotate(0deg); opacity: 1; } 100% { transform: scale(3.5) rotate(180deg); opacity: 0; } }

.dmg-pop { position: absolute; top: -20px; font-size: 1.8rem; font-weight: 900; color: #ff3333; text-shadow: 2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff; animation: floatTxt 1s ease-out forwards; }
.dmg-pop.heal { color: #4caf50; text-shadow: 2px 2px 0 #fff, -1px -1px 0 #fff; animation: floatTxt 1.2s ease-out forwards; font-size: 2rem;}
.dmg-pop.strat-dmg { color: #ffeb3b; text-shadow: 3px 3px 0 #d32f2f, -2px -2px 0 #d32f2f; font-size: 2.5rem; animation: floatTxt 1.5s ease-out forwards; z-index: 60;}
.dmg-pop.sys { color: #fff; text-shadow: 2px 2px 0 #000; animation: floatTxt 1.2s ease-out forwards; font-size: 2rem;}
@keyframes floatTxt { 0% { opacity: 1; transform: translateY(0) scale(0.8); } 40% { transform: translateY(-30px) scale(1.3); } 100% { opacity: 0; transform: translateY(-60px) scale(1); } }

/* 輸入區與戰術選單 */
.rpg-input-console { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px; min-height: 90px; justify-content: center;}
.m-target-zh { font-size: 0.9rem; color: #ffeb3b; text-shadow: 1px 1px 0 #000; font-weight: bold;}
.m-slots { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; margin-bottom: 2px;}
.m-slot { font-size: 1.1rem; font-weight: 900; color: #fff; border-bottom: 2px solid transparent; min-width: 12px; text-align: center;}
.m-slot.is-blank { color: #777; border-bottom-color: #777; }
.m-slot.is-blank.filled { color: #ffeb3b; border-bottom-color: #ffeb3b; text-shadow: 1px 1px 0 #000;}
.m-keyboard { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 500px;}
.m-key { width: 30px; height: 30px; font-size: 1.1rem; display: flex; justify-content: center; align-items: center; border-radius: 4px; box-shadow: 1px 1px 0 #fff; transition: 0.1s; padding:0;}
.m-key:active:not(.used) { transform: translate(1px, 1px); box-shadow: none;}
.m-key.used { opacity: 0.2; pointer-events: none;}

.action-btn-grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; max-width: 600px; }
.winner-text { font-size: 1.5rem; color: #ffeb3b; font-weight: bold;}
.final-scores { background: #000; padding: 15px; border: 2px solid #777; margin-top: 15px;}

@media (min-width: 768px) and (max-width: 1199px) {
  .g-word { font-size: 1.1rem; } .hp-bar-bg { width: 45px; height: 5px;} .m-key { width: 40px; height: 40px; font-size: 1.4rem; }
  .rpg-general-card { min-width: 130px; padding: 4px 8px;} .avatar-box { font-size: 1.5rem; }
  .generals-list { padding: 4px 45px; gap: 4px;} .rpg-log-box { height: 70px; } .log-entry { font-size: 0.9rem; }
  .m-slot { font-size: 1.5rem; min-width: 20px;} .m-target-zh { font-size: 1.1rem; }
  .g-stats { font-size: 0.7rem; transform: none; margin-bottom: 2px; }
}

@media (min-width: 1200px) {
  .g-word { font-size: 1.3rem; } .hp-bar-bg { width: 60px; height: 6px;} .m-key { width: 50px; height: 50px; font-size: 1.8rem; }
  .rpg-general-card { min-width: 160px; padding: 6px 10px;} .avatar-box { font-size: 1.8rem; }
  .generals-list { padding: 10px 55px; gap: 8px;} .rpg-log-box { height: 80px; } .log-entry { font-size: 1rem; }
  .m-slot { font-size: 1.8rem; min-width: 25px;} .m-target-zh { font-size: 1.2rem; }
  .g-stats { font-size: 0.75rem; transform: none; margin-bottom: 4px; }
}
</style>
