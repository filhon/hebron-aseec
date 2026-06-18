import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PublicNav } from "../../components/public-nav";
import { EditalCard } from "../../components/edital-card";
import { db } from "@hebron/db/client";
import {
  documents,
  editals,
  categories,
  documentTags,
  tags,
} from "@hebron/db/schema";
import { and, or, eq, isNull, isNotNull, desc, inArray } from "drizzle-orm";
import type { Edital } from "@hebron/types/documentos";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractDescription(contentMd: string | null): string | null {
  if (!contentMd) return null;
  const line = contentMd
    .split("\n")
    .find((l) => l.trim() !== "" && !l.startsWith("#") && !l.startsWith("-"));
  return line?.trim().slice(0, 240) ?? null;
}

function getEditalStatus(
  e: Edital,
): "open" | "closed" | "permanent" | "upcoming" {
  if (e.cycleType === "pontual") return "permanent";
  const now = new Date();
  if (e.opensAt && now < new Date(e.opensAt)) return "upcoming";
  if (e.closesAt && now > new Date(e.closesAt)) return "closed";
  return "open";
}

type StatusFilter = "all" | "open" | "permanent" | "closed";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EditaisPage({ searchParams }: PageProps) {
  const { status = "all" } = await searchParams;
  const activeFilter = (
    ["all", "open", "permanent", "closed"].includes(status) ? status : "all"
  ) as StatusFilter;

  // Fetch all published public/internal editals
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      slug: documents.slug,
      contentMd: documents.contentMd,
      fileUrl: documents.fileUrl,
      visibility: documents.visibility,
      categoryId: documents.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      authorId: documents.authorId,
      publishedAt: documents.publishedAt,
      deletedAt: documents.deletedAt,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      editalOpensAt: editals.opensAt,
      editalClosesAt: editals.closesAt,
      editalProjectType: editals.projectType,
    })
    .from(editals)
    .innerJoin(documents, eq(editals.id, documents.id))
    .leftJoin(categories, eq(categories.id, documents.categoryId))
    .where(
      and(
        isNull(documents.deletedAt),
        isNotNull(documents.publishedAt),
        or(
          eq(documents.visibility, "public"),
          eq(documents.visibility, "internal"),
        ),
      ),
    )
    .orderBy(desc(documents.publishedAt));

  // Fetch tags for all editals
  const editalIds = rows.map((r) => r.id);
  const tagRows =
    editalIds.length > 0
      ? await db
          .select({
            documentId: documentTags.documentId,
            tagId: tags.id,
            tagName: tags.name,
            tagSlug: tags.slug,
          })
          .from(documentTags)
          .innerJoin(tags, eq(tags.id, documentTags.tagId))
          .where(inArray(documentTags.documentId, editalIds))
      : [];

  const tagMap = new Map<
    string,
    Array<{ id: string; name: string; slug: string }>
  >();
  for (const t of tagRows) {
    const arr = tagMap.get(t.documentId) ?? [];
    arr.push({ id: t.tagId, name: t.tagName, slug: t.tagSlug });
    tagMap.set(t.documentId, arr);
  }

  // Build Edital objects
  const allEditais: Edital[] = rows.map((row) => {
    const cycleType =
      !row.editalOpensAt && !row.editalClosesAt
        ? ("pontual" as const)
        : ("anual" as const);
    const docTags = (tagMap.get(row.id) ?? []).map((t) => ({
      ...t,
      color: null,
    }));
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: extractDescription(row.contentMd),
      type: "edital" as const,
      visibility: row.visibility,
      status: row.publishedAt ? ("published" as const) : ("draft" as const),
      categoryId: row.categoryId ?? "",
      category: {
        id: row.categoryId ?? "",
        name: row.categoryName ?? "Sem categoria",
        slug: row.categorySlug ?? "",
        description: null,
        parentId: null,
        children: [],
        documentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tags: docTags,
      currentVersionId: null,
      currentVersion: null,
      publishedBy: row.authorId,
      publishedAt: row.publishedAt,
      createdBy: row.authorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      cycleType,
      opensAt: row.editalOpensAt,
      closesAt: row.editalClosesAt,
      projectType: row.editalProjectType,
      projectCategory: null,
    };
  });

  // Count by status
  const counts: Record<StatusFilter, number> = {
    all: allEditais.length,
    open: allEditais.filter((e) => {
      const s = getEditalStatus(e);
      return s === "open" || s === "upcoming";
    }).length,
    permanent: allEditais.filter((e) => getEditalStatus(e) === "permanent")
      .length,
    closed: allEditais.filter((e) => getEditalStatus(e) === "closed").length,
  };

  // Apply filter
  const filtered =
    activeFilter === "all"
      ? allEditais
      : activeFilter === "open"
        ? allEditais.filter((e) => {
            const s = getEditalStatus(e);
            return s === "open" || s === "upcoming";
          })
        : activeFilter === "permanent"
          ? allEditais.filter((e) => getEditalStatus(e) === "permanent")
          : allEditais.filter((e) => getEditalStatus(e) === "closed");

  const FILTERS = [
    { key: "all" as const, label: "Todos" },
    { key: "open" as const, label: "Abertos / Em breve" },
    { key: "permanent" as const, label: "Permanentes" },
    { key: "closed" as const, label: "Encerrados" },
  ];

  return (
    <>
      <PublicNav />

      <main className="docs-page">
        {/* Breadcrumbs */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <span style={{ color: "var(--fg)" }}>Editais</span>
        </nav>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <span className="hb-eyebrow">Editais Hebron Aseec</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--fg)",
              margin: "8px 0 12px",
              textWrap: "balance",
            }}
          >
            Janelas para submissão de projetos
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--fg-muted)",
              maxWidth: "62ch",
              margin: 0,
            }}
          >
            Editais anuais abrem janelas específicas para projetos com vigência
            em ano-calendário; editais pontuais permanecem abertos continuamente
            para situações emergenciais.
          </p>
        </div>

        {/* Filter chips — URL-based for SSR */}
        <div
          className="hb-chip-row"
          role="group"
          aria-label="Filtrar editais por status"
        >
          {FILTERS.map(({ key, label }) => (
            <Link
              key={key}
              href={key === "all" ? "/editais" : `/editais?status=${key}`}
              className={`hb-chip ${activeFilter === key ? "active" : ""}`}
              aria-pressed={activeFilter === key}
            >
              {label}
              <span className="hb-chip-count">{counts[key]}</span>
            </Link>
          ))}
        </div>

        {/* Edital grid */}
        {filtered.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <ChevronRight size={24} aria-hidden="true" />
            </div>
            <b>Nenhum edital nesta categoria</b>
            <p className="hb-empty-body">
              Tente selecionar outro filtro acima.
            </p>
            <p className="hb-empty-quote">
              "Pois sou eu que conheço os planos que tenho para vocês, diz o
              Senhor, planos de fazê-los prosperar."
              <span className="hb-empty-cite">Jeremias 29:11</span>
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
              gap: 18,
            }}
          >
            {filtered.map((edital) => (
              <EditalCard
                key={edital.id}
                edital={edital}
                href={`/editais/${edital.slug}`}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
