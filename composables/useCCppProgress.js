import { C_CPP_PROGRESS_OWNER, C_CPP_STORAGE_KEY, createDefaultCCppProgress } from '~/lib/c-cpp-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useCCppProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: C_CPP_PROGRESS_OWNER,
    storageKey: C_CPP_STORAGE_KEY,
    createDefault: createDefaultCCppProgress,
    label: 'C/C++'
  });
}
