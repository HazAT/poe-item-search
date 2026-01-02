# Cloud Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sync bookmarks across devices using chrome.storage.sync, with localStorage as the fast primary source and background cloud sync.

**Architecture:** LocalStorage remains the source of truth for fast reads/writes. A separate syncService compresses and pushes changes to chrome.storage.sync (debounced 5s). On tab focus, it pulls cloud data and merges using per-item last-write-wins. Tombstones track deletions for 30 days.

**Tech Stack:** LZ-String for compression, Zustand for sync UI state, chrome.storage.sync for cloud storage.

---

## Task 1: Add LZ-String Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install lz-string**

Run: `bun add lz-string && bun add -d @types/lz-string`

Expected: Package added to dependencies

**Step 2: Verify installation**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add lz-string for sync compression"
```

---

## Task 2: Update Bookmark Types with Timestamps

**Files:**
- Modify: `src/types/bookmarks.ts`

**Step 1: Add updatedAt to BookmarksTradeStruct**

In `src/types/bookmarks.ts`, update the interface:

```typescript
export interface BookmarksTradeStruct {
  id?: string;
  title: string;
  location: BookmarksTradeLocation;
  // These fields are optional for backwards compatibility with legacy bookmarks
  createdAt?: string;
  queryPayload?: TradeSearchQuery;
  resultCount?: number;
  previewImageUrl?: string;
  updatedAt?: number;  // Unix timestamp (ms) for sync
}
```

**Step 2: Add updatedAt to BookmarksFolderStruct**

```typescript
export interface BookmarksFolderStruct {
  id?: string;
  title: string;
  version: TradeSiteVersion;
  icon: string | null;
  archivedAt: string | null;
  updatedAt?: number;  // Unix timestamp (ms) for sync
}
```

**Step 3: Add Tombstone type**

Add at the end of the file:

```typescript
export interface SyncTombstone {
  id: string;
  type: 'bookmark' | 'folder';
  deletedAt: number;  // Unix timestamp (ms)
}

export interface SyncState {
  folders: BookmarksFolderStruct[];
  trades: Record<string, BookmarksTradeStruct[]>;
  tombstones: SyncTombstone[];
  lastSyncedAt: number;
}
```

**Step 4: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/types/bookmarks.ts
git commit -m "feat(sync): add updatedAt timestamps and tombstone types"
```

---

## Task 3: Create Sync Store for UI State

**Files:**
- Create: `src/stores/syncStore.ts`

**Step 1: Create the sync store**

Create `src/stores/syncStore.ts`:

```typescript
import { create } from "zustand";

interface SyncStoreState {
  // UI state
  hasNewData: boolean;
  lastSyncAt: number | null;
  isSyncing: boolean;

  // Actions
  setHasNewData: (hasNew: boolean) => void;
  setLastSyncAt: (timestamp: number) => void;
  setSyncing: (syncing: boolean) => void;
  clearNewDataIndicator: () => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  hasNewData: false,
  lastSyncAt: null,
  isSyncing: false,

  setHasNewData: (hasNew) => set({ hasNewData: hasNew }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  clearNewDataIndicator: () => set({ hasNewData: false }),
}));
```

**Step 2: Export from stores index**

In `src/stores/index.ts`, add:

```typescript
export { useSyncStore } from "./syncStore";
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/stores/syncStore.ts src/stores/index.ts
git commit -m "feat(sync): add sync store for UI state"
```

---

## Task 4: Create Sync Service - Core Structure

**Files:**
- Create: `src/services/syncService.ts`

**Step 1: Create the sync service skeleton**

Create `src/services/syncService.ts`:

