import type { Metadata } from "next";
import { BadgeCheck, ShieldQuestion } from "lucide-react";
import { BrandMark, Button, EmptyState, Input } from "@hebron/ui";
import { getCertificateVerification } from "../../../lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verificação de certificado — Hebron ASEEC",
  description:
    "Confirme a autenticidade de um certificado emitido pela plataforma de cursos da Hebron ASEEC.",
};

interface PageProps {
  searchParams: Promise<{ hash?: string }>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function VerificarCertificadoPage({
  searchParams,
}: PageProps) {
  const { hash } = await searchParams;
  const trimmedHash = hash?.trim() ?? "";
  const result = trimmedHash
    ? await getCertificateVerification(trimmedHash)
    : null;

  return (
    <main className="flex min-h-screen justify-center bg-(--bg-alt) px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <BrandMark compact />
        </div>

        <div className="mt-8 space-y-1.5 text-center">
          <p className="hb-eyebrow justify-center">Verificação pública</p>
          <h1 className="font-(family-name:--font-display) text-2xl text-(--fg)">
            Autenticidade de certificado
          </h1>
          <p className="mx-auto max-w-sm text-sm text-(--fg-muted)">
            Informe o código impresso no certificado para confirmar quem o
            emitiu e quando.
          </p>
        </div>

        <form
          action="/certificado/verificar"
          className="mt-8 flex flex-col gap-3 rounded-md border border-(--border) bg-(--surface) p-5 sm:flex-row"
        >
          <Input
            type="text"
            name="hash"
            defaultValue={trimmedHash}
            placeholder="Código de verificação"
            aria-label="Código de verificação"
            required
            className="flex-1"
          />
          <Button type="submit">Verificar</Button>
        </form>

        {trimmedHash && (
          <div className="mt-6">
            {result ? (
              <div className="flex flex-col gap-4 rounded-md border border-(--border) bg-(--surface) p-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-success-muted)">
                    <BadgeCheck
                      className="h-5 w-5 text-(--color-success-foreground)"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="hb-eyebrow">Certificado válido</p>
                    <h2 className="font-(family-name:--font-display) text-base leading-snug text-(--fg)">
                      {result.courseTitle}
                    </h2>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-(--fg-muted)">Emitido para</dt>
                    <dd className="truncate text-(--fg)">{result.userName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-(--fg-muted)">
                      Data de emissão
                    </dt>
                    <dd className="text-(--fg)">
                      {formatDate(result.issuedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <EmptyState
                icon={ShieldQuestion}
                title="Certificado não encontrado"
                description="Confira se o código foi copiado corretamente, sem espaços a mais."
                quote={{
                  text: "Que toda palavra seja confirmada pela boca de duas ou três testemunhas.",
                  reference: "Deuteronômio 19:15",
                }}
                className="rounded-md border border-(--border) bg-(--surface)"
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
