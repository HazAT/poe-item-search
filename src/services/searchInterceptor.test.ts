import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { useHistoryStore } from "@/stores/historyStore";
import { initSearchInterceptor } from "./searchInterceptor";

const globals = ["window", "localStorage"] as const;
const originalGlobals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const originalAddEntry = useHistoryStore.getState().addEntry;
const addEntry = mock(async () => {});
const values = new Map<string, string>();
let listener: (event: MessageEvent) => Promise<void>;

beforeEach(() => {
  addEntry.mockClear();
  values.clear();
  useHistoryStore.setState({ addEntry });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener: (_type: string, callback: typeof listener) => { listener = callback; } },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => { values.delete(key); },
    },
  });
  initSearchInterceptor();
});

afterEach(() => {
  useHistoryStore.setState({ addEntry: originalAddEntry });
  for (const key of globals) {
    const original = originalGlobals.get(key);
    if (original) Object.defineProperty(globalThis, key, original);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function emit(responseBody: unknown) {
  return listener({
    source: window,
    data: {
      type: "poe-search-intercepted",
      payload: {
        url: "https://www.pathofexile.com/api/trade2/search/poe2/Standard",
        requestBody: { query: { term: "Polcirkeln" } },
        responseBody,
      },
    },
  } as unknown as MessageEvent);
}

test.each([
  { error: { message: "Rate limited" } },
  { id: "", total: 0 },
  { id: "bad-total", total: -1 },
  { id: "bad-total", total: Number.NaN },
  { id: "bad-total", total: "1" },
  null,
])("does not create history from malformed search data %j", async responseBody => {
  await emit(responseBody);
  expect(addEntry).not.toHaveBeenCalled();
});

test("preserves the suppression marker when an invalid response arrives", async () => {
  values.set("poe-search-extension-initiated", Date.now().toString());
  await emit({ error: { message: "Invalid query" } });
  expect(values.has("poe-search-extension-initiated")).toBe(true);
  await emit({ id: "valid-search", total: 0 });
  expect(values.has("poe-search-extension-initiated")).toBe(false);
  expect(addEntry).not.toHaveBeenCalled();
});

test("adds a valid zero-result search with its real slug", async () => {
  await emit({ id: "valid-search", total: 0 });
  expect(addEntry).toHaveBeenCalledWith(
    { version: "2", type: "search", league: "poe2/Standard", slug: "valid-search" },
    "Polcirkeln",
    { query: { term: "Polcirkeln" } },
    0,
    "page",
  );
});
