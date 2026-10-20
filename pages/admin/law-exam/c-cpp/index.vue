<script setup>
import { cCppLessons, cCppStages, createDefaultCCppProgress } from '~/lib/c-cpp-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: cCppLessons, stages: cCppStages, createDefault: createDefaultCCppProgress,
  base: '/admin/law-exam/c-cpp', eyebrow: 'PRIVATE C · C++ SYSTEMS LAB', primary: 'C', secondaryTitle: '/ C++',
  lead: '從 C17 的記憶體與系統程式，一路學到現代 C++23、STL、並行、效能、安全、跨平台建置與完整專案。',
  logo: 'C++', tagline: '底層、效能、系統、正式交付', roadmap: '從 C 基礎到現代 C++ 正式系統', accent: '#60a5fa', secondary: '#7c3aed', environmentKey: 'c-cpp'
};
const progressApi = useCCppProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
