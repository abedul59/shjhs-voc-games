<script setup>
import { phpLessons, phpStages, createDefaultPhpProgress } from '~/lib/php-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: phpLessons,
  stages: phpStages,
  createDefault: createDefaultPhpProgress,
  base: '/admin/law-exam/php',
  shortTitle: 'PHP',
  logo: 'PHP',
  accent: '#a5b4fc',
  editorLabel: 'index.php / Application.php',
  notePlaceholder: '記下今天理解的 PHP、Web、安全或框架工程觀念……'
};

const progressApi = usePhpProgress();
</script>

<template>
  <ProgrammingLessonPage :course="course" :progress-api="progressApi" />
</template>
