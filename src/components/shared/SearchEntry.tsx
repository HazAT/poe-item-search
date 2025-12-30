import { Button, TrashIcon, RefreshIcon } from "@/components/ui";
import type { TradeSiteVersion } from "@/types/tradeLocation";

export interface SearchEntryProps {
  title: string;
  version: TradeSiteVersion;
  league: string;
  type: string;
  resultCount?: number;
  createdAt?: string;
  isExecuting?: boolean;
  onExecute: () => void;
  onDelete: () => void;
}

export function SearchEntry({
  title,
  version,
  league,
  type,
  resultCount,
  createdAt,
  isExecuting = false,
  onExecute,
  onDelete,
}: SearchEntryProps) {
  const timeAgo = createdAt ? getRelativeTime(createdAt) : null;

  const handleClick = () => {
    if (!isExecuting) {
      onExecute();
    }
  };

  return (
    <li className="group">
      <button
        onClick={handleClick}
        disabled={isExecuting}
        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-poe-gray transition-colors text-left disabled:opacity-50 disabled:cursor-wait"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-fontin text-sm text-poe-beige truncate">
              {title || "Untitled Search"}
            </span>
            <span className="text-xs text-poe-gray-alt shrink-0">
              {version === "2" ? "PoE2" : "PoE1"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-poe-gray-alt truncate">
              {league} • {type}
            </span>
            {resultCount !== undefined && (
              <span className="text-xs text-poe-gold shrink-0">
                {resultCount.toLocaleString()} results
              </span>
            )}
            {timeAgo && (
              <span className="text-xs text-poe-gray-alt shrink-0">{timeAgo}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isExecuting ? (
            <RefreshIcon className="w-4 h-4 text-poe-gold animate-spin" />
          ) : (
            <>
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
              <RefreshIcon className="w-4 h-4 text-poe-gold" title="Re-execute search" />
            </>
          )}
        </div>
      </button>
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
