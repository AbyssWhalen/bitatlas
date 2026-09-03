import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_SHORT_NAME } from './src/app/brand';
import { PDF_JS_CACHE_NAME } from './src/app/pdf-cache';

const pdfJsRoot = normalizePath(fileURLToPath(new URL('../../node_modules/pdfjs-dist', import.meta.url)));

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (!path.includes('/node_modules/')) return undefined;

          if (
            path.includes('/node_modules/react/') ||
            path.includes('/node_modules/react-dom/') ||
            path.includes('/node_modules/scheduler/') ||
            path.includes('/node_modules/react-router/') ||
            path.includes('/node_modules/react-router-dom/')
          ) {
            return 'vendor-react';
          }

          if (
            path.includes('/node_modules/dexie/') ||
            path.includes('/node_modules/dexie-react-hooks/')
          ) {
            return 'vendor-storage';
          }

          if (path.includes('/node_modules/zod/')) return 'vendor-schema';
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${pdfJsRoot}/cmaps/*`, dest: 'pdfjs/cmaps', rename: { stripBase: true } },
        { src: `${pdfJsRoot}/standard_fonts/*`, dest: 'pdfjs/standard_fonts', rename: { stripBase: true } },
        { src: `${pdfJsRoot}/wasm/*`, dest: 'pdfjs/wasm', rename: { stripBase: true } },
      ],
    }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: PRODUCT_NAME,
        short_name: PRODUCT_SHORT_NAME,
        description: PRODUCT_DESCRIPTION,
        lang: 'zh-CN',
        theme_color: '#111713',
        background_color: '#f4f6f1',
        display: 'standalone',
        id: '/',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // 不 claim 的话，SW 激活前的已打开页面（及其后续 reload）永远不会被控制，
        // 离线 reload 会直接走网络失败（线上验收实测 controller 恒为 null）。
        clientsClaim: true,
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2,json}'],
        globIgnores: ['**/content/**/*', '**/assets/pdf.worker.*.mjs', '**/pdfjs/**/*'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /^\/assets\/pdf\.worker\..+\.mjs$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: PDF_JS_CACHE_NAME },
          },
          {
            urlPattern: ({ url }) => /\/pdfjs\/(?:cmaps|standard_fonts|wasm)\/[^/]+$/u.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: PDF_JS_CACHE_NAME },
          },
          {
            urlPattern: ({ url }) => url.search === '' && /^\/content\/[^/]+\.json$/.test(url.pathname),
            handler: async ({ request }) => {
              const cache = await caches.open('408os-content-packs-v2');
              return await cache.match(request) ?? fetch(request);
            },
          },
          {
            urlPattern: ({ url }) => url.search === '' && /^\/content\/.+\.(?:png|jpe?g|pdf)$/.test(url.pathname),
            handler: async ({ request }) => {
              const cache = await caches.open('408os-content-assets-v2');
              return await cache.match(request) ?? fetch(request);
            },
          },
        ],
      },
    }),
  ],
});
