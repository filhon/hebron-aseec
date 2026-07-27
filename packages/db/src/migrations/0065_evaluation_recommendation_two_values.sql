-- Migration: 0065_evaluation_recommendation_two_values
--
-- Reduz projetos.evaluation_recommendation de 3 para 2 valores
-- (approved, rejected), removendo needs_revision. BRAIN §6.2 define a
-- opinião do avaliador como "sim/não + texto" — nenhum fluxo de "revisão
-- solicitada" foi especificado em nenhum prompt, e o EvaluationForm sempre
-- ofereceu apenas dois botões (Favorável/Desfavorável, decisão registrada em
-- SESSIONS.md S-37). needs_revision era alcançável apenas chamando a Server
-- Action diretamente, e nesse caso a leitura em queries.ts o colapsava
-- silenciosamente em "reprovado" — esta migration torna esse mapeamento
-- impossível de estar errado, eliminando o terceiro valor na origem (P-2.1b).
--
-- Confirmado antes de aplicar: `SELECT recommendation, count(*) FROM
-- projetos.evaluations GROUP BY recommendation` não retornou nenhuma linha
-- com needs_revision no banco de dev — troca sem perda de dados. A linha
-- UPDATE abaixo é defensiva (idempotente) para o caso de outro ambiente ter
-- dados que este não tem.

UPDATE "projetos"."evaluations"
  SET recommendation = 'rejected'
  WHERE recommendation = 'needs_revision';

ALTER TYPE "projetos"."evaluation_recommendation" RENAME TO "evaluation_recommendation_old";

CREATE TYPE "projetos"."evaluation_recommendation" AS ENUM ('approved', 'rejected');

ALTER TABLE "projetos"."evaluations"
  ALTER COLUMN "recommendation" TYPE "projetos"."evaluation_recommendation"
  USING "recommendation"::text::"projetos"."evaluation_recommendation";

DROP TYPE "projetos"."evaluation_recommendation_old";
