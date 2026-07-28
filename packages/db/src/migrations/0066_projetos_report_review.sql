-- Migration: 0066_projetos_report_review
-- P-2.6b — O relatório que é rejeitado sem motivo e não pode voltar.
--   • projetos.reports ganha review_notes: o parecer que reviewReport já
--     aceitava no schema Zod (`notes`) mas descartava — só sobrevivia no
--     diff do audit log, onde nenhum submissor tem SELECT.
--   • Normaliza qualquer relatório hoje travado em status "rejected"
--     (estado terminal do defeito corrigido por este prompt) de volta a
--     "pendente", o mesmo destino que reviewReport passa a aplicar daqui
--     em diante — sem isso, linhas já rejeitadas antes desta migration
--     ficariam presas mesmo depois do fix (mesmo padrão defensivo da
--     migration 0065).

ALTER TABLE "projetos"."reports" ADD COLUMN IF NOT EXISTS "review_notes" text;

UPDATE "projetos"."reports"
  SET status = 'pendente'
  WHERE status = 'rejected';
