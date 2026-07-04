import Link from "next/link";
import { ChevronRight, Rss } from "lucide-react";
import { cookies } from "next/headers";
import { PublicNav } from "../../components/public-nav";
import { db } from "@hebron/db/client";
import { categories, users } from "@hebron/db/schema";
import { eq } from "drizzle-orm";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { resolveSession } from "@hebron/auth/server";
import { listSubscriptions } from "../../actions/subscriptions";
import { AssinaturasClient } from "./_client";
import type { Category } from "@hebron/types/documentos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assinaturas — Documentos Hebron Aseec",
  description: "Gerencie os alertas por email para novas publicações.",
};

function buildTree(
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
  }>,
): Category[] {
  const map = new Map<string, Category>();
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: null,
      parentId: row.parentId,
      children: [],
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  const roots: Category[] = [];
  for (const cat of map.values()) {
    if (cat.parentId !== null) {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children.push(cat);
        continue;
      }
    }
    roots.push(cat);
  }
  function sortChildren(cats: Category[]) {
    cats.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    cats.forEach((c) => sortChildren(c.children));
  }
  sortChildren(roots);
  return roots;
}

export default async function AssinaturasPage() {
  const cookieStore = await cookies();
  let actorId: string | null = null;
  try {
    const session = await resolveSession(cookieStore);
    actorId = session.actorId;
  } catch {
    actorId = null;
  }

  return (
    <>
      <PublicNav />

      <main className="docs-page-narrow">
        {/* Breadcrumbs */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <span style={{ color: "var(--fg)" }}>Assinaturas</span>
        </nav>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <span className="hb-eyebrow">Para parceiros e missionários</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(26px, 3.5vw, 40px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--fg)",
              margin: "8px 0 12px",
            }}
          >
            Receba alertas por email
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--fg-muted)",
              maxWidth: "62ch",
              margin: 0,
            }}
          >
            Escolha as categorias que importam para você e seja notificado
            quando um novo documento for publicado ou um edital abrir.
          </p>
        </div>

        {actorId ? (
          <AssinaturasClientLoader actorId={actorId} />
        ) : (
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <Rss size={24} aria-hidden="true" />
            </div>
            <b>Entre para gerenciar suas assinaturas</b>
            <p className="hb-empty-body">
              As assinaturas por categoria exigem uma conta autenticada.
            </p>
            <a
              href={CANONICAL_LOGIN_URL}
              className="hb-btn hb-btn-primary"
              style={{ marginTop: 16 }}
            >
              Entrar
            </a>
          </div>
        )}
      </main>
    </>
  );
}

async function AssinaturasClientLoader({ actorId }: { actorId: string }) {
  const [catRows, subsResult, [userRow]] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
      })
      .from(categories)
      .orderBy(categories.name),
    listSubscriptions({}),
    db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1),
  ]);

  const tree = buildTree(catRows);
  const initialSubscribedIds = (subsResult?.data?.subscriptions ?? []).map(
    (s) => s.subscription.categoryId,
  );

  return (
    <AssinaturasClient
      categories={tree}
      userEmail={userRow?.email ?? ""}
      initialSubscribedIds={initialSubscribedIds}
    />
  );
}
