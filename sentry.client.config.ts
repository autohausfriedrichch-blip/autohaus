import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 100% of transactions in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture 10% of replays (session replay shows exactly what the user did)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // Always capture replay on error

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,      // show text (no sensitive data in this app)
      blockAllMedia: false,
    }),
  ],

  // Don't report errors in development
  enabled: process.env.NODE_ENV === 'production',

  beforeSend(event) {
    // Strip sensitive data before sending
    if (event.request?.cookies) delete event.request.cookies
    if (event.user) delete event.user.email
    return event
  },
})
