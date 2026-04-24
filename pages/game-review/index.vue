<script setup>
import { ref, onMounted, nextTick } from 'vue';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');
const route = useRoute();

// 載入外部 Tesseract.js 主程式
useHead({
  script: [
    { src: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', defer: true }
  ]
});

// 遊戲參數
const config = ref({ time_limit: 60, max_score: 10, penalty: 0 }); 
const words = ref([]);
const currentQuestions = ref([]);
const currentQIndex = ref(0);

// 遊戲狀態
const gameState = ref('idle'); 
const score = ref(0);
const timeRemaining = ref(0);
let timer = null;

// 當前題目狀態
const currentWord = ref({});
const displayWord = ref('');
const missingChar = ref('');
const isRecognizing = ref(false); 

// 引擎準備狀態
const isEngineReady = ref(false);
const engineInitMsg = ref('⏳ 正在為您準備 AI 辨識引擎...');
let tesseractWorker = null; 

// 畫布 (Canvas) 相關
const canvasRef = ref(null);
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

const playAudio = (text) => {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85; 
  window.speechSynthesis.speak(utterance);
};

const initTesseract = async () => {
  try {
    let retries = 0;
    while (typeof window.Tesseract === 'undefined' && retries < 15) {
      await new Promise(r => setTimeout(r, 500));
      retries++;
    }

    if (typeof window.Tesseract === 'undefined') {
      engineInitMsg.value = '❌ 引擎載入失敗，請重新整理網頁。';
      return;
    }

    engineInitMsg.value = '⏳ 正在下載 AI 語言包 (首次需較長時間)...';
    
    tesseractWorker = await window.Tesseract.createWorker('eng', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
    });
    
    await tesseractWorker.setParameters({
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      tessedit_pageseg_mode: 10, 
    });

    isEngineReady.value = true;
    engineInitMsg.value = '✅ AI 引擎準備完畢！可以開始遊戲囉！';
  } catch (err) {
    console.error('Tesseract Initialization Error:', err);
    engineInitMsg.value = '❌ 設備不支援或網路阻擋，請使用電腦版或其他瀏覽器。';
  }
};

onMounted(async () => {
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) {
    config.value.time_limit = settings.voc_review_game_time_limit ?? 60;
    config.value.max_score = settings.voc_review_max_score ?? 10; 
    config.value.penalty = settings.voc_review_penalty ?? 0;
  }

  const { version, volume, unit } = route.query;
  if (version && volume && unit) {
    const { data: vocabs } = await supabase.from('vocabularies')
      .select('*').eq('version', version).eq('volume', volume).eq('unit', unit);
      
    if (vocabs && vocabs.length > 0) {
      words.value = vocabs.filter(v => v.en_us && v.en_us.trim().length > 1); 
    }
  } else {
    alert('❌ 無法取得單元資訊，請重新選擇！');
    navigateTo('/');
    return;
  }

  initTesseract(); 
});

const initCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  ctx.fillStyle = "white"; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 18; 
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
};

const getCoordinates = (e) => {
  const rect = canvasRef.value.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
};

const startDrawing = (e) => {
  isDrawing = true;
  const { x, y } = getCoordinates(e);
  lastX = x; lastY = y;
};

const draw = (e) => {
  if (!isDrawing) return;
  e.preventDefault(); 
  const { x, y } = getCoordinates(e);
  
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x; lastY = y;
};

const stopDrawing = () => { isDrawing = false; };
const clearCanvas = () => {
  if (ctx && canvasRef.value) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  }
};

const startGame = async () => {
  if (words.value.length < 5) {
    alert('此單元單字數量不足，無法開始遊戲！'); return;
  }
  
  let shuffled = [...words.value].sort(() => 0.5 - Math.random());
  currentQuestions.value = shuffled.slice(0, 10);
  
  score.value = 0;
  currentQIndex.value = 0;
  timeRemaining.value = config.value.time_limit;
  gameState.value = 'playing';
  
  loadNextQuestion();
  
  timer = setInterval(() => {
    timeRemaining.value--;
    if (timeRemaining.value <= 0) endGame();
  }, 1000);

  await nextTick();
  initCanvas();
};

const loadNextQuestion = () => {
  if (currentQIndex.value >= currentQuestions.value.length) {
    endGame();
    return;
  }
  
  const wordObj = currentQuestions.value[currentQIndex.value];
  currentWord.value = wordObj;
  
  const letters = wordObj.en_us.trim().split('');
  const validIndices = letters.map((l, i) => /[a-zA-Z]/.test(l) ? i : -1).filter(i => i !== -1);
  const mIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
  
  missingChar.value = letters[mIndex];
  letters[mIndex] = '_';
  displayWord.value = letters.join('');
  
  clearCanvas();
  playAudio(wordObj.en_us); 
};

