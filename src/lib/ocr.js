// OCR wrapper around Tesseract.js (free, on-device).
// A single reusable worker is created lazily. To upgrade accuracy later,
// replace recognize() with a call to Google Cloud Vision / Azure Read —
// the signature (canvas/blob -> { text }) stays the same.

import { createWorker } from 'tesseract.js'

let workerPromise = null

async function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') onProgress(m.progress)
      }
    })
  }
  return workerPromise
}

// Accepts a canvas, image, or blob. Returns trimmed recognised text.
export async function recognize(source, onProgress) {
  const worker = await getWorker(onProgress)
  const { data } = await worker.recognize(source)
  return (data.text || '').trim()
}

// Cheap fingerprint of recognised text so the continuous scanner can tell
// "same page still in view" from "user turned to a new page".
export function pageHash(text) {
  const norm = (text || '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 400)
  let h = 0
  for (let i = 0; i < norm.length; i++) { h = (h * 31 + norm.charCodeAt(i)) | 0 }
  return h
}

export async function dispose() {
  if (workerPromise) {
    const w = await workerPromise
    await w.terminate()
    workerPromise = null
  }
}
