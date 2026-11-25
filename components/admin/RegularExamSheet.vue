<script setup>
import { computed, ref } from 'vue';

const props = defineProps({ data: { type: Object, required: true }, answerMode: Boolean, blankMode: Boolean });
const root = ref(null);
const labels = ['A', 'B', 'C', 'D'];
const FLOW_PAGE_CAPACITY = 112;

const choiceQuestions = computed(() => [
  ...props.data.listening.image,
  ...props.data.listening.basic,
  ...props.data.listening.comprehension,
  ...props.data.grammarQuestions,
  ...props.data.groups.flatMap(group => group.questions)
].sort((a, b) => a.number - b.number));

const textLines = (value, width = 48) => String(value || '').split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / width)), 0);
const questionSize = question => 2 + textLines(question.stem, 50) + textLines(question.choices.join('　'), 58);
const groupIntroSize = group => 4
  + textLines(group.passage || '（請在編輯區輸入閱讀、對話或克漏字文章）', 46)
  + (group.glossary ? textLines(group.glossary, 50) + 2 : 0);

const flowPages = computed(() => {
  const pages = [[]];
  let used = 0;
  const nextPage = () => { if (pages.at(-1).length) pages.push([]); used = 0; };
  props.data.groups.forEach(group => {
    const introSize = groupIntroSize(group);
    const firstQuestionSize = group.questions.length ? questionSize(group.questions[0]) : 0;
    if (pages.at(-1).length && (group.startNewPage || used + introSize + firstQuestionSize > FLOW_PAGE_CAPACITY)) nextPage();
    let segment = { ...group, id: `${group.id}-start`, questions: [] };
    pages.at(-1).push(segment);
    used += introSize;
    group.questions.forEach(question => {
      const size = questionSize(question);
      if (used + size > FLOW_PAGE_CAPACITY) {
        nextPage();
        segment = { ...group, id: `${group.id}-continued-${pages.length}`, title: `${group.title}（續）`, passage: '', glossary: '', questions: [] };
        pages.at(-1).push(segment);
        used = 3;
      }
      segment.questions.push(question);
      used += size;
    });
    if (!group.questions.length && used > FLOW_PAGE_CAPACITY) {
      used = FLOW_PAGE_CAPACITY;
    }
  });
  return pages.filter(page => page.length).length ? pages.filter(page => page.length) : [[]];
});

const questionPageCount = computed(() => flowPages.value.length + 2);
defineExpose({ getPages: () => [...root.value.querySelectorAll('.regular-exam-page')] });
</script>

