-- Migration: 0050_radio_rls
-- P-8.7 — RLS Policies Rádio. Schema `radio` nasceu em `0049_radio.sql`, já
-- depois de `0014_grants_authenticated.sql` — este arquivo inclui os GRANTs
-- (mesmo padrão de `0033_tarefas_rls.sql`/`0020_plataforma_rls.sql`/
-- `0022_flats_rls.sql`, G6.4). Gerado vazio com
-- `drizzle-kit generate --custom --name=radio_rls` e preenchido à mão (RLS
-- não é representável em `schema/radio.ts`, mesmo padrão de
-- `0011_financeiro_rls.sql`). O journal do drizzle-kit nomeou o arquivo
-- internamente como `0024_radio_rls` (drift pré-existente do
-- `meta/_journal.json`, parado em idx 23 — mesmo achado de S-79/S-91);
-- renomeado em disco para `0050` para seguir a numeração sequencial real,
-- journal deixado como o kit gerou (drift documentado, não corrigido à mão).
--
-- Papéis cobertos:
--   super_admin → full CRUD em todo o schema radio (FOR ALL em toda tabela)
--   anon        → SELECT em authors, series, tracks, playlists,
--                  playlist_tracks, now_playing (ouvir sem cadastro, BRAIN §6.4)
--   authenticated (qualquer papel) → mesmo SELECT público acima
--   authenticated com termo aceito → SELECT em exclusive_materials
--   demais (submissor/aluno/hospede/ouvinte) → sem policy de escrita em
--     nenhuma tabela → zero acesso de mutação (deny-by-default)

-- ===========================================================================
-- Conteúdo público — authors, series, tracks, playlists, now_playing
-- SELECT sem "TO" (aplica a PUBLIC: anon + authenticated + qualquer papel) —
-- mesmo padrão de "documentos"."categories_select_all"/"tags_select_all".
-- Mutação: apenas super_admin.
-- ===========================================================================
ALTER TABLE "radio"."authors" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authors_select_public"
  ON "radio"."authors" FOR SELECT
  USING (true);

CREATE POLICY "authors_mutate_admin"
  ON "radio"."authors" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

ALTER TABLE "radio"."series" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "series_select_public"
  ON "radio"."series" FOR SELECT
  USING (true);

CREATE POLICY "series_mutate_admin"
  ON "radio"."series" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

ALTER TABLE "radio"."tracks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracks_select_public"
  ON "radio"."tracks" FOR SELECT
  USING (true);

CREATE POLICY "tracks_mutate_admin"
  ON "radio"."tracks" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

ALTER TABLE "radio"."playlists" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playlists_select_public"
  ON "radio"."playlists" FOR SELECT
  USING (true);

CREATE POLICY "playlists_mutate_admin"
  ON "radio"."playlists" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- playlist_tracks não está listada no escopo do prompt (que só cita
-- "playlists"), mas é a junção que define a ordem de reprodução do Auto DJ
-- (BRAIN §6.4/P-8.8) — sem SELECT público aqui, um ouvinte anônimo não
-- consegue saber qual faixa toca a seguir na playlist ativa. Tratado como
-- infraestrutura óbvia faltante (G1), incluído no mesmo grupo de
-- "ouvir sem cadastro".
ALTER TABLE "radio"."playlist_tracks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playlist_tracks_select_public"
  ON "radio"."playlist_tracks" FOR SELECT
  USING (true);

