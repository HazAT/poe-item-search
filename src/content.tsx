import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OverlayPanel, CollapsedToggle } from "@/components/panel";
import { App } from "./App";
import "./index.css";

// Log version
const version = "1.2.0";
console.log(`PoE Item Search v${version}`);

// Wait for the trade page to be ready
function waitForTradePage(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if we're on the trade page
    if (!window.location.href.includes("pathofexile.com/trade")) {
      reject(new Error("Not on PoE trade page"));
      return;
    }

    const checkInterval = setInterval(() => {
      const trade = document.querySelector("#trade");
      if (trade) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 300);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error("Timeout: Trade page not found"));
    }, 30000);
  });
}

// Main App wrapper that includes both toggle and panel
function ExtensionRoot() {
  return (
    <>
      <CollapsedToggle />
      <OverlayPanel>
        <App />
      </OverlayPanel>
    </>
  );
}

// Initialize the extension
async function initialize() {
  try {
    await waitForTradePage();

    // Create container for the React app
    const container = document.createElement("div");
    container.id = "poe-item-search-root";
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(container);

    // Render entire app in one React root for proper state sharing
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <div style={{ pointerEvents: "auto" }}>
          <ExtensionRoot />
        </div>
      </StrictMode>
    );

    console.log("PoE Item Search initialized successfully");
  } catch (error) {
    console.error("PoE Item Search initialization failed:", error);
  }
}

// Start initialization
initialize();
