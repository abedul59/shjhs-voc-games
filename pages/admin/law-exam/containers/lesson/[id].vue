<script setup>
import { containerLessons, containerStages, createDefaultContainerProgress } from '~/lib/container-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: containerLessons,
  stages: containerStages,
  createDefault: createDefaultContainerProgress,
  base: '/admin/law-exam/containers',
  shortTitle: 'Docker / Podman',
  logo: '📦',
  accent: '#38bdf8',
  editorLabel: 'Terminal / Containerfile / compose.yaml',
  notePlaceholder: '記下今天理解的容器模型、指令、服務設定、安全限制或復原方法……'
};

const progressApi = useContainerProgress();
</script>

<template>
  <ProgrammingLessonPage :course="course" :progress-api="progressApi" />
</template>
