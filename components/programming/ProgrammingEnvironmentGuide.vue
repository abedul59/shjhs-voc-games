<script setup>
import { computed, onMounted, ref } from 'vue';
import { getProgrammingEnvironmentGuide } from '~/lib/programming-environments';
import { getProgrammingToolchainGuide } from '~/lib/programming-toolchains';

const props = defineProps({ environmentKey: { type: String, required: true } });
const guide = computed(() => getProgrammingEnvironmentGuide(props.environmentKey));
const toolchain = computed(() => getProgrammingToolchainGuide(props.environmentKey));
const selected = ref('windows');
const copied = ref('');

onMounted(() => {
  const platform = navigator.platform?.toLowerCase() || '';
  if (platform.includes('mac')) selected.value = 'macos';
  else if (platform.includes('linux')) selected.value = 'linux';
});

const activePlatform = computed(() => guide.value?.platforms.find(item => item.id === selected.value) || guide.value?.platforms[0]);
const activeInstallers = computed(() => toolchain.value?.platforms?.[selected.value] || []);

async function copyCommand(command, key) {
  try {
    await navigator.clipboard.writeText(command);
    copied.value = key;
    window.setTimeout(() => { if (copied.value === key) copied.value = ''; }, 1400);
  } catch { copied.value = ''; }
}
</script>

<template>
  <section v-if="guide" id="environment-setup" class="environment-guide">
    <div class="guide-heading"><div><p>DEVELOPMENT ENVIRONMENT</p><h2>🧰 {{ guide.title }}</h2></div><span>Windows · Linux · macOS</span></div>
    <p class="intro">{{ guide.intro }}</p>

    <div class="platform-tabs" role="tablist" aria-label="選擇作業系統">
      <button v-for="platform in guide.platforms" :key="platform.id" :class="{ active: selected === platform.id }" role="tab" :aria-selected="selected === platform.id" @click="selected = platform.id"><b>{{ platform.icon }}</b>{{ platform.name }}</button>
    </div>

    <article v-if="activePlatform" class="platform-panel">
      <div class="panel-title"><div><small>使用終端機</small><h3>{{ activePlatform.shell }}</h3></div><strong>{{ activePlatform.name }}</strong></div>
      <div class="step-grid"><section v-for="(step, index) in activePlatform.steps" :key="step.title"><span>{{ index + 1 }}</span><div><h4>{{ step.title }}</h4><div class="command"><pre><code>{{ step.command }}</code></pre><button type="button" @click="copyCommand(step.command, `${activePlatform.id}-${index}`)">{{ copied === `${activePlatform.id}-${index}` ? '✓ 已複製' : '複製' }}</button></div><p>{{ step.note }}</p></div></section></div>
    </article>

    <section v-if="toolchain" class="toolchain-guide">
      <div class="toolchain-heading"><div><p>VERSION &amp; PACKAGE TOOLCHAIN</p><h3>版本安裝器與套件生態</h3></div><span>{{ activePlatform?.name }}</span></div>
      <p class="toolchain-summary">{{ toolchain.summary }}</p>

      <div class="installer-grid">
        <article v-for="(installer, index) in activeInstallers" :key="installer.name">
          <div class="installer-title"><div><small>{{ installer.role }}</small><h4>{{ installer.name }}</h4></div><b>{{ index + 1 }}</b></div>
          <div class="command"><pre><code>{{ installer.command }}</code></pre><button type="button" @click="copyCommand(installer.command, `installer-${selected}-${index}`)">{{ copied === `installer-${selected}-${index}` ? '✓ 已複製' : '複製' }}</button></div>
          <p>{{ installer.note }}</p>
        </article>
      </div>

      <div class="ecosystem-grid">
        <article class="manager-card"><h4>如何選擇管理工具</h4><dl><template v-for="manager in toolchain.managers" :key="manager.name"><dt>{{ manager.name }}<small>{{ manager.role }}</small></dt><dd>{{ manager.bestFor }}</dd></template></dl></article>
        <article class="package-card"><h4>常用套件與工具</h4><ul><li v-for="group in toolchain.packages" :key="group.group"><b>{{ group.group }}</b><span>{{ group.items }}</span></li></ul></article>
      </div>

      <div class="lock-workflow">
        <article><h4>版本與 Lockfile</h4><ul><li v-for="file in toolchain.lockfiles" :key="file">{{ file }}</li></ul></article>
        <article><h4>建議的日常流程</h4><div class="command"><pre><code>{{ toolchain.workflow }}</code></pre><button type="button" @click="copyCommand(toolchain.workflow, 'toolchain-workflow')">{{ copied === 'toolchain-workflow' ? '✓ 已複製' : '複製' }}</button></div></article>
      </div>
      <p class="toolchain-caution"><b>避免踩雷：</b>{{ toolchain.caution }}</p>
    </section>

    <div class="command-sections">
      <article><h3>① 驗證安裝</h3><div class="command"><pre><code>{{ guide.verify }}</code></pre><button type="button" @click="copyCommand(guide.verify, 'verify')">{{ copied === 'verify' ? '✓ 已複製' : '複製' }}</button></div></article>
      <article><h3>② 建立第一個專案</h3><div class="command"><pre><code>{{ guide.create }}</code></pre><button type="button" @click="copyCommand(guide.create, 'create')">{{ copied === 'create' ? '✓ 已複製' : '複製' }}</button></div></article>
    </div>

    <div class="editor"><b>編輯器建議</b><p>{{ guide.editor }}</p></div>
    <div class="checks"><section><h3>完成檢查</h3><ul><li v-for="item in guide.checklist" :key="item">{{ item }}</li></ul></section><section><h3>常見問題</h3><ul><li v-for="item in guide.troubleshooting" :key="item">{{ item }}</li></ul></section></div>
    <nav class="official"><span>官方文件：</span><a v-for="link in guide.official" :key="link.url" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }} ↗</a></nav>
  </section>
