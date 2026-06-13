import { useState } from 'react'
import { AI_VOICES } from '../lib/naturalTts.js'
import {
  getProfile, saveProfile, addMemory, removeMemory,
  getConsent, setConsent, anonymousInsightsPreview, eraseAll
} from '../lib/storage.js'

// The "You" screen: a private, on-device memory of the user's tastes and the
// voice they like per context — plus a transparent, opt-in data program.
const CONTEXTS = [
  ['book', 'Reading books'],
  ['menu', 'Menus / restaurants'],
  ['scene', 'Describing surroundings'],
  ['legal', 'Documents']
]

function listToText(a) { return (a || []).join(', ') }
function textToList(t) { return (t || '').split(',').map(s => s.trim()).filter(Boolean) }

export default function Profile() {
  const [p, setP] = useState(getProfile())
  const [consent, setC] = useState(getConsent())
  const [newMemory, setNewMemory] = useState('')
  const [saved, setSaved] = useState(false)

  const update = (patch) => { const next = saveProfile(patch); setP(next); flash() }
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1200) }

  return (
    <>
      {/* ---- Personal memory ---- */}
      <section className="card">
        <h2>What I remember about you</h2>
        <p className="hint">Stored privately on this device and used to tailor what I say — e.g. recommend the steak on a menu, or read books in your favourite voice. {saved && <b style={{ color: 'var(--good)' }}>Saved ✓</b>}</p>

        <label className="ctl" style={{ marginBottom: 12 }}>Your name (optional)
          <input className="search" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} onBlur={e => update({ name: e.target.value })} placeholder="What should I call you?" />
        </label>

        <label className="ctl" style={{ marginBottom: 12 }}>Food &amp; drink you like
          <input className="search" defaultValue={listToText(p.foodLikes)} onBlur={e => update({ foodLikes: textToList(e.target.value) })} placeholder="e.g. steak medium-rare, red wine, spicy food" />
        </label>

        <label className="ctl" style={{ marginBottom: 12 }}>Food to avoid / dietary
          <input className="search" defaultValue={listToText(p.foodAvoid)} onBlur={e => update({ foodAvoid: textToList(e.target.value) })} placeholder="e.g. no shellfish, vegetarian" />
        </label>

        <label className="ctl" style={{ marginBottom: 12 }}>Favourite book genres
          <input className="search" defaultValue={listToText(p.genres)} onBlur={e => update({ genres: textToList(e.target.value) })} placeholder="e.g. mystery, history, sci-fi" />
        </label>

        <label className="ctl" style={{ marginBottom: 12 }}>In documents, always flag…
          <input className="search" defaultValue={p.legalPrefs} onBlur={e => update({ legalPrefs: e.target.value })} placeholder="e.g. fees, cancellation terms, auto-renewal, deadlines" />
        </label>
      </section>

      {/* ---- Voice per context ---- */}
      <section className="card">
        <h2>The voice I use for each thing</h2>
        <p className="hint">Pick a different narrator for each context — a calm one for bedtime books, a clear one for documents.</p>
        {CONTEXTS.map(([key, label]) => (
          <label className="ctl" key={key} style={{ marginBottom: 10 }}>{label}
            <select value={p.contextVoices[key] || ''} onChange={e => update({ contextVoices: { ...p.contextVoices, [key]: e.target.value } })}>
              <option value="">Default voice</option>
              {AI_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </label>
        ))}
      </section>

      {/* ---- Freeform memories ---- */}
      <section className="card">
        <h2>Things to remember</h2>
        <p className="hint">Add anything — “I take my coffee black”, “read to me slowly at night”. You can also just say “remember that…” to the assistant.</p>
        <div className="row" style={{ marginBottom: 10 }}>
          <input className="search" value={newMemory} onChange={e => setNewMemory(e.target.value)} placeholder="Remember that…" />
          <button className="btn" onClick={() => { if (newMemory.trim()) { setP(addMemory(newMemory)); setNewMemory('') } }}>Add</button>
        </div>
        {p.memories.length === 0 && <div className="empty">Nothing saved yet.</div>}
        {p.memories.map((m, i) => (
          <div key={i} className="book">
            <div className="meta"><b style={{ whiteSpace: 'normal' }}>{m}</b></div>
            <button className="pill" onClick={() => setP(removeMemory(i))}>remove</button>
          </div>
        ))}
      </section>

      {/* ---- Privacy & data program ---- */}
      <section className="card">
        <h2>Privacy &amp; your data</h2>
        <p className="hint">Everything above lives <b>only on this device</b>. Images, documents, and what you read are never stored or sold. You're in control.</p>

        <label className="switch" style={{ marginBottom: 8 }}>
          <input type="checkbox" checked={consent.shareAnonymousInsights}
            onChange={e => setC(setConsent(e.target.checked))} />
          Share <b>anonymous, aggregated</b> insights to help improve the app (optional, off by default)
        </label>
        <p className="hint" style={{ margin: '0 0 12px' }}>
          If on, only non-identifying category trends are shared (e.g. “likes 3 food categories”, “genres: mystery”). Never your name, images, documents, location, or anything that identifies you. Turn it off anytime.
        </p>

        {consent.shareAnonymousInsights && (
          <pre className="reader" style={{ fontSize: 12, maxHeight: 160 }}>{JSON.stringify(anonymousInsightsPreview(), null, 2)}</pre>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={() => {
            const data = localStorage.getItem('readaloud:v1') || '{}'
            const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
            const a = document.createElement('a'); a.href = url; a.download = 'lend-me-your-eyes-data.json'; a.click()
            URL.revokeObjectURL(url)
          }}>Export my data</button>
          <button className="btn ghost" style={{ color: '#f3d6dd', borderColor: '#5a3a44' }} onClick={() => {
            if (confirm('Erase everything this app remembers about you on this device? This cannot be undone.')) {
              eraseAll(); setP(getProfile()); setC(getConsent())
            }
          }}>Erase all my data</button>
        </div>
        <div className="disclosure">You can export or permanently erase your data at any time. We follow a privacy-first, opt-in approach.</div>
      </section>
    </>
  )
}
