import { useEffect } from "react";
import { useHistoryStore } from "@/stores/historyStore";
import { Button, TrashIcon } from "@/components/ui";
import { SearchEntry } from "@/components/shared/SearchEntry";

export function HistoryTab() {
  const { entries, isLoading, isExecuting, fetchEntries, clearEntries, deleteEntry, executeSearch } =
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
              <SearchEntry
                key={entry.id}
                title={entry.title}
                version={entry.version}
                league={entry.league}
                type={entry.type}
                resultCount={entry.resultCount}
                createdAt={entry.createdAt}
                isExecuting={isExecuting === entry.id}
                onExecute={() => executeSearch(entry.id)}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
