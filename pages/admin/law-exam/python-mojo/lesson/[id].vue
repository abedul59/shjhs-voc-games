<script setup>
import { pythonMojoLessons, pythonMojoStages, createDefaultPythonMojoProgress } from '~/lib/python-mojo-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: pythonMojoLessons, stages: pythonMojoStages, createDefault: createDefaultPythonMojoProgress,
  base: '/admin/law-exam/python-mojo', shortTitle: 'Python / Mojo', logo: 'Py', accent: '#facc15',
  editorLabel: 'main.py / main.mojo', notePlaceholder: '記下今天理解的 Python、Mojo、資料或效能工程觀念……'
};
const progressApi = usePythonMojoProgress();
</script>
<template><ProgrammingLessonPage :course="course" :progress-api="progressApi" /></template>
