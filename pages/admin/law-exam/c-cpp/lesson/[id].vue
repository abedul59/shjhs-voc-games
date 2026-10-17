<script setup>
import { cCppLessons, cCppStages, createDefaultCCppProgress } from '~/lib/c-cpp-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: cCppLessons, stages: cCppStages, createDefault: createDefaultCCppProgress,
  base: '/admin/law-exam/c-cpp', shortTitle: 'C / C++', logo: 'C++', accent: '#60a5fa',
  editorLabel: 'main.c / main.cpp', notePlaceholder: '記下今天理解的 C、C++、記憶體或系統程式觀念……'
};
const progressApi = useCCppProgress();
</script>
<template><ProgrammingLessonPage :course="course" :progress-api="progressApi" /></template>
