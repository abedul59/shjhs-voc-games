<script setup>
import { createDefaultReactProgress, reactLessons, reactStages } from '~/lib/react-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: reactLessons, stages: reactStages, createDefault: createDefaultReactProgress,
  base: '/admin/law-exam/react', shortTitle: 'React / Next.js / Gatsby', logo: '⚛', accent: '#61dafb',
  editorLabel: 'component.tsx / route.ts / gatsby-node.js', notePlaceholder: '記下今天理解的 React、Next.js 或 Gatsby 觀念……'
};
const progressApi = useReactProgress();
</script>
<template><ProgrammingLessonPage :course="course" :progress-api="progressApi" /></template>
