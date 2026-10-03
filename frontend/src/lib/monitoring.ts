import * as Sentry from "@sentry/capacitor";
import { env } from "./env";

let initialized = false;

/**
 * Initializes error monitoring with Sentry on native (Capacitor) and web.
 * Called once in providers.tsx only if NEXT_PUBLIC_SENTRY_DSN is configured.
 */
export function initMonitoring() {
  if (initialized) return;
  if (!env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    sendDefaultPii: false,
    release: env.appVersion,
    tracesSampleRate: 0.1,
  });

  initialized = true;
}
