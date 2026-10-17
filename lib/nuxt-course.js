export const NUXT_STORAGE_KEY = 'private-nuxt-academy-v1';
export const NUXT_PROGRESS_OWNER = 'private-nuxt-owner';

export const nuxtStages = [
  { id: 'javascript', number: '01', icon: '🟨', title: 'JavaScript 基礎', subtitle: '先建立可靠的前端語言底座', color: '#ca8a04' },
  { id: 'vue', number: '02', icon: '💚', title: 'Vue 3 核心', subtitle: '元件、響應式與 Composition API', color: '#059669' },
  { id: 'app', number: '03', icon: '🧭', title: '應用程式設計', subtitle: '表單、狀態、路由與資料流', color: '#0891b2' },
  { id: 'nuxt', number: '04', icon: '▲', title: 'Nuxt.js 全端', subtitle: 'SSR、資料取得與 Server API', color: '#0f766e' },
  { id: 'quality', number: '05', icon: '🧪', title: '品質與上線', subtitle: '測試、效能、無障礙與安全', color: '#7c3aed' },
  { id: 'projects', number: '06', icon: '🚀', title: '實作專案', subtitle: '儀表板、CRUD 與正式部署', color: '#db2777' }
];

const lesson = (id, stage, order, duration, title, subtitle, objectives, sections, challenge, quiz) => ({ id, stage, order, duration, title, subtitle, objectives, sections, challenge, quiz, available: true });

