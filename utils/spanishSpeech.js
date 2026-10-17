const spanishVoiceName = /spanish|espa(?:ñ|n)ol|castilian|castellano|m[oó]nica|paulina|jorge|marisol|diego|helena|luciana|elvira|alvaro|[áa]lvaro/i;

let availableVoices = [];
let listeningForVoices = false;

function getSynthesis() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

function refreshVoices() {
  const synthesis = getSynthesis();
  availableVoices = synthesis ? synthesis.getVoices() : [];
  return availableVoices;
}

function isSpanishVoice(voice) {
  return /^es(?:[-_]|$)/i.test(voice?.lang || '') || spanishVoiceName.test(voice?.name || '');
}

function voiceRank(voice) {
  const lang = (voice.lang || '').replace('_', '-').toLowerCase();
  if (lang === 'es-es') return voice.localService ? 0 : 1;
  if (lang === 'es-mx') return voice.localService ? 2 : 3;
  if (lang.startsWith('es-')) return voice.localService ? 4 : 5;
  return 6;
}

export function selectSpanishVoice(voices = availableVoices) {
  return voices.filter(isSpanishVoice).sort((a, b) => voiceRank(a) - voiceRank(b))[0] || null;
}

export function primeSpanishVoices() {
  const synthesis = getSynthesis();
  if (!synthesis) return [];
  refreshVoices();
  if (!listeningForVoices) {
    synthesis.addEventListener('voiceschanged', refreshVoices);
    listeningForVoices = true;
  }
  return availableVoices;
}

async function waitForSpanishVoice(timeout = 1200) {
  const synthesis = getSynthesis();
  if (!synthesis) return null;
  primeSpanishVoices();
  const current = selectSpanishVoice();
  if (current) return current;

  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synthesis.removeEventListener('voiceschanged', changed);
      resolve(selectSpanishVoice(refreshVoices()));
    };
    const changed = () => { if (selectSpanishVoice(refreshVoices())) finish(); };
    synthesis.addEventListener('voiceschanged', changed);
    window.setTimeout(finish, timeout);
  });
}

export async function speakSpanish(text, options = {}) {
  const synthesis = getSynthesis();
  const content = String(text || '').trim();
  if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!content) return { ok: false, reason: 'empty' };

  const voice = await waitForSpanishVoice();
  if (!voice) return { ok: false, reason: 'missing-spanish-voice' };

  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.voice = voice;
  utterance.lang = /^es(?:[-_]|$)/i.test(voice.lang || '') ? voice.lang : 'es-ES';
  utterance.rate = options.rate ?? 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;
  synthesis.speak(utterance);
  return { ok: true, voice: voice.name, lang: utterance.lang };
}
