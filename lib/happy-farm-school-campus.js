import { schoolActiveStaff, schoolCandidate, schoolLevel } from '~/lib/happy-farm-private-school';

export const SCHOOL_DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五'];
// Representative game timetables based on Taiwan curriculum domains. They are not official class plans.
export const SCHOOL_COURSES = {
  elementary: [['chinese', '國語文', 5, '閱讀'], ['math', '數學', 4, '數學'], ['english', '英語文', 3, '英文'], ['science', '自然科學', 3, '自然'], ['social', '社會', 3, '社會'], ['art', '藝術', 3, '美術'], ['pe', '健康與體育', 3, '體育'], ['life', '綜合活動', 3, '閱讀'], ['local', '本土語文', 1, '閱讀'], ['flex', '彈性學習', 2, '農業']],
  junior: [['chinese', '國語文', 5, '閱讀'], ['math', '數學', 4, '數學'], ['english', '英語文', 3, '英文'], ['science', '自然科學', 4, '自然'], ['social', '社會', 3, '社會'], ['art', '藝術', 3, '美術'], ['tech', '科技', 2, '科技'], ['pe', '健康與體育', 3, '體育'], ['life', '綜合活動', 3, '閱讀'], ['local', '本土語文', 1, '閱讀'], ['flex', '彈性學習', 4, '農業']],
  senior: [['chinese', '國語文', 4, '閱讀'], ['math', '數學', 4, '數學'], ['english', '英語文', 4, '英文'], ['science', '自然科學', 4, '自然'], ['social', '社會', 4, '社會'], ['art', '藝術', 2, '美術'], ['pe', '健康與體育', 2, '體育'], ['tech', '科技', 2, '科技'], ['elective', '選修探究', 4, '自然'], ['club', '團體活動', 2, '音樂'], ['flex', '彈性學習', 3, '閱讀']],
  vocational: [['chinese', '國語文', 3, '閱讀'], ['math', '數學', 3, '數學'], ['english', '英語文', 3, '英文'], ['general', '一般科目', 4, '社會'], ['professional', '專業科目', 8, '科技'], ['practice', '實習實作', 8, '農業'], ['pe', '健康與體育', 2, '體育'], ['club', '團體活動', 2, '音樂'], ['flex', '彈性學習', 2, '美術']],
  university: [['major', '專業課程', 10, '科技'], ['general', '通識教育', 6, '社會'], ['lab', '實驗與實作', 4, '自然'], ['seminar', '專題研討', 4, '閱讀'], ['language', '外語', 2, '英文'], ['elective', '跨域選修', 4, '農業']]
};
export const SCHOOL_FACILITIES = [
  { id: 'library', name: '圖書館', icon: '📚', cost: 280, effect: '閱讀與研究加分', levels: ['elementary', 'junior', 'senior', 'vocational', 'university'] },
  { id: 'health', name: '保健室', icon: '🩺', cost: 220, effect: '學生照護加分', levels: ['elementary', 'junior', 'senior', 'vocational', 'university'] },
  { id: 'playground', name: '運動場', icon: '🏃', cost: 360, effect: '體育與活動加分', levels: ['elementary', 'junior', 'senior', 'vocational', 'university'] },
  { id: 'cafeteria', name: '學生餐廳', icon: '🍱', cost: 260, effect: '校園生活加分', levels: ['elementary', 'junior', 'senior', 'vocational', 'university'] },
  { id: 'science_lab', name: '自然實驗室', icon: '🔬', cost: 420, effect: '科學課程加分', levels: ['junior', 'senior', 'vocational', 'university'] },
  { id: 'computer', name: '電腦教室', icon: '💻', cost: 390, effect: '科技課程加分', levels: ['junior', 'senior', 'vocational', 'university'] },
  { id: 'arts', name: '藝術教室', icon: '🎨', cost: 300, effect: '藝術課程加分', levels: ['elementary', 'junior', 'senior', 'vocational'] },
  { id: 'workshop', name: '實習工場', icon: '🛠️', cost: 520, effect: '技職實作加分', levels: ['vocational', 'university'] },
  { id: 'research', name: '研究中心', icon: '🧪', cost: 680, effect: '大學研究加分', levels: ['university'] },
  { id: 'auditorium', name: '禮堂', icon: '🎭', cost: 460, effect: '校園活動加分', levels: ['senior', 'vocational', 'university'] }
];
export const schoolPeriods = school => school?.levelId === 'junior' || school?.levelId === 'senior' || school?.levelId === 'vocational' ? 7 : 6;
export const schoolSubjects = school => (SCHOOL_COURSES[school?.levelId] || []).map(([id, name, weekly, specialty]) => ({ id, name, weekly, specialty }));
export const schoolSeatCount = (school, classIndex) => {
  const students = Math.max(0, Number(school?.lastResult?.students) || 0);
  const classes = Math.max(1, Number(school?.classes) || 1);
  return Math.min(schoolLevel(school?.levelId)?.classSize || 30, Math.floor(students / classes) + (classIndex < students % classes ? 1 : 0));
};
export const schoolRoomName = index => `${index + 1} 班教室`;
export const schoolScheduleCells = school => SCHOOL_DAYS.length * schoolPeriods(school);
export const schoolCell = (school, classIndex, cellIndex) => school?.schedules?.[String(classIndex)]?.[cellIndex] || null;
const schoolFacilities = school => Array.isArray(school?.campusFacilities) ? school.campusFacilities : [];
export const schoolScheduleCoverage = (school, now) => {
  const total = Math.max(1, Number(school?.classes) || 1) * schoolScheduleCells(school);
  let filled = 0, staffed = 0;
  for (let classIndex = 0; classIndex < (school?.classes || 0); classIndex++) {
    for (let cellIndex = 0; cellIndex < schoolScheduleCells(school); cellIndex++) {
      const cell = schoolCell(school, classIndex, cellIndex);
      if (cell?.subjectId) filled++;
      if (cell?.teacherId && schoolActiveStaff(school, 'teacher', now).some(person => person.personId === cell.teacherId)) staffed++;
    }
  }
  return { filled, staffed, total };
};