</template>

<style scoped>
.environment-guide{max-width:1160px;margin:0 auto 48px;padding:30px;box-sizing:border-box;border:1px solid #d9dee9;border-radius:24px;background:#fff;box-shadow:0 14px 40px #1118270d}.guide-heading{display:flex;align-items:end;justify-content:space-between;gap:20px}.guide-heading p{margin:0;color:var(--secondary,#334155);font-size:12px;font-weight:900;letter-spacing:.16em}.guide-heading h2{margin:6px 0;font-size:clamp(26px,4vw,36px)}.guide-heading>span{color:#64748b;font-weight:900}.intro{max-width:900px;color:#525b6c;line-height:1.8}.platform-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:24px 0}.platform-tabs button{display:flex;align-items:center;justify-content:center;gap:10px;padding:14px;border:2px solid #e2e8f0;border-radius:12px;background:#f8fafc;color:#334155;cursor:pointer;font-weight:900}.platform-tabs button b{font-size:20px}.platform-tabs button.active{border-color:var(--accent,#2563eb);background:#eff6ff;color:#1e3a8a}.platform-panel{padding:23px;border-radius:18px;background:#111827;color:#f8fafc}.panel-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px}.panel-title small{color:#94a3b8}.panel-title h3{margin:3px 0}.panel-title>strong{padding:6px 10px;border-radius:99px;background:var(--accent,#2563eb);color:#111827}.step-grid{display:grid;gap:16px}.step-grid>section{display:grid;grid-template-columns:34px 1fr;gap:12px}.step-grid>section>span{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--accent,#2563eb);color:#111827;font-weight:900}.step-grid h4{margin:3px 0 9px}.step-grid p{margin:8px 0 0;color:#cbd5e1;line-height:1.6}.command{position:relative;border:1px solid #334155;border-radius:10px;background:#020617;overflow:auto}.command pre{margin:0;padding:15px 72px 15px 15px;color:#d1fae5;white-space:pre-wrap;overflow-wrap:anywhere}.command button{position:absolute;top:8px;right:8px;padding:6px 9px;border:1px solid #475569;border-radius:7px;background:#1e293b;color:#fff;cursor:pointer}.command-sections{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.command-sections>article{padding:18px;border:1px solid #e2e8f0;border-radius:15px;background:#f8fafc}.command-sections h3{margin-top:0}.editor{display:grid;grid-template-columns:140px 1fr;gap:12px;margin-top:16px;padding:17px;border-radius:14px;background:#fef3c7;color:#713f12}.editor p{margin:0;line-height:1.6}.checks{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}.checks section{padding:18px;border:1px solid #e2e8f0;border-radius:14px}.checks h3{margin-top:0}.checks li{margin:8px 0;color:#4b5563;line-height:1.55}.official{display:flex;flex-wrap:wrap;gap:10px;margin-top:17px;align-items:center}.official span{font-weight:900}.official a{padding:7px 10px;border-radius:8px;background:#eef2ff;color:#3730a3;text-decoration:none;font-weight:800}
.toolchain-guide{margin-top:22px;padding:24px;border:1px solid #c7d2fe;border-radius:18px;background:linear-gradient(145deg,#eef2ff,#f8fafc)}.toolchain-heading{display:flex;align-items:end;justify-content:space-between;gap:16px}.toolchain-heading p{margin:0;color:#4f46e5;font-size:11px;font-weight:900;letter-spacing:.15em}.toolchain-heading h3{margin:5px 0;font-size:25px}.toolchain-heading>span{padding:6px 10px;border-radius:99px;background:#3730a3;color:#fff;font-size:12px;font-weight:900}.toolchain-summary{margin:10px 0 18px;color:#475569;line-height:1.75}.installer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.installer-grid>article{padding:17px;border:1px solid #dbe3f1;border-radius:14px;background:#fff}.installer-title{display:flex;align-items:start;justify-content:space-between;gap:12px}.installer-title small{color:#6366f1;font-weight:800}.installer-title h4{margin:3px 0 11px;font-size:19px}.installer-title>b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#e0e7ff;color:#3730a3}.installer-grid>article>p{margin:10px 0 0;color:#64748b;line-height:1.6}.ecosystem-grid,.lock-workflow{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:13px}.ecosystem-grid>article,.lock-workflow>article{padding:18px;border:1px solid #dbe3f1;border-radius:14px;background:#fff}.ecosystem-grid h4,.lock-workflow h4{margin:0 0 13px;font-size:18px}.manager-card dl{margin:0}.manager-card dt{margin-top:11px;font-weight:900;color:#312e81}.manager-card dt:first-child{margin-top:0}.manager-card dt small{display:block;color:#64748b;font-weight:700}.manager-card dd{margin:3px 0 0;color:#475569;line-height:1.5}.package-card ul,.lock-workflow ul{display:grid;gap:10px;margin:0;padding-left:20px}.package-card li b,.package-card li span{display:block}.package-card li b{color:#312e81}.package-card li span,.lock-workflow li{color:#475569;line-height:1.55}.toolchain-caution{margin:13px 0 0;padding:13px;border-left:4px solid #f59e0b;border-radius:8px;background:#fffbeb;color:#78350f;line-height:1.65}.toolchain-caution b{margin-right:5px}
@media(max-width:860px){.installer-grid,.ecosystem-grid,.lock-workflow{grid-template-columns:1fr}}@media(max-width:760px){.environment-guide{padding:20px}.guide-heading,.toolchain-heading{display:block}.platform-tabs{grid-template-columns:1fr}.command-sections,.checks{grid-template-columns:1fr}.editor{grid-template-columns:1fr}.panel-title>strong{display:none}.toolchain-guide{padding:17px}.toolchain-heading>span{display:inline-block;margin-top:5px}}
</style>
