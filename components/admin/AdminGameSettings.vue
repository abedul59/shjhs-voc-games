<script setup>
const props = defineProps({ config: Object });
</script>

<template>
  <div class="settings-section">
    
    <div class="setting-item highlight-item" style="flex-direction: column; align-items: stretch; gap: 10px; background: #ffebee; border-color: #f44336; margin-bottom: 25px;">
      <label style="color: #c62828; font-size: 1.2rem; border-bottom: 1px dashed #f44336; padding-bottom: 5px;">🚦 伺服器流量管理：對戰遊戲開放控制</label>
      <p style="color: #d32f2f; font-weight: bold; margin: 0; font-size: 0.95rem;">(當本月 Supabase 免費額度即將耗盡時，可在此關閉對戰遊戲功能，首頁將對學生顯示 🔒維護中)</p>
      <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 10px; font-weight: bold;">
        <label><input type="checkbox" v-model="config.enable_battle" style="transform: scale(1.3); margin-right: 5px;" /> ⚔️ 單字方塊陣</label>
        <label><input type="checkbox" v-model="config.enable_tenchi" style="transform: scale(1.3); margin-right: 5px;" /> 🐎 吞食天地</label>
        <label><input type="checkbox" v-model="config.enable_tarot21" style="transform: scale(1.3); margin-right: 5px;" /> 🃏 塔羅21點</label>
        <label><input type="checkbox" v-model="config.enable_tarot_alch" style="transform: scale(1.3); margin-right: 5px;" /> 🔮 塔羅鍊金術</label>
        <label><input type="checkbox" v-model="config.enable_tarot_uno" style="transform: scale(1.3); margin-right: 5px;" /> 🃏 塔羅UNO</label>
      </div>
    </div>



    <div class="setting-item highlight-item" style="flex-direction: column; align-items: stretch; gap: 10px; background: #e3f2fd; border-color: #90caf9;">
      <label style="color: #0277bd; font-size: 1.1rem; border-bottom: 1px dashed #90caf9; padding-bottom: 5px;">🟦 方塊消消樂 進階計分機制</label>
      <div class="multi-input" style="margin-bottom:5px;">每配對一組得 <input type="number" v-model="config.match_base_score_per_pair" class="retro-input num-input" /> 分，點錯扣 <input type="number" v-model="config.match_penalty" class="retro-input num-input" /> 分。全局限時 <input type="number" v-model="config.match_game_time_limit" class="retro-input num-input" /> 秒。</div>
      <div class="multi-input">🌟 提早過關加分：
        ≤ <input type="number" v-model="config.match_bonus_tier1_time" class="retro-input num-input" />秒 +<input type="number" v-model="config.match_bonus_tier1_score" class="retro-input num-input" />分 |
        ≤ <input type="number" v-model="config.match_bonus_tier2_time" class="retro-input num-input" />秒 +<input type="number" v-model="config.match_bonus_tier2_score" class="retro-input num-input" />分 |
        ≤ <input type="number" v-model="config.match_bonus_tier3_time" class="retro-input num-input" />秒 +<input type="number" v-model="config.match_bonus_tier3_score" class="retro-input num-input" />分
      </div>
    </div>

    <div class="setting-item">
      <label>🔠 單字神移動 (每題):</label>
      <div class="multi-input">限時<input type="number" v-model="config.move_game_time_limit" class="retro-input num-input" />秒, 扣<input type="number" v-model="config.move_penalty" class="retro-input num-input" />分</div>
    </div>
    
    <div class="setting-item">
      <label>✅ 單字選選樂 (每題):</label>
      <div class="multi-input">限時<input type="number" v-model="config.choice_game_time_limit" class="retro-input num-input" />秒, 扣<input type="number" v-model="config.choice_penalty" class="retro-input num-input" />分</div>
    </div>
    
    <div class="setting-item">
      <label>⌨️ 單字填一填 (每題):</label>
      <div class="multi-input">限時<input type="number" v-model="config.fill_game_time_limit" class="retro-input num-input" />秒, 扣<input type="number" v-model="config.fill_penalty" class="retro-input num-input" />分</div>
    </div>
    
    <div class="setting-item">
      <label>📝 例句神絕配 (每題):</label>
      <div class="multi-input">限時<input type="number" v-model="config.sentence_game_time_limit" class="retro-input num-input" />秒, 扣<input type="number" v-model="config.sentence_penalty" class="retro-input num-input" />分</div>
    </div>
    
    <div class="setting-item">
      <label>🎧 例句順風耳 (每題):</label>
      <div class="multi-input">
        限時<input type="number" v-model="config.listen_game_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.listen_penalty" class="retro-input num-input" />分, 
        提示扣<input type="number" v-model="config.listen_hint_penalty" class="retro-input num-input" />分
      </div>
    </div>

