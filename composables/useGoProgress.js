import { ref } from 'vue';
import { createDefaultGoProgress, GO_PROGRESS_OWNER, GO_STORAGE_KEY } from '~/lib/go-course';

function normalizeProgress(value) {
  const fallback = createDefaultGoProgress();
  if (!value || typeof value !== 'object') return fallback;
  return { ...fallback, ...value, lessons: value.lessons && typeof value.lessons === 'object' ? value.lessons : {} };
}

function readLegacyProgress() {
  if (!import.meta.client) return null;
  try {
    const value = JSON.parse(localStorage.getItem(GO_STORAGE_KEY) || 'null');
    return value?.lessons ? normalizeProgress(value) : null;
  } catch { return null; }
}

export function useGoProgress() {
  const supabase = useSupabaseClient();
  const isLoading = ref(false);
  const isSaving = ref(false);
  const syncError = ref('');
  const migratedFromBrowser = ref(false);

  async function saveProgress(value) {
    isSaving.value = true;
    syncError.value = '';
    const progress = normalizeProgress(value);
    try {
      const { error } = await supabase.from('go_learning_progress').upsert({
        owner_key: GO_PROGRESS_OWNER, progress, updated_at: new Date().toISOString()
      }, { onConflict: 'owner_key' });
      if (error) throw error;
      return progress;
    } catch (error) {
      console.error('Go progress save failed:', error);
      syncError.value = '無法同步至資料庫，請檢查連線或資料表設定後再試。';
      throw error;
    } finally { isSaving.value = false; }
  }

  async function loadProgress() {
    isLoading.value = true;
    syncError.value = '';
    try {
      const { data, error } = await supabase.from('go_learning_progress')
        .select('progress').eq('owner_key', GO_PROGRESS_OWNER).maybeSingle();
      if (error) throw error;
      if (data?.progress) return normalizeProgress(data.progress);
      const legacy = readLegacyProgress();
      const initial = legacy || createDefaultGoProgress();
      await saveProgress(initial);
      if (legacy && import.meta.client) {
        localStorage.removeItem(GO_STORAGE_KEY);
        migratedFromBrowser.value = true;
      }
      return initial;
    } catch (error) {
      console.error('Go progress load failed:', error);
      syncError.value = '無法讀取資料庫進度，暫時不開放保存。請稍後重新整理。';
      return readLegacyProgress() || createDefaultGoProgress();
    } finally { isLoading.value = false; }
  }

  return { isLoading, isSaving, syncError, migratedFromBrowser, loadProgress, saveProgress };
}
