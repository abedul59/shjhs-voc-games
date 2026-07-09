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
const keyboardSpeed = ref(20); // 預設 20 秒一圈

// 輸入狀態
const pastInput = ref('');
const ppInput = ref('');
const activeField = ref('past'); // 'past' 或 'pp'
const isChecking = ref(false);

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

onMounted(async () => {
  if (!studentCookie.value) { router.push('/'); return; }

  // 1. 取得旋轉速度設定
  const { data: sysData } = await supabase.from('system_settings').select('verbing_keyboard_speed').eq('id', 1).single();
  if (sysData && sysData.verbing_keyboard_speed) keyboardSpeed.value = sysData.verbing_keyboard_speed;

  // 2. 隨機抓取 10 個不規則動詞
  const { data: verbs } = await supabase.from('irregular_verbs').select('*');
  if (!verbs || verbs.length < 10) {
    alert('題庫不規則動詞不足 10 個，請先至後台匯入資料！');
    router.push('/');
    return;
  }

  gameVerbs.value = verbs.sort(() => Math.random() - 0.5).slice(0, 10);
  gameState.value = 'playing';
});

const currentVerb = computed(() => gameVerbs.value[currentIndex.value] || {});

// 發音功能
const playPronunciation = (word) => {
  if (!word) return;
  const cleanWord = word.split('/')[0].toLowerCase().trim(); // 若有 was/were，取第一個發音
  const audio = new Audio(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${cleanWord}--_us_1.mp3`);
  audio.play().catch(() => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = 'en-US'; window.speechSynthesis.speak(utterance);
    }
  });
};

// 鍵盤輸入邏輯
const typeLetter = (char) => {
  if (isChecking.value) return;
  if (activeField.value === 'past') pastInput.value += char.toLowerCase();
  else ppInput.value += char.toLowerCase();
};

const deleteLetter = () => {
  if (isChecking.value) return;
  if (activeField.value === 'past') pastInput.value = pastInput.value.slice(0, -1);
  else ppInput.value = ppInput.value.slice(0, -1);
};

// 送出答案
const submitAnswer = () => {
  if (isChecking.value) return;
  isChecking.value = true;
  
  let pts = 0;
  // 支援 was/were 多種寫法，以 "/" 分隔判斷
  const validPast = currentVerb.value.past_tense.toLowerCase().split('/').map(s => s.trim());
  const validPp = currentVerb.value.past_participle.toLowerCase().split('/').map(s => s.trim());

  const isPastCorrect = validPast.includes(pastInput.value.trim());
  const isPpCorrect = validPp.includes(ppInput.value.trim());

  if (isPastCorrect) pts += 5;
  if (isPpCorrect) pts += 5;
  
  score.value += pts;

  // 播放音效
  if (pts === 10) new Audio('/sounds/correct.mp3').play();
  else new Audio('/sounds/wrong.mp3').play();

  // 顯示正確答案並延遲進入下一題
  pastInput.value = currentVerb.value.past_tense;
  ppInput.value = currentVerb.value.past_participle;

  setTimeout(() => {
    if (currentIndex.value < 9) {
      currentIndex.value++;
      pastInput.value = '';
      ppInput.value = '';
      activeField.value = 'past';
      isChecking.value = false;
    } else {
      endGame();
    }
  }, 1500);
};

const endGame = async () => {
  gameState.value = 'end';
  confetti({ particleCount: 150, spread: 80 });

  // 上傳紀錄
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
</script>

<template>
  <div class="game-container">
    <div class="header">
      <div class="stats-board">💯 總分: {{ score }}</div>
      <div v-if="gameState === 'playing'" class="progress">第 {{ currentIndex + 1 }} / 10 題</div>
    </div>

    <div v-if="gameState === 'playing'" class="play-area">
      <div class="question-box retro-element">
        <div class="base-verb">
          {{ currentVerb.base_form }}
          <button class="sound-btn" @click="playPronunciation(currentVerb.base_form)">🔊</button>
        </div>
        <div class="chinese-meaning">{{ currentVerb.chinese }}</div>
      </div>

      <div class="inputs-container">
        <div class="input-group retro-element" :class="{ active: activeField === 'past' }" @click="activeField = 'past'">
          <label>過去式 (Past) <button class="hint-sound" @click.stop="playPronunciation(currentVerb.past_tense)">🔊 提示</button></label>
          <div class="typed-text">{{ pastInput }}<span v-if="activeField === 'past' && !isChecking" class="cursor">_</span></div>
        </div>
        
        <div class="input-group retro-element" :class="{ active: activeField === 'pp' }" @click="activeField = 'pp'">
          <label>過去分詞 (P.P.) <button class="hint-sound" @click.stop="playPronunciation(currentVerb.past_participle)">🔊 提示</button></label>
          <div class="typed-text">{{ ppInput }}<span v-if="activeField === 'pp' && !isChecking" class="cursor">_</span></div>
        </div>
      </div>

      <div class="keyboard-wrapper" :style="{ '--spin-speed': keyboardSpeed + 's' }">
        <div class="spinning-keyboard retro-element">
          <div v-for="(row, rIdx) in keys" :key="rIdx" class="key-row">
            <button v-for="key in row" :key="key" class="key-btn" @click="typeLetter(key)" :disabled="isChecking">{{ key }}</button>
          </div>
          <div class="key-row">
            <button class="key-btn action-btn del-btn" @click="deleteLetter" :disabled="isChecking">DEL</button>
            <button class="key-btn action-btn submit-btn" @click="submitAnswer" :disabled="isChecking">✅ 送出</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="gameState === 'end'" class="end-screen retro-element">
      <h1>🌀 測驗結束！</h1>
      <div class="final-score">{{ score }} <span>分</span></div>
      <div class="actions">
        <button class="retro-btn play-again" @click="playAgain">🔄 再玩一次</button>
        <NuxtLink to="/" class="retro-btn home-btn">🏠 回到首頁</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container { max-width: 600px; margin: 20px auto; padding: 15px; font-family: 'PingFang TC', sans-serif;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;}
.stats-board { background: #ff9800; color: white; padding: 10px 20px; border-radius: 20px; font-size: 1.2rem; font-weight: bold; border: 2px solid #e65100;}
.progress { font-size: 1.2rem; font-weight: bold; color: #333;}

.question-box { background: #e3f2fd; border-color: #1976d2; text-align: center; padding: 25px; border-radius: 16px; margin-bottom: 20px;}
.base-verb { font-size: 3.5rem; font-weight: 900; color: #0d47a1; display: flex; align-items: center; justify-content: center; gap: 15px;}
.chinese-meaning { font-size: 1.5rem; color: #555; margin-top: 10px; font-weight: bold;}
.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 50px; height: 50px; font-size: 1.5rem; cursor: pointer; transition: 0.1s;}
.sound-btn:active { transform: scale(0.9);}

.inputs-container { display: flex; gap: 15px; margin-bottom: 30px;}
.input-group { flex: 1; background: #f5f5f5; padding: 15px; border-radius: 12px; cursor: pointer; border: 3px solid #ccc; transition: 0.2s;}
.input-group.active { border-color: #4caf50; background: #e8f5e9; transform: translateY(-5px); box-shadow: 0 5px 15px rgba(76,175,80,0.3);}
.input-group label { display: flex; justify-content: space-between; align-items: center; font-size: 1rem; color: #666; font-weight: bold; margin-bottom: 10px;}
.hint-sound { background: #e0e0e0; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;}
.typed-text { font-size: 1.8rem; font-weight: bold; color: #333; min-height: 40px; letter-spacing: 2px;}
.cursor { animation: blink 1s infinite; color: #4caf50;}
@keyframes blink { 50% { opacity: 0; } }

/* 🌟 核心：旋轉鍵盤設計 */
.keyboard-wrapper { display: flex; justify-content: center; align-items: center; padding: 30px 0; overflow: hidden;}
.spinning-keyboard { 
  background: #2c3e50; padding: 20px; border-radius: 20px; border: 4px solid #1a252f;
  animation: spin var(--spin-speed) linear infinite; /* 由資料庫控制轉速 */
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.key-row { display: flex; justify-content: center; gap: 8px; margin-bottom: 8px;}
.key-btn { width: 45px; height: 50px; font-size: 1.5rem; font-weight: bold; background: #ecf0f1; border: 2px solid #bdc3c7; border-radius: 8px; color: #2c3e50; cursor: pointer; text-transform: uppercase;}
.key-btn:active:not(:disabled) { background: #bdc3c7; transform: translateY(2px);}
.action-btn { width: auto; padding: 0 20px; font-size: 1.2rem;}
.del-btn { background: #e74c3c; color: white; border-color: #c0392b;}
.submit-btn { background: #27ae60; color: white; border-color: #2ecc71;}

/* 結束畫面 */
.end-screen { text-align: center; padding: 50px; background: white; border-radius: 20px; border: 3px solid #ff9800;}
.final-score { font-size: 6rem; font-weight: 900; color: #ff9800; margin: 20px 0;}
.final-score span { font-size: 2rem; color: #777;}
.actions { display: flex; flex-direction: column; gap: 15px;}
.retro-btn { padding: 15px; font-size: 1.2rem; font-weight: bold; border-radius: 12px; border: 2px solid #333; cursor: pointer; text-decoration: none; display: block;}
.play-again { background: #4caf50; color: white;}
.home-btn { background: #eee; color: #333;}
</style>
