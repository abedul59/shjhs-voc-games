const themes = {
  emerald: { color: '#059669', hover: '#047857', light: '#ecfdf5', active: '#d1fae5', cardClass: 'law-emerald' },
  amber: { color: '#d97706', hover: '#b45309', light: '#fffbeb', active: '#fef3c7', cardClass: 'law-amber' },
  rose: { color: '#e11d48', hover: '#be123c', light: '#fff1f2', active: '#ffe4e6', cardClass: 'law-rose' },
  indigo: { color: '#4f46e5', hover: '#4338ca', light: '#eef2ff', active: '#e0e7ff', cardClass: 'law-indigo' },
  violet: { color: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff', active: '#ede9fe', cardClass: 'law-violet' },
  cyan: { color: '#0891b2', hover: '#0e7490', light: '#ecfeff', active: '#cffafe', cardClass: 'law-cyan' },
  sky: { color: '#0284c7', hover: '#0369a1', light: '#f0f9ff', active: '#e0f2fe', cardClass: 'law-sky' },
  teal: { color: '#0f766e', hover: '#115e59', light: '#f0fdfa', active: '#ccfbf1', cardClass: 'law-teal' },
  orange: { color: '#ea580c', hover: '#c2410c', light: '#fff7ed', active: '#ffedd5', cardClass: 'law-orange' },
  gray: { color: '#374151', hover: '#1f2937', light: '#f3f4f6', active: '#e5e7eb', cardClass: 'law-gray' }
};

const law = (slug, title, table, icon, theme, group, scopeNote = '') => ({
  slug,
  title,
  table,
  icon,
  group,
  scopeNote,
  ...themes[theme]
});

export const LAND_REGULATIONS = [
  law('land-registration-rules', '土地登記規則', 'land_registration_rules_clauses', '📜', 'emerald', '既有核心法規'),
  law('land-act', '土地法', 'land_act_clauses', '🏞️', 'amber', '既有核心法規'),
  law('land-tax-act', '土地稅法', 'land_tax_act_clauses', '💰', 'rose', '既有核心法規'),

  law('trust-act', '信託法', 'trust_act_clauses', '🤝', 'indigo', '核心考試法規'),
  law('land-act-enforcement-act', '土地法施行法', 'land_act_enforcement_act_clauses', '📘', 'sky', '核心考試法規'),
  law('equalization-land-rights-act', '平均地權條例', 'equalization_land_rights_act_clauses', '⚖️', 'violet', '核心考試法規'),
  law('equalization-land-rights-enforcement-rules', '平均地權條例施行細則', 'equalization_land_rights_enforcement_rules_clauses', '📋', 'cyan', '核心考試法規'),
  law('land-expropriation-act', '土地徵收條例', 'land_expropriation_act_clauses', '🏗️', 'orange', '核心考試法規'),
  law('land-expropriation-act-enforcement-rules', '土地徵收條例施行細則', 'land_expropriation_act_enforcement_rules_clauses', '🧾', 'amber', '核心考試法規'),
  law('land-tax-act-enforcement-rules', '土地稅法施行細則', 'land_tax_act_enforcement_rules_clauses', '🧮', 'rose', '核心考試法規'),
  law('deed-tax-act', '契稅條例', 'deed_tax_act_clauses', '🏠', 'emerald', '核心考試法規'),
  law('house-tax-act', '房屋稅條例', 'house_tax_act_clauses', '🏘️', 'teal', '核心考試法規'),
  law('estate-gift-tax-act', '遺產及贈與稅法', 'estate_gift_tax_act_clauses', '🎁', 'indigo', '核心考試法規', '本專區以不動產繼承、贈與、估價及申報相關條文為收錄範圍。'),
  law('estate-gift-tax-act-enforcement-rules', '遺產及贈與稅法施行細則', 'estate_gift_tax_act_enforcement_rules_clauses', '📑', 'violet', '核心考試法規', '本專區以不動產繼承、贈與、估價及申報相關條文為收錄範圍。'),

  law('land-administration-agent-act', '地政士法', 'land_administration_agent_act_clauses', '🪪', 'emerald', '地政士與登記實務'),
  law('land-administration-agent-act-enforcement-rules', '地政士法施行細則', 'land_administration_agent_act_enforcement_rules_clauses', '📄', 'cyan', '地政士與登記實務'),
  law('cadastral-survey-implementation-rules', '地籍測量實施規則', 'cadastral_survey_implementation_rules_clauses', '📐', 'orange', '地政士與登記實務'),

  law('urban-planning-act', '都市計畫法', 'urban_planning_act_clauses', '🏙️', 'indigo', '土地使用及計畫法規'),
  law('urban-planning-act-enforcement-rules', '都市計畫法臺灣省施行細則', 'urban_planning_act_enforcement_rules_clauses', '🗺️', 'sky', '土地使用及計畫法規'),
  law('regional-plan-act', '區域計畫法', 'regional_plan_act_clauses', '🌐', 'violet', '土地使用及計畫法規'),
  law('regional-plan-act-enforcement-rules', '區域計畫法施行細則', 'regional_plan_act_enforcement_rules_clauses', '🧭', 'teal', '土地使用及計畫法規'),
  law('spatial-planning-act', '國土計畫法', 'spatial_planning_act_clauses', '🇹🇼', 'amber', '土地使用及計畫法規')
];

export const LAND_REGULATION_MAP = Object.fromEntries(LAND_REGULATIONS.map(item => [item.slug, item]));

export const LAND_REGULATION_GROUPS = [...new Set(LAND_REGULATIONS.map(item => item.group))].map(name => ({
  name,
  laws: LAND_REGULATIONS.filter(item => item.group === name)
}));