<template>
  <div ref="root" class="regular-exam-document">
    <template v-if="!answerMode">
      <article class="regular-exam-page b4-page">
        <header class="exam-header">
          <h1>{{ data.metadata.schoolName }}{{ data.metadata.schoolYear }}學年度第{{ data.metadata.semester }}學期{{ data.metadata.grade }}年級第{{ data.metadata.examNumber }}次定期評量　英語科　題目卷</h1>
          <p>{{ data.metadata.grade }}年　　班　座號　　　姓名　　　　　　　　　</p>
        </header>
        <div class="two-columns front-columns">
          <section>
            <h2>第一部分：選擇題【請在電腦答案卡上作答】{{ data.preset.choicePercent }}%</h2>
            <h2>聽力素養測驗 20%</h2>
            <h3>一、辨識句意：根據聽到的內容，選出符合描述的圖片。（{{ data.sectionPoints?.image ?? 5 }} 分）</h3>
            <div v-for="item in data.listening.image" :key="item.number" class="image-question">
              <b>{{ item.number }}</b>
              <div v-for="(choice,index) in item.choices" :key="index" class="image-choice">
                <span>({{ labels[index] }}) {{ choice.text }}</span>
                <img v-if="choice.image" :src="choice.image" alt="聽力選項圖片">
                <em v-else>貼上圖片</em>
              </div>
            </div>
            <h3>二、基本問答：選出最適合的回應或問句。（{{ data.sectionPoints?.basic ?? 5 }} 分）</h3>
            <div v-for="question in data.listening.basic" :key="question.number" class="mcq"><b class="question-number">{{ question.number }}.</b><span class="question-stem">{{ question.stem }}</span><span v-for="(choice,index) in question.choices" :key="index">({{ labels[index] }}) {{ choice }}</span></div>
          </section>
          <section>
            <h3>三、言談理解：選出最適合的答案。（{{ data.sectionPoints?.comprehension ?? 10 }} 分）</h3>
            <div v-for="question in data.listening.comprehension" :key="question.number" class="mcq"><b class="question-number">{{ question.number }}.</b><span class="question-stem">{{ question.stem }}</span><span v-for="(choice,index) in question.choices" :key="index">({{ labels[index] }}) {{ choice }}</span></div>
            <h3>四、文法、字彙和對話選擇（{{ data.sectionPoints?.grammar ?? 0 }} 分）</h3>
            <div v-for="question in data.grammarQuestions" :key="question.number" class="mcq compact"><b class="question-number">{{ question.number }}.</b><span class="question-stem">{{ question.stem }}</span><span>({{ labels[0] }}) {{ question.choices[0] }}　({{ labels[1] }}) {{ question.choices[1] }}　({{ labels[2] }}) {{ question.choices[2] }}　({{ labels[3] }}) {{ question.choices[3] }}</span></div>
          </section>
        </div>
        <footer>第 1 頁／共 {{ questionPageCount }} 頁</footer>
      </article>

      <article v-for="(page,pageIndex) in flowPages" :key="pageIndex" class="regular-exam-page b4-page flow-page">
        <header class="exam-header small"><h1>{{ data.metadata.schoolName }}　{{ data.metadata.grade }}年級英語科定期評量</h1></header>
        <div class="flow-columns">
          <section v-for="group in page" :key="group.id" class="flow-group">
            <h2>{{ group.title }}（{{ data.sectionPoints?.[group.id.replace(/-start$|-continued-\d+$/, '')] ?? 0 }} 分）</h2>
            <div class="passage">{{ group.passage || '（請在編輯區輸入閱讀、對話或克漏字文章）' }}</div>
            <div v-if="group.glossary" class="glossary">{{ group.glossary }}</div>
            <div v-for="question in group.questions" :key="question.number" class="mcq"><b class="question-number">{{ question.number }}.</b><span class="question-stem">{{ question.stem }}</span><span v-for="(choice,index) in question.choices" :key="index">({{ labels[index] }}) {{ choice }}</span></div>
          </section>
        </div>
        <footer>第 {{ pageIndex + 2 }} 頁／共 {{ questionPageCount }} 頁</footer>
      </article>

      <article class="regular-exam-page b4-page non-choice-page">
        <header class="exam-header small"><h1>{{ data.metadata.schoolName }}　{{ data.metadata.grade }}年級英語科定期評量</h1></header>
        <h2>第二部分：非選擇題【請在答案卷作答】{{ data.preset.nonChoicePercent }}%</h2>
        <div class="compact-written-flow">
          <section v-if="data.nonChoice.vocabulary.length" class="written-section">
            <h3>單字與文意字彙（{{ data.sectionPoints?.vocabulary ?? 0 }} 分）</h3>
            <div v-for="(item,index) in data.nonChoice.vocabulary" :key="item.id" class="written-item">{{ index + 1 }}. {{ item.prompt }}</div>
          </section>
          <section v-for="section in data.nonChoice.sections" :key="section.id" class="written-section">
            <h3>{{ section.title }}（{{ data.sectionPoints?.[section.id] ?? 0 }} 分）</h3><p v-if="section.instructions">{{ section.instructions }}</p>
            <div v-for="(item,index) in section.items" :key="item.id" class="written-item">{{ index + 1 }}. {{ item.prompt }}</div>
          </section>
        </div>
        <div class="exam-end">考題結束。答案請寫在答案卷上。</div>
        <footer>第 {{ questionPageCount }} 頁／共 {{ questionPageCount }} 頁</footer>
      </article>
    </template>

    <template v-else>
      <article class="regular-exam-page a4-page answer-page">
        <header class="exam-header answer-header">
          <h1>{{ data.metadata.schoolName }}{{ data.metadata.schoolYear }}學年度第{{ data.metadata.semester }}學期{{ data.metadata.grade }}年級第{{ data.metadata.examNumber }}次定期評量　英語科　{{ blankMode ? '答案卷' : '正確答案' }}</h1>
          <p v-if="blankMode">{{ data.metadata.grade }}年　　班　座號　　　姓名　　　　　　　　　</p>
        </header>
        <template v-if="!blankMode"><h2>第一部分：選擇題 {{ data.preset.choicePercent }}%</h2><div class="answer-grid"><span v-for="question in choiceQuestions" :key="question.number"><b>{{ question.number }}.</b>{{ labels[question.answer] || '＿' }}</span></div></template>
        <h2 class="answer-part-title">第二部分：非選擇題 {{ data.preset.nonChoicePercent }}%</h2>
        <div class="written-answer-flow">
          <section v-if="data.nonChoice.vocabulary.length" class="answer-section"><h3>單字與文意字彙</h3><span v-for="(item,index) in data.nonChoice.vocabulary" :key="item.id"><b>{{ index + 1 }}.</b> {{ blankMode ? '　　　　　　　　　' : item.answer }}</span></section>
          <section v-for="section in data.nonChoice.sections" :key="section.id" class="answer-section"><h3>{{ section.title }}</h3><span v-for="(item,index) in section.items" :key="item.id"><b>{{ index + 1 }}.</b> {{ blankMode ? '　　　　　　　　　' : item.answer }}</span></section>
        </div>
        <div v-if="blankMode" class="score-boxes"><div>選擇題分數<br><br></div><div>非選擇題分數<br><br></div><div>總分<br><br></div></div>
      </article>
    </template>
  </div>
