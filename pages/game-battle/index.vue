<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const supabase = useSupabaseClient();
const route = useRoute();
const studentCookie = useCookie('currentStudent');

// 房間與對戰狀態
const currentRoomId = ref(null);
const matchStatus = ref('idle'); 
const isHost = ref(false);
const opponentData = ref({ name: '神祕對手', id: null });

let checkRoomInterval = null;

// 🌟 遊戲資料與計分系統
const isLoadingWords = ref(true);
const words = ref([]);
const myScore = ref(0); 
const opponentScore = ref(0);

// 後台讀取的設定值
const targetScore = ref(5);
const pvpCorrectPoints = ref(20);
const pvpPenaltyPoints = ref(3);
const spinSpeed = ref(15);
const maxEscapes = ref(20); // 🌟 新增：逃跑次數上限
const todayEscapesCount = ref(0); // 🌟 新增：今日已逃跑次數
const mistakesCount = ref(0); 

const currentWord = ref(null);
const gridLetters = ref([]);
const currentSpelling = ref([]);
const isWrong = ref(false);
const winnerId = ref(null);
const unitInfo = ref('');

const spinStyle = computed(() => {
  if (spinSpeed.value <= 0) return { animation: 'none' }; 
  return { animationDuration: `${spinSpeed.value}s` };
});

const showAttack = ref(false);
const showDamaged = ref(false);

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;
const playTone = (freq, type, duration, vol = 0.1) => {
  if (!audioCtx) return;
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {}
};

const soundFx = {
  matchFound: () => { playTone(600, 'sine', 0.1); setTimeout(() => playTone(800, 'sine', 0.2), 100); },
  correct: () => { playTone(880, 'sine', 0.1); setTimeout(() => playTone(1100, 'sine', 0.2), 100); },
  wrong: () => { playTone(200, 'sawtooth', 0.3, 0.2); },
  attack: () => { playTone(1500, 'square', 0.1, 0.05); setTimeout(() => playTone(500, 'square', 0.2, 0.05), 50); },
  win: () => { [523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.3, 0.2), i * 150)); },
  lose: () => { [300, 280, 260, 200].forEach((f, i) => setTimeout(() => playTone(f, 'sawtooth', 0.4, 0.2), i * 300)); }
};

let battleSubscription = null;
let gameStartTime = 0;

const recordEscape = async () => {
    if (!studentCookie.value || studentCookie.value.isAnon || matchStatus.value !== 'playing') return;
    
    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
    const escapeMsg = `【逃】對手: ${opponentData.value?.name || '未知'}`;
    const finalScore = Math.max(0, (myScore.value * pvpCorrectPoints.value) - (mistakesCount.value * pvpPenaltyPoints.value));

    try {
        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id,
            game_type: '單字方塊陣',
            score: finalScore, 
            mistakes: mistakesCount.value, 
            time_taken_seconds: timeSpent,
            version: route.query.version,
            volume: route.query.volume,
            unit_played: route.query.unit,
            correct_words: escapeMsg
        }]);
        // 🌟 逃跑後，立刻增加本地逃跑計數
        todayEscapesCount.value++;
    } catch (e) {
        console.error("寫入逃跑紀錄失敗", e);
    }
};

const handleBeforeUnload = (event) => {
    if (matchStatus.value === 'playing') {
        if (battleSubscription) {
            battleSubscription.send({ type: 'broadcast', event: 'escaped', payload: { id: studentCookie.value.id } });
        }
        if (studentCookie.value && !studentCookie.value.isAnon) {
            const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
            const finalScore = Math.max(0, (myScore.value * pvpCorrectPoints.value) - (mistakesCount.value * pvpPenaltyPoints.value));
            
            supabase.from('game_records').insert([{
              student_id: studentCookie.value.id,
              game_type: '單字方塊陣',
              score: finalScore,
              mistakes: mistakesCount.value,
              time_taken_seconds: timeSpent,
              version: route.query.version,
              volume: route.query.volume,
              unit_played: route.query.unit,
              correct_words: `【逃】對手: ${opponentData.value?.name || '未知'}`
            }]).then(); 
        }

        if (isHost.value && currentRoomId.value) {
            supabase.from('game_rooms').delete().eq('id', currentRoomId.value).then();
        }
        event.preventDefault();
        event.returnValue = ''; 
    }
};

