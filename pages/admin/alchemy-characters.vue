<script setup>
import { computed, onMounted, ref } from 'vue';
import { ALCHEMISTS, PARTY, PREVIOUS_ALCHEMIST_IDS, PREVIOUS_COMPANION_IDS, visibleCharacterIds } from '~/lib/alchemy-atelier';

definePageMeta({ middleware: 'auth' });
const db = useSupabaseClient();
const isAdminCookie = useCookie('isAdmin');
const authCookie = useCookie('teacher_auth');
const isSuperAdmin = computed(() => isAdminCookie.value === true || isAdminCookie.value === 'superadmin' || authCookie.value?.classes?.includes('ALL'));
const loading = ref(true);
const saving = ref(false);
const message = ref('');
const heroIds = ref([]);
const companionIds = ref([]);
const focusedPerson = ref(null);
const allHeroIds = ALCHEMISTS.map(person => person.id);
const allCompanionIds = PARTY.map(person => person.id);

onMounted(async () => {
  if (!isSuperAdmin.value) { await navigateTo('/admin'); return; }
  const { data, error } = await db.from('system_settings').select('alchemy_character_visibility').eq('id', 1).maybeSingle();
  if (error) message.value = `讀取失敗：${error.message}。請先在新專案執行 20261004_alchemy_character_visibility.sql。`;
  else {
    const config = data?.alchemy_character_visibility;
    heroIds.value = visibleCharacterIds(config?.heroes, ALCHEMISTS, PREVIOUS_ALCHEMIST_IDS);
    companionIds.value = visibleCharacterIds(config?.companions, PARTY, PREVIOUS_COMPANION_IDS);
  }
  loading.value = false;
});

async function save() {
  if (saving.value || !isSuperAdmin.value) return;
  if (!heroIds.value.length) { message.value = '至少保留一位可選主角，學生才能開始遊戲。'; return; }
  saving.value = true;
  message.value = '';
  const visibility = { heroes: allHeroIds.filter(id => heroIds.value.includes(id)), companions: allCompanionIds.filter(id => companionIds.value.includes(id)) };
  const { data, error } = await db.from('system_settings').update({ alchemy_character_visibility: visibility }).eq('id', 1).select('id').maybeSingle();
  message.value = error ? `儲存失敗：${error.message}。請確認已執行角色名單 SQL。` : !data ? '儲存失敗：找不到系統設定資料。' : '角色名單已儲存；學生重新進入遊戲後會套用。';
  saving.value = false;
}
</script>

<template>
  <main v-if="isSuperAdmin" class="character-admin">
    <header><div><small>ALCHEMY ATELIER</small><h1>鍊金工房角色顯示管理</h1><p>勾選學生可看到的角色。被隱藏的同伴會退出出戰隊伍，攜帶道具會回到工房背包；已選定主角的存檔會保留原主角。</p></div><NuxtLink to="/admin">返回後台</NuxtLink></header>
    <div v-if="loading" class="status">載入角色設定…</div>
    <template v-else>
      <div class="toolbar"><button @click="heroIds = [...allHeroIds]; companionIds = [...allCompanionIds]">全選所有角色</button><button @click="heroIds = [...allHeroIds]">全選主角</button><button @click="companionIds = [...allCompanionIds]">全選同伴</button><button @click="companionIds = []">清空同伴</button><button class="save" :disabled="saving" @click="save">{{ saving ? '儲存中…' : '儲存角色設定' }}</button></div>
      <p v-if="message" class="status" role="status">{{ message }}</p>
      <section><h2>主角 · {{ heroIds.length }}/{{ ALCHEMISTS.length }} 位可選</h2><p>女性 {{ ALCHEMISTS.filter(person => person.gender === '女').length }} 位、男性 {{ ALCHEMISTS.filter(person => person.gender === '男').length }} 位。至少勾選一位。</p><div class="cast-grid"><article v-for="person in ALCHEMISTS" :key="person.id" :class="{ disabled: !heroIds.includes(person.id) }"><button class="portrait" @click="focusedPerson = person"><img :src="person.portrait" :alt="person.name + '立繪'" loading="lazy"/></button><label><input v-model="heroIds" type="checkbox" :value="person.id"/><strong>{{ person.name }}</strong></label><small>{{ person.gender }} · {{ person.job }}</small><p>{{ person.bio }}</p></article></div></section>
      <section><h2>同伴 · {{ companionIds.length }}/{{ PARTY.length }} 位可選</h2><div class="cast-grid"><article v-for="person in PARTY" :key="person.id" :class="{ disabled: !companionIds.includes(person.id) }"><button class="portrait" @click="focusedPerson = person"><img :src="person.portrait" :alt="person.name + '立繪'" loading="lazy"/></button><label><input v-model="companionIds" type="checkbox" :value="person.id"/><strong>{{ person.name }}</strong></label><small>{{ person.race }} · {{ person.job }}</small><p>{{ person.bio }}</p></article></div></section>
    </template>
    <div v-if="focusedPerson" class="portrait-modal" @click.self="focusedPerson = null"><div><button class="close" @click="focusedPerson = null">關閉 ×</button><img :src="focusedPerson.portrait" :alt="focusedPerson.name + '完整立繪'"/><h2>{{ focusedPerson.name }}</h2><p>{{ focusedPerson.bio }}</p></div></div>
  </main>
</template>

<style scoped>
.character-admin{max-width:1500px;margin:auto;padding:24px;color:#20323a;font-family:'Noto Sans TC',sans-serif}.character-admin header{display:flex;justify-content:space-between;gap:18px;align-items:start;background:#d9e9e8;border-radius:14px;padding:22px}.character-admin header h1{margin:4px 0}.character-admin header p{max-width:780px}.character-admin header a,.toolbar button{background:#234653;color:white;border:0;border-radius:8px;padding:10px 15px;text-decoration:none;cursor:pointer}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.toolbar .save{background:#a45d24;font-weight:800}.status{background:#fff2cd;border-left:5px solid #d09c36;padding:12px;border-radius:5px}.character-admin section{margin:24px 0}.cast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:12px}.cast-grid article{background:#f2f6f3;border:1px solid #b4c4be;border-radius:12px;padding:10px}.cast-grid article.disabled{opacity:.55}.portrait{display:block;width:100%;border:0;padding:0;background:none;cursor:zoom-in}.portrait img{display:block;width:100%;height:190px;object-fit:cover;object-position:top;border-radius:8px}.cast-grid label{display:flex;align-items:center;gap:6px;margin-top:9px;cursor:pointer}.cast-grid label input{width:18px;height:18px}.cast-grid small{display:block;color:#526c69;margin-top:4px}.cast-grid p{font-size:12px;line-height:1.5}.portrait-modal{position:fixed;inset:0;z-index:1000;background:#061722dd;display:grid;place-items:center;padding:12px}.portrait-modal>div{position:relative;max-width:min(650px,100%);max-height:95dvh;background:#edf1e9;border-radius:14px;padding:15px;overflow:auto;text-align:center}.portrait-modal img{display:block;max-width:100%;max-height:72dvh;object-fit:contain;margin:auto}.portrait-modal .close{position:sticky;top:0;float:right;background:#234653;color:#fff;border:0;border-radius:6px;padding:8px 12px;cursor:pointer}@media(max-width:650px){.character-admin{padding:10px}.character-admin header{display:block}.cast-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.portrait img{height:160px}}
</style>
