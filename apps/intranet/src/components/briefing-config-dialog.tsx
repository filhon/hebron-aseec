"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Mail } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hebron/ui";
import { saveBriefingPreference } from "../actions/briefing";
import {
  BriefingConfigForm,
  type BriefingConfigValues,
} from "./briefing-config-form";

export interface BriefingConfigDialogProps {
  initialValues: BriefingConfigValues;
}

export function BriefingConfigDialog({
  initialValues,
}: BriefingConfigDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { execute, isPending } = useAction(saveBriefingPreference, {
    onSuccess: () => {
      router.refresh();
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          leftIcon={<Mail className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Preferências de briefing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preferências de briefing</DialogTitle>
        </DialogHeader>
        <BriefingConfigForm
          initialValues={initialValues}
          onSubmit={(values) => execute(values)}
          onCancel={() => setOpen(false)}
          isLoading={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
