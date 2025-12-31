import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import Terminal from "vite-plugin-terminal";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to generate production manifest and copy assets
function extensionAssetsPlugin(): Plugin {
  return {
    name: "extension-assets",
    apply: "build",
    closeBundle() {
      // Generate manifest for dist folder
      // Check if running in watch mode (dev) - use BUILD_MODE env var set by dev script
      const isDev = process.env.BUILD_MODE === "dev";
      const manifest: Record<string, unknown> = {
        manifest_version: 3,
        name: "PoE Item Search",
        version: "1.3.0",
        description: "Paste your item from ingame into the input field to search for it.",
        icons: {
          "128": "assets/logo128.png",
        },
        permissions: ["storage"],
        content_scripts: [
          {
            matches: ["https://www.pathofexile.com/trade*"],
            js: ["content.js"],
            run_at: "document_start",
          },
        ],
        web_accessible_resources: [
          {
            resources: ["interceptor.js"],
            matches: ["https://www.pathofexile.com/*"],
          },
        ],
      };

      // Add background script for auto-reload in dev mode
      if (isDev) {
        manifest.background = {
          service_worker: "background/reload.js",
          type: "module",
        };
        // Add tabs permission for reloading matching tabs
        (manifest.permissions as string[]).push("tabs");
        console.log("[vite] Dev mode: background reload script enabled");
      }
      fs.writeFileSync(
        path.resolve(__dirname, "dist/manifest.json"),
        JSON.stringify(manifest, null, 2)
      );
      console.log("[vite] Manifest written to dist/manifest.json");

      // Copy assets folder
      const assetsSource = path.resolve(__dirname, "assets");
      const assetsDest = path.resolve(__dirname, "dist/assets");
      if (fs.existsSync(assetsSource)) {
        fs.cpSync(assetsSource, assetsDest, { recursive: true });
        console.log("[vite] Assets copied to dist/assets");
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    Terminal({
      console: "terminal",
      output: ["terminal", "console"],
    }),
    extensionAssetsPlugin(),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, "src/content.tsx"),
        interceptor: path.resolve(__dirname, "src/injected/interceptor.ts"),
        "background/reload": path.resolve(__dirname, "src/background/reload.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        format: "es",
        inlineDynamicImports: false,
      },
    },
    cssCodeSplit: false,
    minify: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
