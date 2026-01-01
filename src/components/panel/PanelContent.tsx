import { useEffect, type ReactNode } from "react";
import { usePanelStore } from "@/stores/panelStore";
import { PanelHeader } from "./PanelHeader";
import { TabMenu } from "./TabMenu";

interface PanelContentProps {
  children: ReactNode;
}

export function PanelContent({ children }: PanelContentProps) {
  const { isCollapsed, isLoading, initialize } = usePanelStore();

  // Initialize panel state from storage
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-poe-black text-poe-beige">
        Loading...
      </div>
    );
  }

  // Width compensated for zoom: 400px / 1.4 = 286px, height = 100vh / 1.4 = 71.43vh
  return (
    <div
      className={`
        flex flex-col
        bg-poe-black text-poe-beige font-body
        border-l border-poe-gray
      `}
      style={{ width: "286px", height: "71.43vh" }}
    >
      <PanelHeader />
      <TabMenu />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
