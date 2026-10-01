// Portraits use native emoji art so they remain legible without downloading images.
export const FARM_PROTAGONISTS = [
  { id: 'teacher', name: '小學老師', icon: '👩‍🏫', color: '#ffe3a1', gift: 'coins', amount: 90, skill: '農業小學校收入 +20%', story: '下課後到田裡，把課堂變成農場探險。' },
  { id: 'chef', name: '熱炒主廚', icon: '👨‍🍳', color: '#ffd0bd', gift: 'coins', amount: 70, skill: '熱炒餐廳收入 +20%', story: '白天研究料理，晚上兼職照料農田。' },
  { id: 'engineer', name: '太陽能工程師', icon: '👩‍🔧', color: '#bde5ff', gift: 'coins', amount: 65, skill: '光電賣電收入 +25%', story: '擅長設計綠能設備，也喜歡種菜。' },
  { id: 'vet', name: '獸醫師', icon: '👨‍⚕️', color: '#d6f4c3', gift: 'coins', amount: 75, skill: '動物產品每輪 +1 份', story: '照顧動物是本業，農場是第二個家。' },
  { id: 'merchant', name: '市場老闆', icon: '👩‍💼', color: '#f8d0eb', gift: 'coins', amount: 110, skill: '直銷超市收入 +20%', story: '懂得經營小生意，下班後耕種。' },
  { id: 'guide', name: '生態導覽員', icon: '🧑‍🦰', color: '#caeecf', gift: 'coins', amount: 80, skill: '觀光接待站門票收入 +20%', story: '帶遊客認識新化，也養自己的菜園。' },
  { id: 'mechanic', name: '農機技師', icon: '👨‍🔧', color: '#ddd2fa', gift: 'coins', amount: 95, skill: '災害金幣損失減半', story: '修理機器之餘，兼職經營農場。' },
  { id: 'artist', name: '插畫家', icon: '👩‍🎨', color: '#ffcdd3', gift: 'coins', amount: 85, skill: '貓咖與互動設施收入 +15%', story: '畫下農場四季，並養出新靈感。' },
  { id: 'programmer', name: '程式設計師', icon: '🧑‍💻', color: '#c7e3f5', gift: 'coins', amount: 100, skill: '雇用人力薪資 -10%', story: '用科技整理排班，假日來當農夫。' },
  { id: 'nurse', name: '護理師', icon: '👩‍⚕️', color: '#d1f4e9', gift: 'coins', amount: 80, skill: '首場負面事件免費免疫', story: '擅長照護，利用休假經營農場。' }
];

export const protagonistById = id => FARM_PROTAGONISTS.find(item => item.id === id);
export const REINCARNATION_COST = 800;
export function chooseProtagonist(farm, id) {
  const person = protagonistById(id);
  if (!person || farm.protagonistId) return null;
  return { ...farm, protagonistId: id, coins: farm.coins + person.amount, protagonistChosenAt: Date.now() };
}