<div class="setting-item" style="background: #e0f2f1; border-color: #2e7d32; flex-direction: column; align-items: stretch;">
      <label style="color:#1b5e20; margin-bottom: 10px;">🧩 單字拼起來 (單人):</label>
      
      <div class="field-row" style="margin-bottom: 10px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
        <div style="width: 100%; color: #2e7d32; margin-bottom: 8px; font-weight: bold;">🔮 拼圖專屬底圖卡牌：</div>
        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
          <label>📘 翰林/其他版：</label>
          <select v-model="config.puzzle_card_set" class="retro-input num-input" style="width: 120px;">
            <option value="1">第一套 (1)</option>
            <option value="2">第二套 (2)</option>
            <option value="3">第三套 (3)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <label>📗 康軒版專屬：</label>
          <select v-model="config.puzzle_card_set_kangxuan" class="retro-input num-input" style="width: 120px;">
            <option value="1k">第一套 (1k)</option>
            <option value="2k">第二套 (2k)</option>
            <option value="3k">第三套 (3k)</option>
            <option value="4k">第四套 (4k)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
      </div>

      <div class="multi-input">
        每題安全時間<input type="number" v-model="config.puzzle_game_time_limit" class="retro-input num-input" />秒, 
        滿分<input type="number" v-model="config.puzzle_max_score" class="retro-input num-input" />分, 
        超時每秒扣<input type="number" step="0.1" v-model="config.puzzle_penalty" class="retro-input num-input" />分
      </div>
    </div>

    <div class="setting-item">
      <label>🎙️ 口說測一測 (每題):</label>
      <div class="multi-input">
        滿分<input type="number" v-model="config.speak_max_score" class="retro-input num-input" />分, 
        重測扣<input type="number" v-model="config.speak_retry_penalty" class="retro-input num-input" />分,
        跳過扣<input type="number" v-model="config.speak_skip_penalty" class="retro-input num-input" />分
      </div>
    </div>

    <div class="setting-item">
      <label>🔠 單字填字FUN (每次5題):</label>
      <div class="multi-input">
        限時<input type="number" v-model="config.cross_game_time_limit" class="retro-input num-input" />秒, 
        完成得<input type="number" v-model="config.cross_max_score" class="retro-input num-input" />分,
        錯扣<input type="number" v-model="config.cross_penalty" class="retro-input num-input" />分
      </div>
    </div>

    <div class="setting-item">
      <label>✍️ 單字複習趣 (手寫辨識):</label>
      <div class="multi-input">
        全局限時<input type="number" v-model="config.voc_review_game_time_limit" class="retro-input num-input" />秒, 
        每題答對得<input type="number" v-model="config.voc_review_max_score" class="retro-input num-input" />分,
        錯扣<input type="number" v-model="config.voc_review_penalty" class="retro-input num-input" />分
      </div>
    </div>

    <div class="setting-item highlight-item" style="background: #ffe0b2; border-color: #ff9800;">
      <label style="color: #e65100;">⚔️ 單字方塊陣 (對戰):</label>
      <div class="multi-input">
        🏆 獲勝條件: 先拼出 <input type="number" min="1" v-model="config.pvp_target_score" class="retro-input num-input" style="width: 50px;" /> 個單字<br>
        💯 計分規則: 拼對得 <input type="number" min="0" v-model="config.pvp_correct_points" class="retro-input num-input" style="width: 50px;" /> 分，拼錯扣 <input type="number" min="0" v-model="config.pvp_penalty_points" class="retro-input num-input" style="width: 50px;" /> 分<br>
        🌪️ 惡魔鍵盤旋轉一圈需 <input type="number" step="0.5" min="0" v-model="config.pvp_spin_speed" class="retro-input num-input" style="width: 60px;" /> 秒<br>
        🏃 逃跑禁賽門檻: 單日逃走達 <input type="number" min="1" max="100" v-model="config.pvp_max_escapes" class="retro-input num-input" style="width: 50px;" /> 次，當日禁玩
      </div>
    </div>

    <div class="setting-item highlight-item" style="background: #e1bee7; border-color: #9c27b0;">
      <label style="color: #6a1b9a;">🧱 單字俄羅斯方塊:</label>
      <div class="multi-input">
        每次單字挖空數量 <input type="number" min="1" max="5" v-model="config.tetris_blank_count" class="retro-input num-input" /> 個
        <span style="font-size:0.8rem; color:#6a1b9a; margin-left:5px;">(最多5個，每填對一格隨機解鎖一個被鎖住的方向鍵)</span>
      </div>
    </div>

    <div class="setting-item highlight-item" style="background: #e1bee7; border-color: #1976d2;">
      <label style="color: #0d47a1;">🎰 單字彈珠台 (Retro Pinball):</label>
      <div class="multi-input">
        🕳️ 單字預設挖空 <input type="number" min="1" max="10" v-model="config.pinball_blank_count" class="retro-input num-input" style="width: 50px;" /> 個字母<br>
        ❌ 彈錯軌道一次扣 <input type="number" min="0" v-model="config.pinball_penalty_points" class="retro-input num-input" style="width: 50px;" /> 分 (完成一個單字固定得 10 分)
      </div>
    </div>

    <div class="setting-card highlight-item" style="background: #ffcdd2; border-color: #b71c1c;">
        <h3 class="card-title angrybirds" style="background: #b71c1c; color: #fff; border-color: #b71c1c;">🐦 單字憤怒鳥</h3>
        <div class="field-row">
          <label>🕳️ 單字預設挖空：</label>
          <div class="input-group">
            <input type="number" min="1" max="10" v-model="config.angrybirds_blank_count" class="retro-input num-input" />
            <span>個字母</span>
          </div>
        </div>
        <div class="field-row">
          <label>❌ 打錯小豬扣分：</label>
          <div class="input-group">
            <input type="number" min="0" v-model="config.angrybirds_penalty_points" class="retro-input num-input" />
            <span>分 (拼對固定得10分)</span>
          </div>
        </div>
    </div>

