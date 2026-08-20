import * as Sentry from "@sentry/nextjs";

// Contraparte client-side de src/instrumentation.ts — lê a variável
// NEXT_PUBLIC_* porque este arquivo roda no navegador. Mesmo comportamento
// no-op sem DSN configurado.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Necessário para o Sentry instrumentar navegações client-side (App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
