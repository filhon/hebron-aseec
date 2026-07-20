import type { ReactNode } from "react";

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
        <div className="mb-8 flex flex-col items-center gap-3">
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

export function HebronLogo() {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-md bg-(--hb-blue)"
        aria-hidden="true"
      >
        <span className="text-xl font-bold text-(--brand-fg) tracking-tight select-none">
          H
        </span>
      </div>

      <div className="mt-2 text-center leading-none">
        <span className="block text-xs font-semibold tracking-[0.2em] uppercase text-(--hb-blue)">
          Hebron
        </span>
        <span className="block text-xs tracking-[0.15em] uppercase text-(--fg-muted)">
          Aseec
        </span>
      </div>
    </div>
  );
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
