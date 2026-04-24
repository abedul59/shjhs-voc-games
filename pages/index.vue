<script setup>
import { ref, onMounted } from 'vue';
import StrokeQuery from '~/components/StrokeQuery.vue';
import LoginBox from '~/components/LoginBox.vue';
import GameSelector from '~/components/GameSelector.vue';
// ✨ 記得要 Import 新建的公佈欄組件
import AnnouncementBoard from '~/components/AnnouncementBoard.vue';

const supabase = useSupabaseClient();
const studentCookie = useCookie('currentStudent');

const systemName = ref('載入中...');
const announcement = ref('');
const schoolPhone = ref('學校市話');
const autoLogoutMinutes = ref(10);

onMounted(async () => {
  const { data: settings } = await supabase.from('system_settings').select('system_name, announcement, school_phone, auto_logout_minutes').eq('id', 1).single();
  if (settings) {
    systemName.value = settings.system_name || '單字領域展開';
    announcement.value = settings.announcement || '';
    schoolPhone.value = settings.school_phone || '學校市話';
    autoLogoutMinutes.value = settings.auto_logout_minutes ?? 10;
  }
});
</script>

<template>
  <div class="home-container">
    <div v-if="announcement" class="marquee-container retro-element">
      <div class="marquee-content">📢 {{ announcement }}</div>
    </div>

    <AnnouncementBoard />

    <div class="main-box retro-element">
      <div class="title-box">
        <h1 class="main-title">{{ systemName }}</h1>
        <p class="subtitle">SELECT & PLAY</p>
      </div>

      <LoginBox v-if="!studentCookie" :school-phone="schoolPhone" />
      <GameSelector v-else :auto-logout-minutes="autoLogoutMinutes" />
    </div>

    <StrokeQuery v-if="!studentCookie" :school-phone="schoolPhone" />

    <div class="bottom-links">
      <NuxtLink to="/leaderboard" class="link-btn">🏆 全校英雄榜</NuxtLink>
      
      <NuxtLink v-if="studentCookie" to="/tarot" class="link-btn" style="color: #d4af37; border-color: #d4af37;">🔮 領域牌組圖鑑</NuxtLink>

      <NuxtLink v-if="studentCookie" to="/history" class="link-btn">📊 我的歷史紀錄</NuxtLink>
      <NuxtLink to="/admin/login" class="link-btn admin">▶ 管理員 / 教師後台</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.home-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
.marquee-container { width: 100%; max-width: 450px; background: var(--info-bg); color: var(--text-main); padding: 10px; border-radius: var(--radius-element); border: 2px solid var(--border-color); overflow: hidden; margin-bottom: 15px; font-weight: 900; box-shadow: var(--shadow-btn); }
.marquee-content { display: inline-block; white-space: nowrap; animation: scroll-left 15s linear infinite; }
@keyframes scroll-left { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }

.main-box { background: var(--box-bg); padding: 30px; border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); width: 100%; max-width: 450px; transition: all 0.4s ease; box-sizing: border-box;}
.title-box { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed var(--border-color); padding-bottom: 15px;}
.main-title { font-size: 2.2rem; margin: 0; font-weight: 900; color: var(--text-main); }
.subtitle { font-weight: bold; color: var(--text-muted); margin-top: 5px; }

.bottom-links { margin-top: 30px; display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;}
.link-btn { color: var(--text-main); font-weight: bold; text-decoration: none; border-bottom: 2px solid var(--text-main); padding-bottom: 2px; }
.link-btn:hover { background: var(--text-main); color: var(--box-bg); }
.link-btn.admin { color: var(--text-muted); border-color: var(--text-muted); }
.link-btn.admin:hover { background: var(--text-muted); color: var(--box-bg); }

@media (max-width: 600px) { .main-title { font-size: 2rem; } .bottom-links { flex-direction: column; } }
</style>