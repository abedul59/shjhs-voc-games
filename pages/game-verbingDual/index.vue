<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import confetti from 'canvas-confetti';

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

// 房間與對戰狀態
const currentRoomId = ref(null);
const matchStatus = ref('idle'); // idle, searching, playing, gameover, banned
const isHost = ref(false);
const opponentData = ref({ name: '神祕對手', id: null });
let checkRoomInterval = null;
let battleSubscription = null;
let gameStartTime = 0;

// 遊戲資料與計分系統
const isLoadingWords = ref(true);
const verbs = ref([]);
const myScore = ref(0); 
const opponentScore = ref(0);

// 後台設定值
const targetScore = ref(50); // 對戰版目標分數 (預設先得 50 分獲勝)
const pvpCorrectPoints = ref(10); // 完全答對一題 10 分
const pvpPenaltyPoints = ref(3); // 錯一次扣 3 分
const keyboardSpeed = ref(20); 
const maxEscapes = ref(20); 
const todayEscapesCount = ref(0); 
const mistakesCount = ref(0); 

// 單題狀態
const currentVerb = ref({});
const pastInput = ref('');
const ppInput = ref('');
const activeField = ref('past'); 
const isChecking = ref(false);
const isPastLocked = ref(false);
const isPpLocked = ref(false);

const showDamaged = ref(false);
const winnerId = ref(null);

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

// 音效系統
let audioCtx = null;
const playClickSound = () => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.03);
  } catch(e) {}
};

