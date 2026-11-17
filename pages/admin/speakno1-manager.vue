<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

definePageMeta({ middleware: 'auth' });

const supabase = useSupabaseClient();
const grades = [7, 8, 9];
const selectedGrade = ref(7);
const sentences = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);
const isTranslating = ref(false);
const errorMessage = ref('');
const showModal = ref(false);
const isEditing = ref(false);
const chineseManuallyEdited = ref(false);
let translateTimer = null;

const formData = ref({ id: null, grade: 7, english: '', chinese: '', sort_order: 0 });
const gradeSentences = computed(() => sentences.value.filter(item => Number(item.grade) === selectedGrade.value));

const fetchSentences = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  const { data, error } = await supabase
    .from('speakno1_sentences')
    .select('*')
    .order('grade', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) {
    errorMessage.value = `無法載入句子題庫：${error.message}。請先執行 speakno1_grade_sentences_existing_project_setup.sql。`;
    sentences.value = [];
  } else {
    sentences.value = data || [];
  }
  isLoading.value = false;
};

onMounted(fetchSentences);
onUnmounted(() => clearTimeout(translateTimer));

const openAddModal = () => {
  isEditing.value = false;
  chineseManuallyEdited.value = false;
  formData.value = {
    id: null,
    grade: selectedGrade.value,
    english: '',
    chinese: '',
    sort_order: gradeSentences.value.length
  };
  showModal.value = true;
};

const openEditModal = sentence => {
  isEditing.value = true;
  chineseManuallyEdited.value = false;
  formData.value = { ...sentence };
  showModal.value = true;
};

const translateEnglish = async (force = false) => {
  const english = formData.value.english.trim();
  if (!english || (!force && chineseManuallyEdited.value)) return;
  isTranslating.value = true;
  errorMessage.value = '';
  try {
    const result = await $fetch('/api/translate', { method: 'POST', body: { text: english } });
    if (formData.value.english.trim() === english && (force || !chineseManuallyEdited.value)) {
      formData.value.chinese = result.translation || '';
    }
  } catch (error) {
    errorMessage.value = error?.data?.message || error?.data?.statusMessage || error?.statusMessage || '自動翻譯失敗，可直接輸入中文後繼續儲存。';
  } finally {
    isTranslating.value = false;
  }
};

const scheduleTranslation = () => {
  clearTimeout(translateTimer);
  chineseManuallyEdited.value = false;
  if (!formData.value.english.trim()) {
    formData.value.chinese = '';
    return;
  }
  translateTimer = setTimeout(() => translateEnglish(), 700);
};

const saveSentence = async () => {
  clearTimeout(translateTimer);
  if (!formData.value.english.trim()) return alert('請輸入英文句子。');
  if (!formData.value.chinese.trim()) await translateEnglish(true);
  if (!formData.value.chinese.trim() && !confirm('目前沒有中文翻譯，仍要儲存嗎？')) return;

  isSaving.value = true;
  errorMessage.value = '';
  const payload = {
    grade: Number(formData.value.grade),
    english: formData.value.english.trim(),
    chinese: formData.value.chinese.trim(),
    sort_order: Number(formData.value.sort_order) || 0,
    updated_at: new Date().toISOString()
  };
  const query = isEditing.value
    ? supabase.from('speakno1_sentences').update(payload).eq('id', formData.value.id)
    : supabase.from('speakno1_sentences').insert([payload]);
  const { error } = await query;
  isSaving.value = false;
  if (error) {
    errorMessage.value = `儲存失敗：${error.message}`;
    return;
  }
  selectedGrade.value = payload.grade;
  showModal.value = false;
  await fetchSentences();
};

const deleteSentence = async sentence => {
  if (!confirm(`確定刪除「${sentence.english}」嗎？`)) return;
  const { error } = await supabase.from('speakno1_sentences').delete().eq('id', sentence.id);
  if (error) errorMessage.value = `刪除失敗：${error.message}`;
  else await fetchSentences();
};

const moveSentence = async (index, direction) => {
  const list = gradeSentences.value;
  const otherIndex = index + direction;
  if (otherIndex < 0 || otherIndex >= list.length) return;
  const current = list[index];
  const other = list[otherIndex];
  const currentOrder = Number(current.sort_order) || index;
  const otherOrder = Number(other.sort_order) || otherIndex;
  const [{ error: firstError }, { error: secondError }] = await Promise.all([
    supabase.from('speakno1_sentences').update({ sort_order: otherOrder, updated_at: new Date().toISOString() }).eq('id', current.id),
    supabase.from('speakno1_sentences').update({ sort_order: currentOrder, updated_at: new Date().toISOString() }).eq('id', other.id)
  ]);
  if (firstError || secondError) errorMessage.value = `排序失敗：${firstError?.message || secondError?.message}`;
  else await fetchSentences();
};
</script>

