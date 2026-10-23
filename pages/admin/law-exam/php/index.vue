<script setup>
import { phpLessons, phpStages, createDefaultPhpProgress } from '~/lib/php-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: phpLessons,
  stages: phpStages,
  createDefault: createDefaultPhpProgress,
  base: '/admin/law-exam/php',
  eyebrow: 'PRIVATE PHP · WEB ENGINEERING WORKBENCH',
  primary: 'PHP',
  secondaryTitle: '/ Web Engineering',
  lead: '從 PHP 8 現代語法、物件導向與 Composer，一路走到 HTTP、安全、PDO，以及完整 Laravel 架構、Eloquent、認證、Queue、測試與正式部署。',
  logo: 'PHP',
  tagline: '現代語言、Web 後端、正式交付',
  roadmap: '從 PHP 基礎到正式 Web 平台',
  roadmapSummary: '七大階段、100 堂完整課程與四個實戰專案皆已開放。',
  accent: '#a5b4fc',
  secondary: '#4f46e5',
  environmentKey: 'php'
};

const progressApi = usePhpProgress();
</script>

<template>
  <ProgrammingCourseOverview :course="course" :progress-api="progressApi" />
</template>
