import { ref } from 'vue';

export function usePrivateProgrammingProgress({ ownerKey, storageKey, createDefault, label }) {
  const supabase = useSupabaseClient();
  const isLoading = ref(false);
  const isSaving = ref(false);
  const syncError = ref('');
  const migratedFromBrowser = ref(false);

  function normalize(value) {
    const fallback = createDefault();
    if (!value || typeof value !== 'object') return fallback;
    return { ...fallback, ...value, lessons: value.lessons && typeof value.lessons === 'object' ? value.lessons : {} };
  }

  function readLegacy() {
    if (!import.meta.client) return null;
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return value?.lessons ? normalize(value) : null;
    } catch {
      return null;
    }
  }

  async function saveProgress(value) {
    isSaving.value = true;
    syncError.value = '';
    const progress = normalize(value);
    try {
      const { error } = await supabase
        .from('nuxt_learning_progress')
        .upsert({ owner_key: ownerKey, progress, updated_at: new Date().toISOString() }, { onConflict: 'owner_key' });
      if (error) throw error;
      return progress;
    } catch (error) {
      console.error(`${label} progress save failed:`, error);
      syncError.value = '無法同步至資料庫，請檢查連線後再試。';
      throw error;
    } finally {
      isSaving.value = false;
    }
  }

  async function loadProgress() {
    isLoading.value = true;
    syncError.value = '';
    try {
      const { data, error } = await supabase
        .from('nuxt_learning_progress')
        .select('progress')
        .eq('owner_key', ownerKey)
        .maybeSingle();
      if (error) throw error;
      if (data?.progress) return normalize(data.progress);
      const legacy = readLegacy();
      const initial = legacy || createDefault();
      await saveProgress(initial);
      if (legacy && import.meta.client) {
        localStorage.removeItem(storageKey);
        migratedFromBrowser.value = true;
      }
      return initial;
    } catch (error) {
      console.error(`${label} progress load failed:`, error);
      syncError.value = '無法讀取資料庫進度，暫時不開放保存。請稍後重新整理。';
      return readLegacy() || createDefault();
    } finally {
      isLoading.value = false;
    }
  }

  return { isLoading, isSaving, syncError, migratedFromBrowser, loadProgress, saveProgress };
}
