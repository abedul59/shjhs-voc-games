<script setup>
defineProps({ crop: { type: String, default: '' }, stage: { type: String, default: '空地' } });
</script>

<template>
  <svg v-if="stage !== '空地'" class="farm-crop-art" viewBox="0 0 64 64" role="img" :aria-label="crop + stage">
    <ellipse cx="32" cy="57" rx="24" ry="5" fill="#5a3c28" opacity=".28" />
    <g class="crop-sway">
      <path d="M32 54V21" fill="none" stroke="#398642" stroke-width="4" stroke-linecap="round" />
      <path d="M31 38Q12 19 10 31Q18 40 31 42M33 31Q50 16 55 25Q50 37 33 35" fill="#58a95c" stroke="#2e7e41" stroke-width="1.5" />
      <template v-if="stage === '發芽'"><path d="M32 28Q20 16 17 24Q22 31 32 30M32 28Q44 16 47 24Q42 31 32 30" fill="#82c967" /></template>
      <template v-else-if="stage === '成熟'">
        <template v-if="crop === 'carrot'"><path d="M23 34Q32 27 41 34L34 54Q32 60 29 54Z" fill="#f58a32" stroke="#c45f26" stroke-width="2" /><path d="M32 34V18M32 27Q20 13 18 20M32 25Q44 12 48 20" fill="none" stroke="#3e994e" stroke-width="4" stroke-linecap="round" /></template>
        <template v-else-if="crop === 'corn'"><rect x="24" y="20" width="16" height="32" rx="8" fill="#f6d859" stroke="#c89732" stroke-width="2" /><path d="M24 29L31 50Q18 46 20 30M40 29L33 50Q46 46 44 30" fill="#4b9a51" /><path d="M29 22V46M35 22V46M25 31H39M25 39H39" stroke="#deac3e" stroke-width="1" /></template>
        <template v-else-if="crop === 'strawberry'"><path d="M18 32Q17 46 32 54Q47 46 46 32Q33 25 18 32" fill="#e74751" stroke="#a9243a" stroke-width="2" /><path d="M20 31L28 25L32 30L36 25L44 31L37 34L32 31L27 34Z" fill="#43a454" /><g fill="#ffe79c"><circle cx="25" cy="38" r="1.2"/><circle cx="34" cy="38" r="1.2"/><circle cx="39" cy="43" r="1.2"/><circle cx="30" cy="46" r="1.2"/></g></template>
        <template v-else-if="crop === 'pumpkin'"><ellipse cx="32" cy="42" rx="21" ry="13" fill="#ec8a31" stroke="#a95b24" stroke-width="2" /><path d="M32 30Q23 40 32 54M32 30Q41 40 32 54M30 30L33 22" fill="none" stroke="#b96827" stroke-width="2" /><path d="M33 27Q42 18 48 25Q39 29 33 27" fill="#41954b" /></template>
      </template>
    </g>
  </svg>
  <span v-else class="empty-seed" aria-hidden="true">✦</span>
</template>

<style scoped>
.farm-crop-art{width:42px;height:42px;display:block;overflow:visible;filter:drop-shadow(0 2px 1px #3b2b2760)}
.crop-sway{transform-origin:32px 54px;animation:crop-sway 3.6s ease-in-out infinite alternate}
.empty-seed{font-size:1.55rem;color:#efd495;text-shadow:0 1px #694325}
@keyframes crop-sway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
@media(prefers-reduced-motion:reduce){.crop-sway{animation:none}}
@media(max-width:620px){.farm-crop-art{width:37px;height:37px}}
</style>
