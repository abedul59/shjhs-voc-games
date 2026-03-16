<script setup>
import { allThemes } from '~/utils/themes';
const props = defineProps({ config: Object });

const versionOptions = ['翰林', '康軒', '南一'];
const volumeOptions = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
const unitOptions = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'Review 1', 'Review 2', 'Review 3'];
</script>

<template>
  <div class="settings-section">
    <div class="setting-item highlight-item bgm-panel" style="border-color: #9c27b0;">
      <label class="panel-title" style="color: #9c27b0; border-bottom-color: #9c27b0;">🎨 介面風格開放模式</label>
      <select v-model="config.theme_mode" class="retro-input select-full">
        <option value="always_off">🔴 完全關閉 (全站強制預設風格)</option>
        <option value="always_on">🟢 完全開放 (學生自由選全部)</option>
        <option value="custom_favorites">⭐ 自選預設最愛 (自選多款輪播)</option>
        <option value="achievement_unlock">🏆 成績達標解鎖 (盲盒機制)</option>
      </select>
      
      <div v-if="config.theme_mode === 'custom_favorites'" class="sub-box">
        <p><strong>勾選開放給學生的預設風格 (可複選)：</strong></p>
        <div class="themes-grid">
          <label v-for="theme in allThemes" :key="theme.id" class="theme-checkbox" :title="theme.desc">
            <input type="checkbox" :value="theme.id" v-model="config.theme_favorites" />
            <span>{{ theme.name }}</span>
          </label>
        </div>
      </div>

      <div v-if="config.theme_mode === 'achievement_unlock'" class="sub-box">
        <p><strong>🎁 盲盒解鎖任務條件：</strong></p>
        <div class="task-inputs">
          <select v-model="config.theme_task_version" class="retro-input short-input"><option v-for="v in versionOptions" :key="v" :value="v">{{ v }}</option></select>
          <select v-model="config.theme_task_volume" class="retro-input short-input"><option v-for="vol in volumeOptions" :key="vol" :value="vol">{{ vol }}</option></select>
          <select v-model="config.theme_task_unit" class="retro-input short-input"><option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option></select>
        </div>
        <div class="task-conditions" style="margin-top:10px;">完成該單元遊戲 <input type="number" v-model="config.theme_task_count" class="retro-input num-input"> 次, 且平均 <input type="number" v-model="config.theme_task_score" class="retro-input num-input"> 分以上。</div>
      </div>
    </div>

    <div class="setting-item highlight-item bgm-panel">
      <label class="panel-title">🎵 背景音樂開放模式</label>
      <select v-model="config.bgm_mode" class="retro-input select-full">
        <option value="always_off">🔴 完全關閉</option><option value="always_on">🟢 完全開放</option>
        <option value="school_hours_off">🏫 上學時間關閉 (下課才開放)</option><option value="achievement_unlock">🏆 成績達標解鎖</option>
      </select>
      
      <div v-if="config.bgm_mode === 'school_hours_off'" class="sub-box">
        <p><strong>禁止播放日：</strong></p>
        <div class="checkbox-group">
          <label v-for="d in [{n:'一',v:1},{n:'二',v:2},{n:'三',v:3},{n:'四',v:4},{n:'五',v:5},{n:'六',v:6},{n:'日',v:0}]" :key="d.v">
            <input type="checkbox" :value="d.v" v-model="config.school_days">{{ d.n }}
          </label>
        </div>
        <p style="margin-top:10px;"><strong>禁止時段：</strong></p>
        <div class="time-group"><input type="time" v-model="config.school_start_time" class="retro-input num-input"> 到 <input type="time" v-model="config.school_end_time" class="retro-input num-input"></div>
      </div>

      <div v-if="config.bgm_mode === 'achievement_unlock'" class="sub-box">
        <p><strong>🎧 音樂解鎖任務條件：</strong></p>
        <div class="task-inputs">
          <select v-model="config.bgm_task_version" class="retro-input short-input"><option v-for="v in versionOptions" :key="v" :value="v">{{ v }}</option></select>
          <select v-model="config.bgm_task_volume" class="retro-input short-input"><option v-for="vol in volumeOptions" :key="vol" :value="vol">{{ vol }}</option></select>
          <select v-model="config.bgm_task_unit" class="retro-input short-input"><option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option></select>
        </div>
        <div class="task-conditions" style="margin-top:10px;">完成該單元遊戲 <input type="number" v-model="config.bgm_task_count" class="retro-input num-input"> 次, 且平均 <input type="number" v-model="config.bgm_task_score" class="retro-input num-input"> 分以上。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-section { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
.setting-item { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; background: var(--tab-bg); padding: 15px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); font-weight: bold; color: var(--text-main); gap: 10px; }
.highlight-item { background: var(--info-bg); border-color: var(--text-main); }
.bgm-panel { flex-direction: column; align-items: flex-start; gap: 10px; }
.panel-title { width: 100%; font-size: 1.1rem; border-bottom: 1px dashed var(--border-color); padding-bottom: 5px; } 
.select-full { width: 100%; padding: 10px; font-size: 1rem; font-weight: bold; }
.sub-box { background: var(--box-bg); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); width: 100%; box-sizing: border-box; }
.checkbox-group { display: flex; gap: 10px; flex-wrap: wrap; } .checkbox-group label { cursor: pointer; display: flex; align-items: center; gap: 3px; }
.task-inputs { display: flex; justify-content: space-between; gap: 5px; }
.themes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; max-height: 250px; overflow-y: auto; padding-right: 5px; margin-top: 10px; }
.theme-checkbox { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; cursor: pointer; background: var(--box-bg); padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; transition: all 0.2s;}
.theme-checkbox:hover { border-color: var(--success-color); }
.theme-checkbox input { accent-color: var(--text-main); width: 16px; height: 16px; cursor: pointer; }
.num-input { width: 60px; text-align: center; padding: 5px; font-size: 1rem; background: var(--input-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: 4px; outline: none; }
.short-input { width: 32%; padding: 8px 5px; text-align: center; font-weight: bold; background: var(--input-bg); color: var(--text-main); border: var(--border-width) solid var(--border-color); border-radius: 4px;}
.retro-input { border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background: var(--input-bg); color: var(--text-main); font-family: inherit; font-weight: bold; }
</style>