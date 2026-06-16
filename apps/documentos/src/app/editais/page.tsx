"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PublicNav } from "../../components/public-nav";
import { EditalCard } from "../../components/edital-card";
import { mockEditais } from "../../lib/mock-data";
import type { Edital } from "@hebron/types/documentos";

type StatusFilter = "all" | "open" | "permanent" | "closed";

function getEditalStatus(
  e: Edital,
): "open" | "closed" | "permanent" | "upcoming" {
  if (e.cycleType === "pontual") return "permanent";
  const now = new Date();
  if (e.opensAt && now < new Date(e.opensAt)) return "upcoming";
  if (e.closesAt && now > new Date(e.closesAt)) return "closed";
  return "open";
}

export default function EditaisPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const publicEditais = mockEditais.filter(
    (e) => e.visibility === "public" || e.visibility === "internal",
  );

  const counts = {
    all: publicEditais.length,
    open: publicEditais.filter((e) => {
      const s = getEditalStatus(e);
      return s === "open" || s === "upcoming";
    }).length,
    permanent: publicEditais.filter((e) => getEditalStatus(e) === "permanent")
      .length,
    closed: publicEditais.filter((e) => getEditalStatus(e) === "closed").length,
  };

  const filtered =
    statusFilter === "all"
      ? publicEditais
      : statusFilter === "open"
        ? publicEditais.filter((e) => {
            const s = getEditalStatus(e);
            return s === "open" || s === "upcoming";
          })
        : statusFilter === "permanent"
          ? publicEditais.filter((e) => getEditalStatus(e) === "permanent")
          : publicEditais.filter((e) => getEditalStatus(e) === "closed");

  return (
    <>
      <PublicNav />

      <main className="docs-page">
        {/* Breadcrumbs */}
        <nav className="docs-breadcrumbs" aria-label="Navegação estrutural">
          <Link href="/">Início</Link>
          <ChevronRight
            size={12}
            className="docs-breadcrumbs-sep"
            aria-hidden="true"
          />
          <span style={{ color: "var(--fg)" }}>Editais</span>
        </nav>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <span className="hb-eyebrow">Editais Hebron Aseec</span>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--fg)",
              margin: "8px 0 12px",
              textWrap: "balance",
            }}
          >
            Janelas para submissão de projetos
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--fg-muted)",
              maxWidth: "62ch",
              margin: 0,
            }}
          >
            Editais anuais abrem janelas específicas para projetos com vigência
            em ano-calendário; editais pontuais permanecem abertos continuamente
            para situações emergenciais.
          </p>
        </div>

        {/* Filter chips */}
        <div
          className="hb-chip-row"
          role="group"
          aria-label="Filtrar editais por status"
        >
          {(
            [
              { key: "all", label: "Todos" },
              { key: "open", label: "Abertos / Em breve" },
              { key: "permanent", label: "Permanentes" },
              { key: "closed", label: "Encerrados" },
            ] satisfies { key: StatusFilter; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`hb-chip ${statusFilter === key ? "active" : ""}`}
              aria-pressed={statusFilter === key}
            >
              {label}
              <span className="hb-chip-count">{counts[key]}</span>
            </button>
          ))}
        </div>

        {/* Edital grid */}
        {filtered.length === 0 ? (
          <div className="hb-empty">
            <div className="hb-empty-icon">
              <ChevronRight size={24} aria-hidden="true" />
            </div>
            <b>Nenhum edital nesta categoria</b>
            <p className="hb-empty-body">
              Tente selecionar outro filtro acima.
            </p>
            <p className="hb-empty-quote">
              "Pois sou eu que conheço os planos que tenho para vocês, diz o
              Senhor, planos de fazê-los prosperar."
              <span className="hb-empty-cite">Jeremias 29:11</span>
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
              gap: 18,
            }}
          >
            {filtered.map((edital) => (
              <EditalCard
                key={edital.id}
                edital={edital}
                href={`/editais/${edital.slug}`}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
