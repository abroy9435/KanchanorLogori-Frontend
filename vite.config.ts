// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,               // we register manually
      registerType: "autoUpdate",

      devOptions: { enabled: true, type: "module" },

      includeAssets: [
        "offline.html",
        "datingapp_icon.png",
        "*.png","*.jpg","*.jpeg","*.svg","*.webp","*.xml"
      ],
      workbox: {
        navigateFallback: "/offline.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2,mp3,xml}"],
      },
      manifest: {
        name: "Kanchanor Logori",
        short_name: "KL",
        description: "Unofficial dating platform TezU",
        theme_color: "#0D0002",
        background_color: "#0D0002",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/datingapp_icon.png", sizes: "192x192", type: "image/png" },
          { src: "/datingapp_icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ],
      },
    }),
  ],
});
