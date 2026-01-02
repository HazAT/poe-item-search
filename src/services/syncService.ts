import LZString from "lz-string";
import { captureException } from "@/services/sentry";
import type { SyncState } from "@/types/bookmarks";

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
