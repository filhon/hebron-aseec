import { getCategories } from "../../../lib/queries";
import { CategoryTree } from "../../../components/category-tree";

export default async function PlanoContasPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--fg-muted)" }}
          >
            Financeiro
          </p>
          <p
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
          >
            Plano de contas
          </p>
        </div>
      </div>

      <div className="p-6">
        <CategoryTree categories={categories} />
      </div>
    </div>
  );
}