<template>
  <div class="admin-container">
    <header>
      <NuxtLink to="/admin" class="back-btn">← 返回後台</NuxtLink>
      <div><h1>🗣️ 口說學霸－多元評量</h1><p>七、八、九年級句子題庫管理</p></div>
      <button class="add-btn" @click="openAddModal">＋ 新增句子</button>
    </header>

    <p v-if="errorMessage" class="message error">⚠️ {{ errorMessage }}</p>

    <nav class="grade-tabs">
      <button v-for="grade in grades" :key="grade" :class="{ active: selectedGrade === grade }" @click="selectedGrade = grade">
        {{ grade }} 年級 <small>{{ sentences.filter(item => Number(item.grade) === grade).length }} 句</small>
      </button>
    </nav>

    <p v-if="isLoading" class="empty">載入中…</p>
    <section v-else class="sentence-list">
      <article v-for="(sentence, index) in gradeSentences" :key="sentence.id" class="sentence-card">
        <div class="order">{{ index + 1 }}</div>
        <div class="sentence-text"><strong>{{ sentence.english }}</strong><span>{{ sentence.chinese || '尚無中文翻譯' }}</span></div>
        <div class="actions">
          <button :disabled="index === 0" title="上移" @click="moveSentence(index, -1)">↑</button>
          <button :disabled="index === gradeSentences.length - 1" title="下移" @click="moveSentence(index, 1)">↓</button>
          <button @click="openEditModal(sentence)">編輯</button>
          <button class="danger" @click="deleteSentence(sentence)">刪除</button>
        </div>
      </article>
      <div v-if="!gradeSentences.length" class="empty">{{ selectedGrade }} 年級尚未建立句子，請按「新增句子」。</div>
    </section>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <section class="modal-content">
        <h2>{{ isEditing ? '編輯句子' : '新增句子' }}</h2>
        <label>年級<select v-model.number="formData.grade"><option v-for="grade in grades" :key="grade" :value="grade">{{ grade }} 年級</option></select></label>
        <label>英文句子<textarea v-model="formData.english" rows="3" placeholder="輸入英文後會自動翻譯…" @input="scheduleTranslation"></textarea></label>
        <div class="translation-label"><strong>中文翻譯</strong><span v-if="isTranslating">翻譯中…</span><button type="button" @click="translateEnglish(true)">重新翻譯</button></div>
        <textarea v-model="formData.chinese" rows="3" placeholder="自動顯示中文，也可以人工修正" @input="chineseManuallyEdited = true"></textarea>
        <label>排列順序<input v-model.number="formData.sort_order" type="number" min="0"></label>
        <div class="modal-actions"><button @click="showModal = false">取消</button><button class="save" :disabled="isSaving || isTranslating" @click="saveSentence">{{ isSaving ? '儲存中…' : '儲存' }}</button></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-container{max-width:1000px;margin:auto;padding:28px 18px;font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;color:#1f2937}header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px;border-bottom:2px solid #e5e7eb;padding-bottom:18px}header h1{margin:0;color:#9a3412}header p{margin:5px 0 0;color:#64748b}.back-btn,.add-btn{border:2px solid #c2410c;border-radius:9px;padding:9px 14px;background:white;color:#9a3412;text-decoration:none;font-weight:800;cursor:pointer}.add-btn{background:#c2410c;color:white}.message{padding:12px 15px;border-radius:9px}.message.error{background:#fff1f2;color:#9f1239}.grade-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:24px 0}.grade-tabs button{padding:14px;border:2px solid #fdba74;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:18px;font-weight:900;cursor:pointer}.grade-tabs button.active{background:#c2410c;color:white}.grade-tabs small{display:block;font-size:12px;margin-top:4px}.sentence-list{display:grid;gap:10px}.sentence-card{display:grid;grid-template-columns:40px 1fr auto;gap:12px;align-items:center;padding:15px;border:1px solid #e2e8f0;border-radius:12px;background:white;box-shadow:0 3px 10px #0f172a0d}.order{font-size:20px;font-weight:900;color:#c2410c;text-align:center}.sentence-text{display:flex;flex-direction:column;gap:6px}.sentence-text strong{font-size:18px}.sentence-text span{color:#64748b}.actions{display:flex;gap:5px}.actions button,.modal-actions button,.translation-label button{border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;padding:7px 10px;cursor:pointer}.actions .danger{color:#be123c}.actions button:disabled{opacity:.35}.empty{text-align:center;padding:45px;color:#94a3b8;background:#f8fafc;border-radius:12px}.modal-overlay{position:fixed;inset:0;background:#0f172a99;display:grid;place-items:center;padding:18px;z-index:100}.modal-content{width:min(620px,100%);box-sizing:border-box;background:white;border-radius:16px;padding:26px;display:grid;gap:14px}.modal-content h2{margin:0;color:#9a3412}.modal-content label{display:grid;gap:6px;font-weight:800}.modal-content textarea,.modal-content input,.modal-content select{box-sizing:border-box;width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font:inherit}.translation-label{display:flex;align-items:center;gap:10px}.translation-label span{color:#0284c7}.translation-label button{margin-left:auto}.modal-actions{display:flex;justify-content:flex-end;gap:10px}.modal-actions .save{background:#c2410c;color:white;border-color:#c2410c}.modal-actions button:disabled{opacity:.5}@media(max-width:700px){header{grid-template-columns:1fr;text-align:center}.grade-tabs{grid-template-columns:1fr}.sentence-card{grid-template-columns:32px 1fr}.actions{grid-column:1/-1;justify-content:flex-end}}
</style>
