const preferredVoiceNames = ['Ava', 'Samantha', 'Allison', 'Alex'];
const noveltyVoices = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Fred|Good News|Jester|Junior|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox/i;

let availableVoices = [];
let listeningForVoices = false;

function isMacChrome() {
  if (typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent;
  return /Macintosh/.test(agent) && /(?:Chrome|Chromium)\//.test(agent)
    && !/(Edg|OPR|CriOS|FxiOS)\//.test(agent);
}

export function primeEnglishVoices() {
  if (!isMacChrome() || typeof window === 'undefined' || !window.speechSynthesis) return;
  const synthesis = window.speechSynthesis;
  const refresh = () => { availableVoices = synthesis.getVoices(); };
  refresh();
  if (!listeningForVoices) {
    synthesis.addEventListener('voiceschanged', refresh);
    listeningForVoices = true;
  }
}

function chooseEnglishVoice() {
  if (!availableVoices.length) primeEnglishVoices();
  const american = availableVoices.filter(voice => /^en[-_]US$/i.test(voice.lang));
  return preferredVoiceNames.map(name => american.find(voice => voice.name === name || voice.name.startsWith(`${name} (`)))
    .find(Boolean) || american.find(voice => voice.localService && !noveltyVoices.test(voice.name))
    || american.find(voice => !noveltyVoices.test(voice.name))
    || american[0] || availableVoices.find(voice => /^en[-_]/i.test(voice.lang));
}

export function prepareEnglishUtterance(utterance) {
  if (!utterance || !/^en[-_]/i.test(utterance.lang) || !isMacChrome()) return utterance;
  const voice = chooseEnglishVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  return utterance;
}
