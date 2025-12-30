import { create } from "zustand";
import { storageService } from "@/services/storage";
import { uniqueId } from "@/utils/uniqueId";
import type { PinnedItemStruct } from "@/types/pinned";

const PINNED_KEY = "pinned-items";

interface PinnedState {
  items: PinnedItemStruct[];
  isLoading: boolean;

  fetchItems: () => Promise<void>;
  clearItems: () => Promise<void>;
  addItem: (title: string, elementSelector: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  scrollToItem: (id: string) => void;
}

export const usePinnedStore = create<PinnedState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchItems: async () => {
    set({ isLoading: true });
    const items =
      (await storageService.getValue<PinnedItemStruct[]>(PINNED_KEY)) ?? [];
    set({ items, isLoading: false });
  },

  clearItems: async () => {
    await storageService.deleteValue(PINNED_KEY);
    set({ items: [] });
  },

  addItem: async (title: string, elementSelector: string) => {
    const { items } = get();
    const newItem: PinnedItemStruct = {
      id: uniqueId(),
      title,
      elementSelector,
      createdAt: new Date().toISOString(),
    };
    const newItems = [...items, newItem];
    await storageService.setValue(PINNED_KEY, newItems);
    set({ items: newItems });
  },

  deleteItem: async (id: string) => {
    const { items } = get();
    const newItems = items.filter((item) => item.id !== id);
    await storageService.setValue(PINNED_KEY, newItems);
    set({ items: newItems });
  },

  scrollToItem: (id: string) => {
    const { items } = get();
    const item = items.find((i) => i.id === id);
    if (item) {
      const element = document.querySelector(item.elementSelector);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Highlight the element briefly
        element.classList.add("poe-search-highlight");
        setTimeout(() => {
          element.classList.remove("poe-search-highlight");
        }, 2000);
      }
    }
  },
}));
