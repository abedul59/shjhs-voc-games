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

const currentOptions = ref([]);

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

// 🌟 內建 Web Audio API 音效
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

  allFetchedVerbs.value = verbs;
  gameState.value = 'setup'; // 進入選擇模式畫面
});

// 🌟 啟動選擇的模式
const startGame = (mode) => {
  gameMode.value = mode;
  if (mode === 'mode1') {
    currentQuestionCount.value = 10;
    gameVerbs.value = [...allFetchedVerbs.value].sort(() => Math.random() - 0.5).slice(0, 10);
  } else {
    currentQuestionCount.value = 8;
    gameVerbs.value = [...allFetchedVerbs.value].sort(() => Math.random() - 0.5).slice(0, 8);
  }
  currentIndex.value = 0;
  score.value = 0;
  gameState.value = 'playing';
  startQuestion();
};

const currentVerb = computed(() => gameVerbs.value[currentIndex.value] || {});

// 🌟 智能編造相似錯誤拼字 (選擇題干擾選項)
const generateDistractors = (verbObj) => {
  const base = verbObj.base.toLowerCase();
  const past = verbObj.past_tense.split('/')[0].trim().toLowerCase();
  const pp = verbObj.past_participle.split('/')[0].trim().toLowerCase();
  
  const correctStr = `${past} / ${pp}`;
  const set = new Set();
  
  // 1. 錯誤規則化 (-ed)
  let d1 = base.endsWith('e') ? base + 'd' : (base.endsWith('y') ? base.slice(0,-1)+'ied' : base + 'ed');
  set.add(`${d1} / ${d1}`);
  
  // 2. 母音亂數替換
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
  
  // 3. 過去式與分詞錯置
  if (past !== pp) set.add(`${pp} / ${past}`);
  else set.add(`${past} / ${base}en`);
  
  // 4. Base 字根硬加後綴
  set.add(`${base}t / ${base}t`);
  set.add(`${base}en / ${base}en`);

  let arr = Array.from(set).filter(x => x !== correctStr);
  arr.sort(() => Math.random() - 0.5);
  
  let options = [
      { text: correctStr, isCorrect: true, disabled: false },
      { text: arr[0], isCorrect: false, disabled: false },
      { text: arr[1], isCorrect: false, disabled: false },
      { text: arr[2] || `${base}s / ${base}ing`, isCorrect: false, disabled: false }
  ];
  return options.sort(() => Math.random() - 0.5);
};

