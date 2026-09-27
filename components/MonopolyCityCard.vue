<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({ city: { type: Object, required: true }, country: { type: String, default: '' } });
const photo = ref(null), loading = ref(false), failed = ref(false), retry = ref(0);
const cache = new Map();
const article = computed(() => 'https://en.wikipedia.org/wiki/' + encodeURIComponent(props.city.wiki));
const plainText = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
let controller;

// Request only the displayed city. City reading is optional and never blocks a turn.
watch(() => [props.city.wiki, retry.value], async ([title], _, onCleanup) => {
  if (typeof window === 'undefined') return;
  controller?.abort();
  const request = new AbortController();
  controller = request;
  let current = true;
  const timeout = setTimeout(() => request.abort(), 8000);
  onCleanup(() => { current = false; clearTimeout(timeout); request.abort(); });
  photo.value = null;
  failed.value = false;
  loading.value = true;
  async function query(params) {
    const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', origin: '*', ...params
    });
    const response = await fetch(url, { signal: request.signal, credentials: 'omit' });
    if (!response.ok) throw new Error('Wikipedia unavailable');
    const result = await response.json();
    if (result.error) throw new Error('Wikipedia unavailable');
    return result.query?.pages?.[0];
  }
  try {
    if (cache.has(title)) { photo.value = cache.get(title); return; }
    const page = await query({ titles: title, redirects: '1', prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: '600', pilicense: 'free' });
    if (!page?.thumbnail?.source || !page.pageimage) throw new Error('No city photo');
    const file = await query({ titles: 'File:' + page.pageimage, prop: 'imageinfo', iiprop: 'extmetadata|url' });
    const info = file?.imageinfo?.[0], meta = info?.extmetadata;
    if (!info?.descriptionurl || !meta?.LicenseShortName?.value) throw new Error('No photo credits');
    const source = new URL(page.thumbnail.source);
    if (source.protocol !== 'https:' || !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(source.hostname)) throw new Error('Invalid image source');
    const result = {
      url: source.href, fileUrl: info.descriptionurl,
      author: plainText(meta.Artist?.value || meta.Credit?.value) || 'Wikimedia Commons',
      license: plainText(meta.LicenseShortName.value)
    };
    if (current) { cache.set(title, result); photo.value = result; }
  } catch {
    if (current) failed.value = true;
  } finally {
    clearTimeout(timeout);
    if (current) loading.value = false;
  }
}, { immediate: true });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <article class="city-card" aria-label="城市小百科">
    <figure>
      <img v-if="photo && !failed" :key="photo.url" :src="photo.url" :alt="city.name + ' ' + city.en + ' 城市照片'" referrerpolicy="no-referrer" @error="failed = true">
      <div v-else class="photo-placeholder" role="status">
        <span>🏙️</span>{{ loading ? '載入城市照片…' : '照片暫時無法載入' }}
        <button v-if="!loading" type="button" @click="retry++">重試照片</button>
      </div>
      <figcaption v-if="photo && !failed">
        <a :href="photo.fileUrl" target="_blank" rel="noopener noreferrer" :title="photo.author + ' · ' + photo.license">{{ photo.author }} · {{ photo.license }} ↗</a>
      </figcaption>
    </figure>
    <div class="city-copy">
      <p class="eyebrow">{{ country }} · 城市小百科</p>
      <h2>{{ city.name }} <small>{{ city.en }}</small></h2>
      <p class="intro">{{ city.intro }}</p>
      <a :href="article" target="_blank" rel="noopener noreferrer">維基百科・認識這座城市 ↗</a>
    </div>
  </article>
</template>

<style scoped>
.city-card{display:grid;grid-template-columns:155px minmax(0,1fr);gap:14px;padding:10px;background:#fff;border:1px solid #c8d7c5;border-radius:14px;color:#253b32;min-width:0}
figure{margin:0;position:relative;min-height:105px;border-radius:9px;overflow:hidden;background:#e9eee7}img{display:block;width:100%;height:112px;object-fit:cover}figcaption{position:absolute;bottom:0;left:0;right:0;background:#ffffffed;padding:2px 4px;font-size:.55rem}figcaption a{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#253b32}
.photo-placeholder{display:flex;height:100%;min-height:105px;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:.65rem}.photo-placeholder span{font-size:1.7rem}.photo-placeholder button{border:1px solid #809884;border-radius:5px;background:#fff;color:#34583e;cursor:pointer;font-size:.65rem}
.city-copy{align-self:center;min-width:0}.eyebrow{margin:0 0 4px;color:#627663;font-size:.65rem;font-weight:700}h2{margin:0;font-size:1rem;line-height:1.2}h2 small{font-size:.77rem;font-weight:500}.intro{margin:6px 0;font-size:.78rem;line-height:1.5}.city-copy>a{color:#286b50;font-size:.7rem;font-weight:700}
@media(max-height:760px) and (min-width:851px){.city-card{grid-template-columns:125px minmax(0,1fr);gap:10px;padding:7px}img{height:95px}figure,.photo-placeholder{min-height:95px}.intro{margin:3px 0;font-size:.7rem}h2{font-size:.87rem}}
@media(max-width:500px){.city-card{grid-template-columns:100px minmax(0,1fr);gap:9px}img{height:135px}.intro{font-size:.7rem}h2 small{display:block}}
</style>