CREATE POLICY "playlist_tracks_mutate_admin"
  ON "radio"."playlist_tracks" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- now_playing: singleton informativo ("faixa mais recentemente iniciada pelo
-- server", BRAIN §6.4) — SELECT público para exibir "tocando agora" sem
-- cadastro. A escrita (avançar a faixa) é mecanismo server-side de P-8.8
-- (fora do escopo deste prompt); por ora, apenas super_admin tem INSERT/
-- UPDATE/DELETE via RLS, seguindo literalmente "Super_admin: full CRUD" do
-- escopo — P-8.8 decide o client/role usado pela rota que atualiza a faixa.
ALTER TABLE "radio"."now_playing" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "now_playing_select_public"
  ON "radio"."now_playing" FOR SELECT
  USING (true);

CREATE POLICY "now_playing_mutate_admin"
  ON "radio"."now_playing" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

-- ===========================================================================
-- exclusive_materials — download exclusivo (BRAIN §6.4): cadastro + aceite
-- prévio de termo. SELECT liberado a qualquer authenticated com pelo menos
-- um term_acceptances (aceite cobre todos os materiais, ver schema/radio.ts).
-- anon NUNCA recebe policy aqui (nem GRANT abaixo).
-- ===========================================================================
ALTER TABLE "radio"."exclusive_materials" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exclusive_materials_mutate_admin"
  ON "radio"."exclusive_materials" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "exclusive_materials_select_term_accepted"
  ON "radio"."exclusive_materials" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "radio"."term_acceptances" ta
      WHERE ta.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- term_acceptances — aceite único por usuário (BRAIN §6.4: "aceito 1 vez por
-- usuário"). INSERT/SELECT próprio; sem UPDATE/DELETE para o dono
-- (imutabilidade do aceite — só super_admin corrige via mutate_admin).
-- ===========================================================================
ALTER TABLE "radio"."term_acceptances" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "term_acceptances_mutate_admin"
  ON "radio"."term_acceptances" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "term_acceptances_select_own"
  ON "radio"."term_acceptances" FOR SELECT TO authenticated
  USING ("user_id" = auth.uid());

CREATE POLICY "term_acceptances_insert_own"
  ON "radio"."term_acceptances" FOR INSERT TO authenticated
  WITH CHECK ("user_id" = auth.uid());

-- ===========================================================================
-- listener_stats — snapshot de audiência consumido pelo dashboard da
-- Intranet (BRAIN §6.6/§6.9, P-8.11). Não é conteúdo "ouvir sem cadastro" —
-- é métrica interna, então SELECT restrito a super_admin/diretor/conselheiro
-- (mesmo gate de área interna usado no dashboard da Intranet), não público.
-- Não listado por papel no escopo do prompt; tratado por analogia ao mesmo
-- precedente já usado em `kpi_snapshots` (P-5.7/S-91) e `admin.feature_flags`.
-- ===========================================================================
ALTER TABLE "radio"."listener_stats" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listener_stats_mutate_admin"
  ON "radio"."listener_stats" FOR ALL TO authenticated
  USING (public.has_role('super_admin'))
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "listener_stats_select_staff"
  ON "radio"."listener_stats" FOR SELECT TO authenticated
  USING (public.has_role('diretor', 'conselheiro'));

-- ===========================================================================
-- GRANTs — teto de permissão dos roles `anon`/`authenticated`; RLS acima
-- filtra por linha dentro desse teto (mesma regra de
-- 0014_grants_authenticated.sql/0033_tarefas_rls.sql). Sem isto,
-- "permission denied for schema radio" antes de qualquer policy ser avaliada.
-- ===========================================================================
GRANT USAGE ON SCHEMA "radio" TO authenticated;
GRANT USAGE ON SCHEMA "radio" TO anon;

-- Conteúdo público: anon só SELECT; authenticated recebe o teto de CRUD
-- (RLS acima restringe a mutação a super_admin).
GRANT SELECT ON "radio"."authors"         TO anon;
GRANT SELECT ON "radio"."series"          TO anon;
GRANT SELECT ON "radio"."tracks"          TO anon;
GRANT SELECT ON "radio"."playlists"       TO anon;
GRANT SELECT ON "radio"."playlist_tracks" TO anon;
GRANT SELECT ON "radio"."now_playing"     TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."authors"         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."series"          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."tracks"          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."playlists"       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."playlist_tracks" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."now_playing"     TO authenticated;

-- exclusive_materials e term_acceptances ficam fora do GRANT de anon (escopo
-- do prompt: "exclusive_materials e term_acceptances ficam fora do grant de
-- anon").
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."exclusive_materials" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."term_acceptances"    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "radio"."listener_stats"      TO authenticated;
