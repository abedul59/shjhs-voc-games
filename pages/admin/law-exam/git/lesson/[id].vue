<script setup>
import { gitLessons, gitStages, createDefaultGitProgress } from '~/lib/git-course';

definePageMeta({ middleware: ['auth', 'law-auth'] });

const course = {
  lessons: gitLessons,
  stages: gitStages,
  createDefault: createDefaultGitProgress,
  base: '/admin/law-exam/git',
  shortTitle: 'Git / GitHub',
  logo: '⑂',
  accent: '#fb923c',
  editorLabel: 'Terminal / .gitconfig / workflow.yml',
  notePlaceholder: '記下今天理解的 Git 狀態、指令、協作流程或救援方法……'
};

const progressApi = useGitProgress();
</script>

<template>
  <ProgrammingLessonPage :course="course" :progress-api="progressApi" />
</template>
