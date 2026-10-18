<script setup>
import { getPrivateLanguageCourse } from '~/lib/private-language-courses';
definePageMeta({ middleware: ['auth','law-auth'] });
const route = useRoute(); const course = getPrivateLanguageCourse(route.params.language);
if (!course) throw createError({ statusCode: 404, statusMessage: '找不到私人語言課程' });
const progressApi = usePrivateLanguageProgress(course);
</script>
<template><PrivateLanguageGames :course="course" :progress-api="progressApi" /></template>
