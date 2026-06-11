// frontend/vite.config.js
// FASE 2: adicionado vite-plugin-pwa para PWA + instalar no celular
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // "autoUpdate": atualiza o SW em segundo plano sem precisar fechar o app
      registerType: "autoUpdate",

      // Inclui esses arquivos no cache do SW
      includeAssets: [
        "favicon.ico",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
      ],

      // Web App Manifest — o que aparece na tela inicial do celular
      manifest: {
        name: "PetDeliveryCE",
        short_name: "PetDeliveryCE",
        description: "Tudo para o seu pet, entregue rápido! 🐾",
        theme_color: "#F7931E",
        background_color: "#FFF8F2",
        display: "standalone",          // abre sem barra de URL (app nativo)
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        categories: ["shopping", "food"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            // Ícone maskable: Android recorta em círculo/squircle
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        // Atalhos (aparecem no menu de toque longo no Android)
        shortcuts: [
          {
            name: "Ver Lojas",
            short_name: "Lojas",
            description: "Abrir lista de lojas",
            url: "/",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Meus Pedidos",
            short_name: "Pedidos",
            description: "Ver meus pedidos",
            url: "/?tab=orders",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
        ],
      },

      // Estratégia de cache do Service Worker
      workbox: {
        // Cache-first para assets estáticos (JS, CSS, imagens do build)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // Network-first para chamadas à API — sempre busca dado fresco
        runtimeCaching: [
          {
            // API do backend (Railway em produção, localhost em dev)
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }, // 5 min
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Imagens de produtos / logos de lojas
            urlPattern: /\/uploads\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "uploads-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 dias
            },
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-cache" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 ano
            },
          },
        ],
      },

      // Gera sw.js e workbox-*.js no dist/
      devOptions: {
        enabled: true, // habilita SW em desenvolvimento para testar
        type: "module",
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      "/api":       { target: "http://localhost:3001", changeOrigin: true, secure: false },
      "/socket.io": { target: "http://localhost:3001", changeOrigin: true, ws: true },
      "/uploads":   { target: "http://localhost:3001", changeOrigin: true },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
