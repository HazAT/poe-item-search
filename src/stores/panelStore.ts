import { create } from "zustand";
import { storageService } from "@/services/storage";

type TabType = "history" | "bookmarks" | "pinned";

interface PanelState {
  isCollapsed: boolean;
  activeTab: TabType;
  isLoading: boolean;
  toggleCollapsed: () => void;
  setActiveTab: (tab: TabType) => void;
  initialize: () => Promise<void>;
}

const COLLAPSED_KEY = "panel-collapsed";
const ACTIVE_TAB_KEY = "panel-active-tab";

export const usePanelStore = create<PanelState>((set) => ({
  isCollapsed: false,
  activeTab: "history",
  isLoading: true,

  toggleCollapsed: async () => {
    set((state) => {
      const newCollapsed = !state.isCollapsed;
      storageService.setValue(COLLAPSED_KEY, newCollapsed);
      return { isCollapsed: newCollapsed };
    });
  },

  setActiveTab: async (tab: TabType) => {
    set({ activeTab: tab });
    await storageService.setValue(ACTIVE_TAB_KEY, tab);
  },

  initialize: async () => {
    const [collapsed, activeTab] = await Promise.all([
      storageService.getValue<boolean>(COLLAPSED_KEY),
      storageService.getValue<TabType>(ACTIVE_TAB_KEY),
    ]);

    set({
      isCollapsed: collapsed ?? false,
      activeTab: activeTab ?? "history",
      isLoading: false,
    });
  },
}));
