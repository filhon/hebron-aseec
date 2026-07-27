"use client";

import { useEffect, useRef } from "react";
import { useAction } from "next-safe-action/hooks";
import { registerView } from "../actions/documents";

interface ViewTrackerProps {
  documentId: string;
}

/**
 * Registra a leitura no mount, uma vez por documento. Client component em
 * vez de fire-and-forget no RSC: funções serverless (Vercel) podem encerrar
 * a execução assim que a resposta é enviada, derrubando uma promise não
 * aguardada na página — aqui o registro roda depois da página já estar na
 * tela, e falha (rede, anônimo sem sessão) só fica no estado do hook, nunca
 * afeta a renderização.
 */
export function ViewTracker({ documentId }: ViewTrackerProps) {
  const { execute } = useAction(registerView);
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === documentId) return;
    firedFor.current = documentId;
    execute({ documentId });
  }, [documentId, execute]);

  return null;
}
