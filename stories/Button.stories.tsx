import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../src/components/ui/Button";
import { PlusIcon, TrashIcon, SearchIcon } from "../src/components/ui/Icons";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "primary", "danger", "ghost"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Default Button",
    variant: "default",
  },
};

export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
};

export const Danger: Story = {
  args: {
    children: "Danger Button",
    variant: "danger",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
  },
};

export const Small: Story = {
  args: {
    children: "Small Button",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "Large Button",
    size: "lg",
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    disabled: true,
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <PlusIcon className="w-4 h-4 mr-1" />
        Add Item
      </>
    ),
    variant: "primary",
  },
};

export const IconOnly: Story = {
  args: {
    children: <TrashIcon className="w-4 h-4" />,
    variant: "ghost",
    size: "sm",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="default">Default</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="flex gap-2 items-center">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="primary">
          <SearchIcon className="w-4 h-4 mr-1" />
          Search
        </Button>
        <Button variant="danger">
          <TrashIcon className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  ),
};
