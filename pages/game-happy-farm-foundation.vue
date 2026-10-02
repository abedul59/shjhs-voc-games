<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { FARM_GAME_TYPE, withVillageLand, villageById } from '~/lib/happy-farm';
import { CIVIC_FOUNDATIONS, CIVIC_SERVICE_MS, applyCivicAction, civicActionError, civicActiveStaff, civicCandidate, civicCapacity, civicLand, civicMarket, civicOperation, civicServiceCost } from '~/lib/happy-farm-civic-foundations';
import { familyAssetValue } from '~/lib/happy-farm-family';
import { accountUnrecorded } from '~/lib/happy-farm-accounting';

const route = useRoute();
const db = useSupabaseClient();
const student = useCookie('currentStudent');
const studentId = computed(() => student.value?.id ? String(student.value.id) : '');
const kind = computed(() => Object.hasOwn(CIVIC_FOUNDATIONS, route.query.kind) ? route.query.kind : 'library');
const config = computed(() => CIVIC_FOUNDATIONS[kind.value]);
const returnQuery = computed(() => Object.fromEntries(['version', 'volume', 'unit'].filter(key => typeof route.query[key] === 'string').map(key => [key, route.query[key]])));
const farm = ref(null), revision = ref(0), loading = ref(true), busy = ref(false), notice = ref('正在載入公益法人…');
const clock = ref(Date.now()), tab = ref('place'), name = ref(''), plotIndex = ref(-1), donation = ref(500), programChoice = ref(''), operationChoice = ref('');
const words = ref([]), session = ref(null), quiz = ref(null);
let clockTimer = null;
const foundation = computed(() => farm.value?.civicFoundations?.[kind.value] || null);
const location = computed(() => villageById(foundation.value?.villageId)?.name || '我的農地');
const availablePlots = computed(() => farm.value ? farm.value.plots.map((plot, index) => ({ plot, index })).filter(item => item.plot === null && civicLand(farm.value, kind.value, item.index).length === config.value.land) : []);
const landPreview = computed(() => farm.value ? civicLand(farm.value, kind.value, Number(plotIndex.value)) : []);
const nextService = computed(() => foundation.value?.lastServiceAt ? Math.max(0, foundation.value.lastServiceAt + CIVIC_SERVICE_MS - clock.value) : 0);
const waitLabel = ms => `${Math.floor(ms / 3600000)} 小時 ${Math.ceil((ms % 3600000) / 60000)} 分鐘`;
const can = (action, payload = {}) => !!farm.value && !busy.value && !quiz.value && !civicActionError(farm.value, kind.value, action, payload, Date.now());
const roleName = role => config.value.roles.find(item => item.id === role)?.name || role;
const recent = computed(() => foundation.value?.lastResult || null);
const operation = computed(() => civicOperation(kind.value, operationChoice.value) || config.value.operations[0]);
const servicePayload = computed(() => ({ operationId: operation.value.id }));
const learningKey = computed(() => `shjhs_happy_farm_session:${[studentId.value, returnQuery.value.version, returnQuery.value.volume, returnQuery.value.unit].join(':')}`);
function localPlotName(index) {
  if (!farm.value) return '';
  const id = farm.value.plotVillages[index];
  return `${villageById(id)?.name || id}第 ${farm.value.plotVillages.slice(0, index + 1).filter(item => item === id).length} 格`;
}
async function loadLearning() {
  if (!studentId.value || !returnQuery.value.version || !returnQuery.value.volume || !returnQuery.value.unit) return;
  const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
    .eq('version', returnQuery.value.version).eq('volume', returnQuery.value.volume).eq('unit', returnQuery.value.unit).limit(1000);
  if (!error) words.value = (data || []).filter(item => String(item.en_us || '').trim() && String(item.zh_tw || '').trim());
  try { const saved = JSON.parse(sessionStorage.getItem(learningKey.value) || 'null'); if (saved?.id && Array.isArray(saved.correct) && Array.isArray(saved.wrong)) session.value = saved; } catch {}
  if (!session.value) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true }).eq('student_id', studentId.value).eq('game_type', FARM_GAME_TYPE)
      .eq('version', returnQuery.value.version).eq('volume', returnQuery.value.volume).eq('unit_played', returnQuery.value.unit);
    session.value = { id: crypto.randomUUID(), startedAt: Date.now(), correct: [], wrong: [], attemptNumber: (count || 0) + 1 };
    rememberLearning();
  }
}
function rememberLearning() { try { sessionStorage.setItem(learningKey.value, JSON.stringify(session.value)); } catch {} }
async function syncLearning() {
  if (!session.value) return;
  const entry = session.value;
  const { error } = await db.from('game_records').upsert([{
    id: entry.id, student_id: studentId.value, game_type: FARM_GAME_TYPE,
    version: returnQuery.value.version, volume: returnQuery.value.volume, unit_played: returnQuery.value.unit,
    score: entry.correct.length * 10, mistakes: entry.wrong.length,
    correct_words: entry.correct.join(', '), wrong_words: entry.wrong.join(', '),
    attempt_number: entry.attemptNumber, played_at: new Date(entry.startedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - entry.startedAt) / 1000), device_info: navigator.userAgent
  }], { onConflict: 'id' });
  if (error) notice.value += `；答題紀錄尚未同步：${error.message}`;
}
async function loadFarm() {
  if (!studentId.value) { notice.value = '請先以學生身分登入開心農場。'; loading.value = false; return; }
  const { data, error } = await db.from('happy_farm_states').select('farm,revision').eq('student_id', studentId.value).maybeSingle();
  if (error) throw error;
  if (!data?.farm) { notice.value = '請先建立農場。'; loading.value = false; return; }
  farm.value = withVillageLand(data.farm, data.farm.homeVillage);
  revision.value = data.revision;
  programChoice.value = foundation.value?.programId || config.value.programs?.[0]?.id || '';
  operationChoice.value = config.value.operations[0].id;
  notice.value = foundation.value ? `歡迎來到${foundation.value.name}！` : `選擇自己的空地，設立${config.value.label}。`;
  loading.value = false;
}
async function saveFarm(next) {
  const expected = revision.value;
  accountUnrecorded(farm.value, next, 'foundation-donation', '捐贈公益法人（不計農場營業損益）', `捐贈${config.value.label}基金`);
  const { data, error } = await db.from('happy_farm_states').update({ farm: next, revision: expected + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', expected).select('revision').maybeSingle();
  if (error) throw error;
  if (!data) { await loadFarm(); throw new Error('農場已在另一分頁更新；資料已重新載入，請再操作一次。'); }
  farm.value = next; revision.value = data.revision;
}
function beginAction(action, payload = {}) {
  if (!farm.value || busy.value || quiz.value) return;
  const problem = civicActionError(farm.value, kind.value, action, payload, Date.now());
  if (problem) { notice.value = problem; return; }
  if (words.value.length < 2 || !session.value) { notice.value = '請從已選單字範圍的開心農場進入，至少需要兩筆單字才能操作。'; return; }
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const target = String(word.en_us).trim();
  const others = [...new Set(words.value.map(item => String(item.en_us).trim()).filter(value => value && value !== target))].sort(() => Math.random() - .5).slice(0, 3);
  quiz.value = { word, target, choices: [target, ...others].sort(() => Math.random() - .5), action, payload };
}
async function answer(choice) {
  if (!quiz.value || busy.value) return;
  const question = quiz.value;
  const correct = choice === question.target;
  if (correct) {
    busy.value = true;
    try {
      const result = applyCivicAction(farm.value, kind.value, question.action, question.payload, Date.now());
      await saveFarm(result.farm);
      notice.value = result.detail;
      if (question.action === 'found') tab.value = 'place';
    } catch (error) { notice.value = `操作未完成：${error.message}`; busy.value = false; return; }
    busy.value = false;
    session.value.correct.push(question.word.en_us);
  } else { session.value.wrong.push(question.word.en_us); notice.value = `答錯：${question.word.en_us}＝${question.word.zh_tw}；這次沒有執行操作。`; }
  rememberLearning(); quiz.value = null; await syncLearning();
}
onMounted(async () => {
  try { await loadFarm(); await loadLearning(); } catch (error) { notice.value = `公益法人載入失敗：${error.message}`; loading.value = false; }
  clockTimer = window.setInterval(() => { clock.value = Date.now(); }, 30000);
});
onUnmounted(() => { if (clockTimer) window.clearInterval(clockTimer); });
</script>

<template>
  <main class="foundation-page">
    <header class="foundation-header"><div><small>HAPPY FARM COMMUNITY FOUNDATION</small><h1>{{ config.icon }} {{ foundation?.name || `成立${config.label}` }}</h1><p>使用自己的土地與獨立基金，經營{{ config.label }}。</p></div><NuxtLink :to="{ path: '/game-happy-farm', query: returnQuery }">← 返回開心農場</NuxtLink></header>
    <p class="notice" role="status" aria-live="polite">{{ notice }}</p>
    <section v-if="loading" class="panel">正在載入…</section>
    <section v-else-if="!farm" class="panel"><NuxtLink :to="{ path: '/game-happy-farm', query: returnQuery }">返回開心農場</NuxtLink></section>
    <section v-else-if="!foundation" class="panel founding">
      <h2>{{ config.icon }} 捐贈成立{{ config.label }}</h2>
      <p>農場總資產需達 {{ config.gate }} 金幣，並捐贈 {{ config.gift }} 金幣與同一里 {{ config.land }} 格自有空地。現有總資產約 {{ familyAssetValue(farm) }}、可用金幣 {{ farm.coins }}。基金只供此法人使用，不能提回農場。</p>
      <label>自訂名稱<input v-model.trim="name" maxlength="24" :placeholder="`例如：新化希望${config.label}`"></label>
      <label>用地起點<select v-model.number="plotIndex"><option :value="-1">請選擇自有空地</option><option v-for="entry in availablePlots" :key="entry.index" :value="entry.index">{{ localPlotName(entry.index) }}</option></select></label>
      <p v-if="landPreview.length">將使用：{{ landPreview.map(localPlotName).join('、') }}</p>
      <button :disabled="!can('found', { name, plotIndex: Number(plotIndex) })" @click="beginAction('found', { name, plotIndex: Number(plotIndex) })">📖 答題捐贈設立</button>
      <small v-if="civicActionError(farm, kind, 'found', { name, plotIndex: Number(plotIndex) }, clock)">{{ civicActionError(farm, kind, 'found', { name, plotIndex: Number(plotIndex) }, clock) }}</small>
      <small>金額與地格是遊戲規則，不代表現實設立許可或法定標準。</small>
    </section>
    <template v-else>
      <section class="stats"><div><strong>🏦 {{ foundation.fund }}</strong><span>{{ config.label }}基金</span></div><div><strong>⭐ {{ foundation.reputation }}/100</strong><span>服務聲望</span></div><div><strong>{{ config.icon }} {{ civicCapacity(kind, foundation) }}</strong><span>每輪服務容量</span></div><div><strong>👥 {{ foundation.totalVisitors }}</strong><span>累計服務人次</span></div></section>
      <nav class="tabs" aria-label="法人管理項目"><button v-for="item in [['place','🏛️ 場館'],['staff','👥 人員'],['facilities','🏗️ 設施'],...(config.programs ? [['program','🖼️ 展覽']] : []),['service','📣 服務'],['fund','🏦 基金'] ]" :key="item[0]" :class="{ active: tab === item[0] }" @click="tab = item[0]">{{ item[1] }}</button></nav>
      <section v-if="tab === 'place'" class="panel"><h2>{{ config.icon }} {{ foundation.name }}</h2><p>{{ location }} · 使用 {{ foundation.plotIndexes.length }} 格自有土地 · 目前容量 {{ civicCapacity(kind, foundation) }} 人</p><div class="room-grid"><article class="room"><span>{{ config.icon }}</span><strong>{{ ({ library: '服務櫃臺與基本書庫', hospital: '掛號與基本診療區', art_museum: '入口大廳與基礎展場', museum: '入口大廳與基本典藏室' })[kind] }}</strong><small>創辦時已設置</small></article><article v-for="facility in config.facilities.filter(item => foundation.facilities.includes(item.id))" :key="facility.id" class="room"><span>{{ facility.icon }}</span><strong>{{ facility.name }}</strong><small>增加服務容量 {{ facility.capacity }} 人</small></article></div><div v-if="recent" class="people-scene"><strong>最近一輪{{ kind === 'hospital' ? '就診' : '入館' }} {{ recent.visitors }} 人</strong><div><span v-for="index in Math.min(12, recent.visitors)" :key="index" :title="`匿名服務對象 ${index}`">{{ kind === 'hospital' ? ['🧑','👩','👨','🧒'][index % 4] : ['📖','🧑','👧','🧓'][index % 4] }}</span></div><small>圖像僅代表匿名服務人次，不引用真實個資。</small></div><p>點選上方「人員」「設施」「服務」繼續經營。</p></section>
      <section v-if="tab === 'staff'" class="panel"><h2>👥 人員招聘</h2><p>名單每 3 小時輪換；聘約 24 小時，薪資由{{ config.label }}基金支付。核心職位維持一般服務，專業職位解鎖對應項目。</p><div v-for="role in config.roles" :key="role.id" class="role-group"><h3>{{ role.icon }} {{ role.name }} <small class="role-type">{{ role.optional ? '專業職位' : '核心職位' }}</small> · 在任 {{ civicActiveStaff(foundation, role.id, clock).length }}</h3><div class="person-grid"><article v-for="person in civicMarket(kind, role.id, clock)" :key="person.id"><strong>{{ person.name }}</strong><small>{{ person.specialty }} · 能力 {{ person.skill }} · 24 小時薪資 {{ person.fee }}</small><button :disabled="!can('hire', { personId: person.id })" @click="beginAction('hire', { personId: person.id })">📖 答題聘任</button></article></div><div v-for="contract in foundation.staff.filter(item => item.role === role.id)" :key="contract.personId" class="contract"><span>{{ civicCandidate(contract.personId)?.name }} · {{ contract.paidUntil > clock ? '聘約至' : '已到期' }} {{ new Date(contract.paidUntil).toLocaleString('zh-TW') }}</span><button v-if="contract.paidUntil <= clock" :disabled="!can('renew', { personId: contract.personId })" @click="beginAction('renew', { personId: contract.personId })">📖 續聘</button><button :disabled="!can('dismiss', { personId: contract.personId })" @click="beginAction('dismiss', { personId: contract.personId })">解約</button></div></div></section>
      <section v-if="tab === 'facilities'" class="panel"><h2>🏗️ 擴充設施</h2><p>設施在已捐贈土地內配置，由獨立基金支付。</p><div class="room-grid"><article v-for="facility in config.facilities" :key="facility.id" class="room"><span>{{ facility.icon }}</span><strong>{{ facility.name }}</strong><small>容量 +{{ facility.capacity }} · 品質改善</small><em v-if="foundation.facilities.includes(facility.id)">✅ 已啟用</em><button v-else :disabled="!can('build', { facilityId: facility.id })" @click="beginAction('build', { facilityId: facility.id })">📖 答題興建 · {{ facility.cost }}</button></article></div></section>
      <section v-if="tab === 'program' && config.programs" class="panel"><h2>🖼️ 策劃展覽</h2><p>目前主題：{{ config.programs.find(item => item.id === foundation.programId)?.name || '尚未設定' }}。更換展覽使用法人基金 120 金幣；主題和展廳會提升服務品質。</p><div class="program-picker"><label>下期展覽主題<select v-model="programChoice"><option v-for="item in config.programs" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><button :disabled="!can('program', { programId: programChoice })" @click="beginAction('program', { programId: programChoice })">📖 答題策展 · 120 金幣</button></div><p>設施可在「設施」頁擴充，服務人員在「人員」頁招聘。</p></section>
      <section v-if="tab === 'service'" class="panel"><h2>📣 {{ config.label }}營運</h2><p>選一項服務辦理本輪工作；所有項目共用每 3 小時一次的時段。下列人員與設施為遊戲玩法條件。</p><div class="operation-grid"><label v-for="item in config.operations" :key="item.id" class="operation-card" :class="{ selected: operationChoice === item.id }"><input v-model="operationChoice" type="radio" :value="item.id" name="foundation-operation"><strong>{{ item.icon }} {{ item.name }}</strong><span>{{ item.description }}</span><small>所需人員：{{ [...config.roles.filter(role => !role.optional).map(role => role.name), ...item.roles.map(role => roleName(role))].join('、') }}</small><small>所需設施：{{ item.facility ? config.facilities.find(facility => facility.id === item.facility)?.name : '基礎場館' }} · 預估成本 {{ civicServiceCost(kind, foundation, item.id) }} 金幣</small></label></div><p v-if="nextService">距離下一輪：{{ waitLabel(nextService) }}</p><button :disabled="!can('serve', servicePayload)" @click="beginAction('serve', servicePayload)">📖 答題辦理{{ operation.name }}</button><small class="operation-warning" v-if="civicActionError(farm, kind, 'serve', servicePayload, clock)">{{ civicActionError(farm, kind, 'serve', servicePayload, clock) }}</small><div v-if="recent" class="result"><strong>最近一輪：{{ civicOperation(kind, recent.operationId)?.name || '一般服務' }}</strong><span>服務 {{ recent.visitors }} 人 · 品質 {{ recent.quality }}/100</span><span>收入 {{ recent.income }} · 支出 {{ recent.expense }} · 淨額 {{ recent.income - recent.expense }}</span></div><p>服務收入和營運結餘均留在{{ config.label }}基金，不轉入農場個人資金。</p></section>
      <section v-if="tab === 'fund'" class="panel"><h2>🏦 {{ config.label }}基金</h2><p>目前結餘 {{ foundation.fund }} 金幣。捐款和服務收入用於人員、設施、營運及水電，不能提回農場。</p><div class="donate"><label>追加捐贈<input v-model.number="donation" type="number" min="100" max="10000" step="100"></label><button :disabled="!can('donate', { amount: Number(donation) })" @click="beginAction('donate', { amount: Number(donation) })">📖 答題捐贈</button></div><h3>最近收支</h3><div class="history"><p v-for="(entry, index) in foundation.history" :key="index">{{ new Date(entry.at).toLocaleString('zh-TW') }} · {{ entry.detail }}</p></div></section>
    </template>
    <div v-if="quiz" class="quiz-shade"><section class="quiz-card" role="dialog" aria-modal="true" aria-label="公益法人單字題"><h2>📖 答對才能完成操作</h2><p>「{{ quiz.word.zh_tw }}」的英文是？</p><div class="choices"><button v-for="choice in quiz.choices" :key="choice" :disabled="busy" @click="answer(choice)">{{ choice }}</button></div><button :disabled="busy" @click="quiz = null">取消</button></section></div>
  </main>
</template>

<style scoped>
.foundation-page{min-height:100vh;padding:clamp(12px,2vw,28px);background:linear-gradient(135deg,#e9f4df,#fff8e4);color:#244c35;font-family:system-ui,-apple-system,sans-serif}.foundation-header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:0 auto 12px;max-width:1280px}.foundation-header h1{margin:3px 0;font-size:clamp(1.5rem,2.5vw,2.4rem)}.foundation-header p{margin:0}.foundation-header a{border-radius:10px;background:#2c7651;color:white;padding:10px 14px;text-decoration:none;font-weight:800;white-space:nowrap}.notice,.panel,.stats,.tabs{max-width:1280px;margin-left:auto;margin-right:auto}.notice{border:1px solid #a5c69a;border-radius:10px;background:#fffefa;padding:10px 14px;font-weight:700}.panel{border:2px solid #a8c492;border-radius:16px;background:#fffefa;padding:clamp(14px,2vw,24px);box-shadow:0 5px 0 #c5d9b7}.panel h2{margin:0 0 10px}.panel p{line-height:1.55}.founding{display:grid;gap:12px;max-width:720px}.founding label,.donate label{display:grid;gap:5px;font-weight:800}.founding input,.founding select,.donate input{min-width:0;box-sizing:border-box;width:100%;border:1px solid #86a97d;border-radius:8px;background:white;padding:9px;font:inherit}.foundation-page button{border:1px solid #438459;border-radius:9px;background:#dff2c4;color:#245238;padding:8px 12px;font:inherit;font-weight:800;cursor:pointer}.foundation-page button:disabled{opacity:.48;cursor:not-allowed}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:10px}.stats>div{display:grid;gap:3px;border:1px solid #a4c791;border-radius:12px;background:white;padding:12px}.stats strong{font-size:1.2rem}.stats span{font-size:.8rem}.tabs{display:flex;gap:6px;overflow-x:auto;margin-bottom:10px}.tabs button{flex:0 0 auto;white-space:nowrap}.tabs button.active{background:#2d7650;color:white}.room-grid,.person-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.room,.person-grid article{display:grid;gap:5px;border:1px solid #b8d0aa;border-radius:12px;background:#f5faed;padding:14px}.room>span{font-size:2.3rem}.room small,.person-grid small{line-height:1.4}.room em{font-style:normal;color:#276a43;font-weight:800}.role-group{margin:14px 0;padding-top:9px;border-top:1px solid #cee0c5}.role-group h3{margin:0 0 8px}.contract{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:8px;border-bottom:1px solid #d6e3ca}.contract span{flex:1;min-width:170px}.result{display:grid;gap:5px;border-radius:10px;background:#edf7e4;padding:12px;margin:15px 0}.donate{display:flex;align-items:end;gap:10px;max-width:480px}.donate label{flex:1}.history{max-height:330px;overflow:auto}.history p{border-bottom:1px dashed #bed2b4;padding:5px 0;margin:0}.quiz-shade{position:fixed;inset:0;display:grid;place-items:center;padding:16px;background:#173d31b8;z-index:1000}.quiz-card{width:min(480px,100%);border:3px solid #6fa85b;border-radius:18px;background:#fffdf0;padding:20px}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0}.choices button{min-height:44px}@media(max-width:650px){.foundation-header{align-items:flex-start;flex-direction:column}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.donate{flex-direction:column;align-items:stretch}.donate label,.donate button{width:100%}}
.people-scene{display:grid;gap:8px;margin-top:14px;border:1px solid #b8d0aa;border-radius:12px;background:#eef7e8;padding:13px}.people-scene>div{display:flex;flex-wrap:wrap;gap:6px}.people-scene span{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;background:white;font-size:1.4rem}.people-scene small{color:#476a52}
.program-picker{display:flex;align-items:end;gap:10px;flex-wrap:wrap}.program-picker label{display:grid;gap:5px;min-width:220px;font-weight:800}.program-picker select{border:1px solid #86a97d;border-radius:8px;background:white;padding:9px;font:inherit}
.operation-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:14px 0}.operation-card{display:grid;align-content:start;gap:7px;padding:14px;border:2px solid #bed3b5;border-radius:12px;background:#f6faef;cursor:pointer}.operation-card.selected{border-color:#2c7651;background:#e7f4dc}.operation-card input{justify-self:start;width:18px;height:18px}.operation-card strong{font-size:1.05rem}.operation-card span,.operation-card small{line-height:1.45}.role-type{font-size:.72rem;color:#2d7650}.operation-warning{display:block;margin-top:8px;color:#8a3d20;font-weight:700}@media(max-width:650px){.operation-grid{grid-template-columns:1fr}}
</style>
