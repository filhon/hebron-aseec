"use client";

import { useState, useRef, useEffect } from "react";
import type { ProjectCategory } from "@hebron/types";
import { MapPin, Keyboard, ChevronDown } from "lucide-react";
import type { StepProps } from "../project-wizard";

// ─── Local primitives ─────────────────────────────────────────────────────────

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="block text-sm font-semibold mb-1.5"
      style={{ color: "var(--fg)" }}
    >
      {children}
      {required && (
        <span
          className="ml-0.5"
          style={{ color: "var(--color-destructive)" }}
          aria-hidden
        >
          *
        </span>
      )}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="text-xs mt-1.5"
      style={{ color: "var(--color-destructive)" }}
      role="alert"
    >
      {message}
    </p>
  );
}

function inputCls() {
  return "w-full rounded-[--radius] border px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--brand] focus-visible:border-transparent";
}

function inputStyle() {
  return {
    borderColor: "var(--border)",
    backgroundColor: "var(--bg-alt)",
    color: "var(--fg)",
  };
}

function CharCount({
  value,
  min,
  max,
}: {
  value: string;
  min: number;
  max: number;
}) {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <p
      className="text-[11px] mt-1 text-right"
      style={{ color: ok ? "var(--fg-muted)" : "var(--color-destructive)" }}
    >
      {len}/{max}
    </p>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

type PlaceSuggestion = {
  label: string;
  regiao: string;
  pais: string;
};

const PLACE_SUGGESTIONS: PlaceSuggestion[] = [
  { label: "São Paulo, SP, Brasil", regiao: "Sudeste", pais: "Brasil" },
  { label: "Rio de Janeiro, RJ, Brasil", regiao: "Sudeste", pais: "Brasil" },
  { label: "Brasília, DF, Brasil", regiao: "Centro-Oeste", pais: "Brasil" },
  { label: "Fortaleza, CE, Brasil", regiao: "Nordeste", pais: "Brasil" },
  { label: "Recife, PE, Brasil", regiao: "Nordeste", pais: "Brasil" },
  { label: "Salvador, BA, Brasil", regiao: "Nordeste", pais: "Brasil" },
  { label: "Manaus, AM, Brasil", regiao: "Norte", pais: "Brasil" },
  { label: "Belém, PA, Brasil", regiao: "Norte", pais: "Brasil" },
  { label: "Goiânia, GO, Brasil", regiao: "Centro-Oeste", pais: "Brasil" },
  {
    label: "Maputo, Moçambique",
    regiao: "África Oriental",
    pais: "Moçambique",
  },
  { label: "Beira, Moçambique", regiao: "África Oriental", pais: "Moçambique" },
  { label: "Lisboa, Portugal", regiao: "Europa Ocidental", pais: "Portugal" },
  { label: "Porto, Portugal", regiao: "Europa Ocidental", pais: "Portugal" },
  { label: "Luanda, Angola", regiao: "África Central", pais: "Angola" },
  { label: "Accra, Gana", regiao: "África Ocidental", pais: "Gana" },
  { label: "Nairóbi, Quênia", regiao: "África Oriental", pais: "Quênia" },
  { label: "Lagos, Nigéria", regiao: "África Ocidental", pais: "Nigéria" },
  {
    label: "Praia, Cabo Verde",
    regiao: "África Ocidental",
    pais: "Cabo Verde",
  },
];

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: ProjectCategory;
  label: string;
}> = [
  { value: "evangelismo", label: "Evangelismo" },
  { value: "missoes_transculturais", label: "Missões Transculturais" },
  { value: "educacao_crista", label: "Educação Cristã" },
  { value: "assistencia_social", label: "Assistência Social" },
  { value: "saude", label: "Saúde" },
  { value: "capacitacao_lideranca", label: "Capacitação de Liderança" },
  { value: "infraestrutura_ministerial", label: "Infraestrutura Ministerial" },
  { value: "plantacao_de_igrejas", label: "Plantação de Igrejas" },
  { value: "discipulado", label: "Discipulado" },
  { value: "outros", label: "Outros" },
];

// ─── LocationInput ────────────────────────────────────────────────────────────

interface LocationInputProps {
  regiao: string;
  pais: string;
  regiaoError?: string;
  paisError?: string;
  onChange: (regiao: string, pais: string) => void;
}