// 🌟 檢查今天是否逃跑太多次
const checkEscapeBanStatus = async () => {
    if (!studentCookie.value || studentCookie.value.isAnon) return;

    // 取得今天的開始與結束時間 (UTC，可依據伺服器時間調整)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();
    
    today.setHours(23, 59, 59, 999);
    const endOfDay = today.toISOString();

    const { data } = await supabase.from('game_records')
        .select('id, correct_words')
        .eq('student_id', studentCookie.value.id)
        .eq('game_type', '單字方塊陣')
        .gte('played_at', startOfDay)
        .lte('played_at', endOfDay);

    if (data) {
        const escapesToday = data.filter(r => r.correct_words && r.correct_words.includes('【逃】')).length;
        todayEscapesCount.value = escapesToday;
        
        if (escapesToday >= maxEscapes.value) {
            matchStatus.value = 'banned'; // 🌟 進入禁賽狀態
        }
    }
};

onMounted(async () => {
  try {
    isLoadingWords.value = true;
    await supabase.removeAllChannels();
    window.addEventListener('beforeunload', handleBeforeUnload);

    const { data: settingsData } = await supabase.from('system_settings').select('pvp_spin_speed, pvp_target_score, pvp_correct_points, pvp_penalty_points, pvp_max_escapes').eq('id', 1).single();
    if (settingsData) {
      if (settingsData.pvp_spin_speed !== null) spinSpeed.value = Number(settingsData.pvp_spin_speed);
      if (settingsData.pvp_target_score !== null) targetScore.value = Number(settingsData.pvp_target_score);
      if (settingsData.pvp_correct_points !== null) pvpCorrectPoints.value = Number(settingsData.pvp_correct_points);
      if (settingsData.pvp_penalty_points !== null) pvpPenaltyPoints.value = Number(settingsData.pvp_penalty_points);
      // 🌟 讀取逃跑禁賽門檻 (預設20)
      maxEscapes.value = settingsData.pvp_max_escapes !== undefined && settingsData.pvp_max_escapes !== null ? Number(settingsData.pvp_max_escapes) : 20;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      unitInfo.value = `${version}_${volume}_${unit}`;
      const { data: vocabs } = await supabase.from('vocabularies')
        .select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      if (vocabs && vocabs.length > 0) {
        words.value = vocabs.filter(v => v.en_us && v.en_us.replace(/[^a-zA-Z]/g, '').length <= 16);
      }
    }
    if (words.value.length === 0) {
      words.value = [{ en_us: 'apple', zh_tw: '蘋果' }, { en_us: 'banana', zh_tw: '香蕉' }];
      unitInfo.value = 'test_unit';
    }

    if (studentCookie.value && !studentCookie.value.isAnon) {
      await supabase.from('game_rooms').delete().eq('host_id', studentCookie.value.id).eq('status', 'waiting');
      await checkEscapeBanStatus(); // 🌟 檢查禁賽狀態
    }
  } catch (error) {
    console.error("載入失敗:", error);
  } finally {
    isLoadingWords.value = false;
  }
});

