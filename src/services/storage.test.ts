import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { extensionApi } from "@/utils/extensionApi";
import { StorageService } from "./storage";

const globals = ["chrome", "window", "localStorage"] as const;
const originalGlobals = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));

beforeEach(() => {
  const values = new Map<string, string>();
  const localStorage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "chrome", { configurable: true, value: undefined });
});

afterEach(() => {
  for (const key of globals) {
    const original = originalGlobals.get(key);
    if (original) Object.defineProperty(globalThis, key, original);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function connectStorageEvents(backend: string) {
  type ChromeListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;
  type LocalStorageListener = (event: { key: string }) => void | Promise<void>;
  const chromeListeners: ChromeListener[] = [];
  const localStorageListeners: LocalStorageListener[] = [];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: (_type: string, listener: LocalStorageListener) => { localStorageListeners.push(listener); },
    },
  });

  if (backend === "chrome") {
    const api = extensionApi();
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        runtime: {},
        storage: {
          ...api.storage,
          onChanged: {
            addListener: (listener: ChromeListener) => { chromeListeners.push(listener); },
          },
        },
      },
    });
  }

  return {
    emit: (key: string, area: "local" | "sync") => {
      if (backend === "chrome") chromeListeners.forEach((listener) => listener({ [key]: { newValue: {} } }, area));
      else localStorageListeners.forEach((listener) => { void listener({ key: `poe-search-${area}-${key}` }); });
    },
    emitSyncPreference: async () => {
      await Promise.all(localStorageListeners.map((listener) => listener({ key: "poe-search-sync-enabled" })));
    },
  };
}

describe.each(["chrome", "fallback"])("storage change notifications (%s)", (backend) => {
  test("notifies exact and prefix subscribers for local changes", async () => {
    const { emit } = connectStorageEvents(backend);
    const storage = new StorageService();
    await storage.initialize();
    const exact = mock(() => {});
    const prefix = mock(() => {});
    const unsubscribe = storage.onKeyChange("bookmark-trades-folder", exact);
    storage.onKeyPrefixChange("bookmark-trades", prefix);

    emit("poe-search-bookmark-trades-folder", "sync");
    emit("another-extension-bookmark-trades-folder", "local");
    expect(exact).not.toHaveBeenCalled();
    expect(prefix).not.toHaveBeenCalled();

    emit("poe-search-bookmark-trades-folder", "local");
    expect(exact).toHaveBeenCalledTimes(1);
    expect(prefix).toHaveBeenCalledTimes(1);

    unsubscribe();
    emit("poe-search-bookmark-trades-folder", "local");
    expect(exact).toHaveBeenCalledTimes(1);
    expect(prefix).toHaveBeenCalledTimes(2);
  });

  test("uses each key's storage area when sync is enabled", async () => {
    const { emit } = connectStorageEvents(backend);
    localStorage.setItem("poe-search-sync-enabled", "true");
    const storage = new StorageService();
    await storage.initialize();
    const history = mock(() => {});
    const expanded = mock(() => {});
    storage.onKeyChange("trade-history", history);
    storage.onKeyChange("expanded-folders", expanded);

    emit("poe-search-trade-history", "local");
    emit("poe-search-expanded-folders", "sync");
    expect(history).not.toHaveBeenCalled();
    expect(expanded).not.toHaveBeenCalled();

    emit("poe-search-trade-history", "sync");
    emit("poe-search-expanded-folders", "local");
    expect(history).toHaveBeenCalledTimes(1);
    expect(expanded).toHaveBeenCalledTimes(1);
  });

  test("adopts sync toggles from another tab without repeating migration", async () => {
    const { emitSyncPreference } = connectStorageEvents(backend);
    const source = new StorageService();
    const receiver = new StorageService();
    await Promise.all([source.initialize(), receiver.initialize()]);
    const historyChanged = mock(() => {});
    const tradesChanged = mock(() => {});
    const syncChanged = mock(() => {});
    receiver.onKeyChange("trade-history", historyChanged);
    receiver.onKeyPrefixChange("bookmark-trades", tradesChanged);
    receiver.subscribe(syncChanged);

    await source.setValue("trade-history", ["local history"]);
    expect(await source.setSyncEnabled(true)).toEqual({ success: true });
    await source.setValue("trade-history", ["new history after migration"]);
    await emitSyncPreference();

    expect(receiver.syncEnabled).toBe(true);
    expect(receiver.syncQuotaInfo).not.toBeNull();
    expect(await receiver.getValue<string[]>("trade-history")).toEqual(["new history after migration"]);
    expect(historyChanged).toHaveBeenCalledTimes(1);
    expect(tradesChanged).toHaveBeenCalledTimes(1);
    expect(syncChanged).toHaveBeenCalled();

    await receiver.setValue("trade-history", ["written by receiver to sync"]);
    expect(await source.getValue<string[]>("trade-history")).toEqual(["written by receiver to sync"]);

    expect(await source.setSyncEnabled(false)).toEqual({ success: true });
    await source.setValue("trade-history", ["new local history after migration"]);
    await emitSyncPreference();

    expect(receiver.syncEnabled).toBe(false);
    expect(receiver.syncQuotaInfo).toBeNull();
    expect(await receiver.getValue<string[]>("trade-history")).toEqual(["new local history after migration"]);
    expect(historyChanged).toHaveBeenCalledTimes(2);
    expect(tradesChanged).toHaveBeenCalledTimes(2);

    await receiver.setValue("trade-history", ["written by receiver to local"]);
    expect(await source.getValue<string[]>("trade-history")).toEqual(["written by receiver to local"]);
    await emitSyncPreference();
    expect(historyChanged).toHaveBeenCalledTimes(2);
    expect(tradesChanged).toHaveBeenCalledTimes(2);
  });
});
