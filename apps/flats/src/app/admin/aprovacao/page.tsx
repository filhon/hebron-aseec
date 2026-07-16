import { Suspense } from "react";
import { PageHeader } from "@hebron/ui";
import { ApprovalQueueSkeleton } from "../../../components/approval-queue-skeleton";
import {
  getActiveUnits,
  getApprovalQueue,
  requireGestorSession,
} from "../../../lib/queries";
import { AprovacaoClient } from "./aprovacao-client";

async function AprovacaoQueueSection({ actorId }: { actorId: string }) {
  const [pending, unitsList] = await Promise.all([
    getApprovalQueue(actorId),
    getActiveUnits(actorId),
  ]);

  return <AprovacaoClient pending={pending} units={unitsList} />;
}

export default async function AprovacaoPage() {
  const session = await requireGestorSession();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Fila de aprovação"
        description="Ordenada por pontuação de scoring, com desempate visível conforme BRAIN §6.8."
      />

      <Suspense fallback={<ApprovalQueueSkeleton />}>
        <AprovacaoQueueSection actorId={session.actorId} />
      </Suspense>
    </div>
  );
}
