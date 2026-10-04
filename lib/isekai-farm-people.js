import { ISEKAI_AREAS, ISEKAI_ANIMALS, ISEKAI_CROPS, adjustedSeedPrice, applyIsekaiAction, isekaiActionError, isekaiFrontierFieldCount, normalizeIsekaiFarm } from './isekai-farm.js';
import { ISEKAI_RECIPES, applyExpansionAction, expansionActionError } from './isekai-farm-expansion.js';

export const ISEKAI_SHIFT_MS = 45 * 60000;
export const ISEKAI_REST_MS = 15 * 60000;
export const ISEKAI_WORK_INTERVAL_MS = 60000;
export const ISEKAI_PAY_PERIOD_MS = { day: 24 * 3600000, week: 7 * 24 * 3600000 };
export const isekaiStaffWage = (person, period = 'day') => (person?.wage || 0) * (period === 'week' ? 36 : 6);
export const ISEKAI_CHILD_YEAR_MS = 3 * 3600000;
export const ISEKAI_ADULT_YEAR_MS = 6 * 3600000;
export const ISEKAI_TASKS = [
  { id: 'buy', label: '補買種苗', focus: 'crops' }, { id: 'plant', label: '播種', focus: 'crops' }, { id: 'water', label: '澆水', focus: 'crops' },
  { id: 'harvest', label: '收成', focus: 'crops' }, { id: 'feed', label: '照顧生物', focus: 'animals' },
  { id: 'collect', label: '收取產物', focus: 'animals' }, { id: 'sell', label: '出售作物', focus: 'crops' },
  { id: 'sellAnimal', label: '出售產物', focus: 'trade' },
  { id: 'process', label: '加工農產品', focus: 'trade' }, { id: 'sellProcessed', label: '出售加工品', focus: 'trade' },
  { id: 'venue', label: '經營商店與觀光', focus: 'trade' }
];
export const ISEKAI_STAFF = [
  { id: 'ela', name: '艾拉', raceId: 'human', professionId: 'gardener', focus: 'crops', mark: '👩‍🌾', wage: 5, power: 8 },
  { id: 'ron', name: '羅恩', raceId: 'human', professionId: 'knight', focus: 'guard', mark: '🛡️', wage: 7, power: 17 },
  { id: 'lyra', name: '莉拉', raceId: 'elf', professionId: 'herbalist', focus: 'crops', mark: '🧝', wage: 5, power: 9 },
  { id: 'finn', name: '芬恩', raceId: 'elf', professionId: 'mage', focus: 'crops', mark: '🧙', wage: 6, power: 15 },
  { id: 'borin', name: '波林', raceId: 'dwarf', professionId: 'artisan', focus: 'trade', mark: '🧔', wage: 5, power: 11 },
  { id: 'mira', name: '米拉', raceId: 'dwarf', professionId: 'builder', focus: 'guard', mark: '⚒️', wage: 6, power: 15 },
  { id: 'sora', name: '索拉', raceId: 'beast', professionId: 'tamer', focus: 'animals', mark: '🐺', wage: 5, power: 13 },
  { id: 'luka', name: '盧卡', raceId: 'beast', professionId: 'ranger', focus: 'guard', mark: '🏹', wage: 6, power: 16 },
  { id: 'noa', name: '諾亞', raceId: 'demon', professionId: 'fisher', focus: 'animals', mark: '🐟', wage: 5, power: 10 },
  { id: 'sera', name: '瑟拉', raceId: 'demon', professionId: 'stargazer', focus: 'trade', mark: '🌟', wage: 6, power: 14 },
  { id: 'hana', name: '花音', raceId: 'human', professionId: 'veterinarian', focus: 'animals', mark: '🩺', wage: 5, power: 8 },
  { id: 'nori', name: '諾里', raceId: 'elf', professionId: 'beekeeper', focus: 'animals', mark: '🐝', wage: 5, power: 9 },
  { id: 'grom', name: '古洛姆', raceId: 'dwarf', professionId: 'artisan', focus: 'guard', mark: '🔨', wage: 7, power: 18 },
  { id: 'kira', name: '琪拉', raceId: 'beast', professionId: 'merchant', focus: 'trade', mark: '🧳', wage: 6, power: 12 },
  { id: 'vel', name: '維爾', raceId: 'demon', professionId: 'scholar', focus: 'crops', mark: '📜', wage: 6, power: 12 }
];
export const ISEKAI_PARTNERS = [
  { id: 'aria', name: '亞莉亞', gender: 'female', raceId: 'human', professionId: 'gardener', hobby: 'gardening', mark: '👩‍🌾', focus: 'crops' },
  { id: 'leo', name: '雷歐', gender: 'male', raceId: 'human', professionId: 'knight', hobby: 'adventure', mark: '🛡️', focus: 'guard' },
  { id: 'silva', name: '希爾瓦', gender: 'female', raceId: 'elf', professionId: 'herbalist', hobby: 'reading', mark: '🧝', focus: 'crops' },
  { id: 'eil', name: '艾爾', gender: 'male', raceId: 'elf', professionId: 'mage', hobby: 'reading', mark: '🧙', focus: 'crops' },
  { id: 'dora', name: '朵拉', gender: 'female', raceId: 'dwarf', professionId: 'artisan', hobby: 'craft', mark: '⚒️', focus: 'trade' },
  { id: 'bram', name: '布蘭', gender: 'male', raceId: 'dwarf', professionId: 'builder', hobby: 'craft', mark: '🧔', focus: 'guard' },
  { id: 'luna', name: '露娜', gender: 'female', raceId: 'beast', professionId: 'tamer', hobby: 'animals', mark: '🐺', focus: 'animals' },
  { id: 'kai', name: '凱', gender: 'male', raceId: 'beast', professionId: 'ranger', hobby: 'adventure', mark: '🏹', focus: 'guard' },
  { id: 'meya', name: '梅雅', gender: 'female', raceId: 'demon', professionId: 'stargazer', hobby: 'reading', mark: '🌟', focus: 'trade' },
  { id: 'ren', name: '蓮', gender: 'male', raceId: 'demon', professionId: 'fisher', hobby: 'animals', mark: '🎣', focus: 'animals' }
];
export const ISEKAI_HOBBIES = [
  { id: 'gardening', name: '園藝市集', mark: '🌻' }, { id: 'adventure', name: '冒險者聚會', mark: '🗡️' },
  { id: 'reading', name: '魔術讀書會', mark: '📚' }, { id: 'craft', name: '工匠交流會', mark: '🔨' },
  { id: 'animals', name: '生物照護會', mark: '🐾' }
];
export const staffById = id => ISEKAI_STAFF.find(person => person.id === id);
export const partnerById = id => ISEKAI_PARTNERS.find(person => person.id === id);
export const isekaiStaffMarket = (now, hired = []) => {
  const slot = Math.floor(now / (3 * 3600000));
  const candidates = [...ISEKAI_STAFF].sort((a, b) => ((ISEKAI_STAFF.indexOf(a) * 13 + slot * 7) % 19) - ((ISEKAI_STAFF.indexOf(b) * 13 + slot * 7) % 19)).slice(0, 8);
  return [...new Map([...hired.map(item => staffById(item.id)).filter(Boolean), ...candidates].map(item => [item.id, item])).values()];
};
export const isekaiChildAge = (child, now = Date.now()) => {
  const elapsed = Math.max(0, now - (Number(child.bornAt) || now));
  return Math.min(100, elapsed < 18 * ISEKAI_CHILD_YEAR_MS ? Math.floor(elapsed / ISEKAI_CHILD_YEAR_MS)
    : 18 + Math.floor((elapsed - 18 * ISEKAI_CHILD_YEAR_MS) / ISEKAI_ADULT_YEAR_MS));
};
export function normalizeIsekaiPeople(farm) {
  return {
    ...farm,
    staff: Array.isArray(farm.staff) ? farm.staff.filter(item => staffById(item.id)).slice(0, 8).map(item => ({ id: item.id, raceId: staffById(item.id).raceId, focus: ['crops','animals','trade','guard'].includes(item.focus) ? item.focus : staffById(item.id).focus,
      period: item.period === 'week' ? 'week' : 'day', paidUntil: Math.max(0, Number(item.paidUntil) || 0) })) : [],
    staffTasks: Object.fromEntries(ISEKAI_TASKS.map(task => [task.id, farm.staffTasks?.[task.id] !== false])),
    staffAutoCrops: Array.isArray(farm.staffAutoCrops) ? ISEKAI_CROPS.map(item => item.id).filter(id => farm.staffAutoCrops.includes(id)) : ISEKAI_CROPS.map(item => item.id),
    staffReservedPlots: Array.isArray(farm.staffReservedPlots) ? farm.staffReservedPlots.filter(site => typeof site === 'string').slice(0, 600) : [],
    staffActiveMs: Math.min(ISEKAI_SHIFT_MS, Math.max(0, Number(farm.staffActiveMs) || 0)),
    staffRestUntil: Math.min(Math.max(0, Number(farm.staffRestUntil) || 0), Date.now() + ISEKAI_REST_MS),
    staffLastWorkMs: Math.max(0, Number(farm.staffLastWorkMs) || 0),
    staffHistory: Array.isArray(farm.staffHistory) ? farm.staffHistory.slice(0, 16) : [],
    familyHobbies: farm.familyHobbies && typeof farm.familyHobbies === 'object' ? farm.familyHobbies : {},
    courtship: partnerById(farm.courtship?.partnerId) ? farm.courtship : null,
    spouses: Array.isArray(farm.spouses) ? farm.spouses.filter(item => partnerById(item.partnerId)).slice(0, 3) : [],
    children: Array.isArray(farm.children) ? farm.children.slice(0, 5) : [],
    familyHistory: Array.isArray(farm.familyHistory) ? farm.familyHistory.slice(0, 30) : []
  };
}
export function peopleActionError(farm, action, now = Date.now()) {
  if (!farm.profile) return '請先建立角色。';
  const person = staffById(action.personId);
  const partner = partnerById(action.partnerId);
  if (action.type === 'hireStaff') return !person ? '找不到人選。' : !ISEKAI_PAY_PERIOD_MS[action.period || 'day'] ? '請選擇日薪或周薪。'
    : farm.staff.some(item => item.id === person.id) ? '已雇用此人。'
      : farm.staff.length >= 8 ? '人力上限為八人。' : farm.coins < isekaiStaffWage(person, action.period || 'day') ? '預付薪資不足。' : '';
  if (action.type === 'dismissStaff') return farm.staff.some(item => item.id === action.personId) ? '' : '尚未雇用此人。';
  if (action.type === 'staffFocus') return farm.staff.some(item => item.id === action.personId) && ['crops','animals','trade','guard'].includes(action.focus) ? '' : '無法指派這項工作。';
  if (action.type === 'staffTask') return ISEKAI_TASKS.some(item => item.id === action.taskId) ? '' : '找不到任務。';
  if (action.type === 'staffAutoCrop') return ISEKAI_CROPS.some(item => item.id === action.cropId) ? '' : '找不到作物。';
  if (action.type === 'staffReservePlot') return ISEKAI_AREAS.some(item => item.id === action.areaId)
    && (action.plotKind === 'frontier' ? action.frontierAccess && Number.isInteger(action.frontierFieldIndex)
      && action.frontierFieldIndex >= 0 && action.frontierFieldIndex < isekaiFrontierFieldCount(action.areaId, action.plotIndex)
      : farm.unlockedAreas.includes(action.areaId)) && Number.isInteger(action.plotIndex)
    && action.plotIndex >= 0 && action.plotIndex < 6 ? '' : '請選擇自己領地內的田位。';
  if (action.type === 'activity') return ISEKAI_HOBBIES.some(item => item.id === action.hobbyId) && farm.coins >= 20 ? '' : '參加活動需要 20 金幣。';
  if (action.type === 'meet' || action.type === 'match') {
    if (!partner || farm.spouses.some(item => item.partnerId === partner.id) || farm.courtship
      || farm.children.some(item => item.childCourtship?.partnerId === partner.id || item.childMarriage?.partnerId === partner.id)) return '此人已有家庭關係或目前正在交往。';
    if (action.type === 'meet') return (farm.familyHobbies[partner.hobby] || 0) >= 2 ? '' : '先參加對方喜歡的活動兩次。';
    return farm.coins >= 60 ? '' : '相親介紹需要 60 金幣。';
  }
  if (action.type === 'date') return farm.courtship?.partnerId === action.partnerId && farm.coins >= 35 ? '' : '約會需要交往對象與 35 金幣。';
  if (action.type === 'breakup') return farm.courtship ? '' : '目前沒有交往對象。';
  if (action.type === 'propose') return farm.courtship?.partnerId === action.partnerId && farm.courtship.affection >= 75 && farm.coins >= 300 ? '' : '求婚需好感 75 與 300 金幣。';
  if (action.type === 'marry') {
    const limit = farm.profile.faith === 'milis' ? 1 : 3;
    return farm.courtship?.partnerId === action.partnerId && farm.courtship.engaged && farm.courtship.affection >= 90
      && farm.spouses.length < limit && farm.coins >= 300 ? '' : `結婚需訂婚、好感 90、300 金幣；目前最多 ${limit} 位配偶。`;
  }
  if (action.type === 'divorce') return farm.spouses.some(item => item.partnerId === action.partnerId) ? '' : '找不到配偶。';
  if (action.type === 'child') return farm.spouses.some(item => item.partnerId === action.partnerId) && farm.children.length < 5 && farm.coins >= 180 ? '' : '須有配偶、子女少於五名，並備 180 金幣。';
  if (action.type === 'familyFocus') {
    const child = farm.children.find(item => item.id === action.memberId);
    if (child && (isekaiChildAge(child, now) < 6 || (action.focus === 'guard' && isekaiChildAge(child, now) < 18))) return '未滿 6 歲不能工作；未滿 18 歲不能參戰。';
    return (farm.spouses.some(item => item.partnerId === action.memberId) || child)
      && ['crops','animals','trade','guard','rest'].includes(action.focus) ? '' : '找不到家人或工作。';
  }
  if (['childMeet','childDate','childMarry','childBreakup'].includes(action.type)) {
    const child = farm.children.find(item => item.id === action.memberId);
    if (!child || isekaiChildAge(child, now) < 18) return '孩子滿 18 歲才能交往或結婚。';
    if (child.childMarriage) return '這位孩子已婚。';
    if (action.type === 'childMeet') return partner && !child.childCourtship
      && !farm.spouses.some(item => item.partnerId === partner.id)
      && farm.courtship?.partnerId !== partner.id
      && !farm.children.some(item => item.childMarriage?.partnerId === partner.id || item.childCourtship?.partnerId === partner.id)
      && farm.coins >= 40 ? '' : '請選擇尚未與家人交往的對象，並準備 40 金幣。';
    if (!child.childCourtship) return '請先認識對象。';
    if (action.type === 'childBreakup') return '';
    if (action.type === 'childDate') return farm.coins >= 25 ? '' : '約會需要 25 金幣。';
    return child.childCourtship.affection >= 75 && farm.coins >= 150 ? '' : '好感至少 75，婚禮需要 150 金幣。';
  }
  return '未知的人物操作。';
}
export function applyPeopleAction(source, action, now = Date.now()) {
  const farm = normalizeIsekaiPeople(normalizeIsekaiFarm(source));
  const error = peopleActionError(farm, action, now);
  if (error) throw new Error(error);
  const person = staffById(action.personId);
  const partner = partnerById(action.partnerId);
  let detail = '';
  if (action.type === 'hireStaff') { const period = action.period || 'day'; const wage = isekaiStaffWage(person, period);
    farm.coins -= wage; farm.staff.push({ id: person.id, focus: person.focus, period, paidUntil: now + ISEKAI_PAY_PERIOD_MS[period] });
    detail = `雇用${person.name}，預付${period === 'week' ? '周薪' : '日薪'} ${wage} 金幣；自動值班將開始`;
  }
  else if (action.type === 'dismissStaff') { farm.staff = farm.staff.filter(item => item.id !== person.id); detail = `${person.name}離開農莊`; }
  else if (action.type === 'staffFocus') { farm.staff.find(item => item.id === person.id).focus = action.focus; detail = `${person.name}改任${action.focus}`; }
  else if (action.type === 'staffTask') { farm.staffTasks[action.taskId] = !!action.enabled; detail = `${ISEKAI_TASKS.find(item => item.id === action.taskId).label}${action.enabled ? '加入' : '移出'}自動任務`; }
  else if (action.type === 'staffAutoCrop') {
    farm.staffAutoCrops = action.enabled ? [...new Set([...farm.staffAutoCrops, action.cropId])] : farm.staffAutoCrops.filter(id => id !== action.cropId);
    detail = `${ISEKAI_CROPS.find(item => item.id === action.cropId).name}${action.enabled ? '加入' : '移出'}自動播種清單`;
  }
  else if (action.type === 'staffReservePlot') {
    const site = action.plotKind === 'frontier' ? `frontier:${action.areaId}:${action.plotIndex}:${action.frontierFieldIndex}`
      : `${action.areaId}:${action.plotIndex}`;
    farm.staffReservedPlots = farm.staffReservedPlots.includes(site) ? farm.staffReservedPlots.filter(item => item !== site) : [...farm.staffReservedPlots, site];
    detail = `${action.areaId}第 ${action.plotIndex + 1} 塊田${farm.staffReservedPlots.includes(site) ? '已禁止人力補苗與播種' : '已允許人力補苗與播種'}`;
  }
  else if (action.type === 'activity') { farm.coins -= 20; farm.familyHobbies[action.hobbyId] = (farm.familyHobbies[action.hobbyId] || 0) + 1; detail = `參加${ISEKAI_HOBBIES.find(item => item.id === action.hobbyId).name}`; }
  else if (action.type === 'meet' || action.type === 'match') { if (action.type === 'match') farm.coins -= 60; farm.courtship = { partnerId: partner.id, affection: 35, engaged: false }; detail = `認識${partner.name}，開始交往`; }
  else if (action.type === 'date') { farm.coins -= 35; farm.courtship.affection = Math.min(100, farm.courtship.affection + 20); detail = `與${partner.name}約會，好感 ${farm.courtship.affection}`; }
  else if (action.type === 'breakup') { detail = `與${partnerById(farm.courtship.partnerId).name}和平分手`; farm.courtship = null; }
  else if (action.type === 'propose') { farm.courtship.engaged = true; detail = `向${partner.name}求婚成功`; }
  else if (action.type === 'marry') { farm.coins -= 300; farm.spouses.push({ partnerId: partner.id, focus: 'rest' }); farm.courtship = null; detail = `與${partner.name}結婚`; }
  else if (action.type === 'divorce') { const amount = Math.floor(farm.coins / 2); farm.coins -= amount; farm.spouses = farm.spouses.filter(item => item.partnerId !== partner.id); detail = `與${partner.name}離婚，分產 ${amount} 金幣`; }
  else if (action.type === 'child') { farm.coins -= 180; const id = `child-${now}-${farm.children.length}`; farm.children.push({ id, name: `第${farm.children.length + 1}位孩子`, parentId: partner.id, bornAt: now, raceId: partner.raceId, focus: 'rest', childCourtship: null, childMarriage: null }); detail = `與${partner.name}迎接孩子，成長時間開始計算`; }
  else if (action.type === 'familyFocus') { const member = farm.spouses.find(item => item.partnerId === action.memberId) || farm.children.find(item => item.id === action.memberId); member.focus = action.focus; detail = `家人工作改為${action.focus}`; }
  else if (action.type === 'childMeet') { farm.coins -= 40; const child = farm.children.find(item => item.id === action.memberId); child.childCourtship = { partnerId: partner.id, affection: 35 }; detail = `${child.name}認識${partner.name}`; }
  else if (action.type === 'childDate') { farm.coins -= 25; const child = farm.children.find(item => item.id === action.memberId); child.childCourtship.affection = Math.min(100, child.childCourtship.affection + 20); detail = `${child.name}與${partnerById(child.childCourtship.partnerId).name}約會`; }
  else if (action.type === 'childBreakup') { const child = farm.children.find(item => item.id === action.memberId); child.childCourtship = null; detail = `${child.name}結束交往`; }
  else if (action.type === 'childMarry') { farm.coins -= 150; const child = farm.children.find(item => item.id === action.memberId); child.childMarriage = { ...child.childCourtship, marriedAt: now }; child.childCourtship = null; detail = `${child.name}與${partnerById(child.childMarriage.partnerId).name}結婚`; }
  if (['hireStaff','staffFocus','staffTask','staffAutoCrop','staffReservePlot','familyFocus'].includes(action.type)) farm.staffLastWorkMs = 0;
  farm.journal.unshift({ at: now, text: detail }); farm.journal = farm.journal.slice(0, 12);
  farm.familyHistory.unshift({ at: now, detail }); farm.familyHistory = farm.familyHistory.slice(0, 30);
  return { farm, detail };
}

