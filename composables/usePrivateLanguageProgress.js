import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function usePrivateLanguageProgress(course) {
  return usePrivateProgrammingProgress({
    ownerKey: course.ownerKey,
    storageKey: course.storageKey,
    createDefault: course.createDefault,
    label: course.name
  });
}
