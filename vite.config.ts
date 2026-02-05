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
        // Exclude large WebLLM chunks from precaching
        globPatterns: ['**/*.{css,html,ico,png,svg,woff2}'],
        // Increase limit for larger assets
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        runtimeCaching: [
          {
            // Cache app JS files at runtime
            urlPattern: /\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/en\.wikipedia\.org\/w\/api\.php/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wikipedia-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            // Cache WebLLM model files
            urlPattern: /^https:\/\/huggingface\.co/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'llm-model-cache',
              expiration: {
                maxEntries: 10,
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
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate WebLLM into its own chunk
          'webllm': ['@mlc-ai/web-llm'],
          // Separate React into its own chunk
          'vendor': ['react', 'react-dom'],
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm']
  }
});
