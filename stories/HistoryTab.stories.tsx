import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { HistoryTab } from "../src/components/history/HistoryTab";
import { setupTradeStory, TradeStoryFrame } from "./helpers/TradeStoryFixture";
import { useHistoryStore } from "../src/stores/historyStore";
import { storageService } from "../src/services/storage";
import { itemPreviews } from "./helpers/itemPreviews";
import type { TradeLocationHistoryStruct } from "../src/types/tradeLocation";
import type { BookmarksFolderStruct } from "../src/types/bookmarks";

const mockFolders: BookmarksFolderStruct[] = [
  { id: "f1", title: "Leveling Gear", version: "2", icon: null, archivedAt: null },
  { id: "f2", title: "Endgame Builds", version: "2", icon: null, archivedAt: null },
  { id: "f3", title: "Trade Flips", version: "2", icon: null, archivedAt: null },
];

interface HistoryStoryArgs {
  entries: TradeLocationHistoryStruct[];
  executingId: string | null;
}

const meta: Meta<HistoryStoryArgs> = {
  title: "Tabs/HistoryTab",
  component: HistoryTab,
  parameters: { layout: "centered" },
  beforeEach: ({ args }) => setupTradeStory({ ...args, folders: mockFolders }),
  render: () => (
    <TradeStoryFrame>
      <HistoryTab />
    </TradeStoryFrame>
  ),
};

export default meta;
type Story = StoryObj<HistoryStoryArgs>;
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
    previewImageUrl: itemPreviews.armour,
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
    previewImageUrl: itemPreviews.ring,
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
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText("No search history yet")).toBeVisible();
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
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole("button", { name: /Unique Kaom's Heart/ })).toBeDisabled();
  },
};

export const SingleEntry: Story = {
  args: {
    entries: [mockEntries[0]],
    executingId: null,
  },
};

export const ClearHistory: Story = {
  args: { entries: mockEntries, executingId: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Clear all" }));
    await expect(await canvas.findByText("No search history yet")).toBeVisible();
  },
};

