<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  adminFeatureCatalog,
  adminFeatureGroups,
  defaultTeacherFeatureIds,
  normalizeTeacherFeatureIds
} from '~/lib/admin-feature-permissions';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const isAdminCookie = useCookie('isAdmin');
const authCookie = useCookie('teacher_auth');
const selectedFeatures = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);
const statusMessage = ref('');
const errorMessage = ref('');

const isSuperAdmin = computed(() => (
  isAdminCookie.value === true
  || isAdminCookie.value === 'superadmin'
  || authCookie.value?.classes?.includes('ALL')
));

const selectedCount = computed(() => selectedFeatures.value.length);
const allFeatureIds = adminFeatureCatalog.map(feature => feature.id);

const selectAll = () => {
  selectedFeatures.value = [...allFeatureIds];
  statusMessage.value = '';
};

const clearAll = () => {
  selectedFeatures.value = [];
  statusMessage.value = '';
};

const restoreDefaults = () => {
  selectedFeatures.value = [...defaultTeacherFeatureIds];
  statusMessage.value = '';
};

const loadSettings = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  const { data, error } = await supabase
    .from('teacher_admin_feature_settings')
    .select('allowed_features')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    errorMessage.value = `無法讀取設定：${error.message}。請先執行本功能附帶的 Supabase migration。`;
    selectedFeatures.value = [...defaultTeacherFeatureIds];
  } else {
    selectedFeatures.value = data
      ? normalizeTeacherFeatureIds(data.allowed_features, [])
      : [...defaultTeacherFeatureIds];
  }

  isLoading.value = false;
};

const saveSettings = async () => {
  if (!isSuperAdmin.value) return;

  isSaving.value = true;
  statusMessage.value = '';
  errorMessage.value = '';

  const allowedFeatures = normalizeTeacherFeatureIds(selectedFeatures.value, []);
  const { error } = await supabase
    .from('teacher_admin_feature_settings')
    .upsert({
      id: 1,
      allowed_features: allowedFeatures,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    errorMessage.value = `儲存失敗：${error.message}`;
  } else {
    selectedFeatures.value = allowedFeatures;
    statusMessage.value = '設定已儲存。已登入的教師請登出後重新登入，才會套用最新權限。';
  }

  isSaving.value = false;
};

onMounted(async () => {
  if (!isSuperAdmin.value) {
    await navigateTo('/admin');
    return;
  }
  await loadSettings();
});
</script>

<template>
  <main class="permission-page">
    <div class="page-header">
      <NuxtLink to="/admin" class="back-link">← 返回管理後台</NuxtLink>
      <div>
        <h1>🧩 教師後台功能開放設定</h1>
        <p>設定教師同仁使用自己的後台密碼登入後，可以看見並使用哪些功能。</p>
      </div>
    </div>

    <section class="notice-card">
      <strong>權限規則</strong>
      <ul>
        <li>未勾選的功能不會顯示按鈕，直接輸入網址也會被導回後台首頁。</li>
        <li>教師帳號管理、教師功能權限、司律專區、系統設定、升年級與資料清理只限總管理員。</li>
        <li>儲存後，教師必須登出再重新登入，才會取得最新功能清單。</li>
      </ul>
    </section>

    <section class="permission-card">
      <div class="toolbar">
        <strong>目前開放 {{ selectedCount }} / {{ adminFeatureCatalog.length }} 項</strong>
        <div class="toolbar-actions">
          <button type="button" @click="selectAll">全部勾選</button>
          <button type="button" @click="clearAll">全部取消</button>
          <button type="button" @click="restoreDefaults">恢復原本教師權限</button>
        </div>
      </div>

      <p v-if="isLoading" class="state-message">正在讀取設定……</p>

      <template v-else>
        <div v-for="group in adminFeatureGroups" :key="group.id" class="feature-group">
          <h2>{{ group.label }}</h2>
          <div class="feature-grid">
            <label v-for="feature in group.features" :key="feature.id" class="feature-option">
              <input v-model="selectedFeatures" type="checkbox" :value="feature.id">
              <span>
                <strong>{{ feature.label }}</strong>
                <small>{{ feature.path }}</small>
              </span>
            </label>
          </div>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <p v-if="statusMessage" class="success-message">✅ {{ statusMessage }}</p>

        <button class="save-button" type="button" :disabled="isSaving" @click="saveSettings">
          {{ isSaving ? '儲存中……' : '💾 儲存教師功能權限' }}
        </button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.permission-page {
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 64px;
  color: var(--text-main);
}
.page-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 20px;
}
.page-header h1 { margin: 0 0 8px; }
.page-header p { margin: 0; color: var(--text-muted); font-weight: 700; }
.back-link {
  flex: 0 0 auto;
  padding: 10px 14px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--tab-bg);
  color: var(--text-main);
  font-weight: 800;
  text-decoration: none;
}
.notice-card, .permission-card {
  margin-bottom: 20px;
  padding: 22px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--box-bg);
  box-shadow: var(--shadow-box);
}
.notice-card ul { margin: 10px 0 0; padding-left: 24px; line-height: 1.8; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 2px dashed var(--border-color);
}
.toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.toolbar button {
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  border-radius: 7px;
  background: var(--tab-bg);
  color: var(--text-main);
  font-weight: 800;
  cursor: pointer;
}
.feature-group { margin-top: 24px; }
.feature-group h2 { margin: 0 0 12px; font-size: 1.2rem; }
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.feature-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px;
  border: 2px solid #cbd5e1;
  border-radius: 9px;
  background: #f8fafc;
  color: #0f172a;
  cursor: pointer;
}
.feature-option:has(input:checked) { border-color: #6d28d9; background: #f3e8ff; }
.feature-option input { width: 18px; height: 18px; margin-top: 2px; accent-color: #6d28d9; }
.feature-option span { display: flex; flex-direction: column; gap: 4px; }
.feature-option small { color: #64748b; word-break: break-all; }
.state-message, .error-message, .success-message { padding: 12px; border-radius: 8px; font-weight: 800; }
.error-message { background: #fee2e2; color: #991b1b; }
.success-message { background: #dcfce7; color: #166534; }
.save-button {
  width: 100%;
  margin-top: 24px;
  padding: 15px;
  border: 2px solid #4c1d95;
  border-radius: 9px;
  background: #6d28d9;
  color: white;
  font-size: 1.1rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 0 #4c1d95;
}
.save-button:disabled { opacity: .65; cursor: wait; }
@media (max-width: 720px) {
  .page-header, .toolbar { flex-direction: column; }
  .feature-grid { grid-template-columns: 1fr; }
}
</style>
