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

  const { execute, isPending } = useAction(createAnnouncement, {
    onSuccess: () => {
      router.refresh();
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
          Criar anúncio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo anúncio</DialogTitle>
        </DialogHeader>
        <AnnouncementForm
          onSubmit={(values) => execute(values)}
          onCancel={() => setOpen(false)}
          isLoading={isPending}
        />
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
