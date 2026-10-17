<script setup>
import { spanishLessons, spanishStages, createDefaultSpanishProgress } from '~/lib/spanish-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: spanishLessons, stages: spanishStages, createDefault: createDefaultSpanishProgress,
  base: '/admin/law-exam/spanish', eyebrow: 'PRIVATE SPANISH · ESPAÑOL', primary: 'Español', secondaryTitle: '/ 西班牙語',
  lead: '100 堂從 A1 到 C2 的私人西班牙語課程，整合發音、文法、情境會話、閱讀、寫作、文化與遊戲化單字練習。',
  logo: 'ES', tagline: 'Escucha · Habla · Lee · Escribe', roadmap: '從零開始到高階精準表達', accent: '#fbbf24', secondary: '#9a3412',
  roadmapSummary: '八大階段、100 堂課；由 A1 生存溝通循序前進到 C2 深度掌握。',
  syncCopy: '課程進度、練習答案、遊戲成績與私人筆記會同步至資料庫，可跨裝置繼續學習。',
  secondaryAction: { to: '/admin/law-exam/spanish/games', label: '進入西語單字遊戲' }
};
const progressApi = useSpanishProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
