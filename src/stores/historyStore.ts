import { create } from "zustand";
import { storageService } from "@/services/storage";
import { uniqueId } from "@/utils/uniqueId";
import { compareTradeLocations } from "@/services/tradeLocation";
import type { TradeLocationStruct, TradeLocationHistoryStruct } from "@/types/tradeLocation";

const HISTORY_KEY = "trade-history";
const MAX_HISTORY_LENGTH = 100;

interface HistoryState {
  entries: TradeLocationHistoryStruct[];
  isLoading: boolean;
  fetchEntries: () => Promise<void>;
  clearEntries: () => Promise<void>;
  addEntry: (location: TradeLocationStruct, title: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  isLoading: false,

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

  addEntry: async (location: TradeLocationStruct, title: string) => {
    // Don't add incomplete entries
    if (!location.version || !location.league || !location.type || !location.slug) {
      return;
    }

    const { entries } = get();

    // Don't add duplicates
    const lastEntry = entries[0];
    if (lastEntry && compareTradeLocations(location, lastEntry)) {
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
    };

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
}));
