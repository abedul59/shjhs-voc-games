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

// 🌟 精準判斷是否為總管理員
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
  puzzle_game_time_limit: 30, puzzle_max_score: 20, puzzle_penalty: 0.5, puzzle_card_set: '1', puzzle_card_set_kangxuan: '1k',
  match_base_score_per_pair: 10, match_bonus_tier1_time: 10, match_bonus_tier1_score: 20,
  match_bonus_tier2_time: 15, match_bonus_tier2_score: 15, match_bonus_tier3_time: 20, match_bonus_tier3_score: 10,
  theme_mode: 'always_on', theme_favorites: [], theme_task_version: '翰林', theme_task_volume: 'B1', theme_task_unit: 'U1', theme_task_count: 10, theme_task_score: 70,
  bgm_mode: 'always_off', school_days: [1,2,3,4,5], school_start_time: '07:30', school_end_time: '16:00',
  bgm_task_version: '翰林', bgm_task_volume: 'B1', bgm_task_unit: 'U1', bgm_task_count: 10, bgm_task_score: 70,
  speak_max_score: 10, speak_retry_penalty: 3, speak_skip_penalty: 3,
  cross_game_time_limit: 60, cross_max_score: 20, cross_penalty: 3,
  voc_review_game_time_limit: 60, voc_review_max_score: 100, voc_review_penalty: 2,
  pvp_spin_speed: 15, pvp_target_score: 5, pvp_correct_points: 20, pvp_penalty_points: 3, pvp_max_escapes: 20,
  bgm_source: 'github',
  tetris_blank_count: 5, pinball_blank_count: 2, pinball_penalty_points: 2,
  angrybirds_blank_count: 3, angrybirds_penalty_points: 2,
  solitaire_time_limit: 300, solitaire_penalty: 5, solitaire_blank_count: 3,
  pikavolley_time_limit: 180, pikavolley_penalty: 5, pikavolley_blank_count: 3, pikavolley_unlock_time: 20, 
  pacman_time_limit: 180, pacman_penalty: 5, pacman_blank_count: 4, pacman_free_time: 5,
  minesweeper_time_limit: 300, minesweeper_penalty: 5, minesweeper_board_size: 7,
  sudoku_time_limit: 600, sudoku_penalty: 5, sudoku_blank_count: 45,
  speak_word_score: 10, speak_word_penalty: 2, speak_sentence_score: 100, speak_sentences: '',
  p2m_card_set: '1', p2m_card_set_kangxuan: '1k', p2m_score_per_q: 10, p2m_penalty: 3,
  examListen1_card_set: '1', examListen1_card_set_kangxuan: '1k', examListen1_score_per_q: 10, examListen1_penalty: 3, examListen1_hint_penalty: 3,
  disabled_games: [], locked_units: [], restrict_play_time: false, allow_play_days: [1, 2, 3, 4, 5, 6, 0], allow_play_start: '08:00', allow_play_end: '17:00',
  tarot_uno1_card_set: '1', tarot_uno1_card_set_kangxuan: '1k', tarot_uno1_time_limit: 600, tarot_uno1_penalty: 3, tarot_uno1_blank_count: 3,
  tarot21solo_card_set: '1', tarot21solo_card_set_kangxuan: '1k', tarot21solo_hp: 30, tarot21solo_time_limit: 600, tarot21solo_penalty: 3, tarot21solo_win_damage: 10, tarot21solo_blank_count: 3,
  tarot_alch1_card_set: '1', tarot_alch1_card_set_kangxuan: '1k', tarot_alch1_time_limit: 600, tarot_alch1_penalty: 3, tarot_alch1_blank_count: 3, 
  examRead2_time_limit: 240,


  // ✨ 加入這一行
  login_blocked_message: '⚠️ 目前為系統管制時間，暫不開放登入喔！',

  ninja_time_limit: 300, ninja_penalty: 3,
  tenchi_hp: 100, tenchi_sp: 40, tenchi_min_dmg: 5, tenchi_max_dmg: 15, tenchi_escape_rate: 50, tenchi_wins_per_formation: 8, tenchi_blank_count: 3, 
  tenchi_base_atk: 10, tenchi_base_def: 10, tenchi_base_int: 10, tenchi_base_eva: 10, tenchi_player_atk: 15, tenchi_player_def: 15, tenchi_player_int: 15, tenchi_player_eva: 10, tenchi_max_escapes: 20, 
  tenchi_formations_config: { '散開之陣': [1.0, 1.0, 1.0, 1.0, 1.0], '鶴翼之陣': [1.1, 1.2, 1.4, 1.2, 1.1], '衝方之陣': [1.3, 0.7, 1.3, 0.7, 1.3], '白馬之陣': [1.1, 1.1, 1.1, 1.1, 1.1], '魚鱗之陣': [0.0, 1.2, 1.4, 1.2, 0.0], '鋒矢之陣': [0.0, 0.9, 1.5, 0.9, 0.0], '一文字之陣': [1.3, 1.3, 1.3, 1.3, 1.3], '背水之陣': [1.5, 1.5, 1.5, 1.5, 1.5], '靜寂之陣': [0.6, 0.6, 0.6, 0.6, 0.6], '八卦之陣': [1.2, 0.8, 1.3, 0.8, 1.2] },
  tenchi_strategies_config: { "火計": { "type": "damage", "unlockWins": 0, "power": 15, "cost": 5, "desc": "火焰傷害" }, "水計": { "type": "damage", "unlockWins": 5, "power": 25, "cost": 6, "desc": "水淹傷害" }, "石計": { "type": "damage", "unlockWins": 10, "power": 40, "cost": 7, "desc": "砂石重擊" }, "回復計": { "type": "heal", "unlockWins": 15, "power": 40, "cost": 5, "desc": "恢復兵力" }, "暗殺計": { "type": "assassinate", "unlockWins": 17, "power": 0, "cost": 15, "desc": "50%機率一擊必殺" }, "招魂計": { "type": "revive", "unlockWins": 20, "power": 50, "cost": 8, "desc": "復活武將" }, "煙遁計": { "type": "escape", "unlockWins": 23, "power": 0, "cost": 20, "desc": "100%無損撤退" }, "解陣計": { "type": "dispel", "unlockWins": 25, "power": 0, "cost": 6, "desc": "破除敵方陣型" } },
  tarot21_card_set: '1', tarot21_hp: 30, tarot21_time_limit: 15, tarot21_penalty: 5, tarot21_win_damage: 10, tarot21_blank_count: 3, tarot21_max_escapes: 20,
  tarot_alch_card_set: '1', tarot_alch_hp: 50, tarot_alch_time_limit: 20, tarot_alch_penalty: 5, tarot_alch_win_damage: 10, tarot_alch_blank_count: 3, tarot_alch_max_escapes: 20,
  tarot_uno_card_set: '1', tarot_uno_hp: 50, tarot_uno_time_limit: 15, tarot_uno_penalty: 5, tarot_uno_win_damage: 15, tarot_uno_blank_count: 3, tarot_uno_max_escapes: 20,
  enable_battle: false, enable_tenchi: false, enable_tarot21: false, enable_tarot_alch: false, enable_tarot_uno: false
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

