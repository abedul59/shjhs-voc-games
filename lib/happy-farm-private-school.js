import { familyAssetValue } from '~/lib/happy-farm-family';

// Fictional game amounts and staffing ratios; these are not legal thresholds.
export const SCHOOL_ASSET_GATE = 3000;
export const SCHOOL_FOUNDING_GIFT = 3000;
export const SCHOOL_TERM_MS = 3 * 60 * 60 * 1000;
export const SCHOOL_STAFF_MS = 24 * 60 * 60 * 1000;
export const SCHOOL_LEVELS = [
  { id: 'elementary', name: '國小', icon: '🎒', land: 1, maxClasses: 8, classSize: 30, teachersPerClass: 1, tuition: 18, expense: 1, expansionCost: 300, outcome: '閱讀與生活素養' },
  { id: 'junior', name: '國中', icon: '📘', land: 2, maxClasses: 7, classSize: 32, teachersPerClass: 1.25, tuition: 24, expense: 1.3, expansionCost: 390, outcome: '探索與適性學習' },
  { id: 'senior', name: '高中', icon: '📗', land: 2, maxClasses: 6, classSize: 36, teachersPerClass: 1.5, tuition: 30, expense: 1.6, expansionCost: 480, outcome: '學科與專題表現' },
  { id: 'vocational', name: '高職', icon: '🛠️', land: 2, maxClasses: 6, classSize: 32, teachersPerClass: 1.5, tuition: 28, expense: 1.7, expansionCost: 480, outcome: '實作與職涯能力' },
  { id: 'university', name: '大學', icon: '🎓', land: 3, maxClasses: 4, classSize: 45, teachersPerClass: 2, tuition: 42, expense: 2, expansionCost: 600, outcome: '研究與社會服務' }
];
export const schoolLevel = id => SCHOOL_LEVELS.find(level => level.id === id);
export const schoolTeacherNeed = school => Math.ceil((schoolLevel(school?.levelId)?.teachersPerClass || 1) * (school?.classes || 1));
export const schoolCampusPlots = (farm, plotIndex, levelId) => {
  const level = schoolLevel(levelId);
  const villageId = farm.plotVillages?.[plotIndex];
  if (!level || !Number.isInteger(plotIndex) || plotIndex < 0 || !farm.ownedVillages?.includes(villageId) || farm.plots?.[plotIndex] !== null) return [];
  const reserved = new Set((farm.plots || []).filter(plot => plot?.facility === 'farmhouse').flatMap(plot => plot.parcel || []));
  if (reserved.has(plotIndex)) return [];
  const available = (farm.plotVillages || []).map((id, index) => id === villageId && farm.plots[index] === null && !reserved.has(index) ? index : -1).filter(index => index >= 0);
  return available.length >= level.land ? [plotIndex, ...available.filter(index => index !== plotIndex).slice(0, level.land - 1)] : [];
};
export const SCHOOL_STAFF_ROLES = [
  { id: 'principal', name: '校長', icon: '🎓', note: '主持校務、提升教學品質' },
  { id: 'administrator', name: '行政人員', icon: '📋', note: '辦理招生、校務與財務' }
];
export const SCHOOL_THEMES = [
  { id: 'bilingual', name: '雙語與閱讀', icon: '📚' },
  { id: 'agriculture', name: '農業與環境', icon: '🌱' },
  { id: 'science', name: '科學與創客', icon: '🔬' },
  { id: 'arts', name: '藝術與人文', icon: '🎨' }
];
export const SCHOOL_CANDIDATES = [
  { id: 'principal-lin', role: 'principal', name: '林慧文', specialty: '雙語與閱讀', skill: 84, fee: 520 },
  { id: 'principal-chen', role: 'principal', name: '陳明哲', specialty: '農業與環境', skill: 80, fee: 470 },
  { id: 'principal-huang', role: 'principal', name: '黃雅婷', specialty: '科學與創客', skill: 88, fee: 560 },
  { id: 'principal-wu', role: 'principal', name: '吳志偉', specialty: '藝術與人文', skill: 77, fee: 440 },
  { id: 'admin-tsai', role: 'administrator', name: '蔡怡君', specialty: '招生與家長溝通', skill: 85, fee: 310 },
  { id: 'admin-li', role: 'administrator', name: '李柏翰', specialty: '校務與預算', skill: 82, fee: 290 },
  { id: 'admin-kuo', role: 'administrator', name: '郭品妤', specialty: '學生輔導', skill: 79, fee: 270 },
  { id: 'admin-hsu', role: 'administrator', name: '許家維', specialty: '活動規劃', skill: 76, fee: 260 },
  { id: 'teacher-eng-1', role: 'teacher', name: '張佳蓉', specialty: '英文', skill: 86, fee: 210 },
  { id: 'teacher-eng-2', role: 'teacher', name: '江冠宇', specialty: '英文', skill: 79, fee: 175 },
  { id: 'teacher-science-1', role: 'teacher', name: '王佩珊', specialty: '自然', skill: 84, fee: 200 },
  { id: 'teacher-science-2', role: 'teacher', name: '鄭博仁', specialty: '科技', skill: 78, fee: 170 },
  { id: 'teacher-arts-1', role: 'teacher', name: '劉美琪', specialty: '美術', skill: 83, fee: 195 },
  { id: 'teacher-arts-2', role: 'teacher', name: '何承恩', specialty: '音樂', skill: 77, fee: 165 },
  { id: 'teacher-agri-1', role: 'teacher', name: '楊育誠', specialty: '農業', skill: 85, fee: 205 },
  { id: 'teacher-agri-2', role: 'teacher', name: '謝宜蓁', specialty: '環境', skill: 80, fee: 180 },
  { id: 'teacher-life-1', role: 'teacher', name: '趙心怡', specialty: '閱讀', skill: 82, fee: 190 },
  { id: 'teacher-life-2', role: 'teacher', name: '賴俊廷', specialty: '體育', skill: 76, fee: 160 },
  { id: 'teacher-life-3', role: 'teacher', name: '周郁婷', specialty: '社會', skill: 81, fee: 185 },
  { id: 'teacher-life-4', role: 'teacher', name: '杜立中', specialty: '數學', skill: 87, fee: 215 }
];

