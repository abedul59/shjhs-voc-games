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

const gameStatus = ref('setup'); // setup, playing, end
const allWords = ref([]);
const errorMsg = ref('');
const gameStartTime = ref(0);
const timeSpent = ref(0);
const score = ref(0);
let timer = null;

const correctWordsList = ref([]);
const wrongWordsList = ref([]);
const mistakesCount = ref(0);

const config = ref({ time_limit: 300, penalty: 3 });

const currentWord = ref(null); // { original, zh, chunks: [], targetSyllables: 3 }
const isSlashed = ref(false);
const slashStatus = ref(''); // 'correct', 'wrong'

// --- 音效與發音系統 ---
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
  slash: () => { playTone(1200, 'sawtooth', 0.1, 0.1); setTimeout(() => playTone(800, 'sine', 0.1, 0.1), 50); }, 
  correct: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.2), 100); },
  wrong: () => { playTone(200, 'sawtooth', 0.3, 0.2); setTimeout(() => playTone(150, 'sawtooth', 0.4, 0.2), 200); },
};

const speakWord = (text) => {
  if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

// 🌟 智慧音節拆分演算法 (Syllable Chunking Heuristic - 作法一：前端演算法 + 字典)
const splitIntoSyllables = (word) => {
    let w = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    // 短字通常單音節，但豁免 'le' 結尾 (如 able)
    if (w.length <= 3 && !w.endsWith('le')) return [w]; 

    // 1. 特例完美覆寫字典 (針對發音不規則或外來語，老師可隨時擴充)
    const overrides = {
        "beautiful": ["beau", "ti", "ful"],
        "apple": ["ap", "ple"],
        "elephant": ["el", "e", "phant"],
        "banana": ["ba", "na", "na"],
        "teacher": ["teach", "er"],
        "student": ["stu", "dent"],
        "computer": ["com", "pu", "ter"],
        "taste": ["taste"],
        "rhythm": ["rhy", "thm"], 
        "awesome": ["awe", "some"], 
        "careful": ["care", "ful"],
        "something": ["some", "thing"],
        "everyone": ["eve", "ry", "one"]
    };
    if (overrides[w]) return overrides[w];

    // 2. 尋找母音群組並附帶前面的子音，作為初步的切塊
    let chunks = w.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
    if (!chunks) return [w];

    // 3. 語言學後處理：處理 Silent 'e' 與 Syllabic consonants
    let mergedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];
        let isLast = (i === chunks.length - 1);
        
        if (isLast && mergedChunks.length > 0) {
            // (a) 處理 Silent 'e' (字尾為 e，且前面不是 l，例如 tas + te => 合併為 taste)
            if (chunk.match(/^[^aeiouy]+e$/) && !chunk.endsWith('le')) {
                mergedChunks[mergedChunks.length - 1] += chunk;
                continue;
            }
            // (b) 處理過去式 -ed (除非前面是 t 或 d，否則不發音，如 bak + ed => baked)
            if (chunk.match(/^[^aeiouy]+ed$/) && !chunk.match(/[td]ed$/)) {
                mergedChunks[mergedChunks.length - 1] += chunk;
                continue;
            }
            // (c) 處理複數 -es (除非前面是 s, c, x, z, g，否則不發音)
            if (chunk.match(/^[^aeiouy]+es$/) && !chunk.match(/[scxz]es|ges|ches|shes$/)) {
                mergedChunks[mergedChunks.length - 1] += chunk;
                continue;
            }
        }
        mergedChunks.push(chunk);
    }
    
    return mergedChunks.length > 0 ? mergedChunks : [w];
};

onMounted(async () => {
  try {
    if (!studentCookie.value || !studentCookie.value.id) { errorMsg.value = '⚠️ 請先登入！'; return; }
    
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (settings) {
        if (settings.ninja_time_limit) config.value.time_limit = settings.ninja_time_limit;
        if (settings.ninja_penalty) config.value.penalty = settings.ninja_penalty;
    }

    const { version, volume, unit } = route.query;
    if (version && volume && unit) {
      const { data } = await supabase.from('vocabularies').select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      
      if (data) {
          // 🌟 核心過濾器：過濾掉包含「空白」的片語或句子，只保留純單字
          const pureWords = data.filter(v => 
              v.en_us && 
              v.en_us.trim().length > 0 && 
              !v.en_us.trim().includes(' ') // 如果字串裡有空白，代表是片語，直接踢除
          );

          if (pureWords.length >= 5) {
              allWords.value = pureWords;
          } else {
              errorMsg.value = '⚠️ 本單元「純單字」數量不足（片語不列入此遊戲）！';
          }
      }
    } else { errorMsg.value = '⚠️ 缺少單元參數！'; }
  } catch (e) { console.error(e); }
});

