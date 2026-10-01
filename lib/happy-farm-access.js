export const farmLessonKey = lesson => `${lesson.version}|${lesson.volume}|${lesson.unit}`;
export const farmPolicyTableMissing = error => ['42P01', 'PGRST205'].includes(error?.code);
export function farmLessonAllowed(policy, lesson) {
  if (!policy || policy.mode === 'all') return true;
  const listed = Array.isArray(policy.units) && policy.units.includes(farmLessonKey(lesson));
  return policy.mode === 'allow' ? listed : !listed;
}
