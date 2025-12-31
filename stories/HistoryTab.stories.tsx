import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button, TrashIcon, RefreshIcon, BookmarkIcon, FolderIcon, PlusIcon, CheckIcon } from "../src/components/ui";
import type { TradeLocationHistoryStruct } from "../src/types/tradeLocation";
import type { BookmarksFolderStruct } from "../src/types/bookmarks";
import { getSortLabel, formatSortBadge } from "../src/utils/sortLabel";

// Format league for display (matches SearchEntry component)
function formatLeague(league: string): string {
  let cleaned = league;
  cleaned = cleaned.replace(/^poe[12]\//, "");
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {
    // If decode fails, use as-is
  }
  return cleaned;
}

// Mock folders for storybook
const mockFolders: BookmarksFolderStruct[] = [
  { id: "f1", title: "Leveling Gear", version: "2", icon: null, archivedAt: null },
  { id: "f2", title: "Endgame Builds", version: "2", icon: null, archivedAt: null },
  { id: "f3", title: "Trade Flips", version: "2", icon: null, archivedAt: null },
];

// Standalone display component for stories (doesn't use store)
function HistoryTabDisplay({
  entries,
  executingId,
  folders = mockFolders,
}: {
  entries: TradeLocationHistoryStruct[];
  executingId?: string | null;
  folders?: BookmarksFolderStruct[];
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-poe-gray">
        <span className="text-sm text-poe-gray-alt">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm">
            <TrashIcon className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <span className="text-poe-gray-alt mb-2">No search history yet</span>
            <span className="text-xs text-poe-gray-alt">Your searches will appear here</span>
          </div>
        ) : (
          <ul className="divide-y divide-poe-gray">
            {entries.map((entry) => (
              <HistoryEntryDisplay
                key={entry.id}
                entry={entry}
                isExecuting={executingId === entry.id}
                folders={folders}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HistoryEntryDisplay({
  entry,
  isExecuting,
  folders,
}: {
  entry: TradeLocationHistoryStruct;
  isExecuting: boolean;
  folders: BookmarksFolderStruct[];
}) {
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const timeAgo = getRelativeTime(entry.createdAt);
  const sortInfo = getSortLabel(entry.queryPayload?.sort);

  return (
    <li className="group">
      <button
        disabled={isExecuting}
        className="w-full flex items-start gap-3 px-3 py-2 hover:bg-poe-gray transition-colors text-left disabled:opacity-50 disabled:cursor-wait"
      >
        {entry.previewImageUrl && (
          <div className="shrink-0 w-8 h-8 rounded overflow-hidden bg-poe-dark">
            <img
              src={entry.previewImageUrl}
              alt=""
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-fontin text-sm text-poe-beige truncate">{entry.title}</span>
            <span className="text-xs text-poe-gray-alt shrink-0">
              {entry.version === "2" ? "PoE2" : "PoE1"}
            </span>
            {sortInfo && (
              <span className="text-xs text-poe-accent shrink-0">
                {formatSortBadge(sortInfo)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-poe-gray-alt truncate">
              {formatLeague(entry.league)}
            </span>
            <span className="text-xs text-poe-gold shrink-0">
              {entry.resultCount.toLocaleString()} results
            </span>
            <span className="text-xs text-poe-gray-alt shrink-0">{timeAgo}</span>
          </div>
        </div>
        <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isExecuting ? (
            <RefreshIcon className="w-4 h-4 text-poe-gold animate-spin" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                title="Add to bookmarks"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowFolderPicker(!showFolderPicker);
                }}
              >
                <BookmarkIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Delete">
                <TrashIcon className="w-4 h-4" />
              </Button>
            </>
          )}
          {showFolderPicker && (
            <FolderPickerDisplay
              folders={folders}
              onSelect={() => setShowFolderPicker(false)}
            />
          )}
        </div>
      </button>
    </li>
  );
}

// Simple folder picker display for storybook (simplified version without fixed positioning)
function FolderPickerDisplay({
  folders,
  onSelect,
}: {
  folders: BookmarksFolderStruct[];
  onSelect: (folderId: string) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  return (
    <div
      className="absolute right-0 top-full mt-1 w-48 bg-poe-dark border border-poe-border rounded shadow-lg"
      style={{ zIndex: 9999 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1 max-h-48 overflow-y-auto">
        {folders.filter((f) => !f.archivedAt).map((folder) => (
          <button
            key={folder.id}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-poe-beige hover:bg-poe-gray transition-colors"
            onClick={() => {
              console.log("Bookmarked to folder:", folder.title);
              onSelect(folder.id!);
            }}
          >
            <FolderIcon className="w-4 h-4 text-poe-gold shrink-0" />
            <span className="truncate">{folder.title}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-poe-border">
        {isCreating ? (
          <div className="flex items-center gap-1 p-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="flex-1 bg-poe-gray text-poe-beige text-sm px-2 py-1 rounded border border-poe-border focus:border-poe-gold focus:outline-none"
            />
            <button
              onClick={() => {
                console.log("Creating folder:", newFolderName);
                setIsCreating(false);
                setNewFolderName("");
              }}
              className="p-1 text-poe-gold hover:text-poe-accent"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-poe-gray-alt hover:bg-poe-gray hover:text-poe-beige transition-colors"
            onClick={() => setIsCreating(true)}
          >
            <PlusIcon className="w-4 h-4 shrink-0" />
            <span>New Folder</span>
          </button>
        )}
      </div>
    </div>
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

const meta: Meta<typeof HistoryTabDisplay> = {
  title: "Tabs/HistoryTab",
  component: HistoryTabDisplay,
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
type Story = StoryObj<typeof HistoryTabDisplay>;

// Mock data for stories
const mockEntries: TradeLocationHistoryStruct[] = [
  {
    id: "1",
    version: "2",
    slug: "ghi789",
    type: "search",
    league: "poe2/Standard",
    title: "Unique Kaom's Heart",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    queryPayload: {
      query: { term: "Kaom's Heart", status: { option: "online" } },
      sort: { price: "asc" },
    },
    resultCount: 1234,
    source: "extension",
    previewImageUrl: "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQXJtb3Vycy9Cb2R5QXJtb3Vycy9Cb2R5U3RyMUEzIiwidyI6MiwiaCI6Mywic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/d2b0c7c3e5/BodyStr1A3.png",
  },
  {
    id: "2",
    version: "2",
    slug: "jkl012",
    type: "search",
    league: "poe2/Standard",
    title: "Life + Res Ring",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        stats: [
          {
            type: "and",
            filters: [{ id: "pseudo.pseudo_total_life", value: { min: 70 } }],
          },
        ],
      },
      sort: { price: "asc" },
    },
    resultCount: 567,
    source: "page",
    previewImageUrl: "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvUmluZ3MvUmluZzEiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/1b7c0b5e5e/Ring1.png",
  },
  {
    id: "3",
    version: "2",
    slug: "mno345",
    type: "search",
    league: "poe2/Settlers",
    title: "Custom Search",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        filters: { type_filters: { filters: { category: { option: "weapon.bow" } } } },
      },
      sort: { price: "asc" },
    },
    resultCount: 89,
    source: "page",
    // No preview image - testing graceful handling
  },
];

// Entries with custom sorts to test sort badge display
const mockEntriesWithCustomSorts: TradeLocationHistoryStruct[] = [
  {
    id: "cs1",
    version: "2",
    slug: "custom1",
    type: "search",
    league: "poe2/Standard",
    title: "High DPS Weapons",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    queryPayload: {
      query: { status: { option: "online" } },
      sort: { dps: "desc" },
    },
    resultCount: 456,
    source: "extension",
  },
  {
    id: "cs2",
    version: "2",
    slug: "custom2",
    type: "search",
    league: "poe2/Standard",
    title: "Cheap Uniques",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    queryPayload: {
      query: { status: { option: "online" } },
      sort: { price: "desc" },
    },
    resultCount: 789,
    source: "page",
  },
  {
    id: "cs3",
    version: "2",
    slug: "custom3",
    type: "search",
    league: "poe2/Settlers",
    title: "Best Armour",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    queryPayload: {
      query: { status: { option: "online" } },
      sort: { "item.armour": "desc" },
    },
    resultCount: 234,
    source: "extension",
  },
  {
    id: "cs4",
    version: "2",
    slug: "custom4",
    type: "search",
    league: "poe2/Standard",
    title: "Stat Sort Example",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    queryPayload: {
      query: { status: { option: "online" } },
      sort: { "stat.explicit.stat_123456": "desc" },
    },
    resultCount: 123,
    source: "page",
  },
  {
    id: "cs5",
    version: "2",
    slug: "custom5",
    type: "search",
    league: "poe2/Standard",
    title: "Default Sort Entry",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    queryPayload: {
      query: { status: { option: "online" } },
      sort: { price: "asc" },
    },
    resultCount: 999,
    source: "extension",
  },
];

export const Empty: Story = {
  args: {
    entries: [],
    executingId: null,
  },
};

export const WithEntries: Story = {
  args: {
    entries: mockEntries,
    executingId: null,
  },
};

export const ExecutingEntry: Story = {
  args: {
    entries: mockEntries,
    executingId: "1",
  },
};

export const SingleEntry: Story = {
  args: {
    entries: [mockEntries[0]],
    executingId: null,
  },
};

export const ManyEntries: Story = {
  args: {
    entries: Array.from({ length: 20 }, (_, i) => ({
      ...mockEntries[i % mockEntries.length],
      id: `entry-${i}`,
      title: `Search Result ${i + 1}`,
      resultCount: Math.floor(Math.random() * 5000),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * i).toISOString(),
    })),
    executingId: null,
  },
};

export const WithCustomSorts: Story = {
  args: {
    entries: mockEntriesWithCustomSorts,
    executingId: null,
  },
};
