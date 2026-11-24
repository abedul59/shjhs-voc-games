<script setup>
import { computed, ref } from 'vue';

const props = defineProps({ data: { type: Object, required: true }, answerMode: Boolean });
const root = ref(null);
const labels = ['A', 'B', 'C', 'D'];
const choiceQuestions = computed(() => [
  ...props.data.listening.image,
  ...props.data.listening.basic,
  ...props.data.listening.comprehension,
  ...props.data.grammarQuestions,
  ...props.data.groups.flatMap(group => group.questions)
].sort((a, b) => a.number - b.number));

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
            <h3>一、辨識句意：根據聽到的內容，選出符合描述的圖片。5%（每題1分）</h3>
            <div v-for="item in data.listening.image" :key="item.number" class="image-question">
              <b>{{ item.number }}</b>
              <div v-for="(choice,index) in item.choices" :key="index" class="image-choice">
                <span>({{ labels[index] }}) {{ choice.text }}</span>
                <img v-if="choice.image" :src="choice.image" alt="聽力選項圖片">
                <em v-else>貼上圖片</em>
              </div>
            </div>
            <h3>二、基本問答：選出最適合的回應或問句。5%（每題1分）</h3>
            <div v-for="question in data.listening.basic" :key="question.number" class="mcq"><b>{{ question.number }}. {{ question.stem }}</b><span v-for="(choice,index) in question.choices" :key="index">({{ labels[index] }}) {{ choice }}</span></div>
          </section>
          <section>
            <h3>三、言談理解：選出最適合的答案。10%（每題2分）</h3>
            <div v-for="question in data.listening.comprehension" :key="question.number" class="mcq"><b>{{ question.number }}. {{ question.stem }}</b><span v-for="(choice,index) in question.choices" :key="index">({{ labels[index] }}) {{ choice }}</span></div>
            <h3>四、文法、字彙和對話選擇</h3>
            <div v-for="question in data.grammarQuestions" :key="question.number" class="mcq compact"><b>{{ question.number }}. {{ question.stem }}</b><span>({{ labels[0] }}) {{ question.choices[0] }}　({{ labels[1] }}) {{ question.choices[1] }}　({{ labels[2] }}) {{ question.choices[2] }}　({{ labels[3] }}) {{ question.choices[3] }}</span></div>
          </section>
        </div>
        <footer>1</footer>
      </article>

      <article v-for="(group,pageIndex) in data.groups" :key="group.id" class="regular-exam-page b4-page">
        <header class="exam-header small"><h1>{{ data.metadata.schoolName }}　{{ data.metadata.grade }}年級英語科定期評量</h1></header>
        <div class="two-columns group-columns">
          <section>
            <h2>{{ group.title }}</h2>
            <div class="passage">{{ group.passage || '（請在編輯區輸入閱讀、對話或克漏字文章）' }}</div>
            <div v-if="group.glossary" class="glossary">{{ group.glossary }}</div>
          </section>
          <section>
            <div v-for="question in group.questions" :key="question.number" class="mcq"><b>{{ question.number }}. {{ question.stem }}</b><span v-for="(choice,index) in question.choices" :key="index">({{ labels[index] }}) {{ choice }}</span></div>
          </section>
        </div>
        <footer>{{ pageIndex + 2 }}</footer>
      </article>

      <article class="regular-exam-page b4-page">
        <header class="exam-header small"><h1>{{ data.metadata.schoolName }}　{{ data.metadata.grade }}年級英語科定期評量</h1></header>
        <h2>第二部分：非選擇題【請在答案卷作答】{{ data.preset.nonChoicePercent }}%</h2>
        <div class="two-columns non-choice-columns">
          <section>
            <h3>單字與文意字彙</h3>
            <div v-for="(item,index) in data.nonChoice.vocabulary" :key="item.id" class="written-item">{{ index + 1 }}. {{ item.prompt }}</div>
          </section>
          <section>
            <div v-for="section in data.nonChoice.sections" :key="section.id" class="written-section">
              <h3>{{ section.title }}</h3><p>{{ section.instructions }}</p>
              <div v-for="(item,index) in section.items" :key="item.id" class="written-item">{{ index + 1 }}. {{ item.prompt }}</div>
            </div>
          </section>
        </div>
        <div class="exam-end">考題結束。答案請寫在答案卷上。</div>
        <footer>{{ data.groups.length + 2 }}</footer>
      </article>
    </template>

    <template v-else>
      <article class="regular-exam-page a4-page">
        <header class="exam-header">
          <h1>{{ data.metadata.schoolName }}{{ data.metadata.schoolYear }}學年度第{{ data.metadata.semester }}學期{{ data.metadata.grade }}年級第{{ data.metadata.examNumber }}次定期評量　英語科　正確答案</h1>
          <p>{{ data.metadata.grade }}年　　班　座號　　　姓名　　　　　　　　　</p>
        </header>
        <h2>第一部分：選擇題 {{ data.preset.choicePercent }}%</h2>
        <div class="answer-grid"><span v-for="question in choiceQuestions" :key="question.number"><b>{{ question.number }}.</b>{{ labels[question.answer] || '＿' }}</span></div>
      </article>
      <article class="regular-exam-page a4-page">
        <header class="exam-header small"><h1>第二部分：非選擇題　正確答案</h1></header>
        <h3>單字與文意字彙</h3>
        <div class="written-answer-grid"><span v-for="(item,index) in data.nonChoice.vocabulary" :key="item.id"><b>{{ index + 1 }}.</b> {{ item.answer }}</span></div>
        <div v-for="section in data.nonChoice.sections" :key="section.id" class="answer-section"><h3>{{ section.title }}</h3><div class="written-answer-grid"><span v-for="(item,index) in section.items" :key="item.id"><b>{{ index + 1 }}.</b> {{ item.answer }}</span></div></div>
      </article>
    </template>
  </div>
