/**
 * Types for PoE Trade API item responses.
 * Based on /api/trade2/fetch/{item_id} response structure.
 */

export interface TradeItemProperty {
  name: string;
  values: [string, number][]; // [value, augmented_flag] - augmented_flag 1 = (augmented)
  displayMode: number;
  type?: number;
}

export interface TradeItemRequirement {
  name: string;
  values: [string, number][];
  displayMode: number;
  type?: number;
}

export interface TradeItemSocket {
  group: number;
  attr?: string; // Socket attribute (S for skill, etc.)
}

export interface TradeItemExtendedMod {
  name: string;
  tier: string;
  level: number;
  magnitudes: {
    hash: string;
    min: string;
    max: string;
  }[];
}

export interface TradeItemExtended {
  ar?: number; // Armour
  ev?: number; // Evasion
  es?: number; // Energy Shield
  mods?: {
    explicit?: TradeItemExtendedMod[];
    implicit?: TradeItemExtendedMod[];
    fractured?: TradeItemExtendedMod[];
    desecrated?: TradeItemExtendedMod[];
    rune?: TradeItemExtendedMod[];
    enchant?: TradeItemExtendedMod[];
  };
  hashes?: {
    explicit?: [string, number[]][];
    implicit?: [string, number[]][];
  };
}

export interface TradeItem {
  id: string;
  realm: string;
  verified: boolean;
  w: number; // width
  h: number; // height
  icon: string;
  league: string;
  name: string;
  typeLine: string;
  baseType: string;
  rarity: "Normal" | "Magic" | "Rare" | "Unique";
  frameType: number; // 0=Normal, 1=Magic, 2=Rare, 3=Unique
  ilvl: number;
  identified: boolean;
  corrupted?: boolean;
  note?: string; // Price note (e.g., "~b/o 1 exalted")
  properties?: TradeItemProperty[];
  requirements?: TradeItemRequirement[];
  sockets?: TradeItemSocket[];
  socketedItems?: unknown[];
  implicitMods?: string[];
  explicitMods?: string[];
  fracturedMods?: string[];
  desecratedMods?: string[];
  mutatedMods?: string[];
  runeMods?: string[];
  enchantMods?: string[];
  craftedMods?: string[];
  fractured?: boolean;
  desecrated?: boolean;
  mutated?: boolean;
  flavourText?: string[];
  extended?: TradeItemExtended;
}

export interface TradeItemListing {
  method: string;
  indexed: string;
  stash: {
    name: string;
    x: number;
    y: number;
  };
  whisper: string;
  whisper_token: string;
  account: {
    name: string;
    online?: {
      league: string;
      status?: string;
    };
    lastCharacterName: string;
    language: string;
    realm: string;
  };
  price?: {
    type: string;
    amount: number;
    currency: string;
  };
}

export interface TradeItemResult {
  id: string;
  listing: TradeItemListing;
  item: TradeItem;
}

export interface TradeFetchResponse {
  result: TradeItemResult[];
}
