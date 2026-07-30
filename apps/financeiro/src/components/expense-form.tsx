"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import {
  X,
  Paperclip,
  Upload,
  ChevronDown,
  AlertCircle,
  ScanText,
  LoaderCircle,
} from "lucide-react";
import { getSupabaseBrowserClient, getSession } from "@hebron/auth/client";
import {
  createPayableSchema,
  type CreatePayableInput,
} from "@hebron/validators";
import { createPayable } from "../actions/transactions";
import { extractNfFromAttachment } from "../actions/ocr";
import type { AccountCategory } from "@hebron/types/financeiro";
import type { CostCenterOption } from "../lib/queries";

const OCR_ELIGIBLE_EXTENSIONS = ["jpg", "jpeg", "png"];

const DIACRITIC_MARKS_PATTERN = /[̀-ͯ]/g;

function normalizeCategoryLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITIC_MARKS_PATTERN, "")
    .toLowerCase()
    .trim();
}

// Casa a sugestão em texto livre da OCR (packages/ai/src/financeiro/ocr.ts)
// contra o plano de contas real — só uma categoria-folha (level 3, a mesma
// exigida pelo select) pode ser pré-selecionada; sem match, a sugestão fica
// só como texto informativo e a escolha continua manual.
function matchSuggestedCategory(
  suggestion: string,
  categories: AccountCategory[],
): AccountCategory | null {
  const leaves = categories.filter(
    (c) => c.type === "despesa" && c.level === 3,
  );
  const target = normalizeCategoryLabel(suggestion);
  const exact = leaves.find((c) => normalizeCategoryLabel(c.name) === target);
  if (exact) return exact;
  return (
    leaves.find((c) => {
      const name = normalizeCategoryLabel(c.name);
      return name.includes(target) || target.includes(name);
    }) ?? null
  );
}

interface ExpenseFormProps {
  categories: AccountCategory[];
  costCenters: CostCenterOption[];
  onClose: () => void;
  onSuccess?: () => void;
}

function buildCategoryOptions(
  categories: AccountCategory[],
  type: "receita" | "despesa",
) {
  const filtered = categories.filter((c) => c.type === type);
  const roots = filtered.filter((c) => c.level === 1);
  const result: {
    id: string;
    label: string;
    code: string;
    level: number;
    disabled: boolean;
  }[] = [];

  function walk(parentId: string | null, depth: number) {
    const children = filtered.filter((c) => c.parentId === parentId);
    for (const cat of children.sort((a, b) => a.code.localeCompare(b.code))) {
      const prefix = depth === 0 ? "" : depth === 1 ? "— " : "— — ";
      result.push({
        id: cat.id,
        label: `${prefix}${cat.code} ${cat.name}`,
        code: cat.code,
        level: cat.level,
        disabled: cat.level !== 3,
      });
      walk(cat.id, depth + 1);
    }
  }

  for (const root of roots.sort((a, b) => a.code.localeCompare(b.code))) {
    result.push({
      id: root.id,
      label: `${root.code} ${root.name}`,
      code: root.code,
      level: 1,
      disabled: true,
    });
    walk(root.id, 1);
  }

  return result;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="flex items-center gap-1 text-xs font-medium mt-1"
      style={{ color: "var(--hb-orange-deep)" }}
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
      style={{ color: "var(--fg-muted)" }}
    >
      {children}
      {required && (
        <span className="ml-0.5" style={{ color: "var(--hb-orange-deep)" }}>
          *
        </span>
      )}
    </label>
  );
}

const inputCls = [
  "w-full px-3 py-2.5 rounded-(--radius) border text-sm transition-colors outline-none",
  "border-(--border) bg-(--bg) text-(--fg)",
  "placeholder:text-(--fg-muted)",
  "focus:border-(--hb-blue) focus:ring-2 focus:ring-(--hb-blue)/10",
].join(" ");

const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

