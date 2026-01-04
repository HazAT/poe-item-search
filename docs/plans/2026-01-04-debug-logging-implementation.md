# Debug Logging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize all logging through the debug utility with Sentry integration, so console respects the debug toggle and all logs go to Sentry.

**Architecture:** Update `debug.ts` to send all logs to Sentry and only show in console when debug is ON (except errors). Create `injectedLogger` for page-context scripts that forwards via postMessage. Migrate all `console.*` calls to `debug.*`.

**Tech Stack:** TypeScript, Sentry SDK, Chrome Extension postMessage API

---

## Task 1: Update Debug Utility Core

**Files:**
- Modify: `src/utils/debug.ts`

**Step 1: Update the debug utility to integrate Sentry**

Replace the entire file with:

```typescript
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
```

**Step 2: Verify the file compiles**

Run: `bun run build 2>&1 | head -20`
Expected: No TypeScript errors related to debug.ts

**Step 3: Commit**

```bash
git add src/utils/debug.ts
git commit -m "refactor(debug): integrate Sentry, respect debug toggle for console"
```

---

## Task 2: Add Debug Log Message Handler

**Files:**
- Modify: `src/services/searchInterceptor.ts`

**Step 1: Add the debug log message handler**

After the existing imports, the file already imports `debug`. Add a new interface and handler.

Find this code block:
```typescript
interface ItemCopiedPayload {
  itemText: string;
  itemName: string;
  itemId: string;
}
```

Add after it:
```typescript
interface DebugLogPayload {
  level: "log" | "info" | "warn" | "error";
  message: string;
  data?: unknown;
}
```

Find this code block in `initSearchInterceptor`:
```typescript
    // Handle item copied from results
    if (event.data?.type === "poe-search-item-copied" && event.data.payload) {
      handleItemCopied(event.data.payload as ItemCopiedPayload);
    }
```

Add after it:
```typescript
    // Handle debug logs from injected scripts
    if (event.data?.type === "poe-search-debug-log" && event.data.payload) {
      handleDebugLog(event.data.payload as DebugLogPayload);
    }
```

Add at the end of the file (before the last closing brace or at the bottom):
```typescript
/**
 * Handle debug logs forwarded from injected scripts.
 * Routes them through the debug utility for Sentry + console handling.
 */
function handleDebugLog(payload: DebugLogPayload) {
  const { level, message, data } = payload;
  if (data !== undefined) {
    debug[level](message, data);
  } else {
    debug[level](message);
  }
}
```

**Step 2: Verify the file compiles**

Run: `bun run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/services/searchInterceptor.ts
git commit -m "feat(debug): add postMessage handler for injected script logs"
```

---

## Task 3: Migrate Injected Interceptor Script

**Files:**
- Modify: `src/injected/interceptor.ts`

**Step 1: Add injectedLogger helper at the top of the file**

Find this line near the top (after the imports):
```typescript
// Trade API URL patterns
const TRADE_SEARCH_PATTERN = /\/api\/trade2?\/search\/.+/;
```

Add before it:
```typescript
// Logger that forwards to content script via postMessage
const injectedLogger = {
  log: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "log", message: `[Interceptor] ${message}`, data } }, "*"),
  warn: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "warn", message: `[Interceptor] ${message}`, data } }, "*"),
  error: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "error", message: `[Interceptor] ${message}`, data } }, "*"),
};

```

**Step 2: Replace all console.log calls**

Use find/replace to change these patterns:
- `console.log("[PoE Search Interceptor]` -> `injectedLogger.log("`
- `console.log("[PoE Search Interceptor XHR]` -> `injectedLogger.log("[XHR]`
- `console.error("[PoE Search Interceptor]` -> `injectedLogger.error("`
- `console.error("[PoE Search Interceptor XHR]` -> `injectedLogger.error("[XHR]`
- `console.warn("[PoE Search Interceptor]` -> `injectedLogger.warn("`

The specific replacements needed (32 total):

