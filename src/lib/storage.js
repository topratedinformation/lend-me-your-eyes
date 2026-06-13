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

// Lightweight reading stats for the library screen.
export function stats() {
  const books = Object.values(getBooks())
  return {
    total: books.length,
    completed: books.filter(b => b.status === 'completed').length,
    reading: books.filter(b => b.status === 'reading').length
  }
}