```typescript
import LZString from "lz-string";
import { extensionApi } from "@/utils/extensionApi";
import { useSyncStore } from "@/stores/syncStore";
import { captureException } from "@/services/sentry";
import type { BookmarksFolderStruct, BookmarksTradeStruct, SyncTombstone, SyncState } from "@/types/bookmarks";

const SYNC_KEY = "bookmarks_v1";
const TOMBSTONE_RETENTION_DAYS = 30;
const DEBOUNCE_MS = 5000;

// Debug logging for sync
const debugSync = (msg: string, ...args: unknown[]) => {
  if (localStorage.getItem("poe-search-debug") === "true") {
    console.log(`[PoE Search] [Sync] ${msg}`, ...args);
  }
};

class SyncService {
  private pushTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPushedState: string | null = null;
  private machineId: string;

  constructor() {
    // Generate a unique ID for this machine/browser to detect external changes
    this.machineId = this.getOrCreateMachineId();
  }

  private getOrCreateMachineId(): string {
    const key = "poe-search-machine-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  /**
   * Initialize sync - call on extension load
   */
  async init(): Promise<void> {
    debugSync("init() called");
    await this.pull();
    this.setupVisibilityListener();
    debugSync("init() complete");
  }

  /**
   * Schedule a push to cloud storage (debounced)
   */
  schedulePush(): void {
    if (this.pushTimeout) {
      clearTimeout(this.pushTimeout);
    }
    this.pushTimeout = setTimeout(() => {
      this.push();
    }, DEBOUNCE_MS);
    debugSync("schedulePush() - push scheduled in", DEBOUNCE_MS, "ms");
  }

  /**
   * Push current state to cloud storage
   */
  async push(): Promise<void> {
    // Implementation in next task
  }

  /**
   * Pull state from cloud storage and merge
   */
  async pull(): Promise<void> {
    // Implementation in next task
  }

  /**
   * Set up visibility change listener for pull on tab focus
   */
  private setupVisibilityListener(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        debugSync("Tab became visible, pulling from cloud");
        this.pull();
      }
    });
  }

  /**
   * Compress state for storage
   */
  compress(state: SyncState): string {
    const json = JSON.stringify(state);
    const compressed = LZString.compressToEncodedURIComponent(json);
    debugSync(`compress() - ${json.length} chars -> ${compressed.length} chars (${((1 - compressed.length / json.length) * 100).toFixed(1)}% reduction)`);
    return compressed;
  }

  /**
   * Decompress state from storage
   */
  decompress(compressed: string): SyncState | null {
    try {
      const json = LZString.decompressFromEncodedURIComponent(compressed);
      if (!json) {
        debugSync("decompress() - decompression returned null");
        return null;
      }
      return JSON.parse(json) as SyncState;
    } catch (e) {
      debugSync("decompress() - failed:", e);
      captureException(e, { context: "sync-decompress" });
      return null;
    }
  }
}

export const syncService = new SyncService();
```

**Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/services/syncService.ts
git commit -m "feat(sync): add sync service skeleton with compression"
```

---

## Task 5: Implement Sync Service Push/Pull

**Files:**
- Modify: `src/services/syncService.ts`

**Step 1: Implement push method**

Add the push implementation in syncService.ts, replacing the empty push method:

```typescript
  /**
   * Push current state to cloud storage
   */
  async push(): Promise<void> {
    debugSync("push() called");
    useSyncStore.getState().setSyncing(true);

    try {
      const state = this.getCurrentState();
      const compressed = this.compress(state);

      // Check if state actually changed
      if (compressed === this.lastPushedState) {
        debugSync("push() - state unchanged, skipping");
        return;
      }

      // Check size limits (chrome.storage.sync has 100KB total, 8KB per item)
      const sizeBytes = new Blob([compressed]).size;
      if (sizeBytes > 100000) {
        debugSync("push() - WARNING: compressed size exceeds 100KB limit:", sizeBytes);
        captureException(new Error("Sync data exceeds quota"), {
          context: "sync-push",
          sizeBytes,
          folderCount: state.folders.length,
          tradeCount: Object.values(state.trades).flat().length,
        });
      }

      const api = extensionApi();
      await new Promise<void>((resolve, reject) => {
        api.storage.sync.set({ [SYNC_KEY]: compressed }, () => {
          const error = api.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
          } else {
            resolve();
          }
        });
      });

      this.lastPushedState = compressed;
      debugSync("push() - success, size:", sizeBytes, "bytes");
    } catch (e) {
      debugSync("push() - error:", e);
      captureException(e, { context: "sync-push" });
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }

  /**
   * Get current state from localStorage for pushing
   */
  private getCurrentState(): SyncState {
    const foldersRaw = localStorage.getItem("poe-search-bookmark-folders");
    const tombstonesRaw = localStorage.getItem("poe-search-sync-tombstones");

    const folders: BookmarksFolderStruct[] = foldersRaw ? JSON.parse(foldersRaw).value : [];
    const tombstones: SyncTombstone[] = tombstonesRaw ? JSON.parse(tombstonesRaw) : [];

    // Load all trades
    const trades: Record<string, BookmarksTradeStruct[]> = {};
    for (const folder of folders) {
      if (folder.id) {
        const tradesRaw = localStorage.getItem(`poe-search-bookmark-trades-${folder.id}`);
        trades[folder.id] = tradesRaw ? JSON.parse(tradesRaw).value : [];
      }
    }

    // Prune old tombstones
    const cutoff = Date.now() - (TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const prunedTombstones = tombstones.filter(t => t.deletedAt > cutoff);

    return {
      folders,
      trades,
      tombstones: prunedTombstones,
      lastSyncedAt: Date.now(),
    };
  }
```

**Step 2: Implement pull method**

Replace the empty pull method:

```typescript
  /**
   * Pull state from cloud storage and merge
   */
  async pull(): Promise<void> {
    debugSync("pull() called");
    useSyncStore.getState().setSyncing(true);

    try {
      const api = extensionApi();
      const result = await new Promise<{ [key: string]: string }>((resolve) => {
        api.storage.sync.get([SYNC_KEY], resolve);
      });

      const compressed = result[SYNC_KEY];
      if (!compressed) {
        debugSync("pull() - no cloud data found");
        return;
      }

      const cloudState = this.decompress(compressed);
      if (!cloudState) {
        debugSync("pull() - failed to decompress cloud data");
        return;
      }

      const localState = this.getCurrentState();
      const { merged, hasNewExternalData } = this.merge(localState, cloudState);

      // Save merged state to localStorage
      await this.saveState(merged);

      // Update UI if there's new external data
      if (hasNewExternalData) {
        useSyncStore.getState().setHasNewData(true);
        useSyncStore.getState().setLastSyncAt(Date.now());
        debugSync("pull() - new external data detected");
      }

      debugSync("pull() - complete");
    } catch (e) {
      debugSync("pull() - error:", e);
      captureException(e, { context: "sync-pull" });
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/services/syncService.ts
git commit -m "feat(sync): implement push and pull methods"
```

---

## Task 6: Implement Sync Service Merge Logic

**Files:**
- Modify: `src/services/syncService.ts`

**Step 1: Add merge method**

Add to syncService.ts:

```typescript
  /**
   * Merge local and cloud state using last-write-wins
   * Returns merged state and whether new external data was found
   */
  private merge(local: SyncState, cloud: SyncState): { merged: SyncState; hasNewExternalData: boolean } {
    debugSync("merge() - starting merge");
    let hasNewExternalData = false;

    // Merge tombstones (keep all, prune old ones later)
    const allTombstones = [...local.tombstones];
    for (const cloudTomb of cloud.tombstones) {
      if (!allTombstones.find(t => t.id === cloudTomb.id)) {
        allTombstones.push(cloudTomb);
      }
    }

    // Prune old tombstones
    const cutoff = Date.now() - (TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const mergedTombstones = allTombstones.filter(t => t.deletedAt > cutoff);

    // Merge folders
    const mergedFolders = this.mergeFolders(local.folders, cloud.folders, mergedTombstones);
    if (mergedFolders.hasNew) {
      hasNewExternalData = true;
    }

    // Merge trades
    const mergedTrades = this.mergeTrades(local.trades, cloud.trades, mergedTombstones);
    if (mergedTrades.hasNew) {
      hasNewExternalData = true;
    }

    return {
      merged: {
        folders: mergedFolders.items,
        trades: mergedTrades.items,
        tombstones: mergedTombstones,
        lastSyncedAt: Date.now(),
      },
      hasNewExternalData,
    };
  }

  private mergeFolders(
    local: BookmarksFolderStruct[],
    cloud: BookmarksFolderStruct[],
    tombstones: SyncTombstone[]
  ): { items: BookmarksFolderStruct[]; hasNew: boolean } {
    const merged: BookmarksFolderStruct[] = [];
    let hasNew = false;

    // Create lookup maps
    const localById = new Map(local.map(f => [f.id, f]));
    const cloudById = new Map(cloud.map(f => [f.id, f]));
    const tombstoneIds = new Set(tombstones.filter(t => t.type === 'folder').map(t => t.id));
    const allIds = new Set([...localById.keys(), ...cloudById.keys()]);

    for (const id of allIds) {
      if (!id) continue;

      // Check if tombstoned
      const tombstone = tombstones.find(t => t.id === id && t.type === 'folder');

      const localFolder = localById.get(id);
      const cloudFolder = cloudById.get(id);

      // If tombstoned and tombstone is newer than both, skip
      if (tombstone) {
        const localTime = localFolder?.updatedAt ?? 0;
        const cloudTime = cloudFolder?.updatedAt ?? 0;
        if (tombstone.deletedAt > localTime && tombstone.deletedAt > cloudTime) {
          continue;
        }
      }

      // Both exist - take newer
      if (localFolder && cloudFolder) {
        const localTime = localFolder.updatedAt ?? 0;
        const cloudTime = cloudFolder.updatedAt ?? 0;
        merged.push(cloudTime > localTime ? cloudFolder : localFolder);
      }
      // Only local exists
      else if (localFolder) {
        merged.push(localFolder);
      }
      // Only cloud exists - this is new external data
      else if (cloudFolder && !tombstoneIds.has(id)) {
        merged.push(cloudFolder);
        hasNew = true;
      }
    }

    return { items: merged, hasNew };
  }

  private mergeTrades(
    local: Record<string, BookmarksTradeStruct[]>,
    cloud: Record<string, BookmarksTradeStruct[]>,
    tombstones: SyncTombstone[]
  ): { items: Record<string, BookmarksTradeStruct[]>; hasNew: boolean } {
    const merged: Record<string, BookmarksTradeStruct[]> = {};
    let hasNew = false;

    const allFolderIds = new Set([...Object.keys(local), ...Object.keys(cloud)]);
    const tombstoneIds = new Set(tombstones.filter(t => t.type === 'bookmark').map(t => t.id));

    for (const folderId of allFolderIds) {
      const localTrades = local[folderId] ?? [];
      const cloudTrades = cloud[folderId] ?? [];

      const localById = new Map(localTrades.map(t => [t.id, t]));
      const cloudById = new Map(cloudTrades.map(t => [t.id, t]));
      const allTradeIds = new Set([...localById.keys(), ...cloudById.keys()]);

      const folderMerged: BookmarksTradeStruct[] = [];

      for (const tradeId of allTradeIds) {
        if (!tradeId) continue;

        // Check if tombstoned
        const tombstone = tombstones.find(t => t.id === tradeId && t.type === 'bookmark');

        const localTrade = localById.get(tradeId);
        const cloudTrade = cloudById.get(tradeId);

        // If tombstoned and tombstone is newer than both, skip
        if (tombstone) {
          const localTime = localTrade?.updatedAt ?? 0;
          const cloudTime = cloudTrade?.updatedAt ?? 0;
          if (tombstone.deletedAt > localTime && tombstone.deletedAt > cloudTime) {
            continue;
          }
        }

        // Both exist - take newer
        if (localTrade && cloudTrade) {
          const localTime = localTrade.updatedAt ?? 0;
          const cloudTime = cloudTrade.updatedAt ?? 0;
          folderMerged.push(cloudTime > localTime ? cloudTrade : localTrade);
        }
        // Only local exists
        else if (localTrade) {
          folderMerged.push(localTrade);
        }
        // Only cloud exists - this is new external data
        else if (cloudTrade && !tombstoneIds.has(tradeId)) {
          folderMerged.push(cloudTrade);
          hasNew = true;
        }
      }

      if (folderMerged.length > 0) {
        merged[folderId] = folderMerged;
      }
    }

    return { items: merged, hasNew };
  }
```

**Step 2: Add saveState method**

Add to syncService.ts:

```typescript
  /**
   * Save merged state back to localStorage
   */
  private async saveState(state: SyncState): Promise<void> {
    debugSync("saveState() - saving merged state");

    // Save folders
    localStorage.setItem("poe-search-bookmark-folders", JSON.stringify({ value: state.folders, expiresAt: null }));

    // Save trades per folder
    for (const [folderId, trades] of Object.entries(state.trades)) {
      localStorage.setItem(`poe-search-bookmark-trades-${folderId}`, JSON.stringify({ value: trades, expiresAt: null }));
    }

    // Save tombstones
    localStorage.setItem("poe-search-sync-tombstones", JSON.stringify(state.tombstones));

    debugSync("saveState() - complete");
  }
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/services/syncService.ts
git commit -m "feat(sync): implement merge logic with last-write-wins"
```

---

## Task 7: Update Bookmarks Store for Sync Integration

**Files:**
- Modify: `src/stores/bookmarksStore.ts`

**Step 1: Import syncService**

At the top of bookmarksStore.ts, add:

```typescript
import { syncService } from "@/services/syncService";
```

**Step 2: Update createFolder to add timestamp and trigger sync**

Update the createFolder function:

```typescript
  createFolder: async (folder) => {
    const { folders } = get();
    const newFolder: BookmarksFolderStruct = {
      ...folder,
      id: uniqueId(),
      updatedAt: Date.now(),
    };
    const newFolders = [...folders, newFolder];
    await storageService.setValue(FOLDERS_KEY, newFolders);
    set({ folders: newFolders });
    syncService.schedulePush();
  },
```

**Step 3: Update updateFolder to add timestamp and trigger sync**

```typescript
  updateFolder: async (id, updates) => {
    const { folders } = get();
    const newFolders = folders.map((folder) =>
      folder.id === id ? { ...folder, ...updates, updatedAt: Date.now() } : folder
    );
    await storageService.setValue(FOLDERS_KEY, newFolders);
    set({ folders: newFolders });
    syncService.schedulePush();
  },
```

**Step 4: Update deleteFolder to add tombstone and trigger sync**

```typescript
  deleteFolder: async (id) => {
    const { folders, trades } = get();
    const newFolders = folders.filter((folder) => folder.id !== id);
    await storageService.setValue(FOLDERS_KEY, newFolders);
    await storageService.deleteValue(`${TRADES_KEY_PREFIX}-${id}`);
    const newTrades = { ...trades };
    delete newTrades[id];
    set({ folders: newFolders, trades: newTrades });

    // Add tombstone for sync
    syncService.addTombstone(id, 'folder');
    syncService.schedulePush();
  },
```

**Step 5: Update createTrade to add timestamp and trigger sync**

```typescript
  createTrade: async (folderId, trade) => {
    const { trades, fetchTradesForFolder } = get();
    if (!trades[folderId]) {
      await fetchTradesForFolder(folderId);
    }
    const folderTrades = trades[folderId] ?? [];
    const newTrade: BookmarksTradeStruct = {
      ...trade,
      id: uniqueId(),
      updatedAt: Date.now(),
    };
    const newFolderTrades = [...folderTrades, newTrade];
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));
    syncService.schedulePush();
  },
```

**Step 6: Update updateTrade to add timestamp and trigger sync**

```typescript
  updateTrade: async (folderId, tradeId, updates) => {
    const { trades } = get();
    const folderTrades = trades[folderId] ?? [];
    const newFolderTrades = folderTrades.map((trade) =>
      trade.id === tradeId ? { ...trade, ...updates, updatedAt: Date.now() } : trade
    );
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));
    syncService.schedulePush();
  },
