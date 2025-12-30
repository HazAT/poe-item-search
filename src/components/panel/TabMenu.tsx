import { usePanelStore } from "@/stores/panelStore";
import { Tabs, HistoryIcon, BookmarkIcon, PinIcon } from "@/components/ui";

const tabs = [
  { id: "history", label: "History", icon: <HistoryIcon /> },
  { id: "bookmarks", label: "Bookmarks", icon: <BookmarkIcon /> },
  { id: "pinned", label: "Pinned", icon: <PinIcon /> },
] as const;

export function TabMenu() {
  const { activeTab, setActiveTab } = usePanelStore();

  return (
    <Tabs
      tabs={tabs.map((t) => ({ ...t }))}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
    />
  );
}
