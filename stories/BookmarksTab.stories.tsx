import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { BookmarksTab } from "../src/components/bookmarks/BookmarksTab";
import { setupTradeStory, TradeStoryFrame, type TradeStoryData } from "./helpers/TradeStoryFixture";
import { storageService } from "../src/services/storage";
import { itemPreviews } from "./helpers/itemPreviews";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../src/types/bookmarks";
import type { TradeLocationHistoryStruct } from "../src/types/tradeLocation";
import { useHistoryStore } from "../src/stores/historyStore";
import compressedSearch from "../tests/fixtures/compressed-search.json";

interface BookmarkStoryArgs extends Pick<TradeStoryData, "entries" | "currentLocation" | "historyInitiallyEmpty"> {
  folders: BookmarksFolderStruct[];
  trades: Record<string, BookmarksTradeStruct[]>;
  showArchived?: boolean;
  canBookmark?: boolean;
}

const meta: Meta<BookmarkStoryArgs> = {
  title: "Tabs/BookmarksTab",
  component: BookmarksTab,
  parameters: { layout: "centered" },
  beforeEach: ({ args: { canBookmark = true, ...data } }) =>
    setupTradeStory({ ...data, activeSearch: canBookmark, expandedFolders: ["1"] }),
  render: () => (
    <TradeStoryFrame>
      <BookmarksTab />
    </TradeStoryFrame>
  ),
};

export default meta;
type Story = StoryObj<BookmarkStoryArgs>;
// Mock data
const mockFolders: BookmarksFolderStruct[] = [
  { id: "1", title: "Leveling Gear", version: "2", icon: null, archivedAt: null },
  { id: "2", title: "Endgame Items", version: "2", icon: null, archivedAt: null },
  { id: "3", title: "Archived Folder", version: "2", icon: null, archivedAt: "2024-01-01" },
];

const mockQueryPayload = {
  query: {
    status: { option: "online" },
    stats: [{ type: "and", filters: [] }],
  },
  sort: { price: "asc" },
};

const mockQueryPayloadWithPrice = {
  query: {
    status: { option: "online" },
    stats: [{ type: "and", filters: [] }],
    filters: {
      trade_filters: {
        filters: {
          price: { max: 200, option: "exalted" }
        }
      }
    }
  },
  sort: { price: "asc" },
};

const mockQueryPayloadWithChaosPrice = {
  query: {
    status: { option: "online" },
    stats: [{ type: "and", filters: [] }],
    filters: {
      trade_filters: {
        filters: {
          price: { max: 50, option: "chaos" }
        }
      }
    }
  },
  sort: { price: "asc" },
};

const mockTrades: Record<string, BookmarksTradeStruct[]> = {
  "1": [
    {
      id: "t1",
      title: "Life + Res Ring",
      location: { version: "2", type: "search", league: "poe2/Standard", slug: "abc123" },
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
      queryPayload: mockQueryPayloadWithPrice,
      resultCount: 150,
      previewImageUrl: itemPreviews.ring,
    },
    {
      id: "t2",
      title: "Movement Speed Boots",
      location: { version: "2", type: "search", league: "poe2/Standard", slug: "def456" },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      queryPayload: mockQueryPayloadWithChaosPrice,
      resultCount: 42,
      previewImageUrl: itemPreviews.boots,
    },
  ],
  "2": [
    {
      id: "t3",
      title: "Perfect Chaos Res Ring",
      location: { version: "2", type: "search", league: "poe2/Standard", slug: "ghi789" },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      queryPayload: mockQueryPayload, // No price filter - testing no badge
      resultCount: 8,
      // No preview image - testing graceful handling
    },
  ],
};

export const Empty: Story = {
  args: {
    folders: [],
    trades: {},
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText("No bookmarks yet")).toBeVisible();
  },
};

export const WithFolders: Story = {
  args: {
    folders: mockFolders.filter((f) => !f.archivedAt),
    trades: mockTrades,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Life + Res Ring")).toBeVisible();
    await userEvent.click(canvas.getByText("Leveling Gear"));
    await expect(canvas.queryByText("Life + Res Ring")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByText("Leveling Gear"));
    await expect(await canvas.findByText("Life + Res Ring")).toBeVisible();
  },
};

export const WithArchivedFolders: Story = {
  args: {
    folders: mockFolders,
    trades: mockTrades,
    showArchived: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Hide archived (1)" }));
    await expect(canvas.queryByText("Archived Folder")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Show archived (1)" }));
    await expect(await canvas.findByText("Archived Folder")).toBeVisible();
  },
};

export const NoActiveSearch: Story = {
  args: {
    folders: mockFolders.filter((f) => !f.archivedAt),
    trades: mockTrades,
    canBookmark: false,
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole("button", { name: "No active search" })).toBeDisabled();
  },
};

