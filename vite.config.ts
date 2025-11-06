import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tahcomlogo.png', 'vite.svg'],
      manifest: {
        name: 'Tahcom Our Partners',
        short_name: 'Partners',
        description: 'Tahcom Partners & Solutions Dashboard - Browse solutions and systems',
        theme_color: '#8B4513',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/our-partners',
        icons: [
          {
            src: '/tahcomlogo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/tahcomlogo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['business', 'productivity'],
        screenshots: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // CRITICAL: Completely bypass service worker for backend API calls
            // Backend APIs should NEVER be intercepted by service worker
            urlPattern: /^https:\/\/tahcom-.*-muneers-projects-276a49f7\.vercel\.app\/.*/i,
            handler: 'NetworkOnly', // Don't cache, go directly to network
            options: {
              cacheableResponse: {
                statuses: [200] // Only cache successful responses
              },
              // Don't let service worker handle these at all
              fetchOptions: {
                cache: 'no-store',
                credentials: 'omit'
              }
            }
          },
          {
            // Cache other external resources (but not backend APIs)
            urlPattern: /^https?:\/\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [200] // Only cache successful responses (not errors)
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  publicDir: 'public',
  server: {
    port: 5173,
    open: true
  }
})

