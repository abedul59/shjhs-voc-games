<script setup>
import { csharpLessons, csharpStages, createDefaultCSharpProgress } from '~/lib/csharp-course';
definePageMeta({ middleware: ['auth', 'law-auth'] });
const course = {
  lessons: csharpLessons, stages: csharpStages, createDefault: createDefaultCSharpProgress,
  base: '/admin/law-exam/csharp', eyebrow: 'PRIVATE C# · .NET WORKBENCH', primary: 'C#', secondaryTitle: '/ .NET',
  lead: '從 C# 語法、物件導向與 LINQ，一路走到 Async、ASP.NET Core、EF Core、Blazor、MAUI、Unity、測試與雲原生部署。',
  logo: '#', tagline: '語言、全端、跨平台、正式交付', roadmap: '從 C# 基礎到正式 .NET 平台', accent: '#a78bfa', secondary: '#2563eb'
};
const progressApi = useCSharpProgress();
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
