import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const plugins = [react(), tailwindcss(), jsxLocPlugin()];

// Channel Green section: copied-in code lives in client/src/channel-green (see docs/channel-green-sync.md).
const cg = path.resolve(import.meta.dirname, "client", "src", "channel-green");
const cgSite = path.resolve(import.meta.dirname, "client", "src", "channel-green-site");

export default defineConfig(({ mode }) => {
  // Where the live Channel Green server is. Empty means "not connected" and the section says so.
  const env = loadEnv(mode, import.meta.dirname, ["VITE_", "NEXT_PUBLIC_"]);
  const realtimeUrl = (env.VITE_REALTIME_URL || env.NEXT_PUBLIC_REALTIME_URL || "").trim();

  return {
  define: {
    __CG_REALTIME_URL__: JSON.stringify(realtimeUrl),
    // Channel Green's own code reads this name
    "process.env.NEXT_PUBLIC_REALTIME_URL": JSON.stringify(realtimeUrl),
  },
  plugins,
  resolve: {
    alias: {
      "@cg": path.resolve(cg, "web"),
      "@channel-green/shared": path.resolve(cg, "packages", "shared", "src", "index.ts"),
      "@channel-green/content": path.resolve(cg, "packages", "content", "src", "index.ts"),
      // Channel Green was written for Next.js; these two small stand-ins cover the parts it uses.
      "next/link": path.resolve(cgSite, "shims", "next-link.tsx"),
      "next/navigation": path.resolve(cgSite, "shims", "next-navigation.ts"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
};
});
