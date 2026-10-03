import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import https from 'https';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Transparent HTTPS agent that bypasses SSL verification issues for emap.pk tiles
const sslAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

/**
 * Transparent proxy middleware plugin for LDA City tiles.
 * Handles potential CORS, SSL validation, and Referer protection issues
 * when streaming tiles from https://emap.pk
 */
function emapTileProxyPlugin(): Plugin {
  return {
    name: 'emap-tile-proxy-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        let targetPath = '';
        if (req.url.startsWith('/emap-tiles/')) {
          targetPath = req.url.replace('/emap-tiles/', '/');
        } else if (req.url.startsWith('/api/tiles/')) {
          targetPath = req.url.replace('/api/tiles/', '/storage/tiles/');
        }

        if (targetPath) {
          const targetUrl = `https://emap.pk${targetPath}`;
          const proxyReq = https.get(
            targetUrl,
            {
              agent: sslAgent,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Referer: 'https://emap.pk/',
                Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              },
            },
            (proxyRes) => {
              // Add permissive CORS headers so browser never blocks tiles
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');

              if (proxyRes.headers['content-type']) {
                res.setHeader('Content-Type', proxyRes.headers['content-type']);
              }
              if (proxyRes.headers['content-length']) {
                res.setHeader('Content-Length', proxyRes.headers['content-length']);
              }

              // Cache tile images for speed
              res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
              res.statusCode = proxyRes.statusCode || 200;
              proxyRes.pipe(res);
            }
          );

          proxyReq.on('error', (err) => {
            console.error('Tile proxy error:', err.message);
            res.statusCode = 502;
            res.end();
          });

          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      emapTileProxyPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'lda_city_master_data.json',
        ],
        manifest: {
          id: '/',
          name: 'LDA City Lahore Map & Master Plan',
          short_name: 'LDA City Map',
          description:
            'Interactive LDA City Lahore Master Cadastral Map with live GPS navigation, plot finder, balloting records and verified property portal by Kashpal Enterprises.',
          theme_color: '#0B132B',
          background_color: '#0B132B',
          display: 'standalone',
          orientation: 'any',
          start_url: '/?source=pwa',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 16 * 1024 * 1024, // Allow precaching lda_city_master_data.json (8.4MB) for offline Android performance
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/unpkg\.com\/leaflet.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'leaflet-assets-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    server: {
      proxy: {
        '/emap-tiles': {
          target: 'https://emap.pk',
          changeOrigin: true,
          secure: false, // Disables strict SSL validation on emap.pk
          headers: {
            Referer: 'https://emap.pk/',
            Origin: 'https://emap.pk',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          rewrite: (p) => p.replace(/^\/emap-tiles/, ''),
        },
      },
      hmr: false,
      watch: null,
    },
  };
});
