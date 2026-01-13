# Architecture

**Analysis Date:** 2026-01-13

## Pattern Overview

**Overall:** Chrome Extension with React Overlay

**Key Characteristics:**
- **Injected Content Script:** Runs in the context of `pathofexile.com/trade`.
- **Shadow DOM Isolation:** UI is rendered inside a Shadow Root to prevent style leakage from/to the host page.
- **Request Interception:** Injects `interceptor.js` into the "Main" world to monkey-patch `fetch`/`XHR` for monitoring trade searches.
- **State Management:** Zustand stores for global state (History, Bookmarks, Settings).

## Layers

**UI Layer:**
- Purpose: Render the overlay panel and toggle button.
- Contains: React components (`src/components/`), Tailwind styles.
- Location: `src/components/`
- Depends on: Stores, Services.

**Logic Layer (Services):**
- Purpose: Handle business logic, data parsing, and external communication.
- Contains: Item parsing (`item.js`), Search query building (`search.js`), Interception (`searchInterceptor.ts`).
- Location: `src/services/`, `src/item.js`, `src/search.js`

**Data/State Layer:**
- Purpose: Manage application state and persistence.
- Contains: Zustand stores (`src/stores/`).
- Storage: Persists to `localStorage` (via `src/utils/extensionApi.ts` abstraction).

**Injection Layer:**
- Purpose: Bridge between extension and host page.
- Contains: `content.tsx` (entry), `interceptor.ts` (network sniffing), `statIdExtractor.ts` (DOM scraping).

## Data Flow

**Item Search Flow:**
1. **User Action:** User pastes item text into the "Paste Input".
2. **Parsing:** `src/item.js` parses the text into item properties.
3. **Query Building:** `src/search.js` converts properties to a Trade API query.
4. **Execution:** (Presumably) The extension redirects or executes the search on the trade site.

**Trade Monitoring Flow:**
1. **User Action:** User performs a search on the trade site.
2. **Interception:** `interceptor.js` captures the request.
3. **Notification:** Interceptor sends event to `content.tsx`.
4. **Processing:** `searchInterceptor.ts` processes the search data.
5. **State Update:** `historyStore` is updated with the new search.

## Key Abstractions

**Stores (Zustand):**
- Purpose: Centralized state management.
- Examples: `useHistoryStore` (`src/stores/historyStore.ts`), `usePanelStore` (`src/stores/panelStore.ts`).

**Item Parser:**
- Purpose: Convert raw text to structured item data.
- Implementation: `src/item.js` (Regex-based parsing).

**Extension API Wrapper:**
- Purpose: Abstract browser-specific APIs (storage, runtime).
- Implementation: `src/utils/extensionApi.ts`.

## Entry Points

**Content Script:**
- Location: `src/content.tsx`
- Triggers: Loaded on `pathofexile.com/trade*`.
- Responsibilities: Inject Shadow DOM, initialize React app, inject interceptors.

**Interceptor:**
- Location: `src/injected/interceptor.ts`
- Triggers: Injected by `content.tsx` into page head.
- Responsibilities: Hook into network requests.

## Error Handling

**Strategy:** Sentry integration for production error tracking.

**Patterns:**
- `initSentry()` in `initialize()` sequence.
- `captureException` utility used in `src/services/sentry.ts`.

## Cross-Cutting Concerns

**Styling:**
- Tailwind CSS injected into Shadow DOM via `src/index.css?inline`.
- `zoom: 1.4` applied to root to counter host page `10px` font size.

**Sync:**
- Cloud sync capability hinted at by `src/services/syncService.ts` and `src/stores/syncStore.ts`.

---

*Architecture analysis: 2026-01-13*
*Update when major patterns change*