const checkAnswer = async () => {
  if (isRecognizing.value || !tesseractWorker) return;
  isRecognizing.value = true;
  
  const canvas = canvasRef.value;
  const dataUrl = canvas.toDataURL('image/png');
  
  try {
    const result = await tesseractWorker.recognize(dataUrl);
    const recognizedText = result.data.text.trim().toLowerCase();
    
    const match = recognizedText.match(/[a-z]/);
    const recognizedLetter = match ? match[0] : '';
    
    if (recognizedLetter === missingChar.value.toLowerCase()) {
      score.value += config.value.max_score; 
      currentQIndex.value++;
      loadNextQuestion();
    } else {
      score.value = Math.max(0, score.value - config.value.penalty); 
      alert(`AI 看到的是「${recognizedLetter || '空'}」，好像不太對喔！請擦掉重寫。`);
      clearCanvas();
    }
  } catch (err) {
    console.error('Recognition Error:', err);
    alert('辨識過程發生錯誤，請擦掉重試！');
  } finally {
    isRecognizing.value = false;
  }
};

const endGame = async () => {
  clearInterval(timer);
  gameState.value = 'gameover';
  
  // 🌟 修正點：使用正確的 time_taken_seconds 與補上 class_name, real_name 等必須欄位
  if (studentCookie.value) {
    await supabase.from('game_records').insert([{
      student_id: studentCookie.value.id,
      real_name: studentCookie.value.real_name || studentCookie.value.name,
      class_name: studentCookie.value.class || '未分班',
      game_type: '單字複習趣',
      score: Math.round(score.value),
      time_taken_seconds: config.value.time_limit - timeRemaining.value,
      version: route.query.version,
      volume: route.query.volume,
      unit_played: route.query.unit,
      is_anon: studentCookie.value.isAnon || false,
      browser_id: studentCookie.value.browserId
    }]);

    // 幫一般登入學生加總分
    if (!studentCookie.value.isAnon) {
      const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
      if (data) await supabase.from('students').update({ points: data.points + Math.round(score.value) }).eq('id', studentCookie.value.id);
    }
  }
};
</script>

<template>
  <div class="game-container">
    <div class="header-bar retro-element">
      <h2>✍️ 單字複習趣</h2>
      <div class="status-info">
        <span class="score">💯 分數: {{ score }}</span>
        <span class="timer">⏳ 時間: {{ timeRemaining }}s</span>
        <NuxtLink to="/" class="retro-btn exit-btn">離開</NuxtLink>
      </div>
    </div>

    <div v-if="gameState === 'idle'" class="idle-screen retro-element">
      <h3>挑戰手寫單字吧！</h3>
      <p>仔細聽發音，把消失的字母寫在手寫板上。</p>
      
      <div class="engine-status" :class="{ 'ready': isEngineReady, 'error': engineInitMsg.includes('❌') }">
        {{ engineInitMsg }}
      </div>

      <button class="retro-btn start-btn" @click="startGame" :disabled="!isEngineReady">🚀 開始測驗</button>
    </div>

    <div v-if="gameState === 'playing'" class="play-screen">
      <div class="word-card retro-element">
        <div class="progress">第 {{ currentQIndex + 1 }} / {{ currentQuestions.length }} 題</div>
        
        <div class="word-display">
          <span class="en-text">{{ displayWord }}</span>
          <button class="audio-btn" @click="playAudio(currentWord.en_us)" title="聽發音">🔊</button>
        </div>
        
        <div class="word-details">
          <p class="zh-text">{{ currentWord.zh_tw }}</p>
          <p class="example-text" v-if="currentWord.example_en">{{ currentWord.example_en }}</p>
        </div>
      </div>

      <div class="drawing-board retro-element">
        <div class="board-header">
          <span>📝 寫下消失的字母 (寫大一點喔)</span>
          <button class="retro-btn clear-btn" @click="clearCanvas" :disabled="isRecognizing">🧹 重寫</button>
        </div>
        
        <div class="canvas-container" :class="{ 'recognizing': isRecognizing }">
          <canvas 
            ref="canvasRef" width="300" height="250"
            @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" @mouseleave="stopDrawing"
            @touchstart="startDrawing" @touchmove="draw" @touchend="stopDrawing"
          ></canvas>
          <div v-if="isRecognizing" class="loading-overlay">🤖 AI 辨識中...</div>
        </div>

        <button class="retro-btn submit-btn" @click="checkAnswer" :disabled="isRecognizing">
          {{ isRecognizing ? '處理中...' : '✅ 送出答案' }}
        </button>
      </div>
    </div>

    <div v-if="gameState === 'gameover'" class="gameover-screen retro-element">
      <h2>🎉 測驗結束！</h2>
      <div class="final-score">獲得總分：<span>{{ score }}</span></div>
      <button class="retro-btn retry-btn" @click="startGame">🔄 再玩一次</button>
      <NuxtLink to="/" class="retro-btn exit-btn" style="display:block; margin-top:15px; background:var(--tab-bg);">🏠 返回大廳</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.game-container { padding: 15px; max-width: 600px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; gap: 15px;}