<div class="setting-item" style="background: #e8f5e9; border-color: #4caf50;">
      <label style="color:#2e7d32;">🃏 單字撲克牌接龍 (單人):</label>
      <div class="multi-input">
        全局限時<input type="number" v-model="config.solitaire_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.solitaire_penalty" class="retro-input num-input" />分,
        單字挖空<input type="number" min="1" max="10" v-model="config.solitaire_blank_count" class="retro-input num-input" />字
      </div>
    </div>

<div class="setting-item highlight-item" style="background: #fff8e1; border-color: #ffb300;">
      <label style="color: #f57f17;">👻 單字小精靈 (單人):</label>
      <div class="multi-input">
        全局限時<input type="number" v-model="config.pacman_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.pacman_penalty" class="retro-input num-input" />分, 
        單字挖空<input type="number" min="1" max="10" v-model="config.pacman_blank_count" class="retro-input num-input" />字<br>
        🌟 解鎖後自由活動 <input type="number" min="0" max="60" v-model="config.pacman_free_time" class="retro-input num-input" style="width: 50px;" /> 秒
      </div>
    </div>


    <div class="setting-item" style="background: #e0f7fa; border-color: #00838f;">
      <label style="color:#006064;">💣 單字踩地雷 (單人):</label>
      <div class="multi-input">
        全局限時<input type="number" v-model="config.minesweeper_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.minesweeper_penalty" class="retro-input num-input" />分,
        地圖大小 <input type="number" min="5" max="10" v-model="config.minesweeper_board_size" class="retro-input num-input" />格 (建議 7~8)
      </div>
    </div>


    <div class="setting-item" style="background: #f3e5f5; border-color: #8e24aa;">
      <label style="color:#4a148c;">🔢 單字 9x9 數獨 (單人):</label>
      <div class="multi-input">
        全局限時<input type="number" v-model="config.sudoku_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.sudoku_penalty" class="retro-input num-input" />分,
        挖空數量<input type="number" min="10" max="64" v-model="config.sudoku_blank_count" class="retro-input num-input" />格 (建議 45)
      </div>
    </div>

<div class="setting-item highlight-item" style="background: #e8f5e9; border-color: #2e7d32; flex-direction: column; align-items: stretch;">
      <label style="color:#1b5e20; margin-bottom: 10px;">🎴 塔羅 UNO (單人挑戰):</label>

      <div class="field-row" style="margin-bottom: 10px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
        <div style="width: 100%; color: #2e7d32; margin-bottom: 8px; font-weight: bold;">🔮 UNO專屬卡牌套系：</div>
        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
          <label>📘 翰林/其他版：</label>
          <select v-model="config.tarot_uno1_card_set" class="retro-input num-input" style="width: 120px;">
            <option value="1">第一套 (1)</option>
            <option value="2">第二套 (2)</option>
            <option value="3">第三套 (3)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <label>📗 康軒版專屬：</label>
          <select v-model="config.tarot_uno1_card_set_kangxuan" class="retro-input num-input" style="width: 120px;">
            <option value="1k">第一套 (1k)</option>
            <option value="2k">第二套 (2k)</option>
            <option value="3k">第三套 (3k)</option>
            <option value="4k">第四套 (4k)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
      </div>

      <div class="multi-input">
        全局限時<input type="number" v-model="config.tarot_uno1_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.tarot_uno1_penalty" class="retro-input num-input" />分,
        單字挖空<input type="number" min="1" max="10" v-model="config.tarot_uno1_blank_count" class="retro-input num-input" />字
      </div>
    </div>


