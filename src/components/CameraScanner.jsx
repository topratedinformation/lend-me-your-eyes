import { useRef, useState, useEffect } from 'react'
import { recognize, pageHash } from '../lib/ocr.js'
import { describe, frameFromVideo } from '../lib/vision.js'
import { SAMPLE_TITLE, SAMPLE_TEXT } from '../lib/sample.js'

// Camera capture + reading. The primary reader is GPT-4o vision ('read' mode),
// which is far more reliable on real-world phone photos than on-device OCR.
// If the cloud call fails (offline / no key), it falls back to Tesseract.
// Camera requires a secure context (https or localhost).

const NO_TEXT = /\b(no (readable )?text|couldn'?t (find|read)|there (is|are) no|nothing (to read|readable))\b/i

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCamOn(true)
      setStatus('Point at a page and tap Scan.')
    } catch (e) {
      setStatus('Camera unavailable (' + e.name + '). Camera needs https — try Load sample instead.')
    }
  }

  function stopCamera() {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setCamOn(false); setAuto(false)
  }

  // Read the current frame: try cloud vision, fall back to on-device OCR.
  async function readFrame(onProgress) {
    const v = videoRef.current
    if (!v || !v.videoWidth) return ''
    const img = frameFromVideo(v)
    try {
      const text = await describe(img, 'read')
      if (text && !NO_TEXT.test(text.slice(0, 60))) return text
      if (text && NO_TEXT.test(text.slice(0, 60))) return '' // model saw no text
    } catch {
      // cloud unavailable — fall back to Tesseract
      const c = canvasRef.current
      c.width = v.videoWidth; c.height = v.videoHeight
      c.getContext('2d').drawImage(v, 0, 0)
      try { return await recognize(c, onProgress) } catch { return '' }
    }
    return ''
  }

  async function scanOnce() {
    if (!videoRef.current || !videoRef.current.videoWidth) { setStatus('Start the camera first.'); return }
    setBusy(true); setStatus('Reading the page…')
    try {
      let text = await readFrame(p => setStatus('Reading… ' + Math.round(p * 100) + '%'))
      if (!text || text.trim().length < 5) {
        // Auto-retry once — gives the camera a moment to focus.
        setStatus('Focusing — hold steady…')
        await new Promise(r => setTimeout(r, 900))
        text = await readFrame()
      }
      if (!text || text.trim().length < 5) {
        setStatus('I couldn’t find readable text. Fill the whole frame with the page, get bright even light, hold the phone steady and flat, then tap Scan again.')
        return
      }
      lastHash.current = pageHash(text)
      setStatus('Done.')
      onText(text, 'Scanned page · ' + new Date().toLocaleString())
    } catch (e) {
      setStatus('Scan failed: ' + e.message)
    } finally { setBusy(false) }
  }

  function toggleAuto() {
    if (auto) { clearInterval(loopRef.current); loopRef.current = null; setAuto(false); setStatus(''); return }
    setAuto(true); setStatus('Continuous mode on — turn pages and it keeps reading.')
    // Slower interval since each frame is a cloud call.
    loopRef.current = setInterval(async () => {
      if (busy) return
      try {
        const text = await readFrame()
        if (!text || text.trim().length < 25) return
        const h = pageHash(text)
        if (h !== lastHash.current) { lastHash.current = h; onText(text, 'Scanned · ' + new Date().toLocaleTimeString()) }
      } catch { /* ignore transient frames */ }
    }, 6000)
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