.header-bar { display: flex; justify-content: space-between; align-items: center; background: var(--box-bg); padding: 10px 15px; border-radius: var(--radius-box); border: var(--box-border-width) solid var(--border-color); box-shadow: var(--shadow-box);}
.header-bar h2 { margin: 0; font-size: 1.5rem; color: var(--text-main); font-weight: 900;}
.status-info { display: flex; gap: 10px; align-items: center; font-weight: 900; font-size: 1.1rem;}
.score { color: var(--danger-color); } .timer { color: var(--info-color); }

.idle-screen, .gameover-screen { text-align: center; padding: 40px 20px; background: var(--box-bg); border-radius: var(--radius-box); border: var(--box-border-width) solid var(--border-color); box-shadow: var(--shadow-box);}
.start-btn, .retry-btn { font-size: 1.5rem; padding: 15px 30px; background: var(--success-bg); color: #fff; margin-top: 20px;}

.engine-status { margin-top: 20px; padding: 10px; background: #fff3e0; border: 2px dashed #ff9800; color: #e65100; font-weight: bold; border-radius: 8px;}
.engine-status.ready { background: #e8f5e9; border-color: #4caf50; color: #2e7d32; }
.engine-status.error { background: #ffebee; border-color: #f44336; color: #c62828; }

.play-screen { display: flex; flex-direction: column; gap: 15px; }

.word-card { background: var(--bg-color); padding: 20px; text-align: center; position: relative; border-radius: var(--radius-box); border: 4px solid var(--border-color);}
.progress { position: absolute; top: 10px; left: 15px; font-weight: bold; color: var(--text-muted); }
.word-display { display: flex; justify-content: center; align-items: center; gap: 15px; margin: 20px 0;}
.en-text { font-size: 3.5rem; font-weight: 900; letter-spacing: 5px; color: var(--text-main); font-family: monospace;}
.audio-btn { background: var(--info-bg); border: 2px solid var(--border-color); border-radius: 50%; width: 50px; height: 50px; font-size: 1.5rem; cursor: pointer; transition: 0.1s; box-shadow: 0 4px 0 var(--border-color);}
.audio-btn:active { transform: translateY(4px); box-shadow: none; }
.zh-text { font-size: 1.5rem; font-weight: bold; color: var(--primary-color); margin-bottom: 5px;}
.example-text { font-size: 1.1rem; color: #555; font-style: italic;}

.drawing-board { background: var(--box-bg); padding: 15px; display: flex; flex-direction: column; align-items: center; border-radius: var(--radius-box); border: 4px solid var(--border-color);}
.board-header { display: flex; justify-content: space-between; width: 100%; max-width: 300px; margin-bottom: 10px; font-weight: bold; align-items: center;}
.clear-btn { padding: 5px 10px; font-size: 0.9rem; background: #ffebee; color: #d32f2f; border-color: #d32f2f;}

.canvas-container { position: relative; border: 4px dashed var(--border-color); border-radius: 10px; overflow: hidden; background: white; touch-action: none;}
canvas { display: block; cursor: crosshair; }
.recognizing canvas { filter: blur(2px); pointer-events: none; }
.loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); color: white; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; font-weight: bold; z-index: 10;}

.submit-btn { margin-top: 15px; width: 100%; max-width: 300px; padding: 15px; font-size: 1.3rem; background: var(--btn-primary-bg); color: var(--btn-primary-text);}

.retro-btn { font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 0 var(--border-color); cursor: pointer; transition: 0.1s; text-decoration: none; display: inline-block;}
.retro-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.retro-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.exit-btn { padding: 5px 10px; font-size: 1rem; background: #e0e0e0; color: #333; }
.final-score span { font-size: 4rem; color: var(--danger-color); display: block; margin: 20px 0; font-weight: 900;}

@media (max-width: 400px) {
  .en-text { font-size: 2.5rem; }
  .zh-text { font-size: 1.2rem; }
}
</style>