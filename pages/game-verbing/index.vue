<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import confetti from 'canvas-confetti';

const supabase = useSupabaseClient();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const gameVerbs = ref([]);
const currentIndex = ref(0);
const score = ref(0);
const gameState = ref('loading'); 
const keyboardSpeed = ref(20); 

const pastInput = ref('');
const ppInput = ref('');
const activeField = ref('past'); 
const isChecking = ref(false);

const keys = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

onMounted(async () => {
  if (!studentCookie.value) { router.push('/'); return; }

  const { data: sysData } = await supabase.from('system_settings').select('verbing_keyboard_speed').eq('id', 1).single();
  if (sysData && sysData.verbing_keyboard_speed) keyboardSpeed.value = sysData.verbing_keyboard_speed;

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
  if (activeField.value === 'past') pastInput.value += char.toLowerCase();
  else ppInput.value += char.toLowerCase();
};

const deleteLetter = () => {
  if (isChecking.value) return;
  if (activeField.value === 'past') pastInput.value = pastInput.value.slice(0, -1);
  else ppInput.value = ppInput.value.slice(0, -1);
};

const submitAnswer = () => {
  if (isChecking.value) return;
  isChecking.value = true;
  
  let pts = 0;
  const validPast = currentVerb.value.past_tense.toLowerCase().split('/').map(s => s.trim());
  const validPp = currentVerb.value.past_participle.toLowerCase().split('/').map(s => s.trim());

  const isPastCorrect = validPast.includes(pastInput.value.trim());
  const isPpCorrect = validPp.includes(ppInput.value.trim());

  if (isPastCorrect) pts += 5;
  if (isPpCorrect) pts += 5;
  
  score.value += pts;

  if (pts === 10) new Audio('/sounds/correct.mp3').play();
  else new Audio('/sounds/wrong.mp3').play();

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
      <!-- 題目區 -->
      <div class="question-box retro-element">
        <div class="base-verb">
          {{ currentVerb.base_form }}
          <button class="sound-btn" @click="playPronunciation(currentVerb.base_form)">🔊</button>
        </div>
        <div class="chinese-meaning">{{ currentVerb.chinese }}</div>
      </div>

      <!-- 填空區 -->
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

      <!-- 🌟 旋轉虛擬鍵盤區 -->
      <div class="keyboard-wrapper" :style="{ '--spin-speed': keyboardSpeed + 's' }">
        <div class="spinning-keyboard retro-element">
          <div v-for="(row, rIdx) in keys" :key="rIdx" class="key-row">
            <button v-for="key in row" :key="key" class="key-btn" @click="typeLetter(key)" :disabled="isChecking">
              <!-- 🌟 字母加上反向旋轉類別 -->
              <span class="upright-text">{{ key }}</span>
            </button>
          </div>
          <div class="key-row">
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
.stats-board { background: #ff9800; color: white; padding: 8px 15px; border-radius: 20px; font-size: 1.1rem; font-weight: bold; border: 2px solid #e65100;}
.progress { font-size: 1.1rem; font-weight: bold; color: #333;}

.question-box { background: #e3f2fd; border-color: #1976d2; text-align: center; padding: 20px; border-radius: 16px; margin-bottom: 15px;}
.base-verb { font-size: 3rem; font-weight: 900; color: #0d47a1; display: flex; align-items: center; justify-content: center; gap: 15px;}
.chinese-meaning { font-size: 1.3rem; color: #555; margin-top: 5px; font-weight: bold;}
.sound-btn { background: #fff; border: 2px solid #1976d2; border-radius: 50%; width: 45px; height: 45px; font-size: 1.3rem; cursor: pointer;}

.inputs-container { display: flex; gap: 10px; margin-bottom: 20px;}
.input-group { flex: 1; background: #f5f5f5; padding: 12px; border-radius: 12px; cursor: pointer; border: 3px solid #ccc; transition: 0.2s;}
.input-group.active { border-color: #4caf50; background: #e8f5e9; transform: translateY(-3px); box-shadow: 0 4px 10px rgba(76,175,80,0.3);}
.input-group label { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #666; font-weight: bold; margin-bottom: 5px;}
.hint-sound { background: #e0e0e0; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;}
.typed-text { font-size: 1.4rem; font-weight: bold; color: #333; min-height: 35px; letter-spacing: 1px;}
.cursor { animation: blink 1s infinite; color: #4caf50;}
@keyframes blink { 50% { opacity: 0; } }

/* 🌟 手機排版保護罩：設定正方形容器，確保鍵盤旋轉不會被切斷或撐開螢幕 */
.keyboard-wrapper { 
  position: relative;
  width: 100%; 
  max-width: 450px; 
  aspect-ratio: 1 / 1; 
  margin: 0 auto;
  overflow: hidden; 
  display: flex; 
  justify-content: center; 
  align-items: center;
}

/* 🌟 鍵盤順時針旋轉 */
.spinning-keyboard { 
  width: 95%; /* 響應式：佔滿保護罩的 95% */
  background: #2c3e50; 
  padding: 12px; 
  border-radius: 16px; 
  border: 4px solid #1a252f;
  animation: spin var(--spin-speed) linear infinite; 
  box-sizing: border-box;
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.key-row { display: flex; justify-content: center; gap: 4px; margin-bottom: 6px;}

/* 按鈕改為 flex 自適應，確保能擠進手機畫面 */
.key-btn { 
  flex: 1; 
  height: 45px; 
  font-size: 1.2rem; 
  font-weight: bold; 
  background: #ecf0f1; 
  border: 2px solid #bdc3c7; 
  border-radius: 8px; 
  color: #2c3e50; 
  cursor: pointer; 
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}
.key-btn:active:not(:disabled) { background: #bdc3c7; transform: scale(0.95);}

.action-btn { flex: unset; padding: 0 15px; font-size: 1rem;}
.del-btn { background: #e74c3c; color: white; border-color: #c0392b;}
.submit-btn { background: #27ae60; color: white; border-color: #2ecc71;}

/* 🌟 字母逆時針自轉，永遠保持正面朝上 */
.upright-text {
  display: inline-block;
  animation: counter-spin var(--spin-speed) linear infinite;
}
@keyframes counter-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

/* 結束畫面 */
.end-screen { text-align: center; padding: 40px; background: white; border-radius: 20px; border: 3px solid #ff9800;}
.final-score { font-size: 5rem; font-weight: 900; color: #ff9800; margin: 15px 0;}
.final-score span { font-size: 1.5rem; color: #777;}
.actions { display: flex; flex-direction: column; gap: 10px;}
.retro-btn { padding: 12px; font-size: 1.1rem; font-weight: bold; border-radius: 12px; border: 2px solid #333; cursor: pointer; text-decoration: none; display: block;}
.play-again { background: #4caf50; color: white;}
.home-btn { background: #eee; color: #333;}
</style>