</template>

<style scoped>
.regular-exam-document{display:grid;gap:18px;color:#000;font-family:'Times New Roman','新細明體',serif}.regular-exam-page{box-sizing:border-box;position:relative;margin:auto;background:#fff;overflow:hidden}.b4-page{width:257mm;height:364mm;padding:9mm 10mm}.a4-page{width:210mm;height:297mm;padding:9mm 10mm}.exam-header h1{margin:0;text-align:center;font-size:18pt;line-height:1.25}.exam-header p{margin:4px 0 7px;text-align:right;font-size:12pt}.exam-header.small h1{font-size:13pt;margin-bottom:3mm}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:7mm;height:calc(100% - 25mm)}.two-columns>section+section{padding-left:6mm;border-left:1px solid #000}h2{margin:3px 0;font-size:12pt}h3{margin:5px 0 3px;font-size:10.5pt;line-height:1.25}.image-question{display:grid;grid-template-columns:8mm repeat(3,1fr);border:1px solid #000;border-bottom:0;min-height:34mm;break-inside:avoid}.image-question:last-of-type{border-bottom:1px solid #000}.image-question>b{display:grid;place-items:center;font-size:18pt;border-right:1px solid #000}.image-choice{display:flex;flex-direction:column;align-items:center;gap:2px;padding:2px;border-right:1px solid #000;text-align:center}.image-choice:last-child{border-right:0}.image-choice img{max-width:100%;height:24mm;object-fit:contain}.image-choice em{display:grid;place-items:center;width:100%;height:24mm;color:#777;border:1px dashed #aaa;font-size:9pt}.mcq{display:grid;gap:1px;margin:0 0 4px;font-size:10pt;line-height:1.24;break-inside:avoid-column}.mcq b{font-weight:400}.mcq.compact{font-size:9.4pt;margin-bottom:2.5px}.flow-columns{height:calc(100% - 16mm);column-count:2;column-gap:8mm;column-rule:1px solid #000;column-fill:auto;overflow:hidden}.flow-group{display:block;margin:0 0 4mm;break-inside:auto}.flow-group h2{margin-top:0;break-after:avoid-column}.passage{white-space:pre-wrap;font-size:11pt;line-height:1.4;text-align:justify;margin-bottom:2.5mm;orphans:3;widows:3}.glossary{margin:0 0 2.5mm;padding:1.5mm;border:1px solid #555;white-space:pre-wrap;font-size:9.5pt;break-inside:avoid-column}.compact-written-flow{height:calc(100% - 28mm);column-count:2;column-gap:8mm;column-rule:1px solid #000;column-fill:balance;overflow:hidden}.written-section{margin:0 0 3mm;break-inside:auto}.written-section h3{break-after:avoid-column}.written-section p{margin:0 0 1.5mm;white-space:pre-wrap;font-size:10pt}.written-item{max-width:100%;margin:0 0 1.5mm;font-size:10.5pt;line-height:1.28;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;break-inside:avoid-column}.exam-end{position:absolute;bottom:11mm;left:28%;right:28%;padding-top:2mm;border-top:1px dashed #000;text-align:center;font-size:12pt;font-weight:700}.regular-exam-page footer{position:absolute;bottom:3mm;left:0;right:0;text-align:center;font-size:9pt}.answer-header h1{font-size:14.5pt;margin-bottom:3mm}.answer-page h2{font-size:11pt}.answer-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:1.5mm 2mm;margin-top:2mm;font-size:10pt}.answer-grid span{padding:1mm 0;border-bottom:1px solid #777}.answer-part-title{margin-top:4mm!important;padding-top:2mm;border-top:1px solid #000}.written-answer-flow{column-count:3;column-gap:5mm;column-rule:1px solid #aaa;column-fill:balance;height:190mm;overflow:hidden}.answer-section{display:flex;flex-direction:column;margin-bottom:2.5mm;break-inside:avoid-column}.answer-section h3{margin:0 0 1mm;font-size:9.5pt;break-after:avoid-column}.answer-section span{padding:.6mm 0;border-bottom:1px dotted #aaa;font-size:9pt;line-height:1.2;overflow-wrap:anywhere;break-inside:avoid-column}@media(max-width:900px){.regular-exam-page{transform-origin:top left}}
.mcq{grid-template-columns:8mm 1fr;gap:1px 0}.mcq .question-number{grid-column:1;grid-row:1/-1;font-weight:700;font-size:1.06em}.mcq .question-stem,.mcq>span:not(.question-stem){grid-column:2}.passage{padding:2mm;border:1px dashed #000}.score-boxes{position:absolute;bottom:12mm;left:9mm;right:9mm;display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;text-align:center}.score-boxes div{border:1px solid #000;padding:2mm;height:23mm}.answer-page:has(.score-boxes) .written-answer-flow{height:210mm}
</style>
