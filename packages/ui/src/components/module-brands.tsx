import type { ReactNode } from "react";

/**
 * Sub-marcas dos 9 módulos — fonte única de glifo, cor de acento e assinatura.
 *
 * Deriva do manual de logotipos dos módulos
 * (`design-refs/logotipos/Hebron Aseec - Logos dos Modulos (standalone).html`).
 * Cada módulo herda a palavra "hebron" da marca-mãe e se diferencia apenas
 * pelo descritor, pelo tom de acento e pelo glifo.
 *
 * Não duplicar estes valores em app nenhum: importe `MODULE_BRANDS` ou use
 * `ModuleLogo`. `accentHex` existe porque `next/og` (satori) resolve CSS
 * apenas em valores literais — variáveis CSS não chegam ao favicon.
 */

export type ModuleId =
  | "admin"
  | "projetos"
  | "plataforma"
  | "radio"
  | "financeiro"
  | "intranet"
  | "documentos"
  | "flats"
  | "tarefas";

export interface ModuleBrand {
  id: ModuleId;
  /** Descritor da sub-marca, sempre em caixa baixa: "hebron / projetos". */
  word: string;
  /** Eyebrow do lockup vertical. */
  subtitle: string;
  domain: string;
  /** Token de acento — usar em superfícies web. */
  accentVar: string;
  /** Mesmo acento em literal, para `next/og` e arquivos `.svg` estáticos. */
  accentHex: string;
  /** Glifo Lucide-like, desenhado em viewBox 24×24 com traço, sem preenchimento. */
  glyph: ReactNode;
}

export const MODULE_BRANDS: Record<ModuleId, ModuleBrand> = {
  admin: {
    id: "admin",
    word: "admin",
    subtitle: "gestão central",
    domain: "admin.hebronaseec.com.br",
    accentVar: "var(--hb-blue)",
    accentHex: "#202C85",
    glyph: (
      <g>
        <line x1="21" y1="6" x2="21" y2="6.01" />
        <line x1="11" y1="6" x2="3" y2="6" />
        <line x1="21" y1="12" x2="13" y2="12" />
        <line x1="9" y1="12" x2="3" y2="12" />
        <line x1="21" y1="18" x2="17" y2="18" />
        <line x1="13" y1="18" x2="3" y2="18" />
        <circle cx="13" cy="6" r="2" />
        <circle cx="11" cy="12" r="2" />
        <circle cx="15" cy="18" r="2" />
      </g>
    ),
  },
  projetos: {
    id: "projetos",
    word: "projetos",
    subtitle: "submissão & relatórios",
    domain: "projetos.hebronaseec.com.br",
    accentVar: "var(--hb-orange)",
    accentHex: "#EA5A06",
    glyph: (
      <g>
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        <line x1="8" y1="10" x2="8" y2="16" />
        <line x1="12" y1="10" x2="12" y2="13" />
        <line x1="16" y1="10" x2="16" y2="15" />
      </g>
    ),
  },
  plataforma: {
    id: "plataforma",
    word: "plataforma",
    subtitle: "cursos & materiais",
    domain: "plataforma.hebronaseec.com.br",
    accentVar: "var(--hb-green)",
    accentHex: "#A1C520",
    glyph: (
      <g>
        <path d="M12 7v14" />
        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        <path d="M6 8h2" />
        <path d="M6 12h2" />
        <path d="M16 8h2" />
        <path d="M16 12h2" />
      </g>
    ),
  },
  radio: {
    id: "radio",
    word: "rádio",
    subtitle: "transmissão 24/7",
    domain: "radio.hebronaseec.com.br",
    accentVar: "var(--hb-cyan)",
    accentHex: "#07B4E7",
    glyph: (
      <g>
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <circle cx="12" cy="12" r="2" />
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </g>
    ),
  },
  financeiro: {
    id: "financeiro",
    word: "financeiro",
    subtitle: "fluxo & orçamento",
    domain: "financeiro.hebronaseec.com.br",
    accentVar: "var(--hb-green-deep)",
    accentHex: "#82A317",
    glyph: (
      <g>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 3 3 6-7" />
        <path d="M14 8h6v6" />
      </g>
    ),
  },
  intranet: {
    id: "intranet",
    word: "intranet",
    subtitle: "painel da diretoria",
    domain: "app.hebronaseec.com.br",
    accentVar: "var(--hb-blue-deep)",
    accentHex: "#19236A",
    glyph: (
      <g>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </g>
    ),
  },
  documentos: {
    id: "documentos",
    word: "documentos",
    subtitle: "editais & institucional",
    domain: "docs.hebronaseec.com.br",
    accentVar: "var(--hb-cyan-deep)",
    accentHex: "#0593BE",
    glyph: (
      <g>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </g>
    ),
  },
  flats: {
    id: "flats",
    word: "flats",
    subtitle: "reservas & hospedagem",
    domain: "flats.hebronaseec.com.br",
    accentVar: "var(--hb-orange-deep)",
    accentHex: "#C24A03",
    glyph: (
      <g>
        <path d="M2 4v16" />
        <path d="M22 20v-8a2 2 0 0 0-2-2H2" />
        <path d="M22 20H2" />
        <circle cx="7" cy="13" r="2" />
        <path d="M11 13h11" />
      </g>
    ),
  },
  tarefas: {
    id: "tarefas",
    word: "tarefas",
    subtitle: "demandas & equipes",
    domain: "tarefas.hebronaseec.com.br",
    accentVar: "var(--hb-green)",
    accentHex: "#A1C520",
    glyph: (
      <g>
        <path d="M3 6l2 2 4-4" />
        <path d="M3 13l2 2 4-4" />
        <path d="M3 20l2 2 4-4" />
        <line x1="13" y1="6" x2="21" y2="6" />
        <line x1="13" y1="13" x2="21" y2="13" />
        <line x1="13" y1="20" x2="21" y2="20" />
      </g>
    ),
  },
};

export const MODULE_IDS = Object.keys(MODULE_BRANDS) as ModuleId[];
