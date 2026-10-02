<script setup>
import { computed, onMounted, ref } from 'vue';
import { FARM_GAME_TYPE, withVillageLand, villageById } from '~/lib/happy-farm';
import { SCHOOL_THEMES, schoolActiveStaff, schoolCandidate, schoolLevel } from '~/lib/happy-farm-private-school';
import { SCHOOL_DAYS, SCHOOL_FACILITIES, applySchoolCampusAction, schoolCampusActionError, schoolCell, schoolPeriods, schoolRoomName, schoolScheduleCells, schoolScheduleCoverage, schoolSeatCount, schoolSubjects } from '~/lib/happy-farm-school-campus';

const route = useRoute();
const db = useSupabaseClient();
const student = useCookie('currentStudent');
const studentId = computed(() => student.value?.id ? String(student.value.id) : '');
const returnQuery = computed(() => Object.fromEntries(['version', 'volume', 'unit'].filter(key => typeof route.query[key] === 'string').map(key => [key, route.query[key]])));
const farm = ref(null);
const revision = ref(0);
const busy = ref(false), loading = ref(true), notice = ref('正在載入校園…');
const tab = ref('campus');
const selectedClass = ref(0);
const selectedCell = ref(0);
const subjectChoice = ref('');
const teacherChoice = ref('');
const clock = ref(Date.now());
const words = ref([]), session = ref(null), quiz = ref(null);
let clockTimer = null;
const lesson = computed(() => Object.fromEntries(['version', 'volume', 'unit'].map(key => [key, typeof route.query[key] === 'string' ? route.query[key] : ''])));
const sessionKey = computed(() => `shjhs_happy_farm_session:${[studentId.value, lesson.value.version, lesson.value.volume, lesson.value.unit].join(':')}`);
const school = computed(() => farm.value?.schoolFoundation || null);
const level = computed(() => schoolLevel(school.value?.levelId));
const campusReady = computed(() => !!level.value && school.value?.plotIndexes?.length === level.value.land);
const classCount = computed(() => Math.max(0, Number(school.value?.classes) || 0));
const periods = computed(() => schoolPeriods(school.value));
const subjects = computed(() => schoolSubjects(school.value));
const teacherContracts = computed(() => schoolActiveStaff(school.value, 'teacher', clock.value));
const coverage = computed(() => schoolScheduleCoverage(school.value, clock.value));
const schoolThemeName = computed(() => SCHOOL_THEMES.find(item => item.id === school.value?.theme)?.name || '綜合課程');
const manualPayload = computed(() => ({ classIndex: selectedClass.value, cellIndex: selectedCell.value, subjectId: subjectChoice.value, teacherId: teacherChoice.value }));
const manualProblem = computed(() => farm.value ? schoolCampusActionError(farm.value, 'setSchedule', manualPayload.value, clock.value) : '校園尚未載入。');
const cellLabel = index => `${SCHOOL_DAYS[Math.floor(index / periods.value)]}第 ${index % periods.value + 1} 節`;
const subjectName = id => subjects.value.find(item => item.id === id)?.name || '未排課';
const teacherName = id => schoolCandidate(id)?.name || '未指派';
const schoolPlace = computed(() => villageById(school.value?.villageId)?.name || '我的校地');
const classTeachers = index => [...new Set((school.value?.schedules?.[String(index)] || []).map(cell => cell?.teacherId).filter(Boolean))].map(id => schoolCandidate(id)).filter(Boolean);
const canOperate = (action, payload = {}) => !busy.value && !quiz.value && !!farm.value && !schoolCampusActionError(farm.value, action, payload, Date.now());

