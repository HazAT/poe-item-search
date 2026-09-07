import { getSearchQuery } from "@/item.js";
import { buildTradeApiUrl, buildTradeUrl, parseTradeLocation } from "./tradeLocation";
import { logger } from "./sentry";
import { debug } from "@/utils/debug";
import type { TradeLocationStruct, TradeSearchQuery } from "@/types/tradeLocation";

const EXTENSION_SEARCH_KEY = "poe-search-extension-initiated";

interface SearchDependencies {
  request?: (url: string, init?: RequestInit) => Promise<Response>;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

export interface ItemSearchResult {
  location: TradeLocationStruct;
  url: string;
  title: string;
  queryPayload: TradeSearchQuery;
  total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readApiResponse(response: Response, action: string): Promise<Record<string, unknown>> {
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new Error(retryAfter > 0 && Number.isFinite(retryAfter)
      ? `Too many requests. Try again in ${Math.ceil(retryAfter)} seconds.`
      : "Too many requests. Please wait and try again.");
  }

  const data: unknown = await response.json().catch(() => null);
  const apiError = isRecord(data) && isRecord(data.error) ? data.error.message : undefined;
  if (!response.ok) {
    throw new Error(typeof apiError === "string"
      ? `${action}: ${apiError}`
      : `${action} (HTTP ${response.status}).`);
  }
  if (typeof apiError === "string") throw new Error(`${action}: ${apiError}`);
  if (!isRecord(data)) throw new Error(`${action}: invalid response from the trade API.`);
  return data;
}

function readStatus(storage: NonNullable<SearchDependencies["storage"]>, tradeVersion: string): string | undefined {
  const stateKey = `lscache-${tradeVersion}state`;
  try {
    const stateJson = storage.getItem(stateKey);
    if (stateJson) {
      const state: unknown = JSON.parse(stateJson);
      const userStatus = isRecord(state) && typeof state.status === "string" ? state.status : undefined;
      debug.log("PasteInput", "read user status preference", { stateKey, userStatus });
      return userStatus || undefined;
    }
  } catch (error) {
    debug.error("PasteInput", "failed to read status from localStorage", error);
  }
}

function extractItemTitle(itemText: string): string {
  const lines = itemText.trim().split("\n").slice(0, 6);
  return lines.map((line) => line.trim()).find((line) =>
    line && !line.startsWith("Item Class:") && !line.startsWith("Rarity:") && line !== "--------"
  ) ?? "Unknown Item";
}

export async function searchItem(
  itemText: string,
  currentUrl: string,
  { request = fetch, storage = localStorage }: SearchDependencies = {},
): Promise<ItemSearchResult> {
  const location = parseTradeLocation(currentUrl);
  const tradeVersion = location.version === "2" ? "trade2" : "trade";
  const searchLocation: TradeLocationStruct = {
    ...location,
    type: "search",
    league: location.league ?? (location.version === "2" ? "poe2/Standard" : "Standard"),
    slug: null,
  };

  // Base64 preserves pasted item newlines when copying diagnostics from Sentry.
  const itemDetails = {
    itemText,
    itemTextBase64: btoa(unescape(encodeURIComponent(itemText))),
    itemLength: itemText.length,
  };
  logger.info("Item pasted for search", itemDetails);

  const statsResponse = await request(`https://www.pathofexile.com/api/${tradeVersion}/data/stats`);
  const stats = await readApiResponse(statsResponse, "Could not load trade stats");
  if (!Array.isArray(stats.result)) throw new Error("Could not load trade stats: invalid response from the trade API.");
  const query = getSearchQuery(itemText, stats) as TradeSearchQuery["query"];

  if (!query.term && !query.filters && !query.stats?.length) {
    logger.warn("Item pasted with no filters applied", itemDetails);
    debug.warn("PasteInput", "no filters applied to search query", { query, itemText });
  }

  const status = readStatus(storage, tradeVersion);
  if (status) query.status = { option: status };
  const queryPayload = { query };

  // The interceptor skips this request because PasteInput records its history.
  storage.setItem(EXTENSION_SEARCH_KEY, Date.now().toString());
  let result: Record<string, unknown>;
  try {
    const response = await request(buildTradeApiUrl(searchLocation), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryPayload),
    });
    result = await readApiResponse(response, "Search failed");
    if (typeof result.id !== "string" || !result.id) {
      throw new Error("Search failed: the trade API did not return a search ID.");
    }
  } catch (error) {
    // A failed request must not cause the next manual search to be skipped.
    storage.removeItem(EXTENSION_SEARCH_KEY);
    throw error;
  }

  const resultLocation = { ...searchLocation, slug: result.id as string };
  return {
    location: resultLocation,
    url: buildTradeUrl(resultLocation),
    title: extractItemTitle(itemText),
    queryPayload,
    total: typeof result.total === "number" ? result.total : 0,
  };
}
