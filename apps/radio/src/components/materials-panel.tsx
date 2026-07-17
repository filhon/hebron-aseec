"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { EmptyState } from "@hebron/ui";
import type { ExclusiveMaterial } from "@hebron/types/radio";
import { MaterialCard } from "./material-card";
import { TermsAcceptDialog } from "./terms-accept-dialog";
import { acceptTerm } from "../actions/terms";
import { getMaterialDownloadUrl } from "../actions/materials";

export interface MaterialsPanelProps {
  /** Já havia `term_acceptances` no momento do carregamento server-side. */
  initialAccepted: boolean;
  /** Vazio quando `!initialAccepted` — RLS não deixa listar sem aceite (lib/queries.ts). */
  materials: ExclusiveMaterial[];
}

/** Orquestra o aceite de termo + a lista de materiais exclusivos (BRAIN §6.4).
 * Sem aceite, `exclusive_materials_select_term_accepted` (0050_radio_rls.sql)
 * nem deixa listar os materiais — por isso o aceite é um gate de página
 * inteira, não um cadeado por item como no protótipo de P-8.1 (mocks). */
export function MaterialsPanel({
  initialAccepted,
  materials,
}: MaterialsPanelProps) {
  const router = useRouter();
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const { execute: accept, status: acceptStatus } = useAction(acceptTerm, {
    onSuccess: () => router.refresh(),
  });

  const { execute: requestDownload } = useAction(getMaterialDownloadUrl, {
    onSuccess: ({ data }) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: ({ error }) => {
      setDownloadError(
        error.serverError ?? "Não foi possível gerar o link de download.",
      );
    },
  });

  if (!initialAccepted) {
    return (
      <TermsAcceptDialog
        open
        onOpenChange={() => undefined}
        onAccept={() => accept({ accepted: true })}
        loading={acceptStatus === "executing"}
      />
    );
  }

  if (materials.length === 0) {
    return (
      <EmptyState
        title="Nenhum material disponível"
        description="Lâmpada para os meus pés é tua palavra, e luz para o meu caminho. (Salmos 119:105)"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {downloadError && (
        <p role="alert" className="text-sm text-(--color-destructive)">
          {downloadError}
        </p>
      )}
      {materials.map((material) => (
        <MaterialCard
          key={material.id}
          material={material}
          termAccepted
          onDownload={(m) => {
            setDownloadError(null);
            requestDownload({ materialId: m.id });
          }}
        />
      ))}
    </div>
  );
}
