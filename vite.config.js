import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PWA config makes the app installable on phones, tablets and desktop
// from a single codebase — the "works on every device with a camera" goal.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Lend Me Your Eyes',
        short_name: 'Lend Eyes',
        description: 'Reads your books aloud in a calm voice, describes the world around you, and remembers your place.',
        theme_color: '#15171c',
        background_color: '#15171c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Tesseract pulls large WASM/training files at runtime; don't precache them.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Always try the network first for page loads so a new deploy shows up
        // immediately; only fall back to the cached version when offline.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 3 }
          }
        ]
      }
    })
  ]
})
