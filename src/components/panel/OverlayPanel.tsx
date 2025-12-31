import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePanelStore } from "@/stores/panelStore";
import { PanelHeader } from "./PanelHeader";
import { TabMenu } from "./TabMenu";

// Import CSS as string for Shadow DOM injection
import styles from "@/index.css?inline";

interface OverlayPanelProps {
  children: ReactNode;
}

export function OverlayPanel({ children }: OverlayPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const { isCollapsed, isLoading, initialize } = usePanelStore();

  // Initialize panel state from storage
  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up Shadow DOM
  useEffect(() => {
    if (!containerRef.current) return;
    if (containerRef.current.shadowRoot) {
      setShadowRoot(containerRef.current.shadowRoot);
      return;
    }

    const shadow = containerRef.current.attachShadow({ mode: "open" });

    // Inject Google Fonts link
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap";
    shadow.appendChild(fontLink);

    // Inject styles into Shadow DOM
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    shadow.appendChild(styleSheet);

    // Create app container with zoom to compensate for PoE's 10px root font-size
    // (PoE trade page uses html { font-size: 10px } which breaks Tailwind rem units)
    // Since rem is relative to document root, we use zoom: 1.4 to scale up
    const appContainer = document.createElement("div");
    appContainer.id = "poe-search-panel-root";
    appContainer.style.zoom = "1.4";
    shadow.appendChild(appContainer);

    setShadowRoot(shadow);
  }, []);

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        id="poe-item-search-panel"
        className="fixed top-0 right-0 w-panel h-screen z-[9999]"
      />
    );
  }

  // Width compensated for zoom: 400px / 1.4 = 286px, height adjusted similarly
  const panelContent = (
    <div
      data-panel-container
      className={`
        flex flex-col relative
        bg-poe-black text-poe-beige font-body
        border-l border-poe-gray
        transition-transform duration-200 ease-in-out
        ${isCollapsed ? "translate-x-full" : "translate-x-0"}
      `}
      style={{ width: "286px", height: "71.43vh" }}
    >
      <PanelHeader />
      <TabMenu />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );

  return (
    <>
      <div
        ref={containerRef}
        id="poe-item-search-panel"
        className="fixed top-0 right-0 z-[9999]"
        style={{
          width: isCollapsed ? "40px" : "400px",
          height: "100vh",
          pointerEvents: "auto",
        }}
      />
      {shadowRoot &&
        createPortal(
          panelContent,
          shadowRoot.getElementById("poe-search-panel-root")!
        )}
    </>
  );
}

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