function schoolCampusError(farm) {
  const school = farm.schoolFoundation;
  const level = schoolLevel(school?.levelId);
  if (!school || !level || school.plotIndexes?.length !== level.land || school.plotIndexes.some(index => farm.plots?.[index]?.facility !== 'private_school')) return '請先在開心農場完成設校與校地配置。';
  return '';
}
export function schoolCampusActionError(farm, action, payload = {}, now = Date.now()) {
  const campusError = schoolCampusError(farm);
  if (campusError) return campusError;
  const school = farm.schoolFoundation;
  if (action === 'buildFacility') {
    const facility = SCHOOL_FACILITIES.find(item => item.id === payload.facilityId && item.levels.includes(school.levelId));
    if (!facility) return '此學制不能建設該設施。';
    if (schoolFacilities(school).includes(facility.id)) return '學校已有這項設施。';
    return school.fund >= facility.cost ? '' : `學校基金不足，建設需要 ${facility.cost} 金幣。`;
  }
  if (action === 'autoSchedule') {
    if (payload.classIndex !== undefined && (!Number.isInteger(payload.classIndex) || payload.classIndex < 0 || payload.classIndex >= school.classes)) return '請先選擇有效班級。';
    return schoolActiveStaff(school, 'teacher', now).length ? '' : '請先聘用至少一名在任教師。';
  }
  if (action === 'setSchedule') {
    const { classIndex, cellIndex, subjectId, teacherId } = payload;
    if (!Number.isInteger(classIndex) || classIndex < 0 || classIndex >= school.classes || !Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= schoolScheduleCells(school)) return '請先選擇有效的班級與節次。';
    if (subjectId && !schoolSubjects(school).some(item => item.id === subjectId)) return '此學制沒有這個課程。';
    if (teacherId) {
      if (!subjectId) return '先選課程才能指派教師。';
      if (!schoolActiveStaff(school, 'teacher', now).some(item => item.personId === teacherId)) return '這位教師目前不在任。';
      for (let other = 0; other < school.classes; other++) if (other !== classIndex && schoolCell(school, other, cellIndex)?.teacherId === teacherId) return `${schoolCandidate(teacherId)?.name || '教師'}同一時間已在其他班上課。`;
    }
    return '';
  }
  return '無法執行校園操作。';
}

