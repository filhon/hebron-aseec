"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Check,
  ChevronRight,
  AlertTriangle,
  Link2,
  PlusCircle,
} from "lucide-react";
import { mockBankImports } from "../../../lib/mock-data";

type Step = 1 | 2 | 3;

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
    year: "2-digit",
  });
}

const previewImport = mockBankImports[1]; // import-002: partial June, has items

const STEPS = ["Upload", "Mapeamento", "Confirmar"];

interface StepIndicatorProps {
  current: Step;
}

function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const idx = (i + 1) as Step;
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
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
            </div>
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

function Step1Upload({ onNext }: { onNext: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f.name);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Dropzone */}
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
          accept=".ofx,.csv,.qif"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f.name);
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
          {file ? file : "Arraste o arquivo aqui"}
        </p>
        <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
          {file
            ? "Arquivo pronto. Clique em Avançar para continuar."
            : "ou clique para selecionar — OFX, CSV ou QIF"}
        </p>
      </div>

      {/* Format info */}
      <div
        className="flex items-start gap-3 rounded-(--radius) border px-4 py-3.5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <AlertTriangle
          className="h-4 w-4 shrink-0 mt-0.5"
          style={{ color: "var(--hb-orange)" }}
        />
        <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
          <p className="font-semibold mb-0.5" style={{ color: "var(--fg)" }}>
            Formatos aceitos
          </p>
          <p>
            <strong>OFX</strong> (Open Financial Exchange) — padrão Bradesco,
            Caixa, Sicoob. <strong>CSV</strong> — exportação manual do internet
            banking. Máximo 5 MB por arquivo.
          </p>
        </div>
      </div>

      {/* Demo shortcut */}
      <div
        className="flex items-center justify-between rounded-(--radius) border px-5 py-4"
        style={{ background: "var(--hb-blue)", borderColor: "transparent" }}
      >
        <div>
          <p className="text-xs font-bold text-white/70 uppercase tracking-[0.12em] mb-0.5">
            Demonstração
          </p>
          <p className="text-sm font-semibold text-white">
            Usar extrato de exemplo (Bradesco — junho 2026)
          </p>
        </div>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-(--radius) text-xs font-semibold transition-colors"
          style={{ background: "var(--hb-green)", color: "var(--hb-blue)" }}
        >
          Carregar extrato
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={file ? onNext : undefined}
          disabled={!file}
          className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold transition-colors disabled:opacity-40"
          style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
        >
          Avançar
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Step2Preview({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  if (!previewImport) return null;

  const total = previewImport.totalItems;
  const matched = previewImport.matchedItems;
  const pending = previewImport.pendingItems;
  const balance = previewImport.items.reduce(
    (s, i) => s + (i.type === "credito" ? i.amount : -i.amount),
    0,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Linhas importadas", value: total, color: "var(--fg)" },
          {
            label: "Casamento automático",
            value: matched,
            color: "var(--hb-green-deep)",
          },
          {
            label: "Novos lançamentos",
            value: pending,
            color: "var(--hb-orange-deep)",
          },
          {
            label: "Saldo do período",
            value: fmtBRL(balance),
            color:
              balance >= 0 ? "var(--hb-green-deep)" : "var(--hb-orange-deep)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-(--radius) border p-4"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1"
              style={{ color: "var(--fg-muted)" }}
            >
              {s.label}
            </p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ fontFamily: "var(--font-display)", color: s.color }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Preview table */}
      <div
        className="rounded-(--radius) border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <p
            className="font-bold text-sm"
            style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
          >
            Linhas do extrato — {previewImport.fileName}
          </p>
          <span
            className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
            style={{
              background: "var(--hb-cyan-muted)",
              color: "var(--hb-cyan-deep)",
            }}
          >
            {total} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
          >
            <thead>
              <tr>
                {["Data", "Descrição", "Valor", "Situação", "Ação"].map(
                  (h, i) => (
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
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {previewImport.items.map((item) => {
                const isLinked = item.transactionId != null;
                return (
                  <tr
                    key={item.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--divider)" }}
                  >
                    <td
                      className="px-4 py-3.5 text-xs tabular-nums"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {fmtDate(item.occurredAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "var(--fg)" }}
                      >
                        {item.description}
                      </p>
                    </td>
                    <td
                      className="px-4 py-3.5 text-right font-bold tabular-nums"
                      style={{
                        color:
                          item.amount >= 0
                            ? "var(--hb-green-deep)"
                            : "var(--hb-orange-deep)",
                      }}
                    >
                      {item.amount >= 0 ? "+" : "−"}{" "}
                      {fmtBRL(Math.abs(item.amount))}
                    </td>
                    <td className="px-4 py-3.5">
                      {isLinked ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                          style={{
                            background: "var(--hb-green-muted)",
                            color: "var(--hb-green-deep)",
                          }}
                        >
                          <Link2 className="h-3 w-3" />
                          Vinculado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                          style={{
                            background: "var(--hb-orange-muted)",
                            color: "var(--hb-orange-deep)",
                          }}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Sem par
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {!isLinked && (
                        <button
                          className="flex items-center gap-1 text-xs font-semibold"
                          style={{ color: "var(--hb-blue)" }}
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Criar lançamento
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-(--radius) border text-sm font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-5 py-2.5 rounded-(--radius) text-sm font-semibold"
          style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
        >
          Confirmar importação
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Step3Success() {
  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="flex flex-col items-center text-center rounded-(--radius) border py-16 px-8"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
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
          className="text-sm mb-8 max-w-md"
          style={{ color: "var(--fg-muted)" }}
        >
          11 registros importados. 9 vinculados automaticamente. 2 novos
          lançamentos criados e prontos para conciliação.
        </p>

        {/* Verse */}
        <div
          className="w-full rounded-(--radius) px-6 py-5 text-left"
          style={{ background: "var(--hb-blue)" }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
            style={{ color: "var(--hb-cyan)" }}
          >
            Mordomia cristã
          </p>
          <p
            className="leading-relaxed italic"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "15px",
              color: "var(--fg-invert)",
            }}
          >
            "Porque onde estiver o seu tesouro, aí estará também o seu coração."
          </p>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.12em] mt-3"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Mateus 6:21
          </p>
        </div>

        <div className="flex gap-3 mt-6 w-full">
          <a
            href="/conciliacao"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-(--radius) text-sm font-semibold"
            style={{ background: "var(--hb-blue)", color: "var(--fg-invert)" }}
          >
            Ir para conciliação
          </a>
          <a
            href="/lancamentos"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-(--radius) border text-sm font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}
          >
            Ver lançamentos
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ImportacaoPage() {
  const [step, setStep] = useState<Step>(1);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      {/* Topbar */}
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
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
              Importação OFX / CSV
            </p>
          </div>
          <StepIndicator current={step} />
        </div>
      </div>

      <div className="p-6">
        {step === 1 && <Step1Upload onNext={() => setStep(2)} />}
        {step === 2 && (
          <Step2Preview onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && <Step3Success />}
      </div>
    </div>
  );
}
