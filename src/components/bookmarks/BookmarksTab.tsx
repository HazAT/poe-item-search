import { useEffect, useState } from "react";
import { useBookmarksStore } from "@/stores/bookmarksStore";
import { useHistoryStore } from "@/stores/historyStore";
import {
  Button,
  PlusIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  ArchiveIcon,
  BookmarkIcon,
  EditIcon,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { getCurrentTradeLocation } from "@/services/tradeLocation";
import { BookmarkModal } from "./BookmarkModal";
import { SearchEntry } from "@/components/shared/SearchEntry";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "@/types/bookmarks";

export function BookmarksTab() {
  const {
    folders,
    isLoading,
    showArchived,
    fetchFolders,
    fetchTradesForFolder,
    toggleShowArchived,
    createFolder,
    updateFolder,
  } = useBookmarksStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [canBookmark, setCanBookmark] = useState(false);
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<BookmarksFolderStruct | null>(null);
  const [renameFolderTitle, setRenameFolderTitle] = useState("");

  useEffect(() => {
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch trades for all folders to show counts
  useEffect(() => {
    folders.forEach((folder) => {
      if (folder.id) {
        fetchTradesForFolder(folder.id);
      }
    });
  }, [folders, fetchTradesForFolder]);

  // Check if there's an active search to bookmark (update on mount and URL changes)
  useEffect(() => {
    const checkLocation = () => {
      const location = getCurrentTradeLocation();
      setCanBookmark(!!(location?.slug && location?.league));
    };

    checkLocation();

    // Listen for URL changes (popstate for back/forward, custom event for SPA navigation)
    window.addEventListener("popstate", checkLocation);

    // Also check periodically in case URL changes via history.pushState
    const interval = setInterval(checkLocation, 1000);

    return () => {
      window.removeEventListener("popstate", checkLocation);
      clearInterval(interval);
    };
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderTitle.trim()) return;
    await createFolder({
      title: newFolderTitle,
      version: "2",
      icon: null,
      archivedAt: null,
    });
    setNewFolderTitle("");
    setIsCreateModalOpen(false);
  };

  const handleRenameFolder = async () => {
    if (renamingFolder?.id && renameFolderTitle.trim()) {
      await updateFolder(renamingFolder.id, { title: renameFolderTitle.trim() });
      setIsRenameFolderOpen(false);
      setRenamingFolder(null);
    }
  };

  const openRenameModal = (folder: BookmarksFolderStruct) => {
    setRenamingFolder(folder);
    setRenameFolderTitle(folder.title);
    setIsRenameFolderOpen(true);
  };

  const visibleFolders = folders.filter((folder) =>
    showArchived ? true : !folder.archivedAt
  );

  const archivedCount = folders.filter((f) => f.archivedAt).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-poe-gray-alt">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-poe-gray">
        <span className="text-sm text-poe-gray-alt">
          {folders.length} {folders.length === 1 ? "folder" : "folders"}
        </span>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={toggleShowArchived}>
              <ArchiveIcon className="w-4 h-4 mr-1" />
              {showArchived ? "Hide" : "Show"} archived ({archivedCount})
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Bookmark current search button */}
      <div className="px-3 py-2 border-b border-poe-gray">
        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={() => setIsBookmarkModalOpen(true)}
          disabled={!canBookmark}
        >
          <BookmarkIcon className="w-4 h-4 mr-2" />
          {canBookmark ? "Bookmark Current Search" : "No active search"}
        </Button>
      </div>

      {/* Folders list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {visibleFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <FolderIcon className="w-8 h-8 text-poe-gray-alt mb-2" />
            <span className="text-poe-gray-alt mb-2">No bookmarks yet</span>
            <span className="text-xs text-poe-gray-alt">
              Create a folder to organize your searches
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-poe-gray">
            {visibleFolders.map((folder) => (
              <BookmarkFolder key={folder.id} folder={folder} onRename={() => openRenameModal(folder)} />
            ))}
          </ul>
        )}
      </div>

      {/* Create Folder Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateFolder}>
              Create
            </Button>
          </>
        }
      >
        <Input
          label="Folder Name"
          value={newFolderTitle}
          onChange={(e) => setNewFolderTitle(e.target.value)}
          placeholder="e.g., Leveling Gear"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreateFolder();
          }}
        />
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        isOpen={isRenameFolderOpen}
        onClose={() => {
          setIsRenameFolderOpen(false);
          setRenamingFolder(null);
        }}
        title="Rename Folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsRenameFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRenameFolder}
              disabled={!renameFolderTitle.trim()}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Folder Name"
          value={renameFolderTitle}
          onChange={(e) => setRenameFolderTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && renameFolderTitle.trim()) {
              handleRenameFolder();
            }
          }}
        />
      </Modal>

      {/* Bookmark Modal */}
      <BookmarkModal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
      />
    </div>
  );
}

interface BookmarkFolderProps {
  folder: BookmarksFolderStruct;
  onRename: () => void;
}

function BookmarkFolder({ folder, onRename }: BookmarkFolderProps) {
  const { trades, isExecuting, expandedFolders, toggleFolderExpanded, fetchTradesForFolder, deleteFolder, archiveFolder, unarchiveFolder } =
    useBookmarksStore();
  const isExpanded = expandedFolders.includes(folder.id!);

  const folderTrades = trades[folder.id!] ?? [];

  useEffect(() => {
    if (isExpanded && !trades[folder.id!]) {
      fetchTradesForFolder(folder.id!);
    }
  }, [isExpanded, folder.id, trades, fetchTradesForFolder]);

  const isArchived = !!folder.archivedAt;

  return (
    <li className={isArchived ? "opacity-60" : ""}>
      <button
        onClick={() => toggleFolderExpanded(folder.id!)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-poe-gray transition-colors group text-left"
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 text-poe-gray-alt shrink-0" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-poe-gray-alt shrink-0" />
        )}
        <FolderIcon className="w-4 h-4 text-poe-gold shrink-0" />
        <span className="font-fontin text-sm text-poe-beige truncate">
          {folder.title}
        </span>
        <span className="text-xs text-poe-gray-alt shrink-0">
          ({folderTrades.length})
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            title="Rename"
          >
            <EditIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              isArchived ? unarchiveFolder(folder.id!) : archiveFolder(folder.id!);
            }}
            title={isArchived ? "Unarchive" : "Archive"}
          >
            <ArchiveIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              deleteFolder(folder.id!);
            }}
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </button>
      {isExpanded && (
        <ul className="bg-poe-black/50 border-t border-poe-gray">
          {folderTrades.length === 0 ? (
            <li className="px-6 py-3 text-sm text-poe-gray-alt text-center">
              No bookmarks in this folder
            </li>
          ) : (
            folderTrades.map((trade) => (
              <BookmarkTrade
                key={trade.id}
                folderId={folder.id!}
                trade={trade}
                isExecuting={isExecuting === trade.id}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}

interface BookmarkTradeProps {
  folderId: string;
  trade: BookmarksTradeStruct;
  isExecuting: boolean;
}

function BookmarkTrade({ folderId, trade, isExecuting }: BookmarkTradeProps) {
  const { deleteTrade, executeSearch } = useBookmarksStore();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [hasCurrentSearch, setHasCurrentSearch] = useState(false);

  // Check if there's a current search that can be used for update
  useEffect(() => {
    const checkCurrentSearch = () => {
      const location = getCurrentTradeLocation();
      if (!location?.slug || !location?.league) {
        setHasCurrentSearch(false);
        return;
      }
      const { entries } = useHistoryStore.getState();
      const historyEntry = entries.find((e) => e.slug === location.slug);
      setHasCurrentSearch(!!historyEntry?.queryPayload);
    };

    checkCurrentSearch();
    // Re-check periodically for URL changes
    const interval = setInterval(checkCurrentSearch, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <SearchEntry
        title={trade.title}
        version={trade.location.version}
        league={trade.location.league}
        type={trade.location.type}
        resultCount={trade.resultCount}
        createdAt={trade.createdAt}
        isExecuting={isExecuting}
        queryPayload={trade.queryPayload}
        context="bookmark"
        previewImageUrl={trade.previewImageUrl}
        onExecute={() => executeSearch(folderId, trade.id!)}
        onDelete={() => deleteTrade(folderId, trade.id!)}
        onUpdate={hasCurrentSearch ? () => setIsUpdateModalOpen(true) : undefined}
      />
      <BookmarkModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        editMode={{ folderId, trade }}
      />
    </>
  );
}
