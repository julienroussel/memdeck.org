import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const { PWA_SHORTCUTS } = await import("./src/constants.ts");

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

const LOCALE_CHUNK_RE = /i18n\/locales\/(?!en)(\w+)\.json$/;

// https://vite.dev/config/
export default defineConfig({
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
            "analytics-vendor": ["react-ga4", "web-vitals"],
            "i18n-vendor": ["i18next", "react-i18next"],
            "icons-vendor": ["@tabler/icons-react"],
            "mantine-vendor": [
              "@mantine/core",
              "@mantine/hooks",
              "@mantine/notifications",
            ],
            "react-vendor": ["react", "react-dom", "react-router"],
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
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    react(),
    // Vite's built-in HTML processing strips non-standard <link rel> values
    // and adjacent meta tags. Inject them post-build so they survive.
    {
      name: "inject-seo-meta",
      transformIndexHtml: {
        handler() {
          return [
            {
              attrs: { href: "/llms.txt", rel: "llms-txt" },
              injectTo: "head",
              tag: "link",
            },
            {
              attrs: { content: "Julien Roussel", name: "author" },
              injectTo: "head",
              tag: "meta",
            },
            {
              attrs: {
                content: "max-snippet:-1, max-image-preview:large",
                name: "robots",
              },
              injectTo: "head",
              tag: "meta",
            },
          ];
        },
        order: "post",
      },
    },
    VitePWA({
      injectRegister: false,
      manifest: {
        background_color: "#ffffff",
        categories: ["education", "utilities"],
        description:
          "Free online tool for mastering memorized deck systems like Mnemonica, Aronson, Memorandum, Redford, and Particle.",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        icons: [
          {
            purpose: "any",
            sizes: "180x180",
            src: "/apple-touch-icon.png",
            type: "image/png",
          },
          {
            purpose: "any",
            sizes: "512x512",
            src: "/memdeck-icon-white-512.webp",
            type: "image/webp",
          },
          {
            purpose: "any",
            sizes: "512x512",
            src: "/memdeck-icon-black-512.webp",
            type: "image/webp",
          },
          {
            purpose: "maskable",
            sizes: "512x512",
            src: "/memdeck-icon-white-512.webp",
            type: "image/webp",
          },
          {
            purpose: "any",
            sizes: "192x192",
            src: "/memdeck-icon-white-192.webp",
            type: "image/webp",
          },
          {
            purpose: "any",
            sizes: "192x192",
            src: "/memdeck-icon-black-192.webp",
            type: "image/webp",
          },
          {
            purpose: "maskable",
            sizes: "192x192",
            src: "/memdeck-icon-white-192.webp",
            type: "image/webp",
          },
        ],
        id: "/",
        name: "MemDeck — Mastering memorized deck",
        orientation: "portrait",
        scope: "/",
        screenshots: [
          {
            form_factor: "narrow",
            label: "Home screen showing training modes and stack picker",
            sizes: "780x1688",
            src: "/screenshots/home-mobile.png",
            type: "image/png",
          },
          {
            form_factor: "narrow",
            label: "Flashcard training with card and position choices",
            sizes: "780x1688",
            src: "/screenshots/flashcard-mobile.png",
            type: "image/png",
          },
          {
            form_factor: "wide",
            label: "Desktop view with sidebar navigation and training modes",
            sizes: "2560x1600",
            src: "/screenshots/home-desktop.png",
            type: "image/png",
          },
        ],
        short_name: "MemDeck",
        shortcuts: [...PWA_SHORTCUTS],
        start_url: "/",
        theme_color: "#228be6",
      },
      registerType: "autoUpdate",
      workbox: {
        // Locale chunks are lazy-loaded on demand; splash PNGs are only
        // used by iOS — exclude both from precaching.
        globIgnores: ["assets/locale-*.js", "splash/*.png"],
        globPatterns: ["**/*.{js,css,html,webp}", "cards/*.svg"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/\.(?:txt|xml|json|webmanifest)$/],
        runtimeCaching: [
          {
            handler: "CacheFirst",
            options: {
              cacheName: "locale-chunks",
              expiration: {
                maxAgeSeconds: 365 * 24 * 60 * 60,
                maxEntries: 10,
              },
            },
            // Cache locale chunks on first use. Vite's hashed filenames make
            // them immutable, so CacheFirst is safe and avoids re-fetching.
            urlPattern: /\/assets\/locale-[a-zA-Z0-9_-]+\.js$/,
          },
          {
            handler: "CacheFirst",
            options: {
              cacheName: "static-images",
              expiration: {
                maxAgeSeconds: 365 * 24 * 60 * 60,
                maxEntries: 50,
              },
            },
            urlPattern: /\.(?:png|jpg|jpeg|gif|webp)$/,
          },
        ],
      },
    }),
  ],
});
