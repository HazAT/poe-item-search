import { DevConnectionStatus } from "../src/components/panel/DevModeIndicator";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PanelHeader } from "../src/components/panel/PanelHeader";
import { TabMenu } from "../src/components/panel/TabMenu";
import { usePanelStore } from "../src/stores/panelStore";
import { useEffect } from "react";

// Panel Header Story
const meta: Meta<typeof PanelHeader> = {
  title: "Panel/Header",
  component: PanelHeader,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-panel bg-poe-black">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PanelHeader>;

export const Default: Story = {};

// Tab Menu Story
export const TabMenuStory: StoryObj<typeof TabMenu> = {
  render: () => {
    // Reset store state for each story
    const ResetWrapper = () => {
      const { setActiveTab } = usePanelStore();
      useEffect(() => {
        setActiveTab("history");
      }, [setActiveTab]);
      return <TabMenu />;
    };
    return (
      <div className="w-panel bg-poe-black">
        <ResetWrapper />
      </div>
    );
  },
};

// Full Panel Layout
export const FullPanelLayout: StoryObj = {
  render: () => {
    return (
      <div className="w-panel h-[600px] bg-poe-black border border-poe-gray flex flex-col">
        <PanelHeader />
        <TabMenu />
        <div className="flex-1 p-4 text-poe-beige">
          <p>Tab content goes here</p>
        </div>
      </div>
    );
  },
};

export const DevIndicatorConnected: StoryObj = {
  render: () => (
    <div className="w-panel bg-poe-black p-4">
      <div className="flex items-center gap-3">
        <h1 className="font-fontin text-xl text-poe-beige tracking-wide">
          PoE Search
        </h1>
        <span className="text-sm text-poe-gray-alt">v{__APP_VERSION__}</span>
        <DevConnectionStatus status="connected" />
      </div>
    </div>
  ),
};

export const DevIndicatorDisconnected: StoryObj = {
  render: () => (
    <div className="w-panel bg-poe-black p-4">
      <div className="flex items-center gap-3">
        <h1 className="font-fontin text-xl text-poe-beige tracking-wide">
          PoE Search
        </h1>
        <span className="text-sm text-poe-gray-alt">v{__APP_VERSION__}</span>
        <DevConnectionStatus status="disconnected" />
      </div>
    </div>
  ),
};

export const DevIndicatorChecking: StoryObj = {
  render: () => (
    <div className="w-panel bg-poe-black p-4">
      <div className="flex items-center gap-3">
        <h1 className="font-fontin text-xl text-poe-beige tracking-wide">
          PoE Search
        </h1>
        <span className="text-sm text-poe-gray-alt">v{__APP_VERSION__}</span>
        <DevConnectionStatus status="checking" />
      </div>
    </div>
  ),
};
