"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Eye,
  Save,
  Plus,
  Trash2,
  Upload,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { updateDocument, getUploadUrl } from "../../../../actions/documents";
import { updateEdital } from "../../../../actions/editals";
import { listCategories } from "../../../../actions/categories";

type TabId = "conteudo" | "metadados" | "submissao" | "faq";
type Visibility = "public" | "internal" | "restricted";

interface FaqEntry {
  q: string;
  a: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface InitialDocData {
  id: string;
  title: string;
  contentMd: string | null;
  fileUrl: string | null;
  visibility: Visibility;
  categoryId: string | null;
  isEdital: boolean;
  editalOpensAt: Date | null;
  editalClosesAt: Date | null;
}

function previewMarkdown(md: string): string {
  return md
    .split("\n")
    .map((line) => {
      if (/^# /.test(line))
        return `<h2 style="font-family:var(--font-display);font-size:18px;font-weight:700;letter-spacing:-0.01em;color:var(--hb-blue);margin:0 0 6px">${line.replace(/^# /, "")}</h2>`;
      if (/^## /.test(line))
        return `<h3 style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--fg);margin:14px 0 4px">${line.replace(/^## /, "")}</h3>`;
      if (/^- /.test(line))
        return `<li style="font-size:13px;line-height:1.5">${line.replace(/^- /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`;
      if (line.trim() === "") return "";
      return `<p style="font-size:13px;line-height:1.55;color:var(--fg);margin:0 0 8px">${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, '<code style="background:var(--bg-alt);padding:1px 5px;border-radius:3px;font-size:11px">$1</code>')}</p>`;
    })
    .join("")
    .replace(
      /(<li.*?<\/li>\s*)+/g,
      (m) =>
        `<ul style="margin:0 0 10px;padding-left:18px;list-style:disc">${m}</ul>`,
    );
}

function toISODate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0] ?? "";
}

export function EditDocumentClient({ doc }: { doc: InitialDocData }) {
  const [activeTab, setActiveTab] = useState<TabId>("conteudo");
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.contentMd ?? "");
  const [visibility, setVisibility] = useState<Visibility>(doc.visibility);
  const [categoryId, setCategoryId] = useState(doc.categoryId ?? "");
  const [opensAt, setOpensAt] = useState(toISODate(doc.editalOpensAt));
  const [closesAt, setClosesAt] = useState(toISODate(doc.editalClosesAt));
  const [storagePath, setStoragePath] = useState<string | null>(doc.fileUrl);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dbCategories, setDbCategories] = useState<CategoryOption[]>([]);
  const [faqItems, setFaqItems] = useState<FaqEntry[]>([]);

  useEffect(() => {
    void listCategories({}).then((result) => {
      const cats = (result?.data?.categories ?? []) as Array<{
        id: string;
        name: string;
      }>;
      setDbCategories(cats.map((c) => ({ id: c.id, name: c.name })));
    });
  }, []);

  const VISIBILITY_OPTIONS: {
    value: Visibility;
    label: string;
    desc: string;
  }[] = [
    {
      value: "public",
      label: "Público",
      desc: "Visível para qualquer pessoa no portal.",
    },
    {
      value: "internal",
      label: "Interno",
      desc: "Visível apenas para colaboradores autenticados.",
    },
    {
      value: "restricted",
      label: "Restrito",
      desc: "Visível somente para super_admin e diretoria.",
    },
  ];

  const TABS: { id: TabId; label: string }[] = [
    { id: "conteudo", label: "Conteúdo" },
    { id: "metadados", label: "Metadados" },
    ...(doc.isEdital
      ? ([{ id: "submissao", label: "Integração Projetos" }] as const)
      : []),
    { id: "faq", label: "FAQ" },
  ];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      setSaveError("Apenas arquivos PDF são aceitos.");
      return;
    }
    setUploadingFile(true);
    setSaveError(null);
    try {
      const urlResult = await getUploadUrl({
        fileName: file.name,
        mimeType: "application/pdf",
      });
      const uploadData = urlResult?.data;
      if (!uploadData) throw new Error("Não foi possível obter URL de upload.");
      const res = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });
      if (!res.ok) throw new Error("Falha ao enviar arquivo para o storage.");
      setStoragePath(uploadData.storagePath);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Erro ao enviar arquivo.",
      );
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setSaveError("Título é obrigatório.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      if (doc.isEdital) {
        const result = await updateEdital({
          id: doc.id,
          title: title.trim(),
          contentMd: content.trim() || undefined,
          storagePath: storagePath ?? undefined,
          visibility,
          categoryId: categoryId || null,
          opensAt: opensAt ? new Date(opensAt).toISOString() : null,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        });
        if (!result?.data) throw new Error("Falha ao atualizar edital.");
      } else {
        const result = await updateDocument({
          id: doc.id,
          title: title.trim(),
          contentMd: content.trim() || undefined,
          storagePath: storagePath ?? undefined,
          visibility,
          categoryId: categoryId || null,
        });
        if (!result?.data) throw new Error("Falha ao atualizar documento.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Erro ao salvar alterações.",
      );
    } finally {
      setSaving(false);
    }
  }

  function removeFaq(index: number) {
    setFaqItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addFaq() {
    setFaqItems((prev) => [...prev, { q: "", a: "" }]);
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
        <Link href="/editorial">Área editorial</Link>
        <ChevronRight
          size={12}
          className="docs-breadcrumbs-sep"
          aria-hidden="true"
        />
        <span style={{ color: "var(--fg)" }}>
          {doc.title.length > 48 ? `${doc.title.slice(0, 48)}…` : doc.title}
        </span>
      </nav>

      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="hb-eyebrow">
            Editando {doc.isEdital ? "edital" : "documento"}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: "6px 0 4px",
              color: "var(--fg)",
            }}
          >
            {title || doc.title}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
            As alterações criam automaticamente uma nova versão no histórico.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {saveError && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: "var(--hb-red, #dc2626)",
              }}
            >
              <AlertTriangle size={13} aria-hidden="true" />
              {saveError}
            </span>
          )}
          {saved && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                color: "var(--hb-green)",
              }}
            >
              <Check size={13} aria-hidden="true" />
              Salvo
            </span>
          )}
          <button type="button" className="hb-btn hb-btn-ghost hb-btn-sm">
            <Eye size={14} aria-hidden="true" />
            Pré-visualizar
          </button>
          <button
            type="button"
            className="hb-btn hb-btn-primary"
            onClick={() => void handleSave()}
            disabled={saving || uploadingFile}
          >
            {saving ? (
              <Loader2 size={14} aria-hidden="true" className="animate-spin" />
            ) : (
              <Save size={14} aria-hidden="true" />
            )}
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>

      {/* Editor shell */}
      <div className="docs-editor-shell">
        {/* Editor pane */}
        <div className="docs-editor-pane">
          {/* Tabs */}
          <div className="docs-editor-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`docs-editor-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id as TabId)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="docs-editor-body">
            {/* ── Conteúdo tab ── */}
            {activeTab === "conteudo" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div className="hb-form-row">
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título do documento"
                    className="hb-form-input"
                  />
                </div>

                <div className="hb-form-row">
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Conteúdo (Markdown)
                  </label>
                  <div className="hb-form-hint">
                    Renderizado com a tipografia da Hebron Aseec.
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="hb-form-textarea hb-form-textarea-mono"
                      style={{ minHeight: 400 }}
                      aria-label="Editor de conteúdo Markdown"
                    />
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "16px 18px",
                        overflowY: "auto",
                        maxHeight: 400,
                        background: "var(--hb-cream)",
                      }}
                      aria-label="Pré-visualização do conteúdo"
                      dangerouslySetInnerHTML={{
                        __html: previewMarkdown(content),
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Metadados tab ── */}
            {activeTab === "metadados" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div className="hb-form-row">
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Visibilidade
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                    }}
                  >
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVisibility(opt.value)}
                        style={{
                          padding: "14px 16px",
                          border: `2px solid ${visibility === opt.value ? "var(--brand)" : "var(--border)"}`,
                          borderRadius: "var(--radius-sm)",
                          background:
                            visibility === opt.value
                              ? "rgba(32,44,133,0.06)"
                              : "var(--surface)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all var(--dur-fast)",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            marginBottom: 4,
                            color:
                              visibility === opt.value
                                ? "var(--brand)"
                                : "var(--fg)",
                          }}
                        >
                          {opt.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--fg-muted)",
                            lineHeight: 1.4,
                          }}
                        >
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="hb-form-row" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>
                      Categoria
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="hb-form-select"
                      disabled={dbCategories.length === 0}
                    >
                      <option value="">Sem categoria</option>
                      {dbCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hb-form-row" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>
                      Arquivo PDF (opcional)
                    </label>
                    <label
                      style={{
                        border: `2px dashed ${storagePath ? "var(--hb-green)" : "var(--border)"}`,
                        borderRadius: "var(--radius-sm)",
                        padding: "14px 16px",
                        textAlign: "center",
                        cursor: "pointer",
                        display: "block",
                        transition: "border-color var(--dur-fast)",
                        opacity: uploadingFile ? 0.7 : 1,
                      }}
                    >
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => void handleFileChange(e)}
                        disabled={uploadingFile}
                      />
                      {uploadingFile ? (
                        <Loader2
                          size={18}
                          style={{
                            color: "var(--brand)",
                            margin: "0 auto 6px",
                            display: "block",
                          }}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : storagePath ? (
                        <Check
                          size={18}
                          style={{
                            color: "var(--hb-green)",
                            margin: "0 auto 6px",
                            display: "block",
                          }}
                          aria-hidden="true"
                        />
                      ) : (
                        <Upload
                          size={18}
                          style={{
                            color: "var(--fg-muted)",
                            margin: "0 auto 6px",
                            display: "block",
                          }}
                          aria-hidden="true"
                        />
                      )}
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        {storagePath
                          ? storagePath.split("/").pop()
                          : uploadingFile
                            ? "Enviando…"
                            : "Substituir PDF"}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── Integração Projetos tab (editals only) ── */}
            {activeTab === "submissao" && doc.isEdital && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <div className="hb-form-row">
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Janela de submissão
                  </label>
                  <div className="hb-form-hint">
                    Defina a abertura e o encerramento do edital. Deixe em
                    branco para edital permanente.
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <div className="hb-form-row" style={{ marginBottom: 0 }}>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--fg-muted)",
                        }}
                      >
                        Abertura
                      </label>
                      <input
                        type="date"
                        value={opensAt}
                        onChange={(e) => setOpensAt(e.target.value)}
                        className="hb-form-input"
                      />
                    </div>
                    <div className="hb-form-row" style={{ marginBottom: 0 }}>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--fg-muted)",
                        }}
                      >
                        Encerramento
                      </label>
                      <input
                        type="date"
                        value={closesAt}
                        onChange={(e) => setClosesAt(e.target.value)}
                        className="hb-form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FAQ tab ── */}
            {activeTab === "faq" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div className="hb-form-row" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Perguntas frequentes
                  </label>
                  <div className="hb-form-hint">
                    As perguntas aparecem na página do documento.
                  </div>
                </div>

                {faqItems.length === 0 && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--fg-muted)",
                      margin: 0,
                    }}
                  >
                    Nenhuma FAQ cadastrada.
                  </p>
                )}

                {faqItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 14,
                      padding: "16px 18px",
                      background: "var(--bg-alt)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "var(--brand)",
                        color: "var(--brand-fg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <input
                        type="text"
                        value={item.q}
                        onChange={(e) => {
                          const next = [...faqItems];
                          if (next[index])
                            next[index] = {
                              ...next[index],
                              q: e.target.value,
                            } as FaqEntry;
                          setFaqItems(next);
                        }}
                        placeholder="Pergunta"
                        className="hb-form-input"
                        style={{ fontWeight: 600 }}
                      />
                      <textarea
                        value={item.a}
                        onChange={(e) => {
                          const next = [...faqItems];
                          if (next[index])
                            next[index] = {
                              ...next[index],
                              a: e.target.value,
                            } as FaqEntry;
                          setFaqItems(next);
                        }}
                        placeholder="Resposta"
                        className="hb-form-textarea"
                        style={{ minHeight: 60 }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      className="hb-btn hb-btn-ghost hb-btn-xs"
                      aria-label="Remover pergunta"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="hb-btn hb-btn-ghost"
                  onClick={addFaq}
                  style={{ alignSelf: "flex-start" }}
                >
                  <Plus size={14} aria-hidden="true" />
                  Adicionar pergunta
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Aside */}
        <div>
          {/* Checklist de publicação */}
          <div className="docs-editor-aside-card">
            <div className="docs-editor-aside-title">
              Checklist de publicação
            </div>
            {(() => {
              const checks = [
                {
                  label: "Título preenchido",
                  done: title.trim().length > 0,
                },
                {
                  label: "Conteúdo ou PDF anexado",
                  done: content.trim().length > 0 || storagePath !== null,
                },
                {
                  label: "Categoria definida",
                  done: categoryId.length > 0,
                },
                {
                  label: "Visibilidade configurada",
                  done: true,
                },
                ...(doc.isEdital
                  ? [
                      {
                        label: "Datas do edital definidas",
                        done: opensAt.length > 0 && closesAt.length > 0,
                      },
                    ]
                  : []),
              ];
              const doneCount = checks.filter((c) => c.done).length;
              return (
                <>
                  <ul className="docs-checklist">
                    {checks.map((item) => (
                      <li
                        key={item.label}
                        className={`docs-checklist-item ${item.done ? "done" : ""}`}
                      >
                        <span className="docs-checklist-check">
                          {item.done && <Check size={11} aria-hidden="true" />}
                        </span>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid var(--divider)",
                      fontSize: 12,
                      color:
                        doneCount === checks.length
                          ? "var(--hb-green-deep)"
                          : "var(--fg-muted)",
                    }}
                  >
                    {doneCount}/{checks.length} itens completos
                  </div>
                </>
              );
            })()}
          </div>

          <div className="docs-editor-aside-card">
            <div className="docs-editor-aside-title">Histórico de versões</div>
            <p
              style={{
                fontSize: 12,
                color: "var(--fg-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Cada salvamento gera uma nova versão imutável. O histórico
              completo fica preservado no banco.
            </p>
          </div>

          <div
            className="docs-editor-aside-card"
            style={{
              background: "var(--hb-blue)",
              borderColor: "transparent",
              color: "var(--fg-invert)",
            }}
          >
            <div
              className="docs-editor-aside-title"
              style={{ color: "var(--fg-invert)" }}
            >
              Pré-visualização
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  marginBottom: 6,
                }}
              >
                {title || doc.title}
              </div>
              {doc.isEdital && opensAt && closesAt && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--fg-invert-muted)",
                    marginTop: 6,
                  }}
                >
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  }).format(new Date(opensAt))}{" "}
                  →{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(closesAt))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
