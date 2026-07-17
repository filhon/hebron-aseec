"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { Button, PageHeader } from "@hebron/ui";
import { MaterialCard } from "../../components/material-card";
import { TermsAcceptDialog } from "../../components/terms-accept-dialog";
import {
  mockExclusiveMaterials,
  mockTermAcceptances,
} from "../../lib/mock-data";

// Sessão simulada em estado local — sem backend nesta fase (Bloco A). Permite
// validar visualmente a jornada completa (parede de login → aceite de termo →
// download). Integração real de sessão/Supabase acontece em P-8.9.
const MOCK_USER_ID = "user-ouvinte-03";

export default function MateriaisPage() {
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [termAccepted, setTermAccepted] = React.useState(() =>
    mockTermAcceptances.some((t) => t.userId === MOCK_USER_ID),
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Materiais exclusivos"
          description="Apostilas e roteiros de apoio às séries da rádio."
        />

        <div className="flex flex-col items-center gap-5 rounded-(--radius-md) border border-(--border) bg-(--surface-alt) py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-(--border) bg-(--surface)">
            <Lock className="h-6 w-6 text-(--brand)" aria-hidden="true" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <h2 className="font-(--font-display) text-lg font-(--font-weight-semibold) text-(--fg)">
              Entre para acessar os materiais
            </h2>
            <p className="text-sm text-(--fg-muted)">
              Os materiais exclusivos são liberados para usuários cadastrados,
              mediante aceite do termo de uso.
            </p>
          </div>
          <Button type="button" onClick={() => setLoggedIn(true)}>
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Materiais exclusivos"
        description="Apostilas e roteiros de apoio às séries da rádio."
      />

      <div className="flex flex-col gap-3">
        {mockExclusiveMaterials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            termAccepted={termAccepted}
            onRequestTermAcceptance={() => setDialogOpen(true)}
            onDownload={() => undefined}
          />
        ))}
      </div>

      <TermsAcceptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAccept={() => {
          setTermAccepted(true);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
