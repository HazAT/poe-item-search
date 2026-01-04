// stories/TierDropdown.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { TierDropdown } from '../src/components/tiers';

const meta: Meta<typeof TierDropdown> = {
  title: 'Components/TierDropdown',
  component: TierDropdown,
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', backgroundColor: '#0c0c0e' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TierDropdown>;

const mockPhysDamageTiers = [
  { tier: 1, name: 'Flaring', min: [12, 22], max: [19, 32], avgMin: 17, ilvl: 75 },
  { tier: 2, name: 'Tempered', min: [10, 18], max: [15, 26], avgMin: 14, ilvl: 65 },
  { tier: 3, name: 'Razor-sharp', min: [7, 14], max: [11, 20], avgMin: 10.5, ilvl: 60 },
  { tier: 4, name: 'Annealed', min: [6, 12], max: [10, 17], avgMin: 9, ilvl: 54 },
  { tier: 5, name: 'Gleaming', min: [5, 9], max: [7, 13], avgMin: 7, ilvl: 46 },
];

const mockResistanceTiers = [
  { tier: 1, name: 'of the Inferno', min: 46, max: 50, avgMin: 46, ilvl: 75 },
  { tier: 2, name: 'of the Volcano', min: 36, max: 45, avgMin: 36, ilvl: 60 },
  { tier: 3, name: 'of the Furnace', min: 24, max: 35, avgMin: 24, ilvl: 45 },
  { tier: 4, name: 'of the Kiln', min: 18, max: 23, avgMin: 18, ilvl: 36 },
];

export const DamageToAttacks: Story = {
  args: {
    tiers: mockPhysDamageTiers,
    onSelect: (avgMin) => console.log('Selected tier with avgMin:', avgMin),
  },
};

export const Resistance: Story = {
  args: {
    tiers: mockResistanceTiers,
    onSelect: (avgMin) => console.log('Selected tier with avgMin:', avgMin),
  },
};

export const WithCurrentTier: Story = {
  args: {
    tiers: mockPhysDamageTiers,
    onSelect: (avgMin) => console.log('Selected tier with avgMin:', avgMin),
    currentTier: 2,
  },
};

export const NoTierMatch: Story = {
  args: {
    tiers: mockPhysDamageTiers,
    onSelect: (avgMin) => console.log('Selected tier with avgMin:', avgMin),
    currentTier: null,
  },
};

export const NoTiers: Story = {
  args: {
    tiers: [],
    onSelect: (avgMin) => console.log('Selected tier with avgMin:', avgMin),
  },
};
