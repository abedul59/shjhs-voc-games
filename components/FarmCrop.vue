<script setup>
defineProps({ crop: { type: String, default: '' }, stage: { type: String, default: '空地' } });
const matureIcons = {
  mango: '🥭', dragon_fruit: '🐉', banana: '🍌', shallot: '🧅', papaya: '🍈', avocado: '🥑',
  water_caltrop: '🌰', lotus_root: '🪷', water_snowflake: '🌿', lychee: '🍒', guava: '🍐',
  red_bean: '🫘', wax_apple: '🍎'
};
</script>

<template>
  <span v-if="stage === '成熟' && matureIcons[crop]" class="farm-crop-emoji" role="img" :aria-label="crop + stage">{{ matureIcons[crop] }}</span>
  <svg v-else-if="stage !== '空地'" class="farm-crop-art" viewBox="0 0 64 64" role="img" :aria-label="crop + stage">
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
        <template v-else-if="crop === 'pineapple'"><path d="M32 24L25 10L31 17L33 5L37 18L44 11L39 26" fill="#45984c" stroke="#2d7842" stroke-width="2"/><path d="M20 28Q32 21 44 28L42 46Q32 59 22 46Z" fill="#f3bd43" stroke="#a77a25" stroke-width="2"/><path d="M22 31L41 46M21 40L36 53M42 31L23 46M43 39L29 53" stroke="#d88b2a" stroke-width="2"/></template>
        <template v-else-if="crop === 'bamboo'"><path d="M21 54L27 23L32 17L37 31L42 54Z" fill="#e6c586" stroke="#9b754c" stroke-width="2"/><path d="M22 43H41M25 34H38" stroke="#b88f59" stroke-width="2"/><path d="M32 22V9M32 15L20 9M33 14L44 7" stroke="#379249" stroke-width="3" stroke-linecap="round"/><path d="M20 9L12 6L18 14M44 7L52 5L45 13" fill="#69b764"/></template>
        <template v-else-if="crop === 'sweet_potato'"><path d="M18 39Q29 32 45 37Q53 45 42 53Q28 59 18 50Q13 45 18 39Z" fill="#a05c9a" stroke="#723d74" stroke-width="2"/><path d="M22 43Q32 38 43 42" fill="none" stroke="#c889b5" stroke-width="2"/><path d="M31 35Q23 23 15 26Q18 36 31 37M33 33Q42 20 51 25Q47 36 33 37" fill="#55a65a" stroke="#327d46" stroke-width="1.5"/></template>
        <template v-else-if="crop === 'olive'"><path d="M17 48Q30 28 49 24" fill="none" stroke="#547e3c" stroke-width="4" stroke-linecap="round"/><path d="M24 37Q16 27 12 31Q14 39 24 40M35 30Q29 17 25 19Q26 29 35 33M39 31Q50 18 53 23Q49 32 39 34" fill="#74a95a"/><ellipse cx="25" cy="43" rx="6" ry="8" fill="#667f39" stroke="#425b2a" stroke-width="1.5"/><ellipse cx="42" cy="38" rx="6" ry="8" fill="#667f39" stroke="#425b2a" stroke-width="1.5"/></template>
        <template v-else-if="crop === 'sesame'"><path d="M32 53V12M32 25L20 18M32 32L44 23M32 39L19 32" fill="none" stroke="#568a48" stroke-width="3" stroke-linecap="round"/><path d="M20 18L12 15Q14 23 23 23M44 23L52 18Q52 28 41 28M19 32L11 29Q14 38 23 37" fill="#83b86e"/><ellipse cx="31" cy="18" rx="4" ry="7" fill="#e4d4a0"/><ellipse cx="25" cy="29" rx="4" ry="7" fill="#e4d4a0"/><ellipse cx="39" cy="37" rx="4" ry="7" fill="#e4d4a0"/></template>
        <template v-else-if="crop === 'rice'"><path d="M30 55Q27 35 19 13M33 54Q37 33 47 14" fill="none" stroke="#6b9746" stroke-width="3" stroke-linecap="round"/><path d="M24 32Q13 24 9 34Q17 39 26 39M37 35Q48 23 55 33Q48 41 35 42" fill="#84b75d"/><g fill="#e9c862"><ellipse cx="18" cy="17" rx="3" ry="5"/><ellipse cx="22" cy="24" rx="3" ry="5"/><ellipse cx="27" cy="31" rx="3" ry="5"/><ellipse cx="47" cy="18" rx="3" ry="5"/><ellipse cx="43" cy="25" rx="3" ry="5"/><ellipse cx="39" cy="32" rx="3" ry="5"/></g></template>
      </template>
    </g>
  </svg>
  <span v-else class="empty-seed" aria-hidden="true">✦</span>
</template>

<style scoped>
.farm-crop-art{width:42px;height:42px;display:block;overflow:visible;filter:drop-shadow(0 2px 1px #3b2b2760)}
.crop-sway{transform-origin:32px 54px;animation:crop-sway 3.6s ease-in-out infinite alternate}
.empty-seed{font-size:1.55rem;color:#efd495;text-shadow:0 1px #694325}
.farm-crop-emoji{font-size:2rem;line-height:1;animation:crop-sway 3.6s ease-in-out infinite alternate}
@keyframes crop-sway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
@media(prefers-reduced-motion:reduce){.crop-sway,.farm-crop-emoji{animation:none}}
@media(max-width:620px){.farm-crop-art{width:37px;height:37px}}
</style>
