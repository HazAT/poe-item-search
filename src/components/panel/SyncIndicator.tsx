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
