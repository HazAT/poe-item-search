// Debug logging utility
// Checks the settings store flag and logs only when debug is enabled

import { getDebugLogging } from "@/stores/settingsStore";

type LogLevel = "log" | "warn" | "error" | "info";

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

function createLogger(level: LogLevel) {
  return (message: string, ...args: unknown[]) => {
    if (!getDebugLogging()) return;

    const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
    const formattedArgs = formatArgs(args);

    console[level](`${PREFIX} [${timestamp}] ${message}`, ...formattedArgs);
  };
}

export const debug = {
  log: createLogger("log"),
  warn: createLogger("warn"),
  error: createLogger("error"),
  info: createLogger("info"),

  // Group related logs together
  group: (label: string, fn: () => void) => {
    if (!getDebugLogging()) return;
    console.group(`${PREFIX} ${label}`);
    fn();
    console.groupEnd();
  },

  // Always log regardless of debug setting (for critical errors)
  critical: (message: string, ...args: unknown[]) => {
    console.error(`${PREFIX} [CRITICAL] ${message}`, ...formatArgs(args));
  },

  // Table output for arrays/objects
  table: (label: string, data: unknown) => {
    if (!getDebugLogging()) return;
    console.log(`${PREFIX} ${label}:`);
    console.table(data);
  },
};

// Shorthand for common categories
export const debugStorage = (message: string, ...args: unknown[]) => debug.log(`[Storage] ${message}`, ...args);
export const debugPanel = (message: string, ...args: unknown[]) => debug.log(`[Panel] ${message}`, ...args);
export const debugBookmarks = (message: string, ...args: unknown[]) => debug.log(`[Bookmarks] ${message}`, ...args);
export const debugHistory = (message: string, ...args: unknown[]) => debug.log(`[History] ${message}`, ...args);
export const debugSearch = (message: string, ...args: unknown[]) => debug.log(`[Search] ${message}`, ...args);
export const debugInit = (message: string, ...args: unknown[]) => debug.log(`[Init] ${message}`, ...args);
