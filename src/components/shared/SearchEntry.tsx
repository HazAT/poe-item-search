import { useState, useRef } from "react";
import { Button, TrashIcon, RefreshIcon, BookmarkIcon } from "@/components/ui";
import type { TradeSiteVersion, TradeSearchQuery } from "@/types/tradeLocation";
import type { BookmarksFolderStruct } from "@/types/bookmarks";
import { getSortLabel, formatSortBadge } from "@/utils/sortLabel";
import { getPriceLabel, formatPriceBadge } from "@/utils/priceLabel";
import { FolderPickerDropdown } from "./FolderPickerDropdown";

/**
 * Clean up league string for display:
 * - URL decode (e.g., "Fate%20of%20the%20Vaal" -> "Fate of the Vaal")
 * - Remove "poe2/" or "poe1/" prefix if present
 */
function formatLeague(league: string): string {
  let cleaned = league;
  // Remove poe1/ or poe2/ prefix
  cleaned = cleaned.replace(/^poe[12]\//, "");
  // URL decode
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {
    // If decode fails, use as-is
  }
  return cleaned;
}

export interface SearchEntryProps {
  title: string;
  version: TradeSiteVersion;
  league: string;
  type: string;
  resultCount?: number;
  createdAt?: string;
  isExecuting?: boolean;
  queryPayload?: TradeSearchQuery;
  context?: "history" | "bookmark";
  folders?: BookmarksFolderStruct[];
  previewImageUrl?: string;
  onExecute: () => void;
  onDelete: () => void;
  onBookmark?: (folderId: string) => void;
  onCreateFolder?: (title: string) => Promise<string>;
}

export function SearchEntry({
  title,
  version,
  league,
  type,
  resultCount,
  createdAt,
  isExecuting = false,
  queryPayload,
  context = "history",
  folders = [],
  previewImageUrl,
  onExecute,
  onDelete,
  onBookmark,
  onCreateFolder,
}: SearchEntryProps) {
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);
  const timeAgo = createdAt ? getRelativeTime(createdAt) : null;
  const sortInfo = getSortLabel(queryPayload?.sort);
  const priceInfo = getPriceLabel(queryPayload);

  const canBookmark = context === "history" && onBookmark && onCreateFolder;

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
        {previewImageUrl && (
          <div className="shrink-0 w-8 h-8 rounded overflow-hidden bg-poe-dark">
            <img
              src={previewImageUrl}
              alt=""
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-fontin text-sm text-poe-beige truncate">
              {title || "Untitled Search"}
            </span>
            <span className="text-xs text-poe-gray-alt shrink-0">
              {version === "2" ? "PoE2" : "PoE1"}
            </span>
            {sortInfo && (
              <span className="text-xs text-poe-accent shrink-0">
                {formatSortBadge(sortInfo)}
              </span>
            )}
            {priceInfo && (
              <span className="text-xs text-poe-accent shrink-0">
                {formatPriceBadge(priceInfo)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-poe-gray-alt truncate">
              {formatLeague(league)}
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
        <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isExecuting ? (
            <RefreshIcon className="w-4 h-4 text-poe-gold animate-spin" />
          ) : (
            <>
              {canBookmark && (
                <Button
                  ref={bookmarkButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowFolderPicker(!showFolderPicker);
                  }}
                  title="Add to bookmarks"
                >
                  <BookmarkIcon className="w-4 h-4" />
                </Button>
              )}
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
            </>
          )}
          {showFolderPicker && canBookmark && (
            <FolderPickerDropdown
              folders={folders}
              anchorRef={bookmarkButtonRef}
              onSelect={onBookmark}
              onCreateFolder={onCreateFolder}
              onClose={() => setShowFolderPicker(false)}
            />
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
