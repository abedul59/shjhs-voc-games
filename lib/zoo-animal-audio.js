// Small synthesized calls keep the game playable without downloading sound files.
let audioContext;

export async function playZooAnimalCall(animalId) {
  if (typeof window === 'undefined') return;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;
  try {
    audioContext ||= new AudioContextType();
    await audioContext.resume();
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.value = .22;
    master.connect(audioContext.destination);
    const tone = (offset, duration, from, to, wave = 'sine', volume = .35) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(Math.max(35, from), now + offset);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, to), now + offset + duration);
      gain.gain.setValueAtTime(.001, now + offset);
      gain.gain.linearRampToValueAtTime(volume, now + offset + Math.min(.06, duration / 3));
      gain.gain.exponentialRampToValueAtTime(.001, now + offset + duration);
      oscillator.connect(gain); gain.connect(master);
      oscillator.start(now + offset); oscillator.stop(now + offset + duration + .02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    };
    if (['lion', 'tiger', 'snowleopard'].includes(animalId)) {
      tone(0, .65, 125, 65, 'sawtooth', .37); tone(.14, .54, 75, 48, 'triangle', .28);
    } else if (animalId === 'elephant') {
      tone(0, .75, 170, 480, 'sawtooth', .3); tone(.18, .56, 240, 630, 'triangle', .18);
    } else if (['penguin', 'flamingo'].includes(animalId)) {
      tone(0, .18, 630, 960, 'sine', .24); tone(.22, .15, 750, 1130, 'sine', .22); tone(.42, .19, 820, 690, 'sine', .2);
    } else if (animalId === 'seal') {
      tone(0, .24, 290, 150, 'square', .22); tone(.32, .23, 280, 145, 'square', .2);
    } else if (animalId === 'orangutan') {
      tone(0, .42, 245, 150, 'sine', .33); tone(.48, .5, 210, 95, 'sine', .28);
    } else if (['zebra', 'giraffe', 'hippo'].includes(animalId)) {
      tone(0, .25, 215, 105, 'sawtooth', .22); tone(.34, .3, 170, 80, 'triangle', .24);
    } else {
      tone(0, .23, 340, 530, 'sine', .23); tone(.29, .25, 430, 310, 'triangle', .2);
    }
    window.setTimeout(() => master.disconnect(), 1600);
  } catch { /* Browsers may disable Web Audio; the tile remains usable. */ }
}
