import { createDefaultSvelteProgress, SVELTE_PROGRESS_OWNER, SVELTE_STORAGE_KEY } from '~/lib/svelte-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useSvelteProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: SVELTE_PROGRESS_OWNER,
    storageKey: SVELTE_STORAGE_KEY,
    createDefault: createDefaultSvelteProgress,
    label: 'Svelte/SvelteKit'
  });
}
