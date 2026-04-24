<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import { useBgmUnlock } from '~/composables/useBgmUnlock';
import { useRoute } from 'vue-router';


const route = useRoute();
const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const timeLimitSetting = ref(30); 
const maxScoreSetting = ref(20);  
const penaltySetting = ref(0.5);  
const puzzleCardSetSetting = ref('1'); 
const puzzleCardSetKangxuanSetting = ref('1k'); // 🌟 新增康軒版設定

const vocabularies = ref([]);
const currentQuestionIndex = ref(0);
const questionsCompleted = ref(0); 
const totalScore = ref(0);
const currentQuestionScore = ref(20);
const isLoading = ref(true);
const isGameOver = ref(false);
const showFeedback = ref(false);
const feedbackMsg = ref('');

const gridSize = 3;
const pieces = ref([]);
const selectedPiece = ref(null);
const isSolved = ref(false);

const timeElapsed = ref(0);
let timer = null;
const gameStartTime = ref(0);

const correctWords = ref(new Set());
const wrongWords = ref(new Set()); 
const wordReactionTimes = ref({});

const currentImageUrl = ref('');
const currentWord = computed(() => vocabularies.value[currentQuestionIndex.value]);

onMounted(async () => {
  if (!route.query.unit) { navigateTo('/'); return; }
  
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
  if (settings) {
    timeLimitSetting.value = settings.puzzle_game_time_limit ?? 30;
    maxScoreSetting.value = settings.puzzle_max_score ?? 20;
    penaltySetting.value = settings.puzzle_penalty ?? 0.5;
    puzzleCardSetSetting.value = settings.puzzle_card_set ?? '1'; 
    if (settings.puzzle_card_set_kangxuan) puzzleCardSetKangxuanSetting.value = settings.puzzle_card_set_kangxuan; // 🌟 讀取康軒版設定
  }

  let query = supabase.from('vocabularies').select('*').eq('version', route.query.version).eq('unit', route.query.unit);
  if (route.query.volume && route.query.volume !== 'undefined') query = query.eq('volume', route.query.volume);
  
  const { data } = await query;
  if (data && data.length > 0) {
    vocabularies.value = data.sort(() => Math.random() - 0.5).slice(0, 15); 
    gameStartTime.value = Date.now();
    loadQuestion();
    isLoading.value = false;
  } else {
    alert('單字庫為空，無法開始！'); navigateTo('/');
  }
});

const playWordSound = () => {
  if (!currentWord.value) return;
  const utterance = new SpeechSynthesisUtterance(currentWord.value.en_us);
  utterance.lang = 'en-US'; utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};