function workerActions(farm, focus, now, availableFrontiers = []) {
  const areas = ISEKAI_AREAS.filter(area => farm.unlockedAreas.includes(area.id));
  const sites = areas.flatMap(area => Array.from({ length: 6 }, (_, index) => ({ area, index, plotKind: 'home', frontierAccess: false })));
  sites.push(...availableFrontiers.flatMap(claim => Array.from({ length: isekaiFrontierFieldCount(claim.area_id, claim.plot_index) }, (_, frontierFieldIndex) => ({
    area: ISEKAI_AREAS.find(area => area.id === claim.area_id), index: claim.plot_index, frontierFieldIndex,
    plotKind: 'frontier', frontierAccess: true, frontierClaimedAt: claim.captured_at }))).filter(site => site.area));
  const enabled = id => farm.staffTasks[id] !== false;
  const candidates = [];
  // Like Happy Farm, clear the warehouse before buying the next round of seeds.
  if (focus === 'crops' && enabled('sell')) candidates.push(...ISEKAI_CROPS.filter(item => farm.produce[item.id] > 0).map(item => ({ type: 'sell', areaId: areas.find(area => area.region === item.region)?.id || areas[0]?.id, cropId: item.id })));
  if (focus === 'animals' && enabled('sellAnimal')) candidates.push(...ISEKAI_ANIMALS.filter(item => farm.animalGoods[item.id] > 0).map(item => ({ type: 'sellAnimal', areaId: areas[0]?.id, animalId: item.id })));
  for (const { area, index, plotKind, frontierAccess, frontierClaimedAt, frontierFieldIndex } of sites) {
    const plot = plotKind === 'frontier' ? farm.frontierPlots[area.id]?.[index]?.[frontierFieldIndex] : farm.plots[area.id]?.[index];
    const extra = plotKind === 'frontier' ? { plotKind, frontierAccess, frontierClaimedAt, frontierFieldIndex } : {};
    const reserveKey = `${plotKind === 'frontier' ? 'frontier:' : ''}${area.id}:${index}${plotKind === 'frontier' ? `:${frontierFieldIndex}` : ''}`;
    if (focus === 'crops') {
      if (plot?.cropId && now >= plot.readyAt && enabled('harvest')) candidates.push({ type: 'harvest', areaId: area.id, plotIndex: index, ...extra });
      else if (plot?.cropId && !plot.watered && enabled('water')) candidates.push({ type: 'water', areaId: area.id, plotIndex: index, ...extra });
      else if (!plot && enabled('plant') && !farm.staffReservedPlots.includes(reserveKey)) {
        const crop = ISEKAI_CROPS.find(item => item.region === area.region && farm.staffAutoCrops.includes(item.id) && farm.seeds[item.id] > 0);
        if (crop) candidates.push({ type: 'plant', areaId: area.id, plotIndex: index, cropId: crop.id, ...extra });
        else if (enabled('buy')) {
          const seed = ISEKAI_CROPS.find(item => item.region === area.region && farm.staffAutoCrops.includes(item.id) && adjustedSeedPrice(farm, item) <= farm.coins);
          if (seed) {
            const empty = sites.filter(candidate => candidate.area.id === area.id && candidate.plotKind === plotKind
              && !(plotKind === 'frontier' ? farm.frontierPlots[area.id]?.[candidate.index]?.[candidate.frontierFieldIndex] : farm.plots[area.id]?.[candidate.index])
              && !farm.staffReservedPlots.includes(`${plotKind === 'frontier' ? 'frontier:' : ''}${area.id}:${candidate.index}${plotKind === 'frontier' ? `:${candidate.frontierFieldIndex}` : ''}`)).length;
            const quantity = Math.max(1, Math.min(50, empty, Math.floor(farm.coins / adjustedSeedPrice(farm, seed))));
            candidates.push({ type: 'buy', areaId: area.id, plotIndex: index, cropId: seed.id, quantity, ...extra });
          }
        }
      }
    } else if (focus === 'animals' && plot?.facility === 'stable' && plot.animalId) {
      if (plot.readyAt && now >= plot.readyAt && enabled('collect')) candidates.push({ type: 'collect', areaId: area.id, plotIndex: index, ...extra });
      else if (!plot.readyAt && enabled('feed')) candidates.push({ type: 'feed', areaId: area.id, plotIndex: index, ...extra });
    }
  }
  if (focus === 'trade') {
    if (enabled('sellProcessed')) candidates.push(...ISEKAI_RECIPES.map(item => ({ type: 'sellProcessed', recipeId: item.id })));
    if (enabled('sell')) candidates.push(...ISEKAI_CROPS.filter(item => farm.produce[item.id] > 0).map(item => ({ type: 'sell', areaId: areas.find(area => area.region === item.region)?.id || areas[0]?.id, cropId: item.id })));
    if (enabled('sellAnimal')) candidates.push(...ISEKAI_ANIMALS.filter(item => farm.animalGoods[item.id] > 0).map(item => ({ type: 'sellAnimal', areaId: areas[0]?.id, animalId: item.id })));
    if (enabled('process')) candidates.push(...ISEKAI_RECIPES.map(item => ({ type: 'process', recipeId: item.id })));
    if (enabled('venue')) for (const area of areas) for (let index = 0; index < 6; index++) candidates.push({ type: 'operateVenue', areaId: area.id, plotIndex: index });
  }
  const priority = { sell: 0, sellAnimal: 0, sellProcessed: 0, harvest: 1, collect: 1,
    plant: 2, buy: 2, water: 3, feed: 3, process: 4, operateVenue: 5 };
  return candidates.filter(action => !(['process','sellProcessed','operateVenue'].includes(action.type)
    ? expansionActionError(farm, action, now) : isekaiActionError(farm, action, now)))
    .sort((a, b) => priority[a.type] - priority[b.type]);
}
export function runIsekaiStaff(source, now = Date.now(), ownedFrontiers = []) {
  let farm = normalizeIsekaiPeople(normalizeIsekaiFarm(source));
  const workers = farm.staff.map(contract => ({ ...staffById(contract.id), focus: contract.focus, period: contract.period, kind: 'staff', contractId: contract.id }));
  workers.push(...farm.spouses.filter(item => item.focus !== 'rest').map(item => ({ ...partnerById(item.partnerId), focus: item.focus, wage: 4, period: 'day', kind: 'spouse', contractId: item.partnerId })));
  workers.push(...farm.children.filter(item => item.focus !== 'rest' && isekaiChildAge(item, now) >= 6).map(item => ({ id: item.id, name: item.name, raceId: item.raceId, professionId: 'gardener', focus: item.focus, wage: isekaiChildAge(item, now) < 18 ? 2 : 5, period: 'day', kind: 'child', contractId: item.id })));
  const details = [];
  const sowSummary = new Map();
  for (const worker of workers) {
    if (worker.focus === 'guard') continue;
    // Sowing is one whole-field pass. Keep the two-action cap for ordinary jobs.
    const sowLimit = worker.focus === 'crops' ? ISEKAI_AREAS.filter(area => farm.unlockedAreas.includes(area.id)).length * 6
      + ownedFrontiers.reduce((total, claim) => total + isekaiFrontierFieldCount(claim.area_id, claim.plot_index), 0) : 0;
    let ordinaryCount = 0;
    for (let count = 0; count < sowLimit + 2; count++) {
      const contract = worker.kind === 'staff' ? farm.staff.find(item => item.id === worker.contractId)
        : worker.kind === 'spouse' ? farm.spouses.find(item => item.partnerId === worker.contractId)
          : farm.children.find(item => item.id === worker.contractId);
      const wage = contract.paidUntil > now ? 0 : isekaiStaffWage(worker, worker.period);
      const payFromSale = farm.coins < wage;
      const workerProfile = { ...farm.profile, raceId: worker.raceId, professionId: worker.professionId };
      const actions = workerActions({ ...farm, coins: Math.max(0, farm.coins - wage), profile: workerProfile }, worker.focus, now, ownedFrontiers);
      const action = ordinaryCount >= 2 ? actions.find(item => ['plant','buy'].includes(item.type)) : actions[0];
      if (!action) {
        if (!count && worker.focus === 'crops') {
          const empty = ISEKAI_AREAS.some(area => farm.unlockedAreas.includes(area.id)
            && farm.plots[area.id]?.some((plot, index) => !plot && !farm.staffReservedPlots.includes(`${area.id}:${index}`)));
          details.push(`${worker.name}：${!farm.staffAutoCrops.length ? '尚未勾選自動播種作物'
            : farm.staffTasks.plant === false ? '自動播種任務已關閉'
              : payFromSale ? '薪資不足，且目前沒有可賣出的收成' : empty ? '沒有可用種苗或金幣不足以補苗' : '沒有可耕作的空田'}`);
        }
        break;
      }
      if (payFromSale && !['sell','sellAnimal','harvest','collect','sellProcessed'].includes(action.type)) {
        details.push(`${worker.name}：薪資不足，暫停工作`); break;
      }
      // A worker's race and career affect the exact action; restore the player's identity afterward.
      const originalProfile = farm.profile;
      const workingFarm = { ...farm, coins: farm.coins - (payFromSale ? 0 : wage),
        profile: workerProfile };
      try {
        const expansionAction = ['process','sellProcessed','operateVenue'].includes(action.type);
        const harvestedCropId = action.type === 'harvest' ? (action.plotKind === 'frontier'
          ? workingFarm.frontierPlots[action.areaId][action.plotIndex]?.[action.frontierFieldIndex]
          : workingFarm.plots[action.areaId][action.plotIndex])?.cropId : null;
        const collectedAnimalId = action.type === 'collect' ? (action.plotKind === 'frontier'
          ? workingFarm.frontierPlots[action.areaId][action.plotIndex]?.[action.frontierFieldIndex]
          : workingFarm.plots[action.areaId][action.plotIndex])?.animalId : null;
        let result = expansionAction ? applyExpansionAction(workingFarm, action, now)
          : applyIsekaiAction(workingFarm, action.type === 'harvest'
            ? { ...action, frontierBonus: action.plotKind !== 'frontier' && ownedFrontiers.some(item => item.owner_id && item.area_id === action.areaId && item.plot_index === action.plotIndex) }
            : action, now);
        // Keep linked steps together even if the shift ends immediately afterward.
        if (harvestedCropId && farm.staffTasks.sell !== false) {
          const sale = applyIsekaiAction(result.farm, { type: 'sell', areaId: action.areaId, cropId: harvestedCropId }, now);
          result = { farm: sale.farm, detail: `${result.detail}；${sale.detail}` };
        } else if (collectedAnimalId && farm.staffTasks.sellAnimal !== false) {
          const sale = applyIsekaiAction(result.farm, { type: 'sellAnimal', areaId: action.areaId, animalId: collectedAnimalId }, now);
          result = { farm: sale.farm, detail: `${result.detail}；${sale.detail}` };
        } else if (action.type === 'buy' && farm.staffTasks.plant !== false) {
          const planted = applyIsekaiAction(result.farm, { type: 'plant', areaId: action.areaId, plotIndex: action.plotIndex, cropId: action.cropId,
            plotKind: action.plotKind, frontierAccess: action.frontierAccess, frontierClaimedAt: action.frontierClaimedAt,
            frontierFieldIndex: action.frontierFieldIndex }, now);
          result = { farm: planted.farm, detail: `${result.detail}；${planted.detail}` };
        }
        // Keep the salary contract through action normalization, and renew only when work succeeds.
        const renewed = worker.kind === 'staff' ? result.farm.staff.find(item => item.id === worker.contractId)
          : worker.kind === 'spouse' ? result.farm.spouses.find(item => item.partnerId === worker.contractId)
            : result.farm.children.find(item => item.id === worker.contractId);
        if (payFromSale) {
          if (result.farm.coins < wage) { details.push(`${worker.name}：販賣收入不足以支付薪資`); break; }
          result.farm.coins -= wage;
        }
        if (wage) renewed.paidUntil = now + ISEKAI_PAY_PERIOD_MS[worker.period];
        const actionDelta = result.farm.coins - workingFarm.coins;
        const accounts = [...(result.farm.expansion?.accounts || [])];
        if (!expansionAction && actionDelta) accounts.unshift({ at: now, category: action.type,
          income: Math.max(0, actionDelta + (payFromSale ? wage : 0)), expense: Math.max(0, -(actionDelta + (payFromSale ? wage : 0))), detail: result.detail });
        if (wage) accounts.unshift({ at: now, category: 'staff-wage', income: 0, expense: wage, detail: `${worker.name}${worker.period === 'week' ? '周薪' : '日薪'}` });
        farm = normalizeIsekaiPeople({ ...result.farm, profile: originalProfile,
          expansion: { ...result.farm.expansion, accounts: accounts.slice(0, 50) } });
        if (['buy','plant'].includes(action.type)) {
          const key = `${worker.contractId}:${action.areaId}`;
          const summary = sowSummary.get(key) || { name: worker.name, areaId: action.areaId, planted: 0, bought: 0, wage: 0 };
          summary.planted++;
          summary.bought += action.type === 'buy' ? action.quantity : 0;
          summary.wage += wage;
          sowSummary.set(key, summary);
        } else details.push(`${worker.name}：${result.detail}${wage ? `（支付${worker.period === 'week' ? '周薪' : '日薪'} ${wage}）` : ''}`);
        if (!['buy','plant'].includes(action.type)) ordinaryCount++;
      } catch (error) { details.push(`${worker.name}：${error.message || '工作執行失敗'}`); break; }
    }
  }
  details.unshift(...[...sowSummary.values()].map(item => `${item.name}：${ISEKAI_AREAS.find(area => area.id === item.areaId)?.name}自動播種 ${item.planted} 塊${item.bought ? `、補買種苗 ${item.bought} 份` : ''}${item.wage ? `（支付薪資 ${item.wage}）` : ''}`));
  if (!details.length) details.push('全員巡田完畢，目前沒有可執行的任務或薪資不足');
  farm.staffHistory.unshift({ at: now, details }); farm.staffHistory = farm.staffHistory.slice(0, 16);
  return { farm, details };
}
