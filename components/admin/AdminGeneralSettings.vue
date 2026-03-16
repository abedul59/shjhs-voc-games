<script setup>
const props = defineProps({ config: Object });
</script>

<template>
  <div class="settings-section">
    <div class="setting-item highlight-item" style="flex-direction: column; align-items: stretch; gap: 10px; background: #e8f5e9; border-color: #4caf50;">
      <label style="color: #2e7d32; font-size: 1.1rem; border-bottom: 1px dashed #a5d6a7; padding-bottom: 5px;">📢 系統看板與首頁資訊</label>
      <div class="multi-input">
        系統名稱：<input type="text" v-model="config.system_name" class="retro-input" style="flex:1;" placeholder="例：單字領域展開" />
      </div>
      <div class="multi-input">
        跑馬燈公告：<input type="text" v-model="config.announcement" class="retro-input" style="flex:1;" placeholder="例：期末考將近，請同學們踴躍挑戰！" />
      </div>
    </div>

    <div class="setting-item highlight-item" style="flex-direction: column; align-items: stretch; gap: 10px; background: #ffebee; border-color: #d32f2f;">
      <label style="color: #c62828; font-size: 1.1rem; border-bottom: 1px dashed #ef9a9a; padding-bottom: 5px;">🛡️ 設備防盜用與自動登出機制</label>
      <div style="font-size: 0.95rem; font-weight: bold; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <label style="cursor:pointer;"><input type="checkbox" v-model="config.anti_cheat_enabled" style="accent-color: #d32f2f;"> 啟用設備指紋偵測 (防共用)</label>
        <div v-if="config.anti_cheat_enabled">同一台設備切換不同帳號，須間隔 <input type="number" v-model="config.anti_cheat_cooldown" class="retro-input num-input" style="border-color:#d32f2f;"> 分鐘。</div>
      </div>
      <div style="font-size: 0.95rem; font-weight: bold; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top:5px;">
        閒置超過 <input type="number" v-model="config.auto_logout_minutes" class="retro-input num-input" style="border-color:#d32f2f;"> 分鐘未操作，系統自動將學生登出。
      </div>
    </div>

    <div class="setting-item highlight-item" style="flex-direction: column; align-items: stretch; gap: 10px;">
      <label style="color: var(--danger-color); font-size: 1.1rem; border-bottom: 1px dashed var(--border-color); padding-bottom: 5px;">🏫 學校資訊與密碼查詢防刷</label>
      <div style="display: flex; gap: 10px;"><input type="text" v-model="config.school_name" class="retro-input" placeholder="學校名稱" style="flex: 1;" /><input type="text" v-model="config.school_phone" class="retro-input" placeholder="學校市話 (例:065902269)" style="flex: 1;" /></div>
      <div style="font-size: 0.95rem; font-weight: bold; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top:5px;">
        每 <input type="number" v-model="config.stroke_limit_window" class="retro-input num-input"> 分鐘內，只能查 <input type="number" v-model="config.stroke_limit_count" class="retro-input num-input"> 次密碼，否則鎖定 <input type="number" v-model="config.stroke_cooldown" class="retro-input num-input"> 分鐘。
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
.setting-item { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; background: var(--tab-bg); padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); font-weight: bold; color: var(--text-main); gap: 10px; }
.highlight-item { background: var(--info-bg); border-color: var(--text-main); }
.multi-input { display: flex; align-items: center; gap: 5px; font-size: 0.9rem; width: 100%; }
.num-input { width: 55px; text-align: center; padding: 5px; font-size: 1rem; background: var(--input-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: 4px; outline: none; }
.retro-input { padding: 8px 12px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background: var(--input-bg); color: var(--text-main); font-family: inherit; font-weight: bold; }
</style>