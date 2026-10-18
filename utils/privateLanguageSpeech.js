let embeddedConfigPromise;
const embeddedEngines = new Map();

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
      engine.stop(); engine.resetQueue();
      const playbackId = engine.speak(content, { voice: speech.voice, speed: Math.round(185 * rate), pitch: 48, wordgap: 1, volume: 1 });
      return playbackId ? { ok: true } : { ok: false, reason: 'playback-failed' };
    }
    const voice = await waitForNativeVoice(speech.lang);
    if (!voice) return { ok: false, reason: 'missing-language-voice' };
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = speech.lang; utterance.voice = voice; utterance.rate = rate;
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 60);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'playback-failed' };
  }
}
