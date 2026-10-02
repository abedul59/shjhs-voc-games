import { cropById, farmhouseReserved } from './happy-farm';

export const RESEARCH_CENTER_COST = 680;
export const RESEARCH_MAX_LEVEL = 3;
export const researchLevel = (farm, cropId) => Math.min(RESEARCH_MAX_LEVEL, Math.max(0, Number(farm.cropResearch?.[cropId]) || 0));
export const researchUpgradeCost = (farm, cropId) => 180 + researchLevel(farm, cropId) * 220;
export const freshResearchState = () => ({ cropResearch: {}, researchHistory: [] });
export function withResearchState(farm) {
  return { ...farm, cropResearch: farm.cropResearch && typeof farm.cropResearch === 'object' ? farm.cropResearch : {},
    researchHistory: Array.isArray(farm.researchHistory) ? farm.researchHistory.slice(0, 35) : [] };
}
export function researchActionError(farm, action, plotIndex, cropId) {
  if (action === 'buildResearch') {
    if (!Number.isInteger(plotIndex) || !farm.ownedVillages?.includes(farm.plotVillages?.[plotIndex]) || farm.plots?.[plotIndex] !== null || farmhouseReserved(farm, plotIndex)) return '請選擇自己擁有、未保留的一格空地。';
    if (farm.plots.some(plot => plot?.facility === 'agri_research')) return '已有農業科技研發中心。';
    return farm.coins >= RESEARCH_CENTER_COST ? '' : `建設需要 ${RESEARCH_CENTER_COST} 金幣。`;
  }
  if (action === 'upgradeCrop') {
    if (!farm.plots.some(plot => plot?.facility === 'agri_research')) return '請先建立農業科技研發中心。';
    if (!cropById(cropId)) return '找不到作物。';
    if (researchLevel(farm, cropId) >= RESEARCH_MAX_LEVEL) return '這種作物已研發至最高等級。';
    return farm.coins >= researchUpgradeCost(farm, cropId) ? '' : `研發需 ${researchUpgradeCost(farm, cropId)} 金幣。`;
  }
  return '無法執行研發操作。';
}
export function applyResearchAction(farm, action, plotIndex, cropId, now = Date.now()) {
  const error = researchActionError(farm, action, plotIndex, cropId);
  if (error) throw new Error(error);
  const next = JSON.parse(JSON.stringify(farm));
  let detail;
  if (action === 'buildResearch') {
    next.coins -= RESEARCH_CENTER_COST;
    next.plots[plotIndex] = { facility: 'agri_research' };
    detail = `農業科技研發中心已建成，佔用一格自有農地；花費 ${RESEARCH_CENTER_COST} 金幣`;
  } else {
    const cost = researchUpgradeCost(next, cropId);
    next.coins -= cost;
    next.cropResearch ||= {};
    next.cropResearch[cropId] = researchLevel(next, cropId) + 1;
    const effect = ['每次收成 +1', '生長時間縮短 20%', '自動完成除草與除蟲'][next.cropResearch[cropId] - 1];
    detail = `${cropById(cropId).name}研發至第 ${next.cropResearch[cropId]} 級：${effect}；支出 ${cost} 金幣。效果從下一次播種開始`;
  }
  next.researchHistory = [{ at: now, detail }, ...(next.researchHistory || [])].slice(0, 35);
  return { farm: next, detail };
}
