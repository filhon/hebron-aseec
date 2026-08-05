import type { Metadata } from "next";
import Link from "next/link";
import { Parkinsans, Titillium_Web } from "next/font/google";
import { Radio, Users, FileDown } from "lucide-react";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { getNowPlayingSnapshot, getRadioCatalog } from "../lib/queries";
import { Shell, type NowPlayingState, type TrackLookupEntry } from "./shell";
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

// O layout raiz lê `now_playing`/catálogo do banco a cada request (Auto DJ,
// BRAIN §6.4) — sem isso o Next tentaria pré-renderizar "/" estaticamente no
// build e congelaria o estado inicial do Player para sempre (nenhum dado
// dinâmico é usado pela própria home page.tsx, só pelo layout que a envolve).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Rádio Hebron Aseec",
    template: "%s · Rádio Hebron Aseec",
  },
  description:
    "Pregações e ensino da Palavra, 24 horas por dia, organizadas por autor e série.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [nowPlaying, catalog] = await Promise.all([
    getNowPlayingSnapshot(),
    getRadioCatalog(),
  ]);

  const trackLookup: Record<string, TrackLookupEntry> = {};
  for (const track of catalog.tracks) {
    trackLookup[track.id] = {
      authorName: track.authorName,
      seriesName: track.seriesName,
      durationSeconds: track.durationSeconds,
    };
  }

  const initialNowPlaying: NowPlayingState | null = nowPlaying
    ? {
        startedAt: nowPlaying.startedAt.toISOString(),
        track: {
          id: nowPlaying.trackId,
          title: nowPlaying.trackTitle,
          authorName: nowPlaying.authorName,
          seriesName: nowPlaying.seriesName,
          durationSeconds: nowPlaying.durationSeconds,
        },
      }
    : null;

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
              <span className="font-(family-name:--font-display) text-sm font-(--font-weight-bold) tracking-(--tracking-tight)">
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

        <Shell initialNowPlaying={initialNowPlaying} trackLookup={trackLookup}>
          <main className="pb-24">{children}</main>
        </Shell>
      </body>
    </html>
  );
}
