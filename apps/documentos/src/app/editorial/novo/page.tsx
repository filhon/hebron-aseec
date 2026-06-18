"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Eye,
  Send,
  Check,
  Plus,
  Trash2,
  Upload,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  createDocument,
  publishDocument,
  getUploadUrl,
} from "../../../actions/documents";
import { createEdital } from "../../../actions/editals";
import { listCategories } from "../../../actions/categories";

type TabId = "conteudo" | "metadados" | "submissao" | "faq";
type Visibility = "public" | "internal" | "restricted";
type DocType = "documento" | "edital";

interface FaqEntry {
  q: string;
  a: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

const INITIAL_CONTENT = `# Edital de Projetos 2026

## 1. Objeto
A Hebron Aseec torna público o presente edital, que tem por objeto a seleção de projetos com vigência em ano-calendário.

## 2. Cronograma
- Abertura das submissões: 01 de fevereiro de 2026
- Encerramento: 15 de março de 2026
- Avaliação e parecer: 16 de março a 30 de abril
- Votação da diretoria e conselho: reunião ordinária de maio

## 3. Critérios de avaliação
A avaliação considera:
- **Aderência à missão** da Hebron Aseec (peso 30%)
- **Viabilidade orçamentária** (peso 20%)
- **Impacto missionário** estimado (peso 20%)
- **Capacidade institucional** (peso 15%)
- **Impacto regional** (peso 10%)
- **Histórico de prestação de contas** (peso 5%)

## 4. Submissão
A submissão é realizada pelo módulo Projetos em \`projetos.hebronaseec.com.br\`.

## 5. Disposições finais
Casos omissos serão decididos pela diretoria.`;

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

export default function NovoDocumentoPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("conteudo");
  const [docType, setDocType] = useState<DocType>("edital");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [categoryId, setCategoryId] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<CategoryOption[]>([]);
  const [faqItems, setFaqItems] = useState<FaqEntry[]>([
    {
      q: "Quem pode submeter?",
      a: "Pastores, missionários e instituições religiosas cadastradas e aprovadas.",
    },
    {
      q: "Posso submeter mais de um projeto?",
      a: "Sim, respeitando o teto orçamentário anual da instituição vinculada.",
    },
    {
      q: "Como funciona a avaliação?",
      a: "Avaliadores emitem parecer; diretoria e conselho votam de forma secreta.",
    },
  ]);

  // Load categories from DB via server action
  useEffect(() => {
    void listCategories({}).then((result) => {
      const cats = (result?.data?.categories ?? []) as Array<{
        id: string;
        name: string;
      }>;
      setDbCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      if (cats[3]) setCategoryId(cats[3].id);
      else if (cats[0]) setCategoryId(cats[0].id);
    });
  }, []);

