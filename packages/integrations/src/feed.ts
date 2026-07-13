import { desc, isNull } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { projects, transactions, tasks } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// getFeed — agregador do feed cross-app do dashboard da Intranet (BRAIN §6.10
// / PROMPTS.md P-5.11).
//
// Consulta os últimos eventos de Projetos, Financeiro e Tarefas rodando
// COM o client da sessão: `withAuthenticatedContext` (packages/db/src/
// authenticated.ts) troca o papel Postgres da transação para `authenticated`
// e carrega `request.jwt.claims.sub = actorId`, exatamente como o PostgREST
// faz por request — as policies de RLS de cada schema (projects_select_*,
// transactions_select_staff, tasks_select_staff) filtram as linhas com o
// papel real do ator, sem nenhuma reimplementação de visibilidade aqui
// (mesmo contrato de RLS-first da busca global de P-5.8, cujo client de
// sessão equivalente — getSessionSupabaseClient — vive em apps/intranet e
// não pode ser importado por um package; withAuthenticatedContext é o
// equivalente que packages/integrations pode usar sem depender de
// primitivas do Next.js).
//
// Cada módulo é consultado isoladamente (sem UNION cross-schema) e os
// resultados são mesclados e ordenados por data em memória — mais simples
// que uma função SQL agregadora e sem exigir uma migration nova para este
// prompt.
// ---------------------------------------------------------------------------

export type FeedModule = "projetos" | "financeiro" | "tarefas";

export interface FeedEvent {
  module: FeedModule;
  id: string;
  title: string;
  description: string | null;
  occurredAt: Date;
}

export interface GetFeedParams {
  actorId: string;
  /** Quantidade máxima de eventos retornados (após mesclar os 3 módulos). */
  limit?: number;
}

const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  debito: "Débito",
  credito: "Crédito",
};

export async function getFeed({
  actorId,
  limit = 10,
}: GetFeedParams): Promise<FeedEvent[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const [projectRows, transactionRows, taskRows] = await Promise.all([
      tx
        .select({
          id: projects.id,
          title: projects.title,
          stage: projects.stage,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(isNull(projects.deletedAt))
        .orderBy(desc(projects.updatedAt))
        .limit(limit),
      tx
        .select({
          id: transactions.id,
          description: transactions.description,
          type: transactions.type,
          amount: transactions.amount,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .orderBy(desc(transactions.createdAt))
        .limit(limit),
      tx
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          createdAt: tasks.createdAt,
        })
        .from(tasks)
        .where(isNull(tasks.deletedAt))
        .orderBy(desc(tasks.createdAt))
        .limit(limit),
    ]);

    const events: FeedEvent[] = [
      ...projectRows.map(
        (row): FeedEvent => ({
          module: "projetos",
          id: row.id,
          title: row.title,
          description: `Estágio: ${row.stage}`,
          occurredAt: row.updatedAt,
        }),
      ),
      ...transactionRows.map(
        (row): FeedEvent => ({
          module: "financeiro",
          id: row.id,
          title: row.description,
          description: `${TRANSACTION_TYPE_LABEL[row.type] ?? row.type} — R$ ${row.amount}`,
          occurredAt: row.createdAt,
        }),
      ),
      ...taskRows.map(
        (row): FeedEvent => ({
          module: "tarefas",
          id: row.id,
          title: row.title,
          description: `Status: ${row.status}`,
          occurredAt: row.createdAt,
        }),
      ),
    ];

    return events
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  });
}