</template>

<style scoped>
.regular-exam-document{display:grid;gap:18px;color:#000;font-family:'Times New Roman','新細明體',serif}.regular-exam-page{box-sizing:border-box;position:relative;margin:auto;background:#fff;overflow:hidden}.b4-page{width:257mm;height:364mm;padding:10mm}.a4-page{width:210mm;height:297mm;padding:12mm}.exam-header h1{margin:0;text-align:center;font-size:18pt;line-height:1.25}.exam-header p{margin:4px 0 7px;text-align:right;font-size:12pt}.exam-header.small h1{font-size:13pt;margin-bottom:5mm}.two-columns{display:grid;grid-template-columns:1fr 1fr;gap:7mm;height:calc(100% - 27mm)}.two-columns>section+section{padding-left:6mm;border-left:1px solid #000}h2{margin:3px 0;font-size:12pt}h3{margin:7px 0 4px;font-size:11pt;line-height:1.35}.image-question{display:grid;grid-template-columns:8mm repeat(3,1fr);border:1px solid #000;border-bottom:0;min-height:34mm}.image-question:last-of-type{border-bottom:1px solid #000}.image-question>b{display:grid;place-items:center;font-size:18pt;border-right:1px solid #000}.image-choice{display:flex;flex-direction:column;align-items:center;gap:2px;padding:2px;border-right:1px solid #000;text-align:center}.image-choice:last-child{border-right:0}.image-choice img{max-width:100%;height:24mm;object-fit:contain}.image-choice em{display:grid;place-items:center;width:100%;height:24mm;color:#777;border:1px dashed #aaa;font-size:9pt}.mcq{display:grid;gap:2px;margin:0 0 5px;font-size:10.5pt;line-height:1.3}.mcq b{font-weight:400}.mcq.compact{font-size:9.6pt;margin-bottom:3px}.passage{white-space:pre-wrap;font-size:12pt;line-height:1.55;text-align:justify;border:1px dashed #555;padding:5mm;min-height:230mm}.glossary{margin-top:3mm;padding:2mm;border:1px solid #555;white-space:pre-wrap}.group-columns section:last-child{overflow:hidden}.non-choice-columns{height:290mm}.written-item{margin:0 0 5mm;font-size:11.5pt;line-height:1.5;white-space:pre-wrap}.written-section{margin-bottom:7mm}.written-section p{white-space:pre-wrap}.exam-end{position:absolute;bottom:14mm;left:20%;right:20%;padding-top:3mm;border-top:1px dashed #000;text-align:center;font-size:15pt;font-weight:700}.regular-exam-page footer{position:absolute;bottom:4mm;left:0;right:0;text-align:center}.answer-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:8px;margin-top:8mm;font-size:14pt}.answer-grid span,.written-answer-grid span{padding:5px;border-bottom:1px solid #777}.written-answer-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:12pt}.answer-section{margin-top:10mm}@media(max-width:900px){.regular-exam-page{transform-origin:top left}}
</style>
