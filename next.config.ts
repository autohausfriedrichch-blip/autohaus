import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,           // suppress CLI output during build
  widenClientFileUpload: true,
  hideSourceMaps: true,   // don't expose source maps to the browser
  disableLogger: true,
  automaticVercelMonitors: false,
})
