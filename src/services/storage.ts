// Storage service for Chrome extension with sync support
// Based on better-trading's implementation

import { extensionApi } from "@/utils/extensionApi";

// Note: Cannot import debug utility here due to circular dependency
// (debug -> settingsStore -> storage)
const storageLog = (msg: string, ...args: unknown[]) => {
  // Check localStorage flag directly to avoid circular dep
  if (localStorage.getItem("poe-search-debug") === "true") {
    console.log(`[PoE Search] [Storage] ${msg}`, ...args);
  }
};

// Keys that should be synced across devices when sync is enabled
const SYNCABLE_KEY_PATTERNS = ["bookmark-folders", "bookmark-trades-", "trade-history"];
const SYNC_ENABLED_KEY = "poe-search-sync-enabled";

type StorageBackend = "local" | "sync";

interface StoragePayload<T> {
  value: T;
  expiresAt: string | null;
}

export interface SyncQuotaInfo {
  bytesUsed: number;
  totalQuota: number;
  percentUsed: number;
  itemCount: number;
  maxItems: number;
  isNearQuota: boolean;
  isNearItemLimit: boolean;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

class StorageService {
  private prefix = "poe-search-";
  private _syncEnabled: boolean = false;
  private _syncQuotaInfo: SyncQuotaInfo | null = null;
  private _initialized: boolean = false;
  private _listeners: Set<() => void> = new Set();

  get syncEnabled(): boolean {
    return this._syncEnabled;
  }

  get syncQuotaInfo(): SyncQuotaInfo | null {
    return this._syncQuotaInfo;
  }

  // Subscribe to sync state changes
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notify() {
    this._listeners.forEach((listener) => listener());
  }

  async initialize(): Promise<void> {
    storageLog("initialize() called");
    if (this._initialized) {
      storageLog("initialize() - already initialized");
      return;
    }

    // Check if sync is enabled (stored in localStorage for quick access)
    const syncEnabledValue = localStorage.getItem(SYNC_ENABLED_KEY);
    this._syncEnabled = syncEnabledValue === "true";
    storageLog(`initialize() - syncEnabled: ${this._syncEnabled}`);

    if (this._syncEnabled) {
      await this.updateSyncQuotaInfo();
    }

    this._initialized = true;
    storageLog("initialize() complete");
  }

  private getBackendForKey(key: string): StorageBackend {
    if (!this._syncEnabled) return "local";
    const isSyncable = SYNCABLE_KEY_PATTERNS.some((pattern) =>
      key.toLowerCase().startsWith(pattern)
    );
    return isSyncable ? "sync" : "local";
  }

  private getStorageApi(backend: StorageBackend) {
    const api = extensionApi();
    return backend === "sync" ? api.storage.sync : api.storage.local;
  }

  async getValue<T>(key: string): Promise<T | null> {
    const formattedKey = this.formatKey(key);
    const backend = this.getBackendForKey(key);
    const storageApi = this.getStorageApi(backend);

    storageLog(`getValue(${key}) - backend: ${backend}`);

    return new Promise((resolve) => {
      let resolved = false;
      const safeResolve = (value: T | null, reason?: string) => {
        if (!resolved) {
          resolved = true;
          storageLog(`getValue(${key}) resolved: ${value !== null ? "found" : "null"}${reason ? ` (${reason})` : ""}`);
          resolve(value);
        }
      };

      try {
        storageApi.get([formattedKey], (result) => {
          try {
            const payload = result[formattedKey] as StoragePayload<T> | undefined;
            if (!payload) {
              safeResolve(null, "no payload");
              return;
            }
            if (payload.expiresAt) {
              const expired = new Date(payload.expiresAt).getTime() < Date.now();
              if (expired) {
                safeResolve(null, "expired");
                return;
              }
            }
            safeResolve(payload.value);
          } catch (e) {
            console.error(`[PoE Search] [Storage] getValue(${key}) callback error:`, e);
            safeResolve(null, "callback error");
          }
        });
      } catch (e) {
        console.error(`[PoE Search] [Storage] getValue(${key}) outer error:`, e);
        safeResolve(null, "outer error");
      }

      // Timeout fallback - resolve after 500ms if callback never fires
      setTimeout(() => safeResolve(null, "timeout"), 500);
    });
  }

  async setValue<T>(key: string, value: T): Promise<void> {
    const formattedKey = this.formatKey(key);
    const backend = this.getBackendForKey(key);
    const storageApi = this.getStorageApi(backend);

    storageLog(`setValue(${key}) - backend: ${backend}`);

    return new Promise((resolve, reject) => {
      const payload: StoragePayload<T> = { value, expiresAt: null };
      storageApi.set({ [formattedKey]: payload }, () => {
        const lastError = extensionApi().runtime.lastError;
        if (lastError) {
          storageLog(`setValue(${key}) error:`, lastError.message);
          reject(new Error(lastError.message));
        } else {
          storageLog(`setValue(${key}) success`);
          resolve();
        }
      });
    });
  }

