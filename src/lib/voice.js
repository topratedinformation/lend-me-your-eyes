// Voice input wrapper around the Web Speech API (SpeechRecognition).
// Provides one-shot "listen for a command" and continuous dictation.
// Gracefully reports when unsupported (mainly older/Firefox) so the UI can
// fall back to large on-screen buttons.

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

export const voiceInputSupported = !!SR

// Listen for a single spoken phrase. Resolves with the lowercased transcript,
// or '' on no-speech/timeout. Rejects only on permission/hardware errors.
export function listenOnce({ timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error('Voice input not supported on this browser'))
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    let done = false
    const finish = (val) => { if (!done) { done = true; try { rec.stop() } catch {} resolve(val) } }
    const timer = setTimeout(() => finish(''), timeout)
    rec.onresult = (e) => { clearTimeout(timer); finish((e.results[0][0].transcript || '').trim().toLowerCase()) }
    rec.onerror = (e) => {
      clearTimeout(timer)
      if (e.error === 'no-speech' || e.error === 'aborted') return finish('')
      if (!done) { done = true; reject(new Error(e.error || 'speech error')) }
    }
    rec.onend = () => { clearTimeout(timer); finish('') }
    try { rec.start() } catch (err) { clearTimeout(timer); reject(err) }
  })
}

// A restartable continuous listener (for an always-on assistant). Returns a
// controller with stop(). Calls onPhrase(transcript) for each utterance.
export function listenContinuous(onPhrase, { onError } = {}) {
  if (!SR) { onError && onError(new Error('Voice input not supported')); return { stop() {} } }
  const rec = new SR()
  rec.lang = 'en-US'
  rec.interimResults = false
  rec.continuous = true
  let stopped = false
  rec.onresult = (e) => {
    const r = e.results[e.results.length - 1]
    if (r && r.isFinal) onPhrase((r[0].transcript || '').trim().toLowerCase())
  }
  rec.onerror = (e) => { if (e.error !== 'no-speech') onError && onError(new Error(e.error)) }
  rec.onend = () => { if (!stopped) { try { rec.start() } catch {} } } // auto-restart
  try { rec.start() } catch (err) { onError && onError(err) }
  return { stop() { stopped = true; try { rec.stop() } catch {} } }
}
