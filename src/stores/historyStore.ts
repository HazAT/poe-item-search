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

    // Don't add duplicates based on slug
    const lastEntry = entries[0];
    if (lastEntry && lastEntry.slug === location.slug) {
      debug.log("addEntry: skipping duplicate", location.slug);
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
    debug.log("executeSearch: re-executing query", { id, title: entry.title });

    try {
      const apiUrl = buildTradeApiUrl(entry);
      debug.log("executeSearch: POSTing to", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry.queryPayload),
      });

      const result = await response.json();
      debug.log("executeSearch: got result", { id: result.id, total: result.total });

      if (result.id) {
        // Update entry with new slug and result count
        const updatedEntry: TradeLocationHistoryStruct = {
          ...entry,
          slug: result.id,
          resultCount: result.total,
        };

        const newEntries = entries.map((e) => (e.id === id ? updatedEntry : e));
        await storageService.setValue(HISTORY_KEY, newEntries);
        set({ entries: newEntries });

        // Navigate to fresh results
        const resultUrl = buildTradeUrl(updatedEntry);
        debug.log("executeSearch: navigating to", resultUrl);
        window.location.href = resultUrl;
      } else {
        debug.error("executeSearch: no id in response", result);
      }
    } catch (error) {
      debug.error("executeSearch: failed", error);
    } finally {
      set({ isExecuting: null });
    }
  },
}));