const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    errorMsg.value = '';
    score.value = 0;
    correctWordsList.value = []; wrongWordsList.value = []; mistakesCount.value = 0;

    gameStatus.value = 'playing';
    gameStartTime.value = Date.now();
    loadNextWord();
    
    timer = setInterval(() => { 
        timeSpent.value = Math.round((Date.now() - gameStartTime.value) / 1000); 
        if (timeSpent.value >= config.value.time_limit) endGame('時間到');
    }, 1000);
};

const loadNextWord = () => {
    isSlashed.value = false;
    slashStatus.value = '';
    
    const randomWord = allWords.value[Math.floor(Math.random() * allWords.value.length)];
    const original = randomWord.en_us;
    const zh = randomWord.zh_tw;
    
    const chunks = splitIntoSyllables(original);
    
    currentWord.value = {
        original, zh, chunks,
        targetSyllables: chunks.length
    };
};

const guessSyllable = (guessCount) => {
    if (isSlashed.value) return; 
    
    const isCorrect = (guessCount === currentWord.value.targetSyllables) || (guessCount === 5 && currentWord.value.targetSyllables >= 5);
    
    isSlashed.value = true;
    sfx.slash();

    if (isCorrect) {
        slashStatus.value = 'correct';
        sfx.correct();
        speakWord(currentWord.value.original);
        score.value += 10;
        if (!correctWordsList.value.includes(currentWord.value.original)) correctWordsList.value.push(currentWord.value.original);
        
        setTimeout(() => { loadNextWord(); }, 2000); 
    } else {
        slashStatus.value = 'wrong';
        sfx.wrong();
        score.value = Math.max(0, score.value - config.value.penalty);
        mistakesCount.value++;
        if (!wrongWordsList.value.includes(currentWord.value.original)) wrongWordsList.value.push(currentWord.value.original);
        
        setTimeout(() => { isSlashed.value = false; slashStatus.value = ''; }, 1500); 
    }
};

const endGame = async (reason) => {
    gameStatus.value = 'end';
    clearInterval(timer); 

    if (studentCookie.value && !studentCookie.value.isAnon) {
        let cw = `結果: ${reason} | 分數: ${score.value}`;
        if (correctWordsList.value.length > 0) cw += ', ' + correctWordsList.value.join(', ');

        await supabase.from('game_records').insert([{
            student_id: studentCookie.value.id, game_type: '單字音節忍者', score: score.value, time_taken_seconds: timeSpent.value,
            version: route.query.version, volume: route.query.volume, unit_played: route.query.unit,
            correct_words: cw, wrong_words: wrongWordsList.value.join(', '), mistakes: mistakesCount.value 
        }]);
    }
};

const quitGame = () => {
    if (gameStatus.value === 'playing') endGame('主動放棄');
    else navigateTo('/');
};

onUnmounted(() => { clearInterval(timer); });
</script>

