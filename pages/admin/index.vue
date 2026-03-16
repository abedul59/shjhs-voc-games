<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminGeneralSettings from '~/components/admin/AdminGeneralSettings.vue';
import AdminGameSettings from '~/components/admin/AdminGameSettings.vue';
import AdminThemeSettings from '~/components/admin/AdminThemeSettings.vue';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();
const isLoading = ref(true);

// 判斷登入者身分
const isAdminCookie = useCookie('isAdmin');
const authCookie = useCookie('teacher_auth');

// 🌟 精準判斷是否為總管理員：舊版殘留、isAdmin 值，或是新版 authCookie 權限包含 'ALL'
const isSuperAdmin = computed(() => {
  return isAdminCookie.value === true || 
         isAdminCookie.value === 'superadmin' || 
         (authCookie.value && authCookie.value.classes && authCookie.value.classes.includes('ALL'));
});

// 系統預設設定
const config = ref({
  system_name: '單字領域展開', announcement: '', school_name: '新化國中', school_phone: '065902269',
  auto_logout_minutes: 10, anti_cheat_enabled: true, anti_cheat_cooldown: 5,
  stroke_limit_window: 1, stroke_limit_count: 1, stroke_cooldown: 3,
  match_game_time_limit: 60, match_penalty: 2, move_game_time_limit: 20, move_penalty: 2,
  choice_game_time_limit: 20, choice_penalty: 2, fill_game_time_limit: 20, fill_penalty: 2,
  sentence_game_time_limit: 15, sentence_penalty: 2,
  listen_game_time_limit: 20, listen_penalty: 2, listen_hint_penalty: 2,
  puzzle_game_time_limit: 30, puzzle_max_score: 20, puzzle_penalty: 0.5, puzzle_card_set: '1',
  match_base_score_per_pair: 10, match_bonus_tier1_time: 10, match_bonus_tier1_score: 20,
  match_bonus_tier2_time: 15, match_bonus_tier2_score: 15, match_bonus_tier3_time: 20, match_bonus_tier3_score: 10,
  theme_mode: 'always_on', theme_favorites: [], theme_task_version: '翰林', theme_task_volume: 'B1', theme_task_unit: 'U1', theme_task_count: 10, theme_task_score: 70,
  bgm_mode: 'always_off', school_days: [1,2,3,4,5], school_start_time: '07:30', school_end_time: '16:00',
  bgm_task_version: '翰林', bgm_task_volume: 'B1', bgm_task_unit: 'U1', bgm_task_count: 10, bgm_task_score: 70,
  speak_max_score: 10, speak_retry_penalty: 3, speak_skip_penalty: 3,
  cross_game_time_limit: 60, cross_max_score: 20, cross_penalty: 3,
  
  // 🌟 新增：單字複習趣設定
  voc_review_game_time_limit: 60, voc_review_max_score: 100, voc_review_penalty: 2,
  
  // 🌟 新增：單字方塊陣 (PVP) 旋轉速度設定
  // 🌟 單字方塊陣 (PVP) 設定
  pvp_spin_speed: 15, 
  pvp_target_score: 5,
  pvp_correct_points: 20,
  pvp_penalty_points: 3,
  
  // 🌟 新增：單字俄羅斯方塊 挖空數量設定
  tetris_blank_count: 5, 
  // 🎰 彈珠台設定
  pinball_blank_count: 2,
  pinball_penalty_points: 2,
  // 🐦 憤怒鳥設定
  angrybirds_blank_count: 3,
  angrybirds_penalty_points: 2,

  // ⚔️ 吞食天地設定
// ⚔️ 吞食天地設定
  tenchi_hp: 100,
  tenchi_sp: 40, // 🌟 新增：初始 SP 設定
  tenchi_min_dmg: 5,
  tenchi_max_dmg: 15,
  tenchi_escape_rate: 50, // 撤退成功率預設 50%
  tenchi_wins_per_formation: 8, // 🌟 新增：每 8 勝解鎖一個陣型
  tenchi_blank_count: 3, // 🌟 新增：預設挖空 3 個字母
  tenchi_formations_config: {
      '散開之陣': [1.0, 1.0, 1.0, 1.0, 1.0],
      '鶴翼之陣': [1.1, 1.2, 1.4, 1.2, 1.1],
      '衝方之陣': [1.3, 0.7, 1.3, 0.7, 1.3],
      '白馬之陣': [1.1, 1.1, 1.1, 1.1, 1.1],
      '魚鱗之陣': [0.0, 1.2, 1.4, 1.2, 0.0],
      '鋒矢之陣': [0.0, 0.9, 1.5, 0.9, 0.0],
      '一文字之陣': [1.3, 1.3, 1.3, 1.3, 1.3],
      '背水之陣': [1.5, 1.5, 1.5, 1.5, 1.5],
      '靜寂之陣': [0.6, 0.6, 0.6, 0.6, 0.6],
      '八卦之陣': [1.2, 0.8, 1.3, 0.8, 1.2]
  },
  tenchi_strategies_config: {}, // 🌟 新增策略預設空物件
});

onMounted(async () => {
  if (isSuperAdmin.value) {
    const { data } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (data) {
      Object.keys(config.value).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) config.value[key] = data[key];
      });
    }
  }
  isLoading.value = false;
});