// 🌟 一鍵全校升級邏輯
const upgradeStudents = async () => {
  const currentYear = new Date().getFullYear();
  const confirmMsg = `⚠️ 警告：這將會把所有學生的班級與座號自動升級（例如 701 變 801，901 會變成 901-畢業）。\n\n請問您確定要執行【${currentYear} 年度全校升級】嗎？\n此動作將無法直接復原！`;
  
  if (!confirm(confirmMsg)) return;

  try {
    isLoading.value = true;
    const { data: students, error: fetchErr } = await supabase.from('students').select('id, student_id, class_name, last_upgrade_year');
    if (fetchErr) throw fetchErr;

    let updatedCount = 0;
    for (const student of students) {
      // 防止同一年重複升級
      if (student.last_upgrade_year === currentYear) continue;

      let newClassName = student.class_name;
      let newStudentId = student.student_id;

      if (newClassName && /^\d{3}$/.test(newClassName)) {
        const grade = parseInt(newClassName[0]);
        const classNum = newClassName.substring(1);
        const seatNum = newStudentId.slice(-2); // 取最後兩碼當座號

        if (grade === 7 || grade === 8) {
          newClassName = `${grade + 1}${classNum}`;
          newStudentId = `${newClassName}${seatNum}`;
        } else if (grade === 9) {
          newClassName = `${newClassName}-畢業`;
          // 畢業生保留原ID，以免重複
        }

        if (newClassName !== student.class_name) {
          await supabase.from('students').update({ 
            class_name: newClassName,
            student_id: newStudentId,
            last_upgrade_year: currentYear
          }).eq('id', student.id);
          updatedCount++;
        }
      }
    }
    
    alert(`🎉 升級完成！共成功升級了 ${updatedCount} 位學生的班級與帳號。`);
  } catch (err) {
    console.error("升級失敗", err);
    alert("升級過程發生錯誤：" + err.message);
  } finally {
    isLoading.value = false;
  }
};

