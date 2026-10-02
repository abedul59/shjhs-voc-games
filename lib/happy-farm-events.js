import { farmDay } from './happy-farm-calendar';
import { hasSpecialist } from './happy-farm-specialists';

const EVENT_POOL = {
  春季: [
    { id: 'spring_rain', icon: '🌧️', name: '春雨太急', type: 'crop', detail: '一塊作物成熟時間延後 2 分鐘。' },
    { id: 'spring_pests', icon: '🐛', name: '蟲蟲偷吃菜', type: 'pest', detail: '一塊作物出現蟲害，記得除蟲。' },
    { id: 'spring_market', icon: '🎪', name: '新化春市', type: 'bonus', detail: '市集人氣帶來 35 金幣。' }
  ],
  夏季: [
    { id: 'typhoon', icon: '🌀', name: '颱風警報', type: 'crop', detail: '一塊作物成熟時間延後 2 分鐘。' },
    { id: 'summer_flood', icon: '🌊', name: '豪雨積水', type: 'cost', detail: '清理排水溝支出 35 金幣。' },
    { id: 'summer_power', icon: '⚡', name: '停電搶修', type: 'cost', detail: '搶修設施支出 30 金幣。' }
  ],
  秋季: [
    { id: 'autumn_wind', icon: '🍂', name: '東北季風', type: 'crop', detail: '一塊作物成熟時間延後 2 分鐘。' },
    { id: 'autumn_mixup', icon: '📦', name: '貨運送錯箱', type: 'cost', detail: '重新配送支出 25 金幣。' },
    { id: 'harvest_fair', icon: '🎉', name: '豐收嘉年華', type: 'bonus', detail: '遊客消費帶來 40 金幣。' }
  ],
  冬季: [
    { id: 'cold', icon: '🥶', name: '寒流來襲', type: 'animal', detail: '一種動物需要重新整理棲地。' },
    { id: 'winter_drought', icon: '🚰', name: '冬季缺水', type: 'cost', detail: '調度用水支出 30 金幣。' },
    { id: 'warm_neighbor', icon: '🤝', name: '鄰里互助日', type: 'bonus', detail: '鄰居送來 30 金幣物資。' }
  ]
};
const hash = value => [...value].reduce((sum, letter) => (sum * 33 + letter.charCodeAt(0)) >>> 0, 5381);
export const freshEventState = now => ({ lastEventDay: farmDay(now).date, eventHistory: [], disasterShield: false, nurseRecoveryUsed: false });
export const withEventState = (farm, now) => ({
  ...farm,
  lastEventDay: farm.lastEventDay || farmDay(now).date,
  eventHistory: Array.isArray(farm.eventHistory) ? farm.eventHistory.slice(0, 12) : [],
  disasterShield: !!farm.disasterShield,
  nurseRecoveryUsed: !!farm.nurseRecoveryUsed
});

export function settleSeasonalEvent(farm, now) {
  const day = farmDay(now);
  if (!farm.protagonistId || farm.lastEventDay === day.date) return null;
  const next = JSON.parse(JSON.stringify(farm));
  next.lastEventDay = day.date;
  const roll = hash(`${day.date}:${farm.homeVillage}:${farm.protagonistId}`);
  if (roll % 10 >= 6) return { farm: next, detail: '今天農場平安無事。' };
  const event = EVENT_POOL[day.season][roll % EVENT_POOL[day.season].length];
  let effect = event.detail;
  if (next.protagonistId === 'nurse' && !next.nurseRecoveryUsed && event.type !== 'bonus') {
    next.nurseRecoveryUsed = true;
    effect = '護理師的應變能力免除第一場負面事件！';
  } else if (next.disasterShield && event.type !== 'bonus') {
    next.disasterShield = false;
    effect = '防災整備成功，免除這次損失！';
  } else if (event.type === 'cost') {
    const cost = event.id === 'summer_flood' ? 35 : event.id === 'autumn_mixup' ? 25 : 30;
    const discounted = hasSpecialist(next, 'legal', now) ? Math.ceil(cost / 2) : cost;
    const paid = Math.min(next.coins, next.protagonistId === 'mechanic' ? Math.ceil(discounted / 2) : discounted);
    next.coins -= paid;
    effect = `支出 ${paid} 金幣。`;
  } else if (event.type === 'bonus') {
    const gain = event.id === 'harvest_fair' ? 40 : event.id === 'spring_market' ? 35 : 30;
    next.coins += gain;
    effect = `獲得 ${gain} 金幣。`;
  } else if (event.type === 'animal') {
    const pen = Object.values(next.animals || {}).find(item => item?.care && Object.keys(item.care).length);
    if (pen) { pen.care = {}; effect = '一種動物的照護進度重置。'; }
    else effect = '動物已妥善照護，沒有損失。';
  } else {
    const plot = next.plots.find(item => item?.crop && item.readyAt > now);
    if (plot) {
      if (event.type === 'pest') { plot.pestRemoved = false; plot.pestAt = now; effect = '一塊作物需要除蟲。'; }
      else { plot.readyAt += 120000; effect = '一塊作物延後 2 分鐘成熟。'; }
    } else effect = '當時沒有未成熟作物，沒有損失。';
  }
  const entry = { at: now, icon: event.icon, name: event.name, season: day.season, detail: effect, type: event.type };
  next.eventHistory = [entry, ...(next.eventHistory || [])].slice(0, 12);
  return { farm: next, detail: `${event.icon} ${event.name}：${effect}` };
}

export const DISASTER_PREP_COST = 65;
export function prepareDisaster(farm) {
  if (farm.disasterShield || farm.coins < DISASTER_PREP_COST) return null;
  return { farm: { ...farm, coins: farm.coins - DISASTER_PREP_COST, disasterShield: true }, detail: '防災整備完成，可擋下一次損失事件。' };
}
