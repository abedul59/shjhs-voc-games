<script setup>
import { createDefaultSvelteProgress, svelteLessons, svelteStages } from '~/lib/svelte-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: svelteLessons, stages: svelteStages, createDefault: createDefaultSvelteProgress,
  base: '/admin/law-exam/svelte', eyebrow: 'PRIVATE SVELTE · SVELTEKIT WORKBENCH', primary: 'Svelte.js', secondaryTitle: '/ SvelteKit',
  lead: '從 JavaScript、TypeScript 與 Svelte 5 Runes，一路走到 SvelteKit 路由、Form Actions、Server Load、測試與正式全端產品。',
  logo: 'S', tagline: '編譯、直覺、全端整合', roadmap: '從 Svelte 元件到 SvelteKit 正式產品', accent: '#ff6a3d', secondary: '#3b1d17', environmentKey: 'svelte'
};
const progressApi = useSvelteProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
