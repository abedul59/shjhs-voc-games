<script setup>
import { computed } from 'vue';
const props = defineProps({ person: { type: Object, required: true } });
const style = computed(() => ({
  teacher: { hair: '#5b3529', shirt: '#326c93', skin: '#e8ad83' },
  chef: { hair: '#3a3530', shirt: '#ad5741', skin: '#eac29a' },
  engineer: { hair: '#553625', shirt: '#406fbd', skin: '#dca17b' },
  vet: { hair: '#262b37', shirt: '#43a38b', skin: '#e7b38c' },
  merchant: { hair: '#4d2b28', shirt: '#a65d9a', skin: '#efc09e' },
  guide: { hair: '#6a3f24', shirt: '#579b55', skin: '#d9a179' },
  mechanic: { hair: '#303037', shirt: '#766cb2', skin: '#deb18e' },
  artist: { hair: '#793d29', shirt: '#c05b75', skin: '#f0be93' },
  programmer: { hair: '#292f3c', shirt: '#527c9b', skin: '#d3a481' },
  nurse: { hair: '#514033', shirt: '#58a79c', skin: '#eab790' }
})[props.person.id] || { hair: '#45342b', shirt: '#487f67', skin: '#ddb18f' });
</script>

<template>
  <svg class="portrait" viewBox="0 0 100 100" role="img" :aria-label="person.name + '主角插畫'">
    <rect x="2" y="2" width="96" height="96" rx="20" :fill="person.color" />
    <circle cx="75" cy="24" r="17" fill="#ffffffaa" />
    <path d="M12 99 Q17 67 50 67 Q83 67 88 99Z" :fill="style.shirt" />
    <path d="M35 71 Q50 87 65 71" fill="none" stroke="#ffffffaa" stroke-width="4" />
    <rect x="44" y="59" width="12" height="15" rx="5" :fill="style.skin" />
    <ellipse cx="50" cy="43" rx="22" ry="27" :fill="style.skin" />
    <path d="M28 38 Q25 14 48 13 Q72 12 73 38 Q62 25 49 29 Q37 36 28 38Z" :fill="style.hair" />
    <circle cx="42" cy="45" r="1.7" fill="#44352d" /><circle cx="58" cy="45" r="1.7" fill="#44352d" />
    <path d="M44 56 Q50 61 56 56" fill="none" stroke="#a26358" stroke-width="2" stroke-linecap="round" />
    <text x="76" y="31" font-size="17" text-anchor="middle">{{ person.icon }}</text>
  </svg>
</template>

<style scoped>
.portrait{width:66px;height:66px;flex:none;filter:drop-shadow(0 2px 2px #24452933)}
</style>
