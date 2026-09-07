import type { TradeLocationHistoryStruct, TradeLocationStruct } from "@/types/tradeLocation";

export interface CurrentSearch {
  location: TradeLocationStruct;
  historyEntry: TradeLocationHistoryStruct | null;
}

function decodeLeague(league: string | null): string | null {
  try {
    return league && decodeURIComponent(league);
  } catch {
    return league;
  }
}

async function decodeSearchSlug(slug: string): Promise<string | null> {
  try {
    const encoded = decodeURIComponent(slug);
    if (!encoded.startsWith("H4sI")) return null;
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")), char => char.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const query: unknown = JSON.parse(await new Response(stream).text());
    if (!query || typeof query !== "object" || Array.isArray(query)) return null;

    // The trade page rewrites gzip headers, object order, numeric strings and
    // disabled:false defaults. Preserve array order and actual filter values.
    return JSON.stringify(query, (key: string, value: unknown) => {
      if (key === "disabled" && value === false) return undefined;
      if (["min", "max", "weight"].includes(key) && typeof value === "string" && /^[+-]?\d+(?:\.\d+)?$/.test(value)) {
        const number = Number(value);
        if (Number.isFinite(number)) return number;
      }
      return value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
        : value;
    });
  } catch {
    return null;
  }
}

export async function findCurrentHistoryEntry(
  location: TradeLocationStruct,
  entries: TradeLocationHistoryStruct[],
): Promise<TradeLocationHistoryStruct | null> {
  if (!location.slug || !location.league || location.type !== "search") return null;
  const candidates = entries.filter(entry =>
    entry.version === location.version && entry.type === location.type &&
    decodeLeague(entry.league) === decodeLeague(location.league) && entry.queryPayload
  );
  const exact = candidates.find(entry => entry.slug === location.slug);
  if (exact) return exact;

  const currentQuery = await decodeSearchSlug(location.slug);
  if (!currentQuery) return null;
  for (const entry of candidates) {
    if (entry.slug && await decodeSearchSlug(entry.slug) === currentQuery) return entry;
  }
  return null;
}
