import { CONTAINER_PROGRESS_OWNER, CONTAINER_STORAGE_KEY, createDefaultContainerProgress } from '~/lib/container-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useContainerProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: CONTAINER_PROGRESS_OWNER,
    storageKey: CONTAINER_STORAGE_KEY,
    createDefault: createDefaultContainerProgress,
    label: 'Docker／Podman'
  });
}
