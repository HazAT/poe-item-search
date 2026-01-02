import LZString from "lz-string";
import { extensionApi } from "@/utils/extensionApi";
import { useSyncStore } from "@/stores/syncStore";
import { captureException } from "@/services/sentry";
import type { BookmarksFolderStruct, BookmarksTradeStruct, SyncTombstone, SyncState } from "@/types/bookmarks";

// Constants for sync configuration
export const SYNC_KEY = "bookmarks_v1";
export const TOMBSTONE_RETENTION_DAYS = 30;
export const DEBOUNCE_MS = 5000;

// Debug logging for sync
const debugSync = (msg: string, ...args: unknown[]) => {
  if (localStorage.getItem("poe-search-debug") === "true") {
    console.log(`[PoE Search] [Sync] ${msg}`, ...args);
  }
};

/**
 * Get or create a unique machine ID for this browser instance.
 * Used to detect if sync data came from this machine or externally.
 */
export function getOrCreateMachineId(): string {
  const key = "poe-search-machine-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

class SyncService {
  private pushTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPushedState: string | null = null;

  /**
   * Initialize sync - call on extension load
   */
  async init(): Promise<void> {
    debugSync("init() called");
    this.migrateExistingData();
    await this.pull();
    this.setupVisibilityListener();
    debugSync("init() complete");
  }

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
              captureException(e, { context: "sync-migration-trades", folderId: folder.id });
            }
          }
        }
      } catch (e) {
        debugSync("migrateExistingData() - failed to migrate folders:", e);
        captureException(e, { context: "sync-migration-folders" });
      }
    }

    localStorage.setItem(migrationKey, "true");
    debugSync("migrateExistingData() - migration complete");
  }

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

  /**
   * Pull state from cloud storage and merge
   */
  async pull(): Promise<void> {
    debugSync("pull() called");
    useSyncStore.getState().setSyncing(true);

    try {
      const api = extensionApi();
      const result = await new Promise<Record<string, unknown>>((resolve) => {
        api.storage.sync.get([SYNC_KEY], resolve);
      });

      const compressed = result[SYNC_KEY] as string | undefined;
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
}

export const syncService = new SyncService();
