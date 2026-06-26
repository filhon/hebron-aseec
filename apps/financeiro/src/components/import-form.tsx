"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Upload,
  Check,
  ArrowRight,
  ChevronDown,
  FileText,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { bankImportSchema, type BankImportInput } from "@hebron/validators";
import { mockBankAccounts, mockBankImports } from "../lib/mock-data";

interface ImportFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1 as Step, label: "Upload", sub: "OFX ou CSV" },
  { id: 2 as Step, label: "Mapeamento", sub: "Validar e mapear" },
  { id: 3 as Step, label: "Confirmar", sub: "Importar" },
];

// Use first completed import as preview data
const PREVIEW_IMPORT = mockBankImports[0];

export function ImportForm({ onClose, onSuccess }: ImportFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [format, setFormat] = useState<"ofx" | "csv">("ofx");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankImportInput>({
    resolver: zodResolver(bankImportSchema),
    defaultValues: {
      bankAccountId: mockBankAccounts[0]?.id ?? "",
      format: "ofx",
      fileName: "",
    },
  });

  const watchedAccount = watch("bankAccountId");

  function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const detectedFormat = ext === "csv" ? "csv" : "ofx";
    setFileName(file.name);
    setFormat(detectedFormat);
    setValue("fileName", file.name, { shouldValidate: true });
    setValue("format", detectedFormat, { shouldValidate: true });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const selectedAccount = mockBankAccounts.find((a) => a.id === watchedAccount);
  const previewItems = PREVIEW_IMPORT?.items.slice(0, 8) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(19,23,55,0.42)" }}
      onClick={onClose}
    >
      <div
        className="w-180 max-w-full flex flex-col h-full"
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
              style={{ color: "var(--hb-cyan-deep)" }}
            >
              Importação de extrato
            </p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Importar OFX / CSV
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div
          className="flex items-center gap-2 px-6 py-4 border-b"
          style={{ borderColor: "var(--border)", background: "var(--bg-alt)" }}
        >
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
                  style={{
                    background:
                      step > s.id
                        ? "var(--hb-green)"
                        : step === s.id
                          ? "var(--hb-blue)"
                          : "var(--surface-alt)",
                    color:
                      step > s.id
                        ? "var(--hb-blue)"
                        : step === s.id
                          ? "var(--fg-invert)"
                          : "var(--fg-muted)",
                  }}
                >
                  {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
                </span>
                <div>
                  <p
                    className="text-xs font-bold"
                    style={{
                      color: step >= s.id ? "var(--fg)" : "var(--fg-muted)",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {s.sub}
                  </p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-3"
                  style={{
                    background:
                      step > s.id ? "var(--hb-blue)" : "var(--border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Body — step-specific content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Conta de destino */}
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Conta bancária de destino{" "}
                  <span style={{ color: "var(--hb-orange-deep)" }}>*</span>
                </label>
                <div className="relative">
                  <select
                    {...register("bankAccountId")}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none cursor-pointer pr-8 border-(--border) bg-(--bg) text-(--fg) focus:border-(--hb-blue)"
                  >
                    {mockBankAccounts.map((ba) => (
                      <option key={ba.id} value={ba.id}>
                        {ba.bank} — Ag. {ba.agency} / Cc. {ba.accountNumber}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-3.5 h-3.5 w-3.5 pointer-events-none"
                    style={{ color: "var(--fg-muted)" }}
                  />
                </div>
                {errors.bankAccountId && (
                  <p
                    className="flex items-center gap-1 text-xs font-medium mt-1"
                    style={{ color: "var(--hb-orange-deep)" }}
                  >
                    <AlertCircle className="h-3 w-3" />
                    {errors.bankAccountId.message}
                  </p>
                )}
              </div>

              {/* Formato */}
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Formato do arquivo
                </label>
                <div className="flex gap-3">
                  {(["ofx", "csv"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setFormat(f);
                        setValue("format", f);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors flex-1 justify-center"
                      style={{
                        borderColor:
                          format === f ? "var(--hb-blue)" : "var(--border)",
                        background:
                          format === f ? "rgba(32,44,133,0.06)" : "var(--bg)",
                        color:
                          format === f ? "var(--hb-blue)" : "var(--fg-muted)",
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropzone */}
              <div>
                <label
                  className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Arquivo
                </label>
                <div
                  className="relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 py-14 px-8 text-center cursor-pointer transition-colors"
                  style={{
                    borderColor: dragOver
                      ? "var(--hb-blue)"
                      : fileName
                        ? "var(--hb-green)"
                        : "var(--border-strong)",
                    background: dragOver
                      ? "rgba(32,44,133,0.04)"
                      : fileName
                        ? "var(--hb-green-muted)"
                        : "var(--bg-alt)",
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ofx,.csv,.xlsx"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  {fileName ? (
                    <>
                      <span
                        className="flex items-center justify-center w-14 h-14 rounded-full"
                        style={{
                          background: "var(--hb-green)",
                          color: "var(--hb-blue)",
                        }}
                      >
                        <Check className="h-6 w-6" />
                      </span>
                      <div>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--hb-green-deep)" }}
                        >
                          {fileName}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          Formato detectado:{" "}
                          <strong>{format.toUpperCase()}</strong> · clique para
                          trocar
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span
                        className="flex items-center justify-center w-14 h-14 rounded-full"
                        style={{
                          background: "var(--hb-blue)",
                          color: "var(--fg-invert)",
                        }}
                      >
                        <Upload className="h-6 w-6" />
                      </span>
                      <div>
                        <p
                          className="text-base font-bold"
                          style={{
                            fontFamily: "var(--font-display)",
                            color: "var(--fg)",
                          }}
                        >
                          Arraste o arquivo aqui
                        </p>
                        <p
                          className="text-sm mt-1"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          ou clique para selecionar · até 10 MB
                        </p>
                        <div
                          className="flex items-center justify-center gap-4 mt-4 text-xs"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          <span>✓ OFX (Open Financial Exchange)</span>
                          <span>✓ CSV (com cabeçalho)</span>
                          <span>✓ Excel (.xlsx)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {errors.fileName && (
                  <p
                    className="flex items-center gap-1 text-xs font-medium mt-1"
                    style={{ color: "var(--hb-orange-deep)" }}
                  >
                    <AlertCircle className="h-3 w-3" />
                    Selecione um arquivo para continuar
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Meta do arquivo */}
              <div
                className="rounded-xl p-4 flex items-start justify-between gap-4"
                style={{
                  background: "var(--bg-alt)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: "var(--fg)" }}
                  >
                    {fileName ?? PREVIEW_IMPORT?.fileName ?? "extrato.ofx"}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {selectedAccount
                      ? `${selectedAccount.bank} — Ag. ${selectedAccount.agency}`
                      : "Conta selecionada"}
                    {" · "}
                    {PREVIEW_IMPORT?.totalItems ?? previewItems.length}{" "}
                    transações
                  </p>
                </div>
                <span
                  className="inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                  style={{
                    background: "var(--hb-cyan-muted)",
                    color: "var(--hb-cyan-deep)",
                  }}
                >
                  {format.toUpperCase()}
                </span>
              </div>

              {/* KPIs do preview */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    label: "Total de linhas",
                    value: String(PREVIEW_IMPORT?.totalItems ?? 11),
                    color: "var(--fg)",
                  },
                  {
                    label: "Casamento sugerido",
                    value: String(PREVIEW_IMPORT?.matchedItems ?? 9),
                    color: "var(--hb-green-deep)",
                    bg: "var(--hb-green-muted)",
                  },
                  {
                    label: "Novos lançamentos",
                    value: String(PREVIEW_IMPORT?.pendingItems ?? 2),
                    color: "var(--hb-orange-deep)",
                    bg: "var(--hb-orange-muted)",
                  },
                  {
                    label: "Saldo final",
                    value: fmtBRL(
                      mockBankAccounts[0]?.currentBalance ?? 128450,
                    ),
                    color: "var(--hb-cyan-deep)",
                    bg: "var(--hb-cyan-muted)",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl p-3"
                    style={{
                      background: kpi.bg ?? "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: kpi.color, opacity: 0.75 }}
                    >
                      {kpi.label}
                    </p>
                    <p
                      className="text-xl font-bold mt-1 tabular-nums"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: kpi.color,
                      }}
                    >
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tabela de preview */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    style={{ borderCollapse: "separate", borderSpacing: 0 }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Data",
                          "Descrição",
                          "Categoria sugerida",
                          "Valor",
                          "Ação",
                        ].map((h, i) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left border-b"
                            style={{
                              background: "var(--bg)",
                              borderColor: "var(--border)",
                              color: "var(--fg-muted)",
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.12em",
                              textAlign: i === 3 ? "right" : "left",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item) => {
                        const isNew =
                          item.matchStatus === "novo" ||
                          item.matchStatus === "pendente";
                        return (
                          <tr
                            key={item.id}
                            style={{ borderBottom: "1px solid var(--divider)" }}
                          >
                            <td
                              className="px-4 py-3 text-xs"
                              style={{
                                color: "var(--fg-muted)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {fmtDate(item.occurredAt)}
                            </td>
                            <td className="px-4 py-3">
                              <p
                                className="font-semibold text-sm"
                                style={{ color: "var(--fg)" }}
                              >
                                {item.description}
                              </p>
                            </td>
                            <td
                              className="px-4 py-3 text-xs"
                              style={{ color: "var(--fg-muted)" }}
                            >
                              <span className="flex items-center gap-1">
                                {item.amount > 0
                                  ? "1.1 Receitas Operacionais"
                                  : "2.2 Despesas Administrativas"}
                                <Sparkles
                                  className="h-2.5 w-2.5 shrink-0"
                                  style={{ color: "var(--hb-cyan-deep)" }}
                                />
                              </span>
                            </td>
                            <td
                              className="px-4 py-3 text-right font-bold tabular-nums text-sm"
                              style={{
                                color:
                                  item.type === "credito"
                                    ? "var(--hb-green-deep)"
                                    : "var(--hb-orange-deep)",
                              }}
                            >
                              {item.type === "credito" ? "+" : "−"}
                              {fmtBRL(Math.abs(item.amount))}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  background: isNew
                                    ? "var(--hb-orange-muted)"
                                    : "var(--hb-green-muted)",
                                  color: isNew
                                    ? "var(--hb-orange-deep)"
                                    : "var(--hb-green-deep)",
                                }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {isNew
                                  ? "Criar novo"
                                  : `Casar #${item.transactionId?.slice(-4) ?? "auto"}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conciliação automática toggle */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--fg)" }}
                  >
                    Conciliação automática
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    O sistema tentará casar transações por valor, data e
                    descrição.
                  </p>
                </div>
                <div
                  className="relative w-10 h-5 rounded-full cursor-pointer"
                  style={{ background: "var(--hb-green)" }}
                >
                  <span
                    className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirmar ── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Success summary */}
              <div
                className="flex flex-col items-center justify-center py-12 text-center rounded-xl"
                style={{ background: "var(--hb-green-muted)" }}
              >
                <span
                  className="flex items-center justify-center w-16 h-16 rounded-full mb-5"
                  style={{
                    background: "var(--hb-green)",
                    color: "var(--hb-blue)",
                  }}
                >
                  <Check className="h-8 w-8" />
                </span>
                <p
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--fg)",
                  }}
                >
                  {PREVIEW_IMPORT?.totalItems ?? 11} transações importadas
                </p>
                <p
                  className="text-sm mt-2 max-w-sm"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {PREVIEW_IMPORT?.matchedItems ?? 9} conciliações automáticas
                  aplicadas. {PREVIEW_IMPORT?.pendingItems ?? 2} aguardando
                  revisão manual na conciliação.
                </p>
                <p
                  className="text-sm italic mt-5 max-w-md"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--fg-muted)",
                  }}
                >
                  "Onde está o tesouro de cada um, aí estará também o seu
                  coração."
                </p>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em] mt-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Mateus 6:21
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors text-center"
                  style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                >
                  Importar outro extrato
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSuccess?.();
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: "var(--hb-blue)",
                    color: "var(--fg-invert)",
                  }}
                >
                  Ir para conciliação
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer (steps 1 and 2 only) */}
        {step !== 3 && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={
                step === 1 ? onClose : () => setStep((s) => (s - 1) as Step)
              }
              className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--fg)" }}
            >
              {step === 1 ? "Cancelar" : "← Voltar"}
            </button>
            <button
              type="button"
              disabled={step === 1 && !fileName}
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              {step === 1 ? (
                <>
                  Visualizar extrato <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Importar {PREVIEW_IMPORT?.totalItems ?? 11} transações{" "}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
