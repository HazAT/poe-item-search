import { create } from "zustand";

interface SyncStoreState {
  // UI state
  hasNewData: boolean;
  lastSyncAt: number | null;
  isSyncing: boolean;

  // Actions
  setHasNewData: (hasNew: boolean) => void;
  setLastSyncAt: (timestamp: number) => void;
  setSyncing: (syncing: boolean) => void;
  clearNewDataIndicator: () => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  hasNewData: false,
  lastSyncAt: null,
  isSyncing: false,

  setHasNewData: (hasNew) => set({ hasNewData: hasNew }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  clearNewDataIndicator: () => set({ hasNewData: false }),
}));
