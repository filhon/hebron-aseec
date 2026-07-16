import { Suspense } from "react";
import Link from "next/link";
import { CalendarPlus, Home } from "lucide-react";
import { PageHeader, Button, EmptyState } from "@hebron/ui";
import { UnitCard } from "../../components/unit-card";
import { getActiveUnits, requireHospedeSession } from "../../lib/queries";

function UnitCardSkeleton() {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-(--radius) border border-(--border) bg-(--surface)"
    >
      <div className="h-40 w-full animate-pulse bg-(--surface-alt)" />
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-2">
          <div className="h-4 w-2/5 animate-pulse rounded bg-(--surface-alt)" />
          <div className="h-3.5 w-full animate-pulse rounded bg-(--surface-alt)" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-(--surface-alt)" />
        </div>
        <div className="flex gap-4">
          <div className="h-3 w-24 animate-pulse rounded bg-(--surface-alt)" />
          <div className="h-3 w-28 animate-pulse rounded bg-(--surface-alt)" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-(--radius-pill) bg-(--surface-alt)" />
          <div className="h-5 w-20 animate-pulse rounded-(--radius-pill) bg-(--surface-alt)" />
        </div>
      </div>
    </div>
  );
}

async function CatalogContent({ actorId }: { actorId: string }) {
  const units = await getActiveUnits(actorId);

  if (units.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="Nenhum flat disponível no momento"
        description="Os flats estão temporariamente indisponíveis para novas solicitações."
        quote={{
          text: "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.",
          reference: "Mateus 11:28",
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {units.map((unit) => (
        <UnitCard key={unit.id} unit={unit} />
      ))}
    </div>
  );
}

export default async function CatalogoPage() {
  const session = await requireHospedeSession();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Catálogo de flats"
        description="Dois apartamentos de descanso ministerial, gratuitos, no mesmo condomínio fechado."
        actions={
          <Button asChild>
            <Link href="/reservar">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Solicitar reserva
            </Link>
          </Button>
        }
      />

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <UnitCardSkeleton />
            <UnitCardSkeleton />
          </div>
        }
      >
        <CatalogContent actorId={session.actorId} />
      </Suspense>
    </div>
  );
}
