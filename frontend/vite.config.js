// frontend/vite.config.js
// FIX: devOptions.enabled = false — SW não roda em dev (evita cache de API)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
      ],

      manifest: {
        name: "PetDeliveryCE",
        short_name: "PetDeliveryCE",
        description: "Tudo para o seu pet, entregue rápido! 🐾",
        theme_color: "#F7931E",
        background_color: "#FFF8F2",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        categories: ["shopping", "food"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Ver Lojas", short_name: "Lojas",
            description: "Abrir lista de lojas", url: "/",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Meus Pedidos", short_name: "Pedidos",
            description: "Ver meus pedidos", url: "/?tab=orders",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\/uploads\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "uploads-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-cache" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },

      // FIX: desativado em dev — evita cache de API durante desenvolvimento
      devOptions: {
        enabled: false,
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