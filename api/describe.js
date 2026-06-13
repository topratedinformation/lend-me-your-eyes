// Serverless vision proxy for ReadAloud's accessibility assistant.
// Holds the OpenAI key server-side (never expose it in the client) and calls
// GPT-4o vision. Deploy as-is on Vercel (/api/describe) or Netlify.
//
// Env var required: OPENAI_API_KEY
//
// Request  (POST JSON): { image: "data:image/jpeg;base64,...", mode, question? }
// Response (JSON):      { text: "spoken-friendly answer" }
//
// `mode` drives WHAT the user is told, so a blind user isn't forced to choose
// blind or drowned in detail:
//   glance    -> one short sentence: what is in front of the camera
//   describe  -> describe the scene / surroundings
//   read      -> read all visible text, verbatim, in reading order
//   summary   -> a 2-3 sentence summary of the text or scene
//   menu      -> read a menu aloud: sections, items, prices, clearly
//   identify  -> identify the main object / product / label
//   question  -> answer the user's spoken question about the image

const PROMPTS = {
  glance:
    "You are assisting a blind user. In ONE short sentence, say what is in front of the camera " +
    "(e.g. 'a page of printed text', 'a restaurant menu', 'a room with a sofa and window', " +
    "'a product label'). No preamble, no markdown.",
  describe:
    "You are the eyes of a blind user. Describe the scene clearly and concisely in plain spoken " +
    "language: the setting, key objects, people (count and what they're doing), layout and any " +
    "hazards. Lead with the most important thing. Keep it under 90 words. No markdown.",
  read:
    "You are reading aloud for a blind user. Transcribe ALL visible text exactly, in natural " +
    "reading order. Do not summarise, add, or comment. If there is no readable text, say so plainly.",
  summary:
    "You are assisting a blind user. Give a 2-3 sentence summary of the main content (text or scene). " +
    "Plain spoken language, no markdown, no preamble.",
  menu:
    "You are reading a menu aloud for a blind user. Organise by section. For each item give its name " +
    "and price clearly, e.g. 'Margherita pizza, fourteen dollars'. Be complete but easy to follow by " +
    "ear. No markdown.",
  identify:
    "You are assisting a blind user. Identify the main object or product in view and the most useful " +
    "details (what it is, brand, any key text like flavour, dosage, expiry, or instructions). Under 70 " +
    "words, plain spoken language.",
  question:
    "You are the eyes of a blind user. Answer their question about the image directly and concisely in " +
    "plain spoken language. If the answer isn't visible, say so. No markdown.",
  // Returns ONE keyword so the app can decide how to react.
  classify:
    "Reply with exactly ONE lowercase word naming what is mainly in view: " +
    "menu, book, document, legal, product, label, sign, or scene. No other words, no punctuation.",
  // Personalized recommendations (e.g. restaurant menus) using the user's tastes.
  recommend:
    "You are a warm personal assistant helping the user with what's in view (often a menu). " +
    "Use what you know about their tastes to make specific, personal recommendations — call out their " +
    "known favourites if they appear, respect anything they avoid, and give 1-3 concrete suggestions with " +
    "prices if shown. Plain spoken language, under 90 words, no markdown.",
  // Legal / contract documents: explain and flag — explicitly NOT legal advice.
  legal:
    "You are helping the user understand a legal or contract document. Begin by briefly saying you are not " +
    "a lawyer and this is general information, not legal advice. Then explain in plain spoken language what " +
    "the document is, the key terms, obligations, dates, costs, and anything they should be cautious about " +
    "or clarify before signing — paying special attention to anything in their stated preferences. Finish by " +
    "suggesting they have a qualified lawyer review anything important. No markdown."
}

export default async function handler(req, res) {
  // CORS so the PWA can call it from any origin (lock this down in production).
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { image, mode = 'describe', question = '', profile = '' } = body
    if (!image) return res.status(400).json({ error: 'image (data URL) required' })

    let system = PROMPTS[mode] || PROMPTS.describe
    // Personalization: the client may send a short summary of the user's tastes
    // (stored privately on their device) so responses can be tailored.
    if (profile) system += '\n\nWhat you know about this user (use it to personalize): ' + profile
    const userText = mode === 'question'
      ? (question || 'What am I looking at?')
      : 'Here is the camera image.'

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: mode === 'read' || mode === 'menu' ? 1200 : 350,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: image, detail: 'auto' } }
          ] }
        ]
      })
    })

    if (!r.ok) {
      const detail = await r.text()
      return res.status(502).json({ error: 'Vision provider error', detail })
    }
    const data = await r.json()
    const text = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I couldn’t describe that.'
    return res.status(200).json({ text, mode })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
