import { getBooks, stats } from '../lib/storage.js'

const SHELVES = [
  ['reading', 'Currently reading'],
  ['want', 'Want to read'],
  ['completed', 'Completed']
]

export default function Library({ onOpen }) {
  const books = getBooks()
  const list = Object.values(books)
  const s = stats()

  if (!list.length) {
    return (
      <section className="card">
        <h2>Your reading life</h2>
        <div className="empty">No books yet — scan a page or load the sample on the Read tab.</div>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>Your reading life</h2>
      <p className="hint">{s.total} titles · {s.completed} finished · {s.reading} in progress. Saved on this device.</p>
      {SHELVES.map(([key, label]) => {
        const shelf = list.filter(b => (b.status || 'reading') === key).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        if (!shelf.length) return null
        return (
          <div key={key}>
            <div className="shelf-title">{label}</div>
            {shelf.map(b => {
              const pct = b.total ? Math.round((b.idx || 0) / b.total * 100) : 0
              return (
                <button key={b.id} className="book" onClick={() => onOpen(b)}>
                  <div className="cover">📕</div>
                  <div className="meta">
                    <b>{b.title}</b>
                    <span>{b.status === 'completed'
                      ? 'Finished ' + new Date(b.updatedAt || Date.now()).toLocaleDateString()
                      : pct + '% · ' + (b.idx || 0) + '/' + (b.total || '?') + ' sentences'}</span>
                  </div>
                  <span className={'pill' + (b.status === 'completed' ? ' done' : '')}>
                    {b.status === 'completed' ? '✓ done' : 'resume'}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </section>
  )
}
