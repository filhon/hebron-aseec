import { redirect } from "next/navigation";
import { Parkinsans, Titillium_Web } from "next/font/google";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import type { Role } from "@hebron/types/roles";
import { getAuthUser } from "../../lib/queries";
import IntranetShell from "./shell";
import "../globals.css";

const parkinsans = Parkinsans({
  subsets: ["latin"],
  variable: "--font-parkinsans",
  display: "swap",
  adjustFontFallback: false,
});

const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-titillium",
  display: "swap",
});

// Equipe interna — submissor/aluno/hospede/ouvinte ficam fora da intranet
// (G5, escopo do prompt P-5.9).
const INTERNAL_ROLES: Role[] = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect(CANONICAL_LOGIN_URL);

  if (!user.roles.some((role) => INTERNAL_ROLES.includes(role))) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return (
    <html
      lang="pt-BR"
      className={`${parkinsans.variable} ${titillium.variable}`}
    >
      <body>
        <IntranetShell user={user}>{children}</IntranetShell>
      </body>
    </html>
  );
}
