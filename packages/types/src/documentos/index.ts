// ─── Visibility ───────────────────────────────────────────────────────────────

export type DocumentVisibility = "public" | "internal" | "restricted";

// ─── DocumentType ─────────────────────────────────────────────────────────────

export type DocumentType =
  | "edital"
  | "legal"
  | "fiscal"
  | "sop"
  | "cargo_description"
  | "policy"
  | "report"
  | "other";

// ─── DocumentStatus ───────────────────────────────────────────────────────────

export type DocumentStatus = "draft" | "published" | "archived";

// ─── EditalCycleType ──────────────────────────────────────────────────────────
// pontuais = permanently available; anuais = open/close by date

export type EditalCycleType = "pontual" | "anual";

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  children: Category[];
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

// ─── DocumentVersion ──────────────────────────────────────────────────────────

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  storageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  notes: string | null;
  publishedBy: string; // user ID
  publishedAt: Date;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: DocumentType;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  categoryId: string;
  category: Category;
  tags: Tag[];
  currentVersionId: string | null;
  currentVersion: DocumentVersion | null;
  publishedBy: string | null; // user ID
  publishedAt: Date | null;
  createdBy: string; // user ID
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ─── Edital ───────────────────────────────────────────────────────────────────

export interface Edital extends Omit<Document, "type"> {
  type: "edital";
  cycleType: EditalCycleType;
  /** null for pontuais (permanently available) */
  opensAt: Date | null;
  /** null for pontuais */
  closesAt: Date | null;
  /** Project type pre-filled when submitting via this edital */
  projectType: string | null;
  /** Project category pre-filled when submitting via this edital */
  projectCategory: string | null;
  /** Perguntas frequentes exibidas na página pública do edital */
  faq: { q: string; a: string }[];
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  documentId: string;
  onNewVersion: boolean;
  onEditalOpen: boolean;
  createdAt: Date;
}
