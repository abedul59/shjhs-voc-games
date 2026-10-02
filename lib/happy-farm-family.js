// All people and careers in this farm story are fictional adult characters.
export const FAMILY_HOBBIES = [
  { id: 'cooking', name: '料理', icon: '🍳', activity: '參加料理交流會' },
  { id: 'hiking', name: '健行', icon: '🥾', activity: '參加郊山健行' },
  { id: 'music', name: '音樂', icon: '🎵', activity: '參加社區音樂會' },
  { id: 'reading', name: '閱讀', icon: '📚', activity: '參加讀書會' },
  { id: 'gardening', name: '園藝', icon: '🌻', activity: '參加園藝市集' }
];
export const FAMILY_PARTNERS = [
  { id: 'yating', name: '雅婷', gender: 'female', icon: '👩‍🍳', profession: '料理研究員', hobby: 'cooking', ability: '加工與餐飲工作每輪多做一項', specialty: 'processing' },
  { id: 'peiyu', name: '佩瑜', gender: 'female', icon: '👩‍🏫', profession: '自然科教師', hobby: 'reading', ability: '教學與服務工作每輪多做一項', specialty: 'service' },
  { id: 'xiaolan', name: '曉嵐', gender: 'female', icon: '👩‍🌾', profession: '園藝設計師', hobby: 'gardening', ability: '農田工作每輪多做一項', specialty: 'crops' },
  { id: 'meiwen', name: '美雯', gender: 'female', icon: '👩‍🎤', profession: '社區音樂人', hobby: 'music', ability: '服務工作每輪多做一項', specialty: 'service' },
  { id: 'shuhui', name: '淑惠', gender: 'female', icon: '👩‍🔧', profession: '能源技師', hobby: 'hiking', ability: '光電工作每輪多做一項', specialty: 'energy' },
  { id: 'junhao', name: '俊豪', gender: 'male', icon: '👨‍🍳', profession: '餐廳主廚', hobby: 'cooking', ability: '加工與餐飲工作每輪多做一項', specialty: 'processing' },
  { id: 'bocheng', name: '柏成', gender: 'male', icon: '👨‍🌾', profession: '農藝顧問', hobby: 'gardening', ability: '農田工作每輪多做一項', specialty: 'crops' },
  { id: 'zhiyuan', name: '志遠', gender: 'male', icon: '👨‍⚕️', profession: '動物照護員', hobby: 'hiking', ability: '動物工作每輪多做一項', specialty: 'animals' },
  { id: 'wenkai', name: '文凱', gender: 'male', icon: '👨‍🏫', profession: '社區教師', hobby: 'reading', ability: '教學與服務工作每輪多做一項', specialty: 'service' },
  { id: 'yusheng', name: '宇晟', gender: 'male', icon: '👨‍🎤', profession: '活動企劃師', hobby: 'music', ability: '服務工作每輪多做一項', specialty: 'service' }
];
export const familyPartnerById = id => FAMILY_PARTNERS.find(person => person.id === id);
export const FAMILY_PROFESSIONS = [
  { id: 'agronomist', name: '農藝顧問', icon: '🌱', group: 'crops', detail: '優先農田工作' },
  { id: 'veterinarian', name: '動物照護師', icon: '🐾', group: 'animals', detail: '優先動物工作' },
  { id: 'chef', name: '料理師', icon: '🍳', group: 'processing', detail: '優先加工工作' },
  { id: 'manager', name: '農場經理', icon: '🏪', group: 'service', detail: '優先店鋪工作，可服務英語店鋪' },
  { id: 'engineer', name: '能源技師', icon: '☀️', group: 'energy', detail: '優先光電工作' }
];
export const FAMILY_ABILITIES = [
  { id: 'crops', name: '農耕專才', detail: '農田工作增加一項' },
  { id: 'animals', name: '動物照護', detail: '動物工作增加一項' },
  { id: 'processing', name: '加工巧手', detail: '加工工作增加一項' },
  { id: 'service', name: '親切接待', detail: '店鋪工作增加一項' },
  { id: 'energy', name: '綠能管理', detail: '光電工作增加一項' }
];
export const FAMILY_ACTIVITY_COST = 18;
export const FAMILY_MATCH_COST = 60;
export const FAMILY_DATE_COST = 35;
export const FAMILY_MARRIAGE_COST = 300;
export const FAMILY_CHILD_COST = 220;
export const FAMILY_MARRIAGE_MIN_COINS = 1200;
export const FAMILY_CHILD_YEAR_MS = 7 * 24 * 60 * 60 * 1000;
export const FAMILY_ADULT_AGE = 18;
export const FAMILY_AFTER_SCHOOL_AGE = 6;
export const familyChildAge = (child, activeMs) => Math.min(18, Math.max(0, Math.floor((activeMs - child.bornAtPlayMs) / FAMILY_CHILD_YEAR_MS)));
export const familySchoolLevel = age => age < 6 ? '幼兒園' : age < 12 ? '國小' : age < 15 ? '國中' : age < FAMILY_ADULT_AGE ? '高中' : '已畢業';
export const freshFamilyState = () => ({
  gender: '', familyActiveMs: 0, familyHobbies: {}, courtship: null,
  spouse: null, children: [], familyHistory: [], divorceSettlementDue: 0, familyChildTimeVersion: 2
});
export function withFamilyState(farm) {
  return {
    ...freshFamilyState(), ...farm,
    gender: ['female', 'male'].includes(farm.gender) ? farm.gender : '',
    familyActiveMs: Math.max(0, Number(farm.familyActiveMs) || 0),
    familyHobbies: farm.familyHobbies && typeof farm.familyHobbies === 'object' ? farm.familyHobbies : {},
    courtship: farm.courtship && familyPartnerById(farm.courtship.partnerId) ? farm.courtship : null,
    spouse: farm.spouse && familyPartnerById(farm.spouse.partnerId) ? farm.spouse : null,
    children: Array.isArray(farm.children) ? farm.children.slice(0, 2).map(child => farm.familyChildTimeVersion === 2 ? child : {
      ...child,
      bornAtPlayMs: (Number(farm.familyActiveMs) || 0) - Math.min(18,
        Math.max(0, Math.floor(((Number(farm.familyActiveMs) || 0) - (Number(child.bornAtPlayMs) || 0)) / (5 * 60 * 1000)))) * FAMILY_CHILD_YEAR_MS
    }) : [],
    familyHistory: Array.isArray(farm.familyHistory) ? farm.familyHistory.slice(0, 40) : [],
    divorceSettlementDue: Math.max(0, Number(farm.divorceSettlementDue) || 0),
    familyChildTimeVersion: 2
  };
}
export const familyCandidates = () => FAMILY_PARTNERS;
export const familyAssetValue = farm => Math.max(0, Number(farm.coins) || 0)
  + (farm.plots || []).reduce((sum, plot) => sum + (plot?.facility === 'private_school' ? 0 : plot?.facility ? 200 : plot?.crop ? 35 : 80), 0)
  + Object.values(farm.produce || {}).reduce((sum, amount) => sum + Number(amount || 0) * 20, 0)
  + Object.values(farm.processedProduce || {}).reduce((sum, amount) => sum + Number(amount || 0) * 50, 0)
  + Object.values(farm.animals || {}).filter(Boolean).length * 130;
