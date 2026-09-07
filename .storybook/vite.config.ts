import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };

// Storybook must not load extension build inputs or plugins that write to dist/.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\/services\/tradeLocation$/,
        replacement: fileURLToPath(new URL("../stories/helpers/tradeLocation.mock.ts", import.meta.url)),
      },
      { find: "@", replacement: fileURLToPath(new URL("../src", import.meta.url)) },
    ],
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __DEV_MODE__: "false",
    __SENTRY_DSN__: JSON.stringify(""),
  },
});
