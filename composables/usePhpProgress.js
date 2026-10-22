import { PHP_PROGRESS_OWNER, PHP_STORAGE_KEY, createDefaultPhpProgress } from '~/lib/php-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function usePhpProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: PHP_PROGRESS_OWNER,
    storageKey: PHP_STORAGE_KEY,
    createDefault: createDefaultPhpProgress,
    label: 'PHP'
  });
}
