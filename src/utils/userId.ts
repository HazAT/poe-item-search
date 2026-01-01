const USER_ID_KEY = "poe-search-user-id";

/**
 * Get or create a persistent user ID for Sentry tracking.
 * The ID is stored in localStorage and persists until the extension is uninstalled.
 */
export function getOrCreateUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}
