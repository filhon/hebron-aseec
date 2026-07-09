"use server";

import { z } from "zod";
import { authenticatedAction } from "../lib/safe-action";
import { getSessionSupabaseClient } from "../lib/session-client";

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

const MODULE_BASE_URL: Record<string, string> = {
  projetos:
    process.env.NEXT_PUBLIC_PROJETOS_URL ??
    "https://projetos.hebronaseec.com.br",
  documentos:
    process.env.NEXT_PUBLIC_DOCUMENTOS_URL ?? "https://docs.hebronaseec.com.br",
  tarefas:
    process.env.NEXT_PUBLIC_TAREFAS_URL ?? "https://tarefas.hebronaseec.com.br",
};

const MODULE_PATH: Record<string, string> = {
  projetos: "projeto",
  documentos: "documento",
  tarefas: "tarefa",
};

function buildHref(module: string, id: string): string {
  if (module === "admin") return `/reunioes/${id}`;
  const base = MODULE_BASE_URL[module];
  const path = MODULE_PATH[module];
  if (!base || !path) return "#";
  return `${base}/${path}/${id}`;
}

interface SearchRow {
  module: string;
  id: string;
  title: string;
  description: string | null;
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

    return {
      results: rows.map((row) => ({
        id: row.id,
        module: MODULE_LABEL[row.module] ?? row.module,
        title: row.title,
        description: row.description ?? undefined,
        href: buildHref(row.module, row.id),
      })),
    };
  });
