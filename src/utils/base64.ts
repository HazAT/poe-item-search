import { debug } from "@/utils/debug";

/**
 * Try to decode text as base64 (for pasting from Sentry logs).
 * Returns decoded text if successful and looks like item text, otherwise returns original.
 */
export function tryDecodeBase64ItemText(text: string): string {
  // Skip if text has newlines (already decoded item text)
  if (text.includes("\n")) return text;

  try {
    const decoded = decodeURIComponent(escape(atob(text.trim())));
    // Sanity check: decoded text should have newlines and look like PoE item
    if (decoded.includes("\n") && (decoded.includes("Item Class:") || decoded.includes("Rarity:"))) {
      debug.log("base64", "detected and decoded base64 item text");
      return decoded;
    }
  } catch {
    // Not valid base64, continue with original
  }
  return text;
}