const loadQuestion = () => {
  isSolved.value = false;
  selectedPiece.value = null;
  currentQuestionScore.value = maxScoreSetting.value;
  
  // 🌟 修復空白與連字號，並轉為小寫URL安全編碼
  const rawWord = currentWord.value.en_us;
  const cleanWord = rawWord.replace(/[^a-zA-Z\s-]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  const encodedWord = encodeURIComponent(cleanWord);
  
  // 🌟 判斷使用哪一套圖片與版本切換
  const version = route.query.version;
  let setNum = '';

  if (version === '康軒') {
      setNum = puzzleCardSetKangxuanSetting.value;
      if (setNum === 'random') {
          const kSets = ['1k', '2k', '3k'];
          setNum = kSets[Math.floor(Math.random() * kSets.length)];
      }
  } else {
      setNum = puzzleCardSetSetting.value;
      if (setNum === 'random') {
          setNum = Math.floor(Math.random() * 3) + 1;
      }
  }
  
  // 動態切換網址的資料夾
  currentImageUrl.value = `https://pyfbsdk59.github.io/tarot-cards-${setNum}/${encodedWord}.webp`;
  
  initPuzzle();
  startTimer();
  setTimeout(() => playWordSound(), 500);
};

const initPuzzle = () => {
  const tempPieces = [];
  for (let i = 0; i < gridSize * gridSize; i++) {
    tempPieces.push({ id: i, currentPos: i, bgX: (i % gridSize) * 50, bgY: Math.floor(i / gridSize) * 50 });
  }
  do { tempPieces.sort(() => Math.random() - 0.5); } while (tempPieces.every((p, index) => p.id === index));
  pieces.value = tempPieces.map((p, index) => ({ ...p, currentPos: index }));
};

const handlePieceClick = (index) => {
  if (isSolved.value || currentQuestionScore.value <= 0) return;
  if (selectedPiece.value === null) { selectedPiece.value = index; } 
  else {
    const temp = pieces.value[selectedPiece.value];
    pieces.value[selectedPiece.value] = pieces.value[index];
    pieces.value[index] = temp;
    selectedPiece.value = null;
    checkWin();
  }
};

const checkWin = () => {
  const isAllCorrect = pieces.value.every((p, index) => p.id === index);
  if (isAllCorrect) {
    isSolved.value = true;
    clearInterval(timer);
    
    totalScore.value += currentQuestionScore.value;
    correctWords.value.add(currentWord.value.en_us);
    
    feedbackMsg.value = `🎉 拼圖完成！獲得 ${currentQuestionScore.value} 分`;
    showFeedback.value = true;
    
    questionsCompleted.value++;
    setTimeout(() => { showFeedback.value = false; nextQuestion(); }, 1500);
  }
};

const startTimer = () => {
  clearInterval(timer);
  timeElapsed.value = 0; 
  currentQuestionScore.value = maxScoreSetting.value; 
  
  timer = setInterval(() => {
    timeElapsed.value++;
    if (timeElapsed.value > timeLimitSetting.value) {
      const overtime = timeElapsed.value - timeLimitSetting.value;
      currentQuestionScore.value = Math.max(0, maxScoreSetting.value - (overtime * penaltySetting.value));
    }

    if (currentQuestionScore.value <= 0) {
      clearInterval(timer);
      currentQuestionScore.value = 0;
      wrongWords.value.add(currentWord.value.en_us);
      feedbackMsg.value = '💔 扣分至 0，本題失敗！';
      showFeedback.value = true;
      
      questionsCompleted.value++;
      setTimeout(() => { showFeedback.value = false; nextQuestion(); }, 1500);
    }
  }, 1000);
};

const skipQuestion = () => {
  if (isSolved.value || currentQuestionScore.value <= 0) return; 
  
  clearInterval(timer);
  if (currentQuestionIndex.value < vocabularies.value.length - 1) {
    currentQuestionIndex.value++;
    loadQuestion();
  } else {
    endGame();
  }
};

const nextQuestion = () => {
  if (questionsCompleted.value >= 5) { endGame(); } 
  else if (currentQuestionIndex.value < vocabularies.value.length - 1) { 
    currentQuestionIndex.value++; 
    loadQuestion(); 
  } else {
    endGame(); 
  }
};

const endGame = async () => {
  isGameOver.value = true; confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  
  if (studentCookie.value && !studentCookie.value.isAnon) {
    const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);
    
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, game_type: '單字拼起來', version: route.query.version, volume: route.query.volume || '', unit_played: route.query.unit, 
      score: totalScore.value, mistakes: questionsCompleted.value - correctWords.value.size, correct_words: Array.from(correctWords.value).join(', '), wrong_words: Array.from(wrongWords.value).join(', '), time_taken_seconds: totalTimeTaken 
    }]);

    const { checkAndUnlockBgm } = useBgmUnlock(); 
    const unlockedThemeName = await checkAndUnlockBgm();
    if (unlockedThemeName) alert(`🎉 解鎖專屬風格：【${unlockedThemeName}】`);

    try {
      const { data: set } = await supabase.from('system_settings').select('tarot_unlock_count, tarot_unlock_score').eq('id', 1).single();
      const uCount = set?.tarot_unlock_count || 10;
      const uScore = set?.tarot_unlock_score || 0;

      const { count: totalPlays } = await supabase.from('game_records')
        .select('*', { count: 'exact', head: true }).eq('student_id', studentCookie.value.id).eq('unit_played', route.query.unit).gte('score', uScore);

      if (totalPlays > 0 && totalPlays % uCount === 0) {
        const unlockedIndex = Math.floor(totalPlays / uCount) - 1;
        let wordQuery = supabase.from('vocabularies').select('en_us').eq('version', route.query.version).eq('unit', route.query.unit).order('id', { ascending: true });
        if (route.query.volume && route.query.volume !== 'undefined') wordQuery = wordQuery.eq('volume', route.query.volume);
        const { data: words } = await wordQuery;
        if (words && words[unlockedIndex]) {
          const targetWord = words[unlockedIndex].en_us.replace(/[?()!]/g, '').trim();
          setTimeout(() => {
            alert(`🎊 命運的齒輪開始轉動！您已達成 ${totalPlays} 次完美練習，獲得一張神祕塔羅牌！`);
            navigateTo(`/tarot?reveal_word=${targetWord}&set=1`);
          }, 1500);
        }
      }
    } catch(e) {}
  }
};

const restartGame = () => { if (typeof window !== 'undefined') window.location.reload(); };
onUnmounted(() => { clearInterval(timer); window.speechSynthesis.cancel(); });
</script>

