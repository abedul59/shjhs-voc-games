<script setup>
import { dartFlutterLessons, dartFlutterStages, createDefaultDartFlutterProgress } from '~/lib/dart-flutter-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: dartFlutterLessons,
  stages: dartFlutterStages,
  createDefault: createDefaultDartFlutterProgress,
  base: '/admin/law-exam/dart-flutter',
  eyebrow: 'PRIVATE DART · FLUTTER WORKBENCH',
  primary: 'Dart',
  secondaryTitle: '/ Flutter',
  lead: '從 Dart 型別、非同步與套件工程開始，完整掌握 Flutter UI、狀態、資料、裝置整合、架構、測試、效能、安全與跨平台發布。',
  logo: '◢',
  tagline: '語言、行動裝置、跨平台、正式發布',
  roadmap: '從 Dart 基礎到 Flutter 跨平台正式產品',
  roadmapSummary: '十大階段、100 堂完整課程與五個總整實戰皆已開放。',
  accent: '#38bdf8',
  secondary: '#2563eb',
  environmentKey: 'dart-flutter'
};

const progressApi = useDartFlutterProgress();
</script>

<template>
  <ProgrammingCourseOverview :course="course" :progress-api="progressApi" />
</template>
