import { create } from "zustand";
import { storageService } from "@/services/storage";
import { debug } from "@/utils/debug";

type TabType = "history" | "bookmarks";

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

export const usePanelStore = create<PanelState>((set, get) => ({
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
    // Prevent re-initialization
    if (!get().isLoading) {
      debug.log("[Panel] initialize() skipped - already initialized");
      return;
    }
    debug.log("[Panel] initialize() called");
    const [collapsed, activeTab] = await Promise.all([
      storageService.getValue<boolean>(COLLAPSED_KEY),
      storageService.getValue<TabType>(ACTIVE_TAB_KEY),
    ]);

    debug.log(`[Panel] initialize() loaded - collapsed: ${collapsed}, activeTab: ${activeTab}`);
    set({
      isCollapsed: collapsed ?? false,
      activeTab: activeTab ?? "history",
      isLoading: false,
    });
    debug.log("[Panel] initialize() complete");
  },
}));
