<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import confetti from 'canvas-confetti';

const supabase = useSupabaseClient();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const allFetchedVerbs = ref([]);
const gameVerbs = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const gameState = ref('loading'); // loading, setup, playing, end
const gameMode = ref('mode1'); // mode1: 鍵盤輸入, mode2: 選擇題
const currentQuestionCount = ref(10);

const keyboardSpeed = ref(20); 
const wrongPenalty = ref(3);
const timeLimit = ref(20);
const timePenalty = ref(0.5);

const pastInput = ref('');
const ppInput = ref('');
const activeField = ref('past'); 
const isChecking = ref(false);

const isPastLocked = ref(false);
const isPpLocked = ref(false);
const currentWrongCount = ref(0);
const timeSpent = ref(0);
let timer = null;

const currentOptions = ref([]);

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

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
    alert('題庫不規則動詞不足 10 個！');
    router.push('/');
    return;
  }

  allFetchedVerbs.value = verbs;
  gameState.value = 'setup';
});

const startGame = (mode) => {
  gameMode.value = mode;
  gameVerbs.value = [...allFetchedVerbs.value].sort(() => Math.random() - 0.5).slice(0, mode === 'mode1' ? 10 : 8);
  currentQuestionCount.value = mode === 'mode1' ? 10 : 8;
  currentIndex.value = 0;
  score.value = 0;
  gameState.value = 'playing';
  startQuestion();
};

const currentVerb = computed(() => gameVerbs.value[currentIndex.value] || {});

const generateDistractors = (verbObj) => {
  if (!verbObj) return [];
  // 🌟 使用多重屬性防護抓取資料
  const base = String(verbObj.verb || verbObj.base || verbObj.en_us || 'word').toLowerCase().trim();
  const past = String(verbObj.past_tense || base + 'ed').split('/')[0].trim().toLowerCase();
  const pp = String(verbObj.past_participle || base + 'ed').split('/')[0].trim().toLowerCase();
  
  const correctStr = `${past} / ${pp}`;
  const set = new Set();
  
  let d1 = base.endsWith('e') ? base + 'd' : (base.endsWith('y') ? base.slice(0,-1)+'ied' : base + 'ed');
  set.add(`${d1} / ${d1}`);
  
  const vowels = ['a','e','i','o','u'];
  let vReplaced = past;
  for (let i = 0; i < past.length; i++) {
      if (vowels.includes(past[i])) {
          vReplaced = past.substring(0, i) + vowels[(vowels.indexOf(past[i]) + 1) % 5] + past.substring(i+1);
          break;
      }
  }
  if (vReplaced === past) vReplaced += 't';
  set.add(`${vReplaced} / ${pp}`);
  
  if (past !== pp) set.add(`${pp} / ${past}`);
  else set.add(`${past} / ${base}en`);
  
  let arr = Array.from(set).filter(x => x !== correctStr);
  arr.sort(() => Math.random() - 0.5);
  
  let options = [
      { text: correctStr, isCorrect: true, disabled: false },
      { text: arr[0] || `${base}s / ${base}es`, isCorrect: false, disabled: false },
      { text: arr[1] || `${base}ing / ${base}ing`, isCorrect: false, disabled: false },
      { text: arr[2] || `${base}ed / ${base}en`, isCorrect: false, disabled: false }
  ];
  return options.sort(() => Math.random() - 0.5);
};

const startQuestion = () => {
  pastInput.value = ''; ppInput.value = ''; isPastLocked.value = false; isPpLocked.value = false;
  activeField.value = 'past'; isChecking.value = false; currentWrongCount.value = 0; timeSpent.value = 0;
  if (gameMode.value === 'mode2') currentOptions.value = generateDistractors(currentVerb.value);
  clearInterval(timer);
  timer = setInterval(() => { timeSpent.value++; }, 1000);
};

