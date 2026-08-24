"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  ChevronRight,
  Move,
  X,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { CategoryForm, ParentNode } from "./category-form";
import type { CategoryFormValues } from "./category-form";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategoryInTree,
} from "../actions/categories";
import type { Category } from "@hebron/types/documentos";

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelMode = "none" | "create" | "edit" | "move";

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({
  category,
  depth,
  confirmDeleteId,
  deleting,
  canWrite,
  onEdit,
  onMove,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  category: Category;
  depth: number;
  confirmDeleteId: string | null;
  deleting: boolean;
  canWrite: boolean;
  onEdit: (cat: Category) => void;
  onMove: (cat: Category) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}) {
  const isConfirming = confirmDeleteId === category.id;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 16px",
          paddingLeft: `${16 + depth * 22}px`,
          borderBottom: "1px solid var(--divider)",
          background: isConfirming ? "rgba(220,38,38,0.05)" : "transparent",
          transition: "background var(--dur-fast)",
        }}
      >
        {depth > 0 && (
          <ChevronRight
            size={11}
            style={{ color: "var(--fg-subtle)", flexShrink: 0 }}
            aria-hidden="true"
          />
        )}
        <FolderTree
          size={13}
          style={{
            color: depth === 0 ? "var(--brand)" : "var(--fg-muted)",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: depth === 0 ? 600 : 400,
            color: "var(--fg)",
            fontFamily: "var(--font-body)",
          }}
        >
          {category.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-subtle)",
            background: "var(--bg-alt)",
            padding: "2px 8px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--divider)",
            flexShrink: 0,
          }}
        >
          {category.documentCount} doc
          {category.documentCount !== 1 ? "s" : ""}
        </span>

        {/* Conselheiro navega a área editorial mas é somente-leitura
            (P-1.19b/P-1.19c): sem escrita, a linha não oferece editar /
            mover / remover — todas as actions de categoria passam pelo
            `editorAction`, que recusaria no clique. */}
        {!canWrite ? null : isConfirming ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span
              style={{ fontSize: 12, color: "var(--hb-red)", fontWeight: 500 }}
            >
              Confirmar remoção?
            </span>
            <button
              type="button"
              onClick={() => onDeleteConfirm(category.id)}
              disabled={deleting}
              className="hb-btn hb-btn-sm"
              style={{
                background: "var(--hb-red)",
                color: "#fff",
                border: "none",
                fontSize: 12,
                padding: "4px 10px",
                minWidth: 64,
              }}
            >
              {deleting ? (
                <Loader2
                  size={11}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                "Remover"
              )}
            </button>
            <button
              type="button"
              onClick={onDeleteCancel}
              className="hb-btn hb-btn-ghost hb-btn-sm"
              aria-label="Cancelar remoção"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="hb-btn hb-btn-ghost hb-btn-xs"
              aria-label={`Editar ${category.name}`}
            >
              <Pencil size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onMove(category)}
              className="hb-btn hb-btn-ghost hb-btn-xs"
              aria-label={`Mover ${category.name} para outra categoria pai`}
            >
              <Move size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteRequest(category.id)}
              className="hb-btn hb-btn-ghost hb-btn-xs"
              aria-label={`Remover ${category.name}`}
              style={{ color: "var(--hb-red)" }}
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {category.children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          confirmDeleteId={confirmDeleteId}
          deleting={deleting}
          canWrite={canWrite}
          onEdit={onEdit}
          onMove={onMove}
          onDeleteRequest={onDeleteRequest}
          onDeleteConfirm={onDeleteConfirm}
          onDeleteCancel={onDeleteCancel}
        />
      ))}
    </>
  );
}

// ─── countAll ─────────────────────────────────────────────────────────────────

function countAll(cats: Category[]): number {
  return cats.reduce((sum, cat) => sum + 1 + countAll(cat.children), 0);
}

// ─── CategoriesManager ────────────────────────────────────────────────────────

