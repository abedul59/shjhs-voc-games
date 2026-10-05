<script setup>
import { ref, onMounted } from 'vue';

const supabase = useSupabaseClient();
const isLoading = ref(true);
const isSaving = ref(false);
const categories = ref([]);
const loadError = ref('');

const allGames = [
  { id: 'happyFarm', name: '🌻 單字開心農場' },
  { id: 'isekaiFarm', name: '✧ 單字異世界悠閒農莊' },
  { id: 'alchemyAtelier', name: '⚗️ 單字鍊金工房' },
  { id: 'chess', name: '♔ 單字西洋棋' },
  { id: 'railwayTour', name: '🚂 單字鐵路旅遊高手' },
  { id: 'match', name: '🟦 方塊消消樂' },
  { id: 'move', name: '🔠 單字神移動' },
  { id: 'choice', name: '✅ 單字選選樂' },
  { id: 'fill', name: '⌨️ 單字填一填' },
  { id: 'sentence', name: '📝 單字例句神絕配' },
  { id: 'listen', name: '🎧 單字例句順風耳' },
  { id: 'puzzle', name: '🧩 單字拼起來' },
  { id: 'cross', name: '🔠 單字填字FUN' },
  { id: 'review', name: '✍️ 單字複習趣' },
  { id: 'picture2meaning', name: '🖼️ 單字看圖辨義' },
  { id: 'ninja', name: '🥷 單字音節忍者' },
  { id: 'speakno1', name: '🗣️ 英語口說學霸-多元評量' },
  { id: 'speakno2', name: '📖 英語口說學霸-朗讀與說故事' },
  { id: 'speakno3', name: '🎤 英語口說學霸-英語歌唱' },
  { id: 'speak', name: '🎙️ 單字口說測一測' },
  { id: 'examListen1', name: '💯 仿會考-辨識句意' },
  { id: 'examRead1', name: '📜 會考單題特訓' },
  { id: 'examRead2', name: '📜 會考題組特訓' },
  { id: 'GPSmap', name: '🌍 單字地圖 GO' },
  { id: 'tetris', name: '🧱 俄羅斯方塊' },
  { id: 'pinball', name: '🎰 單字彈珠台' },
  { id: 'angrybirds', name: '🐦 單字憤怒鳥' },
  { id: 'angrybirdsDual', name: '🐦 單字憤怒鳥（雙人）' },
  { id: 'solitaire', name: '🃏 撲克牌接龍' },
  { id: 'pikavolley', name: '⚡ 皮卡丘排球' },
  { id: 'pikavolleyDual', name: '⚡ 皮卡丘排球（雙人）' },
  { id: 'pacman', name: '👻 單字小精靈' },
  { id: 'minesweeper', name: '💣 單字踩地雷' },
  { id: 'sudoku', name: '🔢 9x9數獨' },
  { id: 'tarotUno1', name: '🃏 塔羅UNO(單人)' },
  { id: 'tarot21solo', name: '🃏 塔羅21點(單人)' },
  { id: 'tarotAlch1', name: '🔮 塔羅鍊金術(單人)' },
  { id: 'shake2shuffle', name: '🧋 單字搖搖杯' },
  { id: 'tilt2sort', name: '⚖️ 左右為難：單字天平' },
  { id: 'gravitymaze', name: '🔮 單字迷宮滾滾球' },
  { id: 'swing2cast', name: '🪄 霍格華茲單字杖' },
  { id: 'ARsniper', name: '🔫 AR實境單字狙擊手' },
  { id: 'KKphonetics', name: '🔤 KK音標初學/複習' },
  { id: 'Phonics', name: '🔤 自然發音初學/複習' },
  { id: 'gramAmuPark', name: '🎡 文法遊樂園' },
  { id: 'noropejump', name: '🏃‍♂️ 單字無繩式跳繩' },
  { id: 'verbing', name: '🌀 動詞變化大師' },
  { id: 'verbAmuPark', name: '🎢 動詞變化遊樂園' }, 
  { id: 'verbMonopoly', name: '🏘️ 動詞變化大富翁' },
  { id: 'verbingDual', name: '⚔️ 動詞變化大師(對戰)' },
  { id: 'vocReviewing', name: '📖 單字例句總複習' }, // 🌟 補上新的總複習項目
  { id: 'monopoly', name: '🏘️ 單字大富翁（單人）' },
  { id: 'monopolyDual', name: '🏘️ 單字大富翁（雙人）' },
  { id: 'battle', name: '⚔️ 單字方塊陣' },
  { id: 'tenchi', name: '🐎 吞食天地' },
  { id: 'tarot21', name: '🃏 塔羅 21 點' },
  { id: 'tarotAlch', name: '🔮 塔羅鍊金術' },
  { id: 'tarotUno', name: '🃏 塔羅 UNO' }
];

