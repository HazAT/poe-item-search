// Ported from better-trading - Chrome extension API abstraction

interface StorageArea {
  get(keys: string[] | null, callback: (result: Record<string, unknown>) => void): void;
  set(data: Record<string, unknown>, callback: () => void): void;
  remove(keys: string | string[], callback: () => void): void;
  getBytesInUse(keys: string[] | null, callback: (bytesInUse: number) => void): void;
}

interface SyncStorageArea extends StorageArea {
  QUOTA_BYTES: number;
  QUOTA_BYTES_PER_ITEM: number;
  MAX_ITEMS: number;
}

interface ExtensionApi {
  runtime: {
    getURL(path: string): string;
    sendMessage(query: object, callback: (payload: object | null) => void): void;
    lastError?: { message: string } | null;
  };
  storage: {
    local: StorageArea;
    sync: SyncStorageArea;
  };
}

// Unused but kept for potential future use
export function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== "undefined" && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// Unused but kept for potential future use
export function enableLocalStorageFallback(): void {
  // No-op - we always use localStorage now
}

export const extensionApi = (): ExtensionApi => {
  // Use real Chrome APIs when available, fallback to localStorage for Storybook/tests
  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    return {
      runtime: {
        getURL: chrome.runtime?.getURL?.bind(chrome.runtime) ?? ((path: string) => path),
        sendMessage: chrome.runtime?.sendMessage?.bind(chrome.runtime) ?? ((_query: object, callback: (payload: object | null) => void) => callback(null)),
        lastError: chrome.runtime?.lastError ? { message: chrome.runtime.lastError.message ?? "Unknown error" } : null,
      },
      storage: {
        local: chrome.storage.local,
        sync: chrome.storage.sync as unknown as SyncStorageArea,
      },
    };
  }
  // Fallback for Storybook, tests, or when not in extension context
  return createLocalStorageFallback();
};

function createLocalStorageFallback(): ExtensionApi {
  return {
    runtime: {
      getURL: (path: string) => path,
      sendMessage: (_query: object, callback: (payload: object | null) => void) => callback(null),
      lastError: null,
    },
    storage: {
      local: createLocalStorageMock("poe-search-local"),
      sync: {
        ...createLocalStorageMock("poe-search-sync"),
        QUOTA_BYTES: 102400,
        QUOTA_BYTES_PER_ITEM: 8192,
        MAX_ITEMS: 512,
      },
    },
  };
}

function createLocalStorageMock(prefix: string): StorageArea {
  return {
    get(keys: string[] | null, callback: (result: Record<string, unknown>) => void) {
      const result: Record<string, unknown> = {};
      if (keys === null) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            const cleanKey = key.slice(prefix.length + 1);
            const value = localStorage.getItem(key);
            if (value) {
              try {
                result[cleanKey] = JSON.parse(value);
              } catch {
                result[cleanKey] = value;
              }
            }
          }
        }
      } else {
        keys.forEach((key) => {
          const value = localStorage.getItem(`${prefix}-${key}`);
          if (value) {
            try {
              result[key] = JSON.parse(value);
            } catch {
              result[key] = value;
            }
          }
        });
      }
      callback(result);
    },
    set(data: Record<string, unknown>, callback: () => void) {
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(`${prefix}-${key}`, JSON.stringify(value));
      });
      callback();
    },
    remove(keys: string | string[], callback: () => void) {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach((key) => {
        localStorage.removeItem(`${prefix}-${key}`);
      });
      callback();
    },
    getBytesInUse(_keys: string[] | null, callback: (bytesInUse: number) => void) {
      let bytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            bytes += key.length + value.length;
          }
        }
      }
      callback(bytes);
    },
  };
}

// Declare global types for browser extensions
declare global {
  const browser: ExtensionApi | undefined;
}

/**
 * Get the URL for a resource within the extension.
 * Returns null if not in extension context.
 */
export function getExtensionUrl(path: string): string | null {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  if (typeof browser !== "undefined" && browser?.runtime?.getURL) {
    return browser.runtime.getURL(path);
  }
  // Not in extension context
  return null;
}
