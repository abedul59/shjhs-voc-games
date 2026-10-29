export const ALL_VOCAB_SCOPE = Object.freeze({ mode: 'ALL', scopes: [] });

const clean = (value) => String(value ?? '').trim();

export const vocabScopeKey = (version, volume = '*', unit = '*') =>
  [clean(version), clean(volume) || '*', clean(unit) || '*'].join('|');

export const normalizeVocabScope = (value) => {
  if (!value || typeof value !== 'object' || value.mode !== 'CUSTOM') {
    return { mode: 'ALL', scopes: [] };
  }

  const scopes = [...new Set((Array.isArray(value.scopes) ? value.scopes : [])
    .map(clean)
    .filter((scope) => {
      const parts = scope.split('|');
      return parts.length === 3 && Boolean(parts[0]);
    }))].sort((left, right) => left.localeCompare(right, 'zh-Hant'));

  return { mode: 'CUSTOM', scopes };
};

export const sameVocabScope = (left, right) => {
  const a = normalizeVocabScope(left);
  const b = normalizeVocabScope(right);
  return a.mode === b.mode && a.scopes.length === b.scopes.length
    && a.scopes.every((scope, index) => scope === b.scopes[index]);
};

export const isVocabScopeAllowed = (policy, lesson) => {
  const normalized = normalizeVocabScope(policy);
  if (normalized.mode === 'ALL') return true;

  const version = clean(lesson?.version);
  const volume = clean(lesson?.volume);
  const unit = clean(lesson?.unit);
  if (!version) return false;

  return normalized.scopes.includes(vocabScopeKey(version))
    || (volume && normalized.scopes.includes(vocabScopeKey(version, volume)))
    || (volume && unit && normalized.scopes.includes(vocabScopeKey(version, volume, unit)));
};

export const formatVocabScope = (scope) => {
  const [version, volume, unit] = clean(scope).split('|');
  if (!version) return '';
  if (volume === '*') return `${version}（整個版本）`;
  if (unit === '*') return `${version} · ${volume}（整冊）`;
  return `${version} · ${volume} · ${unit}`;
};
