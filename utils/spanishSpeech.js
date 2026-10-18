let embeddedEnginePromise;

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
    engine.stop();
    engine.resetQueue();
    const rate = Math.min(1.25, Math.max(0.65, Number(options.rate) || 0.85));
    const playbackId = engine.speak(content, {
      voice: 'es',
      speed: Math.round(185 * rate),
      pitch: 48,
      amplitude: 100,
      wordgap: 1,
      volume: 1
    });
    if (!playbackId) throw new Error('playback-failed');
    return { ok: true, voice: 'meSpeak Spanish', lang: 'es' };
  } catch {
    return { ok: false, reason: 'spanish-engine-unavailable' };
  }
}
