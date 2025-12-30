import type { Meta, StoryObj } from "@storybook/react";
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
