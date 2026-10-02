import { familyAssetValue } from '~/lib/happy-farm-family';

// All amounts, land sizes and service periods below are game rules, not legal requirements.
export const CIVIC_SERVICE_MS = 3 * 60 * 60 * 1000;
export const CIVIC_STAFF_MS = 24 * 60 * 60 * 1000;
export const CIVIC_FOUNDATIONS = {
  library: {
    label: '圖書館', icon: '📚', gate: 3000, gift: 3000, land: 1, capacity: 40,
    roles: [{ id: 'director', name: '館長', icon: '👩‍💼' }, { id: 'librarian', name: '館員', icon: '📖' }],
    facilities: [
      { id: 'reading', name: '閱覽室', icon: '🪑', cost: 480, capacity: 18, quality: 3 },
      { id: 'children', name: '兒童閱讀區', icon: '🧒', cost: 540, capacity: 15, quality: 5 },
      { id: 'digital', name: '數位學習室', icon: '💻', cost: 760, capacity: 20, quality: 6 },
      { id: 'archive', name: '地方文史室', icon: '🗂️', cost: 680, capacity: 10, quality: 8 }
    ]
  },
  hospital: {
    label: '醫院', icon: '🏥', gate: 5000, gift: 5000, land: 2, capacity: 30,
    roles: [{ id: 'director', name: '院長', icon: '👩‍⚕️' }, { id: 'doctor', name: '醫師', icon: '🩺' }, { id: 'nurse', name: '護理師', icon: '💉' }, { id: 'administrator', name: '行政人員', icon: '📋' }],
    facilities: [
      { id: 'clinic', name: '門診室', icon: '🩺', cost: 900, capacity: 15, quality: 4 },
      { id: 'lab', name: '檢驗室', icon: '🔬', cost: 1200, capacity: 8, quality: 7 },
      { id: 'ward', name: '病房', icon: '🛏️', cost: 1500, capacity: 12, quality: 7 },
      { id: 'rehab', name: '復健室', icon: '🦽', cost: 1100, capacity: 10, quality: 6 }
    ]
  }
};
export const CIVIC_CANDIDATES = [
  { id: 'lib-dir-lin', kind: 'library', role: 'director', name: '林雅雯', skill: 86, fee: 420, specialty: '閱讀推廣' },
  { id: 'lib-dir-chen', kind: 'library', role: 'director', name: '陳啟明', skill: 79, fee: 370, specialty: '社區服務' },
  { id: 'lib-staff-wu', kind: 'library', role: 'librarian', name: '吳佩芸', skill: 82, fee: 250, specialty: '兒童閱讀' },
  { id: 'lib-staff-hsu', kind: 'library', role: 'librarian', name: '許志豪', skill: 77, fee: 210, specialty: '數位館藏' },
  { id: 'lib-staff-yang', kind: 'library', role: 'librarian', name: '楊怡芳', skill: 80, fee: 230, specialty: '地方文史' },
  { id: 'hospital-dir-tsai', kind: 'hospital', role: 'director', name: '蔡明哲', skill: 87, fee: 620, specialty: '醫院管理' },
  { id: 'hospital-dir-huang', kind: 'hospital', role: 'director', name: '黃佳儀', skill: 82, fee: 560, specialty: '醫療品質' },
  { id: 'hospital-doctor-wang', kind: 'hospital', role: 'doctor', name: '王俊傑', skill: 86, fee: 520, specialty: '家庭醫學' },
  { id: 'hospital-doctor-li', kind: 'hospital', role: 'doctor', name: '李佳蓉', skill: 81, fee: 460, specialty: '內科' },
  { id: 'hospital-nurse-kuo', kind: 'hospital', role: 'nurse', name: '郭怡君', skill: 84, fee: 350, specialty: '護理照護' },
  { id: 'hospital-nurse-lai', kind: 'hospital', role: 'nurse', name: '賴承恩', skill: 78, fee: 310, specialty: '健康教育' },
  { id: 'hospital-admin-chang', kind: 'hospital', role: 'administrator', name: '張淑芬', skill: 80, fee: 290, specialty: '掛號與財務' },
  { id: 'hospital-admin-ho', kind: 'hospital', role: 'administrator', name: '何柏廷', skill: 76, fee: 260, specialty: '病人服務' }
];
export const civicCandidate = id => CIVIC_CANDIDATES.find(person => person.id === id);
export const civicMarket = (kind, role, now) => {
  const people = CIVIC_CANDIDATES.filter(person => person.kind === kind && person.role === role);
  if (people.length < 2) return people;
  const offset = Math.floor((now + 8 * 3600000) / CIVIC_SERVICE_MS) % people.length;
  return [people[offset], people[(offset + 1) % people.length]];
};
export const freshCivicState = () => ({ civicFoundations: { library: null, hospital: null } });
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
export const civicServiceCost = (kind, foundation) => Math.round((kind === 'hospital' ? 180 : 90) + civicCapacity(kind, foundation) * (kind === 'hospital' ? 3 : 1));
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
    if (foundation.lastServiceAt && now - foundation.lastServiceAt < CIVIC_SERVICE_MS) return '下一輪服務尚未開放，請等候 3 小時。';
    const roles = kind === 'hospital' ? ['director', 'doctor', 'nurse', 'administrator'] : ['director', 'librarian'];
    const missing = roles.find(role => !civicActiveStaff(foundation, role, now).length);
    if (missing) return `請先聘任在任的${config.roles.find(role => role.id === missing).name}。`;
    return foundation.fund >= civicServiceCost(kind, foundation) ? '' : '法人基金不足以支付本輪服務及水電費。';
  }
  return '無法執行此操作。';
}
export function applyCivicAction(farm, kind, action, payload = {}, now = Date.now()) {
  const error = civicActionError(farm, kind, action, payload, now);
  if (error) throw new Error(error);
  const next = JSON.parse(JSON.stringify(farm));
  const config = CIVIC_FOUNDATIONS[kind];
  if (!next.civicFoundations) next.civicFoundations = { library: null, hospital: null };
  let foundation = next.civicFoundations[kind];
  let detail = '', amount = 0;
  if (action === 'found') {
    const plotIndexes = civicLand(next, kind, payload.plotIndex);
    plotIndexes.forEach((index, part) => { next.plots[index] = { facility: `foundation_${kind}`, foundationAnchor: payload.plotIndex, foundationPart: part }; });
    next.coins -= config.gift;
    foundation = next.civicFoundations[kind] = { name: payload.name.trim(), villageId: next.plotVillages[payload.plotIndex], plotIndexes, fund: config.gift, reputation: 30, totalVisitors: 0, serviceCount: 0, lastServiceAt: 0, lastResult: null, facilities: [], staff: [], history: [] };
    amount = config.gift;
    detail = `捐贈 ${amount} 金幣及 ${config.land} 格自有土地成立「${foundation.name}」${config.label}`;
  } else if (action === 'donate') {
    next.coins -= payload.amount; foundation.fund += payload.amount; amount = payload.amount;
    detail = `捐贈 ${amount} 金幣至「${foundation.name}」基金`;
  } else if (action === 'build') {
    const facility = config.facilities.find(item => item.id === payload.facilityId);
    foundation.fund -= facility.cost; foundation.facilities.push(facility.id); amount = -facility.cost;
    detail = `興建${facility.name}，法人基金支出 ${facility.cost} 金幣`;
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
    const staff = foundation.staff.filter(item => item.paidUntil > now).map(item => civicCandidate(item.personId));
    const skill = Math.round(staff.reduce((sum, item) => sum + item.skill, 0) / staff.length);
    const capacity = civicCapacity(kind, foundation);
    const visitors = Math.min(capacity, Math.max(1, Math.round(capacity * (0.55 + foundation.reputation / 250 + skill / 500))));
    const facilityQuality = foundation.facilities.reduce((sum, id) => sum + (config.facilities.find(item => item.id === id)?.quality || 0), 0);
    const quality = Math.min(100, Math.round(skill * 0.75 + facilityQuality + 10));
    // Service income and operating costs remain with the foundation; farm coins do not change.
    const income = Math.round(visitors * (kind === 'hospital' ? 16 : 7));
    const expense = civicServiceCost(kind, foundation);
    foundation.fund += income - expense;
    foundation.reputation = Math.max(0, Math.min(100, foundation.reputation + Math.round((quality - 72) / 8)));
    foundation.totalVisitors += visitors; foundation.serviceCount += 1; foundation.lastServiceAt = now;
    foundation.lastResult = { visitors, quality, income, expense, at: now };
    amount = income - expense;
    detail = `${kind === 'hospital' ? '診療服務' : '閱讀服務'} ${visitors} 人，品質 ${quality}；收入 ${income}、營運及水電支出 ${expense}，基金淨變動 ${amount >= 0 ? '+' : ''}${amount}`;
  }
  foundation.history = [{ at: now, detail, amount }, ...foundation.history].slice(0, 40);
  return { farm: next, detail };
}