const startMatchmaking = async () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (isLoadingWords.value) return;
  if (!studentCookie.value || studentCookie.value.isAnon) { alert('請先登入！'); return; }
  
  // 🌟 二次檢查是否已達逃跑上限
  if (todayEscapesCount.value >= maxEscapes.value) {
      matchStatus.value = 'banned';
      return;
  }

  matchStatus.value = 'searching';

  const { data: rooms } = await supabase.from('game_rooms')
    .select('*').eq('status', 'waiting').eq('unit_info', unitInfo.value).neq('host_id', studentCookie.value.id).limit(1);

  if (rooms && rooms.length > 0) {
    const room = rooms[0];
    isHost.value = false;
    currentRoomId.value = room.id;
    opponentData.value = { id: room.host_id, name: room.host_name };

    await supabase.from('game_rooms').update({ 
        guest_id: studentCookie.value.id, guest_name: studentCookie.value.name, status: 'playing' 
    }).eq('id', room.id);
    startGameConnection();
  } else {
    isHost.value = true;
    const { data: newRoom, error } = await supabase.from('game_rooms').insert([{
        host_id: studentCookie.value.id, host_name: studentCookie.value.name, unit_info: unitInfo.value, status: 'waiting'
    }]).select().single();

    if (error) { alert("開房失敗！"); cancelMatchmaking(); return; }
    currentRoomId.value = newRoom.id;

    checkRoomInterval = setInterval(async () => {
        if(matchStatus.value !== 'searching') { clearInterval(checkRoomInterval); return; }
        const { data: checkData } = await supabase.from('game_rooms').select('*').eq('id', newRoom.id).single();
        if (checkData && checkData.status === 'playing' && checkData.guest_id) {
            clearInterval(checkRoomInterval);
            opponentData.value = { id: checkData.guest_id, name: checkData.guest_name };
            startGameConnection();
        }
    }, 1500);
  }
};

const cancelMatchmaking = async () => {
  if (checkRoomInterval) clearInterval(checkRoomInterval);
  if (isHost.value && currentRoomId.value) await supabase.from('game_rooms').delete().eq('id', currentRoomId.value);
  matchStatus.value = 'idle';
  currentRoomId.value = null;
};

const startGameConnection = () => {
    soundFx.matchFound();
    matchStatus.value = 'playing';
    myScore.value = 0;
    opponentScore.value = 0;
    mistakesCount.value = 0; 
    gameStartTime = Date.now();
    
    battleSubscription = supabase.channel(`battle_${currentRoomId.value}`);
    
    battleSubscription.on('broadcast', { event: 'hit' }, (payload) => {
        if(payload.payload.id !== studentCookie.value.id) {
            opponentScore.value = payload.payload.score;
            soundFx.attack();
            showDamaged.value = true;
            setTimeout(() => showDamaged.value = false, 300);
            if(opponentScore.value >= targetScore.value) triggerGameOver(payload.payload.id);
        }
    })
    .on('broadcast', { event: 'escaped' }, (payload) => {
        if(payload.payload.id !== studentCookie.value.id && matchStatus.value === 'playing') {
            alert('對手已落荒而逃！您不戰而勝！🏆');
            triggerGameOver(studentCookie.value.id);
        }
    }).subscribe();

    nextRound();
};

const nextRound = () => {
  if (!words.value || words.value.length === 0) return;
  const randomWord = words.value[Math.floor(Math.random() * words.value.length)];
  currentWord.value = randomWord;
  currentSpelling.value = [];

  const pureEn = randomWord.en_us.replace(/[^a-zA-Z]/g, '').toUpperCase();
  let targetChars = pureEn.split('');
  let paddingChars = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while((targetChars.length + paddingChars.length) < 16) { paddingChars.push(alphabet[Math.floor(Math.random() * 26)]); }
  let finalChars = [...targetChars, ...paddingChars].sort(() => 0.5 - Math.random());
  gridLetters.value = finalChars.map((c, i) => ({ id: `char_${i}_${Date.now()}`, char: c, selected: false }));
};

const selectLetter = (item) => {
  if (item.selected || isWrong.value) return;
  item.selected = true;
  currentSpelling.value.push(item);
  const pureEn = currentWord.value.en_us.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (currentSpelling.value.length === pureEn.length) {
    if (currentSpelling.value.map(i => i.char).join('') === pureEn) {
      handleCorrect();
    } else {
      soundFx.wrong();
      isWrong.value = true;
      mistakesCount.value++; 
      setTimeout(() => {
        currentSpelling.value.forEach(i => i.selected = false);
        currentSpelling.value = [];
        isWrong.value = false;
      }, 600);
    }
  }
};

