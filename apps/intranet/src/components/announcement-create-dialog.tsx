"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hebron/ui";
import { createAnnouncement } from "../actions/announcements";
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