export const schoolCandidate = id => SCHOOL_CANDIDATES.find(person => person.id === id);
export const schoolMarket = (now, role) => {
  const candidates = SCHOOL_CANDIDATES.filter(person => person.role === role);
  const slot = Math.floor((now + 8 * 3600000) / SCHOOL_TERM_MS);
  const count = role === 'teacher' ? 6 : 2;
  return Array.from({ length: Math.min(count, candidates.length) }, (_, index) => candidates[(slot * (role === 'teacher' ? 3 : 1) + index) % candidates.length]);
};
export const freshSchoolState = () => ({ schoolFoundation: null });
export function withSchoolState(farm) {
  const school = farm.schoolFoundation;
  if (!school || typeof school !== 'object') return { ...farm, schoolFoundation: null };
  return { ...farm, schoolFoundation: {
    ...school, fund: Math.max(0, Number(school.fund) || 0), classes: Math.max(1, Number(school.classes) || 1),
    levelId: schoolLevel(school.levelId)?.id || '',
    plotIndexes: schoolLevel(school.levelId) && Array.isArray(school.plotIndexes) ? school.plotIndexes.filter(index => Number.isInteger(index) && farm.plots?.[index]?.facility === 'private_school').slice(0, 3) : [],
    admissionTarget: Math.max(1, Number(school.admissionTarget) || 20), reputation: Math.max(0, Number(school.reputation) || 0),
    staff: Array.isArray(school.staff) ? school.staff.filter(contract => schoolCandidate(contract.personId)).slice(0, 18) : [],
    history: Array.isArray(school.history) ? school.history.slice(0, 35) : []
  } };
}
export const schoolActiveStaff = (school, role, now) => (school?.staff || []).filter(contract => contract.role === role && contract.paidUntil > now);
export const schoolTermExpense = (school, students = school?.admissionTarget || 0) => Math.round((60 + 35 * (school?.classes || 1) + 5 * students) * (schoolLevel(school?.levelId)?.expense || 1));
const validName = name => typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 24;
const validConfig = (school, payload) => Number.isInteger(payload.classes) && payload.classes >= 1 && payload.classes <= schoolLevel(school?.levelId)?.maxClasses
  && Number.isInteger(payload.admissionTarget) && payload.admissionTarget >= 10 && payload.admissionTarget <= payload.classes * schoolLevel(school?.levelId)?.classSize
  && SCHOOL_THEMES.some(theme => theme.id === payload.theme) && [0, 10, 20].includes(payload.scholarshipPercent);

