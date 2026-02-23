import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

const LOCALE_CHUNK_RE = /i18n\/locales\/(?!en)(\w+)\.json$/;

// https://vite.dev/config/
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html}", "cards/*.svg"],
        // Locale chunks (locale-*.js) are lazy-loaded on demand —
        // exclude them from precaching to avoid downloading all locales upfront.
        globIgnores: ["assets/locale-*.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/404\.html$/],
        runtimeCaching: [
          {
            // Cache locale chunks on first use. Vite's hashed filenames make
            // them immutable, so CacheFirst is safe and avoids re-fetching.
            urlPattern: /\/assets\/locale-[a-zA-Z0-9_-]+\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "locale-chunks",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
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
        orientation: "portrait",
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
            src: "/memdeck-logo-white.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
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
          {
            src: "/memdeck-white.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  base: "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Give locale JSON chunks a predictable "locale-<code>" prefix so
          // the PWA config can exclude/cache them with a single glob pattern
          // instead of enumerating every language code.
          const localeMatch = id.match(LOCALE_CHUNK_RE);
          if (localeMatch) {
            return `locale-${localeMatch[1]}`;
          }

          const vendorChunks: Record<string, string[]> = {
            "react-vendor": ["react", "react-dom", "react-router"],
            "mantine-vendor": [
              "@mantine/core",
              "@mantine/hooks",
              "@mantine/notifications",
            ],
            "icons-vendor": ["@tabler/icons-react"],
            "analytics-vendor": ["react-ga4", "web-vitals"],
            "i18n-vendor": ["i18next", "react-i18next"],
          };

          for (const [chunkName, packages] of Object.entries(vendorChunks)) {
            if (packages.some((pkg) => id.includes(`node_modules/${pkg}/`))) {
              return chunkName;
            }
          }
        },
      },
    },
  },
});
