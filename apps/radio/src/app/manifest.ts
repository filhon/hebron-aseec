import type { MetadataRoute } from "next";

// ---------------------------------------------------------------------------
// PWA (BRAIN §6.4: "PWA com background play"). O ícone é a sub-marca do módulo
// (public/icon.svg), com a mesma geometria do favicon em src/app/icon.tsx —
// tile de acento com o glifo de ondas, definido em @hebron/ui.
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
