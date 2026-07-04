import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users } from "@hebron/db/schema";
import { resolveSession } from "@hebron/auth/server";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { AuthCard, SupportFooter } from "../../../../components/auth-card";
import { InstituicaoForm } from "./components/instituicao-form";

export const metadata: Metadata = {
  title: "Sua instituição — Hebron Aseec",
  description: "Vincule ou cadastre sua instituição para concluir o cadastro.",
};

export default async function InstituicaoPage() {
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

  const status = rows[0]?.status;

  // Convidados e contas já aprovadas não passam por este passo.
  if (status !== "pending_approval") {
    redirect(status === "rejected" ? "/cadastro/status" : "/");
  }

  return (
    <AuthCard
      title="Sua instituição"
      subtitle="Último passo do cadastro"
      footer={<SupportFooter />}
      tagline='"Como são amáveis os teus tabernáculos, Senhor dos exércitos!" — Sl 84.1'
    >
      <InstituicaoForm />
    </AuthCard>
  );
}
