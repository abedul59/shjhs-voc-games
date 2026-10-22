import { GIT_PROGRESS_OWNER, GIT_STORAGE_KEY, createDefaultGitProgress } from '~/lib/git-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useGitProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: GIT_PROGRESS_OWNER,
    storageKey: GIT_STORAGE_KEY,
    createDefault: createDefaultGitProgress,
    label: 'Git'
  });
}
