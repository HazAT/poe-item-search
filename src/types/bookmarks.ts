// Ported from better-trading

import type { TradeSiteVersion } from "./tradeLocation";

export interface BookmarksTradeLocation {
  version: TradeSiteVersion;
  type: string;
  slug: string;
}

export interface BookmarksTradeStruct {
  id?: string;
  title: string;
  location: BookmarksTradeLocation;
  completedAt: string | null;
}

export interface BookmarksFolderStruct {
  id?: string;
  title: string;
  version: TradeSiteVersion;
  icon: string | null;
  archivedAt: string | null;
}
