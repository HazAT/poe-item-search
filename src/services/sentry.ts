/**
 * Sentry error tracking and structured logging service.
 * Uses shared environment setup (BrowserClient + Scope) as recommended for browser extensions.
 */
import * as Sentry from "@sentry/browser";
import {
  BrowserClient,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
  Scope,
} from "@sentry/browser";
import { getOrCreateUserId } from "@/utils/userId";

let scope: Scope | null = null;
let client: BrowserClient | null = null;

/**
 * Initialize Sentry with isolated scope for browser extension.
 * Safe to call multiple times - will only initialize once.
 */
export function initSentry() {
  // Skip if no DSN or already initialized
  if (!__SENTRY_DSN__ || scope) return;

  // Filter out integrations that use global state (not safe for shared environments)
  const integrations = getDefaultIntegrations({}).filter(
    (i) => !["BrowserApiErrors", "Breadcrumbs", "GlobalHandlers"].includes(i.name)
  );

  client = new BrowserClient({
    dsn: __SENTRY_DSN__,
    transport: makeFetchTransport,
    stackParser: defaultStackParser,
    integrations,
    environment: __DEV_MODE__ ? "development" : "production",
    release: `poe-item-search@${__APP_VERSION__}`,
    enableLogs: true, // Enable structured logs
    sendDefaultPii: true,
  });

  scope = new Scope();
  scope.setClient(client);
  scope.setUser({ id: getOrCreateUserId() });
  client.init(); // Must be called after setting client on scope

  console.log("[PoE Search] Sentry initialized");
}

/**
 * Capture an exception to Sentry.
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!scope) return;
  if (context) {
    scope.setExtras(context);
  }
  scope.captureException(error);
}

/**
 * Structured logging via Sentry.logger with scope.
 * Required for shared environments (browser extensions) where we can't use global Sentry.
 */
export const logger = {
  trace: (message: string, attrs?: Record<string, unknown>) => {
    if (scope) Sentry.logger.trace(message, attrs, { scope });
  },
  debug: (message: string, attrs?: Record<string, unknown>) => {
    if (scope) Sentry.logger.debug(message, attrs, { scope });
  },
  info: (message: string, attrs?: Record<string, unknown>) => {
    if (scope) Sentry.logger.info(message, attrs, { scope });
  },
  warn: (message: string, attrs?: Record<string, unknown>) => {
    if (scope) Sentry.logger.warn(message, attrs, { scope });
  },
  error: (message: string, attrs?: Record<string, unknown>) => {
    if (scope) Sentry.logger.error(message, attrs, { scope });
  },
  fatal: (message: string, attrs?: Record<string, unknown>) => {
    if (scope) Sentry.logger.fatal(message, attrs, { scope });
  },
};

/**
 * Get the Sentry scope for advanced usage.
 */
export function getScope(): Scope | null {
  return scope;
}

/**
 * Check if Sentry is initialized.
 */
export function isSentryInitialized(): boolean {
  return scope !== null && client !== null;
}
