import { useEffect } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { Button, TrashIcon, ExternalLinkIcon } from "@/components/ui";
import { buildTradeUrl } from "@/services/tradeLocation";
import type { TradeLocationHistoryStruct } from "@/types/tradeLocation";

export function HistoryTab() {
  const { entries, isLoading, fetchEntries, clearEntries, deleteEntry } =
    useHistoryStore();

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-poe-gray-alt">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with clear button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-poe-gray">
        <span className="text-sm text-poe-gray-alt">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearEntries}>
            <TrashIcon className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <span className="text-poe-gray-alt mb-2">No search history yet</span>
            <span className="text-xs text-poe-gray-alt">
              Your searches will appear here
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-poe-gray">
            {entries.map((entry) => (
              <HistoryEntry
                key={entry.id}
                entry={entry}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface HistoryEntryProps {
  entry: TradeLocationHistoryStruct;
  onDelete: () => void;
}

function HistoryEntry({ entry, onDelete }: HistoryEntryProps) {
  const tradeUrl = buildTradeUrl(entry);
  const timeAgo = getRelativeTime(entry.createdAt);

  return (
    <li className="group">
      <a
        href={tradeUrl}
        className="flex items-start gap-3 px-3 py-2 hover:bg-poe-gray transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-fontin text-sm text-poe-beige truncate">
              {entry.title || "Untitled Search"}
            </span>
            <span className="text-xs text-poe-gray-alt shrink-0">
              {entry.version === "2" ? "PoE2" : "PoE1"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-poe-gray-alt truncate">
              {entry.league} • {entry.type}
            </span>
            <span className="text-xs text-poe-gray-alt shrink-0">{timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
          <ExternalLinkIcon className="w-4 h-4 text-poe-gray-alt" />
        </div>
      </a>
    </li>
  );
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
