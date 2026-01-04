// Debug logging utility
// - Always sends to Sentry for production visibility
// - Console output respects debugLogging setting (except errors)

import { logger as sentryLogger, isSentryInitialized } from "@/services/sentry";
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
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
    const formatted = `${PREFIX} [${timestamp}] ${message}`;
    const formattedArgs = formatArgs(args);

    // Always send to Sentry (if initialized)
    if (isSentryInitialized()) {
      const sentryLevel = level === "log" ? "info" : level;
      const attrs = args.length ? { args: formattedArgs } : undefined;
      sentryLogger[sentryLevel](formatted, attrs);
    }

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
