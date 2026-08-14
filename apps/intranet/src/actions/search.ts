"use server";

import { z } from "zod";
import { ECOSYSTEM_APPS } from "@hebron/ui";
import { authenticatedAction } from "../lib/safe-action";
import { getSessionSupabaseClient } from "../lib/session-client";
import { MEETING_TYPE_LABEL } from "../lib/queries";

// ---------------------------------------------------------------------------
// globalSearch — busca cross-app (projetos.projects, documentos.documents,
// tarefas.tasks, admin.meeting_sessions). Financeiro fica fora (dados
// sensíveis, PROMPTS.md P-5.8).
//
// Roda com o client da SESSÃO (getSessionSupabaseClient) chamando a RPC
// public.intranet_global_search (0039_intranet_global_search.sql), que é
// SECURITY INVOKER — a RLS de cada schema filtra o que o usuário autenticado
// pode ver, sem nenhuma reimplementação de visibilidade aqui (contrato
// fechado na auditoria, PROMPTS.md P-5.8).
// ---------------------------------------------------------------------------

const MODULE_LABEL: Record<string, string> = {
  projetos: "Projetos",
  documentos: "Documentos",
  tarefas: "Tarefas",
  admin: "Reuniões",
};

const MODULE_PATH: Record<string, string> = {
  projetos: "projeto",
  documentos: "documento",
  tarefas: "tarefa",
};

// Base URL de cada módulo vem do catálogo único (ECOSYSTEM_APPS,
// packages/ui) — mesma fonte que o trocador de apps e o lançador, nunca uma
// cópia local (comentário do próprio catálogo: "não duplicar em shells de
// app").
function buildHref(module: string, id: string): string {
  if (module === "admin") return `/reunioes#reuniao-${id}`;
  const base = ECOSYSTEM_APPS.find((app) => app.id === module)?.href;
  const path = MODULE_PATH[module];
  if (!base || !path) return "#";
  return `${base}/${path}/${id}`;
}

interface SearchRow {
  module: string;
  id: string;
  title: string | null;
  description: string | null;
  meeting_type: string | null;
  meeting_date: string | null;
}

// Teto por módulo (0079_intranet_global_search_precisao.sql pede LIMIT 21 —
// 20 + 1 sentinela — por bloco). Quando um módulo devolve 21 linhas, a 21ª
// nunca é exibida; ela só avisa que houve corte.
const MODULE_RESULT_CAP = 20;

// admin.meeting_sessions.date é timestamptz; o RPC devolve ISO
// ("2026-08-14T00:00:00+00:00" ou similar) — só a parte de data importa.
function formatMeetingDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

// Rótulo de reunião montado aqui, na aplicação, a partir da fonte única de
// tipos (MEETING_TYPE_LABEL, lib/queries.ts) — a RPC (0079) só devolve
// type/date crus, nunca mais o enum concatenado cru ("Reunião ordinaria").
function resolveTitle(row: SearchRow): string {
  if (row.module === "admin" && row.meeting_type && row.meeting_date) {
    const label = MEETING_TYPE_LABEL[row.meeting_type] ?? row.meeting_type;
    return `Reunião ${label} — ${formatMeetingDate(row.meeting_date)}`;
  }
  return row.title ?? "";
}

export const globalSearch = authenticatedAction
  .schema(z.object({ query: z.string().min(2).max(120) }))
  .action(async ({ parsedInput }) => {
    const supabase = await getSessionSupabaseClient();
    const { data, error } = await supabase.rpc("intranet_global_search", {
      _query: parsedInput.query,
    });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as SearchRow[];

    const rowsByModule = new Map<string, SearchRow[]>();
    for (const row of rows) {
      const bucket = rowsByModule.get(row.module) ?? [];
      bucket.push(row);
      rowsByModule.set(row.module, bucket);
    }

    const results: {
      id: string;
      module: string;
      title: string;
      description?: string;
      href: string;
    }[] = [];
    const truncatedModules: string[] = [];

    for (const [module, moduleRows] of rowsByModule) {
      if (moduleRows.length > MODULE_RESULT_CAP) {
        truncatedModules.push(MODULE_LABEL[module] ?? module);
      }
      for (const row of moduleRows.slice(0, MODULE_RESULT_CAP)) {
        results.push({
          id: row.id,
          module: MODULE_LABEL[row.module] ?? row.module,
          title: resolveTitle(row),
          description: row.description ?? undefined,
          href: buildHref(row.module, row.id),
        });
      }
    }

    return { results, truncatedModules };
  });