const playPronunciation = (word) => {
  if (!word) return;
  const cleanWord = word.split('/')[0].toLowerCase().trim(); 
  const audio = new Audio(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${cleanWord}--_us_1.mp3`);
  audio.play().catch(() => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = 'en-US'; window.speechSynthesis.speak(utterance);
    }
  });
};

onMounted(async () => {
  if (!studentCookie.value) { router.push('/'); return; }
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 抓取設定
  const { data: sysData } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (sysData) {
    if (sysData.pvp_target_score) targetScore.value = sysData.pvp_target_score * 10; // 將原本算單字的改成算分
    if (sysData.verbing_keyboard_speed) keyboardSpeed.value = sysData.verbing_keyboard_speed;
    if (sysData.pvp_penalty_points) pvpPenaltyPoints.value = sysData.pvp_penalty_points;
    if (sysData.pvp_max_escapes) maxEscapes.value = sysData.pvp_max_escapes;
  }

  // 檢查今日逃跑次數
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const { data: escapeData } = await supabase.from('game_records')
    .select('id').eq('student_id', studentCookie.value.id).eq('game_type', '動詞對戰大師').like('correct_words', '%【逃】%').gte('created_at', todayStart.toISOString());
  if (escapeData) todayEscapesCount.value = escapeData.length;

  // 載入題庫
  const { data: vData } = await supabase.from('irregular_verbs').select('*');
  if (vData && vData.length >= 5) {
    verbs.value = vData;
    isLoadingWords.value = false;
  } else {
    alert('動詞題庫不足！'); router.push('/');
  }
});

// ================= 對戰配對邏輯 =================
const startMatchmaking = async () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (isLoadingWords.value) return;
  if (!studentCookie.value || studentCookie.value.isAnon) { alert('請先登入！'); return; }
  if (todayEscapesCount.value >= maxEscapes.value) { matchStatus.value = 'banned'; return; }

  matchStatus.value = 'searching';

  // 尋找等待中的房間
  const { data: rooms } = await supabase.from('game_rooms')
    .select('*').eq('status', 'waiting').eq('unit_info', 'verbingDual').neq('host_id', studentCookie.value.id).limit(1);

  if (rooms && rooms.length > 0) {
    // 加入房間
    const room = rooms[0];
    isHost.value = false;
    currentRoomId.value = room.id;
    opponentData.value = { id: room.host_id, name: room.host_name };

    await supabase.from('game_rooms').update({ 
        guest_id: studentCookie.value.id, guest_name: studentCookie.value.name, status: 'playing' 
    }).eq('id', room.id);
    startGameConnection();
  } else {
    // 建立新房間
    isHost.value = true;
    const { data: newRoom, error } = await supabase.from('game_rooms').insert([{
        host_id: studentCookie.value.id, host_name: studentCookie.value.name, unit_info: 'verbingDual', status: 'waiting'
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
  matchStatus.value = 'idle'; currentRoomId.value = null;
};

const startGameConnection = () => {
    matchStatus.value = 'playing';
    myScore.value = 0; opponentScore.value = 0; mistakesCount.value = 0; 
    gameStartTime = Date.now();
    new Audio('/sounds/correct.mp3').play();
    
    battleSubscription = supabase.channel(`battle_${currentRoomId.value}`);
    
    battleSubscription.on('broadcast', { event: 'hit' }, (payload) => {
        if(payload.payload.id !== studentCookie.value.id) {
            opponentScore.value = payload.payload.score;
            new Audio('/sounds/wrong.mp3').play(); // 對手得分時放警告音
            showDamaged.value = true;
            setTimeout(() => showDamaged.value = false, 500); // 震動畫面
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

// ================= 遊戲核心邏輯 =================
const nextRound = () => {
  const randomVerb = verbs.value[Math.floor(Math.random() * verbs.value.length)];
  currentVerb.value = randomVerb;
  pastInput.value = ''; ppInput.value = '';
  isPastLocked.value = false; isPpLocked.value = false;
  activeField.value = 'past'; isChecking.value = false;
};

const typeLetter = (char) => {
  if (isChecking.value) return;
  playClickSound();
  if (activeField.value === 'past' && !isPastLocked.value) pastInput.value += char.toLowerCase();
  else if (activeField.value === 'pp' && !isPpLocked.value) ppInput.value += char.toLowerCase();
};

const deleteLetter = () => {
  if (isChecking.value) return;
  playClickSound();
  if (activeField.value === 'past' && !isPastLocked.value) pastInput.value = pastInput.value.slice(0, -1);
  else if (activeField.value === 'pp' && !isPpLocked.value) ppInput.value = ppInput.value.slice(0, -1);
};

const switchField = (field) => {
  if ((field === 'past' && isPastLocked.value) || (field === 'pp' && isPpLocked.value)) return;
  activeField.value = field;
};

const submitAnswer = () => {
  if (isChecking.value) return;
  playClickSound();
  
  const validPast = currentVerb.value.past_tense.toLowerCase().split('/').map(s => s.trim());
  const validPp = currentVerb.value.past_participle.toLowerCase().split('/').map(s => s.trim());

  let currentSubmitCorrect = true;

  if (!isPastLocked.value) {
    if (validPast.includes(pastInput.value.trim())) isPastLocked.value = true;
    else { currentSubmitCorrect = false; pastInput.value = ''; }
  }
  if (!isPpLocked.value) {
    if (validPp.includes(ppInput.value.trim())) isPpLocked.value = true;
    else { currentSubmitCorrect = false; ppInput.value = ''; }
  }

  if (!currentSubmitCorrect) {
    mistakesCount.value++;
    new Audio('/sounds/wrong.mp3').play();
    if (!isPastLocked.value) activeField.value = 'past';
    else if (!isPpLocked.value) activeField.value = 'pp';
    return; 
  }

  // 兩者皆對
  if (isPastLocked.value && isPpLocked.value) {
    isChecking.value = true;
    myScore.value += pvpCorrectPoints.value;
    new Audio('/sounds/correct.mp3').play();

    // 發送攻擊訊號給對手
    if (battleSubscription) {
        battleSubscription.send({ type: 'broadcast', event: 'hit', payload: { id: studentCookie.value.id, score: myScore.value } });
    }

    if (myScore.value >= targetScore.value) {
      triggerGameOver(studentCookie.value.id);
    } else {
      setTimeout(nextRound, 1000);
    }
  }
};

// ================= 結束與逃跑邏輯 =================
const triggerGameOver = async (wId) => {
  winnerId.value = wId;
  matchStatus.value = 'gameover';
  const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
  const isWinner = wId === studentCookie.value.id;
  
  if (isWinner) {
      new Audio('/sounds/correct.mp3').play();
      confetti({ particleCount: 150, spread: 80 });
  }

  if (studentCookie.value && !studentCookie.value.isAnon) {
    const finalScore = Math.max(0, myScore.value - (mistakesCount.value * pvpPenaltyPoints.value));

    await supabase.from('game_records').insert([{
      student_id: studentCookie.value.id,
      real_name: studentCookie.value.real_name || studentCookie.value.name,
      class_name: studentCookie.value.class,
      unit_played: '對戰不規則動詞',
      game_type: '動詞對戰大師',
      score: finalScore, 
      mistakes: mistakesCount.value, 
      time_taken_seconds: timeSpent,
      correct_words: isWinner ? `【勝】對手: ${opponentData.value.name}` : `【敗】對手: ${opponentData.value.name}`
    }]);

    const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
    if (data) await supabase.from('students').update({ points: data.points + finalScore }).eq('id', studentCookie.value.id);
  }

  leaveGame(true);
};

const recordEscape = async () => {
    if (!studentCookie.value || studentCookie.value.isAnon || matchStatus.value !== 'playing') return;
    const timeSpent = Math.round((Date.now() - gameStartTime) / 1000);
    const finalScore = Math.max(0, myScore.value - (mistakesCount.value * pvpPenaltyPoints.value));

    await supabase.from('game_records').insert([{
        student_id: studentCookie.value.id,
        real_name: studentCookie.value.real_name || studentCookie.value.name,
        class_name: studentCookie.value.class,
        unit_played: '對戰不規則動詞',
        game_type: '動詞對戰大師',
        score: finalScore, 
        mistakes: mistakesCount.value, 
        time_taken_seconds: timeSpent,
        correct_words: `【逃】對手: ${opponentData.value?.name || '未知'}`
    }]);
    todayEscapesCount.value++;
};

const leaveGame = async (isNormalGameOver = false) => {
  if (isNormalGameOver !== true && matchStatus.value === 'playing') {
      if (battleSubscription) battleSubscription.send({ type: 'broadcast', event: 'escaped', payload: { id: studentCookie.value.id } });
      await recordEscape(); 
  }
  if (battleSubscription) { await supabase.removeChannel(battleSubscription); battleSubscription = null; }
  if (checkRoomInterval) clearInterval(checkRoomInterval);
  if (isHost.value && currentRoomId.value && matchStatus.value !== 'playing') {
      await supabase.from('game_rooms').delete().eq('id', currentRoomId.value);
  }
};

const handleBeforeUnload = (event) => {
    if (matchStatus.value === 'playing') {
        leaveGame();
        event.preventDefault();
        event.returnValue = '';
    }
};

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    leaveGame();
});
</script>

<template>
  <div class="game-container" :class="{ 'shake-animation': showDamaged }">
    <div class="header">
      <NuxtLink to="/" class="back-btn" @click="leaveGame">⬅ 逃走 (算敗)</NuxtLink>
      <div v-if="matchStatus === 'playing'" class="vs-banner">
         <span class="player-name">我</span> <span class="vs-text">VS</span> <span class="opponent-name">{{ opponentData.name }}</span>
      </div>
    </div>

    <!-- 狀態區塊 -->
    <div v-if="matchStatus === 'banned'" class="status-box retro-element error">
      <h2>🚫 禁賽通知</h2>
      <p>您今日逃跑次數已達上限 ({{ maxEscapes }} 次)，今日無法再進行對戰。</p>
      <NuxtLink to="/" class="retro-btn">回到首頁</NuxtLink>
    </div>

    <div v-else-if="matchStatus === 'idle'" class="status-box retro-element">
      <h2>⚔️ 動詞變化大師 (對戰版)</h2>
      <p>規則：比誰先完成 <strong>{{ targetScore / 10 }}</strong> 個單字！<br>對方得分時，你的畫面會劇烈震動！</p>
      <div class="rules">答錯扣 {{ pvpPenaltyPoints }} 分 / 逃跑記錄在案</div>
      <button class="retro-btn start-btn" @click="startMatchmaking" :disabled="isLoadingWords">
        {{ isLoadingWords ? '載入題庫中...' : '🔍 尋找對手' }}
      </button>
    </div>

    <div v-else-if="matchStatus === 'searching'" class="status-box retro-element">
      <div class="loader"></div>
      <h2>正在尋找勢均力敵的對手...</h2>
      <button class="retro-btn cancel-btn" @click="cancelMatchmaking">取消配對</button>
    </div>

    <!-- 遊戲進行中 -->
    <div v-else-if="matchStatus === 'playing'" class="play-area">
      <!-- 雙方血條/分數區 -->
      <div class="score-board retro-element">
        <div class="score-row my-score-row">
           <div class="score-label">我方進度</div>
           <div class="progress-bar my-bar"><div class="fill" :style="{ width: (myScore / targetScore * 100) + '%' }"></div></div>
           <div class="score-val">{{ myScore }}/{{ targetScore }}</div>
        </div>
        <div class="score-row opp-score-row">
           <div class="score-label">敵方進度</div>
           <div class="progress-bar opp-bar"><div class="fill" :style="{ width: (opponentScore / targetScore * 100) + '%' }"></div></div>
           <div class="score-val">{{ opponentScore }}/{{ targetScore }}</div>
        </div>
      </div>

      <!-- 題目與作答區 -->
      <div class="question-box retro-element">
        <div class="base-verb">
          {{ currentVerb.base_form }}
          <button class="sound-btn" @click="playPronunciation(currentVerb.base_form)">🔊</button>
        </div>
        <div class="chinese-meaning">{{ currentVerb.chinese }}</div>
      </div>

      <div class="inputs-container">
        <div class="input-group retro-element" :class="{ active: activeField === 'past', locked: isPastLocked }" @click="switchField('past')">
          <label>過去式 (Past) <span v-if="isPastLocked" class="lock-icon">✅</span><button v-else class="hint-sound" @click.stop="playPronunciation(currentVerb.past_tense)">🔊</button></label>
          <div class="typed-text">{{ pastInput }}<span v-if="activeField === 'past' && !isChecking && !isPastLocked" class="cursor">_</span></div>
        </div>
        
        <div class="input-group retro-element" :class="{ active: activeField === 'pp', locked: isPpLocked }" @click="switchField('pp')">
          <label>過去分詞 (P.P.) <span v-if="isPpLocked" class="lock-icon">✅</span><button v-else class="hint-sound" @click.stop="playPronunciation(currentVerb.past_participle)">🔊</button></label>
          <div class="typed-text">{{ ppInput }}<span v-if="activeField === 'pp' && !isChecking && !isPpLocked" class="cursor">_</span></div>
        </div>
      </div>

      <!-- 旋轉虛擬鍵盤區 -->
      <div class="keyboard-wrapper" :style="{ '--spin-speed': keyboardSpeed + 's' }">
        <div class="spinning-keyboard retro-element">
          <div v-for="(row, rIdx) in keys" :key="rIdx" class="key-row">
            <button v-for="key in row" :key="key" class="key-btn" @click="typeLetter(key)" :disabled="isChecking">
              <span class="upright-text">{{ key }}</span>
            </button>
          </div>
          <div class="key-row">
            <button class="key-btn action-btn del-btn" @click="deleteLetter" :disabled="isChecking"><span class="upright-text">DEL</span></button>
            <button class="key-btn action-btn submit-btn" @click="submitAnswer" :disabled="isChecking"><span class="upright-text">✅ 送出</span></button>
          </div>
        </div>
      </div>
    </div>

    <!-- 結束畫面 -->
    <div v-else-if="matchStatus === 'gameover'" class="status-box retro-element gameover">
      <h1 v-if="winnerId === studentCookie.id" class="win-title">🏆 勝利！</h1>
      <h1 v-else class="lose-title">💀 戰敗...</h1>
      <div class="final-stats">
        <p>最終分數: {{ myScore }}</p>
        <p>錯誤次數: {{ mistakesCount }} (扣 {{ mistakesCount * pvpPenaltyPoints }} 分)</p>
      </div>
      <button class="retro-btn start-btn" @click="matchStatus = 'idle'">再戰一局</button>
      <NuxtLink to="/" class="retro-btn cancel-btn" style="display:block; text-align:center; margin-top: 10px;">回首頁</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.game-container { max-width: 600px; margin: 10px auto; padding: 10px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;}
.back-btn { text-decoration: none; font-weight: bold; color: #d32f2f; border: 2px solid #d32f2f; padding: 5px 10px; border-radius: 8px;}
.vs-banner { font-size: 1.2rem; font-weight: 900; background: #333; color: white; padding: 5px 15px; border-radius: 20px;}
.vs-text { color: #f39c12; margin: 0 5px;}

.status-box { text-align: center; padding: 30px 20px; background: white; border-radius: 16px; border: 3px solid #333; margin-top: 20px;}
.status-box h2 { margin-top: 0; color: #1a237e;}
.rules { color: #d32f2f; font-weight: bold; margin-bottom: 20px;}
.retro-btn { padding: 12px 20px; font-size: 1.2rem; font-weight: bold; border-radius: 12px; border: 2px solid #333; cursor: pointer; transition: 0.1s; display: inline-block; text-decoration: none;}
.retro-btn:active { transform: translateY(3px); }
.start-btn { background: #4caf50; color: white;}
.cancel-btn { background: #e0e0e0; color: #333;}
.loader { border: 6px solid #f3f3f3; border-top: 6px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px;}

/* 計分板 */
.score-board { padding: 10px; background: #fff; border-radius: 12px; border: 2px solid #ccc; margin-bottom: 15px;}
.score-row { display: flex; align-items: center; gap: 10px; margin-bottom: 5px;}
.score-label { width: 60px; font-weight: bold; font-size: 0.9rem;}
.progress-bar { flex: 1; height: 15px; background: #eee; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;}
.progress-bar .fill { height: 100%; transition: width 0.3s;}
.my-bar .fill { background: #4caf50;}
.opp-bar .fill { background: #f44336;}
.score-val { width: 50px; text-align: right; font-weight: bold; color: #333;}

/* 遊戲區塊 */
.play-area { display: flex; flex-direction: column; gap: 10px; }
.question-box { background: #e3f2fd; border-color: #1976d2; text-align: center; padding: 15px; border-radius: 16px; min-height: 110px; z-index: 2;}
.base-verb { font-size: 2.5rem; font-weight: 900; color: #0d47a1; display: flex; align-items: center; justify-content: center; gap: 10px;}
.chinese-meaning { font-size: 1.2rem; color: #555; font-weight: bold;}
.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 40px; height: 40px; font-size: 1.2rem; cursor: pointer;}

.inputs-container { display: flex; gap: 8px;}
.input-group { flex: 1; background: #f5f5f5; padding: 10px; border-radius: 12px; cursor: pointer; border: 3px solid #ccc; transition: 0.2s;}
.input-group.active { border-color: #4caf50; background: #e8f5e9; transform: translateY(-3px); box-shadow: 0 4px 10px rgba(76,175,80,0.3);}
.input-group.locked { border-color: #27ae60; background: #eaeded; opacity: 0.8; transform: none; box-shadow: none; cursor: default; }
.lock-icon { color: #27ae60; font-weight: bold; }
.input-group label { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #666; font-weight: bold; margin-bottom: 5px;}
.hint-sound { background: #e0e0e0; border: none; padding: 2px 6px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;}
.typed-text { font-size: 1.3rem; font-weight: bold; color: #333; min-height: 30px; letter-spacing: 1px;}
.cursor { animation: blink 1s infinite; color: #4caf50;}
@keyframes blink { 50% { opacity: 0; } }

/* 鍵盤保護罩與反向旋轉 */
.keyboard-wrapper { position: relative; width: 100%; max-width: 400px; aspect-ratio: 1 / 1; margin: 5px auto; z-index: 1; display: flex; justify-content: center; align-items: center;}
.spinning-keyboard { width: 95%; background: #2c3e50; padding: 10px; border-radius: 16px; border: 4px solid #1a252f; animation: spin var(--spin-speed) linear infinite; box-sizing: border-box;}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.key-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 5px;}
.key-btn { flex: 1; height: 42px; font-size: 1.1rem; font-weight: bold; background: #ecf0f1; border: 2px solid #bdc3c7; border-radius: 6px; color: #2c3e50; cursor: pointer; display: flex; justify-content: center; align-items: center; padding: 0;}
.key-btn:active:not(:disabled) { background: #bdc3c7; transform: scale(0.95);}

.action-btn { flex: unset; padding: 0 15px; font-size: 1rem;}
.del-btn { background: #e74c3c; color: white; border-color: #c0392b;}
.submit-btn { background: #27ae60; color: white; border-color: #2ecc71;}

.upright-text { display: inline-block; animation: counter-spin var(--spin-speed) linear infinite;}
@keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

/* 受到攻擊時的震動效果 */
.shake-animation { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
@keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-6px, 0, 0); } 40%, 60% { transform: translate3d(6px, 0, 0); } }

.gameover h1 { font-size: 3rem; margin-bottom: 10px;}
.win-title { color: #f39c12;}
.lose-title { color: #c0392b;}
.final-stats { font-size: 1.2rem; font-weight: bold; margin-bottom: 20px;}
</style>
