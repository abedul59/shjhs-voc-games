<script setup>
defineProps({ effect: { type: Object, required: true } });
</script>

<template>
  <div class="battle-effect" :class="effect.kind" aria-hidden="true">
    <div class="effect-shade"></div>
    <div class="effect-ring ring-one"></div><div class="effect-ring ring-two"></div>
    <div v-for="n in 16" :key="n" class="effect-particle" :style="{ '--i': n, '--angle': `${n * 22.5}deg`, '--distance': `${85 + n % 4 * 22}px`, '--delay': `${n % 5 * 45}ms` }"></div>
    <div class="effect-slash slash-one"></div><div class="effect-slash slash-two"></div>
    <div class="effect-symbol"><img v-if="effect.image" :src="effect.image" :alt="effect.label + '道具圖'"/><template v-else>{{ effect.icon }}</template></div>
    <div class="effect-label">{{ effect.label }}</div>
  </div>
</template>

<style scoped>
.battle-effect{--effect:#f7ce8b;--glow:#e7855b;position:absolute;inset:0;z-index:10;display:grid;place-items:center;overflow:hidden;pointer-events:none;border-radius:16px;isolation:isolate}
.effect-shade{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--glow),transparent 62%),transparent 55%),#08131b78;animation:flash-in 1.5s ease-out both}
.effect-ring{position:absolute;left:50%;top:48%;width:110px;height:110px;border:4px solid var(--effect);border-radius:50%;box-shadow:0 0 24px var(--glow),inset 0 0 24px var(--glow);animation:ring 1.3s ease-out both}.ring-two{animation-delay:.18s}
.effect-particle{position:absolute;left:50%;top:48%;width:9px;height:18px;border-radius:50%;background:var(--effect);box-shadow:0 0 12px var(--glow),0 0 25px var(--glow);transform:rotate(var(--angle));animation:scatter 1.25s ease-out var(--delay) both}
.effect-symbol{position:relative;z-index:2;font-size:86px;filter:drop-shadow(0 0 18px var(--glow));animation:symbol-pop 1.4s ease-out both}
.effect-symbol img{display:block;width:110px;height:110px;object-fit:contain}
.effect-label{position:absolute;z-index:3;bottom:18%;font:bold clamp(22px,3.4vw,44px) serif;color:#fff7da;text-shadow:0 2px 6px #001,0 0 18px var(--effect);letter-spacing:.14em;animation:label-pop 1.25s ease-out both}
.effect-slash{display:none;position:absolute;top:45%;left:50%;height:7px;width:65%;background:linear-gradient(90deg,transparent,#fff7d0,var(--effect),transparent);box-shadow:0 0 22px var(--effect);transform-origin:center;animation:slash 1s ease-out both}.slash-one{transform:translate(-50%,-50%) rotate(-28deg)}.slash-two{transform:translate(-50%,-50%) rotate(30deg);animation-delay:.12s}
.attack{--effect:#ffe2a0;--glow:#f38353}.attack .effect-slash,.skill .effect-slash{display:block}.attack .effect-ring,.attack .effect-particle{opacity:.45}
.skill{--effect:#e6cbff;--glow:#936cff}.guard,.item-shield{--effect:#a2e8ff;--glow:#48aacd}.guard .effect-ring,.item-shield .effect-ring{border-radius:24%;transform:rotate(45deg)}
.item-damage{--effect:#ffd08a;--glow:#ff5b60}.item-heal{--effect:#b8ffcd;--glow:#4bcf96}.item-boost{--effect:#fff1a6;--glow:#efb74b}.item-weaken{--effect:#caacf6;--glow:#7853b0}.item-stun{--effect:#fef8b8;--glow:#fa91de}.item-drain{--effect:#f3a4cf;--glow:#9a4ec1}
.item-heal .effect-particle,.item-boost .effect-particle{border-radius:50%;height:13px}.item-drain .effect-particle,.item-weaken .effect-particle{height:21px;border-radius:2px}.item-stun .effect-ring{border-style:dashed}
@keyframes flash-in{0%{opacity:0}18%{opacity:1}70%{opacity:.9}100%{opacity:0}}@keyframes ring{0%{transform:translate(-50%,-50%) scale(.25);opacity:0}24%{opacity:1}100%{transform:translate(-50%,-50%) scale(5);opacity:0}}@keyframes scatter{0%{transform:translate(-50%,-50%) rotate(var(--angle)) translateY(0) scale(.4);opacity:0}15%{opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--angle)) translateY(calc(-1 * var(--distance))) scale(.3);opacity:0}}@keyframes symbol-pop{0%{transform:scale(.2) rotate(-20deg);opacity:0}27%{transform:scale(1.35);opacity:1}67%{transform:scale(1);opacity:1}100%{transform:scale(1.15);opacity:0}}@keyframes label-pop{0%{opacity:0;transform:translateY(20px)}25%,75%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-15px)}}@keyframes slash{0%{opacity:0;width:0}25%{opacity:1;width:75%}100%{opacity:0;width:100%}}
@media(prefers-reduced-motion:reduce){.battle-effect *{animation-duration:.01ms!important}}
</style>
