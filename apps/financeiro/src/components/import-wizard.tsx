"use client";

import { useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import {
  Upload,
  Check,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@hebron/auth/client";
import { parseImportFile, confirmImport } from "../actions/import";

type Step = 1 | 2 | 3;

interface BankAccountOption {
  id: string;
  bankName: string;
  agency: string | null;
  accountNumber: string | null;
}

interface PreviewRow {
  date: string;
  amount: number;
  description: string;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

const STEPS = ["Upload", "Conferir", "Confirmar"];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const idx = (i + 1) as Step;
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shrink-0"
              style={{
                background: done
                  ? "var(--hb-green)"
                  : active
                    ? "var(--hb-blue)"
                    : "var(--surface-alt)",
                color: done
                  ? "var(--hb-blue)"
                  : active
                    ? "#fff"
                    : "var(--fg-muted)",
              }}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : idx}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: active ? "var(--fg)" : "var(--fg-muted)" }}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight
                className="h-3.5 w-3.5 mx-1"
                style={{ color: "var(--fg-muted)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Falha ao ler o arquivo"));
    reader.readAsText(file);
  });
}

export function ImportWizard({ accounts }: { accounts: BankAccountOption[] }) {
  const [step, setStep] = useState<Step>(1);
  const [dragging, setDragging] = useState(false);
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [format, setFormat] = useState<"ofx" | "csv">("ofx");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { execute: executeParse, isPending: isParsing } = useAction(
    parseImportFile,
    {
      onSuccess({ data }) {
        if (data) {
          setPreviewRows(data.rows);
          setStep(2);
        }
      },
      onError({ error }) {
        setUploadError(error.serverError ?? "Não foi possível ler o extrato.");
      },
    },
  );

  const {
    execute: executeConfirm,
    isPending: isConfirming,
    result: confirmResult,
  } = useAction(confirmImport, {
    onSuccess() {
      setStep(3);
    },
    onError({ error }) {
      setUploadError(error.serverError ?? "Falha ao confirmar a importação.");
    },
  });

  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(f: File) {
    setUploadError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const detectedFormat = ext === "csv" ? "csv" : "ofx";
    setFormat(detectedFormat);
    setFile(f);
    try {
      const text = await readFileAsText(f);
      setContent(text);
    } catch {
      setUploadError("Não foi possível ler o conteúdo do arquivo.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  }

  function handleAdvance() {
    if (!content) return;
    executeParse({ content, format });
  }

  async function handleConfirm() {
    if (!content || !file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${bankAccountId}/${crypto.randomUUID()}.${ext}`;

      const { data: uploadData, error: storageError } = await supabase.storage
        .from("financeiro-extratos")
        .upload(path, file, { contentType: file.type });
      if (storageError) throw new Error(storageError.message);

      executeConfirm({
        bankAccountId,
        format,
        content,
        fileUrl: uploadData.path,
        runAutoMatch: true,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Falha ao enviar o arquivo.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div
        className="max-w-2xl mx-auto rounded-(--radius) border p-8 text-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
          Nenhuma conta bancária cadastrada
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
          Cadastre uma conta bancária antes de importar um extrato.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <StepIndicator current={step} />
      </div>

      {step === 1 && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: "var(--fg-muted)" }}
            >
              Conta bancária de destino
            </label>
            <div className="relative">
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-(--radius) border text-sm outline-none appearance-none cursor-pointer pr-8 border-(--border) bg-(--bg) text-(--fg)"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName}
                    {a.agency ? ` — Ag. ${a.agency}` : ""}
                    {a.accountNumber ? ` / Cc. ${a.accountNumber}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-3.5 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "var(--fg-muted)" }}
              />
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-(--radius) border-2 border-dashed cursor-pointer transition-colors py-16 px-8 text-center"
            style={{
              borderColor: dragging ? "var(--hb-blue)" : "var(--border)",
              background: dragging ? "rgba(32,44,133,0.04)" : "var(--surface)",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".ofx,.csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <div
              className="flex h-14 w-14 items-center justify-center rounded-(--radius) mb-4"
              style={{ background: "var(--hb-blue)" }}
            >
              <Upload className="h-7 w-7 text-white" />
            </div>
            <p
              className="text-base font-bold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              {file ? file.name : "Arraste o arquivo aqui"}
            </p>
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              {file
                ? `Formato detectado: ${format.toUpperCase()} — clique em Avançar`
                : "ou clique para selecionar — OFX ou CSV"}
            </p>
          </div>

          {uploadError && (
            <div
              className="flex items-start gap-2 rounded-(--radius) border px-4 py-3 text-xs"
              style={{
                borderColor: "var(--color-destructive)",
                color: "var(--color-destructive)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {uploadError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAdvance}
              disabled={!content || isParsing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-40"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              {isParsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Avançar
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div
            className="rounded-(--radius) border overflow-hidden"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="font-bold text-sm"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--fg)",
                }}
              >
                Linhas do extrato — {file?.name}
              </p>
              <span
                className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
                style={{
                  background: "var(--hb-cyan-muted)",
                  color: "var(--hb-cyan-deep)",
                }}
              >
                {previewRows.length} registros
              </span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Data", "Descrição", "Valor"].map((h, i) => (
                      <th
                        key={h}
                        className="border-b px-4 py-2.5 text-left"
                        style={{
                          background: "var(--bg)",
                          borderColor: "var(--border)",
                          color: "var(--fg-muted)",
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                          textAlign: i === 2 ? "right" : "left",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--divider)" }}
                    >
                      <td
                        className="px-4 py-3 text-xs tabular-nums"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {row.date}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "var(--fg)" }}
                      >
                        {row.description}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-bold tabular-nums"
                        style={{
                          color:
                            row.amount >= 0
                              ? "var(--hb-green-deep)"
                              : "var(--hb-orange-deep)",
                        }}
                      >
                        {row.amount >= 0 ? "+" : "−"}{" "}
                        {fmtBRL(Math.abs(row.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {uploadError && (
            <div
              className="flex items-start gap-2 rounded-(--radius) border px-4 py-3 text-xs"
              style={{
                borderColor: "var(--color-destructive)",
                color: "var(--color-destructive)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {uploadError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
            >
              Voltar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isUploading || isConfirming}
              className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--hb-blue)",
                color: "var(--fg-invert)",
              }}
            >
              {isUploading || isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Confirmar importação
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-2xl mx-auto">
          <div
            className="flex flex-col items-center text-center rounded-(--radius) border py-16 px-8"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full mb-6"
              style={{ background: "var(--hb-green)" }}
            >
              <Check className="h-8 w-8" style={{ color: "var(--hb-blue)" }} />
            </div>
            <p
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
            >
              Importação concluída
            </p>
            <p
              className="text-sm mb-2 max-w-md"
              style={{ color: "var(--fg-muted)" }}
            >
              {confirmResult.data?.totalRows ?? previewRows.length} registros
              importados. {confirmResult.data?.matchedCount ?? 0} vinculados
              automaticamente. {confirmResult.data?.unmatchedCount ?? 0} novos
              lançamentos aguardando conciliação.
            </p>
            <div className="flex gap-3 mt-6 w-full">
              <a
                href="/conciliacao"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-(--radius) text-sm font-semibold"
                style={{
                  background: "var(--hb-blue)",
                  color: "var(--fg-invert)",
                }}
              >
                Ir para conciliação
              </a>
              <a
                href="/lancamentos"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-(--radius) border text-sm font-semibold"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--fg-muted)",
                }}
              >
                Ver lançamentos
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
