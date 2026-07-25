<template>
  <div class="shooting-container">
    <div class="retro-element boxing-box">
      <div class="header-row">
        <h1 class="title">🔫 飛鼠單字射擊：神槍手</h1>
        <button v-if="gameState === 'playing'" class="exit-btn" @click="exitGame">退出遊戲</button>
      </div>
      
      <div v-if="gameState === 'init'" class="connect-section">
        <p>💡 <b>操作說明：</b></p>
        <ul class="guide-list">
          <li>請使用飛鼠移動畫面的「十字準星」。</li>
          <li>下方會顯示【英文單字】，畫面上會有許多飛鼠標靶飛來飛去。</li>
          <li>瞄準正確的【中文意思】並按下 <b>飛鼠的 OK 鍵 (滑鼠左鍵)</b> 進行射擊！</li>
          <li>擊中正確目標 +10 分，擊中錯誤目標 -5 分。</li>
        </ul>

        <button class="retro-btn start-btn" @click.stop="startShootingGame" :disabled="isLoading">
          {{ isLoading ? '載入彈藥與題庫中...' : '▶ 拔槍，進入射擊場' }}
        </button>
      </div>

      <div v-show="gameState === 'playing'" class="game-wrapper">
        <div class="header-stats">
          <div class="score">得分: {{ score }}</div>
          <div class="progress">剩餘目標: {{ remainingCount }}</div>
        </div>

        <div class="ar-arena" ref="arenaRef">
          
          <div v-for="target in activeTargets" :key="target.id"
               class="flying-target"
               :class="{ 'hit-correct': target.hitState === 'correct', 'hit-wrong': target.hitState === 'wrong' }"
               :style="{ left: target.x + 'px', top: target.y + 'px' }"
               @mousedown.stop="shootTarget(target)">
            <div class="target-icon">🦇</div>
            <div class="target-text">{{ target.text }}</div>
          </div>

          <div class="mission-hud">
            <div class="mission-label">🎯 狙擊目標</div>
            <h2 class="target-word">{{ currentVocab?.en_us }}</h2>
          </div>
          
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// ✨ 引入 nextTick，確保畫面長出來後才生成標靶
import { ref, computed, onUnmounted, nextTick } from 'vue';

const supabase = useSupabaseClient(); 
const route = useRoute();
const studentCookie = useCookie('currentStudent'); // 🌟 取得登入學生資訊

const gameState = ref('init'); 
const isLoading = ref(false);
const arenaRef = ref(null);

const vocabList = ref([]);
const usedVocabIds = ref(new Set());
const currentVocab = ref(null);
const score = ref(0);
const remainingCount = computed(() => vocabList.value.length - usedVocabIds.value.size);

const activeTargets = ref([]);
let animationFrameId = null;

// 🌟 記錄遊戲時間
const gameStartTime = ref(0);

const startShootingGame = async () => {
  isLoading.value = true;
  score.value = 0;
  usedVocabIds.value.clear();
  
  const { version, volume, unit } = route.query;
  let query = supabase.from('vocabularies').select('id, en_us, zh_tw');
  if (version && volume && unit) query = query.eq('version', version).eq('volume', volume).eq('unit', unit);
  else query = query.limit(50); 

  const { data, error } = await query;
  if (error || !data || data.length < 2) {
    alert('題庫載入失敗或單字數量不足！');
    isLoading.value = false;
    return;
  }
  
  vocabList.value = data;
  gameState.value = 'playing';
  isLoading.value = false;
  gameStartTime.value = Date.now(); // 🌟 遊戲開始計時
  nextRound();
};

const exitGame = () => {
  if (confirm('確定要退出射擊場嗎？分數將會重置。')) {
    gameState.value = 'init';
    usedVocabIds.value.clear();
    cancelAnimationFrame(animationFrameId);
  }
};

