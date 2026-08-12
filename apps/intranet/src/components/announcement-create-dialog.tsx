"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Pencil, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hebron/ui";
import type { Announcement } from "@hebron/types/intranet";
import {
  createAnnouncement,
  updateAnnouncement,
} from "../actions/announcements";
import { AnnouncementForm } from "./announcement-form";

export function AnnouncementCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Contagem de emails que não saíram no anúncio urgente recém-publicado —
  // o anúncio já está no banco (defeito #2, P-5.10b), então isto é um aviso
  // pós-sucesso, nunca um erro que bloqueia o fechamento do diálogo.
  const [partialSendWarning, setPartialSendWarning] = useState<string | null>(
    null,
  );

  const { execute, isPending } = useAction(createAnnouncement, {
    onSuccess: ({ data }) => {
      router.refresh();
      const emailFailures = data?.emailFailures;
      if (emailFailures) {
        setPartialSendWarning(
          `Anúncio publicado. ${emailFailures} ${emailFailures === 1 ? "email não saiu" : "emails não saíram"} — os destinatários já veem o anúncio na intranet.`,
        );
        return;
      }
      setPartialSendWarning(null);
      setOpen(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPartialSendWarning(null);
      }}
    >
      <DialogTrigger asChild>
        <Button leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
          Criar anúncio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo anúncio</DialogTitle>
        </DialogHeader>
        {partialSendWarning ? (
          <div className="flex flex-col gap-4">
            <p role="status" className="text-xs text-(--color-warning)">
              {partialSendWarning}
            </p>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </div>
        ) : (
          <AnnouncementForm
            onSubmit={(values) => execute(values)}
            onCancel={() => setOpen(false)}
            isLoading={isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// AnnouncementEditDialog — correção de um anúncio já publicado (P-5.3b
// CORRETIVO). Só é montado quando o chamador já resolveu canEdit=super_admin
// (announcement-card.tsx); updateAnnouncement (superAdminAction) confirma na
// segunda camada.
// ---------------------------------------------------------------------------

export interface AnnouncementEditDialogProps {
  announcement: Announcement;
}

export function AnnouncementEditDialog({
  announcement,
}: AnnouncementEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { execute, isPending } = useAction(updateAnnouncement, {
    onSuccess: () => {
      router.refresh();
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="hb-card-header-hint hover:text-(--brand)"
          aria-label="Editar anúncio"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar anúncio</DialogTitle>
        </DialogHeader>
        <AnnouncementForm
          initialValues={{
            title: announcement.title,
            body: announcement.body,
            priority: announcement.priority,
          }}
          onSubmit={(values) =>
            execute({ announcementId: announcement.id, ...values })
          }
          onCancel={() => setOpen(false)}
          isLoading={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
