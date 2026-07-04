import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users } from "@hebron/db/schema";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { AuthCard, SupportFooter } from "../../../../components/auth-card";
import { SignOutLink } from "./components/sign-out-link";

export const metadata: Metadata = {
  title: "Cadastro em análise — Hebron Aseec",
};

export default async function CadastroStatusPage() {
  const cookieStore = await cookies();

  let session;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  const rows = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, session.actorId))
    .limit(1);

  const status = rows[0]?.status ?? "pending_approval";

  if (status === "active") redirect("/");

  const copy =
    status === "rejected"
      ? {
          title: "Cadastro não aprovado",
          body: "A administração revisou sua solicitação e não pôde aprová-la neste momento. Entre em contato para mais informações.",
          tagline: '"Buscai, e achareis; batei, e abrir-se-vos-á." — Mt 7.7',
        }
      : {
          title: "Cadastro em análise",
          body: "Recebemos sua solicitação e vinculamos sua instituição. A administração vai revisar seu cadastro em breve — você receberá um e-mail assim que for aprovado.",
          tagline: '"Aquietai-vos, e sabei que eu sou Deus." — Sl 46.10',
        };

  return (
    <AuthCard
      title={copy.title}
      subtitle="Intranet · Hebron Aseec"
      footer={<SupportFooter />}
      tagline={copy.tagline}
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <p className="text-(--text-sm) text-(--color-muted-foreground)">
          {copy.body}
        </p>
        <SignOutLink />
      </div>
    </AuthCard>
  );
}
