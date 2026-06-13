// Serverless neural text-to-speech proxy for ReadAloud.
// Turns text into a warm, natural, soothing voice using OpenAI's TTS
// (gpt-4o-mini-tts). Uses the same OPENAI_API_KEY as the vision feature.
//
// Request  (POST JSON): { text, voice?, instructions? }
// Response: audio/mpeg bytes (an MP3 the browser plays)
//
// voice options (OpenAI): alloy, ash, ballad, coral, echo, fable, nova,
// onyx, sage, shimmer. Calm/soothing picks: shimmer, sage, coral, fable.

const DEFAULT_INSTRUCTIONS =
  'Read aloud in a warm, calm, soothing and relaxing voice, like a gentle bedtime narrator. ' +
  'Use an unhurried, comforting pace with soft, natural intonation.'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { text, voice = 'shimmer', instructions } = body
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' })

    // OpenAI TTS caps input length; trim very long passages defensively.
    const input = text.slice(0, 4000)

    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input,
        instructions: instructions || DEFAULT_INSTRUCTIONS,
        response_format: 'mp3'
      })
    })

    if (!r.ok) {
      const detail = await r.text()
      return res.status(502).json({ error: 'TTS provider error', detail })
    }

    const arrayBuffer = await r.arrayBuffer()
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).send(Buffer.from(arrayBuffer))
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
