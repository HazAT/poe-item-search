# Sync Status Section Design

Add a Cloud Sync status section to the Settings modal for power users.

## Overview

Display local vs cloud bookmark counts, last sync time, and collapsible debug info with raw data for transfer/debugging.

## UI Layout

New section in Settings modal:

```
┌─────────────────────────────────────────┐
│ Cloud Sync                              │
├─────────────────────────────────────────┤
│  Local          Cloud                   │
│  5 folders      5 folders               │
│  23 bookmarks   23 bookmarks            │
│                                         │
│  Last synced: 2:34 PM                   │
│                                         │
│  ▶ Debug info                           │
└─────────────────────────────────────────┘
```

Debug info expanded:

```
│  ▼ Debug info                           │
│  ┌────────────────────────────────────┐ │
│  │ Compressed (for transfer): [Copy]  │ │
│  │ N4IgLg...                          │ │
│  │                                    │ │
│  │ Local JSON:              [Copy]    │ │
│  │ {"folders":[...]...}               │ │
│  │                                    │ │
│  │ Cloud JSON:              [Copy]    │ │
│  │ {"folders":[...]...}               │ │
│  └────────────────────────────────────┘ │
```

## Implementation

**syncService changes:**
- Make `getCurrentState()` public as `getLocalState()`
- Add `getCloudState(): Promise<SyncState | null>` - fetch and decompress cloud data
- Add `getCompressedCloudData(): Promise<string | null>` - return raw compressed string

**New component:**
- `src/components/settings/SyncStatusSection.tsx`

**Integration:**
- Add to `SettingsModal.tsx` below existing settings

## Edge Cases

| State | Display |
|-------|---------|
| Loading cloud | "Loading cloud data..." |
| No cloud data | "Cloud: Not synced yet" |
| Fetch error | "Cloud: Unable to fetch" |
| Never synced | "Last synced: Never" |
| Large JSON | Truncate display to ~500 chars, full on copy |

## Scope

- Read-only display, no action buttons
- Collapsible debug section (collapsed by default)
- Copy buttons for compressed string and JSON
