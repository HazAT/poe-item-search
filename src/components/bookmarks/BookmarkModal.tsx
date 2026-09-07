import { useState, useEffect, useMemo } from "react";
import { useBookmarksStore } from "@/stores/bookmarksStore";
import type { CurrentSearch } from "@/services/currentSearch";
import { Button, Input, Select, Modal, PlusIcon } from "@/components/ui";
import type { BookmarksTradeStruct } from "@/types/bookmarks";

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSearch: CurrentSearch;
  editMode?: {
    folderId: string;
    trade: BookmarksTradeStruct;
  };
}

export function BookmarkModal({ isOpen, onClose, editMode, currentSearch }: BookmarkModalProps) {
  const { folders, fetchFolders, createFolder, createTrade, updateTrade } = useBookmarksStore();
  const { location: currentLocation, historyEntry: currentHistoryEntry } = currentSearch;

  const [title, setTitle] = useState<string | null>(null);
  const titleValue = title ?? editMode?.trade.title ?? currentHistoryEntry?.title ?? "Custom Search";
  const editFolderId = editMode?.folderId;
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [error, setError] = useState("");

  // Reset user edits on open; defaults follow the current search as it loads.
  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      setTitle(null);
      if (editFolderId) setSelectedFolderId(editFolderId);
    }
  }, [isOpen, editFolderId, fetchFolders]);

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
    if (!titleValue.trim()) {
      setError("Please enter a title");
      return;
    }
    if (!editMode && !selectedFolderId) {
      setError("Please select a folder");
      return;
    }
    if (!currentLocation?.slug || !currentLocation?.league) {
      setError(editMode ? "Cannot update: no search active" : "Cannot bookmark: no search active");
      return;
    }
    if (!currentHistoryEntry?.queryPayload) {
      setError(editMode ? "Cannot update: search data not found in history" : "Cannot bookmark: search data not found in history");
      return;
    }

    if (editMode) {
      // Update existing bookmark
      await updateTrade(editMode.folderId, editMode.trade.id!, {
        title: titleValue.trim(),
        location: {
          version: currentLocation.version,
          type: currentLocation.type || "search",
          league: currentLocation.league,
          slug: currentLocation.slug,
        },
        queryPayload: currentHistoryEntry.queryPayload,
        resultCount: currentHistoryEntry.resultCount,
        previewImageUrl: currentHistoryEntry.previewImageUrl,
        // Note: createdAt is preserved from original bookmark
      });
    } else {
      // Create new bookmark
      await createTrade(selectedFolderId, {
        title: titleValue.trim(),
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
    }

    // Reset and close
    setTitle(null);
    setError("");
    onClose();
  };

  const handleClose = () => {
    setTitle(null);
    setError("");
    setIsCreatingFolder(false);
    setNewFolderTitle("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editMode ? "Update Bookmark" : "Bookmark Search"}
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
            {editMode ? "Update Bookmark" : "Save Bookmark"}
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
          value={titleValue}
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

        {!editMode && (
          isCreatingFolder ? (
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
          )
        )}

        {error && (
          <p className="text-sm text-poe-red">{error}</p>
        )}
      </div>
    </Modal>
  );
}
