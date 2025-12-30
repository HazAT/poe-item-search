// Ported from better-trading - Storage service for Chrome extension

import { extensionApi } from "@/utils/extensionApi";

interface StoragePayload<T> {
  value: T;
  expiresAt: string | null;
}

class StorageService {
  private prefix = "poe-search-";

  async getValue<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      extensionApi().storage.local.get([this.formatKey(key)], (result) => {
        const payload = result[this.formatKey(key)] as StoragePayload<T> | undefined;
        if (!payload) {
          resolve(null);
          return;
        }
        if (payload.expiresAt) {
          const expired = new Date(payload.expiresAt).getTime() < Date.now();
          if (expired) {
            resolve(null);
            return;
          }
        }
        resolve(payload.value);
      });
    });
  }

  async setValue<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload: StoragePayload<T> = { value, expiresAt: null };
      extensionApi().storage.local.set({ [this.formatKey(key)]: payload }, () => {
        const lastError = extensionApi().runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async setEphemeralValue<T>(key: string, value: T, expirationDate: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload: StoragePayload<T> = {
        value,
        expiresAt: expirationDate.toUTCString(),
      };
      extensionApi().storage.local.set({ [this.formatKey(key)]: payload }, () => {
        const lastError = extensionApi().runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async deleteValue(key: string): Promise<void> {
    return new Promise((resolve) => {
      extensionApi().storage.local.remove(this.formatKey(key), resolve);
    });
  }

  private formatKey(key: string): string {
    return `${this.prefix}${key.toLowerCase()}`;
  }
}

export const storageService = new StorageService();
