// Fictional senior staff: contracts are separate from ordinary farm workers.
export const SPECIALIST_ROLES = [
  { id: 'accountant', name: '會計', icon: '📊', effect: '解鎖各設施收支、淨利與明細' },
  { id: 'legal', name: '法律顧問', icon: '⚖️', effect: '負面事件的金幣損失減半' },
  { id: 'vet', name: '獸醫', icon: '🩺', effect: '動物採收每次多 1 份產品' }
];
export const SPECIALIST_CANDIDATES = [
  { id: 'account-a', role: 'accountant', name: '林書妍', fee: 90, note: '設施收支與成本分析' },
  { id: 'account-b', role: 'accountant', name: '陳信安', fee: 105, note: '農場帳務與損益報表' },
  { id: 'legal-a', role: 'legal', name: '王以晴', fee: 110, note: '事件風險與契約顧問' },
  { id: 'legal-b', role: 'legal', name: '張柏宇', fee: 125, note: '農場事件應變' },
  { id: 'vet-a', role: 'vet', name: '黃佳寧', fee: 95, note: '畜牧與水產照護' },
  { id: 'vet-b', role: 'vet', name: '李承恩', fee: 110, note: '動物健康管理' }
];
export const SPECIALIST_CONTRACT_MS = 3 * 60 * 60 * 1000;
export const specialistById = id => SPECIALIST_CANDIDATES.find(person => person.id === id);
export const specialistRole = id => SPECIALIST_ROLES.find(role => role.id === id);
export const specialistMarket = now => {
  const slot = Math.floor((now + 8 * 3600000) / SPECIALIST_CONTRACT_MS);
  return SPECIALIST_ROLES.map(role => SPECIALIST_CANDIDATES.filter(person => person.role === role.id)[slot % 2]);
};
export const freshSpecialistState = () => ({ specialistContracts: {}, specialistHistory: [] });
export function withSpecialistState(farm) {
  const contracts = farm.specialistContracts && typeof farm.specialistContracts === 'object' ? farm.specialistContracts : {};
  return { ...farm, specialistContracts: Object.fromEntries(SPECIALIST_ROLES.map(role => [role.id, contracts[role.id]])
    .filter(([, contract]) => contract && specialistById(contract.personId)?.role === contract.role)),
  specialistHistory: Array.isArray(farm.specialistHistory) ? farm.specialistHistory.slice(0, 40) : [] };
}
export const hasSpecialist = (farm, role, now) => Number(farm.specialistContracts?.[role]?.paidUntil || 0) > now;
export function specialistActionError(farm, action, personId, now) {
  const person = specialistById(personId);
  if (!person) return '找不到高階專業人員。';
  const existing = farm.specialistContracts?.[person.role];
  if (action === 'hireSpecialist') {
    if (existing && existing.paidUntil > now) return '這個職位已有合約中的人員。';
    if (!specialistMarket(now).some(item => item.id === personId)) return '此人目前不在高階仲介名單。';
    return farm.coins >= person.fee ? '' : '金幣不足，無法預付專業服務費。';
  }
  if (action === 'renewSpecialist') return existing?.personId !== personId ? '找不到這份合約。'
    : existing.paidUntil > now ? '合約尚未到期。' : farm.coins >= person.fee ? '' : '金幣不足，無法續約。';
  if (action === 'dismissSpecialist') return existing?.personId === personId ? '' : '找不到這份合約。';
  return '無法執行專業人員操作。';
}
export function applySpecialistAction(farm, action, personId, now) {
  const next = JSON.parse(JSON.stringify(farm));
  const person = specialistById(personId);
  const role = specialistRole(person.role);
  let detail;
  if (action === 'dismissSpecialist') {
    delete next.specialistContracts[person.role];
    detail = `${role.name} ${person.name} 已離任；預付服務費不退還`;
  } else {
    next.coins -= person.fee;
    next.specialistContracts[person.role] = { role: person.role, personId, paidUntil: now + SPECIALIST_CONTRACT_MS };
    detail = `${action === 'renewSpecialist' ? '續聘' : '聘請'}${role.name} ${person.name}，支付 ${person.fee} 金幣；服務 3 小時`;
  }
  next.specialistHistory = [{ at: now, detail }, ...(next.specialistHistory || [])].slice(0, 40);
  return { farm: next, detail };
}
