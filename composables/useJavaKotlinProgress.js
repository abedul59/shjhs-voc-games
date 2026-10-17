import { createDefaultJavaKotlinProgress, JAVA_KOTLIN_PROGRESS_OWNER, JAVA_KOTLIN_STORAGE_KEY } from '~/lib/java-kotlin-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useJavaKotlinProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: JAVA_KOTLIN_PROGRESS_OWNER,
    storageKey: JAVA_KOTLIN_STORAGE_KEY,
    createDefault: createDefaultJavaKotlinProgress,
    label: 'Java/Kotlin'
  });
}
