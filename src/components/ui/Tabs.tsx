import { type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex border-b border-poe-gray">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 px-4 py-3
            flex items-center justify-center gap-2
            font-fontin text-base
            transition-colors
            ${
              activeTab === tab.id
                ? "bg-poe-blue text-poe-white border-b-2 border-poe-gold"
                : "text-poe-gray-alt hover:bg-poe-gray hover:text-poe-beige"
            }
          `}
          data-tab={tab.id}
        >
          {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  isActive: boolean;
}

export function TabPanel({ children, isActive }: TabPanelProps) {
  if (!isActive) return null;
  return <div className="flex-1 overflow-y-auto">{children}</div>;
}
