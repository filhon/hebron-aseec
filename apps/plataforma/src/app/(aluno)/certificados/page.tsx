import { Suspense } from "react";
import { PageHeader, EmptyState, ErrorState } from "@hebron/ui";
import { Award } from "lucide-react";
import { CertificateCard } from "../../../components/certificate-card";
import { CertificateCardSkeleton } from "../../../components/certificate-list-skeleton";
import { requireAlunoSession, getUserCertificates } from "../../../lib/queries";

function CertificadosSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <CertificateCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function CertificadosContent() {
  const session = await requireAlunoSession();

  let certificates: Awaited<ReturnType<typeof getUserCertificates>>;
  try {
    certificates = await getUserCertificates(session.actorId);
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar seus certificados"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  if (certificates.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="Nenhum certificado ainda"
        description="Conclua todas as aulas de um curso para receber seu certificado."
        quote={{
          text: "Combati o bom combate, acabei a carreira, guardei a fé.",
          reference: "2 Timóteo 4:7",
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {certificates.map((certificate) => (
        <CertificateCard key={certificate.id} certificate={certificate} />
      ))}
    </div>
  );
}

export default function CertificadosPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Certificados"
        description="Emitidos automaticamente ao concluir 100% da trilha de um curso."
      />

      <Suspense fallback={<CertificadosSkeleton />}>
        <CertificadosContent />
      </Suspense>
    </div>
  );
}
