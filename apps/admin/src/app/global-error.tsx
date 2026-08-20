"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <RefreshCw size={24} aria-hidden="true" />
            </div>
            <b>Não foi possível carregar o Admin</b>
            <p className="hb-empty-body">
              Ocorreu uma falha inesperada. Tente novamente em instantes.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="hb-btn hb-btn-primary"
              style={{ marginTop: 16 }}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
