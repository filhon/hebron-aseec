"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import type { MeetingDecisionStatus } from "@hebron/types/intranet";
import { updateMeetingDecisionStatus } from "../actions/decisions";

const STATUS_LABEL: Record<MeetingDecisionStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export interface MeetingDecisionStatusSelectProps {
  meetingDecisionId: string;
  status: MeetingDecisionStatus;
}

export function MeetingDecisionStatusSelect({
  meetingDecisionId,
  status,
}: MeetingDecisionStatusSelectProps) {
  const router = useRouter();
  const { execute, isPending } = useAction(updateMeetingDecisionStatus, {
    onSuccess: () => router.refresh(),
  });

  return (
    <Select
      value={status}
      onValueChange={(next) =>
        execute({
          meetingDecisionId,
          status: next as MeetingDecisionStatus,
        })
      }
    >
      <SelectTrigger
        disabled={isPending}
        className="h-7 w-37.5 shrink-0 text-xs"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
