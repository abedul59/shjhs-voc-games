<script setup>
import { ref } from 'vue';

defineProps({
  metadata: { type: Object, required: true },
  writingQuestions: { type: Array, default: () => [] },
  matchingOptions: { type: Array, default: () => [] },
  matchingQuestions: { type: Array, default: () => [] },
  answerMode: { type: Boolean, default: false }
});

const sheet = ref(null);
const groupAt = (items, row, count = 5) => items.slice(row * count, row * count + count);
defineExpose({ getElement: () => sheet.value });
</script>

<template>
  <article ref="sheet" class="exam-sheet">
    <h1>{{ metadata.schoolName }}{{ metadata.schoolYear }}學年度第{{ metadata.semester }}學期 {{ metadata.grade }}年級 {{ metadata.examTitle }}</h1>
    <p class="student-line">{{ metadata.grade }}年　　班　　號　姓名　　　　　　　　　</p>

    <h2>看中文寫出英文　手寫題 50%（每題兩分）</h2>
    <table class="question-table writing-table">
      <template v-for="row in 5" :key="`writing-${row}`">
        <tr class="prompt-row"><td v-for="(item, index) in groupAt(writingQuestions, row - 1)" :key="item.id || index"><span>{{ (row - 1) * 5 + index + 1 }}</span>　{{ item.zh }}</td></tr>
        <tr class="answer-row"><td v-for="(item, index) in groupAt(writingQuestions, row - 1)" :key="item.id || index">{{ answerMode ? item.en : '' }}</td></tr>
      </template>
    </table>

    <h2 class="matching-title">看英文標出中文　配合題50%　（每題兩分，請寫以下的「代號」，若無法辨識，則不予給分）</h2>
    <table class="option-table">
      <tr v-for="row in 7" :key="`option-${row}`">
        <template v-for="option in groupAt(matchingOptions, row - 1)" :key="option.code">
          <td class="option-code">{{ option.code }}</td><td class="option-meaning">{{ option.meaning }}</td>
        </template>
      </tr>
    </table>

    <table class="question-table matching-table">
      <template v-for="row in 5" :key="`matching-${row}`">
        <tr class="prompt-row"><td v-for="(item, index) in groupAt(matchingQuestions, row - 1)" :key="item.id || index"><span>{{ (row - 1) * 5 + index + 26 }}</span>　{{ item.en }}</td></tr>
        <tr class="answer-row"><td v-for="(item, index) in groupAt(matchingQuestions, row - 1)" :key="item.id || index">{{ answerMode ? item.answerCode : '' }}</td></tr>
      </template>
    </table>
  </article>
</template>

<style scoped>
.exam-sheet { width: 210mm; height: 297mm; box-sizing: border-box; padding: 10mm; overflow: hidden; background: #fff; color: #000; font-family: 'Times New Roman','新細明體','PMingLiU',serif; font-size: 12pt; line-height: 1.12; }
h1 { margin: 0 0 18mm; text-align: center; font-family: '新細明體','PMingLiU',serif; font-size: 14pt; font-weight: 400; white-space: nowrap; }
.student-line { margin: 0 0 1.5mm; text-align: right; font-family: '新細明體','PMingLiU',serif; font-size: 12pt; white-space: pre; }
h2 { margin: 0 0 1mm; font-family: '新細明體','PMingLiU',serif; font-size: 12pt; font-weight: 400; white-space: nowrap; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; }
td { border: .28mm solid #000; vertical-align: middle; box-sizing: border-box; }
.question-table td { width: 20%; }
.prompt-row td { height: 6.8mm; padding: .8mm 1.8mm; background: #c9c9c9; font-size: 11.5pt; }
.answer-row td { height: 10.2mm; padding: .6mm 1mm; text-align: center; font-size: 12pt; }
.matching-title { margin-top: 6.2mm; font-size: 11.5pt; letter-spacing: -.1mm; }
.option-table td { height: 6.25mm; padding: .45mm 1.2mm; font-size: 11.2pt; }
.option-table .option-code { width: 6.8%; padding-left: 1.6mm; background: #e1e1e1; }
.option-table .option-meaning { width: 13.2%; font-family: '新細明體','PMingLiU',serif; }
.matching-table { margin-top: 6.2mm; }
.matching-table .prompt-row td { text-align: center; font-family: 'Times New Roman',serif; }
.matching-table .answer-row td { font-family: 'Times New Roman','新細明體','PMingLiU',serif; }
@media screen and (max-width: 900px) { .exam-sheet { transform-origin: top left; } }
</style>