const startQuestion = () => {
  pastInput.value = '';
  ppInput.value = '';
  isPastLocked.value = false;
  isPpLocked.value = false;
  activeField.value = 'past';
  isChecking.value = false;
  currentWrongCount.value = 0;
  timeSpent.value = 0;
  
  if (gameMode.value === 'mode2') {
      currentOptions.value = generateDistractors(currentVerb.value);
  }

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

// 🌟 Mode 1 結算邏輯
const finalizeQuestion = () => {
  clearInterval(timer);
  isChecking.value = true;
  
  let basePoints = (isPastLocked.value ? 5 : 0) + (isPpLocked.value ? 5 : 0);
  let overtime = Math.max(0, timeSpent.value - timeLimit.value);
  let penaltyScore = (currentWrongCount.value * wrongPenalty.value) + (overtime * timePenalty.value);
  let earned = Math.max(0, basePoints - penaltyScore);
  
  score.value += earned;

  setTimeout(() => {
    if (currentIndex.value < currentQuestionCount.value - 1) {
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

  if (isPastLocked.value && isPpLocked.value) {
    new Audio('/sounds/correct.mp3').play();
    finalizeQuestion();
  }
};

// 🌟 Mode 2 選擇邏輯
const selectOption = (opt) => {
    if (isChecking.value || opt.disabled) return;
    playClickSound();

    if (opt.isCorrect) {
        new Audio('/sounds/correct.mp3').play();
        isChecking.value = true;
        
        let basePoints = 10;
        let overtime = Math.max(0, timeSpent.value - timeLimit.value);
        let penaltyScore = (currentWrongCount.value * wrongPenalty.value) + (overtime * timePenalty.value);
        let earned = Math.max(0, basePoints - penaltyScore);
        
        score.value += earned;

        setTimeout(() => {
            if (currentIndex.value < currentQuestionCount.value - 1) {
                currentIndex.value++;
                startQuestion();
            } else {
                endGame();
            }
        }, 1500);
    } else {
        new Audio('/sounds/wrong.mp3').play();
        currentWrongCount.value++;
        opt.disabled = true;
    }
};

const skipQuestion = () => {
  if (isChecking.value) return;
  playClickSound();
  
  if (gameMode.value === 'mode1') {
      pastInput.value = currentVerb.value.past_tense.split('/')[0];
      ppInput.value = currentVerb.value.past_participle.split('/')[0];
      finalizeQuestion();
  } else {
      const correctOpt = currentOptions.value.find(o => o.isCorrect);
      if (correctOpt) {
          currentOptions.value.forEach(o => {
              if(!o.isCorrect) o.disabled = true;
          });
      }
      isChecking.value = true;
      setTimeout(() => {
          if (currentIndex.value < currentQuestionCount.value - 1) {
              currentIndex.value++;
              startQuestion();
          } else {
              endGame();
          }
      }, 1500);
  }
  new Audio('/sounds/wrong.mp3').play();
};

const endGame = async () => {
  gameState.value = 'end';
  clearInterval(timer);
  confetti({ particleCount: 150, spread: 80 });

  const { error } = await supabase.from('game_records').insert([{
    student_id: studentCookie.value.id,
    unit_played: '動詞變化總表',
    game_type: '動詞變化大師',
    score: Math.floor(score.value),
    time_taken_seconds: timeSpent.value || 0
  }]);
  
  if (error) console.error("寫入成績失敗", error);

  if (!studentCookie.value.isAnon) {
    const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
    if (data) await supabase.from('students').update({ points: data.points + Math.floor(score.value) }).eq('id', studentCookie.value.id);
  }
};

const playAgain = () => { window.location.reload(); };

onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="game-container">
    
    <div v-if="gameState === 'loading'" class="loading-screen retro-element">
       <h2>載入中...</h2>
    </div>

    <!-- 🌟 模式選擇畫面 -->
    <div v-else-if="gameState === 'setup'" class="setup-screen retro-element">
      <h1 style="color: #0d47a1; margin-top: 0; font-size: 2.2rem;">🌀 動詞變化大師</h1>
      <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 20px; color: #555;">請選擇您的挑戰模式：</p>
      
      <div class="mode-cards">
        <button class="retro-btn mode-btn mode1-btn" @click="startGame('mode1')">
          <h3>⌨️ 鍵盤拼字挑戰</h3>
          <p>滿分 100 分 (10 題)<br>依序填入正確的字母！</p>
        </button>
        <button class="retro-btn mode-btn mode2-btn" @click="startGame('mode2')">
          <h3>🎯 旋轉選擇挑戰</h3>
          <p>滿分 80 分 (8 題)<br>從旋轉選項中找出正確組合！</p>
        </button>
      </div>

      <div style="margin-top: 30px;">
        <NuxtLink to="/" class="retro-btn home-btn" style="display:inline-block; padding: 12px 30px;">🏠 回到首頁</NuxtLink>
      </div>
    </div>

    <div v-else-if="gameState === 'playing' || gameState === 'end'">
      <div class="header" v-if="gameState !== 'setup'">
        <div class="stats-board">💯 總分: {{ score }} / {{ gameMode === 'mode1' ? 100 : 80 }}</div>
        <div v-if="gameState === 'playing'" class="progress">第 {{ currentIndex + 1 }} / {{ currentQuestionCount }} 題</div>
      </div>

      <div v-if="gameState === 'playing'" class="play-area">
        <!-- 🌟 計時器 -->
        <div class="timer-box retro-element" :class="{'over-time': timeSpent > timeLimit}">
          ⏱️ 耗時：{{ timeSpent }} 秒 
          <span v-if="timeSpent > timeLimit" class="penalty-text">(超時扣分中)</span>
        </div>

        <!-- 🌟 單字區 -->
        <div class="question-box retro-element">
          <div class="base-verb">
            {{ currentVerb.base }}
            <button class="sound-btn" @click="playPronunciation(currentVerb.base)">🔊</button>
          </div>
          <div class="chinese-meaning">{{ currentVerb.zh_tw }}</div>
        </div>

        <!-- Mode 1: 兩個輸入框 -->
        <div v-if="gameMode === 'mode1'" class="inputs-container">
          <div class="input-group" :class="{ active: activeField === 'past' && !isPastLocked, locked: isPastLocked }" @click="switchField('past')">
            <label>過去式 (Past) <span v-if="isPastLocked" class="lock-icon">🔒 已鎖定</span></label>
            <div class="typed-text"><span v-if="activeField === 'past' && !isPastLocked" class="cursor">|</span> {{ pastInput }}</div>
          </div>
          <div class="input-group" :class="{ active: activeField === 'pp' && !isPpLocked, locked: isPpLocked }" @click="switchField('pp')">
            <label>過去分詞 (P.P.) <span v-if="isPpLocked" class="lock-icon">🔒 已鎖定</span></label>
            <div class="typed-text"><span v-if="activeField === 'pp' && !isPpLocked" class="cursor">|</span> {{ ppInput }}</div>
          </div>
        </div>

        <!-- Mode 1: 旋轉鍵盤 -->
        <div v-if="gameMode === 'mode1'" class="keyboard-wrapper">
          <div class="spinning-keyboard" :style="{'--spin-speed': keyboardSpeed + 's'}">
            <div class="key-row" v-for="(row, rIdx) in keys" :key="rIdx">
              <button v-for="key in row" :key="key" class="key-btn" @click="typeLetter(key)" :disabled="isChecking">
                <span class="upright-text">{{ key }}</span>
              </button>
            </div>
            <div class="key-row" style="margin-top: 10px;">
              <button class="key-btn action-btn skip-btn" @click="skipQuestion" :disabled="isChecking">
                <span class="upright-text">⏭️ 放棄</span>
              </button>
              <button class="key-btn action-btn del-btn" @click="deleteLetter" :disabled="isChecking">
                <span class="upright-text">⌫ 刪除</span>
              </button>
              <button class="key-btn action-btn submit-btn" @click="submitAnswer" :disabled="isChecking">
                <span class="upright-text">✅ 送出</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Mode 2: 旋轉選擇題 -->
        <div v-if="gameMode === 'mode2'" class="keyboard-wrapper mode2-wrapper">
          <div class="spinning-keyboard mode2-options" :style="{'--spin-speed': keyboardSpeed + 's'}">
            <button v-for="(opt, idx) in currentOptions" :key="idx"
                    class="key-btn option-btn"
                    :class="{'wrong-opt': opt.disabled, 'correct-opt': opt.isCorrect && isChecking}"
                    @click="selectOption(opt)"
                    :disabled="opt.disabled || isChecking">
              <span class="upright-text" style="display:flex; flex-direction: column; gap: 5px;">
                 <span style="color:#e67e22; font-size:1.4rem; font-weight:900;">{{ ['A','B','C','D'][idx] }}</span>
                 <span style="font-size:1.1rem; white-space:nowrap; font-weight:bold;">{{ opt.text }}</span>
              </span>
            </button>
          </div>
        </div>

        <div v-if="gameMode === 'mode2'" style="text-align: center; margin-top: 20px;">
          <button class="retro-btn skip-btn-outer" @click="skipQuestion" :disabled="isChecking">
            ⏭️ 不會拼，放棄本題 (看答案)
          </button>
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
.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 45px; height: 45px; font-size: 1.3rem; cursor: pointer;}

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

/* Mode 2 專屬樣式 */
.mode2-options { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 15px; padding: 20px; aspect-ratio: 1 / 1; }
.mode2-options .option-btn { height: auto; min-height: 80px; flex-direction: column; }
.mode2-options .option-btn.wrong-opt { opacity: 0.3; filter: grayscale(100%); transform: scale(0.9); }
.mode2-options .option-btn.correct-opt { background: #4caf50 !important; color: white; border-color: #2e7d32 !important; transform: scale(1.05); }

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