```

**Step 7: Update deleteTrade to add tombstone and trigger sync**

```typescript
  deleteTrade: async (folderId, tradeId) => {
    const { trades } = get();
    const folderTrades = trades[folderId] ?? [];
    const newFolderTrades = folderTrades.filter((trade) => trade.id !== tradeId);
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));

    // Add tombstone for sync
    syncService.addTombstone(tradeId, 'bookmark');
    syncService.schedulePush();
  },
```

**Step 8: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 9: Commit**

```bash
git add src/stores/bookmarksStore.ts
git commit -m "feat(sync): integrate sync triggers into bookmarks store"
```

---

## Task 8: Add Tombstone Management to Sync Service

**Files:**
- Modify: `src/services/syncService.ts`

**Step 1: Add addTombstone method**

Add to syncService class:

```typescript
  /**
   * Add a tombstone for a deleted item
   */
  addTombstone(id: string, type: 'bookmark' | 'folder'): void {
    const tombstonesRaw = localStorage.getItem("poe-search-sync-tombstones");
    const tombstones: SyncTombstone[] = tombstonesRaw ? JSON.parse(tombstonesRaw) : [];

    // Don't add duplicate tombstone
    if (tombstones.find(t => t.id === id)) {
      return;
    }

    tombstones.push({
      id,
      type,
      deletedAt: Date.now(),
    });

    localStorage.setItem("poe-search-sync-tombstones", JSON.stringify(tombstones));
    debugSync(`addTombstone() - added ${type} tombstone for`, id);
  }
