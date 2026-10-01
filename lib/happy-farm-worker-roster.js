// Fictional rotating candidates; employment values are game balance only.
export const WORKER_CANDIDATES = [
  { id: 'ahe', name: '阿禾', group: '台灣人', roles: ['crops', 'animals'], languages: ['中文'] },
  { id: 'xiaotang', name: '小棠', group: '台灣人', roles: ['crops', 'service'], languages: ['中文', '英語'] },
  { id: 'mumu', name: '沐沐', group: '台灣人', roles: ['animals', 'processing', 'energy'], languages: ['中文'] },
  { id: 'mina', name: 'Mina', group: '移工', gender: 'female', roles: ['crops', 'service'], languages: ['中文', '英語'] },
  { id: 'rafi', name: 'Rafi', group: '移工', gender: 'male', roles: ['animals', 'processing', 'service'], languages: ['中文'] },
  { id: 'lina', name: 'Lina', group: '移工', gender: 'female', roles: ['processing', 'service', 'energy'], languages: ['中文', '英語'] },
  { id: 'xiaoyu', name: '小雨', group: '台灣人', roles: ['animals', 'service'], languages: ['中文', '英語'] },
  { id: 'azhe', name: '阿哲', group: '台灣人', roles: ['energy', 'processing', 'crops'], languages: ['中文'] },
  { id: 'wenny', name: '文妮', group: '台灣人', roles: ['service', 'processing'], languages: ['中文', '英語'] },
  { id: 'agui', name: '阿貴', group: '台灣人', roles: ['crops', 'energy'], languages: ['中文'] },
  { id: 'yoyo', name: '優優', group: '台灣人', roles: ['animals', 'crops'], languages: ['中文', '英語'] },
  { id: 'bohan', name: '柏翰', group: '台灣人', roles: ['service', 'energy'], languages: ['中文', '英語'] },
  { id: 'sari', name: 'Sari', group: '移工', gender: 'female', roles: ['animals', 'service'], languages: ['中文', '英語'] },
  { id: 'andi', name: 'Andi', group: '移工', gender: 'male', roles: ['crops', 'processing'], languages: ['中文'] },
  { id: 'nuri', name: 'Nuri', group: '移工', gender: 'female', roles: ['processing', 'animals'], languages: ['中文', '英語'] },
  { id: 'budi', name: 'Budi', group: '移工', gender: 'male', roles: ['service', 'energy'], languages: ['中文', '英語'] },
  { id: 'may', name: 'May', group: '移工', gender: 'female', roles: ['crops', 'animals'], languages: ['中文'] },
  { id: 'somchai', name: 'Somchai', group: '移工', gender: 'male', roles: ['crops', 'service'], languages: ['中文', '英語'] }
];
export const workerById = id => WORKER_CANDIDATES.find(person => person.id === id);
export const workerMarketSlot = now => Math.floor((now + 8 * 3600000) / (3 * 3600000));
export function workerMarket(now, hired = []) {
  const slot = workerMarketSlot(now);
  const rotating = WORKER_CANDIDATES.map((person, index) => ({ person, key: (index * 11 + slot * 7) % 19 }))
    .sort((a, b) => a.key - b.key).slice(0, 10).map(item => item.person);
  const keep = hired.map(item => workerById(item.id)).filter(Boolean);
  return [...new Map([...keep, ...rotating].map(person => [person.id, person])).values()];
}