export function ExpenseForm({
  categories,
  costCenters,
  onClose,
  onSuccess,
}: ExpenseFormProps) {
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadedAttachmentPath, setUploadedAttachmentPath] = useState<
    string | null
  >(null);
  const [isPreparingOcr, setIsPreparingOcr] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [categorySuggestion, setCategorySuggestion] = useState<{
    label: string;
    matched: boolean;
  } | null>(null);
  const router = useRouter();

  const categoryOptions = buildCategoryOptions(categories, "despesa");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPayableSchema),
    defaultValues: {
      supplierCnpj: null,
      costCenterId: null,
      projectId: null,
      notes: null,
    },
  });

  const { execute, isPending, result } = useAction(createPayable, {
    onSuccess() {
      router.refresh();
      onSuccess?.();
      onClose();
    },
  });

  const { execute: runOcr, isPending: isReadingNf } = useAction(
    extractNfFromAttachment,
    {
      onSuccess({ data }) {
        const extracted = data?.result;
        if (!extracted) return;

        if (extracted.amount != null) {
          setValue("amount", extracted.amount, { shouldValidate: true });
        }
        if (extracted.issuedAt) {
          // Input nativo de data espera "YYYY-MM-DD" — mesmo formato que
          // extractNfData já devolve; o schema (z.coerce.date()) converte no
          // parse do submit, não aqui.
          setValue("dueAt", extracted.issuedAt as unknown as Date, {
            shouldValidate: true,
          });
        }
        if (extracted.issuerName) {
          setValue("supplierName", extracted.issuerName, {
            shouldValidate: true,
          });
        }
        if (extracted.cnpj) {
          setValue("supplierCnpj", extracted.cnpj, { shouldValidate: true });
        }
        if (extracted.suggestedCategory) {
          const match = matchSuggestedCategory(
            extracted.suggestedCategory,
            categories,
          );
          if (match) {
            setValue("categoryId", match.id, { shouldValidate: true });
          }
          setCategorySuggestion({
            label: extracted.suggestedCategory,
            matched: match !== null,
          });
        }

        setOcrNotice(
          "Nota lida. Confira os campos preenchidos e ajuste o que for necessário.",
        );
      },
      onError({ error }) {
        setOcrError(
          error.serverError ??
            "Não foi possível ler a nota fiscal automaticamente. Preencha os campos manualmente.",
        );
      },
    },
  );

  async function uploadAttachmentToBucket(file: File): Promise<string> {
    const { session } = await getSession();
    if (!session) {
      throw new Error("Sessão expirada. Atualize a página e tente novamente.");
    }

    const supabase = getSupabaseBrowserClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

    const { data: uploadData, error: storageError } = await supabase.storage
      .from("financeiro-recibos")
      .upload(path, file, { contentType: file.type });
    if (storageError) throw new Error(storageError.message);

    return uploadData.path;
  }

  async function handleFillFromAttachment() {
    if (!attachmentFile) return;

    setOcrError(null);
    setOcrNotice(null);
    setIsPreparingOcr(true);
    try {
      const path =
        uploadedAttachmentPath ??
        (await uploadAttachmentToBucket(attachmentFile));
      setUploadedAttachmentPath(path);
      runOcr({ path });
    } catch (err) {
      setOcrError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o comprovante para leitura.",
      );
    } finally {
      setIsPreparingOcr(false);
    }
  }

  async function onSubmit(data: CreatePayableInput) {
    if (!attachmentFile) {
      execute(data);
      return;
    }

    setAttachmentError(null);
    setIsUploadingAttachment(true);
    try {
      const path =
        uploadedAttachmentPath ??
        (await uploadAttachmentToBucket(attachmentFile));

      execute({
        ...data,
        attachment: {
          path,
          fileName: attachmentFile.name,
          fileSize: attachmentFile.size,
        },
      });
    } catch (err) {
      setAttachmentError(
        err instanceof Error ? err.message : "Falha ao enviar o comprovante.",
      );
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex justify-end"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
    >
      <div
        className="w-140 max-w-full flex flex-col h-full"
        style={{
          background: "var(--bg)",
          animation: "slide-in 220ms var(--ease-out)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--hb-orange-deep)" }}
            >
              Nova despesa
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Registrar pagamento
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-(--radius) transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <form id="expense-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Descrição */}
            <div>
              <Label required>Descrição</Label>
              <input
                {...register("description")}
                className={inputCls}
                placeholder="Ex: Apoio mensal Pr. Samuel — Jun/2026"
              />
              <FieldError message={errors.description?.message} />
            </div>

            {/* Fornecedor */}
            <div className="mt-4">
              <Label required>Fornecedor / Beneficiário</Label>
              <input
                {...register("supplierName")}
                className={inputCls}
                placeholder="Nome completo ou razão social"
              />
              <FieldError message={errors.supplierName?.message} />
            </div>

            {/* CNPJ + Valor em grid */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>CNPJ (opcional)</Label>
                <input
                  {...register("supplierCnpj")}
                  className={inputCls}
                  placeholder="00000000000000"
                  maxLength={14}
                />
                <FieldError message={errors.supplierCnpj?.message} />
              </div>
              <div>
                <Label required>Valor (R$)</Label>
                <input
                  {...register("amount", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={inputCls}
                  placeholder="0,00"
                />
                <FieldError message={errors.amount?.message} />
              </div>
            </div>

            {/* Vencimento */}
            <div className="mt-4">
              <Label required>Data de vencimento</Label>
              <input {...register("dueAt")} type="date" className={inputCls} />
              <FieldError message={errors.dueAt?.message} />
            </div>

            {/* Categoria (plano de contas) */}
            <div className="relative mt-4">
              <Label required>Categoria (plano de contas)</Label>
              <select {...register("categoryId")} className={selectCls}>
                <option value="">Selecione uma categoria de despesa</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "var(--fg-muted)" }}
              />
              <FieldError message={errors.categoryId?.message} />
              {categorySuggestion && (
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Sugestão da leitura automática:{" "}
                  <strong style={{ color: "var(--fg)" }}>
                    {categorySuggestion.label}
                  </strong>
                  {!categorySuggestion.matched &&
                    " — não encontrada no plano de contas; selecione manualmente."}
                </p>
              )}
            </div>

            {/* Centro de custo */}
            <div className="relative mt-4">
              <Label>Centro de custo</Label>
              <select {...register("costCenterId")} className={selectCls}>
                <option value="">Sem centro de custo</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} — {cc.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-9.5 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "var(--fg-muted)" }}
              />
            </div>

            {/* Comprovante */}
            <div className="mt-4">
              <Label>Comprovante</Label>
              <label
                className="flex flex-col items-center justify-center gap-3 rounded-(--radius) border-2 border-dashed py-8 px-4 cursor-pointer transition-colors"
                style={{
                  borderColor: "var(--border-strong)",
                  background: "var(--bg-alt)",
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={(e) => {
                    setAttachmentFile(e.target.files?.[0] ?? null);
                    setAttachmentError(null);
                    setUploadedAttachmentPath(null);
                    setOcrError(null);
                    setOcrNotice(null);
                    setCategorySuggestion(null);
                  }}
                />
                {attachmentFile ? (
                  <div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--hb-blue)" }}
                  >
                    <Paperclip className="h-4 w-4" />
                    {attachmentFile.name}
                  </div>
                ) : (
                  <>
                    <span
                      className="flex items-center justify-center w-12 h-12 rounded-full"
                      style={{
                        background: "var(--hb-blue)",
                        color: "var(--fg-invert)",
                      }}
                    >
                      <Upload className="h-5 w-5" />
                    </span>
                    <div className="text-center">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--fg)" }}
                      >
                        Arraste ou clique para selecionar
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        PDF, JPG ou PNG · até 10 MB
                      </p>
                    </div>
                  </>
                )}
              </label>
              <FieldError message={attachmentError ?? undefined} />

              {attachmentFile &&
                OCR_ELIGIBLE_EXTENSIONS.includes(
                  attachmentFile.name.split(".").pop()?.toLowerCase() ?? "",
                ) && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleFillFromAttachment}
                      disabled={isPreparingOcr || isReadingNf}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
                      style={{ color: "var(--hb-blue)" }}
                    >
                      {isPreparingOcr || isReadingNf ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ScanText className="h-3.5 w-3.5" />
                      )}
                      {isPreparingOcr || isReadingNf
                        ? "Lendo nota fiscal…"
                        : "Preencher a partir da nota"}
                    </button>
                    {ocrNotice && (
                      <p
                        className="text-xs mt-1.5"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {ocrNotice}
                      </p>
                    )}
                    <FieldError message={ocrError ?? undefined} />
                  </div>
                )}
            </div>

            {/* Observações */}
            <div className="mt-4">
              <Label>Observações</Label>
              <textarea
                {...register("notes")}
                rows={3}
                className={inputCls + " resize-none"}
                placeholder="Notas internas sobre este pagamento…"
              />
            </div>

            {result.serverError && (
              <p
                className="flex items-center gap-1 text-xs font-medium mt-4"
                style={{ color: "var(--hb-orange-deep)" }}
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {result.serverError}
              </p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--fg)" }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={isSubmitting || isPending || isUploadingAttachment}
            className="px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            {isUploadingAttachment
              ? "Enviando comprovante…"
              : isSubmitting || isPending
                ? "Salvando…"
                : "Registrar despesa"}
          </button>
        </div>
      </div>
    </div>
  );
}