```

**Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/services/syncService.ts
git commit -m "feat(sync): add tombstone management"
```

---

## Task 9: Create Sync Indicator Component

**Files:**
- Create: `src/components/panel/SyncIndicator.tsx`

**Step 1: Create the component**

Create `src/components/panel/SyncIndicator.tsx`:

```typescript
import { useSyncStore } from "@/stores/syncStore";

export function SyncIndicator() {
  const { hasNewData, lastSyncAt } = useSyncStore();

  // Don't show anything if no new data from cloud
  if (!hasNewData || !lastSyncAt) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="relative group"
      title={`Synced bookmarks from cloud at ${formatTime(lastSyncAt)}`}
    >
      <span className="flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-poe-gray-alt text-poe-beige text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        Synced from cloud at {formatTime(lastSyncAt)}
      </div>
    </div>
  );
}
```

**Step 2: Export from panel index**

In `src/components/panel/index.ts`, add:

```typescript
export { SyncIndicator } from "./SyncIndicator";
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/components/panel/SyncIndicator.tsx src/components/panel/index.ts
git commit -m "feat(sync): add sync indicator component"
```

---

## Task 10: Add Sync Indicator to Panel Header

**Files:**
- Modify: `src/components/panel/PanelHeader.tsx`

**Step 1: Import SyncIndicator and useSyncStore**