<div class="setting-item highlight-item" style="background: #e8eaf6; border-color: #3f51b5; flex-direction: column; align-items: stretch;">
      <label style="color:#283593; margin-bottom: 10px;">🃏 塔羅21點 (單機挑戰):</label>

      <div class="field-row" style="margin-bottom: 10px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
        <div style="width: 100%; color: #3f51b5; margin-bottom: 8px; font-weight: bold;">🔮 單機版專屬卡牌套系：</div>
        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
          <label>📘 翰林/其他版：</label>
          <select v-model="config.tarot21solo_card_set" class="retro-input num-input" style="width: 120px;">
            <option value="1">第一套 (1)</option>
            <option value="2">第二套 (2)</option>
            <option value="3">第三套 (3)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <label>📗 康軒版專屬：</label>
          <select v-model="config.tarot21solo_card_set_kangxuan" class="retro-input num-input" style="width: 120px;">
            <option value="1k">第一套 (1k)</option>
            <option value="2k">第二套 (2k)</option>
            <option value="3k">第三套 (3k)</option>
            <option value="4k">第四套 (4k)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
      </div>

      <div class="multi-input">
        初始血量<input type="number" v-model="config.tarot21solo_hp" class="retro-input num-input" />點,
        限時<input type="number" v-model="config.tarot21solo_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.tarot21solo_penalty" class="retro-input num-input" />分,
        挖空<input type="number" min="1" max="10" v-model="config.tarot21solo_blank_count" class="retro-input num-input" />字,
        贏得回合傷害<input type="number" v-model="config.tarot21solo_win_damage" class="retro-input num-input" />點
      </div>
    </div>

<div class="setting-item highlight-item" style="background: #f3e5f5; border-color: #8e24aa; flex-direction: column; align-items: stretch;">
      <label style="color:#4a148c; margin-bottom: 10px;">⚗️ 塔羅鍊金術 (單人無盡模式):</label>

      <div class="field-row" style="margin-bottom: 10px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
        <div style="width: 100%; color: #8e24aa; margin-bottom: 8px; font-weight: bold;">🔮 鍊金術專屬卡牌套系：</div>
        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
          <label>📘 翰林/其他版：</label>
          <select v-model="config.tarot_alch1_card_set" class="retro-input num-input" style="width: 120px;">
            <option value="1">第一套 (1)</option>
            <option value="2">第二套 (2)</option>
            <option value="3">第三套 (3)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <label>📗 康軒版專屬：</label>
          <select v-model="config.tarot_alch1_card_set_kangxuan" class="retro-input num-input" style="width: 120px;">
            <option value="1k">第一套 (1k)</option>
            <option value="2k">第二套 (2k)</option>
            <option value="3k">第三套 (3k)</option>
            <option value="4k">第四套 (4k)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
      </div>

      <div class="multi-input">
        全局限時<input type="number" v-model="config.tarot_alch1_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.tarot_alch1_penalty" class="retro-input num-input" />分,
        單字挖空<input type="number" min="1" max="10" v-model="config.tarot_alch1_blank_count" class="retro-input num-input" />字
      </div>
    </div>


    <div class="setting-item" style="background: #e0f2f1; border-color: #00796b;">
      <label style="color:#004d40;">🥷 單字音節忍者 (切切樂):</label>
      <div class="multi-input">
        全局限時<input type="number" v-model="config.ninja_time_limit" class="retro-input num-input" />秒, 
        錯扣<input type="number" v-model="config.ninja_penalty" class="retro-input num-input" />分
      </div>
    </div>


    <div class="setting-item highlight-item" style="background: #fff3e0; border-color: #fbc02d; flex-direction: column; align-items: stretch;">
      <label style="color:#f57f17; margin-bottom: 10px; font-weight: bold;">🗣️ 英語口說學霸 / 多元評量 (game-speakno1):</label>

      <div class="multi-input" style="margin-bottom: 10px;">
        單字唸對加<input type="number" v-model="config.speak_word_score" class="retro-input num-input" />分,
        唸錯扣<input type="number" v-model="config.speak_word_penalty" class="retro-input num-input" />分,
        句子滿分<input type="number" v-model="config.speak_sentence_score" class="retro-input num-input" />分
      </div>

      <div style="width: 100%; color: #f57f17; font-weight: bold; margin-bottom: 5px;">📝 自訂口說測驗句子 (一行一句，格式：英文|中文)：</div>
      <textarea v-model="config.speak_sentences" class="retro-input" style="width: 100%; height: 120px; font-family: monospace; line-height: 1.5; padding: 10px;" placeholder="例如：\nHow are you?|你好嗎？\nI am a student.|我是一個學生。"></textarea>
    </div>


    <div class="setting-item highlight-item" style="background: #e1f5fe; border-color: #0288d1; flex-direction: column; align-items: stretch;">
      <label style="color:#01579b; margin-bottom: 10px; font-weight: bold;">🖼️ 單字看圖辨義 (game-picture2meaning):</label>
      
      <div class="field-row" style="margin-bottom: 10px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
        <div style="width: 100%; color: #0288d1; margin-bottom: 8px; font-weight: bold;">🔮 圖片來源 (塔羅牌卡包)：</div>
        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
          <label>📘 翰林/其他版：</label>
          <select v-model="config.p2m_card_set" class="retro-input num-input" style="width: 120px;">
            <option value="1">第一套 (1)</option>
            <option value="2">第二套 (2)</option>
            <option value="3">第三套 (3)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <label>📗 康軒版專屬：</label>
          <select v-model="config.p2m_card_set_kangxuan" class="retro-input num-input" style="width: 120px;">
            <option value="1k">第一套 (1k)</option>
            <option value="2k">第二套 (2k)</option>
            <option value="3k">第三套 (3k)</option>
            <option value="4k">第四套 (4k)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
      </div>

      <div class="multi-input">
        每題答對加<input type="number" v-model="config.p2m_score_per_q" class="retro-input num-input" />分,
        答錯扣<input type="number" v-model="config.p2m_penalty" class="retro-input num-input" />分 (共10題)
      </div>
    </div>



    <div class="setting-item highlight-item" style="background: #fffde7; border-color: #fbc02d; flex-direction: column; align-items: stretch;">
      <label style="color:#f57f17; margin-bottom: 10px; font-weight: bold;">⚡ 皮卡丘排球 (半回合制):</label>

      <div class="multi-input" style="margin-bottom: 10px;">
        全局限時<input type="number" v-model="config.pikavolley_time_limit" class="retro-input num-input" />秒, 
        拼錯扣<input type="number" v-model="config.pikavolley_penalty" class="retro-input num-input" />分,
        單字挖空<input type="number" min="1" max="10" v-model="config.pikavolley_blank_count" class="retro-input num-input" />字
      </div>
      
      <div class="field-row" style="background: rgba(255,235,59,0.2); padding: 10px; border-radius: 8px; border: 1px dashed #fbc02d;">
        <div style="width: 100%; color: #f57f17; font-weight: bold; margin-bottom: 5px;">⏳ 時間即生命系統：</div>
        <div style="display: flex; align-items: center; gap: 10px;">
          每拼對一個字母，解鎖自由行動 
          <input type="number" min="1" v-model="config.pikavolley_unlock_time" class="retro-input num-input" style="width: 70px; border-color: #f57f17;" /> 
          秒
        </div>
      </div>
    </div>


    <div class="setting-item highlight-item" style="background: #e8eaf6; border-color: #3f51b5; flex-direction: column; align-items: stretch;">
      <label style="color:#283593; margin-bottom: 10px; font-weight: bold;">🎧 仿會考挑戰-辨識句意 (game-examListen1):</label>
      
      <div class="field-row" style="margin-bottom: 10px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
        <div style="width: 100%; color: #3f51b5; margin-bottom: 8px; font-weight: bold;">🔮 圖片來源 (塔羅牌卡包)：</div>
        <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 5px;">
          <label>📘 翰林/其他版：</label>
          <select v-model="config.examListen1_card_set" class="retro-input num-input" style="width: 120px;">
            <option value="1">第一套 (1)</option>
            <option value="2">第二套 (2)</option>
            <option value="3">第三套 (3)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <label>📗 康軒版專屬：</label>
          <select v-model="config.examListen1_card_set_kangxuan" class="retro-input num-input" style="width: 120px;">
            <option value="1k">第一套 (1k)</option>
            <option value="2k">第二套 (2k)</option>
            <option value="3k">第三套 (3k)</option>
            <option value="4k">第四套 (4k)</option>
            <option value="random">隨機亂數</option>
          </select>
        </div>
      </div>

      <div class="multi-input">
        答對加<input type="number" v-model="config.examListen1_score_per_q" class="retro-input num-input" />分,
        選錯扣<input type="number" v-model="config.examListen1_penalty" class="retro-input num-input" />分,
        看中文扣<input type="number" v-model="config.examListen1_hint_penalty" class="retro-input num-input" />分
      </div>
    </div>