async function loadLearning() {
  if (!lesson.value.version || !lesson.value.volume || !lesson.value.unit || !studentId.value) return;
  const { data, error } = await db.from('vocabularies').select('id,en_us,zh_tw')
    .eq('version', lesson.value.version).eq('volume', lesson.value.volume).eq('unit', lesson.value.unit).limit(1000);
  if (error) return;
  words.value = (data || []).filter(item => String(item.en_us || '').trim() && String(item.zh_tw || '').trim());
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey.value) || 'null');
    if (saved?.id && Array.isArray(saved.correct) && Array.isArray(saved.wrong)) session.value = saved;
  } catch { /* A fresh school session can be created if local storage is unavailable. */ }
  if (!session.value) {
    const { count } = await db.from('game_records').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId.value).eq('game_type', FARM_GAME_TYPE)
      .eq('version', lesson.value.version).eq('volume', lesson.value.volume).eq('unit_played', lesson.value.unit);
    session.value = { id: crypto.randomUUID(), startedAt: Date.now(), correct: [], wrong: [], attemptNumber: (count || 0) + 1 };
    rememberSession();
  }
}
function rememberSession() { try { sessionStorage.setItem(sessionKey.value, JSON.stringify(session.value)); } catch { /* Answer will still be recorded remotely. */ } }
async function syncLearning() {
  if (!session.value) return;
  const entry = session.value;
  const { error } = await db.from('game_records').upsert([{
    id: entry.id, student_id: studentId.value, game_type: FARM_GAME_TYPE,
    version: lesson.value.version, volume: lesson.value.volume, unit_played: lesson.value.unit,
    score: entry.correct.length * 10, mistakes: entry.wrong.length,
    correct_words: entry.correct.join(', '), wrong_words: entry.wrong.join(', '),
    attempt_number: entry.attemptNumber, played_at: new Date(entry.startedAt).toISOString(),
    time_taken_seconds: Math.floor((Date.now() - entry.startedAt) / 1000), device_info: navigator.userAgent
  }], { onConflict: 'id' });
  if (error) notice.value += `；答題紀錄尚未同步：${error.message}`;
}
function beginLearningAction(action, payload = {}) {
  if (!canOperate(action, payload)) return;
  if (words.value.length < 2 || !session.value) { notice.value = '請從已選單字範圍的開心農場進入，至少需要兩筆單字才能答題操作。'; return; }
  const word = words.value[Math.floor(Math.random() * words.value.length)];
  const target = String(word.en_us).trim();
  const others = [...new Set(words.value.map(item => String(item.en_us).trim()).filter(value => value && value !== target))]
    .sort(() => Math.random() - .5).slice(0, 3);
  quiz.value = { word, target, choices: [target, ...others].sort(() => Math.random() - .5), action, payload };
}
async function answerLearning(choice) {
  if (!quiz.value || busy.value) return;
  const question = quiz.value;
  const correct = choice === question.target;
  if (correct && !await doCampusAction(question.action, question.payload)) return;
  if (correct) session.value.correct.push(question.word.en_us);
  else { session.value.wrong.push(question.word.en_us); notice.value = `答錯：${question.word.en_us}＝${question.word.zh_tw}；這次沒有執行操作。`; }
  rememberSession();
  quiz.value = null;
  await syncLearning();
}

async function loadCampus() {
  if (!studentId.value) { notice.value = '請先以學生身分進入單字開心農場。'; loading.value = false; return; }
  const { data, error } = await db.from('happy_farm_states').select('farm,revision').eq('student_id', studentId.value).maybeSingle();
  if (error) throw error;
  if (!data?.farm) { notice.value = '尚未建立農場，請先回開心農場。'; loading.value = false; return; }
  farm.value = withVillageLand(data.farm, data.farm.homeVillage);
  revision.value = data.revision;
  if (!school.value) notice.value = '尚未設立學校，請先回開心農場選擇自有校地設校。';
  else if (!campusReady.value) notice.value = '請先回開心農場補設校地與學制。';
  else notice.value = `歡迎來到${school.value.name}！可查看校園、教室、課表和教師。`;
  loading.value = false;
}
async function saveCampus(next) {
  const expected = revision.value;
  const { data, error } = await db.from('happy_farm_states')
    .update({ farm: next, revision: expected + 1, updated_at: new Date().toISOString() })
    .eq('student_id', studentId.value).eq('revision', expected).select('revision').maybeSingle();
  if (error) throw error;
  if (!data) { await loadCampus(); throw new Error('農場已在另一個分頁更新；資料已重新載入，請再操作一次。'); }
  farm.value = next;
  revision.value = data.revision;
}
async function doCampusAction(action, payload = {}) {
  if (busy.value || !farm.value) return false;
  const problem = schoolCampusActionError(farm.value, action, payload, Date.now());
  if (problem) { notice.value = problem; return false; }
  busy.value = true;
  try {
    const result = applySchoolCampusAction(farm.value, action, payload, Date.now());
    await saveCampus(result.farm);
    notice.value = result.detail;
    return true;
  } catch (error) { notice.value = `操作未完成：${error.message}`; return false; }
  finally { busy.value = false; }
}
function chooseCell(index) {
  selectedCell.value = index;
  const entry = schoolCell(school.value, selectedClass.value, index);
  subjectChoice.value = entry?.subjectId || '';
  teacherChoice.value = entry?.teacherId || '';
}
function chooseClass(index) {
  selectedClass.value = index;
  chooseCell(0);
}
function saveCell() {
  doCampusAction('setSchedule', manualPayload.value);
}
async function autoSchedule(classIndex) {
  const payload = classIndex === undefined ? {} : { classIndex };
  beginLearningAction('autoSchedule', payload);
}
onMounted(async () => {
  try { await loadCampus(); await loadLearning(); } catch (error) { notice.value = `校園載入失敗：${error.message}`; loading.value = false; }
  clockTimer = window.setInterval(() => { clock.value = Date.now(); }, 30000);
});
onUnmounted(() => { if (clockTimer) window.clearInterval(clockTimer); });
</script>

