/**
 * Service that listens for intercepted search requests from the injected script
 * and adds them to the history store.
 */

import { useHistoryStore } from "@/stores/historyStore";
import { parseTradeLocation } from "@/services/tradeLocation";
import { debug } from "@/utils/debug";
import { logger } from "@/services/sentry";
import type { TradeSearchInterceptedPayload } from "@/injected/interceptor";
import type { TradeSearchQuery } from "@/types/tradeLocation";

interface PreviewImagePayload {
  slug: string;
  imageUrl: string;
}

interface ItemCopiedPayload {
  itemText: string;
  itemName: string;
  itemId: string;
}

/**
 * Initialize the search interceptor listener.
 * Call this from the content script after injecting the interceptor script.
 */
export function initSearchInterceptor() {
  debug.log("initSearchInterceptor: initializing");

  window.addEventListener("message", async (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;

    if (event.data?.type === "poe-search-intercepted" && event.data.payload) {
      await handleInterceptedSearch(event.data.payload as TradeSearchInterceptedPayload);
    }

    // Handle preview image capture
    if (event.data?.type === "poe-search-preview-image" && event.data.payload) {
      await handlePreviewImage(event.data.payload as PreviewImagePayload);
    }

    // Handle item copied from results
    if (event.data?.type === "poe-search-item-copied" && event.data.payload) {
      handleItemCopied(event.data.payload as ItemCopiedPayload);
    }
  });

  debug.log("initSearchInterceptor: listener registered");
}

async function handleInterceptedSearch(payload: TradeSearchInterceptedPayload) {
  const { url, requestBody, responseBody } = payload;

  debug.log("handleInterceptedSearch: received", {
    url,
    total: responseBody.total,
    id: responseBody.id,
  });

  // Check if this search was extension-initiated (from PasteInput)
  // If so, skip adding to history - PasteInput already added it
  const extensionInitiated = localStorage.getItem("poe-search-extension-initiated");
  if (extensionInitiated) {
    const initiatedTime = parseInt(extensionInitiated, 10);
    const now = Date.now();
    // Clear the flag and skip if it was set within last 10 seconds
    localStorage.removeItem("poe-search-extension-initiated");
    if (now - initiatedTime < 10000) {
      debug.log("handleInterceptedSearch: skipping extension-initiated search", {
        id: responseBody.id,
        ageMs: now - initiatedTime,
      });
      return;
    }
  }

  // Build the result URL to parse location
  // URL format: /api/trade2/search/poe2/Standard
  // Result URL: /trade2/search/poe2/Standard/{id}
  const apiUrlMatch = url.match(/\/api\/(trade2?)\/search\/(.+)/);
  if (!apiUrlMatch) {
    debug.error("handleInterceptedSearch: could not parse URL", url);
    return;
  }

  const [, tradePath, league] = apiUrlMatch;
  const resultUrl = `https://www.pathofexile.com/${tradePath}/search/${league}/${responseBody.id}`;

  const location = parseTradeLocation(resultUrl);

  // Extract title from query
  const title = extractTitleFromQuery(requestBody);

  // Add to history with full payload
  await useHistoryStore.getState().addEntry(
    location,
    title,
    requestBody as TradeSearchQuery,
    responseBody.total,
    "page"
  );
}

/**
 * Extract a meaningful title from the query.
 * Tries to find: item name (term), category, or falls back to "Custom Search"
 */
function extractTitleFromQuery(query: unknown): string {
  const q = query as {
    query?: {
      term?: string;
      type?: string;
      name?: string;
      filters?: {
        type_filters?: {
          filters?: {
            category?: { option?: string };
          };
        };
      };
    };
  };

  // If searching for specific item name
  if (q.query?.term) {
    return q.query.term;
  }

  // If searching by type name
  if (q.query?.type) {
    return q.query.type;
  }

  // If searching by item name
  if (q.query?.name) {
    return q.query.name;
  }

  // Try to get category from type filters
  const category = q.query?.filters?.type_filters?.filters?.category?.option;
  if (category) {
    return formatCategoryName(category);
  }

  return "Custom Search";
}

/**
 * Format category name for display.
 * Converts "weapon.bow" to "Bow", "armour.helmet" to "Helmet", etc.
 */
function formatCategoryName(category: string): string {
  const parts = category.split(".");
  const name = parts[parts.length - 1];
  // Convert snake_case or lowercase to Title Case
  return name
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Handle preview image capture from the interceptor.
 * Updates the corresponding history entry with the image URL.
 */
async function handlePreviewImage(payload: PreviewImagePayload) {
  const { slug, imageUrl } = payload;

  debug.log("handlePreviewImage: received", {
    slug,
    imageUrl: imageUrl.slice(0, 60),
  });

  // Update the entry that matches this search ID (slug)
  await useHistoryStore.getState().updateEntryPreviewImage(slug, imageUrl);
}

/**
 * Handle item copied from results (sent from interceptor).
 * Logs the copied item to Sentry.
 */
function handleItemCopied(payload: ItemCopiedPayload) {
  const { itemText, itemName, itemId } = payload;

  debug.log("handleItemCopied: received", { itemName, itemId });

  // Log to Sentry
  // Include base64 for easy copy/paste (Sentry UI doesn't preserve newlines well)
  logger.info("Item copied from results", {
    itemText,
    itemTextBase64: btoa(unescape(encodeURIComponent(itemText))),
    itemName,
    itemId,
  });
}
