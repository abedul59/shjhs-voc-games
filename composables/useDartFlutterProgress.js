import { DART_FLUTTER_PROGRESS_OWNER, DART_FLUTTER_STORAGE_KEY, createDefaultDartFlutterProgress } from '~/lib/dart-flutter-course';
import { usePrivateProgrammingProgress } from './usePrivateProgrammingProgress';

export function useDartFlutterProgress() {
  return usePrivateProgrammingProgress({
    ownerKey: DART_FLUTTER_PROGRESS_OWNER,
    storageKey: DART_FLUTTER_STORAGE_KEY,
    createDefault: createDefaultDartFlutterProgress,
    label: 'Dart／Flutter'
  });
}
