export const adminFeatureGroups = [
  {
    id: 'reports',
    label: '報表、監控與出題',
    features: [
      { id: 'verb-mastery', label: '動詞變化精熟度分析', path: '/admin/verb-mastery' },
      { id: 'records', label: '紀錄報表', path: '/admin/records' },
      { id: 'stats', label: '對錯分析', path: '/admin/stats' },
      { id: 'leaderboard', label: '英雄榜', path: '/admin/leaderboard' },
      { id: 'logs', label: '登入紀錄', path: '/admin/logs' },
      { id: 'student-logs', label: '學生足跡', path: '/admin/student-logs' },
      {
        id: 'live-activity',
        label: '學生動態與專注監控',
        path: '/admin/live-activity',
        aliases: ['/admin/focus-monitor']
      },
      { id: 'vocab-exam-generator', label: '單字會考出題器', path: '/admin/vocab-exam-generator' },
      { id: 'regular-exam-generator', label: '段考出題器', path: '/admin/regular-exam-generator', aliases: ['/admin/vocabulary-scope-reviewer'] },
      { id: 'grammar-stats', label: '學生文法答題分析', path: '/admin/grammar-stats' },
      { id: 'exam-stats', label: '會考單題數據分析', path: '/admin/exam-stats' },
      { id: 'exam-stats2', label: '會考題組數據分析', path: '/admin/exam-stats2' }
    ]
  },
  {
    id: 'content',
    label: '題庫與教學內容管理',
    features: [
      { id: 'manage-verbs', label: '不規則動詞管理', path: '/admin/manage-verbs' },
      { id: 'speakno3-manager', label: '口說學霸3（歌單管理）', path: '/admin/speakno3-manager' },
      { id: 'speakno1-manager', label: '口說學霸（分年級句子）', path: '/admin/speakno1-manager' },
      { id: 'speakno2-manager', label: '口說學霸2（文章管理）', path: '/admin/speakno2-manager' },
      { id: 'manage-grammar', label: '文法題庫管理', path: '/admin/manage-grammar' },
      { id: 'vocabularies', label: '編輯單字庫', path: '/admin/vocabularies' },
      { id: 'categories', label: '前台排版管理', path: '/admin/categories' },
      { id: 'alchemy-characters', label: '鍊金工房角色管理', path: '/admin/alchemy-characters' },
      { id: 'manage-announcements', label: '公佈欄管理', path: '/admin/manage-announcements' },
      { id: 'import-exam', label: '會考題庫匯入', path: '/admin/import-exam' },
      { id: 'manage-exam', label: '會考單題題庫管理', path: '/admin/manage-exam' },
      { id: 'manage-exam2', label: '會考題組題庫管理', path: '/admin/manage-exam2' }
    ]
  },
  {
    id: 'student-management',
    label: '學生與遊戲管理',
    features: [
      { id: 'access', label: '遊戲權限與時間管理', path: '/admin/access' },
      { id: 'game-unlocks', label: '班級遊戲達標解鎖', path: '/admin/game-unlocks' },
      { id: 'students', label: '學生名單管理', path: '/admin/students' },
      { id: 'teacher-logs', label: '教師足跡追蹤', path: '/admin/teacher-logs' },
      { id: 'tarot-manager', label: '塔羅牌手動發放', path: '/admin/tarot-manager' },
      { id: 'tenchi-manager', label: '吞食天地兵法庫', path: '/admin/tenchi-manager' }
    ]
  }
];

export const adminFeatureCatalog = adminFeatureGroups.flatMap(group => group.features);

// 保留既有教師後台原本看得到的功能，避免上線後突然失去既有權限。
export const defaultTeacherFeatureIds = adminFeatureGroups[0].features.map(feature => feature.id);

export const normalizeTeacherFeatureIds = (value, fallback = defaultTeacherFeatureIds) => {
  if (!Array.isArray(value)) return [...fallback];
  const validIds = new Set(adminFeatureCatalog.map(feature => feature.id));
  const compatibleIds = value.map(id => id === 'focus-monitor' ? 'live-activity' : id);
  return [...new Set(compatibleIds.filter(id => validIds.has(id)))];
};

export const findAdminFeatureByPath = (path = '') => adminFeatureCatalog.find(feature => (
  path === feature.path
  || path.startsWith(`${feature.path}/`)
  || feature.aliases?.some(alias => path === alias || path.startsWith(`${alias}/`))
));

export const canTeacherUseAdminPath = (path, featureIds) => {
  if (path === '/admin' || path === '/admin/') return true;
  const feature = findAdminFeatureByPath(path);
  if (!feature) return false;
  return normalizeTeacherFeatureIds(featureIds).includes(feature.id);
};
