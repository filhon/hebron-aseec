"use client";

import { useEffect, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Sparkles } from "lucide-react";
import { PROJECT_CATEGORY_OPTIONS as CATEGORIAS } from "@hebron/integrations/documentos-projetos-client";
import {
  findRenewalCandidate,
  type RenewalCandidate,
} from "../actions/projects";

// Detecção de renovação (P-2.13, BRAIN §6.2): ao selecionar uma instituição
// no wizard anual, busca o projeto anual anterior mais recente dela em
// estágio final. Vínculo é sempre opt-in — esta consulta só informa; grava
// parentProjectId apenas quando o submissor clica "Usar como base".
export function RenewalBanner({
  organizationId,
  onUseAsBase,
}: {
  organizationId: string;
  onUseAsBase: (candidate: RenewalCandidate) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const { execute, result } = useAction(findRenewalCandidate);

  useEffect(() => {
    execute({ organizationId });
  }, [organizationId, execute]);

  const candidate = result.data?.candidate ?? null;
  if (dismissed || !candidate) return null;

  const categoria = CATEGORIAS.find((c) => c.value === candidate.categoriaSlug);
  const resumo = [candidate.titulo, candidate.ano, categoria?.label]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-md border border-(--hb-blue) bg-(--brand-muted) px-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            backgroundColor: "var(--hb-blue)",
            color: "var(--fg-invert)",
          }}
        >
          <Sparkles className="w-4 h-4" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-(--hb-blue)">
            Encontramos um projeto anterior desta organização — usar como base?
          </p>
          <p className="text-xs text-(--fg-muted) mt-1">{resumo}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <button
              type="button"
              onClick={() => {
                onUseAsBase(candidate);
                setDismissed(true);
              }}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--hb-blue)" }}
            >
              Usar como base
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-md border border-(--border) bg-(--surface) px-3 py-1.5 text-xs font-semibold text-(--fg-muted) hover:border-(--brand) hover:text-(--brand) transition-colors"
            >
              Começar do zero
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
