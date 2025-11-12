import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['tahcomlogo.png', 'vite.svg', 'offline.html'],
      workbox: {
        importScripts: ['push-handler.js'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/rest\//,
          /^\/__\/.*/
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 8,
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          },
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
            urlPattern: /^https:\/\/tahcom-api\.vercel\.app\/.*/i,
            handler: 'NetworkOnly',
            options: {
              fetchOptions: {
                cache: 'no-store',
                credentials: 'omit'
              }
            }
          },
          {
            urlPattern: /^http:\/\/localhost:8787\/.*/i,
            handler: 'NetworkOnly',
            options: {
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
              cacheName: 'external-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 30 // 30 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        name: 'Tahcom Portal',
        short_name: 'Tahcom',
        description: 'Tahcom KPI & partners portal – manage tasks, dashboards, and explore solutions.',
        theme_color: '#8B4513',
        background_color: '#FFF7ED',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/login',
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: 'Open Dashboard',
            short_name: 'Dashboard',
            description: 'Jump straight into the KPI dashboard',
            url: '/dashboard',
            icons: [
              {
                src: '/tahcomlogo.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          },
          {
            name: 'Explore Partners',
            short_name: 'Partners',
            description: 'View partner solutions quickly',
            url: '/our-partners',
            icons: [
              {
                src: '/tahcomlogo.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          }
        ],
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
        screenshots: []
      },
      injectRegister: 'auto',
      strategies: 'generateSW'
    })
  ],
  publicDir: 'public',
  server: {
    port: 5173,
    open: true
  }
})