| Line | Before | After |
|------|--------|-------|
| 42 | `console.log("[PoE Search Interceptor] Triggering sort UI sync:", { field, direction });` | `injectedLogger.log("Triggering sort UI sync:", { field, direction });` |
| 51 | `console.log("[PoE Search Interceptor] Sort element not found after retries:", field);` | `injectedLogger.log("Sort element not found after retries:", field);` |
| 62 | `console.log("[PoE Search Interceptor] Sort element state:", { isSorted, isAsc, isDesc, wantDirection: direction });` | `injectedLogger.log("Sort element state:", { isSorted, isAsc, isDesc, wantDirection: direction });` |
| 89 | `console.log("[PoE Search Interceptor] Sort UI sync complete");` | `injectedLogger.log("Sort UI sync complete");` |
| 95 | `console.error("[PoE Search Interceptor] Failed to trigger sort UI sync:", e);` | `injectedLogger.error("Failed to trigger sort UI sync:", e);` |
| 121-124 | `console.log("[PoE Search Interceptor] Captured preview image:", imageUrl.slice(0, 60) + "...");` | `injectedLogger.log("Captured preview image:", imageUrl.slice(0, 60) + "...");` |
| 142 | `console.log("[PoE Search Interceptor] Preview image capture timed out");` | `injectedLogger.log("Preview image capture timed out");` |
| 198-202 | `console.log("[PoE Search Interceptor] Checking sort override:", {...});` | `injectedLogger.log("Checking sort override:", {...});` |
| 209 | `console.log("[PoE Search Interceptor] Applied sort override:", overrideData);` | `injectedLogger.log("Applied sort override:", overrideData);` |
| 217 | `console.log("[PoE Search Interceptor] Queued sort UI sync:", { field, direction });` | `injectedLogger.log("Queued sort UI sync:", { field, direction });` |
| 223 | `console.error("[PoE Search Interceptor] Failed to apply sort override:", e);` | `injectedLogger.error("Failed to apply sort override:", e);` |
| 251-255 | `console.log("[PoE Search Interceptor] Captured search:", {...});` | `injectedLogger.log("Captured search:", {...});` |
| 263 | `console.error("[PoE Search Interceptor] Failed to parse response:", e);` | `injectedLogger.error("Failed to parse response:", e);` |
| 284-288 | `console.log("[PoE Search Interceptor] Cached", responseBody.result.length, "items from fetch API");` | `injectedLogger.log("Cached " + responseBody.result.length + " items from fetch API");` |
| 294 | `console.error("[PoE Search Interceptor] Failed to parse fetch response:", e);` | `injectedLogger.error("Failed to parse fetch response:", e);` |
| 350-354 | `console.log("[PoE Search Interceptor] Cached", responseBody.result.length, "items from XHR fetch API");` | `injectedLogger.log("Cached " + responseBody.result.length + " items from XHR fetch API");` |
| 360 | `console.error("[PoE Search Interceptor] Failed to parse XHR fetch response:", e);` | `injectedLogger.error("Failed to parse XHR fetch response:", e);` |
| 378-382 | `console.log("[PoE Search Interceptor XHR] Checking sort override:", {...});` | `injectedLogger.log("[XHR] Checking sort override:", {...});` |
| 388 | `console.log("[PoE Search Interceptor XHR] Applied sort override:", overrideData);` | `injectedLogger.log("[XHR] Applied sort override:", overrideData);` |
| 397 | `console.log("[PoE Search Interceptor XHR] Queued sort UI sync:", { field, direction });` | `injectedLogger.log("[XHR] Queued sort UI sync:", { field, direction });` |
| 403 | `console.error("[PoE Search Interceptor XHR] Failed to apply sort override:", e);` | `injectedLogger.error("[XHR] Failed to apply sort override:", e);` |
| 429-433 | `console.log("[PoE Search Interceptor] Captured XHR search:", {...});` | `injectedLogger.log("Captured XHR search:", {...});` |
| 441-444 | `console.error("[PoE Search Interceptor] Failed to parse XHR response:", e);` | `injectedLogger.error("Failed to parse XHR response:", e);` |
| 457 | `console.log("[PoE Search Interceptor] Sort override set:", event.data.sort);` | `injectedLogger.log("Sort override set:", event.data.sort);` |
| 465 | `console.log("[PoE Search Interceptor] showCopyFeedback called:", message);` | `injectedLogger.log("showCopyFeedback called:", message);` |
| 491 | `console.log("[PoE Search Interceptor] Tooltip appended to body");` | `injectedLogger.log("Tooltip appended to body");` |
| 532 | `console.warn("[PoE Search Interceptor] Item not in cache:", itemId);` | `injectedLogger.warn("Item not in cache:", itemId);` |
| 554 | `console.log("[PoE Search Interceptor] Copied item:", item.name \|\| item.typeLine);` | `injectedLogger.log("Copied item:", item.name \|\| item.typeLine);` |
| 556 | `console.error("[PoE Search Interceptor] Failed to copy:", err);` | `injectedLogger.error("Failed to copy:", err);` |
| 562 | `console.log("[PoE Search Interceptor] Wired copy buttons for", rows.length, "rows");` | `injectedLogger.log("Wired copy buttons for " + rows.length + " rows");` |
| 595 | `console.log("[PoE Search Interceptor] Results observer started");` | `injectedLogger.log("Results observer started");` |
| 611 | `console.log("[PoE Search Interceptor] Request interceptor installed");` | `injectedLogger.log("Request interceptor installed");` |

