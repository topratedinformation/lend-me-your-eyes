import { useEffect, useRef, useState, useCallback } from 'react'
import CameraScanner from './components/CameraScanner.jsx'
import Reader from './components/Reader.jsx'
import VoiceControls from './components/VoiceControls.jsx'
import Player from './components/Player.jsx'
import Library from './components/Library.jsx'
import Discover from './components/Discover.jsx'
import AssistantMode from './components/AssistantMode.jsx'
import { splitSentences, speakSentence, stop, bedtimeFactor } from './lib/tts.js'
import { fetchSpeech, playUrl, prefetch, stopNatural } from './lib/naturalTts.js'
import { getBook, saveBook, getSettings, saveSettings, getBooks } from './lib/storage.js'

export default function App() {
  const [tab, setTab] = useState('read')
  const [book, setBook] = useState(null)          // { id, title, sentences:[] }
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [settings, setSettings] = useState(getSettings())
  const [resumeNote, setResumeNote] = useState('')
  const [assistantOpen, setAssistantOpen] = useState(false)

  // refs so the speak loop always sees current values
  const idxRef = useRef(0)
  const playingRef = useRef(false)
  const bookRef = useRef(null)
  const settingsRef = useRef(settings)
  useEffect(() => { idxRef.current = idx }, [idx])
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { bookRef.current = book }, [book])
  useEffect(() => { settingsRef.current = settings }, [settings])

  const persist = useCallback((nextIdx) => {
    const b = bookRef.current
    if (!b) return
    const total = b.sentences.length
    saveBook(b.id, {
      title: b.title,
      text: b.text,
      idx: nextIdx,
      total,
      status: nextIdx >= total - 1 ? 'completed' : 'reading'
    })
  }, [])

  const loadBook = useCallback((title, text, id = title) => {
    stop(); stopNatural()
    setPlaying(false)
    const sentences = splitSentences(text)
    const saved = getBook(id)
    const startIdx = saved && saved.idx && saved.idx < sentences.length ? saved.idx : 0
    const b = { id, title, text, sentences }
    setBook(b)
    bookRef.current = b
    setIdx(startIdx)
    idxRef.current = startIdx
    setResumeNote(startIdx > 0 ? `Resuming at sentence ${startIdx + 1} of ${sentences.length}.` : '')
    saveBook(id, { title, text, idx: startIdx, total: sentences.length, status: startIdx >= sentences.length - 1 ? 'completed' : 'reading' })
    setTab('read')
  }, [])

  // core read loop — speaks current sentence, advances on end.
  // Uses the natural neural voice when selected, with device voice as fallback.
  const speakLoop = useCallback(async () => {
    const b = bookRef.current
    if (!b) return
    const i = idxRef.current
    if (i >= b.sentences.length) { setPlaying(false); playingRef.current = false; return }
    const s = settingsRef.current

    const advance = () => {
      if (!playingRef.current) return
      const next = idxRef.current + 1
      idxRef.current = next
      setIdx(next)
      persist(next)
      speakLoop()
    }

    if (s.engine === 'natural') {
      try {
        const url = await fetchSpeech(b.sentences[i], s.aiVoice)
        if (!playingRef.current) return
        prefetch(b.sentences[i + 1], s.aiVoice) // warm up the next sentence
        await playUrl(url)
        advance()
        return
      } catch {
        /* network/API issue — fall through to device voice */
      }
      if (!playingRef.current) return
    }

    let rate = s.rate, pitch = s.pitch, volume = 1
    if (s.bedtime) {
      const f = bedtimeFactor(i, b.sentences.length)
      rate *= f; pitch *= f; volume = Math.max(0.45, f)
    }
    speakSentence(b.sentences[i], { voiceName: s.voice, rate, pitch, volume }, advance)
  }, [persist])

  const play = useCallback(() => {
    if (!bookRef.current || !bookRef.current.sentences.length) return
    stop(); stopNatural()
    setPlaying(true); playingRef.current = true
    speakLoop()
  }, [speakLoop])

  const pause = useCallback(() => { setPlaying(false); playingRef.current = false; stop(); stopNatural() }, [])
  const toggle = useCallback(() => { playingRef.current ? pause() : play() }, [play, pause])

  const seek = useCallback((delta) => {
    const b = bookRef.current; if (!b) return
    const next = Math.max(0, Math.min(b.sentences.length - 1, idxRef.current + delta))
    idxRef.current = next; setIdx(next); persist(next)
    if (playingRef.current) { stop(); stopNatural(); speakLoop() }
  }, [persist, speakLoop])

  const markDone = useCallback(() => {
    const b = bookRef.current; if (!b) return
    pause()
    const end = b.sentences.length
    idxRef.current = end; setIdx(end); persist(end)
  }, [pause, persist])

  const updateSettings = useCallback((patch) => {
    setSettings(prev => { const next = { ...prev, ...patch }; saveSettings(next); settingsRef.current = next; return next })
  }, [])

  useEffect(() => () => { stop(); stopNatural() }, [])

  // Voice assistant helpers: resume the most recent in-progress book and speak a confirmation.
  const resumeLastBook = useCallback(() => {
    const inProgress = Object.values(getBooks())
      .filter(b => b.status === 'reading' && b.text)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]
    if (!inProgress) return null
    loadBook(inProgress.title, inProgress.text, inProgress.id)
    setAssistantOpen(false)
    setTimeout(() => play(), 400)
    return `Resuming ${inProgress.title}.`
  }, [loadBook, play])

  const openLibraryFromAssistant = useCallback(() => { setAssistantOpen(false); setTab('library') }, [])

  if (assistantOpen) {
    return (
      <AssistantMode
        onExit={() => setAssistantOpen(false)}
        onResumeBook={resumeLastBook}
        onOpenLibrary={openLibraryFromAssistant}
      />
    )
  }

  return (
    <div className="app">
      <header>
        <div className="logo">📖</div>
        <div>
          <h1>Lend Me Your Eyes</h1>
          <div className="sub">reads aloud · describes your world · remembers your place</div>
        </div>
        <button className="assistant-launch" onClick={() => setAssistantOpen(true)}
          aria-label="Open voice assistant for hands-free, eyes-free use">
          🎙️ Assistant
        </button>
      </header>

      <nav className="tabs">
        {['read', 'library', 'discover'].map(t => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className="wrap">
        {tab === 'read' && (
          <>
            <CameraScanner onText={(text, title) => loadBook(title, text)} onSample={loadBook} />
            <VoiceControls settings={settings} onChange={updateSettings} />
            <Reader book={book} idx={idx} resumeNote={resumeNote} />
          </>
        )}
        {tab === 'library' && <Library onOpen={(b) => loadBook(b.title, b.text || '', b.id)} />}
        {tab === 'discover' && <Discover />}
      </main>

      <Player book={book} idx={idx} playing={playing} onToggle={toggle} onSeek={seek} onDone={markDone} />
    </div>
  )
}
