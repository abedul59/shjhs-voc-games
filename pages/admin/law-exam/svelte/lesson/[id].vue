<script setup>
import { createDefaultSvelteProgress, svelteLessons, svelteStages } from '~/lib/svelte-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: svelteLessons, stages: svelteStages, createDefault: createDefaultSvelteProgress,
  base: '/admin/law-exam/svelte', shortTitle: 'Svelte / SvelteKit', logo: 'S', accent: '#ff6a3d',
  editorLabel: '+page.svelte / +page.server.js', notePlaceholder: '記下今天理解的 Svelte、Runes 或 SvelteKit 觀念……'
};
const progressApi = useSvelteProgress();
</script>
<template><ProgrammingLessonPage :course="course" :progress-api="progressApi" /></template>
