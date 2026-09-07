import type { ReactNode } from "react";
import { fn } from "storybook/test";
import { storageService } from "../../src/services/storage";
import { useHistoryStore } from "../../src/stores/historyStore";
import { useBookmarksStore } from "../../src/stores/bookmarksStore";
import { setStoryTradeLocation } from "./tradeLocation.mock";
import type { TradeLocationHistoryStruct, TradeLocationStruct } from "../../src/types/tradeLocation";
import type { BookmarksFolderStruct, BookmarksTradeStruct } from "../../src/types/bookmarks";

export interface TradeStoryData {
  entries?: TradeLocationHistoryStruct[];
  folders?: BookmarksFolderStruct[];
  trades?: Record<string, BookmarksTradeStruct[]>;
  expandedFolders?: string[];
  showArchived?: boolean;
  executingId?: string | null;
  activeSearch?: boolean;
  currentLocation?: TradeLocationStruct;
  historyInitiallyEmpty?: boolean;
}

function trackActions<T extends object>(state: T, pending: Set<Promise<unknown>>): T {
  return Object.fromEntries(Object.entries(state).map(([key, value]) => [
    key,
    typeof value !== "function" ? value : (...args: unknown[]) => {
      const result: unknown = value(...args);
      if (result instanceof Promise) {
        pending.add(result);
        void result.then(() => pending.delete(result), () => pending.delete(result));
      }
      return result;
    },
  ])) as T;
}

// Storybook awaits this cleanup before starting the next story.
export function setupTradeStory(data: TradeStoryData) {
  const historyState = useHistoryStore.getState();
  const bookmarkState = useBookmarksStore.getState();
  const pendingActions = new Set<Promise<unknown>>();
  const originalStorage = {
    getValue: storageService.getValue,
    setValue: storageService.setValue,
    deleteValue: storageService.deleteValue,
  };
  const values = new Map<string, unknown>([
    ["trade-history", structuredClone(data.entries ?? [])],
    ["bookmark-folders", structuredClone(data.folders ?? [])],
    ["expanded-folders", data.expandedFolders ?? []],
    ...Object.entries(data.trades ?? {}).map(([id, trades]): [string, unknown] =>
      [`bookmark-trades-${id}`, structuredClone(trades)]
    ),
  ]);
  storageService.getValue = async <T,>(key: string) => structuredClone(values.get(key) ?? null) as T | null;
  storageService.setValue = async (key, value) => { values.set(key, structuredClone(value)); };
  storageService.deleteValue = async (key) => { values.delete(key); };
  const restoreLocation = setStoryTradeLocation(data.currentLocation ?? {
    version: "2", type: "search", league: "poe2/Standard", slug: data.activeSearch ? "story-search" : null,
  });

  useHistoryStore.setState({
    ...trackActions(useHistoryStore.getInitialState(), pendingActions),
    entries: data.historyInitiallyEmpty ? [] : structuredClone(data.entries ?? []),
    // Let HistoryTab finish its real mount-time fetch before exposing action targets.
    isLoading: true,
    isExecuting: data.executingId ?? null,
    executeSearch: fn(async (id: string) => { useHistoryStore.setState({ isExecuting: id }); }),
  }, true);
  useBookmarksStore.setState({
    ...trackActions(useBookmarksStore.getInitialState(), pendingActions),
    folders: structuredClone(data.folders ?? []),
    trades: structuredClone(data.trades ?? {}),
    expandedFolders: data.expandedFolders ?? [],
    showArchived: data.showArchived ?? false,
    hasFetched: true,
    executeSearch: fn(async (_folderId: string, id: string) => { useBookmarksStore.setState({ isExecuting: id }); }),
  }, true);

  return async () => {
    while (pendingActions.size) await Promise.allSettled([...pendingActions]);
    Object.assign(storageService, originalStorage);
    useHistoryStore.setState(historyState, true);
    useBookmarksStore.setState(bookmarkState, true);
    restoreLocation();
  };
}

export function TradeStoryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="w-panel h-[500px] bg-poe-black border border-poe-gray overflow-hidden flex flex-col">
      {children}
    </div>
  );
}
