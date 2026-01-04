# Debug Logging Redesign

## Problem

The extension has ~149 `console.log/warn/error` calls scattered across 23 files that bypass the debug utility. The debug toggle in settings has no effect on most logs, making the console noisy even when debug mode is OFF.

## Goals

1. All logs go through centralized debug utility
2. Console only shows logs when debug mode is ON (except errors)
3. All logs sent to Sentry regardless of debug setting
4. Errors always visible in console

## Design

### Updated Debug Utility API

```typescript
// Core logging - always sends to Sentry, console only when debug ON
debug.log(message, ...args)    // info level
debug.info(message, ...args)   // info level
debug.warn(message, ...args)   // warning level
debug.error(message, ...args)  // error level - ALWAYS shows in console

// For truly critical errors (also always shows in console)
debug.critical(message, ...args)

// Grouping (console only, when debug ON)
debug.group(label, fn)
debug.table(label, data)
```

**Removed:** `debugStorage`, `debugPanel`, `debugBookmarks`, `debugHistory`, `debugSearch`, `debugInit` category helpers.

**Usage pattern:**
```typescript
debug.log("[Search] Building query", { itemText });
debug.error("[Sync] Failed to connect", error);
```

### Internal Implementation

```typescript
import { logger as sentryLogger } from "@/services/sentry";
import { getDebugLogging } from "@/stores/settingsStore";

const PREFIX = "[PoE Search]";

function createLogger(level: "log" | "info" | "warn" | "error", alwaysConsole = false) {
  return (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
    const formatted = `${PREFIX} [${timestamp}] ${message}`;

    // Always send to Sentry (with attributes for any extra args)
    const attrs = args.length ? { args: formatArgs(args) } : undefined;
    sentryLogger[level === "log" ? "info" : level](formatted, attrs);

    // Console: always for errors, otherwise only when debug ON
    if (alwaysConsole || getDebugLogging()) {
      console[level](formatted, ...formatArgs(args));
    }
  };
}

export const debug = {
  log: createLogger("log"),
  info: createLogger("info"),
  warn: createLogger("warn"),
  error: createLogger("error", true),  // always shows in console
  critical: createLogger("error", true),
  // ... group and table methods
};
```

### Injected Scripts

Injected scripts (`interceptor.ts`, `statIdExtractor.ts`) run in the page's MAIN world and cannot import the debug utility. They use postMessage to forward logs.

**In injected scripts:**
```typescript
const injectedLogger = {
  log: (msg: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", level: "log", message: msg, data }, "*"),
  error: (msg: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", level: "error", message: msg, data }, "*"),
  warn: (msg: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", level: "warn", message: msg, data }, "*"),
};
```

**In searchInterceptor.ts:**
```typescript
if (event.data?.type === "poe-search-debug-log") {
  const { level, message, data } = event.data;
  debug[level](message, data);
}
```

## Migration Strategy

### Files to migrate

| Category | Files | Approach |
|----------|-------|----------|
| Keep raw console | `settingsStore.ts`, `sentry.ts` | Init chicken-egg |
| Keep raw console | `scripts/*.js`, `vite.config.ts` | CLI/build tools |
| Migrate to `debug.*` | All other `src/` files | Direct import |
| Migrate via postMessage | `src/injected/*.ts` | New message type |

### Migration rules

- `console.log` -> `debug.log`
- `console.warn` -> `debug.warn`
- `console.error` -> `debug.error`
- Preserve existing `[Category]` prefixes in message
- Add category prefix if missing

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/debug.ts` | Integrate Sentry logger, remove category helpers, add `alwaysConsole` for errors |
| `src/services/searchInterceptor.ts` | Add handler for `poe-search-debug-log` messages |
| `src/injected/interceptor.ts` | Add `injectedLogger`, replace ~32 `console.*` calls |
| `src/injected/statIdExtractor.ts` | Add `injectedLogger`, replace ~4 `console.*` calls |
| ~15 other `src/` files | Replace `console.*` with `debug.*` |

## Behavior Summary

- All logs go to Sentry (always)
- `debug.error` / `debug.critical` always show in console
- Other levels only show in console when `debugLogging` is ON
- Injected scripts forward logs via postMessage -> content script -> debug utility