export function applySchoolCampusAction(farm, action, payload = {}, now = Date.now()) {
  const error = schoolCampusActionError(farm, action, payload, now);
  if (error) throw new Error(error);
  const next = JSON.parse(JSON.stringify(farm));
  const school = next.schoolFoundation;
  school.campusFacilities ||= [];
  school.schedules ||= {};
  let detail = '';
  let amount = 0;
  if (action === 'buildFacility') {
    const facility = SCHOOL_FACILITIES.find(item => item.id === payload.facilityId);
    school.fund -= facility.cost;
    school.campusFacilities.push(facility.id);
    amount = -facility.cost;
    detail = `建設${facility.name}，學校基金支出 ${facility.cost} 金幣`;
  } else if (action === 'setSchedule') {
    const { classIndex, cellIndex, subjectId, teacherId } = payload;
    const key = String(classIndex);
    const cells = Array.isArray(school.schedules[key]) ? school.schedules[key].slice(0, schoolScheduleCells(school)) : [];
    while (cells.length < schoolScheduleCells(school)) cells.push(null);
    cells[cellIndex] = subjectId ? { subjectId, teacherId: teacherId || '' } : null;
    school.schedules[key] = cells;
    detail = `${schoolRoomName(classIndex)}${SCHOOL_DAYS[Math.floor(cellIndex / schoolPeriods(school))]}第 ${cellIndex % schoolPeriods(school) + 1} 節：${subjectId ? schoolSubjects(school).find(item => item.id === subjectId).name : '清空'}${teacherId ? `，${schoolCandidate(teacherId)?.name}授課` : ''}`;
  } else if (action === 'autoSchedule') {
    const active = schoolActiveStaff(school, 'teacher', now).map(contract => schoolCandidate(contract.personId)).filter(Boolean);
    const subjects = schoolSubjects(school);
    const count = schoolScheduleCells(school);
    const loads = Object.fromEntries(active.map(person => [person.id, 0]));
    const order = subjects.flatMap(subject => Array.from({ length: subject.weekly }, () => subject.id));
    const targets = payload.classIndex === undefined ? Array.from({ length: school.classes }, (_, index) => index) : [payload.classIndex];
    if (payload.classIndex === undefined) school.schedules = {};
    else delete school.schedules[String(payload.classIndex)];
    Object.values(school.schedules).forEach(cells => { if (Array.isArray(cells)) cells.forEach(cell => { if (Object.hasOwn(loads, cell?.teacherId)) loads[cell.teacherId]++; }); });
    let staffed = 0;
    for (const classIndex of targets) {
      const cells = [];
      for (let cellIndex = 0; cellIndex < count; cellIndex++) {
        const subjectId = order[(cellIndex * 11 + classIndex * 5) % order.length];
        const subject = subjects.find(item => item.id === subjectId);
        const occupied = new Set(Object.entries(school.schedules).map(([, otherCells]) => otherCells[cellIndex]?.teacherId).filter(Boolean));
        const eligible = active.filter(person => !occupied.has(person.id)).sort((a, b) =>
          Number(b.specialty === subject.specialty) - Number(a.specialty === subject.specialty) || loads[a.id] - loads[b.id] || b.skill - a.skill);
        const teacherId = eligible[0]?.id || '';
        if (teacherId) { loads[teacherId]++; staffed++; }
        cells.push({ subjectId, teacherId });
      }
      school.schedules[String(classIndex)] = cells;
    }
    detail = `自動編排 ${targets.length} 班、每班 ${count} 節課，已安排教師 ${staffed}/${targets.length * count} 節；可逐格手動調整`;
  }
  school.history = [{ at: now, detail, amount }, ...(school.history || [])].slice(0, 35);
  return { farm: next, detail };
}
