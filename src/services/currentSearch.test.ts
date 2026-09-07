import { describe, expect, test } from "bun:test";
import { gzipSync } from "node:zlib";
import { findCurrentHistoryEntry } from "./currentSearch";
import fixture from "../../tests/fixtures/compressed-search.json";
import type { TradeLocationHistoryStruct, TradeLocationStruct } from "@/types/tradeLocation";

const location: TradeLocationStruct = { version: "2", type: "search", league: "poe2/Standard", slug: fixture.pageSlug };
const entry: TradeLocationHistoryStruct = {
  ...location, slug: fixture.historySlug, id: "pasted-item", title: "Miracle Guardian",
  createdAt: "2026-09-07T00:00:00Z", queryPayload: { query: fixture.query }, resultCount: 0, source: "extension",
};
const compress = (query: unknown) => gzipSync(JSON.stringify(query)).toString("base64url");

describe("findCurrentHistoryEntry", () => {
  test("matches the different gzip IDs captured from the same live pasted search without changing history", async () => {
    expect(fixture.pageSlug).not.toBe(fixture.historySlug);
    const entries = [entry];
    expect(await findCurrentHistoryEntry(location, entries)).toBe(entry);
    expect(entries).toEqual([entry]);
  });

  test("ignores object key order but preserves the actual query", async () => {
    const reordered = Object.fromEntries(Object.entries(fixture.query).reverse());
    expect(await findCurrentHistoryEntry({ ...location, slug: compress(reordered) }, [entry])).toBe(entry);
  });

  test("matches the replay ID after numeric strings and disabled:false are normalized", async () => {
    expect(await findCurrentHistoryEntry({ ...location, slug: fixture.replaySlug }, [entry])).toBe(entry);
  });

  test("only normalizes numeric filter values, not IDs or search terms", async () => {
    const stored = { ...entry, slug: compress({ term: "30", stats: [{ type: "and", filters: [] }] }) };
    expect(await findCurrentHistoryEntry({ ...location, slug: compress({ term: 30, stats: [{ type: "and", filters: [] }] }) }, [stored])).toBeNull();
  });

  test.each(["status", "minimum", "weight", "disabled", "order"])("does not match a changed %s", async change => {
    const query = structuredClone(fixture.query);
    if (change === "status") query.status.option = "online";
    if (change === "minimum") query.stats[0].filters[0].value.min = 31;
    if (change === "weight") Object.assign(query.stats[1].filters[0].value, { weight: 2 });
    if (change === "disabled") Object.assign(query.stats[1].filters[2], { disabled: false });
    if (change === "order") query.stats.reverse();
    expect(await findCurrentHistoryEntry({ ...location, slug: compress(query) }, [entry])).toBeNull();
  });

  test.each([
    { version: "1" as const }, { league: "poe2/Hardcore" }, { type: "exchange" },
  ])("scopes exact and compressed slug matches to the trade location: %j", async difference => {
    expect(await findCurrentHistoryEntry(location, [{ ...entry, ...difference }])).toBeNull();
    expect(await findCurrentHistoryEntry(location, [{ ...entry, ...difference, slug: location.slug }])).toBeNull();
  });

  test("matches encoded league names without mixing realms", async () => {
    const current = { ...location, league: "poe2/Fate%20of%20the%20Vaal" };
    const matching = { ...entry, league: "poe2/Fate of the Vaal" };
    expect(await findCurrentHistoryEntry(current, [{ ...matching, league: "xbox/Fate of the Vaal" }, matching])).toBe(matching);
  });

  test("matches ordinary server IDs and chooses the newest matching entry", async () => {
    const newest = { ...entry, slug: "server-id" };
    expect(await findCurrentHistoryEntry({ ...location, slug: "server-id" }, [newest, { ...newest, id: "older" }])).toBe(newest);
  });

  test.each(["unknown-server-id", "H4sIinvalid", "%invalid", compress(null), compress([])])("does not fall back to unrelated history for %s", async slug => {
    expect(await findCurrentHistoryEntry({ ...location, slug }, [entry])).toBeNull();
  });

  test("returns no match until persisted history is loaded", async () => {
    expect(await findCurrentHistoryEntry(location, [])).toBeNull();
  });
});