const clearSelection = () => {
  currentSpelling.value.forEach(i => i.selected = false);
  currentSpelling.value = [];
};

const handleCorrect = async () => {
  soundFx.correct();
  myScore.value++;
  showAttack.value = true;
  soundFx.attack();
  setTimeout(() => showAttack.value = false, 300);
  
  if (battleSubscription) {
    battleSubscription.send({ type: 'broadcast', event: 'hit', payload: { id: studentCookie.value.id, score: myScore.value } });
  }

  if (myScore.value >= targetScore.value) {
    triggerGameOver(studentCookie.value.id);
    if(isHost.value) await supabase.from('game_rooms').update({ status: 'finished', winner_id: studentCookie.value.id }).eq('id', currentRoomId.value);
  } else {
    setTimeout(nextRound, 300);
  }
};

const triggerGameOver = async (wId) => {
  winnerId.value = wId;
  matchStatus.value = 'gameover';
  const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
  const isWinner = wId === studentCookie.value.id;
  
  if (isWinner) soundFx.win(); else soundFx.lose();

  if (studentCookie.value && !studentCookie.value.isAnon) {
    const finalScore = Math.max(0, (myScore.value * pvpCorrectPoints.value) - (mistakesCount.value * pvpPenaltyPoints.value));

    await supabase.from('game_records').insert([{
      student_id: studentCookie.value.id,
      game_type: '單字方塊陣',
      score: finalScore, 
      mistakes: mistakesCount.value, 
      time_taken_seconds: timeSpent,
      version: route.query.version,
      volume: route.query.volume,
      unit_played: route.query.unit,
      correct_words: isWinner ? `【勝】對手: ${opponentData.value.name}` : `【敗】對手: ${opponentData.value.name}`
    }]);
  }

  leaveGame(true);
};

const leaveGame = async (isNormalGameOver = false) => {
  if (isNormalGameOver !== true && matchStatus.value === 'playing') {
      if (battleSubscription) {
          battleSubscription.send({ type: 'broadcast', event: 'escaped', payload: { id: studentCookie.value.id } });
      }
      await recordEscape(); 
  }

  if (battleSubscription) { 
      await supabase.removeChannel(battleSubscription); 
      battleSubscription = null; 
  }
  if (checkRoomInterval) clearInterval(checkRoomInterval);
  if (isHost.value && currentRoomId.value && matchStatus.value !== 'gameover') {
      await supabase.from('game_rooms').delete().eq('id', currentRoomId.value);
  }
  
  // 🌟 回到大廳時，再次檢查禁賽狀態
  if (matchStatus.value !== 'gameover' && matchStatus.value !== 'banned') {
      if (todayEscapesCount.value >= maxEscapes.value) matchStatus.value = 'banned';
      else matchStatus.value = 'idle';
  }
  currentRoomId.value = null;
};

onUnmounted(() => { 
    window.removeEventListener('beforeunload', handleBeforeUnload);
    leaveGame(); 
});
</script>