onMounted(async () => {
  try {
    const { data, error } = await supabase.from('system_settings').select('game_categories').eq('id', 1).single();
    if (error) throw error;
    if (Array.isArray(data?.game_categories)) {
      categories.value = data.game_categories.map((cat, index) => ({
        ...cat,
        id: cat.id || `cat_${index}`,
        name: cat.name || cat.category_name || `分類 ${index + 1}`,
        games: Array.isArray(cat.games) ? [...cat.games] : []
      }));
      if (categories.value.length && !categories.value.some(cat => cat.games.includes('chess'))) {
        categories.value[0].games.push('chess');
      }
    }
  } catch (error) {
    loadError.value = `分類設定載入失敗：${error.message || '請稍後重新整理頁面。'}`;
  } finally {
    isLoading.value = false;
  }
});

const addCategory = () => {
  categories.value.push({ id: 'cat_' + Date.now(), name: '🏷️ 新分類名稱', games: [] });
};

const removeCategory = (index) => {
  if(confirm('確定要刪除這個分類嗎？')) categories.value.splice(index, 1);
};

const moveUp = (index) => {
  if (index === 0) return;
  const temp = categories.value[index];
  categories.value[index] = categories.value[index - 1];
  categories.value[index - 1] = temp;
};

const saveSettings = async () => {
  if (isLoading.value || isSaving.value || loadError.value) return;
  isSaving.value = true;
  try {
    const { error } = await supabase.from('system_settings')
      .update({ game_categories: categories.value }).eq('id', 1).select('id').single();
    if (error) throw error;
    alert('✅ 前台分類與排版已儲存！');
  } catch (error) {
    alert(`❌ 儲存失敗：${error.message || '請稍後再試。'}`);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="cat-container">
    <div class="header">
      <h1>🗂️ 前台遊戲分類與排版管理</h1>
      <div style="display: flex; gap: 10px;">
        <NuxtLink to="/admin" class="retro-btn btn-secondary" style="text-decoration:none;">返回後台</NuxtLink>
        <button class="retro-btn btn-primary" :disabled="isLoading || isSaving || !!loadError" @click="saveSettings">{{ isSaving ? '儲存中...' : '💾 儲存分類設定' }}</button>
      </div>
    </div>

    <div v-if="isLoading">載入中...</div>
    <p v-else-if="loadError" role="alert">{{ loadError }}</p>
    
    <div v-else>
      <p style="color: #666; margin-bottom: 20px;">您可以在這裡自訂前台的遊戲區塊。打勾的遊戲會出現在該分類中，分類順序也會直接影響前台顯示順序。</p>
      <p style="color: #666; margin-bottom: 20px;">🏘️ 單字大富翁（單人）與（雙人）可分別勾選到指定分類；移動到其他分類時，請取消原分類的勾選，再勾選新分類並儲存。</p>
      
      <div v-for="(cat, index) in categories" :key="cat.id" class="cat-card">
        <div class="cat-header">
          <input v-model="cat.name" :disabled="isSaving" class="cat-title-input" placeholder="請輸入分類名稱 (例如: 📖 讀寫測驗)" />
          <div class="cat-actions">
            <button @click="moveUp(index)" :disabled="index === 0 || isSaving" class="mini-btn">⬆️ 上移</button>
            <button @click="removeCategory(index)" :disabled="isSaving" class="mini-btn btn-danger">✖ 刪除分類</button>
          </div>
        </div>
        
        <div class="games-grid">
          <label v-for="game in allGames" :key="game.id" class="game-cb" :class="{ 'is-selected': cat.games.includes(game.id) }">
            <input type="checkbox" :value="game.id" v-model="cat.games" :disabled="isSaving" />
            {{ game.name }}
          </label>
        </div>
      </div>

      <button class="retro-btn btn-secondary" :disabled="isSaving" style="width: 100%; border: 2px dashed #888; margin-top: 20px;" @click="addCategory">
        ➕ 新增一個遊戲分類
      </button>
    </div>
  </div>
</template>

<style scoped>
.cat-container { padding: 20px; max-width: 1000px; margin: 0 auto; color: #333; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
.retro-btn { padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 2px solid; transition: 0.1s; }
.btn-primary { background: #007bff; color: white; border-color: #0056b3; }
.btn-secondary { background: #e0e0e0; color: #333; border-color: #ccc; }
.btn-danger { background: #dc3545; color: white; border-color: #a71d2a; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.mini-btn { padding: 5px 10px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; font-weight: bold;}

.cat-card { background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);}
.cat-header { display: flex; justify-content: space-between; margin-bottom: 15px; align-items: center;}
.cat-title-input { font-size: 1.3rem; font-weight: bold; padding: 8px; width: 300px; border: 2px solid #ccc; border-radius: 6px; }

.games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
.game-cb { background: #fff; border: 1px solid #ccc; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: 0.2s;}
.game-cb.is-selected { background: #e3f2fd; border-color: #2196f3; font-weight: bold; color: #0d47a1; }
</style>