<template>
  <div class="ninja-root">
    
    <header class="t-header retro-element">
      <h2 class="t-title">🥷 單字音節忍者</h2>
      <div v-if="gameStatus === 'playing'" class="t-timer">
         <span style="color:#ffeb3b; margin-right: 15px;">🏆 {{ score }}</span>
         <span>⏳ {{ config.time_limit - timeSpent }}s</span>
      </div>
      <button class="retro-btn btn-small" style="background:#d32f2f; border-color:#e57373;" @click="quitGame">結束</button>
    </header>

    <div v-if="errorMsg" class="error-box retro-element">{{ errorMsg }}</div>

    <div v-else-if="gameStatus === 'setup'" class="setup-overlay">
      <div class="rpg-dialog retro-element" style="max-width: 500px;">
        <div class="icon-big">⚔️</div>
        <h2 style="color:#ffeb3b;">切切樂：音節判斷</h2>
        
        <div class="rules-box">
            <p>1️⃣ <b>觀察單字</b>：畫面上會出現一個完整的純單字 (片語不出現)。</p>
            <p>2️⃣ <b>判斷音節</b>：請判斷這個字是由<b>「幾個音節」</b>組成的？<br>(例如 Apple 是 ap-ple 2 個音節，Taste 字尾 e 不發音算 1 個音節)。</p>
            <p>3️⃣ <b>揮刀斬擊</b>：點擊下方對應的數字按鈕！<br>
               🔸 ✅ <b>猜對</b>：忍刀切開單字，完美分離音節並發音，得 <b>+10分</b>！<br>
               🔸 ❌ <b>猜錯</b>：斬擊失敗，扣 <b>-{{ config.penalty }}分</b> 並需重新判斷。
            </p>
            <p style="color:#4fc3f7;">透過視覺的切斷感，把單字拆開來記，記憶效果倍增喔！</p>
        </div>
        <button class="retro-btn btn-primary" style="margin-top:15px; font-size:1.3rem; padding: 15px 40px; background:#00695c; border-color:#4db6ac;" @click="startGame">拔刀開始</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'playing' || gameStatus === 'end'" class="dojo-container">

      <div class="zh-hint" v-if="currentWord">{{ currentWord.zh }}</div>

      <div class="word-stage" v-if="currentWord">
          <div class="word-box" :class="{'slashed': isSlashed, 'wrong-slash': slashStatus === 'wrong', 'correct-slash': slashStatus === 'correct'}">
              
              <div class="slash-line" v-if="isSlashed"></div>

              <div v-for="(chunk, idx) in currentWord.chunks" :key="idx" class="syllable-chunk" :class="{'separated': isSlashed}">
                  {{ chunk }}<span v-if="isSlashed && idx !== currentWord.chunks.length - 1" class="hyphen">-</span>
              </div>

          </div>
      </div>

      <div class="control-panel retro-element">
          <div style="text-align: center; color: #b2dfdb; margin-bottom: 10px; font-weight: bold; font-size: 1.1rem;">這個單字有幾個音節？</div>
          <div class="guess-buttons">
              <button class="retro-btn guess-btn" @click="guessSyllable(1)" :disabled="isSlashed">1</button>
              <button class="retro-btn guess-btn" @click="guessSyllable(2)" :disabled="isSlashed">2</button>
              <button class="retro-btn guess-btn" @click="guessSyllable(3)" :disabled="isSlashed">3</button>
              <button class="retro-btn guess-btn" @click="guessSyllable(4)" :disabled="isSlashed">4</button>
              <button class="retro-btn guess-btn" @click="guessSyllable(5)" :disabled="isSlashed">5+</button>
          </div>
      </div>

    </div>

    <div v-if="gameStatus === 'end'" class="end-overlay">
       <div class="rpg-dialog retro-element">
          <h1>修行結束</h1>
          <p class="winner-text" style="color:#ffeb3b; font-size: 2rem;">🏆 總分：{{ score }}</p>
          <p style="color:#aaa; font-weight:bold; margin-bottom:15px;">原因：{{ errorMsg || '時間到' }}</p>
          <NuxtLink to="/" class="retro-btn btn-primary" style="margin-top:15px; display:inline-block;">返回首頁</NuxtLink>
       </div>
    </div>
  </div>
</template>

