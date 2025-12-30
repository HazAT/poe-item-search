import { create } from "zustand";
import { storageService } from "@/services/storage";
import { uniqueId } from "@/utils/uniqueId";
import { debugBookmarks } from "@/utils/debug";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "@/types/bookmarks";

const FOLDERS_KEY = "bookmark-folders";
const TRADES_KEY_PREFIX = "bookmark-trades";

interface BookmarksState {
  folders: BookmarksFolderStruct[];
  trades: Record<string, BookmarksTradeStruct[]>;
  isLoading: boolean;
  hasFetched: boolean;
  showArchived: boolean;

  // Folder operations
  fetchFolders: () => Promise<void>;
  createFolder: (folder: Omit<BookmarksFolderStruct, "id">) => Promise<void>;
  updateFolder: (id: string, updates: Partial<BookmarksFolderStruct>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  archiveFolder: (id: string) => Promise<void>;
  unarchiveFolder: (id: string) => Promise<void>;

  // Trade operations
  fetchTradesForFolder: (folderId: string) => Promise<void>;
  createTrade: (folderId: string, trade: Omit<BookmarksTradeStruct, "id">) => Promise<void>;
  updateTrade: (folderId: string, tradeId: string, updates: Partial<BookmarksTradeStruct>) => Promise<void>;
  deleteTrade: (folderId: string, tradeId: string) => Promise<void>;
  toggleTradeCompleted: (folderId: string, tradeId: string) => Promise<void>;

  // UI state
  toggleShowArchived: () => void;
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  folders: [],
  trades: {},
  isLoading: false,
  hasFetched: false,
  showArchived: false,

  fetchFolders: async () => {
    // Prevent repeated fetches - only fetch once
    const state = get();
    if (state.isLoading || state.hasFetched) {
      console.log("[PoE Search] [Bookmarks] fetchFolders() skipped - already fetched or loading");
      return;
    }
    console.log("[PoE Search] [Bookmarks] fetchFolders() called");
    debugBookmarks("fetchFolders() called");
    set({ isLoading: true });
    try {
      const folders =
        (await storageService.getValue<BookmarksFolderStruct[]>(FOLDERS_KEY)) ?? [];
      console.log("[PoE Search] [Bookmarks] fetchFolders() loaded", folders.length, "folders");
      debugBookmarks(`fetchFolders() loaded ${folders.length} folders`);
      set({ folders, isLoading: false, hasFetched: true });
    } catch (e) {
      console.error("[PoE Search] [Bookmarks] fetchFolders() error:", e);
      set({ isLoading: false, hasFetched: true });
    }
  },

  createFolder: async (folder) => {
    const { folders } = get();
    const newFolder: BookmarksFolderStruct = {
      ...folder,
      id: uniqueId(),
    };
    const newFolders = [...folders, newFolder];
    await storageService.setValue(FOLDERS_KEY, newFolders);
    set({ folders: newFolders });
  },

  updateFolder: async (id, updates) => {
    const { folders } = get();
    const newFolders = folders.map((folder) =>
      folder.id === id ? { ...folder, ...updates } : folder
    );
    await storageService.setValue(FOLDERS_KEY, newFolders);
    set({ folders: newFolders });
  },

  deleteFolder: async (id) => {
    const { folders, trades } = get();
    const newFolders = folders.filter((folder) => folder.id !== id);
    await storageService.setValue(FOLDERS_KEY, newFolders);
    await storageService.deleteValue(`${TRADES_KEY_PREFIX}-${id}`);
    const newTrades = { ...trades };
    delete newTrades[id];
    set({ folders: newFolders, trades: newTrades });
  },

  archiveFolder: async (id) => {
    const { updateFolder } = get();
    await updateFolder(id, { archivedAt: new Date().toISOString() });
  },

  unarchiveFolder: async (id) => {
    const { updateFolder } = get();
    await updateFolder(id, { archivedAt: null });
  },

  fetchTradesForFolder: async (folderId) => {
    const folderTrades =
      (await storageService.getValue<BookmarksTradeStruct[]>(
        `${TRADES_KEY_PREFIX}-${folderId}`
      )) ?? [];
    set((state) => ({
      trades: { ...state.trades, [folderId]: folderTrades },
    }));
  },

  createTrade: async (folderId, trade) => {
    const { trades, fetchTradesForFolder } = get();
    if (!trades[folderId]) {
      await fetchTradesForFolder(folderId);
    }
    const folderTrades = trades[folderId] ?? [];
    const newTrade: BookmarksTradeStruct = {
      ...trade,
      id: uniqueId(),
    };
    const newFolderTrades = [...folderTrades, newTrade];
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));
  },

  updateTrade: async (folderId, tradeId, updates) => {
    const { trades } = get();
    const folderTrades = trades[folderId] ?? [];
    const newFolderTrades = folderTrades.map((trade) =>
      trade.id === tradeId ? { ...trade, ...updates } : trade
    );
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));
  },

  deleteTrade: async (folderId, tradeId) => {
    const { trades } = get();
    const folderTrades = trades[folderId] ?? [];
    const newFolderTrades = folderTrades.filter((trade) => trade.id !== tradeId);
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));
  },

  toggleTradeCompleted: async (folderId, tradeId) => {
    const { trades, updateTrade } = get();
    const folderTrades = trades[folderId] ?? [];
    const trade = folderTrades.find((t) => t.id === tradeId);
    if (trade) {
      await updateTrade(folderId, tradeId, {
        completedAt: trade.completedAt ? null : new Date().toISOString(),
      });
    }
  },

  toggleShowArchived: () => {
    set((state) => ({ showArchived: !state.showArchived }));
  },
}));
