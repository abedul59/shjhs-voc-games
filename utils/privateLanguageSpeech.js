let embeddedConfigPromise;
const embeddedEngines = new Map();
let activeEmbeddedAudio;
let activeEmbeddedUrl;
let nativeStartTimer;
let activeNativeUtterance;
let nativePlaybackToken = 0;

const embeddedVoiceLoaders = {
  fr: () => import('mespeak/voices/fr.json'),
  de: () => import('mespeak/voices/de.json')
};

async function loadEmbeddedVoice(voice) {
  if (!import.meta.client || !embeddedVoiceLoaders[voice]) throw new Error('unsupported-embedded-voice');
  if (embeddedEngines.has(voice)) return embeddedEngines.get(voice);
  const promise = Promise.all([
    import('mespeak'),
    embeddedConfigPromise || (embeddedConfigPromise = import('mespeak/src/mespeak_config.json')),
    embeddedVoiceLoaders[voice]()
  ]).then(([engineModule, configModule, voiceModule]) => {
    const engine = engineModule.default || engineModule;
    const config = configModule.default || configModule;
    const voiceData = voiceModule.default || voiceModule;
    if (!engine.isConfigLoaded()) engine.loadConfig(config);
    if (!engine.isVoiceLoaded(voice)) engine.loadVoice(voiceData);
    engine.setDefaultVoice(voice);
    return engine;
  });
  embeddedEngines.set(voice, promise);
  return promise;
}

async function waitForNativeVoice(lang, timeout = 1200) {
  if (!import.meta.client || !window.speechSynthesis) return null;
  const synthesis = window.speechSynthesis;
  const select = () => synthesis.getVoices().find(voice => voice.lang?.replace('_', '-').toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const current = select();
  if (current) return current;
  return new Promise(resolve => {
    const changed = () => { const voice = select(); if (voice) finish(voice); };
    const finish = voice => { synthesis.removeEventListener('voiceschanged', changed); resolve(voice || null); };
    synthesis.addEventListener('voiceschanged', changed);
    window.setTimeout(() => finish(select()), timeout);
  });
}

export function primePrivateLanguageSpeech(speech) {
  if (speech.engine === 'embedded') return loadEmbeddedVoice(speech.voice).then(() => true).catch(() => false);
  return waitForNativeVoice(speech.lang).then(Boolean);
}

export async function speakPrivateLanguage(text, speech, rate = 0.85) {
  const content = String(text || '').trim();
  if (!content) return { ok: false, reason: 'empty' };
  try {
    if (speech.engine === 'embedded') {
      const engine = await loadEmbeddedVoice(speech.voice);
      const wav = engine.speak(content, { voice: speech.voice, speed: Math.round(185 * rate), pitch: 48, amplitude: 100, wordgap: 1, rawdata: 'array' });
      if (!wav?.length) return { ok: false, reason: 'playback-failed' };
      if (activeEmbeddedAudio) { activeEmbeddedAudio.pause(); activeEmbeddedAudio.removeAttribute('src'); activeEmbeddedAudio.load(); }
      if (activeEmbeddedUrl) URL.revokeObjectURL(activeEmbeddedUrl);
      activeEmbeddedUrl = URL.createObjectURL(new Blob([Uint8Array.from(wav)], { type: 'audio/wav' }));
      const audio = new Audio(activeEmbeddedUrl);
      activeEmbeddedAudio = audio; audio.preload = 'auto'; audio.volume = 1;
      const release = () => {
        if (activeEmbeddedAudio === audio) activeEmbeddedAudio = undefined;
        if (activeEmbeddedUrl === audio.src) { URL.revokeObjectURL(activeEmbeddedUrl); activeEmbeddedUrl = undefined; }
      };
      audio.addEventListener('ended', release, { once: true });
      audio.addEventListener('error', release, { once: true });
      await audio.play();
      return { ok: true };
    }
    const voice = await waitForNativeVoice(speech.lang);
    if (!voice) return { ok: false, reason: 'missing-language-voice' };
    const synthesis = window.speechSynthesis;
    const token = ++nativePlaybackToken;
    if (nativeStartTimer) window.clearTimeout(nativeStartTimer);
    synthesis.cancel(); synthesis.resume();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = speech.lang; utterance.voice = voice; utterance.rate = rate; utterance.pitch = 1; utterance.volume = 1;
    activeNativeUtterance = utterance;
    return await new Promise(resolve => {
      let settled = false;
      const finish = result => { if (!settled) { settled = true; resolve(result); } };
      utterance.onstart = () => finish({ ok: true });
      utterance.onerror = () => finish({ ok: false, reason: 'playback-failed' });
      utterance.onend = () => { if (activeNativeUtterance === utterance) activeNativeUtterance = undefined; };
      nativeStartTimer = window.setTimeout(() => {
        if (token !== nativePlaybackToken) return finish({ ok: false, reason: 'superseded' });
        synthesis.resume(); synthesis.speak(utterance);
        window.setTimeout(() => finish(synthesis.speaking || synthesis.pending ? { ok: true } : { ok: false, reason: 'playback-failed' }), 1000);
      }, 140);
    });
  } catch {
    return { ok: false, reason: 'playback-failed' };
  }
}