const saveSettings = async () => {
  if (!isSuperAdmin.value) return;
  const { error } = await supabase.from('system_settings').update(config.value).eq('id', 1);
  if (error) alert('更新失敗：' + error.message); else alert('✅ 系統設定更新成功！');
};
</script>

<template>
  <div class="admin-container">
    
    <div class="header">
      <h1>{{ isSuperAdmin ? '🛠️ 網站管理員後台' : '👨‍🏫 英語教師後台' }}</h1>
      <p>{{ isSuperAdmin ? 'SYSTEM ADMIN DASHBOARD' : 'TEACHER DASHBOARD' }}</p>
    </div>
    
    <div class="actions">
      <NuxtLink to="/admin/records" class="retro-btn record-btn">🏆 紀錄報表</NuxtLink>
      <NuxtLink to="/admin/stats" class="retro-btn stats-btn">📈 對錯分析</NuxtLink>
      <NuxtLink to="/admin/leaderboard" class="retro-btn test-btn">🏅 英雄榜</NuxtLink>
      <NuxtLink to="/admin/logs" class="retro-btn log-btn">🕒 登入紀錄</NuxtLink>
      <NuxtLink to="/admin/students" class="retro-btn student-btn" style="grid-column: span 2;">🧑‍🎓 學生名單管理</NuxtLink>

      <template v-if="isSuperAdmin">
        <NuxtLink to="/admin/teacher-logs" class="retro-btn" style="background: #e91e63; color: white; border-color: #c2185b; box-shadow: 0 4px 0 #c2185b;">🕵️ 教師足跡追蹤</NuxtLink>
        <NuxtLink to="/admin/student-logs" class="retro-btn test-btn">👣 學生足跡</NuxtLink>
        <NuxtLink to="/admin/teachers" class="retro-btn teacher-btn" style="grid-column: span 2; background: #9c27b0; color: white;">👨‍🏫 教師權限管理</NuxtLink>
        <NuxtLink to="/admin/vocabularies" class="retro-btn vocab-btn">📝 編輯單字庫</NuxtLink>
        <NuxtLink to="/admin/tarot-manager" class="retro-btn tarot-btn">🔮 塔羅牌管理</NuxtLink>
        <NuxtLink to="/admin/tenchi-manager" class="admin-card retro-element">
        <div class="card-icon">🐎</div>
        <h2>吞食天地兵法庫</h2>
        <p>手動解鎖學生的陣型與策略</p>
         </NuxtLink>
      </template>
    </div>

    <div class="admin-panel retro-element" style="margin-top: 20px;" v-if="isSuperAdmin">
      <h2>⚙️ 系統綜合設定</h2>
      <p v-if="isLoading" style="text-align: center;">⏳ 讀取設定中...</p>
      
      <div v-else class="settings-grid">
        <AdminGeneralSettings :config="config" />
        <AdminGameSettings :config="config" />
        <AdminThemeSettings :config="config" />
      </div>
      
      <button class="retro-btn save-settings-btn" @click="saveSettings">💾 儲存所有設定</button>
    </div>

    <NuxtLink to="/" class="retro-btn exit-btn">🚪 登出返回首頁</NuxtLink>
  </div>
</template>

<style scoped>
.admin-container { min-height: 100vh; padding: 30px 20px; display: flex; flex-direction: column; align-items: center; }
.header { text-align: center; margin-bottom: 30px; } .header h1 { font-size: 2.5rem; color: var(--text-main); margin: 0; font-weight: 900; }
.admin-panel { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); padding: 30px 20px; box-shadow: var(--shadow-box); width: 100%; max-width: 700px; margin-bottom: 20px; }
.admin-panel h2 { margin-top: 0; color: var(--text-main); font-weight: 900; font-size: 1.5rem; border-bottom: 2px dashed var(--border-color); padding-bottom: 15px;}
.settings-grid { display: flex; flex-direction: column; margin: 20px 0; }

.save-settings-btn { background-color: var(--btn-primary-bg); color: var(--btn-primary-text); width: 100%; margin-top: 10px; font-size: 1.3rem;}
.retro-btn { display: flex; justify-content: center; align-items: center; padding: 15px 25px; color: var(--text-main); text-decoration: none; font-size: 1.1rem; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); cursor: pointer; transition: all 0.15s; text-align: center;}
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; max-width: 700px; margin-bottom: 20px;}
.record-btn { background-color: var(--btn-secondary-bg); color: var(--btn-secondary-text); } 
.stats-btn { background-color: var(--info-bg); color: var(--text-main); }
.student-btn { background-color: var(--btn-primary-bg); color: var(--btn-primary-text); } 
.test-btn { background-color: var(--tab-bg); color: var(--text-main); }
.log-btn { background-color: #ff9800; color: white; border-color: #e65100; }
.vocab-btn { background: var(--tab-active-bg); color: var(--tab-active-text); }
.tarot-btn { background: #673ab7; color: white; }
.teacher-btn { border-color: #7b1fa2 !important; box-shadow: 0 4px 0 #7b1fa2 !important; }

.exit-btn { background-color: var(--tab-bg); color: var(--text-main); width: 100%; max-width: 700px; margin-bottom: 50px; margin-top: 10px;}

@media (max-width: 600px) { 
  .actions { grid-template-columns: 1fr; } 
  .retro-btn { grid-column: span 1 !important; }
}
</style>