**Step 3: Verify no console.log remains (except the helper)**

Run: `grep -n "console\." src/injected/interceptor.ts`
Expected: No output (all migrated)

**Step 4: Verify the file compiles**

Run: `bun run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/injected/interceptor.ts
git commit -m "refactor(interceptor): migrate console.log to injectedLogger"
```

---

## Task 4: Migrate Injected StatIdExtractor Script

**Files:**
- Modify: `src/injected/statIdExtractor.ts`

**Step 1: Add injectedLogger helper at the top of the file**

Add after the JSDoc comment and before the `extractStatIds` function:
```typescript
// Logger that forwards to content script via postMessage
const injectedLogger = {
  log: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "log", message: `[StatIdExtractor] ${message}`, data } }, "*"),
};

```

**Step 2: Replace all console.log calls (4 total)**

| Line | Before | After |
|------|--------|-------|
| 23 | `console.log('[StatIdExtractor] Extracted', extracted, 'stat IDs');` | `injectedLogger.log('Extracted ' + extracted + ' stat IDs');` |
| 40 | `console.log('[StatIdExtractor] Mutation detected, extracting...');` | `injectedLogger.log('Mutation detected, extracting...');` |
| 50 | `console.log('[StatIdExtractor] Observing', target === document.body ? 'body' : '#trade');` | `injectedLogger.log('Observing ' + (target === document.body ? 'body' : '#trade'));` |
| 83 | `console.log('[StatIdExtractor] Initialized');` | `injectedLogger.log('Initialized');` |

**Step 3: Verify no console.log remains**

Run: `grep -n "console\." src/injected/statIdExtractor.ts`
Expected: No output

**Step 4: Verify the file compiles**

Run: `bun run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/injected/statIdExtractor.ts
git commit -m "refactor(statIdExtractor): migrate console.log to injectedLogger"
```

---

## Task 5: Migrate TierInjector Service

**Files:**
- Modify: `src/services/tierInjector.ts`

**Step 1: Add debug import at the top**

Find the imports section and add:
```typescript
import { debug } from "@/utils/debug";
```

**Step 2: Replace all console.log/warn/error calls (28 total)**

Pattern: `console.log('[TierInjector]` -> `debug.log("[TierInjector]`

All replacements:
| Line | Type | Message excerpt |
|------|------|-----------------|
| 16 | log | injectStatIdExtractor called |
| 18 | log | statIdExtractor URL: |
| 20 | warn | Cannot inject stat ID extractor |
| 27 | log | Stat ID extractor script injected |
| 31 | error | Failed to inject stat ID extractor |
| 56 | log | findStatFilters: no group found |
| 62 | log | findStatFilters: found X in group |
| 109 | log | Updated min input to |
| 120 | log | hasStatIdsExtracted: |
| 128 | log | injectTierDropdowns called |
| 131 | log | Stat Filters group: |
| 137 | log | No stat filters found |
| 143 | log | Stat IDs not extracted yet |
| 148 | log | Found X stat filters |
| 153 | log | Skipping filter - already has dropdown |
| 158 | log | Processing filter, statId: |
| 161 | log | Skipping - no statId |
| 166 | log | hasStatTiers: |
| 169 | log | Skipping - no tier data for |
| 174 | log | Tiers for X: Y tiers |
| 177 | log | Skipping - no tiers available |
| 183 | log | Skipping - no min input found |
| 221 | log | Injected tier dropdown for |
| 233 | log | #trade container not found |
| 249 | log | Stat IDs extracted after X ms retry |
| 253 | log | Gave up waiting for stat IDs |
| 266 | log | Observing #trade for filter changes |
| 270 | log | Received stat-ids-extracted event: |

