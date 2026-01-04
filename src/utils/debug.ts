// Debug logging utility
// - Console output respects debugLogging setting (except errors)
// Note: Sentry integration removed to avoid bundle chunking issues with Chrome content scripts

import { getDebugLogging } from "@/stores/settingsStore";

type LogLevel = "log" | "info" | "warn" | "error";

const PREFIX = "[PoE Search]";

function formatArgs(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      try {
        return JSON.parse(JSON.stringify(arg));
      } catch {
        return String(arg);
      }
    }
    return arg;
  });
}

function createLogger(level: LogLevel, alwaysConsole = false) {
  return (message: string, ...args: unknown[]) => {
    const formatted = `${PREFIX} ${message}`;
    const formattedArgs = formatArgs(args);

    // Console: always for errors/critical, otherwise only when debug ON
    if (alwaysConsole || getDebugLogging()) {
      console[level](formatted, ...formattedArgs);
    }
  };
}

export const debug = {
  log: createLogger("log"),
  info: createLogger("info"),
  warn: createLogger("warn"),
  error: createLogger("error", true), // always shows in console
  critical: createLogger("error", true), // alias for error, always shows

  // Group related logs together (console only)
  group: (label: string, fn: () => void) => {
    if (!getDebugLogging()) return;
    console.group(`${PREFIX} ${label}`);
    fn();
    console.groupEnd();
  },

  // Table output for arrays/objects (console only)
  table: (label: string, data: unknown) => {
    if (!getDebugLogging()) return;
    console.log(`${PREFIX} ${label}:`);
    console.table(data);
  },
};
