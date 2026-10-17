import { createDefaultReactProgress, REACT_PROGRESS_OWNER, REACT_STORAGE_KEY } from '~/lib/react-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useReactProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: REACT_PROGRESS_OWNER,
    storageKey: REACT_STORAGE_KEY,
    createDefault: createDefaultReactProgress,
    label: 'React/Next.js'
  });
}
