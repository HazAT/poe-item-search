import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";

const SEARCH_URL = "https://www.pathofexile.com/api/trade2/search/poe2/Standard";
const globals = ["window", "document", "localStorage", "XMLHttpRequest", "MutationObserver", "CSS"] as const;
const originalGlobals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const messages: Array<{ type: string; payload?: unknown }> = [];
const responses: Response[] = [];
const images = new Map<string, { src: string }>();
const values = new Map<string, string>();
const requests: Array<Parameters<typeof fetch>> = [];
const preconnect = mock(() => {});
const originalFetch = Object.assign(async (...args: Parameters<typeof fetch>) => {
  requests.push(args);
  const response = responses.shift();
  if (!response) throw new Error("Unexpected fetch");
  return response;
}, { preconnect });

class TestObserver {
  static instances: TestObserver[] = [];
  active = false;
  constructor(private callback: MutationCallback) { TestObserver.instances.push(this); }
  observe() { this.active = true; }
  disconnect() { this.active = false; }
  notify() {
    if (this.active) this.callback([], this as unknown as MutationObserver);
  }
}

class TestXHR {
  status = 200;
  responseText = "";
  private listeners: Array<() => void> = [];
  open(_method: string, _url: string | URL) {}
  send(_body?: unknown) {}
  addEventListener(_type: string, listener: () => void) { this.listeners.push(listener); }
  respond(body: unknown, status = 200) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.listeners.forEach(listener => listener());
  }
}

beforeAll(async () => {
  const fakeGlobals = {
    window: { fetch: originalFetch, postMessage: (message: typeof messages[number]) => messages.push(message), addEventListener: () => {} },
    document: {
      readyState: "loading",
      addEventListener: () => {},
      querySelector: (selector: string) => {
        if (selector === ".results") return {};
        if (selector === ".results .row[data-id] img") return images.values().next().value ?? null;
        const id = selector.match(/data-id="([^"]+)"/)?.[1];
        return id ? images.get(id) ?? null : null;
      },
    },
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
    XMLHttpRequest: TestXHR,
    MutationObserver: TestObserver,
    CSS: { escape: (value: string) => value },
  };
  for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, value: fakeGlobals[key] });
  await import("./interceptor");
});

beforeEach(() => {
  messages.length = 0;
  requests.length = 0;
  responses.length = 0;
  images.clear();
  values.clear();
});

afterAll(() => {
  TestObserver.instances.forEach(observer => observer.disconnect());
  for (const key of globals) {
    const original = originalGlobals.get(key);
    if (original) Object.defineProperty(globalThis, key, original);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function posted(type: string) { return messages.filter(message => message.type === type); }

describe.each(["fetch", "XHR"])("search interception via %s", transport => {
  async function send(body: unknown, status = 200) {
    if (transport === "fetch") {
      responses.push(Response.json(body, { status }));
      const response = await window.fetch(SEARCH_URL, { method: "POST", body: '{"query":{}}' });
      expect(await response.json()).toEqual(body);
    } else {
      const xhr = new TestXHR();
      xhr.open("POST", SEARCH_URL);
      xhr.send('{"query":{}}');
      xhr.respond(body, status);
    }
  }

  test.each([
    [429, { error: { message: "Rate limited" } }],
    [500, { id: "failed-search", total: 1 }],
    [200, { error: { message: "Invalid query" } }],
    [200, { id: "", total: 0 }],
    [200, { id: "bad-total", total: -1 }],
    [200, { id: "bad-total", total: "1" }],
    [200, null],
  ])("does not publish failed or malformed response %j", async (status, body) => {
    images.set("old-item", { src: "old.png" });
    await send(body, status);
    expect(posted("poe-search-intercepted")).toHaveLength(0);
    expect(posted("poe-search-preview-image")).toHaveLength(0);
  });

  test("records a valid zero-result search without copying an old preview", async () => {
    images.set("old-item", { src: "old.png" });
    await send({ id: "empty-search", total: 0, result: [] });
    expect(posted("poe-search-intercepted")).toHaveLength(1);
    expect(posted("poe-search-preview-image")).toHaveLength(0);
  });

  test("waits for the first item from this response before capturing its preview", async () => {
    images.set("old-item", { src: "old.png" });
    await send({ id: "new-search", total: 1, result: ["new-item"] });
    expect(posted("poe-search-preview-image")).toHaveLength(0);
    images.set("new-item", { src: "new.png" });
    TestObserver.instances.forEach(observer => observer.notify());
    expect(posted("poe-search-preview-image")).toEqual([
      { type: "poe-search-preview-image", payload: { slug: "new-search", imageUrl: "new.png" } },
    ]);
  });
});

test("keeps fetch properties and unrelated requests intact", async () => {
  expect(window.fetch.preconnect).toBe(preconnect);
  const response = Response.json({ ok: true });
  responses.push(response);
  const request = new Request("https://www.pathofexile.com/other");
  expect(await window.fetch(request)).toBe(response);
  expect(requests).toEqual([[request]]);
  expect(posted("poe-search-intercepted")).toHaveLength(0);
});
