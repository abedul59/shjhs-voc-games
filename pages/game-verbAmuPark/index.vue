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
const gameState = ref('loading'); // loading, playing, end
const currentQuestionCount = ref(10);

const pastInput = ref('');
const ppInput = ref('');
const activeField = ref('past'); 
const isChecking = ref(false);
const isPreparing = ref(false);

const isPastLocked = ref(false);
const isPpLocked = ref(false);
const currentWrongCount = ref(0);

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

// 🌟 音效系統
let audioCtx = null;
let currentSequenceId = 0;

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

const playPronunciationAsync = (word, seqId = null) => {
  return new Promise((resolve) => {
    if (seqId && currentSequenceId !== seqId) return resolve();
    if (!word) return resolve();
    const cleanWord = String(word).split('/')[0].toLowerCase().replace(/[^a-z]/g, '').trim(); 
    if (!cleanWord) return resolve();

    const audio = new Audio(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${cleanWord}--_us_1.mp3`);
    const fallback = () => {
      if (seqId && currentSequenceId !== seqId) return resolve();
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(cleanWord);
        utterance.lang = 'en-US';
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      } else resolve();
    };
    audio.onended = resolve;
    audio.onerror = fallback;
    audio.play().catch(fallback);
  });
};

const playPronunciation = (word) => {
  currentSequenceId = Date.now(); 
  playPronunciationAsync(word);
};

onMounted(async () => {
  if (!studentCookie.value) { router.push('/'); return; }

  const { data: verbs } = await supabase.from('irregular_verbs').select('*');
  if (!verbs || verbs.length < 10) {
    alert('題庫資料不足，無法開始遊戲！');
    router.push('/');
    return;
  }

  gameVerbs.value = verbs.sort(() => Math.random() - 0.5).slice(0, currentQuestionCount.value);
  gameState.value = 'playing';
  startQuestion();
});

const currentVerb = computed(() => gameVerbs.value[currentIndex.value] || {});

const startQuestion = async () => {
  pastInput.value = ''; ppInput.value = ''; isPastLocked.value = false; isPpLocked.value = false;
  activeField.value = 'past'; isChecking.value = true; isPreparing.value = true; currentWrongCount.value = 0;

  currentSequenceId = Date.now();
  const seqId = currentSequenceId;
  
  for (let i = 0; i < 2; i++) {
      if (currentSequenceId !== seqId) break;
      await playPronunciationAsync(currentVerb.value.base_form, seqId);
      if (currentSequenceId !== seqId) break;
      await new Promise(r => setTimeout(r, 400));
      
      if (currentSequenceId !== seqId) break;
      await playPronunciationAsync(currentVerb.value.past_tense, seqId);
      if (currentSequenceId !== seqId) break;
      await new Promise(r => setTimeout(r, 400));
      
      if (currentSequenceId !== seqId) break;
      await playPronunciationAsync(currentVerb.value.past_participle, seqId);
      if (currentSequenceId !== seqId) break;
      await new Promise(r => setTimeout(r, 800)); 
  }

  if (gameState.value === 'playing') {
      isPreparing.value = false;
      isChecking.value = false;
  }
};

const typeLetter = (char) => {
  if (isChecking.value || isPreparing.value) return; 
  playClickSound();
  if (activeField.value === 'past' && !isPastLocked.value) pastInput.value += char.toLowerCase();
  else if (activeField.value === 'pp' && !isPpLocked.value) ppInput.value += char.toLowerCase();
};

const deleteLetter = () => {
  if (isChecking.value || isPreparing.value) return; 
  playClickSound();
  if (activeField.value === 'past' && !isPastLocked.value) pastInput.value = pastInput.value.slice(0, -1);
  else if (activeField.value === 'pp' && !isPpLocked.value) ppInput.value = ppInput.value.slice(0, -1);
};

const switchField = (field) => {
  if ((field === 'past' && isPastLocked.value) || (field === 'pp' && isPpLocked.value)) return;
  activeField.value = field;
};

// 🌟 記錄精熟度至資料庫
const recordMastery = async (isCorrect) => {
  const baseForm = currentVerb.value.base_form;
  const sId = studentCookie.value.id;

  const { data } = await supabase.from('verb_mastery')
    .select('*').eq('student_id', sId).eq('base_form', baseForm).single();

  if (data) {
    await supabase.from('verb_mastery').update({
      correct_count: isCorrect ? data.correct_count + 1 : data.correct_count,
      wrong_count: !isCorrect ? data.wrong_count + 1 : data.wrong_count,
      updated_at: new Date()
    }).eq('id', data.id);
  } else {
    await supabase.from('verb_mastery').insert([{
      student_id: sId,
      base_form: baseForm,
      correct_count: isCorrect ? 1 : 0,
      wrong_count: !isCorrect ? 1 : 0
    }]);
  }
};

const finalizeQuestion = () => {
  isChecking.value = true;
  currentSequenceId = Date.now(); 
  
  // 計算分數：一格 5 分，錯一次扣 3 分，無時間限制
  let basePoints = (isPastLocked.value ? 5 : 0) + (isPpLocked.value ? 5 : 0);
  let earned = Math.max(0, basePoints - (currentWrongCount.value * 3));
  score.value += earned;

  setTimeout(() => {
    if (currentIndex.value < currentQuestionCount.value - 1) {
      currentIndex.value++;
      startQuestion();
    } else {
      endGame();
    }
  }, 2000);
};

const submitAnswer = async () => {
  if (isChecking.value || isPreparing.value) return; 
  playClickSound();
  
  const validPast = String(currentVerb.value.past_tense || '').toLowerCase().split('/').map(s => s.trim());
  const validPp = String(currentVerb.value.past_participle || '').toLowerCase().split('/').map(s => s.trim());

  let hitPast = false;
  let hitPp = false;
  let currentSubmitCorrect = true;

  if (!isPastLocked.value) {
    if (validPast.includes(pastInput.value.trim())) { isPastLocked.value = true; hitPast = true; }
    else { currentSubmitCorrect = false; pastInput.value = ''; }
  }

  if (!isPpLocked.value) {
    if (validPp.includes(ppInput.value.trim())) { isPpLocked.value = true; hitPp = true; }
    else { currentSubmitCorrect = false; ppInput.value = ''; }
  }

  if (!currentSubmitCorrect) {
    currentWrongCount.value++; 
    new Audio('/sounds/wrong.mp3').play();
    recordMastery(false); // 🌟 記錄錯誤
    if (!isPastLocked.value) activeField.value = 'past';
    else if (!isPpLocked.value) activeField.value = 'pp';
    return; 
  }

  // 🌟 完全答對
  if (isPastLocked.value && isPpLocked.value) {
      recordMastery(true); // 🌟 記錄正確
  }

  currentSequenceId = Date.now(); 
  if (hitPast && hitPp) {
      new Audio('/sounds/correct.mp3').play();
      setTimeout(async () => {
          await playPronunciationAsync(currentVerb.value.past_tense);
          await playPronunciationAsync(currentVerb.value.past_participle);
      }, 300);
  } else if (hitPast) {
      new Audio('/sounds/correct.mp3').play();
      setTimeout(() => playPronunciationAsync(currentVerb.value.past_tense), 300);
  } else if (hitPp) {
      new Audio('/sounds/correct.mp3').play();
      setTimeout(() => playPronunciationAsync(currentVerb.value.past_participle), 300);
  }

  if (isPastLocked.value && isPpLocked.value) finalizeQuestion();
};

const skipQuestion = () => {
  if (isChecking.value || isPreparing.value) return; 
  playClickSound();
  currentSequenceId = Date.now(); 
  recordMastery(false); // 🌟 放棄算錯誤
  
  pastInput.value = String(currentVerb.value.past_tense || '').split('/')[0];
  ppInput.value = String(currentVerb.value.past_participle || '').split('/')[0];
  isPastLocked.value = true; 
  isPpLocked.value = true;
  new Audio('/sounds/wrong.mp3').play();
  finalizeQuestion();
};

const endGame = async () => {
  gameState.value = 'end';
  currentSequenceId = Date.now();
  confetti({ particleCount: 150, spread: 80 });

  await supabase.from('game_records').insert([{
    student_id: studentCookie.value.id, 
    unit_played: '精熟度鍵盤', 
    game_type: '動詞變化遊樂園', 
    score: Math.floor(score.value), 
    time_taken_seconds: 0
  }]);
  if (!studentCookie.value.isAnon) {
    const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
    if (data) await supabase.from('students').update({ points: data.points + Math.floor(score.value) }).eq('id', studentCookie.value.id);
  }
};
</script>

<template>
  <div class="game-container">
    <div v-if="gameState === 'loading'" class="loading-screen retro-element">
       <h2>載入中...</h2>
    </div>

    <div v-else-if="gameState === 'playing' || gameState === 'end'">
      <div class="header">
        <div class="stats-board">💯 總分: {{ score }} / 100</div>
        <div v-if="gameState === 'playing'" class="progress">第 {{ currentIndex + 1 }} / {{ currentQuestionCount }} 題</div>
      </div>

      <div v-if="gameState === 'playing'" class="play-area">
        <div class="timer-box retro-element">
          <!-- 🌟 準備階段提示 -->
          <span v-if="isPreparing" style="color: #1976d2;">🎧 請仔細聽三態發音...</span>
          <span v-else>💡 請輸入正確的動詞變化</span>
        </div>

        <div class="question-box retro-element">
          <div class="base-verb">
            {{ currentVerb.base_form || 'N/A' }}
            <button class="sound-btn" @click="playPronunciation(currentVerb.base_form)" :disabled="isPreparing">🔊</button>
          </div>
          <div class="chinese-meaning">{{ currentVerb.chinese || '無翻譯' }}</div>
        </div>

        <!-- 兩個輸入框 -->
        <div class="inputs-container">
          <div class="input-group" :class="{ active: activeField === 'past' && !isPastLocked, locked: isPastLocked }" @click="switchField('past')">
            <label>
              <span style="display:flex; align-items:center; gap:8px;">
                過去式 (Past) <button class="sound-btn-small" @click.stop="playPronunciation(currentVerb.past_tense)" :disabled="isPreparing">🔊</button>
              </span>
              <span v-if="isPastLocked" class="lock-icon">🔒 已鎖定</span>
            </label>
            <div class="typed-text"><span v-if="activeField === 'past' && !isPastLocked && !isPreparing" class="cursor">|</span> {{ pastInput }}</div>
          </div>
          <div class="input-group" :class="{ active: activeField === 'pp' && !isPpLocked, locked: isPpLocked }" @click="switchField('pp')">
            <label>
              <span style="display:flex; align-items:center; gap:8px;">
                過去分詞 (P.P.) <button class="sound-btn-small" @click.stop="playPronunciation(currentVerb.past_participle)" :disabled="isPreparing">🔊</button>
              </span>
              <span v-if="isPpLocked" class="lock-icon">🔒 已鎖定</span>
            </label>
            <div class="typed-text"><span v-if="activeField === 'pp' && !isPpLocked && !isPreparing" class="cursor">|</span> {{ ppInput }}</div>
          </div>
        </div>

        <!-- 🌟 靜態虛擬鍵盤 (不旋轉) -->
        <div class="static-keyboard-wrapper retro-element">
            <div class="key-row" v-for="(row, rIdx) in keys" :key="rIdx">
              <button v-for="key in row" :key="key" class="key-btn" @click="typeLetter(key)" :disabled="isChecking || isPreparing">
                {{ key }}
              </button>
            </div>
            <div class="key-row" style="margin-top: 15px;">
              <button class="key-btn action-btn skip-btn" @click="skipQuestion" :disabled="isChecking || isPreparing">⏭️ 放棄 (看答案)</button>
              <button class="key-btn action-btn del-btn" @click="deleteLetter" :disabled="isChecking || isPreparing">⌫ 刪除</button>
              <button class="key-btn action-btn submit-btn" @click="submitAnswer" :disabled="isChecking || isPreparing">✅ 送出</button>
            </div>
        </div>

      </div>

      <!-- 結束畫面 -->
      <div v-else-if="gameState === 'end'" class="end-screen retro-element">
        <h1>🎪 遊樂園挑戰結束！</h1>
        <div class="final-score">{{ Math.floor(score) }} <span>分</span></div>
        <p style="font-weight:bold; color: #555;">(成績與精熟度已紀錄)</p>
        <div class="actions" style="margin-top: 20px;">
          <button class="retro-btn play-again" @click="() => window.location.reload()">🔄 再玩一次</button>
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

.timer-box { background: #fff; border: 2px solid #ccc; padding: 10px; border-radius: 12px; text-align: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; color: #2c3e50;}
.question-box { background: #e3f2fd; border-color: #1976d2; text-align: center; padding: 20px; border-radius: 16px; margin-bottom: 15px;}
.base-verb { font-size: 3rem; font-weight: 900; color: #0d47a1; display: flex; align-items: center; justify-content: center; gap: 15px;}
.chinese-meaning { font-size: 1.3rem; color: #555; margin-top: 5px; font-weight: bold;}

.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 45px; height: 45px; font-size: 1.3rem; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.2s;}
.sound-btn-small { background: #fff; border: 1px solid #1976d2; border-radius: 50%; width: 28px; height: 28px; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.2s;}
.sound-btn:active:not(:disabled), .sound-btn-small:active:not(:disabled) { transform: scale(0.9); }
.sound-btn:disabled, .sound-btn-small:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; box-shadow: none; }

.inputs-container { display: flex; gap: 10px; margin-bottom: 20px;}
.input-group { flex: 1; background: #f5f5f5; padding: 12px; border-radius: 12px; cursor: pointer; border: 3px solid #ccc; transition: 0.2s;}
.input-group.active { border-color: #4caf50; background: #e8f5e9; box-shadow: 0 4px 10px rgba(76,175,80,0.3);}
.input-group.locked { border-color: #27ae60; background: #eaeded; opacity: 0.8; cursor: default; }
.lock-icon { color: #27ae60; font-weight: bold; }
.input-group label { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #666; font-weight: bold; margin-bottom: 5px;}
.typed-text { font-size: 1.4rem; font-weight: bold; color: #333; min-height: 35px; letter-spacing: 1px;}
.cursor { animation: blink 1s infinite; color: #4caf50;}
@keyframes blink { 50% { opacity: 0; } }

/* 🌟 靜態鍵盤設計 */
.static-keyboard-wrapper { background: #2c3e50; padding: 20px 10px; border-radius: 16px; border: 4px solid #1a252f;}
.key-row { display: flex; justify-content: center; gap: 6px; margin-bottom: 8px;}
.key-btn { flex: 1; max-width: 45px; height: 50px; font-size: 1.3rem; font-weight: bold; background: #ecf0f1; border: 2px solid #bdc3c7; border-radius: 8px; color: #2c3e50; cursor: pointer; display: flex; justify-content: center; align-items: center; padding: 0; box-shadow: 0 4px 0 #95a5a6; transition: 0.1s;}
.key-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; background: #bdc3c7; }
.key-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: translateY(4px); }

.action-btn { flex: unset; max-width: none; padding: 0 15px; font-size: 1rem;}
.skip-btn { background: #f39c12; color: white; border-color: #e67e22; box-shadow: 0 4px 0 #d35400;}
.del-btn { background: #e74c3c; color: white; border-color: #c0392b; box-shadow: 0 4px 0 #922b21;}
.submit-btn { background: #27ae60; color: white; border-color: #2ecc71; box-shadow: 0 4px 0 #1e8449;}

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
