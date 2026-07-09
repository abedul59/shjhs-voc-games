<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import confetti from 'canvas-confetti';

const supabase = useSupabaseClient();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const gameVerbs = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const gameState = ref('loading'); 

// 🌟 遊戲設定 (從資料庫讀取)
const keyboardSpeed = ref(20); 
const wrongPenalty = ref(3);
const timeLimit = ref(20);
const timePenalty = ref(0.5);

// 單題狀態
const pastInput = ref('');
const ppInput = ref('');
const activeField = ref('past'); 
const isChecking = ref(false);

const isPastLocked = ref(false);
const isPpLocked = ref(false);
const currentWrongCount = ref(0);
const timeSpent = ref(0);
let timer = null;

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

// 🌟 內建 Web Audio API 打字音效 (不需依賴外部檔案)
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
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch(e) {}
};

onMounted(async () => {
  if (!studentCookie.value) { router.push('/'); return; }

  // 抓取設定
  const { data: sysData } = await supabase.from('system_settings')
    .select('verbing_keyboard_speed, verbing_wrong_penalty, verbing_time_limit, verbing_time_penalty')
    .eq('id', 1).single();
    
  if (sysData) {
    if (sysData.verbing_keyboard_speed !== null) keyboardSpeed.value = sysData.verbing_keyboard_speed;
    if (sysData.verbing_wrong_penalty !== null) wrongPenalty.value = sysData.verbing_wrong_penalty;
    if (sysData.verbing_time_limit !== null) timeLimit.value = sysData.verbing_time_limit;
    if (sysData.verbing_time_penalty !== null) timePenalty.value = sysData.verbing_time_penalty;
  }

  const { data: verbs } = await supabase.from('irregular_verbs').select('*');
  if (!verbs || verbs.length < 10) {
    alert('題庫不規則動詞不足 10 個，請先至後台匯入資料！');
    router.push('/');
    return;
  }

  gameVerbs.value = verbs.sort(() => Math.random() - 0.5).slice(0, 10);
  startQuestion();
  gameState.value = 'playing';
});

const currentVerb = computed(() => gameVerbs.value[currentIndex.value] || {});

const startQuestion = () => {
  pastInput.value = '';
  ppInput.value = '';
  isPastLocked.value = false;
  isPpLocked.value = false;
  activeField.value = 'past';
  isChecking.value = false;
  currentWrongCount.value = 0;
  timeSpent.value = 0;
  
  clearInterval(timer);
  timer = setInterval(() => { timeSpent.value++; }, 1000);
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

// 🌟 結算邏輯
const finalizeQuestion = () => {
  clearInterval(timer);
  isChecking.value = true;
  
  // 過去式與過去分詞各 5 分
  let basePoints = (isPastLocked.value ? 5 : 0) + (isPpLocked.value ? 5 : 0);
  let overtime = Math.max(0, timeSpent.value - timeLimit.value);
  let penaltyScore = (currentWrongCount.value * wrongPenalty.value) + (overtime * timePenalty.value);
  let earned = Math.max(0, basePoints - penaltyScore);
  
  score.value += earned;

  setTimeout(() => {
    if (currentIndex.value < 9) {
      currentIndex.value++;
      startQuestion();
    } else {
      endGame();
    }
  }, 1500);
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
    currentWrongCount.value++;
    new Audio('/sounds/wrong.mp3').play();
    if (!isPastLocked.value) activeField.value = 'past';
    else if (!isPpLocked.value) activeField.value = 'pp';
    return; 
  }

  // 兩個都答對了
  if (isPastLocked.value && isPpLocked.value) {
    new Audio('/sounds/correct.mp3').play();
    finalizeQuestion();
  }
};

const skipQuestion = () => {
  if (isChecking.value) return;
  playClickSound();
  pastInput.value = currentVerb.value.past_tense;
  ppInput.value = currentVerb.value.past_participle;
  new Audio('/sounds/wrong.mp3').play();
  finalizeQuestion();
};

