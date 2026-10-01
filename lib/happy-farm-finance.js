export const GOVERNMENT_LOAN_AMOUNT = 120;
export const GOVERNMENT_LOAN_TERM_MS = 24 * 60 * 60 * 1000;
// This reserve equals the starter carrot seed price. Keep it independent of the
// crop module so loan constants cannot read the catalogue during module startup.
export const SEED_RESERVE = 12;

export function governmentLoanBalance(farm) {
  return Math.max(0, Number(farm.governmentLoan?.balance || 0));
}

export function governmentLoanError(farm, action) {
  const balance = governmentLoanBalance(farm);
  if (action === 'borrowGovernment') {
    if (balance) return '請先還清原有政府借款。';
    if (farm.coins >= SEED_RESERVE || Object.values(farm.seeds || {}).some(count => Number(count) > 0)) {
      return '尚有足夠購買最便宜種苗的金幣或現成種苗，暫不符合紓困條件。';
    }
    return '';
  }
  if (action === 'repayGovernment') return balance && farm.coins > SEED_RESERVE ? '' : '尚無可償還餘額，或須保留最低種苗金。';
  return '未知借款操作。';
}

export function applyGovernmentLoan(farm, action, now) {
  const problem = governmentLoanError(farm, action);
  if (problem) throw new Error(problem);
  const next = structuredClone(farm);
  if (action === 'borrowGovernment') {
    next.coins += GOVERNMENT_LOAN_AMOUNT;
    next.governmentLoan = { balance: GOVERNMENT_LOAN_AMOUNT, borrowedAt: now, dueAt: now + GOVERNMENT_LOAN_TERM_MS };
    return { farm: next, detail: `借得 ${GOVERNMENT_LOAN_AMOUNT} 金幣，24 小時內零利率；未還清前免費開放參觀` };
  }
  const paid = Math.min(governmentLoanBalance(next), next.coins - SEED_RESERVE);
  next.coins -= paid;
  next.governmentLoan.balance -= paid;
  return { farm: next, detail: `償還 ${paid} 金幣，剩餘 ${next.governmentLoan.balance} 金幣` };
}

export function collectOverdueGovernmentLoan(farm, now) {
  const balance = governmentLoanBalance(farm);
  if (!balance || now < Number(farm.governmentLoan?.dueAt || Infinity)) return farm;
  const paid = Math.min(balance, Math.max(0, Number(farm.coins || 0) - SEED_RESERVE));
  if (!paid) return farm;
  const next = structuredClone(farm);
  next.coins -= paid;
  next.governmentLoan.balance -= paid;
  return next;
}
