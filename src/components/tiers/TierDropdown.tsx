import { useState } from 'react';

interface TierInfo {
  tier: number;
  name: string;
  min: number | number[];
  max: number | number[];
  avgMin: number;
  ilvl: number;
}

interface TierDropdownProps {
  tiers: TierInfo[];
  onSelect: (avgMin: number) => void;
  containerElement?: HTMLElement | null;
}

// Inline styles for rendering outside Shadow DOM (Tailwind won't work)
const styles = {
  container: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  button: {
    padding: '2px 5px',
    fontSize: '11px',
    backgroundColor: '#2a2a2e',
    border: '1px solid #5a5a5a',
    borderRadius: '3px',
    color: '#c8b68b',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
  },
  buttonHover: {
    backgroundColor: '#2a2a2e',
  },
  dropdown: {
    position: 'absolute' as const,
    zIndex: 2147483647, // Max z-index value
    marginTop: '4px',
    right: 0,
    backgroundColor: '#1a1a1d',
    border: '1px solid #3d3d3d',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.9)',
    minWidth: '180px',
    overflow: 'hidden',
  },
  tierButton: {
    width: '100%',
    padding: '6px 12px',
    textAlign: 'left' as const,
    fontSize: '12px',
    backgroundColor: '#1a1a1d',
    border: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#c8b68b',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
  },
  tierButtonHover: {
    backgroundColor: '#2a2a2e',
  },
  tierName: {
    fontWeight: 500,
  },
  tierValue: {
    color: '#8b8b8b',
    marginLeft: '8px',
  },
};

export function TierDropdown({ tiers, onSelect, containerElement }: TierDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  // Set z-index on container when dropdown opens/closes
  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (containerElement) {
      containerElement.style.zIndex = newIsOpen ? '100' : '5';
    }
  };

  const handleSelect = (avgMin: number) => {
    onSelect(avgMin);
    setIsOpen(false);
    if (containerElement) {
      containerElement.style.zIndex = '5';
    }
  };

  if (!tiers || tiers.length === 0) return null;

  return (
    <div style={styles.container}>
      <button
        onClick={handleToggle}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        style={{
          ...styles.button,
          ...(isButtonHovered ? styles.buttonHover : {}),
        }}
        title="Select tier"
      >
        T&#9662;
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          {tiers.map((tier) => (
            <button
              key={tier.tier}
              onClick={() => handleSelect(tier.avgMin)}
              onMouseEnter={() => setHoveredTier(tier.tier)}
              onMouseLeave={() => setHoveredTier(null)}
              style={{
                ...styles.tierButton,
                ...(hoveredTier === tier.tier ? styles.tierButtonHover : {}),
              }}
            >
              <span style={styles.tierName}>T{tier.tier} {tier.name}</span>
              <span style={styles.tierValue}>({tier.avgMin}+)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
