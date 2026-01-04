import { useState, useEffect, useCallback } from "react";
import { syncService, type SyncQuotaInfo } from "@/services/syncService";
import { useSyncStore } from "@/stores/syncStore";
import type { SyncState } from "@/types/bookmarks";

interface CloudDataState {
  state: SyncState | null;
  compressed: string | null;
  error: boolean;
  loading: boolean;
}

interface SyncStatus {
  quotaInfo: SyncQuotaInfo | null;
  lastError: string | null;
  isSyncing: boolean;
}

function formatTime(timestamp: number | null): string {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function countBookmarks(state: SyncState | null): number {
  if (!state) return 0;
  return Object.values(state.trades).flat().length;
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

export function SyncStatusSection() {
  const { lastSyncAt, isSyncing } = useSyncStore();
  const [localState, setLocalState] = useState<SyncState | null>(null);
  const [cloudData, setCloudData] = useState<CloudDataState>({
    state: null,
    compressed: null,
    error: false,
    loading: true,
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    quotaInfo: null,
    lastError: null,
    isSyncing: false,
  });
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    // Get cloud state (async)
    setCloudData((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const [local, state, compressed, quotaInfo] = await Promise.all([
        syncService.getLocalState(),
        syncService.getCloudState(),
        syncService.getCompressedCloudData(),
        syncService.getQuotaInfo(),
      ]);
      setLocalState(local);
      setCloudData({ state, compressed, error: false, loading: false });
      setSyncStatus((prev) => ({ ...prev, quotaInfo }));
    } catch {
      setCloudData({ state: null, compressed: null, error: true, loading: false });
    }
  }, []);

  const handleForceSync = useCallback(async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, lastError: null }));
    const result = await syncService.forceSync();
    setSyncStatus({
      quotaInfo: result.quotaInfo ?? null,
      lastError: result.success ? null : (result.error ?? "Unknown error"),
      isSyncing: false,
    });
    if (result.success) {
      // Reload data to show updated cloud state
      loadData();
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback copy
    }
  };

  const localFolderCount = localState?.folders.length ?? 0;
  const localBookmarkCount = countBookmarks(localState);

  const cloudFolderCount = cloudData.state?.folders.length ?? 0;
  const cloudBookmarkCount = countBookmarks(cloudData.state);

  const localJson = localState ? JSON.stringify(localState, null, 2) : "";
  const cloudJson = cloudData.state ? JSON.stringify(cloudData.state, null, 2) : "";

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const quotaPercentage = syncStatus.quotaInfo?.percentUsed ?? 0;
  const isNearQuota = quotaPercentage >= 80;
  const isOverQuota = quotaPercentage >= 100;
  const actualSyncing = isSyncing || syncStatus.isSyncing;

  return (
    <div className="space-y-3">
      <div className="text-sm text-poe-beige font-fontin">Cloud Sync</div>

      {/* Quota Indicator */}
      {syncStatus.quotaInfo && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-poe-gray-alt">Storage used</span>
            <span className={isOverQuota ? "text-poe-red" : isNearQuota ? "text-yellow-500" : "text-poe-beige"}>
              {formatBytes(syncStatus.quotaInfo.usedBytes)} / {formatBytes(syncStatus.quotaInfo.totalBytes)}
            </span>
          </div>
          <div className="h-1.5 bg-poe-gray rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isOverQuota ? "bg-poe-red" : isNearQuota ? "bg-yellow-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Comparison View */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-poe-gray-alt text-xs mb-1">Local</div>
          <div className="text-poe-beige">{localFolderCount} folders</div>
          <div className="text-poe-beige">{localBookmarkCount} bookmarks</div>
        </div>
        <div>
          <div className="text-poe-gray-alt text-xs mb-1">Cloud</div>
          {cloudData.loading ? (
            <div className="text-poe-gray-alt">Loading...</div>
          ) : cloudData.error ? (
            <div className="text-poe-red">Unable to fetch</div>
          ) : cloudData.state === null ? (
            <div className="text-poe-gray-alt">Not synced yet</div>
          ) : (
            <>
              <div className="text-poe-beige">{cloudFolderCount} folders</div>
              <div className="text-poe-beige">{cloudBookmarkCount} bookmarks</div>
            </>
          )}
        </div>
      </div>

      {/* Last Sync Time + Force Sync Button */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-poe-gray-alt">
          Last synced: {formatTime(lastSyncAt)}
        </div>
        <button
          onClick={handleForceSync}
          disabled={actualSyncing}
          className="px-2 py-1 text-xs bg-poe-gray hover:bg-poe-gray-alt text-poe-beige rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actualSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {/* Error Message */}
      {syncStatus.lastError && (
        <div className="text-xs text-poe-red bg-poe-red/10 rounded p-2">
          {syncStatus.lastError}
        </div>
      )}

      {/* Debug Info Toggle */}
      <button
        onClick={() => setDebugExpanded(!debugExpanded)}
        className="flex items-center gap-1 text-xs text-poe-gray-alt hover:text-poe-beige transition-colors"
      >
        <span>{debugExpanded ? "▼" : "▶"}</span>
        <span>Debug info</span>
      </button>

      {/* Debug Info Content */}
      {debugExpanded && (
        <div className="bg-poe-black rounded p-3 space-y-3 text-xs border border-poe-gray">
          {/* Compressed (for transfer) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-poe-gray-alt">Compressed (for transfer):</span>
              <button
                onClick={() => handleCopy(cloudData.compressed ?? "", "compressed")}
                disabled={!cloudData.compressed}
                className="text-poe-beige hover:text-poe-white disabled:text-poe-gray-alt disabled:cursor-not-allowed transition-colors"
              >
                {copiedField === "compressed" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="font-mono text-poe-beige bg-poe-gray rounded p-2 break-all max-h-20 overflow-y-auto">
              {cloudData.loading
                ? "Loading..."
                : cloudData.compressed
                  ? truncateString(cloudData.compressed, 500)
                  : "No data"}
            </div>
          </div>

          {/* Local JSON */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-poe-gray-alt">Local JSON:</span>
              <button
                onClick={() => handleCopy(localJson, "local")}
                disabled={!localJson}
                className="text-poe-beige hover:text-poe-white disabled:text-poe-gray-alt disabled:cursor-not-allowed transition-colors"
              >
                {copiedField === "local" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="font-mono text-poe-beige bg-poe-gray rounded p-2 break-all max-h-20 overflow-y-auto">
              {localJson ? truncateString(localJson, 500) : "No data"}
            </div>
          </div>

          {/* Cloud JSON */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-poe-gray-alt">Cloud JSON:</span>
              <button
                onClick={() => handleCopy(cloudJson, "cloud")}
                disabled={!cloudJson}
                className="text-poe-beige hover:text-poe-white disabled:text-poe-gray-alt disabled:cursor-not-allowed transition-colors"
              >
                {copiedField === "cloud" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="font-mono text-poe-beige bg-poe-gray rounded p-2 break-all max-h-20 overflow-y-auto">
              {cloudData.loading
                ? "Loading..."
                : cloudJson
                  ? truncateString(cloudJson, 500)
                  : "No data"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