<template>
  <div class="battle-container" :class="{ 'damaged-shake': showDamaged }">
    <div class="header-bar retro-element">
      <h2>⚔️ 單字方塊陣</h2>
      <button class="retro-btn exit-btn" @click="leaveGame(false)" v-if="matchStatus !== 'idle' && matchStatus !== 'gameover' && matchStatus !== 'banned'">逃跑</button>
      <NuxtLink to="/" class="retro-btn exit-btn" v-else>← 返回</NuxtLink>
    </div>

    <div v-if="matchStatus === 'banned'" class="main-screen retro-element">
      <div class="status-box gameover">
        <div class="icon-big" style="color: #f44336; text-shadow: 0 0 20px rgba(244,67,54,0.8);">🚫</div>
        <h3 class="lose-text">帳號已被禁賽</h3>
        <p style="font-size: 1.2rem; font-weight: bold; line-height: 1.5; color: #fff;">
          您今天已經主動逃跑了 <span style="color:#f44336; font-size:1.5rem;">{{ todayEscapesCount }}</span> 次！<br>
          已達到單日逃跑上限 ({{ maxEscapes }}次)。
        </p>
        <p style="color:#ff9800; margin-top: 10px; font-weight: bold;">
          為了維護競技場的公平性，您今天將無法進行【單字方塊陣】。<br>
          請明天再來挑戰，並發揮運動家精神戰鬥到最後！
        </p>
        <NuxtLink to="/" class="retro-btn cancel-btn" style="margin-top:20px; width:100%; max-width: 250px;">返回首頁</NuxtLink>
      </div>
    </div>

    <div v-else-if="matchStatus === 'idle'" class="main-screen retro-element">
      <div class="status-box">
        <div class="icon-big">🎮</div>
        <h3>拼字競速對決！</h3>
        <p>誰先拼出 {{ targetScore }} 個單字，誰就是贏家！<br>
           <span style="font-size:0.9rem; color:#f57c00;">(拼對得 {{ pvpCorrectPoints }} 分，拼錯扣 {{ pvpPenaltyPoints }} 分)</span><br>
           <span style="font-size:0.8rem; color:#aaa; margin-top:5px; display:inline-block;">今日逃跑次數: {{ todayEscapesCount }} / {{ maxEscapes }} (滿額將禁玩一天)</span>
        </p>
        <button class="retro-btn play-btn" @click="startMatchmaking" :disabled="isLoadingWords">
          {{ isLoadingWords ? '⏳ 載入中...' : '🔍 尋找對手' }}
        </button>
      </div>
    </div>

    <div v-else-if="matchStatus === 'searching'" class="main-screen retro-element">
      <div class="status-box searching">
        <div class="icon-big spinner">⏳</div>
        <h3>正在尋找對手...</h3>
        <button class="retro-btn cancel-btn" @click="cancelMatchmaking">❌ 取消</button>
      </div>
    </div>

    <div v-else-if="matchStatus === 'playing'" class="game-board">
      <div class="laser-beam" :class="{ 'fire': showAttack }"></div>
      <div class="damage-overlay" :class="{ 'hit': showDamaged }"></div>

      <div class="score-board retro-element">
        <div class="player me" :class="{ 'attacking': showAttack }">
          <div class="name">{{ studentCookie?.name || '你' }}</div>
          <div class="score">{{ myScore }} / {{ targetScore }}</div>
        </div>
        <div class="vs">VS</div>
        <div class="player opponent" :class="{ 'taking-damage': showAttack, 'attacking': showDamaged }">
          <div class="name">{{ opponentData?.name || '對手' }}</div>
          <div class="score">{{ opponentScore }} / {{ targetScore }}</div>
        </div>
      </div>

      <div class="question-area retro-element">
        <div class="zh-target">{{ currentWord?.zh_tw }}</div>
        <div class="en-hint">{{ currentWord?.en_us?.toUpperCase() }}</div>
        
        <div class="spelled-word" :class="{ 'shake': isWrong }">
          <span v-for="(letter, idx) in currentSpelling" :key="idx" class="spelled-char">{{ letter.char }}</span>
          <span v-if="currentSpelling.length === 0" class="placeholder">依序點擊下方字母...</span>
        </div>
      </div>

      <div class="grid-area retro-element">
        <div class="grid-container" :style="spinStyle">
          <button 
            v-for="item in gridLetters" 
            :key="item.id" 
            class="grid-btn" 
            :class="{ 'selected': item.selected }"
            :style="spinStyle"
            @click="selectLetter(item)"
          >
            {{ item.char }}
          </button>
        </div>
        <button class="retro-btn clear-btn" @click="clearSelection">🧹 清空重拼</button>
      </div>
    </div>

    <div v-else-if="matchStatus === 'gameover'" class="main-screen retro-element">
      <div class="status-box gameover">
        <div class="icon-big">{{ winnerId === studentCookie?.id ? '🏆' : '💀' }}</div>
        <h3 :class="winnerId === studentCookie?.id ? 'win-text' : 'lose-text'">
          {{ winnerId === studentCookie?.id ? '你贏了！太神啦！' : '你輸了！再接再厲！' }}
        </h3>
        <p class="final-score-text">比分進度： {{ myScore }} - {{ opponentScore }}</p>
        <p style="color:#f57c00; font-weight:bold; margin-top:5px;">本次獲得： {{ Math.max(0, (myScore * pvpCorrectPoints) - (mistakesCount * pvpPenaltyPoints)) }} 分 (失誤 {{ mistakesCount }} 次)</p>
        <button class="retro-btn play-btn" @click="matchStatus = 'idle'">🔄 回大廳</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-container { padding: 15px; max-width: 600px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; gap: 15px; position: relative; overflow: hidden; }
