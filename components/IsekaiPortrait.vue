<script setup>
import { computed } from 'vue';

const props = defineProps({
  raceId: { type: String, default: 'human' },
  professionId: { type: String, default: 'farmer' },
  seed: { type: String, default: 'hero' },
  gender: { type: String, default: '' },
  label: { type: String, default: '異世界居民' }
});

const hash = computed(() => [...props.seed].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 37));
const palette = computed(() => {
  const coats = ['#5b7190', '#756194', '#89704d', '#4d816f', '#946259', '#587b84', '#785f72'];
  const hair = ['#382d31', '#5e4236', '#d6ad67', '#cfc2a0', '#6e6b80', '#a45d45'];
  const skin = ['#efd1aa', '#c99572', '#e6b99a', '#af7b5e', '#f3d8be'];
  return { coat: coats[hash.value % coats.length], hair: hair[(hash.value >>> 3) % hair.length], skin: skin[(hash.value >>> 7) % skin.length] };
});
const isElf = computed(() => /elf|sylph|ore|long_ear/.test(props.raceId));
const isBeast = computed(() => /beast|doga|cat|wolf/.test(props.raceId));
const isDemon = computed(() => /demon|demonfolk|magic/.test(props.raceId));
const isDwarf = computed(() => /dwarf/.test(props.raceId));
const longHair = computed(() => props.gender === 'female' || hash.value % 3 === 0);
const tool = computed(() => /sword|guard|knight|warrior|soldier|hunter/.test(props.professionId) ? 'blade'
  : /mage|magic|healer|scholar|priest|alchemist/.test(props.professionId) ? 'staff'
    : /merchant|trader|chef|bard/.test(props.professionId) ? 'bag' : 'hoe');
</script>

<template>
  <svg class="isekai-portrait" viewBox="0 0 140 210" role="img" :aria-label="`${label}的原創角色立繪`" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient :id="`sky-${hash}`" x2="0" y2="1"><stop stop-color="#e6d8b0"/><stop offset="1" stop-color="#97ad9a"/></linearGradient>
      <linearGradient :id="`cape-${hash}`" x2="1" y2="1"><stop :stop-color="palette.coat"/><stop offset="1" stop-color="#263c44"/></linearGradient>
    </defs>
    <rect x="2" y="2" width="136" height="206" rx="15" :fill="`url(#sky-${hash})`" stroke="#d9b879" stroke-width="3"/>
    <circle cx="106" cy="39" r="19" fill="#fff0c1" opacity=".67"/>
    <path d="M4 156 Q28 119 55 143 Q86 104 137 151 L137 205 L4 205Z" fill="#6b8b77" opacity=".75"/>
    <path d="M7 180 Q40 157 75 180 Q111 154 135 178 L135 205 L7 205Z" fill="#477166"/>
    <ellipse cx="71" cy="195" rx="34" ry="8" fill="#203b3a" opacity=".35"/>
    <!-- Cloak, boots and tunic are deliberately simple so small cards stay legible. -->
    <path d="M52 119 Q32 129 34 190 L106 190 Q108 131 88 119Z" :fill="`url(#cape-${hash})`" stroke="#374947" stroke-width="2"/>
    <path d="M52 178 L48 198 L65 198 L70 172 M73 172 L78 198 L95 198 L88 178" fill="#483f3d" stroke="#40373a" stroke-width="2"/>
    <path d="M55 120 Q70 109 86 120 L94 171 Q69 183 46 171Z" :fill="palette.coat" stroke="#263c44" stroke-width="2"/>
    <path d="M49 127 L37 159 L45 163 L60 137 M90 127 L105 160 L96 164 L80 137" :fill="palette.coat" stroke="#263c44" stroke-width="2"/>
    <circle cx="42" cy="163" r="5" :fill="palette.skin"/><circle cx="100" cy="162" r="5" :fill="palette.skin"/>
    <path d="M51 150 Q70 158 89 150 M53 167 Q70 174 87 167" fill="none" stroke="#dcbf84" stroke-width="2"/>
    <circle cx="70" cy="140" r="4" fill="#ead5a3" stroke="#a98c57" stroke-width="1"/>
    <path v-if="longHair" d="M48 65 Q37 65 38 101 L44 132 Q50 124 54 113 L90 113 Q96 125 103 132 L102 89 Q100 62 91 62Z" :fill="palette.hair"/>
    <path v-if="isElf" d="M52 83 L29 72 Q39 94 54 93 M88 83 L111 72 Q101 94 86 93" :fill="palette.skin" stroke="#856c62" stroke-width="1.5"/>
    <path v-if="isBeast" d="M47 72 L40 50 Q57 55 60 67 M80 67 Q88 54 103 50 L96 73" :fill="palette.hair" stroke="#463537" stroke-width="2"/>
    <path v-if="isDemon" d="M53 67 Q49 53 44 48 Q55 51 59 65 M82 65 Q88 51 97 48 Q95 59 88 68" fill="#776080" stroke="#513f61" stroke-width="2"/>
    <ellipse cx="70" cy="87" rx="23" ry="29" :fill="palette.skin" stroke="#8e6b5e" stroke-width="1.5"/>
    <path d="M47 75 Q44 54 65 55 Q87 51 94 76 Q76 69 66 64 Q58 76 47 75Z" :fill="palette.hair"/>
    <path v-if="longHair" d="M48 77 Q44 98 47 112 M92 77 Q97 98 93 112" fill="none" :stroke="palette.hair" stroke-width="7" stroke-linecap="round"/>
    <path v-if="isDwarf" d="M59 105 Q70 127 82 105 Q77 133 70 136 Q63 132 59 105Z" :fill="palette.hair"/>
    <path d="M56 88 Q61 86 65 89 M76 89 Q80 86 85 88" fill="none" stroke="#324247" stroke-width="2.3" stroke-linecap="round"/>
    <path d="M66 102 Q70 105 75 102" fill="none" stroke="#a96565" stroke-width="1.5" stroke-linecap="round"/>
    <g v-if="tool==='blade'" stroke="#dbe2d5" stroke-width="3" stroke-linecap="round"><path d="M106 156 L120 89"/><path d="M110 140 L122 143" stroke="#bf9e62" stroke-width="5"/></g>
    <g v-else-if="tool==='staff'" stroke="#6d4b3a" stroke-width="4" stroke-linecap="round"><path d="M106 164 L115 86"/><circle cx="116" cy="82" r="8" fill="#afc6df" stroke="#f2dfae" stroke-width="2"/></g>
    <g v-else-if="tool==='bag'"><path d="M106 151 Q120 148 124 163 L122 180 L101 180Z" fill="#9b7046" stroke="#edc68a" stroke-width="2"/><path d="M106 152 Q112 142 120 152" fill="none" stroke="#edd2a7" stroke-width="2"/></g>
    <g v-else stroke="#a2a8a0" stroke-width="3" stroke-linecap="round"><path d="M105 165 L117 95"/><path d="M114 95 Q130 93 130 109" fill="none" stroke-width="4"/></g>
    <path d="M8 191 Q70 178 132 191 L132 202 L8 202Z" fill="#24433e" opacity=".82"/>
    <circle cx="20" cy="194" r="2" fill="#e9cc8d"/><circle cx="120" cy="194" r="2" fill="#e9cc8d"/>
  </svg>
</template>

<style scoped>
.isekai-portrait{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 6px #07181966)}
</style>
