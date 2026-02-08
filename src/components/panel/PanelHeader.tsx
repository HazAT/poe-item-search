import { useState } from "react";
import { usePanelStore } from "@/stores/panelStore";
import { Button, ChevronRightIcon, SettingsIcon } from "@/components/ui";
import { SettingsModal } from "@/components/settings";
import { DevModeIndicator } from "./DevModeIndicator";

export function PanelHeader() {
  const { toggleCollapsed } = usePanelStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-poe-gray border-b border-poe-gray-alt">
        <div className="flex items-center gap-3">
          <h1 className="font-fontin text-xl text-poe-beige tracking-wide">PoE Search</h1>
          <span className="text-sm text-poe-gray-alt">v{__APP_VERSION__}</span>
          {__DEV_MODE__ && <DevModeIndicator />}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
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
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