**Step 3: Verify no console.log remains**

Run: `grep -n "console\." src/services/tierInjector.ts`
Expected: No output

**Step 4: Verify the file compiles**

Run: `bun run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/services/tierInjector.ts
git commit -m "refactor(tierInjector): migrate console.log to debug utility"
```

---

## Task 6: Migrate Content Script (content.tsx)

**Files:**
- Modify: `src/content.tsx`

**Step 1: Add debug import**

Check if debug is already imported. If not, add:
```typescript
import { debug } from "@/utils/debug";
```

**Step 2: Replace console calls (10 total)**

| Line | Before | After |
|------|--------|-------|
| 18 | `console.log(\`PoE Item Search v${version}\`);` | `debug.log(\`[Init] PoE Item Search v${version}\`);` |
| 33 | `console.warn("[PoE Item Search] Cannot inject interceptor...");` | `debug.warn("[Init] Cannot inject interceptor: not in extension context");` |
| 40 | `console.log("[PoE Item Search] Interceptor script injected");` | `debug.log("[Init] Interceptor script injected");` |
| 44 | `console.error("[PoE Item Search] Failed to inject interceptor script:", e);` | `debug.error("[Init] Failed to inject interceptor script:", e);` |
| 115 | `console.error("[PoE Item Search] Sync init failed:", e);` | `debug.error("[Sync] Init failed:", e);` |
| 191 | `console.log('[PoE Item Search] Scheduling tier dropdown injection...');` | `debug.log("[Tiers] Scheduling tier dropdown injection...");` |
| 193 | `console.log('[PoE Item Search] Running tier dropdown injection now');` | `debug.log("[Tiers] Running tier dropdown injection now");` |
| 196 | `console.log('[PoE Item Search] Filter observer:', observer ? 'active' : 'failed');` | `debug.log("[Tiers] Filter observer:", observer ? "active" : "failed");` |
| 199 | `console.log("PoE Item Search initialized successfully");` | `debug.log("[Init] PoE Item Search initialized successfully");` |
| 201 | `console.error("PoE Item Search initialization failed:", error);` | `debug.error("[Init] PoE Item Search initialization failed:", error);` |

**Step 3: Verify no console.log remains**

Run: `grep -n "console\." src/content.tsx`
Expected: No output

**Step 4: Verify the file compiles**

Run: `bun run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/content.tsx
git commit -m "refactor(content): migrate console.log to debug utility"
```

---

## Task 7: Migrate BookmarksStore

**Files:**
- Modify: `src/stores/bookmarksStore.ts`

**Step 1: Add debug import**

```typescript
import { debug } from "@/utils/debug";
```

**Step 2: Replace console calls (4 total)**

| Line | Before | After |
|------|--------|-------|
| 73 | `console.log("[PoE Search] [Bookmarks] fetchFolders() skipped...");` | `debug.log("[Bookmarks] fetchFolders() skipped - already fetched or loading");` |
| 76 | `console.log("[PoE Search] [Bookmarks] fetchFolders() called");` | `debug.log("[Bookmarks] fetchFolders() called");` |
| 84 | `console.log("[PoE Search] [Bookmarks] fetchFolders() loaded",...);` | `debug.log("[Bookmarks] fetchFolders() loaded", folders?.length ?? 0, "folders");` |
| 88 | `console.error("[PoE Search] [Bookmarks] fetchFolders() error:", e);` | `debug.error("[Bookmarks] fetchFolders() error:", e);` |

**Step 3: Commit**

```bash
git add src/stores/bookmarksStore.ts
git commit -m "refactor(bookmarks): migrate console.log to debug utility"
```

---

## Task 8: Migrate SyncService

**Files:**
- Modify: `src/services/syncService.ts`

**Step 1: Add debug import and remove local log function**

Find and remove the local `log` function:
```typescript
const log = (msg: string, ...args: unknown[]) => {
    console.log(`[PoE Search] [Sync] ${msg}`, ...args);
};
```

Add import:
```typescript
import { debug } from "@/utils/debug";
```

**Step 2: Replace all `log(` calls with `debug.log("[Sync]`**

Pattern: `log("message"` -> `debug.log("[Sync] message"`

**Step 3: Commit**

```bash
git add src/services/syncService.ts
git commit -m "refactor(sync): migrate console.log to debug utility"
```