export const nuxtLessons = [
  lesson('js-first-step', 'javascript', 1, 25, 'JavaScript 的第一步', '變數、輸出、運算與開發者工具',
    ['使用 const 與 let', '理解運算式與陳述式', '在瀏覽器主控台除錯'], [
      { title: 'JavaScript 在哪裡執行', body: 'JavaScript 可在瀏覽器與 Node.js 執行。瀏覽器提供 DOM 等 Web API，Node.js 提供檔案與伺服器能力；Nuxt 開發會同時碰到兩邊。', code: 'console.log("Hello, JavaScript!")\n// 瀏覽器：DevTools Console\n// Node：node app.js' },
      { title: '優先使用 const', body: 'const 防止重新指定，let 用於確實會改變的綁定，避免 var 的函式作用域與提升陷阱。const 物件的內容仍可修改。', code: 'const language = "JavaScript"\nlet level = 1\nlevel += 1\nconst learner = { name: "Alex" }\nlearner.name = "Sam"' },
      { title: '嚴格相等與模板字串', body: '優先使用 === 與 !==，避免隱式型別轉換造成驚喜。反引號模板字串可插入運算式並保留多行格式。', code: 'const score = 90\nconsole.log(`目前分數：${score}`)\nconsole.log(score === "90") // false' }
    ], { title: '輸出學習宣言', description: '建立 name 與 goal，以模板字串輸出一句宣言。', starter: 'const name = "Alex"\nconst goal = "學會 Nuxt"\n// 輸出：Alex 的目標：學會 Nuxt', solution: 'const name = "Alex"\nconst goal = "學會 Nuxt"\nconsole.log(`${name} 的目標：${goal}`)', required: ['const name', 'const goal', 'console.log', '${name}', '${goal}'], expectedOutput: 'Alex 的目標：學會 Nuxt', hints: ['使用反引號建立模板字串。', '以 ${變數} 插入內容。'] },
    { question: '一般情況下，不需要重新指定的變數應優先使用什麼？', choices: ['var', 'let', 'const', 'static'], answer: 2, explanation: 'const 能清楚表達綁定不會被重新指定。' }),

  lesson('js-types', 'javascript', 2, 35, '型別與資料轉換', '理解原始值、物件與常見陷阱',
    ['辨識 JavaScript 基本型別', '正確處理 null 與 undefined', '進行明確型別轉換'], [
      { title: '動態型別不是沒有型別', body: '值有型別，變數可在執行期間指向不同型別的值。常見原始型別包含 string、number、boolean、undefined、bigint、symbol 與 null。', code: 'typeof "Vue"       // "string"\ntypeof 42          // "number"\ntypeof undefined   // "undefined"\ntypeof null        // "object"（歷史特例）' },
      { title: 'Truthy 與 Nullish', body: 'if 會把值轉為布林；0、空字串、null、undefined、NaN 是 falsy。?? 只在 null 或 undefined 時使用預設值，比 || 更能保留合法的 0 與空字串。', code: 'const count = 0\nconsole.log(count || 10)  // 10\nconsole.log(count ?? 10)  // 0' },
      { title: '轉換應明確', body: 'Number、String、Boolean 表達轉換意圖。Number.isNaN 檢查無效數字；parseInt 要指定進位並確認結果。', code: 'const amount = Number("42")\nconst invalid = Number("hello")\nconsole.log(Number.isNaN(invalid)) // true' }
    ], { title: '安全解析頁數', description: '將輸入轉成數字；無效或小於 1 時回傳 1。', starter: 'function parsePage(input) {\n  // 轉換並驗證\n}', solution: 'function parsePage(input) {\n  const page = Number(input)\n  if (!Number.isInteger(page) || page < 1) return 1\n  return page\n}', required: ['function parsePage', 'Number(input)', 'Number.isInteger(page)', 'page < 1', 'return page'], expectedOutput: 'parsePage("3") 為 3；parsePage("x") 為 1', hints: ['先以 Number 轉換。', '用 Number.isInteger 確認整數。'] },
    { question: '希望保留合法的 0，但在 null/undefined 時給預設值，應使用？', choices: ['||', '??', '&&', '==='], answer: 1, explanation: 'Nullish coalescing 只把 null 與 undefined 視為缺值。' }),

  lesson('js-collections', 'javascript', 3, 40, '陣列與物件', '用不可變思維整理資料',
    ['建立與解構陣列物件', '使用 map、filter、reduce', '理解展開語法與淺拷貝'], [
      { title: '物件描述具名資料', body: '物件屬性可用點號或中括號存取。解構能取出欄位並設定預設值，optional chaining 可安全讀取可能不存在的巢狀值。', code: 'const course = { title: "Vue", lessons: 21 }\nconst { title, lessons = 0 } = course\nconst city = user.address?.city ?? "未知"' },
      { title: '陣列方法建立資料管線', body: 'map 轉換每項、filter 保留符合項目、find 找第一項、reduce 累積結果。多數情況回傳新陣列比原地修改更容易追蹤。', code: 'const scores = [50, 80, 90]\nconst passed = scores.filter(score => score >= 60)\nconst doubled = passed.map(score => score * 2)' },
      { title: '展開是淺拷貝', body: '... 可建立新陣列或物件，但只複製第一層；巢狀物件仍共享參照。更新 Vue 狀態時要明確複製會改變的每一層。', code: 'const updated = {\n  ...user,\n  profile: { ...user.profile, theme: "dark" }\n}' }
    ], { title: '計算及格平均', description: '先篩選及格成績，再用 reduce 加總並除以數量。', starter: 'function passedAverage(scores) {\n  // filter 與 reduce\n}', solution: 'function passedAverage(scores) {\n  const passed = scores.filter(score => score >= 60)\n  if (passed.length === 0) return 0\n  const total = passed.reduce((sum, score) => sum + score, 0)\n  return total / passed.length\n}', required: ['.filter(', 'score >= 60', 'passed.length === 0', '.reduce(', 'total / passed.length'], expectedOutput: 'passedAverage([50, 80, 90]) 為 85', hints: ['先處理沒有及格成績的情況。', 'reduce 的初始總和設為 0。'] },
    { question: '物件展開語法建立的是什麼拷貝？', choices: ['深拷貝', '淺拷貝', '唯讀拷貝', '不會複製'], answer: 1, explanation: '巢狀參照仍會被共享，需要逐層更新。' }),

  lesson('js-functions', 'javascript', 4, 40, '函式、作用域與模組', '建立可組合、可重用的程式單位',
    ['區分函式宣告與箭頭函式', '理解閉包與作用域', '使用 ESM 匯入匯出'], [
      { title: '函式是一等值', body: '函式可被傳入、回傳與儲存。箭頭函式沒有自己的 this，適合短回呼；物件方法需要動態 this 時通常使用一般方法語法。', code: 'function double(value) { return value * 2 }\nconst triple = value => value * 3\nconst apply = (value, operation) => operation(value)' },
      { title: '閉包保留外部狀態', body: '內層函式可存取建立當下的詞法作用域，即使外層函式已結束。閉包適合封裝私人狀態，也是 Vue composable 的基礎。', code: 'function createCounter() {\n  let count = 0\n  return () => ++count\n}\nconst next = createCounter()' },
      { title: 'ES Modules 建立邊界', body: 'export 公開功能，import 宣告依賴。命名匯出利於自動完成與重構；避免模組載入時產生難以預期的全域副作用。', code: '// math.js\nexport const sum = (a, b) => a + b\n// app.js\nimport { sum } from "./math.js"' }
    ], { title: '建立計數器閉包', description: '每次呼叫回傳比前次多 1 的數字。', starter: 'function createCounter() {\n  // 私有 count 與回傳函式\n}', solution: 'function createCounter() {\n  let count = 0\n  return () => {\n    count += 1\n    return count\n  }\n}', required: ['function createCounter', 'let count = 0', 'return () =>', 'count += 1', 'return count'], expectedOutput: '連續呼叫得到 1、2、3', hints: ['count 宣告在外層函式內。', '回傳的函式會保留 count。'] },
    { question: '箭頭函式的 this 有何特性？', choices: ['每次自動建立', '取自外層詞法作用域', '永遠是 window', '不能使用參數'], answer: 1, explanation: '箭頭函式不綁定自己的 this。' }),

  lesson('js-async', 'javascript', 5, 50, '非同步 JavaScript', 'Promise、async/await 與可靠資料取得',
    ['理解事件迴圈概念', '使用 async/await', '處理取消、逾時與錯誤'], [
      { title: 'Promise 表示未來結果', body: '非同步工作不會阻塞整個執行緒。Promise 可能 pending、fulfilled 或 rejected；微任務會在目前同步程式結束後執行。', code: 'console.log("A")\nPromise.resolve().then(() => console.log("B"))\nconsole.log("C")\n// A、C、B' },
      { title: 'async/await 讓流程易讀', body: 'async 函式永遠回傳 Promise。await 只暫停目前 async 函式；用 try/catch 補上操作上下文，並確認 response.ok。', code: 'async function loadCourse(id) {\n  const response = await fetch(`/api/courses/${id}`)\n  if (!response.ok) throw new Error(`HTTP ${response.status}`)\n  return response.json()\n}' },
      { title: '獨立工作可並行', body: '沒有相依性的請求以 Promise.all 同時等待，避免瀑布式延遲。AbortController 能在元件卸載或新搜尋開始時取消舊請求。', code: 'const [profile, courses] = await Promise.all([\n  fetchProfile(),\n  fetchCourses()\n])' }
    ], { title: '可靠取得 JSON', description: '使用 fetch、response.ok 與 async/await 回傳 JSON。', starter: 'async function getJSON(url) {\n  // 取得並驗證回應\n}', solution: 'async function getJSON(url) {\n  const response = await fetch(url)\n  if (!response.ok) {\n    throw new Error(`Request failed: ${response.status}`)\n  }\n  return response.json()\n}', required: ['async function getJSON', 'await fetch(url)', 'if (!response.ok)', 'throw new Error', 'response.json()'], expectedOutput: '成功回傳解析後資料；失敗拋出狀態碼', hints: ['fetch 遇到 404 不會自動 reject。', '先檢查 ok 再解析。'] },
    { question: '兩個互不相依的非同步工作應如何同時等待？', choices: ['兩個連續 await', 'Promise.all', 'setInterval', 'JSON.parse'], answer: 1, explanation: 'Promise.all 可並行啟動並一起等待結果。' }),

  lesson('vue-first-component', 'vue', 6, 40, 'Vue 3 與單檔元件', '從畫面宣告走進元件世界',
    ['理解宣告式渲染', '讀懂 .vue 單檔元件', '使用 script setup'], [
      { title: 'Vue 讓畫面成為狀態函式', body: '不必手動找 DOM 更新文字；只要改變響應式狀態，Vue 會更新受影響的畫面。元件把資料、行為與樣式封裝成可重用單位。', code: '<script setup>\nimport { ref } from "vue"\nconst count = ref(0)\n<\/script>\n<template><button @click="count++">{{ count }}</button></template>' },
      { title: '單檔元件三區塊', body: '<script setup> 放狀態與邏輯，<template> 描述 HTML，<style scoped> 限制樣式作用域。元件名稱使用多字詞以避免和原生元素衝突。', code: '<script setup>\nconst title = "Vue 課程"\n<\/script>\n<template><h1>{{ title }}</h1></template>\n<style scoped>h1 { color: #42b883; }</style>' },
      { title: 'Vite 提供開發體驗', body: 'create-vue 建立純 Vue 專案，Nuxt 則建立全端 Vue 應用。開發伺服器支援快速模組更新，正式建置會最佳化資源。', code: 'npm create vue@latest\nnpm create nuxt@latest my-app\nnpm run dev' }
    ], { title: '建立計數按鈕', description: '以 ref 保存 count，點擊後加一。', starter: '<script setup>\n// 建立 count\n<\/script>\n<template>\n  <button>點擊次數：{{ count }}</button>\n</template>', solution: '<script setup>\nimport { ref } from "vue"\nconst count = ref(0)\n<\/script>\n<template>\n  <button @click="count++">點擊次數：{{ count }}</button>\n</template>', required: ['import { ref }', 'const count = ref(0)', '@click="count++"', '{{ count }}'], expectedOutput: '每次點擊數字加一', hints: ['script 中 ref 要用 .value，template 會自動解包。', '事件使用 @click。'] },
    { question: '為什麼 template 中可以直接寫 count 而非 count.value？', choices: ['count 不是 ref', '模板會自動解包 ref', '瀏覽器自動處理', 'script setup 移除型別'], answer: 1, explanation: 'Vue 模板會對頂層 ref 自動解包。' }),

  lesson('vue-reactivity', 'vue', 7, 45, '響應式、Computed 與 Watch', '正確描述狀態、衍生值與副作用',
    ['選擇 ref 與 reactive', '使用 computed 衍生狀態', '在必要時使用 watch'], [
      { title: 'Ref 適合多數狀態', body: 'ref 可包裝任何值，在 script 讀寫使用 .value。reactive 適合物件，但解構可能失去響應性；不確定時優先 ref。', code: 'const name = ref("Alex")\nconst profile = reactive({ level: 1 })\nname.value = "Sam"\nprofile.level++' },
      { title: 'Computed 不儲存重複真相', body: 'computed 依賴響應式來源並快取結果。能由其他狀態算出的值不要另建 ref 手動同步，避免兩份資料不一致。', code: 'const completed = ref(3)\nconst total = ref(10)\nconst percent = computed(() => Math.round(completed.value / total.value * 100))' },
      { title: 'Watch 用於副作用', body: 'watch 適合儲存、網路請求或和外部系統同步，不用來取代 computed。非同步 watch 要處理過期結果或取消。', code: 'watch(search, async (value, _, onCleanup) => {\n  const controller = new AbortController()\n  onCleanup(() => controller.abort())\n  results.value = await find(value, controller.signal)\n})' }
    ], { title: '計算完成百分比', description: '以 computed 根據 completed 與 total 產生 percent。', starter: 'const completed = ref(4)\nconst total = ref(5)\n// 建立 percent', solution: 'const completed = ref(4)\nconst total = ref(5)\nconst percent = computed(() => {\n  if (total.value === 0) return 0\n  return Math.round(completed.value / total.value * 100)\n})', required: ['computed(() =>', 'total.value === 0', 'completed.value / total.value', 'Math.round'], expectedOutput: 'percent.value 為 80', hints: ['computed 接收 getter。', '記得處理 total 為 0。'] },
    { question: '能由其他狀態計算得到的值，通常應使用？', choices: ['另一個 ref 加 watch', 'computed', '全域變數', 'localStorage'], answer: 1, explanation: 'computed 保持單一真相來源並自動更新。' }),

  lesson('vue-template', 'vue', 8, 40, '模板、事件與清單', '建立正確、可預測的互動畫面',
    ['使用 v-if 與 v-show', '以 v-for 和 key 渲染清單', '處理事件與 class'], [
      { title: '條件渲染有不同成本', body: 'v-if 會建立與銷毀節點，適合不常切換；v-show 只改 display，適合頻繁顯示隱藏。分支必須相鄰。', code: '<p v-if="loading">載入中</p>\n<p v-else-if="error">{{ error }}</p>\n<ul v-else>...</ul>' },
      { title: '清單需要穩定 key', body: 'v-for 的 key 應使用資料穩定唯一 ID，不要在可排序或可編輯清單使用 index，否則元件狀態可能跟錯項目。', code: '<li v-for="course in courses" :key="course.id">\n  {{ course.title }}\n</li>' },
      { title: '事件修飾符保持模板清楚', body: '@submit.prevent 阻止表單預設送出，@click.stop 阻止冒泡。複雜邏輯仍應放進函式，不要塞在模板表達式。', code: '<form @submit.prevent="save">\n  <button type="submit">保存</button>\n</form>' }
    ], { title: '渲染可刪除清單', description: '以穩定 id 當 key，按鈕傳入 id 呼叫 remove。', starter: '<ul>\n  <!-- 渲染 courses -->\n</ul>', solution: '<ul>\n  <li v-for="course in courses" :key="course.id">\n    {{ course.title }}\n    <button type="button" @click="remove(course.id)">刪除</button>\n  </li>\n</ul>', required: ['v-for="course in courses"', ':key="course.id"', '{{ course.title }}', '@click="remove(course.id)"'], expectedOutput: '每筆課程可依 id 刪除', hints: ['key 使用 course.id。', '事件中把目前 id 傳給 remove。'] },
    { question: '可重新排序的清單應優先使用哪種 key？', choices: ['陣列索引', '隨機數', '資料的穩定唯一 ID', '標籤名稱'], answer: 2, explanation: '穩定 ID 能讓 Vue 正確追蹤每個節點與元件狀態。' }),

  lesson('vue-components', 'vue', 9, 50, '元件、Props、事件與 Slot', '設計清楚的元件公開介面',
    ['以 props 傳入資料', '以 emit 回報事件', '使用 slot 組合內容'], [
      { title: '資料向下、事件向上', body: '父元件以 props 傳資料，子元件不直接修改 prop，而是 emit 事件請父層更新。單向資料流讓狀態來源容易追蹤。', code: 'const props = defineProps({ title: { type: String, required: true } })\nconst emit = defineEmits(["remove"])\nemit("remove")' },
      { title: 'v-model 是契約語法糖', body: '元件 v-model 預設對應 modelValue prop 與 update:modelValue 事件。Vue 3.4+ 可用 defineModel 簡化。', code: 'const model = defineModel({ type: String, default: "" })\n// 父層：<SearchBox v-model="query" />' },
      { title: 'Slot 讓結構可組合', body: '預設 slot 接收主要內容，具名 slot 放 header、footer。Scoped slot 可把子元件資料暴露給父層決定呈現方式。', code: '<article>\n  <header><slot name="header" /></header>\n  <slot />\n</article>' }
    ], { title: '建立刪除按鈕元件', description: '接收 label prop，點擊時 emit remove。', starter: '<script setup>\n// props 與 emits\n<\/script>\n<template><button>{{ label }}</button></template>', solution: '<script setup>\ndefineProps({ label: { type: String, required: true } })\nconst emit = defineEmits(["remove"])\n<\/script>\n<template><button type="button" @click="emit(\'remove\')">{{ label }}</button></template>', required: ['defineProps', 'label:', 'defineEmits', '"remove"', '@click="emit(\'remove\')"'], expectedOutput: '點擊時父層收到 remove 事件', hints: ['prop 不在子元件內修改。', '用 emit 通知父層。'] },
    { question: '子元件需要要求父元件刪除資料時應如何做？', choices: ['直接修改 prop', 'emit 事件', '重新載入頁面', '修改 DOM'], answer: 1, explanation: '事件向上能維持單向資料流。' }),

  lesson('vue-composables', 'vue', 10, 50, '生命週期與 Composable', '抽出可重用的狀態邏輯',
    ['使用常見生命週期', '建立 use 開頭的 composable', '清理事件與非同步工作'], [
      { title: '生命週期對應外部世界', body: 'onMounted 適合需要瀏覽器 DOM 的工作，onUnmounted 清理事件、計時器與訂閱。SSR 階段不會執行 onMounted。', code: 'onMounted(() => window.addEventListener("resize", update))\nonUnmounted(() => window.removeEventListener("resize", update))' },
      { title: 'Composable 重用邏輯而非畫面', body: 'useXxx 函式組合 ref、computed、watch 與生命週期，回傳元件需要的狀態和操作。每次呼叫通常建立獨立狀態。', code: 'export function useCounter(initial = 0) {\n  const count = ref(initial)\n  const increment = () => count.value++\n  return { count, increment }\n}' },
      { title: '瀏覽器 API 要考慮 SSR', body: 'window、document、localStorage 只存在客戶端。在 Nuxt 使用 import.meta.client 或 onMounted 保護，避免伺服器渲染時出錯。', code: 'onMounted(() => {\n  const saved = localStorage.getItem("theme")\n  if (saved) theme.value = saved\n})' }
    ], { title: '建立 useOnline', description: '追蹤 navigator.onLine，掛載事件並在卸載時清理。', starter: 'export function useOnline() {\n  const online = ref(true)\n  // 加入生命週期\n  return { online }\n}', solution: 'export function useOnline() {\n  const online = ref(true)\n  const update = () => { online.value = navigator.onLine }\n  onMounted(() => { update(); window.addEventListener("online", update); window.addEventListener("offline", update) })\n  onUnmounted(() => { window.removeEventListener("online", update); window.removeEventListener("offline", update) })\n  return { online }\n}', required: ['const online = ref(true)', 'navigator.onLine', 'onMounted', 'addEventListener("online"', 'onUnmounted', 'removeEventListener'], expectedOutput: '網路狀態改變時 online 自動更新', hints: ['同一個 update 函式才能移除監聽。', '掛載時先同步目前狀態。'] },
    { question: '元件加入 window 事件監聽後，通常應在哪裡移除？', choices: ['computed', 'onUnmounted', 'defineProps', 'nextTick 前'], answer: 1, explanation: '卸載清理可避免記憶體洩漏與重複處理。' }),

  lesson('forms-validation', 'app', 11, 45, '表單與驗證', '建立可操作、可回饋的輸入流程',
    ['使用 v-model 修飾符', '區分前端與伺服器驗證', '設計無障礙錯誤訊息'], [
      { title: 'v-model 連接輸入狀態', body: '文字、checkbox、radio 與 select 都可使用 v-model。.trim 移除兩端空白，.number 嘗試轉數字；仍要處理空值與無效值。', code: '<input v-model.trim="form.title" />\n<input v-model.number="form.minutes" type="number" />\n<input v-model="form.public" type="checkbox" />' },
      { title: '驗證分層', body: '瀏覽器驗證改善即時體驗，伺服器必須重新驗證所有輸入，因為客戶端可被繞過。錯誤應對應欄位並保留使用者輸入。', code: 'const errors = computed(() => ({\n  title: form.title ? "" : "請輸入標題",\n  minutes: form.minutes >= 0 ? "" : "分鐘不可為負數"\n}))' },
      { title: '標籤與錯誤要可被讀取', body: '每個輸入有 label，錯誤以 aria-describedby 關聯，無效時設定 aria-invalid。提交失敗後把焦點移到第一個錯誤。', code: '<label for="title">標題</label>\n<input id="title" :aria-invalid="!!errors.title" aria-describedby="title-error" />\n<p id="title-error">{{ errors.title }}</p>' }
    ], { title: '驗證登入表單', description: 'Email 必填且含 @，密碼至少 8 字。', starter: 'function validate(form) {\n  const errors = {}\n  // 完成驗證\n  return errors\n}', solution: 'function validate(form) {\n  const errors = {}\n  if (!form.email || !form.email.includes("@")) errors.email = "Email 格式錯誤"\n  if (!form.password || form.password.length < 8) errors.password = "密碼至少 8 字"\n  return errors\n}', required: ['function validate', 'form.email.includes("@")', 'errors.email', 'form.password.length < 8', 'errors.password', 'return errors'], expectedOutput: '無效欄位得到對應錯誤訊息', hints: ['先檢查值是否存在。', 'errors 只加入有問題欄位。'] },
    { question: '為什麼伺服器仍要驗證已在前端驗證的輸入？', choices: ['讓程式更慢', '客戶端驗證可以被繞過', 'Vue 不支援驗證', '只為了樣式'], answer: 1, explanation: '伺服器不能信任來自客戶端的資料。' }),

  lesson('pinia-state', 'app', 12, 50, 'Pinia 與共享狀態', '在正確範圍管理應用程式狀態',
    ['判斷何時需要 store', '建立 setup store', '避免 SSR 狀態外洩'], [
      { title: '狀態應放在最小必要範圍', body: '單一元件用 ref，父子共享可提升到共同父層，跨多頁或無直接關係才考慮 Pinia。不是所有資料都該全域化。', code: 'export const useSessionStore = defineStore("session", () => {\n  const user = ref(null)\n  const loggedIn = computed(() => !!user.value)\n  return { user, loggedIn }\n})' },
      { title: 'Action 封裝狀態改變', body: 'Store action 可包含同步或非同步邏輯，元件只表達意圖。使用 storeToRefs 解構響應式狀態，action 可直接解構。', code: 'const session = useSessionStore()\nconst { user, loggedIn } = storeToRefs(session)\nconst { logout } = session' },
      { title: 'Nuxt 要求每個請求隔離', body: 'Pinia Nuxt 模組會建立請求範圍狀態。不要在模組頂層建立可變全域物件，否則 SSR 可能讓不同使用者共享資料。', code: '// 避免：模組頂層 const sharedUsers = []\n// 使用 useState、Pinia 或事件請求內的資料' }
    ], { title: '建立購物車 Store', description: '用 ref 保存 items，computed 計算數量，action 新增項目。', starter: 'export const useCartStore = defineStore("cart", () => {\n  // state、getter、action\n})', solution: 'export const useCartStore = defineStore("cart", () => {\n  const items = ref([])\n  const count = computed(() => items.value.length)\n  function add(item) { items.value.push(item) }\n  return { items, count, add }\n})', required: ['defineStore("cart"', 'const items = ref([])', 'const count = computed', 'function add(item)', 'items.value.push(item)', 'return { items, count, add }'], expectedOutput: 'add 後 items 與 count 同步更新', hints: ['Setup store 要回傳公開成員。', 'computed 讀取 items.value。'] },
    { question: '從 Pinia store 解構 state 並保留響應性應使用？', choices: ['JSON.parse', 'storeToRefs', 'toString', 'markRaw'], answer: 1, explanation: 'storeToRefs 會把 state 與 getter 轉成 ref。' }),

  lesson('routing-data', 'app', 13, 50, '路由與資料取得', '讓網址、狀態與頁面協同工作',
    ['使用動態路由參數', '同步 query 與篩選條件', '處理載入、錯誤與空狀態'], [
      { title: '網址是可分享狀態', body: '頁碼、搜尋與篩選適合放 query，使用者可重整、收藏與分享。敏感資料或大型物件不放網址。', code: 'const route = useRoute()\nconst router = useRouter()\nconst page = computed(() => Number(route.query.page ?? 1))\nrouter.push({ query: { ...route.query, page: 2 } })' },
      { title: '動態參數識別資源', body: 'Vue Router 以 /courses/:id，Nuxt 以 pages/courses/[id].vue 建立動態頁。參數來自網址，使用前要驗證。', code: 'const route = useRoute()\nconst id = computed(() => String(route.params.id))' },
      { title: '畫面要描述所有狀態', body: '資料畫面至少考慮載入中、錯誤、空資料與成功。重新請求時避免舊結果覆蓋新結果，並提供重試操作。', code: '<LoadingState v-if="pending" />\n<ErrorState v-else-if="error" @retry="refresh" />\n<EmptyState v-else-if="!items.length" />\n<CourseList v-else :items="items" />' }
    ], { title: '更新搜尋 Query', description: '保留既有 query，只更新 q 並回到第 1 頁。', starter: 'function search(query) {\n  // router.push\n}', solution: 'function search(query) {\n  router.push({\n    query: { ...route.query, q: query || undefined, page: 1 }\n  })\n}', required: ['function search', 'router.push', '...route.query', 'q: query || undefined', 'page: 1'], expectedOutput: '網址保留其他篩選並更新搜尋字串', hints: ['展開 route.query 保留其他欄位。', '空搜尋可設 undefined 移除參數。'] },
    { question: '頁碼與搜尋條件放在 query 的主要好處是？', choices: ['隱藏資料', '可重整、收藏與分享目前狀態', '自動加密', '不需驗證'], answer: 1, explanation: '網址能成為頁面狀態的穩定入口。' }),

  lesson('nuxt-structure', 'nuxt', 14, 45, 'Nuxt 專案結構與路由', '掌握約定式全端 Vue 架構',
    ['理解 pages 與 layouts', '使用自動匯入元件與 composable', '設定 metadata 與 middleware'], [
      { title: '檔案系統產生路由', body: 'pages/index.vue 對應 /，pages/courses/[id].vue 對應動態路由。NuxtPage 顯示頁面，NuxtLayout 套用版型。', code: 'pages/\n├── index.vue\n├── courses/index.vue\n└── courses/[id].vue\nlayouts/default.vue' },
      { title: '自動匯入降低樣板', body: 'components、composables 與常見 Vue API 可自動匯入。命名仍需清楚，避免不同資料夾產生難辨識的同名元件。', code: '// composables/useCourseSearch.ts\nexport function useCourseSearch() {\n  const query = ref("")\n  return { query }\n}' },
      { title: '頁面 Metadata 與中介層', body: 'useHead 設定 SEO，definePageMeta 指定 layout 或 middleware。Route middleware 適合導覽保護，但真正資料權限必須在伺服器再次驗證。', code: 'definePageMeta({ middleware: ["auth"] })\nuseHead({ title: "課程列表" })' }
    ], { title: '建立課程動態頁', description: '從 route.params.id 取得 id，並設定動態標題。', starter: '<script setup>\n// 取得 route 與 id，設定 head\n<\/script>', solution: '<script setup>\nconst route = useRoute()\nconst id = computed(() => String(route.params.id))\nuseHead(() => ({ title: `課程 ${id.value}` }))\n<\/script>', required: ['const route = useRoute()', 'route.params.id', 'computed(', 'useHead', 'id.value'], expectedOutput: '網址 id 反映在瀏覽器標題', hints: ['params 來自 useRoute。', 'useHead 可接收響應式 getter。'] },
    { question: 'Nuxt 中 pages/courses/[id].vue 對應什麼？', choices: ['/courses 固定頁', '/courses/:id 動態路由', '/id/courses', 'Server API'], answer: 1, explanation: '方括號檔名會產生動態路由參數。' }),

  lesson('nuxt-rendering-data', 'nuxt', 15, 60, 'SSR、Hydration 與資料取得', '在伺服器與客戶端之間保持一致',
    ['理解 SSR 與 hydration', '使用 useFetch/useAsyncData', '避免重複請求與 hydration mismatch'], [
      { title: '伺服器先產生 HTML', body: 'SSR 讓使用者與搜尋引擎先收到內容，客戶端下載 JavaScript 後 hydration 接管互動。伺服器與客戶端首次輸出必須一致。', code: '// 容易 mismatch：模板直接使用 Math.random() 或 Date.now()\n// 改由 useState、伺服器資料或 mounted 後顯示' },
      { title: 'Nuxt 資料工具可轉移 Payload', body: 'useFetch 適合 HTTP，useAsyncData 包裝任意非同步函式。SSR 取得的資料會放入 payload，hydration 時不必再請求一次。', code: 'const { data, pending, error, refresh } = await useFetch("/api/courses", {\n  query: { page },\n  watch: [page]\n})' },
      { title: 'Key 與依賴要穩定', body: 'useAsyncData 的 key 識別快取；同 key 的 handler 與選項要一致。瀏覽器專用副作用放 onMounted，不要在可重跑的資料函式內修改全域狀態。', code: 'const { data } = await useAsyncData(\n  () => `course-${route.params.id}`,\n  () => $fetch(`/api/courses/${route.params.id}`)\n)' }
    ], { title: '取得課程列表', description: '用 useFetch 取得 API，並提供 page query 與 watch。', starter: 'const page = ref(1)\n// 使用 useFetch', solution: 'const page = ref(1)\nconst { data: courses, pending, error, refresh } = await useFetch("/api/courses", {\n  query: { page },\n  watch: [page]\n})', required: ['await useFetch("/api/courses"', 'data: courses', 'pending', 'error', 'query: { page }', 'watch: [page]'], expectedOutput: 'page 改變時重新取得列表', hints: ['解構時可重新命名 data。', '把 ref 放在 query 與 watch。'] },
    { question: 'Nuxt SSR 後 hydration 的作用是？', choices: ['刪除 HTML', '讓客戶端 Vue 接管既有 HTML 的互動', '關閉 JavaScript', '建立資料庫'], answer: 1, explanation: 'Hydration 將事件與狀態連接到伺服器產生的 HTML。' }),

  lesson('nuxt-server', 'nuxt', 16, 65, 'Server API、Runtime Config 與驗證', '在 Nuxt 內建立安全伺服器邊界',
    ['建立 Nitro API route', '區分公開與私密設定', '驗證請求與錯誤回應'], [
      { title: 'server/api 自動建立端點', body: 'server/api/courses.get.ts 對應 GET /api/courses，方法後綴限制 HTTP method。事件處理器可讀取 query、route params、body 與 headers。', code: '// server/api/courses.get.ts\nexport default defineEventHandler(async event => {\n  const query = getQuery(event)\n  return listCourses(query)\n})' },
      { title: 'Runtime Config 保護祕密', body: 'runtimeConfig 私密欄位只在伺服器可用，public 內容會送到瀏覽器。API 金鑰不可放 public，也不可因前端隱藏頁面就視為安全。', code: 'export default defineNuxtConfig({\n  runtimeConfig: { apiSecret: "", public: { apiBase: "/api" } }\n})\nconst config = useRuntimeConfig(event)' },
      { title: '伺服器永遠重新驗證', body: '使用 readValidatedBody 搭配 schema，驗證型別、長度與允許欄位。以 createError 回應正確狀態碼，不把資料庫錯誤或祕密直接傳給客戶端。', code: 'const body = await readValidatedBody(event, value => CourseSchema.parse(value))\nif (!session) throw createError({ statusCode: 401, statusMessage: "Unauthorized" })' }
    ], { title: '建立健康檢查 API', description: '建立 handler 回傳 ready 與目前 ISO 時間。', starter: 'export default defineEventHandler(() => {\n  // 回傳狀態\n})', solution: 'export default defineEventHandler(() => {\n  return {\n    status: "ready",\n    timestamp: new Date().toISOString()\n  }\n})', required: ['export default defineEventHandler', 'return {', 'status: "ready"', 'new Date().toISOString()'], expectedOutput: '{"status":"ready","timestamp":"..."}', hints: ['Nitro 會自動序列化物件。', '時間使用 ISO 字串便於交換。'] },
    { question: '資料庫密碼應放在 runtimeConfig 的哪裡？', choices: ['public', '私密頂層欄位', '頁面 template', '網址 query'], answer: 1, explanation: 'public 設定會暴露給瀏覽器，祕密只能留在伺服器端。' }),

  lesson('testing', 'quality', 17, 60, '元件與端對端測試', '用測試保護使用者行為',
    ['使用 Vitest 測試邏輯', '以 Vue Test Utils 測試元件', '用 Playwright 驗證關鍵流程'], [
      { title: '先測純函式與 composable', body: 'Vitest 提供 describe、it、expect 與 mock。純函式測試快速穩定；composable 若使用生命週期，要在測試元件內掛載。', code: 'import { describe, it, expect } from "vitest"\ndescribe("percent", () => {\n  it("calculates completion", () => expect(percent(4, 5)).toBe(80))\n})' },
      { title: '元件測試關注輸入輸出', body: 'Vue Test Utils mount 元件，設定 props、觸發使用者事件並檢查 DOM 或 emitted。避免斷言元件內部私有實作。', code: 'const wrapper = mount(Counter)\nawait wrapper.get("button").trigger("click")\nexpect(wrapper.text()).toContain("1")\nexpect(wrapper.emitted("change")).toBeTruthy()' },
      { title: 'E2E 保護最重要旅程', body: 'Playwright 在真實瀏覽器執行登入、建立、編輯與刪除等流程。E2E 成本較高，集中在跨頁與整合風險，不必取代所有單元測試。', code: 'test("creates a course", async ({ page }) => {\n  await page.goto("/courses")\n  await page.getByRole("button", { name: "新增" }).click()\n  await expect(page.getByText("建立成功")).toBeVisible()\n})' }
    ], { title: '測試按鈕事件', description: '掛載 SaveButton、點擊，確認 emit save。', starter: 'it("emits save", async () => {\n  // mount、trigger、expect\n})', solution: 'it("emits save", async () => {\n  const wrapper = mount(SaveButton)\n  await wrapper.get("button").trigger("click")\n  expect(wrapper.emitted("save")).toHaveLength(1)\n})', required: ['mount(SaveButton)', 'wrapper.get("button")', 'trigger("click")', 'wrapper.emitted("save")', 'toHaveLength(1)'], expectedOutput: '測試通過並確認一次 save 事件', hints: ['事件更新通常要 await trigger。', 'emitted 回傳事件紀錄。'] },
    { question: '元件測試最應關注什麼？', choices: ['私有變數名稱', 'props、使用者互動、DOM 與事件', '編譯器原始碼', 'CSS 每個像素'], answer: 1, explanation: '以元件公開行為測試，重構時較不脆弱。' }),

  lesson('production-quality', 'quality', 18, 65, '效能、無障礙與安全', '把作品提升到可正式交付',
    ['分析 bundle 與渲染效能', '建立鍵盤與讀屏可用介面', '防範 XSS、CSRF 與資料外洩'], [
      { title: '先量測再最佳化', body: '使用 Lighthouse、Vue DevTools 與 bundle analyzer 找真正瓶頸。大型元件或僅部分頁面使用的套件可動態載入，列表要避免不必要重算。', code: 'const HeavyChart = defineAsyncComponent(() => import("./HeavyChart.vue"))\n// Nuxt：<LazyHeavyChart v-if="visible" />' },
      { title: '語意 HTML 是無障礙起點', body: '按鈕用 button、連結用 a，表單有 label，焦點順序自然，對比足夠。不要用 div 模擬按鈕；動態訊息可使用 aria-live。', code: '<button type="button" @click="save">保存</button>\n<p role="status" aria-live="polite">{{ message }}</p>' },
      { title: '預設跳脫仍需安全設計', body: 'Vue 插值會跳脫 HTML，但 v-html 可能造成 XSS，除非內容經可靠清理。Cookie、權限與 Server API 要防 CSRF、越權及敏感資料洩漏。', code: '<!-- 安全：--><p>{{ userContent }}</p>\n<!-- 危險：未清理內容使用 v-html -->\n<div v-html="trustedSanitizedHtml"></div>' }
    ], { title: '建立可存取通知', description: '使用語意狀態區域顯示保存訊息。', starter: '<div>\n  <button @click="save">保存</button>\n  <p>{{ message }}</p>\n</div>', solution: '<div>\n  <button type="button" @click="save">保存</button>\n  <p role="status" aria-live="polite">{{ message }}</p>\n</div>', required: ['<button type="button"', '@click="save"', 'role="status"', 'aria-live="polite"', '{{ message }}'], expectedOutput: '讀屏軟體可得知動態保存結果', hints: ['狀態訊息使用 role=status。', 'polite 不會粗暴中斷目前朗讀。'] },
    { question: '為何不應對未清理的使用者內容使用 v-html？', choices: ['會變慢而已', '可能造成 XSS', '無法顯示中文', '會停用 SSR'], answer: 1, explanation: '惡意 HTML 或 script 可能在其他使用者瀏覽器執行。' }),

  lesson('dashboard-project', 'projects', 19, 100, '實作專案：學習儀表板', '整合元件、圖表、篩選與狀態',
    ['拆分容器與展示元件', '建立響應式篩選與統計', '處理載入與空狀態'], [
      { title: '以使用者任務拆元件', body: 'DashboardPage 協調資料，StatCard 顯示統計，CourseFilter 處理條件，ProgressChart 專注圖表。props 與 events 形成清楚邊界。', code: '<CourseFilter v-model="filters" />\n<StatGrid :stats="stats" />\n<ProgressChart :items="filteredCourses" />' },
      { title: '衍生資料使用 computed', body: '原始 courses 與 filters 是真相來源，filteredCourses、總分鐘與完成率都是 computed，不另外手動同步。', code: 'const filteredCourses = computed(() => courses.value.filter(course =>\n  (!filters.value.stage || course.stage === filters.value.stage) &&\n  course.title.includes(filters.value.query)\n))' },
      { title: '非同步狀態要完整', body: '骨架畫面減少跳動，錯誤提供重試，空狀態解釋下一步。圖表元件可 lazy load，避免首屏下載不需要的重量。', code: '<DashboardSkeleton v-if="pending" />\n<RetryPanel v-else-if="error" @retry="refresh" />\n<EmptyDashboard v-else-if="!courses.length" />\n<DashboardContent v-else />' }
    ], { title: '建立篩選結果', description: '同時依 query 與 stage 篩選 courses。', starter: 'const filtered = computed(() => {\n  // 篩選 courses.value\n})', solution: 'const filtered = computed(() => {\n  const query = filters.value.query.toLowerCase()\n  return courses.value.filter(course => {\n    const matchesText = course.title.toLowerCase().includes(query)\n    const matchesStage = !filters.value.stage || course.stage === filters.value.stage\n    return matchesText && matchesStage\n  })\n})', required: ['const filtered = computed', 'toLowerCase()', 'courses.value.filter', 'includes(query)', 'matchesStage', 'matchesText && matchesStage'], expectedOutput: '清單隨文字與階段即時篩選', hints: ['文字比較先統一小寫。', '沒有選 stage 時視為全部符合。'] },
    { question: '儀表板完成率應如何管理？', choices: ['另外保存並手動更新', '由原始進度 computed 得出', '寫死在模板', '存在 CSS'], answer: 1, explanation: '衍生狀態不重複保存能避免不一致。' }),

  lesson('crud-project', 'projects', 20, 130, '實作專案：全端課程管理', '用 Nuxt Server API 完成安全 CRUD',
    ['建立列表、建立、編輯與刪除流程', '設計 API 驗證與授權', '處理 optimistic UI 與錯誤復原'], [
      { title: '前後端共享明確契約', body: '定義 Course、CreateCourseInput 與錯誤格式。Server API 驗證 body、檢查 session，再呼叫 repository；頁面不直接持有資料庫祕密。', code: '// POST /api/courses\nconst body = await readValidatedBody(event, CourseInput.parse)\nconst user = await requireUser(event)\nreturn courseService.create(user.id, body)' },
      { title: '編輯表單管理初始值', body: '取得資料後建立可編輯副本，送出時只傳允許欄位。避免直接 v-model 綁定快取物件，否則取消編輯也可能污染列表。', code: 'const form = reactive({ title: "", description: "" })\nwatch(course, value => Object.assign(form, {\n  title: value?.title ?? "", description: value?.description ?? ""\n}), { immediate: true })' },
      { title: '樂觀更新要能回滾', body: '可預期成功且容易復原的操作可先更新畫面；保存失敗時還原快照並顯示訊息。刪除等破壞操作需確認與伺服器權限。', code: 'const snapshot = [...courses.value]\ncourses.value = courses.value.filter(item => item.id !== id)\ntry { await $fetch(`/api/courses/${id}`, { method: "DELETE" }) }\ncatch (error) { courses.value = snapshot; throw error }' }
    ], { title: '建立新增 API', description: '驗證登入與 title，成功回傳 201。', starter: 'export default defineEventHandler(async event => {\n  // 驗證並建立課程\n})', solution: 'export default defineEventHandler(async event => {\n  const user = await requireUser(event)\n  const body = await readBody(event)\n  if (typeof body.title !== "string" || !body.title.trim()) {\n    throw createError({ statusCode: 400, statusMessage: "Title is required" })\n  }\n  setResponseStatus(event, 201)\n  return createCourse(user.id, { title: body.title.trim() })\n})', required: ['defineEventHandler', 'requireUser(event)', 'readBody(event)', 'body.title.trim()', 'createError', 'setResponseStatus(event, 201)', 'createCourse'], expectedOutput: '有效輸入回傳 201；未登入或空標題被拒絕', hints: ['先授權，再驗證輸入。', '建立成功使用 201。'] },
    { question: '為何編輯表單不宜直接修改列表快取物件？', choices: ['Vue 不允許', '取消或失敗時可能已污染原畫面資料', '物件不能有字串', 'SSR 不支援表單'], answer: 1, explanation: '使用編輯副本可控制提交、取消與回滾。' }),

  lesson('deployment-project', 'projects', 21, 120, '實作專案：測試、部署與監控', '把 Nuxt 專案可靠送上正式環境',
    ['建立 CI 品質閘門', '配置正式環境與資料庫遷移', '加入健康檢查、日誌與回滾'], [
      { title: '部署前自動驗證', body: 'CI 在每次變更執行安裝、lint、型別檢查、測試與正式建置。鎖定 lockfile，任何步驟失敗都不部署。', code: 'npm ci\nnpm run lint\nnpm run typecheck\nnpm test\nnpm run build' },
      { title: '設定與遷移分離', body: '環境變數由平台管理，不提交 .env。資料庫 schema 以可追蹤 migration 更新，先向後相容部署，再移除舊欄位。', code: 'runtimeConfig: {\n  databaseUrl: process.env.DATABASE_URL,\n  public: { siteUrl: process.env.NUXT_PUBLIC_SITE_URL }\n}' },
      { title: '可觀測才算上線', body: '健康檢查確認服務可用，結構化日誌帶 request ID，錯誤追蹤記錄例外，指標監控延遲與失敗率。部署要能快速回滾。', code: 'export default defineEventHandler(() => ({\n  status: "ok",\n  version: useRuntimeConfig().public.version\n}))' }
    ], { title: '建立部署檢查腳本', description: '依序執行 typecheck、test 與 build，任一步失敗立即停止。', starter: '#!/usr/bin/env bash\n# 嚴格模式與三個 npm 指令', solution: '#!/usr/bin/env bash\nset -euo pipefail\nnpm run typecheck\nnpm test\nnpm run build', required: ['#!/usr/bin/env bash', 'set -euo pipefail', 'npm run typecheck', 'npm test', 'npm run build'], expectedOutput: '全部通過才完成；任一步失敗即停止', hints: ['使用 set -euo pipefail。', '建置放在測試通過之後。'] },
    { question: '正式部署完成後，最重要的後續能力之一是？', choices: ['刪除測試', '監控並能快速回滾', '公開所有環境變數', '停用日誌'], answer: 1, explanation: '監控能發現問題，回滾能降低故障影響時間。' })
];

export function createDefaultNuxtProgress() {
  return { lessons: {}, lastLesson: 'js-first-step', startedAt: new Date().toISOString() };
}
