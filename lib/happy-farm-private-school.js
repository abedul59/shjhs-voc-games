import { familyAssetValue } from '~/lib/happy-farm-family';

// Fictional game amounts and staffing ratios; these are not legal thresholds.
export const SCHOOL_ASSET_GATE = 10000;
export const SCHOOL_FOUNDING_GIFT = 5000;
export const SCHOOL_TERM_MS = 3 * 60 * 60 * 1000;
export const SCHOOL_STAFF_MS = 24 * 60 * 60 * 1000;
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
    admissionTarget: Math.max(1, Number(school.admissionTarget) || 20), reputation: Math.max(0, Number(school.reputation) || 0),
    staff: Array.isArray(school.staff) ? school.staff.filter(contract => schoolCandidate(contract.personId)).slice(0, 18) : [],
    history: Array.isArray(school.history) ? school.history.slice(0, 35) : []
  } };
}
export const schoolActiveStaff = (school, role, now) => (school?.staff || []).filter(contract => contract.role === role && contract.paidUntil > now);
export const schoolTermExpense = (school, students = school?.admissionTarget || 0) => 60 + 35 * (school?.classes || 1) + 5 * students;
const validName = name => typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 24;
const validConfig = payload => Number.isInteger(payload.classes) && payload.classes >= 1 && payload.classes <= 8
  && Number.isInteger(payload.admissionTarget) && payload.admissionTarget >= 10 && payload.admissionTarget <= payload.classes * 30
  && SCHOOL_THEMES.some(theme => theme.id === payload.theme) && [0, 10, 20].includes(payload.scholarshipPercent);

export function schoolActionError(farm, action, payload = {}, now = Date.now()) {
  const school = farm.schoolFoundation;
  if (action === 'found') {
    if (school) return '已經成立一所學校法人。';
    if (!validName(payload.name)) return '校名請輸入 2 至 24 個字。';
    if (familyAssetValue(farm) < SCHOOL_ASSET_GATE) return `農場總資產需達 ${SCHOOL_ASSET_GATE} 金幣。`;
    return farm.coins >= SCHOOL_FOUNDING_GIFT ? '' : `需有 ${SCHOOL_FOUNDING_GIFT} 金幣才能捐贈設校。`;
  }
  if (!school) return '請先捐贈成立學校法人。';
  if (action === 'donate') return Number.isInteger(payload.amount) && payload.amount >= 100 && payload.amount <= 10000 && farm.coins >= payload.amount
    ? '' : '請輸入 100 至 10000 金幣，並確認農場餘額足夠。';
  if (action === 'configure') {
    if (!validConfig(payload)) return '班級、招生人數或課程設定不正確；每班最多規劃 30 人。';
    const cost = Math.max(0, payload.classes - school.classes) * 300;
    return school.fund >= cost ? '' : `增設班級需學校基金 ${cost} 金幣。`;
  }
  if (action === 'hire' || action === 'renew' || action === 'dismiss') {
    const person = schoolCandidate(payload.personId);
    if (!person) return '找不到這位應徵者。';
    const contract = school.staff.find(item => item.personId === person.id);
    if (action === 'dismiss') return contract ? '' : '找不到這份聘約。';
    if (action === 'renew') {
      if (!contract) return '找不到這份聘約。';
      if (contract.paidUntil > now) return '聘約尚未到期。';
      if (person.role !== 'teacher' && schoolActiveStaff(school, person.role, now).length) return '此職位已有在任人員。';
      if (person.role === 'teacher' && schoolActiveStaff(school, 'teacher', now).length >= school.classes * 2) return '目前教師名額已滿。';
    } else {
      if (!schoolMarket(now, person.role).some(item => item.id === person.id)) return '此人目前不在仲介名單。';
      if (contract?.paidUntil > now) return '此人已在任。';
      if (person.role !== 'teacher' && schoolActiveStaff(school, person.role, now).length) return '此職位已有在任人員。';
      if (person.role === 'teacher' && schoolActiveStaff(school, 'teacher', now).length >= school.classes * 2) return '目前教師名額已滿（每班最多兩人）。';
    }
    return school.fund >= person.fee ? '' : '學校基金不足，無法支付聘約費用。';
  }
  if (action === 'enroll') {
    if (school.lastTermAt && now - school.lastTermAt < SCHOOL_TERM_MS) return '本輪招生尚未開放，請等候 3 小時。';
    if (!schoolActiveStaff(school, 'principal', now).length) return '請先聘請在任校長。';
    if (!schoolActiveStaff(school, 'administrator', now).length) return '請先聘請在任行政人員。';
    if (schoolActiveStaff(school, 'teacher', now).length < school.classes) return '每班至少需要一名在任教師。';
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
    next.coins -= SCHOOL_FOUNDING_GIFT;
    school = next.schoolFoundation = {
      name: payload.name.trim(), villageId: next.homeVillage, fund: SCHOOL_FOUNDING_GIFT,
      classes: 1, admissionTarget: 20, theme: 'bilingual', scholarshipPercent: 0,
      reputation: 30, termCount: 0, totalStudents: 0, lastTermAt: 0, lastResult: null, staff: [], history: []
    };
    amount = SCHOOL_FOUNDING_GIFT;
    detail = `捐贈 ${amount} 金幣，成立「${school.name}」學校法人；校舍為獨立模擬校地`;
  } else if (action === 'donate') {
    next.coins -= payload.amount;
    school.fund += payload.amount;
    amount = payload.amount;
    detail = `捐贈 ${amount} 金幣至「${school.name}」學校基金`;
  } else if (action === 'configure') {
    const extra = Math.max(0, payload.classes - school.classes) * 300;
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
    const students = Math.min(school.admissionTarget, school.classes * 30, applicants);
    const quality = Math.max(0, Math.min(100, Math.round((teacherSkill + principal.skill) / 2 + themeBonus + (teachers.length > school.classes ? 4 : 0) - Math.max(0, students / school.classes - 24))));
    const tuition = students * (18 - Math.round(18 * school.scholarshipPercent / 100));
    const expense = schoolTermExpense(school, students);
    school.fund += tuition - expense;
    school.reputation = Math.max(0, Math.min(100, school.reputation + Math.round((quality - 75) / 9) + (school.scholarshipPercent ? 1 : 0)));
    school.termCount += 1;
    school.totalStudents += students;
    school.lastTermAt = now;
    school.lastResult = { students, quality, tuition, expense, at: now };
    amount = tuition - expense;
    detail = `第 ${school.termCount} 輪招生 ${students} 人／${school.classes} 班；教學品質 ${quality}、學費收入 ${tuition}、校務支出 ${expense}、基金淨變動 ${amount >= 0 ? '+' : ''}${amount} 金幣`;
  }
  school.history = [{ at: now, detail, amount }, ...school.history].slice(0, 35);
  return { farm: next, detail };
}
