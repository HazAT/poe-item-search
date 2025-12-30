import { create } from "zustand";
import { storageService } from "@/services/storage";

interface SettingsState {
  debugLogging: boolean;
  isLoading: boolean;
  setDebugLogging: (enabled: boolean) => Promise<void>;
  initialize: () => Promise<void>;
}

const SETTINGS_KEY = "settings";

interface SettingsData {
  debugLogging: boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  debugLogging: false,
  isLoading: true,

  setDebugLogging: async (enabled: boolean) => {
    console.log("[PoE Search] [Settings] setDebugLogging:", enabled);
    set({ debugLogging: enabled });
    const current = await storageService.getValue<SettingsData>(SETTINGS_KEY);
    await storageService.setValue(SETTINGS_KEY, { ...current, debugLogging: enabled });
  },

  initialize: async () => {
    // Use regular console.log here since debug utility depends on this store
    console.log("[PoE Search] [Settings] initialize() called");
    try {
      const settings = await storageService.getValue<SettingsData>(SETTINGS_KEY);
      const debugEnabled = settings?.debugLogging ?? false;
      console.log("[PoE Search] [Settings] loaded debugLogging:", debugEnabled);
      set({
        debugLogging: debugEnabled,
        isLoading: false,
      });
    } catch (e) {
      console.error("[PoE Search] [Settings] initialize() error:", e);
      set({ isLoading: false });
    }
  },
}));

// Export a standalone getter for use outside React components
let cachedDebugLogging = false;

export const getDebugLogging = (): boolean => {
  return cachedDebugLogging;
};

// Subscribe to store changes to keep cache updated
useSettingsStore.subscribe((state) => {
  cachedDebugLogging = state.debugLogging;
});
