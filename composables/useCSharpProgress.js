import { CSHARP_PROGRESS_OWNER, CSHARP_STORAGE_KEY, createDefaultCSharpProgress } from '~/lib/csharp-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useCSharpProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: CSHARP_PROGRESS_OWNER,
    storageKey: CSHARP_STORAGE_KEY,
    createDefault: createDefaultCSharpProgress,
    label: 'C#/.NET'
  });
}
