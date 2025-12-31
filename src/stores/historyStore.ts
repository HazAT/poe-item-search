import { create } from "zustand";
import { storageService } from "@/services/storage";
import { uniqueId } from "@/utils/uniqueId";
import { buildTradeUrl, buildTradeApiUrl } from "@/services/tradeLocation";
import { debug } from "@/utils/debug";
import type {
  TradeLocationStruct,
  TradeLocationHistoryStruct,
  TradeSearchQuery,
} from "@/types/tradeLocation";

const HISTORY_KEY = "trade-history";
const MAX_HISTORY_LENGTH = 100;

interface HistoryState {
  entries: TradeLocationHistoryStruct[];
  isLoading: boolean;
  isExecuting: string | null; // ID of entry being re-executed
  fetchEntries: () => Promise<void>;
  clearEntries: () => Promise<void>;
  addEntry: (
    location: TradeLocationStruct,
    title: string,
    queryPayload: TradeSearchQuery,
    resultCount: number,
    source: "extension" | "page"
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  executeSearch: (id: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  isLoading: false,
  isExecuting: null,

  fetchEntries: async () => {
    set({ isLoading: true });
    const entries =
      (await storageService.getValue<TradeLocationHistoryStruct[]>(HISTORY_KEY)) ?? [];
    set({ entries, isLoading: false });
  },

  clearEntries: async () => {
    await storageService.deleteValue(HISTORY_KEY);
    set({ entries: [] });
  },

  addEntry: async (location, title, queryPayload, resultCount, source) => {
    // Don't add incomplete entries
    if (!location.version || !location.league || !location.type || !location.slug) {
      debug.log("addEntry: skipping incomplete entry", location);
      return;
    }

    const { entries } = get();

    // Check if this slug already exists
    const existingIndex = entries.findIndex((e) => e.slug === location.slug);
    if (existingIndex !== -1) {
      const existingEntry = entries[existingIndex];

      // Check if new sort is non-default (not just price:asc)
      const newSort = queryPayload?.sort;
      const isDefaultSort = !newSort || (Object.keys(newSort).length === 1 && newSort.price === "asc");

      // Only update queryPayload if new sort is non-default (custom sort)
      // This prevents the page's default sort from overwriting user's custom sort
      const updatedEntry: TradeLocationHistoryStruct = {
        ...existingEntry,
        resultCount,
        // Update queryPayload only if new sort is custom (non-default)
        ...(isDefaultSort ? {} : { queryPayload }),
      };

      debug.log("addEntry: updating existing entry", {
        slug: location.slug,
        isDefaultSort,
        updatedPayload: !isDefaultSort,
      });

      // Move updated entry to top of list
      const newEntries = [
        updatedEntry,
        ...entries.slice(0, existingIndex),
        ...entries.slice(existingIndex + 1),
      ];
      await storageService.setValue(HISTORY_KEY, newEntries);
      set({ entries: newEntries });
      return;
    }

    const newEntry: TradeLocationHistoryStruct = {
      id: uniqueId(),
      version: location.version,
      slug: location.slug,
      type: location.type,
      league: location.league,
      title,
      createdAt: new Date().toISOString(),
      queryPayload,
      resultCount,
      source,
    };

    debug.log("addEntry: adding entry", {
      title,
      slug: location.slug,
      resultCount,
      source,
    });

    const newEntries = [newEntry, ...entries].slice(0, MAX_HISTORY_LENGTH);
    await storageService.setValue(HISTORY_KEY, newEntries);
    set({ entries: newEntries });
  },

  deleteEntry: async (id: string) => {
    const { entries } = get();
    const newEntries = entries.filter((entry) => entry.id !== id);
    await storageService.setValue(HISTORY_KEY, newEntries);
    set({ entries: newEntries });
  },

  executeSearch: async (id: string) => {
    const { entries } = get();
    const entry = entries.find((e) => e.id === id);

    if (!entry) {
      debug.error("executeSearch: entry not found", id);
      return;
    }

    set({ isExecuting: id });
    debug.log("executeSearch: FULL ENTRY DUMP", {
      id: entry.id,
      title: entry.title,
      version: entry.version,
      league: entry.league,
      type: entry.type,
      slug: entry.slug,
      resultCount: entry.resultCount,
      createdAt: entry.createdAt,
      source: entry.source,
      queryPayload: entry.queryPayload,
      sort: entry.queryPayload?.sort,
    });

    // Set sort override for the page's POST request (interceptor will apply it)
    // Don't make our own POST - let the page do it to avoid rate limiting
    const sort = entry.queryPayload?.sort;
    if (sort && Object.keys(sort).length > 0) {
      const isDefaultSort = Object.keys(sort).length === 1 && sort.price === "asc";
      if (!isDefaultSort) {
        localStorage.setItem("poe-search-sort-override", JSON.stringify(sort));
        debug.log("executeSearch: set sort override in localStorage", sort);
      }
    }

    // Navigate to existing URL - page will POST and interceptor will apply sort
    const resultUrl = buildTradeUrl(entry);
    debug.log("executeSearch: navigating to", resultUrl);
    window.location.href = resultUrl;
    set({ isExecuting: null });
  },
}));
