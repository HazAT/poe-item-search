import { useState } from "react";
import { usePanelStore } from "@/stores/panelStore";
import { Button, ChevronRightIcon, BookmarkIcon } from "@/components/ui";
import { BookmarkModal } from "@/components/bookmarks";

export function PanelHeader() {
  const { toggleCollapsed } = usePanelStore();
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-poe-gray border-b border-poe-gray-alt">
        <div className="flex items-center gap-3">
          <h1 className="font-fontin text-xl text-poe-beige tracking-wide">PoE Search</h1>
          <span className="text-sm text-poe-gray-alt">v1.2.0</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsBookmarkModalOpen(true)}
            title="Bookmark current search"
          >
            <BookmarkIcon className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={toggleCollapsed}
            title="Collapse panel"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <BookmarkModal
        isOpen={isBookmarkModalOpen}
        onClose={() => setIsBookmarkModalOpen(false)}
      />
    </>
  );
}
