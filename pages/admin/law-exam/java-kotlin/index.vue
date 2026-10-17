<script setup>
import { createDefaultJavaKotlinProgress, javaKotlinLessons, javaKotlinStages } from '~/lib/java-kotlin-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: javaKotlinLessons, stages: javaKotlinStages, createDefault: createDefaultJavaKotlinProgress,
  base: '/admin/law-exam/java-kotlin', eyebrow: 'PRIVATE JVM · JAVA · KOTLIN WORKBENCH', primary: 'Java', secondaryTitle: '/ Kotlin',
  lead: '從 JVM、Java 語法與物件導向，一路走到 Kotlin 協程、Android、Spring Boot、資料庫、測試與正式部署。',
  logo: '☕', tagline: 'JVM、後端、Android、正式交付', roadmap: '從 Java 基礎到 Kotlin 正式平台', accent: '#f59e0b', secondary: '#7c3aed'
};
const progressApi = useJavaKotlinProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
