import type { Meta, StoryObj } from "@storybook/react";
import { Button, TrashIcon, ExternalLinkIcon } from "../src/components/ui";
import type { TradeLocationHistoryStruct } from "../src/types/tradeLocation";

// Standalone display component for stories (doesn't use store)
function HistoryTabDisplay({ entries }: { entries: TradeLocationHistoryStruct[] }) {
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
              <HistoryEntryDisplay key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HistoryEntryDisplay({ entry }: { entry: TradeLocationHistoryStruct }) {
  const timeAgo = getRelativeTime(entry.createdAt);
  return (
    <li className="group">
      <a href="#" className="flex items-start gap-3 px-3 py-2 hover:bg-poe-gray transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-fontin text-sm text-poe-beige truncate">{entry.title}</span>
            <span className="text-xs text-poe-gray-alt shrink-0">
              {entry.version === "2" ? "PoE2" : "PoE1"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-poe-gray-alt truncate">{entry.league} • {entry.type}</span>
            <span className="text-xs text-poe-gray-alt shrink-0">{timeAgo}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm"><TrashIcon className="w-4 h-4" /></Button>
          <ExternalLinkIcon className="w-4 h-4 text-poe-gray-alt" />
        </div>
      </a>
    </li>
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
    slug: "abc123",
    type: "search",
    league: "Standard",
    title: "Gold Ring with Fire Resistance",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    version: "2",
    slug: "def456",
    type: "search",
    league: "Standard",
    title: "Rare Gloves",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    id: "3",
    version: "2",
    slug: "ghi789",
    type: "search",
    league: "Standard",
    title: "Unique Kaom's Heart",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "4",
    version: "1",
    slug: "jkl012",
    type: "search",
    league: "Standard",
    title: "Tabula Rasa",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: "5",
    version: "2",
    slug: "mno345",
    type: "search",
    league: "Settlers",
    title: "Life + Res Ring",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
  },
];

export const Empty: Story = {
  args: {
    entries: [],
  },
};

export const WithEntries: Story = {
  args: {
    entries: mockEntries,
  },
};

export const SingleEntry: Story = {
  args: {
    entries: [mockEntries[0]],
  },
};

export const ManyEntries: Story = {
  args: {
    entries: Array.from({ length: 20 }, (_, i) => ({
      ...mockEntries[i % mockEntries.length],
      id: `entry-${i}`,
      title: `Search Result ${i + 1}`,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * i).toISOString(),
    })),
  },
};