<style scoped>
.ninja-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #121212; display: flex; flex-direction: column; overflow: hidden; font-family: 'Courier New', Courier, 'Noto Sans TC', monospace; touch-action: none; user-select: none; color: #fff; }
.retro-element { background: rgba(20, 30, 25, 0.85); border: 2px solid #00796b; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.7); color: #fff; padding: 10px; box-sizing: border-box; backdrop-filter: blur(5px); }
.retro-btn { background: #004d40; color: #fff; border: 2px solid #4db6ac; border-radius: 6px; font-weight: bold; cursor: pointer; padding: 10px 15px; box-shadow: 0 4px 0 #00251a; transition: 0.1s; }
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.5; filter: grayscale(100%); cursor: not-allowed; }
.btn-primary { background: #1976d2; border-color: #64b5f6; box-shadow: 0 4px 0 #0d47a1; }
.btn-small { padding: 5px 10px; font-size: 1rem; box-shadow: 0 2px 0 #00251a; }

.t-header { display: flex; justify-content: space-between; align-items: center; border-radius: 0; border-top: none; border-left: none; border-right: none; margin-bottom: 0;}
.t-title { margin: 0; font-size: 1.1rem; }
.t-timer { font-weight: bold; font-size: 1.1rem; }

.setup-overlay, .end-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100;}
.rpg-dialog { max-width: 450px; width: 90%; text-align: center; padding: 25px; line-height: 1.6;}
.icon-big { font-size: 4rem; margin-bottom: 10px; text-shadow: 0 0 20px rgba(255,255,255,0.5); }
.rules-box { text-align: left; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; border: 1px dashed #4db6ac; font-size: 0.95rem; }

/* 🌟 Dojo 道場背景 */
.dojo-container { flex: 1; display: flex; flex-direction: column; position: relative; background: radial-gradient(circle at center, #263238 0%, #000 100%); overflow: hidden; padding: 20px; }

.zh-hint { font-size: 1.8rem; font-weight: 900; color: #4db6ac; text-align: center; margin-top: 5vh; text-shadow: 1px 1px 5px #000; }

/* 🌟 單字舞台與切斷特效 */
.word-stage { flex: 1; display: flex; justify-content: center; align-items: center; width: 100%; position: relative; perspective: 1000px; }

.word-box { position: relative; display: flex; font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 900; color: #fff; text-shadow: 2px 2px 0 #000, 0 0 20px rgba(255,255,255,0.3); transition: all 0.3s; }

/* 每個音節區塊的初始設定 (無間距，看起來像一個完整的字) */
.syllable-chunk { display: inline-flex; align-items: center; transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin: 0; padding: 0;}
.hyphen { color: #ffeb3b; font-size: 0.6em; margin: 0 5px; opacity: 0; transition: opacity 0.6s; }

/* ⚔️ 切開後的狀態 (推開間距、改變顏色) */
.word-box.slashed .syllable-chunk.separated { margin: 0 10px; color: #ffeb3b; text-shadow: 0 0 30px rgba(255, 235, 59, 0.8); }
.word-box.slashed .hyphen { opacity: 1; }

/* ❌ 答錯時的紅色震動特效 */
.word-box.wrong-slash .syllable-chunk.separated { color: #f44336; text-shadow: 0 0 30px rgba(244, 67, 54, 0.8); animation: shake 0.4s; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }

/* ⚡ 刀光特效線 (Slash Line) */
.slash-line { position: absolute; top: 50%; left: -20%; width: 0%; height: 4px; background: #fff; box-shadow: 0 0 10px #fff, 0 0 30px #4fc3f7, 0 0 60px #4fc3f7; transform: rotate(-15deg); z-index: 10; border-radius: 5px; pointer-events: none; }
.word-box.slashed .slash-line { animation: slashAnim 0.4s ease-out forwards; }
.word-box.wrong-slash .slash-line { box-shadow: 0 0 10px #fff, 0 0 30px #f44336, 0 0 60px #f44336; }

@keyframes slashAnim {
    0% { width: 0%; opacity: 1; left: -20%; }
    50% { width: 140%; opacity: 1; left: -20%; }
    100% { width: 140%; opacity: 0; left: 20%; }
}

/* 🎮 控制面板 */
.control-panel { margin-top: auto; padding: 20px; text-align: center; border-width: 3px; border-color: #4db6ac; }
.guess-buttons { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
.guess-btn { flex: 1; min-width: 50px; max-width: 80px; height: 60px; font-size: 1.8rem; background: #004d40; border-color: #80cbc4; box-shadow: 0 5px 0 #00251a; }
.guess-btn:active:not(:disabled) { transform: translateY(5px); box-shadow: none; }

@media (min-width: 768px) {
    .word-box { font-size: 6rem; }
    .word-box.slashed .syllable-chunk.separated { margin: 0 20px; }
    .guess-btn { min-width: 80px; max-width: 100px; height: 80px; font-size: 2.5rem; }
}
</style>