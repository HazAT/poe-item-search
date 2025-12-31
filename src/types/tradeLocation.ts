// Ported from better-trading

export type TradeSiteVersion = "1" | "2";

export interface TradeLocationStruct {
  version: TradeSiteVersion;
  slug: string | null;
  type: string | null;
  league: string | null;
}

export interface ExactTradeLocationStruct extends TradeLocationStruct {
  isLive: boolean;
}

export interface TradeLocationChangeEvent {
  oldTradeLocation: TradeLocationStruct;
  newTradeLocation: TradeLocationStruct;
}

export interface TradeLocationHistoryStruct extends Required<TradeLocationStruct> {
  id: string;
  title: string;
  createdAt: string;
  queryPayload: TradeSearchQuery;
  resultCount: number;
  source: "extension" | "page";
  previewImageUrl?: string;
}

// The search query payload structure (matches PoE API)
// We store the full payload as-is to preserve all fields including sort
export interface TradeSearchQuery {
  query: {
    term?: string;
    name?: string;
    type?: string;
    status?: { option: string };
    stats?: Array<{
      type: string;
      filters: Array<{
        id: string;
        value?: { min?: number; max?: number; weight?: number };
        disabled?: boolean;
      }>;
      value?: { min?: number };
      disabled?: boolean;
    }>;
    filters?: Record<string, unknown>;
  };
  // Sort can be any field like { price: "asc" } or { "stat.implicit.stat_123": "desc" }
  sort?: Record<string, string>;
}
