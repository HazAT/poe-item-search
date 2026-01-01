import { usePanelStore } from "@/stores/panelStore";
import { TabPanel } from "@/components/ui/Tabs";
import { PasteInput } from "@/components/paste";
import { HistoryTab } from "@/components/history";
import { BookmarksTab } from "@/components/bookmarks";
import { PinnedItemsTab } from "@/components/pinned";

export function App() {
  const { activeTab } = usePanelStore();

  return (
    <div className="flex flex-col h-full">
      {/* Paste input at top */}
      <PasteInput />

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <TabPanel isActive={activeTab === "history"}>
          <HistoryTab />
        </TabPanel>
        <TabPanel isActive={activeTab === "bookmarks"}>
          <BookmarksTab />
        </TabPanel>
        <TabPanel isActive={activeTab === "pinned"}>
          <PinnedItemsTab />
        </TabPanel>
      </div>
    </div>
  );
}
