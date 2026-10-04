<script setup>
defineProps({ active: { type: Boolean, default: false }, success: { type: Boolean, default: false } });
</script>

<template>
  <div class="cauldron-scene" :class="{ brewing: active, complete: success }" role="img" aria-label="會發光並冒泡的鍊金釜">
    <div class="alchemy-halo"></div>
    <div class="alchemy-star star-one">✦</div><div class="alchemy-star star-two">✧</div><div class="alchemy-star star-three">✦</div>
    <div class="steam steam-one"></div><div class="steam steam-two"></div><div class="steam steam-three"></div>
    <div v-for="n in 9" :key="n" class="bubble" :style="{ '--n': n, '--delay': `${(n % 5) * -.37}s` }"></div>
    <svg class="pot" viewBox="0 0 360 290" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="pot-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#82979c"/><stop offset=".35" stop-color="#273e4b"/><stop offset=".7" stop-color="#152d3a"/><stop offset="1" stop-color="#7b918d"/></linearGradient>
        <linearGradient id="pot-liquid" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b5ffe0"/><stop offset=".5" stop-color="#5abac4"/><stop offset="1" stop-color="#665fbb"/></linearGradient>
      </defs>
      <path d="M75 141q-44-19-46 14-1 22 45 25 M286 141q44-19 46 14 1 22-45 25" fill="none" stroke="#d9c49b" stroke-width="15" stroke-linecap="round"/>
      <path d="M93 171q-8 76 42 86h90q52-12 42-86z" fill="url(#pot-metal)" stroke="#d7bc86" stroke-width="5"/>
      <path d="M132 253l-10 26 M228 253l10 26" stroke="#c7af7e" stroke-width="13" stroke-linecap="round"/>
      <ellipse cx="180" cy="159" rx="116" ry="41" fill="#1a333f" stroke="#ecd29a" stroke-width="9"/>
      <ellipse class="liquid" cx="180" cy="154" rx="101" ry="27" fill="url(#pot-liquid)"/>
      <path d="M93 169q40 26 87 24 55 0 88-24" fill="none" stroke="#f2dba6" stroke-width="7"/>
      <path d="M112 204q28 22 57 16 M250 204q-15 14-31 16" fill="none" stroke="#cbd7cb" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>
      <circle cx="180" cy="220" r="17" fill="#142b3b" stroke="#efce87" stroke-width="5"/>
      <path d="M180 207v26m-13-13h26" stroke="#bff6e7" stroke-width="3"/>
      <ellipse cx="180" cy="124" rx="108" ry="18" fill="none" stroke="#d9c49b" stroke-width="8"/>
    </svg>
    <div class="cauldron-base"></div>
  </div>
</template>

<style scoped>
.cauldron-scene{position:relative;width:min(100%,440px);height:320px;margin:auto;isolation:isolate;overflow:hidden;border-radius:20px;background:radial-gradient(ellipse at 50% 70%,#31556788 0,transparent 57%),radial-gradient(ellipse at 50% 30%,#28747655 0,transparent 55%)}
.alchemy-halo{position:absolute;left:50%;top:50%;width:240px;height:150px;transform:translate(-50%,-35%);border-radius:50%;background:#77dbc888;filter:blur(42px);transition:background .4s,opacity .4s;opacity:.65}
.pot{position:absolute;bottom:14px;left:50%;width:330px;max-width:95%;transform:translateX(-50%);filter:drop-shadow(0 18px 18px #031822aa);z-index:2}
.liquid{transform-origin:180px 154px;animation:liquid-idle 3s ease-in-out infinite}
.cauldron-base{position:absolute;bottom:9px;left:50%;transform:translateX(-50%);width:235px;height:18px;border-radius:50%;background:#03131baa;filter:blur(7px)}
.bubble{position:absolute;left:calc(28% + var(--n) * 5%);bottom:128px;width:calc(6px + var(--n) * 1px);height:calc(6px + var(--n) * 1px);border-radius:50%;border:2px solid #d5fff1;background:#75d9d888;opacity:.75;z-index:3;animation:float-bubble 2.7s ease-in infinite;animation-delay:var(--delay)}
.steam{position:absolute;bottom:165px;width:27px;height:85px;border:4px solid #c3ffff88;border-left:0;border-bottom:0;border-radius:50%;filter:blur(3px);opacity:.45;z-index:1;animation:steam-up 3s ease-in-out infinite}.steam-one{left:35%}.steam-two{left:49%;animation-delay:-1s}.steam-three{left:61%;animation-delay:-2s}
.alchemy-star{position:absolute;color:#e9ffc4;z-index:3;text-shadow:0 0 16px #b9fff5;font-size:22px;animation:twinkle 2.8s ease-in-out infinite}.star-one{left:18%;top:33%}.star-two{right:21%;top:24%;animation-delay:-.8s}.star-three{right:30%;top:9%;animation-delay:-1.5s}
.brewing .alchemy-halo{background:#78f2df;opacity:1;animation:halo-pulse .8s ease-in-out infinite}.brewing .pot{animation:pot-shake .45s ease-in-out infinite}.brewing .liquid{animation:liquid-brew .7s ease-in-out infinite}.brewing .bubble{animation-duration:.9s}.brewing .alchemy-star{animation-duration:.65s}
.complete .alchemy-halo{background:#f9e899;opacity:1;filter:blur(27px)}.complete .alchemy-star{color:#ffe9a9;font-size:27px}
@keyframes liquid-idle{50%{transform:scaleX(.97) scaleY(1.07)}}@keyframes liquid-brew{50%{transform:scaleX(.92) scaleY(1.22)}}@keyframes float-bubble{0%{transform:translateY(0) scale(.6);opacity:0}20%{opacity:.9}85%{opacity:.8}100%{transform:translateY(-95px) scale(1.35);opacity:0}}@keyframes steam-up{50%{transform:translateY(-14px) rotate(8deg);opacity:.6}}@keyframes twinkle{50%{opacity:.3;transform:scale(.75) rotate(18deg)}}@keyframes halo-pulse{50%{transform:translate(-50%,-35%) scale(1.25)}}@keyframes pot-shake{25%{transform:translateX(calc(-50% - 2px)) rotate(-1deg)}75%{transform:translateX(calc(-50% + 2px)) rotate(1deg)}}
@media(max-width:700px){.cauldron-scene{height:245px}.pot{width:250px}.bubble{bottom:98px}.steam{bottom:130px}}
</style>
