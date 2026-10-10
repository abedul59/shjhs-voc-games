<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const portrait = ref(false);
const isTouch = ref(false);
const dismissed = ref(false);
const message = ref('');
let orientationQuery;
let touchQuery;

function refresh() {
  portrait.value = !!orientationQuery?.matches;
  isTouch.value = !!touchQuery?.matches;
  if (!portrait.value) dismissed.value = false;
}

async function enterLandscape() {
  message.value = '';
  try {
    // Fullscreen needs the button's user gesture. Request it before awaiting anything.
    const fullscreenRequest = document.documentElement.requestFullscreen?.();
    if (fullscreenRequest) await fullscreenRequest;
    await screen.orientation?.lock?.('landscape');
    if (!fullscreenRequest && !screen.orientation?.lock) {
      message.value = '此瀏覽器無法自動進入橫式全螢幕，請手動轉橫；畫面按鍵仍可使用。';
    }
  } catch {
    message.value = '瀏覽器無法自動旋轉或進入全螢幕，請手動將手機轉橫；也可以用下方按鍵繼續遊玩。';
  }
  refresh();
}

onMounted(() => {
  orientationQuery = window.matchMedia('(orientation: portrait)');
  touchQuery = window.matchMedia('(pointer: coarse)');
  orientationQuery.addEventListener('change', refresh);
  touchQuery.addEventListener('change', refresh);
  refresh();
});
onUnmounted(() => {
  orientationQuery?.removeEventListener('change', refresh);
  touchQuery?.removeEventListener('change', refresh);
});
</script>

<template>
  <div v-if="isTouch && portrait && !dismissed" class="landscape-entry" role="dialog" aria-label="橫式遊玩提示">
    <strong>📱 請橫向遊玩</strong>
    <p>轉成橫式可看完整畫面。畫面按鍵一直可以使用，不必開啟陀螺儀。</p>
    <button type="button" @click="enterLandscape">進入橫式全螢幕</button>
    <p v-if="message" role="status">{{ message }}</p>
    <button type="button" class="continue" @click="dismissed = true">繼續使用目前畫面</button>
  </div>
  <button v-else-if="isTouch && (!portrait || dismissed)" type="button" class="fullscreen-entry" @click="enterLandscape">⛶ 全螢幕</button>
</template>

<style scoped>
.landscape-entry{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;background:#10263df5;color:#fff;text-align:center;font-family:system-ui,sans-serif}
.landscape-entry strong{font-size:clamp(22px,5vw,30px)}.landscape-entry p{max-width:34em;margin:0;line-height:1.5}.landscape-entry button,.fullscreen-entry{min-height:44px;border:0;border-radius:10px;padding:9px 16px;background:#ffdb89;color:#17334d;font-size:15px;font-weight:800;cursor:pointer}.landscape-entry .continue{background:#d4e7f3}.fullscreen-entry{position:fixed;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));z-index:9000;min-height:36px;padding:4px 9px;font-size:12px;opacity:.85}
</style>
