-- Migration: 0090_pacote11_plataforma_verify_certificates_batch
-- AUDIT/04-BACKLOG-CORRECAO.md — PACOTE 11 (Higiene, consistência e registro), D4-005.
--
-- getUserCertificates (apps/plataforma/src/lib/queries.ts) chamava
-- plataforma.verify_certificate(hash) uma vez por certificado do aluno —
-- N+1, uma transação nova a cada linha. Versão em lote: mesma consulta,
-- SECURITY DEFINER STABLE, um único round-trip para todos os hashes.
CREATE OR REPLACE FUNCTION plataforma.verify_certificates(p_hashes text[])
RETURNS TABLE (
  verification_hash text,
  course_title text,
  user_name text,
  issued_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT cert.verification_hash, c.title, u.full_name, cert.issued_at
  FROM plataforma.certificates cert
  JOIN plataforma.courses c ON c.id = cert.course_id
  JOIN public.users u ON u.id = cert.user_id
  WHERE cert.verification_hash = ANY(p_hashes);
$$;

GRANT EXECUTE ON FUNCTION plataforma.verify_certificates(text[]) TO authenticated;
