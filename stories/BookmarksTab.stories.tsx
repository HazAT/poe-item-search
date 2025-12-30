import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
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
  BookmarkIcon,
} from "../src/components/ui";
import { Modal } from "../src/components/ui/Modal";
import { Input } from "../src/components/ui/Input";
import { Select } from "../src/components/ui/Select";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../src/types/bookmarks";

// Standalone display component for stories (doesn't use store)
interface BookmarksTabDisplayProps {
  folders: BookmarksFolderStruct[];
  trades: Record<string, BookmarksTradeStruct[]>;
  showArchived?: boolean;
  canBookmark?: boolean;
  onBookmarkClick?: () => void;
}

function BookmarksTabDisplay({
  folders,
  trades,
  showArchived = false,
  canBookmark = true,
  onBookmarkClick,
}: BookmarksTabDisplayProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const visibleFolders = folders.filter((folder) =>
    showArchived ? true : !folder.archivedAt
  );

  const archivedCount = folders.filter((f) => f.archivedAt).length;

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-poe-gray">
        <span className="text-sm text-poe-gray-alt">
          {folders.length} {folders.length === 1 ? "folder" : "folders"}
        </span>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button variant="ghost" size="sm">
              <ArchiveIcon className="w-4 h-4 mr-1" />
              {showArchived ? "Hide" : "Show"} archived ({archivedCount})
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="w-4 h-4 mr-1" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Bookmark current search button */}
      <div className="px-3 py-2 border-b border-poe-gray">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            onBookmarkClick?.();
            setIsBookmarkModalOpen(true);
          }}
          disabled={!canBookmark}
        >
          <BookmarkIcon className="w-4 h-4 mr-2" />
          {canBookmark ? "Bookmark Current Search" : "No active search"}
        </Button>
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
              <BookmarkFolderDisplay
                key={folder.id}
                folder={folder}
                trades={trades[folder.id!] ?? []}
                isExpanded={expandedFolders.has(folder.id!)}
                onToggle={() => toggleFolder(folder.id!)}
              />
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
            <Button variant="primary" onClick={() => setIsCreateModalOpen(false)}>
              Create
            </Button>
          </>
        }
      >
        <Input label="Folder Name" placeholder="e.g., Leveling Gear" autoFocus />
      </Modal>

      {/* Bookmark Modal */}
      <Modal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
        title="Bookmark Search"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsBookmarkModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setIsBookmarkModalOpen(false)}>
              Save Bookmark
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" placeholder="e.g., Chaos Res Ring" autoFocus />
          <Select
            label="Folder"
            options={folders.map((f) => ({ value: f.id!, label: f.title }))}
            placeholder="Select a folder..."
          />
          <Button variant="ghost" size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Create New Folder
          </Button>
        </div>
      </Modal>
    </div>
  );
}

interface BookmarkFolderDisplayProps {
  folder: BookmarksFolderStruct;
  trades: BookmarksTradeStruct[];
  isExpanded: boolean;
  onToggle: () => void;
}

function BookmarkFolderDisplay({
  folder,
  trades,
  isExpanded,
  onToggle,
}: BookmarkFolderDisplayProps) {
  const isArchived = !!folder.archivedAt;

  return (
    <li className={isArchived ? "opacity-60" : ""}>
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-poe-gray transition-colors group">
        <button
          onClick={onToggle}
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
          <span className="text-xs text-poe-gray-alt shrink-0">({trades.length})</span>
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" title={isArchived ? "Unarchive" : "Archive"}>
            <ArchiveIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Delete">
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {isExpanded && (
        <ul className="bg-poe-black/50 border-t border-poe-gray">
          {trades.length === 0 ? (
            <li className="px-6 py-3 text-sm text-poe-gray-alt text-center">
              No bookmarks in this folder
            </li>
          ) : (
            trades.map((trade) => (
              <BookmarkTradeDisplay key={trade.id} trade={trade} />
            ))
          )}
        </ul>
      )}
    </li>
  );
}

function BookmarkTradeDisplay({ trade }: { trade: BookmarksTradeStruct }) {
  const isCompleted = !!trade.completedAt;

  return (
    <li className="group">
      <a
        href="#"
        className={`flex items-center gap-2 px-6 py-2 hover:bg-poe-gray transition-colors ${
          isCompleted ? "opacity-60" : ""
        }`}
      >
        <button
          onClick={(e) => e.preventDefault()}
          className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
            isCompleted ? "bg-poe-green border-poe-green" : "border-poe-gray-alt"
          }`}
          title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
        </button>
        <span
          className={`text-sm text-poe-beige truncate flex-1 ${
            isCompleted ? "line-through" : ""
          }`}
        >
          {trade.title}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" title="Delete">
            <TrashIcon className="w-4 h-4" />
          </Button>
          <ExternalLinkIcon className="w-4 h-4 text-poe-gray-alt" />
        </div>
      </a>
    </li>
  );
}

const meta: Meta<typeof BookmarksTabDisplay> = {
  title: "Tabs/BookmarksTab",
  component: BookmarksTabDisplay,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-panel h-[500px] bg-poe-black border border-poe-gray overflow-hidden flex flex-col">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BookmarksTabDisplay>;

// Mock data
const mockFolders: BookmarksFolderStruct[] = [
  { id: "1", title: "Leveling Gear", version: "2", icon: null, archivedAt: null },
  { id: "2", title: "Endgame Items", version: "2", icon: null, archivedAt: null },
  { id: "3", title: "Archived Folder", version: "2", icon: null, archivedAt: "2024-01-01" },
];

const mockTrades: Record<string, BookmarksTradeStruct[]> = {
  "1": [
    {
      id: "t1",
      title: "Life + Res Ring",
      location: { version: "2", type: "search", league: "poe2/Standard", slug: "abc123" },
      completedAt: null,
    },
    {
      id: "t2",
      title: "Movement Speed Boots",
      location: { version: "2", type: "search", league: "poe2/Standard", slug: "def456" },
      completedAt: "2024-01-15",
    },
  ],
  "2": [
    {
      id: "t3",
      title: "Perfect Chaos Res Ring",
      location: { version: "2", type: "search", league: "poe2/Standard", slug: "ghi789" },
      completedAt: null,
    },
  ],
};

export const Empty: Story = {
  args: {
    folders: [],
    trades: {},
  },
};

export const WithFolders: Story = {
  args: {
    folders: mockFolders.filter((f) => !f.archivedAt),
    trades: mockTrades,
  },
};

export const WithArchivedFolders: Story = {
  args: {
    folders: mockFolders,
    trades: mockTrades,
    showArchived: true,
  },
};

export const NoActiveSearch: Story = {
  args: {
    folders: mockFolders.filter((f) => !f.archivedAt),
    trades: mockTrades,
    canBookmark: false,
  },
};

export const SingleFolder: Story = {
  args: {
    folders: [mockFolders[0]],
    trades: { "1": mockTrades["1"] },
  },
};
