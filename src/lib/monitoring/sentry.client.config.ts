import * as Sentry from "@sentry/nextjs";

// Only initialize in production to avoid noise during development
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Performance Monitoring - set to low value to minimize impact
    tracesSampleRate: 0.1, // Only sample 10% of transactions
    
    // Session Replay - disabled to avoid performance impact
    replaysSessionSampleRate: 0, // Disabled
    replaysOnErrorSampleRate: 0, // Disabled
    
    // Only log errors, not debug info
    debug: false,
    
    // Don't send personal data
    beforeSend(event) {
      // Remove any email or personal data from errors
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      if (event.user?.email) {
        delete event.user.email;
      }
      return event;
    },
    
    // Ignore common non-critical errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Network request failed",
      /^chrome-extension/,
      /^moz-extension/,
    ],
  });
}