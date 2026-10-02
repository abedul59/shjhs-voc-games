import { familyAssetValue } from '~/lib/happy-farm-family';

// All amounts, land sizes and service periods below are game rules, not legal requirements.
export const CIVIC_SERVICE_MS = 3 * 60 * 60 * 1000;
export const CIVIC_STAFF_MS = 24 * 60 * 60 * 1000;
export const CIVIC_FOUNDATIONS = {
  library: {
    label: '圖書館', icon: '📚', gate: 3000, gift: 3000, land: 1, capacity: 40,
    roles: [{ id: 'director', name: '館長', icon: '👩‍💼' }, { id: 'librarian', name: '館員', icon: '📖' }, { id: 'cataloger', name: '編目館員', icon: '🗂️', optional: true }, { id: 'educator', name: '閱讀推廣員', icon: '🧒', optional: true }],
    operations: [
      { id: 'lending', name: '借閱與閱覽', icon: '📖', description: '辦理借還書、閱覽諮詢與讀者服務。', roles: [], fee: 7, cost: 0, visitors: 1 },
      { id: 'reading_club', name: '兒童共讀活動', icon: '🧒', description: '由推廣員帶領故事與閱讀活動。', roles: ['educator'], facility: 'children', fee: 9, cost: 55, visitors: .8, quality: 5 },
      { id: 'catalog', name: '地方文史編目', icon: '🗂️', description: '整理地方資料並開放研究閱覽。', roles: ['cataloger'], facility: 'archive', fee: 8, cost: 65, visitors: .7, quality: 8 },
      { id: 'digital_class', name: '數位閱讀課', icon: '💻', description: '指導讀者使用數位館藏。', roles: ['educator'], facility: 'digital', fee: 10, cost: 70, visitors: .85, quality: 5 }
    ],
    facilities: [
      { id: 'reading', name: '閱覽室', icon: '🪑', cost: 480, capacity: 18, quality: 3 },
      { id: 'children', name: '兒童閱讀區', icon: '🧒', cost: 540, capacity: 15, quality: 5 },
      { id: 'digital', name: '數位學習室', icon: '💻', cost: 760, capacity: 20, quality: 6 },
      { id: 'archive', name: '地方文史室', icon: '🗂️', cost: 680, capacity: 10, quality: 8 }
    ]
  },
  hospital: {
    label: '醫院', icon: '🏥', gate: 5000, gift: 5000, land: 2, capacity: 30,
    roles: [{ id: 'director', name: '院長', icon: '👩‍⚕️' }, { id: 'doctor', name: '醫師', icon: '🩺' }, { id: 'nurse', name: '護理師', icon: '💉' }, { id: 'administrator', name: '行政人員', icon: '📋' }, { id: 'pharmacist', name: '藥師', icon: '💊', optional: true }, { id: 'technologist', name: '醫事檢驗師', icon: '🔬', optional: true }, { id: 'therapist', name: '物理治療師', icon: '🦽', optional: true }],
    operations: [
      { id: 'consultation', name: '一般門診', icon: '🩺', description: '掛號、醫師診療與護理照護的模擬服務。', roles: [], fee: 16, cost: 0, visitors: 1 },
      { id: 'pharmacy', name: '藥事照護', icon: '💊', description: '由藥師辦理模擬用藥衛教。', roles: ['pharmacist'], facility: 'clinic', fee: 18, cost: 95, visitors: .85, quality: 5 },
      { id: 'laboratory', name: '檢驗服務', icon: '🔬', description: '安排醫事檢驗人員與檢驗室。', roles: ['technologist'], facility: 'lab', fee: 22, cost: 130, visitors: .65, quality: 8 },
      { id: 'rehabilitation', name: '復健服務', icon: '🦽', description: '由治療師提供模擬復健服務。', roles: ['therapist'], facility: 'rehab', fee: 20, cost: 110, visitors: .75, quality: 6 }
    ],
    facilities: [
      { id: 'clinic', name: '門診室', icon: '🩺', cost: 900, capacity: 15, quality: 4 },
      { id: 'lab', name: '檢驗室', icon: '🔬', cost: 1200, capacity: 8, quality: 7 },
      { id: 'ward', name: '病房', icon: '🛏️', cost: 1500, capacity: 12, quality: 7 },
      { id: 'rehab', name: '復健室', icon: '🦽', cost: 1100, capacity: 10, quality: 6 }
    ]
  },
  art_museum: {
    label: '美術館', icon: '🎨', gate: 3500, gift: 3500, land: 1, capacity: 35,
    roles: [{ id: 'director', name: '館長', icon: '👩‍🎨' }, { id: 'curator', name: '策展人', icon: '🖼️' }, { id: 'educator', name: '教育推廣員', icon: '📖' }, { id: 'conservator', name: '作品維護員', icon: '🧤', optional: true }],
    operations: [
      { id: 'exhibition', name: '展覽與導賞', icon: '🖼️', description: '呈現當期展覽並提供解說。', roles: [], fee: 8, cost: 0, visitors: 1 },
      { id: 'workshop', name: '藝術創作工作坊', icon: '🎨', description: '辦理動手創作的藝術教育。', roles: [], facility: 'studio', fee: 12, cost: 80, visitors: .8, quality: 5 },
      { id: 'conservation', name: '作品維護公開課', icon: '🧤', description: '介紹作品保存與維護流程。', roles: ['conservator'], facility: 'gallery', fee: 9, cost: 85, visitors: .7, quality: 8 },
      { id: 'digital_exhibit', name: '數位藝術體驗', icon: '💻', description: '提供互動式數位藝術教育。', roles: [], facility: 'digital_art', fee: 11, cost: 90, visitors: .9, quality: 6 }
    ],
    programs: [{ id: 'rural_painting', name: '農村繪畫展', quality: 3 }, { id: 'photo', name: '田園攝影展', quality: 4 }, { id: 'sculpture_show', name: '雕塑與工藝展', quality: 5 }, { id: 'children_art', name: '兒童創作展', quality: 4 }],
    facilities: [
      { id: 'gallery', name: '常設展廳', icon: '🖼️', cost: 700, capacity: 18, quality: 5 },
      { id: 'studio', name: '藝術工作坊', icon: '🎨', cost: 680, capacity: 12, quality: 7 },
      { id: 'sculpture', name: '戶外雕塑園', icon: '🗿', cost: 840, capacity: 16, quality: 6 },
      { id: 'digital_art', name: '數位藝術室', icon: '💻', cost: 900, capacity: 15, quality: 8 }
    ]
  },
  museum: {
    label: '博物館', icon: '🏛️', gate: 4000, gift: 4000, land: 2, capacity: 40,
    roles: [{ id: 'director', name: '館長', icon: '👩‍💼' }, { id: 'curator', name: '典藏員', icon: '🗂️' }, { id: 'guide', name: '導覽員', icon: '🎤' }, { id: 'researcher', name: '研究員', icon: '🔎', optional: true }, { id: 'conservator', name: '文物維護員', icon: '🧤', optional: true }],
    operations: [
      { id: 'guided_tour', name: '常設展導覽', icon: '🎤', description: '解說地方史與典藏品。', roles: [], fee: 9, cost: 0, visitors: 1 },
      { id: 'school_visit', name: '學校教育參訪', icon: '🧩', description: '提供互動學習與分組導覽。', roles: [], facility: 'interactive', fee: 11, cost: 75, visitors: .85, quality: 5 },
      { id: 'research', name: '地方史研究公開課', icon: '🔎', description: '研究員介紹地方史料與研究方法。', roles: ['researcher'], facility: 'history', fee: 10, cost: 90, visitors: .7, quality: 8 },
      { id: 'preservation', name: '文物維護公開課', icon: '🧤', description: '展示典藏維護與保存工作。', roles: ['conservator'], facility: 'preservation', fee: 10, cost: 100, visitors: .7, quality: 9 }
    ],
    programs: [{ id: 'xinhua_history', name: '新化地方史展', quality: 4 }, { id: 'agri_tools', name: '農機與工具展', quality: 5 }, { id: 'waterways', name: '水圳文化展', quality: 4 }, { id: 'oral_history', name: '地方記憶口述展', quality: 5 }],
    facilities: [
      { id: 'history', name: '地方史展廳', icon: '📜', cost: 760, capacity: 18, quality: 6 },
      { id: 'agriculture', name: '農業文物展廳', icon: '🌾', cost: 680, capacity: 17, quality: 6 },
      { id: 'preservation', name: '典藏維護室', icon: '🗃️', cost: 920, capacity: 8, quality: 10 },
      { id: 'interactive', name: '互動教育室', icon: '🧩', cost: 850, capacity: 20, quality: 7 }
    ]
  }
};
export const CIVIC_CANDIDATES = [
  { id: 'lib-dir-lin', kind: 'library', role: 'director', name: '林雅雯', skill: 86, fee: 420, specialty: '閱讀推廣' },
  { id: 'lib-dir-chen', kind: 'library', role: 'director', name: '陳啟明', skill: 79, fee: 370, specialty: '社區服務' },
  { id: 'lib-staff-wu', kind: 'library', role: 'librarian', name: '吳佩芸', skill: 82, fee: 250, specialty: '兒童閱讀' },
  { id: 'lib-staff-hsu', kind: 'library', role: 'librarian', name: '許志豪', skill: 77, fee: 210, specialty: '數位館藏' },
  { id: 'lib-staff-yang', kind: 'library', role: 'librarian', name: '楊怡芳', skill: 80, fee: 230, specialty: '地方文史' },
  { id: 'lib-catalog-a', kind: 'library', role: 'cataloger', name: '鄭宜庭', skill: 83, fee: 270, specialty: '館藏編目' },
  { id: 'lib-catalog-b', kind: 'library', role: 'cataloger', name: '謝育誠', skill: 78, fee: 240, specialty: '地方文獻' },
  { id: 'lib-educator-a', kind: 'library', role: 'educator', name: '劉佳玲', skill: 84, fee: 280, specialty: '兒童閱讀' },
  { id: 'lib-educator-b', kind: 'library', role: 'educator', name: '洪書豪', skill: 77, fee: 245, specialty: '數位閱讀' },
  { id: 'hospital-dir-tsai', kind: 'hospital', role: 'director', name: '蔡明哲', skill: 87, fee: 620, specialty: '醫院管理' },
  { id: 'hospital-dir-huang', kind: 'hospital', role: 'director', name: '黃佳儀', skill: 82, fee: 560, specialty: '醫療品質' },
  { id: 'hospital-doctor-wang', kind: 'hospital', role: 'doctor', name: '王俊傑', skill: 86, fee: 520, specialty: '家庭醫學' },
  { id: 'hospital-doctor-li', kind: 'hospital', role: 'doctor', name: '李佳蓉', skill: 81, fee: 460, specialty: '內科' },
  { id: 'hospital-nurse-kuo', kind: 'hospital', role: 'nurse', name: '郭怡君', skill: 84, fee: 350, specialty: '護理照護' },
  { id: 'hospital-nurse-lai', kind: 'hospital', role: 'nurse', name: '賴承恩', skill: 78, fee: 310, specialty: '健康教育' },
  { id: 'hospital-admin-chang', kind: 'hospital', role: 'administrator', name: '張淑芬', skill: 80, fee: 290, specialty: '掛號與財務' },
  { id: 'hospital-admin-ho', kind: 'hospital', role: 'administrator', name: '何柏廷', skill: 76, fee: 260, specialty: '病人服務' },
  { id: 'hospital-pharmacist-a', kind: 'hospital', role: 'pharmacist', name: '周欣儀', skill: 83, fee: 410, specialty: '藥事照護' },
  { id: 'hospital-pharmacist-b', kind: 'hospital', role: 'pharmacist', name: '曾冠翔', skill: 79, fee: 370, specialty: '用藥衛教' },
  { id: 'hospital-tech-a', kind: 'hospital', role: 'technologist', name: '鍾佩珊', skill: 82, fee: 395, specialty: '醫事檢驗' },
  { id: 'hospital-tech-b', kind: 'hospital', role: 'technologist', name: '杜承翰', skill: 77, fee: 355, specialty: '檢驗品質' },
  { id: 'hospital-therapist-a', kind: 'hospital', role: 'therapist', name: '彭宜蓁', skill: 85, fee: 405, specialty: '物理治療' },
  { id: 'hospital-therapist-b', kind: 'hospital', role: 'therapist', name: '羅宇杰', skill: 78, fee: 360, specialty: '復健服務' },
  { id: 'art-director', kind: 'art_museum', role: 'director', name: '沈映彤', skill: 86, fee: 480, specialty: '美術館管理' },
  { id: 'art-curator-a', kind: 'art_museum', role: 'curator', name: '葉思妤', skill: 84, fee: 330, specialty: '當代藝術策展' },
  { id: 'art-curator-b', kind: 'art_museum', role: 'curator', name: '柯信宏', skill: 78, fee: 290, specialty: '地方藝術策展' },
  { id: 'art-educator', kind: 'art_museum', role: 'educator', name: '蘇怡靜', skill: 82, fee: 300, specialty: '藝術教育' },
  { id: 'art-conservator-a', kind: 'art_museum', role: 'conservator', name: '廖心妤', skill: 83, fee: 335, specialty: '作品維護' },
  { id: 'art-conservator-b', kind: 'art_museum', role: 'conservator', name: '江柏元', skill: 78, fee: 300, specialty: '典藏保存' },
  { id: 'museum-director', kind: 'museum', role: 'director', name: '莊啟仁', skill: 85, fee: 500, specialty: '博物館經營' },
  { id: 'museum-curator-a', kind: 'museum', role: 'curator', name: '詹佩珊', skill: 83, fee: 350, specialty: '文物典藏' },
  { id: 'museum-curator-b', kind: 'museum', role: 'curator', name: '方宇廷', skill: 79, fee: 310, specialty: '農村史料' },
  { id: 'museum-guide-a', kind: 'museum', role: 'guide', name: '溫佳慧', skill: 81, fee: 280, specialty: '導覽設計' },
  { id: 'museum-guide-b', kind: 'museum', role: 'guide', name: '唐立安', skill: 76, fee: 250, specialty: '互動解說' },
  { id: 'museum-researcher-a', kind: 'museum', role: 'researcher', name: '梁欣怡', skill: 84, fee: 355, specialty: '地方史研究' },
  { id: 'museum-researcher-b', kind: 'museum', role: 'researcher', name: '顏志豪', skill: 79, fee: 315, specialty: '農村史料' },
  { id: 'museum-conservator-a', kind: 'museum', role: 'conservator', name: '蕭采萱', skill: 82, fee: 340, specialty: '文物維護' },
  { id: 'museum-conservator-b', kind: 'museum', role: 'conservator', name: '曹育廷', skill: 76, fee: 305, specialty: '典藏保存' }
];
export const civicCandidate = id => CIVIC_CANDIDATES.find(person => person.id === id);
export const civicMarket = (kind, role, now) => {
  const people = CIVIC_CANDIDATES.filter(person => person.kind === kind && person.role === role);
  if (people.length < 2) return people;
  const offset = Math.floor((now + 8 * 3600000) / CIVIC_SERVICE_MS) % people.length;
  return [people[offset], people[(offset + 1) % people.length]];
};
export const freshCivicState = () => ({ civicFoundations: Object.fromEntries(Object.keys(CIVIC_FOUNDATIONS).map(kind => [kind, null])) });
export function withCivicState(farm) {
  const foundations = farm.civicFoundations || {};
  return { ...farm, civicFoundations: Object.fromEntries(Object.keys(CIVIC_FOUNDATIONS).map(kind => {
    const foundation = foundations[kind];
    if (!foundation || typeof foundation !== 'object') return [kind, null];
    return [kind, { ...foundation,
      fund: Math.max(0, Number(foundation.fund) || 0),
      plotIndexes: Array.isArray(foundation.plotIndexes) ? foundation.plotIndexes.filter(index => Number.isInteger(index) && farm.plots?.[index]?.facility === `foundation_${kind}`).slice(0, CIVIC_FOUNDATIONS[kind].land) : [],
      facilities: Array.isArray(foundation.facilities) ? [...new Set(foundation.facilities.filter(id => CIVIC_FOUNDATIONS[kind].facilities.some(item => item.id === id)))] : [],
      staff: Array.isArray(foundation.staff) ? foundation.staff.filter(item => civicCandidate(item.personId)?.kind === kind).slice(0, 12) : [],
      history: Array.isArray(foundation.history) ? foundation.history.slice(0, 40) : []
    }];
  })) };
}
export const civicActiveStaff = (foundation, role, now) => (foundation?.staff || []).filter(item => item.role === role && item.paidUntil > now);
export const civicLand = (farm, kind, plotIndex) => {
  const config = CIVIC_FOUNDATIONS[kind];
  const villageId = farm.plotVillages?.[plotIndex];
  if (!config || !Number.isInteger(plotIndex) || plotIndex < 0 || !farm.ownedVillages?.includes(villageId) || farm.plots?.[plotIndex] !== null) return [];
  const reserved = new Set((farm.plots || []).filter(plot => plot?.facility === 'farmhouse').flatMap(plot => plot.parcel || []));
  if (reserved.has(plotIndex)) return [];
  const available = (farm.plotVillages || []).map((id, index) => id === villageId && farm.plots[index] === null && !reserved.has(index) ? index : -1).filter(index => index >= 0);
  return available.length >= config.land ? [plotIndex, ...available.filter(index => index !== plotIndex).slice(0, config.land - 1)] : [];
};
export const civicCapacity = (kind, foundation) => CIVIC_FOUNDATIONS[kind].capacity + (foundation?.facilities || []).reduce((sum, id) => sum + (CIVIC_FOUNDATIONS[kind].facilities.find(item => item.id === id)?.capacity || 0), 0);
export const civicOperation = (kind, operationId) => CIVIC_FOUNDATIONS[kind]?.operations.find(item => item.id === (operationId || CIVIC_FOUNDATIONS[kind].operations[0].id));
export const civicServiceCost = (kind, foundation, operationId) => Math.round((kind === 'hospital' ? 180 : kind === 'museum' ? 120 : 90) + civicCapacity(kind, foundation) * (kind === 'hospital' ? 3 : 1) + (civicOperation(kind, operationId)?.cost || 0));
export function civicActionError(farm, kind, action, payload = {}, now = Date.now()) {
  const config = CIVIC_FOUNDATIONS[kind];
  if (!config) return '找不到這種公益法人。';
  const foundation = farm.civicFoundations?.[kind];
  if (action === 'found') {
    if (foundation) return `已成立${config.label}。`;
    if (typeof payload.name !== 'string' || payload.name.trim().length < 2 || payload.name.trim().length > 24) return '名稱請填 2 至 24 個字。';
    if (civicLand(farm, kind, payload.plotIndex).length !== config.land) return `請在自己擁有的同一里提供 ${config.land} 格空地。`;
    if (familyAssetValue(farm) < config.gate || farm.coins < config.gift) return `總資產需達 ${config.gate} 金幣，且須有 ${config.gift} 金幣可捐贈。`;
    return '';
  }
  if (!foundation) return `請先成立${config.label}。`;
  if (foundation.plotIndexes?.length !== config.land || foundation.plotIndexes.some(index => farm.plots?.[index]?.facility !== `foundation_${kind}`)) return '法人用地不完整。';
  if (action === 'donate') return Number.isInteger(payload.amount) && payload.amount >= 100 && payload.amount <= 10000 && farm.coins >= payload.amount ? '' : '捐贈須為 100 至 10000 金幣，且農場餘額足夠。';
  if (action === 'build') {
    const facility = config.facilities.find(item => item.id === payload.facilityId);
    if (!facility || foundation.facilities.includes(payload.facilityId)) return '設施不存在或已經興建。';
    return foundation.fund >= facility.cost ? '' : '法人基金不足。';
  }
  if (action === 'program') {
    if (!config.programs?.some(item => item.id === payload.programId) || payload.programId === foundation.programId) return '請選擇不同的展覽主題。';
    return foundation.fund >= 120 ? '' : '策展需要基金 120 金幣。';
  }
  if (['hire', 'renew', 'dismiss'].includes(action)) {
    const person = civicCandidate(payload.personId);
    if (!person || person.kind !== kind) return '找不到這位應徵者。';
    const contract = foundation.staff.find(item => item.personId === person.id);
    if (action === 'dismiss') return contract ? '' : '找不到這份聘約。';
    if (action === 'renew' && (!contract || contract.paidUntil > now)) return '聘約尚未到期，或沒有這份聘約。';
    if (action === 'hire' && !civicMarket(kind, person.role, now).some(item => item.id === person.id)) return '此人目前不在仲介名單。';
    if (contract?.paidUntil > now) return '此人已在任。';
    if (person.role !== 'librarian' && person.role !== 'doctor' && person.role !== 'nurse' && civicActiveStaff(foundation, person.role, now).length) return '此職位已有在任人員。';
    return foundation.fund >= person.fee ? '' : '法人基金不足以支付聘約費用。';
  }
  if (action === 'serve') {
    const operation = civicOperation(kind, payload.operationId);
    if (!operation) return '找不到這項服務。';
    if (foundation.lastServiceAt && now - foundation.lastServiceAt < CIVIC_SERVICE_MS) return '下一輪服務尚未開放，請等候 3 小時。';
    const roles = [...config.roles.filter(role => !role.optional).map(role => role.id), ...operation.roles];
    const missing = roles.find(role => !civicActiveStaff(foundation, role, now).length);
    if (missing) return `請先聘任在任的${config.roles.find(role => role.id === missing).name}。`;
    if (operation.facility && !foundation.facilities.includes(operation.facility)) return `請先興建${config.facilities.find(item => item.id === operation.facility).name}。`;
    return foundation.fund >= civicServiceCost(kind, foundation, operation.id) ? '' : '法人基金不足以支付本輪服務及水電費。';
  }
  return '無法執行此操作。';
}
export function applyCivicAction(farm, kind, action, payload = {}, now = Date.now()) {
  const error = civicActionError(farm, kind, action, payload, now);
  if (error) throw new Error(error);
  const next = JSON.parse(JSON.stringify(farm));
  const config = CIVIC_FOUNDATIONS[kind];
  if (!next.civicFoundations) next.civicFoundations = freshCivicState().civicFoundations;
  let foundation = next.civicFoundations[kind];
  let detail = '', amount = 0;
  if (action === 'found') {
    const plotIndexes = civicLand(next, kind, payload.plotIndex);
    plotIndexes.forEach((index, part) => { next.plots[index] = { facility: `foundation_${kind}`, foundationAnchor: payload.plotIndex, foundationPart: part }; });
    next.coins -= config.gift;
    foundation = next.civicFoundations[kind] = { name: payload.name.trim(), villageId: next.plotVillages[payload.plotIndex], plotIndexes, fund: config.gift, reputation: 30, totalVisitors: 0, serviceCount: 0, lastServiceAt: 0, lastResult: null, programId: config.programs?.[0]?.id || '', facilities: [], staff: [], history: [] };
    amount = config.gift;
    detail = `捐贈 ${amount} 金幣及 ${config.land} 格自有土地成立「${foundation.name}」${config.label}`;
  } else if (action === 'donate') {
    next.coins -= payload.amount; foundation.fund += payload.amount; amount = payload.amount;
    detail = `捐贈 ${amount} 金幣至「${foundation.name}」基金`;
  } else if (action === 'build') {
    const facility = config.facilities.find(item => item.id === payload.facilityId);
    foundation.fund -= facility.cost; foundation.facilities.push(facility.id); amount = -facility.cost;
    detail = `興建${facility.name}，法人基金支出 ${facility.cost} 金幣`;
  } else if (action === 'program') {
    foundation.fund -= 120;
    foundation.programId = payload.programId;
    amount = -120;
    detail = `策劃「${config.programs.find(item => item.id === payload.programId).name}」，基金支出 120 金幣`;
  } else if (action === 'hire' || action === 'renew') {
    const person = civicCandidate(payload.personId);
    foundation.fund -= person.fee;
    foundation.staff = foundation.staff.filter(item => item.personId !== person.id && item.paidUntil > now);
    foundation.staff.push({ personId: person.id, role: person.role, paidUntil: now + CIVIC_STAFF_MS });
    amount = -person.fee;
    detail = `${action === 'renew' ? '續聘' : '聘任'}${person.name}（${config.roles.find(role => role.id === person.role).name}），基金支付 ${person.fee} 金幣`;
  } else if (action === 'dismiss') {
    const person = civicCandidate(payload.personId);
    foundation.staff = foundation.staff.filter(item => item.personId !== person.id);
    detail = `${person.name} 已離任，已付薪資不退還`;
  } else if (action === 'serve') {
    const operation = civicOperation(kind, payload.operationId);
    const staff = foundation.staff.filter(item => item.paidUntil > now && (!config.roles.find(role => role.id === item.role)?.optional || operation.roles.includes(item.role))).map(item => civicCandidate(item.personId));
    const skill = Math.round(staff.reduce((sum, item) => sum + item.skill, 0) / staff.length);
    const capacity = civicCapacity(kind, foundation);
    const visitors = Math.min(capacity, Math.max(1, Math.round(capacity * (0.55 + foundation.reputation / 250 + skill / 500) * operation.visitors)));
    const facilityQuality = foundation.facilities.reduce((sum, id) => sum + (config.facilities.find(item => item.id === id)?.quality || 0), 0);
    const programQuality = config.programs?.find(item => item.id === foundation.programId)?.quality || 0;
    const quality = Math.min(100, Math.round(skill * 0.75 + facilityQuality + programQuality + (operation.quality || 0) + 10));
    // Service income and operating costs remain with the foundation; farm coins do not change.
    const income = Math.round(visitors * operation.fee);
    const expense = civicServiceCost(kind, foundation, operation.id);
    foundation.fund += income - expense;
    foundation.reputation = Math.max(0, Math.min(100, foundation.reputation + Math.round((quality - 72) / 8)));
    foundation.totalVisitors += visitors; foundation.serviceCount += 1; foundation.lastServiceAt = now;
    foundation.lastResult = { operationId: operation.id, visitors, quality, income, expense, at: now };
    amount = income - expense;
    detail = `${operation.name}服務 ${visitors} 人，品質 ${quality}；收入 ${income}、營運及水電支出 ${expense}，基金淨變動 ${amount >= 0 ? '+' : ''}${amount}`;
  }
  foundation.history = [{ at: now, detail, amount }, ...foundation.history].slice(0, 40);
  return { farm: next, detail };
}
