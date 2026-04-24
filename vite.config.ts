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
    // Vite's built-in HTML processing strips non-standard <link rel> values
    // and adjacent meta tags. Inject them post-build so they survive.
    {
      name: "inject-seo-meta",
      transformIndexHtml: {
        order: "post",
        handler() {
          return [
            {
              tag: "link",
              attrs: { rel: "llms-txt", href: "/llms.txt" },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: { name: "author", content: "Julien Roussel" },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: {
                name: "robots",
                content: "max-snippet:-1, max-image-preview:large",
              },
              injectTo: "head",
            },
          ];
        },
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,webp}", "cards/*.svg"],
        // Locale chunks are lazy-loaded on demand; splash PNGs are only
        // used by iOS — exclude both from precaching.
        globIgnores: ["assets/locale-*.js", "splash/*.png"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/\.(?:txt|xml|json|webmanifest)$/],
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
                maxEntries: 50,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        id: "/",
        name: "MemDeck — Mastering memorized deck",
        short_name: "MemDeck",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        categories: ["education", "utilities"],
        description:
          "Free online tool for mastering memorized deck systems like Mnemonica, Aronson, Memorandum, Redford, and Particle.",
        theme_color: "#228be6",
        background_color: "#ffffff",
        shortcuts: [
          {
            name: "Flashcard",
            short_name: "Flashcard",
            url: "/flashcard/",
            description: "Practice memorized deck with flashcard drills",
          },
          {
            name: "ACAAN",
            short_name: "ACAAN",
            url: "/acaan/",
            description: "Any Card At Any Number calculator",
          },
          {
            name: "Toolbox",
            short_name: "Toolbox",
            url: "/toolbox/",
            description: "Memorized deck utilities",
          },
        ],
        screenshots: [
          {
            src: "/screenshots/home-mobile.png",
            sizes: "780x1688",
            type: "image/png",
            form_factor: "narrow",
            label: "Home screen showing training modes and stack picker",
          },
          {
            src: "/screenshots/flashcard-mobile.png",
            sizes: "780x1688",
            type: "image/png",
            form_factor: "narrow",
            label: "Flashcard training with card and position choices",
          },
          {
            src: "/screenshots/home-desktop.png",
            sizes: "2560x1600",
            type: "image/png",
            form_factor: "wide",
            label: "Desktop view with sidebar navigation and training modes",
          },
        ],
        icons: [
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/memdeck-icon-white-512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any",
          },
          {
            src: "/memdeck-icon-black-512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "any",
          },
          {
            src: "/memdeck-icon-white-512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "maskable",
          },
          {
            src: "/memdeck-icon-white-192.webp",
            sizes: "192x192",
            type: "image/webp",
            purpose: "any",
          },
          {
            src: "/memdeck-icon-black-192.webp",
            sizes: "192x192",
            type: "image/webp",
            purpose: "any",
          },
          {
            src: "/memdeck-icon-white-192.webp",
            sizes: "192x192",
            type: "image/webp",
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