const endGame = async () => {
  gameState.value = 'end';
  clearInterval(timer);
  confetti({ particleCount: 150, spread: 80 });

  await supabase.from('game_records').insert([{
    student_id: studentCookie.value.id,
    real_name: studentCookie.value.real_name || studentCookie.value.name,
    class_name: studentCookie.value.class,
    unit_played: '不規則動詞全區',
    game_type: '動詞變化大師',
    score: score.value,
    time_taken_seconds: 0,
    is_anon: studentCookie.value.isAnon || false
  }]);
  
  if (!studentCookie.value.isAnon) {
    const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
    if (data) await supabase.from('students').update({ points: data.points + score.value }).eq('id', studentCookie.value.id);
  }
};

const playAgain = () => { window.location.reload(); };

onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="game-container">
    <div class="header">
      <div class="stats-board">💯 總分: {{ score }}</div>
      <div v-if="gameState === 'playing'" class="progress">第 {{ currentIndex + 1 }} / 10 題</div>
    </div>

    <div v-if="gameState === 'playing'" class="play-area">
      <!-- 🌟 計時器 -->
      <div class="timer-box retro-element" :class="{ 'over-time': timeSpent > timeLimit }">
        ⏱️ 耗時: {{ timeSpent }}s / {{ timeLimit }}s
        <div v-if="timeSpent > timeLimit" class="penalty-text">⚠️ 超時扣分: -{{ ((timeSpent - timeLimit) * timePenalty).toFixed(1) }}</div>
      </div>

      <div class="question-box retro-element">
        <div class="base-verb">
          {{ currentVerb.base_form }}
          <button class="sound-btn" @click="playPronunciation(currentVerb.base_form)">🔊</button>
        </div>
        <div class="chinese-meaning">{{ currentVerb.chinese }}</div>
      </div>

      <div class="inputs-container">
        <div class="input-group retro-element" :class="{ active: activeField === 'past', locked: isPastLocked }" @click="switchField('past')">
          <label>過去式 (Past) 
            <span v-if="isPastLocked" class="lock-icon">✅ 鎖定 (5分)</span>
            <button v-else class="hint-sound" @click.stop="playPronunciation(currentVerb.past_tense)">🔊 提示</button>
          </label>
          <div class="typed-text">{{ pastInput }}<span v-if="activeField === 'past' && !isChecking && !isPastLocked" class="cursor">_</span></div>
        </div>
        
        <div class="input-group retro-element" :class="{ active: activeField === 'pp', locked: isPpLocked }" @click="switchField('pp')">
          <label>過去分詞 (P.P.) 
            <span v-if="isPpLocked" class="lock-icon">✅ 鎖定 (5分)</span>
            <button v-else class="hint-sound" @click.stop="playPronunciation(currentVerb.past_participle)">🔊 提示</button>
          </label>
          <div class="typed-text">{{ ppInput }}<span v-if="activeField === 'pp' && !isChecking && !isPpLocked" class="cursor">_</span></div>
        </div>
      </div>

      <div class="keyboard-wrapper" :style="{ '--spin-speed': keyboardSpeed + 's' }">
        <div class="spinning-keyboard retro-element">
          <div v-for="(row, rIdx) in keys" :key="rIdx" class="key-row">
            <button v-for="key in row" :key="key" class="key-btn" @click="typeLetter(key)" :disabled="isChecking">
              <span class="upright-text">{{ key }}</span>
            </button>
          </div>
          <div class="key-row">
            <button class="key-btn action-btn skip-btn" @click="skipQuestion" :disabled="isChecking">
              <span class="upright-text">放棄</span>
            </button>
            <button class="key-btn action-btn del-btn" @click="deleteLetter" :disabled="isChecking">
              <span class="upright-text">DEL</span>
            </button>
            <button class="key-btn action-btn submit-btn" @click="submitAnswer" :disabled="isChecking">
              <span class="upright-text">✅ 送出</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 結束畫面 -->
    <div v-else-if="gameState === 'end'" class="end-screen retro-element">
      <h1>🌀 測驗結束！</h1>
      <div class="final-score">{{ Math.floor(score) }} <span>分</span></div>
      <div class="actions">
        <button class="retro-btn play-again" @click="playAgain">🔄 再玩一次</button>
        <NuxtLink to="/" class="retro-btn home-btn">🏠 回到首頁</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container { max-width: 600px; margin: 20px auto; padding: 15px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;}
