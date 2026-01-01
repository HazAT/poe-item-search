import { useEffect } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { useBookmarksStore } from "@/stores/bookmarksStore";
import { Button, TrashIcon } from "@/components/ui";
import { SearchEntry } from "@/components/shared/SearchEntry";
import type { TradeLocationHistoryStruct } from "@/types/tradeLocation";

export function HistoryTab() {
  const { entries, isLoading, isExecuting, fetchEntries, clearEntries, deleteEntry, executeSearch } =
    useHistoryStore();
  const { folders, fetchFolders, createFolder, createTrade } = useBookmarksStore();

  useEffect(() => {
    fetchEntries();
    fetchFolders();
  }, [fetchEntries, fetchFolders]);

  const handleCreateFolder = async (title: string): Promise<string> => {
    // Create a folder with the current version (default to "2" for PoE2)
    const newFolder = {
      title,
      version: "2" as const,
      icon: null,
      archivedAt: null,
    };
    await createFolder(newFolder);
    // The folder was added to the store, get the latest folders and find the new one
    const latestFolders = useBookmarksStore.getState().folders;
    const created = latestFolders.find((f) => f.title === title);
    return created?.id ?? "";
  };

  const handleBookmark = async (entry: TradeLocationHistoryStruct, folderId: string) => {
    const trade = {
      title: entry.title,
      location: {
        version: entry.version,
        type: entry.type,
        league: entry.league,
        slug: entry.slug,
      },
      createdAt: new Date().toISOString(),
      queryPayload: entry.queryPayload,
      resultCount: entry.resultCount,
      previewImageUrl: entry.previewImageUrl,
    };
    await createTrade(folderId, trade);
  };

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
      <div className="flex-1 min-h-0 overflow-y-auto">
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
              <SearchEntry
                key={entry.id}
                title={entry.title}
                version={entry.version}
                league={entry.league}
                type={entry.type}
                resultCount={entry.resultCount}
                createdAt={entry.createdAt}
                isExecuting={isExecuting === entry.id}
                queryPayload={entry.queryPayload}
                context="history"
                folders={folders}
                previewImageUrl={entry.previewImageUrl}
                onExecute={() => executeSearch(entry.id)}
                onDelete={() => deleteEntry(entry.id)}
                onBookmark={(folderId) => handleBookmark(entry, folderId)}
                onCreateFolder={handleCreateFolder}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
