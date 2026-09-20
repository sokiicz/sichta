import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Appku servíruje ten samý Cloudflare worker, co drží API, takže běží
// v kořeni a je se serverem na stejné adrese. Díky tomu nevzniká CORS.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Šichta',
        short_name: 'Šichta',
        description: 'Pracanti vs. sabotéři. Společenská hra pro partu u stolu.',
        lang: 'cs',
        theme_color: '#303436',
        background_color: '#303436',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
  },
});