const spawnTargets = () => {
  if (!arenaRef.value) return;
  const arenaWidth = arenaRef.value.clientWidth;
  const arenaHeight = arenaRef.value.clientHeight;
  
  const correctItem = currentVocab.value;
  let wrongItems = [];
  let attempts = 0;
  while (wrongItems.length < 4 && attempts < 100) {
    const randomItem = vocabList.value[Math.floor(Math.random() * vocabList.value.length)];
    if (randomItem.id !== correctItem.id && !wrongItems.find(w => w.id === randomItem.id)) {
      wrongItems.push(randomItem);
    }
    attempts++;
  }

  const allOptions = [
    { text: correctItem.zh_tw, isCorrect: true },
    ...wrongItems.map(w => ({ text: w.zh_tw, isCorrect: false }))
  ].sort(() => Math.random() - 0.5);

  activeTargets.value = allOptions.map((opt, index) => {
    return {
      id: index,
      text: opt.text,
      isCorrect: opt.isCorrect,
      hitState: 'none',
      x: Math.random() * (arenaWidth - 150),
      y: Math.random() * (arenaHeight * 0.6), 
      vx: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2),
      vy: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2)
    };
  });

  cancelAnimationFrame(animationFrameId);
  updatePositions();
};

const updatePositions = () => {
  if (gameState.value !== 'playing' || !arenaRef.value) return;
  
  const arenaWidth = arenaRef.value.clientWidth;
  const arenaHeight = arenaRef.value.clientHeight;
  const TARGET_WIDTH = 120; 
  const TARGET_HEIGHT = 80; 

  activeTargets.value.forEach(t => {
    if (t.hitState !== 'none') return; 

    t.x += t.vx;
    t.y += t.vy;

    if (t.x <= 0) { t.x = 0; t.vx *= -1; }
    if (t.x >= arenaWidth - TARGET_WIDTH) { t.x = arenaWidth - TARGET_WIDTH; t.vx *= -1; }
    
    if (t.y <= 0) { t.y = 0; t.vy *= -1; }
    
    // ✨ 修復邊界：加入 Math.max 避免因為螢幕太小導致座標變為負數卡死
    const maxY = Math.max(0, arenaHeight - TARGET_HEIGHT - 120);
    if (t.y >= maxY) { t.y = maxY; t.vy *= -1; }
  });

  animationFrameId = requestAnimationFrame(updatePositions);
};

// 🌟 遊戲結束與存檔邏輯
const endGame = async () => {
  gameState.value = 'init';
  usedVocabIds.value.clear();
  cancelAnimationFrame(animationFrameId);

  const totalTimeTaken = Math.floor((Date.now() - gameStartTime.value) / 1000);
  alert(`🎉 神槍手！你已清空所有目標！\n最終分數：${score.value}\n總花費時間：${totalTimeTaken} 秒`);

  if (studentCookie.value) {
    let userIp = 'Unknown'; 
    try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch (e) {}

    // 取得嘗試次數
    const { count } = await supabase.from('game_records')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentCookie.value.id)
      .eq('unit_played', route.query.unit)
      .eq('game_type', '飛鼠單字射擊');

    // 寫入 game_records
    const { error } = await supabase.from('game_records').insert([{
      student_id: studentCookie.value.id,
      game_type: '飛鼠單字射擊',
      score: Math.round(score.value),
      time_taken_seconds: totalTimeTaken,
      version: route.query.version,
      volume: route.query.volume || '',
      unit_played: route.query.unit,
      attempt_number: (count || 0) + 1,
      ip_address: userIp,
      device_info: navigator.userAgent
    }]);

    if (error) {
      alert(`🚨 資料庫寫入失敗！請截圖給老師：\n${error.message}`);
      console.error("寫入錯誤:", error);
      return;
    }

    // 幫一般登入學生加總分
    if (!studentCookie.value.isAnon) {
      const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
      if (data) {
        await supabase.from('students').update({ points: data.points + Math.round(score.value) }).eq('id', studentCookie.value.id);
      }
    }
  }
};

const shootTarget = (target) => {
  if (target.hitState !== 'none' || gameState.value !== 'playing') return;

  if (target.isCorrect) {
    score.value += 10;
    target.hitState = 'correct';
    usedVocabIds.value.add(currentVocab.value.id);

    setTimeout(() => {
      if (usedVocabIds.value.size >= vocabList.value.length) {
        // 🌟 呼叫存檔函數
        endGame();
      } else {
        nextRound();
      }
    }, 1000);

  } else {
    score.value -= 5;
    target.hitState = 'wrong';
    setTimeout(() => {
      activeTargets.value = activeTargets.value.filter(t => t.id !== target.id);
    }, 500);
  }
};

