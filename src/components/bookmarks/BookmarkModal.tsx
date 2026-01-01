import { useState, useEffect, useMemo } from "react";
import { useBookmarksStore } from "@/stores/bookmarksStore";
import { useHistoryStore } from "@/stores/historyStore";
import { getCurrentTradeLocation } from "@/services/tradeLocation";
import { Button, Input, Select, Modal, PlusIcon } from "@/components/ui";
import type { TradeLocationStruct, TradeLocationHistoryStruct } from "@/types/tradeLocation";

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarkModal({ isOpen, onClose }: BookmarkModalProps) {
  const { folders, fetchFolders, createFolder, createTrade } = useBookmarksStore();

  const [title, setTitle] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [currentLocation, setCurrentLocation] = useState<TradeLocationStruct | null>(null);
  const [currentHistoryEntry, setCurrentHistoryEntry] = useState<TradeLocationHistoryStruct | null>(null);
  const [error, setError] = useState("");

  // Fetch folders and lookup history entry when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      const location = getCurrentTradeLocation();
      setCurrentLocation(location);

      // Look up the history entry for this search to get title and query payload
      const { entries } = useHistoryStore.getState();
      const historyEntry = entries.find((e) => e.slug === location.slug) ?? null;
      setCurrentHistoryEntry(historyEntry);

      // Use history entry title if available, otherwise fallback
      if (historyEntry?.title) {
        setTitle(historyEntry.title);
      } else {
        setTitle("Custom Search");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-select first folder if available
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      const activeFolders = folders.filter(f => !f.archivedAt);
      if (activeFolders.length > 0) {
        setSelectedFolderId(activeFolders[0].id!);
      }
    }
  }, [folders, selectedFolderId]);

  const folderOptions = useMemo(() => {
    return folders
      .filter(f => !f.archivedAt)
      .map(f => ({ value: f.id!, label: f.title }));
  }, [folders]);

  const canBookmark = currentLocation?.slug && currentLocation?.league && currentHistoryEntry?.queryPayload;

  const handleCreateFolder = async () => {
    if (!newFolderTitle.trim()) return;

    await createFolder({
      title: newFolderTitle,
      version: currentLocation?.version ?? "2",
      icon: null,
      archivedAt: null,
    });

    setNewFolderTitle("");
    setIsCreatingFolder(false);

    // Select the newly created folder
    const newFolders = await new Promise<typeof folders>(resolve => {
      // Small delay to ensure store is updated
      setTimeout(() => resolve(useBookmarksStore.getState().folders), 50);
    });
    const newFolder = newFolders.find(f => f.title === newFolderTitle.trim());
    if (newFolder) {
      setSelectedFolderId(newFolder.id!);
    }
  };

  const handleBookmark = async () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (!selectedFolderId) {
      setError("Please select a folder");
      return;
    }
    if (!currentLocation?.slug || !currentLocation?.league) {
      setError("Cannot bookmark: no search active");
      return;
    }
    if (!currentHistoryEntry?.queryPayload) {
      setError("Cannot bookmark: search data not found in history");
      return;
    }

    await createTrade(selectedFolderId, {
      title: title.trim(),
      location: {
        version: currentLocation.version,
        type: currentLocation.type || "search",
        league: currentLocation.league,
        slug: currentLocation.slug,
      },
      createdAt: new Date().toISOString(),
      queryPayload: currentHistoryEntry.queryPayload,
      resultCount: currentHistoryEntry.resultCount,
      previewImageUrl: currentHistoryEntry.previewImageUrl,
    });

    // Reset and close
    setTitle("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setError("");
    setIsCreatingFolder(false);
    setNewFolderTitle("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bookmark Search"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleBookmark}
            disabled={!canBookmark}
          >
            Save Bookmark
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!canBookmark && (
          <div className="p-3 bg-poe-red/20 border border-poe-red rounded text-sm text-poe-beige">
            {!currentLocation?.slug || !currentLocation?.league
              ? "No active search to bookmark. Perform a search first."
              : "Search not found in history. Try refreshing the search."}
          </div>
        )}

        <Input
          label="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          placeholder="e.g., Chaos Res Ring"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && canBookmark) handleBookmark();
          }}
        />

        {isCreatingFolder ? (
          <div className="space-y-2">
            <Input
              label="New Folder Name"
              value={newFolderTitle}
              onChange={(e) => setNewFolderTitle(e.target.value)}
              placeholder="e.g., Leveling Gear"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setIsCreatingFolder(false);
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingFolder(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateFolder}
              >
                Create Folder
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {folderOptions.length > 0 ? (
              <Select
                label="Folder"
                value={selectedFolderId}
                onChange={(e) => {
                  setSelectedFolderId(e.target.value);
                  setError("");
                }}
                options={folderOptions}
                placeholder="Select a folder..."
              />
            ) : (
              <div className="text-sm text-poe-gray-alt">
                No folders yet. Create one to save bookmarks.
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingFolder(true)}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Create New Folder
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-poe-red">{error}</p>
        )}
      </div>
    </Modal>
  );
}