  const checklist: { done: boolean; label: string }[] = [
    { done: !!title, label: "Título preenchido" },
    { done: summary.length > 40, label: "Resumo com 40+ caracteres" },
    {
      done:
        docType === "documento" ||
        (docType === "edital" && !!opensAt && !!closesAt),
      label: docType === "edital" ? "Cronograma definido" : "Tipo selecionado",
    },
    { done: content.length > 400, label: "Conteúdo com base completa" },
    { done: faqItems.length >= 2, label: "Pelo menos 2 FAQs" },
    { done: false, label: "Aprovação da diretoria registrada" },
  ];

  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

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
    { id: "submissao", label: "Integração Projetos" },
    { id: "faq", label: "FAQ" },
  ];

  function removeFaq(index: number) {
    setFaqItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addFaq() {
    setFaqItems((prev) => [...prev, { q: "", a: "" }]);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      setPublishError("Apenas arquivos PDF são aceitos.");
      return;
    }
    setUploadingFile(true);
    setPublishError(null);
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
      setPublishError(
        err instanceof Error ? err.message : "Erro ao enviar arquivo.",
      );
    } finally {
      setUploadingFile(false);
    }
  }

  async function handlePublish() {
    if (!title.trim()) {
      setPublishError("Título é obrigatório.");
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      let docId: string | null = null;

      const contentMd = content.trim() || undefined;
      const visibility_ = visibility;

      if (docType === "edital") {
        const cycleType =
          opensAt && closesAt ? ("anual" as const) : ("pontual" as const);
        const result = await createEdital({
          title: title.trim(),
          contentMd,
          storagePath: storagePath ?? undefined,
          visibility: visibility_,
          categoryId: categoryId || undefined,
          cycleType,
          opensAt: opensAt ? new Date(opensAt).toISOString() : null,
          closesAt: closesAt ? new Date(closesAt).toISOString() : null,
        });
        docId = result?.data?.document?.id ?? null;
      } else {
        const result = await createDocument({
          title: title.trim(),
          contentMd,
          storagePath: storagePath ?? undefined,
          visibility: visibility_,
          categoryId: categoryId || undefined,
        });
        docId = result?.data?.document?.id ?? null;
      }

      if (!docId) throw new Error("Falha ao criar documento.");

      await publishDocument({ id: docId });
      router.push("/editorial");
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Erro ao publicar.");
    } finally {
      setPublishing(false);
    }
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
        <span style={{ color: "var(--fg)" }}>Novo documento</span>
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
          <span className="hb-eyebrow">Criando</span>
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
            {title || "Novo documento / edital"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>
            Defina o conteúdo, cronograma e integração com o módulo Projetos.
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
          {publishError && (
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
              {publishError}
            </span>
          )}
          <button type="button" className="hb-btn hb-btn-ghost hb-btn-sm">
            <Eye size={14} aria-hidden="true" />
            Pré-visualizar
          </button>
          <button
            type="button"
            className="hb-btn hb-btn-primary"
            onClick={() => void handlePublish()}
            disabled={publishing || uploadingFile}
          >
            {publishing ? (
              <Loader2 size={14} aria-hidden="true" className="animate-spin" />
            ) : (
              <Send size={14} aria-hidden="true" />
            )}
            {publishing ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>

      {/* Doc type toggle */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 20 }}
        role="group"
        aria-label="Tipo de publicação"
      >
        <button
          type="button"
          className={`hb-chip ${docType === "edital" ? "active" : ""}`}
          onClick={() => setDocType("edital")}
        >
          Edital
        </button>
        <button
          type="button"
          className={`hb-chip ${docType === "documento" ? "active" : ""}`}
          onClick={() => setDocType("documento")}
        >
          Documento
        </button>
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
                onClick={() => setActiveTab(tab.id)}
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
                    placeholder="Ex.: Edital de Projetos Missionários 2026"
                    className="hb-form-input"
                  />
                </div>

                <div className="hb-form-row">
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Resumo
                  </label>
                  <div className="hb-form-hint">
                    Aparece nos cards, compartilhamento social e como
                    meta-description.
                  </div>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                    placeholder="Descreva em até 240 caracteres o propósito deste documento."
                    className="hb-form-textarea"
                    style={{ minHeight: 72 }}
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
                      {dbCategories.length === 0 && (
                        <option value="">Carregando…</option>
                      )}
                      {dbCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hb-form-row" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>
                      Slug
                    </label>
                    <input
                      type="text"
                      value={slug || "novo-documento"}
                      readOnly
                      className="hb-form-input"
                      style={{ background: "var(--bg-alt)", cursor: "default" }}
                    />
                    <div className="hb-form-hint">
                      Gerado a partir do título.
                    </div>
                  </div>
                </div>

                {/* Upload PDF */}
                <div className="hb-form-row" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Arquivo PDF (opcional)
                  </label>
                  <div className="hb-form-hint">
                    Se um arquivo for enviado, ele substituirá o conteúdo
                    Markdown no visualizador.
                  </div>
                  <label
                    style={{
                      border: `2px dashed ${storagePath ? "var(--hb-green)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "28px 20px",
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
                        size={24}
                        style={{
                          color: "var(--brand)",
                          margin: "0 auto 10px",
                          display: "block",
                        }}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : storagePath ? (
                      <Check
                        size={24}
                        style={{
                          color: "var(--hb-green)",
                          margin: "0 auto 10px",
                          display: "block",
                        }}
                        aria-hidden="true"
                      />
                    ) : (
                      <Upload
                        size={24}
                        style={{
                          color: "var(--fg-muted)",
                          margin: "0 auto 10px",
                          display: "block",
                        }}
                        aria-hidden="true"
                      />
                    )}
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {storagePath
                        ? "PDF carregado com sucesso"
                        : uploadingFile
                          ? "Enviando…"
                          : "Arraste um PDF ou clique para escolher"}
                    </div>
                    {!storagePath && (
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        Máximo 50 MB · PDF apenas
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* ── Integração Projetos tab ── */}
            {activeTab === "submissao" && (
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

                <div className="hb-form-row" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    URL gerada para "Submeter projeto"
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "var(--bg-alt)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <code
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12.5,
                        color: "var(--fg-muted)",
                        wordBreak: "break-all",
                      }}
                    >
                      projetos.hebronaseec.com.br/novo?edital=
                      {slug || "novo-documento"}
                    </code>
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
                    As perguntas aparecem na página do edital. Ordene como
                    preferir.
                  </div>
                </div>

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
          {/* Checklist */}
          <div className="docs-editor-aside-card">
            <div className="docs-editor-aside-title">
              Checklist de publicação
            </div>
            <ul className="docs-checklist" aria-label="Checklist de publicação">
              {checklist.map((item, i) => (
                <li
                  key={i}
                  className={`docs-checklist-item ${item.done ? "done" : ""}`}
                >
                  <div className="docs-checklist-check" aria-hidden="true">
                    {item.done && <Check size={10} />}
                  </div>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Preview card */}
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
                marginBottom: 12,
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
                {title || "Título do documento"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--fg-invert-muted)",
                  lineHeight: 1.4,
                }}
              >
                {summary
                  ? summary.slice(0, 100) + (summary.length > 100 ? "…" : "")
                  : "Resumo aparecerá aqui quando preenchido."}
              </div>
            </div>

            {opensAt && closesAt && (
              <div style={{ fontSize: 12, color: "var(--fg-invert-muted)" }}>
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

          {/* Storage upload status */}
          {storagePath && (
            <div className="docs-editor-aside-card">
              <div className="docs-editor-aside-title">Arquivo PDF</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <Check
                  size={14}
                  style={{ color: "var(--hb-green)" }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    color: "var(--fg-muted)",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                >
                  {storagePath.split("/").pop()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
