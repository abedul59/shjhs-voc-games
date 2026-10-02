export const freshAccountingState = () => ({ accountingTotals: {}, accountingEntries: [], accountingSequence: 0 });
export const plotAccountSource = (index, plot) => `plot-${index}-${plot?.facility || plot?.crop || 'land'}`;
export function withAccountingState(farm) {
  return { ...farm,
    accountingTotals: farm.accountingTotals && typeof farm.accountingTotals === 'object' ? farm.accountingTotals : {},
    accountingEntries: Array.isArray(farm.accountingEntries) ? farm.accountingEntries.slice(0, 100) : [],
    accountingSequence: Math.max(0, Number(farm.accountingSequence) || 0) };
}
export function recordAccounting(farm, source, label, delta, detail, at = Date.now()) {
  if (!delta) return farm;
  const next = farm;
  next.accountingTotals ||= {};
  next.accountingEntries ||= [];
  next.accountingSequence = (Number(next.accountingSequence) || 0) + 1;
  const previous = next.accountingTotals[source] || { label, income: 0, expense: 0 };
  next.accountingTotals[source] = { label, income: previous.income + Math.max(0, delta), expense: previous.expense + Math.max(0, -delta) };
  next.accountingEntries = [{ id: next.accountingSequence, source, label, delta, detail, at }, ...next.accountingEntries].slice(0, 100);
  return next;
}
export function accountUnrecorded(previous, next, source, label, detail, at = Date.now()) {
  const oldSeq = Number(previous.accountingSequence) || 0;
  const recorded = (next.accountingEntries || []).filter(entry => entry.id > oldSeq).reduce((sum, entry) => sum + entry.delta, 0);
  const delta = (Number(next.coins) || 0) - (Number(previous.coins) || 0) - recorded;
  return recordAccounting(next, source, label, delta, detail, at);
}
