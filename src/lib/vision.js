// Client for the serverless vision proxy (api/describe.js).
// Captures the current camera frame as a JPEG data URL and asks the model,
// in the requested mode, what the user wants to know.

const ENDPOINT = import.meta.env.VITE_VISION_ENDPOINT || '/api/describe'

// Grab a still frame from a <video> element as a compressed JPEG data URL.
export function frameFromVideo(video, maxWidth = 1280) {
  if (!video || !video.videoWidth) return null
  const scale = Math.min(1, maxWidth / video.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

// mode: glance | describe | read | summary | menu | identify | question
export async function describe(image, mode = 'describe', question = '') {
  if (!image) throw new Error('No image captured')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, mode, question })
  })
  if (!res.ok) {
    let msg = 'Vision request failed'
    try { msg = (await res.json()).error || msg } catch {}
    throw new Error(msg)
  }
  const data = await res.json()
  return data.text
}
