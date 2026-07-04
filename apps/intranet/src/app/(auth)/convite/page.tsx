import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { invitations } from "@hebron/db/schema";
import { AuthCard, SupportFooter } from "../../../components/auth-card";
import { ConviteForm } from "./components/convite-form";

export const metadata: Metadata = {
  title: "Convite — Hebron Aseec",
  description: "Aceite seu convite para acessar o sistema da Hebron Aseec.",
};

interface ConvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

type ConviteState =
  | { kind: "valid"; email: string; token: string }
  | { kind: "invalid" | "expired" | "revoked" | "accepted" };

async function resolveConviteState(
  token: string | undefined,
): Promise<ConviteState> {
  if (!token) return { kind: "invalid" };

  const rows = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, token), isNull(invitations.revokedAt)))
    .limit(1);

  const invitation = rows[0];
  if (!invitation) {
    // Pode ser token inválido OU revogado (a query acima já excluiu revogado).
    const revokedRows = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);
    return revokedRows[0] ? { kind: "revoked" } : { kind: "invalid" };
  }

  if (invitation.acceptedAt) return { kind: "accepted" };
  if (invitation.expiresAt < new Date()) return { kind: "expired" };

  return { kind: "valid", email: invitation.email, token };
}

export default async function ConvitePage({ searchParams }: ConvitePageProps) {
  const { token } = await searchParams;
  const state = await resolveConviteState(token);

  if (state.kind !== "valid") {
    return (
      <AuthCard
        title="Convite"
        subtitle="Intranet · Hebron Aseec"
        footer={<SupportFooter />}
      >
        <ConviteErrorState kind={state.kind} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Complete seu cadastro"
      subtitle={state.email}
      footer={<SupportFooter />}
      tagline='"Ide por todo o mundo e pregai o evangelho a toda criatura." — Mc 16.15'
    >
      <ConviteForm token={state.token} email={state.email} />
    </AuthCard>
  );
}

function ConviteErrorState({
  kind,
}: {
  kind: "invalid" | "expired" | "revoked" | "accepted";
}) {
  const copy: Record<typeof kind, { title: string; body: string }> = {
    invalid: {
      title: "Convite não encontrado",
      body: "Verifique se o link está completo ou peça um novo convite à administração.",
    },
    expired: {
      title: "Convite expirado",
      body: "Este convite não é mais válido. Peça à administração para reenviá-lo.",
    },
    revoked: {
      title: "Convite revogado",
      body: "Este convite foi cancelado pela administração.",
    },
    accepted: {
      title: "Convite já utilizado",
      body: "Esta conta já foi criada. Acesse com seu e-mail e senha.",
    },
  };

  const { title, body } = copy[kind];

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <p className="font-medium text-(--color-foreground)">{title}</p>
      <p className="text-(--text-sm) text-(--color-muted-foreground)">{body}</p>
      {kind === "accepted" && (
        <a
          href="/login"
          className="mt-2 text-(--text-sm) font-medium text-(--color-primary) underline-offset-2 hover:underline"
        >
          Ir para o login
        </a>
      )}
    </div>
  );
}
