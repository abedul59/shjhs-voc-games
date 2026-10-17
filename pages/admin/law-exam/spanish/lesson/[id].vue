<script setup>
import { spanishLessons, spanishStages, createDefaultSpanishProgress } from '~/lib/spanish-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = { lessons: spanishLessons, stages: spanishStages, createDefault: createDefaultSpanishProgress, base: '/admin/law-exam/spanish', accent: '#fbbf24' };
const progressApi = useSpanishProgress();
</script>
<template><LanguageLessonPage :course="course" :progress-api="progressApi" /></template>
