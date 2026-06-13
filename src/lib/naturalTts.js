// Natural (neural) text-to-speech client. Calls the /api/speak proxy to get a
// realistic, soothing voice, and plays the returned MP3. Falls back to the
// device voice (tts.js) if the network/API is unavailable.

import { speakAsync as deviceSpeak } from './tts.js'

const ENDPOINT = import.meta.env.VITE_SPEAK_ENDPOINT || '/api/speak'

// Cache fetched audio by voice+text so re-reads and repeats are instant and free.
const cache = new Map()
let current = null // currently playing HTMLAudioElement

export async function fetchSpeech(text, voice = 'shimmer') {
  const key = voice + '|' + text
  if (cache.has(key)) return cache.get(key)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice })
  })
  if (!res.ok) throw new Error('speak failed ' + res.status)
  const url = URL.createObjectURL(await res.blob())
  cache.set(key, url)
  return url
}

export function stopNatural() {
  if (current) { try { current.pause() } catch {} current.onended = null; current = null }
}

export function playUrl(url) {
  return new Promise((resolve, reject) => {
    stopNatural()
    const a = new Audio(url)
    current = a
    a.onended = () => { if (current === a) current = null; resolve() }
    a.onerror = () => reject(new Error('audio playback error'))
    a.play().catch(reject)
  })
}

// Prefetch without playing (for smooth sentence-to-sentence reading).
export function prefetch(text, voice) {
  if (text) fetchSpeech(text, voice).catch(() => {})
}

export async function speakNatural(text, voice = 'shimmer') {
  const url = await fetchSpeech(text, voice)
  await playUrl(url)
}

// Unified speak used by the assistant: natural voice if selected, else device.
export async function speak(text, settings = {}) {
  if (settings.engine === 'natural') {
    try { await speakNatural(text, settings.aiVoice || 'shimmer'); return }
    catch { /* fall back to device below */ }
  }
  await deviceSpeak(text, { voiceName: settings.voice, rate: settings.rate, pitch: settings.pitch })
}

// Friendly labels for the natural-voice picker.
export const AI_VOICES = [
  { id: 'shimmer', label: 'Shimmer — calm & soft (default)' },
  { id: 'sage', label: 'Sage — gentle & warm' },
  { id: 'coral', label: 'Coral — bright & friendly' },
  { id: 'fable', label: 'Fable — expressive storyteller' },
  { id: 'nova', label: 'Nova — warm female' },
  { id: 'alloy', label: 'Alloy — neutral' },
  { id: 'onyx', label: 'Onyx — deep male' },
  { id: 'echo', label: 'Echo — smooth male' }
]
