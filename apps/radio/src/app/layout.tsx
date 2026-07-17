import type { Metadata } from "next";
import Link from "next/link";
import { Parkinsans, Titillium_Web } from "next/font/google";
import { Radio, Users, FileDown } from "lucide-react";
import { Player } from "../components/player";
import { mockPlaylists, mockNowPlaying } from "../lib/mock-data";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "Rádio Hebron Aseec",
    template: "%s · Rádio Hebron Aseec",
  },
  description:
    "Pregações e ensino da Palavra, 24 horas por dia, organizadas por autor e série.",
};

// Réplica local de CANONICAL_LOGIN_URL (@hebron/auth): o barrel da package
// reexporta client.ts, que lança em module-scope se as env vars
// NEXT_PUBLIC_SUPABASE_* não estiverem definidas — quebraria o build do
// Bloco A, que não tem env vars (precondição do prompt). Substituir pela
// importação real em P-8.9.
const CANONICAL_LOGIN_URL =
  process.env.NODE_ENV === "production"
    ? "https://app.hebronaseec.com.br/login"
    : "http://localhost:3005/login";

// Rotação geral do Auto DJ — mesma playlist ouvida por quem chega em
// qualquer página (BRAIN §6.4: player persistente, sem live streaming).
const ROTATION_TRACKS =
  (mockPlaylists.find((p) => p.id === "playlist-02") ?? mockPlaylists[0])
    ?.tracks ?? [];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${parkinsans.variable} ${titillium.variable}`}
    >
      <body className="min-h-screen bg-(--bg)">
        <nav className="sticky top-0 z-(--z-sticky) border-b border-(--border) bg-(--bg)/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-(--fg)"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--brand)">
                <Radio
                  className="h-4 w-4 text-(--brand-fg)"
                  aria-hidden="true"
                />
              </span>
              <span className="font-(--font-display) text-sm font-(--font-weight-bold) tracking-(--tracking-tight)">
                Rádio Hebron
              </span>
            </Link>

            <div className="flex flex-1 items-center gap-1">
              <Link
                href="/autores"
                className="flex items-center gap-1.5 rounded-(--radius-pill) px-3 py-1.5 text-sm text-(--fg-muted) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt) hover:text-(--fg)"
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Autores e séries
              </Link>
              <Link
                href="/materiais"
                className="flex items-center gap-1.5 rounded-(--radius-pill) px-3 py-1.5 text-sm text-(--fg-muted) transition-colors duration-(--transition-fast) hover:bg-(--surface-alt) hover:text-(--fg)"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                Materiais exclusivos
              </Link>
            </div>

            <a
              href={CANONICAL_LOGIN_URL}
              className="shrink-0 rounded-(--radius) border border-(--border) px-3 py-1.5 text-sm text-(--fg) transition-colors duration-(--transition-fast) hover:border-(--brand) hover:text-(--brand)"
            >
              Entrar
            </a>
          </div>
        </nav>

        <main className="pb-24">{children}</main>

        <div className="fixed inset-x-0 bottom-0 z-(--z-sticky)">
          <Player
            tracks={ROTATION_TRACKS}
            initialTrackId={mockNowPlaying.trackId}
          />
        </div>
      </body>
    </html>
  );
}
