<script setup>
import { dartFlutterLessons, dartFlutterStages, createDefaultDartFlutterProgress } from '~/lib/dart-flutter-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: dartFlutterLessons,
  stages: dartFlutterStages,
  createDefault: createDefaultDartFlutterProgress,
  base: '/admin/law-exam/dart-flutter',
  shortTitle: 'Dart / Flutter',
  logo: '◢',
  accent: '#38bdf8',
  editorLabel: 'Dart / Flutter / pubspec.yaml',
  notePlaceholder: '記下今天理解的 Dart 型別、Flutter Widget、跨平台差異或發布方法……'
};

const progressApi = useDartFlutterProgress();
</script>

<template>
  <ProgrammingLessonPage :course="course" :progress-api="progressApi" />
</template>