</script>

<template>
  <div class="admin-container">
    <NuxtLink to="/" class="retro-btn exit-btn">🚪 登出返回首頁</NuxtLink>
    
    <div class="header">
      <h1>{{ isSuperAdmin ? '🛠️ 網站管理員後台' : '👨‍🏫 英語教師後台' }}</h1>
      <p>{{ isSuperAdmin ? 'SYSTEM ADMIN DASHBOARD' : 'TEACHER DASHBOARD' }}</p>
    </div>
    
    <div class="actions">
      <NuxtLink to="/admin/records" class="retro-btn record-btn">🏆 紀錄報表</NuxtLink>
      <NuxtLink to="/admin/stats" class="retro-btn stats-btn">📈 對錯分析</NuxtLink>
      <NuxtLink to="/admin/leaderboard" class="retro-btn test-btn">🏅 英雄榜</NuxtLink>
      <NuxtLink to="/admin/logs" class="retro-btn log-btn">🕒 登入紀錄</NuxtLink>
      <NuxtLink to="/admin/student-logs" class="retro-btn test-btn">👣 學生足跡</NuxtLink>
      <NuxtLink to="/admin/students" class="retro-btn student-btn" style="grid-column: span 2;">🧑‍🎓 學生名單管理</NuxtLink>

      <template v-if="isSuperAdmin">
        
        <div class="admin-nav-bar retro-element">
          <h3 style="margin-top: 0; color: #0277bd;">🚀 進階管理專區入口</h3>
          
          <div class="nav-buttons">
          <NuxtLink to="/admin/speakno3-manager" class="retro-btn nav-btn" style="background: #e91e63; border-color: #c2185b;">🎤 口說學霸3(歌單管理)</NuxtLink>
            <NuxtLink to="/admin/access" class="retro-btn nav-btn" style="background: #d32f2f; border-color: #e57373;">🛑 遊戲權限與時間管理</NuxtLink>
            <NuxtLink to="/admin/tarot-manager" class="retro-btn nav-btn" style="background: #673ab7; border-color: #9fa8da;">🔮 塔羅牌手動發放</NuxtLink>
            
            <NuxtLink to="/admin/speakno2-manager" class="retro-btn nav-btn" style="background: #2e7d32; border-color: #a5d6a7;">📖 口說學霸2(文章管理)</NuxtLink>
            
            <button @click="upgradeStudents" class="retro-btn nav-btn" style="background: #ffb300; border-color: #ffe082; color: #3e2723;" :disabled="isLoading">
              {{ isLoading ? '🔄 升級中...' : '🆙 一鍵全校升年級 (暑假專用)' }}
            </button>
          </div>
        </div>
        <NuxtLink to="/admin/manage-grammar" class="retro-btn nav-btn" style="background: #e65100; border-color: #e65100;">🎡 文法題庫管理</NuxtLink>
        <NuxtLink to="/admin/grammar-stats" class="retro-btn nav-btn" style="background: #e65100; border-color: #e65100;">🎡 學生文法答題分析</NuxtLink>
        <NuxtLink to="/admin/teacher-logs" class="retro-btn" style="background: #e91e63; color: white; border-color: #c2185b; box-shadow: 0 4px 0 #c2185b;">🕵️ 教師足跡追蹤</NuxtLink>
        <NuxtLink to="/admin/teachers" class="retro-btn teacher-btn" style="grid-column: span 2; background: #9c27b0; color: white;">👨‍🏫 教師權限管理</NuxtLink>
        <NuxtLink to="/admin/vocabularies" class="retro-btn vocab-btn">📝 編輯單字庫</NuxtLink>
        <NuxtLink to="/admin/categories" class="retro-btn nav-btn" style="background: #ff9800; border-color: #ffb74d;">🗂️ 前台排版管理</NuxtLink>
        
        <NuxtLink to="/admin/manage-announcements" class="retro-btn nav-btn" style="background: #03a9f4; border-color: #0288d1;">📢 公佈欄管理</NuxtLink>
        
        <NuxtLink to="/admin/import-exam" class="retro-btn nav-btn" style="background: #e91e63; border-color: #7b1fa2;">📥 會考題庫匯入</NuxtLink>
        <NuxtLink to="/admin/manage-exam" class="retro-btn nav-btn" style="background: #9c27b0; border-color: #6a1b9a;">✏️ 會考單題題庫管理</NuxtLink>
        <NuxtLink to="/admin/manage-exam2" class="retro-btn nav-btn" style="background: #5e35b1; border-color: #4527a0;">📖 會考題組題庫管理</NuxtLink>
        <NuxtLink to="/admin/exam-stats" class="retro-btn nav-btn" style="background: #00bcd4; border-color: #00838f;">📈 會考單題數據分析</NuxtLink>
        <NuxtLink to="/admin/exam-stats2" class="retro-btn nav-btn" style="background: #00bcd4; border-color: #00838f;">📈 會考題組數據分析</NuxtLink>
        <NuxtLink to="/admin/tenchi-manager" class="retro-btn test-btn" style="grid-column: span 2;">
          <div class="card-icon" style="font-size: 1.5rem; margin-right: 10px;">🐎</div>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <h2 style="margin: 0; font-size: 1.1rem;">吞食天地兵法庫</h2>
            <p style="margin: 0; font-size: 0.8rem; font-weight: normal;">手動解鎖學生的陣型與策略</p>
          </div>
        </NuxtLink>


        <NuxtLink 
  to="/admin/law-exam" 
  class="group p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-300 flex items-center gap-4"
>
  <div class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </div>
  <div>
    <h3 class="font-bold text-gray-800">管理員設定</h3>
    <p class="text-sm text-gray-500">調整後台進階參數與系統配置</p>
  </div>
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

  </div>
</template>

<style scoped>
.admin-nav-bar { background: #e3f2fd; border: 2px solid #90caf9; border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); grid-column: span 2;}
.nav-buttons { display: flex; gap: 15px; flex-wrap: wrap; }
.nav-btn { text-decoration: none; font-size: 1.15rem; padding: 12px 25px; color: white; display: inline-block; box-shadow: 0 4px 0 rgba(0,0,0,0.5); transition: 0.1s; }
.nav-btn:hover { filter: brightness(1.1); }
.nav-btn:active { transform: translateY(4px); box-shadow: none; }

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
  .retro-btn, .admin-nav-bar { grid-column: span 1 !important; }
}
</style>