<template>
  <main class="campus-page">
    <header class="campus-header">
      <div><span class="eyebrow">HAPPY FARM SCHOOL CAMPUS</span><h1>🏫 {{ school?.name || '學校管理' }}</h1><p>{{ level?.name || '學制待設定' }} · {{ schoolPlace }} · 使用自己的 {{ school?.plotIndexes?.length || 0 }} 格土地</p></div>
      <NuxtLink class="back-button" :to="{ path: '/game-happy-farm', query: returnQuery }">← 返回開心農場</NuxtLink>
    </header>
    <p class="campus-notice" role="status" aria-live="polite">{{ notice }}</p>
    <section v-if="loading" class="empty-card">正在準備校園…</section>
    <section v-else-if="!campusReady" class="empty-card"><h2>尚未完成校地配置</h2><p>先回開心農場，打開「私立學校」指定自有校地與學制。</p><NuxtLink :to="{ path: '/game-happy-farm', query: returnQuery }">返回開心農場</NuxtLink></section>
    <template v-else>
      <section class="campus-stats" aria-label="學校概況"><div><strong>🏦 {{ school.fund }}</strong><span>學校基金</span></div><div><strong>⭐ {{ school.reputation }}/100</strong><span>學校聲望</span></div><div><strong>🏫 {{ school.classes }} 班</strong><span>教室與班級</span></div><div><strong>👧 {{ school.lastResult?.students || 0 }} 人</strong><span>最近一輪招生</span></div><div><strong>👩‍🏫 {{ teacherContracts.length }} 人</strong><span>在任教師</span></div></section>
      <nav class="campus-tabs" aria-label="學校操作"><button v-for="item in [['campus','🏫 校園'],['classroom','🪑 教室與學生'],['schedule','🗓️ 課表'],['facilities','🏗️ 設施'],['teachers','👩‍🏫 教師']]" :key="item[0]" type="button" :class="{ active: tab === item[0] }" @click="tab = item[0]">{{ item[1] }}</button></nav>
      <section v-if="tab === 'campus'" class="campus-panel">
        <h2>{{ level.icon }} {{ school.name }}校園</h2><p>課程特色：{{ schoolThemeName }} · 每班上限 {{ level.classSize }} 人 · {{ level.outcome }}</p>
        <div class="campus-map"><article class="campus-main"><span>🏢</span><strong>行政大樓</strong><small>校長與行政人員管理校務</small></article><article v-for="index in classCount" :key="index" class="campus-room" role="button" tabindex="0" @click="chooseClass(index - 1); tab = 'classroom'" @keydown.enter.prevent="chooseClass(index - 1); tab = 'classroom'" @keydown.space.prevent="chooseClass(index - 1); tab = 'classroom'"><span>🪑</span><strong>{{ schoolRoomName(index - 1) }}</strong><small>{{ schoolSeatCount(school, index - 1) }} 位學生 · 點擊查看</small></article><article v-for="facility in SCHOOL_FACILITIES.filter(item => school.campusFacilities?.includes(item.id))" :key="facility.id"><span>{{ facility.icon }}</span><strong>{{ facility.name }}</strong><small>{{ facility.effect }}</small></article></div>
        <p class="campus-hint">教室隨班級數產生；其他校園設施可用學校基金興建。設施與完整課表會提升招生時的教學品質。</p>
      </section>
      <section v-if="tab === 'classroom'" class="campus-panel">
        <h2>🪑 教室與學生</h2><div class="class-picker"><button v-for="index in classCount" :key="index" type="button" :class="{ active: selectedClass === index - 1 }" @click="chooseClass(index - 1)">{{ schoolRoomName(index - 1) }}</button></div>
        <div class="room-scene"><div class="room-board">{{ schoolRoomName(selectedClass) }}<small>{{ schoolSeatCount(school, selectedClass) }} / {{ level.classSize }} 位學生</small></div><div v-if="schoolSeatCount(school, selectedClass)" class="student-grid"><div v-for="index in schoolSeatCount(school, selectedClass)" :key="index" class="student-seat" :title="`匿名學生 ${index}`"><span>{{ ['🧒','👧','👦','👩'][index % 4] }}</span><small>{{ String(index).padStart(2, '0') }} 號</small></div></div><div v-else class="no-students">尚未辦理招生；學生入學後會顯示在教室。</div></div>
        <div class="teacher-strip"><strong>本班課表中的教師</strong><span v-if="!classTeachers(selectedClass).length">尚未指派教師</span><span v-for="person in classTeachers(selectedClass)" :key="person.id">{{ person.name }} · {{ person.specialty }}</span></div><p class="campus-hint">學生以匿名座位表示，不引用真實學生個資；人數來自最近一次招生結果。</p>
      </section>
      <section v-if="tab === 'schedule'" class="campus-panel">
        <h2>🗓️ 每班課表</h2><p>依教育階段提供示意領域與節數。{{ level.name }}每班每週 {{ schoolScheduleCells(school) }} 節；已排 {{ coverage.filled }}/{{ coverage.total }} 節、在任教師授課 {{ coverage.staffed }} 節。</p>
        <div class="schedule-actions"><div class="class-picker"><button v-for="index in classCount" :key="index" type="button" :class="{ active: selectedClass === index - 1 }" @click="chooseClass(index - 1)">{{ index }} 班</button></div><button type="button" :disabled="!canOperate('autoSchedule', { classIndex: selectedClass })" @click="autoSchedule(selectedClass)">📖 答題自動排本班</button><button type="button" :disabled="!canOperate('autoSchedule')" @click="autoSchedule()">📖 答題自動排全校</button></div>
        <div class="schedule-scroll"><div class="timetable" :style="{ gridTemplateColumns: `90px repeat(${periods}, minmax(106px, 1fr))` }"><div class="timetable-head">星期／節次</div><div v-for="period in periods" :key="`head-${period}`" class="timetable-head">第 {{ period }} 節</div><template v-for="(day, dayIndex) in SCHOOL_DAYS" :key="day"><div class="timetable-day">{{ day }}</div><button v-for="period in periods" :key="`${day}-${period}`" type="button" class="timetable-cell" :class="{ selected: selectedCell === dayIndex * periods + period - 1, empty: !schoolCell(school, selectedClass, dayIndex * periods + period - 1)?.subjectId }" @click="chooseCell(dayIndex * periods + period - 1)"><strong>{{ subjectName(schoolCell(school, selectedClass, dayIndex * periods + period - 1)?.subjectId) }}</strong><small>{{ teacherName(schoolCell(school, selectedClass, dayIndex * periods + period - 1)?.teacherId) }}</small></button></template></div></div>
        <div class="manual-editor"><strong>✏️ 手動編輯：{{ schoolRoomName(selectedClass) }} · {{ cellLabel(selectedCell) }}</strong><label>課程<select v-model="subjectChoice" @change="teacherChoice = ''"><option value="">空白節次</option><option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}（參考每週 {{ subject.weekly }} 節）</option></select></label><label>授課教師<select v-model="teacherChoice" :disabled="!subjectChoice"><option value="">暫不指派</option><option v-for="contract in teacherContracts" :key="contract.personId" :value="contract.personId">{{ teacherName(contract.personId) }} · {{ schoolCandidate(contract.personId)?.specialty }}</option></select></label><button type="button" :disabled="!!manualProblem || busy || !!quiz" @click="saveCell">儲存這一節</button><small v-if="manualProblem" class="editor-warning">{{ manualProblem }}</small></div>
        <div class="subject-reference"><strong>本學制每週參考配置</strong><span v-for="subject in subjects" :key="subject.id">{{ subject.name }} {{ subject.weekly }} 節</span></div><a class="curriculum-source" href="https://www.naer.edu.tw/upload/1/16/doc/288/%E5%8D%81%E4%BA%8C%E5%B9%B4%E5%9C%8B%E6%95%99%E8%AA%B2%E7%A8%8B%E7%B6%B1%E8%A6%81%E7%B8%BD%E7%B6%B1.pdf" target="_blank" rel="noopener">參考：國家教育研究院十二年國教課程綱要總綱</a><p class="campus-hint">課表是遊戲示意，並非正式學校課程計畫；大學課程以通識、專業與研究示意編排。</p>
      </section>
      <section v-if="tab === 'facilities'" class="campus-panel"><h2>🏗️ 校園設施</h2><p>設施建於已提供的校地內，使用學校基金。教室由班級數自動提供；興建前會答一道單字題。</p><div class="facility-grid"><article v-for="facility in SCHOOL_FACILITIES.filter(item => item.levels.includes(school.levelId))" :key="facility.id" :class="{ owned: school.campusFacilities?.includes(facility.id) }"><span>{{ facility.icon }}</span><strong>{{ facility.name }}</strong><small>{{ facility.effect }}</small><button v-if="!school.campusFacilities?.includes(facility.id)" type="button" :disabled="!canOperate('buildFacility', { facilityId: facility.id })" @click="beginLearningAction('buildFacility', { facilityId: facility.id })">答題興建 · {{ facility.cost }} 金幣</button><em v-else>✅ 已啟用</em></article></div></section>
      <section v-if="tab === 'teachers'" class="campus-panel"><h2>👩‍🏫 校長、行政與教師</h2><p>人員聘約由學校基金支付；校長與行政人員請返回農場的「專業顧問」，教師請到「私立學校」招聘。</p><div class="staff-grid"><article v-for="contract in school.staff" :key="contract.personId" :class="{ expired: contract.paidUntil <= clock }"><span>{{ contract.role === 'principal' ? '🎓' : contract.role === 'administrator' ? '📋' : '👩‍🏫' }}</span><strong>{{ schoolCandidate(contract.personId)?.name }}</strong><small>{{ contract.role === 'teacher' ? schoolCandidate(contract.personId)?.specialty + '教師' : contract.role === 'principal' ? '校長' : '行政人員' }} · 能力 {{ schoolCandidate(contract.personId)?.skill }}</small><small>{{ contract.paidUntil > clock ? '聘約至' : '聘約已到期：' }} {{ new Date(contract.paidUntil).toLocaleString('zh-TW') }}</small></article></div><p v-if="!school.staff.length">目前尚未聘用人員。</p></section>
    </template>
    <div v-if="quiz" class="quiz-shade"><section class="quiz-card" role="dialog" aria-modal="true" aria-label="校園單字題"><h2>📖 答對才能完成操作</h2><p>「{{ quiz.word.zh_tw }}」的英文是？</p><div class="quiz-choices"><button v-for="choice in quiz.choices" :key="choice" type="button" :disabled="busy" @click="answerLearning(choice)">{{ choice }}</button></div><button class="quiz-cancel" type="button" :disabled="busy" @click="quiz = null">取消</button></section></div>
  </main>