export function schoolActionError(farm, action, payload = {}, now = Date.now()) {
  const school = farm.schoolFoundation;
  if (action === 'found') {
    if (school) return '已經成立一所學校法人。';
    if (!validName(payload.name)) return '校名請輸入 2 至 24 個字。';
    if (!schoolLevel(payload.levelId)) return '請先選擇國小、國中、高中、高職或大學。';
    if (schoolCampusPlots(farm, payload.plotIndex, payload.levelId).length !== schoolLevel(payload.levelId).land) return `請在自己擁有的同一里提供 ${schoolLevel(payload.levelId).land} 格空地作校地。`;
    if (familyAssetValue(farm) < SCHOOL_ASSET_GATE) return `農場總資產需達 ${SCHOOL_ASSET_GATE} 金幣。`;
    return farm.coins >= SCHOOL_FOUNDING_GIFT ? '' : `需有 ${SCHOOL_FOUNDING_GIFT} 金幣才能捐贈設校。`;
  }
  if (!school) return '請先捐贈成立學校法人。';
  if (action === 'allocateLand') {
    if (school.plotIndexes?.length) return '學校已有校地。';
    if (!schoolLevel(payload.levelId)) return '請先選擇學制。';
    return schoolCampusPlots(farm, payload.plotIndex, payload.levelId).length === schoolLevel(payload.levelId).land ? '' : `請在自己擁有的同一里提供 ${schoolLevel(payload.levelId).land} 格空地作校地。`;
  }
  if (action === 'donate') return Number.isInteger(payload.amount) && payload.amount >= 100 && payload.amount <= 10000 && farm.coins >= payload.amount
    ? '' : '請輸入 100 至 10000 金幣，並確認農場餘額足夠。';
  if (action === 'configure') {
    if (!school.plotIndexes?.length) return '請先補設校地與學制。';
    if (!validConfig(school, payload)) return '班級、招生人數或課程設定不符合此學制的遊戲上限。';
    const cost = Math.max(0, payload.classes - school.classes) * schoolLevel(school.levelId).expansionCost;
    return school.fund >= cost ? '' : `增設班級需學校基金 ${cost} 金幣。`;
  }
  if (action === 'hire' || action === 'renew' || action === 'dismiss') {
    if (!school.plotIndexes?.length) return '請先補設校地與學制。';
    const person = schoolCandidate(payload.personId);
    if (!person) return '找不到這位應徵者。';
    const contract = school.staff.find(item => item.personId === person.id);
    if (action === 'dismiss') return contract ? '' : '找不到這份聘約。';
    if (action === 'renew') {
      if (!contract) return '找不到這份聘約。';
      if (contract.paidUntil > now) return '聘約尚未到期。';
      if (person.role !== 'teacher' && schoolActiveStaff(school, person.role, now).length) return '此職位已有在任人員。';
      if (person.role === 'teacher' && schoolActiveStaff(school, 'teacher', now).length >= schoolTeacherNeed(school) + school.classes) return '目前教師名額已滿。';
    } else {
      if (!schoolMarket(now, person.role).some(item => item.id === person.id)) return '此人目前不在仲介名單。';
      if (contract?.paidUntil > now) return '此人已在任。';
      if (person.role !== 'teacher' && schoolActiveStaff(school, person.role, now).length) return '此職位已有在任人員。';
      if (person.role === 'teacher' && schoolActiveStaff(school, 'teacher', now).length >= schoolTeacherNeed(school) + school.classes) return '目前教師名額已滿。';
    }
    return school.fund >= person.fee ? '' : '學校基金不足，無法支付聘約費用。';
  }
  if (action === 'enroll') {
    if (!school.plotIndexes?.length || school.plotIndexes.some(index => farm.plots?.[index]?.facility !== 'private_school')) return '學校校地不完整，請先補設校地。';
    if (school.lastTermAt && now - school.lastTermAt < SCHOOL_TERM_MS) return '本輪招生尚未開放，請等候 3 小時。';
    if (!schoolActiveStaff(school, 'principal', now).length) return '請先聘請在任校長。';
    if (!schoolActiveStaff(school, 'administrator', now).length) return '請先聘請在任行政人員。';
    if (schoolActiveStaff(school, 'teacher', now).length < schoolTeacherNeed(school)) return `此學制目前需要至少 ${schoolTeacherNeed(school)} 名在任教師。`;
    return school.fund >= schoolTermExpense(school) ? '' : '學校基金不足以支付本輪校務費用。';
  }
  return '無法執行校務操作。';
}

