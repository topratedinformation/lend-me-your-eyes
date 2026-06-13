// Local persistence for the reading library + resume points.
// Phase 1 uses localStorage (no server). Swap this module for a
// Supabase/Firebase-backed version later to get cross-device sync
// without touching the rest of the app.

const KEY = 'readaloud:v1'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}
function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

// Statuses: 'reading' | 'completed' | 'want'
export function getBooks() {
  const d = read()
  return d.books || {}
}

export function getBook(id) {
  return getBooks()[id] || null
}

// Create or update a book record. `patch` is merged over the existing record.
export function saveBook(id, patch) {
  const d = read()
  d.books = d.books || {}
  d.books[id] = { id, updated: Date.now(), ...(d.books[id] || {}), ...patch, updatedAt: Date.now() }
  write(d)
  return d.books[id]
}

export function removeBook(id) {
  const d = read()
  if (d.books) { delete d.books[id]; write(d) }
}

export function getSettings() {
  const defaults = { engine: 'natural', aiVoice: 'shimmer', voice: '', rate: 0.92, pitch: 0.95, bedtime: false }
  return { ...defaults, ...(read().settings || {}) }
}

export function saveSettings(settings) {
  const d = read()
  d.settings = { ...(d.settings || {}), ...settings }
  write(d)
}

// ---- Personal profile / memory --------------------------------------------
// What the app remembers about the user so it can tailor itself per context.
const DEFAULT_PROFILE = {
  name: '',
  foodLikes: [],          // e.g. ['steak (medium-rare)', 'red wine']
  foodAvoid: [],          // dietary / dislikes, e.g. ['no shellfish']
  genres: [],             // favourite book genres
  // The voice to use for each context (falls back to settings.aiVoice/default).
  contextVoices: { book: '', menu: '', scene: '', legal: '', default: '' },
  legalPrefs: '',         // what they want flagged in documents, e.g. 'fees, cancellation, auto-renewal'
  memories: []            // freeform "things I like / remember this" notes
}

export function getProfile() {
  return { ...DEFAULT_PROFILE, ...(read().profile || {}),
    contextVoices: { ...DEFAULT_PROFILE.contextVoices, ...((read().profile || {}).contextVoices || {}) } }
}

export function saveProfile(patch) {
  const d = read()
  d.profile = { ...DEFAULT_PROFILE, ...(d.profile || {}), ...patch }
  write(d)
  return d.profile
}

export function addMemory(text) {
  if (!text || !text.trim()) return
  const p = getProfile()
  const memories = [...p.memories, text.trim()]
  return saveProfile({ memories })
}

export function removeMemory(index) {
  const p = getProfile()
  const memories = p.memories.filter((_, i) => i !== index)
  return saveProfile({ memories })
}

// A short text summary of the profile to send to the AI for personalization.
export function profileSummary() {
  const p = getProfile()
  const parts = []
  if (p.name) parts.push(`Name: ${p.name}.`)
  if (p.foodLikes.length) parts.push(`Food they like: ${p.foodLikes.join(', ')}.`)
  if (p.foodAvoid.length) parts.push(`Food to avoid: ${p.foodAvoid.join(', ')}.`)
  if (p.genres.length) parts.push(`Favourite book genres: ${p.genres.join(', ')}.`)
  if (p.legalPrefs) parts.push(`In documents, they especially want flagged: ${p.legalPrefs}.`)
  if (p.memories.length) parts.push(`Other things they like / want remembered: ${p.memories.join('; ')}.`)
  return parts.join(' ')
}

// Pick the voice for a given context, falling back sensibly.
export function voiceForContext(context) {
  const p = getProfile()
  const s = getSettings()
  return (p.contextVoices && p.contextVoices[context]) || p.contextVoices.default || s.aiVoice || 'shimmer'
}

// ---- Privacy-first data program --------------------------------------------
// Everything personal stays on-device by default. The user may OPT IN to
// contribute ANONYMOUS, AGGREGATED signals (coarse category counts only — never
// images, document text, names, or anything identifying). Off unless chosen.
const DEFAULT_CONSENT = {
  shareAnonymousInsights: false, // master opt-in (default OFF)
  consentedAt: null
}

export function getConsent() {
  return { ...DEFAULT_CONSENT, ...(read().consent || {}) }
}

export function setConsent(shareAnonymousInsights) {
  const d = read()
  d.consent = { shareAnonymousInsights, consentedAt: shareAnonymousInsights ? Date.now() : null }
  write(d)
  return d.consent
}

// Builds the ONLY thing that would ever be shared if the user opts in:
// non-identifying, aggregated category signals. No images, no text, no IDs.
export function anonymousInsightsPreview() {
  const p = getProfile()
  const books = Object.values(getBooks())
  return {
    note: 'Anonymous & aggregated. No images, document text, names, or identifiers are ever included.',
    foodCategories: p.foodLikes.length,         // counts only, not the items
    favouriteGenres: p.genres,                  // genre labels are non-identifying
    booksCompleted: books.filter(b => b.status === 'completed').length,
    usesNaturalVoice: getSettings().engine === 'natural'
  }
}

// Hard delete EVERYTHING this app stores about the user (on-device).
export function eraseAll() {
  localStorage.removeItem(KEY)
}

// Lightweight reading stats for the library screen.
export function stats() {
  const books = Object.values(getBooks())
  return {
    total: books.length,
    completed: books.filter(b => b.status === 'completed').length,
    reading: books.filter(b => b.status === 'reading').length
  }
}
