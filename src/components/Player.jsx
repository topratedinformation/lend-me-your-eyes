// Sticky bottom playback bar.
export default function Player({ book, idx, playing, onToggle, onSeek, onDone }) {
  const now = book
    ? `${book.title} · ${Math.min(idx + 1, book.sentences.length)}/${book.sentences.length}`
    : 'Idle'
  return (
    <footer className="player-bar">
      <div className="player">
        <button className="iconbtn ghost" onClick={() => onSeek(-1)} title="Back a sentence">⏮</button>
        <button className="iconbtn" onClick={onToggle} title="Play / pause">{playing ? '⏸' : '▶'}</button>
        <div className="now">{now}</div>
        <button className="iconbtn ghost" onClick={onDone} title="Mark finished">✓</button>
      </div>
    </footer>
  )
}
