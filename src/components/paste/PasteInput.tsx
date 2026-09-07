import { useState, useRef, useCallback } from "react";
import { Textarea, Button, ClipboardIcon, SearchIcon } from "@/components/ui";
import { useHistoryStore } from "@/stores/historyStore";
import { searchItem } from "@/services/itemSearch";
import { debug } from "@/utils/debug";
import { captureException } from "@/services/sentry";
import { tryDecodeBase64ItemText } from "@/utils/base64";

interface PasteInputProps {
  onSearch?: (itemText: string) => void;
}

export function PasteInput({ onSearch }: PasteInputProps) {
  const [itemText, setItemText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInProgress = useRef(false);
  const addEntry = useHistoryStore((state) => state.addEntry);

  const handleSearch = useCallback(async (textOverride?: string) => {
    const rawText = textOverride ?? itemText;
    if (!rawText.trim() || searchInProgress.current) return;

    // Try to decode base64 (for pasting from Sentry logs)
    const searchText = tryDecodeBase64ItemText(rawText);

    searchInProgress.current = true;
    setIsSearching(true);
    setError(null);

    try {
      const result = await searchItem(searchText, window.location.href);
      debug.log("PasteInput: adding to history", {
        title: result.title,
        slug: result.location.slug,
        total: result.total,
      });
      await addEntry(result.location, result.title, result.queryPayload, result.total, "extension");
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      captureException(err, { context: "paste_search", itemTextLength: searchText.length });
    } finally {
      searchInProgress.current = false;
      setIsSearching(false);
    }

    onSearch?.(searchText);
  }, [itemText, onSearch, addEntry]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text");
      if (text) {
        e.preventDefault();
        if (searchInProgress.current) return;
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
        aria-label="Item text"
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
          onClick={() => handleSearch()}
          disabled={!itemText.trim() || isSearching}
        >
          <SearchIcon className="w-4 h-4 mr-1" />
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>
    </div>
  );
}
