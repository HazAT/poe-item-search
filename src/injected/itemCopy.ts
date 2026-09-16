import { formatItemText } from "@/utils/itemFormatter";
import { copyToClipboard } from "@/utils/copyToClipboard";
import type { TradeItem } from "@/types/tradeItem";

interface CopyLogger {
  log(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

/**
 * Show a brief visual feedback tooltip near the button.
 */
function showCopyFeedback(button: HTMLElement, message: string, logger: CopyLogger) {
  logger.log("showCopyFeedback called: " + message);

  // Create tooltip element
  const tooltip = document.createElement("div");
  tooltip.textContent = message;
  tooltip.setAttribute("data-poe-copy-tooltip", "true");
  Object.assign(tooltip.style, {
    position: "absolute",
    background: "#1a1a1a",
    color: "#8abd1c",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    zIndex: "10000",
    pointerEvents: "none",
    border: "1px solid #8abd1c",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
  });

  // Position tooltip above the button
  const rect = button.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.top + window.scrollY - 30}px`;

  document.body.appendChild(tooltip);
  logger.log("Tooltip appended to body");

  // Fade out and remove
  setTimeout(() => {
    tooltip.style.transition = "opacity 0.3s, transform 0.3s";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(-10px)";
  }, 1000);

  setTimeout(() => tooltip.remove(), 1500);
}

/**
 * Wire up copy buttons on result rows.
 * Finds all .copy buttons, enables them, and adds click handlers.
 */
export function wireCopyButtons(itemCache: ReadonlyMap<string, TradeItem>, logger: CopyLogger) {
  const rows = document.querySelectorAll(".resultset .row[data-id]");

  for (const row of rows) {
    const itemId = (row as HTMLElement).dataset.id;
    if (!itemId) continue;

    const copyBtn = row.querySelector(".copy") as HTMLButtonElement;
    if (!copyBtn) continue;

    // Skip if already wired
    if (copyBtn.dataset.poeWired === "true") continue;

    // Enable the button
    copyBtn.classList.remove("hidden");
    copyBtn.style.display = "block";
    copyBtn.dataset.poeWired = "true";

    // Capture before the trade site's native handler can copy another format
    // or report a competing failure for the same click.
    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      // Vue may reuse a result row for a different listing.
      const itemId = (row as HTMLElement).dataset.id;

      const item = itemId ? itemCache.get(itemId) : undefined;
      if (!item) {
        logger.warn("Item not in cache: " + itemId);
        copyBtn.title = "Item not loaded - try refreshing";
        showCopyFeedback(copyBtn, "Item not loaded - refresh results", logger);
        return;
      }

      try {
        const text = formatItemText(item);
        await copyToClipboard(text);

        // Send log to content script for Sentry logging
        window.postMessage({
          type: "poe-search-item-copied",
          payload: {
            itemText: text,
            itemName: item.name || item.typeLine,
            itemId: itemId,
          },
        }, "*");

        // Visual feedback - show a temporary tooltip
        showCopyFeedback(copyBtn, "Copied!", logger);

        logger.log("Copied item: " + (item.name || item.typeLine));
      } catch (err) {
        logger.error("Failed to copy: " + String(err) + "\nCopy failure details: " + JSON.stringify({
          itemId,
          stack: err instanceof Error ? err.stack : undefined,
          properties: item.properties,
          requirements: item.requirements,
          implicitMods: item.implicitMods,
          explicitMods: item.explicitMods,
        }));
        showCopyFeedback(copyBtn, "Copy failed", logger);
      }
    }, { capture: true });
  }

  logger.log("Wired copy buttons for " + rows.length + " rows");
}
