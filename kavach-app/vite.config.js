import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Single source of truth for app naming (manifest). Change here if the app is renamed.
const APP = {
  name: 'Kavach — Society Emergency Response',
  shortName: 'Kavach',
  description: 'Report emergencies in your apartment society and get help fast.',
  themeColor: '#f2f2f7',
  backgroundColor: '#f2f2f7',
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    if (!env.VITE_SUPABASE_URL) {
      console.warn(
        '\n\x1b[33m[kavach] WARNING: VITE_SUPABASE_URL is not set for this production build.\n' +
        '         The app will not be able to reach its backend. Set it in .env.production\n' +
        '         or in the Vercel project environment variables.\x1b[0m\n'
      )
    }
  }

  return {
    plugins: [
      react(),
      VitePWA({
        // Custom service worker (src/sw.js): same precache / navigation / NetworkOnly rules as before,
        // plus Web Push handlers. Workbox injects the precache manifest into self.__WB_MANIFEST.
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'prompt',
        injectRegister: false, // registered from src/components/UpdatePrompt.jsx
        devOptions: { enabled: false },
        includeManifestIcons: false, // icons are already matched by injectManifest.globPatterns
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        },
        manifest: {
          id: '/',
          name: APP.name,
          short_name: APP.shortName,
          description: APP.description,
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: APP.themeColor,
          background_color: APP.backgroundColor,
          categories: ['utilities', 'lifestyle'],
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          ],
          shortcuts: [
            { name: 'Report an emergency', url: '/resident/report' },
          ],
        },
      }),
    ],
  }
})
