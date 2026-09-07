import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sentry DSN for error tracking
const SENTRY_DSN = "https://2f310e8a7b71228d08e5e09060ecdab9@o55934.ingest.us.sentry.io/4510637224558592";

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
const APP_VERSION = packageJson.version;
const IS_DEV = process.env.BUILD_MODE === "dev";

// Plugin to generate production manifest and copy assets
function extensionAssetsPlugin(): Plugin {
  let outDir: string;
  return {
    name: "extension-assets",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      const manifest: Record<string, unknown> = {
        manifest_version: 3,
        name: "Path of Exile 2 - Trading Buddy",
        version: APP_VERSION,
        description: "Paste item text from PathOfExile2 to instantly search the trade site. Includes search history, bookmarks, and sort order.",
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
            resources: ["interceptor.js", "statIdExtractor.js"],
            matches: ["https://www.pathofexile.com/*"],
          },
        ],
      };

      // Add background script for auto-reload in dev mode
      if (IS_DEV) {
        manifest.background = {
          service_worker: "background/reload.js",
          type: "module",
        };
        // Add tabs permission for reloading matching tabs
        (manifest.permissions as string[]).push("tabs");
        console.log("[vite] Dev mode: background reload script enabled");
      }
      fs.writeFileSync(
        path.join(outDir, "manifest.json"),
        JSON.stringify(manifest, null, 2)
      );
      console.log(`[vite] Manifest written to ${path.join(outDir, "manifest.json")}`);

      // Copy assets folder
      const assetsSource = path.resolve(__dirname, "assets");
      const assetsDest = path.join(outDir, "assets");
      if (fs.existsSync(assetsSource)) {
        fs.cpSync(assetsSource, assetsDest, { recursive: true });
        console.log(`[vite] Assets copied to ${assetsDest}`);
      }
    },
  };
}

export default defineConfig({
  define: {
    __DEV_MODE__: JSON.stringify(IS_DEV),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __SENTRY_DSN__: JSON.stringify(SENTRY_DSN),
  },
  plugins: [
    react(),
    extensionAssetsPlugin(),
    // Wrap injected scripts in IIFEs to avoid polluting global scope
    // and prevent "already declared" errors on extension reload
    {
      name: "extension-scripts",
      generateBundle(_options, bundle) {
        const injectedFiles = ["interceptor.js", "statIdExtractor.js"];
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== "chunk") continue;

          // Content and injected scripts load as classic scripts; the reload
          // worker also expects each watched entry to be self-contained.
          if (!chunk.isEntry || chunk.imports.length || chunk.dynamicImports.length || chunk.exports.length) {
            this.error(`Extension script ${chunk.fileName} must be self-contained without imports or exports.`);
          }

          if (injectedFiles.includes(chunk.fileName)) {
            chunk.code = `(function() {\n${chunk.code}\n})();\n`;
          }

          try {
            new Script(chunk.code, { filename: chunk.fileName });
          } catch (error) {
            this.error(`Invalid classic extension script ${chunk.fileName}: ${String(error)}`);
          }
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        content: path.resolve(__dirname, "src/content.tsx"),
        interceptor: path.resolve(__dirname, "src/injected/interceptor.ts"),
        statIdExtractor: path.resolve(__dirname, "src/injected/statIdExtractor.ts"),
        ...(IS_DEV ? { "background/reload": path.resolve(__dirname, "src/background/reload.ts") } : {}),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        format: "es",
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