export function applySchoolAction(farm, action, payload = {}, now = Date.now()) {
  const error = schoolActionError(farm, action, payload, now);
  if (error) throw new Error(error);
  const next = JSON.parse(JSON.stringify(farm));
  let school = next.schoolFoundation;
  let detail = '';
  let amount = 0;
  if (action === 'found') {
    const level = schoolLevel(payload.levelId);
    const plotIndexes = schoolCampusPlots(next, payload.plotIndex, payload.levelId);
    plotIndexes.forEach((index, part) => { next.plots[index] = { facility: 'private_school', campusAnchor: payload.plotIndex, campusPart: part }; });
    next.coins -= SCHOOL_FOUNDING_GIFT;
    school = next.schoolFoundation = {
      name: payload.name.trim(), villageId: next.plotVillages[payload.plotIndex], levelId: level.id, plotIndexes, fund: SCHOOL_FOUNDING_GIFT,
      classes: 1, admissionTarget: Math.min(20, level.classSize), theme: 'bilingual', scholarshipPercent: 0,
      reputation: 30, termCount: 0, totalStudents: 0, lastTermAt: 0, lastResult: null, staff: [], history: []
    };
    amount = SCHOOL_FOUNDING_GIFT;
    detail = `捐贈 ${amount} 金幣，於自己的 ${plotIndexes.length} 格土地成立「${school.name}」${level.name}；校地位於第 ${plotIndexes.map(index => index + 1).join('、')} 格`;
  } else if (action === 'allocateLand') {
    const level = schoolLevel(payload.levelId);
    const plotIndexes = schoolCampusPlots(next, payload.plotIndex, payload.levelId);
    plotIndexes.forEach((index, part) => { next.plots[index] = { facility: 'private_school', campusAnchor: payload.plotIndex, campusPart: part }; });
    school.villageId = next.plotVillages[payload.plotIndex];
    school.levelId = level.id;
    school.plotIndexes = plotIndexes;
    school.classes = Math.min(school.classes, level.maxClasses);
    school.admissionTarget = Math.min(school.admissionTarget, school.classes * level.classSize);
    detail = `為「${school.name}」補設${level.name}校地，使用自己擁有的 ${plotIndexes.length} 格土地`;
  } else if (action === 'donate') {
    next.coins -= payload.amount;
    school.fund += payload.amount;
    amount = payload.amount;
    detail = `捐贈 ${amount} 金幣至「${school.name}」學校基金`;
  } else if (action === 'configure') {
    const extra = Math.max(0, payload.classes - school.classes) * schoolLevel(school.levelId).expansionCost;
    school.fund -= extra;
    school.classes = payload.classes;
    school.admissionTarget = payload.admissionTarget;
    school.theme = payload.theme;
    school.scholarshipPercent = payload.scholarshipPercent;
    amount = -extra;
    detail = `校務設定：${school.classes} 班、預計招收 ${school.admissionTarget} 人、${SCHOOL_THEMES.find(theme => theme.id === school.theme).name}、獎學金 ${school.scholarshipPercent}%${extra ? `；擴班支出 ${extra}` : ''}`;
  } else if (action === 'hire' || action === 'renew') {
    const person = schoolCandidate(payload.personId);
    school.fund -= person.fee;
    school.staff = school.staff.filter(item => item.personId !== person.id && item.paidUntil > now);
    school.staff.push({ personId: person.id, role: person.role, paidUntil: now + SCHOOL_STAFF_MS });
    amount = -person.fee;
    detail = `${action === 'renew' ? '續聘' : '聘任'}${person.role === 'teacher' ? `${person.specialty}教師` : SCHOOL_STAFF_ROLES.find(role => role.id === person.role).name} ${person.name}，支付 ${person.fee} 金幣；聘期 24 小時`;
  } else if (action === 'dismiss') {
    const person = schoolCandidate(payload.personId);
    school.staff = school.staff.filter(item => item.personId !== person.id);
    detail = `${person.name} 已離任，已付薪資不退還`;
  } else if (action === 'enroll') {
    const principal = schoolCandidate(schoolActiveStaff(school, 'principal', now)[0].personId);
    const admin = schoolCandidate(schoolActiveStaff(school, 'administrator', now)[0].personId);
    const teachers = schoolActiveStaff(school, 'teacher', now).map(contract => schoolCandidate(contract.personId));
    const teacherSkill = Math.round(teachers.reduce((total, person) => total + person.skill, 0) / teachers.length);
    const themeBonus = teachers.some(person => ({ bilingual: ['英文', '閱讀'], agriculture: ['農業', '環境'], science: ['自然', '科技', '數學'], arts: ['美術', '音樂', '社會'] })[school.theme].includes(person.specialty)) ? 7 : 0;
    const applicants = Math.max(1, Math.floor(school.admissionTarget * (0.58 + school.reputation / 200 + admin.skill / 500)));
    const level = schoolLevel(school.levelId);
    const students = Math.min(school.admissionTarget, school.classes * level.classSize, applicants);
    const quality = Math.max(0, Math.min(100, Math.round((teacherSkill + principal.skill) / 2 + themeBonus + (teachers.length > school.classes ? 4 : 0) - Math.max(0, students / school.classes - 24))));
    const tuition = students * (level.tuition - Math.round(level.tuition * school.scholarshipPercent / 100));
    const expense = schoolTermExpense(school, students);
    school.fund += tuition - expense;
    school.reputation = Math.max(0, Math.min(100, school.reputation + Math.round((quality - 75) / 9) + (school.scholarshipPercent ? 1 : 0)));
    school.termCount += 1;
    school.totalStudents += students;
    school.lastTermAt = now;
    school.lastResult = { students, quality, tuition, expense, outcome: level.outcome, at: now };
    amount = tuition - expense;
    detail = `第 ${school.termCount} 輪招生 ${students} 人／${school.classes} 班；${level.outcome} ${quality}、學費收入 ${tuition}、校務支出 ${expense}、基金淨變動 ${amount >= 0 ? '+' : ''}${amount} 金幣`;
  }
  school.history = [{ at: now, detail, amount }, ...school.history].slice(0, 35);
  return { farm: next, detail };
}
