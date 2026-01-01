import { usePanelStore } from "@/stores/panelStore";
import { Tabs, HistoryIcon, BookmarkIcon } from "@/components/ui";

const tabs = [
  { id: "history", label: "History", icon: <HistoryIcon /> },
  { id: "bookmarks", label: "Bookmarks", icon: <BookmarkIcon /> },
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
