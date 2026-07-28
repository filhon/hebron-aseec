"use client";

import { PROJECT_CATEGORY_OPTIONS as CATEGORIAS } from "@hebron/integrations/documentos-projetos-client";
import { FieldLabel, TextInput, Textarea, SelectInput } from "./field-controls";
import type { WizardFormData } from "../project-wizard";

type StepProps = {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  errors: Partial<Record<keyof WizardFormData, string>>;
};

export function StepProposalAnnual({ data, onChange, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel required htmlFor="titulo">
          Título do Projeto
        </FieldLabel>
        <TextInput
          id="titulo"
          value={data.titulo}
          onChange={(v) => onChange({ titulo: v })}
          placeholder="Ex.: Missão Maputo 2026 — Plantação de Igrejas"
          error={errors.titulo}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="categoria">
          Categoria
        </FieldLabel>
        <SelectInput
          id="categoria"
          value={data.categoria}
          onChange={(v) => onChange({ categoria: v })}
          options={CATEGORIAS}
          placeholder="Selecione uma categoria"
          error={errors.categoria}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="objetivos">
          Objetivos
        </FieldLabel>
        <Textarea
          id="objetivos"
          value={data.objetivos}
          onChange={(v) => onChange({ objetivos: v })}
          placeholder="Descreva o objetivo principal do projeto e o que se pretende alcançar (mín. 50 caracteres)..."
          rows={3}
          error={errors.objetivos}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="justificativa">
          Justificativa
        </FieldLabel>
        <Textarea
          id="justificativa"
          value={data.justificativa}
          onChange={(v) => onChange({ justificativa: v })}
          placeholder="Por que este projeto é necessário? Qual o contexto e a necessidade identificada (mín. 50 caracteres)?"
          rows={3}
          error={errors.justificativa}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="metodologia">
          Metodologia
        </FieldLabel>
        <Textarea
          id="metodologia"
          value={data.metodologia}
          onChange={(v) => onChange({ metodologia: v })}
          placeholder="Como o projeto será executado? Descreva as etapas e abordagem (mín. 50 caracteres)..."
          rows={3}
          error={errors.metodologia}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="resultadosEsperados">
          Resultados Esperados
        </FieldLabel>
        <Textarea
          id="resultadosEsperados"
          value={data.resultadosEsperados}
          onChange={(v) => onChange({ resultadosEsperados: v })}
          placeholder="Quais resultados concretos este projeto visa alcançar (mín. 50 caracteres)?"
          rows={3}
          error={errors.resultadosEsperados}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="contextoMinisterial">
          Contexto Ministerial
        </FieldLabel>
        <Textarea
          id="contextoMinisterial"
          value={data.contextoMinisterial}
          onChange={(v) => onChange({ contextoMinisterial: v })}
          placeholder="Descreva o histórico e o contexto do ministério onde o projeto será realizado..."
          rows={3}
          error={errors.contextoMinisterial}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required htmlFor="regiao">
            Região de Atuação
          </FieldLabel>
          <TextInput
            id="regiao"
            value={data.regiao}
            onChange={(v) => onChange({ regiao: v })}
            placeholder="Ex.: Norte do Brasil, Moçambique, etc."
            error={errors.regiao}
          />
        </div>
        <div>
          <FieldLabel required htmlFor="pais">
            País
          </FieldLabel>
          <TextInput
            id="pais"
            value={data.pais}
            onChange={(v) => onChange({ pais: v })}
            placeholder="Ex.: Brasil"
            error={errors.pais}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required htmlFor="beneficiariosQuantidade">
            Nº de Beneficiários
          </FieldLabel>
          <TextInput
            id="beneficiariosQuantidade"
            value={data.beneficiariosQuantidade}
            onChange={(v) => onChange({ beneficiariosQuantidade: v })}
            placeholder="Ex.: 500"
            type="number"
            error={errors.beneficiariosQuantidade}
          />
        </div>
        <div>
          <FieldLabel required htmlFor="beneficiariosDescricao">
            Descrição dos Beneficiários
          </FieldLabel>
          <TextInput
            id="beneficiariosDescricao"
            value={data.beneficiariosDescricao}
            onChange={(v) => onChange({ beneficiariosDescricao: v })}
            placeholder="Ex.: Famílias ribeirinhas do Rio Negro"
            error={errors.beneficiariosDescricao}
          />
        </div>
      </div>

      <div>
        <FieldLabel required htmlFor="tempoMinisterioAnos">
          Tempo de Ministério (anos)
        </FieldLabel>
        <TextInput
          id="tempoMinisterioAnos"
          value={data.tempoMinisterioAnos}
          onChange={(v) => onChange({ tempoMinisterioAnos: v })}
          placeholder="Ex.: 10"
          type="number"
          error={errors.tempoMinisterioAnos}
        />
        <p className="text-xs text-(--fg-muted) mt-1">
          Há quantos anos a instituição realiza ministério ativo?
        </p>
      </div>
    </div>
  );
}

export function StepProposalPontual({ data, onChange, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel required htmlFor="titulo">
          Título do Projeto
        </FieldLabel>
        <TextInput
          id="titulo"
          value={data.titulo}
          onChange={(v) => onChange({ titulo: v })}
          placeholder="Ex.: Auxílio Emergencial — Inundação Manaus"
          error={errors.titulo}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="categoria">
          Categoria
        </FieldLabel>
        <SelectInput
          id="categoria"
          value={data.categoria}
          onChange={(v) => onChange({ categoria: v })}
          options={CATEGORIAS}
          placeholder="Selecione uma categoria"
          error={errors.categoria}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="motivoEmergencial">
          Motivo Emergencial
        </FieldLabel>
        <Textarea
          id="motivoEmergencial"
          value={data.motivoEmergencial}
          onChange={(v) => onChange({ motivoEmergencial: v })}
          placeholder="Descreva a situação de emergência que justifica este projeto pontual (mín. 30 caracteres)..."
          rows={4}
          error={errors.motivoEmergencial}
        />
      </div>

      <div>
        <FieldLabel required htmlFor="prazoNecessidade">
          Prazo de Necessidade
        </FieldLabel>
        <TextInput
          id="prazoNecessidade"
          value={data.prazoNecessidade}
          onChange={(v) => onChange({ prazoNecessidade: v })}
          type="date"
          error={errors.prazoNecessidade}
        />
        <p className="text-xs text-(--fg-muted) mt-1">
          Data limite para que o recurso esteja disponível.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="descricao">Descrição Adicional</FieldLabel>
        <Textarea
          id="descricao"
          value={data.descricao}
          onChange={(v) => onChange({ descricao: v })}
          placeholder="Detalhes adicionais sobre o projeto (opcional)..."
          rows={3}
          error={errors.descricao}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel htmlFor="regiao">Região</FieldLabel>
          <TextInput
            id="regiao"
            value={data.regiao}
            onChange={(v) => onChange({ regiao: v })}
            placeholder="Ex.: Amazonas"
            error={errors.regiao}
          />
        </div>
        <div>
          <FieldLabel htmlFor="pais">País</FieldLabel>
          <TextInput
            id="pais"
            value={data.pais}
            onChange={(v) => onChange({ pais: v })}
            placeholder="Ex.: Brasil"
            error={errors.pais}
          />
        </div>
      </div>
    </div>
  );
}
