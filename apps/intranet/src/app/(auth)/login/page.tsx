import type { Metadata } from "next";
import { LoginForm } from "./components/login-form";

export const metadata: Metadata = {
  title: "Acesso — Hebron Aseec",
  description: "Faça login para acessar o sistema da Hebron Aseec.",
};

interface LoginPageProps {
  searchParams: Promise<{ return_to?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { return_to: returnTo } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[--color-muted] px-4 py-12">
      {/* Card */}
      <div className="w-full max-w-md rounded-[--radius-lg] bg-[--color-background] p-8 shadow-[--shadow-md]">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <HebronLogo />
          <div className="text-center">
            <h1 className="text-[--text-xl] font-semibold tracking-tight text-[--color-foreground]">
              Acesso ao Sistema
            </h1>
            <p className="mt-1 text-[--text-sm] text-[--color-muted-foreground]">
              Intranet · Hebron Aseec
            </p>
          </div>
        </div>

        {/* Login form */}
        <LoginForm returnTo={returnTo ?? null} />

        {/* Footer */}
        <p className="mt-8 text-center text-[--text-xs] text-[--color-muted-foreground]">
          Problemas para acessar?{" "}
          <a
            href="mailto:suporte@hebronaseec.com.br"
            className="text-[--color-primary] underline-offset-2 hover:underline"
          >
            Fale com o suporte
          </a>
        </p>
      </div>

      {/* Tagline */}
      <p className="mt-6 text-center text-[--text-xs] text-[--color-muted-foreground] max-w-xs">
        &ldquo;Sede fortes e corajosos. Não temais, nem vos assusteis diante
        deles.&rdquo; — Dt 31.6
      </p>
    </div>
  );
}

// ——————————————————————————————————————————
// Brand mark (text-based, no image dep)
// ——————————————————————————————————————————

function HebronLogo() {
  return (
    <div className="flex flex-col items-center">
      {/* Monogram */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-[--radius-md] bg-[--color-primary]"
        aria-hidden="true"
      >
        <span className="text-[--text-xl] font-bold text-[--color-primary-foreground] tracking-tight select-none">
          H
        </span>
      </div>

      {/* Wordmark */}
      <div className="mt-2 text-center leading-none">
        <span className="block text-[--text-xs] font-semibold tracking-[0.2em] uppercase text-[--color-primary]">
          Hebron
        </span>
        <span className="block text-[--text-xs] tracking-[0.15em] uppercase text-[--color-muted-foreground]">
          Aseec
        </span>
      </div>
    </div>
  );
}
