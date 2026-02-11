import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html}", "cards/*.svg"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/404\.html$/],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-images",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: "MemDeck — Mastering memorized deck",
        short_name: "MemDeck",
        start_url: "/",
        display: "standalone",
        description:
          "Free online tool for mastering memorized deck systems like Mnemonica, Aronson, Memorandum, Redford, and Particle.",
        theme_color: "#228be6",
        background_color: "#ffffff",
        icons: [
          {
            src: "/memdeck-logo-white.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/memdeck-logo-black.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/memdeck-white.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/memdeck-black.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  base: "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router"],
          "mantine-vendor": [
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/notifications",
          ],
          "icons-vendor": ["@tabler/icons-react"],
          "analytics-vendor": ["react-ga4", "web-vitals"],
        },
      },
    },
  },
});
