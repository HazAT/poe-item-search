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

export interface TradeItemModMagnitude {
  hash?: string;
  min: string;
  max: string;
}

export interface TradeItemExtendedMod {
  name?: string;
  tier?: string;
  level?: number;
  magnitudes?: TradeItemModMagnitude[];
}

export type TradeItemModType = "explicit" | "implicit" | "fractured" | "desecrated" | "rune" | "enchant" | "crafted" | "mutated";

// Current trade responses put each stat's metadata alongside its description.
// Older responses instead provide string lines plus extended.mods/hashes.
export interface TradeItemStructuredMod {
  description: string;
  domain?: TradeItemModType;
  hash?: string;
  flags?: Partial<Record<"desecrated" | "fractured" | "crafted" | "mutated", boolean>>;
  mods?: TradeItemExtendedMod[];
}

export type TradeItemMod = string | TradeItemStructuredMod;

export interface TradeItemExtended {
  ar?: number; // Armour
  ev?: number; // Evasion
  es?: number; // Energy Shield
  mods?: Partial<Record<TradeItemModType, TradeItemExtendedMod[]>>;
  // Hash entries follow displayed stat order; their indices refer to mods,
  // whose order can differ. A stat can combine multiple mods or have no index.
  hashes?: Partial<Record<TradeItemModType, [string, number[] | null][]>>;
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
  implicitMods?: TradeItemMod[];
  explicitMods?: TradeItemMod[];
  fracturedMods?: TradeItemMod[];
  desecratedMods?: TradeItemMod[];
  mutatedMods?: TradeItemMod[];
  runeMods?: TradeItemMod[];
  enchantMods?: TradeItemMod[];
  craftedMods?: TradeItemMod[];
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