function LocationInput({
  regiao,
  pais,
  regiaoError,
  paisError,
  onChange,
}: LocationInputProps) {
  const [mode, setMode] = useState<"places" | "manual">(
    regiao || pais ? "manual" : "places",
  );
  const [query, setQuery] = useState(
    regiao && pais ? `${regiao}, ${pais}` : "",
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = query.trim()
    ? PLACE_SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(query.toLowerCase()),
      )
    : PLACE_SUGGESTIONS.slice(0, 6);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectSuggestion(s: PlaceSuggestion) {
    setQuery(s.label);
    onChange(s.regiao, s.pais);
    setOpen(false);
  }

  function switchToManual() {
    setMode("manual");
    setOpen(false);
  }

  if (mode === "manual") {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <Label required>Região de Atuação</Label>
          <input
            type="text"
            value={regiao}
            onChange={(e) => onChange(e.target.value, pais)}
            placeholder="Ex.: Nordeste, África Oriental"
            className={inputCls()}
            style={inputStyle()}
          />
          <FieldError message={regiaoError} />
        </div>
        <div>
          <Label required>País</Label>
          <input
            type="text"
            value={pais}
            onChange={(e) => onChange(regiao, e.target.value)}
            placeholder="Ex.: Brasil, Moçambique"
            className={inputCls()}
            style={inputStyle()}
          />
          <FieldError message={paisError} />
        </div>
        <button
          type="button"
          onClick={() => setMode("places")}
          className="inline-flex items-center gap-1.5 text-xs font-medium w-fit"
          style={{ color: "var(--hb-blue)" }}
        >
          <MapPin className="w-3.5 h-3.5" aria-hidden />
          Buscar com sugestão de localização
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Label required>Localização do Projeto</Label>
      <div className="relative">
        <MapPin
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--fg-muted)" }}
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("", "");
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cidade, país ou região…"
          className={`${inputCls()} pl-10 pr-10`}
          style={inputStyle()}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-label="Localização do projeto"
        />
        <ChevronDown
          className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "var(--fg-muted)" }}
          aria-hidden
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-10 mt-1 w-full rounded-[--radius-md] border overflow-hidden shadow-lg"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
          role="listbox"
        >
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                role="option"
                aria-selected={query === s.label}
                onClick={() => selectSuggestion(s)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                style={{
                  backgroundColor:
                    query === s.label ? "var(--hb-gray-50)" : "var(--surface)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--hb-gray-50)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    query === s.label ? "var(--hb-gray-50)" : "var(--surface)";
                }}
              >
                <MapPin
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: "var(--hb-blue)" }}
                  aria-hidden
                />
                <span style={{ color: "var(--fg)" }}>{s.label}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={switchToManual}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs border-t transition-colors"
              style={{
                borderColor: "var(--border)",
                color: "var(--fg-muted)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--hb-gray-50)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--surface)";
              }}
            >
              <Keyboard className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Não encontrei — informar manualmente
            </button>
          </li>
        </ul>
      )}

      {(regiaoError ?? paisError) && (
        <FieldError message={regiaoError ?? paisError} />
      )}
    </div>
  );
}

// ─── StepProposal ─────────────────────────────────────────────────────────────

