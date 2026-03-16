<script setup>
const props = defineProps({ config: Object });
</script>

<template>
  <div class="settings-section">
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

    <div class="setting-item">
      <label>🧩 單字拼起來 (每題):</label>
      <div class="multi-input">
        牌套: 
        <select v-model="config.puzzle_card_set" class="retro-input num-input" style="width: 85px; margin-right: 5px;">
          <option value="1">第一套</option>
          <option value="2">第二套</option>
          <option value="3">第三套</option>
          <option value="random">隨機亂</option>
        </select>|
        限時<input type="number" v-model="config.puzzle_game_time_limit" class="retro-input num-input" />秒, 
        滿分<input type="number" v-model="config.puzzle_max_score" class="retro-input num-input" />分, 
        每秒扣<input type="number" step="0.5" v-model="config.puzzle_penalty" class="retro-input num-input" />分
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
        🌪️ 惡魔鍵盤旋轉一圈需 <input type="number" step="0.5" min="0" v-model="config.pvp_spin_speed" class="retro-input num-input" style="width: 60px;" /> 秒 
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

    <div class="setting-card highlight-item" style="background: #ffe0b2; border-color: #ff9800;">
        <h3 class="card-title angrybirds" style="background: #ffcdd2; color: #b71c1c; border-color: #f44336;">🐦 單字憤怒鳥</h3>
        
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

    <div class="setting-card highlight-item" style="background: #e0f2f1; border-color: #00897b; padding: 20px;">
        <h3 class="card-title tenchi" style="color: #00695c; font-size:1.4rem; margin-top:0;">⚔️ 單字吞食天地 (連線對戰)</h3>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="field-row">
              <label>❤️ 初始血量：</label>
              <div class="input-group"><input type="number" v-model="config.tenchi_hp" class="retro-input num-input" />點</div>
            </div>
            <div class="field-row">
              <label>✨ 初始SP：</label>
              <div class="input-group"><input type="number" v-model="config.tenchi_sp" class="retro-input num-input" />點</div>
            </div>
            <div class="field-row">
              <label>🗡️ 基礎傷害亂數範圍：</label>
              <div class="input-group">
                <input type="number" v-model="config.tenchi_min_dmg" class="retro-input num-input" style="width: 50px;"/> ~
                <input type="number" v-model="config.tenchi_max_dmg" class="retro-input num-input" style="width: 50px;"/> 點
              </div>
            </div>
            <div class="field-row">
              <label>🏃 撤退成功機率：</label>
              <div class="input-group"><input type="number" v-model="config.tenchi_escape_rate" class="retro-input num-input" />%</div>
            </div>
            <div class="field-row">
              <label>🔠 單字挖空數：</label>
              <div class="input-group"><input type="number" v-model="config.tenchi_blank_count" class="retro-input num-input" />個</div>
            </div>
            <div class="field-row">
              <label>🎖️ 陣型解鎖需：</label>
              <div class="input-group"><input type="number" v-model="config.tenchi_wins_per_formation" class="retro-input num-input" />勝</div>
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

        <div style="margin-top: 20px; border-top: 3px dashed #00897b; padding-top: 15px;">
           <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #00695c; font-size: 1.1rem;">📜 策略門檻、耗SP、威力與兵法書說明：</label>
           <div v-for="(strat, sName) in config.tenchi_strategies_config" :key="sName" style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; background: #fff; padding: 8px; border-radius: 5px; border: 1px solid #ccc;">
              <span style="width: 60px; font-weight: bold; color: #d32f2f;">{{ sName }}</span>
              <span>解鎖需</span><input type="number" v-model.number="config.tenchi_strategies_config[sName].unlockWins" class="retro-input" style="width: 50px; padding: 4px; text-align: center;"/><span>勝</span>
              <span style="margin-left: 5px;">耗SP</span><input type="number" v-model.number="config.tenchi_strategies_config[sName].cost" class="retro-input" style="width: 50px; padding: 4px; text-align: center;"/>
              <template v-if="!['dispel', 'assassinate', 'escape'].includes(strat.type)">
                  <span style="margin-left: 5px;">威力</span><input type="number" v-model.number="config.tenchi_strategies_config[sName].power" class="retro-input" style="width: 50px; padding: 4px; text-align: center;"/>
              </template>
              <template v-else><span style="margin-left: 5px; width: 85px; text-align: center; color: #888; font-size: 0.8rem;">(無威力數值)</span></template>
              <div style="flex-basis: 100%; display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                  <span style="color: #00695c; font-weight: bold;">說明：</span><input type="text" v-model="config.tenchi_strategies_config[sName].desc" class="retro-input" style="flex: 1; padding: 6px;"/>
              </div>
           </div>
        </div>

        <div style="margin-top: 20px; border-top: 3px dashed #00897b; padding-top: 15px;">
           <label style="display: block; margin-bottom: 10px; font-weight: bold; color: #00695c; font-size: 1.1rem;">🛡️ 陣型各站位基礎倍率 (1~5位)：</label>
           <div v-for="(mults, fName) in config.tenchi_formations_config" :key="fName" style="display: flex; align-items: center; gap: 5px; margin-bottom: 6px; background: #fff; padding: 6px; border-radius: 5px; border: 1px solid #ccc;">
              <span style="width: 90px; font-weight: bold;">{{ fName }}</span>
              <input v-for="(val, idx) in mults" :key="idx" type="number" step="0.1" min="0" max="3" v-model.number="config.tenchi_formations_config[fName][idx]" class="retro-input" style="width: 50px; padding: 4px; text-align: center;"/>
           </div>
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

.setting-card { background: #fff; border: 3px solid #ccc; border-radius: 12px; padding: 20px; box-shadow: 0 4px 0 #ccc; margin-bottom: 15px;}
.card-title { margin: -20px -20px 20px -20px; padding: 15px; border-radius: 9px 9px 0 0; border-bottom: 3px solid; font-weight: 900; font-size: 1.2rem; }
.field-row { margin-bottom: 15px; }
.field-row label { display: block; font-weight: bold; color: #555; margin-bottom: 5px; font-size: 0.95rem; }
.input-group { display: flex; align-items: center; gap: 10px; }
.input-group span { font-weight: bold; color: #777; font-size: 0.9rem; }
</style>