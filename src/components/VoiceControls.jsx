import { useEffect, useState } from 'react'
import { rankedVoices, onVoicesReady } from '../lib/tts.js'
import { AI_VOICES } from '../lib/naturalTts.js'

export default function VoiceControls({ settings, onChange }) {
  const [voices, setVoices] = useState([])

  useEffect(() => {
    onVoicesReady(() => {
      const vs = rankedVoices()
      setVoices(vs)
      if (!settings.voice && vs[0]) onChange({ voice: vs[0].name })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const natural = settings.engine === 'natural'

  return (
    <section className="card">
      <h2>Voice</h2>

      <label className="switch" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={natural}
          onChange={e => onChange({ engine: e.target.checked ? 'natural' : 'device' })} />
        Natural AI voice — realistic &amp; soothing (recommended)
      </label>

      {natural ? (
        <div className="row">
          <label className="ctl">Narrator voice
            <select value={settings.aiVoice} onChange={e => onChange({ aiVoice: e.target.value })}>
              {AI_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <div className="row">
          <label className="ctl">Narrator (device)
            <select value={settings.voice} onChange={e => onChange({ voice: e.target.value })}>
              {voices.length === 0 && <option>Loading voices…</option>}
              {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
          <label className="ctl">Speed <b>{Number(settings.rate).toFixed(2)}×</b>
            <input type="range" min="0.5" max="1.3" step="0.05" value={settings.rate}
              onChange={e => onChange({ rate: +e.target.value })} />
          </label>
          <label className="ctl">Pitch <b>{Number(settings.pitch).toFixed(2)}</b>
            <input type="range" min="0.6" max="1.2" step="0.05" value={settings.pitch}
              onChange={e => onChange({ pitch: +e.target.value })} />
          </label>
        </div>
      )}

      <label className="switch" style={{ marginTop: 12 }}>
        <input type="checkbox" checked={!!settings.bedtime} onChange={e => onChange({ bedtime: e.target.checked })} />
        Bedtime mode (gradually slows &amp; softens — device voice)
      </label>

      {natural && (
        <p className="hint" style={{ margin: '12px 0 0' }}>
          The natural voice streams from the cloud, so it needs internet and uses a small amount of your OpenAI credit. Turn it off to use the free on-device voice offline.
        </p>
      )}
    </section>
  )
}