  async setEphemeralValue<T>(key: string, value: T, expirationDate: Date): Promise<void> {
    const formattedKey = this.formatKey(key);
    const backend = this.getBackendForKey(key);
    const storageApi = this.getStorageApi(backend);

    return new Promise((resolve, reject) => {
      const payload: StoragePayload<T> = {
        value,
        expiresAt: expirationDate.toUTCString(),
      };
      storageApi.set({ [formattedKey]: payload }, () => {
        const lastError = extensionApi().runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async deleteValue(key: string): Promise<void> {
    const formattedKey = this.formatKey(key);
    const backend = this.getBackendForKey(key);
    const storageApi = this.getStorageApi(backend);

    return new Promise((resolve) => {
      storageApi.remove(formattedKey, resolve);
    });
  }

  async setSyncEnabled(enabled: boolean): Promise<SyncResult> {
    if (enabled === this._syncEnabled) {
      return { success: true };
    }

    if (enabled) {
      const migrationResult = await this.migrateLocalToSync();
      if (!migrationResult.success) {
        return migrationResult;
      }
    } else {
      await this.migrateSyncToLocal();
    }

    localStorage.setItem(SYNC_ENABLED_KEY, enabled.toString());
    this._syncEnabled = enabled;

    if (enabled) {
      await this.updateSyncQuotaInfo();
    } else {
      this._syncQuotaInfo = null;
    }

    this.notify();
    return { success: true };
  }

  private async migrateLocalToSync(): Promise<SyncResult> {
    const api = extensionApi();
    const allLocalKeys = await this.fetchAllKeysFromBackend("local");
    const syncableKeys = allLocalKeys.filter((key) =>
      SYNCABLE_KEY_PATTERNS.some((pattern) => key.startsWith(this.prefix + pattern))
    );

    // Read all data to migrate
    const dataToMigrate: Record<string, StoragePayload<unknown>> = {};
    for (const key of syncableKeys) {
      const value = await this.readFromBackend(key, "local");
      if (value) {
        dataToMigrate[key] = value;
      }
    }

    // Check quota limits
    const dataSize = new Blob([JSON.stringify(dataToMigrate)]).size;
    const syncApi = api.storage.sync;

    if (dataSize > syncApi.QUOTA_BYTES) {
      return {
        success: false,
        error: `Data size (${this.formatBytes(dataSize)}) exceeds sync quota (${this.formatBytes(syncApi.QUOTA_BYTES)})`,
      };
    }

    // Check per-item limits
    for (const [key, value] of Object.entries(dataToMigrate)) {
      const itemSize = new Blob([JSON.stringify({ [key]: value })]).size;
      if (itemSize > syncApi.QUOTA_BYTES_PER_ITEM) {
        return {
          success: false,
          error: `Item "${key}" (${this.formatBytes(itemSize)}) exceeds per-item limit (${this.formatBytes(syncApi.QUOTA_BYTES_PER_ITEM)})`,
        };
      }
    }

    // Migrate data
    try {
      for (const [key, value] of Object.entries(dataToMigrate)) {
        await this.writeToBackend(key, value, "sync");
      }
    } catch (error) {
      return { success: false, error: `Migration failed: ${(error as Error).message}` };
    }

    return { success: true };
  }

  private async migrateSyncToLocal(): Promise<void> {
    const syncKeys = await this.fetchAllKeysFromBackend("sync");
    const syncableKeys = syncKeys.filter((key) =>
      SYNCABLE_KEY_PATTERNS.some((pattern) => key.startsWith(this.prefix + pattern))
    );

    for (const key of syncableKeys) {
      const value = await this.readFromBackend(key, "sync");
      if (value) {
        await this.writeToBackend(key, value, "local");
      }
    }
  }

  async updateSyncQuotaInfo(): Promise<SyncQuotaInfo | null> {
    const api = extensionApi();
    if (!api.storage.sync) return null;

    const syncApi = api.storage.sync;

    const bytesUsed = await new Promise<number>((resolve) => {
      syncApi.getBytesInUse(null, resolve);
    });

    const allKeys = await this.fetchAllKeysFromBackend("sync");
    const itemCount = allKeys.length;

    const quotaInfo: SyncQuotaInfo = {
      bytesUsed,
      totalQuota: syncApi.QUOTA_BYTES,
      percentUsed: (bytesUsed / syncApi.QUOTA_BYTES) * 100,
      itemCount,
      maxItems: syncApi.MAX_ITEMS,
      isNearQuota: bytesUsed >= syncApi.QUOTA_BYTES * 0.8,
      isNearItemLimit: itemCount >= syncApi.MAX_ITEMS * 0.9,
    };

    this._syncQuotaInfo = quotaInfo;
    this.notify();
    return quotaInfo;
  }

  private async fetchAllKeysFromBackend(backend: StorageBackend): Promise<string[]> {
    const storageApi = this.getStorageApi(backend);
    return new Promise((resolve) => {
      storageApi.get(null, (result) => {
        resolve(Object.keys(result));
      });
    });
  }

  private async readFromBackend(key: string, backend: StorageBackend): Promise<StoragePayload<unknown> | null> {
    const storageApi = this.getStorageApi(backend);
    return new Promise((resolve) => {
      storageApi.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  private async writeToBackend(key: string, value: StoragePayload<unknown>, backend: StorageBackend): Promise<void> {
    const storageApi = this.getStorageApi(backend);
    return new Promise((resolve, reject) => {
      storageApi.set({ [key]: value }, () => {
        const lastError = extensionApi().runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  private formatKey(key: string): string {
    return `${this.prefix}${key.toLowerCase()}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }

  getFormattedQuotaUsage(): string {
    if (!this._syncQuotaInfo) return "";
    const { bytesUsed, totalQuota, percentUsed } = this._syncQuotaInfo;
    return `${this.formatBytes(bytesUsed)} / ${this.formatBytes(totalQuota)} (${percentUsed.toFixed(1)}%)`;
  }
}

export const storageService = new StorageService();
