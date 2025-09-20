// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Use YOUR service worker (src/sw.ts)
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",

      // You already register manually in main.tsx
      injectRegister: null,
      registerType: "autoUpdate",

      // Enable PWA in dev too
      devOptions: { enabled: true, type: "module" },

      // Static assets copied from /public
      includeAssets: [
        "offline.html",
        "datingapp_icon.png",
        "*.png", "*.jpg", "*.jpeg", "*.svg", "*.webp", "*.xml"
      ],

      // ❌ No `workbox.navigateFallback` here; fallback handled in sw.ts

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

// // vite.config.ts
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import { VitePWA } from "vite-plugin-pwa";

// export default defineConfig({
//   plugins: [
//     react(),
//     VitePWA({
//       injectRegister: null,               // we register manually
//       registerType: "autoUpdate",

//       devOptions: { enabled: true, type: "module" },

//       includeAssets: [
//         "offline.html",
//         "datingapp_icon.png",
//         "*.png","*.jpg","*.jpeg","*.svg","*.webp","*.xml"
//       ],
//       workbox: {
//         navigateFallback: "/offline.html",
//         globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2,mp3,xml}"],
//       },
//       manifest: {
//         name: "Kanchanor Logori",
//         short_name: "KL",
//         description: "Unofficial dating platform TezU",
//         theme_color: "#0D0002",
//         background_color: "#0D0002",
//         display: "standalone",
//         scope: "/",
//         start_url: "/",
//         icons: [
//           { src: "/datingapp_icon.png", sizes: "192x192", type: "image/png" },
//           { src: "/datingapp_icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
//         ],
//       },
//     }),
//   ],
// });
