"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { ListPlus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hebron/ui";
import { createMeetingDecision } from "../actions/decisions";
import {
  MeetingDecisionForm,
  type MeetingDecisionFormMeetingOption,
  type MeetingDecisionFormResponsibleOption,
} from "./meeting-decision-form";

export interface MeetingDecisionDialogProps {
  meetings: MeetingDecisionFormMeetingOption[];
  responsibles: MeetingDecisionFormResponsibleOption[];
}

export function MeetingDecisionDialog({
  meetings,
  responsibles,
}: MeetingDecisionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { execute, isPending } = useAction(createMeetingDecision, {
    onSuccess: () => {
      router.refresh();
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          leftIcon={<ListPlus className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Registrar decisão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar decisão de reunião</DialogTitle>
        </DialogHeader>
        <MeetingDecisionForm
          meetings={meetings}
          responsibles={responsibles}
          onSubmit={(values) => execute(values)}
          onCancel={() => setOpen(false)}
          isLoading={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
