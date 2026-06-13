import { useEffect, useRef, useState, useCallback } from 'react'
import { stop as stopSpeech } from '../lib/tts.js'
import { speak as speakSmart, stopNatural } from '../lib/naturalTts.js'
import { getSettings } from '../lib/storage.js'
import { listenOnce, voiceInputSupported } from '../lib/voice.js'
import { parseCommand, HELP_TEXT } from '../lib/commands.js'
import { describe, frameFromVideo } from '../lib/vision.js'

// Hands-free, screen-reader-friendly assistant for blind / low-vision users.
// Loop: speak a prompt -> listen for a command -> act (glance / read / summarise
// / describe / answer a question) -> speak the result -> offer next. Everything
// is announced aloud; nothing requires sight. A large "Talk" target and a set of
// big labelled buttons provide a non-voice fallback.

const OFFER = "You can say: read it, summarise, describe, read the menu, or ask a question. Say help for everything."

export default function AssistantMode({ onExit, onResumeBook, onOpenLibrary }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const activeRef = useRef(true)
  const busyRef = useRef(false)
  const [status, setStatus] = useState('Starting…')
  const [response, setResponse] = useState('')
  const [listening, setListening] = useState(false)
  const [camError, setCamError] = useState('')

  const say = useCallback(async (text, alsoShow = true) => {
    if (alsoShow) setResponse(text)
    setStatus('Speaking…')
    await speakSmart(text, getSettings())
  }, [])

  const capture = useCallback(() => frameFromVideo(videoRef.current), [])

  // Run one intent. Guarded so voice loop and buttons can't overlap.
  const handle = useCallback(async (cmd) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const visionModes = { glance: 1, describe: 1, read: 1, summary: 1, menu: 1, identify: 1 }
      if (cmd.intent === 'help') { await say(HELP_TEXT); return }
      if (cmd.intent === 'library') { await say('Opening your library.'); onOpenLibrary?.(); return }
      if (cmd.intent === 'resume') { const t = onResumeBook?.(); await say(t || 'You have no book in progress yet.'); return }
      if (cmd.intent === 'pause') { stopSpeech(); stopNatural(); setStatus('Paused.'); return }
      if (['next', 'back', 'play'].includes(cmd.intent)) { await say('That control is on the reading screen. Say library to go to your books.'); return }

      if (visionModes[cmd.intent] || cmd.intent === 'question' || cmd.intent === 'unknown') {
        const img = capture()
        if (!img) { await say('I can’t see anything yet — make sure the camera is on and pointed at what you want.'); return }
        const mode = (cmd.intent === 'unknown') ? 'question' : cmd.intent
        setStatus(mode === 'glance' ? 'Taking a look…' : 'Looking closely…')
        try {
          const text = await describe(img, mode, cmd.question || '')
          if (mode === 'glance') {
            await say(text + ' ' + OFFER)
          } else {
            await say(text)
            await say('Anything else? ' + OFFER, false)
          }
        } catch (e) {
          await say('Sorry, I couldn’t reach the vision service. ' + (e.message || ''))
        }
        return
      }
      // silence / nothing recognised
      await say('I didn’t catch that. ' + OFFER, false)
    } finally {
      busyRef.current = false
    }
  }, [say, capture, onOpenLibrary, onResumeBook])

  // Trigger a command immediately (from a button or the big Talk area when voice
  // input is unavailable). Cancels current speech first.
  const trigger = useCallback(async (intent) => {
    stopSpeech(); stopNatural()
    await handle({ intent })
  }, [handle])

  // Conversation loop: listen -> parse -> handle -> repeat. Serialised so the
  // mic never hears the app's own voice.
  const loopRef = useRef(null)
  const startLoop = useCallback(() => {
    if (!voiceInputSupported) return
    let silences = 0
    const run = async () => {
      while (activeRef.current) {
        if (busyRef.current) { await new Promise(r => setTimeout(r, 300)); continue }
        setListening(true); setStatus('Listening…')
        let said = ''
        try { said = await listenOnce({ timeout: 9000 }) }
        catch (e) { setListening(false); await say('I need microphone access to listen. You can also use the buttons below.', false); return }
        setListening(false)
        if (!activeRef.current) return
        if (!said) {
          silences++
          if (silences === 2) await say('I’m still here. Say help for options, or tap the screen to talk.', false)
          continue
        }
        silences = 0
        await handle(parseCommand(said))
      }
    }
    loopRef.current = run()
  }, [handle, say])

  useEffect(() => {
    activeRef.current = true
    let cancelled = false
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (e) {
        setCamError('Camera unavailable (' + e.name + '). Needs https or localhost.')
      }
      await say(
        (voiceInputSupported
          ? 'Assistant ready. Point your camera at what you’d like to explore, then just ask. '
          : 'Assistant ready. This browser can’t hear voice commands, so use the large buttons below. ') + OFFER
      )
      if (!cancelled) startLoop()
    }
    init()
    return () => {
      cancelled = true
      activeRef.current = false
      stopSpeech(); stopNatural()
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const tapTalk = async () => {
    // Haptic confirmation, then either interrupt+listen (voice) or do a glance.
    if (navigator.vibrate) navigator.vibrate(30)
    stopSpeech(); stopNatural()
    if (voiceInputSupported) {
      if (busyRef.current) return
      setListening(true); setStatus('Listening…')
      let said = ''
      try { said = await listenOnce({ timeout: 9000 }) } catch {}
      setListening(false)
      await handle(parseCommand(said || 'look'))
    } else {
      await trigger('glance')
    }
  }

  return (
    <div className="assistant" role="region" aria-label="ReadAloud voice assistant">
      <button className="talk-area" onClick={tapTalk}
        aria-label="Tap anywhere to talk to the assistant">
        <video ref={videoRef} autoPlay playsInline muted aria-hidden="true" />
        <div className={'mic' + (listening ? ' on' : '')} aria-hidden="true">{listening ? '🎙️' : '👁️'}</div>
        <div className="talk-label">{listening ? 'Listening — speak now' : 'Tap anywhere to talk'}</div>
      </button>

      {camError && <div className="status warn" role="alert">{camError}</div>}
      <div className="status" aria-live="assertive" role="status">{status}</div>
      <div className="assistant-response" aria-live="polite">{response}</div>

      <div className="assistant-actions" aria-label="Assistant actions">
        <button className="big" onClick={() => trigger('glance')}>Look — what’s this?</button>
        <button className="big" onClick={() => trigger('read')}>Read it all</button>
        <button className="big" onClick={() => trigger('summary')}>Summarise</button>
        <button className="big" onClick={() => trigger('describe')}>Describe around me</button>
        <button className="big" onClick={() => trigger('menu')}>Read the menu</button>
        <button className="big" onClick={() => trigger('help')}>What can I say?</button>
        <button className="big exit" onClick={() => { activeRef.current = false; stopSpeech(); stopNatural(); onExit?.() }}>Exit assistant</button>
      </div>
    </div>
  )
}
