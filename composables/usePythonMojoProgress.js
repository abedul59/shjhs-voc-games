import { PYTHON_MOJO_PROGRESS_OWNER, PYTHON_MOJO_STORAGE_KEY, createDefaultPythonMojoProgress } from '~/lib/python-mojo-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function usePythonMojoProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: PYTHON_MOJO_PROGRESS_OWNER,
    storageKey: PYTHON_MOJO_STORAGE_KEY,
    createDefault: createDefaultPythonMojoProgress,
    label: 'Python/Mojo'
  });
}
