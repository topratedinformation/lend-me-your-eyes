import { useEffect, useState } from 'react'
import { recommend, searchBooks } from '../lib/books.js'
import { getBooks } from '../lib/storage.js'

export default function Discover() {
  const [recs, setRecs] = useState([])
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { recommend(getBooks()).then(setRecs).catch(() => {}) }, [])

  async function search(e) {
    e.preventDefault()
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    try { setResults(await searchBooks(q)) }
    catch { setResults([]) }
    finally { setLoading(false) }
  }

  const Card = ({ b }) => (
    <div className="rec">
      <div className="cover">{b.thumb ? <img src={b.thumb} alt="" /> : '📘'}</div>
      <div className="meta">
        <b>{b.title}</b>
        <span>{b.author}{b.year ? ' · ' + b.year : ''}</span>
      </div>
      <a href={b.buy} target="_blank" rel="nofollow sponsored noopener">Buy on Amazon</a>
    </div>
  )

  return (
    <section className="card">
      <h2>Discover</h2>
      <p className="hint">Suggestions based on what you’ve finished, plus search. Links go to the store — a purchase earns affiliate commission, which keeps the app free.</p>

      <form className="row" onSubmit={search} style={{ marginBottom: 14 }}>
        <input className="search" placeholder="Search any title or author…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn" type="submit">Search</button>
      </form>

      {loading && <div className="status">Searching…</div>}

      {results
        ? (results.length ? results.map(b => <Card key={b.id} b={b} />) : <div className="empty">No results.</div>)
        : (<>
            <div className="shelf-title">Recommended for you</div>
            {recs.map(b => <Card key={b.id} b={b} />)}
          </>)}

      <div className="disclosure">As an Amazon Associate the app earns from qualifying purchases. Set your tag via the VITE_AMAZON_TAG environment variable.</div>
    </section>
  )
}