const playPronunciation = (word) => {
  if (!word) return;
  const cleanWord = String(word).split('/')[0].toLowerCase().replace(/[^a-z]/g, '').trim(); 
  if (!cleanWord) return;
  const audio = new Audio(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${cleanWord}--_us_1.mp3`);
  audio.play().catch(() => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = 'en-US'; window.speechSynthesis.speak(utterance);
    }
  });
};

const finalizeQuestion = () => {
  clearInterval(timer); isChecking.value = true;
  let basePoints = (isPastLocked.value ? 5 : 0) + (isPpLocked.value ? 5 : 0);
  let earned = Math.max(0, basePoints - ((currentWrongCount.value * wrongPenalty.value) + (Math.max(0, timeSpent.value - timeLimit.value) * timePenalty.value)));
  score.value += earned;
  setTimeout(() => {
    if (currentIndex.value < currentQuestionCount.value - 1) { currentIndex.value++; startQuestion(); }
    else { endGame(); }
  }, 1500);
};

const submitAnswer = () => {
  if (isChecking.value) return; playClickSound();
  const validPast = String(currentVerb.value.past_tense || '').toLowerCase().split('/').map(s => s.trim());
  const validPp = String(currentVerb.value.past_participle || '').toLowerCase().split('/').map(s => s.trim());
  let currentSubmitCorrect = true;
  if (!isPastLocked.value) { if (validPast.includes(pastInput.value.trim())) isPastLocked.value = true; else { currentSubmitCorrect = false; pastInput.value = ''; } }
  if (!isPpLocked.value) { if (validPp.includes(ppInput.value.trim())) isPpLocked.value = true; else { currentSubmitCorrect = false; ppInput.value = ''; } }
  if (!currentSubmitCorrect) { currentWrongCount.value++; new Audio('/sounds/wrong.mp3').play(); return; }
  if (isPastLocked.value && isPpLocked.value) { new Audio('/sounds/correct.mp3').play(); finalizeQuestion(); }
};

const selectOption = (opt) => {
    if (isChecking.value || opt.disabled) return; playClickSound();
    if (opt.isCorrect) {
        new Audio('/sounds/correct.mp3').play(); isChecking.value = true;
        score.value += Math.max(0, 10 - ((currentWrongCount.value * wrongPenalty.value) + (Math.max(0, timeSpent.value - timeLimit.value) * timePenalty.value)));
        setTimeout(() => {
            if (currentIndex.value < currentQuestionCount.value - 1) { currentIndex.value++; startQuestion(); }
            else { endGame(); }
        }, 1500);
    } else { new Audio('/sounds/wrong.mp3').play(); currentWrongCount.value++; opt.disabled = true; }
};

const skipQuestion = () => {
  if (isChecking.value) return; playClickSound();
  if (gameMode.value === 'mode1') { pastInput.value = String(currentVerb.value.past_tense || '').split('/')[0]; ppInput.value = String(currentVerb.value.past_participle || '').split('/')[0]; finalizeQuestion(); }
  else { currentOptions.value.forEach(o => { if(!o.isCorrect) o.disabled = true; }); isChecking.value = true; setTimeout(() => { currentIndex.value++; startQuestion(); }, 1500); }
  new Audio('/sounds/wrong.mp3').play();
};

const endGame = async () => {
  gameState.value = 'end'; clearInterval(timer); confetti({ particleCount: 150, spread: 80 });
  await supabase.from('game_records').insert([{
    student_id: studentCookie.value.id, unit_played: '動詞變化總表', game_type: '動詞變化大師', score: Math.floor(score.value), time_taken_seconds: timeSpent.value || 0
  }]);
};

const playAgain = () => { window.location.reload(); };
onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="game-container">
    <div v-if="gameState === 'setup'" class="setup-screen retro-element">
      <h1 style="color: #0d47a1;">🌀 動詞變化大師</h1>
      <div class="mode-cards">
        <button class="retro-btn mode-btn" @click="startGame('mode1')"><h3>⌨️ 鍵盤拼字</h3></button>
        <button class="retro-btn mode-btn" @click="startGame('mode2')"><h3>🎯 旋轉選擇</h3></button>
      </div>
    </div>

    <div v-else-if="gameState === 'playing' || gameState === 'end'" class="play-area">
      <div class="header">
        <div class="stats-board">💯 分數: {{ score }}</div>
        <div class="progress">第 {{ currentIndex + 1 }} / {{ currentQuestionCount }} 題</div>
      </div>

      <div class="question-box retro-element">
        <div class="base-verb">
           {{ currentVerb.verb || currentVerb.base || currentVerb.en_us || 'Loading...' }}
           <button class="sound-btn" @click="playPronunciation(currentVerb.verb || currentVerb.base || currentVerb.en_us)">🔊</button>
        </div>
        <div class="chinese-meaning">{{ currentVerb.zh_tw || '...' }}</div>
      </div>

      <div v-if="gameMode === 'mode1'" class="inputs-container">
        <div class="input-group" :class="{ active: activeField === 'past', locked: isPastLocked }" @click="switchField('past')">
          <label>過去式 (Past) <button class="sound-btn-small" @click.stop="playPronunciation(currentVerb.past_tense)">🔊</button></label>
          <div class="typed-text">{{ pastInput }}</div>
        </div>
        <div class="input-group" :class="{ active: activeField === 'pp', locked: isPpLocked }" @click="switchField('pp')">
          <label>過去分詞 (P.P.) <button class="sound-btn-small" @click.stop="playPronunciation(currentVerb.past_participle)">🔊</button></label>
          <div class="typed-text">{{ ppInput }}</div>
        </div>
      </div>

      <div v-if="gameMode === 'mode2'" class="mode2-options">
          <button v-for="(opt, idx) in currentOptions" :key="idx" class="opt-btn" 
                  :class="{'wrong-opt': opt.disabled, 'correct-opt': opt.isCorrect && isChecking}" 
                  @click="selectOption(opt)" :disabled="isChecking">
             <span class="mode2-text">
                <span class="opt-label">({{ ['A','B','C','D'][idx] }})</span>
                <span class="opt-value">{{ opt.text }}</span>
             </span>
          </button>
      </div>

      </div>
  </div>
</template>

<style scoped>
.game-container { max-width: 600px; margin: 20px auto; padding: 15px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;}
.stats-board { background: #ff9800; color: white; padding: 8px 15px; border-radius: 20px; font-size: 1.1rem; font-weight: bold; border: 2px solid #e65100;}
.progress { font-size: 1.1rem; font-weight: bold; color: #333;}

.setup-screen { text-align: center; padding: 40px 20px; background: #fff; border-radius: 20px; border: 3px solid #0d47a1; }
.mode-cards { display: flex; gap: 20px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
.mode-btn { flex: 1; min-width: 200px; padding: 25px 15px; text-align: center; border-radius: 16px; transition: 0.2s; background: #fff; border: 3px solid #ccc; cursor: pointer; display: flex; flex-direction: column; justify-content: center; align-items: center;}
.mode-btn h3 { margin: 0 0 10px 0; font-size: 1.4rem; color: #0d47a1; }
.mode-btn p { margin: 0; line-height: 1.5; color: #555; font-size: 0.95rem; font-weight: bold; }
.mode1-btn:hover { background: #e3f2fd; border-color: #1976d2; transform: translateY(-5px); box-shadow: 0 5px 15px rgba(25,118,210,0.2); }
.mode2-btn:hover { background: #fce4ec; border-color: #c2185b; transform: translateY(-5px); box-shadow: 0 5px 15px rgba(194,24,91,0.2); }
.mode2-btn h3 { color: #880e4f; }

.timer-box { background: #fff; border: 2px solid #ccc; padding: 10px; border-radius: 12px; text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; color: #2c3e50; transition: 0.3s;}
.timer-box.over-time { border-color: #e74c3c; background: #fadbd8; color: #c0392b; animation: pulse 1s infinite;}
.penalty-text { font-size: 0.9rem; color: #c0392b; margin-top: 5px;}

.question-box { background: #e3f2fd; border-color: #1976d2; text-align: center; padding: 20px; border-radius: 16px; margin-bottom: 15px;}
.base-verb { font-size: 3rem; font-weight: 900; color: #0d47a1; display: flex; align-items: center; justify-content: center; gap: 15px;}
.chinese-meaning { font-size: 1.3rem; color: #555; margin-top: 5px; font-weight: bold;}

/* 🌟 音效按鈕設計 */
.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 45px; height: 45px; font-size: 1.3rem; cursor: pointer; display: flex; justify-content: center; align-items: center;}
.sound-btn-small { background: #fff; border: 1px solid #1976d2; border-radius: 50%; width: 28px; height: 28px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.1s;}
.sound-btn-small:active { transform: scale(0.9); }

.inputs-container { display: flex; gap: 10px; margin-bottom: 20px;}
.input-group { flex: 1; background: #f5f5f5; padding: 12px; border-radius: 12px; cursor: pointer; border: 3px solid #ccc; transition: 0.2s;}
.input-group.active { border-color: #4caf50; background: #e8f5e9; transform: translateY(-3px); box-shadow: 0 4px 10px rgba(76,175,80,0.3);}
.input-group.locked { border-color: #27ae60; background: #eaeded; opacity: 0.8; transform: none; box-shadow: none; cursor: default; }
.lock-icon { color: #27ae60; font-weight: bold; }
.input-group label { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #666; font-weight: bold; margin-bottom: 5px;}
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

/* 🌟 Mode 2 專屬樣式 (改為清晰的垂直排列) */
.mode2-options { display: flex; flex-direction: column; gap: 12px; padding: 25px; aspect-ratio: 1 / 1; justify-content: center; }
.mode2-options .option-btn { height: auto; min-height: 60px; width: 100%; display: flex; align-items: center; justify-content: center; }
.mode2-options .option-btn.wrong-opt { opacity: 0.3; filter: grayscale(100%); transform: scale(0.9); }
.mode2-options .option-btn.correct-opt { background: #4caf50 !important; color: white; border-color: #2e7d32 !important; transform: scale(1.05); }

.mode2-text { display: flex; flex-direction: row; gap: 12px; align-items: center; justify-content: center; width: 100%; }
.opt-label { color:#e67e22; font-size:1.4rem; font-weight:900; }
.opt-value { font-size:1.2rem; font-weight:bold; }

.skip-btn-outer { background: #f39c12; color: white; border-color: #e67e22; padding: 12px 25px; border-radius: 12px; font-weight: bold; font-size: 1rem; border-width: 3px; cursor: pointer; box-shadow: 0 4px 0 #d68910;}
.skip-btn-outer:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }

.upright-text { display: inline-block; animation: counter-spin var(--spin-speed) linear infinite;}
@keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

.end-screen { text-align: center; padding: 40px; background: white; border-radius: 20px; border: 3px solid #ff9800;}
.final-score { font-size: 5rem; font-weight: 900; color: #ff9800; margin: 15px 0;}
.final-score span { font-size: 1.5rem; color: #777;}
.actions { display: flex; flex-direction: column; gap: 10px;}
.retro-btn { padding: 12px; font-size: 1.1rem; font-weight: bold; border-radius: 12px; border: 2px solid #333; cursor: pointer; text-decoration: none; display: block;}
.play-again { background: #4caf50; color: white; box-shadow: 0 4px 0 #2e7d32;}
.play-again:active { box-shadow: none; transform: translateY(4px); }
.home-btn { background: #eee; color: #333; box-shadow: 0 4px 0 #ccc;}
.home-btn:active { box-shadow: none; transform: translateY(4px); }
</style>
