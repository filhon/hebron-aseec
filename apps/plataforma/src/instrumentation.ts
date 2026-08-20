import * as Sentry from "@sentry/nextjs";

// PACOTE 5 (AUDIT/04-BACKLOG-CORRECAO.md): sem SENTRY_DSN (dev, CI, teste)
// Sentry.init com dsn undefined desliga o SDK silenciosamente — este
// arquivo é seguro em qualquer ambiente, mesmo antes do Sentry existir de
// verdade em produção.
export function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
