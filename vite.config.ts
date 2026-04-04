import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: 'autoUpdate',
      // Include all built assets + public files for precaching
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.svg',
        'icons.svg',
        'robots.txt',
        'sitemap.xml',
      ],
      manifest: {
        name: 'Pretty Fish — Mermaid Diagram Editor',
        short_name: 'Pretty Fish',
        description: 'A professional Mermaid diagram editor with live preview, infinite canvas, and offline support.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1623',
        theme_color: '#0f1623',
        icons: [
          {
            src: '/apple-touch-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        categories: ['productivity', 'utilities', 'developer tools'],
      },
      workbox: {
        // Precache all JS/CSS/HTML/WOFF2 assets from the build
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // Maximum file size to precache (5 MB — mermaid chunks are large)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Runtime caching strategies for anything not precached
        runtimeCaching: [
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Google Fonts webfont files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // CDN assets (if any)
            urlPattern: /^https:\/\/cdn\..*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        // Clean up old caches on activate
        cleanupOutdatedCaches: true,
        // Take control of all open tabs immediately on SW update
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        // Enable SW in dev mode for testing (optional, off by default)
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Only pick up vitest tests under src/ — the tests/ dir is for Playwright
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})