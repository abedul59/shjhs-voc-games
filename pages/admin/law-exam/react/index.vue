<script setup>
import { createDefaultReactProgress, reactLessons, reactStages } from '~/lib/react-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: reactLessons, stages: reactStages, createDefault: createDefaultReactProgress,
  base: '/admin/law-exam/react', eyebrow: 'PRIVATE REACT · NEXT.JS WORKBENCH', primary: 'React.js', secondaryTitle: '/ Next.js',
  lead: '從現代 JavaScript、React 元件與 Hook，一路走到 Next.js App Router、Server Actions、資料庫、測試與正式 SaaS。',
  logo: '⚛', tagline: '元件、全端、正式交付', roadmap: '從 React 元件到 Next.js 全端平台', accent: '#61dafb', secondary: '#27272a'
};
const progressApi = useReactProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
