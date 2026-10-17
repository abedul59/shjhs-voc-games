<script setup>
import { createDefaultReactProgress, reactLessons, reactStages } from '~/lib/react-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: reactLessons, stages: reactStages, createDefault: createDefaultReactProgress,
  base: '/admin/law-exam/react', shortTitle: 'React / Next.js', logo: '⚛', accent: '#61dafb',
  editorLabel: 'component.tsx / route.ts', notePlaceholder: '記下今天理解的 React、TypeScript 或 Next.js 觀念……'
};
const progressApi = useReactProgress();
</script>
<template><ProgrammingLessonPage :course="course" :progress-api="progressApi" /></template>
