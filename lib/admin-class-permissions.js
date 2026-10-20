export const SPECIAL_CLASS_PREFIX = 'SPECIAL:';

export function schoolClassNames() {
  const classes = ['000'];
  for (const grade of [7, 8, 9]) {
    for (let classNumber = 1; classNumber <= 10; classNumber += 1) {
      classes.push(`${grade}${String(classNumber).padStart(2, '0')}`);
    }
  }
  classes.push('999');
  return classes;
}

export function specialClassPermission(id) {
  return `${SPECIAL_CLASS_PREFIX}${id}`;
}

export function isSpecialClassPermission(value) {
  return typeof value === 'string' && value.startsWith(SPECIAL_CLASS_PREFIX);
}

export function specialClassIdFromPermission(value) {
  return isSpecialClassPermission(value) ? value.slice(SPECIAL_CLASS_PREFIX.length) : '';
}

export function regularClassPermissions(permissions = []) {
  return permissions.filter(value => value !== 'ALL' && !isSpecialClassPermission(value));
}

export function specialClassPermissionIds(permissions = []) {
  return permissions.map(specialClassIdFromPermission).filter(Boolean);
}

export function canAccessSpecialClass(id, permissions = [], isSuperAdmin = false) {
  return isSuperAdmin || permissions.includes(specialClassPermission(id));
}
