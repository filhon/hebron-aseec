import { PageHeader, EmptyState } from "@hebron/ui";
import { Award } from "lucide-react";
import { CertificateCard } from "../../../components/certificate-card";
import { requireAlunoSession, getUserCertificates } from "../../../lib/queries";

export default async function CertificadosPage() {
  const session = await requireAlunoSession();
  const certificates = await getUserCertificates(session.actorId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Certificados"
        description="Emitidos automaticamente ao concluir 100% da trilha de um curso."
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Nenhum certificado ainda"
          description="Conclua todas as aulas de um curso para receber seu certificado."
          quote={{
            text: "Combati o bom combate, acabei a carreira, guardei a fé.",
            reference: "2 Timóteo 4:7",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      )}
    </div>
  );
}
