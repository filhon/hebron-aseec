"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Check, Download, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "./button";
import { PageHeader } from "./page-header";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Tipos — presentation-only. As finalidades chegam como string (o vocabulário
// canônico vive em @hebron/db); packages/ui não depende do banco. Finalidades
// conhecidas ganham rótulo/descrição; desconhecidas caem no fallback.
// ---------------------------------------------------------------------------
export interface MyDataProfileView {
  fullName: string | null;
  email: string;
  phone: string | null;
  documentCpf: string | null;
  /** ISO 8601 — serializado no server. */
  createdAt: string;
  /** ISO 8601, quando a conta já foi anonimizada (P-0.13); senão null. */
  anonymizedAt: string | null;
}

export interface MyDataConsentView {
  purpose: string;
  granted: boolean;
  /** ISO 8601 ou null. */
  grantedAt: string | null;
  /** ISO 8601 ou null. */
  revokedAt: string | null;
}

export interface MyDataExportFile {
  filename: string;
  mimeType: string;
  content: string;
}

export type MyDataDeletionStatus = "pending" | "completed" | "rejected";

export interface MyDataPageProps {
  profile: MyDataProfileView;
  consents: MyDataConsentView[];
  /** Estado do pedido de exclusão mais recente do titular, se houver. */
  deletionStatus: MyDataDeletionStatus | null;
  /** Revoga (granted=false) ou reativa (granted=true) uma finalidade. */
  onToggleConsent: (purpose: string, granted: boolean) => Promise<void>;
  /** Retorna o arquivo serializado; a UI dispara o download no navegador. */
  onExport: (format: "json" | "csv") => Promise<MyDataExportFile>;
  /** Abre um pedido de exclusão (ticket para super_admin). */
  onRequestDeletion: (reason: string) => Promise<void>;
  className?: string;
}

const CONSENT_META: Record<string, { label: string; description: string }> = {
  comunicacao: {
    label: "Comunicações institucionais",
    description:
      "Envio de e-mails e avisos sobre suas atividades e solicitações.",
  },
  newsletter: {
    label: "Newsletter",
    description: "Novidades e conteúdos da Hebron ASEEC por e-mail.",
  },
  dados_reserva: {
    label: "Dados da reserva do flat",
    description:
      "Uso dos dados do formulário para avaliar e administrar sua reserva.",
  },
  dado_saude: {
    label: "Dado de saúde autodeclarado",
    description:
      "Uso da condição de saúde declarada como critério de pontuação da reserva.",
  },
};

function consentMeta(purpose: string): { label: string; description: string } {
  return (
    CONSENT_META[purpose] ?? {
      label: purpose,
      description: "Finalidade de tratamento dos seus dados.",
    }
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

function triggerDownload(file: MyDataExportFile): void {
  const blob = new Blob([file.content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Linha de definição (dt/dd) do bloco de perfil.
// ---------------------------------------------------------------------------
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-(--fg-muted)">{label}</dt>
      <dd className="text-sm font-(--font-weight-medium) text-(--fg) sm:text-right">
        {value && value.length > 0 ? value : "Não informado"}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cabeçalho de seção — título display + descrição, com ritmo vertical.
// ---------------------------------------------------------------------------
function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-prose space-y-1">
      <h2 className="font-(family-name:--font-display) text-lg font-(--font-weight-semibold) text-(--fg)">
        {title}
      </h2>
      <p className="text-sm leading-(--leading-relaxed) text-(--fg-muted)">
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Uma finalidade de consentimento com ação de revogar/reativar.
// ---------------------------------------------------------------------------
function ConsentRow({
  consent,
  onToggle,
  onError,
}: {
  consent: MyDataConsentView;
  onToggle: (purpose: string, granted: boolean) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = React.useState(false);
  const meta = consentMeta(consent.purpose);

  async function handleToggle() {
    setPending(true);
    onError("");
    try {
      await onToggle(consent.purpose, !consent.granted);
    } catch {
      onError(
        `Não foi possível atualizar "${meta.label}". Tente novamente em instantes.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-(--font-weight-semibold) text-(--fg)">
            {meta.label}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-(--font-weight-medium)",
              consent.granted
                ? "bg-(--brand-muted) text-(--brand)"
                : "bg-(--surface-alt) text-(--fg-muted)",
            )}
          >
            {consent.granted && (
              <Check className="h-3 w-3" aria-hidden="true" />
            )}
            {consent.granted ? "Ativo" : "Revogado"}
          </span>
        </div>
        <p className="max-w-prose text-sm leading-(--leading-relaxed) text-(--fg-muted)">
          {meta.description}
        </p>
        <p className="text-xs text-(--fg-muted)">
          {consent.granted
            ? `Concedido em ${formatDate(consent.grantedAt)}`
            : `Revogado em ${formatDate(consent.revokedAt)}`}
        </p>
      </div>
      <div className="shrink-0">
        <Button
          type="button"
          variant={consent.granted ? "outline" : "secondary"}
          size="sm"
          loading={pending}
          onClick={handleToggle}
        >
          {consent.granted ? "Revogar" : "Reativar"}
        </Button>
      </div>
    </div>
  );
}

/**
 * "Meus Dados" — superfície de titular da LGPD (P-9.2), compartilhada e
 * montada em cada app. Visualização do que é armazenado, gestão de
 * consentimentos por finalidade, portabilidade (JSON/CSV) e pedido de
 * exclusão. Toda a lógica de dados e auditoria vem das actions passadas por
 * props; este componente é presentation-only.
 */
export function MyDataPage({
  profile,
  consents,
  deletionStatus,
  onToggleConsent,
  onExport,
  onRequestDeletion,
  className,
}: MyDataPageProps) {
  const [consentError, setConsentError] = React.useState("");
  const [exportPending, setExportPending] = React.useState<
    "json" | "csv" | null
  >(null);
  const [exportMessage, setExportMessage] = React.useState("");
  const [deletionOpen, setDeletionOpen] = React.useState(false);
  const [deletionReason, setDeletionReason] = React.useState("");
  const [deletionPending, setDeletionPending] = React.useState(false);
  const [deletionError, setDeletionError] = React.useState("");

  const alreadyAnonymized = profile.anonymizedAt !== null;

  async function handleExport(format: "json" | "csv") {
    setExportPending(format);
    setExportMessage("");
    try {
      const file = await onExport(format);
      triggerDownload(file);
      setExportMessage(`Download de ${file.filename} iniciado.`);
    } catch {
      setExportMessage(
        "Não foi possível gerar a exportação. Tente novamente em instantes.",
      );
    } finally {
      setExportPending(null);
    }
  }

  async function handleRequestDeletion() {
    setDeletionPending(true);
    setDeletionError("");
    try {
      await onRequestDeletion(deletionReason.trim());
      setDeletionOpen(false);
      setDeletionReason("");
    } catch {
      setDeletionError(
        "Não foi possível registrar o pedido. Tente novamente em instantes.",
      );
    } finally {
      setDeletionPending(false);
    }
  }

  return (
    <div className={cn("mx-auto w-full max-w-2xl", className)}>
      <PageHeader
        title="Meus dados"
        description="Veja o que a Hebron ASEEC armazena sobre você, gerencie seus consentimentos, exporte uma cópia e solicite a exclusão, conforme a LGPD."
      />

      <div className="space-y-12">
        {/* Dados pessoais ------------------------------------------------ */}
        <section className="space-y-4" aria-labelledby="secao-perfil">
          <div id="secao-perfil">
            <SectionHeading
              title="Dados pessoais"
              description="As informações de identificação vinculadas à sua conta."
            />
          </div>
          <dl className="divide-y divide-(--divider) border-y border-(--border)">
            <Field label="Nome" value={profile.fullName} />
            <Field label="E-mail" value={profile.email} />
            <Field label="Telefone" value={profile.phone} />
            <Field label="CPF" value={profile.documentCpf} />
            <Field
              label="Conta criada em"
              value={formatDate(profile.createdAt)}
            />
          </dl>
        </section>

        {/* Consentimentos ------------------------------------------------ */}
        <section className="space-y-2" aria-labelledby="secao-consentimentos">
          <div id="secao-consentimentos">
            <SectionHeading
              title="Consentimentos"
              description="Você pode revogar qualquer finalidade a qualquer momento. A revogação não afeta o tratamento já realizado."
            />
          </div>
          {consents.length > 0 ? (
            <div className="divide-y divide-(--divider) border-y border-(--border)">
              {consents.map((consent) => (
                <ConsentRow
                  key={consent.purpose}
                  consent={consent}
                  onToggle={onToggleConsent}
                  onError={setConsentError}
                />
              ))}
            </div>
          ) : (
            <p className="border-y border-(--border) py-6 text-sm text-(--fg-muted)">
              Nenhum consentimento registrado nesta conta.
            </p>
          )}
          {consentError && (
            <p
              className="text-sm text-(--color-destructive)"
              role="status"
              aria-live="polite"
            >
              {consentError}
            </p>
          )}
        </section>

        {/* Portabilidade ------------------------------------------------- */}
        <section className="space-y-4" aria-labelledby="secao-exportar">
          <div id="secao-exportar">
            <SectionHeading
              title="Exportar uma cópia"
              description="Baixe todos os dados desta conta em formato aberto, para consultar ou levar a outro serviço."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
              loading={exportPending === "json"}
              disabled={exportPending !== null}
              onClick={() => handleExport("json")}
            >
              Baixar JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
              loading={exportPending === "csv"}
              disabled={exportPending !== null}
              onClick={() => handleExport("csv")}
            >
              Baixar CSV
            </Button>
          </div>
          {exportMessage && (
            <p
              className="text-sm text-(--fg-muted)"
              role="status"
              aria-live="polite"
            >
              {exportMessage}
            </p>
          )}
        </section>

        {/* Exclusão ------------------------------------------------------ */}
        <section className="space-y-4" aria-labelledby="secao-exclusao">
          <div id="secao-exclusao">
            <SectionHeading
              title="Excluir meus dados"
              description="A exclusão anonimiza de forma irreversível seus dados pessoais. Registros contábeis e deliberativos exigidos por lei são preservados de forma pseudonimizada, sem identificar você."
            />
          </div>

          {deletionStatus === "pending" ? (
            <div className="flex items-start gap-3 rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-(--brand)"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-(--font-weight-semibold) text-(--fg)">
                  Pedido de exclusão em análise
                </p>
                <p className="text-sm text-(--fg-muted)">
                  Sua solicitação foi registrada e será processada pela
                  administração. Você será avisado quando for concluída.
                </p>
              </div>
            </div>
          ) : deletionStatus === "completed" || alreadyAnonymized ? (
            <div className="flex items-start gap-3 rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-(--brand)"
                aria-hidden="true"
              />
              <p className="text-sm text-(--fg-muted)">
                Os dados pessoais desta conta já foram anonimizados.
              </p>
            </div>
          ) : (
            <Dialog open={deletionOpen} onOpenChange={setDeletionOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                >
                  Solicitar exclusão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar exclusão dos meus dados</DialogTitle>
                  <DialogDescription>
                    Ao confirmar, um pedido é enviado à administração. A
                    exclusão anonimiza seus dados pessoais de forma irreversível
                    e desativa seu acesso.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <label
                    htmlFor="deletion-reason"
                    className="text-sm font-(--font-weight-medium) text-(--fg)"
                  >
                    Motivo (opcional)
                  </label>
                  <textarea
                    id="deletion-reason"
                    value={deletionReason}
                    onChange={(event) => setDeletionReason(event.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-muted) focus-visible:border-(--brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand) focus-visible:ring-offset-2"
                    placeholder="Se quiser, conte por que está solicitando a exclusão."
                  />
                  {deletionError && (
                    <p
                      className="text-sm text-(--color-destructive)"
                      role="status"
                      aria-live="polite"
                    >
                      {deletionError}
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    loading={deletionPending}
                    onClick={handleRequestDeletion}
                  >
                    Confirmar pedido de exclusão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </section>
      </div>
    </div>
  );
}
