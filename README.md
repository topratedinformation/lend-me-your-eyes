# ReadAloud

A free, installable web app (PWA) that reads physical or digital books aloud in a calm voice using the device camera, remembers where you left off, keeps a reading library, and recommends titles via affiliate links. Runs on any device with a browser and a camera.

This is the Phase 1 MVP scaffold described in the product spec.

## Run it

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`).

> **Camera note:** browsers only allow camera access on `https` or `localhost`. `npm run dev` serves on localhost, so the camera works locally. When you deploy, use HTTPS (Vercel/Netlify do this automatically).

To build for production:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## What works now

- **Scan a page** — capture a frame from the camera and OCR it (Tesseract.js, on-device).
- **Continuous mode** — watches for page turns and reads each new page automatically.
- **Load sample** — try the voice on a public-domain passage without a camera.
- **Calm voice** — narrator picker (calmer voices listed first), speed, pitch, and a bedtime mode that gradually slows and softens.
- **Remembers your place** — every book stores a resume point; reopening it picks up where you stopped.
- **Library** — Currently Reading / Want to Read / Completed shelves with progress, saved on-device.
- **Discover** — recommendations based on what you've finished, plus Google Books search, all linking to Amazon with your affiliate tag.

## Accessibility — the hands-free Voice Assistant

For blind and low-vision users, the **🎙️ Assistant** button (top-right, always reachable) opens a full-screen, eyes-free mode. It speaks every prompt, listens for spoken commands, and never requires sight.

The key design choice: it doesn't dump everything or make you guess. It **glances first**, tells you what's in front of the camera in one sentence, then offers choices:

> *"That looks like a page of printed text. You can say: read it, summarise, describe, read the menu, or ask a question."*

Then it does exactly what you asked and offers follow-ups. You stay in control of how much detail you get.

**Spoken commands** (forgiving — natural phrasing works):

| Say… | Does |
|---|---|
| "look" / "what's this?" | One-sentence glance at what's in view, then offers options |
| "read it" / "read it all" | Reads all visible text verbatim |
| "summarise" / "the gist" | 2–3 sentence summary |
| "describe" / "what's around me?" | Describes the scene, layout, people, hazards |
| "read the menu" | Reads a menu by section with prices, clear by ear |
| "what's the price?" (any question) | Answers your specific question about the image |
| "continue my book" | Resumes your last in-progress book and starts reading |
| "library" | Opens your shelves |
| "help" | Lists what you can say |

**How it's built (`src/components/AssistantMode.jsx` + `src/lib/voice.js`, `commands.js`, `vision.js`):**

- Speech output via `SpeechSynthesis`; speech input via `SpeechRecognition` (Web Speech API). The loop is serialised — *speak → listen → act → speak* — so the mic never hears the app's own voice.
- "What am I looking at" calls the **GPT-4o vision** proxy in `api/describe.js`, which supports modes: `glance`, `describe`, `read`, `summary`, `menu`, `identify`, `question`.
- Tap **anywhere** on the screen to talk (with haptic feedback). If the browser has no speech recognition (e.g. desktop Firefox), large labelled buttons do everything instead.
- ARIA live regions announce status/results to screen readers (VoiceOver, TalkBack), big 64px touch targets, visible focus rings, and `prefers-reduced-motion` support.

> Voice recognition support is best on Chrome/Edge/Safari. The non-voice button fallback keeps the feature fully usable everywhere.

## Backend: the vision proxy

The accessibility scene-description needs a secret API key, so it runs server-side in `api/describe.js` (a standard Vercel/Netlify serverless function — no extra framework).

1. Get an OpenAI API key.
2. Set `OPENAI_API_KEY` as an environment variable on your host (Vercel: Project → Settings → Environment Variables). **Never** prefix it with `VITE_` and never commit it.
3. Deploy. The client calls `/api/describe` on the same origin by default; override with `VITE_VISION_ENDPOINT` if the API lives elsewhere.

Locally, `vercel dev` runs both the app and the function together. The vision provider is swappable — the proxy is the only file that talks to OpenAI, so you can point it at Claude or Google Vision without touching the app.

## Configure your affiliate tag

Create a `.env` file:

```
VITE_AMAZON_TAG=your-associates-tag-20
```

Falls back to a placeholder if unset. See `.env.example`.

## Project layout

```
api/
  describe.js             serverless GPT-4o vision proxy (glance/read/summary/menu/describe/identify/question)
src/
  App.jsx                 app shell + read-aloud engine + assistant launch/resume wiring
  lib/
    ocr.js                Tesseract.js wrapper + page-turn fingerprinting
    tts.js                SpeechSynthesis engine, sentence splitting, bedtime curve, speakAsync
    voice.js              SpeechRecognition wrapper (listen once / continuous)
    commands.js           spoken phrase -> intent parser + spoken help text
    vision.js             captures a camera frame and calls the vision proxy
    storage.js            library + resume persistence (localStorage)
    books.js              Google Books search + Amazon affiliate links + recommendations
    sample.js             public-domain demo passage
  components/
    CameraScanner.jsx     camera capture, single + continuous OCR
    Reader.jsx            highlighted text + progress
    VoiceControls.jsx     narrator / speed / pitch / bedtime
    Player.jsx            sticky play/pause/seek/done bar
    Library.jsx           shelves
    Discover.jsx          recommendations + search
    AssistantMode.jsx     hands-free, eyes-free voice assistant (the accessibility core)
```

Each module has a clear seam for the Phase 2/3 upgrades in the spec:

- **OCR** — swap `lib/ocr.js` `recognize()` for Google Cloud Vision / Azure Read for higher accuracy.
- **Voice** — implement the same `speakSentence()` interface against Amazon Polly / ElevenLabs for premium neural voices.
- **Sync** — replace `lib/storage.js` with a Supabase/Firebase version for cross-device library sync.
- **Native** — wrap the built app with [Capacitor](https://capacitorjs.com) for App Store / Play Store builds.

## Important limits (see the spec)

- Reading aloud privately to the user is legal; the app never records or shares the generated audio.
- It cannot ingest DRM-protected Kindle/Apple/Audible files — it reads pages you scan, plain PDF/EPUB you own, and public-domain texts. "Buy" links send users to the store (where you earn affiliate).
- EPUB/PDF file loading is stubbed for Phase 1 (the engine already reads any text passed to `loadBook`); wire `epub.js` / `pdf.js` into a file picker to enable it.

## License / content

Ships only with a public-domain sample (The Secret Garden). Do not bundle copyrighted book text.