<div class="setting-group">
  <h4 class="group-subtitle">📜 會考閱讀考古學(題組)</h4>
  <div class="input-grid">
    <div class="input-item">
      <label>⏳ 題組獨立倒數時間 (秒)</label>
      <input type="number" v-model="config.examRead2_time_limit" class="retro-input" min="60" max="600" />
      <small class="hint-text">預設為 240 秒 (4分鐘)</small>
    </div>
  </div>
</div>




    <div class="setting-card highlight-item" style="background: #e8eaf6; border-color: #3f51b5;">
        <h3 class="card-title tarot" style="background: #3f51b5; color: #fff; border-color: #3f51b5;">🃏 單字塔羅21點對決 (連線對戰)</h3>
        
        <div class="field-row" style="margin-bottom: 10px;">
          <label>🔮 使用卡牌套系：</label>
          <div class="input-group">
            <select v-model="config.tarot21_card_set" class="retro-input num-input" style="width: 100px;">
              <option value="1">第一套</option>
              <option value="2">第二套</option>
              <option value="3">第三套</option>
              <option value="random">隨機亂</option>
            </select>
          </div>
        </div>

        <div class="field-row" style="margin-bottom: 10px;">
          <label>❤️ 雙方初始血量：</label>
          <div class="input-group">
            <input type="number" min="10" max="500" v-model="config.tarot21_hp" class="retro-input num-input" />
            <span>點</span>
          </div>
        </div>

        <div class="field-row" style="margin-bottom: 10px;">
          <label>⏱️ 翻牌解鎖限時：</label>
          <div class="input-group">
            <input type="number" min="5" max="60" v-model="config.tarot21_time_limit" class="retro-input num-input" />
            <span>秒</span>
          </div>
        </div>

        <div class="field-row" style="margin-bottom: 10px;">
          <label>🔥 解鎖失敗自燃扣血：</label>
          <div class="input-group">
            <input type="number" min="1" max="50" v-model="config.tarot21_penalty" class="retro-input num-input" />
            <span>點 (並且卡牌作廢)</span>
          </div>
        </div>

        <div class="field-row" style="margin-bottom: 10px;">
          <label>🔠 單字挖空數量：</label>
          <div class="input-group">
            <input type="number" min="1" max="10" v-model="config.tarot21_blank_count" class="retro-input num-input" />
            <span>個字母</span>
          </div>
        </div>

        <div class="field-row">
          <label>🗡️ 贏得回合給予傷害：</label>
          <div class="input-group">
            <input type="number" min="1" max="100" v-model="config.tarot21_win_damage" class="retro-input num-input" />
            <span>點 (外加雙方點數差額)</span>
          </div>
        </div>

        <div class="field-row">
          <label>🚫 逃跑禁賽門檻：</label>
          <div class="input-group">
            <span>單日逃走達</span>
            <input type="number" min="1" max="100" v-model="config.tarot21_max_escapes" class="retro-input num-input" style="width: 50px;" />
            <span>次，當日禁玩</span>
          </div>
        </div>



    </div>

    <div class="setting-group retro-element">
        <h3>🔮 單字塔羅鍊金術對決設定</h3>
        
        <div class="field-row">
          <label>🎴 卡背樣式：</label>
          <select v-model="config.tarot_alch_card_set" class="retro-input">
            <option value="1">1. 經典塔羅 (Classic)</option>
            <option value="2">2. 暗黑神秘 (Dark)</option>
            <option value="3">3. 華麗金邊 (Gold)</option>
            <option value="random">🎲 隨機樣式 (Random)</option>
          </select>
        </div>

        <div class="field-row">
          <label>❤️ 雙方初始血量：</label>
          <div class="input-group">
            <input type="number" min="10" max="200" v-model="config.tarot_alch_hp" class="retro-input num-input" />
            <span>HP</span>
          </div>
        </div>

        <div class="field-row">
          <label>⏳ 單字解鎖時限：</label>
          <div class="input-group">
            <input type="number" min="5" max="60" v-model="config.tarot_alch_time_limit" class="retro-input num-input" />
            <span>秒</span>
          </div>
        </div>

        <div class="field-row">
          <label>🔠 單字挖空數量：</label>
          <div class="input-group">
            <input type="number" min="1" max="10" v-model="config.tarot_alch_blank_count" class="retro-input num-input" />
            <span>個字母</span>
          </div>
        </div>

        <div class="field-row">
          <label>🔥 失敗反噬扣血：</label>
          <div class="input-group">
            <input type="number" min="0" max="50" v-model="config.tarot_alch_penalty" class="retro-input num-input" />
            <span>HP</span>
          </div>
        </div>

        <div class="field-row">
          <label>⚔️ 贏家基礎傷害：</label>
          <div class="input-group">
            <input type="number" min="0" max="50" v-model="config.tarot_alch_win_damage" class="retro-input num-input" />
            <span>HP + (點數差)</span>
          </div>
        </div>

        <div class="field-row">
          <label>🚫 逃跑禁賽門檻：</label>
          <div class="input-group">
            <span>單日逃走達</span>
            <input type="number" min="1" max="100" v-model="config.tarot_alch_max_escapes" class="retro-input num-input" style="width: 50px;" />
            <span>次，當日禁玩</span>
          </div>
        </div>



    </div>

    <div class="setting-group retro-element">
      <h3>🃏 單字塔羅 UNO 對決設定</h3>
      <div class="field-row">
        <label>🎴 卡背樣式：</label>
        <select v-model="config.tarot_uno_card_set" class="retro-input">
          <option value="1">1. 經典塔羅 (Classic)</option>
          <option value="2">2. 暗黑神秘 (Dark)</option>
          <option value="3">3. 華麗金邊 (Gold)</option>
          <option value="random">🎲 隨機樣式 (Random)</option>
        </select>
      </div>
      <div class="field-row">
        <label>❤️ 雙方初始血量：</label>
        <div class="input-group">
          <input type="number" min="10" max="200" v-model="config.tarot_uno_hp" class="retro-input num-input" />
          <span>HP</span>
        </div>
      </div>
      <div class="field-row">
        <label>⏳ 單字解鎖時限：</label>
        <div class="input-group">
          <input type="number" min="5" max="60" v-model="config.tarot_uno_time_limit" class="retro-input num-input" />
          <span>秒</span>
        </div>
      </div>
      <div class="field-row">
        <label>🔠 單字挖空數量：</label>
        <div class="input-group">
          <input type="number" min="1" max="10" v-model="config.tarot_uno_blank_count" class="retro-input num-input" />
          <span>個字母</span>
        </div>
      </div>
      <div class="field-row">
        <label>🔥 解鎖失敗扣血：</label>
        <div class="input-group">
          <input type="number" min="0" max="50" v-model="config.tarot_uno_penalty" class="retro-input num-input" />
          <span>HP</span>
        </div>
      </div>
      <div class="field-row">
        <label>⚔️ 清空手牌大絕傷害：</label>
        <div class="input-group">
          <input type="number" min="0" max="50" v-model="config.tarot_uno_win_damage" class="retro-input num-input" />
          <span>HP</span>
        </div>
      </div>


      <div class="field-row">
          <label>🚫 逃跑禁賽門檻：</label>
          <div class="input-group">
            <span>單日逃走達</span>
            <input type="number" min="1" max="100" v-model="config.tarot_uno_max_escapes" class="retro-input num-input" style="width: 50px;" />
            <span>次，當日禁玩</span>
          </div>
        </div>
    </div>

    <div class="setting-card highlight-item" style="background: #e0f2f1; border-color: #00695c;">
        <h3 class="card-title tenchi" style="background: #00695c; color: #fff; border-color: #00695c;">⚔️ 單字吞食天地 (連線對戰)</h3>
        
        <div class="field-row" style="margin-bottom: 10px;">
          <label>❤️ 武將初始兵力(血量)：</label>
          <div class="input-group">
            <input type="number" min="10" max="500" v-model="config.tenchi_hp" class="retro-input num-input" />
            <span>點</span>
          </div>
        </div>

        <div class="field-row">
            <label>✨ 初始SP：</label>
            <div class="input-group"><input type="number" v-model="config.tenchi_sp" class="retro-input num-input" />點</div>
        </div>

        <div class="field-row" style="margin-bottom: 10px;">
          <label>🗡️ 基礎物理傷害範圍：</label>
          <div class="input-group">
            <input type="number" min="1" max="100" v-model="config.tenchi_min_dmg" class="retro-input num-input" style="width: 70px;"/>
            <span>~</span>
            <input type="number" min="1" max="100" v-model="config.tenchi_max_dmg" class="retro-input num-input" style="width: 70px;"/>
            <span>點</span>
          </div>
        </div>
        
        <div class="field-row" style="margin-bottom: 10px;">
          <label>🏃 撤退成功機率：</label>
          <div class="input-group">
            <input type="number" min="0" max="100" v-model="config.tenchi_escape_rate" class="retro-input num-input" />
            <span>% (失敗全軍扣 10 滴血)</span>
          </div>
        </div>

        <div class="field-row" style="margin-bottom: 10px;">
          <label>🚫 逃跑禁賽門檻：</label>
          <div class="input-group">
            <span>單日逃走達</span>
            <input type="number" min="1" max="100" v-model="config.tenchi_max_escapes" class="retro-input num-input" style="width: 50px;" /> 
            <span>次，當日禁玩</span>
          </div>
        </div>
        
        <div class="field-row" style="margin-bottom: 10px;">
          <label>🎖️ 解鎖陣型所需勝場：</label>
          <div class="input-group">
            <input type="number" min="1" max="100" v-model="config.tenchi_wins_per_formation" class="retro-input num-input" />
            <span>場 / 每個新陣型</span>
          </div>
        </div>

        <div class="field-row" style="margin-bottom: 10px;">
          <label>🔠 單字挖空數量：</label>
          <div class="input-group">
            <input type="number" min="1" max="10" v-model="config.tenchi_blank_count" class="retro-input num-input" />
            <span>個字母</span>
          </div>
        </div>

        <div style="margin-top: 20px; border-top: 3px dashed #00897b; padding-top: 15px;">
           <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #00695c; font-size: 1.1rem;">👤 武將基礎能力值設定 (攻/防/智/迴避%)：</label>
           <div style="display: flex; gap: 15px; flex-wrap: wrap;">
               <div style="background: #fff; padding: 10px; border: 2px solid #ccc; border-radius: 8px;">
                  <strong style="display:block; margin-bottom: 5px;">🤖 一般武將</strong>
                  攻 <input type="number" v-model="config.tenchi_base_atk" class="retro-input" style="width:50px"/>
                  防 <input type="number" v-model="config.tenchi_base_def" class="retro-input" style="width:50px"/>
                  智 <input type="number" v-model="config.tenchi_base_int" class="retro-input" style="width:50px"/>
                  避 <input type="number" v-model="config.tenchi_base_eva" class="retro-input" style="width:50px"/>%
               </div>
               <div style="background: #fff; padding: 10px; border: 2px solid #d32f2f; border-radius: 8px;">
                  <strong style="display:block; margin-bottom: 5px; color: #d32f2f;">👑 玩家親自上陣專屬</strong>
                  攻 <input type="number" v-model="config.tenchi_player_atk" class="retro-input" style="width:50px"/>
                  防 <input type="number" v-model="config.tenchi_player_def" class="retro-input" style="width:50px"/>
                  智 <input type="number" v-model="config.tenchi_player_int" class="retro-input" style="width:50px"/>
                  避 <input type="number" v-model="config.tenchi_player_eva" class="retro-input" style="width:50px"/>%
               </div>
           </div>
        </div>

        <div style="margin-top: 15px; border-top: 2px dashed #00897b; padding-top: 10px;">
           <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #00695c;">🛡️ 陣型各站位 攻擊/防禦 倍率 (1~5位)：</label>
           <div v-for="(cfg, fName) in config.tenchi_formations_config" :key="fName" style="margin-bottom: 12px; font-size: 0.85rem; background: #f5f5f5; padding: 5px; border-radius: 5px; color: #333;">
              <div style="font-weight: bold; color: #d32f2f; margin-bottom: 4px;">{{ fName }}</div>
              <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px; flex-wrap: wrap;">
                 <span style="width: 40px;">攻(atk)</span>
                 <input v-for="(val, idx) in cfg.atk" :key="'a'+idx" type="number" step="0.1" min="0" max="3" v-model.number="config.tenchi_formations_config[fName].atk[idx]" class="retro-input" style="width: 50px; padding: 2px; text-align: center;"/>
              </div>
              <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                 <span style="width: 40px;">防(def)</span>
                 <input v-for="(val, idx) in cfg.def" :key="'d'+idx" type="number" step="0.1" min="0" max="3" v-model.number="config.tenchi_formations_config[fName].def[idx]" class="retro-input" style="width: 50px; padding: 2px; text-align: center;"/>
              </div>
           </div>
        </div>

        <div style="margin-top: 15px; border-top: 2px dashed #00897b; padding-top: 10px;">
           <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #00695c;">📜 策略解鎖門檻與威力/消耗：</label>
           <div v-for="(strat, sName) in config.tenchi_strategies_config" :key="sName" style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.9rem; background: #fff; padding: 5px; border-radius: 5px; border: 1px solid #ccc; color:#333;">
              <span style="width: 60px; font-weight: bold; color: #d32f2f;">{{ sName }}</span>
              <span>解鎖需</span>
              <input type="number" min="0" max="999" v-model.number="config.tenchi_strategies_config[sName].unlockWins" class="retro-input" style="width: 55px; padding: 4px; text-align: center;"/>
              <span>勝 | SP消耗</span>
              <input type="number" min="0" max="100" v-model.number="config.tenchi_strategies_config[sName].cost" class="retro-input" style="width: 50px; padding: 4px; text-align: center;"/>
              <span>| {{ strat.type === 'dispel' ? '無威力' : '威力數值' }}</span>
              <input v-if="strat.type !== 'dispel'" type="number" min="1" max="500" v-model.number="config.tenchi_strategies_config[sName].power" class="retro-input" style="width: 55px; padding: 4px; text-align: center;"/>
              <span style="color: #888; font-size: 0.8rem; margin-left: 5px;">({{ strat.desc }})</span>
           </div>
        </div>

    </div>

  </div>

  <div class="settings-card retro-element" style="border-color: #3f51b5; margin-top: 20px;">
  <h3 style="color: #303f9f;">🌀 動詞變化大師 專屬設定</h3>
  <div class="form-grid">
    <div class="form-group">
      <label>鍵盤旋轉速度 (秒/圈)</label>
      <input type="number" v-model="settings.verbing_keyboard_speed" class="retro-input" min="1">
      <small>預設 20 秒，越小轉越快！</small>
    </div>
    <div class="form-group">
      <label>送出錯誤扣分</label>
      <input type="number" v-model="settings.verbing_wrong_penalty" class="retro-input" min="0">
      <small>預設扣 3 分</small>
    </div>
    <div class="form-group">
      <label>每題作答時限 (秒)</label>
      <input type="number" v-model="settings.verbing_time_limit" class="retro-input" min="5">
      <small>預設 20 秒</small>
    </div>
    <div class="form-group">
      <label>超時每秒扣分</label>
      <input type="number" v-model="settings.verbing_time_penalty" step="0.1" class="retro-input" min="0">
      <small>預設 0.5 分</small>
    </div>
  </div>
</div>
</template>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
.setting-item { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; background: var(--tab-bg); padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); font-weight: bold; color: var(--text-main); gap: 10px; }
.highlight-item { border-width: 3px; }
.multi-input { display: flex; align-items: center; gap: 5px; font-size: 0.9rem; flex-wrap: wrap; }
.num-input { width: 65px; text-align: center; padding: 5px; font-size: 1rem; background: var(--input-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: 4px; outline: none; }
.retro-input { padding: 8px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background: var(--input-bg); color: var(--text-main); font-family: inherit; font-weight: bold; }

.setting-card { background: var(--tab-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.card-title { margin: -15px -15px 15px -15px; padding: 10px 15px; font-weight: 900; font-size: 1.1rem; border-bottom: var(--border-width) solid var(--border-color); border-radius: var(--radius-element) var(--radius-element) 0 0; }
.field-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 0.95rem; font-weight: bold; color: var(--text-main); }
.input-group { display: flex; align-items: center; gap: 5px; }
</style>
