import LZString from "lz-string";
import { extensionApi } from "@/utils/extensionApi";
import { useSyncStore } from "@/stores/syncStore";
import { captureException } from "@/services/sentry";
import { debug } from "@/utils/debug";
import type { BookmarksFolderStruct, BookmarksTradeStruct, SyncTombstone, SyncState } from "@/types/bookmarks";

// Constants for sync configuration
export const SYNC_KEY = "bookmarks_v1";
export const TOMBSTONE_RETENTION_DAYS = 30;
export const DEBOUNCE_MS = 5000;
export const SYNC_QUOTA_BYTES = 102400; // 100KB

export interface SyncQuotaInfo {
  usedBytes: number;
  totalBytes: number;
  percentUsed: number;
}

export interface ForceSyncResult {
  success: boolean;
  error?: string;
  quotaInfo?: SyncQuotaInfo;
}

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
    debug.log("[Sync] init() called");
    await this.pull();
    this.setupVisibilityListener();
    debug.log("[Sync] init() complete");
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
    debug.log(`[Sync] addTombstone() - added ${type} tombstone for`, id);
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
    debug.log("[Sync] schedulePush() - push scheduled in", DEBOUNCE_MS, "ms");
  }

  /**
   * Push current state to cloud storage
   */
  async push(): Promise<void> {
    debug.log("[Sync] push() called");
    useSyncStore.getState().setSyncing(true);

    try {
      const state = await this.getLocalState();
      const compressed = this.compress(state);

      // Check if state actually changed
      if (compressed === this.lastPushedState) {
        debug.log("[Sync] push() - state unchanged, skipping");
        return;
      }

      // Check size limits (chrome.storage.sync has 100KB total, 8KB per item)
      const sizeBytes = new Blob([compressed]).size;
      if (sizeBytes > 100000) {
        debug.log("[Sync] push() - WARNING: compressed size exceeds 100KB limit:", sizeBytes);
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
      debug.log("[Sync] push() - success, size:", sizeBytes, "bytes");
    } catch (e) {
      debug.log("[Sync] push() - error:", e);
      captureException(e, { context: "sync-push" });
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }

  /**
   * Get current local state (public for status display)
   */
  async getLocalState(): Promise<SyncState> {
    const api = extensionApi();

    // Read folders from chrome.storage.local (where storageService writes them)
    const foldersResult = await new Promise<Record<string, unknown>>((resolve) => {
      api.storage.local.get(["poe-search-bookmark-folders"], resolve);
    });
    const foldersPayload = foldersResult["poe-search-bookmark-folders"] as { value: BookmarksFolderStruct[] } | undefined;
    const folders: BookmarksFolderStruct[] = foldersPayload?.value ?? [];

    // Tombstones stay in localStorage (sync-specific metadata)
    const tombstonesRaw = localStorage.getItem("poe-search-sync-tombstones");
    const tombstones: SyncTombstone[] = tombstonesRaw ? JSON.parse(tombstonesRaw) : [];

    // Load all trades from chrome.storage.local
    const trades: Record<string, BookmarksTradeStruct[]> = {};
    for (const folder of folders) {
      if (folder.id) {
        const tradesResult = await new Promise<Record<string, unknown>>((resolve) => {
          api.storage.local.get([`poe-search-bookmark-trades-${folder.id}`], resolve);
        });
        const tradesPayload = tradesResult[`poe-search-bookmark-trades-${folder.id}`] as { value: BookmarksTradeStruct[] } | undefined;
        trades[folder.id] = tradesPayload?.value ?? [];
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
   * Get cloud state (fetches and decompresses)
   */
  async getCloudState(): Promise<SyncState | null> {
    try {
      const api = extensionApi();
      const result = await new Promise<Record<string, unknown>>((resolve) => {
        api.storage.sync.get([SYNC_KEY], resolve);
      });

      const compressed = result[SYNC_KEY] as string | undefined;
      if (!compressed) {
        return null;
      }

      return this.decompress(compressed);
    } catch (e) {
      debug.log("[Sync] getCloudState() - error:", e);
      captureException(e, { context: "sync-get-cloud-state" });
      return null;
    }
  }

  /**
   * Get raw compressed cloud data (for debug/transfer)
   */
  async getCompressedCloudData(): Promise<string | null> {
    try {
      const api = extensionApi();
      const result = await new Promise<Record<string, unknown>>((resolve) => {
        api.storage.sync.get([SYNC_KEY], resolve);
      });

      return (result[SYNC_KEY] as string) ?? null;
    } catch (e) {
      debug.log("[Sync] getCompressedCloudData() - error:", e);
      captureException(e, { context: "sync-get-compressed-data" });
      return null;
    }
  }

  /**
   * Pull state from cloud storage and merge
   */
  async pull(): Promise<void> {
    debug.log("[Sync] pull() called");
    useSyncStore.getState().setSyncing(true);

    try {
      const api = extensionApi();
      const result = await new Promise<Record<string, unknown>>((resolve) => {
        api.storage.sync.get([SYNC_KEY], resolve);
      });

      const compressed = result[SYNC_KEY] as string | undefined;
      if (!compressed) {
        debug.log("[Sync] pull() - no cloud data found");
        return;
      }

      const cloudState = this.decompress(compressed);
      if (!cloudState) {
        debug.log("[Sync] pull() - failed to decompress cloud data");
        return;
      }

      const localState = await this.getLocalState();
      const { merged, hasNewExternalData } = this.merge(localState, cloudState);

      // Save merged state to localStorage
      await this.saveState(merged);

      // Update UI if there's new external data
      if (hasNewExternalData) {
        useSyncStore.getState().setHasNewData(true);
        useSyncStore.getState().setLastSyncAt(Date.now());
        debug.log("[Sync] pull() - new external data detected");
      }

      debug.log("[Sync] pull() - complete");
    } catch (e) {
      debug.log("[Sync] pull() - error:", e);
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
        debug.log("[Sync] Tab became visible, pulling from cloud");
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
    debug.log(`[Sync] compress() - ${json.length} chars -> ${compressed.length} chars (${((1 - compressed.length / json.length) * 100).toFixed(1)}% reduction)`);
    return compressed;
  }

  /**
   * Decompress state from storage
   */
  decompress(compressed: string): SyncState | null {
    try {
      const json = LZString.decompressFromEncodedURIComponent(compressed);
      if (!json) {
        debug.log("[Sync] decompress() - decompression returned null");
        return null;
      }
      return JSON.parse(json) as SyncState;
    } catch (e) {
      debug.log("[Sync] decompress() - failed:", e);
      captureException(e, { context: "sync-decompress" });
      return null;
    }
  }

  /**
   * Merge local and cloud state using last-write-wins
   * Returns merged state and whether new external data was found
   */
  private merge(local: SyncState, cloud: SyncState): { merged: SyncState; hasNewExternalData: boolean } {
    debug.log("[Sync] merge() - starting merge");
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
   * Save merged state back to chrome.storage.local
   */
  private async saveState(state: SyncState): Promise<void> {
    debug.log("[Sync] saveState() - saving merged state");
    const api = extensionApi();

    // Save folders to chrome.storage.local
    await new Promise<void>((resolve) => {
      api.storage.local.set({
        "poe-search-bookmark-folders": { value: state.folders, expiresAt: null }
      }, resolve);
    });

    // Save trades per folder to chrome.storage.local
    for (const [folderId, trades] of Object.entries(state.trades)) {
      await new Promise<void>((resolve) => {
        api.storage.local.set({
          [`poe-search-bookmark-trades-${folderId}`]: { value: trades, expiresAt: null }
        }, resolve);
      });
    }

    // Tombstones stay in localStorage (sync-specific metadata)
    localStorage.setItem("poe-search-sync-tombstones", JSON.stringify(state.tombstones));

    debug.log("[Sync] saveState() - complete");
  }

  /**
   * Get quota info for cloud storage
   * Returns null if sync is not available (e.g., unpacked extension)
   */
  async getQuotaInfo(): Promise<SyncQuotaInfo | null> {
    try {
      const api = extensionApi();
      const state = await this.getLocalState();
      const compressed = this.compress(state);
      const usedBytes = new Blob([compressed]).size;

      return {
        usedBytes,
        totalBytes: SYNC_QUOTA_BYTES,
        percentUsed: (usedBytes / SYNC_QUOTA_BYTES) * 100,
      };
    } catch (e) {
      debug.log("[Sync] getQuotaInfo() - error:", e);
      return null;
    }
  }

  /**
   * Force an immediate sync (push local state to cloud)
   * Returns detailed result with error info for UI feedback
   */
  async forceSync(): Promise<ForceSyncResult> {
    debug.log("[Sync] forceSync() called");
    useSyncStore.getState().setSyncing(true);

    try {
      const api = extensionApi();

      // Check if chrome.storage.sync is available
      if (!api.storage?.sync) {
        return {
          success: false,
          error: "Cloud sync is not available. Install from Chrome Web Store to enable sync.",
        };
      }

      const state = await this.getLocalState();
      const compressed = this.compress(state);
      const sizeBytes = new Blob([compressed]).size;

      // Check size limits
      if (sizeBytes > SYNC_QUOTA_BYTES) {
        return {
          success: false,
          error: `Data size (${this.formatBytes(sizeBytes)}) exceeds sync quota (${this.formatBytes(SYNC_QUOTA_BYTES)}). Remove some bookmarks to enable sync.`,
          quotaInfo: {
            usedBytes: sizeBytes,
            totalBytes: SYNC_QUOTA_BYTES,
            percentUsed: (sizeBytes / SYNC_QUOTA_BYTES) * 100,
          },
        };
      }

      // Attempt to push to cloud
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
      useSyncStore.getState().setLastSyncAt(Date.now());

      debug.log("[Sync] forceSync() - success, size:", sizeBytes, "bytes");

      return {
        success: true,
        quotaInfo: {
          usedBytes: sizeBytes,
          totalBytes: SYNC_QUOTA_BYTES,
          percentUsed: (sizeBytes / SYNC_QUOTA_BYTES) * 100,
        },
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      debug.log("[Sync] forceSync() - error:", e);
      captureException(e, { context: "sync-force-push" });

      // Detect common error patterns
      if (errorMessage.includes("QUOTA_BYTES")) {
        return {
          success: false,
          error: "Storage quota exceeded. Remove some bookmarks to enable sync.",
        };
      }

      if (errorMessage.includes("MAX_ITEMS") || errorMessage.includes("MAX_WRITE_OPERATIONS")) {
        return {
          success: false,
          error: "Too many sync operations. Please try again later.",
        };
      }

      // For unpacked extensions or other access issues
      if (errorMessage.includes("not available") || errorMessage.includes("not allowed")) {
        return {
          success: false,
          error: "Cloud sync is not available. Install from Chrome Web Store to enable sync.",
        };
      }

      return {
        success: false,
        error: `Sync failed: ${errorMessage}`,
      };
    } finally {
      useSyncStore.getState().setSyncing(false);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
}

export const syncService = new SyncService();