// ✨ 使用 async/await 與 nextTick 確保遊戲畫面渲染完成
const nextRound = async () => {
  const available = vocabList.value.filter(v => !usedVocabIds.value.has(v.id));
  if (available.length === 0) return;

  currentVocab.value = available[Math.floor(Math.random() * available.length)];
  
  // 讓 Vue 等待一個畫面更新週期，確保 arenaRef 順利展開並取得正確寬高
  await nextTick();
  spawnTargets();
};

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.shooting-container { 
  display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 20px; 
  user-select: none;
}

.header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #ccc; margin-bottom: 20px; }
.exit-btn { background: #f44336; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.exit-btn:hover { background: #d32f2f; }

.guide-list { text-align: left; display: inline-block; background: #e3f2fd; padding: 15px 30px; border-radius: 8px; border: 1px solid #90caf9; margin: 15px 0; }

.boxing-box { background: var(--box-bg); color: var(--text-main); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); padding: 20px; width: 100%; max-width: 900px; text-align: center; box-shadow: var(--shadow-box); }
.start-btn { width: 100%; padding: 15px; font-size: 1.5rem; background: #2196f3; color: white; border: 2px solid #1976d2; border-radius: 8px; cursor: pointer; font-weight: bold; }
.start-btn:active { transform: translateY(3px); }

.header-stats { display: flex; justify-content: space-between; align-items: center; font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
.score { color: #d32f2f; font-size: 1.5rem; }

/* 射擊競技場 */
.ar-arena {
  position: relative; width: 100%; max-width: 800px; margin: 0 auto; aspect-ratio: 4 / 3;
  background-color: #263238; 
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  border: 4px solid #455a64; border-radius: 15px;
  overflow: hidden; 
  /* 🌟 把競技場內的游標變成準星形狀 */
  cursor: crosshair; 
}

/* 漂浮標靶設計 */
.flying-target {
  position: absolute;
  width: auto;
  min-width: 120px;
  padding: 10px 15px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 3px solid #ff9800;
  border-radius: 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  transition: transform 0.1s;
}

.flying-target:hover {
  transform: scale(1.1);
  border-color: #f44336;
  background-color: #fff;
  z-index: 10;
}

.target-icon { font-size: 1.8rem; margin-bottom: 5px; }
.target-text { font-size: 1.3rem; font-weight: 900; color: #333; }

/* 打擊特效 */
.hit-correct {
  background-color: #4caf50; border-color: #2e7d32; color: white;
  transform: scale(1.3) rotate(10deg) !important;
  pointer-events: none;
  box-shadow: 0 0 30px #4caf50;
  opacity: 0;
  transition: all 0.5s ease-out; /* 答對時爆裂消失 */
}

.hit-wrong {
  background-color: #f44336; border-color: #b71c1c; color: white;
  transform: scale(0.8) rotate(-10deg) !important;
  pointer-events: none;
  box-shadow: 0 0 30px #f44336;
  opacity: 0;
  transition: all 0.3s ease-out; /* 答錯時瞬間縮小消失 */
}

/* 底部狙擊目標提示 */
.mission-hud {
  position: absolute;
  bottom: 0; left: 0; width: 100%; height: 110px;
  background: rgba(0, 0, 0, 0.7);
  border-top: 4px solid #00e676;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none; /* 讓滑鼠可以穿透 */
}

.mission-label { color: #00e676; font-size: 1.2rem; font-weight: bold; letter-spacing: 2px; }
.target-word { font-size: 3.5rem; margin: 0; color: #fff; text-shadow: 0 0 10px #00e676; }

@media (max-width: 768px) {
  .target-word { font-size: 2.5rem; }
  .flying-target { min-width: 90px; padding: 5px 10px; }
  .target-icon { font-size: 1.2rem; }
  .target-text { font-size: 1.1rem; }
}
</style>
