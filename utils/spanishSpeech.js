let embeddedEnginePromise;
let activeSpanishAudio;
let activeSpanishUrl;

async function loadEmbeddedSpanishEngine() {
  if (!import.meta.client) throw new Error('client-only');
  if (!embeddedEnginePromise) {
    embeddedEnginePromise = Promise.all([
      import('mespeak'),
      import('mespeak/src/mespeak_config.json'),
      import('mespeak/voices/es.json')
    ]).then(([engineModule, configModule, voiceModule]) => {
      const engine = engineModule.default || engineModule;
      const config = configModule.default || configModule;
      const voice = voiceModule.default || voiceModule;
      if (!engine.isConfigLoaded()) engine.loadConfig(config);
      if (!engine.isVoiceLoaded('es')) engine.loadVoice(voice);
      engine.setDefaultVoice('es');
      if (!engine.isConfigLoaded() || !engine.isVoiceLoaded('es')) throw new Error('spanish-engine-not-ready');
      return engine;
    }).catch(error => {
      embeddedEnginePromise = undefined;
      throw error;
    });
  }
  return embeddedEnginePromise;
}

export function primeSpanishVoices() {
  if (!import.meta.client) return Promise.resolve(false);
  return loadEmbeddedSpanishEngine().then(() => true).catch(() => false);
}

export async function speakSpanish(text, options = {}) {
  const content = String(text || '').trim();
  if (!content) return { ok: false, reason: 'empty' };
  if (!import.meta.client) return { ok: false, reason: 'unsupported' };

  try {
    const engine = await loadEmbeddedSpanishEngine();
    const rate = Math.min(1.25, Math.max(0.65, Number(options.rate) || 0.85));
    const wav = engine.speak(content, {
      voice: 'es',
      speed: Math.round(185 * rate),
      pitch: 48,
      amplitude: 100,
      wordgap: 1,
      rawdata: 'array'
    });
    if (!wav?.length) throw new Error('playback-failed');
    if (activeSpanishAudio) { activeSpanishAudio.pause(); activeSpanishAudio.removeAttribute('src'); activeSpanishAudio.load(); }
    if (activeSpanishUrl) URL.revokeObjectURL(activeSpanishUrl);
    activeSpanishUrl = URL.createObjectURL(new Blob([Uint8Array.from(wav)], { type: 'audio/wav' }));
    const audio = new Audio(activeSpanishUrl);
    activeSpanishAudio = audio; audio.preload = 'auto'; audio.volume = 1;
    const release = () => {
      if (activeSpanishAudio === audio) activeSpanishAudio = undefined;
      if (activeSpanishUrl === audio.src) { URL.revokeObjectURL(activeSpanishUrl); activeSpanishUrl = undefined; }
    };
    audio.addEventListener('ended', release, { once: true });
    audio.addEventListener('error', release, { once: true });
    await audio.play();
    return { ok: true, voice: 'meSpeak Spanish', lang: 'es' };
  } catch {
    return { ok: false, reason: 'spanish-engine-unavailable' };
  }
}
