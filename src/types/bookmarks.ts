// Ported from better-trading

import type { TradeSiteVersion, TradeSearchQuery } from "./tradeLocation";

export interface BookmarksTradeLocation {
  version: TradeSiteVersion;
  type: string;
  league: string;
  slug: string;
}

export interface BookmarksTradeStruct {
  id?: string;
  title: string;
  location: BookmarksTradeLocation;
  // These fields are optional for backwards compatibility with legacy bookmarks
  createdAt?: string;
  queryPayload?: TradeSearchQuery;
  resultCount?: number;
  previewImageUrl?: string;
  updatedAt?: number;  // Unix timestamp (ms) for sync
}

export interface BookmarksFolderStruct {
  id?: string;
  title: string;
  version: TradeSiteVersion;
  icon: string | null;
  archivedAt: string | null;
  updatedAt?: number;  // Unix timestamp (ms) for sync
}


