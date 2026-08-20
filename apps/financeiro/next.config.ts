import { createNextConfig } from "@hebron/config/next";
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(createNextConfig(), {
  // PACOTE 5 (produção): org/project/authToken vêm de env vars — sem eles
  // (dev, CI, antes de Filipe criar o projeto Sentry) o plugin apenas pula
  // o upload de source maps, sem quebrar o build.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
