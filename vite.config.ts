import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 项目站点 https://<owner>.github.io/dutch-vocab/；根站或自定义域名构建时设 BASE_PATH=/
const base = process.env.BASE_PATH ?? '/dutch-vocab/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  server: {
    watch: {
      // 当前开发环境的 inotify 额度会耗尽，使用轮询保留热更新。
      usePolling: true,
      interval: 500,
      // 前端读取 public/vocabulary 构建产物，无需监听词库源文件和工作目录。
      ignored: [
        '**/content/**',
        '**/data_private/**',
        '**/secrets/**',
        '**/dev-dist/**',
        '**/coverage-output/**',
        '**/playwright-report/**',
      ],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        id: base,
        name: 'Dutch Vocab 荷兰语背单词',
        short_name: 'Dutch Vocab',
        lang: 'zh-CN',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#faf7f2',
        theme_color: '#e8590c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,json}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024, // vocab.json
      },
    }),
  ],
  build: { target: 'es2022' },
});
