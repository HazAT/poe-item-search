import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import manifest from "./manifest.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to generate production manifest
function productionManifestPlugin(): Plugin {
  return {
    name: "production-manifest",
    apply: "build",
    closeBundle() {
      // Only run for production builds (not CRXJS dev)
      if (process.env.NODE_ENV === "production" || !process.argv.includes("--mode=development")) {
        const prodManifest = {
          ...manifest,
          content_scripts: [
            {
              matches: manifest.content_scripts[0].matches,
              js: ["dist/content.js"],
              run_at: manifest.content_scripts[0].run_at,
            },
          ],
          web_accessible_resources: [
            {
              resources: ["dist/interceptor.js"],
              matches: ["https://www.pathofexile.com/*"],
            },
          ],
        };
        fs.writeFileSync(
          path.resolve(__dirname, "dist/manifest.json"),
          JSON.stringify(prodManifest, null, 2)
        );
        console.log("[vite] Production manifest written to dist/manifest.json");
      }
    },
  };
}

// Default config with CRXJS for development (hot reload)
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [
      react(),
      // Only use CRXJS in development for hot reload
      ...(isDev ? [crx({ manifest })] : [productionManifestPlugin()]),
    ],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      // Use custom rollup config for production builds (without CRXJS)
      ...(isDev
        ? {}
        : {
            rollupOptions: {
              input: {
                content: path.resolve(__dirname, "src/content.tsx"),
                interceptor: path.resolve(__dirname, "src/injected/interceptor.ts"),
              },
              output: {
                entryFileNames: "[name].js",
                assetFileNames: "[name].[ext]",
                format: "es",
                inlineDynamicImports: false,
              },
            },
          }),
      // Don't split CSS - we'll inject it into Shadow DOM
      cssCodeSplit: false,
      // Don't minify for easier debugging during development
      minify: false,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});
