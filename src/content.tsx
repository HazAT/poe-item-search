import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CollapsedToggle } from "@/components/panel";
import { PanelContent } from "@/components/panel/PanelContent";
import { usePanelStore } from "@/stores/panelStore";
import { initSearchInterceptor } from "@/services/searchInterceptor";
import { getExtensionUrl } from "@/utils/extensionApi";
import { App } from "./App";

// Import CSS as string for Shadow DOM injection
import styles from "@/index.css?inline";

// Log version
const version = "1.3.0";
console.log(`PoE Item Search v${version}`);

/**
 * Inject the interceptor script into the page's MAIN world.
 * This must happen early to intercept all fetch/XHR requests.
 */
function injectInterceptorScript(): void {
  // Use different paths for development (CRXJS) vs production builds
  // In dev: CRXJS serves from src/injected/interceptor.ts
  // In prod: Built file is at interceptor.js (relative to dist/)
  const interceptorPath = import.meta.env.DEV
    ? "src/injected/interceptor.ts"
    : "interceptor.js";
  const scriptUrl = getExtensionUrl(interceptorPath);
  if (!scriptUrl) {
    console.warn("[PoE Item Search] Cannot inject interceptor: not in extension context");
    return;
  }

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.onload = () => {
    console.log("[PoE Item Search] Interceptor script injected");
    script.remove();
  };
  script.onerror = (e) => {
    console.error("[PoE Item Search] Failed to inject interceptor script:", e);
  };
  (document.head || document.documentElement).appendChild(script);
}

// Panel width constant
const PANEL_WIDTH = 400;

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

// Component to manage page margin and panel visibility based on panel state
function PageLayoutManager() {
  const { isCollapsed } = usePanelStore();

  useEffect(() => {
    const panelContainer = document.getElementById("poe-item-search-panel");

    // Add margin to body when panel is expanded to push content
    document.body.style.marginRight = isCollapsed ? "0" : `${PANEL_WIDTH}px`;
    document.body.style.transition = "margin-right 0.2s ease-in-out";

    // Hide/show panel container
    if (panelContainer) {
      panelContainer.style.display = isCollapsed ? "none" : "block";
    }

    return () => {
      document.body.style.marginRight = "0";
    };
  }, [isCollapsed]);

  return null;
}

// Initialize the extension
async function initialize() {
  try {
    // Inject interceptor script FIRST (before page makes any requests)
    injectInterceptorScript();

    // Initialize interceptor listener in content script
    initSearchInterceptor();

    await waitForTradePage();

    // Create container for the collapsed toggle (outside shadow DOM)
    const toggleContainer = document.createElement("div");
    toggleContainer.id = "poe-item-search-toggle";
    toggleContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      z-index: 9998;
      pointer-events: auto;
    `;
    document.body.appendChild(toggleContainer);

    // Render collapsed toggle in main document
    const toggleRoot = createRoot(toggleContainer);
    toggleRoot.render(
      <StrictMode>
        <CollapsedToggle />
        <PageLayoutManager />
      </StrictMode>
    );

    // Create shadow DOM container for the main panel
    const panelContainer = document.createElement("div");
    panelContainer.id = "poe-item-search-panel";
    panelContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      z-index: 9999;
      width: ${PANEL_WIDTH}px;
      height: 100vh;
    `;
    document.body.appendChild(panelContainer);

    // Create shadow DOM
    const shadow = panelContainer.attachShadow({ mode: "open" });

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
    const appContainer = document.createElement("div");
    appContainer.id = "poe-search-panel-root";
    appContainer.style.zoom = "1.4";
    shadow.appendChild(appContainer);

    // Create React root INSIDE the shadow DOM for proper event handling
    const panelRoot = createRoot(appContainer);
    panelRoot.render(
      <StrictMode>
        <PanelContent>
          <App />
        </PanelContent>
      </StrictMode>
    );

    console.log("PoE Item Search initialized successfully");
  } catch (error) {
    console.error("PoE Item Search initialization failed:", error);
  }
}

// Start initialization
initialize();
