import type { Meta, StoryObj } from "@storybook/react";
import { CollapsedToggle } from "../src/components/panel/OverlayPanel";

const meta: Meta<typeof CollapsedToggle> = {
  title: "Panel/CollapsedToggle",
  component: CollapsedToggle,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{
        width: "100%",
        height: "400px",
        backgroundColor: "#1a1a1a",
        position: "relative"
      }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CollapsedToggle>;

export const Default: Story = {
  args: {
    forceShow: true,
  },
};

export const WithBackground: Story = {
  args: {
    forceShow: true,
  },
  decorators: [
    (Story) => (
      <div style={{
        width: "100%",
        height: "500px",
        backgroundImage: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
        position: "relative"
      }}>
        <div style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "#7a7a7a",
          fontFamily: "Verdana, sans-serif",
          fontSize: "14px"
        }}>
          ← This toggle appears when the panel is collapsed
        </div>
        <Story />
      </div>
    ),
  ],
};
