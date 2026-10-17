<script setup>
import { csharpLessons, csharpStages, createDefaultCSharpProgress } from '~/lib/csharp-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: csharpLessons, stages: csharpStages, createDefault: createDefaultCSharpProgress,
  base: '/admin/law-exam/csharp', shortTitle: 'C# / .NET', logo: '#', accent: '#a78bfa',
  editorLabel: 'Program.cs / Application.cs', notePlaceholder: '記下今天理解的 C#、.NET 或 ASP.NET Core 觀念……'
};
const progressApi = useCSharpProgress();
</script>
<template><ProgrammingLessonPage :course="course" :progress-api="progressApi" /></template>
