"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="hb-page"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="hb-empty">
        <div className="hb-empty-icon">
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <b>Não foi possível carregar esta página</b>
        <p className="hb-empty-body">
          Algo deu errado ao processar sua solicitação. Verifique sua conexão e
          tente novamente.
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            className="hb-btn hb-btn-primary"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Tentar novamente
          </button>
          <Link href="/" className="hb-btn hb-btn-secondary">
            Voltar para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
