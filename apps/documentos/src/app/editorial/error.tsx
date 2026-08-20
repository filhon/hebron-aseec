"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function EditorialError({
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
    <div className="hb-empty">
      <div className="hb-empty-icon">
        <AlertTriangle size={24} aria-hidden="true" />
      </div>
      <b>Não foi possível carregar esta seção</b>
      <p className="hb-empty-body">
        Algo deu errado ao buscar os dados. Tente novamente em instantes.
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
  );
}
