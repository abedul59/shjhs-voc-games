// 檔案位置：composables/useBgmUnlock.js
import { useState } from '#app';
import { allThemes } from '~/utils/themes';

export const useBgmUnlock = () => {
  const supabase = useSupabaseClient();
  const studentCookie = useCookie('currentStudent');
  const unlockedThemes = useState('unlockedThemes', () => []);

  const checkAndUnlockBgm = async () => {
    if (!studentCookie.value || studentCookie.value.isAnon) return null;

    // 1. 抓取新的「風格解鎖」設定
    const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 1).single();
    if (!settings || settings.theme_mode !== 'achievement_unlock') return null;

    // 2. 搜尋該學生在「指定範圍」的遊戲次數與分數
    const { data: records } = await supabase.from('game_records')
      .select('score')
      .eq('student_id', studentCookie.value.id)
      .eq('version', settings.theme_task_version)
      .eq('volume', settings.theme_task_volume)
      .eq('unit_played', settings.theme_task_unit);

    if (!records || records.length === 0) return null;

    // 計算符合條件的次數，判斷應該給幾個盲盒
    const eligibleUnlocks = Math.floor(records.length / settings.theme_task_count);
    if (eligibleUnlocks === 0) return null; 

    // 檢查平均分數是否達標
    const avgScore = records.reduce((acc, r) => acc + r.score, 0) / records.length;
    if (avgScore < settings.theme_task_score) return null; 

    // 3. 讀取他目前的背包
    const { data: student } = await supabase.from('students').select('unlocked_themes').eq('student_id', studentCookie.value.id).single();
    unlockedThemes.value = student?.unlocked_themes || [];
    
    // 把預設風格從「未解鎖名單」中剃除
    const defaultThemeId = settings.default_theme || 'theme-retro';
    if (!unlockedThemes.value.includes(defaultThemeId)) {
       unlockedThemes.value.push(defaultThemeId);
    }

    if (unlockedThemes.value.length >= eligibleUnlocks + 1) return null; // +1是因為預設風格也算一個

    // 4. 抽盲盒！過濾掉已經擁有的
    const lockedThemes = allThemes.filter(t => !unlockedThemes.value.includes(t.id));
    if (lockedThemes.length === 0) return "已全解鎖";

    const newlyUnlocked = lockedThemes[Math.floor(Math.random() * lockedThemes.length)];
    
    unlockedThemes.value.push(newlyUnlocked.id);
    await supabase.from('students').update({ unlocked_themes: unlockedThemes.value }).eq('student_id', studentCookie.value.id);

    return newlyUnlocked.name;
  };

  return { checkAndUnlockBgm };
}