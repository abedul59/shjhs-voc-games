let embeddedConfigPromise;
const embeddedEngines = new Map();
let espeakFactoryPromise;
const espeakWavCache = new Map();
let activeEmbeddedAudio;
let activeEmbeddedUrl;
let generatedAudioContext;
let activeGeneratedSource;
let generatedPlaybackToken = 0;
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

function loadEspeakFactory() {
  if (!import.meta.client) return Promise.reject(new Error('client-only-engine'));
  espeakFactoryPromise ||= import('espeak-ng').then(module => module.default || module);
  return espeakFactoryPromise;
}

async function synthesizeEspeakWav(content, voice, rate) {
  const speed = Math.max(80, Math.min(260, Math.round(185 * rate)));
  const cacheKey = `${voice}:${speed}:${content}`;
  if (espeakWavCache.has(cacheKey)) return espeakWavCache.get(cacheKey);
  const factory = await loadEspeakFactory();
  const engine = await factory({ arguments: ['-v', voice, '-s', String(speed), '-a', '170', '-w', '/speech.wav', content] });
  const wav = engine.FS.readFile('/speech.wav').slice();
  if (wav.length < 45 || String.fromCharCode(...wav.slice(0, 4)) !== 'RIFF') throw new Error('invalid-espeak-audio');
  espeakWavCache.set(cacheKey, wav);
  if (espeakWavCache.size > 80) espeakWavCache.delete(espeakWavCache.keys().next().value);
  return wav;
}

function prepareGeneratedAudioContext() {
  if (!import.meta.client) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  generatedAudioContext ||= new AudioContextClass();
  if (generatedAudioContext.state === 'suspended') generatedAudioContext.resume().catch(() => {});
  return generatedAudioContext;
}

export function activatePrivateLanguageSpeech(speech) {
  if (speech.engine !== 'espeak') return;
  prepareGeneratedAudioContext();
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
  if (speech.engine === 'espeak') return synthesizeEspeakWav(speech.primeText || 'ready', speech.voice, 0.85).then(() => true).catch(() => false);
  return waitForNativeVoice(speech.lang).then(Boolean);
}

export async function speakPrivateLanguage(text, speech, rate = 0.85) {
  const content = String(text || '').trim();
  if (!content) return { ok: false, reason: 'empty' };
  try {
    if (speech.engine === 'espeak') {
      const context = prepareGeneratedAudioContext();
      if (!context) return { ok: false, reason: 'playback-failed' };
      const token = ++generatedPlaybackToken;
      const wav = await synthesizeEspeakWav(content, speech.voice, rate);
      if (token !== generatedPlaybackToken) return { ok: false, reason: 'superseded' };
      if (context.state === 'suspended') await context.resume();
      const audioBuffer = await context.decodeAudioData(wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength));
      if (token !== generatedPlaybackToken) return { ok: false, reason: 'superseded' };
      if (activeGeneratedSource) { try { activeGeneratedSource.stop(); } catch { /* 已停止 */ } }
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      source.onended = () => { if (activeGeneratedSource === source) activeGeneratedSource = undefined; };
      activeGeneratedSource = source;
      source.start();
      return { ok: true };
    }
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
