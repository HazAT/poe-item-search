# External Integrations

**Analysis Date:** 2026-01-13

## APIs & External Services

**Path of Exile Trade Website:**
- **Role:** Host platform.
- **Integration:** 
  - Content Script injection.
  - DOM manipulation (Shadow DOM injection).
  - Network Interception (`fetch`/`XHR`).
  - Stat extraction (scraping Vue component data).

**Sentry:**
- **Role:** Error tracking and monitoring.
- **Client:** `@sentry/browser`.
- **Auth:** DSN configured in `vite.config.ts` (injected via define).

## Data Storage

**Chrome Storage API:**
- **Role:** Persistence for settings, history, bookmarks.
- **Wrapper:** `src/utils/extensionApi.ts` abstracts this (likely falling back to `localStorage` in dev).
- **Permissions:** `storage` permission in `manifest.json`.

**Cloud Sync (Optional/Planned):**
- **Role:** Sync settings/history across devices.
- **Service:** `syncService.ts`.
- **Status:** Implementation details not fully explored, but service exists.

## Environment Configuration

**Development:**
- `BUILD_MODE=dev`: Enables background reload script.
- `vite-plugin-terminal`: Logs to browser console.

**Production:**
- Built via `vite build`.
- `manifest.json` generated dynamically to strip dev-only permissions (`tabs`, background script).

## Webhooks & Callbacks

**Incoming:**
- **Trade Search Interception:** The extension listens for responses from the Trade API to record search history.

---

*Integration audit: 2026-01-13*
*Update when adding/removing external services*