<template>
  <div class="game-container">
    <div class="game-box retro-element" v-if="!isLoading && !isGameOver">
      
      <div class="header-info">
        <div class="progress">🧩 第 {{ questionsCompleted + 1 }} / 5 題</div>
        <div class="timer" :class="{ 'overtime': timeElapsed > timeLimitSetting }">
          <span v-if="timeElapsed <= timeLimitSetting">⏳ 安全時間: {{ timeLimitSetting - timeElapsed }}s</span>
          <span v-else>🔴 超時扣分中: -{{ timeElapsed - timeLimitSetting }}s</span>
        </div>
      </div>
      
      <div class="score-board">
        <span>🏆 總分: {{ totalScore }}</span>
        <span class="current-score" :class="{ 'dropping': timeElapsed > timeLimitSetting }">
          (本題剩餘: {{ currentQuestionScore }} 分)
        </span>
      </div>

      <h2 class="word-title">{{ currentWord.en_us }}</h2>
      
      <div class="puzzle-wrapper" :key="'puzzle-' + currentQuestionIndex">
        <div class="puzzle-container" :class="{ 'solved': isSolved }">
          <div 
            v-for="(piece, index) in pieces" :key="index" class="puzzle-piece"
            :class="{ 'selected': selectedPiece === index, 'correct-pos': piece.id === index && isSolved }"
            :style="{ backgroundImage: `url(${currentImageUrl})`, backgroundPosition: `${piece.bgX}% ${piece.bgY}%` }"
            @click="handlePieceClick(index)"
          ></div>
        </div>
        <div v-if="showFeedback" class="feedback-overlay"><h2>{{ feedbackMsg }}</h2></div>
      </div>

      <div class="controls" style="display: flex; justify-content: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
        <button class="action-btn" @click="playWordSound">🔊 聽發音</button>
        <button class="action-btn skip-btn" @click="skipQuestion" style="background: var(--tab-bg); color: var(--text-main);">⏭️ 圖片怪怪的，換一題</button>
      </div>
    </div>

    <div class="game-box retro-element text-center" v-if="isGameOver">
      <h1>🧩 拼圖挑戰結束！</h1>
      <div class="final-score">{{ totalScore }} 分</div>
      <div class="action-buttons">
        <button class="retro-btn restart-btn" @click="restartGame">🔄 再玩一次</button>
        <NuxtLink to="/" class="retro-btn home-btn">🏠 回首頁</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container { min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box;}
.game-box { background: var(--box-bg); padding: 30px; border: var(--box-border-width) solid var(--border-color); border-radius: 20px; width: 100%; max-width: 500px; text-align: center; position: relative;}

.header-info { display: flex; justify-content: space-between; font-weight: 900; font-size: 1.1rem; margin-bottom: 10px; color: var(--text-main);}
.timer { background: var(--success-bg); color: #111; padding: 5px 10px; border-radius: 8px; border: 2px solid #333; transition: 0.3s; }
.timer.overtime { background: var(--danger-color); color: white; animation: pulse 1s infinite; }

.score-board { font-size: 1.3rem; font-weight: bold; color: var(--btn-primary-bg); margin-bottom: 15px; border-bottom: 2px dashed #ccc; padding-bottom: 10px; }
.current-score { color: #888; font-size: 1rem; margin-left: 10px; transition: color 0.3s; }
.current-score.dropping { color: var(--danger-color); font-weight: 900; }

.word-title { font-size: 2.5rem; margin: 10px 0 20px; color: var(--text-main); font-weight: 900; letter-spacing: 2px; }

.puzzle-wrapper { position: relative; width: 300px; height: 510px; margin: 0 auto 20px; border: 4px solid var(--text-main); border-radius: 8px; overflow: hidden; background: #333; }
.puzzle-container { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 100%; height: 100%; }
.puzzle-piece {
  width: 100%; height: 100%;
  background-size: 300% 300%; 
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.3);
  transition: transform 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.puzzle-piece:hover { z-index: 10; transform: scale(0.95); box-shadow: 0 0 10px yellow; }
.puzzle-piece.selected { border: 3px solid var(--danger-color); z-index: 20; transform: scale(0.9); box-shadow: 0 0 15px var(--danger-color); }
.solved .puzzle-piece { border: none; transform: none !important; cursor: default; }

.feedback-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; color: white; z-index: 50; backdrop-filter: blur(5px); animation: fadeIn 0.3s; }

.controls { margin-top: 20px; }
.action-btn { background: var(--btn-primary-bg); border: 2px solid #000; padding: 10px 30px; border-radius: 20px; font-weight: 900; cursor: pointer; font-size: 1.1rem; }
.action-btn:active { transform: translateY(2px); }

.final-score { font-size: 4rem; color: var(--danger-color); font-weight: 900; margin: 20px 0; }
.action-buttons { display: flex; gap: 10px; justify-content: center; }
.retro-btn { padding: 10px 20px; border: 2px solid #000; border-radius: 10px; font-weight: bold; cursor: pointer; text-decoration: none; color: #000; }
.restart-btn { background: var(--success-bg); } .home-btn { background: #eee; }

@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>