# Lend Me Your Eyes — real iOS app via Apple's developer framework (Capacitor)

This turns the web app into a genuine native iOS app you can run on your iPhone, update, and distribute through **TestFlight** — Apple's official beta-testing framework. It uses **Capacitor**, the standard way to wrap a web app as a native iOS app.

## How updates work (important — this is the good part)

The app is configured (`capacitor.config.json`) to **load your live site** (`https://lend-me-your-eyes.vercel.app`) inside the native shell. That means:

- **Content/feature updates are instant.** Every time we push to GitHub and Vercel redeploys, the app updates the next time it's opened — no rebuild, no new TestFlight upload.
- You only rebuild in Xcode when the *native shell itself* changes (new app icon, permissions, native plugins).

So you build it in Xcode once, get it on your phone / TestFlight, and from then on you "refine based on functionality" just by telling me what to fix — I push the change and it appears in the app.

## What you need (one-time)

1. A **Mac** with **Xcode** installed (free from the Mac App Store).
2. An **Apple Developer account** — free tier lets you install on *your own* iPhone (re-sign every 7 days); the **$99/year** Apple Developer Program is required for **TestFlight** and the App Store.
3. **Node.js** installed (you already have it).

> I can't run Xcode or sign the app for you — Apple builds and signing happen on your Mac with your Apple ID. I've prepared everything up to that point and the exact steps below.

## Steps

In Terminal, in the `lend-me-your-eyes` project folder:

```bash
npm install            # installs Capacitor (already in package.json)
npm run build          # builds the web app into dist/
npm run ios:add        # creates the native iOS project (one time)
npm run ios:sync       # copies config into the iOS project
npm run ios:open       # opens the project in Xcode
```

Then in **Xcode**:

1. Select the **App** target → **Signing & Capabilities** → tick **Automatically manage signing** and choose your Apple ID **Team**.
2. Open **Info.plist** and add these usage strings (required or the app is rejected / camera & mic silently fail):
   - `NSCameraUsageDescription` → "Used to read pages and describe what's in front of you."
   - `NSMicrophoneUsageDescription` → "Used for hands-free voice commands."
   - `NSSpeechRecognitionUsageDescription` → "Used to understand your voice commands."
3. Plug in your iPhone, select it as the run target, press **▶ Run**. The app installs on your phone.

## Distribute via TestFlight (needs the $99 program)

1. In Xcode: **Product → Archive**.
2. In the Organizer window: **Distribute App → App Store Connect → Upload**.
3. In [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**, add yourself/testers. They install the **TestFlight** app and get the build.

## Known limitation to plan for

iOS's in-app web view (WKWebView) supports the **camera, microphone, and the natural voice**, but **does not expose the browser's speech-recognition API**. So inside the native app, *voice command input* won't work the same as in Safari until we add a **native speech plugin** (`@capacitor-community/speech-recognition`). Everything else — scanning, reading, the natural voice, the assistant's spoken output, and all the large on-screen buttons — works. The buttons are a full fallback for voice input in the meantime. Tell me when you want the native voice-input plugin wired in and I'll do it.

## The refine loop you described

1. You test the app on your iPhone / TestFlight.
2. You tell me what to change or fix.
3. I update the code and push to GitHub → Vercel auto-deploys → the app shows the update on next open (no rebuild needed for content/feature changes).

That's the real-world developer loop, with Apple's framework, exactly as you wanted.
