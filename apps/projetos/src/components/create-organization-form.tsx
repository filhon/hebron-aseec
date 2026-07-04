"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { Building2, Check } from "lucide-react";
import { createOrganization } from "../actions/organizations";

/** F2-P1: nenhuma UI chamava `createOrganization` — sem instituição, o
 * wizard de projetos não tinha o que selecionar. */
export function CreateOrganizationForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [responsavelLegal, setResponsavelLegal] = useState("");

  const { execute, isPending, result } = useAction(createOrganization, {
    onSuccess() {
      router.refresh();
    },
  });

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Building2
          width={20}
          height={20}
          style={{ color: "var(--hb-blue)" }}
          aria-hidden
        />
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 17,
            margin: 0,
            color: "var(--fg)",
          }}
        >
          Cadastrar Instituição
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="text-xs font-semibold text-(--fg) block mb-1">
            Nome da instituição *
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Missão Vida Nova"
            className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-(--fg) block mb-1">
              CNPJ (opcional)
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value.replace(/\D/g, ""))}
              placeholder="Somente números"
              maxLength={14}
              className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-(--fg) block mb-1">
              Telefone
            </label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-(--fg) block mb-1">
            Endereço
          </label>
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-(--fg) block mb-1">
            Responsável legal
          </label>
          <input
            type="text"
            value={responsavelLegal}
            onChange={(e) => setResponsavelLegal(e.target.value)}
            className="w-full rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
          />
        </div>

        {result.serverError && (
          <p className="text-sm text-(--color-destructive)">
            {result.serverError}
          </p>
        )}

        <button
          type="button"
          disabled={nome.trim().length < 2 || isPending}
          onClick={() =>
            execute({
              nome: nome.trim(),
              cnpj: cnpj.length === 14 ? cnpj : null,
              endereco: endereco.trim() || null,
              telefone: telefone.trim() || null,
              responsavelLegal: responsavelLegal.trim() || null,
            })
          }
          className="flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--hb-blue)" }}
        >
          <Check className="w-4 h-4" aria-hidden />
          {isPending ? "Cadastrando…" : "Cadastrar Instituição"}
        </button>
      </div>
    </section>
  );
}