export function StepProposal({ data, errors, onChange }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Título */}
      <div>
        <Label required>Título do Projeto</Label>
        <input
          type="text"
          value={data.titulo}
          onChange={(e) => onChange({ titulo: e.target.value })}
          placeholder="Ex.: Missão Maputo 2026 — Plantação de Igrejas"
          className={inputCls()}
          style={inputStyle()}
          maxLength={200}
        />
        <CharCount value={data.titulo} min={5} max={200} />
        <FieldError message={errors.titulo} />
      </div>

      {/* Categoria */}
      <div>
        <Label required>Categoria</Label>
        <div className="relative">
          <select
            value={data.categoria}
            onChange={(e) =>
              onChange({
                categoria: e.target.value as typeof data.categoria,
              })
            }
            className={`${inputCls()} appearance-none pr-10`}
            style={inputStyle()}
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--fg-muted)" }}
            aria-hidden
          />
        </div>
        <FieldError message={errors.categoria} />
      </div>

      {/* Location */}
      <LocationInput
        regiao={data.regiao}
        pais={data.pais}
        regiaoError={errors.regiao}
        paisError={errors.pais}
        onChange={(regiao, pais) => onChange({ regiao, pais })}
      />

      {/* Contexto ministerial + tempo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Label required>Contexto Ministerial</Label>
          <textarea
            value={data.contextoMinisterial}
            onChange={(e) => onChange({ contextoMinisterial: e.target.value })}
            placeholder="Descreva o contexto e histórico do ministério…"
            rows={3}
            className={`${inputCls()} resize-none`}
            style={inputStyle()}
            maxLength={3000}
          />
          <FieldError message={errors.contextoMinisterial} />
        </div>
        <div>
          <Label required>Anos no Ministério</Label>
          <input
            type="number"
            min={0}
            max={70}
            value={
              data.tempoMinisterioAnos === "" ? "" : data.tempoMinisterioAnos
            }
            onChange={(e) =>
              onChange({
                tempoMinisterioAnos:
                  e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            placeholder="Ex.: 10"
            className={inputCls()}
            style={inputStyle()}
          />
          <FieldError message={errors.tempoMinisterioAnos} />
        </div>
      </div>

      {/* Beneficiários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Nº de Beneficiários</Label>
          <input
            type="number"
            min={1}
            value={
              data.beneficiariosQuantidade === ""
                ? ""
                : data.beneficiariosQuantidade
            }
            onChange={(e) =>
              onChange({
                beneficiariosQuantidade:
                  e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            placeholder="Ex.: 500"
            className={inputCls()}
            style={inputStyle()}
          />
          <FieldError message={errors.beneficiariosQuantidade} />
        </div>
        <div>
          <Label required>Descrição dos Beneficiários</Label>
          <input
            type="text"
            value={data.beneficiariosDescricao}
            onChange={(e) =>
              onChange({ beneficiariosDescricao: e.target.value })
            }
            placeholder="Ex.: Famílias ribeirinhas"
            className={inputCls()}
            style={inputStyle()}
            maxLength={2000}
          />
          <FieldError message={errors.beneficiariosDescricao} />
        </div>
      </div>

      <hr style={{ borderColor: "var(--border)" }} />

      {/* Objetivos */}
      <div>
        <Label required>Objetivos</Label>
        <textarea
          value={data.objetivos}
          onChange={(e) => onChange({ objetivos: e.target.value })}
          placeholder="Descreva o objetivo principal do projeto e o que se pretende alcançar…"
          rows={4}
          className={`${inputCls()} resize-none`}
          style={inputStyle()}
          maxLength={5000}
        />
        <CharCount value={data.objetivos} min={50} max={5000} />
        <FieldError message={errors.objetivos} />
      </div>

      {/* Justificativa */}
      <div>
        <Label required>Justificativa</Label>
        <textarea
          value={data.justificativa}
          onChange={(e) => onChange({ justificativa: e.target.value })}
          placeholder="Por que este projeto é necessário? Qual a necessidade identificada?"
          rows={4}
          className={`${inputCls()} resize-none`}
          style={inputStyle()}
          maxLength={5000}
        />
        <CharCount value={data.justificativa} min={50} max={5000} />
        <FieldError message={errors.justificativa} />
      </div>

      {/* Metodologia */}
      <div>
        <Label required>Metodologia</Label>
        <textarea
          value={data.metodologia}
          onChange={(e) => onChange({ metodologia: e.target.value })}
          placeholder="Como o projeto será executado? Descreva as etapas e abordagem…"
          rows={4}
          className={`${inputCls()} resize-none`}
          style={inputStyle()}
          maxLength={5000}
        />
        <CharCount value={data.metodologia} min={50} max={5000} />
        <FieldError message={errors.metodologia} />
      </div>

      {/* Resultados esperados */}
      <div>
        <Label required>Resultados Esperados</Label>
        <textarea
          value={data.resultadosEsperados}
          onChange={(e) => onChange({ resultadosEsperados: e.target.value })}
          placeholder="Quais resultados concretos espera alcançar com este projeto?"
          rows={4}
          className={`${inputCls()} resize-none`}
          style={inputStyle()}
          maxLength={5000}
        />
        <CharCount value={data.resultadosEsperados} min={50} max={5000} />
        <FieldError message={errors.resultadosEsperados} />
      </div>

      {/* Optional fields */}
      <details className="group">
        <summary
          className="text-sm font-semibold cursor-pointer list-none flex items-center gap-2"
          style={{ color: "var(--fg-muted)" }}
        >
          <ChevronDown
            className="w-4 h-4 transition-transform group-open:rotate-180"
            aria-hidden
          />
          Informações adicionais (opcional)
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          <div>
            <Label>Riscos e Mitigações</Label>
            <textarea
              value={data.riscos}
              onChange={(e) => onChange({ riscos: e.target.value })}
              placeholder="Quais riscos foram identificados e como serão mitigados?"
              rows={3}
              className={`${inputCls()} resize-none`}
              style={inputStyle()}
              maxLength={2000}
            />
          </div>
          <div>
            <Label>Parcerias</Label>
            <textarea
              value={data.parcerias}
              onChange={(e) => onChange({ parcerias: e.target.value })}
              placeholder="Há parcerias estratégicas envolvidas neste projeto?"
              rows={2}
              className={`${inputCls()} resize-none`}
              style={inputStyle()}
              maxLength={2000}
            />
          </div>
          <div>
            <Label>Indicadores de Êxito</Label>
            <textarea
              value={data.indicadoresExito}
              onChange={(e) => onChange({ indicadoresExito: e.target.value })}
              placeholder="Como será medido o sucesso deste projeto?"
              rows={2}
              className={`${inputCls()} resize-none`}
              style={inputStyle()}
              maxLength={2000}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
