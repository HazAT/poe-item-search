import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, "src/content.tsx"),
        interceptor: path.resolve(__dirname, "src/injected/interceptor.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        // Use ES for multiple entry points
        format: "es",
        // Inline dynamic imports to create single files
        inlineDynamicImports: false,
      },
    },
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
});