At the top of PanelHeader.tsx, add:

```typescript
import { SyncIndicator } from "./SyncIndicator";
```

**Step 2: Add indicator to header**

Update the header content to include the sync indicator between the version and dev indicator:

```typescript
        <div className="flex items-center gap-3">
          <h1 className="font-fontin text-xl text-poe-beige tracking-wide">PoE Search</h1>
          <span className="text-sm text-poe-gray-alt">v{__APP_VERSION__}</span>
          <SyncIndicator />
          {__DEV_MODE__ && <DevModeIndicator />}
        </div>
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/components/panel/PanelHeader.tsx
git commit -m "feat(sync): add sync indicator to panel header"
```

---

## Task 11: Clear Sync Indicator on Bookmarks Tab Visit

**Files:**
- Modify: `src/components/bookmarks/BookmarksTab.tsx`

**Step 1: Read the current BookmarksTab**

First, read the file to understand its structure.

**Step 2: Import useSyncStore and add effect**

Add import:

```typescript
import { useSyncStore } from "@/stores/syncStore";
```

Add inside the component:

```typescript
const { clearNewDataIndicator } = useSyncStore();

// Clear sync indicator when user views bookmarks tab
useEffect(() => {
  clearNewDataIndicator();
}, [clearNewDataIndicator]);
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/components/bookmarks/BookmarksTab.tsx
git commit -m "feat(sync): clear sync indicator when viewing bookmarks"
```

---

## Task 12: Initialize Sync Service on App Load

**Files:**
- Modify: `src/content.tsx`

**Step 1: Import syncService**

At the top of content.tsx, add:

```typescript
import { syncService } from "@/services/syncService";
```

**Step 2: Initialize sync in initialize function**

In the initialize function, after `initSearchInterceptor()`:

```typescript
    // Initialize interceptor listener in content script
    initSearchInterceptor();

    // Initialize cloud sync
    syncService.init().catch((e) => {
      console.error("[PoE Item Search] Sync init failed:", e);
      captureException(e, { context: "sync-init" });
    });
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/content.tsx
git commit -m "feat(sync): initialize sync service on app load"
```

---

## Task 13: Add Migration for Existing Bookmarks

**Files:**
- Modify: `src/services/syncService.ts`

**Step 1: Add migration method**

Add to syncService class:

```typescript
  /**
   * Migrate existing bookmarks to have updatedAt timestamps
   * Called once on first sync init
   */
  private migrateExistingData(): void {
    const migrationKey = "poe-search-sync-migrated-v1";
    if (localStorage.getItem(migrationKey)) {
      return; // Already migrated
    }

    debugSync("migrateExistingData() - running migration");
    const now = Date.now();

    // Migrate folders
    const foldersRaw = localStorage.getItem("poe-search-bookmark-folders");
    if (foldersRaw) {
      try {
        const parsed = JSON.parse(foldersRaw);
        const folders: BookmarksFolderStruct[] = parsed.value ?? [];
        const migratedFolders = folders.map(f => ({
          ...f,
          updatedAt: f.updatedAt ?? now,
        }));
        localStorage.setItem("poe-search-bookmark-folders", JSON.stringify({ value: migratedFolders, expiresAt: null }));
        debugSync(`migrateExistingData() - migrated ${folders.length} folders`);

        // Migrate trades for each folder
        for (const folder of migratedFolders) {
          if (!folder.id) continue;
          const tradesRaw = localStorage.getItem(`poe-search-bookmark-trades-${folder.id}`);
          if (tradesRaw) {
            try {
              const parsedTrades = JSON.parse(tradesRaw);
              const trades: BookmarksTradeStruct[] = parsedTrades.value ?? [];
              const migratedTrades = trades.map(t => ({
                ...t,
                updatedAt: t.updatedAt ?? now,
              }));
              localStorage.setItem(`poe-search-bookmark-trades-${folder.id}`, JSON.stringify({ value: migratedTrades, expiresAt: null }));
              debugSync(`migrateExistingData() - migrated ${trades.length} trades for folder ${folder.id}`);
            } catch (e) {
              debugSync("migrateExistingData() - failed to migrate trades for folder", folder.id, e);
            }
          }
        }
      } catch (e) {
        debugSync("migrateExistingData() - failed to migrate folders:", e);
      }
    }

    localStorage.setItem(migrationKey, "true");
    debugSync("migrateExistingData() - migration complete");
  }
```

**Step 2: Call migration in init**

Update the init method to call migration first:

```typescript
  async init(): Promise<void> {
    debugSync("init() called");
    this.migrateExistingData();
    await this.pull();
    this.setupVisibilityListener();
    debugSync("init() complete");
  }
```

**Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/services/syncService.ts
git commit -m "feat(sync): add migration for existing bookmarks"
```

---

## Task 14: Export Sync Service from Services Index

**Files:**
- Modify: `src/services/index.ts`

**Step 1: Add export**

In `src/services/index.ts`, add:

```typescript
export { syncService } from "./syncService";
```

**Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/services/index.ts
git commit -m "chore(sync): export sync service from index"
```

---

## Task 15: Test Build and Manual Verification

**Step 1: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 2: Run build**

Run: `bun run build`
Expected: Build succeeds without errors

**Step 3: Manual verification checklist**

- [ ] Load extension in Chrome
- [ ] Create a bookmark folder
- [ ] Add a bookmark to the folder
- [ ] Check chrome.storage.sync in DevTools (Application > Storage > Extension Storage)
- [ ] Verify compressed data appears
- [ ] Delete a bookmark
- [ ] Verify tombstone is added
- [ ] Open a second Chrome profile (or incognito if sync works there)
- [ ] Verify bookmark syncs across

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(sync): complete cloud sync implementation"
```

---

## Summary

**Files created:**
- `src/stores/syncStore.ts` - UI state for sync indicator
- `src/services/syncService.ts` - Core sync logic (compress, push, pull, merge)
- `src/components/panel/SyncIndicator.tsx` - Visual indicator component

**Files modified:**
- `package.json` - Added lz-string dependency
- `src/types/bookmarks.ts` - Added updatedAt, SyncTombstone, SyncState types
- `src/stores/bookmarksStore.ts` - Added sync triggers to all mutations
- `src/stores/index.ts` - Export syncStore
- `src/services/index.ts` - Export syncService
- `src/components/panel/PanelHeader.tsx` - Added SyncIndicator
- `src/components/panel/index.ts` - Export SyncIndicator
- `src/components/bookmarks/BookmarksTab.tsx` - Clear indicator on visit
- `src/content.tsx` - Initialize sync service
