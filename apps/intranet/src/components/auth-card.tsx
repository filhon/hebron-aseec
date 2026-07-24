import type { ReactNode } from "react";
import { HebronLockup } from "@hebron/ui";

// ——————————————————————————————————————————
// Shared shell for every (auth) page — login, cadastro, convite, mfa/*.
// Extracted once six pages started duplicating the same card + brand mark.
// ——————————————————————————————————————————

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  tagline?: string;
}

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  tagline,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--surface-alt) px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-(--bg) p-8 shadow-(--shadow-md)">
        <div className="mb-8 flex flex-col items-center gap-5">
          <HebronLogo />
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-(--fg)">
              {title}
            </h1>
            <p className="mt-1 text-sm text-(--fg-muted)">{subtitle}</p>
          </div>
        </div>

        {children}

        {footer && (
          <p className="mt-8 text-center text-xs text-(--fg-muted)">{footer}</p>
        )}
      </div>

      {tagline && (
        <p className="mt-6 max-w-xs text-center text-xs text-(--fg-muted)">
          {tagline}
        </p>
      )}
    </div>
  );
}

/**
 * Marca institucional das telas de acesso.
 *
 * Aqui o usuário ainda não está dentro de módulo nenhum — quem se apresenta é
 * a instituição, com o logotipo oficial, e não uma sub-marca.
 */
export function HebronLogo() {
  return <HebronLockup height={44} />;
}

export function SupportFooter() {
  return (
    <>
      Problemas para acessar?{" "}
      <a
        href="mailto:suporte@hebronaseec.com.br"
        className="text-(--hb-blue) underline-offset-2 hover:underline"
      >
        Fale com o suporte
      </a>
    </>
  );
}
