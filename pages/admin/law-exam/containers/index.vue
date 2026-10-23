<script setup>
import { containerLessons, containerStages, createDefaultContainerProgress } from '~/lib/container-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: containerLessons,
  stages: containerStages,
  createDefault: createDefaultContainerProgress,
  base: '/admin/law-exam/containers',
  eyebrow: 'PRIVATE CONTAINERS · OPERATIONS WORKBENCH',
  primary: 'Docker',
  secondaryTitle: '/ Podman',
  lead: '從容器與 OCI 基礎開始，完整掌握映像建置、Compose、資料服務、網路、儲存、安全、Registry、監控與正式部署。',
  logo: '📦',
  tagline: '建置、服務、安全、部署、維運',
  roadmap: '從第一個容器到可維運的正式服務',
  roadmapSummary: '六大階段、100 堂完整課程與六個整合實戰皆已開放。',
  accent: '#38bdf8',
  secondary: '#7c3aed',
  environmentKey: 'containers'
};

const progressApi = useContainerProgress();
</script>

<template>
  <ProgrammingCourseOverview :course="course" :progress-api="progressApi" />
</template>
