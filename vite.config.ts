import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      workbox: {
        // Cache all assets for offline use
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // CRITICAL: Never cache OAuth callback or auth routes
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/],
        runtimeCaching: [
          {
            // Cache Supabase REST/realtime but EXCLUDE auth endpoints
            urlPattern: ({ url }) => {
              return (
                url.hostname.endsWith('.supabase.co') &&
                !url.pathname.startsWith('/auth/')
              );
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      manifest: {
        name: "R1SE - Workout Tracker",
        short_name: "R1SE",
        description: "Track your workouts and achieve your fitness goals",
        theme_color: "#0B0B0B",
        background_color: "#0B0B0B",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
