import { useEffect, useRef } from 'react'

// Shows the text with the spoken portion highlighted and a progress bar.
export default function Reader({ book, idx, resumeNote }) {
  const curRef = useRef(null)
  useEffect(() => { if (curRef.current) curRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' }) }, [idx])

  const total = book ? book.sentences.length : 0
  const pct = total ? Math.round((idx / total) * 100) : 0

  return (
    <section className="card">
      <h2>{book ? book.title : 'Reading'}</h2>
      {resumeNote && <div className="status">{resumeNote}</div>}
      <div className="reader">
        {!book && <span className="empty">Nothing loaded yet. Scan a page or load the sample.</span>}
        {book && book.sentences.map((s, i) => (
          <span key={i} ref={i === idx ? curRef : null} className={i < idx ? 'spoken' : i === idx ? 'current' : ''}>
            {s + ' '}
          </span>
        ))}
      </div>
      <div className="bar"><i style={{ width: pct + '%' }} /></div>
    </section>
  )
}
