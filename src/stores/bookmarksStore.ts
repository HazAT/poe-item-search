import { create } from "zustand";
import LZString from "lz-string";
import { storageService } from "@/services/storage";
import { syncService } from "@/services/syncService";
import { uniqueId } from "@/utils/uniqueId";
import { buildTradeUrl } from "@/services/tradeLocation";
import { debug } from "@/utils/debug";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "@/types/bookmarks";
import type { TradeSiteVersion } from "@/types/tradeLocation";

// Export format for sharing folders
export interface FolderExport {
  folder: {
    title: string;
    version: TradeSiteVersion;
    icon: string | null;
  };
  trades: BookmarksTradeStruct[];
}

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

  // Import/Export
  exportFolder: (folderId: string) => Promise<void>;
  importFolder: (compressed: string) => Promise<{ success: boolean; error?: string }>;

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
      debug.log("[Bookmarks] fetchFolders() skipped - already fetched or loading");
      return;
    }
    debug.log("[Bookmarks] fetchFolders() called");
    set({ isLoading: true });
    try {
      const [folders, expandedFolders] = await Promise.all([
        storageService.getValue<BookmarksFolderStruct[]>(FOLDERS_KEY),
        storageService.getValue<string[]>(EXPANDED_FOLDERS_KEY),
      ]);
      debug.log(`[Bookmarks] fetchFolders() loaded ${folders?.length ?? 0} folders`);
      set({ folders: folders ?? [], expandedFolders: expandedFolders ?? [], isLoading: false, hasFetched: true });
    } catch (e) {
      debug.error("[Bookmarks] fetchFolders() error:", e);
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
      updatedAt: Date.now(),
    };
    const newFolders = [...folders, newFolder];
    await storageService.setValue(FOLDERS_KEY, newFolders);
    set({ folders: newFolders });
    syncService.schedulePush();
  },

  updateFolder: async (id, updates) => {
    const { folders } = get();
    const newFolders = folders.map((folder) =>
      folder.id === id ? { ...folder, ...updates, updatedAt: Date.now() } : folder
    );
    await storageService.setValue(FOLDERS_KEY, newFolders);
    set({ folders: newFolders });
    syncService.schedulePush();
  },

  deleteFolder: async (id) => {
    const { folders, trades } = get();
    const newFolders = folders.filter((folder) => folder.id !== id);
    await storageService.setValue(FOLDERS_KEY, newFolders);
    await storageService.deleteValue(`${TRADES_KEY_PREFIX}-${id}`);
    const newTrades = { ...trades };
    delete newTrades[id];
    set({ folders: newFolders, trades: newTrades });

    // Add tombstone for sync
    syncService.addTombstone(id, 'folder');
    syncService.schedulePush();
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
      updatedAt: Date.now(),
    };
    const newFolderTrades = [...folderTrades, newTrade];
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));
    syncService.schedulePush();
  },

  updateTrade: async (folderId, tradeId, updates) => {
    const { trades } = get();
    const folderTrades = trades[folderId] ?? [];
    const newFolderTrades = folderTrades.map((trade) =>
      trade.id === tradeId ? { ...trade, ...updates, updatedAt: Date.now() } : trade
    );
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));
    syncService.schedulePush();
  },

  deleteTrade: async (folderId, tradeId) => {
    const { trades } = get();
    const folderTrades = trades[folderId] ?? [];
    const newFolderTrades = folderTrades.filter((trade) => trade.id !== tradeId);
    await storageService.setValue(`${TRADES_KEY_PREFIX}-${folderId}`, newFolderTrades);
    set((state) => ({
      trades: { ...state.trades, [folderId]: newFolderTrades },
    }));

    // Add tombstone for sync
    syncService.addTombstone(tradeId, 'bookmark');
    syncService.schedulePush();
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

    // Set sort override for the page's POST request (interceptor will apply it)
    // Don't make our own POST - let the page do it to avoid rate limiting
    const sort = trade.queryPayload?.sort;
    if (sort && Object.keys(sort).length > 0) {
      const isDefaultSort = Object.keys(sort).length === 1 && sort.price === "asc";
      if (!isDefaultSort) {
        localStorage.setItem("poe-search-sort-override", JSON.stringify(sort));
        debug.log("executeSearch: set sort override in localStorage", sort);
      }
    }

    // Navigate to existing URL - page will POST and interceptor will apply sort
    const resultUrl = buildTradeUrl(trade.location);
    debug.log("executeSearch: navigating to", resultUrl);
    window.location.href = resultUrl;
    set({ isExecuting: null });
  },

  exportFolder: async (folderId: string) => {
    const { folders, trades, fetchTradesForFolder } = get();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) {
      debug.error("exportFolder: folder not found", { folderId });
      return;
    }

    // Ensure trades are loaded
    if (!trades[folderId]) {
      await fetchTradesForFolder(folderId);
    }
    const folderTrades = get().trades[folderId] ?? [];

    // Build export object (strip IDs and timestamps)
    const exportData: FolderExport = {
      folder: {
        title: folder.title,
        version: folder.version,
        icon: folder.icon,
      },
      trades: folderTrades.map((t) => ({
        ...t,
        id: undefined, // Will get new ID on import
        updatedAt: undefined, // Will get fresh timestamp on import
      })),
    };

    const json = JSON.stringify(exportData);
    const compressed = LZString.compressToEncodedURIComponent(json);

    try {
      await navigator.clipboard.writeText(compressed);
      debug.log("exportFolder: copied to clipboard", { folderId, title: folder.title, tradesCount: folderTrades.length });
    } catch (e) {
      debug.error("exportFolder: clipboard write failed", e);
    }
  },

  importFolder: async (compressed: string) => {
    try {
      const json = LZString.decompressFromEncodedURIComponent(compressed);
      if (!json) {
        return { success: false, error: "Invalid import data - decompression failed" };
      }

      const data = JSON.parse(json) as FolderExport;

      // Validate structure
      if (!data.folder || !data.folder.title || !Array.isArray(data.trades)) {
        return { success: false, error: "Invalid import data - missing required fields" };
      }

      // Create the folder
      const { createFolder, createTrade } = get();
      await createFolder({
        title: data.folder.title,
        version: data.folder.version || "2",
        icon: data.folder.icon,
        archivedAt: null,
      });

      // Get the newly created folder (it's the last one)
      const newFolders = get().folders;
      const newFolder = newFolders[newFolders.length - 1];

      if (!newFolder?.id) {
        return { success: false, error: "Failed to create folder" };
      }

      // Create all trades in the new folder
      for (const trade of data.trades) {
        await createTrade(newFolder.id, {
          title: trade.title,
          location: trade.location,
          createdAt: trade.createdAt,
          queryPayload: trade.queryPayload,
          resultCount: trade.resultCount,
          previewImageUrl: trade.previewImageUrl,
        });
      }

      debug.log("importFolder: success", { title: data.folder.title, tradesCount: data.trades.length });
      return { success: true };
    } catch (e) {
      debug.error("importFolder: failed", e);
      return { success: false, error: "Invalid import data - parse error" };
    }
  },

  toggleShowArchived: () => {
    set((state) => ({ showArchived: !state.showArchived }));
  },
}));