export function familyActionError(farm, action, partnerId = '', hobbyId = '', activeMs = farm.familyActiveMs || 0) {
  const partner = familyPartnerById(partnerId);
  const hobby = FAMILY_HOBBIES.find(item => item.id === hobbyId);
  if (action === 'chooseGender') return farm.gender ? '角色性別已設定；轉生後才能重新選。' : ['female', 'male'].includes(partnerId) ? '' : '請選擇角色性別。';
  if (!farm.gender || !farm.protagonistId) return '請先建立農場主角。';
  if (action === 'activity') return hobby && farm.coins >= FAMILY_ACTIVITY_COST ? '' : '請選擇活動並準備 18 金幣。';
  if (action === 'meet' || action === 'match') {
    if (farm.spouse || farm.courtship) return '目前已有交往或婚姻對象。';
    if (!partner) return '請選擇可認識的對象。';
    if (action === 'meet') return (farm.familyHobbies?.[partner.hobby] || 0) >= 2 ? '' : '先參加對方喜歡的活動兩次，才能自然相識。';
    return farm.coins >= FAMILY_MATCH_COST ? '' : '相親介紹需要 60 金幣。';
  }
  if (action === 'date') return farm.courtship && farm.coins >= FAMILY_DATE_COST ? '' : '須先認識對象並準備 35 金幣。';
  if (action === 'breakup') return farm.courtship ? '' : '目前沒有交往對象。';
  if (action === 'propose') return farm.courtship && farm.courtship.affection >= 70 && farm.coins >= FAMILY_MARRIAGE_MIN_COINS
    ? '' : '求婚需要感情至少 70，且農場金幣至少 1200。';
  if (action === 'marry') return farm.courtship?.engaged && farm.courtship.affection >= 85 && farm.coins >= FAMILY_MARRIAGE_MIN_COINS + FAMILY_MARRIAGE_COST
    ? '' : '先求婚、讓感情達 85，並準備 1500 金幣。';
  if (action === 'divorce') return farm.spouse ? '' : '目前沒有配偶。';
  if (action === 'child') return farm.spouse && farm.children.length < 2 && farm.coins >= FAMILY_CHILD_COST ? '' : '須已婚、子女未滿兩名，並準備 220 金幣。';
  if (action === 'familyCareer') {
    const member = partnerId === 'spouse' ? farm.spouse : farm.children.find(child => child.id === partnerId);
    const [professionId, abilityId] = hobbyId.split(':');
    return member && (partnerId === 'spouse' || familyChildAge(member, activeMs) >= FAMILY_ADULT_AGE)
      && FAMILY_PROFESSIONS.some(item => item.id === professionId) && FAMILY_ABILITIES.some(item => item.id === abilityId)
      ? '' : '請為成年家人選擇職業和能力。';
  }
  if (action === 'familyWork') {
    const member = partnerId === 'spouse' ? farm.spouse : farm.children.find(child => child.id === partnerId);
    if (!member) return '找不到這位家人。';
    if (partnerId !== 'spouse' && familyChildAge(member, activeMs) < FAMILY_AFTER_SCHOOL_AGE) return '子女須滿 6 歲，先上學，才能在放學後幫忙。';
    return partnerId !== 'spouse' && familyChildAge(member, activeMs) < FAMILY_ADULT_AGE || member.professionId && member.abilityId
      ? '' : '成年家人須先選好職業與能力。';
  }
  return '無法執行家庭操作。';
}
export function applyFamilyAction(farm, action, partnerId = '', hobbyId = '', activeMs = farm.familyActiveMs || 0, now = Date.now()) {
  const next = JSON.parse(JSON.stringify(farm));
  let detail = '';
  if (action === 'chooseGender') { next.gender = partnerId; detail = `角色性別已選擇${partnerId === 'male' ? '男' : '女'}`; }
  if (action === 'activity') {
    next.coins -= FAMILY_ACTIVITY_COST;
    next.familyHobbies[hobbyId] = (next.familyHobbies[hobbyId] || 0) + 1;
    const hobby = FAMILY_HOBBIES.find(item => item.id === hobbyId);
    if (next.courtship && familyPartnerById(next.courtship.partnerId)?.hobby === hobbyId) next.courtship.affection = Math.min(100, next.courtship.affection + 8);
    detail = `${hobby.activity}，${hobby.name}經驗 ${next.familyHobbies[hobbyId]}`;
  }
  if (action === 'meet' || action === 'match') {
    const person = familyPartnerById(partnerId);
    if (action === 'match') next.coins -= FAMILY_MATCH_COST;
    next.courtship = { partnerId, affection: action === 'meet' ? 22 : 10, metBy: action === 'meet' ? '自由戀愛' : '相親市場', engaged: false };
    detail = `透過${next.courtship.metBy}認識${person.name}（${person.profession}）`;
  }
  if (action === 'date') {
    next.coins -= FAMILY_DATE_COST;
    const person = familyPartnerById(next.courtship.partnerId);
    next.courtship.affection = Math.min(100, next.courtship.affection + (next.familyHobbies?.[person.hobby] ? 17 : 12));
    detail = `與${person.name}約會，感情提升至 ${next.courtship.affection}`;
  }
  if (action === 'breakup') {
    detail = `與${familyPartnerById(next.courtship.partnerId).name}結束交往`;
    next.courtship = null;
  }
  if (action === 'propose') { next.courtship.engaged = true; detail = `向${familyPartnerById(next.courtship.partnerId).name}求婚成功`; }
  if (action === 'marry') {
    next.coins -= FAMILY_MARRIAGE_COST;
    next.spouse = { partnerId: next.courtship.partnerId, professionId: '', abilityId: '', workEnabled: false, paidUntil: 0 };
    detail = `與${familyPartnerById(next.spouse.partnerId).name}結婚，配偶可選擇帶薪協助農場工作`;
    next.courtship = null;
  }
  if (action === 'divorce') {
    const person = familyPartnerById(next.spouse.partnerId);
    const settlement = Math.floor(familyAssetValue(next) / 2);
    const cash = Math.min(Math.floor(next.coins / 2), settlement);
    next.coins -= cash;
    next.divorceSettlementDue += settlement - cash;
    next.spouse = null;
    next.courtship = null;
    detail = `與${person.name}離婚；財產等值分配 ${settlement} 金幣，已付 ${cash}，其餘 ${settlement - cash} 由往後收入分期償還`;
  }
  if (action === 'child') {
    next.coins -= FAMILY_CHILD_COST;
    const gender = (next.children.length + now) % 2 ? 'male' : 'female';
    const names = gender === 'male' ? ['小樹', '小禾'] : ['小晴', '小雨'];
    const traits = ['crops', 'animals', 'service', 'processing', 'energy'];
    const child = { id: `child-${now}`, name: names[next.children.length], gender, trait: traits[(now + next.children.length) % traits.length], bornAtPlayMs: activeMs, professionId: '', abilityId: '', workEnabled: false, paidUntil: 0 };
    next.children.push(child);
    detail = `${child.name}加入家庭；累積實際遊玩一週成長 1 歲，未成年時上學且課後可在家打工`;
  }
  if (action === 'familyWork') {
    const member = partnerId === 'spouse' ? next.spouse : next.children.find(child => child.id === partnerId);
    member.workEnabled = !member.workEnabled;
    detail = `${partnerId === 'spouse' ? familyPartnerById(member.partnerId).name : member.name}${member.workEnabled ? '加入帶薪排班' : '停止農場排班'}`;
  }
  if (action === 'familyCareer') {
    const member = partnerId === 'spouse' ? next.spouse : next.children.find(child => child.id === partnerId);
    const [professionId, abilityId] = hobbyId.split(':');
    member.professionId = professionId;
    member.abilityId = abilityId;
    detail = `${partnerId === 'spouse' ? familyPartnerById(member.partnerId).name : member.name}選擇${FAMILY_PROFESSIONS.find(item => item.id === professionId).name}與${FAMILY_ABILITIES.find(item => item.id === abilityId).name}`;
  }
  next.familyHistory = [{ at: now, detail }, ...next.familyHistory].slice(0, 40);
  return { farm: next, detail };
}
export function collectDivorceSettlement(next, previous) {
  if (!next.divorceSettlementDue || next.coins <= previous.coins) return next;
  const payment = Math.min(next.divorceSettlementDue, Math.floor((next.coins - previous.coins) / 2), Math.max(0, next.coins - 12));
  if (payment <= 0) return next;
  return { ...next, coins: next.coins - payment, divorceSettlementDue: next.divorceSettlementDue - payment };
}