export const DeleteWithoutSearching: Story = {
  args: { entries: [mockEntries[0]], executingId: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    (await canvas.findByRole("button", { name: /Unique Kaom's Heart/ })).focus();
    await userEvent.click(canvas.getByTitle("Delete"));
    await expect(await canvas.findByText("No search history yet")).toBeVisible();
    await expect(useHistoryStore.getState().executeSearch).not.toHaveBeenCalled();
    await expect(await storageService.getValue("trade-history")).toEqual([]);
  },
};

export const BookmarkWithoutSearching: Story = {
  args: { entries: [mockEntries[0]], executingId: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    (await canvas.findByRole("button", { name: /Unique Kaom's Heart/ })).focus();
    await userEvent.click(canvas.getByTitle("Add to bookmarks"));
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole("button", { name: "Leveling Gear" }));
    await waitFor(async () => {
      await expect(await storageService.getValue("bookmark-trades-f1")).toEqual([
        expect.objectContaining({ title: "Unique Kaom's Heart" }),
      ]);
    });
    await expect(useHistoryStore.getState().executeSearch).not.toHaveBeenCalled();
  },
};

export const KeyboardActions: Story = {
  args: { entries: [mockEntries[0]], executingId: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const execute = await canvas.findByRole("button", { name: /Unique Kaom's Heart/ });
    canvas.getByRole("button", { name: "Clear all" }).focus();
    await userEvent.tab();
    await expect(execute).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByTitle("Add to bookmarks")).toHaveFocus();
    await waitFor(() => expect(canvas.getByTitle("Add to bookmarks")).toBeVisible());
    await userEvent.tab();
    await expect(canvas.getByTitle("Delete")).toHaveFocus();
    await expect(useHistoryStore.getState().executeSearch).not.toHaveBeenCalled();
  },
};

export const ManyEntries: Story = {
  args: {
    entries: Array.from({ length: 20 }, (_, i) => ({
      ...mockEntries[i % mockEntries.length],
      id: `entry-${i}`,
      title: `Search Result ${i + 1}`,
      resultCount: 250 + i * 137,
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

// Entries with price filters to test price badge display
const mockEntriesWithPriceFilters: TradeLocationHistoryStruct[] = [
  {
    id: "pf1",
    version: "2",
    slug: "price1",
    type: "search",
    league: "poe2/Standard",
    title: "Budget Sceptre",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        filters: {
          trade_filters: {
            filters: {
              price: { max: 200, option: "exalted" }
            }
          }
        }
      },
      sort: { price: "asc" },
    },
    resultCount: 156,
    source: "extension",
  },
  {
    id: "pf2",
    version: "2",
    slug: "price2",
    type: "search",
    league: "poe2/Standard",
    title: "Cheap Rings",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        filters: {
          trade_filters: {
            filters: {
              price: { max: 50, option: "chaos" }
            }
          }
        }
      },
      sort: { price: "asc" },
    },
    resultCount: 789,
    source: "page",
  },
  {
    id: "pf3",
    version: "2",
    slug: "price3",
    type: "search",
    league: "poe2/Settlers",
    title: "Divine Budget Gear",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        filters: {
          trade_filters: {
            filters: {
              price: { max: 10, option: "divine" }
            }
          }
        }
      },
      sort: { dps: "desc" }, // Custom sort + price
    },
    resultCount: 42,
    source: "extension",
  },
  {
    id: "pf4",
    version: "2",
    slug: "price4",
    type: "search",
    league: "poe2/Standard",
    title: "No Price Limit",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    queryPayload: {
      query: { status: { option: "online" } },
      sort: { price: "asc" },
    },
    resultCount: 999,
    source: "page",
  },
];

export const WithPriceFilters: Story = {
  args: {
    entries: mockEntriesWithPriceFilters,
    executingId: null,
  },
};

// Entries with stat filters to test stat count badge display
const mockEntriesWithStatFilters: TradeLocationHistoryStruct[] = [
  {
    id: "sf1",
    version: "2",
    slug: "stat1",
    type: "search",
    league: "poe2/Standard",
    title: "High Life Ring",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        stats: [
          {
            type: "and",
            filters: [
              { id: "pseudo.pseudo_total_life", value: { min: 70 } },
            ],
          },
        ],
      },
      sort: { price: "asc" },
    },
    resultCount: 234,
    source: "extension",
  },
  {
    id: "sf2",
    version: "2",
    slug: "stat2",
    type: "search",
    league: "poe2/Standard",
    title: "Tri-Res Gloves",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        stats: [
          {
            type: "and",
            filters: [
              { id: "pseudo.pseudo_total_fire_resistance", value: { min: 30 } },
              { id: "pseudo.pseudo_total_cold_resistance", value: { min: 30 } },
              { id: "pseudo.pseudo_total_lightning_resistance", value: { min: 30 } },
            ],
          },
        ],
      },
      sort: { price: "asc" },
    },
    resultCount: 567,
    source: "page",
  },
  {
    id: "sf3",
    version: "2",
    slug: "stat3",
    type: "search",
    league: "poe2/Settlers",
    title: "GG Weapon",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    queryPayload: {
      query: {
        status: { option: "online" },
        stats: [
          {
            type: "and",
            filters: [
              { id: "explicit.stat_123", value: { min: 100 } },
              { id: "explicit.stat_456", value: { min: 50 } },
              { id: "explicit.stat_789", value: { min: 25 } },
              { id: "explicit.stat_012", value: { min: 10 } },
              { id: "explicit.stat_345", value: { min: 5 } },
            ],
          },
          {
            type: "weight",
            filters: [
              { id: "pseudo.pseudo_total_life", value: { weight: 1 } },
              { id: "pseudo.pseudo_total_mana", value: { weight: 0.5 } },
              { id: "pseudo.pseudo_total_energy_shield", value: { weight: 0.8 } },
            ],
          },
        ],
      },
      sort: { dps: "desc" },
    },
    resultCount: 12,
    source: "extension",
  },
  {
    id: "sf4",
    version: "2",
    slug: "stat4",
    type: "search",
    league: "poe2/Standard",
    title: "No Stats Search",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    queryPayload: {
      query: {
        term: "Headhunter",
        status: { option: "online" },
      },
      sort: { price: "asc" },
    },
    resultCount: 42,
    source: "page",
  },
];

export const WithStatFilters: Story = {
  args: {
    entries: mockEntriesWithStatFilters,
    executingId: null,
  },
};