</template>

<style scoped>
.campus-page{min-height:100vh;padding:22px clamp(14px,3vw,52px);background:linear-gradient(155deg,#e9f6e9,#fef9df 65%,#e9f1fb);color:#244337;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif}.campus-header{display:flex;align-items:center;justify-content:space-between;gap:16px}.campus-header h1{font-size:clamp(1.5rem,2.8vw,2.5rem);margin:4px 0}.campus-header p{margin:0}.eyebrow{font-size:.76rem;letter-spacing:.16em;font-weight:900;color:#4f8461}.back-button,.empty-card a{display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;border-radius:12px;background:#2e7853;color:white;text-decoration:none;font-weight:850;white-space:nowrap}.campus-notice{min-height:1.5em;padding:10px 13px;border-radius:10px;background:#e0efcd;font-weight:750}.campus-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.campus-stats div{display:grid;gap:3px;padding:12px;border:1px solid #a9c7a5;border-radius:13px;background:#fffdf4}.campus-stats strong{font-size:1.18rem}.campus-stats span{font-size:.76rem}.campus-tabs{display:flex;gap:7px;overflow:auto;margin:15px 0}.campus-tabs button,.class-picker button{border:1px solid #679d77;border-radius:9px;background:#fff;padding:9px 12px;color:#24543b;font-weight:850;white-space:nowrap}.campus-tabs button.active,.class-picker button.active{background:#2e7853;color:#fff}.campus-panel,.empty-card{border:2px solid #a6c395;border-radius:18px;padding:clamp(14px,2vw,24px);background:#fffdf4;box-shadow:0 7px 20px #33604318}.campus-panel h2{margin:0 0 8px}.campus-panel p{line-height:1.5}.campus-map,.facility-grid,.staff-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px}.campus-map article,.facility-grid article,.staff-grid article{display:grid;align-content:start;gap:6px;min-height:115px;padding:15px;border:2px solid #b7d1aa;border-radius:14px;background:#f2f9e9}.campus-map article span,.facility-grid article span,.staff-grid article span{font-size:2rem}.campus-map article strong,.facility-grid article strong,.staff-grid article strong{font-size:1.05rem}.campus-map article small,.facility-grid article small,.staff-grid article small{line-height:1.4}.campus-room{cursor:pointer}.campus-room:hover{border-color:#3b8a59;background:#e2f5d7}.campus-hint{font-size:.8rem;color:#5c745f}.class-picker{display:flex;gap:6px;flex-wrap:wrap}.room-scene{margin-top:12px;padding:16px;border:9px solid #be956a;border-radius:18px;background:repeating-linear-gradient(90deg,#edd1a7 0 46px,#e8c79a 46px 48px)}.room-board{display:flex;justify-content:space-between;gap:8px;padding:12px 16px;border:7px solid #9c693e;border-radius:7px;background:#286b54;color:#fff;font-weight:900;font-size:1.15rem}.room-board small{font-size:.8rem}.student-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:9px;margin-top:20px}.student-seat{display:grid;justify-items:center;gap:4px;border-radius:10px;border:2px solid #a07857;background:#fdf8df;padding:7px;font-size:1.35rem}.student-seat small{font-size:.7rem}.no-students{padding:35px;text-align:center;background:#fff9e9;margin-top:15px;border-radius:10px}.teacher-strip{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0}.teacher-strip span{padding:6px 9px;border-radius:8px;background:#e0f2cf;font-size:.83rem}.schedule-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:12px 0}.schedule-actions>button,.manual-editor button,.facility-grid button{padding:9px 12px;border:1px solid #277855;border-radius:8px;background:#d9f0c6;color:#23573f;font-weight:850}.schedule-actions button:disabled,.manual-editor button:disabled,.facility-grid button:disabled{opacity:.5}.schedule-scroll{max-width:100%;overflow:auto}.timetable{display:grid;min-width:780px;gap:3px}.timetable-head,.timetable-day{display:grid;place-items:center;padding:8px;background:#cce9c4;border-radius:5px;font-weight:850}.timetable-cell{display:grid;gap:4px;min-height:64px;text-align:left;padding:7px;border:1px solid #a5caa0;border-radius:6px;background:#f4faeb;color:#264436}.timetable-cell small{font-size:.7rem}.timetable-cell.empty{background:#fff}.timetable-cell.selected{outline:3px solid #e6a94b;outline-offset:-3px}.manual-editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto;gap:8px;align-items:end;padding:13px;border-radius:11px;background:#eaf4df;margin-top:14px}.manual-editor>strong{grid-column:1/-1}.manual-editor label{display:grid;gap:4px;font-size:.8rem;font-weight:800}.manual-editor select{width:100%;min-width:0;padding:8px;border:1px solid #79a77e;border-radius:7px;background:#fff}.subject-reference{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.subject-reference strong{width:100%}.subject-reference span{padding:5px 7px;background:#eff5e7;border-radius:7px;font-size:.75rem}.curriculum-source{display:inline-block;margin-top:11px;color:#176e98}.facility-grid article.owned{border-color:#4a9e65;background:#e3f5dc}.facility-grid em{color:#22804d;font-style:normal;font-weight:850}.staff-grid article.expired{opacity:.55}
@media(max-width:760px){.campus-header{align-items:flex-start;flex-direction:column}.campus-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.manual-editor{grid-template-columns:1fr}.campus-page{padding:14px}.campus-map,.facility-grid,.staff-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:440px){.campus-map,.facility-grid,.staff-grid{grid-template-columns:1fr}}
.quiz-shade{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:#142a22b8}.quiz-card{width:min(430px,100%);padding:22px;border:3px solid #6eaa6d;border-radius:16px;background:#fffdf1;box-shadow:0 15px 50px #0005}.quiz-card h2{margin:0 0 8px}.quiz-card p{font-size:1.15rem;font-weight:850}.quiz-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.quiz-choices button,.quiz-cancel{padding:12px;border:1px solid #61a06b;border-radius:9px;background:#e3f5d2;color:#244b35;font-weight:850}.quiz-cancel{margin-top:12px;background:#fff}
.editor-warning{grid-column:1/-1;color:#a33e2d;font-weight:800}
</style>
