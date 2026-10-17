<script setup>
import { createDefaultJavaKotlinProgress, javaKotlinLessons, javaKotlinStages } from '~/lib/java-kotlin-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: javaKotlinLessons, stages: javaKotlinStages, createDefault: createDefaultJavaKotlinProgress,
  base: '/admin/law-exam/java-kotlin', shortTitle: 'Java / Kotlin', logo: '☕', accent: '#f59e0b',
  editorLabel: 'Main.java / Application.kt', notePlaceholder: '記下今天理解的 JVM、Java、Kotlin 或 Spring Boot 觀念……'
};
const progressApi = useJavaKotlinProgress();
</script>
<template><ProgrammingLessonPage :course="course" :progress-api="progressApi" /></template>