.stats-board { background: #ff9800; color: white; padding: 8px 15px; border-radius: 20px; font-size: 1.1rem; font-weight: bold; border: 2px solid #e65100;}
.progress { font-size: 1.1rem; font-weight: bold; color: #333;}

.timer-box { background: #fff; border: 2px solid #ccc; padding: 10px; border-radius: 12px; text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; color: #2c3e50; transition: 0.3s;}
.timer-box.over-time { border-color: #e74c3c; background: #fadbd8; color: #c0392b; animation: pulse 1s infinite;}
.penalty-text { font-size: 0.9rem; color: #c0392b; margin-top: 5px;}

.question-box { background: #e3f2fd; border-color: #1976d2; text-align: center; padding: 20px; border-radius: 16px; margin-bottom: 15px;}
.base-verb { font-size: 3rem; font-weight: 900; color: #0d47a1; display: flex; align-items: center; justify-content: center; gap: 15px;}
.chinese-meaning { font-size: 1.3rem; color: #555; margin-top: 5px; font-weight: bold;}
.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 45px; height: 45px; font-size: 1.3rem; cursor: pointer;}

.inputs-container { display: flex; gap: 10px; margin-bottom: 20px;}
.input-group { flex: 1; background: #f5f5f5; padding: 12px; border-radius: 12px; cursor: pointer; border: 3px solid #ccc; transition: 0.2s;}
.input-group.active { border-color: #4caf50; background: #e8f5e9; transform: translateY(-3px); box-shadow: 0 4px 10px rgba(76,175,80,0.3);}
.input-group.locked { border-color: #27ae60; background: #eaeded; opacity: 0.8; transform: none; box-shadow: none; cursor: default; }
.lock-icon { color: #27ae60; font-weight: bold; }
.input-group label { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #666; font-weight: bold; margin-bottom: 5px;}
.hint-sound { background: #e0e0e0; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;}
.typed-text { font-size: 1.4rem; font-weight: bold; color: #333; min-height: 35px; letter-spacing: 1px;}
.cursor { animation: blink 1s infinite; color: #4caf50;}
@keyframes blink { 50% { opacity: 0; } }

.keyboard-wrapper { position: relative; width: 100%; max-width: 450px; aspect-ratio: 1 / 1; margin: 0 auto; overflow: hidden; display: flex; justify-content: center; align-items: center;}
.spinning-keyboard { width: 95%; background: #2c3e50; padding: 12px; border-radius: 16px; border: 4px solid #1a252f; animation: spin var(--spin-speed) linear infinite; box-sizing: border-box;}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.key-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 6px;}
.key-btn { flex: 1; height: 45px; font-size: 1.2rem; font-weight: bold; background: #ecf0f1; border: 2px solid #bdc3c7; border-radius: 8px; color: #2c3e50; cursor: pointer; display: flex; justify-content: center; align-items: center; padding: 0;}
.key-btn:active:not(:disabled) { background: #bdc3c7; transform: scale(0.95);}

.action-btn { flex: unset; padding: 0 10px; font-size: 0.9rem;}
.skip-btn { background: #f39c12; color: white; border-color: #e67e22;}
.del-btn { background: #e74c3c; color: white; border-color: #c0392b;}
.submit-btn { background: #27ae60; color: white; border-color: #2ecc71;}

.upright-text { display: inline-block; animation: counter-spin var(--spin-speed) linear infinite;}
@keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

.end-screen { text-align: center; padding: 40px; background: white; border-radius: 20px; border: 3px solid #ff9800;}
.final-score { font-size: 5rem; font-weight: 900; color: #ff9800; margin: 15px 0;}
.final-score span { font-size: 1.5rem; color: #777;}
.actions { display: flex; flex-direction: column; gap: 10px;}
.retro-btn { padding: 12px; font-size: 1.1rem; font-weight: bold; border-radius: 12px; border: 2px solid #333; cursor: pointer; text-decoration: none; display: block;}
.play-again { background: #4caf50; color: white;}
.home-btn { background: #eee; color: #333;}
</style>
