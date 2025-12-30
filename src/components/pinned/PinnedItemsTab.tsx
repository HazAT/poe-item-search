import { useEffect } from "react";
import { usePinnedStore } from "@/stores/pinnedStore";
import { Button, TrashIcon, PinIcon, SearchIcon } from "@/components/ui";
import type { PinnedItemStruct } from "@/types/pinned";

export function PinnedItemsTab() {
  const { items, isLoading, fetchItems, clearItems, scrollToItem, deleteItem } =
    usePinnedStore();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
          {items.length} pinned {items.length === 1 ? "item" : "items"}
        </span>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearItems}>
            <TrashIcon className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Pinned items list */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <PinIcon className="w-8 h-8 text-poe-gray-alt mb-2" />
            <span className="text-poe-gray-alt mb-2">No pinned items</span>
            <span className="text-xs text-poe-gray-alt">
              Pin items from search results to quickly reference them
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-poe-gray">
            {items.map((item) => (
              <PinnedItem
                key={item.id}
                item={item}
                onScrollTo={() => scrollToItem(item.id)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface PinnedItemProps {
  item: PinnedItemStruct;
  onScrollTo: () => void;
  onDelete: () => void;
}

function PinnedItem({ item, onScrollTo, onDelete }: PinnedItemProps) {
  const timeAgo = getRelativeTime(item.createdAt);

  return (
    <li className="group">
      <div className="flex items-start gap-3 px-3 py-2 hover:bg-poe-gray transition-colors">
        <PinIcon className="w-4 h-4 text-poe-gold shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="block text-sm text-poe-beige truncate">{item.title}</span>
          <span className="text-xs text-poe-gray-alt">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onScrollTo}
            title="Scroll to item"
          >
            <SearchIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Unpin">
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
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
