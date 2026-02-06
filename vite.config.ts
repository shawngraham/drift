import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Aethereal Drift',
        short_name: 'Drift',
        description: 'Psychogeographic exploration - transmissions from parallel dimensions',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Include JS in precache but skip the huge webllm chunk
        globPatterns: ['**/*.{css,html,ico,png,svg,woff2,js}'],
        globIgnores: ['**/webllm*.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // Use NetworkFirst for navigation to avoid stale page issues
        navigateFallback: null,
        runtimeCaching: [
          {
            // Wikipedia API - network first with cache fallback
            urlPattern: /^https:\/\/en\.wikipedia\.org\/w\/api\.php/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wikipedia-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Hugging Face model files - cache first (large files)
            urlPattern: /^https:\/\/huggingface\.co/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-model-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // CDN resources for transformers.js
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // WebLLM is dynamically imported (lazy-loaded) so Rollup handles its chunking
          'transformers': ['@huggingface/transformers'],
          'vendor': ['react', 'react-dom'],
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm']
  }
});
