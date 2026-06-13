import { useRef, useState, useEffect } from 'react'
import { recognize, pageHash } from '../lib/ocr.js'
import { SAMPLE_TITLE, SAMPLE_TEXT } from '../lib/sample.js'

// Camera capture + OCR. Supports a single "Scan page" capture and an optional
// continuous mode that watches for page turns (new text) and emits each new
// page. Camera requires a secure context (https or localhost).
export default function CameraScanner({ onText, onSample }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const lastHash = useRef(null)
  const loopRef = useRef(null)
  const [status, setStatus] = useState('')
  const [camOn, setCamOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [auto, setAuto] = useState(false)

  useEffect(() => () => stopCamera(), [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCamOn(true)
      setStatus('')
    } catch (e) {
      setStatus('Camera unavailable (' + e.name + '). Camera needs https or localhost — try the sample instead.')
    }
  }

  function stopCamera() {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setCamOn(false); setAuto(false)
  }

  function capture() {
    const v = videoRef.current, c = canvasRef.current
    if (!v || !v.videoWidth) return null
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    return c
  }

  async function scanOnce() {
    const c = capture()
    if (!c) { setStatus('Start the camera first.'); return }
    setBusy(true); setStatus('Reading the page…')
    try {
      const text = await recognize(c, p => setStatus('Reading the page… ' + Math.round(p * 100) + '%'))
      if (text.length < 10) { setStatus('Couldn’t read clear text — more light, hold steady.'); return }
      lastHash.current = pageHash(text)
      setStatus('Done.')
      onText(text, 'Scanned page · ' + new Date().toLocaleString())
    } catch (e) {
      setStatus('OCR failed: ' + e.message)
    } finally { setBusy(false) }
  }

  function toggleAuto() {
    if (auto) { clearInterval(loopRef.current); loopRef.current = null; setAuto(false); setStatus(''); return }
    setAuto(true); setStatus('Continuous mode on — turn pages and it keeps reading.')
    loopRef.current = setInterval(async () => {
      if (busy) return
      const c = capture(); if (!c) return
      try {
        const text = await recognize(c)
        if (text.length < 25) return
        const h = pageHash(text)
        if (h !== lastHash.current) { lastHash.current = h; onText(text, 'Scanned · ' + new Date().toLocaleTimeString()) }
      } catch { /* ignore transient frames */ }
    }, 3500)
  }

  return (
    <section className="card">
      <h2>Scan a page</h2>
      <p className="hint">Point the camera at a book page and tap <b>Scan</b>. Or turn on <b>Continuous</b> and it reads each new page as you turn. No camera? <b>Load sample</b>.</p>
      <video ref={videoRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="row" style={{ marginTop: 12 }}>
        {!camOn
          ? <button className="btn ghost" onClick={startCamera}>Start camera</button>
          : <button className="btn ghost" onClick={stopCamera}>Stop camera</button>}
        <button className="btn" onClick={scanOnce} disabled={!camOn || busy}>Scan page</button>
        <button className={'btn ghost' + (auto ? ' on' : '')} onClick={toggleAuto} disabled={!camOn}>
          {auto ? 'Continuous: on' : 'Continuous'}
        </button>
        <button className="btn ghost" onClick={() => onSample(SAMPLE_TITLE, SAMPLE_TEXT)}>Load sample</button>
      </div>
      {status && <div className="status">{status}</div>}
    </section>
  )
}
