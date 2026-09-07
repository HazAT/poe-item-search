import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { storageService } from "@/services/storage";
import { useBookmarksStore } from "./bookmarksStore";
import type { BookmarksTradeStruct } from "@/types/bookmarks";

afterEach(() => {
  useBookmarksStore.setState(useBookmarksStore.getInitialState(), true);
});

describe("bookmarksStore", () => {
  test.each([false, true])("preserves existing bookmarks when adding to a folder (loaded: %s)", async (loaded) => {
    const existingTrade: BookmarksTradeStruct = {
      id: "existing",
      title: "Saved ring search",
      location: { version: "2", type: "search", league: "Standard", slug: "old-search" },
    };
    const stored = new Map<string, unknown>([["bookmark-trades-folder", [existingTrade]]]);
    const read = spyOn(storageService, "getValue").mockImplementation(async <T>(key: string) => {
      return (stored.get(key) as T | undefined) ?? null;
    });
    const write = spyOn(storageService, "setValue").mockImplementation(async (key, value) => {
      stored.set(key, value);
    });
    useBookmarksStore.setState({ trades: loaded ? { folder: [existingTrade] } : {} });

    try {
      await useBookmarksStore.getState().createTrade("folder", {
        title: "New ring search",
        location: { version: "2", type: "search", league: "Standard", slug: "new-search" },
      });

      const saved = stored.get("bookmark-trades-folder") as BookmarksTradeStruct[];
      expect(saved.map((trade) => trade.title)).toEqual(["Saved ring search", "New ring search"]);
      expect(saved[0]).toEqual(existingTrade);
      expect(useBookmarksStore.getState().trades.folder).toEqual(saved);
    } finally {
      read.mockRestore();
      write.mockRestore();
    }
  });
});
