<script setup>
import { pythonMojoLessons, pythonMojoStages, createDefaultPythonMojoProgress } from '~/lib/python-mojo-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: pythonMojoLessons, stages: pythonMojoStages, createDefault: createDefaultPythonMojoProgress,
  base: '/admin/law-exam/python-mojo', eyebrow: 'PRIVATE PYTHON · MOJO PERFORMANCE LAB', primary: 'Python', secondaryTitle: '/ Mojo',
  lead: '從 Python 基礎、型別、非同步與 Web，一路走到資料科學、AI、GPU，以及 Mojo 的所有權、SIMD、高效能核心與 Python 互通。',
  logo: 'Py', tagline: '快速開發、資料、AI、跨硬體效能', roadmap: '從 Python 基礎到 Python／Mojo 正式平台', accent: '#facc15', secondary: '#f97316', environmentKey: 'python-mojo'
};
const progressApi = usePythonMojoProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
