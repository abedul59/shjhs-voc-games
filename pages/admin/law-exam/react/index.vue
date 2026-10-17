<script setup>
import { createDefaultReactProgress, reactLessons, reactStages } from '~/lib/react-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: reactLessons, stages: reactStages, createDefault: createDefaultReactProgress,
  base: '/admin/law-exam/react', eyebrow: 'PRIVATE REACT · NEXT.JS · GATSBY WORKBENCH', primary: 'React.js', secondaryTitle: '/ Next.js / Gatsby',
  lead: '從現代 JavaScript、React 元件與 Hook，一路走到 Next.js 全端應用、Gatsby 內容網站、框架選擇、測試與正式部署。',
  logo: '⚛', tagline: '元件、全端、內容網站', roadmap: '從 React 元件到 Next.js 與 Gatsby 平台', accent: '#61dafb', secondary: '#27272a'
};
const progressApi = useReactProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
