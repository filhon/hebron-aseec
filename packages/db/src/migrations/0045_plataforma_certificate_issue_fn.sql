-- Migration: 0045_plataforma_certificate_issue_fn
-- P-6.8 — Server Actions Plataforma: emissão automática de certificado.
--
-- 0020_plataforma_rls.sql deixou registrado (comentário de cabeçalho e nota
-- após o bloco de GRANTs) que plataforma.certificates não tem policy de
-- INSERT para o próprio aluno — só super_admin (certificates_mutate_admin).
-- A emissão automática ao concluir 100% da trilha (BRAIN §6.3) precisa,
-- portanto, de uma função SECURITY DEFINER dedicada que grava a linha
-- internamente, nunca de um INSERT direto do cliente (evita autodeclaração
-- de certificado).
--
-- A função re-verifica a conclusão da trilha internamente (não confia no
-- chamador) — é GRANTed a `authenticated` e poderia, do contrário, ser
-- invocada diretamente via RPC por qualquer usuário matriculado para forjar
-- um certificado sem ter completado as aulas (defesa em profundidade, G do
-- CLAUDE.md). Idempotente: se o certificado já existe, retorna a linha
-- existente em vez de tentar duplicar (certificates_course_user_uniq).

CREATE OR REPLACE FUNCTION plataforma.issue_certificate(p_course_id uuid)
RETURNS plataforma.certificates
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cert plataforma.certificates%ROWTYPE;
  v_total_lessons integer;
  v_completed_lessons integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM plataforma.enrollments
    WHERE user_id = auth.uid() AND course_id = p_course_id
  ) THEN
    RAISE EXCEPTION 'Usuário não matriculado neste curso';
  END IF;

  SELECT * INTO v_cert FROM plataforma.certificates
  WHERE course_id = p_course_id AND user_id = auth.uid();
  IF FOUND THEN
    RETURN v_cert;
  END IF;

  SELECT count(*) INTO v_total_lessons
  FROM plataforma.lessons
  WHERE course_id = p_course_id;

  SELECT count(*) INTO v_completed_lessons
  FROM plataforma.progress
  WHERE course_id = p_course_id
    AND user_id = auth.uid()
    AND completed_at IS NOT NULL;

  IF v_total_lessons = 0 OR v_completed_lessons < v_total_lessons THEN
    RAISE EXCEPTION 'Trilha não concluída (% de % aulas)', v_completed_lessons, v_total_lessons;
  END IF;

  INSERT INTO plataforma.certificates (course_id, user_id, verification_hash)
  VALUES (
    p_course_id,
    auth.uid(),
    md5(gen_random_uuid()::text || clock_timestamp()::text)
  )
  RETURNING * INTO v_cert;

  RETURN v_cert;
END;
$$;

GRANT EXECUTE ON FUNCTION plataforma.issue_certificate(uuid) TO authenticated;
