<script setup>
import { gitLessons, gitStages, createDefaultGitProgress } from '~/lib/git-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: gitLessons,
  stages: gitStages,
  createDefault: createDefaultGitProgress,
  base: '/admin/law-exam/git',
  eyebrow: 'PRIVATE GIT · COLLABORATION WORKBENCH',
  primary: 'Git',
  secondaryTitle: '/ GitHub',
  lead: '從 Repository、Commit 與分支開始，完整掌握 Merge、Rebase、衝突、GitHub 協作、團隊治理、簽章、安全與災難復原。',
  logo: '⑂',
  tagline: '版本控制、協作、發布、救援',
  roadmap: '從 Git 基礎到專業團隊協作',
  roadmapSummary: '六大階段、100 堂完整課程與四個實戰專案皆已開放。',
  accent: '#fb923c',
  secondary: '#b91c1c',
  environmentKey: 'git'
};

const progressApi = useGitProgress();
</script>

<template>
  <ProgrammingCourseOverview :course="course" :progress-api="progressApi" />
</template>
