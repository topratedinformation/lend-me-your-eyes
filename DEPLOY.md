# Deploying ReadAloud to test on an iPhone

You need **HTTPS** for the camera, microphone, and voice features to work on iOS — so you can't just open a local IP. Vercel gives you HTTPS for free and runs the vision backend (`api/describe.js`) automatically. ~10 minutes.

---

## Option A — Vercel CLI (fastest, no GitHub needed)

On your computer, in the `readaloud-app` folder:

```bash
npm install            # if you haven't already
npm install -g vercel  # one-time
vercel login           # opens browser to sign in (free account)
vercel                 # deploy — accept the defaults it suggests
```

Vercel auto-detects Vite (build `vite build`, output `dist`) and turns `api/describe.js` into a live function. When it finishes it prints a URL like `https://readaloud-app-xxxx.vercel.app`.

Now add your OpenAI key so the "what am I looking at" feature works:

```bash
vercel env add OPENAI_API_KEY
# paste your key, choose "Production" (and Preview/Development if asked)
vercel --prod          # redeploy so the key takes effect; gives your final URL
```

(Optional) set your affiliate tag the same way: `vercel env add VITE_AMAZON_TAG`.

---

## Option B — Vercel via GitHub (best if you'll keep editing)

1. Put the project on GitHub (`git init`, commit, push to a new repo).
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Leave build/output defaults.
4. Before deploying, open **Environment Variables** and add:
   - `OPENAI_API_KEY` = your OpenAI key
   - `VITE_AMAZON_TAG` = your Amazon Associates tag (optional)
5. **Deploy.** Every future `git push` redeploys automatically.

---

## Open it on your iPhone

1. In **Safari** (use Safari for the first test — iOS speech works most reliably there), go to your Vercel URL.
2. Tap **🎙️ Assistant**. Safari will ask for **microphone** and **camera** — tap **Allow** for both. (If you miss it: Settings → Safari → Camera/Microphone, or the "aA" menu → Website Settings.)
3. Point the camera at a page or the room and say **"look"** — or tap anywhere on the screen to talk.

### Install it like a real app (optional but nice)
Safari → **Share** button → **Add to Home Screen**. It launches full-screen with its own icon (that's the PWA).

---

## iPhone gotchas (so you're not surprised)

- **Sound:** make sure the phone isn't on silent — the assistant's voice uses the media channel. The first spoken line is triggered by your tap on "Assistant" (iOS requires a tap before audio/mic).
- **Voice commands:** all iOS browsers use Safari's engine. Speech recognition works but can be picky; if it ever doesn't catch you, the big labelled buttons do everything.
- **Vision feature stays blank / errors:** that means `OPENAI_API_KEY` isn't set or you didn't redeploy after adding it. Re-run `vercel --prod` (Option A) or trigger a redeploy (Option B).
- **Cost:** the GPT-4o vision calls bill to your OpenAI account per image (cents). Set a usage limit in the OpenAI dashboard while testing.
- **Reading aloud books:** that's the SpeechSynthesis voice (free, on-device) — works offline once loaded.

---

## Quick local check before deploying (optional)

To run both the app and the vision function on your computer:

```bash
echo "OPENAI_API_KEY=sk-..." > .env
vercel dev
```

Open the printed `localhost` URL on the computer (camera works on localhost). For the **phone**, use the deployed HTTPS URL above — a local network IP won't have HTTPS and iOS will block the camera.
