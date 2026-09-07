import { usePanelStore } from "@/stores/panelStore";

// Collapsed toggle button that appears when panel is collapsed
export function CollapsedToggle({ forceShow = false }: { forceShow?: boolean }) {
  const { isCollapsed, toggleCollapsed } = usePanelStore();

  if (!isCollapsed && !forceShow) return null;

  return (
    <button
      onClick={toggleCollapsed}
      style={{
        position: "fixed",
        top: "50%",
        right: 0,
        transform: "translateY(-50%)",
        zIndex: 9998,
        width: "52px",
        height: "140px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        backgroundColor: "#0f304d",
        color: "#fff8e1",
        borderTopLeftRadius: "8px",
        borderBottomLeftRadius: "8px",
        border: "2px solid #5a3806",
        borderRight: "none",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        fontFamily: "Cinzel, serif",
        fontSize: "12px",
        fontWeight: "bold",
        letterSpacing: "1px",
        padding: "12px 8px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#4c4c7d";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#0f304d";
      }}
      title="Open PoE Search Panel"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span style={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        pointerEvents: "none"
      }}>
        SEARCH
      </span>
    </button>
  );
}
