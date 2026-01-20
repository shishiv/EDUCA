import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Development vs Production settings
  enabled: process.env.NODE_ENV === 'production',

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,    // LGPD compliance
      blockAllMedia: true,  // Don't capture images
    }),
  ],
});
