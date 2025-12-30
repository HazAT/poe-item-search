// Trade location parsing and tracking

import type { TradeLocationStruct, TradeSiteVersion } from "@/types/tradeLocation";

export function parseTradeLocation(url: string): TradeLocationStruct {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // Determine trade version from path
  let version: TradeSiteVersion = "1";
  if (pathname.includes("/trade2/")) {
    version = "2";
  }

  // Parse: /trade[2]/search/league/slug or /trade[2]/search/league
  const tradePattern = version === "2"
    ? /\/trade2\/([^/]+)\/([^/]+)(?:\/([^/]+))?/
    : /\/trade\/([^/]+)\/([^/]+)(?:\/([^/]+))?/;

  const match = pathname.match(tradePattern);

  if (!match) {
    return {
      version,
      type: null,
      league: null,
      slug: null,
    };
  }

  const [, type, league, slug] = match;

  return {
    version,
    type: type || null,
    league: league || null,
    slug: slug || null,
  };
}

export function buildTradeUrl(location: TradeLocationStruct): string {
  const base = "https://www.pathofexile.com";
  const tradePath = location.version === "2" ? "trade2" : "trade";

  if (!location.type || !location.league) {
    return `${base}/${tradePath}`;
  }

  if (!location.slug) {
    return `${base}/${tradePath}/${location.type}/${location.league}`;
  }

  return `${base}/${tradePath}/${location.type}/${location.league}/${location.slug}`;
}

export function compareTradeLocations(
  a: TradeLocationStruct,
  b: TradeLocationStruct
): boolean {
  return (
    a.version === b.version &&
    a.type === b.type &&
    a.league === b.league &&
    a.slug === b.slug
  );
}

export function getCurrentTradeLocation(): TradeLocationStruct {
  return parseTradeLocation(window.location.href);
}
