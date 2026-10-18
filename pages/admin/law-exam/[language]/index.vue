<script setup>
import { getPrivateLanguageCourse } from '~/lib/private-language-courses';
definePageMeta({ middleware: ['auth','law-auth'] });
const route = useRoute(); const data = getPrivateLanguageCourse(route.params.language);
if (!data) throw createError({ statusCode: 404, statusMessage: '找不到私人語言課程' });
const course = {
  ...data, eyebrow: `PRIVATE ${data.nativeName.toUpperCase()}`, primary: data.nativeName, secondaryTitle: `/ ${data.name}`,
  lead: `100 堂從 A1 到 C2 的私人${data.name}課程，整合發音、文法、情境會話、閱讀、寫作、文化與 20 種遊戲。`,
  roadmap: `從零開始到${data.name}高階精準表達`, roadmapSummary: `八大階段、100 堂課與 1,000 個練習項目；由 A1 生存溝通循序前進到 C2 深度掌握。`,
  syncCopy: '課程進度、練習答案、遊戲成績與私人筆記會同步至資料庫，可跨裝置繼續學習。',
  secondaryAction: { to: `${data.base}/games`, label: `進入${data.name}單字遊戲` }
};
const progressApi = usePrivateLanguageProgress(data);
</script>
<template><ProgrammingCourseOverview :course="course" :progress-api="progressApi" /></template>
