import type { MetadataRoute } from "next";

// ---------------------------------------------------------------------------
// PWA (BRAIN §6.4: "PWA com background play"). Ícone é um placeholder SVG
// (public/icon.svg, mesmo desenho do balão azul + Radio usado em
// app/layout.tsx) — sem asset de design definitivo neste prompt (P-8.8 é
// backend/integração, não Bloco A); registrado como débito em SESSIONS.md.
// ---------------------------------------------------------------------------

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rádio Hebron Aseec",
    short_name: "Rádio Hebron",
    description:
      "Pregações e ensino da Palavra, 24 horas por dia, organizadas por autor e série.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F8FC",
    theme_color: "#202C85",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
