import { create } from "zustand";
import { storageService } from "@/services/storage";
import { uniqueId } from "@/utils/uniqueId";
import { debugBookmarks } from "@/utils/debug";
import { buildTradeApiUrl, buildTradeUrl } from "@/services/tradeLocation";
import { debug } from "@/utils/debug";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "@/types/bookmarks";

const FOLDERS_KEY = "bookmark-folders";
const TRADES_KEY_PREFIX = "bookmark-trades";
const EXPANDED_FOLDERS_KEY = "expanded-folders";

interface BookmarksState {
  folders: BookmarksFolderStruct[];
  trades: Record<string, BookmarksTradeStruct[]>;
  expandedFolders: string[];
  isLoading: boolean;
  hasFetched: boolean;
  showArchived: boolean;
  isExecuting: string | null; // ID of trade being re-executed

  // Folder operations
  fetchFolders: () => Promise<void>;
  toggleFolderExpanded: (folderId: string) => void;
  isFolderExpanded: (folderId: string) => boolean;
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
  executeSearch: (folderId: string, tradeId: string) => Promise<void>;

  // UI state
  toggleShowArchived: () => void;
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  folders: [],
  trades: {},
  expandedFolders: [],
  isLoading: false,
  hasFetched: false,
  showArchived: false,
  isExecuting: null,

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
      const [folders, expandedFolders] = await Promise.all([
        storageService.getValue<BookmarksFolderStruct[]>(FOLDERS_KEY),
        storageService.getValue<string[]>(EXPANDED_FOLDERS_KEY),
      ]);
      console.log("[PoE Search] [Bookmarks] fetchFolders() loaded", folders?.length ?? 0, "folders");
      debugBookmarks(`fetchFolders() loaded ${folders?.length ?? 0} folders`);
      set({ folders: folders ?? [], expandedFolders: expandedFolders ?? [], isLoading: false, hasFetched: true });
    } catch (e) {
      console.error("[PoE Search] [Bookmarks] fetchFolders() error:", e);
      set({ isLoading: false, hasFetched: true });
    }
  },

  toggleFolderExpanded: (folderId: string) => {
    const { expandedFolders } = get();
    const isExpanded = expandedFolders.includes(folderId);
    const newExpandedFolders = isExpanded
      ? expandedFolders.filter((id) => id !== folderId)
      : [...expandedFolders, folderId];
    set({ expandedFolders: newExpandedFolders });
    storageService.setValue(EXPANDED_FOLDERS_KEY, newExpandedFolders);
  },

  isFolderExpanded: (folderId: string) => {
    return get().expandedFolders.includes(folderId);
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

  executeSearch: async (folderId, tradeId) => {
    const { trades } = get();
    const folderTrades = trades[folderId] ?? [];
    const trade = folderTrades.find((t) => t.id === tradeId);

    if (!trade) {
      debug.error("executeSearch: trade not found", { folderId, tradeId });
      return;
    }

    // If no queryPayload (legacy bookmark), just navigate to the existing URL
    if (!trade.queryPayload) {
      debug.log("executeSearch: no queryPayload, navigating to existing URL", { tradeId, title: trade.title });
      const resultUrl = buildTradeUrl(trade.location);
      window.location.href = resultUrl;
      return;
    }

    set({ isExecuting: tradeId });
    debug.log("executeSearch: FULL TRADE DUMP", {
      id: trade.id,
      title: trade.title,
      location: trade.location,
      version: trade.location?.version,
      league: trade.location?.league,
      type: trade.location?.type,
      slug: trade.location?.slug,
      resultCount: trade.resultCount,
      createdAt: trade.createdAt,
      queryPayload: trade.queryPayload,
      sort: trade.queryPayload?.sort,
    });

    try {
      const apiUrl = buildTradeApiUrl(trade.location);
      debug.log("executeSearch: POSTing to", apiUrl);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trade.queryPayload),
      });

      const result = await response.json();
      debug.log("executeSearch: got result", { id: result.id, total: result.total });

      if (result.id) {
        // Update trade with new slug and result count
        const updatedTrade: BookmarksTradeStruct = {
          ...trade,
          location: { ...trade.location, slug: result.id },
          resultCount: result.total,
        };

        const newFolderTrades = folderTrades.map((t) =>
          t.id === tradeId ? updatedTrade : t
        );
        await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
        set((state) => ({
          trades: { ...state.trades, [folderId]: newFolderTrades },
        }));

        // Set sort override for the page's subsequent requests
        // Use localStorage (shared between content script and page on same origin)
        const sort = trade.queryPayload?.sort;
        if (sort && Object.keys(sort).length > 0) {
          const isDefaultSort = Object.keys(sort).length === 1 && sort.price === "asc";
          if (!isDefaultSort) {
            localStorage.setItem("poe-search-sort-override", JSON.stringify(sort));
            debug.log("executeSearch: set sort override in localStorage", sort);
          }
        }

        // Navigate to fresh results
        const resultUrl = buildTradeUrl(updatedTrade.location);
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

  toggleShowArchived: () => {
    set((state) => ({ showArchived: !state.showArchived }));
  },
}));
