import { useEffect, useState } from "react";
import { useBookmarksStore } from "@/stores/bookmarksStore";
import {
  Button,
  PlusIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  ArchiveIcon,
  ExternalLinkIcon,
  CheckIcon,
} from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { buildTradeUrl } from "@/services/tradeLocation";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "@/types/bookmarks";

export function BookmarksTab() {
  const {
    folders,
    isLoading,
    showArchived,
    fetchFolders,
    toggleShowArchived,
    createFolder,
  } = useBookmarksStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

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

      {/* Folders list */}
      <div className="flex-1 overflow-y-auto">
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
              <BookmarkFolder key={folder.id} folder={folder} />
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
    </div>
  );
}

interface BookmarkFolderProps {
  folder: BookmarksFolderStruct;
}

function BookmarkFolder({ folder }: BookmarkFolderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { trades, fetchTradesForFolder, deleteFolder, archiveFolder, unarchiveFolder } =
    useBookmarksStore();

  const folderTrades = trades[folder.id!] ?? [];

  useEffect(() => {
    if (isExpanded && !trades[folder.id!]) {
      fetchTradesForFolder(folder.id!);
    }
  }, [isExpanded, folder.id, trades, fetchTradesForFolder]);

  const isArchived = !!folder.archivedAt;

  return (
    <li className={isArchived ? "opacity-60" : ""}>
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-poe-gray transition-colors group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
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
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              isArchived ? unarchiveFolder(folder.id!) : archiveFolder(folder.id!)
            }
            title={isArchived ? "Unarchive" : "Archive"}
          >
            <ArchiveIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteFolder(folder.id!)}
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {isExpanded && (
        <ul className="bg-poe-black/50 border-t border-poe-gray">
          {folderTrades.length === 0 ? (
            <li className="px-6 py-3 text-sm text-poe-gray-alt text-center">
              No bookmarks in this folder
            </li>
          ) : (
            folderTrades.map((trade) => (
              <BookmarkTrade key={trade.id} folderId={folder.id!} trade={trade} />
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
}

function BookmarkTrade({ folderId, trade }: BookmarkTradeProps) {
  const { deleteTrade, toggleTradeCompleted } = useBookmarksStore();
  const tradeUrl = buildTradeUrl({
    version: trade.location.version,
    type: trade.location.type,
    league: trade.location.league,
    slug: trade.location.slug,
  });
  const isCompleted = !!trade.completedAt;

  return (
    <li className="group">
      <a
        href={tradeUrl}
        className={`
          flex items-center gap-2 px-6 py-2 hover:bg-poe-gray transition-colors
          ${isCompleted ? "opacity-60" : ""}
        `}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTradeCompleted(folderId, trade.id!);
          }}
          className={`
            w-4 h-4 rounded border shrink-0
            ${isCompleted ? "bg-poe-green border-poe-green" : "border-poe-gray-alt"}
          `}
          title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
        </button>
        <span
          className={`
            text-sm text-poe-beige truncate flex-1
            ${isCompleted ? "line-through" : ""}
          `}
        >
          {trade.title}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteTrade(folderId, trade.id!);
            }}
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
          <ExternalLinkIcon className="w-4 h-4 text-poe-gray-alt" />
        </div>
      </a>
    </li>
  );
}