.header-bar { display: flex; justify-content: space-between; align-items: center; background: var(--box-bg); padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); z-index: 10;}
.header-bar h2 { margin: 0; font-size: 1.5rem; color: var(--text-main); font-weight: 900; }
.main-screen { background: var(--bg-color); padding: 50px 20px; text-align: center; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
.status-box { display: flex; flex-direction: column; align-items: center; gap: 15px; }
.icon-big { font-size: 5rem; margin-bottom: 10px; }
.spinner { display: inline-block; animation: spin 2s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.retro-btn { font-family: inherit; padding: 12px 20px; font-weight: 900; font-size: 1.1rem; cursor: pointer; border: 4px solid var(--border-color); border-radius: 12px; box-shadow: 0 6px 0 var(--border-color); transition: 0.1s; display: inline-block; background: var(--box-bg); color: var(--text-main);}
.retro-btn:active:not(:disabled) { transform: translateY(6px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.play-btn { background: var(--success-bg); color: #fff; border-color: #2e7d32; box-shadow: 0 6px 0 #2e7d32; width: 100%; max-width: 250px; margin-top: 15px;}
.cancel-btn { background: #ffebee; color: #d32f2f; border-color: #d32f2f; box-shadow: 0 6px 0 #d32f2f; text-decoration: none; display: inline-block; }
.exit-btn { padding: 8px 15px; font-size: 1rem; border-width: 2px; box-shadow: 0 4px 0 var(--border-color); background: #e0e0e0; color: #333; text-decoration: none;}

.game-board { display: flex; flex-direction: column; gap: 15px; flex-grow: 1; position: relative; overflow-x: hidden; padding-bottom: 20px;}
.score-board { display: flex; justify-content: space-between; align-items: center; background: #333; color: white; padding: 15px; border-radius: 15px; border: 4px solid var(--border-color); box-shadow: 0 8px 0 var(--border-color); position: relative; z-index: 5; overflow: hidden;}
.player { text-align: center; flex: 1; transition: all 0.1s; padding: 5px; border-radius: 10px;}
.player.attacking { transform: scale(1.1); background: rgba(76, 175, 80, 0.3); }
.player.taking-damage { transform: translateX(5px) rotate(2deg); background: rgba(244, 67, 54, 0.5); }
.player .name { font-size: 0.9rem; font-weight: bold; opacity: 0.8; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player .score { font-size: 2rem; font-weight: 900; }
.me .score { color: #4caf50; }
.opponent .score { color: #f44336; }
.vs { font-size: 2rem; font-weight: 900; font-style: italic; color: #ff9800; text-shadow: 2px 2px 0 #000; margin: 0 10px; }

.question-area { background: var(--info-bg); padding: 20px; text-align: center; border-radius: 15px; border: 4px dashed var(--border-color); z-index: 5;}
.zh-target { font-size: 2.5rem; font-weight: 900; color: var(--primary-color); margin-bottom: 5px; }
.en-hint { font-size: 1.2rem; font-weight: bold; color: #555; letter-spacing: 2px; margin-bottom: 15px; }

.spelled-word { background: white; min-height: 60px; display: flex; justify-content: center; align-items: center; gap: 5px; padding: 10px; border-radius: 10px; border: 3px solid #ccc; font-size: 2rem; font-weight: 900; font-family: monospace; flex-wrap: wrap;}
.spelled-char { background: var(--text-main); color: white; width: 40px; height: 50px; display: flex; justify-content: center; align-items: center; border-radius: 5px; box-shadow: 0 4px 0 #000; }
.placeholder { font-size: 1rem; color: #aaa; font-weight: normal; }

.grid-area { background: var(--box-bg); padding: 40px 20px; display: flex; flex-direction: column; align-items: center; border-radius: 15px; border: 4px solid var(--border-color); box-shadow: var(--shadow-box); z-index: 5; overflow: hidden;}
.grid-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; width: 100%; max-width: 320px; margin-bottom: 25px; animation: devilSpin 15s linear infinite; }
.grid-btn { background: #fff; border: 4px solid var(--border-color); border-radius: 12px; font-size: 2rem; font-weight: 900; color: var(--text-main); aspect-ratio: 1/1; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0 6px 0 var(--border-color); transition: 0.1s; padding: 0; animation: counterDevilSpin 15s linear infinite; }
.grid-btn:active:not(.selected) { transform: translateY(6px); box-shadow: none; }
.grid-btn.selected { background: var(--warning-bg); color: #fff; border-color: #f57c00; box-shadow: none; transform: translateY(6px) scale(0.9); pointer-events: none; opacity: 0.8;}
.clear-btn { background: #e0e0e0; font-size: 1rem; padding: 10px 20px; border-width: 2px; box-shadow: 0 4px 0 var(--border-color); width: 100%; max-width: 350px; z-index: 10;}

.win-text { color: #4caf50; font-size: 2.5rem; margin-bottom: 10px;}
.lose-text { color: #f44336; font-size: 2.5rem; margin-bottom: 10px;}
.final-score-text { font-size: 1.5rem; font-weight: 900; color: var(--text-main); }

.shake { animation: shake 0.5s; background: #ffebee; border-color: #f44336;}
.laser-beam { position: absolute; top: 30px; left: -100%; width: 150%; height: 20px; background: linear-gradient(90deg, transparent, #00e5ff, #fff, transparent); box-shadow: 0 0 20px #00e5ff, 0 0 40px #00e5ff; transform: rotate(15deg); opacity: 0; z-index: 100; pointer-events: none; transition: 0s;}
.laser-beam.fire { animation: laserFire 0.3s ease-out forwards; }
@keyframes laserFire { 0% { left: -50%; opacity: 1; width: 10%;} 50% { left: 20%; width: 100%; opacity: 1;} 100% { left: 100%; width: 10%; opacity: 0;} }

.damage-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(244, 67, 54, 0.4); z-index: 999; pointer-events: none; opacity: 0; transition: opacity 0.1s;}
.damage-overlay.hit { opacity: 1; }
.damaged-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }

@keyframes shake { 0% { transform: translateX(0); } 25% { transform: translateX(-8px) rotate(-1deg); } 50% { transform: translateX(8px) rotate(1deg); } 75% { transform: translateX(-8px) rotate(-1deg); } 100% { transform: translateX(0); } }
@keyframes devilSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes counterDevilSpin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

@media (max-width: 400px) { .zh-target { font-size: 2rem; } .grid-btn { font-size: 1.5rem; } .spelled-char { width: 30px; height: 40px; font-size: 1.5rem; } .grid-container { max-width: 280px; gap: 10px;} }
</style>