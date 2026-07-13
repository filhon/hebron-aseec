"use client";

import { PageHeader, EmptyState } from "@hebron/ui";
import { Award } from "lucide-react";
import { CertificateCard } from "../../../components/certificate-card";
import { mockCertificates } from "../../../lib/mock-data";

const CURRENT_USER_ID = "user-aluno-01";

function downloadCertificate(courseName: string, hash: string) {
  const content = `Certificado de conclusão\n\nCurso: ${courseName}\nCódigo de verificação: ${hash}\n\nEste é um comprovante provisório (Bloco A). A emissão em PDF definitiva acontece no Bloco B.`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `certificado-${hash.slice(0, 8)}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CertificadosPage() {
  const certificates = mockCertificates.filter(
    (c) => c.userId === CURRENT_USER_ID,
  );

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
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onDownload={() =>
                downloadCertificate(certificate.courseName, certificate.hash)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
