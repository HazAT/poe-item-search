# Cloud Sync Design

Bookmark synchronization across devices using Chrome's sync storage API.

## Overview

Add cloud sync for bookmarks that runs in parallel to localStorage. LocalStorage remains the source of truth (fast), while chrome.storage.sync provides background synchronization across devices. Conflicts resolved via "last write wins" using timestamps.

## Requirements

- Sync bookmarks (not history) across devices via chrome.storage.sync
- localStorage remains primary, cloud sync is background/eventual
- Last-write-wins conflict resolution at per-bookmark granularity
- Efficient compression to stay within 100KB chrome.storage.sync limit
- String-based compression format (future-proofed for sharing feature)
- Sync should "just work" - no user configuration needed

## Data Model Changes

### Updated Bookmark/Folder Types

```typescript
interface Bookmark {
  id: string;
  name: string;
  folderId: string | null;
  query: TradeQuery;
  updatedAt: number;  // Unix timestamp (ms)
}

interface BookmarkFolder {
  id: string;
  name: string;
  updatedAt: number;  // Unix timestamp (ms)
}
```

### New Tombstone Type

```typescript
interface Tombstone {
  id: string;
  type: 'bookmark' | 'folder';
  deletedAt: number;  // Unix timestamp (ms)
}
```

Tombstones are pruned after 30 days.

### Migration

On first load after update, existing bookmarks/folders get `updatedAt: Date.now()`.

## Sync Service Architecture

### New File: `src/services/syncService.ts`

Responsibilities:
- Compress/decompress using LZ-String (`compressToEncodedURIComponent`)
- Push to cloud (debounced 5s after last change)
- Pull from cloud (on tab focus + extension load)
- Merge logic (per-item last-write-wins)

### Sync Flow

```
Local change -> bookmarksStore updates localStorage ->
  -> syncService.schedulePush() (debounced 5s) ->
  -> compress & write to chrome.storage.sync

Tab gains focus -> syncService.pull() ->
  -> read from chrome.storage.sync -> decompress ->
  -> merge with local (per-item last-write-wins) ->
  -> update bookmarksStore if changes found ->
  -> show sync indicator if new items arrived
```

### Chrome Storage Structure

```typescript
// chrome.storage.sync (100KB limit)
{
  "bookmarks_v1": "<lz-string compressed JSON>"
}
```

## Merge Logic

Three cases per item:

1. **Item exists in both local and cloud** - Compare `updatedAt`, keep newer
2. **Item exists only locally** - Check for cloud tombstone. If tombstone newer than item, delete locally. Otherwise keep.
3. **Item exists only in cloud** - Check for local tombstone. If tombstone newer, ignore. Otherwise add to local.

### Cascade Delete

When a folder tombstone is applied, all bookmarks with that `folderId` also get tombstoned using the folder's `deletedAt` timestamp.

## UI Sync Indicator

### Location

Panel header, near version/dev indicator.

### Behavior

- Only appears when sync brought in new items from another machine
- Single-machine users never see any sync UI
- Small dot badge when new data arrives
- Tooltip on hover: "Synced bookmarks from cloud at [TIME]"
- Clears when user visits Bookmarks tab

### State

```typescript
interface SyncState {
  hasNewData: boolean;
  lastSyncAt: number | null;
}
```

## Integration with bookmarksStore

Changes to `src/stores/bookmarksStore.ts`:

1. Add `updatedAt: Date.now()` to all mutations
2. Track `tombstones: Tombstone[]` in store state
3. Call `syncService.schedulePush()` after each mutation
4. New `mergeFromCloud(cloudState)` action for syncService to call

## Error Handling

### Sync Failures

- Log to Sentry + debug system
- Retry on next scheduled push
- No user-facing errors - sync is best-effort
- LocalStorage always works, data never lost

### Quota Management

- LZ-String achieves 50-70% compression
- Log warning to Sentry if approaching 90KB
- Future: prune tombstones aggressively or shard keys if needed

### Race Conditions

- Multiple tabs on same machine: Chrome handles last-write-wins
- Fine since tabs share localStorage anyway

### Offline

- chrome.storage.sync queues writes when offline
- No special handling needed

### Fresh Install

- Cloud wins on fresh install (empty local state)
- On reinstall, cloud data restores automatically

## File Structure

### New Files

```
src/services/syncService.ts    # Core sync logic
src/stores/syncStore.ts        # UI state (hasNewData, lastSyncAt)
```

### Modified Files

```
src/stores/bookmarksStore.ts   # updatedAt, tombstones, mergeFromCloud()
src/types/bookmarks.ts         # Updated types
src/components/panel/PanelHeader.tsx  # Sync indicator
src/content.tsx                # Initialize sync, visibility listener
```

### Dependencies

```
lz-string  # ~5KB compression library
```

## Initialization Flow

1. Extension loads -> `syncService.init()`
2. Pull from cloud -> merge with localStorage
3. Subscribe to visibility changes -> pull on tab focus
4. Subscribe to bookmarksStore changes -> debounced push
