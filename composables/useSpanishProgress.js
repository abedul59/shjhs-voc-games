import { SPANISH_PROGRESS_OWNER, SPANISH_STORAGE_KEY, createDefaultSpanishProgress } from '~/lib/spanish-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useSpanishProgress() {
  return usePrivateProgrammingProgress({ ownerKey: SPANISH_PROGRESS_OWNER, storageKey: SPANISH_STORAGE_KEY, createDefault: createDefaultSpanishProgress, label: '西班牙語' });
}