export const SingleFolder: Story = {
  args: {
    folders: [mockFolders[0]],
    trades: { "1": mockTrades["1"] },
  },
};

export const CreateFolder: Story = {
  args: { folders: [], trades: {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "New Folder" }));
    await userEvent.type(canvas.getByPlaceholderText("e.g., Leveling Gear"), "New gear");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await expect(await canvas.findByText("New gear")).toBeVisible();
    await expect(canvas.queryByText("No bookmarks yet")).not.toBeInTheDocument();
    await expect(await storageService.getValue("bookmark-folders")).toEqual([
      expect.objectContaining({ title: "New gear", version: "2" }),
    ]);
  },
};

export const RenameWithoutExpanding: Story = {
  args: { folders: [mockFolders[1]], trades: mockTrades },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const folder = await canvas.findByRole("button", { name: /Endgame Items/ });
    await expect(folder).toHaveAttribute("aria-expanded", "false");
    folder.focus();
    await userEvent.click(canvas.getByTitle("Rename"));
    await waitFor(() => expect(canvas.getByRole("heading", { name: "Rename Folder" })).toBeVisible());
    await expect(folder).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(folder).toHaveAttribute("aria-expanded", "false");
  },
};

const pastedEntry: TradeLocationHistoryStruct = {
  id: "pasted-item", title: "Miracle Guardian", version: "2", type: "search", league: "poe2/Standard",
  slug: compressedSearch.historySlug, createdAt: "2026-09-07T00:00:00Z", source: "extension", resultCount: 0,
  queryPayload: { query: compressedSearch.query },
};

async function saveCurrentSearch(canvasElement: HTMLElement, expectedSlug: string) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole("button", { name: "Bookmark Current Search" }));
  await waitFor(() => expect(canvas.getByRole("button", { name: "Save Bookmark" })).toBeEnabled());
  await expect(canvas.getByRole("textbox")).toHaveValue("Miracle Guardian");
  await userEvent.click(canvas.getByRole("button", { name: "Save Bookmark" }));
  await waitFor(async () => expect(await storageService.getValue("bookmark-trades-1")).toEqual([
    expect.objectContaining({
      title: "Miracle Guardian", queryPayload: pastedEntry.queryPayload,
      location: { version: "2", type: "search", league: "poe2/Standard", slug: expectedSlug },
    }),
  ]));
  await expect(await storageService.getValue("trade-history")).toHaveLength(1);
  await expect(useHistoryStore.getState().entries).toHaveLength(1);
}

export const BookmarkAfterReload: Story = {
  args: {
    folders: [mockFolders[0]], trades: {},
    entries: [{ ...pastedEntry, slug: "story-search" }], historyInitiallyEmpty: true,
  },
  play: async ({ canvasElement }) => saveCurrentSearch(canvasElement, "story-search"),
};

export const BookmarkCompressedCurrentSearch: Story = {
  args: {
    folders: [mockFolders[0]], trades: {}, entries: [pastedEntry], historyInitiallyEmpty: true,
    currentLocation: { version: "2", type: "search", league: "poe2/Standard", slug: compressedSearch.pageSlug },
  },
  play: async ({ canvasElement }) => saveCurrentSearch(canvasElement, compressedSearch.pageSlug),
};

export const UpdateFromCompressedCurrentSearch: Story = {
  args: {
    folders: [mockFolders[0]], trades: { "1": [mockTrades["1"][0]] }, entries: [pastedEntry],
    currentLocation: { version: "2", type: "search", league: "poe2/Standard", slug: compressedSearch.pageSlug },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const update = await canvas.findByTitle("Update with current search");
    update.focus();
    await userEvent.click(update);
    await expect(canvas.getByRole("textbox")).toHaveValue("Life + Res Ring");
    await userEvent.click(canvas.getByRole("button", { name: "Update Bookmark" }));
    await waitFor(async () => expect(await storageService.getValue("bookmark-trades-1")).toEqual([
      expect.objectContaining({
        id: "t1", title: "Life + Res Ring", createdAt: mockTrades["1"][0].createdAt,
        queryPayload: pastedEntry.queryPayload,
        location: { version: "2", type: "search", league: "poe2/Standard", slug: compressedSearch.pageSlug },
      }),
    ]));
    await expect(await storageService.getValue("trade-history")).toEqual([pastedEntry]);
  },
};