export function CategoriesManager({
  initialTree,
  canWrite = true,
}: {
  initialTree: Category[];
  canWrite?: boolean;
}) {
  const router = useRouter();

  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [movingCategory, setMovingCategory] = useState<Category | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);

  function openCreate() {
    setEditingCategory(null);
    setPanelMode("create");
    setError(null);
    setConfirmDeleteId(null);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setPanelMode("edit");
    setError(null);
    setConfirmDeleteId(null);
  }

  function openMove(cat: Category) {
    setMovingCategory(cat);
    setMoveTargetId(cat.parentId);
    setPanelMode("move");
    setError(null);
    setConfirmDeleteId(null);
  }

  function closePanel() {
    setPanelMode("none");
    setEditingCategory(null);
    setMovingCategory(null);
    setMoveTargetId(null);
    setError(null);
  }

  const handleSubmit = useCallback(
    async (values: CategoryFormValues) => {
      setSubmitting(true);
      setError(null);
      try {
        if (panelMode === "create") {
          const result = await createCategory({
            name: values.name,
            parentId: values.parentId ?? undefined,
          });
          if (result?.serverError) throw new Error(result.serverError);
        } else if (panelMode === "edit" && editingCategory) {
          const result = await updateCategory({
            id: editingCategory.id,
            name: values.name,
            parentId: values.parentId ?? undefined,
          });
          if (result?.serverError) throw new Error(result.serverError);
        }
        closePanel();
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao salvar categoria.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [panelMode, editingCategory, router],
  );

  async function handleDeleteConfirm(id: string) {
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteCategory({ id });
      if (result?.serverError) throw new Error(result.serverError);
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao remover categoria.",
      );
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleMoveConfirm() {
    if (!movingCategory) return;
    setMoving(true);
    setError(null);
    try {
      const result = await moveCategoryInTree({
        id: movingCategory.id,
        newParentId: moveTargetId,
      });
      if (result?.serverError) throw new Error(result.serverError);
      closePanel();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao mover categoria.");
    } finally {
      setMoving(false);
    }
  }

  const total = countAll(initialTree);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.2)",
            fontSize: 13,
            color: "var(--hb-red)",
          }}
        >
          <AlertTriangle size={14} aria-hidden="true" />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              padding: 2,
              display: "flex",
            }}
            aria-label="Fechar"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Form panel */}
      {(panelMode === "create" || panelMode === "edit") && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--fg)",
              }}
            >
              {panelMode === "create"
                ? "Nova categoria"
                : `Editando: ${editingCategory?.name}`}
            </span>
            <button
              type="button"
              onClick={closePanel}
              className="hb-btn hb-btn-ghost hb-btn-sm"
              aria-label="Fechar formulário"
            >
              <X size={14} aria-hidden="true" />
              Cancelar
            </button>
          </div>

          <CategoryForm
            categories={initialTree}
            editingCategory={editingCategory}
            initialValues={
              editingCategory
                ? {
                    name: editingCategory.name,
                    slug: editingCategory.slug,
                    description: editingCategory.description ?? "",
                    parentId: editingCategory.parentId,
                  }
                : undefined
            }
            mode={panelMode === "edit" ? "edit" : "create"}
            onSubmit={(values) => void handleSubmit(values)}
            onCancel={closePanel}
            isLoading={submitting}
          />
        </div>
      )}

      {/* Move panel — reparenta via moveCategoryInTree; a ordem entre irmãos
          permanece alfabética (decisão P-1.16c, saída b). */}
      {panelMode === "move" && movingCategory && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--fg)",
              }}
            >
              Mover: {movingCategory.name}
            </span>
            <button
              type="button"
              onClick={closePanel}
              className="hb-btn hb-btn-ghost hb-btn-sm"
              aria-label="Fechar"
            >
              <X size={14} aria-hidden="true" />
              Cancelar
            </button>
          </div>

          <section className="hb-card" style={{ padding: "22px 24px" }}>
            <span className="hb-eyebrow">Nova categoria pai</span>
            <p
              style={{
                margin: "4px 0 12px",
                fontSize: 12.5,
                color: "var(--fg-muted)",
              }}
            >
              Escolha para onde <strong>{movingCategory.name}</strong> deve se
              mover. A ordem entre categorias no mesmo nível é sempre
              alfabética.
            </p>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                padding: "8px",
                maxHeight: 260,
                overflowY: "auto",
              }}
              role="tree"
              aria-label="Escolha a nova categoria pai"
            >
              <button
                type="button"
                onClick={() => setMoveTargetId(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "var(--radius-xs, 4px)",
                  border: "none",
                  background:
                    moveTargetId === null ? "var(--brand)" : "transparent",
                  color:
                    moveTargetId === null
                      ? "var(--brand-fg)"
                      : "var(--fg-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  textAlign: "left",
                  marginBottom: 4,
                }}
              >
                Nenhuma (categoria raiz)
                {moveTargetId === null && (
                  <Check
                    size={12}
                    aria-hidden="true"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </button>

              <div
                style={{
                  height: 1,
                  background: "var(--divider)",
                  margin: "4px 8px 8px",
                }}
                role="separator"
              />

              {initialTree.map((cat) => (
                <ParentNode
                  key={cat.id}
                  category={cat}
                  depth={0}
                  selectedId={moveTargetId}
                  disabledId={movingCategory.id}
                  onSelect={(id) => setMoveTargetId(id)}
                />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={closePanel}
                className="hb-btn hb-btn-ghost hb-btn-sm"
                disabled={moving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleMoveConfirm()}
                className="hb-btn hb-btn-primary hb-btn-sm"
                disabled={moving || moveTargetId === movingCategory.parentId}
              >
                {moving ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Check size={13} aria-hidden="true" />
                )}
                Confirmar movimentação
              </button>
            </div>
          </section>
        </div>
      )}

      {/* List */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--fg)",
              }}
            >
              Categorias existentes
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--fg-muted)",
                background: "var(--bg-alt)",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--divider)",
              }}
            >
              {total}
            </span>
          </div>

          {canWrite && panelMode === "none" && (
            <button
              type="button"
              onClick={openCreate}
              className="hb-btn hb-btn-primary hb-btn-sm"
            >
              <Plus size={14} aria-hidden="true" />
              Nova categoria
            </button>
          )}
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          {initialTree.length === 0 ? (
            <div
              style={{
                padding: "52px 24px",
                textAlign: "center",
                color: "var(--fg-muted)",
              }}
            >
              <FolderTree
                size={32}
                style={{
                  margin: "0 auto 14px",
                  opacity: 0.25,
                  display: "block",
                }}
                aria-hidden="true"
              />
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 600,
                  margin: "0 0 6px",
                  color: "var(--fg)",
                }}
              >
                Nenhuma categoria ainda
              </p>
              <p style={{ fontSize: 13, margin: canWrite ? "0 0 20px" : 0 }}>
                {canWrite
                  ? "Crie a primeira categoria para organizar os documentos."
                  : "As categorias criadas pela equipe editorial aparecem aqui."}
              </p>
              {canWrite && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="hb-btn hb-btn-primary hb-btn-sm"
                >
                  <Plus size={14} aria-hidden="true" />
                  Criar primeira categoria
                </button>
              )}
            </div>
          ) : (
            initialTree.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                depth={0}
                confirmDeleteId={confirmDeleteId}
                deleting={deleting}
                canWrite={canWrite}
                onEdit={openEdit}
                onMove={openMove}
                onDeleteRequest={(id) => setConfirmDeleteId(id)}
                onDeleteConfirm={(id) => void handleDeleteConfirm(id)}
                onDeleteCancel={() => setConfirmDeleteId(null)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
