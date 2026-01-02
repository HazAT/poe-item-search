import { useState, useEffect, useCallback } from "react";
import { syncService } from "@/services/syncService";
import { useSyncStore } from "@/stores/syncStore";
import type { SyncState } from "@/types/bookmarks";

interface CloudDataState {
  state: SyncState | null;
  compressed: string | null;
  error: boolean;
  loading: boolean;
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
  const { lastSyncAt } = useSyncStore();
  const [localState, setLocalState] = useState<SyncState | null>(null);
  const [cloudData, setCloudData] = useState<CloudDataState>({
    state: null,
    compressed: null,
    error: false,
    loading: true,
  });
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    // Get local state (synchronous)
    const local = syncService.getLocalState();
    setLocalState(local);

    // Get cloud state (async)
    setCloudData((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const [state, compressed] = await Promise.all([
        syncService.getCloudState(),
        syncService.getCompressedCloudData(),
      ]);
      setCloudData({ state, compressed, error: false, loading: false });
    } catch {
      setCloudData({ state: null, compressed: null, error: true, loading: false });
    }
  }, []);

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

  return (
    <div className="space-y-3">
      <div className="text-sm text-poe-beige font-fontin">Cloud Sync</div>

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

      {/* Last Sync Time */}
      <div className="text-xs text-poe-gray-alt">
        Last synced: {formatTime(lastSyncAt)}
      </div>

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
