import { useState, useRef, useCallback } from "react";
import { Textarea, Button, ClipboardIcon, SearchIcon } from "@/components/ui";
import { useHistoryStore } from "@/stores/historyStore";
import { parseTradeLocation } from "@/services/tradeLocation";
import { debug } from "@/utils/debug";
// Import the existing search logic
import { getSearchQuery } from "@/item.js";

interface PasteInputProps {
  onSearch?: (itemText: string) => void;
}

export function PasteInput({ onSearch }: PasteInputProps) {
  const [itemText, setItemText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addEntryWithQuery } = useHistoryStore();

  const handleSearch = useCallback(async (textOverride?: string) => {
    const searchText = textOverride ?? itemText;
    if (!searchText.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      // Get current trade info from URL
      const currentUrl = window.location.href;
      const tradeVersion = currentUrl.includes("trade2") ? "trade2" : "trade";

      // Extract path after trade/trade2, but strip any existing search ID
      // URL format: /trade2/search/poe2/{league} or /trade2/search/poe2/{league}/{searchId}
      const match = currentUrl.match(/\/(?:trade2?)(\/search\/[^/]+\/[^/]+)/);
      const tradePath = match ? match[1] : "/search/poe2/Standard";

      // Fetch stats from API
      const statsResponse = await fetch(
        `https://www.pathofexile.com/api/${tradeVersion}/data/stats`
      );
      const statsData = await statsResponse.json();

      // Build the search query
      const query = getSearchQuery(searchText, statsData);

      // Execute the search
      const searchResponse = await fetch(
        `https://www.pathofexile.com/api/${tradeVersion}${tradePath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        }
      );

      const searchResult = await searchResponse.json();

      if (searchResult.id) {
        // Extract title from item text (first line is usually the item name)
        const lines = searchText.trim().split("\n");
        const title = extractItemTitle(lines);

        // Track in history with full query payload
        const location = parseTradeLocation(
          `https://www.pathofexile.com/${tradeVersion}${tradePath}/${searchResult.id}`
        );

        debug.log("PasteInput: adding to history", {
          title,
          slug: searchResult.id,
          total: searchResult.total,
        });

        await addEntryWithQuery(
          location,
          title,
          { query }, // Store the full query payload
          searchResult.total ?? 0,
          "extension"
        );

        // Redirect to results
        window.location.href = `https://www.pathofexile.com/${tradeVersion}${tradePath}/${searchResult.id}`;
      } else {
        setError("No results found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }

    onSearch?.(searchText);
  }, [itemText, onSearch, addEntryWithQuery]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text");
      if (text) {
        setItemText(text);
        setError(null);
        // Auto-search on paste - pass text directly since state won't be updated yet
        handleSearch(text);
      }
    },
    [handleSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="p-3 border-b border-poe-gray">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardIcon className="w-4 h-4 text-poe-gold" />
        <span className="font-fontin text-sm text-poe-beige">Paste Item</span>
      </div>
      <Textarea
        ref={textareaRef}
        value={itemText}
        onChange={(e) => {
          setItemText(e.target.value);
          setError(null);
        }}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder="Paste item text from game (Ctrl+C on item)..."
        rows={4}
        className="text-xs"
        error={error ?? undefined}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-poe-gray-alt">
          {itemText ? "Ctrl+Enter to search" : "Paste to auto-search"}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSearch}
          disabled={!itemText.trim() || isSearching}
        >
          <SearchIcon className="w-4 h-4 mr-1" />
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>
    </div>
  );
}

function extractItemTitle(lines: string[]): string {
  // Try to find the item name by looking at the first few lines
  // Format is usually:
  // Item Class: X
  // Rarity: Y
  // Name (for unique items)
  // Base Type

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i].trim();
    // Skip metadata lines
    if (
      line.startsWith("Item Class:") ||
      line.startsWith("Rarity:") ||
      line === "--------" ||
      !line
    ) {
      continue;
    }
    return line;
  }

  return "Unknown Item";
}
