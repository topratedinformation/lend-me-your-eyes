// Text-to-speech engine wrapping the browser SpeechSynthesis API.
// Free, on-device, offline. The premium path (Amazon Polly / Google /
// ElevenLabs neural voices) would implement the same speak()/stop()
// interface so the rest of the app doesn't change.

export function splitSentences(text) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const matches = cleaned.match(/[^.!?]+[.!?]*/g)
  return (matches || [cleaned]).map(s => s.trim()).filter(Boolean)
}

export function getVoices() {
  return window.speechSynthesis ? window.speechSynthesis.getVoices() : []
}

// Voices that tend to sound calmer/warmer, surfaced first in the picker.
const CALM = /Samantha|Karen|Serena|Daniel|Moira|Tessa|Fiona|Aria|Libby|Google UK English Female/i
export function rankedVoices() {
  return [...getVoices()].sort((a, b) => (CALM.test(b.name) ? 1 : 0) - (CALM.test(a.name) ? 1 : 0))
}

export function onVoicesReady(cb) {
  if (!window.speechSynthesis) return
  if (getVoices().length) cb()
  window.speechSynthesis.onvoiceschanged = cb
}

// Speak a single sentence. Returns the utterance so callers can chain onend.
export function speakSentence(text, { voiceName, rate = 0.92, pitch = 0.95, volume = 1 }, onEnd) {
  const u = new SpeechSynthesisUtterance(text)
  const v = getVoices().find(x => x.name === voiceName)
  if (v) u.voice = v
  u.rate = rate
  u.pitch = pitch
  u.volume = volume
  if (onEnd) u.onend = onEnd
  window.speechSynthesis.speak(u)
  return u
}

export function stop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}

// Speak a phrase and resolve when finished. Used by the hands-free assistant
// to sequence prompt -> listen -> respond without overlapping audio.
export function speakAsync(text, { voiceName, rate = 0.98, pitch = 1 } = {}) {
  return new Promise(resolve => {
    if (!window.speechSynthesis || !text) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    const v = getVoices().find(x => x.name === voiceName)
    if (v) u.voice = v
    u.rate = rate
    u.pitch = pitch
    u.onend = resolve
    u.onerror = resolve
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

// Bedtime mode: gradually slow and soften as the chapter progresses.
export function bedtimeFactor(index, total) {
  const span = Math.max(20, total)
  return Math.max(0.65, 1 - (index / span) * 0.4)
}