---

## Task 9: Migrate Storage Service

**Files:**
- Modify: `src/services/storage.ts`

**Step 1: Add debug import and remove local log function**

Find and remove:
```typescript
const log = (msg: string, ...args: unknown[]) => {
    console.log(`[PoE Search] [Storage] ${msg}`, ...args);
};
```

Add import:
```typescript
import { debug } from "@/utils/debug";
```

**Step 2: Replace log calls**

| Line | Before | After |
|------|--------|-------|
| 127 | `console.error(\`[PoE Search] [Storage] getValue(${key}) callback error:\`, e);` | `debug.error(\`[Storage] getValue(${key}) callback error:\`, e);` |
| 132 | `console.error(\`[PoE Search] [Storage] getValue(${key}) error:\`, e);` | `debug.error(\`[Storage] getValue(${key}) error:\`, e);` |

And any `log(` calls -> `debug.log("[Storage]`

**Step 3: Commit**

```bash
git add src/services/storage.ts
git commit -m "refactor(storage): migrate console.log to debug utility"
```

---

## Task 10: Migrate Remaining Files

**Files:**
- Modify: `src/itemClass.js`
- Modify: `src/components/shared/FolderPickerDropdown.tsx`
- Modify: `src/content.js` (if still used)

**Step 1: itemClass.js**

Line 221:
```javascript
// Before
console.warn("Failed to fetch categories, using static mapping:", error.message);
// After - Note: This is a .js file, may need different import
// If ES modules: import { debug } from "@/utils/debug";
// Then: debug.warn("[ItemClass] Failed to fetch categories, using static mapping:", error.message);
```

**Step 2: FolderPickerDropdown.tsx**

Add import and replace:
```typescript
import { debug } from "@/utils/debug";

// Line 77:
// Before
console.error("Failed to create folder:", error);
// After
debug.error("[FolderPicker] Failed to create folder:", error);
```

**Step 3: content.js (check if needed)**

This might be an old file. Check if it's still in use. If so, migrate similarly.

**Step 4: Commit**

```bash
git add src/itemClass.js src/components/shared/FolderPickerDropdown.tsx
git commit -m "refactor: migrate remaining files to debug utility"
```

---

## Task 11: Migrate Background Reload Script (Optional)

**Files:**
- Modify: `src/background/reload.ts`

This is dev-only code. Consider whether to migrate or leave as-is since it's not part of production builds.

**Step 1: If migrating, add debug import**

Note: Background scripts run in a separate context. The debug utility should work but won't send to Sentry since Sentry isn't initialized there. This is acceptable for dev-only logs.

```typescript
import { debug } from "@/utils/debug";
```

**Step 2: Replace calls (3 total)**

| Line | Before | After |
|------|--------|-------|
| 44 | `console.log("[Extension Reload] Change detected...");` | `debug.log("[Reload] Change detected, reloading tabs and extension...");` |
| 63 | `console.log("[Extension Reload] Error checking:", e);` | `debug.error("[Reload] Error checking:", e);` |
| 73 | `console.log("[Extension Reload] Watching for changes...");` | `debug.log("[Reload] Watching for changes (every 1s)...");` |

**Step 3: Commit**

```bash
git add src/background/reload.ts
git commit -m "refactor(reload): migrate console.log to debug utility"
```

---

## Task 12: Final Verification

**Step 1: Check for any remaining console.log calls**

Run: `grep -rn "console\.\(log\|warn\|error\)" src/ --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "node_modules" | grep -v "debug.ts" | grep -v "settingsStore.ts" | grep -v "sentry.ts"`

Expected: No output (or only the allowed exceptions)

**Step 2: Build and verify no errors**

Run: `bun run build`
Expected: Clean build with no errors

**Step 3: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 4: Manual test in browser**

1. Load extension in Chrome
2. Open PoE trade page
3. With debug OFF: Console should be quiet (only errors visible)
4. With debug ON: All logs should appear
5. Check Sentry dashboard: Logs should appear regardless of debug setting

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify debug logging migration complete"
```

---

## Summary

Total files modified: ~15
Total console.log calls migrated: ~100+

**Files keeping raw console (by design):**
- `src/stores/settingsStore.ts` - bootstrap init
- `src/services/sentry.ts` - Sentry init confirmation
- `scripts/*.js` - CLI tools
- `vite.config.ts` - build config
